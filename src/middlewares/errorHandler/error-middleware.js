import { AppError } from "./index.js";

import { ZodError } from "zod";

export const errorMiddleware = (err, req, res, next) => {

    // 1️⃣ ZOD VALIDATION ERRORS
    if (err instanceof ZodError) {
        return res.status(400).json({
            status: "error",
            errors: err.message
           
        });
    }

    // 2️⃣ CUSTOM APP ERRORS
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            status: "error",
            message: err.message
        });
    }

    // 3️⃣ UNKNOWN / PROGRAMMING ERRORS
    console.error("Unhandled Error:", err);

    return res.status(500).json({
        status: "error",
        message: "Internal server error"
    });
};
