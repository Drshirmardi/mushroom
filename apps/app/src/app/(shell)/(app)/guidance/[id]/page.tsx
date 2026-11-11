"use client";
import { useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthSession } from "@/components/auth/session-gate";
import { ServicePage } from "@/components/shared/service-page";
import { BookOpen } from "lucide-react";
import { PatientResourceState } from "@/components/shared/patient-resource-state";
import { GuidanceSafety } from "@/components/shared/policy-acceptance";
import { getGuidanceContent } from "@/lib/digital-services-api";
import { usePatientResource } from "@/lib/use-patient-resource";
export default function GuidancePage() {
  const { id } = useParams<{ id: string }>(); const router = useRouter(); const { authentication } = useAuthSession();
  const resource = usePatientResource(useCallback(() => getGuidanceContent(authentication.accessToken, id), [authentication.accessToken, id]));
  return <ServicePage title="محتوای آموزشی" description="محتوای آموزشی مجاز و نکات مربوط به استفاده از آن را بخوانید." icon={BookOpen} backHref="/programs" backLabel="برنامه‌های سلامت"><div className="service-detail space-y-4"><PatientResourceState variant="detail" {...resource} retry={() => void resource.reload()} />{resource.data && <><h2 className="text-xl font-bold">{resource.data.title}</h2><p className="whitespace-pre-wrap text-sm leading-8">{resource.data.body}</p><GuidanceSafety safety={resource.data.safety} /></>}</div></ServicePage>;
}
