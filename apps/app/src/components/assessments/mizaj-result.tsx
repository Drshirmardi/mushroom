"use client";

const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown) => typeof value === 'string' ? value : '';

export function MizajResult({ snapshot }: { snapshot: Record<string, unknown> }) {
  const profile = object(snapshot.profile);
  const dimensions = Array.isArray(snapshot.dimensionTitles) ? snapshot.dimensionTitles.map(object) : [];
  const name = (id: unknown) => text(dimensions.find(item => item.id === id)?.title);
  const status = text(snapshot.status);
  const unresolved = ({ INSUFFICIENT_DATA: 'اطلاعات کافی برای تعیین گرایش وجود ندارد.', PRIMARY_TIE: 'پاسخ‌ها هنوز گرایش غالب مشخصی نشان نمی‌دهند.', SECONDARY_TIE: 'گرایش غالب مشخص است، اما گرایش همراه هنوز قابل تفکیک نیست.', FOLLOW_UP_UNAVAILABLE: 'برای تفکیک این ترکیب از گرایش‌ها، بررسی تکمیلی کلینیک لازم است.' } as Record<string, string>)[status];
  return <section className="space-y-5 rounded-3xl border border-primary/20 bg-white p-5 sm:p-6">
    <div><p className="text-xs text-muted-foreground">الگوی پاسخ‌های شما</p><h2 className="mt-2 text-lg font-bold text-foreground">{text(profile.title) || 'نتیجه نیاز به بررسی بیشتر دارد'}</h2></div>
    {unresolved && <p className="rounded-2xl bg-amber-50 p-4 text-sm leading-7 text-amber-900">{unresolved}</p>}
    <dl className="grid gap-4 sm:grid-cols-2"><div className="rounded-2xl bg-primary/5 p-4"><dt className="text-xs text-muted-foreground">گرایش غالب</dt><dd className="mt-2 font-bold">{name(snapshot.primary) || 'مشخص نشده'}</dd></div><div className="rounded-2xl bg-muted p-4"><dt className="text-xs text-muted-foreground">گرایش همراه</dt><dd className="mt-2 font-bold">{name(snapshot.secondary) || 'مشخص نشده'}</dd></div></dl>
    {Array.isArray(snapshot.tiedDimensions) && snapshot.tiedDimensions.length > 0 && <p className="text-sm leading-7">گرایش‌های نزدیک در این پاسخ‌ها: {snapshot.tiedDimensions.map(name).filter(Boolean).join('، ')}</p>}
    {text(profile.summary) && <p className="text-sm leading-8">{text(profile.summary)}</p>}
    {(['strengths', 'attentionPoints'] as const).map(key => Array.isArray(profile[key]) && <div key={key}><h3 className="mb-2 text-sm font-bold">{key === 'strengths' ? 'ویژگی‌های این الگو' : 'نکات قابل توجه'}</h3><ul className="list-inside list-disc space-y-2 text-sm leading-7">{(profile[key] as unknown[]).filter(item => typeof item === 'string').map((item, index) => <li key={index}>{String(item)}</li>)}</ul></div>)}
    {text(profile.nextStep) && <p className="rounded-2xl bg-muted p-4 text-sm leading-7">{text(profile.nextStep)}</p>}
    <p className="border-t border-border pt-4 text-xs leading-7 text-muted-foreground">این نتیجه توصیف آموزشیِ پاسخ‌های شماست و جایگزین تشخیص پزشکی نیست. {snapshot.followUpUsed === true ? 'یک سؤال تکمیلی نیز بررسی شده است.' : 'نتیجه بر اساس ۱۱ پاسخ اصلی ثبت شده است.'}</p>
  </section>;
}
