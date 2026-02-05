import { success } from "zod";
import prisma from "../db/db.prisam.js"

export const getNotification = async(req,res,next) =>{
    try{

        const userId = req.user.id ;
        const role = req.user.role ;

        // Note: You need a 'Notification' model in your schema linked to generic user IDs 
        // or separate customer_id/electrician_id fields. 
        // Assuming your schema handles it or you add a simple model:
        
        /* model Notification {
              id Int @id @default(autoincrement())
              customer_id Int?
              electrician_id Int?
              title String
              message String
              is_read Boolean @default(false)
              created_at DateTime @default(now())
           }
        */

        
           const whereClause = role === "Electrician"
                 ? {electrician_id : userId}
                 :{customer_id : userId}

            const notification = await prisma.notification.findMany({
                where:whereClause,
                orderBy: { created_at : 'desc'},
            });

            res.status(200).json({
                success:true,
                notification
            })


    }catch(error){
        next(error)
    }
}


export const markRead = async (req,res,next) =>{
    try{

        const {id} = req.params ; 
        await prisma.notification.update({
            where : { id: parseInt(id)},
            data : { is_read : true}
        })

        res.status(200).json({
            success : true
        })

    }catch(error){
        next(error)
    }
}