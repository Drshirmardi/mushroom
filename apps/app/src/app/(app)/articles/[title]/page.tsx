"use client";
import { useCallback, useState } from "react";
import { useParams } from "next/navigation";
import { BookOpen, Share2 } from "lucide-react";
import { ServicePage } from "@/components/shared/service-page";
import { PatientResourceState } from "@/components/shared/patient-resource-state";
import { useAuthSession } from "@/components/auth/session-gate";
import { getPatientArticle } from "@/lib/follow-up-api";
import { usePatientResource } from "@/lib/use-patient-resource";

export default function ArticleDetailPage() {
  const { title: slug } = useParams<{title:string}>(); const { authentication } = useAuthSession();
  const resource = usePatientResource(useCallback(() => getPatientArticle(authentication.accessToken, slug), [authentication.accessToken, slug]));
  const [notice, setNotice] = useState<string | null>(null);
  const share = async () => { if (!resource.data) return; try { if (navigator.share) await navigator.share({title:resource.data.title,url:window.location.href}); else { await navigator.clipboard.writeText(window.location.href); setNotice("پیوند مقاله کپی شد."); } } catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) setNotice("اشتراک‌گذاری ممکن نشد؛ پیوند صفحه را از نوار نشانی کپی کنید."); } };
  return <ServicePage title={resource.data?.title ?? "مقالهٔ آموزشی"} description={resource.data?.summary ?? "محتوای آموزشی منتشرشدهٔ کلینیک"} icon={BookOpen} backHref="/articles" backLabel="مقاله‌ها">
    <PatientResourceState variant="detail" {...resource} retry={() => void resource.reload()} />
    {resource.data && <article className="service-article"><div className="flex flex-wrap items-center justify-between gap-3"><span className="service-badge">{resource.data.category.name}</span><button type="button" onClick={() => void share()} className="service-text-action"><Share2 size={18} aria-hidden="true" />اشتراک‌گذاری مقاله</button></div><div className="service-article-body">{resource.data.body}</div></article>}
    {notice && <p role="status" className="service-note mt-4">{notice}</p>}
  </ServicePage>;
}
