import { Response } from "express";
import { AuthRequest } from "../../types";
import { callGemini } from "../../utils/gemini";
import { getTopicForWeek, getTopicsForSubject, getSubjectsForLevel } from "../../utils/curriculum";

const RESPONSE_SCHEMA = `{
  "topicSummary": "2-3 sentence overview of the topic",
  "backgroundInfo": "Context and background knowledge for this topic",
  "behaviouralObjectives": ["By the end of the lesson, pupils should be able to: ...", "..."],
  "instructionalMaterials": ["textbook", "chalkboard", "..."],
  "previousKnowledge": "What students already know that connects to this topic",
  "introduction": "Set induction activity to capture attention (2-3 sentences)",
  "presentationSteps": [
    { "step": 1, "time": "5 mins", "teacherActivity": "...", "studentActivity": "..." },
    { "step": 2, "time": "10 mins", "teacherActivity": "...", "studentActivity": "..." }
  ],
  "evaluation": "Questions to assess understanding",
  "conclusion": "Summary of the lesson",
  "assignment": "Homework or take-home task",
  "remarks": "Teacher notes on areas to focus on"
}`;

const SYSTEM_INSTRUCTION = `You are a Nigerian curriculum expert and experienced teacher. Generate a lesson note as valid JSON (no markdown, no code fences) matching this schema exactly:

${RESPONSE_SCHEMA}

Each field is a section. Fill every section with age-appropriate, curriculum-aligned content for the given class and subject. Keep content concise but complete.`;

export const generateLessonNote = async (req: AuthRequest, res: Response) => {
  try {
    const { subjectName, className, week = 1, term = 1 } = req.body;

    if (!subjectName || !className) {
      return res.status(400).json({ error: "subjectName and className are required" });
    }

    const topicEntry = getTopicForWeek(className, subjectName, term, week);
    if (!topicEntry) {
      return res.status(400).json({
        error: `No curriculum topic found for ${subjectName} in ${className}, Term ${term}, Week ${week}`,
      });
    }

    const allTopics = getTopicsForSubject(className, subjectName);
    const priorTopics = allTopics
      .filter(t => t.term < term || (t.term === term && t.week < week))
      .slice(-3)
      .map(t => t.topic)
      .join(", ");

    const prompt = `Generate each section of this lesson note:

Section — topicSummary
Topic: ${topicEntry.topic}
Subject: ${subjectName}
Class: ${className}
Term: ${term} Term, Week ${week}
Duration: 40 minutes

Section — backgroundInfo
Recent prior topics: ${priorTopics || "None"}

Section — behaviouralObjectives
Write 3-4 specific, measurable objectives appropriate for ${className} students.

Section — instructionalMaterials
List concrete materials available in a typical Nigerian ${className.startsWith("Pry") ? "primary" : className.startsWith("JSS") ? "junior secondary" : className.startsWith("SS") ? "senior secondary" : ""} school classroom.

Section — previousKnowledge
What ${className} students already know from earlier topics that connects to this new topic.

Section — introduction
A 2-3 sentence activity to capture ${className} students' attention and connect to daily life.

Section — presentationSteps
Break the lesson into 3-4 sequential steps. Each step has a time allocation, what the teacher does, and what students do. Match the pace to ${className} level.

Section — evaluation
2-3 questions to check understanding, appropriate for ${className}.

Section — conclusion
Summarise the key takeaway in 2-3 sentences.

Section — assignment
One take-home task that reinforces the topic without requiring internet or special materials.

Section — remarks
Note what the teacher should watch out for (common misconceptions, mixed-ability pacing, etc.).`;

    const result = await callGemini(prompt, SYSTEM_INSTRUCTION);

    let lessonNote;
    try {
      lessonNote = JSON.parse(result.replace(/```json/g, "").replace(/```/g, "").trim());
    } catch {
      return res.status(500).json({ error: "Failed to parse AI response", raw: result.substring(0, 500) });
    }

    res.json({
      subject: subjectName,
      className,
      term: `${term} Term`,
      week,
      topic: topicEntry.topic,
      duration: "40 minutes",
      ...lessonNote,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to generate lesson note" });
  }
};

export const getCurriculum = async (req: AuthRequest, res: Response) => {
  try {
    const { className, subjectName } = req.query;

    if (!className || typeof className !== "string") {
      return res.status(400).json({ error: "className query parameter is required" });
    }

    const subjects = getSubjectsForLevel(className);

    if (subjectName && typeof subjectName === "string") {
      const topics = getTopicsForSubject(className, subjectName);
      return res.json({ className, subjects, subjectName, topics });
    }

    res.json({ className, subjects });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to get curriculum" });
  }
};
