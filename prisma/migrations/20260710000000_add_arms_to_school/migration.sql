-- Add arms column to School for configurable arm naming
ALTER TABLE "School" ADD COLUMN "arms" TEXT NOT NULL DEFAULT '["A","B","C"]';
