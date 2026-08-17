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
import resultsRoutes from "./routes/results";
import parentRoutes from "./routes/parents";
import lessonNoteRoutes from "./routes/lessonNotes";
import academicTermRoutes from "./routes/academicTerms";
import holidayRoutes from "./routes/holidays";
import dashboardRoutes from "./routes/dashboard";
import examRoutes from "./routes/exams";
import assessmentRoutes from "./routes/assessment";
import staffRoutes from "./routes/staff";
import timetableRoutes from "./routes/timetable";
import announcementRoutes from "./routes/announcements";
import calendarRoutes from "./routes/calendar";
import financeRoutes from "./routes/finance";
import reportRoutes from "./routes/reports";
import reportSettingsRoutes from "./routes/report-settings";
import celebrationRoutes from "./routes/celebrations";
import analyticsRoutes from "./routes/analytics";
import subjectAssignmentsRoutes from "./routes/subject-assignments";
import notificationRoutes from "./routes/notifications";
import whatsappRoutes from "./routes/whatsapp";
import { startSseHeartbeat } from "./utils/sse";

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
app.use("/api/results", resultsRoutes);
app.use("/api/parents", parentRoutes);
app.use("/api/lesson-notes", lessonNoteRoutes);
app.use("/api/academic-terms", academicTermRoutes);
app.use("/api/holidays", holidayRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/assessments", assessmentRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/timetable", timetableRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/report-settings", reportSettingsRoutes);
app.use("/api/celebrations", celebrationRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/subject-assignments", subjectAssignmentsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/whatsapp", whatsappRoutes);

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

  startSseHeartbeat();

  if (!process.env.SENDGRID_API_KEY) {
    console.error("WARNING: SENDGRID_API_KEY not set — email sending will fail");
  }

  import("./utils/whatsappClient")
    .then(({ initWhatsApp }) => initWhatsApp())
    .catch((err) => console.error("Failed to init WhatsApp client:", err?.message || err));
});
