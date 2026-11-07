"use client";
import { HeartbeatLoader } from "@/components/shared/heartbeat-loader";
import { useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { components } from "@sabz-zendegi/api-client";
import { useAuthSession } from "@/components/auth/session-gate";
import { ServicePage } from "@/components/shared/service-page";
import { BookOpen } from "lucide-react";
import { PatientResourceState } from "@/components/shared/patient-resource-state";
import { PolicyAcceptance, GuidanceSafety } from "@/components/shared/policy-acceptance";
import { getProgramOffering, acceptProgramConsent, createProgramPurchase } from "@/lib/digital-services-api";
import { usePatientResource } from "@/lib/use-patient-resource";
import { finishOperation, useOperationKey } from "@/lib/use-operation-key";
import { patientErrorMessage } from "@/lib/patient-request";
import { formatRial } from "@/lib/wallet-money";
import { toP } from "@/lib/format";
export default function ProgramOfferingPage() {
  const { id } = useParams<{ id: string }>(); const router = useRouter(); const { authentication } = useAuthSession();
  const resource = usePatientResource(useCallback(() => getProgramOffering(authentication.accessToken, id), [authentication.accessToken, id]));
  return <ServicePage title="برنامهٔ آموزشی" description="محتوا، مدت دسترسی و شرایط دریافت برنامه را پیش از خرید بخوانید." icon={BookOpen} backHref="/programs" backLabel="برنامه‌های سلامت"><div className="service-detail space-y-4"><PatientResourceState variant="detail" {...resource} retry={() => void resource.reload()} />{resource.data && <Purchase key={`${authentication.user.id}:${resource.data.publicationHash}`} program={resource.data} token={authentication.accessToken} userId={authentication.user.id} />}</div></ServicePage>;
}
function Purchase({ program, token, userId }: { program: components["schemas"]["PatientProgramOfferingDto"]; token: string; userId: string }) {
  const router = useRouter(); const [accepted, setAccepted] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [epoch] = useState(() => crypto.randomUUID());
  const key = useOperationKey(`${userId}:program:${program.id}`);
  const buy = async () => {
    if (busy || !accepted) return; setBusy(true); setError(null);
    try {
      const consentBody = { policyVersionId: program.terms.id, contentHash: program.terms.contentHash, accepted: true as const };
      const consent = program.termsConsent ?? await acceptProgramConsent(token, consentBody, await key({ action: "consent", ...consentBody, epoch }));
      const body = { publicationId: program.id, publicationHash: program.publicationHash, termsConsentRecordId: consent.id };
      const intent = await createProgramPurchase(token, body, await key({ action: "purchase", ...body }));
      await finishOperation(`${userId}:program:${program.id}`, { action: "purchase", ...body });
      router.push(`/profile/wallet/pay?intentId=${intent.id}`);
    } catch (reason) { setError(patientErrorMessage(reason)); } finally { setBusy(false); }
  };
  return <><section className="space-y-3 rounded-2xl border border-border bg-white p-5"><h2 className="text-lg font-bold">{program.title}</h2>{program.summary && <p className="text-sm leading-7">{program.summary}</p>}{program.eligibilityDescription && <p className="text-sm">{program.eligibilityDescription}</p>}{program.discountPercent>0 && <p className="text-sm text-muted-foreground"><del>{formatRial(BigInt(program.baseAmountRial))}</del> · {program.discountPercent.toLocaleString("fa-IR")}٪ تخفیف</p>}<p className="font-bold text-primary">{formatRial(BigInt(program.amountRial))}</p><p className="text-xs text-muted-foreground">دسترسی: {program.accessMode === "PERPETUAL" ? "بدون پایان زمانی" : `${toP(program.accessDurationDays ?? 0)} روز از فعال‌شدن دسترسی`}</p><p className="text-xs text-muted-foreground">برنامهٔ آموزشی؛ بازپرداخت عادی ارائه نمی‌شود.</p></section><GuidanceSafety safety={program.safety} /><PolicyAcceptance policy={program.terms} accepted={accepted} onChange={setAccepted} disabled={busy} />{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<button disabled={!accepted || busy} onClick={() => void buy()} className="w-full rounded-2xl bg-primary p-4 font-bold text-white disabled:opacity-40" aria-busy={Boolean(busy)}>{busy ? <><HeartbeatLoader />{"در حال ثبت…"}</> : "پذیرش شرایط و ادامه"}</button></>;
}
