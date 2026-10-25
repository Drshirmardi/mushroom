import type { components } from '@sabz-zendegi/api-client';
import { withRequestTimeout } from '@sabz-zendegi/api-client';
import { apiClient } from './api';
export type Definition = components['schemas']['ProgramDefinitionResponseDto'];
export type DefinitionInput = components['schemas']['ProgramDefinitionCreateDto'];
export type Presentation = components['schemas']['ProgramMezajDto'];
export type Commercial = components['schemas']['ProgramCommercialConfigDto'];
export type Preview = components['schemas']['ProgramCommercialPreviewDto'];
export class ProgramApiError extends Error { constructor(public status: number, public code: string) { super(code); } }
async function data<T>(request: Promise<{ data?: T; error?: unknown; response: Response }>) {
  const r = await withRequestTimeout(request);
  if (!r.response.ok || r.data === undefined) throw new ProgramApiError(r.response.status, r.error && typeof r.error === 'object' && 'code' in r.error ? String(r.error.code) : 'REQUEST_FAILED');
  return r.data;
}
const headers = (token: string, key?: string) => ({ authorization: `Bearer ${token}`, ...(key ? { 'Idempotency-Key': key } : {}) });
export const listDefinitions = (token: string, page = 1, clinical = false) => data(apiClient.GET(clinical ? '/v1/clinical/program-definitions' : '/v1/admin/program-definitions', { headers: headers(token), params: { query: { page, pageSize: 12 } }, cache: 'no-store' }));
export const createDefinition = (token: string, body: DefinitionInput, key: string) => data(apiClient.POST('/v1/admin/program-definitions/versions', { headers: headers(token), params: { header: { 'Idempotency-Key': key } }, body }));
export const approveDefinition = (token: string, item: Definition) => data(apiClient.POST('/v1/clinical/program-definitions/{id}/approve', { headers: headers(token), params: { path: { id: item.id } }, body: { contentHash: item.contentHash, reviewedProgramAndSafety: true, noAutomaticTherapyActivation: true } }));
export const getPresentation = (token: string, id: string) => data(apiClient.GET('/v1/admin/program-definitions/{id}/mezaj', { headers: headers(token), params: { path: { id } }, cache: 'no-store' }));
export const savePresentation = (token: string, id: string, body: components['schemas']['SaveProgramMezajDto']) => data(apiClient.PUT('/v1/admin/program-definitions/{id}/mezaj', { headers: headers(token), params: { path: { id } }, body }));
export const previewProgram = (token: string, body: Commercial) => data(apiClient.POST('/v1/admin/program-offerings/preview', { headers: headers(token), body }));
export const publishProgram = (token: string, body: components['schemas']['PublishProgramOfferingDto'], key: string) => data(apiClient.POST('/v1/admin/program-offerings', { headers: headers(token), params: { header: { 'Idempotency-Key': key } }, body }));
