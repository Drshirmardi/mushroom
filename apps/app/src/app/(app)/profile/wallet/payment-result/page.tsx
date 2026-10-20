"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Clock, Info, RefreshCw, ShieldQuestion, XCircle } from "lucide-react";
import { useAuthSession } from "@/components/auth/session-gate";
import { PageHeader } from "@/components/shared/page-header";
import { Spinner } from "@/components/shared/skeletons";
import { getBillingIntent, walletErrorMessage, type BillingIntent } from "@/lib/wallet-billing-api";
import { billingMethodLabel, billingPurposeLabel, billingStatusLabel, intentResultView, type IntentResultView } from "@/lib/wallet-labels";
import { formatRial } from "@/lib/wallet-money";

type View = IntentResultView | "loading" | "error";

const retryHref = (intent: BillingIntent): string | null => {
  switch (intent.purpose) {
    case "TOPUP":
      return "/profile/wallet";
    case "ORDER":
      return intent.orderId ? `/store/payment?orderId=${encodeURIComponent(intent.orderId)}` : null;
    case "APPOINTMENT":
      return `/appointments/book/pay?intentId=${encodeURIComponent(intent.id)}`;
    case "ASSESSMENT":
    case "PROGRAM":
      return `/profile/wallet/pay?intentId=${encodeURIComponent(intent.id)}`;
    default:
      return null;
  }
};

function PaymentResult() {
  const { authentication } = useAuthSession();
  const router = useRouter();
  const intentId = useSearchParams().get("intentId");
  const [intent, setIntent] = useState<BillingIntent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!intentId) {
      setError("شناسهٔ پرداخت در آدرس وجود ندارد.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setIntent(await getBillingIntent(authentication.accessToken, intentId));
    } catch (cause) {
      setError(walletErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [authentication.accessToken, intentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const view: View = intent ? intentResultView(intent) : error ? "error" : "loading";
  useEffect(() => {
    if (view === "paid" && intent?.purpose === "ORDER" && intent.orderId) {
      router.replace(`/store/order-success?orderId=${encodeURIComponent(intent.orderId)}`);
    }
  }, [intent, router, view]);
  const retry = intent ? retryHref(intent) : null;

  const primaryTarget = intent
    ? intent.purpose === "ORDER" && intent.orderId
      ? { href: `/store/order-tracking?orderId=${encodeURIComponent(intent.orderId)}`, label: "پیگیری سفارش" }
      : intent.purpose === "APPOINTMENT"
        ? { href: "/appointments", label: "مشاهدهٔ نوبت‌ها" }
        : intent.purpose === "ASSESSMENT"
          ? { href: intent.assessmentPurchaseId ? `/assessment/purchases/${encodeURIComponent(intent.assessmentPurchaseId)}` : "/assessment/couples", label: "پیگیری ارزیابی و دسترسی" }
        : intent.purpose === "PROGRAM"
          ? { href: intent.programPurchaseId ? `/programs/purchases/${encodeURIComponent(intent.programPurchaseId)}` : "/programs", label: "مشاهدهٔ برنامه و دسترسی" }
        : { href: "/profile/wallet", label: "بازگشت به کیف پول" }
    : { href: "/profile/wallet", label: "بازگشت به کیف پول" };

  return (
    <div className="profile-scope">
      <PageHeader title="نتیجهٔ پرداخت" onBack={() => router.push("/profile/wallet")} />
      <div className="space-y-4 px-4 pb-6 pt-4">
        {view === "loading" && (
          <div role="status" className="flex items-center justify-center gap-3 rounded-2xl border border-border bg-white p-8 text-sm text-muted-foreground">
            <Spinner />در حال بررسی وضعیت معتبر پرداخت…
          </div>
        )}

        {view === "error" && (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
            <button type="button" onClick={() => void load()} className="mr-3 font-bold text-primary">تلاش دوباره</button>
          </div>
        )}

        {intent && (
          <>
            <section className="rounded-2xl border border-border bg-white p-5 text-center shadow-sm">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full">
                {view === "paid" && <CheckCircle2 size={40} className="text-emerald-600" aria-hidden="true" />}
                {view === "compensated" && <Info size={40} className="text-sky-600" aria-hidden="true" />}
                {view === "pending" && <Clock size={40} className="text-amber-600" aria-hidden="true" />}
                {view === "ambiguous" && <ShieldQuestion size={40} className="text-amber-600" aria-hidden="true" />}
                {view === "failed" && <XCircle size={40} className="text-red-600" aria-hidden="true" />}
                {view === "closed" && <XCircle size={40} className="text-muted-foreground" aria-hidden="true" />}
              </div>
              <h1 className="text-base font-bold text-foreground">
                {view === "paid" && "پرداخت با موفقیت انجام شد"}
                {view === "compensated" && "مبلغ پرداخت به کیف پول شما بازگردانده شد"}
                {view === "pending" && "پرداخت هنوز تکمیل نشده است"}
                {view === "ambiguous" && "نتیجهٔ پرداخت هنوز قطعی نیست"}
                {view === "failed" && "پرداخت بانکی ناموفق بود"}
                {view === "closed" && "این پرداخت دیگر قابل ادامه نیست"}
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {view === "paid" && "این نتیجه از سرور خوانده شده است و بر پایهٔ تأیید معتبر پرداخت است."}
                {view === "compensated" && "زمان رزروشده در دسترس نبود؛ مبلغ به‌صورت اعتبار کیف پول شما ثبت شد."}
                {view === "pending" && "اگر از درگاه بازگشتید، چند لحظه صبر کنید و دوباره بررسی کنید. تا مشخص‌شدن نتیجه، پرداخت مجدد انجام ندهید."}
                {view === "ambiguous" && "وضعیت این پرداخت نیازمند بررسی است. هیچ پرداخت یا مبلغی پیش از روشن‌شدن نتیجه نهایی فرض نمی‌شود."}
                {view === "failed" && "می‌توانید با روش دیگری دوباره تلاش کنید."}
                {view === "closed" && "برای ادامه باید فرایند را از ابتدا آغاز کنید."}
              </p>

              <dl className="mt-5 space-y-2 text-right text-sm">
                <div className="flex justify-between border-b border-border/60 pb-2">
                  <dt className="text-muted-foreground">بابت</dt>
                  <dd className="font-bold text-foreground">{billingPurposeLabel(intent.purpose)}</dd>
                </div>
                <div className="flex justify-between border-b border-border/60 pb-2">
                  <dt className="text-muted-foreground">مبلغ</dt>
                  <dd className="font-black text-foreground">{formatRial(BigInt(intent.amountRial))} تومان</dd>
                </div>
                {intent.method && (
                  <div className="flex justify-between border-b border-border/60 pb-2">
                    <dt className="text-muted-foreground">روش پرداخت</dt>
                    <dd className="font-bold text-foreground">{billingMethodLabel(intent.method)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">وضعیت</dt>
                  <dd className="font-bold text-foreground">{billingStatusLabel(intent.status)}</dd>
                </div>
              </dl>
            </section>

            <button type="button" onClick={() => router.push(primaryTarget.href)} className="w-full rounded-2xl bg-primary py-4 text-sm font-bold text-white">
              {primaryTarget.label}
            </button>

            <div className="flex gap-3">
              <button type="button" onClick={() => void load()} className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-white py-3 text-sm font-bold text-foreground">
                <RefreshCw size={16} aria-hidden="true" />بررسی دوباره
              </button>
              {(view === "failed" || view === "pending") && retry && (
                <button type="button" onClick={() => router.push(retry)} className="flex-1 rounded-2xl border border-primary/30 bg-primary/5 py-3 text-sm font-bold text-primary">
                  تلاش دوباره
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense fallback={null}>
      <PaymentResult />
    </Suspense>
  );
}
