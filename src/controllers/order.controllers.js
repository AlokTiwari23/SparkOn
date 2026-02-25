import prisma from "../db/db.prisam.js"; // Adjust path if necessary
import { ValidationError } from "../middlewares/errorHandler/index.js";

// ==========================================
// USER / ELECTRICIAN CONTROLLERS
// ==========================================

export const placeOrder = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const role = req.user.role; // e.g., "customer" or "Electrician"
        
        // Extract all fields from the frontend payload
        const { 
            address_id, 
            payment_method, 
            gateway_txn_id, 
            gstin, 
            notes, 
            emiDetails 
        } = req.body;

        // 1. Validate Address
        const address = await prisma.userAddress.findUnique({
            where: { id: parseInt(address_id) }
        });

        if (!address) return next(new ValidationError("Invalid Address ID"));

        // 2. Get Cart Items
        const cartWhere = role === "Electrician"
            ? { electrician_id: userId }
            : { customer_id: userId };

        const cart = await prisma.cartSession.findFirst({
            where: cartWhere,
            include: {
                cartItems: {
                    include: { product_variant: true }
                }
            }
        });

        if (!cart || cart.cartItems.length === 0) {
            return next(new ValidationError(`Your cart is empty`));
        }

        // 3. Start transaction (All or Nothing)
        const orderResult = await prisma.$transaction(async (tx) => {
            let totalAmount = 0;
            let totalCommission = 0;
            const orderItemsData = [];

            // Process Each Item (Check Stock, Calculate Totals)
            for (const item of cart.cartItems) {
                const { product_variant, quantity } = item;

                // Stock Check
                if (product_variant.stock_quantity < quantity) {
                    throw new Error(`Out of Stock. Available: ${product_variant.stock_quantity}`);
                }

                const price = Number(product_variant.price_selling);
                const subtotal = price * quantity;

                // Commission Logic (Example: 2% commission for Electricians)
                const commissionPerUnit = role === "Electrician" ? (price * 0.02) : 0;
                const totalItemCommission = commissionPerUnit * quantity;

                totalAmount += subtotal;
                totalCommission += totalItemCommission;

                // Prepare Order Item Data 
                orderItemsData.push({
                    product_variant_id: product_variant.id,
                    quantity: quantity,
                    frozen_price: price, 
                    frozen_commission: commissionPerUnit, 
                    subtotal: subtotal
                });

                // Deduct Stock 
                await tx.productVariant.update({
                    where: { id: product_variant.id },
                    data: { stock_quantity: { decrement: quantity } }
                });
            }

            // 4. Create the Order (Logistics Data)
            const newOrder = await tx.order.create({
                data: {
                    shipping_address_id: parseInt(address_id),
                    total_amount: totalAmount,
                    total_electrician_point: totalCommission, 
                    payment_status: payment_method === "COD" ? "PENDING" : "SUCCESS",
                    order_status: 'PROCESSING',

                    // B2B & Logistics
                    gstin: gstin || null,
                    notes: notes || null,

                    // Link User
                    customer_id: role === "customer" ? userId : null,
                    electrician_id: role === "Electrician" ? userId : null,

                    orderItems: { create: orderItemsData }
                }
            });

            // 5. Create the Payment Record (Financial Data)
            await tx.paymentIn.create({
                data: {
                    order_id: newOrder.id,
                    customer_id: userId,
                    gateway_txn_id: gateway_txn_id || `COD-${Date.now()}`,
                    amount: totalAmount,
                    method: payment_method || "COD",
                    status: payment_method === "COD" ? "PENDING" : "SUCCESS",
                    
                    // Add EMI details if the method is EMI
                    emi_provider: emiDetails?.provider || null,
                    emi_tenure: emiDetails?.tenure ? parseInt(emiDetails.tenure) : null,
                    emi_monthly_amount: emiDetails?.monthlyAmount || 0,
                }
            });

            // 6. Clear the Cart
            await tx.cartItem.deleteMany({
                where: { cart_id: cart.id }
            });

            return newOrder;
        });

        res.status(200).json({ success: true, order: orderResult });

    } catch (error) {
        next(error);
    }
};

export const getMyOrder = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;

        const whereClause = role === "Electrician"
            ? { electrician_id: userId }
            : { customer_id: userId };

        const orders = await prisma.order.findMany({
            where: whereClause,
            include: {
                paymentIns: true, // Needed to show payment method to user
                orderItems: {
                    include: {
                        product_variant: {
                            select: {
                                sku: true,
                                images: true,
                                product: { select: { name: true } }
                            }
                        }
                    }
                }
            },
            orderBy: { created_at: 'desc' } // Newest First
        });

        res.status(200).json({ success: true, orders });
    } catch (error) {
        next(error);
    }
};

export const getOrderDetails = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const role = req.user.role;

        const order = await prisma.order.findUnique({
            where: { id: parseInt(id) },
            include: {
                shipping_address: true,
                paymentIns: true,
                orderItems: {
                    include: {
                        product_variant: {
                            include: { product: true }
                        }
                    }
                }
            }
        });

        if (!order) {
            return next(new ValidationError(`Order not found`));
        }

        // Security Check: Ensure user owns this order (or is Admin)
        if (role !== "Admin") {
            const isOwner = (role === "Electrician" && order.electrician_id === userId) ||
                            (role === "customer" && order.customer_id === userId);

            if (!isOwner) return next(new ValidationError(`Access Denied`));
        }

        res.status(200).json({ success: true, order });
    } catch (error) {
        next(error);
    }
};

export const cancelOrder = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const role = req.user.role;

        const order = await prisma.order.findUnique({
            where: { id: parseInt(id) },
            include: { orderItems: true }
        });

        if (!order) return next(new ValidationError(`Order not found`));

        // Permission Check
        const isOwner = (role === "Electrician" && order.electrician_id === userId) ||
                        (role === "customer" && order.customer_id === userId);

        if (!isOwner || (order.order_status !== "PENDING" && order.order_status !== "PROCESSING")) {
            return next(new ValidationError(`Cannot cancel order that is ${order.order_status}`));
        }

        await prisma.$transaction(async (tx) => {
            // Mark as Cancelled
            await tx.order.update({
                where: { id: order.id },
                data: {
                    order_status: "CANCELLED",
                    updated_at: new Date()
                }
            });

            // Restore Stock for each item
            for (const item of order.orderItems) {
                await tx.productVariant.update({
                    where: { id: item.product_variant_id },
                    data: { stock_quantity: { increment: item.quantity } }
                });
            }
        });

        res.status(200).json({
            success: true,
            message: "Order cancelled and stock restored"
        });
    } catch (error) {
        next(error);
    }
};

export const requestReturn = async (req, res, next) => {
    try {
        const { id } = req.params; 
        const { reason } = req.body; // Can save this to a separate table later

        const order = await prisma.order.findUnique({ where: { id: parseInt(id) } });

        if (!order || order.order_status !== "DELIVERED") {
            return next(new ValidationError(`Can only return delivered items`));
        }

        // Change Status to "RETURNED" (Or RETURN_REQUESTED if you add it to enum)
        await prisma.order.update({
            where: { id: parseInt(id) },
            data: { order_status: "RETURNED" } 
        });

        res.status(200).json({
            success: true,
            message: `Return requested. Admin will review.`
        });
    } catch (error) {
        next(error);
    }
};

export const updateOrderAddress = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { new_address_id } = req.body;

        const order = await prisma.order.findUnique({ where: { id: parseInt(id) } });
        
        if (order.order_status !== "PROCESSING" && order.order_status !== "PENDING") {
            return next(new ValidationError("Cannot change address after order is processed"));
        }

        const address = await prisma.userAddress.findUnique({ where: { id: parseInt(new_address_id) } });
        if (!address) return next(new ValidationError(`Invalid Address ID`));

        await prisma.order.update({
            where: { id: parseInt(id) },
            data: { shipping_address_id: parseInt(new_address_id) }
        });

        res.status(200).json({ success: true, message: `Shipping Address Updated` });
    } catch (error) {
        next(error);
    }
};

// ==========================================
// ADMIN CONTROLLERS
// ==========================================

export const getAllOrderAdmin = async (req, res, next) => {
    try {
        const { status, dateRange, page = 1 } = req.query; 
        const limit = 10;
        const whereClause = {};

        // Status Filter
        if (status && status !== 'ALL') whereClause.order_status = status;

        // Date Filter
        if (dateRange && dateRange !== 'ALL') {
            const now = new Date();
            if (dateRange === 'TODAY') {
                now.setHours(0, 0, 0, 0);
                whereClause.created_at = { gte: now };
            } else if (dateRange === '7DAYS') {
                const lastWeek = new Date(now.setDate(now.getDate() - 7));
                whereClause.created_at = { gte: lastWeek };
            } else if (dateRange === 'MONTH') {
                const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                whereClause.created_at = { gte: firstDayOfMonth };
            }
        }

        // Count for pagination
        const totalItems = await prisma.order.count({ where: whereClause });

        const orders = await prisma.order.findMany({
            where: whereClause,
            take: limit,
            skip: (parseInt(page) - 1) * limit,
            orderBy: { created_at: 'desc' },
            include: {
                customer: { select: { name: true, phone_number: true } }, 
                electrician: { select: { name: true, phone_number: true } }, 
                shipping_address: true,
                paymentIns: true, // Gets Payment & EMI data
                orderItems: {
                    include: { product_variant: { select: { sku: true, product: { select: { name: true } } } } }
                }
            }
        });

        res.status(200).json({
            success: true,
            totalItems,
            totalPages: Math.ceil(totalItems / limit),
            currentPage: parseInt(page),
            orders
        });

    } catch (error) {
        next(error);
    }
};

export const updateOrderStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;  

        const validStatus = ["PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"];

        if (!validStatus.includes(status)) {
            return next(new ValidationError("Invalid Order Status"));
        }

        const order = await prisma.order.update({
            where: { id: parseInt(id) },
            data: {
                order_status: status,
                updated_at: new Date()
            }
        });

        res.status(200).json({
            success: true,
            message: `Order marked as ${status}`,
            order
        });
    } catch (error) {
        next(error);
    }
};

export const addtrackingDetails = async(req, res, next) => {
    try { 
        const { id } = req.params; 
        const { courier_name, tracking_id, estimated_date } = req.body;

        if(!courier_name || !tracking_id){
            return next(new ValidationError(`Courier name and Tracking ID are required`));
        }

        const order = await prisma.order.update({
            where: { id: parseInt(id) },
            data: {
                order_status: "SHIPPED",
                courier_name,
                tracking_id,
                estimated_date: estimated_date ? new Date(estimated_date) : null,
                updated_at: new Date() 
            }
        });
        
        res.status(200).json({
            success: true,
            message: `Order Shipped & Tracking Added`,
            order
        });

    } catch(error){
        next(error);
    }
};

export const processReturn = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { action } = req.body; // "APPROVE" or "REJECT"

        if (action === "APPROVE") {
            await prisma.$transaction(async (tx) => {
                const order = await tx.order.findUnique({
                    where: { id: parseInt(id) },
                    include: { orderItems: true }
                });
                
                // Restock Items
                for (const item of order.orderItems) {
                    await tx.productVariant.update({
                        where: { id: item.product_variant_id },
                        data: { stock_quantity: { increment: item.quantity } }
                    });
                }
                
                // Mark as Returned
                await tx.order.update({
                    where: { id: parseInt(id) },
                    data: { order_status: "RETURNED" }
                });
            });

            res.status(200).json({ success: true, message: `Return Approved & Stock Updated` });

        } else {
            // Reject Return (Revert to Delivered)
            await prisma.order.update({
                where: { id: parseInt(id) },
                data: { order_status: "DELIVERED" } 
            }); 

            res.status(200).json({ success: true, message: 'Return Rejected' });
        }
    } catch (error) {
        next(error);
    }
};

export const markOrderAsPaid = async (req, res, next) => {
    try {
        const { id } = req.params;

        const order = await prisma.order.findUnique({
            where: { id: parseInt(id) },
            include: { paymentIns: true }
        });

        if (!order) return next(new ValidationError("Order not found"));
        if (order.payment_status === "SUCCESS") return next(new ValidationError("Order is already paid"));

        await prisma.$transaction(async (tx) => {
            // Update Order Status
            await tx.order.update({
                where: { id: parseInt(id) },
                data: {
                    payment_status: "SUCCESS",
                    total_paid: order.total_amount,
                    updated_at: new Date()
                }
            });

            // Find pending COD payment
            const pendingPayment = order.paymentIns.find(p => p.status === "PENDING" && p.method === "COD");
            
            if (pendingPayment) {
                await tx.paymentIn.update({
                    where: { id: pendingPayment.id },
                    data: { status: "SUCCESS", paid_at: new Date() }
                });
            } else {
                await tx.paymentIn.create({
                    data: {
                        order_id: order.id,
                        customer_id: order.customer_id || order.electrician_id,
                        gateway_txn_id: `COD-MANUAL-${Date.now()}`,
                        amount: order.total_amount,
                        method: "COD",
                        status: "SUCCESS"
                    }
                });
            }
        });

        res.status(200).json({ success: true, message: "Order marked as Paid via COD" });
    } catch (error) {
        next(error);
    }
};

export const getOrderStats = async(req, res, next) => {
    try {
        // 1. Calculate Total Revenue
        const totalRevenue = await prisma.order.aggregate({
            _sum: { total_paid: true }
        });

        // 2. Count Order by Status 
        const statusCounts = await prisma.order.groupBy({
            by: ['order_status'],
            _count: { id: true }
        });

        // 3. Get Today's Orders
        const todayStart = new Date();
        todayStart.setHours(0,0,0,0);

        const todaysOrderCount = await prisma.order.count({
            where: { created_at: { gte: todayStart } }
        });

        res.status(200).json({
            success: true,
            stats: {
                totalRevenue: totalRevenue._sum.total_paid || 0,
                ordersToday: todaysOrderCount,
                breakdown: statusCounts 
            }
        });
    } catch(error) {
         next(error);
    }
};