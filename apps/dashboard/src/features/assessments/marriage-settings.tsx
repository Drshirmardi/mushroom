"use client";
import type { components } from '@sabz-zendegi/api-client';
import { TextField } from './assessment-builder';
type Definition = components['schemas']['MarriageDefinitionDto'];
export function MarriageSettings({ value, onChange, disabled }: { value: Definition|null; onChange: (value: Definition|null) => void; disabled: boolean }) {
  return <fieldset disabled={disabled} className="space-y-4 rounded-xl border border-border p-4"><legend className="px-2 text-sm font-semibold">شرایط خدمت ازدواج</legend>
    <p className="text-sm leading-7">دعوت با شماره همراه؛ خدمت شناخت پیش از ازدواج با شرایط مستقل دو نفر</p>
    {value && <><p className="text-xs leading-7 text-muted-foreground">این تنظیمات در نسخهٔ منتشرشده ثابت می‌شوند. نقش‌ها مستقل از این هستند که چه کسی دعوت می‌فرستد. هر درخواست آزمون مستقل دارد؛ افراد زیر ۱۸ سال پشتیبانی نمی‌شوند.</p>
      <div className="grid gap-4 sm:grid-cols-2">{value.roles.map((role, index) => {
        const patch = (changes: Partial<typeof role>) => onChange({ ...value, roles: value.roles.map((item, i) => i === index ? { ...item, ...changes } : item) });
        return <section key={role.id} className="space-y-3"><h4 className="text-sm font-semibold">نقش {index === 0 ? 'اول' : 'دوم'}</h4><TextField title="عنوان نقش" maxLength={100} value={role.title} onChange={title => patch({ title })} /><label className="block space-y-2 text-xs">حداقل سن<input className="min-h-11 w-full rounded-lg border border-border px-3" type="number" min={18} max={120} required value={role.minimumAgeYears} onChange={event => patch({ minimumAgeYears: event.target.valueAsNumber })} /></label><p className="text-xs">جنسیت‌های مجاز این نقش</p>{(['MALE','FEMALE'] as const).map(gender => <label key={gender} className="me-4 inline-flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={role.genders.includes(gender)} onChange={event => patch({ genders: event.target.checked ? [...role.genders, gender] : role.genders.filter(item => item !== gender) })} />{gender === 'MALE' ? 'آقا' : 'خانم'}</label>)}</section>;
      })}</div><TextField title="تفسیر عمومی مشترک؛ برای ترکیب‌های بدون متن اختصاصی" value={value.genericJointText} multiline maxLength={20000} onChange={genericJointText => onChange({ ...value, genericJointText })} />
    </>}
  </fieldset>;
}
