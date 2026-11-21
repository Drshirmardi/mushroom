
ALTER TABLE "chat_calls" ADD COLUMN "callerLeaseAt" TIMESTAMP(3), ADD COLUMN "patientLeaseAt" TIMESTAMP(3), ADD COLUMN "endReason" TEXT;
UPDATE "chat_calls" SET "callerLeaseAt" = CURRENT_TIMESTAMP, "patientLeaseAt" = CURRENT_TIMESTAMP WHERE "status" = 'ACTIVE' AND "connectedAt" IS NOT NULL;
WITH ranked AS (
  SELECT "id", row_number() OVER (PARTITION BY "callerUserId" ORDER BY ("status" = 'ACTIVE') DESC, "lastLeaseAt" DESC NULLS LAST, "createdAt" DESC, "id") AS rank
  FROM "chat_calls" WHERE "status" IN ('RINGING', 'ACTIVE')
)
UPDATE "chat_calls" AS calls SET "status" = CASE WHEN calls."status" = 'RINGING' THEN 'CANCELLED'::"ChatCallStatus" ELSE 'ENDED'::"ChatCallStatus" END,
  "endReason" = 'legacy_duplicate', "endedAt" = CURRENT_TIMESTAMP
FROM ranked WHERE calls.id = ranked.id AND ranked.rank > 1;
CREATE UNIQUE INDEX "chat_calls_one_live_per_caller" ON "chat_calls" ("callerUserId") WHERE "status" IN ('RINGING', 'ACTIVE');
