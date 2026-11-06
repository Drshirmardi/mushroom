import { ProductPageLoading } from "@/components/store/product-loading";
import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";

/** Public catalog only; metadata must never depend on a patient's session. */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const base = process.env.PUBLIC_API_URL ?? (process.env.NODE_ENV === "development" ? "http://localhost:3003" : null);
  const fallback = { title: "محصولات سلامت | دکتر شیرمردی", description: "مشخصات و قیمت محصولات سلامت در فروشگاه دکتر شیرمردی" };
  if (!base) return fallback;
  try {
    const response = await fetch(`${base.replace(/\/$/, "")}/v1/commerce/products/${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(2000), cache: "no-store" });
    if (!response.ok) return fallback;
    const value = await response.json();
    if (typeof value.title !== "string" || !value.title.trim()) return fallback;
    const title = `${value.title} | دکتر شیرمردی`;
    const description = (typeof value.shortDescription === "string" && value.shortDescription.trim() ? value.shortDescription : `مشخصات، قیمت و خرید ${value.title}`).slice(0, 160);
    const image = typeof value.image?.contentPath === "string" && value.image.contentPath.startsWith("/v1/commerce/products/") ? new URL(value.image.contentPath, base).toString() : null;
    return { title, description, openGraph: { title, description, type: "website", ...(image ? { images: [{ url: image }] } : {}) }, twitter: { card: image ? "summary_large_image" : "summary", title, description, ...(image ? { images: [image] } : {}) } };
  } catch { return fallback; }
}

export default function ProductLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<ProductPageLoading />}>{children}</Suspense>;
}
