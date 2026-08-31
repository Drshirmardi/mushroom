"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useAuthSession } from "@/components/auth/session-gate";
import { PageHeader } from "@/components/shared/page-header";
import { assessmentErrorMessage, getAssessmentResult, listPublishedAssessments, type AssessmentSubmission, type PublishedAssessment } from "@/lib/assessment-api";
import { toP } from "@/lib/format";

const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

function Result() {
  const router = useRouter();
  const submissionId = useSearchParams().get("submissionId");
  const { authentication } = useAuthSession();
  const [result, setResult] = useState<AssessmentSubmission | null>(null);
  const [assessment, setAssessment] = useState<PublishedAssessment | null>(null);
  const [error, setError] = useState<string | null>(submissionId ? null : "شناسهٔ نتیجه مشخص نیست.");

  useEffect(() => {
    if (!submissionId) return;
    let cancelled = false;
    void getAssessmentResult(authentication.accessToken, submissionId).then(
      (data) => {
        if (cancelled) return;
        setResult(data);
        void listPublishedAssessments(authentication.accessToken).then((list) => {
          if (!cancelled) setAssessment(list.items.find((item) => item.id === data.assessmentVersionId) ?? null);
        }, () => undefined);
      },
      (reason: unknown) => { if (!cancelled) setError(assessmentErrorMessage(reason)); },
    );
    return () => { cancelled = true; };
  }, [authentication.accessToken, submissionId]);

  const band = object(object(result?.resultSnapshot).resultBand);
  return <div><PageHeader title="نتیجه ارزیابی" onBack={() => router.push("/assessment")} /><div className="px-4 space-y-4 pb-4">{!result && !error && <p role="status" className="rounded-2xl border border-border bg-white p-5 text-sm text-muted-foreground">در حال دریافت نتیجهٔ ثبت‌شده…</p>}{error && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</p>}{result && <><div className="rounded-3xl bg-primary p-6 text-center text-white"><p className="mb-1 text-sm text-white/70">{assessment?.title ?? "ارزیابی ثبت‌شده"}{assessment ? ` · نسخه ${toP(assessment.versionNumber)}` : ""}</p><p className="text-5xl font-black">{result.score == null ? "—" : toP(result.score)}</p><p className="mt-2 text-sm text-white/80">{typeof band.title === "string" ? band.title : "نتیجه بدون بازهٔ امتیازی"}</p></div><div className="rounded-2xl border border-border bg-white p-4 text-sm"><p><span className="text-muted-foreground">وضعیت:</span> تکمیل‌شده و غیرقابل‌ویرایش</p><p className="mt-2"><span className="text-muted-foreground">نسخهٔ ثبت‌شده:</span> {assessment ? toP(assessment.versionNumber) : result.assessmentVersionId}</p><p className="mt-2"><span className="text-muted-foreground">تاریخ تکمیل:</span> {result.completedAt ? new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(result.completedAt)) : "ثبت نشده"}</p>{band.requiresReview === true && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-amber-800">این نتیجه برای بررسی توسط درمانگر علامت‌گذاری شده است.</p>}</div><button onClick={() => router.push("/appointments/book")} className="w-full rounded-2xl bg-primary py-4 text-sm font-bold text-white">ادامه به رزرو نوبت</button></>}</div></div>;
}

export default function AssessmentResultPage() { return <Suspense fallback={<p className="p-4 text-sm text-muted-foreground">در حال دریافت نتیجه…</p>}><Result /></Suspense>; }
