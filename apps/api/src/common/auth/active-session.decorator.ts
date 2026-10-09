import { SetMetadata } from '@nestjs/common';

export const SKIP_ACTIVE_SESSION_CHECK_KEY = 'skipActiveSessionCheck';

/** Keeps logout retries idempotent after the first request revokes the session. */
export const SkipActiveSessionCheck = () =>
  SetMetadata(SKIP_ACTIVE_SESSION_CHECK_KEY, true);
