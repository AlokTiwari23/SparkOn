import { AppError } from "./index.js"
export const errorMiddleware = (req,res,next)=>{
    if(err instanceof AppError){
        console.log(`Error ${req.methos} - ${req.url} - ${err.statusCode} - ${err.message}`)

        return res.status(statusCode).json({
            status:"error",
            message:err.message
        })
        
    }
    console.log(`Unhandled Error`,err);

    res.status(500).json({
        error:"Something went wrong , please try again later"
    })

}
