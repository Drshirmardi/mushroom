"use client";
import { useCallback, useEffect } from 'react';
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
  const resource = usePatientResource(useCallback(() => getEducationalCoupleResult(authentication.accessToken, id), [authentication.accessToken, id]));
  const reload = resource.reload;
  useEffect(() => { const update = () => { if (document.visibilityState === 'visible') void reload(); }; const timer = window.setInterval(update, 15000); document.addEventListener('visibilitychange', update); return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', update); }; }, [reload]);
  return <ServicePage title="دو نتیجه در کنار هم" description="دو نتیجهٔ واقعی پاسخ‌ها؛ بدون امتیاز سازگاری جداگانه." icon={Users} backHref={`/assessment/couples/educational/${id}`} backLabel="ارزیابی مشترک"><PatientResourceState {...resource} retry={() => void reload()} />{resource.data && <><div className="grid gap-5 lg:grid-cols-2">{resource.data.results.map(result => <section key={result.slot} className="min-w-0 space-y-3"><h2 className="text-lg font-bold">{result.isSelf ? 'نتیجهٔ شما' : 'نتیجهٔ همراه'}{result.roleTitle ? ` · ${result.roleTitle}` : ''}</h2>{result.resultSnapshot.algorithmId === 'DIMENSION_TIEBREAK' ? <MizajResult snapshot={result.resultSnapshot} subjectLabel={result.isSelf ? 'شما' : 'همراه'} /> : <p className="rounded-xl border border-border p-4 text-sm">{String((result.resultSnapshot.resultBand as { title?: string } | null)?.title ?? 'نتیجهٔ قطعی ثبت نشده است')}</p>}</section>)}</div>{resource.data.jointText && <section className="service-card mt-5"><h2>توضیح مشترک این ترکیب</h2><p className="whitespace-pre-wrap text-sm leading-8">{resource.data.jointText}</p></section>}</>}</ServicePage>;
}
