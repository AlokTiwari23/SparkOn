import prisma from "../db/db.prisam.js"
import { ValidationError } from "../middlewares/errorHandler/index.js";


export const processPayout = async(req,res,next)=>{
    try{

        const { id } = req.params ;  // Payout Request ID
        const { action , bank_utr } = req.body ; // "APPROVED" OR "REJECT"
        
        const payout = await prisma.payoutRequest.findUnique({
            where:{id:parseInt(id)}
        })

        if(!payout){
            return next(new ValidationError(`Request not found`))
        }

        if(action === "APPRIVE") {
            // Mark as Processed

            await prisma.payoutRequest.update({
                where : { id : parseInt(id)},
                data :{ 
                    status: 'PROCESSED',
                    bank_utr: bank_utr , 
                    processed_at :  new Date()
                }
            })

            res.status(200),json({
                success : true,
                message : "Payout Approved"
            })
        }else if (action === "REJECT"){
            // Mark as Failed

            await prisma.payoutRequest.update({
                where:{ id :parseInt(id)},
                data : {status : "FAILED"}
            })

            // REFUND Money back to Wallet (Since we locked it earlier)

            await prisma.walletLedger.create({
                data:{
                    electrician_id : payout.electrician_id,
                    type : "CREDIT",
                    category : "REFUND_REVERSAL",
                    amount : payout.amount,
                    reference_id : `REV-${payout.id}`,
                    description : "Payout Rejected - Refunded"
                }
            });

            res.status(200).json({
                success :true , 
                message:`Payout Reject & Refunded`
            })
        }


    }catch(error){
        next(error)
    }
}

export const  getAllPayoutRequest = async(req,res,next) =>{
    try{

        const {status} = req.query ; 

        const whereClause = {};
        if(status){
            whereClause.status = status ; 
        }

        const payouts = await prisma.payoutRequest.findMany({
            where: whereClause,
            orderBy : { id: 'desc'},
            include :{
                electrician:{
                    select :{
                        id:true,
                        name:true ,
                        phone_number :true
                        // bank_account: true // If you stored bank details in the Electrician model

                    }
                }
            }
        });

        res.status(200).json({
            success :true,
            count : payouts.length ,
            payouts
        })

    }catch(error){
        next(error)
    }
}