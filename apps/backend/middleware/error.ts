import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { Prisma } from "../lib/generated/prisma/client";
import { AppError, notFound } from "../utils/errors";
import { isProduction } from "../lib/env";

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(notFound(`No route matches ${req.method} ${req.originalUrl}.`));
};

/**
 * Centralized error handler. Express 5 forwards rejected promises from async
 * handlers here automatically, so controllers do not need try/catch.
 *
 * Only `AppError` messages reach the client verbatim. Prisma and Clerk errors
 * are translated; anything else becomes a generic 500 so internal details
 * (SQL, connection strings, stack traces) are never exposed.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(422).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed.",
        details: err.issues.map(i => ({ path: i.path.join("."), message: i.message })),
      },
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002 unique constraint, P2025 record not found — the only two that map
    // cleanly onto client-visible outcomes. The rest are our bug, not theirs.
    if (err.code === "P2002") {
      const target = (err.meta?.target as string[] | undefined)?.join(", ");
      res.status(409).json({
        error: {
          code: "CONFLICT",
          message: target ? `A record with that ${target} already exists.` : "Record already exists.",
        },
      });
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Resource not found." } });
      return;
    }
  }

  // Clerk throws errors carrying an HTTP status for auth failures.
  const status = (err as { status?: number })?.status;
  if (status === 401) {
    res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Authentication required." } });
    return;
  }

  console.error("[unhandled]", err);
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Something went wrong.",
      ...(isProduction ? {} : { debug: err instanceof Error ? err.message : String(err) }),
    },
  });
};
