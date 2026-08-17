import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { notifyMany } from "../../utils/notifications";

export const createAnnouncement = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { title, message, audience, priority } = req.body;

    if (!title || !message || !audience) {
      return res.status(400).json({ error: "title, message, and audience are required" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, name: true },
    });

    const announcement = await prisma.announcement.create({
      data: {
        id: req.body.id || undefined,
        schoolId: req.user.schoolId,
        title,
        message,
        audience,
        priority: priority || "NORMAL",
        createdBy: req.user.userId,
      },
    });

    res.status(201).json({
      announcement: {
        id: announcement.id,
        title: announcement.title,
        message: announcement.message,
        audience: announcement.audience,
        priority: announcement.priority,
        createdBy: user ? { id: user.id, name: user.name } : { id: req.user.userId, name: "Unknown" },
        createdAt: announcement.createdAt,
        updatedAt: announcement.updatedAt,
      },
    });

    notifyAnnouncementAudience(req.user.schoolId, req.user.userId, {
      id: announcement.id,
      title: announcement.title,
      audience: announcement.audience,
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Create Announcement");
    res.status(errorResponse.status).json(errorResponse);
  }
};

// Fan out a notification to the announcement's audience. Recipients mirror the
// read-side scoping in listAnnouncements (roles not named in the mapping get
// nothing from the audience filter).
const notifyAnnouncementAudience = async (
  schoolId: string,
  creatorId: string,
  announcement: { id: string; title: string; audience: string },
) => {
  try {
    const adminRoles = ["PRINCIPAL", "SCHOOL_ADMIN"];
    const staffRoles = ["TEACHER", "BURSAR", "STAFF", "SCHOOL_ADMIN"];

    let where: any = null;

    if (announcement.audience === "ALL_USERS") {
      where = { schoolId, active: true };
    } else if (announcement.audience === "ALL_PARENTS") {
      where = { schoolId, role: "PARENT", active: true };
    } else if (announcement.audience === "ALL_STAFF") {
      where = { schoolId, role: { in: staffRoles }, active: true };
    } else if (announcement.audience === "TEACHING_ONLY") {
      where = { schoolId, role: "TEACHER", active: true };
    } else if (announcement.audience === "NON_TEACHING_ONLY") {
      where = { schoolId, role: { in: ["STAFF", "BURSAR", "SCHOOL_ADMIN"] }, active: true };
    }

    if (!where) return;

    const recipients = await prisma.user.findMany({
      where,
      select: { id: true, role: true },
    });

    const grouped: Record<string, string[]> = {};
    for (const r of recipients) {
      if (r.id === creatorId) continue;
      const key = adminRoles.includes(r.role) ? "admin" : r.role === "PARENT" ? "parent" : "staff";
      (grouped[key] ||= []).push(r.id);
    }

    const routeFor: Record<string, string> = {
      admin: "/admin/announcements",
      staff: "/teach/announcements",
      parent: "/parent/announcements",
    };

    const title = `New announcement: ${announcement.title}`;
    for (const key of Object.keys(grouped)) {
      await notifyMany(schoolId, grouped[key], {
        title,
        message: "A new announcement has been posted.",
        type: "ANNOUNCEMENT",
        route: routeFor[key],
        data: { announcementId: announcement.id },
      });
    }
  } catch (error) {
    console.error("[createAnnouncement] Notification fan-out failed:", error);
  }
};
