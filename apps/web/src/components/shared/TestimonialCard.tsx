import type { Testimonial } from "@/types";

export function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
    return (
        <div className="rounded-3xl bg-card border border-border p-5 md:p-7 shadow-premium hover:shadow-glow hover:-translate-y-1 transition-all duration-300">
            <div className="text-[color:var(--gold)] mb-3 md:mb-4 text-lg">★★★★★</div>
            <p className="text-[15px] md:text-base text-foreground/85 leading-[2] md:leading-relaxed mb-5 md:mb-6">
                «{testimonial.text}»
            </p>
            <div className="flex items-center gap-3 pt-4 border-t border-border">
                <div className="w-11 h-11 rounded-full gradient-hero text-primary-foreground flex items-center justify-center font-bold">
                    {testimonial.name.charAt(0)}
                </div>
                <div>
                    <div className="font-bold">{testimonial.name}</div>
                    <div className="text-xs text-muted-foreground">{testimonial.role}</div>
                </div>
            </div>
        </div>
    );
}
