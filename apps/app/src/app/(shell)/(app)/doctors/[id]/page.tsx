"use client";

import { Suspense, useCallback, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowRight, ShieldAlert } from "lucide-react";
import { useAuthSession } from "@/components/auth/session-gate";
import { DoctorBooking } from "@/components/booking/doctor-booking";
import { DoctorPortrait } from "@/components/booking/doctor-portrait";
import styles from "@/components/booking/booking.module.css";
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
  const [expandedId, setExpandedId] = useState("");
  const from = new URLSearchParams();
  const q = params.get("q");
  const mode = params.get("mode");
  if (q) from.set("q", q);
  if (mode) from.set("mode", mode);
  const profile = doctor.data;

  return <main className={styles.profile} dir="rtl">
    <header className={styles.header}><Link href={`/appointments/book${from.size ? `?${from}` : ""}`} aria-label="بازگشت به فهرست پزشکان"><ArrowRight size={22} aria-hidden="true" /></Link><h1>پروفایل پزشک</h1></header>
    <PatientResourceState {...doctor} variant="detail" retry={() => void doctor.reload()} />
    {profile?.id === id && <>
      <section className={styles.hero} aria-label="معرفی پزشک">
        <div className={styles.heroText}>
          {profile.yearsExperience != null && <p>{toP(profile.yearsExperience)} سال سابقه</p>}
          <h2>{profile.displayName}</h2>
          <p>{profile.specialties.map(item => item.name).join("، ")}</p>
        </div>
        <div className={styles.heroImage}><DoctorPortrait name={profile.displayName} url={profile.profileImageUrl} token={token} eager /></div>
      </section>
      {(profile.biography || profile.education.length > 0 || profile.certifications.length > 0 || profile.languages.length > 0) && <section className={styles.section}>
        <h2>دربارهٔ پزشک</h2>
        {profile.biography && <p className={styles.bio} id="doctor-biography">{expandedId !== id && profile.biography.length > 180 ? `${profile.biography.slice(0, 180).trimEnd()}…` : profile.biography}</p>}
        {profile.biography && profile.biography.length > 180 && <button type="button" className="service-text-action justify-self-start" aria-expanded={expandedId === id} aria-controls="doctor-biography" onClick={() => setExpandedId(expandedId === id ? "" : id)}>{expandedId === id ? "نمایش کمتر" : "بیشتر بخوانید"}</button>}
        {[["تحصیلات", profile.education], ["گواهی‌ها", profile.certifications], ["زبان‌ها", profile.languages]].map(([label, values]) => Array.isArray(values) && values.length > 0 && <p key={String(label)} className="text-sm"><strong>{label}</strong> · {values.join("، ")}</p>)}
      </section>}
      <PatientResourceState {...eligibility} retry={() => void eligibility.reload()} />
      {blocker && <ServiceEmpty icon={ShieldAlert} title="شرایط رزرو" description={blocker.message} href={blocker.href} action={blocker.action} />}
      {eligibility.data && !blocker && <DoctorBooking key={`${user.id}:${id}`} doctor={profile} token={token} userId={user.id} />}
    </>}
  </main>;
}

export default function DoctorProfilePage() {
  return <Suspense fallback={<LoadingState variant="detail" />}><DoctorProfile /></Suspense>;
}
