-- Tenant schema migration: branch-level isolation.
-- Adds branchId to company-wide tables that were leaking across branches,
-- backfills existing rows to the company's main (oldest) branch, and indexes
-- branch-scoped lookups. Safe to re-run (idempotent).

-- 1. Add nullable branchId columns.
ALTER TABLE "Client"
  ADD COLUMN IF NOT EXISTS "branchId" TEXT;

ALTER TABLE "Expense"
  ADD COLUMN IF NOT EXISTS "branchId" TEXT;

ALTER TABLE "AccountPayable"
  ADD COLUMN IF NOT EXISTS "branchId" TEXT;

ALTER TABLE "AccountReceivable"
  ADD COLUMN IF NOT EXISTS "branchId" TEXT;

-- Employee.branchId already exists in schema; ensure present for older DBs.
ALTER TABLE "Employee"
  ADD COLUMN IF NOT EXISTS "branchId" TEXT;

-- 2. Foreign keys to Branch (ON DELETE SET NULL keeps history rows alive).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Client_branchId_fkey') THEN
    ALTER TABLE "Client"
      ADD CONSTRAINT "Client_branchId_fkey"
      FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Expense_branchId_fkey') THEN
    ALTER TABLE "Expense"
      ADD CONSTRAINT "Expense_branchId_fkey"
      FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AccountPayable_branchId_fkey') THEN
    ALTER TABLE "AccountPayable"
      ADD CONSTRAINT "AccountPayable_branchId_fkey"
      FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AccountReceivable_branchId_fkey') THEN
    ALTER TABLE "AccountReceivable"
      ADD CONSTRAINT "AccountReceivable_branchId_fkey"
      FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Employee_branchId_fkey') THEN
    ALTER TABLE "Employee"
      ADD CONSTRAINT "Employee_branchId_fkey"
      FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 3. Backfill: assign existing rows to each company's main (oldest) branch.
UPDATE "Client" c
SET "branchId" = (
  SELECT b."id" FROM "Branch" b
  WHERE b."companyId" = c."companyId" AND b."tenantId" = c."tenantId"
  ORDER BY b."createdAt" ASC LIMIT 1
)
WHERE c."branchId" IS NULL;

UPDATE "Expense" e
SET "branchId" = (
  SELECT b."id" FROM "Branch" b
  WHERE b."companyId" = e."companyId" AND b."tenantId" = e."tenantId"
  ORDER BY b."createdAt" ASC LIMIT 1
)
WHERE e."branchId" IS NULL;

UPDATE "AccountPayable" ap
SET "branchId" = (
  SELECT b."id" FROM "Branch" b
  WHERE b."companyId" = ap."companyId" AND b."tenantId" = ap."tenantId"
  ORDER BY b."createdAt" ASC LIMIT 1
)
WHERE ap."branchId" IS NULL;

UPDATE "AccountReceivable" ar
SET "branchId" = (
  SELECT b."id" FROM "Branch" b
  WHERE b."companyId" = ar."companyId" AND b."tenantId" = ar."tenantId"
  ORDER BY b."createdAt" ASC LIMIT 1
)
WHERE ar."branchId" IS NULL;

UPDATE "Employee" emp
SET "branchId" = (
  SELECT b."id" FROM "Branch" b
  WHERE b."companyId" = emp."companyId" AND b."tenantId" = emp."tenantId"
  ORDER BY b."createdAt" ASC LIMIT 1
)
WHERE emp."branchId" IS NULL;

-- 4. Branch-scoped indexes.
CREATE INDEX IF NOT EXISTS "Client_tenantId_companyId_branchId_idx"
  ON "Client" ("tenantId", "companyId", "branchId");

CREATE INDEX IF NOT EXISTS "Expense_tenantId_companyId_branchId_idx"
  ON "Expense" ("tenantId", "companyId", "branchId");

CREATE INDEX IF NOT EXISTS "AccountPayable_tenantId_companyId_branchId_idx"
  ON "AccountPayable" ("tenantId", "companyId", "branchId");

CREATE INDEX IF NOT EXISTS "AccountReceivable_tenantId_companyId_branchId_idx"
  ON "AccountReceivable" ("tenantId", "companyId", "branchId");

CREATE INDEX IF NOT EXISTS "Employee_tenantId_companyId_branchId_idx"
  ON "Employee" ("tenantId", "companyId", "branchId");

CREATE INDEX IF NOT EXISTS "InventoryMovement_tenantId_companyId_branchId_idx"
  ON "InventoryMovement" ("tenantId", "companyId", "branchId");

CREATE INDEX IF NOT EXISTS "DteDocument_tenantId_companyId_branchId_idx"
  ON "DteDocument" ("tenantId", "companyId", "branchId");
