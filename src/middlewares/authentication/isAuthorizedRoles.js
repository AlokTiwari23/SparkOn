import { ValidationError } from "../errorHandler/index.js"

export const isAdmin = async(req,res,next) =>{
    if(!req.user){
        return next(new ValidationError(`Not Request User`))
    }
    if(req.user.role === "Admin"){
        next()
    }else{
        return next(new ValidationError(`Access denied : Admin Only`))
    }
}

export const isCustomer = async(req,res,next) =>{
    if(req.role !== "Customer"){
        return next(new ValidationError(`Access denied : Seller Only`))
    }
}

export const isElectrican = async(req,res,next) =>{
    if(req.role !== "Electrician"){
        return next(new ValidationError(`Access denied : Seller Only`))
    }
}