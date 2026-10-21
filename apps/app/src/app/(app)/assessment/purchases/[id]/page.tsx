"use client";
import Link from "next/link";
import { useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthSession } from "@/components/auth/session-gate";
import { PatientResourceState } from "@/components/shared/patient-resource-state";
import { ServicePage } from "@/components/shared/service-page";
import { ClipboardList } from "lucide-react";
import { getAssessmentPurchase } from "@/lib/digital-services-api";
import { usePatientResource } from "@/lib/use-patient-resource";
import { formatRial } from "@/lib/wallet-money";
import { billingStatusLabel } from "@/lib/wallet-labels";
export default function PurchasePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { authentication } = useAuthSession();
  const resource = usePatientResource(useCallback(() => getAssessmentPurchase(authentication.accessToken, id), [authentication.accessToken, id]));
  return <ServicePage title="خرید ارزیابی" description="وضعیت پرداخت و حق دسترسی خود را بررسی کنید و از همین‌جا وارد آزمون شوید." icon={ClipboardList} backHref="/assessment?view=purchases" backLabel="ارزیابی‌ها"><div className="service-detail space-y-4"><PatientResourceState {...resource} retry={() => void resource.reload()} />{resource.data && <><h2 className="text-lg font-bold">{resource.data.title}</h2><p>{formatRial(BigInt(resource.data.amountRial))}</p>{resource.data.intent && <Link href={`/profile/wallet/pay?intentId=${resource.data.intent.id}`} className="block rounded-xl border border-border p-4 text-primary">پرداخت: {billingStatusLabel(resource.data.intent.status)}</Link>}{resource.data.grants.map(grant => <div key={grant.id} className="rounded-xl border border-border bg-white p-4">{grant.accessAvailable ? <Link href={grant.submissionId ? `/assessment/resume?submissionId=${grant.submissionId}` : `/assessment/resume?grantId=${grant.id}`} className="font-bold text-primary">شروع، ادامه یا مشاهدهٔ نتیجه</Link> : <p className="text-sm text-muted-foreground">دسترسی این ارزیابی فعلاً فعال نیست.</p>}</div>)}<Link href={`/assessment/offerings/${resource.data.publicationId}`} className="block text-sm text-primary">شرایط و مدیریت رضایت</Link><button type="button" onClick={() => void resource.reload()} className="text-sm text-primary">بررسی وضعیت تازه</button></>}</div></ServicePage>;
}
