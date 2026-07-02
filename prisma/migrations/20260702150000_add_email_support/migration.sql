-- AlterTable
ALTER TABLE "OTP" ADD COLUMN "email" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "OTP_email_idx" ON "OTP"("email");
