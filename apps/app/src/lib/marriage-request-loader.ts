import { PatientRequestError } from './patient-request';

/** One request/review flight per mounted invitation; failures never start a retry loop. */
export function marriageRequestLoader<T extends { isInitiator: boolean; status: string }>(get: (token?: string) => Promise<T>, review: (token?: string) => Promise<T>, now = Date.now) {
  let flight: Promise<T> | null = null;
  let reviewed = false;
  let blockedUntil = 0;
  let lastError: unknown;
  return {
    get pending() { return flight; },
    get failure() { return lastError; },
    load(token?: string) {
      if (flight) return flight;
      if (now() < blockedUntil) return Promise.reject(lastError);
      flight = (async () => {
        try {
          const data = await get(token);
          lastError = undefined;
          if (!reviewed && !data.isInitiator && data.status === 'PENDING') {
            reviewed = true;
            return await review(token);
          }
          return data;
        } catch (error) {
          lastError = error;
          blockedUntil = now() + (error instanceof PatientRequestError && error.status === 429 ? Math.max(60000, error.retryAfterMs) : 30000);
          throw error;
        } finally { flight = null; }
      })();
      return flight;
    },
    reviewAgain() { reviewed = false; },
    mutationSucceeded() { blockedUntil = 0; },
  };
}
