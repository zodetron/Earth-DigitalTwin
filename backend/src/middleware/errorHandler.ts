import type { Request, Response, NextFunction } from 'express'
import { logger } from '../config/logger'

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err instanceof AppError ? err.statusCode : 500
  const message = err.message || 'Internal server error'

  if (statusCode === 500) logger.error(message, { stack: err.stack })

  res.status(statusCode).json({
    success: false,
    message,
    timestamp: new Date().toISOString(),
  })
}
