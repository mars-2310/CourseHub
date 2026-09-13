import { Router } from "express";
import { requireUser } from "../middleware/auth";
import { getMe } from "../controllers/auth.controller";

const meRouter = Router();

meRouter.use(requireUser);

meRouter.get("/", getMe);

export default meRouter;
