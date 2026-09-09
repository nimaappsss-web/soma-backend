import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { computeSchoolSync } from "./schoolSync";

export const getSchoolDetail = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const school = await prisma.school.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        schoolCode: true,
        address: true,
        state: true,
        lga: true,
        schoolType: true,
        logo: true,
        arms: true,
        active: true,
        approvalStatus: true,
        rejectionReason: true,
        deactivationReason: true,
        deactivationNote: true,
        admissionPattern: true,
        paymentMode: true,
        manualBankDetails: true,
        principalId: true,
        createdAt: true,
        updatedAt: true,
        principal: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            image: true,
            active: true,
            approvalStatus: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            users: true,
            students: true,
            classes: true,
            subjects: true,
            staff: true,
            invoices: true,
            payments: true,
            feeStructures: true,
            academicTerms: true,
            announcements: true,
          },
        },
      },
    });

    if (!school) {
      return res.status(404).json({ error: "School not found" });
    }

    const [roleBreakdown, confirmedPayments, activeStudents, recentUsers] =
      await Promise.all([
        prisma.user.groupBy({
          by: ["role"],
          where: { schoolId: id },
          _count: { _all: true },
        }),
        prisma.payment.aggregate({
          where: { schoolId: id, status: "CONFIRMED" },
          _sum: { amount: true },
        }),
        prisma.student.count({ where: { schoolId: id, status: "active" } }),
        prisma.user.findMany({
          where: { schoolId: id },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            active: true,
            approvalStatus: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 25,
        }),
      ]);

    res.json({
      school: {
        id: school.id,
        name: school.name,
        schoolCode: school.schoolCode,
        address: school.address,
        state: school.state,
        lga: school.lga,
        schoolType: JSON.parse(school.schoolType),
        arms: JSON.parse(school.arms),
        logo: school.logo,
        active: school.active,
        approvalStatus: school.approvalStatus,
        rejectionReason: school.rejectionReason,
        deactivationReason: school.deactivationReason,
        deactivationNote: school.deactivationNote,
        admissionPattern: school.admissionPattern,
        paymentMode: school.paymentMode,
        manualBankDetails: school.manualBankDetails,
        principal: school.principal,
        createdAt: school.createdAt,
        updatedAt: school.updatedAt,
      },
      counts: {
        users: school._count.users,
        students: school._count.students,
        activeStudents,
        classes: school._count.classes,
        subjects: school._count.subjects,
        staff: school._count.staff,
        teachers: roleBreakdown.find((r) => r.role === "TEACHER")?._count._all ?? 0,
        parents: roleBreakdown.find((r) => r.role === "PARENT")?._count._all ?? 0,
        principals: (roleBreakdown.find((r) => r.role === "PRINCIPAL")?._count._all ?? 0) + (roleBreakdown.find((r) => r.role === "SCHOOL_ADMIN")?._count._all ?? 0),
        invoices: school._count.invoices,
        payments: school._count.payments,
        feeStructures: school._count.feeStructures,
        academicTerms: school._count.academicTerms,
        announcements: school._count.announcements,
        revenueCollected: confirmedPayments._sum.amount ?? 0,
      },
      roleBreakdown,
      recentUsers,
      sync: await computeSchoolSync([id]).then(
        (m) => m.get(id) ?? { lastSyncAt: null, syncStatus: "silent" },
      ),
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Get School Detail");
    res.status(errorResponse.status).json(errorResponse);
  }
};