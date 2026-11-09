'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, HeartHandshake } from 'lucide-react';
import { ServicePage } from '@/components/shared/service-page';
import { MarriageOffers } from '@/components/assessments/marriage-service';

export default function CouplesPage() {
  const router = useRouter();

  useEffect(() => {
    const publicationId = new URLSearchParams(window.location.search).get('publicationId');
    if (publicationId && /^[a-f0-9-]{36}$/i.test(publicationId)) {
      router.replace(
        `/assessment/couples/legacy?publicationId=${encodeURIComponent(publicationId)}`,
      );
    }
  }, [router]);

  return (
    <ServicePage
      title="شناخت پیش از ازدواج"
      description="آزمون دو نفره با پاسخ‌گویی جداگانهٔ هر نفر. برای شروع، خدمت را انتخاب کن."
      icon={HeartHandshake}
      backHref="/assessment"
      backLabel="همهٔ آزمون‌ها"
    >
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <MarriageOffers />

        <div className="border-t border-border/70 pt-5">
          <Link
            href="/assessment/couples/legacy"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            دعوت‌ها و سوابق قدیمی
            <ArrowLeft aria-hidden="true" size={16} />
          </Link>
        </div>
      </div>
    </ServicePage>
  );
}
