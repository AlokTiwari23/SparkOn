import { otprequest, validateRegistrationData, savedata } from "../utils/auth.helper.js"
import prisma from "../db/db.prisam.js"
import bcrypt from "bcryptjs"
import { ValidationError } from "../middlewares/errorHandler/index.js"
import redis from "../db/redis.js"
import jwt from "jsonwebtoken"
import { setCookie } from "../utils/setCookie.js"
import { set } from "mongoose"
// Registration a New Users

// # First Collect User Data  -> Store in the Redis (Temprorarily) -> VerifyOTP -> Save to Database only after success



export const registerUser = async (req, res, next) => {

    try {

        const { name, phone_number, role } = req.body

        if (!name || !phone_number || !role) {
            next(new ValidationError("All fields are required"))
        }

        // Checking the phone Number Is valid or Not
        validateRegistrationData(phone_number)

        let existingUser = null;


        if (role === "CUSTOMER") {
            existingUser = await prisma.user_customer.findUnique({
                where: {
                    phone_number
                    // So we have the {"eamil":thisisalok1334@gmail.com}
                }  // we have to into the where {column_name:value}
            })
        } else if (role === "ELECTRICIAN") {
            existingUser = await prisma.electrician_customer.findUnique({
                where: {
                    phone_number
                    // So we have the {"eamil":thisisalok1334@gmail.com}
                }  // we have to into the where {column_name:value}
            })
        } else {
            next(new ValidationError("Invalid Role"))
        }





        if (existingUser) {
            next(new ValidationError("User already exists with this phone number"))

        }

        //  set the role and phone_number in the redis data base 

        await redis.set(`info:${phone_number}`, JSON.stringify({ name, role }), "EX", 300) // Expired in 300 second

        await otprequest(phone_number)

        res.status(200).json({
            success: true,
            message: "OTP sent successfully"
        })

    } catch (error) {
        next(new ValidationError(error.message))
    }
}


export const verfiyuser = async (req, res, next) => {
    try {

        const { phone_number, otp } = req.body
        if (!phone_number || !otp) {
            next(new ValidationError("All fields are required"))
        }
        const [userInfo, saved_otp] = await Promise.all([
            redis.get(`info:${phone_number}`),
            redis.get(`otp:${phone_number}`)
        ])

        if (!userInfo || !saved_otp) {
            next(new ValidationError(`Please request a new OTP`))
        }

        if (otp !== saved_otp) {
            next(new ValidationError(`Wrong OTP`))
        }
        const { name, role } = JSON.parse(userInfo)

        const user = await savedata(name, phone_number, role)

        await Promise.all([
            redis.del(`info:${phone_number}`),
            redis.del(`otp:${phone_number}`)
        ])
        //  Creating and refresh and access token
        const accessToken = jwt.sign({ id: user.id, name: user.name, role }, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: "15m"

        })

        const refreshToken = jwt.sign({ id: user.id, name: user.name, role }, process.env.REFRESH_TOKEN_SECRET, {
            expiresIn: "7d"

        })

        // store the refresh and access token in an httpOnly secure cookies

        setCookie(res, "accessToken", accessToken)
        setCookie(res, "refreshToken", refreshToken)

        res.status(200).json({
            success: true,
            message: "User registered successfully",
            user: {
                id: user.id,
                name: user.name,
                role: user.role
            },
            token: {
                accessToken,
                refreshToken
            }
        })
    } catch (error) {
        next(new ValidationError(error.message))
    }
}


export const loginuser = async (req, res, next) => {

    try {
        const { phone_number } = req.body

        if (!phone_number) {
            next(new ValidationError("All fields are required"))
        }
        // Run both queries at the exact same time
        const [customerUser, electricianUser] = await Promise.all([
            prisma.user_customer.findUnique({ where: { phone_number } }),
            prisma.electrician_customer.findUnique({ where: { phone_number } })
        ]);

        // Now determine which one was found (if any)
        const user = customerUser || electricianUser;




        if (!user) {
            next(new ValidationError("User not found"))
        }

        await otprequest(phone_number)

        res.status(200).json({
            success: true,
            message: "OTP sent successfully"
        })

    } catch (error) {
        next(new ValidationError(error.message))
    }
}


export const verifyloginotp = async (req, res, next) => {
    try {
        const { phone_number, otp } = req.body
        if (!phone_number || !otp) {
            next(new ValidationError("All fields are required"))
        }

        const saved_otp = await redis.get(`otp:${phone_number}`)

        if (!saved_otp) {
            next(new ValidationError(`Please request a new OTP`))
        }

        if (otp !== saved_otp) {
            next(new ValidationError(`Wrong OTP`))
        }

        // 🚀 FIX 1: Capture the variables!
        const [customerUser, electricianUser] = await Promise.all([
            prisma.user_customer.findUnique({ where: { phone_number } }),
            prisma.electrician_customer.findUnique({ where: { phone_number } })
        ]);

        // 🚀 FIX 2: Determine User AND Role
        let user = null;
        let role = null;

        if (customerUser) {
            user = customerUser;
            role = "CUSTOMER";
        } else if (electricianUser) {
            user = electricianUser;
            role = "ELECTRICIAN";
        }



        if (!user) {
            next(new ValidationError("User not found"))
        }


        await Promise.all([
            redis.del(`otp:${phone_number}`)
        ])
        //  Creating and refresh and access token
        const accessToken = jwt.sign({ id: user.id, name: user.name, role }, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: "15m"

        })

        const refreshToken = jwt.sign({ id: user.id, name: user.name, role }, process.env.REFRESH_TOKEN_SECRET, {
            expiresIn: "7d"

        })

        // store the refresh and access token in an httpOnly secure cookies

        setCookie(res, "accessToken", accessToken)
        setCookie(res, "refreshToken", refreshToken)

        res.status(200).json({
            success: true,
            message: "User Logined successfully",
            user: {
                id: user.id,
                name: user.name,
                role: user.role
            },
            token: {
                accessToken,
                refreshToken
            }
        })


    } catch (error) {
        next(new ValidationError(error.message))
    }

}