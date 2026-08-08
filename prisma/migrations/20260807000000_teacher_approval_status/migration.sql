-- Add approvalStatus to User so teachers can be marked PENDING/APPROVED/REJECTED
ALTER TABLE "User" ADD COLUMN "approvalStatus" TEXT NOT NULL DEFAULT 'APPROVED';
CREATE INDEX "User_approvalStatus_idx" ON "User"("approvalStatus");