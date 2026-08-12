import { prisma } from "../src/utils/prisma";

// Splits the pre-split "secondary" school type into the junior/senior pair.
// For every school still carrying "secondary": its settings gain both new types,
// its classes are re-tagged by level (JSS* -> junior-secondary, SS* -> senior-secondary),
// and its score schemes get the split pair in place of "secondary".
const SPLIT_TARGET = "secondary";

const parseTypes = (raw: string | null | undefined): string[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

const splitLevel = (level: string): "junior-secondary" | "senior-secondary" | null => {
  const upper = String(level).toUpperCase();
  if (/^JSS/.test(upper)) return "junior-secondary";
  if (/^SS/.test(upper)) return "senior-secondary";
  return null;
};

async function main() {
  const schools = await prisma.school.findMany({ select: { id: true, schoolType: true } });
  let schoolsUpdated = 0;
  let classesUpdated = 0;
  let schemesUpdated = 0;

  for (const school of schools) {
    const types = parseTypes(school.schoolType);
    if (!types.includes(SPLIT_TARGET)) continue;

    const next = [
      ...new Set(
        types.flatMap((t) =>
          t === SPLIT_TARGET ? ["junior-secondary", "senior-secondary"] : [t],
        ),
      ),
    ].sort();

    await prisma.school.update({ where: { id: school.id }, data: { schoolType: JSON.stringify(next) } });
    schoolsUpdated++;
    console.log(`School ${school.id}: ${JSON.stringify(types)} -> ${JSON.stringify(next)}`);

    const classes = await prisma.class.findMany({
      where: { schoolId: school.id, schoolType: SPLIT_TARGET },
      select: { id: true, level: true },
    });

    for (const cls of classes) {
      const target = splitLevel(cls.level);
      if (!target) continue;
      await prisma.class.update({ where: { id: cls.id }, data: { schoolType: target } });
      classesUpdated++;
      console.log(`  Class ${cls.id} (${cls.level}): secondary -> ${target}`);
    }

    const schemes = await prisma.scoreScheme.findMany({
      where: { schoolId: school.id },
      select: { id: true, schoolTypes: true },
    });

    for (const scheme of schemes) {
      const schemeTypes = parseTypes(scheme.schoolTypes);
      if (!schemeTypes.includes(SPLIT_TARGET)) continue;
      const nextScheme = [
        ...new Set(
          schemeTypes.flatMap((t) =>
            t === SPLIT_TARGET ? ["junior-secondary", "senior-secondary"] : [t],
          ),
        ),
      ].sort();
      await prisma.scoreScheme.update({
        where: { id: scheme.id },
        data: { schoolTypes: JSON.stringify(nextScheme) },
      });
      schemesUpdated++;
      console.log(`  Scheme ${scheme.id}: ${JSON.stringify(schemeTypes)} -> ${JSON.stringify(nextScheme)}`);
    }
  }

  // Safety net: any class that somehow still carries the legacy tag.
  const stragglers = await prisma.class.count({ where: { schoolType: SPLIT_TARGET } });
  if (stragglers > 0) {
    console.warn(`WARNING: ${stragglers} class(es) still tagged "secondary"`);
  }

  console.log(`Done. ${schoolsUpdated} schools, ${classesUpdated} classes, ${schemesUpdated} schemes updated.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});