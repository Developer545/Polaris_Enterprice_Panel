DO $$
BEGIN
  CREATE TYPE "LicenseCommandType" AS ENUM ('BACKUP_DATABASE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "LicenseCommandStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "LicenseCommand" (
  "id" TEXT NOT NULL,
  "licenseId" TEXT NOT NULL,
  "type" "LicenseCommandType" NOT NULL,
  "status" "LicenseCommandStatus" NOT NULL DEFAULT 'PENDING',
  "payload" JSONB NOT NULL DEFAULT '{}',
  "result" JSONB,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "leasedAt" TIMESTAMP(3),
  "leaseExpiresAt" TIMESTAMP(3),
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "error" TEXT,
  CONSTRAINT "LicenseCommand_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  ALTER TABLE "LicenseCommand"
    ADD CONSTRAINT "LicenseCommand_licenseId_fkey"
    FOREIGN KEY ("licenseId") REFERENCES "License"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "LicenseCommand_licenseId_status_idx"
  ON "LicenseCommand"("licenseId", "status");

CREATE INDEX IF NOT EXISTS "LicenseCommand_leaseExpiresAt_idx"
  ON "LicenseCommand"("leaseExpiresAt");
