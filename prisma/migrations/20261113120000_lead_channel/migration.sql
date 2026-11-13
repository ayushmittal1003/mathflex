ALTER TABLE "Lead" ADD COLUMN "channel" TEXT NOT NULL DEFAULT 'website';
ALTER TABLE "Lead" ADD COLUMN "externalId" TEXT;
CREATE UNIQUE INDEX "Lead_externalId_key" ON "Lead"("externalId");
