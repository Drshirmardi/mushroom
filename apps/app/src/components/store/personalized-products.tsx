"use client";
import { LoadingState } from "@/components/shared/skeletons";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Leaf } from "lucide-react";
import { getCommerceRecommendations, type CommerceProduct, type CommerceRecommendations } from "../../lib/commerce-catalog-api";
import { StoreCollection } from "./store-collection";

const labels = { damavi: "دموی", safravi: "صفراوی", balgami: "بلغمی", sodavi: "سوداوی" };
export function PersonalizedProducts({ accessToken, renderProduct }: { accessToken?: string; renderProduct: (product: CommerceProduct) => ReactNode }) {
  const [data, setData] = useState<CommerceRecommendations | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false; setData(null); setError(false);
    if (accessToken) void getCommerceRecommendations(accessToken).then(result => { if (!cancelled) setData(result); }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [accessToken, retry]);
  if (!accessToken) return null;
  if (error) return <aside className="store-personal-hint store-personal-hint--compact" aria-label="پیشنهادهای مخصوص شما"><p>پیشنهادهای مرتبط با شما دریافت نشد.</p><button type="button" onClick={() => setRetry(value => value + 1)}>تلاش دوباره</button></aside>;
  if (!data) return <LoadingState label="در حال دریافت پیشنهادهای شما…" variant="grid" />;
  if (data.status === "READY" && data.items.length > 0) return <section className="store-personal" aria-label="محصولات مرتبط با مزاج شما">
    <div className="store-personal__intro"><Leaf size={18} aria-hidden="true" /><p>بر اساس نتیجهٔ ارزیابی شما{data.primary && data.secondary ? `؛ مزاج اول ${labels[data.primary]}، مزاج دوم ${labels[data.secondary]}` : ""}</p><Link href="/mezaj">مشاهدهٔ نتیجه</Link></div>
    <StoreCollection title="محصولات مرتبط با شما" id="store-personal-products">{data.items.map(renderProduct)}</StoreCollection>
  </section>;
  const missing = data.status === "NO_RESULT";
  if (!missing && data.status !== "REVIEW_REQUIRED") return null;
  return <aside className="store-personal-hint store-personal-hint--compact" aria-label="پیشنهادهای مخصوص شما"><Leaf size={19} aria-hidden="true" /><p>{missing ? "برای دیدن محصولات مرتبط با مزاجت، ارزیابی‌ات را کامل کن." : "برای پیشنهاد محصولات مرتبط، نتیجهٔ ارزیابی شما به بررسی متخصص نیاز دارد."}</p>{missing && <Link href="/assessment">شروع ارزیابی</Link>}</aside>;
}
