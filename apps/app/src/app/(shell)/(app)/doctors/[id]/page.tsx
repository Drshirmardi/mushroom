"use client";

import { Suspense, useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowRight, BriefcaseMedical, Clock3, Info, Languages, ShieldAlert } from "lucide-react";
import { useAuthSession } from "@/components/auth/session-gate";
import { DoctorBooking } from "@/components/booking/doctor-booking";
import { DoctorPortrait } from "@/components/booking/doctor-portrait";
import styles from "@/components/booking/booking.module.css";
import { BottomSheet } from "@/components/shared/bottom-sheet";
import { PatientResourceState } from "@/components/shared/patient-resource-state";
import { ServiceEmpty } from "@/components/shared/service-page";
import { LoadingState } from "@/components/shared/skeletons";
import { getBookingEligibility } from "@/lib/assessment-api";
import { bookingBlocker } from "@/lib/booking-eligibility";
import { getPatientDoctor } from "@/lib/directory-api";
import { toP } from "@/lib/format";
import { usePatientResource } from "@/lib/use-patient-resource";

function DoctorProfile() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const { authentication: { accessToken: token, user } } = useAuthSession();
  const doctor = usePatientResource(useCallback(() => getPatientDoctor(token, id), [token, id]));
  const eligibility = usePatientResource(useCallback(() => getBookingEligibility(token), [token]));
  const blocker = eligibility.data ? bookingBlocker(eligibility.data) : null;
  const [detailsId, setDetailsId] = useState("");
  const detailsButton = useRef<HTMLButtonElement>(null);
  const from = new URLSearchParams();
  const q = params.get("q");
  const mode = params.get("mode");
  if (q) from.set("q", q);
  if (mode) from.set("mode", mode);
  const profile = doctor.data?.id === id ? doctor.data : null;
  const demoPortrait = process.env.NODE_ENV === "development" &&
    !profile?.profileImageUrl && profile?.displayName.startsWith("Synthetic chat doctor ");
  const specialty = profile?.specialties.map(item => item.name).join("، ");
  const details = profile ? [
    { label: "تحصیلات", values: profile.education },
    { label: "گواهی‌ها", values: profile.certifications },
    { label: "زبان‌ها", values: profile.languages },
  ].filter(({ values }) => values.length > 0) : [];
  const stats = profile ? [
    { label: "سابقه", value: profile.yearsExperience == null ? null : `${toP(profile.yearsExperience)} سال`, icon: Clock3 },
    { label: "خدمت", value: profile.offerings.length ? toP(profile.offerings.length) : null, icon: BriefcaseMedical },
    { label: "زبان", value: profile.languages.length ? toP(profile.languages.length) : null, icon: Languages },
  ].filter(({ value }) => value !== null) : [];

  return <main className={`${styles.profile} min-h-full overflow-x-clip py-3 sm:py-8`} dir="rtl">
    <div className={`${styles.frame} relative mx-auto grid w-full max-w-[550px] min-w-0 gap-2`}>
    <PatientResourceState {...doctor} variant="detail" retry={() => void doctor.reload()} />
    <section className={`${styles.hero} relative min-w-0`} aria-label="معرفی پزشک">
      <div className={styles.stage}>
        <Link href={`/appointments/book${from.size ? `?${from}` : ""}`} aria-label="بازگشت به فهرست پزشکان" className="z-10 grid size-11 place-items-center self-start justify-self-start rounded-full bg-white/60 text-primary backdrop-blur-sm transition hover:bg-white/85 active:scale-95 sm:size-12">
          <ArrowRight size={21} aria-hidden="true" />
        </Link>
        {profile ? <>
          <div className={`${styles.heroImage} ${demoPortrait ? styles.landingPortrait : ""}`}>
            {demoPortrait
              ? <img src="/booking/doctor-portrait.webp" alt="" width={1086} height={1448} />
              : <DoctorPortrait name={profile.displayName} url={profile.profileImageUrl} token={token} eager />}
          </div>
          <div className={`${styles.identity} z-10 min-w-0 wrap-anywhere`}>
            {profile.yearsExperience != null && <span className={`${styles.experience} inline-flex max-w-full items-center gap-1 rounded-full bg-white/75 font-semibold`}>
              <Clock3 size={14} className="shrink-0" aria-hidden="true" /><span>{toP(profile.yearsExperience)} سال سابقه</span>
            </span>}
            <h1 dir="auto" data-long={profile.displayName.length > 25} className={`${styles.name} text-start font-semibold`}>{profile.displayName}</h1>
            {specialty && <p className={`${styles.specialty} text-muted-foreground`}>{specialty}</p>}
          </div>
          {(specialty || profile.biography || details.length > 0 || stats.length > 0) && <div className={`${styles.glass} z-10 col-span-full self-end rounded-full p-2.5 sm:p-4`}>
            <button ref={detailsButton} type="button" onClick={() => setDetailsId(id)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-secondary px-4 text-sm font-bold text-primary">
              <Info size={17} aria-hidden="true" />جزئیات پزشک
            </button>
          </div>}
        </> : <h1 className="col-span-full font-bold">پروفایل پزشک</h1>}
      </div>
      {stats.length > 0 && <dl className={`${styles.stats} relative mt-1.5 grid auto-cols-fr grid-flow-col gap-2 rounded-full bg-card`}>
        {stats.map(({ label, value, icon: Icon }) => <div key={label} className="flex min-w-0 flex-wrap items-center justify-center gap-x-1 gap-y-0.5">
          <Icon size={14} className="shrink-0 text-primary" aria-hidden="true" />
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="whitespace-nowrap font-bold">{value}</dd>
        </div>)}
      </dl>}
    </section>
    {profile && <>
      {detailsId === id && <BottomSheet title="جزئیات پزشک" finalFocus={detailsButton} onClose={() => setDetailsId("")}>
        <div dir="rtl" className="grid gap-3 pb-4 text-sm leading-6 wrap-anywhere">
          <div className="grid gap-1">
            <p className="text-base font-bold leading-6">{profile.displayName}</p>
            {specialty && <p className="text-sm text-muted-foreground">{specialty}</p>}
          </div>
          {profile.biography && <p className="rounded-xl border border-border/70 bg-muted/40 px-3 py-2.5 text-sm leading-6 text-muted-foreground whitespace-pre-wrap">{profile.biography}</p>}
          {stats.length > 0 && <dl className="grid grid-cols-3 gap-2">
            {stats.map(({ label, value }) => <div key={label} className="min-w-0 rounded-xl bg-muted/70 px-2 py-2 text-center">
              <dt className="text-xs leading-5 text-muted-foreground">{label}</dt><dd className="mt-0.5 text-sm font-semibold leading-5">{value}</dd>
            </div>)}
          </dl>}
          {details.map(({ label, values }) => <section key={label} className="min-w-0 rounded-xl border border-border/70 bg-muted/40 px-3 py-2.5">
            <h2 className="text-sm font-semibold leading-6">{label}</h2>
            <ul className="mt-1 grid gap-1 text-sm leading-6 text-muted-foreground">
              {values.map((value, index) => <li key={`${value}-${index}`}>{value}</li>)}
            </ul>
          </section>)}
        </div>
      </BottomSheet>}
      <div className={`${styles.bookingSheet} grid min-w-0 bg-card`}>
      <PatientResourceState {...eligibility} retry={() => void eligibility.reload()} />
      {blocker && <ServiceEmpty icon={ShieldAlert} title="شرایط رزرو" description={blocker.message} href={blocker.href} action={blocker.action} />}
      {eligibility.data && !blocker && <DoctorBooking key={`${user.id}:${id}`} doctor={profile} token={token} userId={user.id} />}
      </div>
    </>}
    </div>
  </main>;
}

export default function DoctorProfilePage() {
  return <Suspense fallback={<LoadingState variant="detail" />}><DoctorProfile /></Suspense>;
}
