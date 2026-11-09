'use client';
import { BrandLogo } from '@/components/shared/brand-logo';
import { AppLoading } from '@/components/shared/heartbeat-loader';
import { invitationContext, invitationServiceRoute, rememberInvitationActor, restoredInvitation, subscribeInvitation } from '@/lib/marriage-context';
import { rememberOnboardingReturn, marriageReturn, clearOnboardingReturn } from '@/lib/marriage-return';
import { createContext, useCallback, useContext, useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuthSessionSnapshot, useOptionalAuthSession } from './session-gate';
import { getPatientEntry, type PatientEntryStatus } from '@/lib/patient-entry-api';
import { usePatientResource } from '@/lib/use-patient-resource';

const EntryContext = createContext<{ status: PatientEntryStatus | null; reload: () => Promise<PatientEntryStatus | null>; refresh: () => Promise<PatientEntryStatus | null> } | null>(null);
function EntryWait({ error, retry }: { error?: string | null; retry?: () => void }) {
  if (!error) return <AppLoading />;
  return <main className="entry-screen" dir="rtl"><div className="entry-wait" role={error ? 'alert' : 'status'}><span className="entry-mark entry-mark--brand"><BrandLogo /></span>{error ? <><p>اطلاعات ورود دریافت نشد.</p><button type="button" className="entry-primary" onClick={retry}>تلاش دوباره</button></> : null}</div></main>;
}
export function PatientEntryGate({ children }: { children: ReactNode }) {
  const session = useOptionalAuthSession(); const snapshot = useAuthSessionSnapshot();
  const pathname = usePathname(); const search = useSearchParams(); const query = search.toString(); const directContext = invitationContext(pathname,query); const router = useRouter();
  const token = session?.authentication.accessToken;
  const userId = session?.authentication.user.id;
  const stored = useSyncExternalStore(subscribeInvitation, () => userId ? restoredInvitation(userId) : null, () => null);
  const contextId = directContext ?? (invitationServiceRoute(pathname) ? stored : null);
  useEffect(() => { rememberInvitationActor(userId,directContext); }, [userId,directContext,pathname,query]);
  const currentToken = useRef(token);
  useEffect(() => { currentToken.current = token; }, [token]);
  const roles = session?.authentication.user.roles;
  const patient = !!roles?.includes('PATIENT') && !roles.some(role => ['ADMIN', 'DOCTOR', 'STAFF'].includes(role));
  const resource = usePatientResource(useCallback(() => userId && currentToken.current && patient ? getPatientEntry(currentToken.current) : Promise.resolve(null), [userId, patient]));
  const required = resource.data?.required;
  const invitationRoute = !!contextId && invitationServiceRoute(pathname);
  useEffect(() => {
    if (!patient && session && pathname === '/welcome') { router.replace('/'); return; }
    if (!patient || resource.loading || resource.error || !resource.data) return;
    if (contextId && pathname === '/welcome' && resource.data.phase !== 'PROFILE') { router.replace(`/assessment/marriage/requests/${contextId}`); return; }
    if (required && !invitationRoute && pathname !== '/welcome') { if (userId) rememberOnboardingReturn(userId, pathname, query); router.replace('/welcome'); return; }
    if (!required && pathname === '/welcome') router.replace(userId ? marriageReturn(userId) ?? '/' : '/');
    if (!required && userId) clearOnboardingReturn(userId, pathname, query);
  }, [patient, session, resource.loading, resource.error, resource.data, required, pathname, query, router, invitationRoute, contextId, userId]);
  if (!snapshot || snapshot.status === 'checking') return <EntryWait />;
  if (snapshot.status === 'unavailable') return <EntryWait error="unavailable" retry={() => window.location.reload()} />;
  if (!patient) return session && pathname === '/welcome' ? <EntryWait /> : children;
  if (resource.loading) return <EntryWait />;
  if (resource.error) return <EntryWait error={resource.error} retry={() => void resource.reload()} />;
  if (!resource.data || required && !invitationRoute && pathname !== '/welcome' || !required && pathname === '/welcome') return <EntryWait />;
  return <EntryContext.Provider value={{ status: resource.data, reload: resource.reload, refresh: resource.refresh }}>{children}</EntryContext.Provider>;
}
export function usePatientEntry() { const context = useContext(EntryContext); if (!context) throw new Error('Patient entry provider required'); return context; }
export function useOptionalPatientEntry() { return useContext(EntryContext); }
