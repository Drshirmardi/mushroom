'use client';

import { MizajChart } from './mizaj-chart';

const object = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const text = (value: unknown) => (typeof value === 'string' ? value : '');

export function MizajResult({
  snapshot,
  subjectLabel,
}: {
  snapshot: Record<string, unknown>;
  subjectLabel?: string;
}) {
  const profile = object(snapshot.profile);
  const dimensions = Array.isArray(snapshot.dimensionTitles)
    ? snapshot.dimensionTitles.map(object)
    : [];
  const name = (id: unknown) => text(dimensions.find((item) => item.id === id)?.title);
  const status = text(snapshot.status);
  const unresolved = (
    {
      INSUFFICIENT_DATA: 'اطلاعات کافی برای تعیین گرایش وجود ندارد.',
      PRIMARY_TIE: 'پاسخ‌ها هنوز گرایش غالب مشخصی نشان نمی‌دهند.',
      SECONDARY_TIE: 'گرایش غالب مشخص است، اما گرایش همراه هنوز قابل تفکیک نیست.',
      FOLLOW_UP_UNAVAILABLE: 'برای تفکیک این ترکیب از گرایش‌ها، بررسی تکمیلی لازم است.',
    } as Record<string, string>
  )[status];
  return (
    <section className="space-y-6">
      <div>
        <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
          الگوی پاسخ‌های {subjectLabel ?? 'شما'}
        </span>
        <h2 className="mt-2.5 text-lg font-bold text-foreground sm:text-xl">
          {text(profile.title) || 'نتیجه نیاز به بررسی بیشتر دارد'}
        </h2>
      </div>
      {unresolved && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">
          {unresolved}
        </p>
      )}
      <div className="flex flex-col gap-6">
        <MizajChart
          scores={object(snapshot.scores) as Record<string, number>}
          dimensions={dimensions.map((item) => ({ id: text(item.id), title: text(item.title) }))}
          variant="semi"
        />
        <dl className="grid grid-cols-2 gap-2 sm:gap-3">
          <div className="min-w-0 rounded-2xl border border-primary/20 bg-primary/5 p-2.5 sm:p-4">
            <dt className="min-w-0 text-[11px] font-medium leading-5 text-muted-foreground sm:text-xs">
              گرایش غالب
            </dt>
            <dd className="mt-1.5 min-w-0 text-sm font-bold text-primary sm:text-base">
              {name(snapshot.primary) || 'مشخص نشده'}
            </dd>
          </div>
          <div className="min-w-0 rounded-2xl border border-border/80 bg-muted/40 p-2.5 sm:p-4">
            <dt className="min-w-0 text-[11px] font-medium leading-5 text-muted-foreground sm:text-xs">
              گرایش همراه
            </dt>
            <dd className="mt-1.5 min-w-0 text-sm font-bold text-foreground sm:text-base">
              {name(snapshot.secondary) || 'مشخص نشده'}
            </dd>
          </div>
        </dl>
      </div>
      {Array.isArray(snapshot.tiedDimensions) && snapshot.tiedDimensions.length > 0 && (
        <p className="rounded-2xl border border-border/70 bg-muted/30 p-3.5 text-sm leading-7 text-muted-foreground">
          گرایش‌های نزدیک در این پاسخ‌ها:{' '}
          <strong className="text-foreground">
            {snapshot.tiedDimensions.map(name).filter(Boolean).join('، ')}
          </strong>
        </p>
      )}
      {text(profile.summary) && (
        <p className="text-sm leading-8 text-foreground/90">{text(profile.summary)}</p>
      )}
      {(['strengths', 'attentionPoints'] as const).map(
        (key) =>
          Array.isArray(profile[key]) && (
            <div key={key} className="rounded-2xl border border-border/70 bg-background/50 p-4">
              <h3 className="mb-2.5 text-sm font-bold text-foreground">
                {key === 'strengths' ? 'ویژگی‌های این الگو' : 'نکات قابل توجه'}
              </h3>
              <ul className="list-inside list-disc space-y-2 text-sm leading-7 text-muted-foreground">
                {(profile[key] as unknown[])
                  .filter((item) => typeof item === 'string')
                  .map((item, index) => (
                    <li key={index}>{String(item)}</li>
                  ))}
              </ul>
            </div>
          ),
      )}
      {text(profile.nextStep) && (
        <p className="rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm leading-7 text-foreground">
          {text(profile.nextStep)}
        </p>
      )}
    </section>
  );
}
