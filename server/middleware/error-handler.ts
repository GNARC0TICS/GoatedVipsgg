import { Request, Response, NextFunction } from "express";

// Define custom error types
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error handler middleware
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error details
  console.error("Error details:", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    // Include custom error properties if available
    ...(err instanceof AppError && { statusCode: err.statusCode }),
  });

  // Default error status and message
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err.message || "Something went wrong";

  // Determine if this is a trusted error (operational) or an unknown error
  const isOperational = err instanceof AppError ? err.isOperational : false;

  // In production, don't expose error details for non-operational errors
  const responseBody = {
    status: "error",
    message: process.env.NODE_ENV === "production" && !isOperational 
      ? "Internal server error" 
      : message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  };

  res.status(statusCode).json(responseBody);
};

// Catch async errors
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    status: "error",
    message: `Cannot ${req.method} ${req.path}`,
  });
};
