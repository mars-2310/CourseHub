import { Router } from "express";
import { attachUser, requireUser } from "../middleware/auth";
import { validate } from "../middleware/validate";
import * as controller from "../controllers/node.controller";
import {
  courseNodeParams,
  createNodeSchema,
  nodeParams,
  updateNodeSchema,
} from "../types/node.schema";

/** Mounted at /api/nodes — operations on a single node. */
const nodeRouter = Router();

nodeRouter.get("/:nodeId", attachUser, validate({ params: nodeParams }), controller.getById);

nodeRouter.patch(
  "/:nodeId",
  requireUser,
  validate({ params: nodeParams, body: updateNodeSchema }),
  controller.update,
);

nodeRouter.delete(
  "/:nodeId",
  requireUser,
  validate({ params: nodeParams }),
  controller.remove,
);

/** Mounted at /api/courses — node operations scoped to a course. */
export const courseNodeRouter = Router();

courseNodeRouter.post(
  "/:courseId/nodes",
  requireUser,
  validate({ params: courseNodeParams, body: createNodeSchema }),
  controller.create,
);

courseNodeRouter.get(
  "/:courseId/tree",
  attachUser,
  validate({ params: courseNodeParams }),
  controller.tree,
);

export default nodeRouter;
