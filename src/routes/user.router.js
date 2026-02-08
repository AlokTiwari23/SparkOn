import express from "express";
import { verfiyToken } from "../middlewares/authentication/isAuthenticated.js";
import { updateProfile } from "../controllers/user.controllers.js";

const userroute = express.Router()

userroute.put("/profile" , verfiyToken  , updateProfile)

export default userroute ; 