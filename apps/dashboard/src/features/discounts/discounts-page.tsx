"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, ShieldAlert } from "lucide-react";
import { useDashboardSession } from "@/components/auth/dashboard-session-gate";
import { CommerceDiscountApiError, commerceDiscountErrorMessage, createCommerceDiscount, listCommerceDiscounts, updateCommerceDiscount, type CommerceDiscount } from "@/lib/commerce-discount-api";

const field = "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";
const button = "inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50";
const toman = (value: string) => `${BigInt(value).toLocaleString("fa-IR")} تومان`;

function DiscountCard({ discount, accessToken, refresh }: { discount: CommerceDiscount; accessToken: string; refresh: () => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toggle = async () => { if (saving) return; setSaving(true); setError(null); try { await updateCommerceDiscount(accessToken, discount.id, { isActive: !discount.isActive }); await refresh(); } catch (cause) { setError(commerceDiscountErrorMessage(cause)); } finally { setSaving(false); } };
  const value = discount.kind === "FIXED_AMOUNT" ? toman(discount.amountToman ?? "0") : `${((discount.percentageBasisPoints ?? 0) / 100).toLocaleString("fa-IR", { maximumFractionDigits: 2 })}٪`;
  const expired = Boolean(discount.endsAt && new Date(discount.endsAt).getTime() <= Date.now());
  const upcoming = Boolean(discount.startsAt && new Date(discount.startsAt).getTime() > Date.now());
  const available = discount.isActive && !expired && !upcoming;
  const statusLabel = !discount.isActive ? "غیرفعال" : expired ? "منقضی‌شده" : upcoming ? "شروع نشده" : "فعال";
  const usage = discount.reservedCount + discount.consumedCount; const globalCapacity = discount.remainingGlobalCapacity ?? null; const patientCapacity = discount.perPatientUsageLimit ?? null;
  return <article className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><div className="inline-block rounded-lg bg-primary/10 px-3 py-1 font-mono text-sm font-bold text-primary">{discount.code}</div><h2 className="mt-3 font-bold">{discount.title}</h2></div><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${available ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{statusLabel}</span></div><p className="mt-3 text-2xl font-bold">{value}</p><dl className="mt-4 space-y-2 text-xs text-muted-foreground"><div className="flex justify-between"><dt>رزرو / مصرف</dt><dd className="font-semibold text-foreground">{usage.toLocaleString("fa-IR")} ({discount.reservedCount.toLocaleString("fa-IR")} رزرو، {discount.consumedCount.toLocaleString("fa-IR")} مصرف)</dd></div><div className="flex justify-between"><dt>ظرفیت کلی</dt><dd className="font-semibold text-foreground">{globalCapacity === null ? "نامحدود" : globalCapacity.toLocaleString("fa-IR")}</dd></div><div className="flex justify-between"><dt>هر بیمار</dt><dd className="font-semibold text-foreground">{patientCapacity === null ? "نامحدود" : patientCapacity.toLocaleString("fa-IR")}</dd></div><div className="flex justify-between"><dt>پایان</dt><dd className="font-semibold text-foreground">{discount.endsAt ? new Date(discount.endsAt).toLocaleString("fa-IR") : "بدون انقضا"}</dd></div></dl>{error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}<button type="button" disabled={saving} onClick={() => void toggle()} className="mt-5 text-xs font-bold text-primary hover:underline disabled:opacity-50">{saving ? "در حال ذخیره…" : discount.isActive ? "غیرفعال‌سازی" : "فعال‌سازی"}</button></article>;
}

export function DiscountsPage() {
  const { authentication } = useDashboardSession();
  const [discounts, setDiscounts] = useState<CommerceDiscount[] | null>(null); const [state, setState] = useState<"loading" | "ready" | "forbidden" | "error">("loading"); const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [code, setCode] = useState(""); const [title, setTitle] = useState(""); const [kind, setKind] = useState<"FIXED_AMOUNT" | "PERCENTAGE">("FIXED_AMOUNT"); const [value, setValue] = useState(""); const [usageLimit, setUsageLimit] = useState(""); const [patientLimit, setPatientLimit] = useState(""); const [endsAt, setEndsAt] = useState("");
  const refresh = useCallback(async () => { try { setDiscounts(await listCommerceDiscounts(authentication.accessToken)); setState("ready"); } catch (error) { setState(error instanceof CommerceDiscountApiError && (error.status === 401 || error.status === 403) ? "forbidden" : "error"); } }, [authentication.accessToken]);
  useEffect(() => { let cancelled = false; void listCommerceDiscounts(authentication.accessToken).then((items) => { if (!cancelled) { setDiscounts(items); setState("ready"); } }).catch((error: unknown) => { if (!cancelled) setState(error instanceof CommerceDiscountApiError && (error.status === 401 || error.status === 403) ? "forbidden" : "error"); }); return () => { cancelled = true; }; }, [authentication.accessToken]);
  const create = async () => {
    if (saving) return;
    setFormError(null);
    const normalizedCode = code.normalize("NFKC").trim().toUpperCase();
    const numeric = Number(value);
    const global = usageLimit ? Number(usageLimit) : null;
    const perPatient = patientLimit ? Number(patientLimit) : null;
    const endDate = endsAt ? new Date(endsAt) : null;
    if (!/^[A-Z0-9_-]{3,40}$/.test(normalizedCode)) { setFormError("کد باید ۳ تا ۴۰ کاراکتر و شامل حروف انگلیسی، عدد، خط تیره یا زیرخط باشد."); return; }
    if (!title.trim() || title.trim().length > 160) { setFormError("عنوانی بین ۱ تا ۱۶۰ کاراکتر وارد کنید."); return; }
    if (!Number.isSafeInteger(numeric) || numeric <= 0 || (kind === "PERCENTAGE" && numeric > 10000)) { setFormError(kind === "PERCENTAGE" ? "مقدار درصد باید عدد صحیحی بین ۱ تا ۱۰۰۰۰ باشد؛ مثلاً ۲۵۰۰ یعنی ۲۵ درصد." : "مبلغ تخفیف را به تومان و به صورت عدد صحیح مثبت وارد کنید."); return; }
    if ((global !== null && (!Number.isSafeInteger(global) || global < 1)) || (perPatient !== null && (!Number.isSafeInteger(perPatient) || perPatient < 1))) { setFormError("سقف استفاده باید عدد صحیح مثبت باشد؛ برای حالت نامحدود آن را خالی بگذارید."); return; }
    if (endDate && !Number.isFinite(endDate.getTime())) { setFormError("زمان پایان معتبر نیست."); return; }
    setSaving(true);
    try {
      await createCommerceDiscount(authentication.accessToken, { code: normalizedCode, title: title.trim(), kind, amountToman: kind === "FIXED_AMOUNT" ? String(numeric) : null, percentageBasisPoints: kind === "PERCENTAGE" ? numeric : null, usageLimit: global, perPatientUsageLimit: perPatient, endsAt: endDate?.toISOString() ?? null });
      setCode(""); setTitle(""); setValue(""); setUsageLimit(""); setPatientLimit(""); setEndsAt("");
      await refresh();
    } catch (cause) {
      setFormError(commerceDiscountErrorMessage(cause));
    } finally { setSaving(false); }
  };
  if (state === "loading" && !discounts) return <div className="flex-1 p-7 text-sm text-muted-foreground" role="status">در حال دریافت کدهای تخفیف…</div>;
  if (state !== "loading" && !discounts) return <div className="flex-1 p-7"><div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950" role="alert"><div className="flex items-center gap-2 font-bold"><ShieldAlert size={18} />{state === "forbidden" ? "دسترسی مجاز نیست" : "دریافت کدهای تخفیف ناموفق بود"}</div><p className="mt-2 text-sm">هیچ دادهٔ محلی جایگزین نشده است.</p>{state === "error" && <button onClick={() => void refresh()} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-bold"><RefreshCw size={15} />تلاش دوباره</button>}</div></div>;
  return <div className="flex-1 min-h-0 overflow-y-auto p-7 space-y-5"><div><h1 className="text-xl font-bold">کدهای تخفیف</h1><p className="mt-1 text-sm text-muted-foreground">یک کد برای هر سفارش؛ تخفیف فقط روی جمع کالا اعمال می‌شود و مقدار آن فقط در سرور محاسبه می‌گردد.</p></div><form className="rounded-2xl border border-border bg-card p-4 shadow-sm" onSubmit={(event) => { event.preventDefault(); void create(); }}><div className="mb-3 flex items-center gap-2 font-bold"><Plus size={18} />کد تخفیف جدید</div><div className="grid gap-3 md:grid-cols-4"><input className={field} value={code} onChange={(event) => setCode(event.target.value)} placeholder="کد انگلیسی" aria-label="کد تخفیف" /><input className={field} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="عنوان" aria-label="عنوان تخفیف" /><select className={field} value={kind} onChange={(event) => setKind(event.target.value as typeof kind)} aria-label="نوع تخفیف"><option value="FIXED_AMOUNT">مبلغ ثابت TOMAN</option><option value="PERCENTAGE">درصد (bps)</option></select><input className={field} type="number" min="1" max={kind === "PERCENTAGE" ? 10000 : undefined} value={value} onChange={(event) => setValue(event.target.value)} placeholder={kind === "PERCENTAGE" ? "bps، مثال 2500" : "مبلغ TOMAN"} aria-label="مقدار تخفیف" /><input className={field} type="number" min="1" value={usageLimit} onChange={(event) => setUsageLimit(event.target.value)} placeholder="سقف کلی (اختیاری)" aria-label="سقف کلی" /><input className={field} type="number" min="1" value={patientLimit} onChange={(event) => setPatientLimit(event.target.value)} placeholder="سقف هر بیمار (اختیاری)" aria-label="سقف هر بیمار" /><input className={field} type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} aria-label="زمان پایان" /><button className={button} disabled={saving}>{saving ? "در حال ثبت…" : "ثبت کد"}</button></div>{formError && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{formError}</p>}</form><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{discounts?.map((discount) => <DiscountCard key={discount.id} discount={discount} accessToken={authentication.accessToken} refresh={refresh} />)}</div>{discounts?.length === 0 && <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">هنوز کد تخفیفی ثبت نشده است.</p>}</div>;
}
