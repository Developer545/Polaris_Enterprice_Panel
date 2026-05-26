-- Migration: License system
-- Adds License table for cryptographically secure license key management.
-- Keys are never stored in plain text — only HMAC-SHA256 hash with server secret.

CREATE TYPE "LicenseStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'EXPIRED');

CREATE TABLE "License" (
  "id"          TEXT          NOT NULL,
  "keyHash"     TEXT          NOT NULL,
  "keyPreview"  TEXT          NOT NULL,
  "label"       TEXT,
  "status"      "LicenseStatus" NOT NULL DEFAULT 'PENDING',
  "plan"        TEXT          NOT NULL DEFAULT 'LOCAL',
  "expiresAt"   TIMESTAMP(3),
  "tenantId"    TEXT,
  "activatedAt" TIMESTAMP(3),
  "lastSeenAt"  TIMESTAMP(3),
  "notes"       TEXT,
  "createdAt"   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "License_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "License_keyHash_key" ON "License"("keyHash");
CREATE INDEX "License_tenantId_idx" ON "License"("tenantId");

ALTER TABLE "License"
  ADD CONSTRAINT "License_tenantId_fkey"
  FOREIGN KEY ("tenantId")
  REFERENCES "Tenant"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
