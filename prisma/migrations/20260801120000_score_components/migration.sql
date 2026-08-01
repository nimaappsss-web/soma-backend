-- AlterTable
ALTER TABLE "ExamSession" ADD COLUMN     "classId" TEXT,
ADD COLUMN     "componentId" TEXT;

-- CreateTable
CREATE TABLE "ScoreComponent" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "session" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'OTHER',
    "maxScore" INTEGER NOT NULL DEFAULT 100,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoreComponent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScoreComponent_schoolId_term_session_idx" ON "ScoreComponent"("schoolId", "term", "session");

-- CreateIndex
CREATE UNIQUE INDEX "ScoreComponent_schoolId_term_session_name_key" ON "ScoreComponent"("schoolId", "term", "session", "name");

-- CreateIndex
CREATE INDEX "ExamSession_classId_idx" ON "ExamSession"("classId");

-- CreateIndex
CREATE INDEX "ExamSession_componentId_idx" ON "ExamSession"("componentId");

-- AddForeignKey
ALTER TABLE "ExamSession" ADD CONSTRAINT "ExamSession_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSession" ADD CONSTRAINT "ExamSession_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "ScoreComponent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreComponent" ADD CONSTRAINT "ScoreComponent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
