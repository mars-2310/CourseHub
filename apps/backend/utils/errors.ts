/**
 * Application-level errors.
 *
 * Anything thrown as an `AppError` is considered safe to show to the client.
 * Everything else is treated as an unexpected failure and reported as a generic
 * 500 by the centralized error handler, so internal details never leak out.
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new AppError(400, "BAD_REQUEST", message, details);

export const unauthorized = (message = "Authentication required.") =>
  new AppError(401, "UNAUTHENTICATED", message);

export const forbidden = (message = "You are not allowed to perform this action.") =>
  new AppError(403, "FORBIDDEN", message);

export const notFound = (message = "Resource not found.") =>
  new AppError(404, "NOT_FOUND", message);

export const conflict = (message: string, details?: unknown) =>
  new AppError(409, "CONFLICT", message, details);

export const unprocessable = (message: string, details?: unknown) =>
  new AppError(422, "UNPROCESSABLE", message, details);

export const serviceUnavailable = (message: string) =>
  new AppError(503, "SERVICE_UNAVAILABLE", message);
