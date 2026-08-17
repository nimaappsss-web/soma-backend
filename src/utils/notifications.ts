import { prisma } from "./prisma";
import { broadcastToUser } from "./sse";
import { Prisma } from "../generated/prisma/client";

export type NotificationType =
  | "ANNOUNCEMENT"
  | "CALENDAR_EVENT"
  | "HOLIDAY"
  | "ATTENDANCE"
  | "INVITE"
  | "EXAM"
  | "FEE";

export interface NotifyPayload {
  title: string;
  message: string;
  type: NotificationType;
  route?: string | null;
  data?: Record<string, unknown> | null;
}

export const notifyUser = async (
  schoolId: string,
  userId: string,
  payload: NotifyPayload,
) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        schoolId,
        userId,
        title: payload.title,
        message: payload.message,
        type: payload.type,
        route: payload.route ?? null,
        data: payload.data as Prisma.InputJsonValue | undefined,
      },
    });
    broadcastToUser(userId, "notification", notification);
    return notification;
  } catch (error) {
    console.error("[notifyUser] Failed to create notification:", error);
    return null;
  }
};

export const notifyMany = async (
  schoolId: string,
  userIds: string[],
  payload: NotifyPayload,
) => {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return null;

  try {
    const result = await prisma.notification.createMany({
      data: unique.map((userId) => ({
        schoolId,
        userId,
        title: payload.title,
        message: payload.message,
        type: payload.type,
        route: payload.route ?? null,
        data: payload.data as Prisma.InputJsonValue | undefined,
      })),
    });

    for (const userId of unique) {
      broadcastToUser(userId, "notification", payload);
    }

    return result;
  } catch (error) {
    console.error("[notifyMany] Failed to create notifications:", error);
    return null;
  }
};

// Resolve active PARENT users linked to a list of students by matching
// Student.parentEmail / Student.parentPhone against User.email / User.phone.
export const parentUserIdsForStudents = async (
  schoolId: string,
  studentIds: string[],
): Promise<string[]> => {
  if (studentIds.length === 0) return [];

  const students = await prisma.student.findMany({
    where: { id: { in: studentIds }, schoolId },
    select: { parentEmail: true, parentPhone: true },
  });

  const emails = students.map((s) => s.parentEmail).filter(Boolean) as string[];
  const phones = students.map((s) => s.parentPhone).filter(Boolean) as string[];

  if (emails.length === 0 && phones.length === 0) return [];

  const parents = await prisma.user.findMany({
    where: {
      schoolId,
      role: "PARENT",
      active: true,
      OR: [
        ...(emails.length > 0 ? [{ email: { in: emails } }] : []),
        ...(phones.length > 0 ? [{ phone: { in: phones } }] : []),
      ],
    },
    select: { id: true },
  });

  return parents.map((p) => p.id);
};