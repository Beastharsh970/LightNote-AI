import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../types";

export class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error("Error:", err.message);

  if (err instanceof AppError) {
    const response: ApiResponse = {
      success: false,
      error: { code: err.code, message: err.message },
    };
    res.status(err.statusCode).json(response);
    return;
  }

  // Multer file size error
  if (err.message?.includes("File too large")) {
    const response: ApiResponse = {
      success: false,
      error: { code: "FILE_TOO_LARGE", message: "File exceeds maximum allowed size (100MB)" },
    };
    res.status(413).json(response);
    return;
  }

  const response: ApiResponse = {
    success: false,
    error: { code: "INTERNAL_ERROR", message: "An internal server error occurred" },
  };
  res.status(500).json(response);
}
