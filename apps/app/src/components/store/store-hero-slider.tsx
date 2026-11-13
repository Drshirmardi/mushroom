'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useReducedMotion } from 'motion/react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { A11y, Autoplay } from 'swiper/modules';
import type { Swiper as SwiperInstance } from 'swiper';
import 'swiper/css';

import { useBannerStore } from '../../stores/banners';
import { safeBannerHref } from '../../lib/content-banners-api';

/** Full-width, looping Digipay-style campaign banner carousel. */
export function StoreHeroSlider({ onShopNow, loading = false }: { onShopNow: () => void; loading?: boolean }) {
  const router = useRouter();
  const slides = useBannerStore(state => state.slides);
  const loopSlides = slides.length === 2 ? [...slides, ...slides] : slides;
  const swiper = useRef<SwiperInstance | null>(null);
  const [active, setActive] = useState(0);
  const [loadedImageKeys, setLoadedImageKeys] = useState<Set<string>>(() => new Set());
  const reducedMotion = useReducedMotion();

  const open = (href?: string | null) => {
    const target = safeBannerHref(href);
    if (!target) onShopNow();
    else if (target.startsWith('/')) router.push(target);
    else window.open(target, '_blank', 'noopener,noreferrer');
  };

  const goToSlide = (index: number) => {
    const instance = swiper.current;
    if (!instance) return;

    const candidates = loopSlides
      .map((_, physicalIndex) => physicalIndex)
      .filter(physicalIndex => physicalIndex % slides.length === index);
    const current = instance.realIndex;
    const total = loopSlides.length;
    const distance = (target: number) => {
      const forward = (target - current + total) % total;
      const backward = (current - target + total) % total;
      return Math.min(forward, backward);
    };
    const target = candidates.reduce((nearest, candidate) =>
      distance(candidate) < distance(nearest) ? candidate : nearest,
    );

    instance.slideToLoop(target);
  };

  if (loading) {
    return (
      <section className="store-hero store-hero--loading" role="status" aria-label="در حال بارگذاری بنرهای فروشگاه">
        <div className="store-hero__skeleton" aria-hidden="true" />
      </section>
    );
  }
  if (!slides.length) return null;
  const activeSlide = slides[active];
  const activeImageLoaded = activeSlide
    ? loadedImageKeys.has(`${activeSlide.id}:${activeSlide.image}`)
    : false;

  return (
    <section
      className="store-hero"
      aria-label="بنرهای فروشگاه"
      aria-roledescription="اسلایدر"
      aria-busy={!activeImageLoaded}
      onFocusCapture={() => swiper.current?.autoplay?.stop()}
      onBlurCapture={event => {
        if (!reducedMotion && !event.currentTarget.contains(event.relatedTarget)) {
          swiper.current?.autoplay?.start();
        }
      }}
    >
      <Swiper
        dir="rtl"
        modules={[Autoplay, A11y]}
        slidesPerView="auto"
        slidesPerGroup={1}
        spaceBetween={20}
        centeredSlides
        loop={slides.length > 1}
        speed={reducedMotion ? 0 : 500}
        autoplay={reducedMotion || slides.length < 2 ? false : {
          delay: 4500,
          disableOnInteraction: false,
          pauseOnMouseEnter: false,
        }}
        a11y={{ enabled: true, slideLabelMessage: '{{index}} از {{slidesLength}}', scrollOnFocus: false }}
        onSwiper={instance => {
          swiper.current = instance;
          setActive(instance.realIndex);
        }}
        onSlideChange={instance => setActive(instance.realIndex)}
        onRealIndexChange={instance => setActive(instance.realIndex)}
      >
        {loopSlides.map((slide, index) => {
          const imageKey = `${slide.id}:${slide.image}`;
          const imageLoaded = loadedImageKeys.has(imageKey);
          return (
            <SwiperSlide key={`${slide.id}-${index}`}>
              <button
                type="button"
                className="store-hero__slide"
                data-image-loaded={imageLoaded ? 'true' : undefined}
                aria-label={slide.alt}
                aria-current={index === active ? 'true' : undefined}
                tabIndex={index === active ? undefined : -1}
                onClick={() => open(slide.href)}
              >
                {!imageLoaded && <span className="store-hero__image-skeleton" aria-hidden="true" />}
                <img
                  src={slide.image}
                  alt={slide.alt}
                  width={1200}
                  height={600}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  draggable={false}
                  className="store-hero__image"
                  onLoad={() => setLoadedImageKeys(current => {
                    if (current.has(imageKey)) return current;
                    const next = new Set(current);
                    next.add(imageKey);
                    return next;
                  })}
                />
              </button>
            </SwiperSlide>
          );
        })}
      </Swiper>
      {slides.length > 1 && (
        <>
          <div className="store-hero__controls">
            <div className="store-hero__dots" role="group" aria-label="انتخاب بنر">
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  className="store-hero__dot"
                  aria-label={slide.alt}
                  aria-current={index === active % slides.length ? 'true' : undefined}
                  onClick={() => goToSlide(index)}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
