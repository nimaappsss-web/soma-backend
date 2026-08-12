-- One shared rigid configuration per school-type batch (primary, kg, creche, secondary, custom).
CREATE TABLE "TimetableConfig" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "configType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "schedule" JSONB NOT NULL,
    "subjectIds" JSONB NOT NULL,
    "targets" JSONB NOT NULL,
    "doublePeriods" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TimetableConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TimetableConfig_schoolId_configType_key" ON "TimetableConfig"("schoolId", "configType");
CREATE INDEX "TimetableConfig_schoolId_idx" ON "TimetableConfig"("schoolId");

ALTER TABLE "TimetableConfig" ADD CONSTRAINT "TimetableConfig_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
