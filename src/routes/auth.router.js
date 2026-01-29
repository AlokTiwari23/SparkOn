import express from "express"
import {verfiyuser , registerUser, loginuser, verifyloginotp } from "../controllers/auth.controllers.js"
const authrouter =  express.Router()

authrouter.post("/user-register",registerUser)
authrouter.post("/user-verfiy",verfiyuser)
authrouter.post("/user-login",loginuser)
authrouter.post("/verify-login", verifyloginotp)

export default authrouter;