-- Deduplicate terms so each (schoolId, term) maps to a single row, keeping the
-- most recently created record per school + term.
DELETE FROM "AcademicTerm"
WHERE "id" NOT IN (
  SELECT DISTINCT ON ("schoolId", "term") "id"
  FROM "AcademicTerm"
  ORDER BY "schoolId", "term", "createdAt" DESC, "id" DESC
);

-- Drop the old unique constraint that included session
DROP INDEX IF EXISTS "AcademicTerm_schoolId_term_session_key";

-- Drop the session column
ALTER TABLE "AcademicTerm" DROP COLUMN "session";

-- Recreate uniqueness on (schoolId, term)
CREATE UNIQUE INDEX "AcademicTerm_schoolId_term_key" ON "AcademicTerm"("schoolId", "term");
