"use client";

import type { ConsentPolicy } from "@/lib/onboarding/patient-onboarding";

type ConsentPolicyPanelProps = {
  policy: ConsentPolicy | null;
  accepted: boolean;
  accepting?: boolean;
  onAcceptedChange: (accepted: boolean) => void;
  onAccept: () => void;
  onWithdraw: () => void;
};

export function ConsentPolicyPanel({ policy, accepted, accepting = false, onAcceptedChange, onAccept, onWithdraw }: ConsentPolicyPanelProps) {
  if (!policy) {
    return <section className="rounded-2xl border border-border bg-muted/60 p-4 text-sm leading-7 text-muted-foreground" aria-live="polite">سیاست رضایت منتشرشده در دسترس نیست. تا دریافت آن، اطلاعات پزشکی ذخیره نمی‌شوند.</section>;
  }

  return <section className="space-y-4" aria-labelledby="consent-title">
    <div><h3 id="consent-title" className="text-base font-bold text-foreground">{policy.title}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">نسخه {policy.versionNumber} · {policy.locale}</p></div>
    <div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-2xl border border-border bg-muted/60 p-4 text-sm leading-7 text-foreground">{policy.body}</div>
    <label className="flex items-start gap-3 rounded-2xl border border-border bg-white p-4"><input type="checkbox" checked={accepted} disabled={Boolean(policy.acceptedConsentRecordId) || accepting} onChange={(event) => onAcceptedChange(event.target.checked)} className="mt-1 h-4 w-4" /><span className="text-sm leading-6 text-muted-foreground">متن و نسخهٔ سیاست را خوانده‌ام و با پردازش اطلاعات خوداظهاری‌ام موافقم.</span></label>
    {policy.acceptedConsentRecordId ? <button type="button" disabled={accepting} onClick={onWithdraw} className="rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-600 disabled:opacity-60">پس‌گرفتن رضایت</button> : <button type="button" disabled={!accepted || accepting} onClick={onAccept} className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{accepting ? "در حال ثبت…" : "ثبت رضایت"}</button>}
  </section>;
}
