
ALTER TABLE "AIUsage" ADD COLUMN "completedAt" TIMESTAMPTZ(6);
CREATE TABLE "AICall" (
 "id" UUID NOT NULL, "usageId" UUID NOT NULL, "number" INTEGER NOT NULL,
 "status" "AIStatus" NOT NULL DEFAULT 'RUNNING', "inputTokens" INTEGER, "outputTokens" INTEGER,
 "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "completedAt" TIMESTAMPTZ(6),
 CONSTRAINT "AICall_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "AICall_usageId_fkey" FOREIGN KEY ("usageId") REFERENCES "AIUsage"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AICall_usageId_number_key" ON "AICall"("usageId","number");
