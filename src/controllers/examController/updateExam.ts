import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";
import { classifySchoolDay } from "../../utils/attendanceAvailability";

export const updateExam = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { name, type, subjectId, classId, componentId, maxScore, date, status } = req.body;
    const schoolId = req.user.schoolId;

    const exam = await prisma.examSession.findFirst({
      where: { id: req.params.id, schoolId },
    });

    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    if (subjectId !== undefined) {
      const subject = await prisma.subject.findFirst({ where: { id: subjectId, schoolId } });
      if (!subject) {
        return res.status(400).json({ error: "Subject not found for this school" });
      }
    }

    if (classId !== undefined) {
      if (classId) {
        const classRecord = await prisma.class.findFirst({ where: { id: classId, schoolId } });
        if (!classRecord) {
          return res.status(400).json({ error: "Class not found for this school" });
        }
      }
    }

    let resolvedComponentId: string | null | undefined;
    let resolvedMaxScore: number | undefined;

    if (componentId !== undefined) {
      if (componentId) {
        const component = await prisma.scoreComponent.findFirst({
          where: { id: componentId, schoolId, term: exam.term, session: exam.session },
        });
        if (!component) {
          return res.status(400).json({ error: "Score component not found for this school and term" });
        }
        resolvedComponentId = component.id;
        if (maxScore === undefined) {
          resolvedMaxScore = component.maxScore;
        }
      } else {
        resolvedComponentId = null;
      }
    }

    if (maxScore !== undefined) {
      const parsedMax = Number(maxScore);
      if (!Number.isFinite(parsedMax) || parsedMax <= 0) {
        return res.status(400).json({ error: "maxScore must be a positive number" });
      }
      resolvedMaxScore = parsedMax;
    }

    let resolvedDate: Date | undefined;

    if (date !== undefined) {
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

      resolvedDate = examDate;
    }

    const updated = await prisma.examSession.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(type !== undefined ? { type } : {}),
        ...(subjectId !== undefined ? { subjectId } : {}),
        ...(classId !== undefined ? { classId: classId || null } : {}),
        ...(resolvedComponentId !== undefined ? { componentId: resolvedComponentId } : {}),
        ...(resolvedMaxScore !== undefined ? { maxScore: resolvedMaxScore } : {}),
        ...(resolvedDate !== undefined ? { date: resolvedDate } : {}),
        ...(status !== undefined ? { status } : {}),
      },
      include: {
        subject: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
        component: { select: { id: true, name: true, maxScore: true } },
      },
    });

    res.json({
      exam: {
        ...updated,
        subjectName: updated.subject.name,
        className: updated.class?.name || null,
        componentName: updated.component?.name || null,
      },
    });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Update Exam");
    res.status(errorResponse.status).json(errorResponse);
  }
};
