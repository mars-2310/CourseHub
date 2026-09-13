import { Router } from "express";
import { requireUser } from "../middleware/auth";
import { validate } from "../middleware/validate";
import * as controller from "../controllers/upload.controller";
import { signUploadSchema } from "../types/upload.schema";

const uploadRouter = Router();

uploadRouter.get("/limits", requireUser, controller.limits);

uploadRouter.post("/sign", requireUser, validate({ body: signUploadSchema }), controller.sign);

export default uploadRouter;
