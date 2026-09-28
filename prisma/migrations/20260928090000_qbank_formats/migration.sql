-- CreateEnum
CREATE TYPE "AnswerFormat" AS ENUM ('SINGLE', 'MULTIPLE', 'NUMERICAL');

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "correctIndices" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "format" "AnswerFormat" NOT NULL DEFAULT 'SINGLE',
ADD COLUMN     "numericAnswer" DOUBLE PRECISION,
ADD COLUMN     "tolerance" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "topic" TEXT,
ALTER COLUMN "correctIndex" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "Attempt" ADD COLUMN     "numericValue" DOUBLE PRECISION,
ADD COLUMN     "selectedMany" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- CreateIndex
CREATE INDEX "Question_chapterId_isPublished_idx" ON "Question"("chapterId", "isPublished");

-- CreateIndex
CREATE INDEX "Attempt_questionId_idx" ON "Attempt"("questionId");

