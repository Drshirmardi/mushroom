'use client';
import { createContext, useCallback, useContext, useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthSessionSnapshot, useOptionalAuthSession } from './session-gate';
import { getPatientEntry, type PatientEntryStatus } from '@/lib/patient-entry-api';
import { usePatientResource } from '@/lib/use-patient-resource';

const EntryContext = createContext<{ status: PatientEntryStatus | null; reload: () => Promise<PatientEntryStatus | null> } | null>(null);
function EntryWait({ error, retry }: { error?: string | null; retry?: () => void }) {
  return <main className="entry-screen" dir="rtl"><div className="entry-wait" role={error ? 'alert' : 'status'}><span className="entry-mark" aria-hidden="true" />{error ? <><p>اطلاعات ورود دریافت نشد.</p><button type="button" className="entry-primary" onClick={retry}>تلاش دوباره</button></> : <p>در حال آماده‌سازی…</p>}</div></main>;
}
export function PatientEntryGate({ children }: { children: ReactNode }) {
  const session = useOptionalAuthSession(); const snapshot = useAuthSessionSnapshot();
  const pathname = usePathname(); const router = useRouter();
  const token = session?.authentication.accessToken;
  const roles = session?.authentication.user.roles;
  const patient = !!roles?.includes('PATIENT') && !roles.some(role => ['ADMIN', 'DOCTOR', 'STAFF'].includes(role));
  const resource = usePatientResource(useCallback(() => token && patient ? getPatientEntry(token) : Promise.resolve(null), [token, patient]));
  const required = resource.data?.required;
  useEffect(() => {
    if (!patient && session && pathname === '/welcome') { router.replace('/'); return; }
    if (!patient || resource.loading || resource.error || !resource.data) return;
    if (required && pathname !== '/welcome') router.replace('/welcome');
    if (!required && pathname === '/welcome') router.replace('/');
  }, [patient, session, resource.loading, resource.error, resource.data, required, pathname, router]);
  if (!snapshot || snapshot.status === 'checking') return <EntryWait />;
  if (snapshot.status === 'unavailable') return <EntryWait error="unavailable" retry={() => window.location.reload()} />;
  if (!patient) return session && pathname === '/welcome' ? <EntryWait /> : children;
  if (resource.loading) return <EntryWait />;
  if (resource.error) return <EntryWait error={resource.error} retry={() => void resource.reload()} />;
  if (!resource.data || required && pathname !== '/welcome' || !required && pathname === '/welcome') return <EntryWait />;
  return <EntryContext.Provider value={{ status: resource.data, reload: resource.reload }}>{children}</EntryContext.Provider>;
}
export function usePatientEntry() { const context = useContext(EntryContext); if (!context) throw new Error('Patient entry provider required'); return context; }
export function useOptionalPatientEntry() { return useContext(EntryContext); }
