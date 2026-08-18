import { prisma } from "../src/utils/prisma";
import { generateInvoicesForStudents } from "../src/utils/generateStudentInvoices";

/**
 * One-off backfill: create invoices for every existing ACTIVE student that is
 * missing one, from the fee structures covering their class for the current
 * session. Safe to re-run — generation is idempotent.
 */
async function main() {
  const schools = await prisma.school.findMany({ select: { id: true, name: true } });
  let totalGenerated = 0;
  let totalSchools = 0;

  for (const school of schools) {
    const students = await prisma.student.findMany({
      where: { schoolId: school.id, status: "ACTIVE" },
      select: { id: true, classId: true },
    });
    if (students.length === 0) continue;

    const generated = await generateInvoicesForStudents(school.id, students);
    if (generated > 0) {
      console.log(`${school.name}: generated ${generated} invoice(s) for ${students.length} student(s)`);
      totalSchools += 1;
      totalGenerated += generated;
    } else {
      console.log(`${school.name}: no missing invoices (${students.length} students checked)`);
    }
  }

  console.log(`Done. ${totalGenerated} invoice(s) created across ${totalSchools} school(s).`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
