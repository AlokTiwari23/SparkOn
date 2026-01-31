import { otprequest, validateRegistrationData, savedata } from "../utils/auth.helper.js"
import prisma from "../db/db.prisam.js"
import bcrypt from "bcryptjs"
import { ValidationError } from "../middlewares/errorHandler/index.js"
import redis from "../db/redis.js"
import jwt, { decode } from "jsonwebtoken"
import { setCookie } from "../utils/setCookie.js"
import { set } from "mongoose"
import { success } from "zod"
import { http } from "winston"
import { cookie } from "express-validator"
// Registration a New Users

// # First Collect User Data  -> Store in the Redis (Temprorarily) -> VerifyOTP -> Save to Database only after success



export const registerUser = async (req, res, next) => {

    try {

        const { name, phone_number, role } = req.body

        if (!name || !phone_number || !role) {
            return next(new ValidationError("All fields are required"))
        }

        // Checking the phone Number Is valid or Not
        validateRegistrationData(phone_number)

        let existingUser = null;


        if (role === "Consumer") {
            existingUser = await prisma.user_customer.findUnique({
                where: {
                    phone_number
                    // So we have the {"eamil":thisisalok1334@gmail.com}
                }  // we have to into the where {column_name:value}
            })
        }
        if (role === "Electrician") {
            existingUser = await prisma.electrician_customer.findUnique({
                where: {
                    phone_number
                    // So we have the {"eamil":thisisalok1334@gmail.com}
                }  // we have to into the where {column_name:value}
            })
        }





        if (existingUser) {
            return next(new ValidationError("User already exists with this phone number"))

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
            return next(new ValidationError("All fields are required"))
        }
        const [userInfo, saved_otp] = await Promise.all([
            redis.get(`info:${phone_number}`),
            redis.get(`otp:${phone_number}`)
        ])

        if (!userInfo || !saved_otp) {
            return next(new ValidationError(`Please request a new OTP`))
        }

        if (otp !== saved_otp) {
            return next(new ValidationError(`Wrong OTP`))
        }
        const { name, role } = JSON.parse(userInfo)

        const user = await savedata(name, phone_number, role)

        await Promise.all([
            redis.del(`info:${phone_number}`),
            redis.del(`otp:${phone_number}`)
        ])
        //  Creating and refresh and access token
        const accessToken = jwt.sign({ id: user.id, name: user.name, role , phone_number : user,phone_number }, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: "15m"

        })

        const refreshToken = jwt.sign({ id: user.id, name: user.name, role , phone_number : user.phone_number }, process.env.REFRESH_TOKEN_SECRET, {
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

            accessToken,
            refreshToken

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
            return next(new ValidationError("User not found. Please Register first."));
        }

        // 2. Determine Role & Name
        const role = customerUser ? "Consumer" : "Electrician";
        const name = user.name;

        // 3. 🚨 THIS IS THE FIX: Save Info to Redis 🚨
        // If you skip this, verifyUser will fail!
        await redis.set(`info:${phone_number}`, JSON.stringify({ name, role }), "EX", 300);


        if (!user) {
            return next(new ValidationError("User not found"))
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
        const accessToken = jwt.sign({ id: user.id, name: user.name, role , phone_number : user.phone_number }, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: "15m"

        })

        const refreshToken = jwt.sign({ id: user.id, name: user.name, role , phone_number : user.phone_number }, process.env.REFRESH_TOKEN_SECRET, {
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

            accessToken,
            refreshToken

        })


    } catch (error) {
        next(new ValidationError(error.message))
    }

}


export const resendotp = async (req, res, next) => {
    try {
        const { phone_number } = req.body;

        if (!phone_number) {
            return next(new ValidationError("Phone number is required"));
        }

        // Just trigger the OTP request function again
        await otprequest(phone_number);

        res.status(200).json({
            success: true,
            message: "OTP resent successfully"
        });

    } catch (error) {
        next(new ValidationError(error.message));
    }
}


export const adminlogin = async (req, res, next) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return next(new ValidationError(`All Field's required`))
    }
    try {

        const admin = await prisma.admin.findUnique({ where: { email } });

        if (!admin) {
            return res.status(404).json({
                message: "Invalid credentials"
            })
        }
        const isMatch = await bcrypt.compare(password, admin.password)
        if (!isMatch) {
            return res.status(401).json({
                message: 'Password Incorrect'
            })
        }
        const accessToken = jwt.sign({ id: admin.id, email: admin.email, role: 'Admin' }, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: "15m"
        })
        const refreshToken = jwt.sign({ id: admin.id, email: admin.email, role: 'Admin' }, process.env.REFRESH_TOKEN_SECRET, {
            expiresIn: "7d"

        })

        // store the refresh and access token in an httpOnly secure cookies

        setCookie(res, "accessToken", accessToken)
        setCookie(res, "refreshToken", refreshToken)

        res.json({
            success: true,
            message: "Login Successfully",
            accessToken,
            refreshToken,
            admin: {
                id: admin.id,
                email: admin.email
            }
        });

    } catch (error) {
        return res.status(500).json({ message: "Server error. Please try again." });
    }


}


export const userlogout = async(req,res,next) =>{
    res.clearCookie('accessToken', {
        httpOnly: true,
        secure: true,
        sameSite: 'None'
    });

    // 2. Destroy the Refresh Token Cookie (Crucial!)
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: true,
        sameSite: 'None'
    });

    return res.status(200).json({
        success:true,
        message:"Logged out successfully"
    })
}

export const adminlogout = async(req,res,next) =>{
    res.clearCookie('accessToken',{
        httpOnly:true,
        secure:true,
        sameSite:'None'
    })
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: true,
        sameSite: 'None'
    });
    return res.status(200).json({ 
        success: true, 
        message: "Logged out successfully" 
    });
}


export const refreshUserToken = async(req,res,next) =>{
    try{
        const cookies =req.cookies;

        if(!cookies?.refreshToken){
            return res.status(401).json({
                'message':`There is not the Token`
            }); 
        }

        const refreshToken = cookies.refreshToken

        jwt.verify(refreshToken , process.env.REFRESH_TOKEN_SECRET , async(error, decode) =>{
            if(err) return res.status(403).json({message:`Invalid Token`})



            const accessToken = jwt.sign(
                {
                    id : decode.id,
                    name:decode.name,
                    role:decode.role,
                    phone_number:decode.phone_number
                },
                process.env.ACCESS_TOKEN_SECRET,
                {expiresIn:'15m'}
            );

            res.json({accessToken})
        })

    }catch(error){
        res.status(500).json({ message: "Server Error" });
    }

}

export const refreshAdminToken = async(req,res,next) =>{

    try{
        const cookies =req.cookies;

        if(!cookies?.refreshToken){
            return res.status(401).json({
                'message':`There is not the Token`
            }); 
        }

        const refreshToken = cookies.refreshToken

        jwt.verify(refreshToken , process.env.REFRESH_TOKEN_SECRET , async(error, decode) =>{
            if(err) return res.status(403).json({message:`Invalid Token`})



            const accessToken = jwt.sign(
                {
                    id : decode.id,
                    email:decode.email,
                    role:'Admin'
                },
                process.env.ACCESS_TOKEN_SECRET,
                {expiresIn:'15m'}
            );

            res.json({accessToken})
        })


    }catch(error){
        res.status(500).json({ message: "Server Error" });

    }

}