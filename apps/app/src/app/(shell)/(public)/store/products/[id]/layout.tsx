import { ProductPageLoading } from "@/components/store/product-loading";
import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";

/** Public catalog only; metadata must never depend on a patient's session. */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const base = process.env.PUBLIC_API_URL ?? (process.env.NODE_ENV === "development" ? "http://localhost:3003" : null);
  const fallback = { title: "محصولات سلامت | دکتر شیرمردی", description: "مشخصات و قیمت محصولات سلامت در فروشگاه دکتر شیرمردی", image: "/images/doctor-opengraph.jpg" };
  const generic = { title: "اپ دکتر شیرمردی", description: "همراه بالینی طب سنتی — رزرو نوبت، پیگیری درمان و فروشگاه محصولات سلامت", image: "/images/doctor-opengraph.jpg" };
  if (!base) return { title: generic.title, description: generic.description, openGraph: { title: generic.title, description: generic.description, type: "website", url: "/", images: [generic.image] }, twitter: { card: "summary_large_image", title: generic.title, description: generic.description, images: [generic.image] } };
  try {
    const response = await fetch(`${base.replace(/\/$/, "")}/v1/commerce/products/${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(2000), cache: "no-store" });
    if (!response.ok) return { title: fallback.title, description: fallback.description, openGraph: { title: fallback.title, description: fallback.description, type: "website", images: [fallback.image] }, twitter: { card: "summary_large_image", title: fallback.title, description: fallback.description, images: [fallback.image] } };
    const value = await response.json();
    if (typeof value.title !== "string" || !value.title.trim()) return fallback;
    const title = `${value.title} | دکتر شیرمردی`;
    const description = (typeof value.shortDescription === "string" && value.shortDescription.trim() ? value.shortDescription : `مشخصات، قیمت و خرید ${value.title}`).slice(0, 160);
    const imagePath = typeof value.image?.contentPath === "string" && value.image.contentPath.startsWith("/v1/commerce/products/") ? new URL(value.image.contentPath, base).toString() : new URL(generic.image, process.env.PUBLIC_APP_URL || "http://localhost:3001").toString();
    return { title, description, openGraph: { title, description, type: "website", url: new URL(`/store/products/${encodeURIComponent(id)}`, process.env.PUBLIC_APP_URL || "http://localhost:3001").toString(), images: [{ url: imagePath }] }, twitter: { card: "summary_large_image", title, description, images: [imagePath] } };
  } catch { return { title: fallback.title, description: fallback.description, openGraph: { title: fallback.title, description: fallback.description, type: "website", images: [fallback.image] }, twitter: { card: "summary_large_image", title: fallback.title, description: fallback.description, images: [fallback.image] } }; }
}

export default function ProductLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<ProductPageLoading />}>{children}</Suspense>;
}
