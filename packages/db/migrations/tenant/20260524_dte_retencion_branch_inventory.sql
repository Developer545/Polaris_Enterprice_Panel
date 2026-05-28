-- Tenant schema migration for DTE validation/retention and branch inventory.
-- Safe to re-run: all structural changes use IF NOT EXISTS where PostgreSQL supports it.

ALTER TABLE "Company"
  ADD COLUMN IF NOT EXISTS "esGranContribuyente" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "sujetoRetencionIva1" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Client"
  ADD COLUMN IF NOT EXISTS "esGranContribuyente" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "retieneIva1" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Sale"
  ADD COLUMN IF NOT EXISTS "ivaRete1" NUMERIC(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE "DteDocument"
  ADD COLUMN IF NOT EXISTS "invalidacionCodigoGeneracion" TEXT,
  ADD COLUMN IF NOT EXISTS "invalidacionJson" JSONB,
  ADD COLUMN IF NOT EXISTS "invalidacionJsonFirmado" TEXT,
  ADD COLUMN IF NOT EXISTS "invalidacionSelloRecibido" TEXT,
  ADD COLUMN IF NOT EXISTS "invalidationReason" TEXT,
  ADD COLUMN IF NOT EXISTS "invalidatedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "BranchInventory" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "stock" INTEGER NOT NULL DEFAULT 0,
  "minStock" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BranchInventory_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BranchInventory_branchId_fkey'
  ) THEN
    ALTER TABLE "BranchInventory"
      ADD CONSTRAINT "BranchInventory_branchId_fkey"
      FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BranchInventory_productId_fkey'
  ) THEN
    ALTER TABLE "BranchInventory"
      ADD CONSTRAINT "BranchInventory_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "Service"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "BranchInventory_tenantId_branchId_productId_key"
  ON "BranchInventory" ("tenantId", "branchId", "productId");

CREATE INDEX IF NOT EXISTS "BranchInventory_tenantId_companyId_branchId_idx"
  ON "BranchInventory" ("tenantId", "companyId", "branchId");

CREATE INDEX IF NOT EXISTS "BranchInventory_tenantId_companyId_productId_idx"
  ON "BranchInventory" ("tenantId", "companyId", "productId");

CREATE INDEX IF NOT EXISTS "DteDocument_tenantId_companyId_status_invalidatedAt_idx"
  ON "DteDocument" ("tenantId", "companyId", "status", "invalidatedAt");
