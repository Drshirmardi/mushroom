import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "دکتر شیرمردی",
    short_name: "دکتر شیرمردی",
    description: "همراه بالینی طب سنتی — رزرو نوبت، پیگیری درمان و فروشگاه محصولات سلامت",
    dir: "rtl",
    lang: "fa",
    start_url: "/",
    display: "standalone",
    background_color: "#1159FC",
    theme_color: "#1159FC",
    icons: [
      { src: "/app-icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app-icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/app-icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
