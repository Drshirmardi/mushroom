import { assessmentSteps } from "@/data";
import { Icon } from "@/components/shared/Icon";

const features = [
    "کمتر از ۵ دقیقه",
    "تحلیل هوشمند",
    "ارزیابی مزاج",
    "گزارش اختصاصی",
];

export function Assessment() {
    return (
        <section
            id="assessment"
            className="max-w-7xl mx-auto px-5 md:px-8 py-16 lg:py-24"
        >
            <div className="relative overflow-hidden rounded-[2rem] md:rounded-[2.75rem] gradient-hero text-primary-foreground p-6 sm:p-8 lg:p-14">

                <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute -bottom-24 -left-16 w-80 h-80 rounded-full bg-[color:var(--gold)]/20 blur-3xl" />

                <div className="relative grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">

                    {/* Left Side */}
                    <div>

                        <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur px-4 py-2 text-xs font-semibold mb-5">
                            <Icon name="auto_awesome" className="text-base" />
                            Smart Health Assessment
                        </div>

                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
                            ارزیابی هوشمند
                            <br />
                            مزاج و سلامت
                        </h2>

                        <p className="mt-6 text-base md:text-lg leading-8 opacity-90 max-w-xl">
                            تنها در کمتر از <span className="font-bold text-[color:var(--gold)]">۵ دقیقه</span>،
                            با پاسخ به مجموعه‌ای از پرسش‌های تخصصی، سیستم هوشمند وضعیت سلامت،
                            مزاج، سبک زندگی و الگوهای علائم شما را تحلیل کرده و گزارشی
                            شخصی‌سازی‌شده برای شروع مسیر درمان ارائه می‌دهد.
                        </p>

                        <div className="flex flex-wrap gap-3 mt-8">

                            {features.map((item) => (
                                <div
                                    key={item}
                                    className="rounded-full border border-white/15 bg-white/10 backdrop-blur px-4 py-2 text-sm"
                                >
                                    {item}
                                </div>
                            ))}

                        </div>

                        <a
                            href="#"
                            className="mt-8 w-full sm:w-fit press group inline-flex items-center justify-center gap-2 rounded-full bg-card text-primary px-8 py-4 font-bold shadow-glow transition-all hover:-translate-y-1"
                        >
                            شروع ارزیابی
                            <Icon name="arrow_back" />
                        </a>

                        <p className="text-xs leading-6 opacity-70 mt-6 max-w-lg">
                            * این ارزیابی جهت تحلیل اولیه وضعیت سلامت و مزاج طراحی شده و
                            جایگزین معاینه و تشخیص نهایی پزشک نیست. تمامی اطلاعات شما
                            مطابق استانداردهای امنیتی به‌صورت محرمانه نگهداری خواهد شد.
                        </p>

                    </div>

                    {/* Right Side */}

                    <div className="space-y-5">
                        {assessmentSteps.map((step) => (
                            <div
                                key={step.n}
                                className="group rounded-3xl border border-white/15 bg-white/10 backdrop-blur p-5 sm:p-6 transition-all duration-300 hover:bg-white/15 hover:-translate-y-1"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 min-w-12 rounded-2xl bg-[color:var(--gold)] flex items-center justify-center text-primary">
                                        <Icon name={step.icon} className="text-xl" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between gap-3">
                                            <h3 className="font-bold text-lg">{step.t}</h3>
                                            <span className="text-xl font-black text-[color:var(--gold)]">
                                                {step.n}
                                            </span>
                                        </div>
                                        <p className="mt-3 text-[15px] leading-7 opacity-90">
                                            {step.d}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                </div>

            </div>
        </section>
    );
}
