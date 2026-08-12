import { prisma } from "./src/utils/prisma";
const SCHOOL = "cmsi2minx004bf61uyc05vfz7";
(async () => {
  const counts: Record<string, number> = {};
  for (const t of ["attendanceNote", "inviteToken", "teacherAssignment"] as const) {
    counts[t] = await (prisma[t] as any).deleteMany({ where: { schoolId: SCHOOL } });
  }
  console.log("ORPHAN DELETES:", JSON.stringify(counts));
  const school = await prisma.school.findUnique({ where: { id: SCHOOL } });
  if (!school) { console.log("SCHOOL NOT FOUND"); await prisma.$disconnect(); return; }
  const del = await prisma.school.delete({ where: { id: SCHOOL } });
  console.log("SCHOOL DELETED:", del.name);
  await prisma.$disconnect();
})();
