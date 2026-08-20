import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

const baseConnect = process.env.DATABASE_URL! + "&uselibpqcompat=true&sslmode=require";
const pool = new Pool({
  connectionString: baseConnect,
  max: 1,
  connectionTimeoutMillis: 60000,
  idleTimeoutMillis: 30000,
  keepAlive: true,
});
const adapter = new PrismaPg(pool);
const p = new PrismaClient({ adapter });

async function main() {
  console.log("connecting...");
  const teachers = await p.user.findMany({ where: { role: "TEACHER" }, take: 5, select: { id: true, name: true, schoolId: true, formClassId: true } });
  console.log("TEACHERS:", JSON.stringify(teachers, null, 1));
  const t = teachers[0];
  if (t) {
    const cls = await p.class.findUnique({ where: { id: t.formClassId! }, select: { id: true, name: true, schoolId: true } });
    console.log("FORM CLASS:", JSON.stringify(cls));
    if (cls) {
      const students = await p.student.groupBy({ by: ["status"], where: { classId: t.formClassId! }, _count: true });
      console.log("STUDENTS BY STATUS:", JSON.stringify(students));
      const att = await p.attendance.findMany({ where: { classId: t.formClassId! }, take: 10, orderBy: { date: "desc" }, select: { date: true, status: true, studentId: true } });
      console.log("LATEST ATTENDANCE:", JSON.stringify(att, null, 1));
    }
  }
}
main().then(() => process.exit(0)).catch(e => { console.error("ERR", e.message); process.exit(1); });
