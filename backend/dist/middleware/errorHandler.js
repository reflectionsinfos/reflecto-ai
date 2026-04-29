"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.errorHandler = exports.AppError = void 0;
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
const errorHandler = (err, req, res, next) => {
    console.error("Error:", err);
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    // Handle Drizzle/Postgres errors if identified specifically, otherwise generic
    // In a real app we might parse specific DB error codes here
    const response = {
        status: 'error',
        statusCode,
        message,
    };
    if (process.env.NODE_ENV !== 'production') {
        response.stack = err.stack;
        if (err.cause)
            response.cause = err.cause;
    }
    res.status(statusCode).json(response);
};
exports.errorHandler = errorHandler;
// Async handler wrapper to avoid try-catch blocks in controllers
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
exports.asyncHandler = asyncHandler;
