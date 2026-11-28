ALTER TABLE "QuizQuestion" ADD COLUMN "topic" VARCHAR(120);
ALTER TABLE "QuizQuestionOption" ADD COLUMN "rationale" TEXT;

CREATE INDEX "QuizAttempt_status_finishedAt_id_idx" ON "QuizAttempt"("status", "finishedAt", "id");
