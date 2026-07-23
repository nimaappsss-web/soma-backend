import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { generateAdmissionNo } from "../../utils/admission";
import { generateSecureToken } from "../../utils/tokens";
import { trySendParentEmail } from "../../utils/email";

export const bulkCreateStudents = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { students } = req.body;

    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ error: "Students array is required" });
    }

    if (students.length > 500) {
      return res.status(400).json({ error: "Maximum 500 students per batch" });
    }

    const schoolId = req.user.schoolId;

    // --- Validate input ---
    const errors: any[] = [];
    const validStudents = students.filter((s) => {
      if (!s.name || !s.classId) {
        errors.push({ admissionNo: s.admissionNo || "unknown", error: "Name and class are required" });
        return false;
      }
      return true;
    });

    if (validStudents.length === 0) {
      return res.status(400).json({ error: "No valid students to create", errors });
    }

    // --- Normalize a class name for matching ---
    const normalizeName = (name: string) =>
      name.replace(/\s+/g, " ").trim().toLowerCase();

    // --- Collect unique classIds ---
    const uniqueClassIds = [...new Set(validStudents.map((s) => s.classId))];

    // --- Fetch existing data (3 parallel queries) ---
    const [existingStudents, school, allSchoolClasses] = await Promise.all([
      prisma.student.findMany({
        where: { schoolId },
        select: { name: true, classId: true, admissionNo: true },
      }),
      prisma.school.findUnique({
        where: { id: schoolId },
        select: { admissionPattern: true, admissionCounter: true, name: true },
      }),
      prisma.class.findMany({
        where: { schoolId },
        select: { id: true, name: true },
      }),
    ]);

    if (!school) {
      return res.status(404).json({ error: "School not found" });
    }

    // --- Resolve each student's classId to a real class UUID ---
    // Build lookup: normalized class name → class UUID
    const nameToId = new Map<string, string>();
    for (const c of allSchoolClasses) {
      nameToId.set(c.id, c.id);
      nameToId.set(normalizeName(c.name), c.id);
    }

    const resolvedClassIds = new Map<string, string>(); // input → resolved UUID
    const missingClassIds: string[] = [];

    for (const rawId of uniqueClassIds) {
      if (nameToId.has(rawId)) {
        resolvedClassIds.set(rawId, nameToId.get(rawId)!);
      } else if (nameToId.has(normalizeName(rawId))) {
        resolvedClassIds.set(rawId, nameToId.get(normalizeName(rawId))!);
      } else {
        missingClassIds.push(rawId);
      }
    }

    if (missingClassIds.length > 0) {
      return res.status(400).json({
        error: "Some classes don't exist on the server. Check your class names and sync before adding students.",
        missingClassIds,
        availableClasses: allSchoolClasses.map((c) => c.name),
      });
    }

    // --- Build lookup maps ---
    const existingNameClassSet = new Set(existingStudents.map((s) => `${s.name}|${s.classId}`));
    const existingAdmissionSet = new Set(existingStudents.map((s) => s.admissionNo).filter(Boolean));

    // --- Atomic admission counter increment ---
    const autoGenCount = validStudents.filter((s) => !s.admissionNo).length;
    let counter = school.admissionCounter;
    const pattern = school.admissionPattern;

    if (autoGenCount > 0) {
      const updated = await prisma.school.update({
        where: { id: schoolId },
        data: { admissionCounter: { increment: autoGenCount } },
        select: { admissionCounter: true },
      });
      counter = updated.admissionCounter - autoGenCount;
    }

    // --- Build final data, check duplicates ---
    const toCreate: any[] = [];
    const localAdmissionSet = new Set(existingAdmissionSet);
    const localNameClassSet = new Set<string>();

    for (const s of validStudents) {
      const actualClassId = resolvedClassIds.get(s.classId)!;
      const nameClassKey = `${s.name}|${actualClassId}`;

      if (existingNameClassSet.has(nameClassKey) || localNameClassSet.has(nameClassKey)) {
        errors.push({ admissionNo: s.admissionNo || "unknown", error: "Duplicate student" });
        continue;
      }
      localNameClassSet.add(nameClassKey);

      let admissionNo = s.admissionNo;
      if (!admissionNo) {
        admissionNo = generateAdmissionNo(pattern, counter);
        counter++;
      }

      if (localAdmissionSet.has(admissionNo)) {
        errors.push({ admissionNo, error: "Admission number already exists" });
        continue;
      }
      localAdmissionSet.add(admissionNo);

      toCreate.push({
        schoolId,
        classId: actualClassId,
        name: s.name,
        admissionNo,
        gender: s.gender || null,
        dateOfBirth: s.dateOfBirth ? new Date(s.dateOfBirth) : null,
        address: s.address || null,
        imageUrl: s.imageUrl || null,
        parentName: s.parentName || null,
        parentPhone: s.parentPhone || null,
        parentEmail: s.parentEmail || null,
        ...(s.updatedAt ? { updatedAt: new Date(s.updatedAt) } : {}),
        ...(s.syncStatus ? { syncStatus: s.syncStatus } : {}),
        ...(s.syncedAt ? { syncedAt: new Date(s.syncedAt) } : {}),
        ...(s.version ? { version: s.version } : {}),
      });
    }

    if (toCreate.length === 0) {
      return res.status(400).json({ error: "All students were duplicates or invalid", errors });
    }

    // --- Bulk insert all students (1 query) ---
    await prisma.student.createMany({ data: toCreate });

    // Fetch created records back
    const admissionNos = toCreate.map((s) => s.admissionNo);
    const created = await prisma.student.findMany({
      where: { schoolId, admissionNo: { in: admissionNos } },
      select: { id: true, name: true, admissionNo: true, updatedAt: true, syncStatus: true, syncedAt: true, version: true },
    });

    // --- Batch parent invite processing ---
    const parentEntries = toCreate.filter((s) => s.parentEmail || s.parentPhone);

    if (parentEntries.length > 0) {
      // Deduplicate by email (prefer email over phone)
      const uniqueParents = new Map<string, (typeof parentEntries)[0]>();
      for (const p of parentEntries) {
        const key = p.parentEmail || p.parentPhone;
        if (!uniqueParents.has(key)) uniqueParents.set(key, p);
      }

      const uniqueParentList = [...uniqueParents.values()];
      const emails = uniqueParentList.map((p) => p.parentEmail).filter(Boolean) as string[];

      // Skip parents who already have a user account
      const existingUsers = emails.length > 0
        ? await prisma.user.findMany({
            where: { email: { in: emails } },
            select: { email: true },
          })
        : [];
      const existingEmailSet = new Set(existingUsers.map((u) => u.email));

      const emailParents = uniqueParentList.filter(
        (p) => p.parentEmail && !existingEmailSet.has(p.parentEmail),
      );

      if (emailParents.length > 0) {
        const now = Date.now();

        // Create invite tokens in bulk (1 query) — no user created upfront
        const inviteData = emailParents.map((p) => ({
          schoolId,
          invitedBy: req.user!.userId,
          token: generateSecureToken(),
          invitedEmail: p.parentEmail!,
          invitedName: p.parentName || p.name,
          role: "PARENT" as const,
          expiresAt: new Date(now + 48 * 60 * 60 * 1000),
        }));

        await prisma.inviteToken.createMany({ data: inviteData });

        // Fire all emails concurrently (fire-and-forget)
        if (process.env.DISABLE_EMAILS !== "true") {
          Promise.allSettled(
            inviteData.map((inv) => {
              const parent = emailParents.find((p) => p.parentEmail === inv.invitedEmail);
              return trySendParentEmail(
                inv.invitedEmail,
                school.name || "School",
                inv.invitedName,
                parent?.name || "Student",
                inv.token,
              ).then((result) => {
                if (!result.ok) {
                  prisma.inviteToken
                    .update({
                      where: { token: inv.token },
                      data: { emailFailed: true, emailError: result.error },
                    })
                    .catch(() => {});
                }
              });
            }),
          );
        }
      }

      // TODO: SMS for phone-only parents — batch SMS integration pending
    }

    res.status(201).json({
      message: `Created ${created.length} student(s)`,
      created,
      errors: errors.length > 0 ? errors : undefined,
      summary: { total: students.length, successful: created.length, failed: errors.length },
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Bulk Create Students");
    res.status(errorResponse.status).json(errorResponse);
  }
};
