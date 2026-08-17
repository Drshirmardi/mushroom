import { journeySteps } from "@/data";
import { Icon } from "@/components/shared/Icon";
import { SectionHeading } from "@/components/shared/SectionHeading";

export function Journey() {
    return (
        <section className="max-w-7xl mx-auto px-5 md:px-8 py-14 md:py-20">
            <SectionHeading
                badge="مسیر بهبودی شما"
                title="از اولین تماس تا سلامتی کامل"
                subtitle="در کنار شما هستیم."
                className="[&_h2]:mb-4"
            />
            <div className="relative grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-8 md:gap-6">
                <div className="hidden md:block absolute top-8 right-[12%] left-[12%] h-0.5 bg-gradient-to-l from-primary via-[color:var(--gold)] to-primary opacity-30" />
                {journeySteps.map((step) => (
                    <div key={step.n} className="group relative text-center">
                        <div className="w-14 h-14 md:w-16 md:h-16 mx-auto rounded-2xl gradient-hero text-primary-foreground flex items-center justify-center shadow-soft mb-3 md:mb-4 relative z-10 transition-transform duration-300 group-hover:-translate-y-1">
                            <Icon name={step.i} className="text-2xl md:text-3xl" />
                        </div>
                        <div className="inline-block rounded-full bg-secondary text-primary text-[11px] md:text-xs font-bold px-3 py-1 mb-2">
                            مرحله {step.n}
                        </div>
                        <h3 className="font-bold text-base md:text-lg mb-1.5 md:mb-2">{step.t}</h3>
                        <p className="text-[13px] md:text-sm text-muted-foreground leading-relaxed">
                            {step.d}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
}
