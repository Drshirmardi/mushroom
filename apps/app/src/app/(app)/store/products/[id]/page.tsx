"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Award,
  Check,
  ChevronLeft,
  Heart,
  Leaf,
  Minus,
  Plus,
  Share2,
  Star,
} from "lucide-react";
import { PRODUCTS } from "@/lib/data/catalog";
import { formatPrice, toP } from "@/lib/format";
import { useScreenNavigation } from "@/lib/navigation";
import { useCartStore } from "@/stores/cart";
import { useUiStore } from "@/stores/ui";
import { useWishlistStore } from "@/stores/wishlist";

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const navigateScreen = useScreenNavigation();
  const product = PRODUCTS.find(p => p.id === params?.id) || PRODUCTS[0];
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<"desc" | "ingr" | "reviews">("desc");
  const cart = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const wishlist = useWishlistStore((s) => s.ids);
  const toggleWishlist = useWishlistStore((s) => s.toggleWishlist);
  const setSheet = useUiStore((s) => s.setSheet);
  return (
    <div>
      <div className="relative"><img src={`https://images.unsplash.com/${product.img}?w=390&h=240&fit=crop&auto=format`} alt={product.name} className="w-full h-56 object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" /><div className="absolute top-3 right-4"><button onClick={() => router.back()} className="w-9 h-9 bg-white/90 rounded-xl flex items-center justify-center"><ChevronLeft size={20} style={{ transform: "rotate(180deg)" }} /></button></div><div className="absolute top-3 left-4 flex gap-2"><button onClick={() => toggleWishlist(product.id)} className={`w-9 h-9 rounded-xl flex items-center justify-center ${wishlist.includes(product.id) ? "bg-rose-500 text-white" : "bg-white/90"}`}><Heart size={18} className={wishlist.includes(product.id) ? "fill-white" : ""} /></button><button onClick={() => setSheet({ type: "shareProduct" })} className="w-9 h-9 bg-white/90 rounded-xl flex items-center justify-center"><Share2 size={18} /></button></div>{product.doctor && <div className="absolute bottom-3 right-4 bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1"><Award size={12} />توصیه دکتر</div>}</div>
      <div className="px-4 space-y-4 py-4 pb-8">
        <div><h1 className="text-xl font-bold text-foreground">{product.name}</h1><div className="flex items-center gap-2 mt-1"><div className="flex gap-0.5">{[1, 2, 3, 4, 5].map(s => <Star key={s} size={12} className={s <= Math.round(product.rating) ? "text-amber-400 fill-amber-400" : "text-muted"} />)}</div><span className="text-sm font-semibold text-foreground">{product.rating}</span><span className="text-sm text-muted-foreground">({toP(product.reviews)} نظر)</span></div></div>
        <div className="flex items-center justify-between bg-white rounded-2xl border border-border p-4 shadow-sm"><div><p className="text-xs text-muted-foreground">قیمت</p><p className="text-2xl font-black text-primary">{formatPrice(product.price)} <span className="text-sm font-semibold">تومان</span></p></div><div className="flex items-center gap-3 bg-muted rounded-xl p-1"><button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-8 h-8 rounded-lg flex items-center justify-center"><Minus size={16} /></button><span className="w-6 text-center font-bold text-sm">{toP(qty)}</span><button onClick={() => setQty(q => q + 1)} className="w-8 h-8 rounded-lg flex items-center justify-center"><Plus size={16} /></button></div></div>
        <div className="flex gap-2">{(["desc", "ingr", "reviews"] as const).map(t => <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${tab === t ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>{t === "desc" ? "توضیحات" : t === "ingr" ? "ترکیبات" : "نظرات"}</button>)}</div>
        {tab === "desc" && <div className="bg-white rounded-2xl border border-border p-4 shadow-sm"><p className="text-sm text-foreground/80 leading-7">{product.desc}</p><div className="mt-3 space-y-2">{["۱۰۰٪ طبیعی و گیاهی", "بدون افزودنی شیمیایی", "تأییدیه سازمان غذا و دارو"].map(f => <div key={f} className="flex items-center gap-2"><Check size={14} className="text-green-600" strokeWidth={2.5} /><span className="text-sm text-foreground">{f}</span></div>)}</div></div>}
        {tab === "ingr" && <div className="bg-white rounded-2xl border border-border p-4 shadow-sm space-y-2">{["عصاره لاوندر فرانسوی", "روغن آرگان مراکشی", "ویتامین E", "اسانس رزماری"].map(i => <div key={i} className="flex items-center gap-2 py-1.5 border-b border-border last:border-0"><Leaf size={14} className="text-green-500" /><span className="text-sm text-foreground">{i}</span></div>)}</div>}
        {tab === "reviews" && <div className="space-y-3">{[{ name: "سارا م.", rating: 5, text: "عالیه، واقعاً کمک کرد." }, { name: "علی ر.", rating: 4, text: "محصول خوبیه." }].map((r, i) => <div key={i} className="bg-white rounded-2xl border border-border p-4 shadow-sm"><div className="flex items-center justify-between mb-2"><p className="text-sm font-bold text-foreground">{r.name}</p><div className="flex gap-0.5">{[1, 2, 3, 4, 5].map(s => <Star key={s} size={11} className={s <= r.rating ? "text-amber-400 fill-amber-400" : "text-muted"} />)}</div></div><p className="text-sm text-foreground/80">{r.text}</p></div>)}</div>}
        <button onClick={() => { addItem(product); navigateScreen("CartScreen"); }} className="w-full bg-primary text-white rounded-2xl py-4 font-bold text-sm shadow-md shadow-primary/20 active:scale-[0.98] transition-transform">{cart.find((c) => c.id === product.id) ? "مشاهده سبد خرید" : "افزودن به سبد"}</button>
      </div>
    </div>
  );
}
