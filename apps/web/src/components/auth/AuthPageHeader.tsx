import Link from "next/link";

import { Icon } from "@/components/shared/Icon";

export function AuthPageHeader() {
    return (
        <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 lg:hidden">
                <div className="gradient-hero flex h-9 w-9 items-center justify-center rounded-xl text-primary-foreground">
                    <Icon name="spa" />
                </div>
                <span className="text-lg font-bold tracking-tight">دکتر شیرمردی</span>
            </Link>
            <Link
                href="/"
                className="press inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
                <Icon name="arrow_forward" className="text-lg" />
                بازگشت به سایت
            </Link>
        </div>
    );
}
