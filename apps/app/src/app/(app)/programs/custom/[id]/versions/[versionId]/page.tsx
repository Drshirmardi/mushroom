"use client";
import Link from "next/link";
import { useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthSession } from "@/components/auth/session-gate";
import { ServicePage } from "@/components/shared/service-page";
import { FileHeart } from "lucide-react";
import { PatientResourceState } from "@/components/shared/patient-resource-state";
import { getCustomDeliveryVersion } from "@/lib/digital-services-api";
import { usePatientResource } from "@/lib/use-patient-resource";
import { toP } from "@/lib/format";
export default function CustomVersionPage() {
  const { id, versionId } = useParams<{ id: string; versionId: string }>(); const router = useRouter(); const { authentication } = useAuthSession();
  const resource = usePatientResource(useCallback(() => getCustomDeliveryVersion(authentication.accessToken, id, versionId), [authentication.accessToken, id, versionId]));
  const plan = resource.data?.plan;
  return <ServicePage title="نسخهٔ برنامهٔ اختصاصی" description="نسخهٔ منتشرشدهٔ برنامه و دستورهای ثبت‌شدهٔ درمانگر را بخوانید." icon={FileHeart} backHref="/programs?view=mine" backLabel="برنامه‌های سلامت"><div className="service-detail space-y-4"><PatientResourceState {...resource} retry={() => void resource.reload()} />{resource.data && <><h2 className="text-lg font-bold">نسخه {toP(resource.data.versionNumber)}</h2>{plan && resource.data.bodyAvailable ? <><h2 className="font-bold">{plan.title}</h2><section className="space-y-3"><h3 className="font-bold">داروها</h3>{plan.medications.map(item => <div key={item.id} className="rounded-xl border border-border p-4"><p className="text-sm font-bold">{item.name}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-7">{[item.dosage, item.instructions].filter(Boolean).join(" · ")}</p></div>)}</section><section className="space-y-3"><h3 className="font-bold">جلسات</h3>{plan.sessionPlans.map(item => <div key={item.id} className="rounded-xl border border-border p-4"><p className="font-bold">{item.title}</p><p className="mt-2 text-sm">{item.goals.join("، ")}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-7">{item.patientInstructions}</p></div>)}</section><section className="space-y-3"><h3 className="font-bold">تمرین و تغذیه</h3>{[...plan.exercisePlans, ...plan.nutritionPlans].map(item => <div key={item.id} className="rounded-xl border border-border p-4"><p className="font-bold">{item.title}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-7">{item.instructions}</p></div>)}</section><Link href="/treatment" className="block rounded-xl bg-primary p-4 text-center font-bold text-white">فعالیت‌ها، ثبت انجام و پیگیری درمان</Link></> : <p className="text-sm text-muted-foreground">محتوای این نسخه فعلاً در دسترس نیست.</p>}</>}</div></ServicePage>;
}
