"use client";

type ConsentPolicyPanelProps = { accepted: boolean; onAcceptedChange: (accepted: boolean) => void };

/** The immutable policy snapshot is supplied by the generated API client in F02-T08. */
export function ConsentPolicyPanel({ accepted, onAcceptedChange }: ConsentPolicyPanelProps) {
  return <section className="space-y-4" aria-labelledby="consent-title">
    <div><h3 id="consent-title" className="text-base font-bold text-foreground">رضایت برای پردازش اطلاعات پزشکی</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">متن رضایت فقط با نسخه و هش محتوای منتشرشده از سرویس نمایش داده می‌شود و در این مرحله متن نمونه‌ای جایگزین آن نیست.</p></div>
    <div className="rounded-2xl border border-dashed border-border bg-muted/60 p-4 text-sm leading-7 text-muted-foreground">سیاست رضایت هنوز از سرویس دریافت نشده است. پیش از اتصال به API، پاسخ‌های پزشکی فقط در همین فرم نگه‌داری می‌شوند و ثبت نمی‌شوند.</div>
    <label className="flex cursor-not-allowed items-start gap-3 rounded-2xl border border-border bg-white p-4 opacity-60"><input type="checkbox" checked={accepted} disabled onChange={(event) => onAcceptedChange(event.target.checked)} className="mt-1 h-4 w-4" /><span className="text-sm leading-6 text-muted-foreground">پس از نمایش نسخه منتشرشده، می‌توانم رضایت خود را آگاهانه ثبت کنم.</span></label>
  </section>;
}
