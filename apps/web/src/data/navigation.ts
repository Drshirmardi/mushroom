import {
    FaInstagram,
    FaTelegramPlane,
    FaWhatsapp,
} from "react-icons/fa";

import type { NavItem, SocialLink } from "@/types";

export const nav: NavItem[] = [
    { label: "صفحه اصلی", href: "#home" },
    { label: "خدمات درمانی", href: "#services" },
    { label: "ارزیابی آنلاین", href: "#assessment" },
    { label: "فروشگاه", href: "#shop" },
    { label: "مجله سلامت", href: "#blog" },
];

export const socialLinks: SocialLink[] = [
    {
        name: "Instagram",
        icon: FaInstagram,
        url: "https://instagram.com/dr_shirmardi",
    },
    {
        name: "Telegram",
        icon: FaTelegramPlane,
        url: "https://t.me/dr_shirmardi",
    },
    {
        name: "WhatsApp",
        icon: FaWhatsapp,
        url: "https://wa.me/989388231385",
    },
];
