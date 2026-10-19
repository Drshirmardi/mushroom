"use client";

import { useEffect, useState } from "react";
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
  return <section className="store-hero" aria-label="بنرهای فروشگاه" aria-roledescription="carousel">
    <Swiper
      modules={[Autoplay]}
      loop={slides.length > 1}
      speed={600}
      spaceBetween={8}
      slidesPerView={1.12}
      centeredSlides
      autoplay={reducedMotion ? false : { delay: 4000, disableOnInteraction: false, pauseOnMouseEnter: true }}
      onSlideChange={(swiper) => setActive(swiper.realIndex)}
    >
      {slides.map((slide, index) => (
        <SwiperSlide key={slide.id}>
          <button type="button" className="store-hero__slide" onClick={() => openSlide(slide.href)}>
            <img src={slide.image} alt={slide.alt} loading={index === 0 ? "eager" : "lazy"} draggable={false} className="store-hero__image" />
          </button>
        </SwiperSlide>
      ))}
    </Swiper>
    <div className="store-hero__dots" aria-hidden="true">
      {slides.map((slide, index) => <span key={slide.id} className={index === active ? "store-hero__dot store-hero__dot--active" : "store-hero__dot"} />)}
    </div>
  </section>;
}
