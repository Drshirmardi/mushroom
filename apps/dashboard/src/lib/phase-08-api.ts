import { apiBaseUrl } from "@/lib/api";

export type DashboardNotification = { id: string; category: "FINANCIAL" | "REMINDER" | "TREATMENT" | "CONTENT" | "SYSTEM"; title: string; body: string; readAt: string | null; createdAt: string; recipientDisplayName?: string | null };
export type ContentCategory = { id: string; name: string; slug: string };
export type DashboardArticle = { id: string; slug: string; title: string; summary: string | null; body: string; categoryId: string; category: ContentCategory; publicationStatus: "DRAFT" | "PUBLISHED" | "ARCHIVED"; publishedAt: string | null; updatedAt: string };

export class PhaseEightApiError extends Error { constructor(public readonly status: number, public readonly code: string | null = null) { super(code ?? "PHASE_EIGHT_REQUEST_FAILED"); } }

const request = async <T>(accessToken: string, path: string, init?: RequestInit): Promise<T> => {
  try {
    const response = await fetch(new URL(path, apiBaseUrl), { ...init, headers: { authorization: `Bearer ${accessToken}`, ...(init?.headers ?? {}) } });
    const data: unknown = await response.json().catch(() => null);
    if (response.ok && data !== null) return data as T;
    const code = data && typeof data === "object" && "code" in data && typeof data.code === "string" ? data.code : null;
    throw new PhaseEightApiError(response.status, code);
  } catch (error) { if (error instanceof PhaseEightApiError) throw error; throw new PhaseEightApiError(0); }
};

export const listDashboardNotifications = (accessToken: string) => request<{ items: DashboardNotification[] }>(accessToken, "/v1/admin/notifications");
export const listContentCategories = (accessToken: string) => request<{ items: ContentCategory[] }>(accessToken, "/v1/admin/content/categories");
export const listDashboardArticles = (accessToken: string) => request<{ items: DashboardArticle[] }>(accessToken, "/v1/admin/content/articles");
export const createDashboardArticle = (accessToken: string, body: { slug: string; title: string; summary: string; body: string; categoryId: string; publicationStatus: DashboardArticle["publicationStatus"] }) => request<DashboardArticle>(accessToken, "/v1/admin/content/articles", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
export const updateDashboardArticle = (accessToken: string, id: string, body: Partial<Pick<DashboardArticle, "title" | "summary" | "body" | "categoryId" | "publicationStatus" | "slug">>) => request<DashboardArticle>(accessToken, `/v1/admin/content/articles/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

export function dashboardPhaseEightError(error: unknown, fallback: string) { if (error instanceof PhaseEightApiError && error.status === 403) return "اجازهٔ دسترسی به این بخش را ندارید."; return fallback; }
