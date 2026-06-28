import express from "express";
import cors from "cors";

const app = express();

app.use(express.json());
app.use(cors());

import adminRouter from "./routes/admin.routes";
import analyticsRouter from "./routes/analytics.routes";
import authRouter from "./routes/auth.routes";
import courseRouter from "./routes/course.routes";
import enrollmentRouter from "./routes/enrollment.routes";
import lessonRouter from "./routes/lesson.routes";
import organisationRouter from "./routes/organisation.routes";
import paymentRouter from "./routes/payment.routes";
import sectionRouter from "./routes/section.routes";
import uploadRouter from "./routes/upload.routes";

export { app }