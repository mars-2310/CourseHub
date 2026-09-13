import express from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";

import { env } from "./lib/env";
import { errorHandler, notFoundHandler } from "./middleware/error";

import authRouter from "./routes/auth.routes";
import organisationRouter from "./routes/organisation.routes";
import courseRouter from "./routes/course.routes";
import nodeRouter from "./routes/node.routes";
import enrollmentRouter from "./routes/enrollment.routes";
import meRouter from "./routes/me.routes";
import uploadRouter from "./routes/upload.routes";

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(cors({ origin: env.corsOrigin, credentials: true }));

// Verifies Clerk tokens and populates the session on every request. Route-level
// `requireUser` decides whether a session is actually mandatory.
app.use(clerkMiddleware());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", env: env.nodeEnv });
});

app.use("/api/auth", authRouter);
app.use("/api/me", meRouter);
app.use("/api/organizations", organisationRouter);
app.use("/api/courses", courseRouter);
app.use("/api/nodes", nodeRouter);
app.use("/api/courses", enrollmentRouter);
app.use("/api/uploads", uploadRouter);

// 404 for unmatched routes, then the centralized error handler. Both must stay last.
app.use(notFoundHandler);
app.use(errorHandler);

export { app };
