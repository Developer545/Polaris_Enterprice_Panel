-- Migration: HWID binding + module permissions + DTE daily stats
-- Extends License table and adds DteDailyLog for heartbeat tracking.

ALTER TABLE "License"
  ADD COLUMN IF NOT EXISTS "hwid"           TEXT,
  ADD COLUMN IF NOT EXISTS "enabledModules" TEXT[] NOT NULL DEFAULT ARRAY['pos','ventas','clientes','inventario','servicios'];

CREATE TABLE IF NOT EXISTS "DteDailyLog" (
  "id"        TEXT         NOT NULL,
  "licenseId" TEXT         NOT NULL,
  "date"      DATE         NOT NULL,
  "stats"     JSONB        NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DteDailyLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DteDailyLog_licenseId_date_key"
  ON "DteDailyLog"("licenseId", "date");

CREATE INDEX IF NOT EXISTS "DteDailyLog_licenseId_idx"
  ON "DteDailyLog"("licenseId");

ALTER TABLE "DteDailyLog"
  ADD CONSTRAINT "DteDailyLog_licenseId_fkey"
  FOREIGN KEY ("licenseId")
  REFERENCES "License"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
