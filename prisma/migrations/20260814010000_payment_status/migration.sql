-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
ADD COLUMN "submittedAt" TIMESTAMP(3),
ADD COLUMN "confirmedAt" TIMESTAMP(3),
ADD COLUMN "rejectedReason" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_schoolId_reference_key" ON "Payment"("schoolId", "reference");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");
