import { PatientRequestError } from './patient-request';
import type { components } from '@sabz-zendegi/api-client';
type Participation = components['schemas']['EducationalCoupleDetailDto'];
export function participationWaiting(data: Participation | null): boolean {
 if (!data || data.jointResultAvailable || data.participants.some(p => p.consentState === 'WITHDRAWN')) return false;
 return !data.mutualConsentComplete || data.paymentPending || !!data.ownPendingIntentId || !!data.ownAccessGrantId;
}
/** One in-flight read and one cooldown shared by automatic and explicit refresh. */
export function participationLoader<T>(get: (token: string) => Promise<T>, now = Date.now) {
 let flight: Promise<T> | null = null, blockedUntil = 0;
 let failure: unknown;
 return {
  get pending() { return flight; },
  mutationSucceeded() { blockedUntil = 0; },
  load(token: string): Promise<T> {
   if (flight) return flight;
   if (now() < blockedUntil) return Promise.reject(failure);
   flight = get(token).catch(error => {
    failure = error;
    blockedUntil = now() + (error instanceof PatientRequestError && error.status === 429 ? error.retryAfterMs || 60000 : 30000);
    throw error;
   }).finally(() => { flight = null; });
   return flight;
  },
 };
}
