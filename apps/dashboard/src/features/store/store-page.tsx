"use client";

import { useState } from "react";
import { AlertTriangle, Check, Edit, Plus, Trash2 } from "lucide-react";
import { PRODUCTS } from "@/data/store";
import { StatusBadge } from "@/components/shared";
import { fm, p } from "@/lib/utils";

export function StorePage() {
  const [storeTab, setStoreTab] = useState<"products" | "categories" | "inventory" | "featured">("products");
  const [catFilter, setCatFilter] = useState("همه");
  const categories = ["همه", "مکمل", "تجهیزات", "گیاهی"];
  const filtered = catFilter === "همه" ? PRODUCTS : PRODUCTS.filter(p => p.cat === catFilter);
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-7 space-y-5">
      <div className="flex items-center gap-2 bg-card border border-border rounded-2xl p-1.5 w-fit shadow-sm">
        {([["products", "محصولات"], ["categories", "دسته‌بندی‌ها"], ["inventory", "انبار"], ["featured", "ویژه"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setStoreTab(id)} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${storeTab === id ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{label}</button>
        ))}
      </div>
      {storeTab === "products" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            {categories.map(c => <button key={c} onClick={() => setCatFilter(c)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${catFilter === c ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"}`}>{c}</button>)}
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold mr-auto"><Plus size={16} />محصول جدید</button>
          </div>
          {PRODUCTS.some(p => p.stock <= 5 && p.stock > 0) && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
              <AlertTriangle size={18} className="text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-800 font-medium">هشدار موجودی کم: پچ حرارتی کمردرد (۳ عدد) نیاز به سفارش دارد</p>
              <button className="mr-auto text-xs text-amber-700 font-bold hover:underline">سفارش دهید</button>
            </div>
          )}
          <div className="grid grid-cols-3 gap-5">
            {filtered.map(prod => (
              <div key={prod.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                <div className="h-36 bg-secondary/50 flex items-center justify-center text-5xl relative group-hover:bg-secondary transition-colors">
                  {prod.img}
                  {prod.featured && <span className="absolute top-2 right-2 text-[0.6rem] font-bold bg-amber-400 text-amber-900 px-2 py-0.5 rounded-full">ویژه</span>}
                  {prod.recommended && <span className="absolute top-2 left-2 text-[0.6rem] font-bold bg-primary text-white px-2 py-0.5 rounded-full">پزشک</span>}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-1"><h3 className="font-bold text-sm">{prod.name}</h3><StatusBadge status={prod.status} /></div>
                  <p className="text-[0.7rem] text-muted-foreground mb-3">{prod.cat}</p>
                  <div className="flex items-center justify-between mb-3"><span className="text-base font-bold text-primary">{fm(prod.price)}</span><span className="text-xs text-muted-foreground">موجودی: <span className={prod.stock === 0 ? "text-red-600 font-bold" : prod.stock <= 5 ? "text-amber-600 font-bold" : ""}>{p(prod.stock)}</span></span></div>
                  <div className="flex gap-2"><button className="flex-1 py-2 border border-border rounded-xl text-xs font-semibold hover:bg-secondary"><Edit size={12} className="inline ml-1" />ویرایش</button><button className="p-2 border border-border rounded-xl hover:bg-red-50"><Trash2 size={13} className="text-muted-foreground" /></button></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {storeTab === "categories" && (
        <div className="grid grid-cols-4 gap-4">
          {[{ name: "مکمل", icon: "💊", count: 2, color: "bg-violet-100 text-violet-700" }, { name: "تجهیزات", icon: "🩺", count: 2, color: "bg-blue-100 text-blue-700" }, { name: "گیاهی", icon: "🌿", count: 1, color: "bg-emerald-100 text-emerald-700" }, { name: "آموزشی", icon: "📚", count: 0, color: "bg-amber-100 text-amber-700" }].map(cat => (
            <div key={cat.name} className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md cursor-pointer transition-shadow">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-3 ${cat.color}`}>{cat.icon}</div>
              <h3 className="font-bold">{cat.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">{p(cat.count)} محصول</p>
            </div>
          ))}
          <button className="bg-card border-2 border-dashed border-border rounded-2xl p-5 flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary cursor-pointer"><Plus size={24} className="mb-2" />دسته جدید</button>
        </div>
      )}
      {storeTab === "inventory" && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full">
            <thead><tr className="border-b border-border bg-secondary/30">{["محصول", "موجودی", "حداقل", "وضعیت", "اقدام"].map(h => <th key={h} className="text-right px-5 py-3.5 text-xs font-bold text-muted-foreground">{h}</th>)}</tr></thead>
            <tbody>
              {PRODUCTS.map(prod => (
                <tr key={prod.id} className="border-b border-border last:border-0 hover:bg-secondary/20">
                  <td className="px-5 py-4"><div className="flex items-center gap-3"><span className="text-xl">{prod.img}</span><div><p className="text-sm font-semibold">{prod.name}</p><p className="text-xs text-muted-foreground">{prod.cat}</p></div></div></td>
                  <td className="px-5 py-4"><span className={`text-sm font-bold ${prod.stock === 0 ? "text-red-600" : prod.stock <= 5 ? "text-amber-600" : "text-foreground"}`}>{p(prod.stock)}</span></td>
                  <td className="px-5 py-4 text-sm text-muted-foreground">{p(5)}</td>
                  <td className="px-5 py-4"><StatusBadge status={prod.status} /></td>
                  <td className="px-5 py-4"><button className="text-xs text-primary font-semibold hover:underline">سفارش مجدد</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {storeTab === "featured" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">محصولات ویژه در صفحه اصلی فروشگاه نمایش داده می‌شوند</p>
          <div className="grid grid-cols-3 gap-4">
            {PRODUCTS.map(prod => (
              <div key={prod.id} className={`bg-card border-2 rounded-2xl p-4 shadow-sm flex items-center gap-4 cursor-pointer ${prod.featured ? "border-primary" : "border-border hover:border-primary/30"}`}>
                <span className="text-3xl">{prod.img}</span>
                <div className="flex-1"><p className="text-sm font-bold">{prod.name}</p><p className="text-xs text-muted-foreground">{fm(prod.price)}</p></div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${prod.featured ? "bg-primary border-primary" : "border-border"}`}>{prod.featured && <Check size={11} className="text-white" />}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
