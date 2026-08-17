export interface IllnessItem {
    title: string;
    href: string;
    icon: string;
}

const BASE =
    "https://snapp.doctor/_next/image/?url=%2Ffiles%2FillnessCarousel%2Fimages%2F";

export const illnesses: IllnessItem[] = [
    // {
    //     title: "زگیل تناسلی",
    //     href: "/illness/hpv/",
    //     icon: `${BASE}HPV%20Doctor.png&w=128&q=75`,
    // },
    // {
    //     title: "کیست تخمدان",
    //     href: "/illness/ovarian-cyst/",
    //     icon: `${BASE}Ovarian%20Cyst.png&w=128&q=75`,
    // },
    {
        title: "کیست مویی",
        href: "/illness/pilonidal-cyst/",
        icon: `${BASE}Pilonidal%20Cyst%20Doctor.png&w=128&q=75`,
    },
    {
        title: "سرطان سینه",
        href: "/illness/breast-cancer/",
        icon: `${BASE}Breast%20Cancer.png&w=128&q=75`,
    },
    {
        title: "تیروئید",
        href: "/illness/thyroid/",
        icon: `${BASE}Thyroid%20Doctor.png&w=128&q=75`,
    },
    {
        title: "ریزش مو",
        href: "/illness/hair-loss/",
        icon: `${BASE}Hair%20Loss.png&w=128&q=75`,
    },
    {
        title: "دیابت",
        href: "/illness/diabetes/",
        icon: `${BASE}Diabetes%20Doctor.png&w=128&q=75`,
    },
    {
        title: "اسلیو معده",
        href: "/illness/gastric-sleeve/",
        icon: `${BASE}Gastric%20Sleeve.png&w=128&q=75`,
    },
    {
        title: "آلزایمر",
        href: "/illness/alzheimers/",
        icon: `${BASE}Alzheimers.png&w=128&q=75`,
    },
    // {
    //     title: "تعیین جنسیت",
    //     href: "/illness/gender-determination/",
    //     icon: `${BASE}Gender%20Determination.png&w=128&q=75`,
    // },
    {
        title: "واریس",
        href: "/illness/varicose/",
        icon: `${BASE}Varicose.png&w=128&q=75`,
    },
    {
        title: "بواسیر",
        href: "/illness/hemorrhoids/",
        icon: `${BASE}Hemorrhoids.png&w=128&q=75`,
    },
    {
        title: "سینوزیت",
        href: "/illness/sinusitis/",
        icon: `${BASE}Sinusitis.png&w=128&q=75`,
    },
    {
        title: "افزایش قد",
        href: "/illness/height-increase/",
        icon: `${BASE}Height%20Increase.png&w=128&q=75`,
    },
    {
        title: "کم خونی",
        href: "/illness/anemia/",
        icon: `${BASE}Anemia.png&w=128&q=75`,
    },
    {
        title: "بیشتر",
        href: "/illness/",
        icon: `${BASE}more.png&w=128&q=75`,
    },
];
