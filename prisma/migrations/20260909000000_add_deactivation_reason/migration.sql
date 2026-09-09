-- Manual migration (migrate dev would have reset the shared production DB
-- due to pre-existing drift built via db push).
ALTER TABLE "School" ADD COLUMN "deactivationReason" TEXT;
ALTER TABLE "School" ADD COLUMN "deactivationNote" TEXT;