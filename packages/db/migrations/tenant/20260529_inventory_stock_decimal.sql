-- Migrate stock columns from Int to Decimal(12,4) to support fractional quantities
-- (weight-based products, bulk fractions, etc.)
-- Safe to re-run (idempotent — USING cast is a no-op if already NUMERIC).

-- Service (catalog master stock)
ALTER TABLE "Service"
  ALTER COLUMN "stock"    TYPE DECIMAL(12,4) USING "stock"::DECIMAL(12,4),
  ALTER COLUMN "minStock" TYPE DECIMAL(12,4) USING "minStock"::DECIMAL(12,4);

-- BranchInventory (per-branch stock)
ALTER TABLE "BranchInventory"
  ALTER COLUMN "stock"    TYPE DECIMAL(12,4) USING "stock"::DECIMAL(12,4),
  ALTER COLUMN "minStock" TYPE DECIMAL(12,4) USING "minStock"::DECIMAL(12,4);
