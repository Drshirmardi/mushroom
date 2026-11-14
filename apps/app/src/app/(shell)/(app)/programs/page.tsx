'use client';

import { Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { BookOpen, BookOpenText, HeartHandshake, LibraryBig } from 'lucide-react';

import { useAuthSession } from '@/components/auth/session-gate';
import { SegmentedTabs } from '@/components/shared/segmented-tabs';
import { ServicePage } from '@/components/shared/service-page';

import { ProgramCatalog } from '@/components/programs/program-catalog';
import { MyPrograms } from '@/components/programs/my-programs';

type View = 'education' | 'custom' | 'mine';

function isView(value: string | null): value is View {
  return value === 'education' || value === 'custom' || value === 'mine';
}

const OPTIONS: { value: View; label: string }[] = [
  { value: 'education', label: 'آموزشی' },
  { value: 'custom', label: 'اختصاصی' },
  { value: 'mine', label: 'برنامه‌های من' },
];

function ProgramsContent() {
  const { authentication } = useAuthSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const requestedView = searchParams.get('view');
  const view: View = isView(requestedView) ? requestedView : 'education';

  const token = authentication.accessToken;

  const changeView = (next: View) => {
    if (next === view) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set('view', next);

    router.replace(`${pathname}?${params.toString()}`, {
      scroll: false,
    });
  };

  return (
    <ServicePage
      title="برنامه‌های سلامت"
      description="برنامه‌های آموزشی، خدمات اختصاصی و محتوای خودتان را در یک مکان دنبال کنید."
      icon={BookOpen}
    >
      <div className="min-w-0 space-y-6 pb-8">
        {/* Introduction */}
        <section className="relative overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-br from-primary/10 via-primary/5 to-background p-5 sm:p-7">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-12 -top-12 size-40 rounded-full bg-primary/10 blur-3xl"
          />

          <div className="relative space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-background/80 px-3 py-1.5 text-xs font-semibold text-primary">
              <HeartHandshake size={15} aria-hidden="true" />
              همراه شما در مسیر سلامت
            </span>

            <div className="space-y-2">
              <h2 className="text-xl font-extrabold leading-9 tracking-tight text-foreground sm:text-2xl">
                آموزش، آگاهی و پیگیری برنامه‌ها
              </h2>

              <p className="max-w-xl text-sm leading-8 text-muted-foreground">
                مطالب آموزشی را بررسی کنید، با خدمات اختصاصی آشنا شوید و به برنامه‌هایی که قبلاً
                دریافت کرده‌اید دسترسی داشته باشید.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-background/75 px-3 py-2 text-xs text-foreground/80">
                <BookOpenText size={16} />
                محتوای آموزشی
              </span>

              <span className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-background/75 px-3 py-2 text-xs text-foreground/80">
                <LibraryBig size={16} />
                دسترسی به برنامه‌های من
              </span>
            </div>
          </div>
        </section>

        {/* Navigation */}
        <SegmentedTabs<View>
          ariaLabel="انتخاب بخش برنامه‌ها"
          value={view}
          onChange={changeView}
          className="my-6"
          options={OPTIONS.map((option) => ({
            ...option,
            id: `program-${option.value}-tab`,
            controls: 'programs-panel',
          }))}
        />

        {/* Only the active tab mounts and fetches data */}
        <div
          id="programs-panel"
          role="tabpanel"
          aria-labelledby={`program-${view}-tab`}
          tabIndex={0}
        >
          {view === 'education' && <ProgramCatalog token={token} kind="education" />}
          {view === 'custom' && <ProgramCatalog token={token} kind="custom" />}
          {view === 'mine' && <MyPrograms token={token} />}
        </div>
      </div>
    </ServicePage>
  );
}

export default function ProgramsPage() {
  return (
    <Suspense
      fallback={
        <div role="status" className="mx-auto max-w-[720px] p-6 text-sm text-muted-foreground">
          در حال آماده‌سازی برنامه‌های سلامت…
        </div>
      }
    >
      <ProgramsContent />
    </Suspense>
  );
}
