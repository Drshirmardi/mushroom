import { appUrl, dashboardUrl, resolvePostLoginUrl } from "../lib/api";

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

export function invitationDestination(candidate?: string): string | null {
    if (!candidate) return null;
    try {
        const url = new URL(candidate);
        if (url.origin !== new URL(appUrl).origin || url.username || url.password || !/^\/assessment\/marriage\/requests\/[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(url.pathname)) return null;
        return url.toString();
    } catch { return null; }
}
