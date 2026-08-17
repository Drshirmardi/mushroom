import type { IconType } from "react-icons";

export interface NavItem {
    label: string;
    href: string;
}

export interface SocialLink {
    name: string;
    icon: IconType;
    url: string;
}

export interface Service {
    icon: string;
    title: string;
    short: string;
    desc: string;
}

export interface Product {
    tag: string;
    category: string;
    name: string;
    price: string;
    img: string;
}

export interface Testimonial {
    name: string;
    role: string;
    text: string;
}

export interface FAQ {
    q: string;
    a: string;
}

export interface JourneyStep {
    n: string;
    t: string;
    d: string;
    i: string;
}

export interface AssessmentStep {
    n: string;
    t: string;
    d: string;
    icon: string;
}
