"use client";

export type MedicalDeclarationStatus = "NONE" | "UNKNOWN" | "PRESENT";
export type MedicalDeclaration = { status?: MedicalDeclarationStatus; items: string[] };

type Props = { label: string; description: string; value: MedicalDeclaration; onChange: (value: MedicalDeclaration) => void };

const OPTIONS: { value: MedicalDeclarationStatus; label: string }[] = [
  { value: "NONE", label: "ندارم" },
  { value: "UNKNOWN", label: "نمی‌دانم" },
  { value: "PRESENT", label: "دارم / گزارش می‌کنم" },
];

export function MedicalDeclarationField({ label, description, value, onChange }: Props) {
  const setStatus = (status: MedicalDeclarationStatus) => onChange({ status, items: status === "PRESENT" ? value.items : [] });
  return <fieldset className="rounded-2xl border border-border bg-white p-4">
    <legend className="px-1 text-sm font-bold text-foreground">{label}</legend>
    <p className="mb-3 text-xs leading-6 text-muted-foreground">{description}</p>
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">{OPTIONS.map((option) => <button key={option.value} type="button" onClick={() => setStatus(option.value)} className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${value.status === option.value ? "border-primary bg-primary text-white" : "border-border bg-muted text-foreground"}`}>{option.label}</button>)}</div>
    {value.status === "PRESENT" && <div className="mt-3"><label className="mb-1 block text-xs font-bold text-muted-foreground">موارد گزارش‌شده</label><textarea value={value.items.join("\n")} onChange={(event) => onChange({ status: "PRESENT", items: event.target.value.split("\n").filter(Boolean) })} maxLength={10000} rows={3} placeholder="هر مورد را در یک خط بنویسید" className="w-full rounded-xl bg-muted px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" /><p className="mt-1 text-[11px] text-muted-foreground">هر مورد پس از ثبت جداگانه بررسی و canonical می‌شود.</p></div>}
  </fieldset>;
}
