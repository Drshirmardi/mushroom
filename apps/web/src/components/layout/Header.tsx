import Link from "next/link";

import { nav } from "@/data";
import { Icon } from "@/components/shared/Icon";

export function Header() {
    return (
        <header className="sticky top-0 z-40 backdrop-blur-lg bg-background/80 border-b border-border/60">
            <div className="max-w-7xl mx-auto flex items-center justify-between px-5 md:px-8 h-16">
                <Link href="/" className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl gradient-hero flex items-center justify-center text-primary-foreground">
                        <Icon name="spa" />
                    </div>
                    <span className="font-bold text-lg tracking-tight">دکتر شیرمردی</span>
                </Link>
                <nav className="hidden lg:flex items-center gap-8 text-sm">
                    {nav.map((n) => (
                        <a
                            key={n.href}
                            href={n.href}
                            className="text-muted-foreground hover:text-primary transition-colors"
                        >
                            {n.label}
                        </a>
                    ))}
                </nav>
                <div className="flex items-center gap-2 sm:gap-3">
                    <button className="hidden md:flex w-9 h-9 rounded-full items-center justify-center text-muted-foreground hover:bg-secondary transition-colors">
                        <Icon name="search" />
                    </button>
                    <Link
                        href="/signup"
                        className="hidden sm:inline-flex items-center rounded-full border border-primary/30 px-4 md:px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
                    >
                        ثبت‌نام
                    </Link>
                    <Link
                        href="/login"
                        className="press inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 md:px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 hover:-translate-y-0.5 shadow-soft"
                    >
                        ورود
                    </Link>
                </div>
            </div>
        </header>
    );
}
