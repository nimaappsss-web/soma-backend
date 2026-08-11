-- Timetable header: one per class, holds title + breaks metadata
CREATE TABLE "Timetable" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "breaks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Timetable_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Timetable_schoolId_classId_key" ON "Timetable"("schoolId", "classId");
CREATE INDEX "Timetable_schoolId_idx" ON "Timetable"("schoolId");

ALTER TABLE "Timetable" ADD CONSTRAINT "Timetable_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Timetable" ADD CONSTRAINT "Timetable_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- TimetableEntry gains a nullable link to its header (keeps existing rows valid)
ALTER TABLE "TimetableEntry" ADD COLUMN "timetableId" TEXT;
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_timetableId_fkey" FOREIGN KEY ("timetableId") REFERENCES "Timetable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "TimetableEntry_timetableId_idx" ON "TimetableEntry"("timetableId");