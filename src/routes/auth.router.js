import express from "express"
import { sendPhoneotp  , verifyPhoneotp} from "../controllers/auth.controllers.js"
const authrouter =  express.Router()

authrouter.post("/user-send-otp",sendPhoneotp)
authrouter.post("/verfiy-otp" ,verifyPhoneotp )

export default authrouter;