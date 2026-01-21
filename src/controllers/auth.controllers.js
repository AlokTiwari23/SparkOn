import { sendotpcode, validateRegistrationData, checkOtpRestrication, trackOtpRequests  , verifyotp} from "../utils/auth.helper.js"
import prisma from "../db/db.prisam.js"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { ValidationError } from "../middlewares/errorHandler/index.js"
// Registration a New Users
export const sendPhoneotp = async (req, res, next) => {
    try {
        const { phone_number } = req.body
        // Checking the phone Number Is valid or Not
        validateRegistrationData(phone_number)
        const existingUser = await prisma.user_customer.findUnique({
            where: {
                phone_number
                // So we have the {"eamil":thisisalok1334@gmail.com}
            }  // we have to into the where {column_name:value}
        })
        if (existingUser) {
            return next(new ValidationError("User already exists with this Phone Number"))
        }
        // first we check the otp restriction
        await checkOtpRestrication(phone_number);

        await trackOtpRequests(phone_number);

        await sendotpcode(phone_number)

        res.status(200).json({
            message: "OTP sent successfully to your phone number"


        })

    } catch (error) {
        next(error)
    }
}


export const verifyPhoneotp = async (req, res, next) => {
    try {

        const {phone_number,otp} = req.body

        await  verifyotp(phone_number,otp)


        res.status(200).json({
            success:true,
            message:"OTP Verified Successfully"
        })

    }catch(error){
        next(error)
    }



}

