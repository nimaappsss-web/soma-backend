import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { getSubjectsForSchool } from "../../data/subjects";
import { generatePrefix, generateSchoolCode } from "../../utils/admission";
import { SCHOOL_CLASS_MAP } from "../../utils/classSeed";
import { sendPasswordResetEmail } from "../../utils/email";
import { getFrontendUrl } from "../../utils/frontendUrl";
import { validateEmail } from "../../utils/validation";
import crypto from "crypto";

export const createSchool = async (req: AuthRequest, res: Response) => {
  try {
    const {
      schoolName,
      state,
      lga,
      schoolType,
      address,
      logoUrl,
      arms,
      schoolCode,
      principalName,
      principalEmail,
      principalPhone,
    } = req.body;

    if (!schoolName || !state || !lga) {
      return res.status(400).json({ error: "School name, state and LGA are required" });
    }
    if (!principalName || !principalEmail) {
      return res.status(400).json({ error: "Principal name and email are required" });
    }
    if (!validateEmail(principalEmail)) {
      return res.status(400).json({ error: "Invalid principal email format" });
    }

    const existingUser = await prisma.user.findFirst({
      where: { email: principalEmail },
    });
    if (existingUser) {
      return res.status(400).json({ error: "A user with this email already exists in the system" });
    }

    const existingSchool = await prisma.school.findFirst({
      where: { name: schoolName },
    });
    if (existingSchool) {
      return res.status(400).json({ error: "A school with this name already exists" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const prefix = generatePrefix(schoolName);

      const principal = await tx.user.create({
        data: {
          name: principalName,
          email: principalEmail,
          phone: principalPhone || null,
          role: "PRINCIPAL",
          emailVerified: true,
          active: true,
          approvalStatus: "APPROVED",
        },
      });

      const school = await tx.school.create({
        data: {
          name: schoolName,
          schoolCode: schoolCode?.toUpperCase() || generateSchoolCode(schoolName),
          address: address || "",
          state,
          lga,
          schoolType: JSON.stringify(schoolType || ["primary"]),
          admissionPattern: `${prefix}/{year}/{seq}`,
          arms: arms && arms.length > 0 ? JSON.stringify(arms) : "[]",
          logo: logoUrl || null,
          principalId: principal.id,
        },
      });

      await tx.user.update({
        where: { id: principal.id },
        data: { schoolId: school.id },
      });

      const schoolTypes: string[] = schoolType || ["primary"];
      const armList: string[] = Array.isArray(arms) && arms.length > 0 ? arms : [""];
      const classesToCreate: { name: string; level: string; arm: string; schoolType: string }[] = [];
      for (const type of schoolTypes) {
        const entries = SCHOOL_CLASS_MAP[type];
        if (entries) {
          for (const entry of entries) {
            for (const arm of armList) {
              const armSuffix = arm ? ` ${arm}` : "";
              classesToCreate.push({ name: `${entry.name}${armSuffix}`, level: entry.level, arm, schoolType: type });
            }
          }
        }
      }
      if (classesToCreate.length > 0) {
        await tx.class.createMany({ data: classesToCreate.map((c) => ({ ...c, schoolId: school.id })), skipDuplicates: true });
      }

      const subjects = getSubjectsForSchool(schoolTypes);
      if (subjects.length > 0) {
        await tx.subject.createMany({
          data: subjects.map((s) => ({ schoolId: school.id, name: s.name, code: s.code })),
          skipDuplicates: true,
        });
      }

      return { school, principal };
    });

    let emailSent = false;
    let emailFailed: string | undefined;
    try {
      const token = crypto.randomBytes(32).toString("hex");
      await prisma.passwordResetToken.create({
        data: {
          userId: result.principal.id,
          token,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
      await sendPasswordResetEmail(
        principalEmail,
        principalName,
        token,
        getFrontendUrl(req),
      );
      emailSent = true;
    } catch (err: any) {
      emailFailed = err?.message || "Failed to send set-password email";
      console.error("[SuperAdmin Create School] Email failed:", emailFailed);
    }

    res.status(201).json({
      message: "School created successfully",
      school: {
        id: result.school.id,
        name: result.school.name,
        schoolCode: result.school.schoolCode,
        address: result.school.address,
        state: result.school.state,
        lga: result.school.lga,
        schoolType: JSON.parse(result.school.schoolType),
        arms: JSON.parse(result.school.arms),
        active: result.school.active,
      },
      principal: {
        id: result.principal.id,
        name: result.principal.name,
        email: result.principal.email,
        phone: result.principal.phone,
        role: result.principal.role,
      },
      setPasswordEmailSent: emailSent,
      setPasswordEmailError: emailFailed,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "SuperAdmin Create School");
    res.status(errorResponse.status).json(errorResponse);
  }
};