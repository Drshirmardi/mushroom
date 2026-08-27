"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ShieldAlert, Star } from "lucide-react";

import { useAuthSession } from "@/components/auth/session-gate";
import { PageHeader } from "@/components/shared/page-header";
import { assessmentErrorMessage, getBookingEligibility, type BookingEligibility } from "@/lib/assessment-api";
import { bookingBlocker } from "@/lib/booking-eligibility";
import { DOCTORS } from "@/lib/data/catalog";
import { useScreenNavigation } from "@/lib/navigation";

function BookStep1() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const navigateScreen = useScreenNavigation();
  const { authentication } = useAuthSession();
  const [selected, setSelected] = useState(searchParams.get("preselectedDoctor") || "");
  const [decision, setDecision] = useState<BookingEligibility | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getBookingEligibility(authentication.accessToken).then(
      (value) => { if (!cancelled) setDecision(value); },
      (reason: unknown) => { if (!cancelled) setError(assessmentErrorMessage(reason)); },
    );
    return () => { cancelled = true; };
  }, [authentication.accessToken]);

  const blocker = decision ? bookingBlocker(decision) : null;
  return <div><PageHeader title="انتخاب پزشک" onBack={() => router.back()} /><div className="px-4 space-y-3 pb-4">{!decision && !error && <p role="status" className="rounded-2xl border border-border bg-white p-5 text-sm text-muted-foreground">در حال بررسی شرایط رزرو…</p>}{error && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</p>}{blocker && <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-900"><ShieldAlert className="mb-3" /><h2 className="font-bold">رزرو هنوز آماده نیست</h2><p className="mt-2 text-sm leading-6">{blocker.message}</p><button onClick={() => router.push(blocker.href)} className="mt-4 w-full rounded-2xl bg-primary py-3 text-sm font-bold text-white">{blocker.action}</button></div>}{decision && !blocker && <><div className="mb-4 flex items-center gap-2 rounded-2xl bg-muted/60 p-3"><div className="flex gap-1">{[1, 2, 3].map((step) => <div key={step} className={`h-1.5 w-6 rounded-full ${step === 1 ? "bg-primary" : "bg-muted"}`} />)}</div><span className="text-xs text-muted-foreground">مرحله ۱ از ۳: انتخاب پزشک</span></div>{DOCTORS.map((doctor) => <button key={doctor.id} onClick={() => setSelected(doctor.id)} className={`w-full flex items-center gap-3 p-4 rounded-2xl border text-right ${selected === doctor.id ? "bg-accent border-primary/40" : "bg-white border-border shadow-sm"}`}><div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-2xl"><img src={`https://images.unsplash.com/${doctor.img}?w=112&h=112&fit=crop&auto=format`} alt={doctor.name} className="h-full w-full object-cover" /></div><div className="min-w-0 flex-1"><p className="text-sm font-bold text-foreground">{doctor.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{doctor.specialty} · {doctor.exp}</p><div className="mt-1 flex items-center gap-1"><Star size={11} className="fill-amber-400 text-amber-400" /><span className="text-xs font-semibold">{doctor.rating}</span></div></div>{selected === doctor.id && <Check size={18} className="text-primary" />}</button>)}<button disabled={!selected} onClick={() => navigateScreen("BookStep2", { doctorId: selected })} className={`mt-4 w-full rounded-2xl py-4 text-sm font-bold ${selected ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>ادامه</button></>}</div></div>;
}

export default function BookStep1Page() { return <Suspense fallback={<p className="p-4 text-sm text-muted-foreground">در حال بررسی شرایط رزرو…</p>}><BookStep1 /></Suspense>; }
