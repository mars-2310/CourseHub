import type { RequestHandler } from "express";
import type { ZodType } from "zod";

interface Schemas {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

/**
 * Validates and normalizes request input before the controller runs.
 *
 * Parsed output replaces the raw input, so controllers receive coerced, trimmed,
 * stripped values rather than whatever the client sent. ZodErrors are forwarded
 * to the centralized handler, which renders them as 422s.
 *
 * Express 5 exposes `req.query` as a getter, so validated query values are
 * written to `res.locals.query` instead of reassigning the property.
 */
export const validate =
  (schemas: Schemas): RequestHandler =>
  (req, res, next) => {
    try {
      if (schemas.params) req.params = schemas.params.parse(req.params) as typeof req.params;
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) res.locals.query = schemas.query.parse(req.query);
      next();
    } catch (err) {
      next(err);
    }
  };

/** Reads query values produced by `validate({ query })`. */
export const validatedQuery = <T>(res: { locals: Record<string, unknown> }): T =>
  res.locals.query as T;
