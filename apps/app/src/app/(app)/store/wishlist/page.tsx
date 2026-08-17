"use client";

import { useRouter } from "next/navigation";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { PRODUCTS } from "@/lib/data/catalog";
import { formatPrice } from "@/lib/format";
import { useScreenNavigation } from "@/lib/navigation";
import { useCartStore } from "@/stores/cart";
import { useWishlistStore } from "@/stores/wishlist";

export default function WishlistPage() {
  const router = useRouter();
  const navigateScreen = useScreenNavigation();
  const addItem = useCartStore((s) => s.addItem);
  const wishlist = useWishlistStore((s) => s.ids);
  const toggleWishlist = useWishlistStore((s) => s.toggleWishlist);

  const items = PRODUCTS.filter(p => wishlist.includes(p.id));
  return (
    <div>
      <PageHeader title="علاقه‌مندی‌ها" onBack={() => router.back()} />
      {items.length === 0 ? <EmptyState icon={Heart} title="لیست خالی است" desc="محصولات مورد علاقه را ذخیره کنید." action="فروشگاه" onAction={() => router.back()} /> : (
        <div className="px-4 space-y-3 pb-4">
          {items.map(p => (
            <div key={p.id} className="bg-white rounded-2xl border border-border shadow-sm p-4 flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0"><img src={`https://images.unsplash.com/${p.img}?w=128&h=128&fit=crop&auto=format`} alt={p.name} className="w-full h-full object-cover" /></div>
              <div className="flex-1"><p className="text-sm font-bold text-foreground">{p.name}</p><p className="text-primary text-sm font-black mt-0.5">{formatPrice(p.price)} تومان</p></div>
              <div className="flex flex-col gap-2"><button onClick={() => { addItem(p); navigateScreen("CartScreen"); }} className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center"><ShoppingCart size={15} className="text-white" /></button><button onClick={() => toggleWishlist(p.id)} className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center"><Trash2 size={15} className="text-red-500" /></button></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
