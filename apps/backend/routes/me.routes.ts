import { Router } from "express";
import { requireUser } from "../middleware/auth";
import { getMe } from "../controllers/auth.controller";
import * as organisations from "../controllers/organisation.controller";

const meRouter = Router();

// Everything under /api/me is about the caller, so a session is always required.
meRouter.use(requireUser);

meRouter.get("/", getMe);
meRouter.get("/organization", organisations.getMine);

export default meRouter;
