"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, ShieldAlert } from "lucide-react";

import {
  PaymentProviderApiError,
  createPaymentProviderRevision,
  listPaymentProviders,
  type PaymentProviderConfig,
} from "@/lib/commerce-payment-provider-api";

const field = "mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

export function PaymentProviderSettings({ accessToken }: { accessToken: string }) {
  const [items, setItems] = useState<PaymentProviderConfig[] | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "forbidden" | "error">("loading");
  const [merchantId, setMerchantId] = useState("");
  const [terminalId, setTerminalId] = useState("");
  const [terminalKey, setTerminalKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await listPaymentProviders(accessToken));
      setState("ready");
    } catch (error) {
      setState(error instanceof PaymentProviderApiError && (error.status === 401 || error.status === 403) ? "forbidden" : "error");
    }
  }, [accessToken]);

  useEffect(() => {
    let cancelled = false;
    void listPaymentProviders(accessToken)
      .then((next) => { if (!cancelled) { setItems(next); setState("ready"); } })
      .catch((error: unknown) => { if (!cancelled) setState(error instanceof PaymentProviderApiError && (error.status === 401 || error.status === 403) ? "forbidden" : "error"); });
    return () => { cancelled = true; };
  }, [accessToken]);

  const sadad = items?.find((item) => item.code === "sadad");
  const complete = Boolean(merchantId.trim() && terminalId.trim() && terminalKey.trim());

  const saveCredential = async () => {
    if (!complete) return;
    setSaving(true);
    setMessage(null);
    try {
      await createPaymentProviderRevision(accessToken, "sadad", {
        merchantId: merchantId.trim(),
        terminalId: terminalId.trim(),
        terminalKey: terminalKey.trim(),
      }, crypto.randomUUID());
      setMerchantId("");
      setTerminalId("");
      setTerminalKey("");
      await load();
      setMessage({ tone: "success", text: "نسخه جدید اطلاعات پذیرندگی سداد با موفقیت ثبت شد." });
    } catch (error) {
      const text = error instanceof PaymentProviderApiError && (error.status === 401 || error.status === 403)
        ? "اجازهٔ ثبت اطلاعات درگاه را ندارید."
        : error instanceof PaymentProviderApiError && error.code === "PAYMENT_PROVIDER_CONFIGURATION_INVALID"
          ? "اطلاعات سداد معتبر نیست؛ شناسه‌ها و کلید Base64 صادرشده توسط سداد را بررسی کنید."
          : "ثبت اطلاعات درگاه انجام نشد؛ نسخه قبلی تغییری نکرد.";
      setMessage({ tone: "error", text });
    } finally {
      setSaving(false);
    }
  };

  return <section>
    <div className="flex items-start gap-3">
      <div className="rounded-xl bg-amber-100 p-2 text-amber-800"><ShieldAlert size={19} /></div>
      <div>
        <h2 className="font-bold">درگاه پرداخت سداد</h2>
        <p className="mt-1 text-sm text-muted-foreground">اطلاعات پذیرندگی را دقیقاً مطابق مقادیر صادرشده توسط سداد وارد کنید.</p>
      </div>
    </div>
    {state === "loading" && !items ? <p className="mt-4 text-sm text-muted-foreground">در حال دریافت تنظیمات درگاه…</p>
      : state === "forbidden" ? <p className="mt-4 text-sm text-amber-800">اجازهٔ مدیریت درگاه پرداخت ندارید.</p>
        : state === "error" ? <button type="button" onClick={() => void load()} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary"><RefreshCw size={15} />تلاش دوباره</button>
          : <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-bold">{sadad?.displayName ?? "سداد"}</span>
              <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-900">در انتظار تأیید عملیاتی</span>
            </div>
            <p className="text-xs leading-6 text-muted-foreground">نسخه فعال: {sadad?.activeRevisionNumber ?? "—"} · اطلاعات پذیرندگی: {sadad?.configured ? "ثبت‌شده" : "ثبت‌نشده"} · واحد مبلغ: {sadad?.providerUnit ?? "تأییدنشده"}</p>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm font-bold">شماره پذیرنده (Merchant ID)
                <input className={field} dir="ltr" value={merchantId} onChange={(event) => setMerchantId(event.target.value)} autoComplete="off" />
              </label>
              <label className="text-sm font-bold">شماره ترمینال (Terminal ID)
                <input className={field} dir="ltr" value={terminalId} onChange={(event) => setTerminalId(event.target.value)} autoComplete="off" />
              </label>
              <label className="text-sm font-bold md:col-span-2">کلید پذیرنده (Terminal Key)
                <input className={field} dir="ltr" type="password" value={terminalKey} onChange={(event) => setTerminalKey(event.target.value)} autoComplete="new-password" />
              </label>
            </div>
            <button type="button" disabled={saving || !complete} onClick={() => void saveCredential()} className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50 sm:w-auto">{saving ? "در حال ثبت…" : sadad?.configured ? "جایگزینی اطلاعات پذیرندگی" : "ثبت اطلاعات پذیرندگی"}</button>
            {message && <p role={message.tone === "error" ? "alert" : "status"} className={`rounded-xl px-3 py-2 text-sm ${message.tone === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>{message.text}</p>}
            <p className="text-xs leading-6 text-muted-foreground">هر سه مقدار به‌صورت رمزنگاری‌شده ذخیره می‌شوند و بعد از ثبت دوباره نمایش داده نمی‌شوند. ثبت مجدد، نسخه تازه‌ای می‌سازد و نسخه قبلی را بازنشسته می‌کند.</p>
          </div>}
  </section>;
}
