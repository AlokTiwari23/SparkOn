import prisma from "../db/db.prisam.js";
import { ValidationError } from "../middlewares/errorHandler/index.js";




export const placeOrder = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const role = req.user.role; // "CUSTOMER" or "ELECTRICIAN"
        const { address_id, payment_mode } = req.body

        // 1. Validate Address
        const address = await prisma.userAddress.findUnique({
            where: { id: parseInt(address_id) }
        });


        if (!address) return next(new ValidationError("Invalid Address ID"));

        // 2. Get Cart Item
        //  We need to find the CartSession first

        const cartWhere = role === "ELECTRICIAN"
            ? { electrician_id: userId }
            : { customer_id: userId };

        const cart = await prisma.cartSession.findFirst({
            where: cartWhere,
            include: {
                cartItems: {
                    include: {
                        product_variant: true
                    }
                }
            }
        })

        if (!cart || cart.cartItems.length === 0) {
            return next(new ValidationError(`Your cart is empty`))
        }

        // 3. Start transaction (All or Noting)

        const orderResult = await prisma.$transaction(async (tx) => {

            let totalAmount = 0;
            let totalCommission = 0;
            const orderItemsData = [];

            // Process Each Item (Check Stock, Calculate Totals)

            for (const item of cart.cartItems) {
                const { product, quantity } = item;

                // Stock Check

                if (product.stock < quantity) {
                    throw new Error(`Out of Stock: ${product.name} . Availabele : ${product.stock}`)
                }

                // Calculate Finances
                // Note : Using Number() for simple math , but for statis finance  use a library like currency.js
                // Prisma Decimals return as object/string , so be careful 
                const price = Number(product.price);
                const subtotal = price * quantity;

                // Commission Logic (Example : 2% commission for Electricians)
                // You can make thsi dynamic later based on product category

                const commissionPerUnit = role === "Electrican" ? (price * 0.02) : 0;

                const totalItemCommission = commissionPerUnit * quantity;

                totalAmount += subtotal;
                totalCommission += totalItemCommission;

                //  Prepare Order Item Data 
                orderItemsData.push(
                    {
                        product_id: product.id,
                        quantity: quantity,
                        frozen_price: price,  // Snapshot of Price
                        frozen_commission: commissionPerUnit,  // Snapshot of commission
                        subtotal: subtotal
                    }
                )

                // Deduct Stock 
                await tx.product.update({
                    where: { id: product_id },
                    data: { stock: { decrement: quantity } }
                })
            }

            // Create the Order 
            const orderPayload = {
                shipping_address_id: parseInt(address_id),
                total_amount: totalAmount,
                total_electrician_point: totalCommission, // Point = Commission
                payment_status: "PENDING",
                order_status: 'PROCESSING',

                // Link User
                customer_id: role === "Customer" ? userId : null,
                electrician_id: role === "Electrician" ? userId : null,

                // Create Items immediately

                orderItems: {
                    create: orderItemsData
                }
            };

            const newOrder = await tx.order.create({
                data: orderPayload
            });

            // Clear the Cart

            await tx.cartItem.deleteMany({
                where: { cart_id: cart.id }
            })

            return newOrder

        })
    } catch (error) {
        next(error)
    }
}



export const getMyOrder = async (req, res, next) => {
    try {

        const userId = req.user.id;
        const role = req.user.role;

        const whereClause = role === "Electrician"
            ? { electrician_id: userId }
            : { customer_id: userId }

        const orders = await prisma.order.findMany({
            where: whereClause,
            include: {
                orderItems: {
                    include: {
                        product_variant: {
                            select: {
                                name: true,
                                images: { take: 1 }
                            }
                        }
                    }
                }
            },
            orderBy: { created_at: 'desc' } // Newest First
        });

        res.status(200).json({
            success: true,
            orders
        })

    } catch (error) {
        next(error)
    }
}



export const getOrderDetails = async (req, res, next) => {
    try {

        const { id } = req.params;
        const userId = req.user.id;
        const role = req.user.role;

        const order = await prisma.order.findUnique({
            where: { id: parseInt(id) },

            include: {
                address: true,
                orderItems: {
                    include: {
                        product: {
                            select: {
                                name: true,
                                image: { take: 1 },
                                brand: { select: { name: true } }
                            }
                        }
                    }
                }
            }
        });

        if (order) {
            return next(new ValidationError(`Order not found`));

        }

        // Security Check : Ensure user owns this order (or is Admin)

        if (role !== "Admin") {
            const isOwner = (role === "Electrician" && order.electrician_id === userId) ||
                (role === "Customer" && order.customer_id === userId)

            if (!isOwner) return next(new ValidationError(`Access Denied`))
        }

        res.status(200).json({
            success: true,
            order
        })

    } catch (error) {
        next(error)
    }
}



export const cancelOrder = async (req, res, next) => {
    try {

        const { id } = req.params;
        const userId = req.user.id;
        const role = req.user.role;

        const order = await prisma.order.findUnique({
            where: { id: parseInt(id) },
            include: { orderItems: true }
        })

        if (!order) return next(new ValidationError(`Order not found`))

        // Permission Check

        const isOwner = (role === "Electrician" && order.electrician_id === userId) ||
            (role === "Customer" && order.customer_id === userId)

        if (!isOwner) {
            return next(new ValidationError(`Cannot cancel order that is ${order.status}`))
        }

        await prisma.$transaction(async (tx) => {

            // Mark as Cancelled
            await tx.order.update({
                where: { id: order.id },
                data: {
                    status: "CANCELLED",
                    updated_at: new Date()
                }
            });

            // Restore Stock for each item
            for (const item of order.orderItems) {
                await tx.product.update({
                    where: { id: item.product_id }, // Assuming product_id is String in OrderItem
                    data: { stock: { increment: item.quantity } }
                });
            }
        });

        res.status(200).json({
            success: true,
            message: "Order cancelled and stock restored"
        })

    } catch (error) {
        next(error)
    }
}



export const getAllOrderAdmin = async (req, res, next) => {
    try {

        const { status, page = 1 } = req.query; // Filter by status (e.g. ?status = PENDING)

        const whereClause = {}

        if (status) whereClause.status = status;

        const orders = await prisma.order.findMany({
            where: whereClause,
            take: 20,
            skip: (praseInt(page) - 1) * 20,
            orderBy: { created_at: 'desc' },
            include: {
                customer: { select: { name: true, mobile: true } }, // See who bought it ..
                electrician: { select: { name: true, mobile: true } }, // See who bought it ..
                address: true
            }
        });

        res.status(200).json({
            success: true,
            orders
        })

    } catch (error) {
        next(error)
    }
}



export const updateOrderStatus = async (req, res, next) => {
    try {

        const { id } = req.params;
        const { status } = req.body;  // "CONFIRMED", "SHIPPED", "DELIVERED"

        const validstatus = ["PENDING", "PROCESSING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"];

        if (!validstatus.includes(status)) {
            return next(new ValidationError("Invalid Order Status"))
        }

        const order = await prisma.order.update({
            where: { id: parseInt(id) },
            data: {
                status: status,
                updated_at: new Date()
            }
        });

        // Final Idea : If status === "DELIVERED" send SMS/Notification  here

        res.status(200).json({
            success: true,
            message: `Order marked as  ${status} `,
            order
        })



    } catch (error) {
        next(error)
    }
}



export const requestReturn = async (req, res, next) => {
    try {

        const { id } = req.params; // Order ID 

        const { reason } = req.body;

        // 1. Check if Order is Delivered

        const order = await prisma.order.findUnique({
            where: {
                id: praseInt(id)
            }
        })

        if (order.status !== "DELIVERED") {
            return next(new ValidationError(`Can only return delivered items`))
        }

        // Change Status to "RETURN_REQUESTED" 

        await prisma.order.update({
            where: { id: parseInt(id) },
            data: { status: "RETURN_REQUESTED" }
            // Ideally , you'd save the 'reason' in a separate Returns table
        })

        res.status(200).json({
            success: true,
            message: `Return requisted . Admin will review`
        })

    } catch (error) {
        next(error)
    }
}



export const processReturn = async (req, res, next) => {
    try {

        const { id } = req.params;
        const { actions } = req.body;

        if (actions === "APPROVE") {
            // Transaction : Refund Money + Restock Items

            await prisma.$transaction(async (tx) => {
                const order = await tx.order.findUnique({
                    where: { id: parseInt(id) },
                    include: { orderItems: true }
                })
                
                //1. Restock
                for (const item of order.orderItems) {
                    await tx.product.update({
                        where: { id: item.product_id },
                        data: { stock: { increment: item.quantity } }
                    })
                }
                // 2. Makr as Returned

                await tx.order.update({
                    where:{id:praseInt(id)},
                    data : { status : "RETURNED"}
                });

            });

            res.status(200).json({
                success:true,
                message:`Return Approved & Stock Updated`
            })


        }else {
            // Reject Return

            await prisma.order.update({
                where : {id : parseInt(id)},
                data: { status : "DELIVERED"} // REVERT STATUS
            }); 

            res.status(200).json({
                success :true ,
                message : 'Return Rejected'
            })
        }

    } catch (error) {
         
        next(error)
    }
}



export const addtrackingDetails = async(req,res , next) => {
    try{ 

        const  { id} = req.error ; 
        const  { courier_name , tracking_id , estimated_date} = req.body ;


        // Validation
        if(!courier_name || !tracking_id){
            return next(new ValidationError(`Courier name and Tracking ID are required`))
        }

        const order = await prisma.order.update({
            where : { id: parseInt(id)},
            data : {
                status : "SHIPPED",
                courier_name ,
                tracking_id ,
                estimated_date : estimated_date ? new Date(estimated_date) : undefined,
                updated_at : new Date() 
            }
        });

        // Pro Tip :  Trigger an SMS/ Email to user here: 
        // sendSms(order.customer.phone , `Your Order is shiped via ${courier_name} , ${tracking_id}`)
        
        res.status(200).jons({
            success:true,
            message:`Order Shipped & Tracking Added`,
            order
        })

    }catch(error){
        next(error)
    }
}

// Allow for : Admin (Always) or User(Only if status is Pending)

export const updateOrderAddress = async (req,res,next) =>{
    try {
        const { id } = req.params;
        const { new_address_id} = req.body;
        const role = req.user.role ;
        const order = await prisma.order.findUnique({
            where : {
                id: parseInt(id)
            }
        })
        // Check Permission
        if(order.status !== "PENDING" && order.status !== "PROCESSING"){
            return next(new ValidationError("Cannot change address after order is processed"))
        }
        // Validate New Address
        const address = await prisma.userAddress.findUnique({
            where : {
                id:praseInt(new_address_id)
            }
        })
        if(!address){
            return next(new ValidationError(`Invalid Address ID`))
        }
        // Update the Prisma Database
        await prisma.order.update({
            where  :{ id: parseInt(id)},
            data:{shipping_address_id : praseInt(new_address_id)}
        })
        res.status(200).json({
            success:true,
            message: `Shipping Address Updated`
        })

    }catch(error){
        next(error)
    }
}


export const getOrderStats = async(req,res,next) =>{
    try{
        // Calculate Total Revenue (All Time)
        // Count Order by Status 
        const statusCounts = await prisma.order.groupBy({
            by:['status'],
            _count:{id:true}
        })

        // Get Today's Orders

        const todayStart = new Date();
        todayStart.setHours(0,0,0,0)

        const todaysOrder = await prisma.order.count({
            where : {
                created_at : {
                    gte:todayStart
                }
            }
        })

        res.status(200).json({
            success:true,
            stats:{
                totalRevenue : totalRevenue._sum.total_amount || 0,
                orderToday : todaysOrder ,
                breakdown : statusCounts // Returns [{status: "Shipped" , _count : 5}]
            }
        })

    }catch(error){
         next(Error)
    }
}