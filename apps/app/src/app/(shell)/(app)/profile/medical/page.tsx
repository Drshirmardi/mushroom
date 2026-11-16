"use client";

import Link from 'next/link';
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ClipboardList, FileHeart, HeartPulse, Pill, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { LoadingState } from '@/components/shared/skeletons';
import { useAuthSession } from '@/components/auth/session-gate';
import { loadMedicalIntake, type MedicalIntake } from '@/lib/onboarding/patient-onboarding';
import { usePatientResource } from '@/lib/use-patient-resource';
import { optionalFields } from '@/lib/onboarding/intake-form';
import { toP } from '@/lib/format';

function Report({ value }: { value: unknown }) {
  const report = value && typeof value === 'object' ? value as { status?: unknown; items?: unknown } : null;
  if (report?.status === 'NONE') return <p className="text-sm leading-7">ندارم</p>;
  if (report?.status === 'UNKNOWN') return <p className="text-sm leading-7">نمی‌دانم</p>;
  const items = report?.status === 'PRESENT' && Array.isArray(report.items) ? report.items.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())) : [];
  return items.length ? <ul className="list-inside list-disc space-y-1 text-sm leading-7">{items.map((item, index) => <li key={index} className="[overflow-wrap:anywhere]">{item}</li>)}</ul> : <p className="text-sm leading-7 text-muted-foreground">هنوز پاسخ نداده‌اید</p>;
}

const reports = [
  { key: 'allergyReport', label: 'حساسیت‌ها', icon: ShieldCheck },
  { key: 'chronicConditionReport', label: 'بیماری‌های زمینه‌ای', icon: HeartPulse },
  { key: 'currentMedicationReport', label: 'داروهای مصرفی', icon: Pill },
] as const;

function Lifestyle({ snapshot }: { snapshot: MedicalIntake['snapshot'] }) {
  const choices = optionalFields.flatMap(field => {
    const value = snapshot?.[field.key];
    const label = field.options.find(option => option[0] === value)?.[1];
    return value && label ? [{ key: field.key, title: field.label, value: label }] : [];
  });
  const measurements = ([['heightCm', 'قد', 'سانتی‌متر'], ['weightKg', 'وزن', 'کیلوگرم']] as const).flatMap(([key, title, unit]) => snapshot?.[key] == null ? [] : [{ key, title, value: `${toP(snapshot[key])} ${unit}` }]);
  const items = [...measurements, ...choices];
  if (!items.length) return null;
  return <section className="rounded-2xl border border-border bg-white p-4 sm:p-5" aria-labelledby="lifestyle-heading"><h2 id="lifestyle-heading" className="mb-4 text-sm font-medium">اطلاعات تکمیلی شما</h2><dl className="divide-y divide-border">{items.map(item => <div key={item.key} className="flex flex-wrap justify-between gap-2 py-3 text-sm leading-7"><dt className="text-muted-foreground">{item.title}</dt><dd className="m-0 [overflow-wrap:anywhere]">{item.value}</dd></div>)}</dl></section>;
}

export default function MedicalProfilePage() {
  const router = useRouter();
  const { authentication } = useAuthSession();
  const resource = usePatientResource(useCallback(() => loadMedicalIntake(authentication.accessToken), [authentication.accessToken]));
  const complete = resource.data?.submissionState === 'COMPLETE';
  const snapshot = resource.data?.snapshot;
  return <main dir="rtl"><PageHeader title="پرونده پزشکی" onBack={() => router.push(new URLSearchParams(window.location.search).get('from') === 'home' ? '/' : '/profile')} />
    <div className="space-y-4 px-4 pb-6 pt-4">
      {resource.loading ? <LoadingState label="در حال دریافت پرونده پزشکی…" variant="detail" /> : resource.error ? <div role="alert" className="space-y-2 rounded-2xl border border-border bg-white p-4 text-sm leading-7"><p>{resource.error}</p><button type="button" className="min-h-11 font-medium text-primary" onClick={() => void resource.reload()}>دریافت دوباره</button></div> : resource.data && <>
        <section className="space-y-4 rounded-2xl border border-border bg-white p-4 sm:p-5" aria-label="وضعیت اطلاعات سلامت">
          <div className="flex flex-wrap items-center justify-between gap-2"><span className="inline-flex items-center gap-2 text-sm font-medium"><FileHeart size={20} aria-hidden="true" />اطلاعات سلامت شما</span><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{complete ? 'ثبت شده' : 'نیازمند تکمیل'}</span></div>
          <p className="text-sm leading-7 text-muted-foreground">{complete ? 'اطلاعاتی که خودتان ثبت کرده‌اید؛ هر زمان لازم بود به‌روزشان کنید.' : 'دربارهٔ حساسیت‌ها، بیماری‌های زمینه‌ای و داروهای مصرفی‌تان بگویید. «نمی‌دانم» هم یک پاسخ معتبر است.'}</p>
          <Link href="/onboarding?from=medical" className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">{complete ? 'ویرایش اطلاعات سلامت' : 'تکمیل اطلاعات سلامت'}<ArrowLeft size={16} aria-hidden="true" /></Link>
        </section>
        <div className="space-y-3">{reports.map(({ key, label, icon: Icon }) => <section key={key} className="space-y-2 rounded-2xl border border-border bg-white p-4 sm:p-5" aria-labelledby={key}><h2 id={key} className="flex items-center gap-2 text-sm font-medium"><Icon size={18} className="shrink-0 text-primary" aria-hidden="true" />{label}</h2><Report value={snapshot?.[key]} /></section>)}</div>
        <Lifestyle snapshot={snapshot ?? null} />
        <Link href="/profile/health-record" className="flex min-h-11 items-center gap-3 rounded-2xl border border-border bg-white p-4 text-sm leading-7 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"><ClipboardList size={20} className="shrink-0 text-primary" aria-hidden="true" /><span className="min-w-0 flex-1">خلاصهٔ مشاوره‌های من</span><ArrowLeft size={18} className="shrink-0" aria-hidden="true" /></Link>
      </>}
    </div>
  </main>;
}
