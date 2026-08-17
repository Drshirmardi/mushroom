import { socialLinks } from "@/data";
import { Icon } from "@/components/shared/Icon";

export function Footer() {
    return (
        <footer className="bg-primary text-primary-foreground mt-10">
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 grid md:grid-cols-4 gap-10">
                <div className="md:col-span-2">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-9 h-9 rounded-xl bg-[color:var(--gold)] flex items-center justify-center text-primary">
                            <Icon name="spa" />
                        </div>
                        <span className="font-bold text-lg">دکتر شیرمردی</span>
                    </div>
                    <p className="text-primary-foreground/75 leading-relaxed max-w-md text-sm">
                        مرکز طب سوزنی دکتر سیدابوالفتح شیرمردی،
                        <br />
                        مجموعه‌ای پیشرو در ارائه خدمات طب سوزنی و درمان‌های مکمل در ایران است.
                        <br />
                        با بهره‌گیری از تجربه، دانش و رویکردهای نوین، در کنار مراجعین خود برای دستیابی به سلامت بهتر قدم برمی‌دارد.
                    </p>
                    <div className="flex items-center gap-3 mt-6">
                        {socialLinks.map(({ name, icon: SocialIcon, url }) => (
                            <a
                                key={name}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-10 h-10 rounded-full bg-white/10 hover:bg-[color:var(--gold)] hover:text-primary flex items-center justify-center transition-all duration-300"
                                aria-label={name}
                            >
                                <SocialIcon size={18} />
                            </a>
                        ))}
                    </div>
                </div>
                <div>
                    <h4 className="font-bold mb-4">دسترسی سریع</h4>
                    <ul className="space-y-2 text-sm text-primary-foreground/75">
                        <li>
                            <a href="#services" className="hover:text-[color:var(--gold)]">
                                خدمات درمانی
                            </a>
                        </li>
                        <li>
                            <a href="#assessment" className="hover:text-[color:var(--gold)]">
                                ارزیابی هوشمند
                            </a>
                        </li>
                        <li>
                            <a href="#shop" className="hover:text-[color:var(--gold)]">
                                فروشگاه محصولات
                            </a>
                        </li>
                        <li>
                            <a href="#" className="hover:text-[color:var(--gold)]">
                                درباره ما
                            </a>
                        </li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-bold mb-4">ارتباط با ما</h4>
                    <ul className="space-y-3 text-sm text-primary-foreground/75">
                        <li className="flex gap-2">
                            <Icon name="location_on" className="text-[color:var(--gold)] shrink-0" />

                            <a
                                href="https://www.google.com/maps?q=32.319636,50.859522"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group"
                            >
                                <span className="block text-[10px] text-[color:var(--gold)] mb-1 group-hover:underline">
                                    برای مشاهده روی نقشه کلیک کنید
                                </span>

                                <span className="group-hover:underline">
                                    شهرکرد، میدان انقلاب، خیابان حافظ جنوبی، نبش کوچه ۱۳، طبقه دوم
                                </span>
                            </a>
                        </li>

                        <li className="flex gap-2">
                            <Icon name="call" className="text-[color:var(--gold)]" />
                            <a href="tel:03832276313" className="hover:underline">
                                038-32276313
                            </a>
                        </li>

                        <li className="flex gap-2">
                            <Icon name="call" className="text-[color:var(--gold)]" />
                            <a href="tel:09388231385" className="hover:underline">
                                09388231385
                            </a>
                        </li>

                        <li className="flex gap-2">
                            <Icon name="mail" className="text-[color:var(--gold)]" />
                            <span>info@drshirmardi.ir</span>
                        </li>
                    </ul>
                </div>
            </div>
            <div className="border-t border-white/10">
                <div className="max-w-7xl mx-auto px-4 md:px-8 py-5 text-center text-xs text-primary-foreground/60">
                    © {new Date().getFullYear()} تمامی حقوق مادی و معنوی این سایت متعلق به دکتر سیدابوالفتح شیرمردی می‌باشد.
                </div>
            </div>
        </footer>
    );
}
