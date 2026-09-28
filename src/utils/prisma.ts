import { PrismaClient } from "../generated/prisma/client";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";
import dotenv from "dotenv";

dotenv.config();

declare global {
  var prisma: PrismaClient | undefined;
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Connect over Neon's serverless driver (WebSocket, port 443) instead of the
// raw `pg` TCP connection (port 5432). Port 5432 is blocked by many office/ISP
// networks (which is also why the frontend reaches Neon over HTTPS), so using
// the WebSocket transport keeps the backend reachable from anywhere, without a
// VPN, while still supporting interactive transactions.
neonConfig.webSocketConstructor = ws;

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });

export const prisma = global.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
