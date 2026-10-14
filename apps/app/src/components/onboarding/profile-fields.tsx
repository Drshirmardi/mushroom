"use client";

import { useRef, useState } from "react";
import { Check, ChevronLeft, CircleAlert, Plus } from "lucide-react";

export type ProfileGenderDraft = "" | "MALE" | "FEMALE";
export type ProfileDraft = { firstName: string; lastName: string; email: string; cityName: string; gender: ProfileGenderDraft };
type Props = { value: ProfileDraft; onChange: (value: ProfileDraft) => void; phone?: string; tone?: "green" | "blue"; grouped?: boolean; inlineEdit?: boolean; showGender?: boolean; hiddenFields?: (keyof ProfileDraft)[]; emailError?: string | null; onEmailError?: (message: string | null) => void; phoneAction?: { label: string; onClick: () => void } };
type FieldDef = { key: keyof ProfileDraft; label: string; required?: boolean; type?: "email" | "text"; inputMode?: "email"; autoComplete?: string; group: "identity" | "contact" };
const FIELDS: FieldDef[] = [
  { key: "firstName", label: "نام", required: true, autoComplete: "given-name", group: "identity" }, { key: "lastName", label: "نام خانوادگی", required: true, autoComplete: "family-name", group: "identity" }, { key: "email", label: "ایمیل", type: "email", inputMode: "email", autoComplete: "email", group: "contact" }, { key: "cityName", label: "شهر", autoComplete: "address-level2", group: "contact" },
];

/** Shared email rule (also used by onboarding): empty is allowed, otherwise strict. */
export function validateEmail(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(trimmed) ? null : "ایمیل معتبر نیست؛ مثلاً name@example.com";
}
const GROUPS: { id: FieldDef["group"]; title: string }[] = [{ id: "identity", title: "مشخصات فردی" }, { id: "contact", title: "راه‌های تماس" }];
const GENDER_OPTIONS: (readonly [Exclude<ProfileGenderDraft, "">, string])[] = [["MALE", "آقا"], ["FEMALE", "خانم"]];
export function ProfileFields({ value, onChange, phone, tone = "green", grouped = false, inlineEdit = false, showGender = false, hiddenFields = [], emailError, onEmailError, phoneAction }: Props) {
  const [open, setOpen] = useState<Partial<Record<keyof ProfileDraft, boolean>>>({});
  const refs = useRef<Partial<Record<keyof ProfileDraft, HTMLInputElement>>>({});
  const unlock = (key: keyof ProfileDraft) => { setOpen((prev) => ({ ...prev, [key]: true })); requestAnimationFrame(() => refs.current[key]?.focus()); };
  const lock = (field: FieldDef) => {
    if (inlineEdit && field.key === "email" && onEmailError) {
      const message = validateEmail(value.email);
      if (message) { onEmailError(message); refs.current.email?.focus(); return; }
      onEmailError(null);
    }
    setOpen((prev) => ({ ...prev, [field.key]: false }));
  };
  const renderField = (field: FieldDef) => {
    const unlocked = !inlineEdit || open[field.key] === true;
    const isEmpty = value[field.key].trim() === "";
    const isEmail = field.key === "email";
    const emailInvalid = inlineEdit && isEmail && emailError ? true : false;
    const ltr = field.type === "email";
    const box = tone === "blue"
      ? `border border-slate-200 bg-white rounded-lg transition-colors ${emailInvalid ? "border-red-500 text-foreground focus:border-red-500 focus:ring-red-500/25" : unlocked ? "text-foreground border-blue-500 focus:border-blue-600 focus:ring-blue-600/25" : "text-muted-foreground"}`
      : "bg-muted rounded-xl text-foreground focus:ring-primary/30";
    const input = <input
      ref={(element) => { refs.current[field.key] = element ?? undefined; }}
      id={field.key} name={field.key} type={tone === "blue" && field.type === "email" ? "text" : (field.type ?? "text")} inputMode={field.inputMode} required={field.required} aria-required={field.required} aria-invalid={emailInvalid || undefined} aria-describedby={emailInvalid ? "profile-email-error" : undefined} autoComplete={field.autoComplete} dir={field.type === "email" ? "ltr" : undefined} value={value[field.key]} disabled={inlineEdit && !unlocked} maxLength={field.key === "lastName" ? 100 : field.key === "email" ? 254 : 80}
      onChange={(event) => { onChange({ ...value, [field.key]: event.target.value }); if (isEmail && emailInvalid && onEmailError) onEmailError(validateEmail(event.target.value)); }}
      className={`w-full min-w-0 flex-1 px-4 py-3 text-right text-base outline-none focus:ring-2 ${inlineEdit ? "pl-24" : ""} ${box}`}
    />;
    if (!inlineEdit) return <div key={field.key}><label htmlFor={field.key} className="mb-1 block text-xs font-bold text-muted-foreground">{field.label}{field.required ? " *" : " (اختیاری)"}</label>{input}</div>;
    return <div key={field.key}>
      <label htmlFor={field.key} className="mb-1 block text-xs font-bold text-muted-foreground">{field.label}{field.required ? " *" : " (اختیاری)"}</label>
      <div className="relative">
        {input}
        {unlocked
          ? <button type="button" onClick={() => lock(field)} aria-label={`تأیید ${field.label}`} className="absolute left-1.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 px-3 py-3 text-sm font-bold text-blue-700 transition-all hover:text-blue-800 active:scale-95"><Check size={14} strokeWidth={3} aria-hidden="true" />تأیید</button>
          : isEmpty
            ? <button type="button" onClick={() => unlock(field.key)} aria-label={`افزودن ${field.label}`} className="absolute left-1.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 px-3 py-3 text-sm font-bold text-blue-700 transition-all hover:text-blue-800 active:scale-95"><Plus size={14} strokeWidth={3} aria-hidden="true" />افزودن</button>
            : <button type="button" onClick={() => unlock(field.key)} aria-label={`تغییر ${field.label}`} className="absolute left-1.5 top-1/2 inline-flex -translate-y-1/2 items-center px-3 py-3 text-sm font-bold text-blue-700 transition-all hover:text-blue-800 active:scale-95">تغییر</button>}
      </div>
      {emailInvalid && <p id="profile-email-error" role="alert" className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-red-600"><CircleAlert size={13} aria-hidden="true" />{emailError}</p>}
    </div>;
  };
  const renderPhone = () => <div><label htmlFor="profile-phone" className="mb-1 block text-xs font-bold text-muted-foreground">موبایل</label><input id="profile-phone" name="phone" dir="ltr" value={phone ?? ""} readOnly aria-readonly className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-base text-muted-foreground focus:outline-none" /><p className="mt-1 text-[11px] text-muted-foreground">تغییر شماره موبایل از بخش امنیت حساب انجام می‌شود.</p>{phoneAction && <button type="button" onClick={phoneAction.onClick} className="mt-1 inline-flex items-center gap-0.5 text-[11px] font-bold text-blue-700">{phoneAction.label}<ChevronLeft size={12} aria-hidden="true" /></button>}</div>;
  const renderGender = () => <div>
    <fieldset>
      <legend className="mb-1 block text-xs font-bold text-muted-foreground">جنسیت *</legend>
      <div className="grid grid-cols-2 gap-2">
        {GENDER_OPTIONS.map(([optionValue, optionLabel]) => (
          <label key={optionValue} className="cursor-pointer">
            <input type="radio" name="gender" value={optionValue} required checked={value.gender === optionValue} onChange={() => onChange({ ...value, gender: optionValue })} className="peer sr-only" />
            <span className="flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-muted-foreground transition-all active:scale-[0.99] peer-checked:border-blue-600 peer-checked:bg-blue-700 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-blue-600/30">{optionLabel}</span>
          </label>
        ))}
      </div>
    </fieldset>
  </div>;
  const visibleFields = FIELDS.filter((field) => !hiddenFields.includes(field.key));
  if (!grouped) return <div className="space-y-3">{visibleFields.map(renderField)}{renderPhone()}</div>;
  return <div className="space-y-5">{GROUPS.map((group, groupIndex) => <section key={group.id} aria-label={group.title} className={groupIndex > 0 ? "border-t border-slate-200 pt-5" : ""}><h3 className="mb-2 text-[11px] font-bold text-muted-foreground">{group.title}</h3><div className="space-y-3">{visibleFields.filter((field) => field.group === group.id).map(renderField)}{group.id === "identity" && showGender && renderGender()}{group.id === "contact" && renderPhone()}</div></section>)}</div>;
}
