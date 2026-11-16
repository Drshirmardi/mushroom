"use client";
import { HeartbeatLoader } from "@/components/shared/heartbeat-loader";
import { useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthSession } from "@/components/auth/session-gate";
import { ServicePage } from "@/components/shared/service-page";
import { FileHeart } from "lucide-react";
import { PatientResourceState } from "@/components/shared/patient-resource-state";
import { GuidanceSafety } from "@/components/shared/policy-acceptance";
import { getCustomOffering, createCustomRequest } from "@/lib/digital-services-api";
import { usePatientResource } from "@/lib/use-patient-resource";
import { finishOperation, useOperationKey } from "@/lib/use-operation-key";
import { patientErrorMessage } from "@/lib/patient-request";
import { formatRial } from "@/lib/wallet-money";
export default function CustomOfferingPage() {
  const { id } = useParams<{ id: string }>(); const router = useRouter(); const { authentication } = useAuthSession();
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const key = useOperationKey(`${authentication.user.id}:custom-request:${id}`);
  const resource = usePatientResource(useCallback(() => getCustomOffering(authentication.accessToken, id), [authentication.accessToken, id]));
  const request = async () => {
    if (!resource.data?.requestSupported || busy) return; setBusy(true); setError(null);
    try { const body = { publicationId: id, publicationHash: resource.data.publicationHash }; const created = await createCustomRequest(authentication.accessToken, body, await key(body)); await finishOperation(`${authentication.user.id}:custom-request:${id}`, body); router.push(`/programs/custom/${created.id}`); }
    catch (reason) { setError(patientErrorMessage(reason)); } finally { setBusy(false); }
  };
  return <ServicePage title="خدمت برنامهٔ اختصاصی" description="با متخصص، شرایط پذیرش و مراحل درخواست این خدمت آشنا شوید." icon={FileHeart} backHref="/programs?view=custom" backLabel="برنامه‌های سلامت"><div className="service-detail space-y-4"><PatientResourceState variant="detail" {...resource} retry={() => void resource.reload()} />{resource.data && <><h2 className="text-xl font-bold">{resource.data.title}</h2><p className="text-sm leading-7">{resource.data.summary}</p><p className="text-sm">متخصص: {resource.data.physician.displayName}</p><p className="text-sm">{resource.data.eligibilityDescription}</p><p className="font-bold text-primary">{formatRial(BigInt(resource.data.amountRial))}</p><GuidanceSafety safety={resource.data.safety} /><p className="text-sm leading-7 text-muted-foreground">ثبت درخواست به‌تنهایی پرداخت، اجازهٔ دسترسی به پرونده یا صدور برنامهٔ درمان نیست. رضایت دسترسی متخصص و شرایط خرید در مرحلهٔ بعد بررسی می‌شوند.</p>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}{!resource.data.requestSupported && <p className="text-sm text-amber-800">این خدمت فعلاً شرایط لازم برای ثبت درخواست را ندارد.</p>}<button disabled={busy || !resource.data.requestSupported} onClick={() => void request()} className="w-full rounded-2xl bg-primary p-4 font-bold text-white disabled:opacity-40" aria-busy={Boolean(busy)}>{busy ? <><HeartbeatLoader />{"در حال ثبت…"}</> : "ثبت درخواست و بررسی رضایت دسترسی"}</button></>}</div></ServicePage>;
}
