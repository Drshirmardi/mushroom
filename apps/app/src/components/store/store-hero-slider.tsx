"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useBannerStore } from "../../stores/banners";
import { safeBannerHref } from "../../lib/content-banners-api";
import { toP } from "../../lib/format";

/** Native RTL scrolling keeps slides within their container on resize. */
export function StoreHeroSlider({ onShopNow }: { onShopNow: () => void }) {
  const router = useRouter();
  const slides = useBannerStore(state => state.slides);
  const track = useRef<HTMLDivElement>(null);
  const current = useRef(0);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const element = track.current;
    if (!element) return;
    current.current = 0;
    setIndex(0);
    const resize = new ResizeObserver(() => {
      element.scrollTo({left: -current.current * element.clientWidth, behavior:"instant"});
    });
    resize.observe(element);
    return () => resize.disconnect();
  }, [slides]);
  const move = (position: number) => {
    const element = track.current;
    if (!element) return;
    element.scrollTo({left: -position * element.clientWidth, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"});
  };
  const open = (href?: string | null) => {
    const target = safeBannerHref(href);
    if (!target) onShopNow();
    else if (target.startsWith("/")) router.push(target);
    else window.open(target,"_blank","noopener,noreferrer");
  };
  if (!slides.length) return null;
  return <section className="store-hero" aria-label="بنرهای فروشگاه" aria-roledescription="carousel">
    <div ref={track} className="store-banner-track" dir="rtl" onScroll={event => {
      const element=event.currentTarget;
      const next=Math.min(slides.length-1,Math.round(Math.abs(element.scrollLeft)/Math.max(1,element.clientWidth)));
      current.current=next; setIndex(next);
    }}>
      {slides.map((slide,i)=><button key={slide.id} type="button" className="store-hero__slide" aria-label={slide.alt} aria-current={i===index ? "true" : undefined} onClick={()=>open(slide.href)}>
        <img src={slide.image} alt={slide.alt} width={1200} height={600} loading={i===0 ? "eager" : "lazy"} draggable={false} className="store-hero__image"/>
      </button>)}
    </div>
    {slides.length>1 && <div className="store-hero__controls">
      <button type="button" aria-label="بنر قبلی" disabled={index===0} onClick={()=>move(index-1)}><ChevronRight size={18}/></button>
      <span role="status" aria-live="polite">{toP(index+1)} از {toP(slides.length)}</span>
      <button type="button" aria-label="بنر بعدی" disabled={index===slides.length-1} onClick={()=>move(index+1)}><ChevronLeft size={18}/></button>
    </div>}
  </section>;
}
