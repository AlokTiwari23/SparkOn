import express from "express"
import {isAdmin} from "../middlewares/authentication/isAuthorizedRoles.js"
import { verfiyToken } from "../middlewares/authentication/isAuthenticated.js"
import {verfiyuser , registerUser, loginuser, verifyloginotp,resendotp, adminlogin ,userlogout, adminlogout, refreshUserToken, refreshAdminToken, getUserdata, getAdmindata , deleteUseAccount} from "../controllers/auth.controllers.js"
const authrouter =  express.Router()


// Users Route
authrouter.post("/user-register",registerUser)
authrouter.post("/user-verfiy",verfiyuser)
authrouter.post("/user-login",loginuser)
authrouter.post("/verify-login", verifyloginotp)
authrouter.post("/resend-otp", resendotp);
authrouter.post("/user/logout" , userlogout)
authrouter.post("/user/refresh" , refreshUserToken)
authrouter.get("/user/me" , verfiyToken , getUserdata)
authrouter.delete("/delete-account" , verfiyToken, deleteUseAccount)

// Admin Routes
authrouter.post("/admin-login" , adminlogin)
authrouter.post("/admin/logout", adminlogout)
authrouter.post("/refresh" , refreshAdminToken )
authrouter.get("/admin/me" , verfiyToken , isAdmin, getAdmindata)



export default authrouter;