-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AIOperation" AS ENUM ('SUMMARY', 'QUIZ');

-- CreateEnum
CREATE TYPE "AIStatus" AS ENUM ('RESERVED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'UNCERTAIN');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'ABANDONED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MULTIPLE_CHOICE', 'TRUE_FALSE', 'IDENTIFICATION', 'MULTIPLE_SELECT');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "QuizMode" AS ENUM ('PRACTICE', 'EXAM');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USERS', 'ADMIN', 'STAFF');

-- CreateTable
CREATE TABLE "AIUsage" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "requestKey" VARCHAR(128) NOT NULL,
    "inputHash" VARCHAR(64) NOT NULL,
    "operation" "AIOperation" NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "status" "AIStatus" NOT NULL DEFAULT 'RESERVED',
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "reservedTokens" INTEGER NOT NULL DEFAULT 0,
    "leaseExpiresAt" TIMESTAMPTZ(6),
    "estimatedCost" DECIMAL(16,8),
    "pricingVersion" VARCHAR(50),
    "resultId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AIUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content" JSONB NOT NULL DEFAULT '{}',
    "contentSchemaVersion" INTEGER NOT NULL DEFAULT 1,
    "plainText" TEXT NOT NULL DEFAULT '',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMPTZ(6),
    "deletedAt" TIMESTAMPTZ(6),
    "lastOpenedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "color" VARCHAR(30) NOT NULL DEFAULT 'slate',
    "icon" VARCHAR(50) NOT NULL DEFAULT 'folder',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "archivedAt" TIMESTAMPTZ(6),
    "deletedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizAttemptAnswer" (
    "id" UUID NOT NULL,
    "attemptId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "versionId" UUID NOT NULL,
    "selectedOptionIds" JSONB NOT NULL DEFAULT '[]',
    "text" TEXT,
    "isCorrect" BOOLEAN,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "submittedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizAttemptAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizAttempt" (
    "id" UUID NOT NULL,
    "versionId" UUID NOT NULL,
    "requestKey" VARCHAR(128) NOT NULL,
    "mode" "QuizMode" NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "questionOrder" JSONB NOT NULL DEFAULT '[]',
    "optionOrder" JSONB NOT NULL DEFAULT '{}',
    "startedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMPTZ(6),
    "correctCount" INTEGER,
    "answeredCount" INTEGER,
    "totalQuestions" INTEGER NOT NULL,

    CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizQuestionOption" (
    "id" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,

    CONSTRAINT "QuizQuestionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizQuestion" (
    "id" UUID NOT NULL,
    "versionId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "type" "QuestionType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "explanation" TEXT,
    "acceptedAnswers" JSONB NOT NULL DEFAULT '[]',
    "sourceKeys" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizSource" (
    "id" UUID NOT NULL,
    "quizVersionId" UUID NOT NULL,
    "noteId" UUID,
    "sourceKey" VARCHAR(100) NOT NULL,
    "noteTitle" VARCHAR(200) NOT NULL,
    "revision" INTEGER NOT NULL,
    "contentHash" VARCHAR(64) NOT NULL,
    "rangeStart" INTEGER,
    "rangeEnd" INTEGER,

    CONSTRAINT "QuizSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizVersion" (
    "id" UUID NOT NULL,
    "quizId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "defaultMode" "QuizMode" NOT NULL DEFAULT 'PRACTICE',
    "includeExplanations" BOOLEAN NOT NULL DEFAULT true,
    "generatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "promptVersion" VARCHAR(50) NOT NULL,

    CONSTRAINT "QuizVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quiz" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "deletedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SummarySource" (
    "id" UUID NOT NULL,
    "summaryId" UUID NOT NULL,
    "noteId" UUID,
    "sourceKey" VARCHAR(100) NOT NULL,
    "noteTitle" VARCHAR(200) NOT NULL,
    "revision" INTEGER NOT NULL,
    "excerpt" TEXT,
    "rangeStart" INTEGER,
    "rangeEnd" INTEGER,
    "contentHash" VARCHAR(64) NOT NULL,

    CONSTRAINT "SummarySource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Summary" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content" JSONB NOT NULL DEFAULT '{}',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "generatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Summary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "firebaseUid" VARCHAR(128) NOT NULL,
    "displayName" VARCHAR(100) NOT NULL DEFAULT '',
    "email" VARCHAR(254),
    "role" "Role" NOT NULL DEFAULT 'USERS',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AIUsage_userId_createdAt_status_idx" ON "AIUsage"("userId", "createdAt", "status");

-- CreateIndex
CREATE INDEX "AIUsage_status_leaseExpiresAt_idx" ON "AIUsage"("status", "leaseExpiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AIUsage_userId_requestKey_key" ON "AIUsage"("userId", "requestKey");

-- CreateIndex
CREATE INDEX "Note_projectId_deletedAt_pinned_updatedAt_id_idx" ON "Note"("projectId", "deletedAt", "pinned", "updatedAt", "id");

-- CreateIndex
CREATE INDEX "Note_projectId_title_id_idx" ON "Note"("projectId", "title", "id");

-- CreateIndex
CREATE INDEX "Note_projectId_createdAt_id_idx" ON "Note"("projectId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Project_ownerId_deletedAt_updatedAt_id_idx" ON "Project"("ownerId", "deletedAt", "updatedAt", "id");

-- CreateIndex
CREATE INDEX "QuizAttemptAnswer_questionId_versionId_idx" ON "QuizAttemptAnswer"("questionId", "versionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuizAttemptAnswer_attemptId_questionId_key" ON "QuizAttemptAnswer"("attemptId", "questionId");

-- CreateIndex
CREATE INDEX "QuizAttempt_versionId_startedAt_id_idx" ON "QuizAttempt"("versionId", "startedAt", "id");

-- CreateIndex
CREATE INDEX "QuizAttempt_status_startedAt_idx" ON "QuizAttempt"("status", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "QuizAttempt_versionId_requestKey_key" ON "QuizAttempt"("versionId", "requestKey");

-- CreateIndex
CREATE UNIQUE INDEX "QuizAttempt_id_versionId_key" ON "QuizAttempt"("id", "versionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuizQuestionOption_questionId_position_key" ON "QuizQuestionOption"("questionId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "QuizQuestion_versionId_position_key" ON "QuizQuestion"("versionId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "QuizQuestion_id_versionId_key" ON "QuizQuestion"("id", "versionId");

-- CreateIndex
CREATE INDEX "QuizSource_noteId_idx" ON "QuizSource"("noteId");

-- CreateIndex
CREATE UNIQUE INDEX "QuizSource_quizVersionId_sourceKey_key" ON "QuizSource"("quizVersionId", "sourceKey");

-- CreateIndex
CREATE UNIQUE INDEX "QuizVersion_quizId_version_key" ON "QuizVersion"("quizId", "version");

-- CreateIndex
CREATE INDEX "Quiz_projectId_deletedAt_updatedAt_id_idx" ON "Quiz"("projectId", "deletedAt", "updatedAt", "id");

-- CreateIndex
CREATE INDEX "SummarySource_noteId_idx" ON "SummarySource"("noteId");

-- CreateIndex
CREATE UNIQUE INDEX "SummarySource_summaryId_sourceKey_key" ON "SummarySource"("summaryId", "sourceKey");

-- CreateIndex
CREATE INDEX "Summary_projectId_generatedAt_id_idx" ON "Summary"("projectId", "generatedAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "User_firebaseUid_key" ON "User"("firebaseUid");

-- AddForeignKey
ALTER TABLE "AIUsage" ADD CONSTRAINT "AIUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttemptAnswer" ADD CONSTRAINT "QuizAttemptAnswer_attemptId_versionId_fkey" FOREIGN KEY ("attemptId", "versionId") REFERENCES "QuizAttempt"("id", "versionId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "QuizAttemptAnswer" ADD CONSTRAINT "QuizAttemptAnswer_questionId_versionId_fkey" FOREIGN KEY ("questionId", "versionId") REFERENCES "QuizQuestion"("id", "versionId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "QuizVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizQuestionOption" ADD CONSTRAINT "QuizQuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QuizQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "QuizVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizSource" ADD CONSTRAINT "QuizSource_quizVersionId_fkey" FOREIGN KEY ("quizVersionId") REFERENCES "QuizVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizSource" ADD CONSTRAINT "QuizSource_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizVersion" ADD CONSTRAINT "QuizVersion_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SummarySource" ADD CONSTRAINT "SummarySource_summaryId_fkey" FOREIGN KEY ("summaryId") REFERENCES "Summary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SummarySource" ADD CONSTRAINT "SummarySource_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Summary" ADD CONSTRAINT "Summary_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
