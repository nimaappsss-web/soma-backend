-- CreateTable
CREATE TABLE "CaBroadcast" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "session" TEXT NOT NULL,
    "componentIds" JSONB NOT NULL,
    "broadcastAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaBroadcast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamSheetBroadcast" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "session" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "teacherId" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamSheetBroadcast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamResultDelivery" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "session" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamResultDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CaBroadcast_schoolId_classId_term_session_key" ON "CaBroadcast"("schoolId", "classId", "term", "session");

-- CreateIndex
CREATE INDEX "CaBroadcast_schoolId_term_session_idx" ON "CaBroadcast"("schoolId", "term", "session");

-- CreateIndex
CREATE UNIQUE INDEX "ExamSheetBroadcast_schoolId_classId_term_session_key" ON "ExamSheetBroadcast"("schoolId", "classId", "term", "session");

-- CreateIndex
CREATE INDEX "ExamSheetBroadcast_schoolId_status_idx" ON "ExamSheetBroadcast"("schoolId", "status");

-- CreateIndex
CREATE INDEX "ExamSheetBroadcast_classId_term_session_idx" ON "ExamSheetBroadcast"("classId", "term", "session");

-- CreateIndex
CREATE UNIQUE INDEX "ExamResultDelivery_schoolId_classId_term_session_studentId_key" ON "ExamResultDelivery"("schoolId", "classId", "term", "session", "studentId");

-- CreateIndex
CREATE INDEX "ExamResultDelivery_schoolId_idx" ON "ExamResultDelivery"("schoolId");

-- CreateIndex
CREATE INDEX "ExamResultDelivery_studentId_idx" ON "ExamResultDelivery"("studentId");

-- AddForeignKey
ALTER TABLE "CaBroadcast" ADD CONSTRAINT "CaBroadcast_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaBroadcast" ADD CONSTRAINT "CaBroadcast_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSheetBroadcast" ADD CONSTRAINT "ExamSheetBroadcast_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSheetBroadcast" ADD CONSTRAINT "ExamSheetBroadcast_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSheetBroadcast" ADD CONSTRAINT "ExamSheetBroadcast_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSheetBroadcast" ADD CONSTRAINT "ExamSheetBroadcast_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamResultDelivery" ADD CONSTRAINT "ExamResultDelivery_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamResultDelivery" ADD CONSTRAINT "ExamResultDelivery_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamResultDelivery" ADD CONSTRAINT "ExamResultDelivery_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;