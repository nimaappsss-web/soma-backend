import "dotenv/config";
import { loadRenderSecrets } from "./utils/renderSecrets";

loadRenderSecrets();
import { errorHandler } from "./middleware/errorHandler";
import { swaggerSpec } from "./config/swagger";
import uploadRoutes from "./routes/upload";
import authRoutes from "./routes/auth";
import superAdminRoutes from "./routes/superAdmin";
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
import supportMessageRoutes from "./routes/supportMessages";
import pushRoutes from "./routes/push";
import { authenticateToken } from "./middleware/auth";
import { gateApproval } from "./middleware/approval";
import { startSseHeartbeat } from "./utils/sse";
import { isCloudApiConfigured } from "./utils/whatsappCloud";
import { broadcastDataChanged } from "./middleware/broadcastDataChanged";
import { startSomaBot } from "./bot/somaBot";

import express, { Express, Request, Response } from "express";
import swaggerUi from "swagger-ui-express";
import cors from "cors";

const app: Express = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
// The Twilio WhatsApp webhook posts application/x-www-form-urlencoded data.
app.use("/api/whatsapp", express.urlencoded({ extended: false }));

// Broadcast data-changed events to the user's other connected devices after
// successful writes. Mounted before routes so it wraps every API request; the
// user is read in the "finish" callback (after auth middleware runs).
app.use(broadcastDataChanged);

app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Welcome to nima-backend" });
});

app.use("/api/auth", authRoutes);
app.use("/api/super-admin", superAdminRoutes);
app.use("/api/support-messages", supportMessageRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/push", pushRoutes);

// School-scoped APIs sit behind the approval turnstile: PENDING schools get
// read-only preview, REJECTED schools get nothing. (Auth, super-admin, upload,
// support-messages and whatsapp webhook are exempt.)
const gateSchoolApi = [authenticateToken, gateApproval];
app.use("/api/teachers", gateSchoolApi, teacherRoutes);
app.use("/api/subjects", gateSchoolApi, subjectRoutes);
app.use("/api/classes", gateSchoolApi, classRoutes);
app.use("/api/students", gateSchoolApi, studentRoutes);
app.use("/api/school", gateSchoolApi, schoolRoutes);
app.use("/api/attendance", gateSchoolApi, attendanceRoutes);
app.use("/api/results", gateSchoolApi, resultsRoutes);
app.use("/api/parents", gateSchoolApi, parentRoutes);
app.use("/api/lesson-notes", gateSchoolApi, lessonNoteRoutes);
app.use("/api/academic-terms", gateSchoolApi, academicTermRoutes);
app.use("/api/holidays", gateSchoolApi, holidayRoutes);
app.use("/api/dashboard", gateSchoolApi, dashboardRoutes);
app.use("/api/exams", gateSchoolApi, examRoutes);
app.use("/api/assessments", gateSchoolApi, assessmentRoutes);
app.use("/api/staff", gateSchoolApi, staffRoutes);
app.use("/api/timetable", gateSchoolApi, timetableRoutes);
app.use("/api/announcements", gateSchoolApi, announcementRoutes);
app.use("/api/calendar", gateSchoolApi, calendarRoutes);
app.use("/api/finance", gateSchoolApi, financeRoutes);
app.use("/api/reports", gateSchoolApi, reportRoutes);
app.use("/api/report-settings", gateSchoolApi, reportSettingsRoutes);
app.use("/api/celebrations", gateSchoolApi, celebrationRoutes);
app.use("/api/analytics", gateSchoolApi, analyticsRoutes);
app.use("/api/subject-assignments", gateSchoolApi, subjectAssignmentsRoutes);
app.use("/api/notifications", gateSchoolApi, notificationRoutes);
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

  void startSomaBot();

  if (!process.env.RESEND_API_KEY) {
    console.error("WARNING: RESEND_API_KEY not set — email sending will fail");
  }

  if (isCloudApiConfigured()) {
    console.log("[whatsapp] Twilio WhatsApp active");
  } else {
    console.warn("[whatsapp] Not configured — set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM");
  }
});
