"use client";
import { ageDraft, marriageIssues, type MarriageDraft } from './offering-validation';
import { TextField } from './assessment-builder';
type Definition = MarriageDraft;
export function MarriageSettings({ value, onChange, disabled }: { value: Definition|null; onChange: (value: Definition|null) => void; disabled: boolean }) {
  const issues = marriageIssues(value);
  return <fieldset disabled={disabled} className="space-y-4 rounded-xl border border-border p-4"><legend className="px-2 text-sm font-semibold">شرایط خدمت ازدواج</legend>
    <p className="text-sm leading-7">دعوت با شماره همراه؛ خدمت شناخت پیش از ازدواج با شرایط مستقل دو نفر</p>
    {value && <><p className="text-xs leading-7 text-muted-foreground">این تنظیمات در نسخهٔ منتشرشده ثابت می‌شوند. نقش‌ها مستقل از این هستند که چه کسی دعوت می‌فرستد. هر درخواست آزمون مستقل دارد؛ افراد زیر ۱۸ سال پشتیبانی نمی‌شوند.</p>
      <div className="grid gap-4 sm:grid-cols-2">{value.roles.map((role, index) => {
        const patch = (changes: Partial<typeof role>) => onChange({ ...value, roles: value.roles.map((item, i) => i === index ? { ...item, ...changes } : item) });
        return <section key={role.id} className="space-y-3"><h4 className="text-sm font-semibold">نقش {index === 0 ? 'اول' : 'دوم'}</h4><TextField id={`role-${role.id}`} error={issues.find(issue => issue.field === `role-${role.id}`)?.message} title="عنوان نقش" maxLength={100} value={role.title} onChange={title => patch({ title })} /><label className="block space-y-2 text-xs">حداقل سن<input className="min-h-11 w-full rounded-lg border border-border px-3" type="number" min={18} max={120} required id={`age-${role.id}`} aria-invalid={issues.some(issue => issue.field === `age-${role.id}`)} aria-describedby={`age-${role.id}-error`} value={role.minimumAgeYears !== null && Number.isFinite(role.minimumAgeYears) ? role.minimumAgeYears : ""} onChange={event => patch({ minimumAgeYears: ageDraft(event.target.valueAsNumber) })} /></label><p id={`age-${role.id}-error`} className="text-xs text-destructive">{issues.find(issue => issue.field === `age-${role.id}`)?.message}</p><p className="text-xs">جنسیت‌های مجاز این نقش</p>{(['MALE','FEMALE'] as const).map(gender => <label key={gender} className="me-4 inline-flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" aria-invalid={issues.some(issue => issue.field === `genders-${role.id}`)} aria-describedby="offering-issues" checked={role.genders.includes(gender)} onChange={event => patch({ genders: event.target.checked ? [...role.genders, gender] : role.genders.filter(item => item !== gender) })} />{gender === 'MALE' ? 'آقا' : 'خانم'}</label>)}</section>;
      })}</div><TextField id="joint-text" error={issues.find(issue => issue.field === "joint-text")?.message} title="تفسیر عمومی مشترک؛ برای ترکیب‌های بدون متن اختصاصی" value={value.genericJointText} multiline maxLength={20000} onChange={genericJointText => onChange({ ...value, genericJointText })} />
    </>}
  </fieldset>;
}
