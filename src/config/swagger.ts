import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Nima School Management API",
      version: "1.0.0",
      description:
        "API for managing Nigerian schools with offline-first architecture",
      contact: {
        name: "Nima Backend",
      },
    },
    servers: [
      {
        url: process.env.RENDER_EXTERNAL_URL || "http://localhost:3000",
        description: "Production server",
      },
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        School: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            state: { type: "string" },
            lga: { type: "string" },
            schoolType: { type: "string", enum: ["creche", "kindergarten", "primary", "secondary", "both"] },
          },
        },
        User: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            email: { type: "string" },
            role: { type: "string", enum: ["PRINCIPAL", "TEACHER", "BURSAR"] },
            schoolId: { type: "string" },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["email", "password", "deviceId", "deviceName"],
          properties: {
            email: { type: "string", example: "principal@greenfield.sch.ng" },
            password: { type: "string", example: "SecurePass123" },
            deviceId: { type: "string", example: "device-001" },
            deviceName: { type: "string", example: "Chrome Browser" },
          },
        },
        RefreshRequest: {
          type: "object",
          required: ["refreshToken"],
          properties: {
            refreshToken: { type: "string" },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: { type: "string" },
          },
        },
      },
    },
  },
  apis: ["./src/routes/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
