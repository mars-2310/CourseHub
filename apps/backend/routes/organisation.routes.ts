import { Router } from "express";
import { requireUser } from "../middleware/auth";
import { validate } from "../middleware/validate";
import * as controller from "../controllers/organisation.controller";
import {
  createOrganisationSchema,
  organisationParams,
  updateOrganisationSchema,
} from "../types/organisation.schema";

const organisationRouter = Router();

// Any authenticated user may open an academy; doing so promotes them to TEACHER.
organisationRouter.post(
  "/",
  requireUser,
  validate({ body: createOrganisationSchema }),
  controller.create,
);

// Public: academy pages are visible to anyone, by id or slug.
organisationRouter.get("/:id", validate({ params: organisationParams }), controller.getById);

organisationRouter.patch(
  "/:id",
  requireUser,
  validate({ params: organisationParams, body: updateOrganisationSchema }),
  controller.update,
);

export default organisationRouter;
