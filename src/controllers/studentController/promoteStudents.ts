import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

type PromotionAction = "PROMOTE" | "REPEAT" | "GRADUATE";

interface PromotionOverride {
  studentId: string;
  action: PromotionAction;
  toClassId?: string;
}

interface ClassMove {
  fromClassId: string;
  toClassId: string;
}

export const promoteStudents = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const schoolId = req.user.schoolId;
    const { moves = [], overrides = [] } = req.body as {
      moves?: ClassMove[];
      overrides?: PromotionOverride[];
    };

    if (!Array.isArray(moves) || !Array.isArray(overrides)) {
      return res.status(400).json({ error: "moves and overrides must be arrays" });
    }

    // Classes involved must all belong to this school.
    const moveFromIds = [...new Set(moves.map((m) => m.fromClassId))];
    const moveToIds = [
      ...new Set(
        moves.map((m) => m.toClassId).concat(overrides.map((o) => o.toClassId).filter(Boolean) as string[]),
      ),
    ];

    const schoolClasses = await prisma.class.findMany({
      where: { id: { in: [...new Set([...moveFromIds, ...moveToIds])] } },
      select: { id: true, name: true, schoolId: true },
    });

    for (const cls of schoolClasses) {
      if (cls.schoolId !== schoolId) {
        return res.status(400).json({ error: "One or more classes do not belong to your school" });
      }
    }

    const classById = new Map(schoolClasses.map((c) => [c.id, c]));

    for (const m of moves) {
      if (!classById.has(m.fromClassId)) {
        return res.status(400).json({ error: `Unknown source class: ${m.fromClassId}` });
      }
      if (!classById.has(m.toClassId)) {
        return res.status(400).json({ error: `Unknown destination class: ${m.toClassId}` });
      }
      if (m.fromClassId === m.toClassId) {
        return res.status(400).json({ error: "Source and destination class cannot be the same" });
      }
    }

    // Every active student in the school, keyed by their current class.
    const students = await prisma.student.findMany({
      where: { schoolId, status: "ACTIVE" },
      select: { id: true, name: true, classId: true },
    });
    const studentIds = new Set(students.map((s) => s.id));

    // Overrides must reference real, active students of this school.
    const overrideByStudent = new Map<string, PromotionOverride>();
    for (const o of overrides) {
      if (!studentIds.has(o.studentId)) {
        return res.status(400).json({ error: `Unknown or inactive student: ${o.studentId}` });
      }
      if (!["PROMOTE", "REPEAT", "GRADUATE"].includes(o.action)) {
        return res.status(400).json({ error: `Invalid action: ${o.action}` });
      }
      if (o.action === "PROMOTE") {
        const target =
          o.toClassId ??
          moves.find((m) => m.fromClassId === students.find((s) => s.id === o.studentId)?.classId)?.toClassId;
        if (!target || !classById.has(target)) {
          return res.status(400).json({
            error: `PROMOTE override for student ${o.studentId} needs a valid toClassId`,
          });
        }
        o.toClassId = target;
      }
      overrideByStudent.set(o.studentId, o);
    }

    const moveByClass = new Map(moves.map((m) => [m.fromClassId, m.toClassId]));

    // Resolve final decision per student before touching the DB.
    let promotedCount = 0;
    let repeatedCount = 0;
    let graduatedCount = 0;

    const updates = students.map((student) => {
      const override = overrideByStudent.get(student.id);
      const action: PromotionAction = override?.action ?? (moveByClass.has(student.classId) ? "PROMOTE" : "REPEAT");
      const targetClassId =
        action === "PROMOTE"
          ? (override?.toClassId ?? moveByClass.get(student.classId))
          : undefined;

      if (action === "PROMOTE") promotedCount++;
      else if (action === "REPEAT") repeatedCount++;
      else graduatedCount++;

      return { student, action, targetClassId };
    });

    const result = await prisma.$transaction(async (tx) => {
      for (const { student, action, targetClassId } of updates) {
        if (action === "REPEAT") continue;

        if (action === "GRADUATE") {
          await tx.student.update({
            where: { id: student.id },
            data: { status: "GRADUATED", syncStatus: "synced", syncedAt: new Date(), version: { increment: 1 } },
          });
          await tx.studentTimeline.create({
            data: {
              studentId: student.id,
              type: "STATUS_CHANGE",
              description: "Graduated",
              date: new Date(),
            },
          });
          continue;
        }

        await tx.student.update({
          where: { id: student.id },
          data: {
            classId: targetClassId!,
            syncStatus: "synced",
            syncedAt: new Date(),
            version: { increment: 1 },
          },
        });

        const [fromCls, toCls] = [classById.get(student.classId), classById.get(targetClassId!)];
        await tx.studentTimeline.create({
          data: {
            studentId: student.id,
            type: "PROMOTION",
            description: `Promoted from ${fromCls?.name || "Unknown"} to ${toCls?.name || "Unknown"}`,
            date: new Date(),
          },
        });
      }

      return { promoted: promotedCount, repeated: repeatedCount, graduated: graduatedCount };
    });

    res.json(result);
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Promote Students");
    res.status(errorResponse.status).json(errorResponse);
  }
};
