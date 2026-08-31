import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

declare global {
  var prisma: PrismaClient | undefined;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// pg 8.11+ treats sslmode=require as verify-full (strict cert + hostname
// verification). Against Neon's pooler this intermittently drops the socket
// mid-TLS-handshake under concurrency. Restore the classic "require" behavior
// (encrypt, no cert pinning) which is what Neon pooler connections expect.
const baseConnect = connectionString.includes("?")
  ? connectionString + "&uselibpqcompat=true&sslmode=require"
  : connectionString + "?uselibpqcompat=true&sslmode=require";

const pool = new Pool({
  connectionString: baseConnect,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
  allowExitOnIdle: false,
  keepAlive: true,
});

// Remove broken clients from the pool when Neon/PgBouncer drops an idle socket
// instead of letting a single dirty client poison every subsequent query.
pool.on("error", (err) => {
  console.error("[db] Unexpected error on idle DB client:", err.message);
});
const adapter = new PrismaPg(pool);

export const prisma = global.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
