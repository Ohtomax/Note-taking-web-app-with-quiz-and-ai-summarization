
CREATE TABLE "QuizAttemptTypeMetric" (
 "attemptId" UUID NOT NULL, "type" "QuestionType" NOT NULL,
 "assigned" INTEGER NOT NULL, "answered" INTEGER NOT NULL, "correct" INTEGER NOT NULL,
 CONSTRAINT "QuizAttemptTypeMetric_pkey" PRIMARY KEY ("attemptId","type"),
 CONSTRAINT "QuizAttemptTypeMetric_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "QuizAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "QuizAttemptTypeMetric_type_attemptId_idx" ON "QuizAttemptTypeMetric"("type","attemptId");
INSERT INTO "QuizAttemptTypeMetric" ("attemptId","type","assigned","answered","correct")
 SELECT a."id",q."type",COUNT(q."id")::integer,
 COUNT(qa."id") FILTER (WHERE qa."isCorrect" IS NOT NULL)::integer,
 COUNT(qa."id") FILTER (WHERE qa."isCorrect" IS TRUE)::integer
 FROM "QuizAttempt" a JOIN "QuizQuestion" q ON q."versionId"=a."versionId"
 LEFT JOIN "QuizAttemptAnswer" qa ON qa."attemptId"=a."id" AND qa."questionId"=q."id"
 WHERE a."status"='COMPLETED' GROUP BY a."id",q."type";
