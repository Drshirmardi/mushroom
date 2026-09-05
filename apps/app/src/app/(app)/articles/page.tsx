"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen } from "lucide-react";
import { useAuthSession } from "@/components/auth/session-gate";
import { PageHeader } from "@/components/shared/page-header";
import { followUpErrorMessage, listPatientArticles, type PatientArticle } from "@/lib/follow-up-api";
import { useScreenNavigation } from "@/lib/navigation";

export default function ArticlesPage() {
  const router = useRouter(); const navigateScreen = useScreenNavigation(); const { authentication } = useAuthSession(); const [items, setItems] = useState<PatientArticle[] | null>(null); const [error, setError] = useState<string | null>(null); const [category, setCategory] = useState("همه");
  const reload = () => { setItems(null); setError(null); void listPatientArticles(authentication.accessToken).then((value) => setItems(value.items), (reason: unknown) => setError(followUpErrorMessage(reason))); };
  useEffect(reload, [authentication.accessToken]);
  const categories = useMemo(() => ["همه", ...new Set((items ?? []).map((item) => item.category.name))], [items]);
  const filtered = category === "همه" ? items : items?.filter((item) => item.category.name === category);
  return <div><PageHeader title="مقالات آموزشی" onBack={() => router.back()} /><div className="space-y-4 px-4 pb-4">{items && <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`flex-shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${category === item ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>{item}</button>)}</div>}{!items && !error && <p role="status" className="rounded-2xl border border-border bg-white p-5 text-sm text-muted-foreground">در حال دریافت مقاله‌ها…</p>}{error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"><p>{error}</p><button onClick={reload} className="mt-3 font-bold text-primary">تلاش دوباره</button></div>}{filtered?.length === 0 && <p className="rounded-2xl border border-border bg-white p-5 text-sm text-muted-foreground">مقالهٔ منتشرشده‌ای وجود ندارد.</p>}<div className="space-y-3">{filtered?.map((item) => <button key={item.id} onClick={() => navigateScreen("ArticleDetail", { title: item.slug })} className="flex w-full overflow-hidden rounded-2xl border border-border bg-white text-right shadow-sm"><div className="flex h-24 w-28 flex-shrink-0 items-center justify-center bg-accent"><BookOpen size={24} className="text-primary" /></div><div className="flex min-w-0 flex-1 flex-col justify-center p-3"><p className="mb-1.5 line-clamp-2 text-sm font-bold leading-tight text-foreground">{item.title}</p><span className="w-fit rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-primary">{item.category.name}</span><p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{item.summary}</p></div></button>)}</div></div></div>;
}
