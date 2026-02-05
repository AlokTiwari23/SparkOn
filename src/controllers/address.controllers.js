
import { success } from "zod";
import prisma from "../db/db.prisam.js"
import { ValidationError } from "../middlewares/errorHandler/index.js"
import { add } from "winston";


// 1. Create Address

export const createAddress = async (req, res, next) => {
    try {

        const userId = req.user.id;
        const role = req.user.role; // 'CUSTOMER' or 'ELECTRICIAN'

        const {
            address_label, street_address, city,
            state, country, pincode
        } = req.body;

        // Validation 
        if(!street_address || !city || !pincode){
            return next(new ValidationError("Please fill all address fields"));
        }

        // prepare data based on whoe is logged in

        const dataPayload = {
            user_type:role,
            address_label: address_label || "HOME",
            street_address,
            city,
            state,
            country : country || "India",
            pincode,
            is_active :true

        }

        // Link to the correct ID Column

        if(role === "Electrician"){
            dataPayload.electrician_id = userId;

        }else{
            dataPayload.customer_id = userId
        }

        const address = await prisma.userAddress.create({
            data:dataPayload
        })

        res.status(201).json({
            success:true,
            address
        })

    } catch (error) {
        next(error)
    }
}

// 2. GET MY ADDRESSES

export const getMyAddresses = async(req,res,next) =>{
    try{
        const userId = req.user.id;
        const role = req.user.role;

        const whereClause = { is_active:true};

        if(role === "Electrician"){
            whereClause.electrician_id = userId
        }else {
            whereClause.customer_id = userId
        }
        
        const address = await prisma.userAddress.findMany({
            where : whereClause
        })

        res.status(200).json({
            success:true,
            address
        })

    }catch(error){
        next(error)
    }
}

export const updateAddress = async(req,res,next) =>{
    try{

        const { id } = req.params;
        const userId = req.user.id;
        const role = req.user.role ;
        const updates = req.body ;

        // Security : Ensure user owns this address before updating
        const address = await prisma.userAddress.findUnique({
            where : {
                id:parseInt(id)
            }
        })

        if(!address){
            return next(new Error(`Address not found`));
        }

        const isOwner = (role === "Electrician" && address.electrician_id === userId) ||
                        (role === "Customer" && address.customer_id === userId)
        

        if(!isOwner){
            return next(new Error(`Unauthorized to update this address`))
        }

        const updateAddress = await prisma.userAddress.update({
            where: {id:parseInt(id)},
            data:updates
        })
        
        res.status(200).json({
            success:true,
            address:updateAddress
        })


    }catch(error){
        next(error)
    }
}

export const deleteAddress = async(req,res,next) =>{
    try{

        const {id} = req.params;

        await prisma.userAddress.update({
            where:{id:parseInt(id)},
            data :{is_active:false}
        })

        res.status(200).json({
            success:true,
            message : `Address removed`
        })

    }catch(error){
        next(error)
    }
}


export const setDefaultAddress = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const role = req.user.role;

        const userFilter = role === "Electrician" ? { electrician_id: userId } : { customer_id: userId };

        await prisma.$transaction([
            // 1. Remove default from ALL user's addresses
            prisma.userAddress.updateMany({
                where: { ...userFilter },
                data: { is_active: false } // Assuming is_active handles your 'default' or add is_default
            }),
            // 2. Set this specific one as default
            prisma.userAddress.update({
                where: { id: parseInt(id) },
                data: { is_active: true }
            })
        ]);

        res.status(200).json({ success: true, message: "Default address updated" });
    } catch (error) { next(error); }
};