ALTER TABLE "Quiz" ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "QuizAttempt" ADD COLUMN "attemptNumber" INTEGER;
ALTER TABLE "QuizAttempt" ADD COLUMN "focusedReview" BOOLEAN NOT NULL DEFAULT false;

WITH numbered AS (
  SELECT attempt."id", row_number() OVER (
    PARTITION BY version."quizId" ORDER BY attempt."startedAt", attempt."id"
  ) AS number
  FROM "QuizAttempt" attempt
  JOIN "QuizVersion" version ON version."id" = attempt."versionId"
)
UPDATE "QuizAttempt" attempt
SET "attemptNumber" = numbered.number
FROM numbered
WHERE attempt."id" = numbered."id";

UPDATE "Quiz" quiz
SET "attemptCount" = totals.count
FROM (
  SELECT version."quizId", count(*) AS count
  FROM "QuizAttempt" attempt
  JOIN "QuizVersion" version ON version."id" = attempt."versionId"
  GROUP BY version."quizId"
) totals
WHERE quiz."id" = totals."quizId";
