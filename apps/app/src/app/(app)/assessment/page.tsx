"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Play } from "lucide-react";

import { useAuthSession } from "@/components/auth/session-gate";
import { assessmentErrorMessage, listPublishedAssessments, type PublishedAssessment } from "@/lib/assessment-api";
import { toP } from "@/lib/format";

const questionCount = (structure: Record<string, unknown>) => Array.isArray(structure.sections) ? structure.sections.reduce((total, section) => {
  const value = section && typeof section === "object" ? section as Record<string, unknown> : {};
  return total + (Array.isArray(value.questions) ? value.questions.length : 0);
}, 0) : 0;

export default function AssessmentPage() {
  const router = useRouter();
  const { authentication } = useAuthSession();
  const [items, setItems] = useState<PublishedAssessment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void listPublishedAssessments(authentication.accessToken).then(
      (result) => { if (!cancelled) setItems(result.items); },
      (reason: unknown) => { if (!cancelled) setError(assessmentErrorMessage(reason)); },
    );
    return () => { cancelled = true; };
  }, [authentication.accessToken]);

  return <div className="px-4 space-y-4">
    <div className="pt-3 pb-1"><h1 className="text-xl font-bold text-foreground">ارزیابی سلامت</h1><p className="mt-0.5 text-sm text-muted-foreground">ارزیابی‌های منتشرشدهٔ کلینیک</p></div>
    {!items && !error && <p role="status" className="rounded-2xl border border-border bg-white p-5 text-sm text-muted-foreground">در حال دریافت ارزیابی‌ها…</p>}
    {error && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</p>}
    {items?.length === 0 && <div className="rounded-2xl border border-border bg-white p-8 text-center"><ClipboardList className="mx-auto mb-3 text-muted-foreground/50" /><p className="text-sm font-bold">فعلاً ارزیابی منتشرشده‌ای وجود ندارد.</p></div>}
    {items?.map((item) => <button key={item.id} onClick={() => router.push(`/assessment/${item.id}`)} className="w-full rounded-3xl border border-primary/20 bg-white p-5 text-right shadow-sm active:scale-[0.99]"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white"><ClipboardList size={22} /></div><div><h2 className="font-bold text-foreground">{item.title}</h2><p className="mt-1 text-xs text-muted-foreground">نسخه {toP(item.versionNumber)} · {toP(questionCount(item.structure))} سوال</p></div><span className="mr-auto flex items-center gap-1 rounded-xl bg-primary/10 px-3 py-2 text-xs font-bold text-primary"><Play size={13} />شروع یا ادامه</span></div></button>)}
  </div>;
}
