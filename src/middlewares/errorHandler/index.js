export class AppError extends Error {
    statusCode;

    //  FIX 1: Swapped arguments to (message, statusCode)
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class NotFoundError extends AppError {
    constructor(message = "Resource not found") {
        super(message, 404);
    }
}

export class ValidationError extends AppError {
    constructor(message = "Validation Error") {
        super(message, 400);
    }
}

export class AuthenticationError extends AppError {
    constructor(message = "Authentication Error") {
        super(message, 401);
    }
}

//  FIX 2: Fixed spelling (Forbidden)
export class ForbiddenError extends AppError {
    constructor(message = "Forbidden Error") {
        super(message, 403);
    }
}

export class DatabaseError extends AppError {
    constructor(message = "Database Error") {
        super(message, 500);
    }
}

export class RateLimitError extends AppError {
    constructor(message = "Too many requests, please try again later") {
        super(message, 429);
    }
}