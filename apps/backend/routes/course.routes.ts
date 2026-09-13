import { Router } from "express";
import { attachUser, requireUser } from "../middleware/auth";
import { validate } from "../middleware/validate";
import * as controller from "../controllers/course.controller";
import {
  courseParams,
  createCourseSchema,
  listCoursesQuery,
  updateCourseSchema,
} from "../types/course.schema";

const courseRouter = Router();

// Public catalogue. attachUser only so the response can report canManage.
courseRouter.get("/", attachUser, validate({ query: listCoursesQuery }), controller.list);

courseRouter.post("/", requireUser, validate({ body: createCourseSchema }), controller.create);

courseRouter.get(
  "/:courseId",
  attachUser,
  validate({ params: courseParams }),
  controller.getById,
);

courseRouter.patch(
  "/:courseId",
  requireUser,
  validate({ params: courseParams, body: updateCourseSchema }),
  controller.update,
);

courseRouter.delete(
  "/:courseId",
  requireUser,
  validate({ params: courseParams }),
  controller.remove,
);

// Genuine state transitions, so an action URL is the honest shape here.
courseRouter.post(
  "/:courseId/publish",
  requireUser,
  validate({ params: courseParams }),
  controller.publish,
);

courseRouter.post(
  "/:courseId/unpublish",
  requireUser,
  validate({ params: courseParams }),
  controller.unpublish,
);

export default courseRouter;
