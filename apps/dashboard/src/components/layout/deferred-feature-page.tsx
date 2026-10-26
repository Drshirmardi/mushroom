import Link from "next/link";
import { Construction } from "lucide-react";

export function DeferredFeaturePage({ title }: { title: string }) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-5 sm:p-8">
      <section className="w-full max-w-xl rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <Construction size={26} />
        </div>
        <h1 className="mt-5 text-xl font-bold">{title}</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          این قابلیت هنوز به سرویس عملیاتی متصل نشده است. برای جلوگیری از نمایش اطلاعات آزمایشی، تا زمان تکمیل backend در دسترس نیست.
        </p>
        <Link href="/dashboard" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
          بازگشت به داشبورد
        </Link>
      </section>
    </div>
  );
}
