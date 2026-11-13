'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, A11y } from 'swiper/modules';
import type { Swiper as SwiperInstance } from 'swiper';
import 'swiper/css';

const banners = [
  {
    id: 'couples-assessment',
    title: 'ارزیابی مزاج زوجین',
    description: 'تست مزاج‌شناسی زوجین پیش از ازدواج و پس از آن',
    action: 'ارزیابی زوجین',
    href: '/assessment/couples',
    image: 'couples-assessment',
  },
  {
    id: 'store',
    title: 'فروشگاه سلامت',
    description: 'محصولات سلامت را بررسی کنید',
    action: 'دیدن محصولات',
    href: '/store',
    image: 'store',
  },
] as const;

export function HomeBanners() {
  const swiper = useRef<SwiperInstance | null>(null);
  const [active, setActive] = useState(0);
  const reducedMotion = useReducedMotion();

  return (
    <section
      className="home-banners"
      aria-label="پیشنهادهای خانه"
      aria-roledescription="اسلایدر"
      onFocusCapture={() => swiper.current?.autoplay?.stop()}
      onBlurCapture={(event) => {
        if (!reducedMotion && !event.currentTarget.contains(event.relatedTarget)) {
          swiper.current?.autoplay?.start();
        }
      }}
    >
      <Swiper
        dir="rtl"
        modules={[Autoplay, A11y]}
        effect="slide"
        slidesPerView={1}
        slidesPerGroup={1}
        spaceBetween={0}
        loop
        speed={reducedMotion ? 0 : 500}
        autoplay={reducedMotion ? false : {
          delay: 4500,
          disableOnInteraction: false,
          pauseOnMouseEnter: false,
        }}
        a11y={{ enabled: true, slideLabelMessage: '{{index}} از {{slidesLength}}', scrollOnFocus: false }}
        onSwiper={(instance) => { swiper.current = instance; }}
        onRealIndexChange={(instance) => setActive(instance.realIndex)}
      >
        {banners.map((banner, index) => (
          <SwiperSlide key={banner.id}>
            <Link
              href={banner.href}
              className="home-banner-slide"
              data-banner={banner.id}
              tabIndex={index === active ? undefined : -1}
            >
              <div className="home-banner-copy">
                <h2>{banner.title}</h2>
                <p>{banner.description}</p>
                <span className="home-banner-cta">{banner.action}</span>
              </div>
              <img className="home-banner-art" src={`/home/icons/${banner.image}.webp`} width={144} height={144} alt="" draggable={false} />
            </Link>
          </SwiperSlide>
        ))}
      </Swiper>
      <div className="home-banner-dots" role="group" aria-label="انتخاب بنر">
        {banners.map((banner, index) => (
          <button
            key={banner.id}
            type="button"
            aria-label={banner.title}
            aria-current={index === active ? 'true' : undefined}
            onClick={() => swiper.current?.slideToLoop(index)}
          />
        ))}
      </div>
    </section>
  );
}
