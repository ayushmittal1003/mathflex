-- Optional "must watch" rule per part. Existing parts keep requiring it.
ALTER TABLE "Part" ADD COLUMN "requireWatch" BOOLEAN NOT NULL DEFAULT true;
