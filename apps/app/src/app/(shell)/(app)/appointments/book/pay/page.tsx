"use client";
import { LoadingState } from "@/components/shared/skeletons";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { useAuthSession } from "@/components/auth/session-gate";
import { PageHeader } from "@/components/shared/page-header";
import { PaymentChooser } from "@/components/billing/payment-chooser";
import { getBillingIntent, walletErrorMessage, type BillingIntent } from "@/lib/wallet-billing-api";

type State = "loading" | "ready" | "error" | "closed";

function AppointmentPayment() {
  const { authentication } = useAuthSession();
  const router = useRouter();
  const intentId = useSearchParams().get("intentId");
  const [intent, setIntent] = useState<BillingIntent | null>(null);
  const [state, setState] = useState<State>("loading");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!intentId) {
      setError("شناسهٔ پرداخت در آدرس وجود ندارد.");
      setState("error");
      return;
    }
    setState("loading");
    setError(null);
    try {
      const next = await getBillingIntent(authentication.accessToken, intentId);
      if (next.status === "PAID" && next.appointmentId) {
        router.replace(`/appointments/book/success?appointmentId=${encodeURIComponent(next.appointmentId)}`);
        return;
      }
      setIntent(next);
      setState(next.status === "PENDING" ? "ready" : "closed");
    } catch (cause) {
      setError(walletErrorMessage(cause));
      setState("error");
    }
  }, [authentication.accessToken, intentId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <PageHeader title="پرداخت نوبت" onBack={() => router.back()} />
      <div className="space-y-4 px-4 pb-6">
        {state === "loading" && (
          <LoadingState variant="payment" />
        )}

        {state === "error" && (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
            <button type="button" onClick={() => void load()} className="mr-3 font-bold text-primary">تلاش دوباره</button>
          </div>
        )}

        {state === "closed" && (
          <div className="space-y-3">
            <div role="status" className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
              <CalendarClock size={20} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
              <span>مهلت رزرو موقت این نوبت به پایان رسیده یا لغو شده است. لطفاً زمان را دوباره انتخاب و رزرو را از ابتدا انجام دهید.</span>
            </div>
            <button
              type="button"
              onClick={() => router.push("/appointments/book")}
              className="w-full rounded-2xl bg-primary py-4 text-sm font-bold text-white"
            >
              انتخاب زمان جدید
            </button>
          </div>
        )}

        {state === "ready" && intent && (
          <PaymentChooser
            accessToken={authentication.accessToken}
            intent={intent}
            onPaid={(paid) => {
              if (paid.appointmentId) router.replace(`/appointments/book/success?appointmentId=${encodeURIComponent(paid.appointmentId)}`);
              else void load();
            }}
            onCancelled={() => router.push("/appointments/book")}
          />
        )}
      </div>
    </div>
  );
}

export default function AppointmentPaymentPage() {
  return (
    <Suspense fallback={<LoadingState variant="payment" className="p-4" />}>
      <AppointmentPayment />
    </Suspense>
  );
}
