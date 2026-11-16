import type { components } from '@sabz-zendegi/api-client';
import { apiClient } from './api';
import { patientAuthorization, patientData } from './patient-request';
export type MezajService = components['schemas']['MezajProgramCardDto'];
export type OwnedMezajService = components['schemas']['OwnedProgramCardDto'];
export const getMezajServices = (token: string, submissionId?: string, signal?: AbortSignal) => patientData(apiClient.GET('/v1/patients/me/program-recommendations', { headers: patientAuthorization(token), params: submissionId === undefined ? undefined : { query: { submissionId } }, cache: 'no-store', signal }));
export const getOwnedServices = (token: string, page = 1, pageSize = 12, signal?: AbortSignal) => patientData(apiClient.GET('/v1/patients/me/program-library', { headers: patientAuthorization(token), params: { query: { page, pageSize } }, cache: 'no-store', signal }));
