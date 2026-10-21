"use client";

import { useEffect, useRef, useState } from "react";
import type { Swiper as SwiperInstance } from "swiper";
import { useRouter } from "next/navigation";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";

import "swiper/css";

import { useBannerStore } from "../../stores/banners";
import { safeBannerHref } from "../../lib/content-banners-api";

/** Store hero slider. Slides come from the banner store; taps open the banner destination or the catalog. */
export function StoreHeroSlider({ onShopNow }: { onShopNow: () => void }) {
  const router = useRouter();
  const slides = useBannerStore((state) => state.slides);
  const swiperRef = useRef<SwiperInstance | null>(null);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  if (slides.length === 0) return null;
  // Centered fractional slides need at least five entries for Swiper's loop buffer.
  const loopSlides = slides.length > 1 && slides.length < 5
    ? Array.from({ length: Math.ceil(5 / slides.length) }, () => slides).flat()
    : slides;
  const openSlide = (href?: string | null) => {
    const target = safeBannerHref(href);
    if (!target) { onShopNow(); return; }
    if (target.startsWith("/")) router.push(target);
    else window.open(target, "_blank", "noopener,noreferrer");
  };
  return <section className="store-hero relative" aria-label="بنرهای فروشگاه" aria-roledescription="carousel"
    onFocusCapture={() => swiperRef.current?.autoplay.stop()}
    onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null) && !paused && !reducedMotion) swiperRef.current?.autoplay.start(); }}>
    <Swiper
      key={slides.map(slide => slide.id).join(":")}
      modules={[Autoplay]}
      loop={slides.length > 1}
      rewind={false}
      speed={600}
      spaceBetween={8}
      slidesPerView={slides.length > 1 ? 1.12 : 1}
      centeredSlides
      autoplay={slides.length < 2 || reducedMotion || paused ? false : { delay: 4000, disableOnInteraction: false, pauseOnMouseEnter: true }}
      onSwiper={swiper => { swiperRef.current = swiper; }}
    >
      {loopSlides.map((slide, index) => (
        <SwiperSlide key={`${slide.id}:${index}`}>
          <button type="button" className="store-hero__slide" onClick={() => openSlide(slide.href)}>
            <img src={slide.image} alt={slide.alt} width={1200} height={600} loading={index === 0 ? "eager" : "lazy"} draggable={false} className="store-hero__image" />
          </button>
        </SwiperSlide>
      ))}
    </Swiper>
    {slides.length > 1 && !reducedMotion && <button type="button"
      className="sr-only focus:not-sr-only focus:absolute focus:bottom-3 focus:left-3 focus:z-10 focus:rounded-xl focus:bg-white focus:p-3"
      aria-pressed={paused}
      onClick={() => { if (paused) swiperRef.current?.autoplay.start(); else swiperRef.current?.autoplay.stop(); setPaused(value => !value); }}>
      {paused ? "ادامهٔ نمایش خودکار بنرها" : "توقف نمایش خودکار بنرها"}
    </button>}
  </section>;
}
