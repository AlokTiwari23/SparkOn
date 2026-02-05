import prisma from "../db/db.prisam.js"
import { ValidationError } from "../middlewares/errorHandler/index.js"

//  Create Payment Order (Before showing Razorpay UI)

export const createPaymentOrder = async (req, res, next) => {
    try {

        const { orderId } = req.body;

        const order = await prisma.order.findUnique({
            where: { id: parseInt(orderId) }
        });

        if (!order) {
            return next(new ValidationError(`Order not found`));
        }

        // Logic to create Razorpay Order ID would go here ... 
        // const razorpayOrder = ....

        res.status(200).json({
            success: true,
            orderId: order.id,
            amount: order.total_amount,
            // razorpayOrderId : razorpayOrder.id
        })

    } catch (error) {
        next(error)
    }

}


export const verfiyPayment = async(req,res,next) =>{
    try{

        const { orderId, gatewayTxnId , method} = req.body;
        const userId = req.user.id; // Assuming logged in as UserCustomer


        // Reload in Payment Table

        const payment = await prisma.paymentIn.create({
            data:{
                order_id : parseInt(orderId),
                customer_id : userId,    // Links to UserCustomer
                gateway_txn_id : gatewayTxnId,  // e.g., "pay_298371928"
                amount : 0 ,   // ⚠️ Fetch exact amount from Order in DB
                method : method || "ONLINE",  // "UPI", "CARD", etc.
                status : "SUCCESS"    // Enum: PaymentStatus
            }
        })


        // Update amount from the order itself to be safe

        const order = await prisma.order.update({
            where : { id : parseInt(orderId)},
            data:{
                payment_status : "PAID",
                order_status  : "CONFIRMED"
            }
        });

        // Update the payment record with the real amount

        await prisma.paymentIn.update({
            where : { id:payment.id},
            data : {amount : order.total_amount}
        });

        res.status(200).json({
            message: 'Payment Recorded',
            success:true,
            payment
        })

    }catch(error){
        next(error)
    }
}


