import prisma from "../db/db.prisam";

export const updateProfile = async(req,res,next) =>{
    try{

        const userId = req.user.id;
        const role = req.user.role ; 
        const {name , email} = req.body ;

        // Handle Image Upload

        const dataToupdate = {
            ...email(name && {name}),
            ... (email && {email}),
            
        };

        if(role === "Electrician"){
            await prisma.ElectricianCustomer.update({
                where : { id:userId},
                data : dataToupdate
            });
        }else {
            await prisma.UserCustomer.update({
                where : { id: userId},
                data : dataToupdate
            });
        }

        res.status(200).json({
            success :true ,
            message: `Profile Updated`
        })

    }catch(error){
        next(error)
    }
}