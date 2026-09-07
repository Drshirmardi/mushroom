"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Bookmark, ChevronLeft, Share2 } from "lucide-react";
import { useAuthSession } from "@/components/auth/session-gate";
import { followUpErrorMessage, getPatientArticle, type PatientArticle } from "@/lib/follow-up-api";

export default function ArticleDetailPage() {
  const router = useRouter(); const params = useParams<{ title: string }>(); const { authentication } = useAuthSession(); const [item, setItem] = useState<PatientArticle | null>(null); const [error, setError] = useState<string | null>(null); const [saved, setSaved] = useState(false); const slug = params?.title;
  const reload = () => { if (!slug) return; setItem(null); setError(null); void getPatientArticle(authentication.accessToken, slug).then(setItem, (reason: unknown) => setError(followUpErrorMessage(reason, "مقاله در دسترس نیست."))); };
  useEffect(reload, [authentication.accessToken, slug]);
  if (!item && !error) return <p role="status" className="m-4 rounded-2xl border border-border bg-white p-5 text-sm text-muted-foreground">در حال دریافت مقاله…</p>;
  if (error) return <div className="m-4 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"><p>{error}</p><button onClick={reload} className="mt-3 font-bold text-primary">تلاش دوباره</button></div>;
  if (!item) return null;
  return <div><div className="relative h-40 bg-gradient-to-br from-primary/20 to-secondary"><div className="absolute top-3 right-4"><button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/90"><ChevronLeft size={20} style={{ transform: "rotate(180deg)" }} /></button></div><div className="absolute bottom-3 left-4 flex gap-2"><button onClick={() => setSaved((value) => !value)} className={`flex h-9 w-9 items-center justify-center rounded-xl ${saved ? "bg-primary text-white" : "bg-white/90"}`}><Bookmark size={18} className={saved ? "fill-white" : ""} /></button><button className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/90"><Share2 size={18} /></button></div></div><article className="space-y-4 px-4 py-5 pb-8"><span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-primary">{item.category.name}</span><h1 className="text-xl font-bold leading-relaxed text-foreground">{item.title}</h1>{item.summary && <p className="text-sm leading-8 text-muted-foreground">{item.summary}</p>}<div className="whitespace-pre-wrap border-t border-border pt-4 text-sm leading-8 text-foreground/80">{item.body}</div></article></div>;
}
