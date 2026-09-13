import type { RequestHandler } from "express";
import { getAuth } from "@clerk/express";
import { syncClerkUser } from "../services/user.service";
import { forbidden, unauthorized } from "../utils/errors";
import type { Role } from "../lib/generated/prisma/client";

/**
 * Requires a valid Clerk session and attaches the CourseHub `User` to the request.
 *
 * Clerk's own `requireAuth()` redirects unauthenticated browsers to a sign-in
 * page; for a JSON API we want a 401 body instead, so the check is done here.
 */
export const requireUser: RequestHandler = async (req, _res, next) => {
  try {
    const { userId: clerkId } = getAuth(req);
    if (!clerkId) throw unauthorized();

    req.user = await syncClerkUser(clerkId);
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Attaches the user when a session is present, but allows anonymous requests.
 * Used by public endpoints that reveal more to a signed-in owner or student.
 */
export const attachUser: RequestHandler = async (req, _res, next) => {
  try {
    const { userId: clerkId } = getAuth(req);
    if (clerkId) req.user = await syncClerkUser(clerkId);
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Coarse role gate. Ownership is always checked separately in the service layer —
 * being a TEACHER says nothing about *which* organisation or course you may touch.
 */
export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(forbidden(`This action requires one of: ${roles.join(", ")}.`));
    }
    next();
  };

/** Narrowing helper for controllers mounted behind `requireUser`. */
export function currentUser(req: { user?: Express.Request["user"] }) {
  if (!req.user) throw unauthorized();
  return req.user;
}
