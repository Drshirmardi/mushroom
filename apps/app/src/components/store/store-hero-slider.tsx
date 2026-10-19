"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
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
  const [active, setActive] = useState(0);
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
  const openSlide = (href?: string | null) => {
    const target = safeBannerHref(href);
    if (!target) { onShopNow(); return; }
    if (target.startsWith("/")) router.push(target);
    else window.open(target, "_blank", "noopener,noreferrer");
  };
  return <section className="store-hero" aria-label="بنرهای فروشگاه" aria-roledescription="carousel"
    onFocusCapture={() => swiperRef.current?.autoplay.stop()}
    onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null) && !paused && !reducedMotion) swiperRef.current?.autoplay.start(); }}>
    <Swiper
      modules={[Autoplay]}
      loop={slides.length >= 3}
      rewind={slides.length < 3}
      speed={600}
      spaceBetween={8}
      slidesPerView={1.12}
      centeredSlides
      autoplay={reducedMotion || paused ? false : { delay: 4000, disableOnInteraction: false, pauseOnMouseEnter: true }}
      onSwiper={swiper => { swiperRef.current = swiper; }}
      onSlideChange={(swiper) => setActive(swiper.realIndex)}
    >
      {slides.map((slide, index) => (
        <SwiperSlide key={slide.id}>
          <button type="button" className="store-hero__slide" onClick={() => openSlide(slide.href)}>
            <img src={slide.image} alt={slide.alt} width={1200} height={600} loading={index === 0 ? "eager" : "lazy"} draggable={false} className="store-hero__image" />
          </button>
        </SwiperSlide>
      ))}
    </Swiper>
    {slides.length > 1 && <div className="store-hero__controls">
      <button type="button" aria-label="بنر قبلی" onClick={() => swiperRef.current?.slidePrev()}><ChevronRight size={18} aria-hidden="true" /></button>
      {slides.map((slide, index) => <button key={slide.id} type="button" aria-label={`نمایش بنر ${new Intl.NumberFormat("fa-IR").format(index + 1)}`} aria-current={index === active ? "true" : undefined} onClick={() => swiperRef.current?.slideToLoop(index)}><span className={index === active ? "store-hero__dot store-hero__dot--active" : "store-hero__dot"} /></button>)}
      <button type="button" aria-label="بنر بعدی" onClick={() => swiperRef.current?.slideNext()}><ChevronLeft size={18} aria-hidden="true" /></button>
      {!reducedMotion && <button type="button" aria-label={paused ? "ادامهٔ نمایش خودکار بنرها" : "توقف نمایش خودکار بنرها"} aria-pressed={paused} onClick={() => { if (paused) swiperRef.current?.autoplay.start(); else swiperRef.current?.autoplay.stop(); setPaused(value => !value); }}>{paused ? <Play size={17} aria-hidden="true" /> : <Pause size={17} aria-hidden="true" />}</button>}
    </div>}
  </section>;
}
