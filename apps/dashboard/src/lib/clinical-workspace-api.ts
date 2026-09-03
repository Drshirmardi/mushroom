import { apiBaseUrl } from "@/lib/api";

export type ClinicalRecordKind = "DIAGNOSIS" | "ALLERGY" | "CONDITION" | "MEDICATION_STATEMENT";
export type ClinicalRevision = { id: string; revisionNumber: number; previousRevisionId: string | null; state: "DRAFT" | "SIGNED"; content: Record<string, unknown>; isPrivate: boolean; amendmentReasonCategory: string | null; authoredAt: string; authoredByUserId: string | null; signedAt: string | null; signedByUserId: string | null };
export type ClinicalNoteRevision = Omit<ClinicalRevision, "content"> & { content: string; patientSummary: string | null; publishedAt: string | null; publishedByUserId: string | null };
export type ClinicalWorkspace = {
  patientId: string;
  intakeSource: { intakeId: string; revisionId: string; revisionNumber: number } | null;
  encounters: Array<{ id: string; appointmentId: string; state: string; startedAt: string; completedAt: string | null }>;
  notes: Array<{ id: string; encounterId: string; currentRevision: number; currentEffectiveRevision: number | null; latestSignedRevision: number | null; currentPublishedRevision: number | null; revision: ClinicalNoteRevision | null }>;
  records: Array<{ id: string; kind: ClinicalRecordKind; encounterId: string | null; state: string; currentRevision: number; latestSignedRevision: number | null; revision: ClinicalRevision | null }>;
  timeline: Array<{ id: string; type: string; occurredAt: string; encounterId: string | null }>;
};

export class ClinicalWorkspaceApiError extends Error {
  constructor(public readonly status: number, public readonly code: string | null = null) { super(code ?? "CLINICAL_WORKSPACE_REQUEST_FAILED"); }
}

async function request<T>(accessToken: string, path: string, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(new URL(path, apiBaseUrl), { ...init, headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json", ...(init?.headers ?? {}) } });
    const data: unknown = await response.json().catch(() => null);
    if (response.ok && data) return data as T;
    const code = data && typeof data === "object" && "code" in data && typeof data.code === "string" ? data.code : null;
    throw new ClinicalWorkspaceApiError(response.status, code);
  } catch (error) {
    if (error instanceof ClinicalWorkspaceApiError) throw error;
    throw new ClinicalWorkspaceApiError(0);
  }
}

const root = (patientId: string) => `/v1/admin/patients/${encodeURIComponent(patientId)}/clinical-workspace`;

export function getClinicalWorkspace(accessToken: string, patientId: string) { return request<ClinicalWorkspace>(accessToken, root(patientId)); }
export function createClinicalNote(accessToken: string, patientId: string, encounterId: string, input: { expectedRevision: number; content: string; isPrivate: boolean; patientSummary: string | null }) { return request(accessToken, `${root(patientId)}/encounters/${encodeURIComponent(encounterId)}/notes`, { method: "POST", body: JSON.stringify(input) }); }
export function saveClinicalNote(accessToken: string, patientId: string, noteId: string, input: { expectedRevision: number; content: string; isPrivate: boolean; patientSummary: string | null; amendmentReasonCategory?: string | null }) { return request(accessToken, `${root(patientId)}/notes/${encodeURIComponent(noteId)}/revisions`, { method: "POST", body: JSON.stringify(input) }); }
export function signClinicalNote(accessToken: string, patientId: string, noteId: string, revisionNumber: number, expectedRevision: number) { return request(accessToken, `${root(patientId)}/notes/${encodeURIComponent(noteId)}/sign`, { method: "POST", body: JSON.stringify({ revisionNumber, expectedRevision }) }); }
export function publishClinicalNote(accessToken: string, patientId: string, noteId: string, revisionNumber: number, expectedRevision: number) { return request(accessToken, `${root(patientId)}/notes/${encodeURIComponent(noteId)}/publish`, { method: "POST", body: JSON.stringify({ revisionNumber, expectedRevision }) }); }
export function reconcileClinicalRecord(accessToken: string, patientId: string, input: { kind: ClinicalRecordKind; encounterId?: string; sourceIntakeId: string; sourceIntakeRevisionId: string; sourceIntakeRevisionNumber: number; reviewedContent: Record<string, unknown> }) { return request(accessToken, `${root(patientId)}/records`, { method: "POST", body: JSON.stringify(input) }); }
export function saveClinicalRecord(accessToken: string, patientId: string, kind: ClinicalRecordKind, recordId: string, input: { expectedRevision: number; reviewedContent: Record<string, unknown>; amendmentReasonCategory?: string | null }) { return request(accessToken, `${root(patientId)}/records/${kind}/${encodeURIComponent(recordId)}/revisions`, { method: "POST", body: JSON.stringify(input) }); }
export function signClinicalRecord(accessToken: string, patientId: string, kind: ClinicalRecordKind, recordId: string, revisionNumber: number, expectedRevision: number) { return request(accessToken, `${root(patientId)}/records/${kind}/${encodeURIComponent(recordId)}/sign`, { method: "POST", body: JSON.stringify({ revisionNumber, expectedRevision }) }); }
