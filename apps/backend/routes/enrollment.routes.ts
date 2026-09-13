import { Router } from "express";
import { requireUser } from "../middleware/auth";
import { validate } from "../middleware/validate";
import * as controller from "../controllers/enrollment.controller";
import { courseParams } from "../types/course.schema";

/** Mounted at /api/courses — enrollment is always scoped to a course. */
const enrollmentRouter = Router();

enrollmentRouter.post(
  "/:courseId/enroll",
  requireUser,
  validate({ params: courseParams }),
  controller.enroll,
);

enrollmentRouter.get(
  "/:courseId/enrollment",
  requireUser,
  validate({ params: courseParams }),
  controller.getMine,
);

export default enrollmentRouter;
