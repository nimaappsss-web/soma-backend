import { Response } from "express";
import { AuthRequest } from "../../types";
import { prisma } from "../../utils/prisma";
import { createErrorResponse } from "../../utils/errorHandler";

export const createExam = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { name, type, subjectId, term, session, maxScore, date } = req.body;

    if (!name || !type || !subjectId || !term || !session || !date) {
      return res.status(400).json({ error: "name, type, subjectId, term, session, and date are required" });
    }

    const exam = await prisma.examSession.create({
      data: {
        id: req.body.id || undefined,
        schoolId: req.user.schoolId,
        name,
        type,
        subjectId,
        term,
        session,
        maxScore: maxScore || 100,
        date: new Date(date),
      },
      include: { subject: { select: { id: true, name: true } } },
    });

    res.status(201).json({ exam: { ...exam, subjectName: exam.subject.name } });
  } catch (error) {
    const errorResponse = createErrorResponse(error, "Create Exam");
    res.status(errorResponse.status).json(errorResponse);
  }
};
