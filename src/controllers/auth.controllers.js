import { sendOtp, validateRegistrationData, checkOtpRestrication, trackOtpRequests } from "../utils/auth.helper.js"
import prisma from "../db/db.prisam.js"
import { z } from "zod"
import { ValidationError } from "../middlewares/errorHandler/index.js"
// Registration a New Users
export const userRegistraion = async (req, res, next) => {
    try {
        const { name, email } = req.body

        validateRegistrationData(req.body, "user")

        const existingUser = await prisma.user_customer.findUnique({
            where: {
                email
                // So we have the {"eamil":thisisalok1334@gmail.com}
            }
            // we have to into the where {column_name:value}
        })

        if (existingUser) {
            return next(new ValidationError("User already exists with this email"))
        }
        // first we check the otp restriction
        await checkOtpRestrication(email);

        await trackOtpRequests(email);

        await sendOtp(email, name, "user-activation-mail")

        res.status(200).json({
            message: "OTP sent successfully .Please verify your email"

        })

    } catch (error) {
        next(error)
    }
}

export const verfiyUser = async (req, res, next) => {
    try {
        const registerSchema = z.object({

            name: z.string().min(2, { message: "Name must be at least 2 characters" }),

            email: z.string().email({ message: "Invalid email address" }),

            password: z.string().min(6, { message: "Password must be at least 6 characters" }),

            otp: z.string().min(4, { message: "otp min 4 characters" }),


        });

        const result = registerSchema.safeParse(req.body);

        if (!result.success) {
            const errorMessage = result.error.errors[0].message;
            throw new ValidationError(errorMessage);

        }
        const {name , email , password , otp} = result.data

        const existingUser = await prisma.user_customer.findUnique({
            where: {
                email: email
            }
        })
        
        if(existingUser){
            return next(new ValidationError("User already exists with this email"))
        }
        
        await verfiyotp()




    } catch (error) {
        next(error)
    }
}