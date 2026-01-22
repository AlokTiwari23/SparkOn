import express from "express"
import {verfiyuser , registerUser } from "../controllers/auth.controllers.js"
const authrouter =  express.Router()

authrouter.post("/user-register",registerUser)
authrouter.post("/user-verfiy",verfiyuser)

export default authrouter;