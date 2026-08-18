import { Icon } from "@/components/shared/Icon";

interface AuthBrandPanelProps {
    title: string;
    highlight: string;
    description: string;
}

const features = [
    {
        icon: "health_and_safety",
        title: "درمان هدفمند",
        description: "برنامه درمان اختصاصی بر اساس مزاج و شرایط شما",
    },
    {
        icon: "auto_awesome",
        title: "ارزیابی هوشمند",
        description: "تحلیل کامل وضعیت سلامت در کمتر از ۵ دقیقه",
    },
    {
        icon: "support_agent",
        title: "همراهی همه‌روزه",
        description: "پشتیبانی و مشاوره کارشناسان در طول مسیر درمان",
    },
];

export function AuthBrandPanel({ title, highlight, description }: AuthBrandPanelProps) {
    return (
        <aside className="gradient-hero relative hidden overflow-hidden p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between xl:p-16">
            <div className="float-slower absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
            <div className="float-slow absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-gold/20 blur-3xl" />

            <div className="relative flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 backdrop-blur">
                    <Icon name="spa" className="text-2xl" />
                </div>
                <span className="text-lg font-bold">دکتر شیرمردی</span>
            </div>

            <div className="relative space-y-8">
                <div>
                    <h2 className="text-4xl font-bold leading-[1.35] xl:text-[2.75rem]">
                        {title}
                        <br />
                        <span className="text-gold">{highlight}</span>
                    </h2>
                    <p className="mt-5 max-w-md text-base leading-8 opacity-90">
                        {description}
                    </p>
                </div>

                <ul className="space-y-4">
                    {features.map((feature) => (
                        <li key={feature.icon} className="flex items-center gap-4">
                            <div className="flex h-12 w-12 min-w-12 items-center justify-center rounded-2xl bg-gold text-primary">
                                <Icon name={feature.icon} className="text-2xl" />
                            </div>
                            <div>
                                <h3 className="font-bold">{feature.title}</h3>
                                <p className="mt-1 text-sm leading-6 opacity-80">
                                    {feature.description}
                                </p>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            <figure className="relative rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur">
                <blockquote className="text-[15px] leading-7 opacity-90">
                    «اولین کلینیکی بود که واقعاً احساس کردم برنامه درمان برای شرایط
                    خودم طراحی شده، نه یک نسخه یکسان برای همه.»
                </blockquote>
                <figcaption className="mt-3 text-sm font-bold text-gold">
                    مریم احمدی — بیمار کلینیک
                </figcaption>
            </figure>
        </aside>
    );
}
