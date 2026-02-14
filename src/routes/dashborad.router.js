import express from "express";
import { getDashboardOverview  , exportBulkOrders} from '../controllers/dashboard.controllers.js';
import { verfiyToken } from '../middlewares/authentication/isAuthenticated.js';
import { isAdmin } from '../middlewares/authentication/isAuthorizedRoles.js';
const dashboardrouter = express.Router();

dashboardrouter.get("/stats",verfiyToken , isAdmin , getDashboardOverview)
dashboardrouter.get('/order/export', verfiyToken,isAdmin ,  exportBulkOrders);

export default dashboardrouter ; 