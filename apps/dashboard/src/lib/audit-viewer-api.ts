import { type components, withRequestTimeout } from "@sabz-zendegi/api-client";

import { apiClient } from "@/lib/api";

export type AuditViewerPage = components["schemas"]["AuditViewerPageDto"];
export type AuditViewerQuery = { clinicId?: string; from?: string; to?: string; action?: "READ" | "CREATE" | "UPDATE" | "SIGN" | "AMEND" | "PUBLISH" | "EXPORT"; subjectType?: string; actorId?: string; cursor?: string; limit?: number };

export class AuditViewerApiError extends Error {
  constructor(public readonly status: number) { super("Audit viewer request failed."); }
}

export async function getAuditEvents(accessToken: string, query: AuditViewerQuery = {}): Promise<AuditViewerPage> {
  try {
    const { data, response } = await withRequestTimeout(apiClient.GET("/v1/admin/audit-events", { headers: { authorization: `Bearer ${accessToken}` }, params: { query } }));
    if (!response.ok || !data) throw new AuditViewerApiError(response.status);
    return data;
  } catch (error) {
    if (error instanceof AuditViewerApiError) throw error;
    throw new AuditViewerApiError(0);
  }
}
