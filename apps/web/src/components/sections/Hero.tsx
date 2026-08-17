import { Icon } from "@/components/shared/Icon";

const stats = [
    { n: "۲۵+", l: "سال تجربه تخصصی" },
    { n: "۱۰،۰۰۰+", l: "مراجعه‌کننده موفق" },
    { n: "۹۸٪", l: "رضایت بیماران" },
];

export function Hero() {
    return (
        <section id="home" className="relative overflow-hidden">
            <div className="absolute inset-0 gradient-soft" aria-hidden />
            <div
                className="absolute inset-0 bg-dots opacity-40 [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]"
                aria-hidden
            />
            <div
                className="absolute -top-48 -left-40 w-[560px] h-[560px] rounded-full bg-primary/10 blur-3xl float-slow"
                aria-hidden
            />
            <div
                className="absolute -bottom-48 -right-24 w-[440px] h-[440px] rounded-full bg-[color:var(--gold)]/15 blur-3xl float-slower"
                aria-hidden
            />
            <div
                className="absolute top-1/3 left-1/2 w-[320px] h-[320px] rounded-full bg-primary-glow/10 blur-3xl float-slower"
                aria-hidden
            />
            <div className="relative max-w-7xl mx-auto px-5 md:px-8 pt-10 pb-16 md:pt-24 md:pb-28 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center max-lg:[&>div:first-child]:order-2 max-lg:[&>div:last-child]:order-1">
                <div>
                    <div className="rise fade-up-1 inline-flex items-center gap-2 rounded-full glass border border-border/70 px-3.5 py-2 text-[11px] md:text-xs font-medium text-primary shadow-premium mb-5 md:mb-7">
                        <span className="relative flex w-2 h-2">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-[color:var(--gold)] opacity-70 animate-ping" />
                            <span className="relative inline-flex w-2 h-2 rounded-full bg-[color:var(--gold)]" />
                        </span>
                        دکتر سیدابوالفتح شیرمردی — صاحب تجربه طب سوزنی و سنتی
                    </div>
                    <h1
                        className="rise fade-up-2 font-serif text-[2.1rem] leading-[1.25] md:text-6xl md:leading-[1.15] text-foreground mb-4 md:mb-6 text-balance"
                        style={{ fontFamily: '"Vazirmatn", serif', fontWeight: 800 }}
                    >
                        درمان هدفمند،{" "}
                        <span className="relative inline-block text-primary">
                            آرامش پایدار
                            <span
                                className="absolute inset-x-0 -bottom-1 h-[6px] rounded-full bg-[color:var(--gold)]/30"
                                aria-hidden
                            />
                        </span>
                        ،
                        <br className="hidden md:block" /> زندگی سالم‌تر
                    </h1>

                    <p className="rise fade-up-3 text-[15px] md:text-lg text-muted-foreground max-w-xl leading-[2] md:leading-relaxed mb-7 md:mb-9">
                        با ترکیب دانش کهن طب سوزنی و فناوری‌های نوین تشخیصی، مسیر بهبودی شما را به‌صورت
                        شخصی‌سازی‌شده طراحی می‌کنیم. سلامتی شما، ماموریت ماست.
                    </p>
                    <div className="rise fade-up-4 flex flex-col sm:flex-row gap-3 mb-8 md:mb-10">
                        <a
                            href="#assessment"
                            className="group press inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3.5 font-semibold shadow-glow hover:bg-primary/92 hover:-translate-y-0.5"
                        >
                            رزرو نوبت مشاوره
                            <Icon
                                name="arrow_back"
                                className="transition-transform duration-300 group-hover:-translate-x-1"
                            />
                        </a>
                        <a
                            href="#assessment"
                            className="group press inline-flex items-center justify-center gap-2 rounded-full border border-border glass px-6 py-3.5 font-semibold hover:border-primary/40 hover:-translate-y-0.5 shadow-premium"
                        >
                            <Icon
                                name="stethoscope"
                                className="text-primary transition-transform duration-300 group-hover:rotate-6"
                            />
                            شروع ارزیابی آنلاین
                        </a>
                    </div>
                    <div className="rise fade-up-5 grid grid-cols-3 gap-2.5 md:gap-4 max-w-lg">
                        {stats.map((s) => (
                            <div
                                key={s.l}
                                className="rounded-2xl glass border border-border/70 p-3.5 md:p-4 shadow-premium transition-transform duration-300 hover:-translate-y-1"
                            >
                                <div className="text-xl md:text-3xl font-bold text-primary">{s.n}</div>
                                <div className="text-[11px] md:text-xs text-muted-foreground mt-1 leading-tight">
                                    {s.l}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="rise relative mb-8 lg:mb-0">
                    <div
                        className="absolute -inset-3 md:-inset-5 rounded-[2.5rem] gradient-hero opacity-15 blur-2xl"
                        aria-hidden
                    />
                    <div className="relative rounded-[1.75rem] md:rounded-[2.25rem] overflow-hidden shadow-glow border border-border/70 ring-1 ring-white/40">
                        <img
                            src="/image.webp"
                            alt="طب سوزنی دکتر سیدابوالفتح شیرمردی"
                            fetchPriority="high"
                            loading="eager"
                            decoding="async"
                            className="w-full h-[340px] sm:h-[420px] lg:h-[540px] object-cover transition-transform duration-[1200ms] hover:scale-[1.03]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-primary/45 via-transparent to-transparent" />
                    </div>
                    <div className="absolute -bottom-5 right-3 md:right-6 rounded-2xl glass border border-border/70 shadow-premium p-3.5 md:p-4 flex items-center gap-3 max-w-[230px] transition-transform duration-300 hover:-translate-y-1">
                        <div className="w-10 h-10 md:w-11 md:h-11 shrink-0 rounded-xl bg-[color:var(--gold)]/20 text-[color:var(--gold)] flex items-center justify-center">
                            <Icon name="verified" />
                        </div>
                        <div>
                            <div className="text-sm font-semibold">TCM Specialist</div>
                            <div className="text-[11px] text-muted-foreground">دوره‌های بین‌المللی طب چینی</div>
                        </div>
                    </div>
                    <div className="absolute -top-4 left-2 md:left-8 rounded-2xl glass border border-border/70 shadow-premium p-3 flex items-center gap-2 float-slow">
                        <div className="flex -space-x-2 space-x-reverse">
                            {[1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className="w-7 h-7 rounded-full border-2 border-card bg-gradient-to-br from-primary to-primary-glow"
                                />
                            ))}
                        </div>
                        <div className="text-xs">
                            <div className="font-semibold">۱۰،۰۰۰+ مراجع راضی</div>
                            <div className="text-[color:var(--gold)] flex items-center gap-0.5">{"★★★★★"}</div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="relative max-w-7xl mx-auto px-5 md:px-8">
                <div className="h-px bg-gradient-to-l from-transparent via-border to-transparent" />
            </div>
        </section>
    );
}
