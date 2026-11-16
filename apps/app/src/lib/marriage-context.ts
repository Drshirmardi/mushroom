const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export function invitationContext(pathname: string, search: string): string | null {
 const match = /^\/assessment\/marriage\/requests\/([^/]+)$/.exec(pathname);
 if (!match && pathname !== '/welcome' && !invitationServiceRoute(pathname)) return null;
 const id = match?.[1] ?? new URLSearchParams(search).get('marriageRequestId');
 return id && uuid.test(id) ? id : null;
}
export function marriageHref(href: string): string {
 if (typeof window === 'undefined') return href;
 const id = currentInvitationContext();
 if (!id || !href.startsWith('/') || href.startsWith('//')) return href;
 const url = new URL(href, window.location.origin);
 if (!invitationServiceRoute(url.pathname) && url.pathname !== '/welcome') return href;
 url.searchParams.set('marriageRequestId',id);
 return url.pathname+url.search+url.hash;
}
export function currentInvitationContext(): string | null {
 if (typeof window === 'undefined') return null;
 return invitationContext(window.location.pathname,window.location.search) ?? (actor ? restoredInvitation(actor) : null);
}

let actor: string | null = null;
export function rememberInvitationActor(userId: string | undefined, id: string | null) {
 actor = userId ?? null;
 if (userId && id) { try { sessionStorage.setItem('marriage-context:'+userId,id); const intent = new URLSearchParams(window.location.search).get('intentId'); if (intent && uuid.test(intent) && ['/profile/wallet/pay','/profile/wallet/payment-result'].includes(window.location.pathname)) sessionStorage.setItem(`marriage-intent:${userId}:${intent}`,id); window.dispatchEvent(new Event('marriage-context-change')); } catch {} }
}
export function storedInvitation(userId: string): string | null {
 try { const id = sessionStorage.getItem('marriage-context:'+userId); return id && uuid.test(id) ? id : null; } catch { return null; }
}
export function invitationServiceRoute(path: string) {
 return /^\/assessment\/marriage\/requests\/[^/]+$/.test(path) || /^\/assessment\/couples\/educational\/(?:result\/)?[^/]+$/.test(path) || ['/assessment/resume','/assessment/result','/profile/edit','/profile/wallet/pay','/profile/wallet/payment-result'].includes(path);
}

export function subscribeInvitation(listener: () => void) {
 window.addEventListener('marriage-context-change', listener);
 window.addEventListener('storage', listener);
 return () => { window.removeEventListener('marriage-context-change', listener); window.removeEventListener('storage', listener); };
}

export function restoredInvitation(userId: string): string | null {
 if (typeof window === 'undefined' || !['/profile/wallet/pay','/profile/wallet/payment-result'].includes(window.location.pathname)) return null;
 const intent = new URLSearchParams(window.location.search).get('intentId');
 if (!intent || !uuid.test(intent)) return null;
 try { const id = sessionStorage.getItem(`marriage-intent:${userId}:${intent}`); return id && uuid.test(id) ? id : null; } catch { return null; }
}
