ALTER TABLE "chat_calls" ADD COLUMN "lastLeaseAt" TIMESTAMP(3);
UPDATE "chat_calls" SET "lastLeaseAt" = CURRENT_TIMESTAMP WHERE "status" = 'ACTIVE' AND "connectedAt" IS NOT NULL;
CREATE INDEX "chat_calls_status_lastLeaseAt_idx" ON "chat_calls"("status", "lastLeaseAt");
