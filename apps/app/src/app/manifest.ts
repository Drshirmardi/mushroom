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
    background_color: "#ffffff",
    theme_color: "#176b9a",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
  };
}
