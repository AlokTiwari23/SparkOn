import express from "express";
import { getAdminDashboard } from '../controllers/dashboard.controllers.js';
import { verfiyToken } from '../middlewares/authentication/isAuthenticated.js';
import { isAdmin } from '../middlewares/authentication/isAuthorizedRoles.js';
const dashboardrouter = express.Router();

dashboardrouter.get("/stats",verfiyToken , isAdmin , getAdminDashboard)

export default dashboardrouter ; 