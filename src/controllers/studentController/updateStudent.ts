import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { localPhoneNumber } from "../../utils/whatsapp";
import { sendParentInviteEmail } from "../../utils/email";
import { ensureParentUser } from "../../utils/parentUser";
import { normalizePersonName } from "../../utils/personName";

export const updateStudent = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { name, classId, gender, dateOfBirth, address, imageUrl, parentName, parentPhone, parentEmail, status, updatedAt } = req.body;

    const student = await prisma.student.findFirst({
      where: { id: req.params.id, schoolId: req.user.schoolId },
      select: {
        id: true,
        classId: true,
        updatedAt: true,
        admissionNo: true,
        parentEmail: true,
        parentPhone: true,
        parentName: true,
      },
    });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Conflict detection: if client sends updatedAt, reject if server's record is newer
    if (updatedAt) {
      const clientTime = new Date(updatedAt).getTime();
      const serverTime = student.updatedAt.getTime();
      if (serverTime > clientTime) {
        return res.status(409).json({
          error: "Conflict",
          message: "This record was modified by another device. Refresh and try again.",
          serverUpdatedAt: student.updatedAt,
        });
      }
    }

    const oldClassId = student.classId;

    const updated = await prisma.student.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(classId !== undefined ? { classId } : {}),
        ...(gender !== undefined ? { gender } : {}),
        ...(dateOfBirth !== undefined ? { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null } : {}),
        ...(address !== undefined ? { address } : {}),
        ...(imageUrl !== undefined ? { imageUrl } : {}),
        ...(parentName !== undefined ? { parentName: normalizePersonName(parentName) || null } : {}),
        ...(parentPhone !== undefined ? { parentPhone: parentPhone ? localPhoneNumber(parentPhone) : null } : {}),
        ...(parentEmail !== undefined ? { parentEmail } : {}),
        ...(status !== undefined ? { status } : {}),
      },
      select: {
        id: true,
        name: true,
        admissionNo: true,
        classId: true,
        gender: true,
        dateOfBirth: true,
        address: true,
        imageUrl: true,
        parentName: true,
        parentPhone: true,
        parentEmail: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        syncStatus: true,
        syncedAt: true,
        version: true,
      },
    });

    // Sync any pending parent invite with the updated contact info.
    // Match the invite by the phone it was created with (the old phone).
    if (parentEmail !== undefined || parentPhone !== undefined) {
      try {
        const matching = await prisma.inviteToken.findFirst({
          where: {
            schoolId: req.user.schoolId,
            role: "PARENT",
            usedAt: null,
            OR: [
              { invitedPhone: student.parentPhone || "___none___" },
              { invitedPhone: updated.parentPhone || "___none___" },
            ],
          },
          orderBy: { createdAt: "desc" },
        });

        if (matching) {
          await prisma.inviteToken.update({
            where: { id: matching.id },
            data: {
              ...(parentEmail !== undefined ? { invitedEmail: updated.parentEmail } : {}),
              ...(parentPhone !== undefined ? { invitedPhone: updated.parentPhone } : {}),
              ...(parentName !== undefined ? { invitedName: updated.parentName } : {}),
            },
          });

          // Email is the priority — if an email was just added (or changed) on a
          // pending invite, actually send the invite to it.
          if (updated.parentEmail && updated.parentEmail !== student.parentEmail) {
            const school = await prisma.school.findUnique({
              where: { id: req.user.schoolId },
              select: { name: true },
            });
            try {
              await sendParentInviteEmail(
                updated.parentEmail,
                school?.name || "School",
                normalizePersonName(updated.parentName || student.parentName) || "Parent",
                updated.name,
                matching.token,
                updated.parentEmail,
                updated.parentPhone || student.parentPhone,
              );
            } catch (err: any) {
              console.error("Failed to send parent invite email after edit:", err?.message || err);
            }
          }
        } else if (updated.parentEmail || updated.parentPhone) {
          // No pending invite exists for this parent yet (e.g. the student was
          // created without contact info, or the original invite creation never
          // happened). Create the parent account + invite and deliver it now so
          // a student with a parent email always ends up with a working invite.
          await ensureParentUser(
            req.user.schoolId,
            req.user.userId,
            normalizePersonName(updated.parentName || student.parentName) || "Parent",
            updated.name,
            updated.parentEmail,
            updated.parentPhone || student.parentPhone,
          );
        }
      } catch (err: any) {
        console.error("Failed to sync parent invite:", err?.message || err);
      }
    }

    // Log class transfer to timeline
    if (classId !== undefined && classId !== oldClassId) {
      const [oldClass, newClass] = await Promise.all([
        prisma.class.findUnique({ where: { id: oldClassId }, select: { name: true } }),
        prisma.class.findUnique({ where: { id: classId }, select: { name: true } }),
      ]);
      const oldName = oldClass?.name || "Unknown";
      const newName = newClass?.name || "Unknown";
      await prisma.studentTimeline.create({
        data: {
          studentId: updated.id,
          type: "CLASS_TRANSFER",
          description: `Moved from ${oldName} to ${newName}`,
          date: new Date(),
        },
      });
    }

    res.json({ student: updated });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Update Student");
    res.status(errorResponse.status).json(errorResponse);
  }
};
