-- AlterTable: Add formClassId to User
ALTER TABLE "User" ADD COLUMN "formClassId" TEXT;

-- CreateIndex
CREATE INDEX "User_formClassId_idx" ON "User"("formClassId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_formClassId_fkey" FOREIGN KEY ("formClassId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;
