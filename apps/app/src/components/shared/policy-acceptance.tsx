'use client';

import { useId, useRef, useState } from 'react';
import { AlertTriangle, Info, ShieldAlert } from 'lucide-react';

import { BottomSheet, type BottomSheetHandle } from '@/components/shared/bottom-sheet';
import { StoreIcon } from '@/components/store/store-icon';

import type { components } from '@sabz-zendegi/api-client';

type PolicyDocument = {
  title: string;
  body: string;
  id?: string;
  contentHash?: string;
};

export function usePolicyAcceptance(
  scope: string,
  documents: readonly (PolicyDocument | null | undefined)[],
  recorded = false,
) {
  const revision = JSON.stringify([
    scope,
    documents.map(
      (document) => document && [document.id, document.contentHash, document.title, document.body],
    ),
    recorded,
  ]);
  const [selection, setSelection] = useState({ revision, accepted: recorded });

  if (selection.revision !== revision) {
    setSelection({ revision, accepted: recorded });
  }

  return {
    accepted: selection.revision === revision ? selection.accepted : recorded,
    onChange: (accepted: boolean) => setSelection({ revision, accepted }),
  };
}

type PolicyAcceptanceProps = {
  accepted: boolean;
  onChange: (accepted: boolean) => void;
  disabled?: boolean;
  recorded?: boolean;
} & (
  | { policy: PolicyDocument; policies?: never }
  | { policies: readonly PolicyDocument[]; policy?: never }
);

const agreement = 'شرایط و قوانین را مطالعه نمودم و موافقم.';

export function PolicyAcceptance({
  policy,
  policies,
  accepted,
  onChange,
  disabled = false,
  recorded = false,
}: PolicyAcceptanceProps) {
  const checkboxId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const sheet = useRef<BottomSheetHandle>(null);
  const [open, setOpen] = useState(false);
  const documents = policies ?? (policy ? [policy] : []);

  if (documents.length === 0) return null;

  return (
    <section
      dir="rtl"
      aria-label={documents.map((document) => document.title).join('، ')}
      className="flex min-h-11 min-w-0 items-center gap-1 ps-1 text-xs leading-[1.66] font-[450]"
    >
      {!recorded && (
        <span className="relative flex size-5 shrink-0 items-center justify-center">
          <input
            id={checkboxId}
            type="checkbox"
            aria-label={agreement}
            checked={accepted}
            disabled={disabled}
            onChange={(event) => onChange(event.target.checked)}
            className="peer size-full cursor-pointer appearance-none rounded-[7px] border border-(--dp-border-tint) bg-white checked:border-(--dp-brand) checked:bg-(--dp-brand) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--dp-brand) disabled:cursor-not-allowed disabled:opacity-50"
          />
          <span className="pointer-events-none absolute inset-0 hidden items-center justify-center text-white peer-checked:flex peer-disabled:opacity-50">
            <StoreIcon name="check" size={12} />
          </span>
        </span>
      )}

      <p className="min-w-0">
        <button
          ref={trigger}
          type="button"
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
          className="min-h-6 cursor-pointer rounded-xs text-(--dp-brand) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--dp-brand)"
        >
          شرایط و قوانین
        </button>{' '}
        {recorded ? (
          <span className="text-muted-foreground">قبلاً پذیرفته شده است.</span>
        ) : (
          <label
            htmlFor={checkboxId}
            className={disabled ? 'text-muted-foreground' : 'cursor-pointer'}
          >
            را مطالعه نمودم و موافقم.
          </label>
        )}
      </p>

      {open && (
        <BottomSheet
          ref={sheet}
          title="قوانین و شرایط"
          headingIcon={<StoreIcon name="infoCircle" size={38} />}
          finalFocus={trigger}
          onClose={() => setOpen(false)}
          showHandle={false}
          showCloseButton={false}
          overscrollToDismiss={false}
          className="rounded-t-[24px] border-0 [&_header]:pt-8 [&_h2]:text-lg [&_h2]:font-extrabold"
          footer={
            <button
              type="button"
              onClick={() => sheet.current?.close()}
              className="min-h-12 w-full cursor-pointer rounded-xl bg-[#000431] px-4 text-sm font-[450] text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--dp-brand)"
            >
              متوجه شدم
            </button>
          }
        >
          <div className="space-y-3 pt-4">
            {documents.map((document, index) => (
              <PolicyDocumentCard key={index} document={document} />
            ))}
          </div>
        </BottomSheet>
      )}
    </section>
  );
}

function PolicyDocumentCard({ document }: { document: PolicyDocument }) {
  return (
    <section className="min-w-0 rounded-[20px] bg-(--dp-surface-back) p-4">
      <h3 className="flex items-start gap-2 text-sm leading-[1.71] font-semibold [overflow-wrap:anywhere]">
        <span aria-hidden="true" className="mt-2 size-2 shrink-0 rounded-full bg-(--dp-brand)" />
        {document.title}
      </h3>
      <div className="mt-2 space-y-2 text-xs leading-[1.66] text-(--dp-text-medium) [overflow-wrap:anywhere]">
        {document.body.split(/\r?\n/).map((line, index) => {
          if (/^\s*(?:هشدار|توجه)\s*[:：]/.test(line)) {
            return (
              <p
                key={index}
                className="flex items-start gap-2 whitespace-pre-wrap rounded-xl bg-(--dp-warning-tint) p-3"
              >
                <StoreIcon name="infoCircle" size={16} />
                {line}
              </p>
            );
          }
          if (/^\s*(?:[•*–-]\s+|[\d۰-۹٠-٩]+[.)،]\s*)/.test(line)) {
            return (
              <p
                key={index}
                className="relative ms-1 border-s border-dashed border-(--dp-brand)/40 ps-3 whitespace-pre-wrap before:absolute before:start-[-4px] before:top-1.5 before:size-[7px] before:rounded-full before:bg-(--dp-brand)"
              >
                {line}
              </p>
            );
          }
          return (
            <p key={index} className="whitespace-pre-wrap">
              {line || '\u00a0'}
            </p>
          );
        })}
      </div>
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
