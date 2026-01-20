import { AppError } from "./index.js";

// Middleware looks good now!
export const errorMiddleware = (err, req, res, next) => {
    
    // 1. Handle trusted custom errors
    if (err instanceof AppError) {
        console.log(`Error ${req.method} - ${req.url} - ${err.statusCode} - ${err.message}`);

        return res.status(err.statusCode).json({
            status: "error",
            message: err.message
        });
    }

    // 2. Handle generic errors
    console.error(`Unhandled Error`, err);
    res.status(500).json({
        error: "Something went wrong, please try again later"
    });
};