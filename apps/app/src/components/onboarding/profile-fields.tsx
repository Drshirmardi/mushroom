"use client";

export type ProfileDraft = { firstName: string; lastName: string; email: string; cityName: string };
type Props = { value: ProfileDraft; onChange: (value: ProfileDraft) => void; phone?: string };
const FIELDS: { key: keyof ProfileDraft; label: string; required?: boolean; type?: "email" | "text" }[] = [
  { key: "firstName", label: "نام", required: true }, { key: "lastName", label: "نام خانوادگی", required: true }, { key: "email", label: "ایمیل", type: "email" }, { key: "cityName", label: "شهر" },
];
export function ProfileFields({ value, onChange, phone }: Props) {
  return <div className="space-y-3">{FIELDS.map((field) => <div key={field.key}><label htmlFor={field.key} className="mb-1 block text-xs font-bold text-muted-foreground">{field.label}{field.required ? " *" : " (اختیاری)"}</label><input id={field.key} type={field.type ?? "text"} required={field.required} aria-required={field.required} value={value[field.key]} maxLength={field.key === "lastName" ? 100 : field.key === "email" ? 254 : 80} onChange={(event) => onChange({ ...value, [field.key]: event.target.value })} className="w-full rounded-xl bg-muted px-4 py-3 text-right text-sm outline-none focus:ring-2 focus:ring-primary/30" /></div>)}<div><label className="mb-1 block text-xs font-bold text-muted-foreground">موبایل</label><input value={phone ?? "پس از دریافت پروفایل نمایش داده می‌شود"} readOnly className="w-full cursor-not-allowed rounded-xl bg-muted px-4 py-3 text-right text-sm text-muted-foreground" /><p className="mt-1 text-[11px] text-muted-foreground">تغییر شماره موبایل از بخش امنیت حساب انجام می‌شود.</p></div></div>;
}
