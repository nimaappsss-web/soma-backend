-- AlterTable: Remove classId from TeacherAssignment, add many-to-many via TeacherAssignmentClass

-- Drop foreign key to Class
ALTER TABLE "TeacherAssignment" DROP CONSTRAINT "TeacherAssignment_classId_fkey";

-- Drop indexes on classId
DROP INDEX "TeacherAssignment_classId_idx";
DROP INDEX "TeacherAssignment_teacherId_classId_type_subjectId_key";

-- Remove classId column
ALTER TABLE "TeacherAssignment" DROP COLUMN "classId";

-- Add new unique constraint
CREATE UNIQUE INDEX "TeacherAssignment_teacherId_type_subjectId_key" ON "TeacherAssignment"("teacherId", "type", "subjectId");

-- CreateTable: TeacherAssignmentClass (join table)
CREATE TABLE "TeacherAssignmentClass" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherAssignmentClass_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeacherAssignmentClass_assignmentId_classId_key" ON "TeacherAssignmentClass"("assignmentId", "classId");

-- CreateIndex
CREATE INDEX "TeacherAssignmentClass_classId_idx" ON "TeacherAssignmentClass"("classId");

-- AddForeignKey
ALTER TABLE "TeacherAssignmentClass" ADD CONSTRAINT "TeacherAssignmentClass_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "TeacherAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignmentClass" ADD CONSTRAINT "TeacherAssignmentClass_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
