import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/sections/Hero";
import { Services } from "@/components/sections/Services";
import { Assessment } from "@/components/sections/Assessment";
import { Journey } from "@/components/sections/Journey";
import { Shop } from "@/components/sections/Shop";
import { SpecialOffer } from "@/components/sections/SpecialOffer";
import { Testimonials } from "@/components/sections/Testimonials";
import { Faq } from "@/components/sections/Faq";

export default function HomePage() {
    return (
        <div className="min-h-screen bg-background text-foreground pb-20 md:pb-0">
            <Header />
            <Hero />
            <Services />
            <Assessment />
            <Journey />
            <Shop />
            <SpecialOffer />
            <Testimonials />
            <Faq />
            <Footer />
        </div>
    );
}
