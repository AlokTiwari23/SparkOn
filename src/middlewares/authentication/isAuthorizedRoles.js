import { ValidationError } from "../errorHandler"

export const isAdmin = async(req,res,next) =>{
    if(req.role !== "Admin"){
        return next(new ValidationError(`Access denied : Seller Only`))
    }
}

export const isCustomer = async(req,res,next) =>{
    if(req.role !== "CUSTOMER"){
        return next(new ValidationError(`Access denied : Seller Only`))
    }
}

export const isElectrican = async(req,res,next) =>{
    if(req.role !== "ELECTRICIAN"){
        return next(new ValidationError(`Access denied : Seller Only`))
    }
}