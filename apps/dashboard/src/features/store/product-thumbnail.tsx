"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ImageOff, Package } from "lucide-react";
import { getDashboardAccessToken } from "@/components/auth/dashboard-session-gate";
import { productImageApi } from "@/lib/commerce-product-image-api";
import type { CommerceProduct } from "@/lib/commerce-catalog-api";

export function ProductThumbnail({ product, sizes = "(max-width: 640px) 100vw, 320px" }: { product: CommerceProduct; sizes?: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<{ imageId: string; url: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const imageId = product.image?.id;
  const [previousImage, setPreviousImage] = useState({ productId: product.id, imageId });
  if (previousImage.productId !== product.id || previousImage.imageId !== imageId) {
    setPreviousImage({ productId: product.id, imageId });
    setPreview(null);
    setFailed(false);
  }

  useEffect(() => {
    if (!imageId || !container.current) return;
    let active = true;
    let url: string | null = null;
    const abort = new AbortController();
    const load = () => {
      void productImageApi(getDashboardAccessToken).preview(product.id, abort.signal).then(blob => {
        if (!active) return;
        url = URL.createObjectURL(blob); setPreview({ imageId, url });
      }, () => { if (active) setFailed(true); });
    };
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); load(); }
    }, { rootMargin: "120px" });
    observer.observe(container.current);
    return () => { active = false; observer.disconnect(); abort.abort(); if (url) URL.revokeObjectURL(url); };
  }, [product.id, imageId]);

  return <div ref={container} className="relative flex h-full w-full items-center justify-center overflow-hidden bg-white">
    {!failed && preview && preview.imageId === imageId ? <Image src={preview.url} alt={product.image?.altText || product.title} fill unoptimized sizes={sizes} className="object-contain p-3" onError={() => setFailed(true)} /> : <div className="flex flex-col items-center gap-2 p-3 text-center text-zinc-500">
      {imageId ? failed ? <><ImageOff size={25} aria-hidden="true" /><span className="text-xs">تصویر دریافت نشد</span></> : <><Package size={27} strokeWidth={1.3} aria-hidden="true" /><span className="text-xs" role="status">در حال دریافت تصویر…</span></> : <><Package size={30} strokeWidth={1.2} aria-hidden="true" /><span className="text-xs">بدون تصویر</span></>}
    </div>}
  </div>;
}
