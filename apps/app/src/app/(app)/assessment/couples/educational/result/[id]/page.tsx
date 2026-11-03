"use client";
import { participationLoader } from '@/lib/participation-loader';
import { PatientRequestError } from '@/lib/patient-request';
import { marriageHref } from '@/lib/marriage-context';
import { useCallback, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Users } from 'lucide-react';
import { useAuthSession } from '@/components/auth/session-gate';
import { ServicePage } from '@/components/shared/service-page';
import { PatientResourceState } from '@/components/shared/patient-resource-state';
import { MizajResult } from '@/components/assessments/mizaj-result';
import { getEducationalCoupleResult } from '@/lib/couples-api';
import { usePatientResource } from '@/lib/use-patient-resource';
export default function EducationalCoupleResultPage() {
  const { id } = useParams<{ id: string }>(), { authentication } = useAuthSession();
  const scope = `${id}:${authentication.user.id}`;
  const loader = useMemo(() => participationLoader(async (token: string) => {
    try { return { allowed: true as const, result: await getEducationalCoupleResult(token,scope.split(':')[0]) }; }
    catch (error) { if (error instanceof PatientRequestError && [401,403,404].includes(error.status)) return { allowed: false as const }; throw error; }
  }), [scope]);
  const resource = usePatientResource(useCallback(() => loader.load(authentication.accessToken), [loader,authentication.accessToken]));
  const denied = resource.data?.allowed === false;
  const result = resource.data?.allowed ? resource.data.result : null;
  const reload = resource.refresh;
  useEffect(() => { const update = () => { if (!denied && navigator.onLine && document.visibilityState === 'visible') void reload(); }; const timer = window.setInterval(update, 15000); document.addEventListener('visibilitychange', update); return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', update); }; }, [reload,denied]);
  return <ServicePage title="دو نتیجه در کنار هم" description="دو نتیجهٔ واقعی پاسخ‌ها؛ بدون امتیاز سازگاری جداگانه." icon={Users} backHref={marriageHref(`/assessment/couples/educational/${id}`)} backLabel="ارزیابی مشترک"><PatientResourceState {...resource} retry={() => void reload()} />{denied && <p role="alert">دسترسی به نتیجه مشترک تأیید نشد؛ وضعیت رضایت و حساب خود را بررسی کنید.</p>}{result && <><div className="grid gap-5 lg:grid-cols-2">{result.results.map(result => <section key={result.slot} className="min-w-0 space-y-3"><h2 className="text-lg font-bold">{result.isSelf ? 'نتیجهٔ شما' : 'نتیجهٔ همراه'}{result.roleTitle ? ` · ${result.roleTitle}` : ''}</h2>{result.resultSnapshot.algorithmId === 'DIMENSION_TIEBREAK' ? <MizajResult snapshot={result.resultSnapshot} subjectLabel={result.isSelf ? 'شما' : 'همراه'} /> : <p className="rounded-xl border border-border p-4 text-sm">{String((result.resultSnapshot.resultBand as { title?: string } | null)?.title ?? 'نتیجهٔ قطعی ثبت نشده است')}</p>}</section>)}</div>{result.jointText && <section className="service-card mt-5"><h2>توضیح مشترک این ترکیب</h2><p className="whitespace-pre-wrap text-sm leading-8">{result.jointText}</p></section>}</>}</ServicePage>;
}
