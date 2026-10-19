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
  return <ServicePage title="پروندهٔ سلامت" description="خلاصه‌های منتشرشدهٔ مشاوره‌ها و روند مراقبت خود را در یک جا ببینید." icon={FileHeart}>
    <Link href="/onboarding" className="service-callout"><FileHeart size={24} aria-hidden="true" /><div><h2>اطلاعات اولیهٔ من</h2><p>برای تکمیل یا اصلاح اطلاعات خوداظهاری پرونده</p></div><ArrowLeft size={18} aria-hidden="true" /></Link>
    <ServiceSection title="تاریخچهٔ مراقبت" description="فقط خلاصه‌هایی که برای شما منتشر شده‌اند در این بخش نمایش داده می‌شوند.">
      <PatientResourceState {...resource} retry={() => void resource.reload()} />
      {resource.data?.items.length === 0 && <ServiceEmpty icon={Activity} title="هنوز خلاصهٔ مشاوره‌ای منتشر نشده" description="پس از مشاوره و انتشار خلاصه توسط درمانگر، سابقهٔ آن اینجا نمایش داده می‌شود. می‌توانید وضعیت نوبت‌ها را بررسی کنید." href="/appointments" action="مشاهدهٔ نوبت‌های من" />}
      {resource.data?.items.map(item => <article key={item.appointmentId} className="service-card"><time className="service-badge" dateTime={item.publishedAt}>{new Intl.DateTimeFormat("fa-IR", {dateStyle:"medium"}).format(new Date(item.publishedAt))}</time><p className="whitespace-pre-wrap">{item.patientSummary}</p><Link href={`/appointments/${encodeURIComponent(item.appointmentId)}`} className="service-text-action">جزئیات مشاورهٔ مربوط<ArrowLeft size={17} aria-hidden="true" /></Link></article>)}
    </ServiceSection>
  </ServicePage>;
}
