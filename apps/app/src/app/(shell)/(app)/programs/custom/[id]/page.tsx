"use client";
import { AsyncButton } from "@/components/shared/async-button";
import Link from "next/link";
import { useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { components } from "@sabz-zendegi/api-client";
import { useAuthSession } from "@/components/auth/session-gate";
import { ServicePage } from "@/components/shared/service-page";
import { FileHeart } from "lucide-react";
import { PatientResourceState } from "@/components/shared/patient-resource-state";
import { PatientPagination } from "@/components/shared/patient-pagination";
import { PolicyAcceptance } from "@/components/shared/policy-acceptance";
import { getCustomRequest, getCustomOffering, acceptCustomCare, withdrawCustomCare, acceptProgramConsent, createCustomPurchase, getCustomDelivery } from "@/lib/digital-services-api";
import { usePatientResource } from "@/lib/use-patient-resource";
import { finishOperation, useOperationKey } from "@/lib/use-operation-key";
import { patientErrorMessage } from "@/lib/patient-request";
import { formatRial } from "@/lib/wallet-money";
import { toP } from "@/lib/format";
const deliveryLabels: Record<string, string> = { UNPAID: "پرداخت تکمیل نشده است.", AWAITING_CARE: "مجوز جاری دسترسی متخصص لازم است.", AWAITING_INTAKE: "تکمیل پرونده و رضایت پزشکی لازم است.", PROFESSIONAL_UNAVAILABLE: "متخصص فعلاً در دسترس نیست.", IN_PREPARATION: "برنامه در انتظار آماده‌سازی و انتشار توسط متخصص است.", DELIVERED: "برنامهٔ اختصاصی منتشر شده است.", CLINICALLY_REVOKED: "برنامه توسط متخصص از دسترس خارج شده است." };
export default function CustomRequestPage() {
  const { id } = useParams<{ id: string }>(); const router = useRouter(); const { authentication } = useAuthSession(); const token = authentication.accessToken;
  const [page, setPage] = useState(1);
  const request = usePatientResource(useCallback(() => getCustomRequest(token, id), [token, id]));
  const delivery = usePatientResource(useCallback(() => getCustomDelivery(token, id, page), [token, id, page]));
  return <ServicePage title="برنامهٔ اختصاصی من" description="درخواست، رضایت دسترسی متخصص، پرداخت و نسخه‌های منتشرشده را پیگیری کنید." icon={FileHeart} backHref="/programs?view=mine" backLabel="برنامه‌های سلامت"><div className="service-detail space-y-4"><PatientResourceState variant="detail" {...request} retry={() => void request.reload()} />{request.data && <RequestActions key={`${authentication.user.id}:${request.data.id}:${request.data.careAuthorization?.versionNumber}:${request.data.careAuthorization?.withdrawnAt}:${request.data.carePolicy?.contentHash}`} request={request.data} token={token} userId={authentication.user.id} reload={() => { void request.reload(); void delivery.reload(); }} />}<section className="space-y-3"><h2 className="font-bold">وضعیت تحویل برنامه</h2><PatientResourceState variant="detail" {...delivery} retry={() => void delivery.reload()} />{delivery.data && <><p className="rounded-xl bg-muted p-4 text-sm leading-7">{deliveryLabels[delivery.data.deliveryState] ?? "وضعیت برنامه را دوباره بررسی کنید."}</p>{delivery.data.items.map(version => <div key={version.id} className="rounded-xl border border-border bg-white p-4"><p className="text-sm font-bold">نسخه {toP(version.versionNumber)}{version.current ? " · جاری" : ""}</p>{version.bodyAvailable ? <Link href={`/programs/custom/${id}/versions/${version.id}`} className="mt-3 block text-sm text-primary">مشاهدهٔ محتوای مجاز برنامه</Link> : <p className="mt-2 text-xs text-muted-foreground">محتوای این نسخه فعلاً قابل نمایش نیست.</p>}</div>)}<PatientPagination page={page} total={delivery.data.total} onChange={setPage} /></>}</section><Link href="/onboarding" className="block text-sm text-primary">بررسی و تکمیل پروندهٔ اولیه</Link><button onClick={() => { void request.reload(); void delivery.reload(); }} className="text-sm text-primary">دریافت وضعیت تازه</button></div></ServicePage>;
}
function RequestActions({ request, token, userId, reload }: { request: components["schemas"]["CustomProgramRequestDto"]; token: string; userId: string; reload: () => void }) {
  const router = useRouter(); const [care, setCare] = useState(false); const [terms, setTerms] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [epoch] = useState(() => crypto.randomUUID());
  const key = useOperationKey(`${userId}:custom:${request.id}`);
  const offering = usePatientResource(useCallback(() => getCustomOffering(token, request.publicationId), [token, request.publicationId]));
  const authorize = async () => {
    if (!care || !request.carePolicy || busy) return; setBusy(true); setError(null);
    try { const body = { policyVersionId: request.carePolicy.id, contentHash: request.carePolicy.contentHash, accepted: true as const, expectedVersionNumber: request.careAuthorization?.versionNumber ?? 0 }; await acceptCustomCare(token, request.id, body, await key({ action: "care", ...body })); reload(); }
    catch (reason) { setError(patientErrorMessage(reason)); } finally { setBusy(false); }
  };
  const withdraw = async () => {
    if (!request.careAuthorization || busy || !window.confirm("اجازهٔ دسترسی متخصص به این درخواست پس گرفته شود؟ این کار سوابق را حذف و هزینه را بازپرداخت نمی‌کند.")) return; setBusy(true); setError(null);
    try { await withdrawCustomCare(token, request.id, request.careAuthorization.id, await key({ action: "withdraw", id: request.careAuthorization.id })); reload(); } catch (reason) { setError(patientErrorMessage(reason)); } finally { setBusy(false); }
  };
  const buy = async () => {
    if (!terms || !offering.data || !request.checkoutAvailable || busy) return; setBusy(true); setError(null);
    try { const policy = offering.data.terms; const consentBody = { policyVersionId: policy.id, contentHash: policy.contentHash, accepted: true as const }; const consent = await acceptProgramConsent(token, consentBody, await key({ action: "terms", ...consentBody, epoch })); const body = { publicationHash: request.publicationHash, termsConsentRecordId: consent.id }; const intent = await createCustomPurchase(token, request.id, body, await key({ action: "purchase", ...body })); await finishOperation(`${userId}:custom:${request.id}`, { action: "purchase", ...body }); router.push(`/profile/wallet/pay?intentId=${intent.id}`); }
    catch (reason) { setError(patientErrorMessage(reason)); } finally { setBusy(false); }
  };
  return <><section className="space-y-3 rounded-2xl border border-border bg-white p-5"><h2 className="text-lg font-bold">{request.title}</h2><p className="text-sm">متخصص مسئول: {request.physician.displayName}</p><p className="font-bold text-primary">{formatRial(BigInt(request.amountRial))}</p><p className="text-xs text-muted-foreground">برنامه پس از بررسی و انتشار متخصص قابل دریافت است؛ بازپرداخت عادی ارائه نمی‌شود.</p></section>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}{request.careAuthorization?.careAuthorized ? <div className="rounded-xl border border-border p-4"><p className="text-sm">مجوز دسترسی همین متخصص برای این درخواست فعال است.</p><AsyncButton disabled={busy} onClick={() => withdraw()} className="mt-3 text-sm text-red-700">پس‌گرفتن مجوز دسترسی</AsyncButton></div> : request.carePolicy ? <><PolicyAcceptance policy={request.carePolicy} accepted={care} onChange={setCare} disabled={busy} /><AsyncButton disabled={busy || !care || !request.sourceAvailable} onClick={() => authorize()} className="w-full rounded-xl bg-primary p-4 font-bold text-white disabled:opacity-40">ثبت رضایت دسترسی متخصص</AsyncButton></> : <p className="text-sm text-amber-800">رضایت‌نامهٔ دسترسی متخصص فعلاً منتشر نشده است.</p>}<PatientResourceState variant="detail" {...offering} retry={() => void offering.reload()} />{offering.data && request.checkoutAvailable && <><PolicyAcceptance policy={offering.data.terms} accepted={terms} onChange={setTerms} disabled={busy} /><AsyncButton disabled={busy || !terms} onClick={() => buy()} className="w-full rounded-xl bg-primary p-4 font-bold text-white disabled:opacity-40">پذیرش شرایط و ادامه به پرداخت</AsyncButton></>}{!request.checkoutAvailable && <p className="text-sm leading-7 text-muted-foreground">برای این درخواست، پرداخت تازه فعلاً مجاز نیست. وضعیت پرداخت قبلی در بخش خریدهای من و وضعیت پرونده و دسترسی متخصص در همین صفحه قابل پیگیری است.</p>}<Link href="/programs" className="block text-sm text-primary">خریدها و درخواست‌های من</Link></>;
}
