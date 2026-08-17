-- Fee structure breakdown: groupId links rows created for the same multi-select
-- class group; items stores the line-item breakdown [{ id, label, amount }].
ALTER TABLE "FeeStructure" ADD COLUMN "groupId" TEXT;
ALTER TABLE "FeeStructure" ADD COLUMN "items" JSONB;
CREATE INDEX "FeeStructure_groupId_idx" ON "FeeStructure"("groupId");

-- Backfill: existing single-fee rows become their own group with a single item.
UPDATE "FeeStructure" SET "groupId" = "id" WHERE "groupId" IS NULL;
UPDATE "FeeStructure" SET "items" = jsonb_build_array(jsonb_build_object('id', 'item-' || "id", 'label', "name", 'amount', "amount")) WHERE "items" IS NULL;

-- Invoice line-item snapshot + signatory name.
ALTER TABLE "Invoice" ADD COLUMN "items" JSONB;
ALTER TABLE "Invoice" ADD COLUMN "issuedByName" TEXT;

-- Backfill invoice items from the linked fee structure.
UPDATE "Invoice" i
SET "items" = COALESCE(f."items", jsonb_build_array(jsonb_build_object('id', 'item-' || f."id", 'label', f."name", 'amount', f."amount")))
FROM "FeeStructure" f
WHERE i."feeStructureId" = f."id" AND i."items" IS NULL;