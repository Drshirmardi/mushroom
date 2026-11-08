'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  FileText,
  RefreshCw,
  Type,
} from 'lucide-react';

import type { components } from '@sabz-zendegi/api-client';

import { useAuthSession } from '@/components/auth/session-gate';
import { PatientResourceState } from '@/components/shared/patient-resource-state';
import { GuidanceSafety } from '@/components/shared/policy-acceptance';

import { getProgramContent } from '@/lib/digital-services-api';
import { usePatientResource } from '@/lib/use-patient-resource';
import { parseProgramBody, type ReadingBlock } from '@/lib/program-reading';
import { toP } from '@/lib/format';

import { ResultRecommendations } from '@/components/programs/result-recommendations';
import { getCurrentMezaj } from '@/lib/assessment-api';

import { ProgramMarkdown } from '@/components/shared/program-markdown';

type ProgramContent = components['schemas']['PatientProgramContentDto'];

type ReadingSize = 'normal' | 'large';

const readingStyles: Record<ReadingSize, string> = {
  normal: 'text-[16px] leading-[2.15]',
  large: 'text-[18px] leading-[2.15]',
};

function formatDate(value: string | Date | null): string | null {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat('fa-IR', {
    dateStyle: 'medium',
  }).format(date);
}

export default function ProgramContentPage() {
  const { id } = useParams<{ id: string }>();
  const { authentication } = useAuthSession();
  const token = authentication.accessToken;

  const resource = usePatientResource(
    useCallback(
      () => getProgramContent(authentication.accessToken, id),
      [authentication.accessToken, id],
    ),
  );

  const content = resource.data;

  const backHref = '/programs?view=mine';

  return (
    <main dir="rtl" className="min-h-full bg-white text-foreground">
      {/* Reading navigation */}
      <nav
        aria-label="مسیر صفحه"
        className="sticky top-0 z-20 border-b border-border/60 bg-white/95 backdrop-blur-lg"
      >
        <div className="mx-auto flex min-h-16 w-full max-w-[720px] items-center justify-between gap-3 px-5">
          <Link
            href={backHref}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl text-sm font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
          >
            <ArrowRight size={19} aria-hidden="true" />
            <span>برنامه‌های من</span>{' '}
          </Link>

          <span className="inline-flex items-center gap-2 text-xs font-medium text-primary">
            <BookOpen size={17} aria-hidden="true" />
            فضای مطالعه
          </span>
        </div>
      </nav>

      <div className="mx-auto w-full max-w-[720px]">
        <div className="px-5 pt-5">
          <PatientResourceState
            variant="detail"
            {...resource}
            retry={() => void resource.reload()}
          />
        </div>

        {content && (
          <ProgramReadingPage
            key={`${content.id}:${content.contentHash}`}
            content={content}
            token={token}
            refreshing={resource.refreshing}
            onRefresh={() => void resource.reload()}
          />
        )}
      </div>
    </main>
  );
}

function ProgramReadingPage({
  content,
  token,
  refreshing,
  onRefresh,
}: {
  content: ProgramContent;
  token: string;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const [readingSize, setReadingSize] = useState<ReadingSize>('normal');
  const mezaj = usePatientResource(useCallback(() => getCurrentMezaj(token), [token]));
  const endsAt = formatDate(content.endsAt);
  const grantedAt = formatDate(content.grantedAt);

  const references = content.contentReferences ?? [];

  return (
    <div className="pb-12">
      {/* Article introduction */}
      <header className="px-5 pb-8 pt-7">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
          <BookOpen size={14} aria-hidden="true" />
          محتوای آموزشی
        </div>

        <h1 className="text-[clamp(1.65rem,6vw,2.25rem)] font-extrabold leading-[1.65] tracking-tight text-foreground">
          {content.title}
        </h1>

        {/* Access metadata */}
        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3 border-y border-border/70 py-4">
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 size={17} className="text-primary" aria-hidden="true" />

            <span>دسترسی فعال</span>
          </div>

          {grantedAt && (
            <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarDays size={16} aria-hidden="true" />

              <span>فعال‌سازی: {grantedAt}</span>
            </div>
          )}

          {endsAt && (
            <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarDays size={16} aria-hidden="true" />

              <span>پایان دسترسی: {endsAt}</span>
            </div>
          )}
        </div>
      </header>

      {/* Safety is intentionally placed before the text */}
      <div className="px-5">
        <GuidanceSafety safety={content.safety} variant="program" />
      </div>

      {/* Article */}
      <section aria-labelledby="program-reading-title" className="mt-9">
        <div className="px-5">
          <div className="flex items-center gap-2">
            <FileText size={20} className="text-primary" aria-hidden="true" />

            <h2 id="program-reading-title" className="text-lg font-bold text-foreground">
              متن برنامه
            </h2>
          </div>

          <p className="mt-2 text-xs leading-6 text-muted-foreground">
            برای مطالعه راحت‌تر می‌توانید اندازه نوشته‌ها را تغییر دهید.
          </p>
        </div>

        {/* Reader preferences */}
        <div className="mx-5 mt-5 flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
          <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Type size={17} aria-hidden="true" />
            اندازه متن
          </span>

          <div
            role="group"
            aria-label="اندازه متن مطالعه"
            className="inline-flex items-center gap-1 rounded-xl border border-border/70 bg-white p-1"
          >
            <button
              type="button"
              aria-pressed={readingSize === 'normal'}
              onClick={() => setReadingSize('normal')}
              className={`min-h-9 rounded-lg px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary ${
                readingSize === 'normal'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              معمولی
            </button>

            <button
              type="button"
              aria-pressed={readingSize === 'large'}
              onClick={() => setReadingSize('large')}
              className={`min-h-9 rounded-lg px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary ${
                readingSize === 'large'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              بزرگ
            </button>
          </div>
        </div>

        <ReadingArticle body={content.body} readingSize={readingSize} />
      </section>

      {/* Related educational materials */}
      {references.length > 0 && (
        <section
          aria-labelledby="related-content-title"
          className="mx-5 mt-10 border-t border-border pt-8"
        >
          <div className="mb-5 space-y-2">
            <h2 id="related-content-title" className="text-lg font-bold text-foreground">
              مطالب آموزشی مرتبط
            </h2>

            <p className="text-sm leading-7 text-muted-foreground">
              این مطالب می‌توانند مطالعه برنامه را تکمیل کنند.
            </p>
          </div>

          <div className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70">
            {references.map((item, index) => (
              <Link
                key={item.id}
                href={`/guidance/${encodeURIComponent(item.id)}`}
                className="group flex min-h-18 items-center gap-3 bg-white px-4 py-3 transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
              >
                <span
                  aria-hidden="true"
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
                >
                  <BookOpen size={18} />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">
                    مطلب آموزشی مرتبط {toP(index + 1)}
                  </span>

                  <span className="mt-1 block text-xs text-muted-foreground">
                    باز کردن محتوای تکمیلی
                  </span>
                </span>

                <ArrowLeft
                  size={18}
                  className="shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* End actions */}

      {/* End of article */}
      <footer className="mx-5 mt-12 space-y-7 border-t border-border pt-8">
        <div className="space-y-2 text-center">
          <p className="text-sm font-semibold text-foreground">پایان محتوای آموزشی</p>

          <p className="text-xs leading-6 text-muted-foreground">
            می‌توانید سایر خدمات و محصولات مرتبط با مزاج خود را نیز بررسی کنید.
          </p>
        </div>

        {/* Personalized recommendations */}
        <section aria-label="پیشنهادهای متناسب با مزاج" className="space-y-4">
          {mezaj.loading ? (
            <div
              role="status"
              className="rounded-2xl bg-slate-50 p-5 text-center text-sm text-muted-foreground"
            >
              در حال بررسی نتیجه مزاج شما…
            </div>
          ) : mezaj.error ? (
            <div className="rounded-2xl border border-border bg-white p-4">
              <p role="alert" className="text-sm leading-7 text-muted-foreground">
                دریافت اطلاعات مزاج برای نمایش پیشنهادها ممکن نشد.
              </p>

              <button
                type="button"
                onClick={() => void mezaj.reload()}
                className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary"
              >
                تلاش دوباره
              </button>
            </div>
          ) : mezaj.data?.assessmentSubmissionId ? (
            <ResultRecommendations
              token={token}
              submissionId={mezaj.data.assessmentSubmissionId}
              layout="horizontal"
            />
          ) : (
            <div className="rounded-2xl border border-border bg-slate-50 p-5 text-center">
              <p className="text-sm font-semibold text-foreground">پیشنهادهای متناسب با مزاج شما</p>

              <p className="mt-2 text-xs leading-6 text-muted-foreground">
                برای دریافت پیشنهادهای اختصاصی، ابتدا یک نتیجه معتبر مزاج‌شناسی در حساب خود داشته
                باشید.
              </p>

              <Link
                href="/assessment"
                className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
              >
                مشاهده ارزیابی‌ها
              </Link>
            </div>
          )}
        </section>
      </footer>
    </div>
  );
}

function ReadingArticle({ body, readingSize }: { body: string; readingSize: ReadingSize }) {
  return (
    <article
      dir="rtl"
      className={`mx-auto max-w-[660px] space-y-6 px-5 pb-3 pt-8 font-normal text-foreground ${readingStyles[readingSize]}`}
    >
      <ProgramMarkdown body={body} />
    </article>
  );
}

function ReadingBlockView({ block }: { block: ReadingBlock }) {
  if (block.type === 'heading') {
    if (block.level === 3) {
      return (
        <h3 className="!mt-8 break-words border-r-[3px] border-primary/50 pr-3 text-base font-bold leading-9 text-foreground">
          {block.text}
        </h3>
      );
    }

    return (
      <h2 className="!mt-10 break-words border-r-[3px] border-primary pr-3 text-lg font-extrabold leading-10 text-foreground">
        {block.text}
      </h2>
    );
  }

  if (block.type === 'list') {
    return (
      <ul className="space-y-3 pr-1">
        {block.items.map((item, index) => (
          <li key={index} className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="mt-1 inline-flex min-w-6 shrink-0 justify-center text-sm font-bold text-primary"
            >
              {item.marker}
            </span>

            <span className="min-w-0 flex-1 break-words text-foreground/90">{item.text}</span>
          </li>
        ))}
      </ul>
    );
  }

  return <p className="whitespace-pre-line break-words text-foreground/90">{block.text}</p>;
}
