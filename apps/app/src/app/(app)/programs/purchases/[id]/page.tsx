"use client";
import Link from "next/link";
import { useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthSession } from "@/components/auth/session-gate";
import { PatientResourceState } from "@/components/shared/patient-resource-state";
import { ServicePage } from "@/components/shared/service-page";
import { BookOpen } from "lucide-react";
import { getProgramPurchase } from "@/lib/digital-services-api";
import { usePatientResource } from "@/lib/use-patient-resource";
import { billingStatusLabel } from "@/lib/wallet-labels";
export default function ProgramPurchasePage() {
  const { id } = useParams<{ id: string }>(); const router = useRouter(); const { authentication } = useAuthSession();
  const resource = usePatientResource(useCallback(() => getProgramPurchase(authentication.accessToken, id), [authentication.accessToken, id]));
  return <ServicePage title="خرید برنامه" description="پرداخت و دسترسی برنامهٔ خود را بررسی کنید و محتوای فعال را باز کنید." icon={BookOpen} backHref="/programs?view=mine" backLabel="برنامه‌های سلامت"><div className="service-detail space-y-4"><PatientResourceState {...resource} retry={() => void resource.reload()} />{resource.data && <><h2 className="text-lg font-bold">{resource.data.title}</h2>{resource.data.intent && <Link href={`/profile/wallet/pay?intentId=${resource.data.intent.id}`} className="block rounded-xl border border-border p-4 text-primary">پرداخت: {billingStatusLabel(resource.data.intent.status)}</Link>}{resource.data.kind === "CUSTOM_PROFESSIONAL_PLAN" && resource.data.customRequestId ? <Link href={`/programs/custom/${resource.data.customRequestId}`} className="block rounded-xl bg-primary p-4 text-center font-bold text-white">پیگیری برنامهٔ اختصاصی</Link> : resource.data.grant?.accessAvailable ? <Link href={`/programs/content/${resource.data.grant.id}`} className="block rounded-xl bg-primary p-4 text-center font-bold text-white">مشاهدهٔ برنامهٔ آموزشی</Link> : <p className="text-sm text-muted-foreground">محتوای برنامه فعلاً در دسترس نیست؛ پرداخت و بازهٔ دسترسی را بررسی کنید.</p>}<button onClick={() => void resource.reload()} className="text-sm text-primary">دریافت وضعیت تازه</button></>}</div></ServicePage>;
}
