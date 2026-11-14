'use client';

import Link from 'next/link';
import { Droplet } from 'lucide-react';
import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useReducedMotion } from 'motion/react';
import { A11y, Mousewheel } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperInstance } from 'swiper';
import 'swiper/css';
import { HomeBanners, type HomeBannerItem } from '@/components/home/home-banners';
import { useAuthSessionSnapshot } from '@/components/auth/session-gate';
import { LoadingState, SkeletonBox, SkeletonCard } from '@/components/shared/skeletons';
import { loginUrl } from '@/lib/api';
import { listCustomOfferings, listProgramOfferings } from '@/lib/digital-services-api';
import { toP } from '@/lib/format';
import { getMezajServices, type MezajService } from '@/lib/mezaj-services-api';
import { usePatientResource } from '@/lib/use-patient-resource';
import { formatToman, rialRemainderLabel, rialToToman } from '@/lib/wallet-money';
import { StoreIcon, type StoreIconName } from './store-icon';
import { TomanIcon } from './toman-icon';
import styles from './store-services.module.css';

const serviceBanners: readonly HomeBannerItem[] = [
  {
    id: 'service-personality',
    title: 'شناخت بهتر، انتخاب آگاهانه‌تر',
    description: 'از شخصیت‌شناسی تا راهنمای تغذیه، خواب و مدیریت وزن',
    action: 'خدمات مزاج‌ها',
    href: '#store-services-education',
    image: 'programs',
  },
  {
    id: 'service-temperament',
    title: 'هر مزاج، مسیر سلامت خودش',
    description: 'راهنماها و برنامه‌هایی متناسب با ویژگی‌های مزاجی شما',
    action: 'دیدن پیشنهادها',
    href: '#store-service-recommendations',
    image: 'assessment',
  },
  {
    id: 'service-specialist',
    title: 'همراهی تخصصی برای سلامت شما',
    description: 'برنامه‌های آموزشی و خدمات اختصاصی را یکجا ببینید',
    action: 'مشاهدهٔ خدمات',
    href: '#store-services-custom',
    image: 'booking',
  },
] as const;

function StoreServiceBanners() {
  return <HomeBanners banners={serviceBanners} label="پیشنهاد خدمات سلامت" className="store-service-banners" />;
}

export function StoreTabs({ query, servicesActive }: { query: string; servicesActive: boolean }) {
  const products = new URLSearchParams(query);
  products.delete('tab');
  const services = new URLSearchParams(products);
  services.set('tab', 'services');

  return (
    <nav
      className={styles.tabs}
      data-active={servicesActive ? 'services' : 'products'}
      aria-label="بخش‌های فروشگاه"
    >
      <Link
        href={products.size ? `/store?${products}` : '/store'}
        aria-current={!servicesActive ? 'page' : undefined}
        scroll={false}
        prefetch={false}
      >
        <StoreIcon name={servicesActive ? 'shoppingBag' : 'shoppingBagBold'} size={18} /> محصولات
      </Link>
      <Link
        href={`/store?${services}`}
        aria-current={servicesActive ? 'page' : undefined}
        scroll={false}
        prefetch={false}
      >
        <StoreIcon name={servicesActive ? 'medicalBagBold' : 'medicalBag'} size={18} /> خدمات
      </Link>
    </nav>
  );
}

function ServiceRail({ label, children }: { label: string; children: ReactNode }) {
  const cards = Children.toArray(children);
  const swiper = useRef<SwiperInstance | null>(null);
  const [active, setActive] = useState(cards.length > 1 ? 1 : 0);
  const reduceMotion = useReducedMotion();
  const visibleDotStart = Math.max(0, Math.min(active - 4, cards.length - 9));
  const dotIndexes =
    cards.length > 9
      ? Array.from({ length: 9 }, (_, index) => visibleDotStart + index)
      : cards.map((_, index) => index);

  if (cards.length === 1) return <div className={styles.singleCard}>{cards[0]}</div>;

  return (
    <div
      className={styles.rail}
      role="group"
      aria-label={label}
      aria-roledescription="ریل کارت‌ها"
      dir="rtl"
    >
      <div
        className={styles.railViewport}
        tabIndex={0}
        aria-label={`جابه‌جایی کارت‌های ${label} با کلیدهای جهت`}
        onDragStart={(event) => event.preventDefault()}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget || !swiper.current) return;
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
          event.preventDefault();
          if (event.key === 'ArrowLeft') swiper.current.slideNext();
          else swiper.current.slidePrev();
        }}
      >
        <Swiper
          modules={[A11y, Mousewheel]}
          dir="rtl"
          initialSlide={cards.length > 1 ? 1 : 0}
          centeredSlides
          slidesPerView="auto"
          spaceBetween={12}
          speed={reduceMotion ? 0 : 480}
          threshold={8}
          touchStartPreventDefault={false}
          mousewheel={{ forceToAxis: true, releaseOnEdges: true }}
          a11y={{ slideLabelMessage: '{{index}} از {{slidesLength}}' }}
          onSwiper={(instance) => {
            swiper.current = instance;
            setActive(instance.activeIndex);
          }}
          onSlideChange={(instance) => setActive(instance.activeIndex)}
        >
          {cards.map((card, index) => (
            <SwiperSlide key={index} className={styles.slide}>
              {card}
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
      <div className={styles.dots} role="group" aria-label="انتخاب کارت">
        {dotIndexes.map((index) => (
          <button
            key={index}
            type="button"
            aria-label={`نمایش کارت ${toP(index + 1)}`}
            aria-current={index === active ? 'true' : undefined}
            onClick={() => swiper.current?.slideTo(index)}
          >
            <span aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );
}

function ServiceMessage({ icon, children }: { icon: StoreIconName; children: React.ReactNode }) {
  return (
    <div className={styles.message}>
      <StoreIcon name={icon} size={25} />
      <div>{children}</div>
    </div>
  );
}

function LoadError({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div role="alert">
      <ServiceMessage icon="errorCircle">
        <p>{message}</p>
        <button type="button" className={styles.action} onClick={retry}>
          تلاش دوباره
        </button>
      </ServiceMessage>
    </div>
  );
}

const recommendationIcons = new Map<string, StoreIconName>([
  ['book', 'documentFile'],
  ['compass', 'location'],
  ['leaf', 'medicalBag'],
  ['sparkles', 'star'],
  ['heart', 'heart'],
]);

function recommendationIcon(item: MezajService): CategoryIconName {
  const inferred = categoryStyle(`${item.title} ${item.summary}`, false).icon;
  return inferred !== 'documentFile'
    ? inferred
    : recommendationIcons.get(item.icon) ?? 'documentFile';
}

const boldCategoryIcons: Partial<Record<StoreIconName, StoreIconName>> = {
  documentFile: 'documentFileBold',
  heart: 'heartBold',
  medicalBag: 'medicalBagBold',
  pillBox: 'pillBoxBold',
  person: 'personBold',
  star: 'starBold',
  checklist: 'checklistBold',
};

type CategoryIconName = StoreIconName | 'bloodDrop';

function CategoryIcon({
  icon,
  size,
  className,
  bold = false,
}: {
  icon: CategoryIconName;
  size: number;
  className?: string;
  bold?: boolean;
}) {
  if (icon === 'bloodDrop') {
    return (
      <Droplet
        className={className}
        size={size}
        strokeWidth={bold ? 1.8 : 1.7}
        fill={bold ? 'currentColor' : 'none'}
        aria-hidden="true"
      />
    );
  }
  return (
    <StoreIcon
      className={className}
      name={bold ? (boldCategoryIcons[icon] ?? icon) : icon}
      size={size}
    />
  );
}

function IconPair({ icon, size }: { icon: CategoryIconName; size: number }) {
  return (
    <span className={styles.cardIcon}>
      <CategoryIcon className={styles.iconLinear} icon={icon} size={size} />
      <CategoryIcon className={styles.iconBold} icon={icon} size={size} bold />
    </span>
  );
}

function Price({
  amount,
  original,
  discountPercent,
}: {
  amount: string;
  original?: string;
  discountPercent?: number;
}) {
  const value = BigInt(amount);
  const formatAmount = (rial: bigint) => ({
    toman: formatToman(rialToToman(rial)),
    remainder: rialRemainderLabel(rial),
  });
  const originalValue = original ? BigInt(original) : null;
  const current = formatAmount(value);
  const previous = originalValue === null ? null : formatAmount(originalValue);
  return (
    <span className={styles.price}>
      {previous && originalValue !== null && originalValue > value && (
        <span className={styles.previousPrice}>
          <del>{previous.toman}</del>
          {discountPercent != null && discountPercent > 0 && (
            <span
              className={styles.discountBadge}
              dir="ltr"
              aria-label={`${toP(discountPercent)} درصد تخفیف`}
            >
              {toP(discountPercent)}
              <span aria-hidden="true">%</span>
            </span>
          )}
        </span>
      )}
      {value === BigInt(0) ? (
        <strong>رایگان</strong>
      ) : (
        <strong>
          {current.toman}
          <TomanIcon />
          <span className="sr-only">تومان</span>
          {current.remainder && <small>{current.remainder}</small>}
        </strong>
      )}
    </span>
  );
}

function RecommendedCard({ item, featured = false }: { item: MezajService; featured?: boolean }) {
  const owned = item.state === 'OWNED' && item.accessGrantId;
  const pending = item.state === 'PENDING' && item.purchaseId;
  const href = owned
    ? `/programs/content/${encodeURIComponent(owned)}`
    : pending
      ? `/programs/purchases/${encodeURIComponent(pending)}`
      : `/programs/offerings/${encodeURIComponent(item.publicationId)}`;

  return (
    <article className={featured ? styles.featured : styles.card}>
      <IconPair
        icon={recommendationIcon(item)}
        size={featured ? 30 : 21}
      />
      <div className={styles.cardCopy}>
        <h3>{item.title}</h3>
        {item.summary && <p>{item.summary}</p>}
        <div className={styles.cardFooter}>
          {owned ? (
            <strong>در کتابخانهٔ شما</strong>
          ) : pending ? (
            <strong>در انتظار پرداخت</strong>
          ) : (
            <Price
              amount={item.amountRial}
              original={item.discountPercent > 0 ? item.baseAmountRial : undefined}
              discountPercent={item.discountPercent}
            />
          )}
          <Link
            className={styles.action}
            href={href}
            aria-label={`${owned ? 'مطالعهٔ محتوا' : pending ? 'ادامهٔ پرداخت' : 'جزئیات خدمت'}، ${item.title}`}
          >
            {owned ? 'مطالعهٔ محتوا' : pending ? 'ادامهٔ پرداخت' : 'جزئیات خدمت'}
            <StoreIcon name="arrowLeft" size={15} />
          </Link>
        </div>
      </div>
    </article>
  );
}

function Recommendations({ token }: { token: string }) {
  const resource = usePatientResource(useCallback(() => getMezajServices(token), [token]));
  const [featured, ...remaining] = resource.data?.items ?? [];
  const status = resource.data?.status;

  return (
    <section className={`${styles.section} ${styles.recommendations}`} aria-labelledby="store-service-recommendations">
      <h2 id="store-service-recommendations">پیشنهادهای متناسب با مزاج شما</h2>
      {resource.loading ? (
        <LoadingState label="در حال دریافت پیشنهادها…" variant="card">
          <SkeletonBox className={styles.featuredSkeleton} />
        </LoadingState>
      ) : resource.error ? (
        <LoadError message="پیشنهادهای خدمات دریافت نشد." retry={() => void resource.reload()} />
      ) : status === 'READY' && featured ? (
        <>
          <RecommendedCard item={featured} featured />
          {remaining.length > 0 && (
            <ServiceRail label="پیشنهادهای بیشتر">
              {remaining.map((item) => (
                <RecommendedCard key={item.programDefinitionId} item={item} />
              ))}
            </ServiceRail>
          )}
        </>
      ) : (
        <ServiceMessage icon="checklist">
          <p>
            {status === 'NO_RESULT'
              ? 'با تکمیل ارزیابی، خدمات مرتبط با مزاجتان را اینجا ببینید.'
              : status === 'REVIEW_REQUIRED'
                ? 'پیشنهاد خدمات پس از بررسی نتیجه توسط متخصص نمایش داده می‌شود.'
                : status === 'RESULT_UNSUPPORTED'
                  ? 'برای این نتیجه امکان نمایش پیشنهاد خدمات وجود ندارد.'
                  : 'هنوز پیشنهادی برای این نتیجه ثبت نشده است.'}
          </p>
          {status === 'NO_RESULT' && (
            <Link className={styles.action} href="/assessment">
              شروع ارزیابی <StoreIcon name="arrowLeft" size={15} />
            </Link>
          )}
        </ServiceMessage>
      )}
    </section>
  );
}

type Offering = Awaited<
  ReturnType<typeof listProgramOfferings | typeof listCustomOfferings>
>['items'][number];

function categoryStyle(
  category: string,
  custom: boolean,
): { tone: string; icon: CategoryIconName; action: string } {
  if (/وزن|لاغر|چاق|رژیم/.test(category))
    return { tone: 'mint', icon: 'pillBox', action: 'مشاهدهٔ برنامهٔ وزن' };
  if (/تغذیه|خوراک|غذا/.test(category))
    return { tone: 'amber', icon: 'medicalBag', action: 'مطالعهٔ راهنمای تغذیه' };
  if (/خواب|آرامش|استرس/.test(category))
    return { tone: 'violet', icon: 'star', action: 'مشاهدهٔ برنامهٔ خواب' };
  if (/گروه.*خونی|خون/.test(category))
    return { tone: 'ruby', icon: 'bloodDrop', action: 'مطالعهٔ راهنمای گروه خونی' };
  if (/روان|شناخت|رابطه|شخصیت/.test(category))
    return { tone: 'blue', icon: 'person', action: 'مطالعهٔ مطالب مرتبط' };
  if (/مزاج|سلامت|بدن/.test(category))
    return { tone: 'aqua', icon: 'checklist', action: 'مشاهدهٔ راهنمای سلامت' };
  if (/آموزش|مقاله|مطالعه/.test(category))
    return { tone: 'blue', icon: 'documentFile', action: 'مطالعهٔ برنامه' };
  return custom
    ? { tone: 'violet', icon: 'medicalBag', action: 'جزئیات و درخواست خدمت' }
    : { tone: 'blue', icon: 'documentFile', action: 'مشاهدهٔ برنامه' };
}

function OfferingCard({
  item,
  icon,
  tone,
  action,
}: {
  item: Offering;
  icon: CategoryIconName;
  tone: string;
  action: string;
}) {
  const custom = 'physician' in item;
  return (
    <article className={styles.card} data-tone={tone}>
      <div className={styles.cardHeader}>
        <IconPair icon={icon} size={22} />
        <h4>{item.title}</h4>
      </div>
      <div className={styles.cardCopy}>
        {item.summary && <p>{item.summary}</p>}
        {custom ? (
          <p className={styles.meta}>
            متخصص: {item.physician.displayName} ·{' '}
            {item.requestSupported ? 'قابل درخواست' : 'درخواست فعلاً غیرفعال'}
          </p>
        ) : (
          <p className={styles.meta}>
            {item.accessMode === 'PERPETUAL'
              ? 'دسترسی بدون محدودیت زمانی'
              : item.accessDurationDays != null
                ? `دسترسی ${toP(item.accessDurationDays)} روزه`
                : 'دسترسی مدت‌دار'}
          </p>
        )}
        <div className={styles.cardFooter}>
          <Price
            amount={item.amountRial}
            original={!custom && item.discountPercent > 0 ? item.baseAmountRial : undefined}
            discountPercent={!custom ? item.discountPercent : undefined}
          />
          <Link
            className={styles.action}
            href={`/programs/${custom ? 'custom-offerings' : 'offerings'}/${encodeURIComponent(item.id)}`}
            aria-label={`مشاهدهٔ جزئیات، ${item.title}`}
          >
            {custom && !item.requestSupported ? 'جزئیات خدمت' : action}{' '}
            <StoreIcon name="arrowLeft" size={15} />
          </Link>
        </div>
      </div>
    </article>
  );
}

function Offerings({ token, kind }: { token: string; kind: 'education' | 'custom' }) {
  const custom = kind === 'custom';
  const title = custom ? 'خدمات اختصاصی' : 'خدمات مرتبط با سایر مزاج‌ها';
  const [items, setItems] = useState<Offering[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [moreError, setMoreError] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const generation = useRef(0);
  const nextPage = useRef(2);
  const loadingLock = useRef(false);

  const loadPage = useCallback(
    async (page: number) => {
      const response = await (custom
        ? listCustomOfferings(token, page)
        : listProgramOfferings(token, page));
      return response as unknown as {
        items: Offering[];
        total: number;
        page: number;
        pageSize: number;
      };
    },
    [custom, token],
  );

  const loadMore = useCallback(
    async (retry = false) => {
      if (loadingLock.current || !hasMore || loading || (moreError && !retry)) return;
      loadingLock.current = true;
      const requestGeneration = generation.current;
      const page = nextPage.current;
      setLoadingMore(true);
      setMoreError(false);
      try {
        const result = await loadPage(page);
        if (requestGeneration !== generation.current) return;
        setItems((current) => {
          const known = new Set((current ?? []).map((item) => item.id));
          return [...(current ?? []), ...result.items.filter((item) => !known.has(item.id))];
        });
        nextPage.current = page + 1;
        setHasMore(page * result.pageSize < result.total);
      } catch {
        if (requestGeneration === generation.current) setMoreError(true);
      } finally {
        if (requestGeneration === generation.current) {
          loadingLock.current = false;
          setLoadingMore(false);
        }
      }
    },
    [hasMore, loadPage, loading, moreError],
  );

  useEffect(() => {
    const requestGeneration = ++generation.current;
    loadingLock.current = false;
    nextPage.current = 2;
    setItems(null);
    setLoading(true);
    setLoadingMore(false);
    setError(false);
    setMoreError(false);
    setHasMore(false);
    void loadPage(1)
      .then((result) => {
        if (requestGeneration !== generation.current) return;
        setItems(result.items);
        setHasMore(result.page * result.pageSize < result.total);
      })
      .catch(() => {
        if (requestGeneration === generation.current) setError(true);
      })
      .finally(() => {
        if (requestGeneration === generation.current) setLoading(false);
      });
    return () => {
      generation.current += 1;
    };
  }, [loadPage]);

  useEffect(() => {
    const target = sentinel.current;
    if (!target || !hasMore || loading || loadingMore || moreError) return;
    const root = target.closest('.patient-shell-content');
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      { root, rootMargin: '280px 0px' },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, loadMore, moreError]);

  const retryInitial = useCallback(() => {
    const requestGeneration = ++generation.current;
    loadingLock.current = false;
    setError(false);
    setLoading(true);
    void loadPage(1)
      .then((result) => {
        if (requestGeneration !== generation.current) return;
        setItems(result.items);
        nextPage.current = 2;
        setHasMore(result.page * result.pageSize < result.total);
      })
      .catch(() => {
        if (requestGeneration === generation.current) setError(true);
      })
      .finally(() => {
        if (requestGeneration === generation.current) setLoading(false);
      });
  }, [loadPage]);
  const groups = new Map<string, Offering[]>();
  for (const item of items ?? []) {
    const category = item.category.trim() || 'سایر خدمات';
    const group = groups.get(category);
    if (group) group.push(item);
    else groups.set(category, [item]);
  }

  return (
    <section className={styles.section} aria-labelledby={`store-services-${kind}`}>
      <h2 id={`store-services-${kind}`}>{title}</h2>
      {loading && (
        <LoadingState label={`در حال دریافت ${title}…`} variant="card">
          <SkeletonCard />
        </LoadingState>
      )}
      {error && <LoadError message={`${title} دریافت نشد.`} retry={retryInitial} />}
      {items && (
        <>
          {groups.size === 0 && (
            <ServiceMessage icon="documentFile">
              <p>خدمات اختصاصی فعلا برای نمایش وجود نداره!</p>
            </ServiceMessage>
          )}
          {[...groups]
            .sort(([categoryA], [categoryB]) => {
              const rank = (category: string) =>
                /شخصیت|شناخت/.test(category) ? 0 : /وزن/.test(category) ? 1 : 2;
              return rank(categoryA) - rank(categoryB);
            })
            .map(([category, items]) => {
              const { tone, icon, action } = categoryStyle(category, custom);
              return (
                <div className={styles.category} data-tone={tone} key={category}>
                  <h3>
                    <CategoryIcon icon={icon} size={17} />
                    {category}
                  </h3>
                  <ServiceRail label={`${title}، ${category}`}>
                    {items.map((item) => (
                      <OfferingCard
                        key={item.id}
                        item={item}
                        icon={icon}
                        tone={tone}
                        action={action}
                      />
                    ))}
                  </ServiceRail>
                </div>
              );
            })}
          {hasMore && <div ref={sentinel} className={styles.loadMoreSentinel} aria-hidden="true" />}
          {loadingMore && (
            <LoadingState label={`در حال دریافت ادامهٔ ${title}…`} variant="card">
              <SkeletonCard />
            </LoadingState>
          )}
          {moreError && (
            <LoadError message={`ادامهٔ ${title} دریافت نشد.`} retry={() => void loadMore(true)} />
          )}
        </>
      )}
    </section>
  );
}

function GuestServices() {
  const [href, setHref] = useState(loginUrl);
  useEffect(() => {
    const url = new URL(loginUrl);
    url.searchParams.set('next', new URL('/store?tab=services', window.location.origin).href);
    setHref(url.href);
  }, []);
  return (
    <ServiceMessage icon="medicalBag">
      <h2>خدمات سلامت</h2>
      <p>برای دیدن خدمات و پیشنهادهای متناسب با مزاجتان وارد شوید.</p>
      <a className={styles.action} href={href}>
        ورود به حساب <StoreIcon name="arrowLeft" size={15} />
      </a>
    </ServiceMessage>
  );
}

export function StoreServices() {
  const session = useAuthSessionSnapshot();
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    panel.current?.closest('.patient-shell-content')?.scrollTo({ top: 0 });
  }, []);

  return (
    <div ref={panel} className={styles.services}>
      {session?.status === 'authenticated' ? (
        <div className={styles.sections} key={session.authentication.user.id}>
          <StoreServiceBanners />
          <Recommendations token={session.authentication.accessToken} />
          <Offerings kind="education" token={session.authentication.accessToken} />
          <Offerings kind="custom" token={session.authentication.accessToken} />
        </div>
      ) : session?.status === 'unavailable' ? (
        <LoadError message="اطلاعات حساب دریافت نشد." retry={() => window.location.reload()} />
      ) : session?.status === 'anonymous' ? (
        <>
          <StoreServiceBanners />
          <GuestServices />
        </>
      ) : (
        <LoadingState variant="card" label="در حال بررسی حساب…" />
      )}
    </div>
  );
}
