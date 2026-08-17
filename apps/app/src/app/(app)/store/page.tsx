"use client";

import { useState } from "react";
import {
  Award,
  Check,
  ChevronLeft,
  Heart,
  Search,
  ShoppingCart,
  Star,
  X,
} from "lucide-react";
import HomeSlider from "@/components/home/home-slider";
import { EmptyState } from "@/components/shared/empty-state";
import { PRODUCTS } from "@/lib/data/catalog";
import { formatPrice, toP } from "@/lib/format";
import { useScreenNavigation } from "@/lib/navigation";
import { cartCount, useCartStore } from "@/stores/cart";
import { useWishlistStore } from "@/stores/wishlist";

const CATS = ["همه", "گیاهی", "روغن‌ها", "مکمل‌ها", "تجهیزات"];

export default function StorePage() {
  const navigateScreen = useScreenNavigation();
  const [catFilter, setCatFilter] = useState("همه");
  const [search, setSearch] = useState("");
  const cart = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const wishlist = useWishlistStore((s) => s.ids);
  const toggleWishlist = useWishlistStore((s) => s.toggleWishlist);
  const count = cartCount(cart);

  const filtered = PRODUCTS.filter(p => (catFilter === "همه" || p.cat === catFilter) && (!search || p.name.includes(search)));
  return (
    <div className="px-4 space-y-4">
      <div className="flex items-center justify-between pt-3 pb-1">
        <div><h1 className="text-xl font-bold text-foreground">فروشگاه</h1><p className="text-sm text-muted-foreground mt-0.5">محصولات سلامت</p></div>
        <div className="flex gap-2">
          <button onClick={() => navigateScreen("WishlistScreen")} className="w-10 h-10 bg-white rounded-2xl shadow-sm border border-border flex items-center justify-center relative"><Heart size={20} className="text-foreground/70" />{wishlist.length > 0 && <span className="absolute -top-1 -left-1 w-4 h-4 bg-rose-500 rounded-full text-[8px] text-white font-bold flex items-center justify-center">{toP(wishlist.length)}</span>}</button>
          <button onClick={() => navigateScreen("CartScreen")} className="w-10 h-10 bg-white rounded-2xl shadow-sm border border-border flex items-center justify-center relative"><ShoppingCart size={20} className="text-foreground/70" />{count > 0 && <span className="absolute -top-1 -left-1 w-4 h-4 bg-primary rounded-full text-[8px] text-white font-bold flex items-center justify-center">{toP(count)}</span>}</button>
        </div>
      </div>
      <div className="bg-white border border-border rounded-2xl flex items-center gap-2 px-3 py-3 shadow-sm">
        <Search size={16} className="text-muted-foreground flex-shrink-0" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="جستجوی محصول..." className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground text-right" dir="rtl" />
        {search && <button onClick={() => setSearch("")}><X size={16} className="text-muted-foreground" /></button>}
      </div>

      <div className="bg-primary/10 border border-primary/20 rounded-2xl p-3.5 flex items-center gap-3"><div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center flex-shrink-0"><Award size={17} className="text-white" /></div><div className="flex-1"><p className="text-sm font-bold text-primary">توصیه‌های دکتر شیرمردی</p><p className="text-xs text-primary/70">{toP(3)} محصول برای شما</p></div><ChevronLeft size={16} className="text-primary" /></div>
      <HomeSlider />
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
        {CATS.map(cat => <button key={cat} onClick={() => setCatFilter(cat)} className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${catFilter === cat ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>{cat}</button>)}
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon={Search} title="محصولی یافت نشد" desc="با کلمات دیگری جستجو کنید." action="پاک کردن فیلتر" onAction={() => { setSearch(""); setCatFilter("همه"); }} />
      ) : (
        <div className="grid grid-cols-2 gap-3 pb-4">
          {filtered.map(p => (
            <div key={p.id} className="relative bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
              <button onClick={() => navigateScreen("ProductDetail", { productId: p.id })} className="w-full text-right block">
                <div className="relative"><img src={`https://images.unsplash.com/${p.img}?w=200&h=130&fit=crop&auto=format`} alt={p.name} className="w-full h-32 object-cover" />{p.doctor && <div className="absolute top-2 right-2 bg-primary text-white text-[9px] font-bold px-2 py-0.5 rounded-full">توصیه دکتر</div>}</div>
                <div className="p-2.5 pb-1.5"><p className="text-xs font-semibold text-foreground leading-tight mb-1">{p.name}</p><div className="flex items-center gap-1 mb-1"><Star size={10} className="text-amber-400 fill-amber-400" /><span className="text-[10px] text-muted-foreground">{p.rating}</span></div><p className="text-primary text-xs font-bold">{formatPrice(p.price)} تومان</p></div>
              </button>
              <button onClick={() => toggleWishlist(p.id)} aria-label="افزودن به علاقه‌مندی‌ها" className={`absolute top-2 left-2 z-10 w-7 h-7 rounded-xl flex items-center justify-center ${wishlist.includes(p.id) ? "bg-rose-500 text-white" : "bg-white/90"}`}><Heart size={12} className={wishlist.includes(p.id) ? "fill-white" : ""} /></button>
              <div className="flex items-center justify-between px-2.5 pb-2.5">
                <span className="text-[10px] text-muted-foreground">{cart.find((c) => c.id === p.id) ? `✓ در سبد` : "موجود"}</span>
                <button onClick={() => addItem(p)} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${cart.find((c) => c.id === p.id) ? "bg-accent text-primary" : "bg-primary text-white"}`}>
                  {cart.find((c) => c.id === p.id) ? <Check size={14} strokeWidth={2.5} /> : <ShoppingCart size={14} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
