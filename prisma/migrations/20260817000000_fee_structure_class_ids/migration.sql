-- Consolidate per-class FeeStructure rows into one row per group.
-- A fee structure now applies to many classes via a classIds array,
-- instead of one row per class sharing a groupId.

CREATE TEMP TABLE _fee_groups AS
SELECT "groupId",
       MIN("id") AS keep_id,
       jsonb_agg("classId" ORDER BY "createdAt") AS all_class_ids
FROM "FeeStructure"
GROUP BY "groupId";

ALTER TABLE "FeeStructure" ADD COLUMN "classIds" JSONB;

UPDATE "FeeStructure" f
SET "classIds" = g.all_class_ids
FROM _fee_groups g
WHERE f."id" = g.keep_id;

-- Repoint invoices that referenced a merged-away row to the kept row.
UPDATE "Invoice" i
SET "feeStructureId" = g.keep_id
FROM _fee_groups g
JOIN "FeeStructure" f ON f."groupId" = g."groupId"
WHERE i."feeStructureId" = f."id" AND i."feeStructureId" <> g.keep_id;

DELETE FROM "FeeStructure" f
USING _fee_groups g
WHERE f."groupId" = g."groupId" AND f."id" <> g.keep_id;

ALTER TABLE "FeeStructure" ALTER COLUMN "classIds" SET NOT NULL;
ALTER TABLE "FeeStructure" DROP COLUMN "classId";
ALTER TABLE "FeeStructure" DROP COLUMN "groupId";
DROP INDEX IF EXISTS "FeeStructure_classId_idx";
DROP INDEX IF EXISTS "FeeStructure_groupId_idx";