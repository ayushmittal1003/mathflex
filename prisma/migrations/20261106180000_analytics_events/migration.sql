-- First-party site analytics: page views, time on page, clicks and named events, by an anonymous
-- visitor/session id. No IP address is stored. Rows older than 180 days are pruned by /api/track.
CREATE TABLE "AnalyticsEvent" (
    "id" BIGSERIAL NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visitorId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL DEFAULT '',
    "label" TEXT,
    "ms" INTEGER,
    "source" TEXT,
    "medium" TEXT,
    "campaign" TEXT,
    "device" TEXT,
    "country" TEXT,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AnalyticsEvent_at_idx" ON "AnalyticsEvent"("at");
CREATE INDEX "AnalyticsEvent_name_at_idx" ON "AnalyticsEvent"("name", "at");
CREATE INDEX "AnalyticsEvent_sessionId_idx" ON "AnalyticsEvent"("sessionId");
CREATE INDEX "AnalyticsEvent_userId_at_idx" ON "AnalyticsEvent"("userId", "at");
