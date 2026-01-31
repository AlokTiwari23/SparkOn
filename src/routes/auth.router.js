import express from "express"
import {verfiyuser , registerUser, loginuser, verifyloginotp,resendotp, adminlogin ,userlogout, adminlogout, refreshUserToken, refreshAdminToken } from "../controllers/auth.controllers.js"
const authrouter =  express.Router()


// Users Route
authrouter.post("/user-register",registerUser)
authrouter.post("/user-verfiy",verfiyuser)
authrouter.post("/user-login",loginuser)
authrouter.post("/verify-login", verifyloginotp)
authrouter.post("/resend-otp", resendotp);
authrouter.post("/user/logout" , userlogout)
authrouter.post("/user/refresh" , refreshUserToken)
authrouter.get("/user/me")


// Admin Routes
authrouter.post("/admin-login" , adminlogin)
authrouter.post("/admin/logout", adminlogout)
authrouter.post("/auth/refresh" , refreshAdminToken )
authrouter.get("admin/me")



export default authrouter;