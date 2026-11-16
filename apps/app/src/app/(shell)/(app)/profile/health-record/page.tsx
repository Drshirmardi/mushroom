"use client";
import { useCallback } from "react";
import Link from "next/link";
import { FileHeart, Activity, ArrowLeft } from "lucide-react";
import { ServicePage, ServiceSection, ServiceEmpty } from "@/components/shared/service-page";
import { PatientResourceState } from "@/components/shared/patient-resource-state";
import { useAuthSession } from "@/components/auth/session-gate";
import { getPatientClinicalTimeline } from "@/lib/clinical-history-api";
import { usePatientResource } from "@/lib/use-patient-resource";

export default function HealthRecordPage() {
  const { authentication } = useAuthSession();
  const resource = usePatientResource(useCallback(() => getPatientClinicalTimeline(authentication.accessToken), [authentication.accessToken]));
  return <ServicePage title="خلاصهٔ مشاوره‌ها" description="خلاصه‌هایی که درمانگر برای شما منتشر کرده است." icon={FileHeart} backHref="/profile/medical" backLabel="پرونده پزشکی">
    <ServiceSection title="مشاوره‌های من">
      <PatientResourceState {...resource} retry={() => void resource.reload()} />
      {resource.data?.items.length === 0 && <ServiceEmpty icon={Activity} title="هنوز خلاصهٔ مشاوره‌ای منتشر نشده" description="پس از مشاوره و انتشار خلاصه توسط درمانگر، سابقهٔ آن اینجا نمایش داده می‌شود. می‌توانید وضعیت نوبت‌ها را بررسی کنید." href="/appointments" action="مشاهدهٔ نوبت‌های من" />}
      {resource.data?.items.map(item => <article key={item.appointmentId} className="service-card"><time className="service-badge" dateTime={item.publishedAt}>{new Intl.DateTimeFormat("fa-IR", {dateStyle:"medium"}).format(new Date(item.publishedAt))}</time><p className="whitespace-pre-wrap">{item.patientSummary}</p><Link href={`/appointments/${encodeURIComponent(item.appointmentId)}`} className="service-text-action">جزئیات مشاورهٔ مربوط<ArrowLeft size={17} aria-hidden="true" /></Link></article>)}
    </ServiceSection>
  </ServicePage>;
}
