"use client";
import Link from "next/link";
import { useCallback } from "react";
import { useParams } from "next/navigation";
import { useAuthSession } from "@/components/auth/session-gate";
import { PatientResourceState } from "@/components/shared/patient-resource-state";
import { ServicePage } from "@/components/shared/service-page";
import { ClipboardList } from "lucide-react";
import { getAssessmentPurchase } from "@/lib/digital-services-api";
import { usePatientResource } from "@/lib/use-patient-resource";
import { formatRialWithUnit } from "@/lib/wallet-money";
import { billingStatusLabel } from "@/lib/wallet-labels";
export default function PurchasePage() {
  const { id } = useParams<{ id: string }>();
  const { authentication } = useAuthSession();
  const resource = usePatientResource(useCallback(() => getAssessmentPurchase(authentication.accessToken, id), [authentication.accessToken, id]));
  return (
    <ServicePage
      title="خرید ارزیابی"
      description="وضعیت پرداخت و حق دسترسی خود را بررسی کنید و از همین‌جا وارد آزمون شوید."
      icon={ClipboardList}
      backHref="/assessment?view=purchases"
      backLabel="ارزیابی‌ها"
    >
      <div className="space-y-4">
        <PatientResourceState variant="detail" {...resource} retry={() => void resource.reload()} />
        {resource.data && (
          <div className="space-y-4 rounded-3xl border border-border/80 bg-white p-5 shadow-xs sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="text-lg font-bold text-foreground">{resource.data.title}</h2>
              <span className="inline-flex rounded-full bg-primary/10 px-3.5 py-1 text-sm font-extrabold text-primary">
                {formatRialWithUnit(BigInt(resource.data.amountRial))}
              </span>
            </div>
            {resource.data.intent && (
              <Link
                href={`/profile/wallet/pay?intentId=${resource.data.intent.id}`}
                className="flex min-h-11 items-center justify-between rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm font-bold text-primary transition hover:border-primary/40 hover:bg-primary/5"
              >
                <span>وضعیت پرداخت</span>
                <span>{billingStatusLabel(resource.data.intent.status)} ←</span>
              </Link>
            )}
            <div className="space-y-2.5">
              {resource.data.grants.map((grant) => (
                <div
                  key={grant.id}
                  className="rounded-2xl border border-border/80 bg-background/50 p-4"
                >
                  {grant.accessAvailable ? (
                    <Link
                      href={
                        grant.submissionId
                          ? `/assessment/resume?submissionId=${grant.submissionId}`
                          : `/assessment/resume?grantId=${grant.id}`
                      }
                      className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-primary/90"
                    >
                      شروع، ادامه یا مشاهدهٔ نتیجه
                    </Link>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      دسترسی این ارزیابی فعلاً فعال نیست.
                    </p>
                  )}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <Link
                href={resource.data.managementHref}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-border bg-white px-4 py-2.5 text-sm font-bold text-primary transition hover:border-primary/40 hover:bg-primary/5"
              >
                شرایط و مدیریت رضایت
              </Link>
              <button
                type="button"
                onClick={() => void resource.reload()}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-border bg-white px-4 py-2.5 text-sm font-bold text-foreground transition hover:bg-muted/50"
              >
                بررسی وضعیت تازه
              </button>
            </div>
          </div>
        )}
      </div>
    </ServicePage>
  );
}
