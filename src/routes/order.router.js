import express, { Router } from "express";
import { verfiyToken } from "../middlewares/authentication/isAuthenticated";
import {isAdmin} from "../middlewares/authentication/isAuthorizedRoles"
import {addtrackingDetails, cancelOrder, getAllOrderAdmin, getMyOrder, getOrderDetails, getOrderStats, placeOrder, processReturn, requestReturn, updateOrderAddress, updateOrderStatus}  from "../controllers/order.controllers"
const orderrouter = express.Router()


// User Router 
orderrouter.post("/place" , verfiyToken , placeOrder)

orderrouter.get("/my-order" , verfiyToken , getMyOrder)

orderrouter.get("/:id" , verfiyToken , getOrderDetails);

orderrouter.put("/:id/cancel" , verfiyToken , cancelOrder)

orderrouter.post("/:id/return",verfiyToken , requestReturn)

orderrouter.put("/:id/address" , verfiyToken , updateOrderAddress)

// Admin Router

orderrouter.get('/admin/all' , verfiyToken , isAdmin , getAllOrderAdmin)

orderrouter.get("/admin/stats" ,  verfiyToken , isAdmin , getOrderStats)

orderrouter.put("/admin/:id/status" , verfiyToken , isAdmin , updateOrderStatus)

orderrouter.put("/admin/:id/tracking" , verfiyToken , isAdmin , addtrackingDetails)

orderrouter.put('/admin/:id/return-process' , verfiyToken , isAdmin , processReturn)

export default orderrouter