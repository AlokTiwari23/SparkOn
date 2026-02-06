import prisma from "../db/db.prisam.js"
import express from "express"
import { ValidationError } from "../middlewares/errorHandler/index.js";
import { getAllPayoutRequest, processPayout } from "../controllers/payout.controllers.js";
import { verfiyToken } from "../middlewares/authentication/isAuthenticated.js";
import { isAdmin } from "../middlewares/authentication/isAuthorizedRoles.js";

const payoutroute = express.Router()

payoutroute.get("/admin/requests",verfiyToken , isAdmin ,getAllPayoutRequest)
payoutroute.put("/admin/process/:id" , verfiyToken , isAdmin ,processPayout)

export default payoutroute; 