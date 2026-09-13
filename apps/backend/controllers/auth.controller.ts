import type { RequestHandler } from "express";
import { currentUser } from "../middleware/auth";
import { toUserDTO } from "../utils/serialize";

/**
 * Returns the CourseHub user for the current Clerk session, creating the local
 * record on first call. The frontend calls this immediately after sign-in.
 */
export const getMe: RequestHandler = (req, res) => {
  res.json({ user: toUserDTO(currentUser(req)) });
};
