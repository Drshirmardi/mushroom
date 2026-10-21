'use client';
import { Suspense, useCallback, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Sparkles } from 'lucide-react';
import { SessionGate, useAuthSession } from '@/components/auth/session-gate';
import { usePatientEntry } from '@/components/auth/patient-entry-gate';
import { AssessmentWizard } from '@/components/assessments/assessment-wizard';
import { finishPatientEntry, saveEntryProfile, startEntryAssessment, type PatientEntryStatus } from '@/lib/patient-entry-api';
import { getAssessmentResult } from '@/lib/assessment-api';
import { homeResultSummary } from '@/lib/home-status';
import { usePatientResource } from '@/lib/use-patient-resource';
import { toP } from '@/lib/format';
import { persianBirthDate, persianDateParts } from '@/lib/persian-birth-date';

const labels = ['مشخصات شما', 'آزمون شما', 'نتیجهٔ شما'];
const errorMessage = 'انجام نشد؛ اطلاعات و ارتباط اینترنت را بررسی و دوباره تلاش کنید.';
const months = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

function Profile({ status, token, onSaved }: { status: PatientEntryStatus; token: string; onSaved: () => Promise<unknown> }) {
  const [firstName, setFirstName] = useState(status.firstName ?? ''); const [lastName, setLastName] = useState(status.lastName ?? '');
  const savedDate = status.birthDate ? persianDateParts(new Date(`${status.birthDate}T00:00:00Z`)) : null;
  const [year, setYear] = useState(savedDate ? String(savedDate.year) : ''); const [month, setMonth] = useState(savedDate ? String(savedDate.month) : ''); const [day, setDay] = useState(savedDate ? String(savedDate.day) : '');
  const currentYear = persianDateParts(new Date()).year;
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const save = async (event: FormEvent) => { event.preventDefault(); if (busy) return; const birthDate = persianBirthDate(Number(year), Number(month), Number(day)); if (!birthDate || birthDate > new Date().toISOString().slice(0, 10)) { setError('تاریخ تولد را درست انتخاب کنید.'); return; } setBusy(true); setError(''); try { await saveEntryProfile(token, { firstName: firstName.trim(), lastName: lastName.trim(), birthDate }); await onSaved(); } catch { setError(errorMessage); } finally { setBusy(false); } };
  return <div className="entry-profile-layout"><div className="entry-copy"><span className="entry-eyebrow">شروع آشنایی</span><h1>اول، کمی از شما</h1><p>مشخصاتتان را ثبت کنید؛ بعد سراغ آزمون می‌رویم.</p><div className="entry-brain" aria-hidden="true"><img src="/images/home/blue-brain-complete.png" alt="" width={1161} height={1355} /></div></div><form onSubmit={save} className="entry-form">
    <label>نام<input required autoComplete="given-name" maxLength={80} value={firstName} onChange={event => setFirstName(event.target.value)} disabled={busy} /></label>
    <label>نام خانوادگی<input required autoComplete="family-name" maxLength={100} value={lastName} onChange={event => setLastName(event.target.value)} disabled={busy} /></label>
    <fieldset className="entry-birth"><legend>تاریخ تولد</legend><div><select required aria-label="روز تولد" value={day} disabled={busy} onChange={event => setDay(event.target.value)}><option value="">روز</option>{Array.from({ length: 31 }, (_, index) => <option key={index} value={index + 1}>{toP(index + 1)}</option>)}</select><select required aria-label="ماه تولد" value={month} disabled={busy} onChange={event => setMonth(event.target.value)}><option value="">ماه</option>{months.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</select><select required aria-label="سال تولد" value={year} disabled={busy} onChange={event => setYear(event.target.value)}><option value="">سال</option>{Array.from({ length: 131 }, (_, index) => <option key={index} value={currentYear - index}>{toP(currentYear - index)}</option>)}</select></div></fieldset>
    {error && <p role="alert" className="entry-error">{error}</p>}
    <button className="entry-primary" disabled={busy || !firstName.trim() || !lastName.trim() || !year || !month || !day}>{busy ? 'در حال ثبت…' : 'ثبت و ادامه'}<ArrowLeft size={18} aria-hidden="true" /></button>
  </form></div>;
}

function Result({ id, token, onEnter }: { id: string; token: string; onEnter: () => Promise<void> }) {
  const result = usePatientResource(useCallback(() => getAssessmentResult(token, id), [token, id]));
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const summary = result.data ? homeResultSummary(result.data.resultSnapshot) : null;
  const value = result.data?.resultSnapshot as Record<string, unknown> | null;
  const profile = value?.profile && typeof value.profile === 'object' ? value.profile as Record<string, unknown> : null;
  const notes = Array.isArray(profile?.strengths) ? profile.strengths.filter((item): item is string => typeof item === 'string').slice(0, 3) : [];
  const dimensions = Array.isArray(value?.dimensionTitles) ? value.dimensionTitles.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object') : [];
  const tendencies = (['primary', 'secondary'] as const).flatMap(key => { const title = dimensions.find(item => item.id === value?.[key])?.title; return typeof title === 'string' ? [{ key, title }] : []; });
  const enter = async () => { if (busy) return; setBusy(true); setError(''); try { await onEnter(); } catch { setError(errorMessage); setBusy(false); } };
  return <div className="entry-result"><div className="entry-result-heading" aria-live="polite" aria-atomic="true"><span className="entry-result-icon"><Sparkles size={24} aria-hidden="true" /></span><span className="entry-eyebrow">نتیجهٔ ثبت‌شدهٔ شما</span><h1>{summary?.title ?? (result.error ? 'نتیجه ثبت شده است' : 'در حال دریافت نتیجه…')}</h1>{(result.error || !profile && !result.loading) && <p>{result.error ? 'نمایش جزئیات فعلاً ممکن نیست؛ نتیجه از صفحهٔ خانه هم در دسترس است.' : 'بر اساس پاسخ‌های ثبت‌شدهٔ شما'}</p>}</div>
    {profile && typeof profile.summary === 'string' && <p className="entry-result-summary">{profile.summary}</p>}
    {tendencies.length > 0 && <dl className="entry-result-dimensions">{tendencies.map(item => <div key={item.key}><dt>{item.key === 'primary' ? 'گرایش غالب' : 'گرایش همراه'}</dt><dd>{item.title}</dd></div>)}</dl>}
    {notes.length > 0 && <ul className="entry-result-notes">{notes.map((note, index) => <li key={index}><Check size={18} aria-hidden="true" />{note}</li>)}</ul>}
    {result.error && <button className="entry-secondary" onClick={() => void result.reload()}>دریافت دوبارهٔ جزئیات</button>}
    <p className="entry-result-caption">این نتیجه توصیف آموزشیِ پاسخ‌های شماست.</p>
    {error && <p role="alert" className="entry-error">{error}</p>}
    <button className="entry-primary" onClick={() => void enter()} disabled={busy}>{busy ? 'در حال ورود…' : 'ورود به خانهٔ من'}<ArrowLeft size={18} aria-hidden="true" /></button>
  </div>;
}

function Welcome() {
  const { authentication } = useAuthSession(); const { status, reload } = usePatientEntry(); const router = useRouter();
  const token = authentication.accessToken; const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const refreshed = useCallback(() => { void reload(); }, [reload]);
  if (!status || !status.required) return null;
  const phase = status.phase === 'PROFILE' ? 0 : status.phase === 'RESULT' ? 2 : 1;
  const start = async () => { if (busy) return; setBusy(true); setError(''); try { await startEntryAssessment(token); await reload(); } catch { setError(errorMessage); } finally { setBusy(false); } };
  const enter = async () => { await finishPatientEntry(token); await reload(); router.replace('/'); };
  return <main className="entry-screen" dir="rtl"><div className="entry-container"><header className="entry-header"><span className="entry-brand"><span className="entry-mark" aria-hidden="true" />همراه سلامت</span><span className="entry-step-count">گام {toP(phase + 1)} از ۳</span></header>
    <ol className="entry-progress" aria-label="مراحل شروع">{labels.map((label, index) => <li key={label} data-active={index === phase} data-done={index < phase} aria-current={index === phase ? 'step' : undefined}><span>{index < phase ? <Check size={15} aria-hidden="true" /> : toP(index + 1)}</span>{label}</li>)}</ol>
    <section className={`entry-card ${status.submissionId && status.phase === 'ASSESSMENT' ? 'entry-card--quiz' : ''}`}>
      {status.phase === 'UNAVAILABLE' ? <div className="entry-unavailable"><h1>آزمون فعلاً در دسترس نیست</h1><p>پاسخ‌های ثبت‌شده محفوظ‌اند. کمی بعد دوباره تلاش کنید.</p><button className="entry-primary" onClick={() => void reload()}>بررسی دوباره</button></div> : status.phase === 'PROFILE' ? <Profile status={status} token={token} onSaved={reload} /> : status.phase === 'RESULT' && status.submissionId ? <Result id={status.submissionId} token={token} onEnter={enter} /> : status.submissionId ? <><div className="entry-quiz-heading"><span className="entry-eyebrow">آزمون شما</span><h1>{status.assessmentTitle}</h1></div><AssessmentWizard entry={{ submissionId: status.submissionId, onComplete: refreshed }} /></> : <div className="entry-start"><div className="entry-brain" aria-hidden="true"><img src="/images/home/blue-brain-complete.png" alt="" width={1161} height={1355} /></div><span className="entry-eyebrow">آماده‌اید؟</span><h1>{status.assessmentTitle ?? 'آزمون شما'}</h1><p>هر بار یک سؤال؛ پاسخ‌ها با زدن «ادامه» ذخیره می‌شوند.</p>{error && <p role="alert" className="entry-error">{error}</p>}<button className="entry-primary" disabled={busy} onClick={() => void start()}>{busy ? 'در حال آماده‌سازی…' : 'شروع آزمون'}<ArrowLeft size={18} aria-hidden="true" /></button></div>}
    </section>
  </div></main>;
}
export default function WelcomePage() { return <SessionGate><Suspense fallback={<main className="entry-screen" role="status">در حال آماده‌سازی…</main>}><Welcome /></Suspense></SessionGate>; }
