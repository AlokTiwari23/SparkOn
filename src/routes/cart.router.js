import express from "express";
import { verfiyToken } from "../middlewares/authentication/isAuthenticated.js"; 
import {addToCart, getCart, removeFromCart, updatedCartItemQuantity} from "../controllers/cart.controllers.js"


const cartrouter = express.Router();

cartrouter.post('/add' , verfiyToken , addToCart)
cartrouter.get('/' , getCart)
cartrouter.put('/update' , updatedCartItemQuantity)
cartrouter.delete('/clear' , removeFromCart)

export default cartrouter