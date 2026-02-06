import express from "express";
import { verfiyToken } from "../middlewares/authentication/isAuthenticated";
import { updateProfile } from "../controllers/user.controllers";

const userroute = express.Router()

userroute.put("/profile" , verfiyToken  , updateProfile)

export default userroute ; 