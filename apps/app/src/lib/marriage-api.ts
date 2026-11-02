import type { components } from '@sabz-zendegi/api-client';
import { apiClient } from './api';
import { patientAuthorization as auth, patientData as data } from './patient-request';
export type MarriageSettings = components['schemas']['MarriageSettingsDto'];
export type MarriageRequest = components['schemas']['MarriageRequestDto'];
export const getMarriageSettings = (token: string,id: string) => data(apiClient.GET('/v1/patients/me/marriage-requests/settings/{id}', { headers: auth(token), params: { path: { id } } }));
export const createMarriageRequest = (token: string,body: components['schemas']['MarriageRequestCreateDto'],key: string) => data(apiClient.POST('/v1/patients/me/marriage-requests', { headers: auth(token), params: { header: { 'Idempotency-Key': key } }, body }));
export const getMarriageRequest = (token: string,id: string) => data(apiClient.GET('/v1/patients/me/marriage-requests/{id}', { headers: auth(token), params: { path: { id } } }));
export const listMarriageRequests = (token: string,page = 1) => data(apiClient.GET('/v1/patients/me/marriage-requests', { headers: auth(token), params: { query: { page, pageSize: 20 } } }));
export const acceptMarriageRequest = (token: string,id: string,body: components['schemas']['MarriageRequestAcceptDto']) => data(apiClient.POST('/v1/patients/me/marriage-requests/{id}/accept', { headers: auth(token), params: { path: { id } }, body }));
export const cancelMarriageRequest = (token: string,id: string) => data(apiClient.POST('/v1/patients/me/marriage-requests/{id}/cancel', { headers: auth(token), params: { path: { id } } }));

export const replaceMarriageRequest = (token:string,id:string,body:components['schemas']['MarriageRequestCreateDto'],key:string) => data(apiClient.POST('/v1/patients/me/marriage-requests/{id}/replace', { headers:auth(token),params:{path:{id},header:{'Idempotency-Key':key}},body }));
