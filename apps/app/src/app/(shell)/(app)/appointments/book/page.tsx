"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays, Search, ShieldAlert, Stethoscope, type LucideIcon } from "lucide-react";
import { useAuthSession } from "@/components/auth/session-gate";
import { DoctorPortrait } from "@/components/booking/doctor-portrait";
import { LoadingState } from "@/components/shared/skeletons";
import { PatientResourceState } from "@/components/shared/patient-resource-state";
import { getBookingEligibility } from "@/lib/assessment-api";
import { bookingBlocker } from "@/lib/booking-eligibility";
import { listPatientDoctors } from "@/lib/directory-api";
import { usePatientResource } from "@/lib/use-patient-resource";
import { toP } from "@/lib/format";

function Directory({ token, query, mode }: { token: string; query: string; mode?: "ONLINE" | "IN_PERSON" }) {
  const [page, setPage] = useState(1);
  const [extra, setExtra] = useState<Awaited<ReturnType<typeof listPatientDoctors>>["items"]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState(false);
  const resource = usePatientResource(useCallback(() => listPatientDoctors(token, { query, visitMode: mode }), [token, query, mode]));
  const items = [...(resource.data?.items ?? []), ...extra];
  const from = new URLSearchParams();
  if (query) from.set("q", query);
  if (mode) from.set("mode", mode);

  async function loadMore() {
    setLoadingMore(true);
    setMoreError(false);
    try {
      const next = await listPatientDoctors(token, { query, visitMode: mode, page: page + 1 });
      setExtra(current => [...current, ...next.items]);
      setPage(next.page);
    } catch {
      setMoreError(true);
    } finally {
      setLoadingMore(false);
    }
  }

  return <>
    <PatientResourceState {...resource} retry={() => void resource.reload()} />
    {resource.data && !items.length && <BookingNotice icon={Stethoscope} title="پزشکی پیدا نشد" description="نام دیگری را جست‌وجو کنید یا نوع ویزیت را تغییر دهید." />}
    <div className="grid grid-cols-1 gap-3">
      {items.filter((doctor, index) => items.findIndex(item => item.id === doctor.id) === index).map(doctor => (
        <Link
          className="group grid min-w-0 grid-cols-[3.5rem_minmax(0,1fr)_1.25rem] items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-primary/50 hover:bg-primary/[0.025] active:bg-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:gap-4 sm:p-4"
          key={doctor.id}
          href={`/doctors/${doctor.id}${from.size ? `?${from}` : ""}`}
        >
          <DoctorPortrait
            name={doctor.displayName}
            url={doctor.profileImageUrl}
            token={token}
            className="grid size-14 shrink-0 place-items-center rounded-xl bg-secondary text-base font-extrabold text-primary object-cover object-[center_25%]"
          />
          <div className="min-w-0 break-words [overflow-wrap:anywhere]">
            <h2 className="text-sm font-extrabold leading-6 text-foreground sm:text-base">{doctor.displayName}</h2>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground sm:text-sm">{doctor.specialties.map(item => item.name).join("، ") || "تخصص ثبت نشده"}</p>
            {doctor.yearsExperience != null && <p className="text-xs leading-5 text-muted-foreground">{toP(doctor.yearsExperience)} سال سابقه</p>}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {doctor.offerings.some(item => item.visitMode === "ONLINE") && <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">آنلاین</span>}
              {doctor.offerings.some(item => item.visitMode === "IN_PERSON") && <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">حضوری</span>}
            </div>
          </div>
          <ArrowLeft size={18} className="text-muted-foreground transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
        </Link>
      ))}
    </div>
    {moreError && <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">دریافت پزشکان بیشتر انجام نشد. دوباره تلاش کنید.</p>}
    {resource.data && page * resource.data.pageSize < resource.data.total && <button type="button" className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-border bg-card px-4 font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto" onClick={() => void loadMore()} disabled={loadingMore}>{loadingMore ? "در حال دریافت…" : "نمایش پزشکان بیشتر"}</button>}
  </>;
}

function BookingNotice({ icon: Icon, title, description, href, action }: {
  icon: LucideIcon;
  title: string;
  description: string;
  href?: string;
  action?: string;
}) {
  return <section className="my-4 grid justify-items-center gap-2 rounded-2xl border border-border bg-card px-4 py-6 text-center sm:px-6" role="status">
    <Icon size={28} className="mb-1 text-primary" aria-hidden="true" />
    <h2 className="text-base font-bold text-foreground">{title}</h2>
    <p className="max-w-prose text-sm leading-6 text-muted-foreground">{description}</p>
    {href && action && <Link href={href} className="mt-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{action}<ArrowLeft size={17} aria-hidden="true" /></Link>}
  </section>;
}

function BookingDirectory() {
  const { authentication: { accessToken: token, user } } = useAuthSession();
  const router = useRouter();
  const params = useSearchParams();
  const query = params.get("q") ?? "";
  const [input, setInput] = useState(query);
  const mode = params.get("mode");
  const visitMode = mode === "ONLINE" || mode === "IN_PERSON" ? mode : undefined;
  const previousDoctor = params.get("preselectedDoctor");
  const eligibility = usePatientResource(useCallback(() => getBookingEligibility(token), [token]));
  const blocker = eligibility.data ? bookingBlocker(eligibility.data) : null;

  useEffect(() => {
    if (previousDoctor && eligibility.data && !blocker) router.replace(`/doctors/${encodeURIComponent(previousDoctor)}`);
  }, [previousDoctor, eligibility.data, blocker, router]);

  useEffect(() => {
    if (input.trim() === query) return;
    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (input.trim()) next.set("q", input.trim());
      else next.delete("q");
      router.replace(`/appointments/book${next.size ? `?${next}` : ""}`, { scroll: false });
    }, 280);
    return () => window.clearTimeout(timer);
  }, [input, query, params, router]);

  return <main dir="rtl" className="mx-auto w-full max-w-3xl px-4 pb-8 pt-4 text-foreground sm:px-6 sm:pt-6">
    <nav className="mb-5 flex min-h-11 items-center justify-between gap-3" aria-label="مسیر صفحه">
      <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><ArrowRight size={18} aria-hidden="true" />خانه</Link>
    </nav>
    <header className="relative mb-6 min-h-12 pe-16">
      <span className="absolute end-0 top-0 grid size-12 place-items-center rounded-2xl bg-secondary text-primary"><CalendarDays size={26} aria-hidden="true" /></span>
      <h1 className="text-2xl font-extrabold leading-10 text-foreground sm:text-[1.75rem]">رزرو مشاوره</h1>
      <p className="mt-1 max-w-prose text-sm leading-7 text-muted-foreground sm:text-base">پزشک خود را انتخاب کنید و خدمات و زمان‌های آزاد او را ببینید.</p>
    </header>
    <PatientResourceState {...eligibility} retry={() => void eligibility.reload()} />
    {blocker && <BookingNotice icon={ShieldAlert} title="یک مرحله تا آماده‌شدن رزرو" description={blocker.message} href={blocker.href} action={blocker.action} />}
    {eligibility.data && !blocker && !previousDoctor && <>
      <label className="flex min-h-12 w-full items-center gap-2.5 rounded-2xl border border-border bg-card px-3.5 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 sm:px-4">
        <Search size={19} className="shrink-0 text-muted-foreground" aria-hidden="true" />
        <input className="min-h-11 min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground/75" type="search" value={input} maxLength={160} onChange={event => setInput(event.target.value)} aria-label="جست‌وجوی نام پزشک" placeholder="نام پزشک را جست‌وجو کنید" />
      </label>
      <div className="my-3 flex flex-wrap gap-2" role="group" aria-label="نوع ویزیت">
        {([["", "همه"], ["ONLINE", "آنلاین"], ["IN_PERSON", "حضوری"]] as const).map(([value, label]) => {
          const next = new URLSearchParams();
          if (input.trim()) next.set("q", input.trim());
          if (value) next.set("mode", value);
          const selected = (visitMode ?? "") === value;
          return <button className={`inline-flex min-h-11 items-center justify-center rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-muted"}`} type="button" key={label} aria-pressed={selected} onClick={() => router.replace(`/appointments/book${next.size ? `?${next}` : ""}`, { scroll: false })}>{label}</button>;
        })}
      </div>
      <Directory key={JSON.stringify([query, visitMode, user.id])} token={token} query={query} mode={visitMode} />
    </>}
    <Link href="/appointments" className="mt-5 inline-flex min-h-11 items-center font-semibold text-primary transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">نوبت‌های من</Link>
  </main>;
}

export default function BookingPage() {
  return <Suspense fallback={<LoadingState variant="list" />}><BookingDirectory /></Suspense>;
}
