"use client";
import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, ArrowLeft } from "lucide-react";
import { useAuthSession } from "@/components/auth/session-gate";
import { ServicePage, ServiceSection, ServiceEmpty } from "@/components/shared/service-page";
import { PatientResourceState } from "@/components/shared/patient-resource-state";
import { listPatientArticles } from "@/lib/follow-up-api";
import { usePatientResource } from "@/lib/use-patient-resource";

export default function ArticlesPage() {
  const { authentication } = useAuthSession();
  const resource = usePatientResource(useCallback(() => listPatientArticles(authentication.accessToken), [authentication.accessToken]));
  const [category, setCategory] = useState("همه");
  const categories = useMemo(() => ["همه", ...new Set((resource.data?.items ?? []).map(item => item.category.name))], [resource.data]);
  const filtered = category === "همه" ? resource.data?.items : resource.data?.items.filter(item => item.category.name === category);
  return <ServicePage title="برای آگاهی بیشتر" description="مقاله‌های منتشرشدهٔ کلینیک دربارهٔ سلامت و مراقبت را بخوانید." icon={BookOpen}>
    {resource.data && resource.data.items.length > 0 && <div className="service-categories" role="group" aria-label="موضوع مقاله‌ها">{categories.map(item => <button type="button" key={item} aria-pressed={item === category} onClick={() => setCategory(item)}>{item}</button>)}</div>}
    <ServiceSection title="مطالب آموزشی" description="مطالب آموزشی جای بررسی وضعیت فردی توسط درمانگر را نمی‌گیرند."><PatientResourceState {...resource} retry={() => void resource.reload()} />
      {filtered?.length === 0 && <ServiceEmpty icon={BookOpen} title="هنوز مطلبی در این بخش منتشر نشده" description="پس از انتشار مقاله، می‌توانید آن را اینجا بخوانید. اگر موضوع خاصی را انتخاب کرده‌اید، موضوع‌های دیگر را هم بررسی کنید." />}
      {filtered?.map(item => <Link key={item.id} href={`/articles/${encodeURIComponent(item.slug)}`} className="service-card"><span className="service-badge">{item.category.name}</span><h3 className="mt-3">{item.title}</h3>{item.summary && <p className="line-clamp-3">{item.summary}</p>}<span className="service-text-action">خواندن مقاله<ArrowLeft size={17} aria-hidden="true" /></span></Link>)}
    </ServiceSection>
  </ServicePage>;
}
