import { marriageProfileReturn } from './marriage-profile-return';

const legacy = /^\/assessment\/marriage\/(?:new|requests)\/[a-f0-9-]{36}$/i;
const valid = (path: string) => legacy.test(path) || marriageProfileReturn(path) === path;
const key = (userId: string) => `marriage-return:${userId}`;

export function rememberMarriageReturn(userId: string, path: string) {
  if (valid(path)) {
    try { sessionStorage.setItem(key(userId), path); } catch {}
  }
}
export function marriageReturn(userId: string): string | null {
  try {
    const path = sessionStorage.getItem(key(userId));
    return path && valid(path) ? path : null;
  } catch { return null; }
}
export function clearMarriageReturn(userId: string, path: string) {
  if (marriageReturn(userId) === path) {
    try { sessionStorage.removeItem(key(userId)); } catch {}
  }
}

/** Retain the full validated selection while the initial patient entry is completed. */
function onboardingLocation(pathname: string, search: string): string {
  return pathname + (search ? (search.startsWith('?') ? search : '?' + search) : '');
}

export function rememberOnboardingReturn(userId: string, pathname: string, search: string) {
  rememberMarriageReturn(userId, onboardingLocation(pathname, search));
}

export function clearOnboardingReturn(userId: string, pathname: string, search: string) {
  clearMarriageReturn(userId, onboardingLocation(pathname, search));
}
