import { useId } from 'react';
import { AlertTriangle, ChevronDown, FileText, Info, ShieldAlert } from 'lucide-react';

import type { components } from '@sabz-zendegi/api-client';

type PolicyAcceptanceProps = {
  policy: {
    title: string;
    body: string;
  };
  accepted: boolean;
  onChange: (accepted: boolean) => void;
  disabled?: boolean;
  label?: string;
  variant?: 'default' | 'compact';
};

export function PolicyAcceptance({
  policy,
  accepted,
  onChange,
  disabled = false,
  label = 'متن بالا را مطالعه کردم و با آن موافقم.',
  variant = 'default',
}: PolicyAcceptanceProps) {
  const titleId = useId();

  if (variant === 'compact') {
    return (
      <section
        aria-labelledby={titleId}
        className="overflow-hidden rounded-2xl border border-border/70 bg-white"
      >
        {/* Expandable policy text */}
        <details className="group">
          <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
            >
              <FileText size={18} />
            </span>

            <span
              id={titleId}
              className="min-w-0 flex-1 text-right text-sm font-semibold leading-6 text-foreground"
            >
              {policy.title}
            </span>

            <ChevronDown
              size={18}
              aria-hidden="true"
              className="shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
            />
          </summary>

          <div className="border-t border-border/60 px-4 py-4">
            <div className="whitespace-pre-wrap break-words text-sm leading-8 text-muted-foreground">
              {policy.body}
            </div>
          </div>
        </details>

        {/* Single acceptance checkbox */}
        <label className="flex min-h-16 cursor-pointer items-start gap-3 border-t border-border/70 bg-muted/20 px-4 py-4">
          <input
            type="checkbox"
            checked={accepted}
            disabled={disabled}
            onChange={(event) => onChange(event.target.checked)}
            className="mt-1 size-5 shrink-0 cursor-pointer accent-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:cursor-not-allowed"
          />

          <span className="min-w-0 text-sm leading-7 text-foreground">{label}</span>
        </label>
      </section>
    );
  }

  // Original layout for existing consumers.
  return (
    <section
      aria-labelledby={titleId}
      className="min-w-0 space-y-4 rounded-2xl border border-border bg-white p-4 sm:p-5"
    >
      <h2 id={titleId} className="text-sm font-bold leading-7">
        {policy.title}
      </h2>

      <div className="whitespace-pre-wrap break-words text-sm leading-8 text-muted-foreground">
        {policy.body}
      </div>

      <label className="flex min-h-12 cursor-pointer items-start gap-3 border-t border-border pt-4 text-sm leading-7">
        <input
          type="checkbox"
          checked={accepted}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-1 size-5 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        />

        <span>{label}</span>
      </label>
    </section>
  );
}

type GuidanceSafetyProps = {
  safety: components['schemas']['GuidanceSafetyDto'];
  variant?: 'default' | 'program';
};

export function GuidanceSafety({ safety, variant = 'default' }: GuidanceSafetyProps) {
  const titleId = useId();

  const intendedAudience = safety.intendedAudience?.trim() ?? '';

  const limitations = safety.limitations?.trim() ?? '';

  const contraindications = safety.contraindications.filter((value) => Boolean(value?.trim()));

  const professionalCare = safety.seekProfessionalCare?.trim() ?? '';

  const parts = [intendedAudience, limitations, ...contraindications, professionalCare].filter(
    Boolean,
  );

  if (parts.length === 0) {
    return null;
  }

  if (variant === 'program') {
    const hasWarnings =
      Boolean(limitations) || contraindications.length > 0 || Boolean(professionalCare);

    return (
      <section aria-labelledby={titleId} className="space-y-4">
        <div className="space-y-1">
          <h2 id={titleId} className="flex items-center gap-2 text-base font-bold text-foreground">
            <ShieldAlert size={19} className="text-primary" aria-hidden="true" />
            نکات و محدودیت‌های مهم
          </h2>

          <p className="text-xs leading-6 text-muted-foreground">
            اطلاعات زیر را پیش از دریافت برنامه بررسی کنید.
          </p>
        </div>

        {intendedAudience && (
          <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-white p-4">
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
            >
              <Info size={18} />
            </span>

            <div className="min-w-0 space-y-1">
              <h3 className="text-sm font-semibold text-foreground">مخاطبان برنامه</h3>

              <p className="whitespace-pre-line text-sm leading-7 text-muted-foreground">
                {intendedAudience}
              </p>
            </div>
          </div>
        )}

        {hasWarnings && (
          <div className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
            {limitations && (
              <div className="space-y-1">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-950">
                  <AlertTriangle size={17} aria-hidden="true" />
                  محدودیت‌ها
                </h3>

                <p className="whitespace-pre-line text-sm leading-7 text-amber-950/85">
                  {limitations}
                </p>
              </div>
            )}

            {contraindications.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-amber-950">موارد منع یا احتیاط</h3>

                <ul className="space-y-2">
                  {contraindications.map((value, index) => (
                    <li
                      key={`${index}-${value}`}
                      className="flex items-start gap-2 text-sm leading-7 text-amber-950/85"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-3 size-1.5 shrink-0 rounded-full bg-amber-700"
                      />

                      <span className="min-w-0 break-words">{value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {professionalCare && (
              <div className="space-y-1 border-t border-amber-200 pt-3">
                <h3 className="text-sm font-semibold text-amber-950">زمان مراجعه به متخصص</h3>

                <p className="whitespace-pre-line text-sm leading-7 text-amber-950/85">
                  {professionalCare}
                </p>
              </div>
            )}
          </div>
        )}
      </section>
    );
  }

  // Preserve the existing visual behavior elsewhere.
  return (
    <aside className="space-y-2 rounded-xl bg-amber-50 p-4 text-xs leading-6 text-amber-900">
      {parts.map((value, index) => (
        <p key={index}>{value}</p>
      ))}
    </aside>
  );
}
