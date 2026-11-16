"use client";

import { useState } from "react";

import { Card } from "../ui/card";

import { motion } from "motion/react";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";

import "swiper/css";

import { sliderItems } from "./slider-data";


export default function HomeSlider() {

    const [activeIndex, setActiveIndex] = useState(0);


    return (
        <div className="mt-4 overflow-hidden py-3">


            <Swiper

                modules={[Autoplay]}

                loop

                centeredSlides

                grabCursor

                touchReleaseOnEdges

                touchStartPreventDefault={false}

                speed={700}

                spaceBetween={16}


                autoplay={{
                    delay: 3500,
                    disableOnInteraction: false,
                }}


                onSlideChange={(swiper) => {

                    setActiveIndex(swiper.realIndex);

                }}


                breakpoints={{

                    0: {
                        slidesPerView: 1.1,
                    },

                    640: {
                        slidesPerView: 1.5,
                    },

                    1024: {
                        slidesPerView: 2.3,
                    },

                }}

            >


                {sliderItems.map((item) => {

                    const Icon = item.icon;


                    return (

                        <SwiperSlide key={item.id}>


                            <motion.div

                                whileHover={{
                                    scaleX: 1.02,
                                }}

                                whileTap={{
                                    scale: 0.92,
                                }}

                                transition={{
                                    type: "spring",
                                    stiffness: 300,
                                    damping: 25,
                                }}

                            >


                                <Card

                                    className={`
                                        h-[160px]
                                        overflow-hidden
                                        rounded-3xl
                                        border-0
                                        bg-gradient-to-br
                                        ${item.color}
                                    `}

                                >


                                    <div
                                        className="
                                            flex
                                            h-full
                                            flex-col
                                            items-center
                                            justify-center
                                            text-white
                                        "
                                    >


                                        <motion.div

                                            animate={{

                                                rotate: [
                                                    0,
                                                    6,
                                                    -6,
                                                    0
                                                ],

                                                y: [
                                                    0,
                                                    -3,
                                                    0
                                                ],

                                            }}

                                            transition={{

                                                repeat: Infinity,

                                                duration: 4,

                                                ease: "easeInOut",

                                            }}

                                        >

                                            <Icon size={58} />

                                        </motion.div>



                                        <h2
                                            className="
                                                mt-5
                                                text-2xl
                                                font-bold
                                            "
                                        >
                                            {item.title}
                                        </h2>



                                        <p
                                            className="
                                                mt-2
                                                text-sm
                                                opacity-90
                                            "
                                        >
                                            {item.subtitle}
                                        </p>


                                    </div>


                                </Card>


                            </motion.div>


                        </SwiperSlide>

                    );

                })}


            </Swiper>



            {/* Simple Pagination */}

            <div
                className="
                    mt-5
                    flex
                    justify-center
                    gap-2
                "
            >

                {sliderItems.map((_, index) => (

                    <span

                        key={index}

                        className={`
                            h-2
                            rounded-full
                            transition-all
                            duration-200

                            ${activeIndex === index
                                ? "w-7 bg-primary"
                                : "w-2 bg-primary/30"
                            }
                        `}

                    />

                ))}


            </div>


        </div>
    );
}
