import type { Request } from "express";

/**
 * Reads a route parameter as a string.
 *
 * Express 5 types `req.params[key]` as `string | string[]` to cover repeated
 * wildcard segments. Our routes use single named segments and validate them with
 * zod before the controller runs, so narrowing here is safe.
 */
export const param = (req: Request, key: string): string => {
  const value = req.params[key];
  return Array.isArray(value) ? value[0]! : (value as string);
};
