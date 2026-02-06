import express, { Router } from "express";
import { verfiyToken } from "../middlewares/authentication/isAuthenticated.js";
import { createPaymentOrder, verfiyPayment } from "../controllers/payment.controllers.js";



const paymentroute = express.Router();

// 1.Create Order (Step1 of Razorpay)
// Frontend sends {orderId} -> Backend calls Razorpay -> Returns Razorpay Order ID
paymentroute.post("/create-order" , verfiyToken, createPaymentOrder)

// Verfiy Payment (Step 2 of Razorpay)
// Frontend sends {paymentId  , signature} -> Backend verifies & save to DB
paymentroute.post("/verfiy" , verfiyToken , verfiyPayment)

export default paymentroute;