'use client';
import { useEffect, useRef, useState } from 'react';
import { getPublicationSetup, previewProgram, ProgramApiError, publishProgram, type Commercial, type Definition, type Preview, type PublicationRecord, type PublicationSetup } from '@/lib/program-services-api';
import { formatRial } from '@/lib/wallet-money';
import { priceFromInput, priceToInput } from './program-price';

const blockerText: Record<string, string> = {
  PROGRAM_CLINICAL_DEFINITION_UNAVAILABLE: 'متن این نسخه یا منابع آن هنوز تأیید معتبر پزشک ندارند. ابتدا بازبینی محتوای همین نسخه را کامل کنید.',
  PROGRAM_PURCHASE_TERMS_UNAVAILABLE: 'شرایط خرید فعال و معتبر برای زبان این خدمت تنظیم نشده است.',
  CUSTOM_SERVICE_PRICE_CHANGED: 'تعرفهٔ خدمت پزشک تغییر کرده است؛ اطلاعات تازه را دریافت کنید.',
};
function errorText(error: unknown) {
  if (!(error instanceof ProgramApiError)) return 'ارتباط با سرور برقرار نشد. نوشته‌های شما حفظ شده؛ دوباره تلاش کنید.';
  if (error.status === 409) return 'تعرفه، متن یا شرایط خرید تغییر کرده است. نوشته‌های شما حفظ شده؛ اطلاعات تازه را دریافت و دوباره بررسی کنید.';
  if (error.status === 403) return 'برای قیمت‌گذاری، دسترسی مدیریت محتوای همین کلینیک لازم است.';
  if (error.status === 401) return 'نشست شما پایان یافته است. دوباره وارد شوید.';
  if (error.status === 429) return 'درخواست‌ها زیاد شده‌اند. کمی بعد دوباره تلاش کنید.';
  return 'بررسی یا انتشار انجام نشد. اعتبار مبلغ، مرجع نگهداری و شرایط خرید را بررسی کنید.';
}

export function Publication({ token, item }: { token: string; item: Definition }) {
  const [revision, setRevision] = useState(0);
  const [snapshot, setSnapshot] = useState<{ token: string; id: string; data?: PublicationSetup; error?: string } | null>(null);
  useEffect(() => {
    let active = true;
    void getPublicationSetup(token, item.id).then(
      data => { if (active) setSnapshot({ token, id: item.id, data }); },
      error => { if (active) setSnapshot({ token, id: item.id, error: errorText(error) }); },
    );
    return () => { active = false; };
  }, [token, item.id, revision]);
  // Workspace remounts on user changes; a token refresh must retain the open price draft.
  const current = snapshot?.id === item.id ? snapshot : null;
  const reload = () => {
    if (!window.confirm('اطلاعات تازه جایگزین مبلغ و تنظیمات نوشته‌شده در این فرم می‌شود. ادامه می‌دهید؟')) return;
    setSnapshot(null);
    setRevision(v => v + 1);
  };
  return <section className="program-publication" aria-label="قیمت و انتشار">
    <h3>قیمت و انتشار</h3>
    {!current ? <p role="status">در حال دریافت تعرفه و شرایط خرید…</p> : current.error ? <div role="alert"><p>{current.error}</p><button className="dashboard-button" onClick={() => { setSnapshot(null); setRevision(v => v + 1); }}>تلاش دوباره</button></div> : current.data && <PublicationForm key={`${item.id}:${revision}`} token={token} item={item} setup={current.data} reload={reload} />}
  </section>;
}

function PublicationForm({ token, item, setup, reload }: { token: string; item: Definition; setup: PublicationSetup; reload: () => void }) {
  const [latest, setLatest] = useState<PublicationRecord | null>(setup.latestPublication);
  const [amount, setAmount] = useState(setup.latestPublication ? priceToInput(setup.latestPublication.amountRial) : '');
  const [retention, setRetention] = useState(setup.suggestedRetentionPolicyRef ?? '');
  const [accepted, setAccepted] = useState(false), [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  const lock = useRef(false), keys = useRef(new Map<string, string>());
  const terms = setup.termsPolicy;
  const changed = () => { setPreview(null); setAccepted(false); setNotice(''); };
  const amountRial = priceFromInput(amount);
  const configuration = (): Commercial | null => {
    if (amountRial === null) { setNotice('مبلغ را به تومان، با عدد فارسی یا انگلیسی وارد کنید؛ برای خدمت رایگان صفر بنویسید. حداکثر یک رقم اعشار مجاز است.'); return null; }
    if (!terms) { setNotice('ابتدا شرایط خرید خدمات باید برای این کلینیک فعال شود.'); return null; }
    if (!/^[A-Za-z0-9._:-]{1,80}$/.test(retention)) { setNotice('مرجع مصوب نگهداری سوابق را وارد کنید؛ این مقدار باید شناسهٔ واقعی سیاست مجموعه باشد.'); return null; }
    return { programDefinitionId: item.id, termsPolicyVersionId: terms.id, amountRial, currency: 'IRR', accessMode: latest?.accessMode === 'DAYS' ? 'DAYS' : 'PERPETUAL', accessDurationDays: latest?.accessMode === 'DAYS' ? latest.accessDurationDays : null, quoteTtlSeconds: latest?.quoteTtlSeconds ?? 1800, retentionPolicyRef: retention };
  };
  const run = async (operation: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setNotice('');
    try { await operation(); } catch (error) { setNotice(errorText(error)); } finally { lock.current = false; setBusy(false); }
  };
  return <div className="program-publication-form">
    <div className="program-notice" role="status">
      {latest ? <><strong>{latest.status === 'ACTIVE' ? 'آخرین تعرفهٔ منتشرشده' : 'آخرین تعرفهٔ بایگانی‌شده'}: {latest.amountRial === '0' ? 'رایگان' : formatRial(BigInt(latest.amountRial))}</strong>
        <p>{latest.programDefinitionId !== item.id ? 'این تعرفه مربوط به نسخهٔ قبلی متن است؛ برای فروش نسخهٔ انتخاب‌شده، تعرفه را دوباره بررسی و منتشر کنید.' : latest.configurationReady ? 'تعرفهٔ همین نسخه برای خرید معتبر است.' : 'این تعرفه اکنون آمادهٔ فروش نیست؛ اعتبار متن، منابع و شرایط خرید باید بررسی شود.'}</p></> : <p>برای این خدمت هنوز تعرفه‌ای منتشر نشده است.</p>}
    </div>
    <p>{latest?.accessMode === 'DAYS' ? `دسترسی این تعرفه پس از خرید ${latest.accessDurationDays} روز است.` : 'دسترسی این خدمت پس از خرید بدون تاریخ پایان است.'} تغییر قیمت، خریدهای قبلی را تغییر نمی‌دهد.</p>
    {!terms && <p className="program-notice" role="alert">شرایط خرید خدمات برای این کلینیک هنوز فعال نشده است. مدیر سامانه باید متن مصوب شرایط خرید خدمات را ثبت و فعال کند؛ تا آن زمان انتشار ممکن نیست.</p>}
    <form onSubmit={e => { e.preventDefault(); const config = configuration(); if (!config) return; setPreview(null); setAccepted(false); void run(async () => { setPreview(await previewProgram(token, config)); }); }}>
      <fieldset disabled={busy} className="program-editor-form">
        <label htmlFor="program-price">قیمت خدمت به تومان
          <input id="program-price" className="program-field" inputMode="decimal" maxLength={40} required aria-describedby="program-price-help" value={amount} onChange={e => { setAmount(e.target.value); changed(); }} />
        </label>
        <p id="program-price-help">مثلاً برای ۱۵۰ هزار تومان، ۱۵۰۰۰۰ وارد کنید. صفر یعنی رایگان. {amountRial !== null && <strong>مبلغ انتخابی: {amountRial === '0' ? 'رایگان' : formatRial(BigInt(amountRial))}</strong>}</p>
        {terms && <details className="program-terms"><summary>شرایط خرید: {terms.title} · نسخه {terms.versionNumber.toLocaleString('fa-IR')}</summary><p className="program-full-body">{terms.body}</p></details>}
        <label htmlFor="program-retention">مرجع مصوب نگهداری سوابق
          <input id="program-retention" dir="ltr" className="program-field" required maxLength={80} pattern="[A-Za-z0-9._:\-]{1,80}" aria-describedby="program-retention-help" value={retention} onChange={e => { setRetention(e.target.value.trim()); changed(); }} />
        </label>
        <p id="program-retention-help">{setup.suggestedRetentionPolicyRef ? 'از سابقهٔ انتشار همین کلینیک پر شده است؛ معتبر بودن آن را بررسی کنید.' : 'شناسهٔ واقعی سیاست مصوب مجموعه را از مدیر سامانه بگیرید. این مقدار، قیمت یا شناسهٔ خدمت نیست.'}</p>
        <p>مبلغ و تنظیمات این فرم تا زدن «انتشار برای خرید» ذخیره نمی‌شوند.</p>
        <button className="dashboard-button" type="submit" disabled={!terms}>{busy ? 'در حال بررسی…' : 'بررسی آمادگی انتشار'}</button>
      </fieldset>
    </form>
    {preview && <div className="program-notice" aria-live="polite">
      <h3>{preview.configurationReady ? 'آمادهٔ انتشار' : 'پیش‌نیازهای انتشار کامل نیست'}</h3>
      {preview.blockers.map(value => <p key={value}>{blockerText[value] ?? 'یکی از پیش‌نیازهای انتشار معتبر نیست؛ اطلاعات تازه را دریافت و دوباره بررسی کنید.'}</p>)}
      {preview.configurationReady && preview.publicationHash && <>
        <p>قیمت نهایی: <strong>{preview.configuration.amountRial === '0' ? 'رایگان' : formatRial(BigInt(preview.configuration.amountRial))}</strong></p>
        {preview.termsPolicy && <details open><summary>{preview.termsPolicy.title}</summary><p className="program-full-body">{preview.termsPolicy.body}</p></details>}
        <p>مرجع نگهداری: <bdi>{preview.configuration.retentionPolicyRef}</bdi></p>
        <label className="program-check"><input type="checkbox" checked={accepted} disabled={busy} onChange={e => setAccepted(e.target.checked)} />مبلغ، شرایط خرید و مرجع نگهداری سوابق را بررسی کرده‌ام.</label>
        <button disabled={!accepted || busy} className="dashboard-button dashboard-button-primary" onClick={() => {
          const config = configuration(); if (!config) return;
          const body = { ...config, publicationHash: preview.publicationHash!, expectedPublicationNumber: preview.expectedPublicationNumber, reviewedTermsAndRetention: true as const };
          const fingerprint = JSON.stringify(body); if (!keys.current.has(fingerprint)) keys.current.set(fingerprint, crypto.randomUUID());
          void run(async () => { const published = await publishProgram(token, body, keys.current.get(fingerprint)!); setLatest(published); setPreview(null); setAccepted(false); setNotice('تعرفه با موفقیت منتشر شد.'); });
        }}>{busy ? 'در حال انتشار…' : 'انتشار برای خرید'}</button>
      </>}
    </div>}
    {notice && <p role="status" className="program-notice">{notice}</p>}
    <button className="dashboard-button" disabled={busy} onClick={reload}>دریافت دوبارهٔ تعرفه و شرایط خرید</button>
  </div>;
}
