import express from "express";
import { verfiyToken } from "../middlewares/authentication/isAuthenticated.js";
import {downloadInvoice} from "../controllers/invoice.controlers.js"
const invoicerouter  =  express.Router()

invoicerouter.get('/:orderId' , verfiyToken , downloadInvoice)

export default invoicerouter;
