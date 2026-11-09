import { marriageProfileReturn } from './marriage-profile-return';

const legacy = /^\/assessment\/marriage\/(?:new|requests)\/[a-f0-9-]{36}$/i;
const valid = (path: string) => legacy.test(path) ||
  (path.startsWith('/assessment/couples?') && marriageProfileReturn(path) === path);
const key = (userId: string) => `marriage-return:${userId}`;
export function rememberMarriageReturn(userId: string,path: string) { if (valid.test(path)) { try { sessionStorage.setItem(key(userId),path); } catch {} } }
export function marriageReturn(userId: string): string|null { try { const path = sessionStorage.getItem(key(userId)); return path && valid.test(path) ? path : null; } catch { return null; } }
export function clearMarriageReturn(userId: string,path: string) { if (marriageReturn(userId) === path) { try { sessionStorage.removeItem(key(userId)); } catch {} } }
