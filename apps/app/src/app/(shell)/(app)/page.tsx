'use client';
import { AsyncButton } from '@/components/shared/async-button';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { AnimatePresence } from 'motion/react';

const NotificationSheet = dynamic(
  () =>
    import('@/components/notifications/notification-sheet').then(
      (module) => module.NotificationSheet,
    ),
  { ssr: false },
);
import { useCallback, useState } from 'react';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { useAuthSession } from '@/components/auth/session-gate';
import { PatientResourceState } from '@/components/shared/patient-resource-state';
import { getPatientJourney } from '@/lib/patient-journey-api';
import { patientCacheKey, peekPatientCache } from '@/lib/patient-request';
import { HomeJourney, HomeJourneyOverview } from '@/components/home/home-journey';
import { HomeBanners } from '@/components/home/home-banners';
import { useOptionalPatientEntry } from '@/components/auth/patient-entry-gate';
import { listPatientArticles, listNotifications } from '@/lib/follow-up-api';
import { usePatientResource } from '@/lib/use-patient-resource';
import { resumeEntry } from '@/lib/patient-entry-api';
import { OwnedServices } from '@/components/programs/owned-services';

const services = [
  { href: '/assessment', title: 'تست فردی', icon: 'assessment' },
  { href: '/assessment/couples', title: 'تست دونفره', icon: 'couples' },
  { href: '/appointments', title: 'رزرو مشاوره', icon: 'booking' },
  { href: '/programs', title: 'خدمات من', icon: 'programs' },
];
const followUps = [
  { href: '/appointments', title: 'نوبت‌های من', icon: 'appointments' },
  { href: '/treatment', title: 'درمان من', icon: 'treatment' },
  { href: '/chat', title: 'گفتگو با پزشک', icon: 'chat' },
  { href: '/profile/medical?from=home', title: 'پرونده پزشکی', icon: 'medical' },
  { href: '/profile/wallet', title: 'کیف پول', icon: 'wallet' },
  { href: '/store/orders', title: 'سفارش‌های من', icon: 'orders' },
];

function HomeShortcuts({
  label,
  items,
  className,
}: {
  label: string;
  items: readonly { href: string; title: string; icon: string }[];
  className: string;
}) {
  return (
    <nav aria-label={label} className={`home-shortcuts ${className}`}>
      {items.map(({ href, title, icon }) => (
        <Link key={href} href={href} className="home-shortcut">
          <span className="home-shortcut-tile">
            <img
              src={`/home/glass-icons/${icon}.webp`}
              width={36}
              height={36}
              alt=""
              draggable={false}
            />
          </span>
          <span>{title}</span>
        </Link>
      ))}
    </nav>
  );
}

export default function HomePage() {
  const { authentication } = useAuthSession();
  const entry = useOptionalPatientEntry();
  const token = authentication.accessToken;
  const journey = usePatientResource(
    useCallback(() => getPatientJourney(token), [token]),
    peekPatientCache(patientCacheKey(token, 'journey')),
  );
  const articles = usePatientResource(useCallback(() => listPatientArticles(token), [token]));
  const notifications = usePatientResource(useCallback(() => listNotifications(token), [token]));
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [entryBusy, setEntryBusy] = useState(false),
    [entryError, setEntryError] = useState('');
  const unread = notifications.data?.items.some((item) => !item.readAt);

  return (
    <div className="home-page" dir="rtl">
      <div className="home-hero">
        <header className="home-header flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs leading-6 text-[var(--home-muted)]">دکتر شیرمردی</p>
            <h1 className="text-lg leading-8 font-medium [overflow-wrap:anywhere]">
              {entry?.status?.firstName ? `سلام، ${entry.status.firstName}` : 'سلام، خوش آمدید'}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setNotificationsOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={notificationsOpen}
            aria-label={unread ? 'اعلان‌ها؛ پیام خوانده‌نشده دارید' : 'اعلان‌ها'}
            className="home-icon-link size-11"
          >
            <span className="home-notification-icon" aria-hidden="true">
              <i className="icon icon-notification-linear icon-primary" />
            </span>
            {unread && <span className="home-unread" />}
          </button>
        </header>
        <HomeJourneyOverview key={authentication.user.id} journey={journey} token={token} />
      </div>

      <div className="home-sheet">
        <div className="home-sheet-handle" aria-hidden="true" />
        <div className="home-hub">
          <HomeShortcuts label="خدمات سلامت" items={services} className="home-shortcuts-services" />
          <HomeBanners />
          <HomeShortcuts
            label="دسترسی‌های من"
            items={followUps}
            className="home-shortcuts-access"
          />
        </div>

        {entry?.status?.reminder && (
          <section className="home-panel min-w-0">
            <h2 className="text-base leading-7 font-medium">
              تست ورود اولیهٔ شما هنوز کامل نشده است
            </h2>
            <p className="mt-1 text-sm leading-6 text-[var(--home-muted)]">
              {entry.status.assessmentTitle}
            </p>
            <AsyncButton
              className="entry-primary"
              disabled={entryBusy}
              onClick={async () => {
                setEntryBusy(true);
                setEntryError('');
                try {
                  await resumeEntry(token);
                  window.location.assign('/welcome');
                } catch {
                  setEntryError('بازگشت به تست انجام نشد؛ دوباره تلاش کنید.');
                  setEntryBusy(false);
                }
              }}
            >
              ادامهٔ تست من
            </AsyncButton>
            {entryError && (
              <p className="mt-2 text-sm leading-6" role="alert">
                {entryError}
              </p>
            )}
          </section>
        )}
        <HomeJourney key={authentication.user.id} journey={journey} token={token} />
        <OwnedServices key={`services:${authentication.user.id}`} />

        <section className="home-panel min-w-0" aria-labelledby="home-articles-title">
          <div className="home-section-heading mb-1 flex items-center justify-between gap-3">
            <h2 id="home-articles-title" className="text-sm leading-7 font-medium">
              برای آگاهی بیشتر
            </h2>
            <Link
              href="/articles"
              className="inline-flex min-h-11 items-center text-xs font-medium text-[var(--home-action)]"
            >
              همهٔ مقاله‌ها
            </Link>
          </div>
          <PatientResourceState {...articles} retry={() => void articles.reload()} />
          {articles.data?.items.slice(0, 2).map((item) => (
            <Link
              key={item.id}
              href={`/articles/${encodeURIComponent(item.slug)}`}
              className="home-content-link flex min-h-[54px] flex-wrap items-center gap-2.5 py-3.5 text-[var(--home-action)]"
            >
              <BookOpen size={20} aria-hidden="true" />
              <h3 className="min-w-0 flex-1 text-[13px] leading-[26px] font-medium text-[var(--home-ink)] [overflow-wrap:anywhere]">
                {item.title}
              </h3>
              <ArrowLeft size={17} aria-hidden="true" />
            </Link>
          ))}
          {articles.data?.items.length === 0 && (
            <div className="home-articles-empty" role="status">
              <span className="home-articles-empty-icon" aria-hidden="true">
                <i className="icon icon-book-linear" />
              </span>
              <h3 className="home-articles-empty-title">هنوز مقاله‌ای منتشر نشده</h3>
              <p className="home-articles-empty-copy">
                با انتشار محتوای آموزشی تازه، آن را همین‌جا می‌بینید.
              </p>
            </div>
          )}
        </section>
      </div>

      <AnimatePresence>
        {notificationsOpen && (
          <NotificationSheet
            onClose={() => setNotificationsOpen(false)}
            onUpdated={() => void notifications.reload()}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
