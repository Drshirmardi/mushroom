"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_REQUEST_TIMEOUT_MS } from "@sabz-zendegi/api-client";

import { PRODUCT_IMAGE_FALLBACK } from "../../lib/product-image";

type Props = {
  /** Resolved API image URL, or null when the product carries no image. */
  src: string | null;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  eager?: boolean;
};

/**
 * Single product <img> path for the customer Store. Missing images and failed
 * requests both render the same local neutral placeholder through the same
 * box, so layout never shifts. The error flag resets whenever the source
 * changes (product switching, replacement), and the fallback itself never
 * re-arms onError, so infinite fallback loops are impossible by construction.
 */
export function ProductImage({ src, alt, className, width, height, eager = false }: Props) {
  const [settled, setSettled] = useState<{ src: string | null; failed: boolean } | null>(null);
  const image = useRef<HTMLImageElement>(null);
  const fallback = !src || settled?.src === src && settled.failed;
  const pending = Boolean(src) && settled?.src !== src;
  useEffect(() => {
    if (!src) return;
    if (image.current?.complete && image.current.naturalWidth > 0) {
      setSettled({ src, failed: false });
      return;
    }
    let timer: number | undefined;
    const start = () => {
      timer ??= window.setTimeout(() => {
        if (image.current && (!image.current.complete || image.current.naturalWidth === 0)) setSettled({ src, failed: true });
      }, DEFAULT_REQUEST_TIMEOUT_MS);
    };
    // Offscreen lazy images have not started loading yet; their timeout starts on approach.
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { start(); observer.disconnect(); }
    }, { rootMargin: "300px" });
    if (eager) start();
    else if (image.current) observer.observe(image.current);
    return () => { observer.disconnect(); window.clearTimeout(timer); };
  }, [src, eager]);
  return <span className="product-image-frame" data-pending={pending}>
    {pending && <span className="product-image-placeholder skeleton" aria-hidden="true" />}
    <img key={src} ref={image}
    src={fallback ? PRODUCT_IMAGE_FALLBACK : src}
    alt={fallback ? "" : alt}
    className={className}
    width={width}
    height={height}
    loading={eager ? "eager" : "lazy"}
    decoding="async"
    draggable={false}
    onLoad={event => { if (event.currentTarget === image.current && !fallback) setSettled({ src, failed: false }); }}
    onError={fallback ? undefined : event => { if (event.currentTarget === image.current) setSettled({ src, failed: true }); }}
  /></span>;
}
