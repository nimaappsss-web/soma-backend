-- Merge duplicate exam sessions. ExamSession rows were previously created with
-- findFirst + create and no unique constraint, so concurrent requests could
-- produce multiple rows for the same assessment (same school, subject, class,
-- component, term, session). Keep the oldest row per group, absorb any scores
-- from the duplicates, then delete the extras. Finally add a unique index so
-- duplicates cannot recur.

-- 1) Move scores from duplicate sessions onto the kept (oldest) session.
--    A duplicate's score is skipped if the kept session already has a score for
--    that student (avoids a unique-key violation on [examId, studentId]).
UPDATE "ExamScore" es
SET "examId" = keep."keep_id"
FROM (
  SELECT
    dup."id" AS dup_id,
    oldest."id" AS keep_id
  FROM "ExamSession" dup
  JOIN LATERAL (
    SELECT "id"
    FROM "ExamSession"
    WHERE "schoolId" = dup."schoolId"
      AND "subjectId" = dup."subjectId"
      AND "classId" = dup."classId"
      AND "componentId" = dup."componentId"
      AND "term" = dup."term"
      AND "session" = dup."session"
      AND "classId" IS NOT NULL
    ORDER BY "createdAt" ASC, "id" ASC
    LIMIT 1
  ) oldest ON TRUE
  WHERE dup."classId" IS NOT NULL
    AND dup."id" <> oldest."id"
) keep
WHERE es."examId" = keep."dup_id"
  AND NOT EXISTS (
    SELECT 1 FROM "ExamScore" target
    WHERE target."examId" = keep."keep_id"
      AND target."studentId" = es."studentId"
  );

-- 2) Delete the duplicate sessions (any remaining scores cascade).
DELETE FROM "ExamSession" dup
USING (
  SELECT
    d."id" AS dup_id,
    o."id" AS keep_id
  FROM "ExamSession" d
  JOIN LATERAL (
    SELECT "id"
    FROM "ExamSession"
    WHERE "schoolId" = d."schoolId"
      AND "subjectId" = d."subjectId"
      AND "classId" = d."classId"
      AND "componentId" = d."componentId"
      AND "term" = d."term"
      AND "session" = d."session"
      AND "classId" IS NOT NULL
    ORDER BY "createdAt" ASC, "id" ASC
    LIMIT 1
  ) o ON TRUE
  WHERE d."classId" IS NOT NULL
    AND d."id" <> o."id"
) keep
WHERE dup."id" = keep."dup_id";

-- 3) Unique index: one assessment per subject + class + mark type + term.
CREATE UNIQUE INDEX "ExamSession_schoolId_subjectId_classId_componentId_term_session_key"
ON "ExamSession"("schoolId", "subjectId", "classId", "componentId", "term", "session");
