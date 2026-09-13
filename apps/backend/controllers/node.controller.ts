import type { RequestHandler } from "express";
import { currentUser } from "../middleware/auth";
import * as nodes from "../services/node.service";
import { toNodeDTO, toTreeDTO } from "../utils/serialize";
import { param } from "../utils/http";

export const create: RequestHandler = async (req, res) => {
  const node = await nodes.createNode(currentUser(req), param(req, "courseId"), req.body);
  res.status(201).json({ node: toNodeDTO(node, "manage") });
};

export const getById: RequestHandler = async (req, res) => {
  const { node, access } = await nodes.getNodeForViewer(req.user, param(req, "nodeId"));
  res.json({ node: toNodeDTO(node, access), access });
};

/** Full course tree, gated by what the caller is entitled to see. */
export const tree: RequestHandler = async (req, res) => {
  const courseId = param(req, "courseId");
  const { access } = await nodes.resolveTreeAccess(req.user, courseId);
  const rows = await nodes.listCourseNodes(courseId);
  res.json({ access, tree: toTreeDTO(rows, access) });
};

/** Handles edits, moves (parentId) and reordering (order) alike. */
export const update: RequestHandler = async (req, res) => {
  const node = await nodes.updateNode(currentUser(req), param(req, "nodeId"), req.body);
  res.json({ node: toNodeDTO(node, "manage") });
};

export const remove: RequestHandler = async (req, res) => {
  const { deleted } = await nodes.deleteNode(currentUser(req), param(req, "nodeId"));
  res.json({ deleted });
};
