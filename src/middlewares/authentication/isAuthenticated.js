import prisma from "../../db/db.prisam";
import jwt, { decode } from "jsonwebtoken";

const isAuthenticated = async (req, res, next) => {
    try {
        const token = req.cookies["accessToken"] ||
            req.cookies["seller-acccess-token"] ||
            req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({ message: "Unauthorized ! Token missing" })
        }

        // Verfiy token

        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

        if (!decode) {
            return res.status(401).json(
                {
                    message: "Unauthorized! Invalid token."
                }
            )
        }

        let account ;

        if (decode.role === "CUSTOMER") {
             account = await prisma.user_customer.findUnique({
                where: {
                    id: decoded.id
                }

            })
            req.customer = account
        }
        if (decode.role === "ELECTRICIAN") {
             account = await prisma.electrician_customer.findUnique({
                where: {
                    id: decoded.id
                }

            })
            req.electrican = account
        }
        if (decode.role === "Admin") {
             account = await prisma.admin.findUnique({
                where: {
                    id: decoded.id
                }

            })
            req.admin = account
        }

        if(!account){
            return res.status(404).json({
                message:"Account not found!"
            })
        }
        req.role = decoded.role;
        return next()

    } catch (error) {
        return res.status(401).json({
            message:"Unauthorized ! Token expired or Invalid token ..."
        })

    }
}

export default isAuthenticated