import { prisma } from "../src/utils/prisma";

const OLD_TO_NEW: Record<string, string> = {
  creche: JSON.stringify(["creche"]),
  kindergarten: JSON.stringify(["kg"]),
  primary: JSON.stringify(["primary"]),
  secondary: JSON.stringify(["secondary"]),
  both: JSON.stringify(["creche", "kg", "primary", "secondary"]),
};

async function main() {
  const schools = await prisma.school.findMany();
  let updated = 0;

  for (const school of schools) {
    const old = school.schoolType;
    // Skip if already a JSON array
    if (old.startsWith("[")) continue;

    const newVal = OLD_TO_NEW[old];
    if (!newVal) {
      console.warn(`Unknown schoolType "${old}" for school ${school.id}, setting to ["primary"]`);
      await prisma.school.update({ where: { id: school.id }, data: { schoolType: JSON.stringify(["primary"]) } });
      updated++;
      continue;
    }

    await prisma.school.update({ where: { id: school.id }, data: { schoolType: newVal } });
    updated++;
    console.log(`Migrated school ${school.id}: "${old}" → ${newVal}`);
  }

  console.log(`Done. ${updated} schools migrated.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
