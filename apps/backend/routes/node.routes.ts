import { Router } from "express";

const router = Router();

router.get("/:id/tree", (req, res) => {
  res.json({ message: "ContentNode tree router placeholder active!" });
});

export default router;
