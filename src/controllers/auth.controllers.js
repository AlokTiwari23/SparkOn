import { otprequest,validateRegistrationData , savedata ,verifyotp} from "../utils/auth.helper.js"
import prisma from "../db/db.prisam.js"
import { success, z } from "zod"
import bcrypt from "bcryptjs"
import { ValidationError } from "../middlewares/errorHandler/index.js"
import { th } from "zod/v4/locales"
import redis from "../db/redis.js"
// Registration a New Users

// # First Collect User Data  -> Store in the Redis (Temprorarily) -> VerifyOTP -> Save to Database only after success



export const registerUser = async(req,res,next) =>{

    try{

        const {name , phone_number ,role } = req.body
        
        if(!name || !phone_number || !role){
            throw new ValidationError("All fields are required")
        }
        
        // Checking the phone Number Is valid or Not
        validateRegistrationData(phone_number)
         
         let existingUser = null;


        if(role === "CUSTOMER"){
            existingUser = await prisma.user_customer.findUnique({
            where: {
                phone_number
                // So we have the {"eamil":thisisalok1334@gmail.com}
            }  // we have to into the where {column_name:value}
        })
        }else if(role === "ELECTRICAN"){
            existingUser = await prisma.electrician_customer.findUnique({ 
                where: {
                    phone_number
                    // So we have the {"eamil":thisisalok1334@gmail.com}
                }  // we have to into the where {column_name:value}
            })
        }else{
            throw new ValidationError("Invalid Role")
        }

        


        
        if(existingUser){
            throw new ValidationError("User already exists with this phone number")

        }

        //  set the role and phone_number in the redis data base 

        await redis.set(`info:${phone_number}`,JSON.stringify({name,role}), "EX", 300) // Expired in 300 second

        await otprequest(phone_number)

        res.status(200).json({
            success:true,
            message:"OTP sent successfully"
        })

    }catch(error){
        next(error)
    }
}


export const verfiyuser = async(req,res,next) =>{
    try{
        
        const {phone_number , otp} = req.body

        if(!phone_number || !otp){
            throw new ValidationError("All fields are required")}


        await verifyotp(phone_number,otp)

        const userInfo = await redis.get(`info:${phone_number}`)

        const {name,role} = JSON.parse(userInfo)

        await savedata(name,phone_number,role)




    }catch(error){
        next(error)
    }
}
