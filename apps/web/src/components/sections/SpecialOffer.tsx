import { Icon } from "@/components/shared/Icon";

export function SpecialOffer() {
    return (
        <section className="max-w-7xl mx-auto px-5 md:px-8 py-8 md:py-10">
            <div className="relative overflow-hidden rounded-[1.75rem] md:rounded-[2rem] bg-card border border-[color:var(--gold)]/40 shadow-premium p-6 md:p-12 grid md:grid-cols-[1fr_auto] gap-6 md:gap-8 items-center">
                <div
                    className="absolute -top-16 -left-10 w-56 h-56 rounded-full bg-[color:var(--gold)]/10 blur-3xl"
                    aria-hidden
                />
                <div className="relative">
                    <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--gold)]/12 text-[color:var(--gold)] text-xs md:text-sm font-bold px-3 py-1.5 mb-3">
                        <Icon name="local_offer" className="text-base" />
                        پیشنهاد ویژه
                    </div>
                    <h3 className="text-xl md:text-3xl font-bold mb-3">اولین خرید از فروشگاه با ۲۰٪ تخفیف</h3>
                    <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                        اولین خرید از فروشگاه و ارزیابی جامع با ۲۰٪ تخفیف ویژه برای مراجعین جدید. سلامتی را از
                        امروز شروع کنید.
                    </p>
                    <div className="mt-4 flex items-center gap-3 flex-wrap">
                        <span className="text-sm text-muted-foreground">کد تخفیف:</span>
                        <span className="rounded-lg bg-secondary border border-dashed border-primary/40 px-3 py-1.5 font-mono font-bold text-primary tracking-wider">
                            ACUHEALTH20
                        </span>
                    </div>
                </div>
                <a
                    href="#assessment"
                    className="press relative inline-flex items-center justify-center gap-2 rounded-full gradient-hero text-primary-foreground px-8 py-4 font-bold shadow-glow hover:-translate-y-0.5 whitespace-nowrap"
                >
                    رفت به فروشگاه
                    <Icon name="arrow_back" />
                </a>
            </div>
        </section>
    );
}
