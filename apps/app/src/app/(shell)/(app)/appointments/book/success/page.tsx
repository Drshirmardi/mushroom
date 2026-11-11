"use client";
import { LoadingState } from "@/components/shared/skeletons";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { SuccessScreen } from "@/components/shared/success-screen";
import { toP } from "@/lib/format";

function BookSuccess() { const router = useRouter(); const params = useSearchParams(); const appointmentId = params.get("appointmentId"); const changed = params.get("changed") === "1"; return <div><PageHeader title="" onBack={() => router.push("/appointments")} /><div className="px-4"><SuccessScreen title={changed ? "زمان نوبت تغییر کرد" : "نوبت با موفقیت ثبت شد!"} desc={changed ? "زمان نوبت شما به‌روزرسانی شد." : "پرداخت انجام شد و نوبت شما در انتظار تأیید کلینیک ثبت شد."} onDone={() => router.push("/appointments")} />{appointmentId && <div className="-mt-2 rounded-2xl border border-border bg-white p-4 shadow-sm"><p className="mb-3 text-xs font-bold text-muted-foreground">کد پیگیری</p><div className="rounded-xl bg-muted p-3 text-lg font-black tracking-widest text-primary">{toP(appointmentId.slice(0, 8))}</div></div>}</div></div>; }
export default function BookSuccessPage() { return <Suspense fallback={<LoadingState variant="list" className="p-4" />}><BookSuccess /></Suspense>; }
