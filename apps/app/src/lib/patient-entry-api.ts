import type { components } from '@sabz-zendegi/api-client';
import { apiClient } from './api';
import { patientAuthorization, patientData } from './patient-request';

export type PatientEntryStatus = components['schemas']['PatientEntryStatusDto'];
export type EntryProfile = components['schemas']['EntryProfileDto'];
const headers = (token: string) => patientAuthorization(token);
export const getPatientEntry = (token: string) => patientData(apiClient.GET('/v1/patients/me/entry', { headers: headers(token), cache: 'no-store' }));
export const saveEntryProfile = (token: string, body: EntryProfile) => patientData(apiClient.POST('/v1/patients/me/entry/profile', { headers: headers(token), body }));
export const startEntryAssessment = (token: string) => patientData(apiClient.POST('/v1/patients/me/entry/start', { headers: headers(token) }));
export const finishPatientEntry = (token: string) => patientData(apiClient.POST('/v1/patients/me/entry/complete', { headers: headers(token) }));
