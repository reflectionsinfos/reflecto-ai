import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err);

  const statusCode = err.statusCode || 500;
  // Only surface the message for intentional AppError throws; all other errors
  // (DB/ORM, third-party, unexpected) get a generic message so internals never leak.
  const message = err instanceof AppError ? err.message : 'Internal Server Error';

  const response: any = {
    status: 'error',
    statusCode,
    message,
  };

  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
    if (err.cause) response.cause = err.cause;
  }

  res.status(statusCode).json(response);
};

// Async handler wrapper to avoid try-catch blocks in controllers
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
