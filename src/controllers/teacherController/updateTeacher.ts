import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

interface AssignmentInput {
  subjectId: string;
  classIds: string[];
}

export const updateTeacher = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const schoolId = req.user.schoolId;
    const { id } = req.params;
    const { name, email, phone, role, active, formClassId, image, updatedAt, assignments } = req.body;

    const teacher = await prisma.user.findFirst({
      where: {
        id,
        schoolId,
        role: { in: ["TEACHER", "BURSAR"] },
      },
      select: { id: true, updatedAt: true, email: true, emailVerified: true },
    });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    const nextEmail =
      typeof email === "string" && email.trim() ? email.trim() : undefined;
    const emailChanged =
      nextEmail !== undefined &&
      nextEmail.toLowerCase() !== (teacher.email ?? "").toLowerCase();

    if (nextEmail !== undefined) {
      const duplicate = await prisma.user.findFirst({
        where: { email: nextEmail, id: { not: id } },
        select: { id: true },
      });
      if (duplicate) {
        return res.status(409).json({
          error: "Email already in use by another user",
        });
      }
    }

    if (updatedAt) {
      const clientTime = new Date(updatedAt).getTime();
      const serverTime = teacher.updatedAt.getTime();
      if (serverTime > clientTime) {
        return res.status(409).json({
          error: "Conflict",
          message: "This record was modified by another device. Refresh and try again.",
          serverUpdatedAt: teacher.updatedAt,
        });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (Array.isArray(assignments)) {
        const assignmentInputs = (assignments as AssignmentInput[]).filter(
          (a) => a && a.subjectId,
        );

        const subjectIds = [...new Set(assignmentInputs.map((a) => a.subjectId))];
        const classIds = [...new Set(assignmentInputs.flatMap((a) => a.classIds ?? []))];

        const [validSubjects, validClasses] = await Promise.all([
          subjectIds.length
            ? tx.subject.findMany({
                where: { id: { in: subjectIds }, schoolId },
                select: { id: true },
              })
            : Promise.resolve([] as { id: string }[]),
          classIds.length
            ? tx.class.findMany({
                where: { id: { in: classIds }, schoolId },
                select: { id: true },
              })
            : Promise.resolve([] as { id: string }[]),
        ]);

        const validSubjectIds = new Set(validSubjects.map((s) => s.id));
        const validClassIds = new Set(validClasses.map((c) => c.id));

        await tx.teacherAssignment.deleteMany({
          where: { teacherId: id, type: "subject" },
        });

        for (const assignment of assignmentInputs) {
          if (!validSubjectIds.has(assignment.subjectId)) continue;

          const created = await tx.teacherAssignment.create({
            data: {
              teacherId: id,
              schoolId,
              type: "subject",
              subjectId: assignment.subjectId,
            },
          });

          const classIdsToLink = (assignment.classIds ?? []).filter((c) =>
            validClassIds.has(c),
          );

          if (classIdsToLink.length) {
            const now = new Date();
            await tx.teacherAssignmentClass.createMany({
              data: classIdsToLink.map((classId) => ({
                assignmentId: created.id,
                classId,
                updatedAt: now,
              })),
            });
          }
        }
      }

      return tx.user.update({
        where: { id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(nextEmail !== undefined ? { email: nextEmail } : {}),
          // A changed email must be re-verified by the new address owner before
          // they can sign in again.
          ...(emailChanged ? { emailVerified: false } : {}),
          ...(phone !== undefined ? { phone } : {}),
          ...(role !== undefined ? { role } : {}),
          ...(active !== undefined ? { active } : {}),
          ...(formClassId !== undefined ? { formClassId } : {}),
          ...(image !== undefined ? { image } : {}),
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          active: true,
          formClassId: true,
          image: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    res.json({
      teacher: updated,
      ...(emailChanged ? { message: "Email changed. Teacher must verify via login OTP." } : {}),
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Update Teacher");
    res.status(errorResponse.status).json(errorResponse);
  }
};
