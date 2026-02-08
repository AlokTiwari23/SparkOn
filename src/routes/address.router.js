import express from "express";
import { verfiyToken } from "../middlewares/authentication/isAuthenticated.js";
import {createAddress, deleteAddress, getMyAddresses, setDefaultAddress, updateAddress} from "../controllers/address.controllers.js"


const addressrouter  = express.Router()

// Create New Address
addressrouter.post('/create' , verfiyToken  , createAddress)
// Get All My Address
addressrouter.get('/' , verfiyToken,getMyAddresses)
// Update Address
addressrouter.put('/:id' , verfiyToken,updateAddress)
// Delete Address
addressrouter.delete('/:id' , verfiyToken ,deleteAddress)
// Set Default Address
addressrouter.patch('/:id/default', verfiyToken , setDefaultAddress)


export default addressrouter ; 