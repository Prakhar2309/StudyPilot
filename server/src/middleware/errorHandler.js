/**
 * Centralized error handler middleware.
 * Never exposes stack traces to client in production.
 */
export function errorHandler(err, _req, res, _next) {
  const isDev = process.env.NODE_ENV !== 'production';
  console.error('[ERROR]', err.message);
  if (isDev) console.error(err.stack);

  const status = err.status || err.statusCode || 500;
  const message = err.isOperational ? err.message : 'An unexpected error occurred';

  res.status(status).json({
    success: false,
    error: message,
    ...(isDev && { detail: err.message }),
  });
}

export class AppError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
    this.isOperational = true;
  }
}
