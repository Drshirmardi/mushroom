"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ARTICLES, ARTICLE_CATEGORIES } from "@/lib/data/articles";
import { useScreenNavigation } from "@/lib/navigation";

export default function ArticlesPage() {
  const router = useRouter();
  const navigateScreen = useScreenNavigation();
  const [cat, setCat] = useState("همه");

  const filtered = cat === "همه" ? ARTICLES : ARTICLES.filter(a => a.cat === cat);
  return (
    <div>
      <PageHeader title="مقالات آموزشی" onBack={() => router.back()} />
      <div className="px-4 space-y-4 pb-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {ARTICLE_CATEGORIES.map(c => <button key={c} onClick={() => setCat(c)} className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${cat === c ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>{c}</button>)}
        </div>
        <div className="space-y-3">
          {filtered.map(a => (
            <button key={a.title} onClick={() => navigateScreen("ArticleDetail", { title: a.title })} className="w-full bg-white rounded-2xl border border-border shadow-sm overflow-hidden flex text-right">
              <img src={`https://images.unsplash.com/${a.img}?w=120&h=100&fit=crop&auto=format`} alt={a.title} className="w-28 h-24 object-cover flex-shrink-0" />
              <div className="p-3 flex flex-col justify-center flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground leading-tight mb-1.5 line-clamp-2">{a.title}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-secondary text-primary px-2 py-0.5 rounded-full font-semibold">{a.cat}</span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock size={10} />{a.time}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
