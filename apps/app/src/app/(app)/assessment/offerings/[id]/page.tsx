"use client";
import { useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { components } from "@sabz-zendegi/api-client";
import { useAuthSession } from "@/components/auth/session-gate";
import { ServicePage } from "@/components/shared/service-page";
import { ClipboardList } from "lucide-react";
import { PatientResourceState } from "@/components/shared/patient-resource-state";
import { PolicyAcceptance } from "@/components/shared/policy-acceptance";
import { getAssessmentOffering, acceptAssessmentConsent, createAssessmentPurchase, withdrawAssessmentConsent } from "@/lib/digital-services-api";
import { usePatientResource } from "@/lib/use-patient-resource";
import { finishOperation, useOperationKey } from "@/lib/use-operation-key";
import { patientErrorMessage } from "@/lib/patient-request";
import { formatRialWithUnit } from "@/lib/wallet-money";

export default function OfferingPage() {
  const { id } = useParams<{ id: string }>();
  const { authentication } = useAuthSession();
  const router = useRouter();
  const resource = usePatientResource(useCallback(() => getAssessmentOffering(authentication.accessToken, id), [authentication.accessToken, id]));
  return <ServicePage title="شرایط ارزیابی" description="شرایط، هزینه و رضایت‌نامهٔ ارزیابی را پیش از خرید بررسی کنید." icon={ClipboardList} backHref="/assessment" backLabel="ارزیابی‌ها"><div className="service-detail space-y-4"><PatientResourceState {...resource} retry={() => void resource.reload()} />{resource.data && <Checkout key={`${authentication.user.id}:${resource.data.publicationHash}:${resource.data.processingConsent?.id}`} offering={resource.data} token={authentication.accessToken} userId={authentication.user.id} reload={() => void resource.reload()} />}</div></ServicePage>;
}
function Checkout({ offering, token, userId, reload }: { offering: components["schemas"]["PatientAssessmentOfferingDetailDto"]; token: string; userId: string; reload: () => void }) {
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [epoch] = useState(() => crypto.randomUUID());
  const key = useOperationKey(`${userId}:assessment:${offering.id}`);
  const purchase = async () => {
    if (busy || !processing || !terms || !offering.purchaseSupported || offering.kind !== "INDIVIDUAL") return;
    setBusy(true); setError(null);
    try {
      const accept = async (policy: { id: string; contentHash: string }) => {
        const body = { policyVersionId: policy.id, contentHash: policy.contentHash, accepted: true as const };
        return acceptAssessmentConsent(token, body, await key({ action: "consent", ...body, epoch }));
      };
      const processingRecord = offering.processingConsent ?? await accept(offering.processingPolicy);
      const termsRecord = offering.termsConsent ?? await accept(offering.termsPolicy);
      if (processingRecord.withdrawnAt || termsRecord.withdrawnAt) throw new Error("CONSENT_WITHDRAWN");
      const body = { publicationId: offering.id, publicationHash: offering.publicationHash, processingConsentRecordId: processingRecord.id, termsConsentRecordId: termsRecord.id };
      const intent = await createAssessmentPurchase(token, body, await key({ action: "purchase", ...body }));
      await finishOperation(`${userId}:assessment:${offering.id}`, { action: "purchase", ...body });
      router.push(`/profile/wallet/pay?intentId=${intent.id}`);
    } catch (reason) { setError(patientErrorMessage(reason)); } finally { setBusy(false); }
  };
  const withdraw = async () => {
    if (!offering.processingConsent || busy || !window.confirm("با پس‌گرفتن رضایت پردازش، ادامهٔ آزمون و دسترسی به نتیجه ممکن است متوقف شود. این کار بازپرداخت یا حذف سوابق نیست. ادامه می‌دهید؟")) return;
    setBusy(true); setError(null);
    try { await withdrawAssessmentConsent(token, offering.processingConsent.id, await key({ action: "withdraw", id: offering.processingConsent.id })); reload(); } catch (reason) { setError(patientErrorMessage(reason)); } finally { setBusy(false); }
  };
  return <><section className="rounded-2xl border border-border bg-white p-5"><h2 className="text-lg font-bold">{offering.title}</h2><p className="mt-3 font-bold text-primary">{formatRialWithUnit(BigInt(offering.amountRial))}</p><p className="mt-3 text-xs leading-6 text-muted-foreground">ویژهٔ افراد ۱۸ سال و بالاتر؛ پرداخت پیش از شروع انجام می‌شود. بازپرداخت عادی برای این ارزیابی ارائه نمی‌شود.</p></section><PolicyAcceptance policy={offering.processingPolicy} accepted={processing} onChange={setProcessing} disabled={busy} /><PolicyAcceptance policy={offering.termsPolicy} accepted={terms} onChange={setTerms} disabled={busy} />{(!offering.purchaseSupported || offering.blockers.length > 0) && <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">این ارزیابی در وضعیت فعلی برای خرید در دسترس نیست؛ انتشار، شرایط و تأییدهای لازم باید توسط کلینیک تکمیل شود.</p>}{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<button type="button" disabled={busy || !processing || !terms || !offering.purchaseSupported || offering.kind !== "INDIVIDUAL"} onClick={() => void purchase()} className="w-full rounded-2xl bg-primary p-4 font-bold text-white disabled:opacity-40">{busy ? "در حال ثبت…" : "ثبت رضایت و ادامه به پرداخت"}</button>{offering.processingConsent && <button type="button" disabled={busy} onClick={() => void withdraw()} className="w-full rounded-xl border border-border p-3 text-sm text-red-700 disabled:opacity-40">پس‌گرفتن رضایت پردازش</button>}<button type="button" disabled={busy} onClick={reload} className="w-full p-3 text-sm text-primary">بازخوانی شرایط جاری</button></>;
}
