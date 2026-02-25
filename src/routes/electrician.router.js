import express from "express";
import { verfiyToken } from "../middlewares/authentication/isAuthenticated.js";
import { isAdmin } from "../middlewares/authentication/isAuthorizedRoles.js";
import { getAllElectriciansAdmin, getTopElectricians, getElectricianDetails, processPayout } from "../controllers/electrician.controllers.js";

const electricianRouter = express.Router();

electricianRouter.get("/top", verfiyToken, isAdmin, getTopElectricians);
electricianRouter.get("/all", verfiyToken, isAdmin, getAllElectriciansAdmin);
electricianRouter.get("/:id", verfiyToken, isAdmin, getElectricianDetails);
electricianRouter.post("/payout/:requestId", verfiyToken, isAdmin, processPayout);

export default electricianRouter;