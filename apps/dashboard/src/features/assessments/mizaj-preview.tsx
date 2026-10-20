"use client";

import { useRef, useState } from 'react';
import { assessmentErrorMessage, previewAssessmentScoring, type AssessmentVersion } from '@/lib/assessment-api';
import { label, row, rows, text, type Row } from './assessment-authoring';

const stateNames: Record<string, string> = {
  INSUFFICIENT_DATA: 'پاسخ مرتبط کافی نیست', PRIMARY_TIE: 'گرایش اول هنوز مشخص نیست',
  SECONDARY_TIE: 'گرایش همراه هنوز مشخص نیست', SINGLE: 'گرایش غالب مشخص است', PAIR: 'گرایش غالب و همراه مشخص‌اند',
  FOLLOW_UP_REQUIRED: 'یک سؤال برای رفع تساوی لازم است', FOLLOW_UP_UNAVAILABLE: 'برای این تساوی سؤال تعریف نشده است',
};

export function MizajPreview({ structure, saved, token, dirty, onBusy }: { structure: Row; saved: AssessmentVersion | null; token: string; dirty: boolean; onBusy: (value: boolean) => void }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [position, setPosition] = useState(0);
  const [synthetic, setSynthetic] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<typeof previewAssessmentScoring>> | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [followUpAnswer, setFollowUpAnswer] = useState('');
  const questions = rows(structure.sections).flatMap(section => rows(section.questions));
  const current = questions[position];
  const dimensions = rows(row(structure.scoring).dimensions);
  const name = (id: string | null | undefined) => text(dimensions.find(item => item.id === id)?.title) || 'مشخص نشده';
  const answered = questions.filter(question => answers[text(question.id)]).length;
  const followUp = result?.followUp;

  async function evaluate(withFollowUp: boolean) {
    if (lock.current || !saved || dirty) return;
    if (!synthetic) { setError('ابتدا تأیید کنید پاسخ‌ها آزمایشی و غیرواقعی هستند.'); return; }
    if (answered !== 11) { setError('ابتدا هر ۱۱ سؤال اصلی را پاسخ دهید.'); return; }
    if (withFollowUp && (!followUp || !followUpAnswer)) { setError('پاسخ سؤال رفع تساوی را انتخاب کنید.'); return; }
    lock.current = true; setBusy(true); onBusy(true); setError('');
    try {
      const next = await previewAssessmentScoring(token, saved.id, {
        expectedContentHash: saved.contentHash, syntheticAnswersOnly: true,
        answers: { ...answers, ...(withFollowUp && followUp ? { [followUp.id]: followUpAnswer } : {}) },
      });
      setResult(next);
    } catch (reason) { setError(assessmentErrorMessage(reason)); }
    finally { lock.current = false; setBusy(false); onBusy(false); }
  }

  return <div className="grid items-start gap-5 xl:grid-cols-[1fr_21rem]">
    <section className="dashboard-card space-y-5 p-5 sm:p-6">
      <header className="space-y-2"><h2 className="text-base font-bold">شبیه‌سازی مسیر ۱۱ + ۱</h2><p className="text-xs leading-7 text-muted-foreground">همان نسخهٔ ذخیره‌شده روی سرور بررسی می‌شود. هیچ پاسخ یا نتیجه‌ای در پروندهٔ بیمار ثبت نمی‌شود.</p></header>
      {(!saved || dirty) && <p role="status" className="rounded-lg border border-border p-3 text-xs leading-7">برای دریافت نتیجهٔ واقعی شبیه‌ساز، ابتدا تغییرهای پرسشنامه را ذخیره کنید.</p>}
      <div className="space-y-2"><div className="flex justify-between gap-3 text-xs"><span>سؤال {(position + 1).toLocaleString('fa-IR')} از ۱۱</span><span>{answered.toLocaleString('fa-IR')} پاسخ ثبت‌شده در پیش‌نمایش</span></div><progress className="h-2 w-full accent-primary" max={11} value={answered} aria-label="پیشرفت سؤال‌های اصلی" /></div>
      {current && <fieldset disabled={busy} className="space-y-4"><legend className="mb-4 text-base font-semibold leading-8">{label(current)}</legend>{rows(current.options).map(option => <label key={text(option.id)} className="flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border border-border p-4 text-sm leading-7 has-checked:border-primary has-checked:bg-primary/5"><input type="radio" className="mt-2 shrink-0 accent-primary" name={`mizaj-preview-${text(current.id)}`} checked={answers[text(current.id)] === option.id} onChange={() => { setAnswers(value => ({ ...value, [text(current.id)]: text(option.id) })); setResult(null); setFollowUpAnswer(''); setError(''); }} />{label(option)}</label>)}</fieldset>}
      <div className="flex flex-wrap justify-between gap-3"><button type="button" className="dashboard-button" disabled={busy || position === 0} onClick={() => setPosition(value => value - 1)}>قبلی</button><button type="button" className="dashboard-button" disabled={busy || position === questions.length - 1 || !current || !answers[text(current.id)]} onClick={() => setPosition(value => value + 1)}>بعدی</button></div>
      <label className="flex items-start gap-3 text-xs leading-7"><input type="checkbox" className="mt-2" disabled={busy} checked={synthetic} onChange={event => setSynthetic(event.target.checked)} />پاسخ‌ها ساختگی و فقط برای آزمایش این پیش‌نویس هستند؛ اطلاعات واقعی بیمار وارد نکرده‌ام.</label>
      <button type="button" className="dashboard-button dashboard-button-primary" disabled={busy || dirty || !saved || answered !== 11 || !synthetic} onClick={() => void evaluate(false)}>{busy ? 'در حال بررسی سرور…' : 'بررسی ۱۱ پاسخ اصلی'}</button>
      {error && <p role="alert" className="text-sm leading-7 text-destructive">{error}</p>}
      {followUp && result?.status === 'FOLLOW_UP_REQUIRED' && <section className="space-y-4 rounded-xl border border-primary/30 p-4 sm:p-5"><h3 className="text-sm font-bold">سؤال دوازدهم؛ فقط برای رفع همین تساوی</h3><p className="text-xs leading-7 text-muted-foreground">سرور تساوی بین {followUp.tiedDimensions.map(name).join(' / ')} را تشخیص داده و این سؤال را انتخاب کرده است.</p><fieldset disabled={busy} className="space-y-3"><legend className="mb-3 text-sm font-semibold leading-7">{followUp.title}</legend>{followUp.options.map(option => <label key={option.id} className="flex min-h-12 items-start gap-3 rounded-lg border border-border p-3 text-sm leading-7"><input className="mt-2" type="radio" name="mizaj-followup-preview" checked={followUpAnswer === option.id} onChange={() => setFollowUpAnswer(option.id)} />{option.title}</label>)}</fieldset><button type="button" disabled={busy || !followUpAnswer} className="dashboard-button dashboard-button-primary" onClick={() => void evaluate(true)}>نتیجه‌گیری پس از سؤال تکمیلی</button></section>}
      <button type="button" disabled={busy} className="dashboard-button" onClick={() => { setAnswers({}); setPosition(0); setFollowUpAnswer(''); setResult(null); setError(''); }}>شروع دوبارهٔ شبیه‌سازی</button>
    </section>

    <aside className="dashboard-card space-y-4 p-5" aria-live="polite"><h3 className="text-sm font-bold">مسیر تصمیم و نتیجه</h3>{!result ? <p className="text-xs leading-7 text-muted-foreground">پس از دریافت هر ۱۱ پاسخ، نتیجهٔ واقعی سرور و دلیل نیاز به سؤال تکمیلی اینجا نمایش داده می‌شود.</p> : <>
      <p className="text-sm font-semibold leading-7">{stateNames[result.status] ?? result.status}</p>
      <p className="text-xs leading-7">{result.followUpUsed ? '۱۱ پاسخ اصلی و یک پاسخ تکمیلی بررسی شد. سؤال دیگری پرسیده نمی‌شود.' : result.status === 'FOLLOW_UP_REQUIRED' ? '۱۱ پاسخ بررسی شد؛ فقط سؤال انتخاب‌شده مجاز است.' : '۱۱ پاسخ اصلی بررسی شد.'}</p>
      {result.tiedDimensions.length > 0 && <p className="text-xs leading-7">گرایش‌های برابر: {result.tiedDimensions.map(name).join(' / ')}</p>}
      {result.status === 'FOLLOW_UP_UNAVAILABLE' && <p className="text-xs leading-7 text-destructive">در بخش «رفع تساوی»، برای همین ترکیب سؤال تعریف کنید و پس از ذخیره دوباره شبیه‌سازی کنید.</p>}
      <dl className="space-y-2 text-xs"><div className="flex justify-between gap-3"><dt>گرایش غالب</dt><dd>{name(result.primary)}</dd></div><div className="flex justify-between gap-3"><dt>گرایش همراه</dt><dd>{name(result.secondary)}</dd></div></dl>
      <details className="border-t border-border pt-3"><summary className="cursor-pointer text-xs">شمارش همخوانی پاسخ‌های اصلی</summary><dl className="mt-3 space-y-2 text-xs">{Object.entries(result.scores).map(([id, value]) => <div key={id} className="flex justify-between gap-3"><dt>{name(id)}</dt><dd>{value.toLocaleString('fa-IR')} پاسخ</dd></div>)}</dl></details>
      {result.profile && <section className="space-y-3 border-t border-border pt-4"><h4 className="text-sm font-bold">{result.profile.title}</h4><p className="text-xs leading-7">{result.profile.summary}</p><ul className="list-inside list-disc space-y-2 text-xs leading-7">{result.profile.strengths.map((item, index) => <li key={index}>{item}</li>)}</ul><p className="text-xs font-semibold">نکات قابل توجه</p><ul className="list-inside list-disc space-y-2 text-xs leading-7">{result.profile.attentionPoints.map((item, index) => <li key={index}>{item}</li>)}</ul><p className="text-xs leading-7">{result.profile.nextStep}</p></section>}
    </>}<p className="border-t border-border pt-3 text-xs leading-7 text-muted-foreground">پیش‌نمایش آموزشی و تأییدنشده است؛ رتبهٔ فنی معادل تشخیص معتبر پزشکی نیست.</p></aside>
  </div>;
}
