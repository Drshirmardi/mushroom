import { dashboardUrl, resolvePostLoginUrl } from "../lib/api";

export function postAuthenticationUrl(roles: string[], next: string | null): string {
    if (next) return resolvePostLoginUrl(next);
    return roles.some(role => ["ADMIN", "DOCTOR", "STAFF"].includes(role))
        ? dashboardUrl
        : resolvePostLoginUrl(null);
}

export function landingLoginUrl(next?: string): string {
    const query = new URLSearchParams({ login: "1" });
    if (next) query.set("next", next);
    return `/?${query}`;
}
