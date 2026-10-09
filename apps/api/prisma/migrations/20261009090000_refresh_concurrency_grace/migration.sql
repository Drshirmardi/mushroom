-- Retain only the immediately preceding refresh verifier briefly. It allows
-- harmless same-browser races to retry after Set-Cookie arrives; any older
-- verifier remains refresh-token reuse and revokes the session.
ALTER TABLE "sessions"
  ADD COLUMN "previous_refresh_token_hash" CHAR(64),
  ADD COLUMN "previous_refresh_token_expires_at" TIMESTAMPTZ(3);
