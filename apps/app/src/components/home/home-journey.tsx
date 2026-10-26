'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft, CalendarDays, CheckCheck, ClipboardList, HeartPulse, ShoppingBag, Users, Wallet } from 'lucide-react';
import { useOptionalPatientEntry } from '@/components/auth/patient-entry-gate';
import { getAssessmentResult } from '@/lib/assessment-api';
import { HomeOrderProgress } from './home-order-progress';
import { homePendingAction, homeResultSummary } from '@/lib/home-status';
import type { PatientJourney } from '@/lib/patient-journey-api';
import { usePatientResource } from '@/lib/use-patient-resource';

function Hero({ label, title, children, action, footer, busy = false }: { label: string; title: string; children: ReactNode; action?: ReactNode; footer?: ReactNode; busy?: boolean }) {
  return <div className="home-hero-frame"><section className="home-next" aria-labelledby="home-next-title" aria-busy={busy}>
    <div className="home-section-heading"><span>{label}</span></div>
    <div className="home-next-stage">
      <div className="home-next-copy"><h2 id="home-next-title">{title}</h2>{children}</div>
      <div className="home-next-action">{action}</div>
      <div className="home-brain" aria-hidden="true"><img src="/images/home/blue-brain-complete.png" alt="" width={1161} height={1355} fetchPriority="high" loading="eager" decoding="async" draggable={false} /></div>
    </div>
    {footer}
  </section></div>;
}

const heroLink = (href: string, label: string) => <Link href={href} className="home-next-link">{label}<ArrowLeft size={17} aria-hidden="true" /></Link>;

function StatusFooter({ data }: { data: PatientJourney }) {
  const entry = useOptionalPatientEntry();
  return <div className="home-status-facts"><span><CheckCheck size={17} aria-hidden="true" />{data.onboarding.isComplete ? 'پروندهٔ سلامت تکمیل است' : entry?.status?.birthDate ? 'مشخصات پایه ثبت شده' : 'حساب کاربری فعال است'}</span>{data.home.latestAssessment && <span><ClipboardList size={17} aria-hidden="true" />ارزیابی ثبت‌شده</span>}{data.home.activeTreatmentPlanId && <Link href={`/treatment?planId=${encodeURIComponent(data.home.activeTreatmentPlanId)}`}><HeartPulse size={17} aria-hidden="true" />برنامهٔ درمان فعال</Link>}</div>;
}

function AssessmentStatus({ data, token }: { data: PatientJourney; token: string }) {
  const latest = data.home.latestAssessment!;
  const result = usePatientResource(useCallback(() => getAssessmentResult(token, latest.id), [token, latest.id]));
  const summary = result.data ? homeResultSummary(result.data.resultSnapshot) : null;
  return <Hero label="وضعیت شما" title={summary?.title ?? 'ارزیابی شما ثبت شده است'} busy={result.loading}
    action={heroLink(`/assessment/result?submissionId=${encodeURIComponent(latest.id)}`, 'مشاهدهٔ نتیجه')} footer={<StatusFooter data={data} />}>
    <p className="home-next-description">{result.loading ? 'در حال دریافت آخرین نتیجهٔ ارزیابی…' : result.error ? 'خلاصهٔ نتیجه دریافت نشد. برای بررسی وضعیت دسترسی، صفحهٔ نتیجه را باز کنید.' : summary?.description}</p>
    <p className="home-result-meta">{latest.title} · {new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(latest.completedAt))}</p>
    {result.error && <button type="button" className="home-inline-action" onClick={() => void result.reload()}>دریافت دوبارهٔ نتیجه</button>}
  </Hero>;
}

function PendingActions({ actions, token }: { actions: PatientJourney['home']['actions']; token: string }) {
  const [expanded, setExpanded] = useState(false);
  if (actions.length === 0) return null;
  const shown = expanded ? actions : actions.slice(0, 3);
  return <section className="home-pending" aria-labelledby="home-pending-title">
    <div className="home-section-heading"><div><h2 id="home-pending-title">اقدام‌های پیش رو</h2><p>پیگیری‌های مرتبط با خدمات شما</p></div></div>
    <div id="home-pending-list" className="home-pending-list">{shown.map(action => {
      if (action.code === 'TRACK_ORDER' && action.resourceId) return <HomeOrderProgress key={`order:${action.resourceId}`} orderId={action.resourceId} token={token} />;
      const item = homePendingAction(action);
      const Icon = action.code === 'OPEN_APPOINTMENT' ? CalendarDays : action.code === 'CONTINUE_PAYMENT' ? Wallet : action.code === 'TRACK_ORDER' ? ShoppingBag : action.code === 'OPEN_COUPLE_LINK' || action.code === 'OPEN_COUPLE_ASSESSMENT' ? Users : action.code === 'VIEW_TREATMENT_PLAN' ? HeartPulse : ClipboardList;
      return <Link className="home-pending-item" href={item.href} key={`${action.code}:${action.resourceId ?? ''}`}><span className="home-pending-icon"><Icon size={22} strokeWidth={1.5} aria-hidden="true" /></span><div><h3>{item.title}</h3><p>{item.description}</p></div><ArrowLeft size={18} aria-hidden="true" /></Link>;
    })}</div>
    {actions.length > 3 && <button type="button" className="home-inline-action" aria-controls="home-pending-list" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? 'نمایش کمتر' : 'پیگیری‌های بیشتر'}</button>}
  </section>;
}

export function HomeJourney({ journey, token }: { journey: ReturnType<typeof usePatientResource<PatientJourney>>; token: string }) {
  const reload = journey.reload;
  useEffect(() => {
    const visible = () => { if (document.visibilityState === 'visible') void reload(); };
    const restored = (event: PageTransitionEvent) => { if (event.persisted) void reload(); };
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('pageshow', restored);
    return () => { document.removeEventListener('visibilitychange', visible); window.removeEventListener('pageshow', restored); };
  }, [reload]);
  const data = journey.data;
  if (journey.loading) return <Hero label="همراه شما" title="در حال دریافت وضعیت شما" busy action={<span className="home-next-loading-action" aria-hidden="true" />}><p className="home-next-description" role="status">پرونده و پیگیری‌های شما در حال بررسی است…</p></Hero>;
  if (journey.error || !data?.home) return <Hero label="وضعیت شما" title="اطلاعات شما دریافت نشد" action={<button type="button" className="home-next-link" onClick={() => void journey.reload()}>دریافت دوباره</button>}><p className="home-next-description" role="alert">فعلاً امکان نمایش وضعیت پرونده و پیگیری‌ها وجود ندارد. دوباره تلاش کنید.</p></Hero>;
  return <>
    {data.home.latestAssessment ? <AssessmentStatus key={data.home.latestAssessment.id} data={data} token={token} /> : <Hero label="وضعیت شما" title="خانهٔ سلامت شما" action={heroLink('/assessment?view=history', 'ارزیابی‌های من')} footer={<StatusFooter data={data} />}><p className="home-next-description">نتیجهٔ ارزیابی‌ها و پیگیری خدماتتان را اینجا ببینید.</p></Hero>}
    <PendingActions actions={data.home.actions} token={token} />
  </>;
}