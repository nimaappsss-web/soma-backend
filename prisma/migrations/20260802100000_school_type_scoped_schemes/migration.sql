-- School-type scoped score configurations.
--
-- 1) ScoreComponent gains a schemeId pointing at a new ScoreScheme (the
--    "configuration"). A configuration is scoped to an array of school types
--    for a term, replacing the previous school-wide single scheme.
-- 2) Class gains a schoolType column (which categorisation an arm belongs to),
--    backfilled from the level prefix.

-- -------------------------------
-- Class.schoolType
-- -------------------------------
ALTER TABLE "Class" ADD COLUMN "schoolType" TEXT;

UPDATE "Class"
SET "schoolType" = CASE
  WHEN "level" LIKE 'JSS%' OR "level" LIKE 'SS%' THEN 'secondary'
  WHEN "level" LIKE 'KG%' THEN 'kg'
  WHEN "level" LIKE 'Pry%' THEN 'primary'
  ELSE 'creche'
END
WHERE "schoolType" IS NULL;

ALTER TABLE "Class" ALTER COLUMN "schoolType" SET NOT NULL;

-- -------------------------------
-- ScoreScheme (the configuration)
-- -------------------------------
CREATE TABLE "ScoreScheme" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "session" TEXT NOT NULL,
    "schoolTypes" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoreScheme_pkey" PRIMARY KEY ("id")
);

-- Backfill: one configuration per existing (schoolId, term, session) group,
-- covering all of the school's current types so existing classes resolve to it.
-- This preserves the previous school-wide single-scheme behaviour.
INSERT INTO "ScoreScheme" ("id", "schoolId", "term", "session", "schoolTypes", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  g."schoolId",
  g."term",
  g."session",
  COALESCE(s."schoolType", '["primary"]'),
  NOW(),
  NOW()
FROM (
  SELECT DISTINCT "schoolId", "term", "session"
  FROM "ScoreComponent"
) g
LEFT JOIN "School" s ON s."id" = g."schoolId";

-- -------------------------------
-- ScoreComponent.schemeId
-- -------------------------------
ALTER TABLE "ScoreComponent" ADD COLUMN "schemeId" TEXT;

UPDATE "ScoreComponent" c
SET "schemeId" = (
  SELECT s."id"
  FROM "ScoreScheme" s
  WHERE s."schoolId" = c."schoolId"
    AND s."term" = c."term"
    AND s."session" = c."session"
  LIMIT 1
)
WHERE c."schemeId" IS NULL;

ALTER TABLE "ScoreComponent" ALTER COLUMN "schemeId" SET NOT NULL;

-- -------------------------------
-- Constraints & indexes
-- -------------------------------
DROP INDEX "ScoreComponent_schoolId_term_session_name_key";

CREATE INDEX "ScoreScheme_schoolId_idx" ON "ScoreScheme"("schoolId");
CREATE INDEX "ScoreScheme_schoolId_term_session_idx" ON "ScoreScheme"("schoolId", "term", "session");
CREATE INDEX "ScoreComponent_schemeId_idx" ON "ScoreComponent"("schemeId");

CREATE UNIQUE INDEX "ScoreScheme_schoolId_term_session_schoolTypes_key"
ON "ScoreScheme"("schoolId", "term", "session", "schoolTypes");

CREATE UNIQUE INDEX "ScoreComponent_schemeId_name_key"
ON "ScoreComponent"("schemeId", "name");

ALTER TABLE "ScoreScheme" ADD CONSTRAINT "ScoreScheme_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ScoreComponent" ADD CONSTRAINT "ScoreComponent_schemeId_fkey"
FOREIGN KEY ("schemeId") REFERENCES "ScoreScheme"("id") ON DELETE CASCADE ON UPDATE CASCADE;
