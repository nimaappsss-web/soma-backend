-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "receiptNo" TEXT;

-- AlterTable
ALTER TABLE "School" ADD COLUMN "paymentMode" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN "manualBankDetails" JSONB,
ADD COLUMN "paystackSurchargePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "paystackSurchargeFlat" DOUBLE PRECISION NOT NULL DEFAULT 0;