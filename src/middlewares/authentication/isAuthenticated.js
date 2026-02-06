
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

        console.log(token)
        // If no token found anywhere
        if(!token){
            return res.status(401).json({message:"Access Denied. No token provided"})
        }


        // Verfiy the token

        const decoded = jwt.verify(token , process.env.ACCESS_TOKEN_SECRET)
        console.log(decoded)

        // Attacted user info to the request object so controllers can use it
        // We use 'req.user' fro EVERYONE (Admin , Electrican , Consumer)
        req.user = decoded ;

        next();

    }catch(error){
        if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
            message: "Token has expired",
            code: "TOKEN_EXPIRED" // specific code for frontend to see
        });
    }

    // CASE 2: The Token is Fake/Modified (Hacker or Bug)
    if (error.name === 'JsonWebTokenError') {
        return res.status(403).json({ 
            message: "Invalid Token",
            code: "INVALID_TOKEN"
        });
    }

    // CASE 3: Server Error
    return res.status(500).json({ message: "Internal Server Error" });
    }

}


