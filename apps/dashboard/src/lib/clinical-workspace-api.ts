import { type components, withRequestTimeout } from "@sabz-zendegi/api-client";

import { apiClient } from "@/lib/api";

export type ClinicalRecordKind = components["schemas"]["ReconcileClinicalRecordDto"]["kind"];
export type ClinicalRevision = components["schemas"]["ClinicalRecordRevisionResponseDto"];
export type ClinicalNoteRevision = components["schemas"]["ClinicalNoteRevisionResponseDto"];
export type ClinicalWorkspace = components["schemas"]["AdminClinicalWorkspaceResponseDto"];
export type CreateClinicalNoteInput = components["schemas"]["CreateClinicalNoteDto"];
export type SaveClinicalNoteInput = components["schemas"]["SaveClinicalNoteDto"];
export type ReconcileClinicalRecordInput = components["schemas"]["ReconcileClinicalRecordDto"];
export type ReviseClinicalRecordInput = components["schemas"]["ReviseClinicalRecordDto"];

export class ClinicalWorkspaceApiError extends Error {
  constructor(public readonly status: number, public readonly code: string | null = null) {
    super(code ?? "CLINICAL_WORKSPACE_REQUEST_FAILED");
  }
}

const authorization = (accessToken: string) => ({ authorization: `Bearer ${accessToken}` });

async function dataOrThrow<T>(request: Promise<{ data?: T; error?: unknown; response: Response }>): Promise<T> {
  try {
    const { data, error, response } = await withRequestTimeout(request);
    if (response.ok && data) return data;
    const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : null;
    throw new ClinicalWorkspaceApiError(response.status, code);
  } catch (error) {
    if (error instanceof ClinicalWorkspaceApiError) throw error;
    throw new ClinicalWorkspaceApiError(0);
  }
}

export const getClinicalWorkspace = (accessToken: string, patientId: string) => dataOrThrow<ClinicalWorkspace>(
  apiClient.GET("/v1/admin/patients/{patientId}/clinical-workspace", { headers: authorization(accessToken), params: { path: { patientId } } }),
);

export const createClinicalNote = (accessToken: string, patientId: string, encounterId: string, body: CreateClinicalNoteInput) => dataOrThrow<components["schemas"]["ClinicalNoteResponseDto"]>(
  apiClient.POST("/v1/admin/patients/{patientId}/clinical-workspace/encounters/{encounterId}/notes", { headers: authorization(accessToken), params: { path: { patientId, encounterId } }, body }),
);

export const saveClinicalNote = (accessToken: string, patientId: string, noteId: string, body: SaveClinicalNoteInput) => dataOrThrow<components["schemas"]["ClinicalNoteResponseDto"]>(
  apiClient.POST("/v1/admin/patients/{patientId}/clinical-workspace/notes/{noteId}/revisions", { headers: authorization(accessToken), params: { path: { patientId, noteId } }, body }),
);

export const signClinicalNote = (accessToken: string, patientId: string, noteId: string, revisionNumber: number, expectedRevision: number) => dataOrThrow<components["schemas"]["ClinicalNoteResponseDto"]>(
  apiClient.POST("/v1/admin/patients/{patientId}/clinical-workspace/notes/{noteId}/sign", { headers: authorization(accessToken), params: { path: { patientId, noteId } }, body: { revisionNumber, expectedRevision } }),
);

export const publishClinicalNote = (accessToken: string, patientId: string, noteId: string, revisionNumber: number, expectedRevision: number) => dataOrThrow<components["schemas"]["ClinicalNoteResponseDto"]>(
  apiClient.POST("/v1/admin/patients/{patientId}/clinical-workspace/notes/{noteId}/publish", { headers: authorization(accessToken), params: { path: { patientId, noteId } }, body: { revisionNumber, expectedRevision } }),
);

export const reconcileClinicalRecord = (accessToken: string, patientId: string, body: ReconcileClinicalRecordInput) => dataOrThrow<components["schemas"]["ClinicalRecordResponseDto"]>(
  apiClient.POST("/v1/admin/patients/{patientId}/clinical-workspace/records", { headers: authorization(accessToken), params: { path: { patientId } }, body }),
);

export const saveClinicalRecord = (accessToken: string, patientId: string, kind: ClinicalRecordKind, recordId: string, body: ReviseClinicalRecordInput) => dataOrThrow<components["schemas"]["ClinicalRecordResponseDto"]>(
  apiClient.POST("/v1/admin/patients/{patientId}/clinical-workspace/records/{kind}/{recordId}/revisions", { headers: authorization(accessToken), params: { path: { patientId, kind, recordId } }, body }),
);

export const signClinicalRecord = (accessToken: string, patientId: string, kind: ClinicalRecordKind, recordId: string, revisionNumber: number, expectedRevision: number) => dataOrThrow<components["schemas"]["ClinicalRecordResponseDto"]>(
  apiClient.POST("/v1/admin/patients/{patientId}/clinical-workspace/records/{kind}/{recordId}/sign", { headers: authorization(accessToken), params: { path: { patientId, kind, recordId } }, body: { revisionNumber, expectedRevision } }),
);
