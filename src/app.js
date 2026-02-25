import express from "express";
import cors from "cors";
import ratelimit from "express-rate-limit"
import cookieParser from "cookie-parser";
import morgan from "morgan";

// import { errorMiddleware } from "./middlewares/errorHandler/error-middleware.js";

import { errorMiddleware } from "./middlewares/errorHandler/error-middleware.js"
import authrouter from "./routes/auth.router.js";
import productrouter from './routes/product.router.js'
import reviewrouter from './routes/review.router.js'
import userrouter from './routes/user.router.js'
import walletrouter from './routes/wallet.router.js'
import payoutrouter from './routes/payout.router.js'
import paymentrouter from './routes/payment.router.js'
import orderrouter from './routes/order.router.js'
import promotionRouter from './routes/notification.router.js'
import invoicerouter from './routes/invoice.router.js'
import dashboardrouter from './routes/dashborad.router.js'
import cartrouter from './routes/cart.router.js'
import addressrouter from './routes/address.router.js'
import electricianRouter from "./routes/electrician.router.js";
// You must include 'with { type: "json" }'

const app = express()

app.use(cors({
    origin: ["http://localhost:8000","http://localhost:5173","http://10.213.115.12:5173"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
     methods : ["GET","POST","PUT","PATCH","DELETE"]
}))

app.use(morgan("dev"))
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));
app.use(cookieParser());

const authlimiter = ratelimit({
    windowMs:15*60*1000,  // 15 Minutes
    max: 20 ,// maximum Only 20 attempts per 15 mins
    message:{message:"Too many login Attempts . Please try again later"},
    standardHeaders:true,
    legacyHeaders:false

})


// This allows normal usage but stops DDoS attacks
const apiLimiter = ratelimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Generous! 500 requests per 15 mins (plenty for shopping)
    message: { message: "Too many requests, please slow down." },
    standardHeaders: true,
    legacyHeaders: false,
});


//Rooutes

app.use("/api/auth",authlimiter, authrouter)  // Done Postman
app.use("/api/product",apiLimiter , productrouter)   // Done Postman
app.use("/api/review" ,apiLimiter , reviewrouter)  // Done Postman
app.use("/api/user" , apiLimiter , userrouter)     //Done Postman
app.use("/api/wallet" , apiLimiter , walletrouter)  // Done Postman
app.use("/api/payout" , apiLimiter , payoutrouter)   // Done Postman
app.use("/api/payment" , apiLimiter , paymentrouter)  // Done Postman
app.use("/api/order" , apiLimiter , orderrouter)    //Done Postman
app.use("/api/admin" , apiLimiter , promotionRouter)  // Done Postman
app.use("/api/invoice" , apiLimiter , invoicerouter)   // Done Postman
app.use("/api/dashboard" , apiLimiter , dashboardrouter)  //Done Postman
app.use("/api/address" ,apiLimiter , addressrouter)   //Done Postman
app.use("/api/cart" , apiLimiter ,cartrouter)
app.use("/api/electrician" ,apiLimiter , electricianRouter)


app.use(errorMiddleware)




app.get("/api", (req, res) => {
    res.send({ message: `Welcome to SparkOn` })
})



export default app;