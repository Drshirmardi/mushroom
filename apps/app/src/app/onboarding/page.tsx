"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, HeartPulse, LoaderCircle, Pencil, ShieldCheck } from 'lucide-react';
import { useAuthSession } from '@/components/auth/session-gate';
import { MedicalDeclarationField } from '@/components/onboarding/medical-declaration-field';
import { completeMedicalIntake, loadPatientOnboarding, onboardingErrorMessage, saveMedicalIntake } from '@/lib/onboarding/patient-onboarding';
import { intakeBody, intakeDraft, intakeIssue, optionalFields, type IntakeDraft } from '@/lib/onboarding/intake-form';
import { toP } from '@/lib/format';
import styles from './onboarding.module.css';

type Loaded = Awaited<ReturnType<typeof loadPatientOnboarding>>;
const steps = ['اطلاعات سلامت', 'سبک زندگی', 'مرور و ثبت'];
const titles = ['از سلامتتان بگویید', 'کمی از روزمرهٔ شما', 'همه‌چیز آمادهٔ ثبت است'];
const descriptions = ['سه سؤال کوتاه برای شناخت بهتر وضعیت سلامت شما. اگر از پاسخی مطمئن نیستید، «نمی‌دانم» را انتخاب کنید.', 'این بخش اختیاری است. هرچه می‌دانید بنویسید؛ می‌توانید بدون پاسخ‌دادن هم ادامه دهید.', 'پاسخ‌هایتان را بررسی کنید. بعداً هم می‌توانید اطلاعات سلامت را به‌روز کنید.'];
const reports = [
  { key: 'allergyReport', question: 'آیا حساسیت یا آلرژی دارید؟', hint: 'مثلاً حساسیت به دارو، غذا یا مواد دیگر.', label: 'آلرژی', placeholder: 'مثلاً پنی‌سیلین یا بادام‌زمینی' },
  { key: 'chronicConditionReport', question: 'آیا بیماری زمینه‌ای دارید؟', hint: 'بیماری‌ای که پزشک تشخیص داده یا برای آن پیگیری می‌شوید؛ مثلاً دیابت یا فشار خون.', label: 'بیماری زمینه‌ای', placeholder: 'نام بیماری‌ها، هر مورد در یک خط' },
  { key: 'currentMedicationReport', question: 'در حال حاضر دارو مصرف می‌کنید؟', hint: 'داروهایی که مرتب مصرف می‌کنید؛ اگر می‌دانید، مقدار مصرف را هم بنویسید.', label: 'داروهای مصرفی', placeholder: 'مثلاً لووتیروکسین، روزانه یک قرص' },
] as const;

function Form({ data, token }: { data: Loaded; token: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(() => intakeDraft(data.intake.snapshot, data.entry.birthDate));
  const [revision, setRevision] = useState(data.intake.currentRevision);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const pending = useRef(false);
  const field = <K extends keyof IntakeDraft>(key: K, value: IntakeDraft[K]) => { setDraft(current => ({ ...current, [key]: value })); setError(null); setNotice(null); };
  const move = (next: number) => {
    if (busy) return;
    const issue = next > step ? intakeIssue(draft, step === 0) : null;
    if (issue) { setError(issue); return; }
    setStep(next); setError(null); setNotice(null);
    requestAnimationFrame(() => heading.current?.focus());
  };
  const save = async (complete: boolean) => {
    if (pending.current) return;
    const issue = intakeIssue(draft, complete);
    if (issue) { setError(issue); if (complete) setStep(intakeIssue({ ...draft, heightCm: '', weightKg: '' }, true) ? 0 : 1); return; }
    pending.current = true; setBusy(true); setError(null); setNotice(null);
    try {
      const saved = await saveMedicalIntake(token, intakeBody(draft, revision));
      setRevision(saved.currentRevision);
      if (complete) { await completeMedicalIntake(token, saved.currentRevision); router.push(new URLSearchParams(window.location.search).get('from') === 'home' ? '/' : '/profile/medical'); }
      else setNotice('پاسخ‌ها ذخیره شدند؛ هر زمان خواستید ادامه دهید.');
    } catch (cause) { setError(onboardingErrorMessage(cause)); }
    finally { pending.current = false; setBusy(false); }
  };
  const name = [data.profile.firstName, data.profile.lastName].filter(Boolean).join(' ');
  const date = draft.birthDate ? new Intl.DateTimeFormat('fa-IR', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(draft.birthDate + 'T00:00:00Z')) : 'ثبت نشده';
  const gender = data.profile.gender === 'FEMALE' ? 'زن' : data.profile.gender === 'MALE' ? 'مرد' : 'ثبت نشده';
  return <main className={styles.page} dir="rtl">
    <header className={styles.topbar}><Link href="/" className={styles.back}><ArrowRight size={18} aria-hidden="true" />بازگشت به برنامه</Link><span className={styles.brand}><HeartPulse size={20} aria-hidden="true" />پروندهٔ سلامت</span></header>
    <div className={styles.layout}>
      <aside className={styles.sidebar}><span className={styles.eyebrow}>یک قدم برای شناخت بهتر شما</span><h2>سلامت شما،<br />با نگاه به خود شما.</h2><p>پاسخ‌های شما کمک می‌کنند اطلاعات پرونده‌تان کامل‌تر باشد. فقط دربارهٔ وضعیت خودتان پاسخ دهید.</p><ol className={styles.steps} aria-label="مراحل اطلاعات سلامت">{steps.map((label, index) => <li key={label} aria-current={step === index ? 'step' : undefined} data-active={step === index} data-done={index < step}><span className={styles.stepNumber}>{index < step ? <Check size={16} aria-hidden="true" /> : toP(index + 1)}</span><span>{label}{index === 1 && <small>اختیاری</small>}</span></li>)}</ol><div className={styles.note}><ShieldCheck size={20} aria-hidden="true" /><p>این پاسخ‌ها گزارش خود شما هستند و جایگزین تشخیص و نظر پزشک نیستند.</p></div></aside>
      <div className={styles.workspace}>
        <section className={styles.identity} aria-label="اطلاعات ثبت‌شدهٔ شما"><span className={styles.avatar}>{name.slice(0, 1) || 'ش'}</span><div><strong>{name}</strong><p>{date} · {gender}</p><small><CheckCircle2 size={13} aria-hidden="true" />مشخصات ثبت‌نام شما ثبت شده؛ نیازی به ورود دوباره نیست.</small></div><Link href="/profile/edit" aria-label="ویرایش مشخصات فردی" className={styles.edit}><Pencil size={16} aria-hidden="true" /></Link></section>
        <form className={styles.card} onSubmit={event => { event.preventDefault(); if (step === 2) void save(true); else move(step + 1); }}>
          <div className={styles.cardHeader}><span className={styles.eyebrow}>مرحلهٔ {toP(step + 1)} از {toP(steps.length)}</span><h1 ref={heading} tabIndex={-1}>{titles[step]}</h1><p>{descriptions[step]}</p><div className={styles.progress} aria-hidden="true">{steps.map((item, index) => <span key={item} data-filled={index <= step} />)}</div></div>
          <div className={styles.fields}>
            {error && <p className={styles.error} role="alert">{error}</p>}{notice && <p className={styles.success} role="status">{notice}</p>}
            {step === 0 && reports.map((item, index) => <MedicalDeclarationField key={item.key} label={toP(index + 1) + '. ' + item.question} description={item.hint} placeholder={item.placeholder} value={draft[item.key]} onChange={value => field(item.key, value)} disabled={busy} />)}
            {step === 1 && <div className={styles.optional}><div className={styles.measurements}>{([['heightCm', 'قد', 'سانتی‌متر', 30, 300], ['weightKg', 'وزن', 'کیلوگرم', 2, 500]] as const).map(([key, label, unit, min, max]) => <div key={key}><label htmlFor={key}>{label}<small>اختیاری</small></label><div className={styles.unitInput}><input id={key} type="number" inputMode="decimal" min={min} max={max} step={key === 'weightKg' ? '0.01' : '1'} value={draft[key]} placeholder="—" disabled={busy} onChange={event => field(key, event.target.value)} /><span>{unit}</span></div></div>)}</div>{optionalFields.map(item => <div key={item.key}><label htmlFor={item.key}>{item.label}<small>اختیاری</small></label><select id={item.key} value={draft[item.key]} disabled={busy} onChange={event => field(item.key, event.target.value as IntakeDraft[typeof item.key])}>{item.options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>)}</div>}
            {step === 2 && <section className={styles.review} aria-label="مرور پاسخ‌ها"><div className={styles.reviewTitle}><h2>اطلاعات سلامت</h2><button type="button" onClick={() => move(0)} disabled={busy}>ویرایش</button></div><dl>{reports.map(item => <div key={item.key}><dt>{item.label}</dt><dd>{draft[item.key].status === 'NONE' ? 'ندارم' : draft[item.key].status === 'UNKNOWN' ? 'نمی‌دانم' : draft[item.key].items.map(v => v.trim()).filter(Boolean).join('، ')}</dd></div>)}</dl><div className={styles.reviewTitle}><h2>سبک زندگی</h2><button type="button" onClick={() => move(1)} disabled={busy}>ویرایش</button></div><dl>{draft.heightCm && <div><dt>قد</dt><dd>{toP(draft.heightCm)} سانتی‌متر</dd></div>}{draft.weightKg && <div><dt>وزن</dt><dd>{toP(draft.weightKg)} کیلوگرم</dd></div>}{optionalFields.filter(item => draft[item.key]).map(item => <div key={item.key}><dt>{item.label}</dt><dd>{item.options.find(([value]) => value === draft[item.key])?.[1]}</dd></div>)}</dl>{!draft.heightCm && !draft.weightKg && !optionalFields.some(item => draft[item.key]) && <p className={styles.muted}>اطلاعات اختیاری وارد نشده است.</p>}</section>}
          </div>
          <footer className={styles.actions}><div>{step > 0 && <button type="button" className={styles.previous} disabled={busy} onClick={() => move(step - 1)}><ArrowRight size={16} aria-hidden="true" />قبلی</button>}<button type="button" className={styles.save} disabled={busy} onClick={() => void save(false)}>ذخیره و ادامه در فرصتی دیگر</button></div><button type="submit" className={styles.primary} disabled={busy}>{busy ? <><LoaderCircle size={17} className={styles.spin} aria-hidden="true" />در حال ذخیره…</> : <>{step === 2 ? 'ثبت اطلاعات سلامت' : step === 1 ? 'ادامه و مرور پاسخ‌ها' : 'ادامه'}<ArrowLeft size={17} aria-hidden="true" /></>}</button></footer>
        </form>
      </div>
    </div>
  </main>;
}

export default function OnboardingPage() {
  const { authentication } = useAuthSession();
  const currentToken = useRef(authentication.accessToken);
  useEffect(() => { currentToken.current = authentication.accessToken; }, [authentication.accessToken]);
  const [resource, setResource] = useState<{ userId: string; data?: Loaded; error?: string } | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let ignore = false;
    const token = currentToken.current;
    loadPatientOnboarding(token).then(data => { if (!ignore) setResource({ userId: authentication.user.id, data }); }).catch(cause => { if (!ignore) setResource({ userId: authentication.user.id, error: onboardingErrorMessage(cause, 'load') }); });
    return () => { ignore = true; };
  }, [authentication.user.id, retry]);
  const current = resource?.userId === authentication.user.id ? resource : null;
  if (current?.data) return <Form key={authentication.user.id} data={current.data} token={authentication.accessToken} />;
  return <main className={styles.loading} dir="rtl"><HeartPulse size={32} aria-hidden="true" /><h1>پروندهٔ سلامت شما</h1>{current?.error ? <><p role="alert">{current.error}</p><button onClick={() => { setResource(null); setRetry(value => value + 1); }}>تلاش دوباره</button><Link href="/">بازگشت به برنامه</Link></> : <p role="status">در حال دریافت اطلاعات ثبت‌شده…</p>}</main>;
}
