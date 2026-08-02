import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { resolveSession } from "../../utils/academicTerm";
import { classifySchoolDay } from "../../utils/attendanceAvailability";
import { parseSchoolTypes } from "../../utils/scoreScheme";

export const createExam = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { name, type, subjectId, classId, componentId, term, session, maxScore, date } = req.body;

    if (!name || !type || !subjectId || !term || !date) {
      return res.status(400).json({ error: "name, type, subjectId, term, and date are required" });
    }

    const schoolId = req.user.schoolId;
    const resolvedSession = await resolveSession(schoolId, term, session);

    const subject = await prisma.subject.findFirst({ where: { id: subjectId, schoolId } });
    if (!subject) {
      return res.status(400).json({ error: "Subject not found for this school" });
    }

    let classRecord: { id: string; name: string; schoolType: string } | null = null;

    if (classId) {
      classRecord = await prisma.class.findFirst({ where: { id: classId, schoolId } });
      if (!classRecord) {
        return res.status(400).json({ error: "Class not found for this school" });
      }
    }

    let resolvedMaxScore = maxScore || 100;
    let resolvedComponentId = componentId || null;

    if (componentId) {
      const component = await prisma.scoreComponent.findFirst({
        where: { id: componentId, schoolId, term, session: resolvedSession },
      });
      if (!component) {
        return res.status(400).json({ error: "Score component not found for this school and term" });
      }

      if (classRecord) {
        const scheme = await prisma.scoreScheme.findFirst({
          where: { id: component.schemeId },
          select: { schoolTypes: true },
        });
        const covered = scheme ? parseSchoolTypes(scheme.schoolTypes) : [];
        if (!covered.includes(classRecord.schoolType)) {
          return res.status(400).json({
            error: `This configuration does not apply to ${classRecord.name} (${classRecord.schoolType})`,
          });
        }
      }

      resolvedComponentId = component.id;
      if (!maxScore) {
        resolvedMaxScore = component.maxScore;
      }
    }

    const examDate = new Date(date);
    if (isNaN(examDate.getTime())) {
      return res.status(400).json({ error: "Invalid date" });
    }
    examDate.setUTCHours(0, 0, 0, 0);

    const classification = await classifySchoolDay(schoolId, examDate, { allowFuture: true });
    if (!classification.available) {
      return res.status(400).json({
        error: "Exams cannot be scheduled on this date",
        reason: {
          type: classification.type,
          message: classification.message,
        },
      });
    }

    try {
      const exam = await prisma.examSession.create({
        data: {
          id: req.body.id || undefined,
          schoolId,
          name,
          type,
          subjectId,
          classId: classId || null,
          componentId: resolvedComponentId,
          term,
          session: resolvedSession,
          maxScore: resolvedMaxScore,
          date: examDate,
        },
        include: {
          subject: { select: { id: true, name: true } },
          class: { select: { id: true, name: true } },
          component: { select: { id: true, name: true, maxScore: true } },
        },
      });

      return res.status(201).json({
        exam: {
          ...exam,
          subjectName: exam.subject.name,
          className: exam.class?.name || null,
          componentName: exam.component?.name || null,
        },
      });
    } catch (error: any) {
      if (error?.code === "P2002") {
        const existing = await prisma.examSession.findFirst({
          where: {
            schoolId,
            subjectId,
            classId: classId || null,
            componentId: resolvedComponentId,
            term,
            session: resolvedSession,
          },
          include: {
            subject: { select: { id: true, name: true } },
            class: { select: { id: true, name: true } },
            component: { select: { id: true, name: true, maxScore: true } },
          },
        });
        if (existing) {
          return res.json({
            exam: {
              ...existing,
              subjectName: existing.subject.name,
              className: existing.class?.name || null,
              componentName: existing.component?.name || null,
            },
          });
        }
      }
      throw error;
    }
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Create Exam");
    res.status(errorResponse.status).json(errorResponse);
  }
};
