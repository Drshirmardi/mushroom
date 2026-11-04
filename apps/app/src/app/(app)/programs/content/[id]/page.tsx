"use client";
import Link from "next/link";
import { useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthSession } from "@/components/auth/session-gate";
import { ServicePage } from "@/components/shared/service-page";
import { BookOpen } from "lucide-react";
import { PatientResourceState } from "@/components/shared/patient-resource-state";
import { GuidanceSafety } from "@/components/shared/policy-acceptance";
import { getProgramContent } from "@/lib/digital-services-api";
import { usePatientResource } from "@/lib/use-patient-resource";
export default function ProgramContentPage() {
  const { id } = useParams<{ id: string }>(); const router = useRouter(); const { authentication } = useAuthSession();
  const resource = usePatientResource(useCallback(() => getProgramContent(authentication.accessToken, id), [authentication.accessToken, id]));
  return <ServicePage title="برنامهٔ آموزشی من" description="محتوای در دسترس برنامهٔ آموزشی خود را از همین صفحه دنبال کنید." icon={BookOpen} backHref="/programs?view=mine" backLabel="برنامه‌های سلامت"><div className="service-detail space-y-4"><PatientResourceState variant="detail" {...resource} retry={() => void resource.reload()} />{resource.data && <><h2 className="text-xl font-bold">{resource.data.title}</h2>{resource.data.endsAt && <p className="text-xs text-muted-foreground">پایان دسترسی: {new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(new Date(resource.data.endsAt))}</p>}<p className="whitespace-pre-wrap rounded-2xl border border-border bg-white p-5 text-sm leading-8">{resource.data.body}</p><GuidanceSafety safety={resource.data.safety} />{resource.data.contentReferences.map(item => <Link key={item.id} href={`/guidance/${item.id}`} className="block rounded-xl border border-border p-4 text-primary">مطالعهٔ محتوای آموزشی مرتبط</Link>)}<button onClick={() => void resource.reload()} className="text-sm text-primary">بررسی دسترسی و محتوای تازه</button></>}</div></ServicePage>;
}
