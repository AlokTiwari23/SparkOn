import express  from "express";
import cors from "cors";
import ratelimit from "express-rate-limit"
import swaggerUi from "swagger-ui-express"
import axios from "axios"
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { error } from "winston";


const app = express()

app.use(cors({
    origin:["http://localhost:3000"],
    allowedHeaders:["Content-Type","Authorization"],
    credentials:true
}))

app.use(morgan("dev"))
app.use(express.json({limit:"100mb"}));
app.use(express.urlencoded({limit:"100mb",extended:true}));
app.use(cookieParser());

const limiter = ratelimit({
    windowMs:15*60*1000,//15 minu

    max:(req)=>(req.user?1000:100), // for login user they will give the 1000 req and for not logined user 100 request
    message:{error: "Too many requests from this IP, please try again after 15 minutes"},
    standardHeaders:true,
    legacyHeaders:true,
    keyGenerator:(req)=>{
        return req.ip
    }

})

app.use(limiter)



app.get("/api",(req,res)=>{
    res.send({message:`Welcome to SparkOn`})
})



export default app ;