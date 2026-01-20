import express from "express"
import { userRegistraion } from "../controllers/auth.controllers.js"
const authrouter =  express.Router()

authrouter.post("/user-registration",userRegistraion)

export default authrouter;