import express from "express"
import {verfiyuser , registerUser, loginuser, verifyloginotp,resendotp, adminlogin } from "../controllers/auth.controllers.js"
const authrouter =  express.Router()

authrouter.post("/user-register",registerUser)
authrouter.post("/user-verfiy",verfiyuser)
authrouter.post("/user-login",loginuser)
authrouter.post("/verify-login", verifyloginotp)
authrouter.post("/resend-otp", resendotp);
authrouter.post("/admin-login" , adminlogin)

export default authrouter;