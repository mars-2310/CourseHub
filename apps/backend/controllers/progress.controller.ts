import type { RequestHandler } from "express";
import { currentUser } from "../middleware/auth";
import * as progress from "../services/progress.service";
import { param } from "../utils/http";

export const complete: RequestHandler = async (req, res) => {
  const { completed } = req.body as { completed: boolean };
  const row = await progress.setNodeCompletion(currentUser(req), param(req, "nodeId"), completed);
  res.json({
    progress: { nodeId: row.nodeId, completed: row.completed, completedAt: row.completedAt },
  });
};

export const courseProgress: RequestHandler = async (req, res) => {
  const summary = await progress.getCourseProgress(currentUser(req), param(req, "courseId"));
  res.json({ progress: summary });
};
