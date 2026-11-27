
ALTER TABLE "QuizAttempt" ADD COLUMN "scoreRatio" DOUBLE PRECISION, ADD COLUMN "elapsedMs" INTEGER, ADD COLUMN "completedDay" DATE;
UPDATE "QuizAttempt" SET
 "scoreRatio" = CASE WHEN "totalQuestions" > 0 AND "correctCount" BETWEEN 0 AND "totalQuestions" THEN "correctCount"::double precision / "totalQuestions" ELSE NULL END,
 "elapsedMs" = LEAST(2147483647,GREATEST(0,EXTRACT(EPOCH FROM ("finishedAt"-"startedAt"))*1000))::integer,
 "completedDay" = ("finishedAt" AT TIME ZONE 'UTC')::date
 WHERE "status" = 'COMPLETED' AND "finishedAt" IS NOT NULL;
CREATE INDEX "QuizAttempt_status_completedDay_versionId_idx" ON "QuizAttempt"("status","completedDay","versionId");
