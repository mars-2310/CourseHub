import { Router } from "express";
import { requireUser } from "../middleware/auth";
import { getMe } from "../controllers/auth.controller";

const authRouter = Router();

// Syncs the Clerk identity into CourseHub and returns the local user record.
authRouter.get("/me", requireUser, getMe);

export default authRouter;
