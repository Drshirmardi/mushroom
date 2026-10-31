"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ClipboardList, Users } from "lucide-react";
import { useAuthSession } from "@/components/auth/session-gate";
import { ServicePage, ServiceSection, ServiceEmpty, ServiceTabs } from "@/components/shared/service-page";
import { PatientResourceState } from "@/components/shared/patient-resource-state";
import { PatientPagination } from "@/components/shared/patient-pagination";
import { listPublishedAssessments, listAssessmentHistory } from "@/lib/assessment-api";
import { listAssessmentOfferings, listAssessmentPurchases, listEducationalAssessmentOfferings } from "@/lib/digital-services-api";
import { usePatientResource } from "@/lib/use-patient-resource";
import { formatRial } from "@/lib/wallet-money";
import { groupAssessmentCatalog } from "@/lib/assessment-catalog";
import { toP } from "@/lib/format";

type View = "start" | "history" | "purchases";
export default function AssessmentPage() {
  const { authentication } = useAuthSession(); const token = authentication.accessToken;
  const [view, setView] = useState<View>("start");
  useEffect(() => { const value = new URLSearchParams(window.location.search).get("view"); if (value === "start" || value === "history" || value === "purchases") setView(value); }, []);
  const changeView = (value: View) => { setView(value); const url = new URL(window.location.href); url.searchParams.set("view", value); window.history.replaceState(null, "", url); };
  const [page, setPage] = useState(1); const [offerPage, setOfferPage] = useState(1); const [purchasePage, setPurchasePage] = useState(1);
  const history = usePatientResource(useCallback(() => listAssessmentHistory(token, page), [token, page]));
  const published = usePatientResource(useCallback(() => listPublishedAssessments(token), [token]));
  const offerings = usePatientResource(useCallback(() => listAssessmentOfferings(token, offerPage), [token, offerPage]));
  const purchases = usePatientResource(useCallback(() => listAssessmentPurchases(token, purchasePage), [token, purchasePage]));
  const [educationalPage, setEducationalPage] = useState(1);
  const educational = usePatientResource(useCallback(() => listEducationalAssessmentOfferings(token, educationalPage), [token, educationalPage]));
  return <ServicePage title="ارزیابی سلامت" description="آزمون مناسب را انتخاب کنید یا پاسخ‌های قبلی و نتیجهٔ ارزیابی خود را ببینید." icon={ClipboardList}>
    <ServiceTabs<View> value={view} onChange={changeView} options={[{value:"start",label:"آزمون جدید"},{value:"history",label:"سوابق و نتایج"},{value:"purchases",label:"خریدهای من"}]} />
    {view === "start" && <>
      <ServiceSection title="ارزیابی‌های آموزشی" description="شرایط هر آزمون را بخوانید و با رضایت خود شروع کنید.">
        <PatientResourceState {...educational} retry={() => void educational.reload()} />
        {educational.data?.items.map(item => <Link key={item.id} href={`/assessment/educational/${item.id}`} className="service-card"><h3>{item.title}</h3><strong className="service-price">{item.priceMode === 'FREE' ? 'رایگان' : `${formatRial(BigInt(item.amountRial ?? '0'))} تومان`}</strong><span className="service-text-action">شرایط و شروع ارزیابی<ArrowLeft size={17} aria-hidden="true" /></span></Link>)}
        {educational.data && <PatientPagination page={educationalPage} total={educational.data.total} onChange={setEducationalPage} />}
      </ServiceSection>
      <ServiceSection title="آزمون‌های کلینیک" description="پیش از شروع، توضیحات و شرایط آزمون را بررسی کنید.">
        <PatientResourceState {...published} retry={() => void published.reload()} />
        {published.data && groupAssessmentCatalog(published.data.items).map(group => group.versions.length === 1 ? <Link key={group.key} href={`/assessment/${group.versions[0].id}`} className="service-card"><h3>{group.title}</h3><span className="service-text-action">شروع یا ادامهٔ آزمون<ArrowLeft size={17} aria-hidden="true" /></span></Link> : <article className="service-card" key={group.key}><h3>{group.title}</h3><p>{toP(group.versions.length)} نسخهٔ منتشرشده برای این آزمون در دسترس است. نسخهٔ موردنظر خود را انتخاب کنید؛ پاسخ‌های قبلی از بخش «سوابق و نتایج» ادامه داده می‌شوند.</p><details className="service-disclosure mt-2"><summary>انتخاب نسخهٔ آزمون</summary><div className="service-stack">{group.versions.map(item => <Link key={item.id} href={`/assessment/${item.id}`} className="service-catalog-version"><span>نسخهٔ {toP(item.versionNumber)}</span><ArrowLeft size={17} aria-hidden="true" /></Link>)}</div></details></article>)}
        {published.data?.items.length === 0 && <ServiceEmpty title="فعلاً آزمونی در این بخش فعال نیست" description="آزمون‌های کلینیک پس از انتشار در اینجا قرار می‌گیرند. نتیجه‌ها و پاسخ‌های قبلی را از «سوابق و نتایج» ببینید." icon={ClipboardList} />}
      </ServiceSection>
      <ServiceSection title="ارزیابی‌های قابل خرید" description="هزینه و رضایت‌نامه پیش از خرید نمایش داده می‌شوند.">
        <PatientResourceState {...offerings} retry={() => void offerings.reload()} />
        {offerings.data?.items.map(item => <Link key={item.id} href={item.kind === "COUPLES" ? `/assessment/couples?publicationId=${item.id}` : `/assessment/offerings/${item.id}`} className="service-card"><div className="service-card-top"><h3>{item.title}</h3><span className="service-badge">{item.kind === "COUPLES" ? "دو نفره" : "فردی"}</span></div><strong className="service-price">{formatRial(BigInt(item.amountRial))} تومان</strong><span className="service-text-action">جزئیات و شرایط ارزیابی<ArrowLeft size={17} aria-hidden="true" /></span></Link>)}
        {offerings.data?.items.length === 0 && <ServiceEmpty title="ارزیابی قابل خریدی منتشر نشده" description="پس از فعال‌شدن خدمات جدید، جزئیات و هزینهٔ آن‌ها در این بخش نمایش داده می‌شود." />}
        {offerings.data && <PatientPagination page={offerPage} total={offerings.data.total} onChange={setOfferPage} />}
      </ServiceSection>
      <Link href="/assessment/couples" className="service-callout"><Users size={26} aria-hidden="true" /><div><h2>می‌خواهید همراه هم ارزیابی شوید؟</h2><p>دعوت همراه، رضایت مستقل و پیگیری آزمون زوجین</p></div><ArrowLeft size={18} aria-hidden="true" /></Link>
    </>}
    {view === "history" && <ServiceSection title="پاسخ‌ها و نتایج من" description="پاسخ‌های ذخیره‌شده را ادامه دهید؛ نتایج تکمیل‌شده همیشه از همین بخش در دسترس‌اند.">
      <PatientResourceState {...history} retry={() => void history.reload()} />
      {history.data?.items.map(item => <article key={item.id} className="service-card"><div className="service-card-top"><h3>{item.title}</h3><span className={`service-badge ${item.state === "COMPLETE" ? "service-badge--success" : ""}`}>{item.state === "COMPLETE" ? "تکمیل شده" : item.resumeAvailable ? "در حال پاسخ‌گویی" : "قابل ادامه نیست"}</span></div><p>نسخهٔ {toP(item.versionNumber)}، تلاش {toP(item.attemptNumber)}</p>{item.state === "COMPLETE" ? <Link href={`/assessment/result?submissionId=${item.id}`} className="service-text-action">مشاهدهٔ نتیجه<ArrowLeft size={17} aria-hidden="true" /></Link> : item.resumeAvailable ? <Link href={`/assessment/resume?submissionId=${item.id}`} className="service-text-action">ادامهٔ پاسخ‌ها<ArrowLeft size={17} aria-hidden="true" /></Link> : <p>ادامهٔ این ارزیابی در وضعیت فعلی در دسترس نیست.</p>}</article>)}
      {history.data?.items.length === 0 && <ServiceEmpty title="اولین ارزیابی شما هنوز ثبت نشده" description="برای شروع، از بخش «آزمون جدید» یک ارزیابی انتخاب کنید. پاسخ‌های ذخیره‌شده و نتیجهٔ نهایی بعداً اینجا قرار می‌گیرند." icon={ClipboardList} />}
      {history.data && <PatientPagination page={page} total={history.data.total} onChange={setPage} />}
    </ServiceSection>}
    {view === "purchases" && <ServiceSection title="خریدهای ارزیابی" description="وضعیت پرداخت و دسترسی آزمون خریداری‌شده را اینجا پیگیری کنید."><PatientResourceState {...purchases} retry={() => void purchases.reload()} />{purchases.data?.items.map(item => <Link key={item.id} href={`/assessment/purchases/${item.id}`} className="service-card"><h3>{item.title}</h3><span className="service-text-action">بررسی پرداخت و دسترسی<ArrowLeft size={17} aria-hidden="true" /></span></Link>)}{purchases.data?.items.length === 0 && <ServiceEmpty title="هنوز ارزیابی خریداری نکرده‌اید" description="خریدهای جدید و مراحل دریافت آزمون در این بخش قرار می‌گیرند؛ برای دیدن خدمات به «آزمون جدید» بروید." />}{purchases.data && <PatientPagination page={purchasePage} total={purchases.data.total} onChange={setPurchasePage} />}</ServiceSection>}
  </ServicePage>;
}
