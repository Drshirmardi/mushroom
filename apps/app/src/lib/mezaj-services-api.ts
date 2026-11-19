import type { components } from '@sabz-zendegi/api-client';
import { apiClient } from './api';
import { invalidatePatientResource, PatientRequestError, patientAuthorization, patientData } from './patient-request';
export type MezajService = components['schemas']['MezajProgramCardDto'];
export type OwnedMezajService = components['schemas']['OwnedProgramCardDto'];
export const getMezajServices = (token: string, submissionId?: string, signal?: AbortSignal) => patientData(apiClient.GET('/v1/patients/me/program-recommendations', { headers: patientAuthorization(token), params: submissionId === undefined ? undefined : { query: { submissionId } }, cache: 'no-store', signal }));
export const getOwnedServices = (token: string, page = 1, pageSize = 12, signal?: AbortSignal) => patientData(apiClient.GET('/v1/patients/me/program-library', { headers: patientAuthorization(token), params: { query: { page, pageSize } }, cache: 'no-store', signal }));

export const STORE_MEZAJ_RECOMMENDATIONS = 'store-program-recommendations';

export function invalidateStoreMezajRecommendations() {
  invalidatePatientResource(STORE_MEZAJ_RECOMMENDATIONS);
}

export async function loadStoreMezajRecommendations(token: string, signal: AbortSignal) {
  try {
    return await getMezajServices(token, undefined, signal);
  } catch (error) {
    if (signal.aborted || !(error instanceof PatientRequestError)) throw error;
    const temporaryFailure = [0, 502, 503, 504].includes(error.status);
    const shortRateLimit = error.status === 429 && error.retryAfterMs > 0;
    if ((!temporaryFailure && !shortRateLimit) || error.retryAfterMs > 2_000) throw error;

    await new Promise<void>((resolve) => setTimeout(resolve, Math.max(500, error.retryAfterMs)));
    signal.throwIfAborted();
    return getMezajServices(token, undefined, signal);
  }
}
