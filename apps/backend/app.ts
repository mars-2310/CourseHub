import express from "express";
import cors from "cors";
import { clerkMiddleware, requireAuth, getAuth } from "@clerk/express";

// 1. Import your system modular routes
import authRouter from "./routes/auth.routes";
import organisationRouter from "./routes/organisation.routes";
import courseRouter from "./routes/course.routes";
import nodeRouter from "./routes/node.routes"; // The unified content tree router
import enrollmentRouter from "./routes/enrollment.routes";
import uploadRouter from "./routes/upload.routes";
import analyticsRouter from "./routes/analytics.routes";
import paymentRouter from "./routes/payment.routes";
import adminRouter from "./routes/admin.routes";

const app = express();

app.use(express.json());
app.use(cors());

// 2. Mount Clerk globally to automatically validate incoming login tokens
app.use(clerkMiddleware());

// 3. Mount all your clean architectural routes
app.use("/api/auth", authRouter);
app.use("/api/organisation", organisationRouter);
app.use("/api/courses", courseRouter);
app.use("/api/nodes", nodeRouter); // Handles creation/movement of folders, videos, quizzes
app.use("/api/enrollment", enrollmentRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/payment", paymentRouter);
app.use("/api/admin", adminRouter);

// 4. A quick test route to verify Clerk is intercepting tokens correctly
app.get("/api/dashboard-test", requireAuth(), (req, res) => {
  const auth = getAuth(req);
  res.json({
    message: "Access granted! Clerk securely verified your token.",
    userId: auth.userId,
  });
});

export { app };
