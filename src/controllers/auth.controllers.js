import { sendotpcode, validateRegistrationData, checkOtpRestrication, trackOtpRequests, verifyOtp } from "../utils/auth.helper.js"
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
            }
            // we have to into the where {column_name:value}
        })

        if (existingUser) {
            return next(new ValidationError("User already exists with this Phone Number"))
        }
        // first we check the otp restriction
        await checkOtpRestrication(phone_number);

        await trackOtpRequests(phone_number);

        await sendotpcode(phone_number)

        res.status(200).json({
            message: "OTP sent successfully .Please verify your email"

        })

    } catch (error) {
        next(error)
    }
}

export const verifyUser = async (req, res, next) => {
    try {
        const registerSchema = z.object({
            name: z.string()
                .trim()
                .min(2, { message: "Name must be at least 2 characters" }),

            email: z.string()
                .trim()
                .email({ message: "Invalid email address" }),
            otp: z.string()
                .regex(/^\d{4}$/, { message: "OTP must be exactly 4 digits" }),

            phone_number: z.string()
                .regex(/^[6-9]\d{9}$/, { message: "Invalid Indian phone number" }),
        });


        const data = registerSchema.parse(req.body); // auto throw an error

        if (!data) {
            return next(new ValidationError("There is an error on the Data"))
        }


        const { name, email, password, otp, phone_number } = data

        const existingUser = await prisma.user_customer.findUnique({
            where: {
                email: email
            }
        })

        if (existingUser) {
            return next(new ValidationError("User already exists with this email"))
        }

        await verifyOtp(email, otp, next);

        const hashedPassword = await bcrypt.hash(password, 6);

        await prisma.user_customer.create({
            data: { name, email, password_hash: hashedPassword, phone_number }
        })


        res.status(201).json({
            success: true,
            message: "User registered successfully !!"
        })



    } catch (error) {
        next(error)
    }
}