
export class AppError extends Error {
     statusCode;
     message;


   constructor(statusCode , message ){
    super(message)
    this.statusCode = statusCode
    
    Error.captureStackTrace(this , this.constructor)
   }
}

// Not found Error

export class NotFoundError extends AppError {
    constructor(message = "Resources not found"){
        super(message,404)
    }
}

// validation error (use for Joi/zod/react-hook-form validation errors )

export class VaildationError extends AppError{
    constructor(message = "Validation Error"){
        super(message,400)
    
    }
}

// Authentication Error

export class AuthenticationError extends AppError{
    constructor(message = "Authentication Error"){
        super(message,401)
    }

}

// Forbbiden Error

export class ForbbidenError extends AppError{
    constructor(message = "Forbidden Error"){
        super(message,403)
    }
}

//Database Error

export class DatabaseError extends AppError{
    constructor(message = "Database Error"){
        super(message,500)
    }
}
// Rate Limit Error

export class RateLimitError extends AppError{
    constructor(message = "Rate Limit Error"){
        super(message,429)
    }
}