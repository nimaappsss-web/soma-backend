import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import {
  resolveClassScope,
  assertFormTeacherOrAdmin,
  activeStudentsOfClass,
  notifyParentsOfResultRelease,
} from "../../utils/broadcastCenter";

/**
 * Class-teacher CA broadcast. No principal approval — the selected CA components
 * (Test 1, Test 2, Practical, ...) are published straight to parents by flipping
 * visibleToParents on the matching CA sessions for the class + term, and every
 * linked parent is notified. Records the configuration in CaBroadcast so a later
 * re-broadcast with the same/new components just updates the record and re-pings.
 */
export const broadcastCa = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { classId, term, session, componentIds } = req.body as {
      classId: string;
      term: string;
      session?: string;
      componentIds: string[];
    };

    if (!classId || !term || !Array.isArray(componentIds) || componentIds.length === 0) {
      return res.status(400).json({
        error: "classId, term, and a non-empty componentIds array are required",
      });
    }

    const schoolId = req.user.schoolId;
    const { classRecord, session: resolvedSession } = await resolveClassScope(
      schoolId,
      classId,
      term,
      session,
    );

    await assertFormTeacherOrAdmin(req.user, classId);

    // Validate the selected components belong to this school's scheme and are CA (non-EXAM).
    const components = await prisma.scoreComponent.findMany({
      where: {
        id: { in: componentIds },
        schoolId,
        term,
        session: resolvedSession,
        NOT: { type: "EXAM" },
      },
      select: { id: true, name: true, type: true },
    });

    if (components.length !== componentIds.length) {
      return res.status(400).json({
        error: "One or more selected components are not valid CA mark types for this term",
      });
    }

    // Publish the matching CA sessions for the class + term.
    const target = await prisma.examSession.updateMany({
      where: {
        schoolId,
        classId,
        term,
        session: resolvedSession,
        componentId: { in: componentIds },
        NOT: { type: "EXAM" },
      },
      data: { visibleToParents: true, lastScoreEditAt: null, lastScoreEditedBy: null },
    });

    if (target.count === 0) {
      return res.status(400).json({
        error: "No CA scores to broadcast for these mark types. Save scores first, then broadcast.",
      });
    }

    // How many students actually have a score in the broadcast sessions.
    const publishedSessions = await prisma.examSession.findMany({
      where: {
        schoolId,
        classId,
        term,
        session: resolvedSession,
        componentId: { in: componentIds },
        NOT: { type: "EXAM" },
      },
      select: { id: true },
    });

    const scoreRows = await prisma.examScore.findMany({
      where: { examId: { in: publishedSessions.map((s) => s.id) } },
      select: { studentId: true },
      distinct: ["studentId"],
    });

    const studentIds = scoreRows.map((s) => s.studentId);

    const caRecord = await prisma.caBroadcast.upsert({
      where: {
        schoolId_classId_term_session: { schoolId, classId, term, session: resolvedSession },
      },
      update: { componentIds: componentIds as never, broadcastAt: new Date() },
      create: {
        schoolId,
        classId,
        term,
        session: resolvedSession,
        componentIds: componentIds as never,
      },
    });

    const componentNames = components.map((c) => c.name).join(", ");

    if (studentIds.length > 0) {
      await notifyParentsOfResultRelease(schoolId, studentIds, {
        title: "CA results released",
        message: (name) => `CA results (${componentNames}) for ${name} are out on Soma.`,
        route: "/parent/exams",
        data: { classId, term, session: resolvedSession, componentIds },
      });
    }

    res.json({
      message: `CA broadcast sent to parents (${target.count} mark type${target.count === 1 ? "" : "s"}).`,
      componentIds,
      componentNames,
      sessionCount: target.count,
      studentCount: studentIds.length,
      broadcastAt: caRecord.broadcastAt.toISOString(),
    });
  } catch (error) {
    const status = (error as { statusCode?: number })?.statusCode ?? 500;
    const errorResponse = createErrorResponse(error, "Broadcast CA", status);
    res.status(errorResponse.status).json(errorResponse);
  }
};