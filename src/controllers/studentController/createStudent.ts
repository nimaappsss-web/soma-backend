import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { generateAdmissionNo } from "../../utils/admission";
import { ensureParentUser } from "../../utils/parentUser";
import { getFrontendUrl } from "../../utils/frontendUrl";
import { normalizePersonName } from "../../utils/personName";
import { validateParentContact, findUserContactConflict } from "../../utils/parentContactValidation";
import { generateInvoicesForStudents } from "../../utils/generateStudentInvoices";

export const createStudent = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { name, admissionNo, classId, gender, dateOfBirth, address, imageUrl, parentName, parentPhone, parentEmail, updatedAt, syncStatus, syncedAt, version } = req.body;

    const schoolId = req.user.schoolId;

    if (!name || !classId) {
      return res.status(400).json({ error: "Name and class are required" });
    }

    // Validate parent contact (require phone if no email; valid email + phone).
    const contactCheck = validateParentContact({ parentEmail, parentPhone });
    if (!contactCheck.ok) {
      return res.status(400).json({ error: contactCheck.error });
    }
    const finalParentPhone = contactCheck.normalizedPhone;

    // Reject a parent contact that belongs to an existing school member
    // (e.g. a principal/teacher's own phone number). Users' personal contacts
    // cannot be re-used as a parent contact. Siblings deliberately share a
    // contact, so there is no duplicate-student check here — the parent is
    // auto-linked to all children that share it.
    const userConflict = await findUserContactConflict(schoolId, { parentEmail, parentPhone });
    if (userConflict) {
      const conflictContact = userConflict.email || userConflict.phone;
      return res.status(400).json({
        error: `This contact (${conflictContact}) belongs to an existing ${String(userConflict.role).toLowerCase()} member: ${userConflict.name}. A parent contact can't be a school member's own number.`,
      });
    }

    let finalAdmissionNo = admissionNo;

    if (!finalAdmissionNo) {
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { admissionPattern: true, admissionCounter: true },
      });

      if (!school) {
        return res.status(404).json({ error: "School not found" });
      }

      finalAdmissionNo = generateAdmissionNo(school.admissionPattern, school.admissionCounter);
      await prisma.school.update({
        where: { id: schoolId },
        data: { admissionCounter: school.admissionCounter + 1 },
      });
    } else {
      const existing = await prisma.student.findUnique({
        where: { schoolId_admissionNo: { schoolId, admissionNo: finalAdmissionNo } },
      });

      if (existing) {
        return res.status(400).json({ error: "A student with this admission number already exists" });
      }
    }

    const student = await prisma.student.create({
      data: {
        id: req.body.id || undefined,
        schoolId,
        classId,
        name,
        admissionNo: finalAdmissionNo,
        gender: gender || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        address: address || null,
        imageUrl: imageUrl || null,
        parentName: normalizePersonName(parentName) || null,
        parentPhone: finalParentPhone,
        parentEmail: parentEmail || null,
        ...(updatedAt ? { updatedAt: new Date(updatedAt) } : {}),
        ...(syncStatus ? { syncStatus } : {}),
        ...(syncedAt ? { syncedAt: new Date(syncedAt) } : {}),
        ...(version ? { version } : {}),
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

    await ensureParentUser(schoolId, req.user!.userId, normalizePersonName(parentName) || name, name, parentEmail, finalParentPhone, getFrontendUrl(req));

    await generateInvoicesForStudents(schoolId, [{ id: student.id, classId }]);

    res.status(201).json({ student });
  } catch (error: any) {
    if (error.message === "A student with this admission number already exists") {
      return res.status(400).json({ error: error.message });
    }
    const errorResponse = createErrorResponse(error, "Create Student");
    res.status(errorResponse.status).json(errorResponse);
  }
};
