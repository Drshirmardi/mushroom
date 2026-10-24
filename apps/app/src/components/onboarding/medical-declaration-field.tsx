"use client";

import { useId } from "react";

export type MedicalDeclarationStatus = "NONE" | "UNKNOWN" | "PRESENT";
export type MedicalDeclaration = { status?: MedicalDeclarationStatus; items: string[] };

type Props = { label: string; description: string; value: MedicalDeclaration; onChange: (value: MedicalDeclaration) => void; placeholder?: string; disabled?: boolean };

const OPTIONS: { value: MedicalDeclarationStatus; label: string }[] = [
  { value: "NONE", label: "خیر" },
  { value: "PRESENT", label: "بله" },
  { value: "UNKNOWN", label: "نمی‌دانم" },
];

export function MedicalDeclarationField({ label, description, value, onChange, placeholder, disabled = false }: Props) {
  const id = useId();
  const setStatus = (status: MedicalDeclarationStatus) => onChange({ status, items: status === "PRESENT" ? value.items : [] });
  return <fieldset disabled={disabled} aria-describedby={`${id}-hint`} className="rounded-2xl border border-border bg-card p-4 sm:p-5 disabled:opacity-60">
    <legend className="px-1 text-sm font-bold text-foreground">{label}</legend>
    <p id={`${id}-hint`} className="mb-4 text-xs leading-6 text-muted-foreground">{description}</p>
    <div className="grid grid-cols-3 gap-2">{OPTIONS.map(option => <label key={option.value} className="cursor-pointer"><input type="radio" name={id} value={option.value} checked={value.status === option.value} onChange={() => setStatus(option.value)} className="peer sr-only" /><span className="flex min-h-12 items-center justify-center rounded-xl border border-border px-2 text-sm font-semibold transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary">{option.label}</span></label>)}</div>
    {value.status === "PRESENT" && <div className="mt-4"><label htmlFor={`${id}-items`} className="mb-2 block text-xs font-semibold text-foreground">نام موارد را بنویسید</label><textarea id={`${id}-items`} value={value.items.join("\n")} onChange={event => onChange({ status: "PRESENT", items: event.target.value.split("\n") })} maxLength={10000} rows={3} placeholder={placeholder ?? "هر مورد را در یک خط بنویسید"} className="w-full rounded-xl border border-border bg-card px-3 py-3 text-base outline-none focus:ring-2 focus:ring-primary/30" /><p className="mt-1 text-[11px] text-muted-foreground">هر مورد در یک خط؛ اگر نام دقیق را نمی‌دانید، توضیح کوتاهی بنویسید.</p></div>}
  </fieldset>;
}
