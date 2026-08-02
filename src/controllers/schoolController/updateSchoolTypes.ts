import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { SCHOOL_CLASS_MAP } from "../../utils/classSeed";
import { normalizeSchoolTypes, parseSchoolTypes } from "../../utils/scoreScheme";

/**
 * Edits the school's school-type list with explicit, cascading operations.
 *
 * Body: { add?: string[], rename?: { from, to }[], reassign?: { from, to }[], delete?: string[] }
 *  - add:      append a type (and seed its classes if it is a known category).
 *  - rename:   rename a type; cascades to Class.schoolType and every
 *              ScoreScheme.schoolTypes (rejected if it would merge two
 *              configurations in the same term).
 *  - reassign: move classes from one existing type to another existing type.
 *  - delete:   remove a type; blocked with 400 while classes still use it.
 *              Once clear, the type is stripped from every configuration and
 *              configurations left with no types are deleted.
 */
export const updateSchoolTypes = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const schoolId = req.user.schoolId;
    const { add = [], rename = [], reassign = [], delete: deletes = [] } = req.body;

    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) {
      return res.status(404).json({ error: "School not found" });
    }

    let schoolTypes = parseSchoolTypes(school.schoolType);
    const arms = parseSchoolTypes(school.arms);
    const armList = arms.length > 0 ? arms : [""];

    const summary = {
      added: [] as string[],
      renamed: [] as string[],
      reassigned: [] as string[],
      deleted: [] as string[],
    };

    // 1) ADD
    for (const raw of add) {
      const type = String(raw).trim();
      if (!type || schoolTypes.includes(type)) continue;

      schoolTypes.push(type);
      summary.added.push(type);

      const entries = SCHOOL_CLASS_MAP[type];
      if (!entries) continue;

      const existingClasses = await prisma.class.findMany({
        where: { schoolId, schoolType: type },
        select: { level: true, arm: true },
      });
      const existingKeys = new Set(existingClasses.map((c) => `${c.level}|${c.arm}`));

      const toCreate: { name: string; level: string; arm: string; schoolId: string; schoolType: string }[] = [];
      for (const entry of entries) {
        for (const arm of armList) {
          const key = `${entry.level}|${arm}`;
          if (!existingKeys.has(key)) {
            const armSuffix = arm ? ` ${arm}` : "";
            toCreate.push({
              name: `${entry.name}${armSuffix}`,
              level: entry.level,
              arm,
              schoolId,
              schoolType: type,
            });
          }
        }
      }
      if (toCreate.length > 0) {
        await prisma.class.createMany({ data: toCreate, skipDuplicates: true });
      }
    }

    // 2) RENAME (cascades to classes + configurations)
    for (const r of rename) {
      const from = String(r.from).trim();
      const to = String(r.to).trim();
      if (!from || !to) {
        return res.status(400).json({ error: "rename entries require both from and to" });
      }
      if (!schoolTypes.includes(from)) {
        return res.status(400).json({ error: `Unknown school type: ${from}` });
      }
      if (schoolTypes.includes(to) && from !== to) {
        return res.status(400).json({ error: `School type already exists: ${to}` });
      }
      if (from === to) continue;

      const schemes = await prisma.scoreScheme.findMany({
        where: { schoolId },
        select: { id: true, term: true, session: true, schoolTypes: true },
      });

      for (const scheme of schemes) {
        const types = parseSchoolTypes(scheme.schoolTypes);
        if (!types.includes(from)) continue;
        const next = normalizeSchoolTypes([...types.filter((t) => t !== from), to]);
        const clash = schemes.some(
          (s) =>
            s.id !== scheme.id &&
            s.term === scheme.term &&
            s.session === scheme.session &&
            JSON.stringify(normalizeSchoolTypes(parseSchoolTypes(s.schoolTypes))) ===
              JSON.stringify(next),
        );
        if (clash) {
          return res.status(409).json({
            error: `Renaming "${from}" to "${to}" would merge two configurations for term ${scheme.term} (${scheme.session}). Move those classes to another type first.`,
          });
        }
      }

      schoolTypes = schoolTypes.map((t) => (t === from ? to : t));

      await prisma.class.updateMany({
        where: { schoolId, schoolType: from },
        data: { schoolType: to },
      });

      for (const scheme of schemes) {
        const types = parseSchoolTypes(scheme.schoolTypes);
        if (!types.includes(from)) continue;
        const next = normalizeSchoolTypes([...types.filter((t) => t !== from), to]);
        await prisma.scoreScheme.update({
          where: { id: scheme.id },
          data: { schoolTypes: JSON.stringify(next) },
        });
      }

      summary.renamed.push(`${from} -> ${to}`);
    }

    // 3) REASSIGN (move classes to another existing type; type itself is unchanged)
    for (const r of reassign) {
      const from = String(r.from).trim();
      const to = String(r.to).trim();
      if (!from || !to) {
        return res.status(400).json({ error: "reassign entries require both from and to" });
      }
      if (!schoolTypes.includes(from)) {
        return res.status(400).json({ error: `Unknown school type: ${from}` });
      }
      if (!schoolTypes.includes(to)) {
        return res.status(400).json({ error: `Unknown school type: ${to}` });
      }
      if (from === to) continue;

      const { count } = await prisma.class.updateMany({
        where: { schoolId, schoolType: from },
        data: { schoolType: to },
      });

      summary.reassigned.push(`${from} -> ${to} (${count} class${count === 1 ? "" : "es"})`);
    }

    // 4) DELETE (blocked while classes still use the type)
    for (const raw of deletes) {
      const type = String(raw).trim();
      if (!type || !schoolTypes.includes(type)) continue;

      const classCount = await prisma.class.count({ where: { schoolId, schoolType: type } });
      if (classCount > 0) {
        const sample = await prisma.class.findMany({
          where: { schoolId, schoolType: type },
          take: 5,
          select: { name: true },
        });
        return res.status(400).json({
          error: `Cannot delete school type "${type}": ${classCount} class(es) still use it. Reassign them to another type first.`,
          classes: sample.map((c) => c.name),
        });
      }

      schoolTypes = schoolTypes.filter((t) => t !== type);
      summary.deleted.push(type);

      const schemes = await prisma.scoreScheme.findMany({
        where: { schoolId },
        select: { id: true, schoolTypes: true },
      });
      for (const scheme of schemes) {
        const types = parseSchoolTypes(scheme.schoolTypes).filter((t) => t !== type);
        if (types.length === 0) {
          await prisma.scoreScheme.delete({ where: { id: scheme.id } });
        } else {
          await prisma.scoreScheme.update({
            where: { id: scheme.id },
            data: { schoolTypes: JSON.stringify(normalizeSchoolTypes(types)) },
          });
        }
      }
    }

    schoolTypes = normalizeSchoolTypes(schoolTypes);

    const updated = await prisma.school.update({
      where: { id: schoolId },
      data: { schoolType: JSON.stringify(schoolTypes) },
      select: { id: true, name: true, schoolType: true },
    });

    res.json({
      message: "School types updated",
      school: { ...updated, schoolType: JSON.parse(updated.schoolType) },
      changes: summary,
    });
  } catch (error) {
    const status = (error as any)?.statusCode ?? 500;
    const errorResponse = createErrorResponse(error, "Update School Types", status);
    res.status(errorResponse.status).json(errorResponse);
  }
};
