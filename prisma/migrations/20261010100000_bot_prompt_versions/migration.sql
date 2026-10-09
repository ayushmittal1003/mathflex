-- Published versions of the chatbot base prompt.
CREATE TABLE "BotPromptVersion" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorName" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL,

    CONSTRAINT "BotPromptVersion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BotPromptVersion_createdAt_idx" ON "BotPromptVersion"("createdAt");
