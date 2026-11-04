'use client';
import { BrandLogo } from '@/components/shared/brand-logo';
import { AsyncButton } from "@/components/shared/async-button";
import { HeartbeatLoader } from "@/components/shared/heartbeat-loader";
import { LoadingState, SkeletonBox } from "@/components/shared/skeletons";
import { AppLoading } from "@/components/shared/heartbeat-loader";
import { MizajChart } from '@/components/assessments/mizaj-chart';
import { marriageReturn } from '@/lib/marriage-return';
import { PaymentChooser } from '@/components/billing/payment-chooser';
import { getBillingIntent } from '@/lib/wallet-billing-api';
import { createEntryPayment, deferEntry } from '@/lib/patient-entry-api';
import { formatRial } from '@/lib/wallet-money';
import { Suspense, useCallback, useState, useEffect, useRef, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Leaf, ListChecks, Sparkles } from 'lucide-react';
import { SessionGate, useAuthSession } from '@/components/auth/session-gate';
import { usePatientEntry } from '@/components/auth/patient-entry-gate';
import { AssessmentWizard } from '@/components/assessments/assessment-wizard';
import { finishPatientEntry, saveEntryProfile, startEntryAssessment, type PatientEntryStatus } from '@/lib/patient-entry-api';
import { getAssessmentResult } from '@/lib/assessment-api';
import { homeResultSummary } from '@/lib/home-status';
import { usePatientResource } from '@/lib/use-patient-resource';
import { toP } from '@/lib/format';
import { persianBirthDate, persianDateParts } from '@/lib/persian-birth-date';
import { ResultRecommendations } from '@/components/programs/result-recommendations';

const entryLabels = ['مشخصات', 'آزمون', 'نتیجه'];
const errorMessage = 'انجام نشد؛ اطلاعات و ارتباط اینترنت را بررسی و دوباره تلاش کنید.';
const months = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

function Profile({ status, token, onSaved }: { status: PatientEntryStatus; token: string; onSaved: () => Promise<unknown> }) {
  const [firstName, setFirstName] = useState(status.firstName ?? ''); const [lastName, setLastName] = useState(status.lastName ?? '');
  const [gender, setGender] = useState<'' | 'FEMALE' | 'MALE'>(status.gender ?? '');
  const savedDate = status.birthDate ? persianDateParts(new Date(`${status.birthDate}T00:00:00Z`)) : null;
  const [year, setYear] = useState(savedDate ? String(savedDate.year) : ''); const [month, setMonth] = useState(savedDate ? String(savedDate.month) : ''); const [day, setDay] = useState(savedDate ? String(savedDate.day) : '');
  const currentYear = persianDateParts(new Date()).year;
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const save = async (event: FormEvent) => { event.preventDefault(); if (busy || !gender) return; const birthDate = persianBirthDate(Number(year), Number(month), Number(day)); if (!birthDate || birthDate > new Date().toISOString().slice(0, 10)) { setError('تاریخ تولد را درست انتخاب کنید.'); return; } setBusy(true); setError(''); try { await saveEntryProfile(token, { firstName: firstName.trim(), lastName: lastName.trim(), gender, birthDate }); await onSaved(); } catch { setError(errorMessage); } finally { setBusy(false); } };
  return <div className="entry-profile-layout"><div className="entry-copy"><span className="entry-eyebrow"><span aria-hidden="true" />خوش آمدید</span><h1>از آشنایی با شما<br /><span>خوشحالیم.</span></h1><p>برای شروع، این چند مشخصات را کامل کنید تا شما را بهتر بشناسیم.</p><div className="entry-next"><span className="entry-next-icon" aria-hidden="true">{status.assessmentRequired ? <ListChecks size={20} /> : <Leaf size={20} />}</span><div><strong>بعد از این مرحله</strong><p>{status.assessmentRequired ? BigInt(status.amountRial??'0')>BigInt(0) ? 'هزینهٔ آزمون را می‌بینید و پس از پرداخت، پاسخ‌گویی را شروع می‌کنید.' : 'آزمون شما شروع می‌شود؛ هر بار فقط یک سؤال.' : 'وارد صفحهٔ اصلی برنامه می‌شوید.'}</p></div></div></div><form onSubmit={save} className="entry-form" aria-label="مشخصات اولیه" aria-busy={busy}>
    <div className="entry-names"><label>نام<input required autoComplete="given-name" placeholder="نام شما" maxLength={80} value={firstName} onChange={event => setFirstName(event.target.value)} disabled={busy} /></label>
    <label>نام خانوادگی<input required autoComplete="family-name" placeholder="نام خانوادگی شما" maxLength={100} value={lastName} onChange={event => setLastName(event.target.value)} disabled={busy} /></label></div>
    <fieldset className="entry-gender"><legend>جنسیت</legend><div>{([['FEMALE', 'خانم'], ['MALE', 'آقا']] as const).map(([value, label]) => <label key={value}><input type="radio" name="gender" value={value} required checked={gender === value} onChange={() => setGender(value)} disabled={busy} />{label}</label>)}</div></fieldset>
    <fieldset className="entry-birth"><legend>تاریخ تولد <span>شمسی</span></legend><div><label><span>روز</span><select required aria-label="روز تولد" value={day} disabled={busy} onChange={event => setDay(event.target.value)}><option value="">انتخاب</option>{Array.from({ length: 31 }, (_, index) => <option key={index} value={index + 1}>{toP(index + 1)}</option>)}</select></label><label><span>ماه</span><select required aria-label="ماه تولد" value={month} disabled={busy} onChange={event => setMonth(event.target.value)}><option value="">انتخاب</option>{months.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</select></label><label><span>سال</span><select required aria-label="سال تولد" value={year} disabled={busy} onChange={event => setYear(event.target.value)}><option value="">انتخاب</option>{Array.from({ length: 131 }, (_, index) => <option key={index} value={currentYear - index}>{toP(currentYear - index)}</option>)}</select></label></div></fieldset>
    {error && <p role="alert" className="entry-error">{error}</p>}
    <div className="entry-form-footer"><button className="entry-primary" disabled={busy || !firstName.trim() || !lastName.trim() || !gender || !year || !month || !day} aria-busy={Boolean(busy)}>{busy ? <><HeartbeatLoader />{'در حال ثبت…'}</> : status.assessmentRequired ? BigInt(status.amountRial??'0')>BigInt(0) ? 'ثبت و ادامه به پرداخت آزمون' : 'ثبت و ادامه به آزمون' : 'ثبت و ورود به خانه'}<ArrowLeft size={18} aria-hidden="true" /></button><p>این مشخصات در پروفایلتان ذخیره می‌شود.</p></div>
  </form></div>;
}

function Result({ id, token, onEnter }: { id: string; token: string; onEnter: (href?: string) => Promise<void> }) {
  const result = usePatientResource(useCallback(() => getAssessmentResult(token, id), [token, id]));
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const summary = result.data ? homeResultSummary(result.data.resultSnapshot) : null;
  const value = result.data?.resultSnapshot as Record<string, unknown> | null;
  const profile = value?.profile && typeof value.profile === 'object' ? value.profile as Record<string, unknown> : null;
  const notes = Array.isArray(profile?.strengths) ? profile.strengths.filter((item): item is string => typeof item === 'string').slice(0, 3) : [];
  const dimensions = Array.isArray(value?.dimensionTitles) ? value.dimensionTitles.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object') : [];
  const tendencies = (['primary', 'secondary'] as const).flatMap(key => { const title = dimensions.find(item => item.id === value?.[key])?.title; return typeof title === 'string' ? [{ key, title }] : []; });
  const enter = async () => { if (busy) return; setBusy(true); setError(''); try { await onEnter(); } catch { setError(errorMessage); setBusy(false); } };
  return <div className="entry-result"><div className="entry-result-heading" aria-live="polite" aria-atomic="true"><span className="entry-result-icon"><Sparkles size={24} aria-hidden="true" /></span><span className="entry-eyebrow">نتیجهٔ ثبت‌شدهٔ شما</span>{result.loading ? <LoadingState variant="detail"><SkeletonBox className="mx-auto h-8 w-3/4" /></LoadingState> : <h1>{summary?.title ?? 'نتیجه ثبت شده است'}</h1>}{(result.error || !profile && !result.loading) && <p>{result.error ? 'نمایش جزئیات فعلاً ممکن نیست؛ نتیجه از صفحهٔ خانه هم در دسترس است.' : 'بر اساس پاسخ‌های ثبت‌شدهٔ شما'}</p>}</div>
    {value?.algorithmId === 'DIMENSION_TIEBREAK' && !!value.scores && typeof value.scores === 'object' && <MizajChart scores={value.scores as Record<string, number>} dimensions={dimensions.flatMap(item => typeof item.id === 'string' && typeof item.title === 'string' ? [{ id:item.id,title:item.title }] : [])} />}
    {profile && typeof profile.summary === 'string' && <p className="entry-result-summary">{profile.summary}</p>}
    {tendencies.length > 0 && <dl className="entry-result-dimensions">{tendencies.map(item => <div key={item.key}><dt>{item.key === 'primary' ? 'گرایش غالب' : 'گرایش همراه'}</dt><dd>{item.title}</dd></div>)}</dl>}
    {notes.length > 0 && <ul className="entry-result-notes">{notes.map((note, index) => <li key={index}><Check size={18} aria-hidden="true" />{note}</li>)}</ul>}
    {result.error && <button className="entry-secondary" onClick={() => void result.reload()}>دریافت دوبارهٔ جزئیات</button>}
    <p className="entry-result-caption">این نتیجه توصیف آموزشیِ پاسخ‌های شماست.</p>
    {error && <p role="alert" className="entry-error">{error}</p>}
    <button className="entry-primary" onClick={() => void enter()} disabled={busy} aria-busy={Boolean(busy)}>{busy ? <><HeartbeatLoader />{'در حال ورود…'}</> : 'ورود به خانهٔ من'}<ArrowLeft size={18} aria-hidden="true" /></button>
    {!result.loading && result.data && <ResultRecommendations token={token} submissionId={id} onNavigate={onEnter} />}
  </div>;
}

function EntryPayment({status,token,reload}:{status:PatientEntryStatus;token:string;reload:()=>Promise<unknown>}){
 const key=useRef<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{if(status.intentId)key.current=crypto.randomUUID();},[status.intentId]);
 const resource=usePatientResource(useCallback(()=>status.intentId?getBillingIntent(token,status.intentId):Promise.resolve(null),[token,status.intentId]));
 const run=async(action:()=>Promise<unknown>)=>{if(busy)return;setBusy(true);setError('');try{await action();await reload();}catch{setError(errorMessage);}finally{setBusy(false);}};
 return <div className="entry-start"><h1>{status.assessmentTitle}</h1><p className="whitespace-pre-wrap">{status.introduction}</p><p>هزینهٔ آزمون: {formatRial(BigInt(status.amountRial??'0'))} تومان</p>{status.intentId?resource.data&&<PaymentChooser accessToken={token} intent={resource.data} onPaid={()=>void reload()} onCancelled={()=>void reload()}/>:<AsyncButton className="entry-primary" disabled={busy} onClick={()=> run(async()=>{const operationKey=key.current??=crypto.randomUUID();const intent=await createEntryPayment(token,operationKey);key.current=crypto.randomUUID();return intent;})}>ادامه به پرداخت</AsyncButton>}{resource.error&&<button className="entry-secondary" onClick={()=>void resource.reload()}>دریافت دوبارهٔ وضعیت پرداخت</button>}{status.allowDeferral&&<AsyncButton className="entry-secondary" disabled={busy} onClick={()=> run(()=>deferEntry(token))}>فعلاً رد می‌کنم و وارد خانه می‌شوم</AsyncButton>}{error&&<p role="alert" className="entry-error">{error}</p>}</div>;
}

function Welcome() {
  const { authentication } = useAuthSession(); const { status, reload, refresh } = usePatientEntry(); const router = useRouter();
  const token = authentication.accessToken; const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const refreshed = useCallback(() => { void reload(); }, [reload]);
  useEffect(()=>{if(status?.phase!=='PAYMENT')return;const update=()=>{if(document.visibilityState==='visible')void refresh();};const timer=window.setInterval(update,5000);document.addEventListener('visibilitychange',update);return()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',update);};},[status?.phase,refresh]);
  if (!status || !status.required) return null;
  const isQuiz = status.phase === 'ASSESSMENT' && !!status.submissionId;
  const labels = status.assessmentRequired ? entryLabels : entryLabels.slice(0, 1);
  const phase = status.phase === 'PROFILE' ? 0 : status.phase === 'RESULT' ? 2 : 1;
  const start = async () => { if (busy) return; setBusy(true); setError(''); try { await startEntryAssessment(token); await reload(); } catch { setError(errorMessage); } finally { setBusy(false); } };
  const enter = async (href?: string) => { await finishPatientEntry(token); if (href) { window.location.assign(href); return; } await reload(); router.replace(marriageReturn(authentication.user.id) ?? '/'); };
  return <main className={`entry-screen ${isQuiz ? 'entry-screen--quiz' : ''}`} dir="rtl"><div className="entry-container"><header className="entry-header"><span className="entry-brand">{!isQuiz && <span className="entry-mark entry-mark--brand"><BrandLogo /></span>}دکتر شیرمردی</span>{!isQuiz && <span className="entry-step-count">شروع همراهی شما</span>}</header>
    {!isQuiz && <ol className="entry-progress" aria-label="مراحل شروع">{labels.map((label, index) => <li key={label} data-active={index === phase} data-done={index < phase} aria-current={index === phase ? 'step' : undefined}><span aria-hidden="true">{index < phase ? <Check size={15} /> : toP(index + 1)}</span><span className="entry-progress-label">{label}</span></li>)}</ol>}
    <section aria-label="تکمیل ورود" className={isQuiz ? 'entry-card--quiz' : 'entry-card'}>
      {status.phase === 'PAYMENT' ? <EntryPayment status={status} token={token} reload={reload}/> : status.phase === 'UNAVAILABLE' ? <div className="entry-unavailable"><h1>آزمون فعلاً در دسترس نیست</h1><p>پاسخ‌های ثبت‌شده محفوظ‌اند. کمی بعد دوباره تلاش کنید.</p><button className="entry-primary" onClick={() => void reload()}>بررسی دوباره</button></div> : status.phase === 'PROFILE' ? <Profile status={status} token={token} onSaved={reload} /> : status.phase === 'RESULT' && status.submissionId ? <Result id={status.submissionId} token={token} onEnter={enter} /> : status.submissionId ? <><div className="entry-quiz-heading"><h1>{status.assessmentTitle}</h1></div><AssessmentWizard entry={{ submissionId: status.submissionId, onComplete: refreshed }} /></> : <div className="entry-start"><span className="entry-start-symbol" aria-hidden="true"><ListChecks size={32} strokeWidth={1.5} /></span><span className="entry-eyebrow">آماده‌اید؟</span><h1>{status.assessmentTitle ?? 'آزمون شما'}</h1><p className="whitespace-pre-wrap">{status.introduction ?? 'پاسخی را انتخاب کنید که به شما نزدیک‌تر است. با زدن «ادامه»، پاسخ همان سؤال ذخیره می‌شود.'}</p><div className="entry-start-note"><Check size={17} aria-hidden="true" />نتیجه در پروفایل شما ذخیره می‌شود.</div>{error && <p role="alert" className="entry-error">{error}</p>}<button className="entry-primary" disabled={busy} onClick={() => void start()} aria-busy={Boolean(busy)}>{busy ? <><HeartbeatLoader />{'در حال آماده‌سازی…'}</> : 'ادامه و شروع آزمون'}<ArrowLeft size={18} aria-hidden="true" /></button></div>}
    </section>
  </div></main>;
}
export default function WelcomePage() { return <SessionGate><Suspense fallback={<AppLoading />}><Welcome /></Suspense></SessionGate>; }
