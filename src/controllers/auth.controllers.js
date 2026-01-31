import { otprequest, validateRegistrationData, savedata } from "../utils/auth.helper.js"
import prisma from "../db/db.prisam.js"
import bcrypt from "bcryptjs"
import { ValidationError } from "../middlewares/errorHandler/index.js"
import redis from "../db/redis.js"
import jwt, { decode } from "jsonwebtoken"
import { setCookie } from "../utils/setCookie.js"

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
            existingUser = await prisma.UserCustomer.findUnique({
                where: {
                    phone_number
                    // So we have the {"eamil":thisisalok1334@gmail.com}
                }  // we have to into the where {column_name:value}
            })
        }
        if (role === "Electrician") {
            existingUser = await prisma.ElectricianCustomer.findUnique({
                where: {
                    phone_number
                    // So we have the {"eamil":thisisalok1334@gmail.com}
                }  // we have to into the where {column_name:value}
            })
        }





        if (existingUser) {
            if(existingUser.isActive === true){
                return next(new ValidationError("User already exists with this phone number"))    }
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
        const { phone_number, otp } = req.body;

        if (!phone_number || !otp) {
            return next(new ValidationError("All fields are required"));
        }

        // 1. Get Data from Redis
        const [userInfo, saved_otp] = await Promise.all([
            redis.get(`info:${phone_number}`),
            redis.get(`otp:${phone_number}`)
        ]);

        if (!userInfo || !saved_otp) {
            return next(new ValidationError(`OTP expired. Please request a new one.`));
        }

        if (otp !== saved_otp) {
            return next(new ValidationError(`Wrong OTP`));
        }

        const { name, role } = JSON.parse(userInfo);

        // 2. Save User to Database
        // This function now handles the error correctly
        const user = await savedata(name, phone_number, role);

        // 3. Clear Redis
        await Promise.all([
            redis.del(`info:${phone_number}`),
            redis.del(`otp:${phone_number}`)
        ]);

        // 4. Generate Tokens
        // FIX: Added 'id' and fixed the 'phone_number' bug
        const accessToken = jwt.sign(
            {
                id: user.id,
                name: user.name,
                role: role, // Ensure this role string is correct
                phone_number: user.phone_number
            },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "15m" }
        );

        const refreshToken = jwt.sign(
            {
                id: user.id,
                name: user.name,
                role: role,
                phone_number: user.phone_number
            },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: "90d" }
        );

        // 5. Set Cookies
        // res.cookie('accessToken', accessToken, { httpOnly: true, secure: true, sameSite: 'None' });
        res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true, sameSite: 'None', maxAge: 90 * 24 * 60 * 60 * 1000 });

        // 6. Send Response
        res.status(200).json({
            success: true,
            message: "User registered successfully",
            accessToken, // Frontend needs this!
            user: {
                id: user.id,
                name: user.name,
                role: role // 'Consumer' or 'Electrician'
            }
        });

    } catch (error) {
        // Pass the error to your error handler middleware
        next(error);
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
            prisma.UserCustomer.findUnique({ where: { phone_number } }),
            prisma.ElectricianCustomer.findUnique({ where: { phone_number } })
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
            prisma.UserCustomer.findUnique({ where: { phone_number } }),
            prisma.ElectricianCustomer.findUnique({ where: { phone_number } })
        ]);

        // 🚀 FIX 2: Determine User AND Role
        let user = null;
        let role = null;

        if (customerUser) {
            user = customerUser;
            role = "Consumer";
        } else if (electricianUser) {
            user = electricianUser;
            role = "Electrician";
        }



        if (!user) {
            next(new ValidationError("User not found"))
        }


        await Promise.all([
            redis.del(`otp:${phone_number}`)
        ])
        //  Creating and refresh and access token
        const accessToken = jwt.sign({ id: user.id, name: user.name, role, phone_number: user.phone_number }, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: "15m"

        })

        const refreshToken = jwt.sign({ id: user.id, name: user.name, role, phone_number: user.phone_number }, process.env.REFRESH_TOKEN_SECRET, {
            expiresIn: "90d"

        })

        // store the refresh and access token in an httpOnly secure cookies

        // setCookie(res, "accessToken", accessToken)
        setCookie(res, "refreshToken", refreshToken)

        res.status(200).json({
            success: true,
            message: "User Logined successfully",
            user: {
                id: user.id,
                name: user.name,
                role: user.role
            },

            accessToken

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

        const admin = await prisma.Admin.findUnique({ where: { email } });

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
            expiresIn: "90d"

        })

        // store the refresh and access token in an httpOnly secure cookies

        // setCookie(res, "accessToken", accessToken)
        setCookie(res, "refreshToken", refreshToken)

        res.json({
            success: true,
            message: "Login Successfully",
            accessToken,

            admin: {
                id: admin.id,
                email: admin.email
            }
        });

    } catch (error) {
        return res.status(500).json({ message: "Server error. Please try again." });
    }


}


export const userlogout = async (req, res, next) => {


    // 2. Destroy the Refresh Token Cookie (Crucial!)
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: true,
        sameSite: 'None'
    });

    return res.status(200).json({
        success: true,
        message: "Logged out successfully"
    })
}

export const adminlogout = async (req, res, next) => {

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


export const refreshUserToken = async (req, res, next) => {
    try {
        const cookies = req.cookies;

        if (!cookies?.refreshToken) {
            return res.status(401).json({
                'message': `There is not the Token`
            });
        }

        const refreshToken = cookies.refreshToken

        // refresh token 

        jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, async (error, decoded) => {
            if (error) {
                return res.status(403).json({ message: `Invalid Token` })
            }



            //    / 3. Create clean payload
            const payload = {
                id: decoded.id,
                name: decoded.name,
                role: decoded.role,
                phone_number: decoded.phone_number
            };

            // 4. Generate NEW Tokens
            const newAccessToken = jwt.sign(
                payload,
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '15m' }
            );

            const newRefreshToken = jwt.sign(
                payload,
                process.env.REFRESH_TOKEN_SECRET,
                { expiresIn: '7d' }
            );

            // 5. UPDATE COOKIES (The "Double Update" Strategy)

            // Update Refresh Token (So it rotates)
            res.cookie('refreshToken', newRefreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'None',
                maxAge: 90 * 24 * 60 * 60 * 1000 // 7 days
            });

            // ⬇️ THIS IS THE PART YOU ASKED ABOUT ⬇️
            // Update Access Token Cookie (So middleware sees the new one too!)
            // res.cookie('accessToken', newAccessToken, {
            //     httpOnly: true,
            //     secure: true,
            //     sameSite: 'None',
            //     maxAge: 15 * 60 * 1000 // 15 minutes
            // });
            // ⬆️ END OF NEW PART ⬆️

            // 6. Send response to frontend
            res.json({ accessToken: newAccessToken });
        })

    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }

}

export const refreshAdminToken = async (req, res, next) => {

    try {
        const cookies = req.cookies;

        if (!cookies?.refreshToken) {
            return res.status(401).json({
                'message': `There is not the Token`
            });
        }

        const refreshToken = cookies.refreshToken

        jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, async (error, decoded) => {
            if (error) return res.status(403).json({ message: `Invalid Token` })

            const payload = {
                id: decoded.id,
                email: decoded.email,
                role: decoded.role,

            };

            // 4. Generate NEW Tokens
            const newAccessToken = jwt.sign(
                payload,
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '15m' }
            );

            const newRefreshToken = jwt.sign(
                payload,
                process.env.REFRESH_TOKEN_SECRET,
                { expiresIn: '90d' }
            );
            res.cookie('refreshToken', newRefreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'None',
                maxAge: 90 * 24 * 60 * 60 * 1000 // 7 days
            });


            res.json({ accessToken: newAccessToken });
        })


    } catch (error) {
        res.status(500).json({ message: "Server Error" });

    }

}


export const getUserdata = async (req, res, next) => {
    try {

        console.log(req)
        // 1. Check if middleware attached the user
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        let user = null;

        // 2. Search in the correct table based on the Role in the Token
        if (req.user.role === "Electrician") {
            user = await prisma.ElectricianCustomer.findUnique({
                where: { id: req.user.id },
                select: { id: true, name: true, phone_number: true, referral_code: true }
            });
        }
        else if (req.user.role === "Consumer") {
            user = await prisma.UserCustomer.findUnique({
                where: { id: req.user.id },
                select: { id: true, name: true, phone_number: true }
            });
        }

        // 3. Handle User Not Found
        if (!user) {
            return res.status(404).json({ message: "User record not found in database" });
        }

        // 4. Send Back Data
        res.status(200).json({
            success: true,
            user: {
                ...user,
                role: req.user.role // Send the role back so frontend knows who they are
            }
        });

    } catch (error) {
        console.error("GetMe Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
}



export const getAdmindata = async (req, res, next) => {
    // The Middleware (verfiy token) already attached the user to req.user
    // So just search in the database

    try {
        const admin = await prisma.Admin.findUnique({
            where: {
                id: req.user.id
            },
            select: {
                id: true,
                email: true
            }

        })
        if (!admin) {
            return res.status(404).json({
                message: "User not Found"
            })
        }
        res.json({ success: true, admin });

    } catch (error) {
        return res.status(500).json({
            message: 'Server in Finding Admin'
        })
    }
}




export const deleteUseAccount = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;

        // Here we make the soft deleted So the order data is not deleted 
        // Mark user as deleted (Soft Dalete)
        if (role === 'Consumer') {
            await prisma.UserCustomer.update({
                where: { id: userId },
                data: { isActive: false, deletedAt: new Date() } // Ensure schema has these fields
            })
        } else if (role === 'Electrician') {
            await prisma.ElectricianCustomer.update({
                where: { id: userId },
                data: { isActive: false, deletedAt: new Date() }
            });
        }
        res.clearCookie('refreshToken', { httpOnly: true, secure: true, sameSite: 'None' });

        res.status(200).json({ success: true, message: "Account deleted successfully" });


    } catch (error) {
        return res.status(500).json({
            message: `Server in Finding Admin ${error}`
        })

    }
}