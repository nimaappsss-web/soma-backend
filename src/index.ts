import "dotenv/config";
import { errorHandler } from "./middleware/errorHandler";
import { swaggerSpec } from "./config/swagger";
import uploadRoutes from "./routes/upload";
import authRoutes from "./routes/auth";
import teacherRoutes from "./routes/teachers";
import subjectRoutes from "./routes/subjects";
import classRoutes from "./routes/classes";
import studentRoutes from "./routes/students";
import schoolRoutes from "./routes/school";
import attendanceRoutes from "./routes/attendance";
import parentRoutes from "./routes/parents";
import lessonNoteRoutes from "./routes/lessonNotes";

import express, { Express, Request, Response } from "express";
import swaggerUi from "swagger-ui-express";
import cors from "cors";

const app: Express = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Welcome to nima-backend" });
});

app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/school", schoolRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/parents", parentRoutes);
app.use("/api/lesson-notes", lessonNoteRoutes);

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Nima API Documentation",
  }),
);

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
  console.log(
    `API Documentation available at http://localhost:${port}/api-docs`,
  );

  if (!process.env.SENDGRID_API_KEY) {
    console.error("WARNING: SENDGRID_API_KEY not set — email sending will fail");
  }
});
