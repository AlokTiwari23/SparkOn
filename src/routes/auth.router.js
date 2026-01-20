import express from "express"
import { sendPhoneotp, verifyUser } from "../controllers/auth.controllers.js"
const authrouter =  express.Router()

authrouter.post("/user-send-otp",sendPhoneotp)
authrouter.post("/verfiy-otp" ,verifyUser )

export default authrouter;