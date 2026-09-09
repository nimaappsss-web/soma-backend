import { prisma } from "../utils/prisma";
import { notifyMany } from "../utils/notifications";
import { notifyPlatformAdmins } from "../utils/platformNotify";
import {
  sendSchoolApprovalEmail,
  sendSchoolRejectionEmail,
} from "../utils/email";

export type SchoolApprovalResult =
  | {
      ok: true;
      school: {
        id: string;
        name: string;
        approvalStatus: "APPROVED" | "REJECTED";
        rejectionReason?: string | null;
      };
    }
  | { ok: false; status: number; error: string };

const getSchoolWithAdmins = async (id: string) =>
  prisma.school.findUnique({
    where: { id },
    include: {
      principal: { select: { id: true, email: true, name: true } },
      users: {
        where: { role: { in: ["PRINCIPAL", "SCHOOL_ADMIN"] } },
        select: { id: true },
      },
    },
  });

export const approveSchoolById = async (
  id: string,
  frontendUrl?: string,
): Promise<SchoolApprovalResult> => {
  const school = await getSchoolWithAdmins(id);

  if (!school) {
    return { ok: false, status: 404, error: "School not found" };
  }
  if (school.approvalStatus === "APPROVED") {
    return { ok: false, status: 400, error: "School is already approved" };
  }

  await prisma.$transaction([
    prisma.school.update({
      where: { id },
      data: { approvalStatus: "APPROVED", rejectionReason: null },
    }),
    prisma.user.updateMany({
      where: { schoolId: id, role: { in: ["PRINCIPAL", "SCHOOL_ADMIN"] } },
      data: { approvalStatus: "APPROVED", active: true },
    }),
  ]);

  const adminIds = school.users.map((u) => u.id);
  void notifyMany(id, adminIds, {
    title: "School approved",
    message: `${school.name} has been approved. You can now manage your school on Nima.`,
    type: "APPROVAL",
    route: "/dashboard",
  });

  if (school.principal?.email) {
    void sendSchoolApprovalEmail(
      school.principal.email,
      school.name,
      frontendUrl,
    ).catch(() => {});
  }

  void notifyPlatformAdmins({
    title: "School approved",
    message: `${school.name} was approved.`,
    type: "APPROVAL",
    data: { schoolId: id, schoolName: school.name },
    telegramText: `✅ Approved: ${school.name}`,
  });

  return {
    ok: true,
    school: { id, name: school.name, approvalStatus: "APPROVED" },
  };
};

export const rejectSchoolById = async (
  id: string,
  reason: string,
): Promise<SchoolApprovalResult> => {
  if (!reason || !reason.trim()) {
    return {
      ok: false,
      status: 400,
      error: "A rejection reason is required",
    };
  }

  const school = await getSchoolWithAdmins(id);

  if (!school) {
    return { ok: false, status: 404, error: "School not found" };
  }
  if (school.approvalStatus === "REJECTED") {
    return { ok: false, status: 400, error: "School is already rejected" };
  }

  const trimmedReason = reason.trim().slice(0, 500);

  await prisma.$transaction([
    prisma.school.update({
      where: { id },
      data: { approvalStatus: "REJECTED", rejectionReason: trimmedReason },
    }),
    prisma.user.updateMany({
      where: { schoolId: id, role: { in: ["PRINCIPAL", "SCHOOL_ADMIN"] } },
      data: { approvalStatus: "REJECTED" },
    }),
  ]);

  const adminIds = school.users.map((u) => u.id);
  void notifyMany(id, adminIds, {
    title: "School not approved",
    message: `Your school was not approved. Reason: ${trimmedReason}`,
    type: "APPROVAL",
    route: "/login",
  });

  if (school.principal?.email) {
    void sendSchoolRejectionEmail(
      school.principal.email,
      school.name,
      trimmedReason,
    ).catch(() => {});
  }

  void notifyPlatformAdmins({
    title: "School rejected",
    message: `${school.name} was rejected — ${trimmedReason}`,
    type: "APPROVAL",
    data: { schoolId: id, schoolName: school.name },
    telegramText: `❌ Rejected: ${school.name} — ${trimmedReason}`,
  });

  return {
    ok: true,
    school: {
      id,
      name: school.name,
      approvalStatus: "REJECTED",
      rejectionReason: trimmedReason,
    },
  };
};