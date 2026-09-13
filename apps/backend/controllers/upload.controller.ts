import type { RequestHandler } from "express";
import { currentUser } from "../middleware/auth";
import * as uploads from "../services/upload.service";
import { UPLOAD_KINDS } from "../types/upload.schema";

/**
 * Returns a short-lived signed PUT. The client uploads straight to storage and
 * then records the resulting URL on a node via PATCH /api/nodes/:nodeId.
 */
export const sign: RequestHandler = async (req, res) => {
  const upload = await uploads.signUpload(currentUser(req), req.body);
  res.json({ upload });
};

/** Lets the frontend validate a file before asking for a signature. */
export const limits: RequestHandler = (_req, res) => {
  res.json({
    configured: uploads.isConfigured(),
    kinds: Object.fromEntries(
      Object.entries(UPLOAD_KINDS).map(([kind, spec]) => [
        kind,
        { contentTypes: spec.contentTypes, maxBytes: spec.maxBytes },
      ]),
    ),
  });
};
