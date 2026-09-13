import type { RequestHandler } from "express";
import { currentUser } from "../middleware/auth";
import * as organisations from "../services/organisation.service";
import { toOrganisationDTO } from "../utils/serialize";
import { param } from "../utils/http";

export const create: RequestHandler = async (req, res) => {
  const organisation = await organisations.createOrganisation(currentUser(req), req.body);
  res.status(201).json({ organisation: toOrganisationDTO(organisation) });
};

export const getById: RequestHandler = async (req, res) => {
  const organisation = await organisations.getOrganisation(param(req, "id"));
  res.json({ organisation: toOrganisationDTO(organisation) });
};

export const update: RequestHandler = async (req, res) => {
  const organisation = await organisations.updateOrganisation(
    currentUser(req),
    param(req, "id"),
    req.body,
  );
  res.json({ organisation: toOrganisationDTO(organisation) });
};

/** GET /api/me/organization — null rather than 404 when the teacher has none yet. */
export const getMine: RequestHandler = async (req, res) => {
  const organisation = await organisations.getOwnedOrganisation(currentUser(req));
  res.json({ organisation: organisation ? toOrganisationDTO(organisation) : null });
};
