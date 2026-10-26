"use client";

import { useEffect, useState } from "react";

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
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);
  const fallback = !src || failed;
  return <img
    src={fallback ? PRODUCT_IMAGE_FALLBACK : src}
    alt={fallback ? "" : alt}
    className={className}
    width={width}
    height={height}
    loading={eager ? "eager" : "lazy"}
    decoding="async"
    draggable={false}
    onError={fallback ? undefined : () => setFailed(true)}
  />;
}
