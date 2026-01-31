import express from "express";
import cors from "cors";
import ratelimit from "express-rate-limit"
import cookieParser from "cookie-parser";
import morgan from "morgan";

// import { errorMiddleware } from "./middlewares/errorHandler/error-middleware.js";

import { errorMiddleware } from "./middlewares/errorHandler/error-middleware.js"
import authrouter from "./routes/auth.router.js";

// You must include 'with { type: "json" }'

const app = express()

app.use(cors({
    origin: ["http://localhost:8000"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
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
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Generous! 500 requests per 15 mins (plenty for shopping)
    message: { message: "Too many requests, please slow down." },
    standardHeaders: true,
    legacyHeaders: false,
});


//Rooutes

app.use("/api/auth",authlimiter, authrouter)
app.use("/api",apiLimiter)

app.use(errorMiddleware)




app.get("/api", (req, res) => {
    res.send({ message: `Welcome to SparkOn` })
})



export default app;