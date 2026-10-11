"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Copy, CreditCard, Power, RefreshCw, Settings2, ShieldAlert } from "lucide-react";

import {
  PaymentProviderApiError,
  createPaymentProviderRevision,
  listPaymentProviders,
  paymentProviderCallbackUrl,
  updatePaymentProviderConfig,
  type PaymentProviderConfig,
  type SadadCredential,
} from "@/lib/commerce-payment-provider-api";

const field = "mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10";
const primaryButton = "inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton = "inline-flex items-center justify-center gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50";
const dangerButton = "inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50";

type ProviderMetadata = {
  description: string;
  credentialLabels: Record<keyof SadadCredential, { label: string; secret?: boolean; help: string }>;
  paymentRequestEndpoint: string;
  verifyEndpoint: string;
  redirectDescription: string;
};

const providerMetadata: Record<string, ProviderMetadata> = {
  sadad: {
    description: "درگاه پرداخت بانک ملی ایران؛ تنظیمات پذیرندگی، آدرس بازگشت و وضعیت عملیاتی آن از این بخش مدیریت می‌شود.",
    credentialLabels: {
      merchantId: { label: "شماره پذیرنده (Merchant ID)", help: "شناسه پذیرنده صادرشده در قرارداد سداد" },
      terminalId: { label: "شماره ترمینال (Terminal ID)", help: "شناسه ترمینال متصل به همین پذیرنده" },
      terminalKey: { label: "کلید پذیرنده (Terminal Key)", secret: true, help: "کلید Base64 صادرشده توسط سداد؛ پس از ثبت دوباره نمایش داده نمی‌شود" },
    },
    paymentRequestEndpoint: "https://sadad.shaparak.ir/api/v0/Request/PaymentRequest",
    verifyEndpoint: "https://sadad.shaparak.ir/api/v0/Advice/Verify",
    redirectDescription: "آدرس انتقال کاربر توسط سداد و Token همان تراکنش ساخته می‌شود؛ پروفایل نهایی redirect باید در پذیرندگی تأیید شود.",
  },
};

const defaultMetadata = (code: string): ProviderMetadata => ({
  description: `آداپتور ${code} در رجیستری سرور ثبت شده است.`,
  credentialLabels: providerMetadata.sadad.credentialLabels,
  paymentRequestEndpoint: "—",
  verifyEndpoint: "—",
  redirectDescription: "جزئیات انتقال این آداپتور هنوز در رابط تعریف نشده است.",
});

function StatusBadge({ children, tone }: { children: React.ReactNode; tone: "green" | "amber" | "gray" }) {
  const colors = tone === "green" ? "bg-emerald-100 text-emerald-800" : tone === "amber" ? "bg-amber-100 text-amber-900" : "bg-secondary text-muted-foreground";
  return <span className={`rounded-full px-2.5 py-1 text-[0.7rem] font-bold ${colors}`}>{children}</span>;
}

function CopyValue({ label, value, copied, onCopy }: { label: string; value: string; copied: boolean; onCopy: () => void }) {
  return <div className="rounded-xl border border-border bg-secondary/30 p-3">
    <p className="text-xs font-bold text-muted-foreground">{label}</p>
    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
      <code dir="ltr" className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-background px-3 py-2 text-left text-xs ring-1 ring-border">{value}</code>
      <button type="button" className={secondaryButton} onClick={onCopy}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? "کپی شد" : "کپی"}</button>
    </div>
  </div>;
}

export function PaymentProviderSettings({ accessToken }: { accessToken: string }) {
  const [items, setItems] = useState<PaymentProviderConfig[] | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "forbidden" | "error">("loading");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [credential, setCredential] = useState<SadadCredential>({ merchantId: "", terminalId: "", terminalKey: "" });
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await listPaymentProviders(accessToken);
      setItems(next);
      setSelectedCode((current) => current && next.some((item) => item.code === current) ? current : null);
      setState("ready");
      return next;
    } catch (error) {
      setState(error instanceof PaymentProviderApiError && (error.status === 401 || error.status === 403) ? "forbidden" : "error");
      return null;
    }
  }, [accessToken]);

  useEffect(() => {
    let cancelled = false;
    void listPaymentProviders(accessToken).then((next) => {
      if (!cancelled) { setItems(next); setState("ready"); }
    }).catch((error: unknown) => {
      if (!cancelled) setState(error instanceof PaymentProviderApiError && (error.status === 401 || error.status === 403) ? "forbidden" : "error");
    });
    return () => { cancelled = true; };
  }, [accessToken]);

  const selected = items?.find((item) => item.code === selectedCode) ?? null;
  const metadata = selected ? providerMetadata[selected.code] ?? defaultMetadata(selected.code) : null;
  const callbackUrl = selected ? paymentProviderCallbackUrl(selected.code) : "";
  const activeCount = items?.filter((item) => item.enabled).length ?? 0;
  const completeCredential = Object.values(credential).every((value) => value.trim().length > 0);
  const systemEnabled = activeCount > 0;
  const capabilitySummary = useMemo(() => selected ? Object.entries(selected.capabilities).filter(([, value]) => value !== "UNSUPPORTED").map(([key]) => key) : [], [selected]);

  const errorMessage = (error: unknown) => {
    if (error instanceof PaymentProviderApiError && (error.status === 401 || error.status === 403)) return "اجازهٔ مدیریت درگاه پرداخت را ندارید.";
    if (error instanceof PaymentProviderApiError && error.code === "SADAD_GO_LIVE_BLOCKED") return "فعال‌سازی سداد تا تکمیل پذیرندگی و تأیید عملیاتی سرور قفل است.";
    if (error instanceof PaymentProviderApiError && error.code === "PAYMENT_PROVIDER_CONFIGURATION_INVALID") return "تنظیمات درگاه معتبر یا کامل نیست؛ اطلاعات پذیرندگی و وضعیت فعال‌سازی را بررسی کنید.";
    return "تغییر تنظیمات درگاه انجام نشد؛ وضعیت قبلی حفظ شد.";
  };

  const run = async (action: string, work: () => Promise<unknown>, success: string) => {
    setBusyAction(action); setMessage(null);
    try { await work(); await load(); setMessage({ tone: "success", text: success }); }
    catch (error) { setMessage({ tone: "error", text: errorMessage(error) }); }
    finally { setBusyAction(null); }
  };

  const saveCredential = () => {
    if (!selected || selected.code !== "sadad" || !completeCredential) return;
    void run("credential", () => createPaymentProviderRevision(accessToken, selected.code, {
      merchantId: credential.merchantId.trim(), terminalId: credential.terminalId.trim(), terminalKey: credential.terminalKey.trim(),
    }, crypto.randomUUID()).then(() => setCredential({ merchantId: "", terminalId: "", terminalKey: "" })), "نسخه جدید اطلاعات پذیرندگی ثبت و رمزنگاری شد.");
  };

  const copyValue = async (key: string, value: string) => {
    try { await navigator.clipboard.writeText(value); setCopied(key); window.setTimeout(() => setCopied((current) => current === key ? null : current), 1800); }
    catch { setMessage({ tone: "error", text: "کپی خودکار ممکن نشد؛ آدرس را به‌صورت دستی انتخاب کنید." }); }
  };

  const disableAll = () => {
    const enabled = items?.filter((item) => item.enabled) ?? [];
    if (enabled.length === 0) return;
    void run("disable-all", () => Promise.all(enabled.map((item) => updatePaymentProviderConfig(accessToken, item.code, { enabled: false }))), "پرداخت آنلاین غیرفعال شد و همه آداپتورهای فعال خاموش شدند.");
  };

  if (state === "loading" && !items) return <p className="text-sm text-muted-foreground">در حال دریافت آداپتورهای پرداخت…</p>;
  if (state === "forbidden") return <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">اجازهٔ مدیریت درگاه‌های پرداخت را ندارید.</p>;
  if (state === "error" || !items) return <button type="button" onClick={() => void load()} className={secondaryButton}><RefreshCw size={15} />تلاش دوباره</button>;

  if (!selected || !metadata) return <div className="space-y-5">
    <div className={`rounded-2xl border p-4 ${systemEnabled ? "border-emerald-200 bg-emerald-50" : "border-border bg-secondary/30"}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-xs font-bold text-muted-foreground">وضعیت پرداخت آنلاین</p><p className="mt-1 font-bold">{systemEnabled ? `${activeCount.toLocaleString("fa-IR")} آداپتور فعال است` : "پرداخت آنلاین غیرفعال است"}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">برای فعال‌سازی، یک آداپتور آماده را باز کنید و همان آداپتور را فعال و در صورت نیاز پیش‌فرض کنید.</p></div>
        {systemEnabled && <button type="button" className={dangerButton} disabled={busyAction !== null} onClick={disableAll}><Power size={16} />{busyAction === "disable-all" ? "در حال غیرفعال‌سازی…" : "غیرفعال‌کردن همه"}</button>}
      </div>
    </div>
    <div><h3 className="font-bold">آداپتورهای موجود</h3><p className="mt-1 text-sm text-muted-foreground">هر کارت از رجیستری واقعی سرور آمده است. برای تنظیم کلیدها، آدرس بازگشت و وضعیت عملیاتی آن را باز کنید.</p></div>
    <div className="grid gap-3 sm:grid-cols-2">{items.map((item) => {
      const info = providerMetadata[item.code] ?? defaultMetadata(item.code);
      return <button key={item.code} type="button" onClick={() => { setSelectedCode(item.code); setMessage(null); }} className="group rounded-2xl border border-border bg-card p-4 text-right transition hover:border-primary/35 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
        <div className="flex items-start justify-between gap-3"><span className={`grid h-11 w-11 place-items-center rounded-xl ${item.enabled ? "bg-emerald-100 text-emerald-700" : "bg-primary/10 text-primary"}`}><CreditCard size={21} /></span><div className="flex flex-wrap justify-end gap-1.5"><StatusBadge tone={item.enabled ? "green" : "gray"}>{item.enabled ? "فعال" : "غیرفعال"}</StatusBadge>{item.isDefault && <StatusBadge tone="green">پیش‌فرض</StatusBadge>}<StatusBadge tone={item.configured ? "green" : "amber"}>{item.configured ? "تنظیم‌شده" : "نیازمند تنظیم"}</StatusBadge></div></div>
        <h4 className="mt-4 font-bold">{item.displayName}</h4><p dir="ltr" className="mt-0.5 text-left text-xs text-muted-foreground">{item.code}</p><p className="mt-3 text-xs leading-6 text-muted-foreground">{info.description}</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-primary">مدیریت آداپتور <ArrowRight size={15} /></span>
      </button>;
    })}{items.length === 0 && <p className="text-sm text-muted-foreground">آداپتوری در رجیستری سرور ثبت نشده است.</p>}</div>
  </div>;

  return <div className="space-y-5">
    <button type="button" className={secondaryButton} disabled={busyAction !== null} onClick={() => { setSelectedCode(null); setMessage(null); }}><ArrowRight size={16} />بازگشت به آداپتورها</button>
    <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 to-card p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><CreditCard size={21} /></span><div><h3 className="font-bold">{selected.displayName}</h3><p dir="ltr" className="mt-0.5 text-left text-xs text-muted-foreground">{selected.code}</p><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{metadata.description}</p></div></div><div className="flex flex-wrap gap-1.5"><StatusBadge tone={selected.enabled ? "green" : "gray"}>{selected.enabled ? "فعال" : "غیرفعال"}</StatusBadge>{selected.isDefault && <StatusBadge tone="green">درگاه پیش‌فرض</StatusBadge>}<StatusBadge tone={selected.goLiveReady ? "green" : "amber"}>{selected.goLiveReady ? "آماده بهره‌برداری" : "قفل عملیاتی"}</StatusBadge></div></div>
      <div className="mt-4 flex flex-wrap gap-2">
        {selected.enabled ? <button type="button" className={dangerButton} disabled={busyAction !== null} onClick={() => void run("toggle", () => updatePaymentProviderConfig(accessToken, selected.code, { enabled: false }), "آداپتور غیرفعال شد.")}><Power size={16} />{busyAction === "toggle" ? "در حال ذخیره…" : "غیرفعال‌کردن آداپتور"}</button> : <button type="button" className={primaryButton} disabled={busyAction !== null || !selected.configured || !selected.goLiveReady} onClick={() => void run("toggle", () => updatePaymentProviderConfig(accessToken, selected.code, { enabled: true }), "آداپتور فعال شد.")}><Power size={16} />فعال‌کردن آداپتور</button>}
        {!selected.isDefault && <button type="button" className={secondaryButton} disabled={busyAction !== null || !selected.enabled || !selected.goLiveReady} onClick={() => void run("default", () => updatePaymentProviderConfig(accessToken, selected.code, { isDefault: true }), "این آداپتور به‌عنوان درگاه پیش‌فرض انتخاب شد.")}><Settings2 size={16} />انتخاب به‌عنوان پیش‌فرض</button>}
      </div>
      {!selected.goLiveReady && <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-900">فعال‌سازی این آداپتور تا تأیید پذیرندگی، آدرس callback، IP خروجی ثابت، پروفایل redirect و تراکنش پذیرش قفل است. ثبت یا جایگزینی اطلاعات پذیرندگی همچنان امکان‌پذیر است.</p>}
    </div>

    <section className="space-y-3"><div><h4 className="font-bold">آدرس‌ها و اتصال</h4><p className="mt-1 text-sm leading-6 text-muted-foreground">آدرس بازگشت از دامنه عمومی API همین محیط ساخته می‌شود؛ همین مقدار باید برای پذیرندگی آن محیط ثبت شود.</p></div>
      <CopyValue label="Back Link / Return URL / Callback" value={callbackUrl} copied={copied === "callback"} onCopy={() => void copyValue("callback", callbackUrl)} />
      <details className="rounded-xl border border-border p-3"><summary className="cursor-pointer text-sm font-bold">جزئیات فنی اتصال سداد</summary><div className="mt-3 space-y-3"><CopyValue label="Payment Request endpoint" value={metadata.paymentRequestEndpoint} copied={copied === "request"} onCopy={() => void copyValue("request", metadata.paymentRequestEndpoint)} /><CopyValue label="Verify endpoint" value={metadata.verifyEndpoint} copied={copied === "verify"} onCopy={() => void copyValue("verify", metadata.verifyEndpoint)} /><p className="rounded-xl bg-secondary/50 p-3 text-xs leading-6 text-muted-foreground">{metadata.redirectDescription}</p></div></details>
    </section>

    {selected.code === "sadad" && <section className="rounded-2xl border border-border p-4 sm:p-5"><div className="flex items-start gap-3"><span className="rounded-xl bg-amber-100 p-2 text-amber-800"><ShieldAlert size={19} /></span><div><h4 className="font-bold">اطلاعات پذیرندگی</h4><p className="mt-1 text-sm leading-6 text-muted-foreground">هر سه مقدار به‌صورت یک نسخه رمزنگاری‌شده ذخیره می‌شوند. مقدار ثبت‌شده برای امنیت دوباره نمایش داده نمی‌شود.</p></div></div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">{(Object.keys(metadata.credentialLabels) as Array<keyof SadadCredential>).map((key) => { const config = metadata.credentialLabels[key]; return <label key={key} className={`text-sm font-bold ${key === "terminalKey" ? "md:col-span-2" : ""}`}>{config.label}<input className={field} dir="ltr" type={config.secret ? "password" : "text"} value={credential[key]} onChange={(event) => setCredential((current) => ({ ...current, [key]: event.target.value }))} autoComplete={config.secret ? "new-password" : "off"} /><span className="mt-1 block text-[0.7rem] font-normal leading-5 text-muted-foreground">{config.help}</span></label>; })}</div>
      <button type="button" className={`${primaryButton} mt-4 w-full sm:w-auto`} disabled={busyAction !== null || !completeCredential} onClick={saveCredential}>{busyAction === "credential" ? "در حال ثبت…" : selected.configured ? "جایگزینی اطلاعات پذیرندگی" : "ثبت اطلاعات پذیرندگی"}</button>
    </section>}

    <section className="rounded-2xl border border-border p-4"><h4 className="text-sm font-bold">قابلیت‌های آداپتور</h4><div className="mt-3 flex flex-wrap gap-2">{capabilitySummary.map((item) => <StatusBadge key={item} tone="amber">{item}</StatusBadge>)}{capabilitySummary.length === 0 && <span className="text-xs text-muted-foreground">قابلیت عملیاتی اعلام نشده است.</span>}</div></section>
    {message && <p role={message.tone === "error" ? "alert" : "status"} className={`rounded-xl px-3 py-2 text-sm ${message.tone === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>{message.text}</p>}
  </div>;
}
