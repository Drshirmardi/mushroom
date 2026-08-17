import { testimonials } from "@/data";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { TestimonialCard } from "@/components/shared/TestimonialCard";

export function Testimonials() {
    return (
        <section className="max-w-7xl mx-auto px-5 md:px-8 py-14 md:py-20">
            <SectionHeading
                badge="تجربیات مراجعین"
                title="داستان‌های واقعی از مسیر بهبودی"
            />
            <div className="grid md:grid-cols-3 gap-4 md:gap-6">
                {testimonials.map((t) => (
                    <TestimonialCard key={t.name} testimonial={t} />
                ))}
            </div>
        </section>
    );
}
