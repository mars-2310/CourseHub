import { Router } from "express";
import { requireUser } from "../middleware/auth";
import { getMe } from "../controllers/auth.controller";
import * as organisations from "../controllers/organisation.controller";
import * as courses from "../controllers/course.controller";

const meRouter = Router();

// Everything under /api/me is about the caller, so a session is always required.
meRouter.use(requireUser);

meRouter.get("/", getMe);
meRouter.get("/organization", organisations.getMine);

// Courses the caller teaches, drafts included. /me/courses is reserved for the
// student side (courses they are enrolled in).
meRouter.get("/teaching", courses.listMine);

export default meRouter;
