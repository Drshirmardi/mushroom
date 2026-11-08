import { useId } from 'react';
import type { components } from '@sabz-zendegi/api-client';

export function PolicyAcceptance({
  policy,
  accepted,
  onChange,
  disabled = false,
  label = 'متن بالا را مطالعه کردم و با آن موافقم.',
}: {
  policy: { title: string; body: string };
  accepted: boolean;
  onChange: (accepted: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  const titleId = useId();
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
          className="mt-1 h-5 w-5 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        />
        <span>{label}</span>
      </label>
    </section>
  );
}

export function GuidanceSafety({ safety }: { safety: components['schemas']['GuidanceSafetyDto'] }) {
  const parts = [
    safety.intendedAudience,
    safety.limitations,
    ...safety.contraindications,
    safety.seekProfessionalCare,
  ].filter((value) => value?.trim());
  if (!parts.length) return null;
  return (
    <aside className="space-y-2 rounded-xl bg-amber-50 p-4 text-xs leading-6 text-amber-900">
      {parts.map((value, index) => (
        <p key={index}>{value}</p>
      ))}
    </aside>
  );
}
