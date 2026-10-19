import type { components } from "@sabz-zendegi/api-client";

export function PolicyAcceptance({ policy, accepted, onChange, disabled = false }: { policy: { title: string; body: string }; accepted: boolean; onChange: (accepted: boolean) => void; disabled?: boolean }) {
  return <section className="rounded-2xl border border-border bg-white p-4"><h2 className="text-sm font-bold">{policy.title}</h2><div className="my-3 max-h-72 overflow-y-auto whitespace-pre-wrap text-sm leading-7 text-muted-foreground" tabIndex={0} aria-label={policy.title}>{policy.body}</div><label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={accepted} disabled={disabled} onChange={event => onChange(event.target.checked)} className="mt-1 h-4 w-4 accent-primary" /><span>متن بالا را مطالعه کردم و با آن موافقم.</span></label></section>;
}

export function GuidanceSafety({ safety }: { safety: components["schemas"]["GuidanceSafetyDto"] }) {
  return <aside className="space-y-2 rounded-xl bg-amber-50 p-4 text-xs leading-6 text-amber-900"><p>{safety.intendedAudience}</p><p>{safety.limitations}</p>{safety.contraindications.map((item, index) => <p key={index}>{item}</p>)}<p>{safety.seekProfessionalCare}</p></aside>;
}
