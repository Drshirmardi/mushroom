"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import { Image as ImageIcon, ImageOff } from "lucide-react";

import { getDashboardAccessToken } from "../../components/auth/dashboard-session-gate";
import { productImageApi } from "../../lib/commerce-product-image-api";
import { previewBannerMedia } from "../../lib/content-banners-api";

// Bound requests without retaining authenticated Blob URLs between consumers or sessions.
const MAX_CONCURRENT = 3;
let active = 0;
const waiting: Array<() => void> = [];
async function withSlot<T>(work: () => Promise<T>): Promise<T> {
  if (active < MAX_CONCURRENT) active++; else await new Promise<void>(resolve => waiting.push(resolve));
  try { return await work(); } finally { const next = waiting.shift(); if (next) next(); else active--; }
}
function usePreview(key: string, enabled: boolean, load: (signal: AbortSignal) => Promise<Blob>) {
  const [state, setState] = useState<{ key: string; url: string | null; failed: boolean }>({ key: "", url: null, failed: false });
  useEffect(() => {
    if (!enabled) return;
    const abort = new AbortController(); let objectUrl: string | null = null;
    void withSlot(async () => { abort.signal.throwIfAborted(); return load(abort.signal); })
      .then(blob => { if (abort.signal.aborted) return; objectUrl = URL.createObjectURL(blob); setState({ key, url: objectUrl, failed: false }); })
      .catch(() => { if (!abort.signal.aborted) setState({ key, url: null, failed: true }); });
    return () => { abort.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [key, enabled, load]);
  return enabled && state.key === key ? state : { url: null, failed: false };
}

function Frame({ alt, className = "", children }: { alt: string; className?: string; children: ReactNode }) {
  return <div className={`relative flex items-center justify-center overflow-hidden bg-[#f4f8f6] ${className}`} role="img" aria-label={alt}>{children}</div>;
}

export function BannerImage({ bannerId, hasMedia, alt, className = "", refreshKey = "" }: { bannerId: string; hasMedia: boolean; alt: string; className?: string; refreshKey?: string | null }) {
  const load = useCallback(async (signal: AbortSignal) => {
    const token = await getDashboardAccessToken(); if (!token) throw new Error("no-token");
    return previewBannerMedia(token, bannerId, signal);
  }, [bannerId]);
  const { url, failed } = usePreview(`banner:${bannerId}:${refreshKey}`, hasMedia, load);
  if (hasMedia && url) return <Frame alt={alt} className={className}><Image src={url} alt="" fill unoptimized sizes="(max-width: 768px) 50vw, 320px" className="h-full w-full object-cover" /></Frame>;
  return <Frame alt={alt} className={className}>
    {hasMedia && !failed ? <span className="h-full w-full animate-pulse bg-[#e3ede7] motion-reduce:animate-none" aria-hidden="true" /> : <span className="flex flex-col items-center gap-1 text-xs text-muted-foreground"><ImageOff size={20} aria-hidden="true" />{hasMedia ? "پیش‌نمایش در دسترس نیست" : "بدون تصویر"}</span>}
  </Frame>;
}

export function ProductImage({ productId, hasImage, alt, className = "", refreshKey = "" }: { productId: string; hasImage: boolean; alt: string; className?: string; refreshKey?: string }) {
  const load = useCallback((signal: AbortSignal) => productImageApi(getDashboardAccessToken).preview(productId, signal), [productId]);
  const { url, failed } = usePreview(`product:${productId}:${refreshKey}`, hasImage, load);
  if (hasImage && url) return <Frame alt={alt} className={className}><Image src={url} alt="" fill unoptimized sizes="(max-width: 768px) 50vw, 320px" className="h-full w-full object-contain p-2" /></Frame>;
  return <Frame alt={alt} className={className}>
    {hasImage && !failed ? <span className="h-full w-full animate-pulse bg-[#e3ede7] motion-reduce:animate-none" aria-hidden="true" /> : <ImageIcon size={22} className="text-muted-foreground/60" aria-hidden="true" />}
  </Frame>;
}
