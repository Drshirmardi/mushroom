"use client";

import { Suspense, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthSession } from "@/components/auth/session-gate";
import { PaymentChooser } from "@/components/billing/payment-chooser";
import { ServicePage } from "@/components/shared/service-page";
import { Wallet } from "lucide-react";
import { PatientResourceState } from "@/components/shared/patient-resource-state";
import { getBillingIntent } from "@/lib/wallet-billing-api";
import { usePatientResource } from "@/lib/use-patient-resource";
import { billingStatusLabel, billingPurposeLabel } from "@/lib/wallet-labels";
import { formatRial } from "@/lib/wallet-money";

function Payment() {
  const id = useSearchParams().get("intentId");
  const router = useRouter();
  const { authentication } = useAuthSession();
  const resource = usePatientResource(useCallback(() => id ? getBillingIntent(authentication.accessToken, id) : Promise.reject(new Error("MISSING_INTENT")), [authentication.accessToken, id]));
  const intent = resource.data;
  return <ServicePage title="پرداخت" description="نوع درخواست، مبلغ و روش‌های پرداخت در دسترس را پیش از ادامه بررسی کنید." icon={Wallet} backHref="/profile/wallet" backLabel="کیف پول"><div className="service-detail space-y-4">{!id ? <p role="alert">شناسهٔ پرداخت مشخص نیست.</p> : <PatientResourceState {...resource} retry={() => void resource.reload()} />}{intent && <><section className="rounded-2xl border border-border bg-white p-4"><h2 className="font-bold">{billingPurposeLabel(intent.purpose)}</h2><p className="my-3 text-xl font-bold">{formatRial(BigInt(intent.amountRial))} تومان</p><p className="text-sm">{billingStatusLabel(intent.status)}</p></section>{intent.status === "PAID" ? <Link href={`/profile/wallet/payment-result?intentId=${intent.id}`} className="block rounded-xl bg-primary p-4 text-center font-bold text-white">مشاهدهٔ نتیجه و ادامه</Link> : intent.status === "PENDING" ? <PaymentChooser key={intent.id} accessToken={authentication.accessToken} intent={intent} onPaid={() => { router.replace(`/profile/wallet/payment-result?intentId=${intent.id}`); }} onCancelled={() => void resource.reload()} /> : <p className="text-sm text-muted-foreground">برای این وضعیت امکان پرداخت جدید وجود ندارد. وضعیت نهایی را بررسی کنید.</p>}<button type="button" onClick={() => void resource.reload()} className="w-full rounded-xl border border-border p-3 text-sm">دریافت وضعیت تازه از سرور</button></>}</div></ServicePage>;
}
export default function PaymentPage() { return <Suspense fallback={<p role="status" className="p-4">در حال دریافت پرداخت…</p>}><Payment /></Suspense>; }
