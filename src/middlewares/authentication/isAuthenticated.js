import prisma from "../../db/db.prisam";
import jwt, { decode } from "jsonwebtoken";



export const verfiyToken =  async(req,res,next) =>{
    try{

         let token;

        //Check1 : Look in Cookies (Web Admin usually uses this)

        if(req.cookies && req.cookies.accessToken){
            token = req.cookies.accessToken;
        }
        
        // Check 2 : Look inHeader (Mobile App usually uses this)
        // Formate : "Bearer eyJhGciOi...."

        else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
            token = req.headers.authorization.split(' ')[1];
        }


        // If no token found anywhere
        if(!token){
            return res.status(401).json({message:"Access Denied. No token provided"})
        }


        // Verfiy the token

        const decoded = jwt.verify(token , process.env.ACCESS_TOKEN_SECRET)

        // Attacted user info to the request object so controllers can use it
        // We use 'req.user' fro EVERYONE (Admin , Electrican , Consumer)
        req.user = decoded ;

        next();

    }catch(error){
        return res.status(500).json({
            message:'Error in the Verfity Middelware'
        })
    }

}


export const verfiyAdmin = (req,res,next) =>{
    if(req.user && req.user.role === 'Admin'){
        next();
    }else{
        return res.status(403).json({
            message:"Access Denied. Admins only"
        })
    }
}