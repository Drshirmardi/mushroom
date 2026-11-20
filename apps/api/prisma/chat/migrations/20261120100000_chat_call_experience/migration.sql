CREATE TYPE "ChatCallMode" AS ENUM ('AUDIO', 'VIDEO');
ALTER TYPE "ChatCallStatus" ADD VALUE 'CANCELLED';
ALTER TYPE "ChatCallStatus" ADD VALUE 'FAILED';
ALTER TABLE "chat_calls" ADD COLUMN "mode" "ChatCallMode" NOT NULL DEFAULT 'VIDEO',
  ADD COLUMN "answeredAt" TIMESTAMP(3), ADD COLUMN "callerConnectedAt" TIMESTAMP(3),
  ADD COLUMN "patientConnectedAt" TIMESTAMP(3), ADD COLUMN "connectedAt" TIMESTAMP(3);
ALTER TABLE "chat_messages" ADD COLUMN "call_id" UUID;
CREATE UNIQUE INDEX "chat_messages_call_id_key" ON "chat_messages"("call_id");
