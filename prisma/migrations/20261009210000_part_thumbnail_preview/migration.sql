-- Per-part thumbnail upload and a time-limited free preview.
ALTER TABLE "Part" ADD COLUMN "previewSec" INTEGER NOT NULL DEFAULT 180;
ALTER TABLE "Part" ADD COLUMN "thumbnailUrl" TEXT;
