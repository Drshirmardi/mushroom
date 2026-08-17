import React from "react";


interface ExpertiseItem {
    title: string;
    href: string;
    image: string;
}


const expertises: ExpertiseItem[] = [
    {
        title: "عمومی",
        href: "/consultation/general-practitioner",
        image:
            "https://snapp.doctor/_next/image/?url=%2Ffiles%2Fimages%2Fcategories%2Fgeneral-practitioner.webp&w=256&q=75",
    },
    {
        title: "زنان",
        href: "/consultation/obstetrician-gynecologist",
        image:
            "https://snapp.doctor/_next/image/?url=%2Ffiles%2Fimages%2Fcategories%2Fobstetrician-gynecologist.webp&w=256&q=75",
    },
    {
        title: "داخلی",
        href: "/consultation/internal-medicine",
        image:
            "https://snapp.doctor/_next/image/?url=%2Ffiles%2Fimages%2Fcategories%2Finternal-medicine.webp&w=256&q=75",
    },
    {
        title: "روانپزشک",
        href: "/consultation/psychiatrist",
        image:
            "https://snapp.doctor/_next/image/?url=%2Ffiles%2Fimages%2Fcategories%2Fpsychiatrist.webp&w=256&q=75",
    },
    {
        title: "پوست و مو",
        href: "/consultation/dermatologist",
        image:
            "https://snapp.doctor/_next/image/?url=%2Ffiles%2Fimages%2Fcategories%2Fdermatologist.webp&w=256&q=75",
    },
    {
        title: "ارتوپدی",
        href: "/consultation/orthopedist",
        image:
            "https://snapp.doctor/_next/image/?url=%2Ffiles%2Fimages%2Fcategories%2Forthopedist.webp&w=256&q=75",
    },
    {
        title: "کودکان",
        href: "/consultation/pediatric",
        image:
            "https://snapp.doctor/_next/image/?url=%2Ffiles%2Fimages%2Fcategories%2Fpediatric.webp&w=256&q=75",
    },
    {
        title: "مغز و اعصاب",
        href: "/consultation/neurologist",
        image:
            "https://snapp.doctor/_next/image/?url=%2Ffiles%2Fimages%2Fcategories%2Fneurologist.webp&w=256&q=75",
    },
];


export default function ExpertiseSlider() {

    return (

        <section
            className="
                w-full
                overflow-hidden
                bg-white
                px-4
                py-4
                rounded-xl
                border
                border-neutral-100
            "
        >


            {/* Header */}

            <div
                className="
                    flex
                    items-start
                    justify-between
                "
            >

                <div>

                    <div className="flex items-center">

                        <h2
                            className="
                                text-base
                                font-medium
                                md:text-lg
                            "
                        >
                            خدمات درمانی
                        </h2>

                    </div>


                    <p
                        className="
                            mt-1
                            text-xs
                            text-[#686c79]
                        "
                    >
                        مشاوره متنی و تلفنی فوری
                    </p>

                </div>



                <a
                    href="/consultation"
                    className="
                        mt-2
                        text-sm
                        font-medium
                        text-[#006a40]
                    "
                >
                    همه تخصص‌ها
                </a>


            </div>



            {/* Items */}

            <div
                className="
                    mt-6
                    flex
                    gap-4
                    overflow-x-auto
                    pb-2
                    pr-1
                    pl-2
                    scrollbar-hide
                "
            >

                {expertises.map((item) => (

                    <a
                        key={item.title}
                        href={item.href}
                        className="
                            flex
                            shrink-0
                            flex-col
                            items-center
                        "
                    >

                        <div
                            className="
                                h-[70px]
                                w-[70px]
                                overflow-hidden
                                rounded-2xl
                                bg-neutral-100
                            "
                        >

                            <img
                                src={item.image}
                                alt={item.title}
                                loading="lazy"
                                className="
                                    h-full
                                    w-full
                                    object-cover
                                "
                            />

                        </div>


                        <h3
                            className="
                                mt-3
                                whitespace-nowrap
                                text-center
                                text-xs
                                font-medium
                            "
                        >
                            {item.title}
                        </h3>


                    </a>

                ))}

            </div>


        </section>

    );
}
