"use client";
import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HeartHandshake } from 'lucide-react';
import { ServicePage } from '@/components/shared/service-page';
import { MarriageOffers } from '@/components/assessments/marriage-service';
export default function CouplesPage() {
 const router = useRouter();
 useEffect(() => { const publicationId = new URLSearchParams(window.location.search).get('publicationId'); if (publicationId && /^[a-f0-9-]{36}$/i.test(publicationId)) router.replace(`/assessment/couples/legacy?publicationId=${encodeURIComponent(publicationId)}`); }, [router]);
 return <ServicePage title="شناخت پیش از ازدواج" description="ابتدا خدمت را انتخاب کنید؛ برای دعوت همراه فقط شمارهٔ موبایل او را لازم دارید." icon={HeartHandshake} backHref="/assessment" backLabel="همهٔ آزمون‌ها">
  <section className="service-card mb-6 space-y-4"><h2 className="text-lg font-bold">یک دعوت، دو آزمون مستقل</h2><p className="text-sm leading-8 text-muted-foreground">همراه شما می‌تواند حساب داشته باشد یا پس از بازکردن لینک ثبت‌نام کند. شرایط شرکت و هزینهٔ هر دو نفر را پیش از ساخت دعوت می‌بینید.</p><ol className="grid gap-3 text-sm leading-7 sm:grid-cols-3"><li>۱. انتخاب خدمت و دعوت تلفنی</li><li>۲. پذیرش همراه و رضایت هر دو نفر</li><li>۳. یک پرداخت و پاسخ‌گویی مستقل</li></ol></section>
  <MarriageOffers />
  <details className="service-card mt-6"><summary className="cursor-pointer text-sm font-semibold">همراهی‌ها و کدهای دعوت قبلی</summary><p className="my-3 text-sm leading-7 text-muted-foreground">برای ادامهٔ همراهی‌های قبلی یا پذیرش کدی که قبلاً دریافت کرده‌اید، سوابق قدیمی را باز کنید.</p><Link href="/assessment/couples/legacy" className="service-text-action">بازکردن سوابق و دعوت‌های قبلی</Link></details>
 </ServicePage>;
}
