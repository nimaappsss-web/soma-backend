import { errorHandler } from "./middleware/errorHandler";
import { swaggerSpec } from "./config/swagger";
import uploadRoutes from "./routes/upload";
import authRoutes from "./routes/auth";

import express, { Express, Request, Response } from "express";
import swaggerUi from "swagger-ui-express";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Welcome to nima-backend" });
});

app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoutes);

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
});
