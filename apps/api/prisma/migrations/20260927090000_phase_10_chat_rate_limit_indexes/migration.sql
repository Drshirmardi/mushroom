CREATE INDEX "chat_messages_sender_created_at_idx"
  ON "chat_messages"("sender_user_id", "created_at");

CREATE INDEX "chat_messages_conversation_created_at_idx"
  ON "chat_messages"("conversation_id", "created_at");
