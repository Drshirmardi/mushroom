"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  BookOpen,
  Calendar,
  Clock,
  Leaf,
  MessageCircle,
  ShoppingBag,
} from "lucide-react";
import ExpertiseSlider from "@/components/home/ExpertiseSlider";
import HomeSlider from "@/components/home/home-slider";
import Illnesses from "@/components/home/Bimarilist";
import { HealthSnapshotCard } from "@/components/home/health-snapshot-card";
import {
  SkeletonBox,
  SkeletonCard,
  SkeletonProductCard,
} from "@/components/shared/skeletons";
import { ARTICLES } from "@/lib/data/articles";
import { DEFAULT_MEZAJ } from "@/lib/data/mezaj";
import { NOTIFICATIONS } from "@/lib/data/catalog";
import { formatPrice, toP } from "@/lib/format";
import { TAB_ROOT_SCREENS, useScreenNavigation } from "@/lib/navigation";
import { PRODUCTS } from "@/lib/data/catalog";

export default function HomePage() {
  const navigateScreen = useScreenNavigation();
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 1000); return () => clearTimeout(t); }, []);

  return (
    <div className="px-4 space-y-5">
      <HomeSlider />

      {loading ? (
        <div className="space-y-3">
          <SkeletonCard />
          <div className="grid grid-cols-3 gap-2">{[1, 2, 3].map(i => <SkeletonBox key={i} className="h-20" />)}</div>
          <SkeletonCard />
          <div className="grid grid-cols-2 gap-3">{[1, 2].map(i => <SkeletonProductCard key={i} />)}</div>
        </div>
      ) : (
        <>
          <HealthSnapshotCard mezaj={DEFAULT_MEZAJ} />

          {/* Treatment progress banner */}
          <button onClick={() => navigateScreen(TAB_ROOT_SCREENS.treatment)} className="w-full bg-primary rounded-3xl p-5 text-white relative overflow-hidden text-right">
            <div className="absolute top-0 left-0 w-32 h-32 bg-white/5 rounded-full -translate-x-12 -translate-y-12" />
            <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/5 rounded-full translate-x-8 translate-y-8" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div><p className="text-white/70 text-xs mb-0.5">وضعیت درمان</p><h2 className="text-lg font-bold">جلسه {toP(3)} از {toP(10)}</h2></div>
                <div className="bg-white/20 rounded-2xl px-3 py-1.5"><span className="text-sm font-bold">{toP(35)}٪</span></div>
              </div>
              <div className="bg-white/20 rounded-full h-2.5 mb-2">
                <motion.div className="bg-white rounded-full h-2.5" initial={{ width: 0 }} animate={{ width: "35%" }} transition={{ duration: 1, delay: 0.3 }} />
              </div>
              <p className="text-white/70 text-xs">دکتر شیرمردی · مرحله آکوپانکچر درمانی</p>
            </div>
          </button>

          <ExpertiseSlider />

          <Illnesses />

          {/* Health tips */}
          <div>
            <h2 className="text-base font-bold text-foreground mb-3">نکته سلامت امروز</h2>
            <div className="bg-gradient-to-br from-[#e8f4ed] to-[#f0faf4] rounded-2xl border border-primary/10 p-4 flex gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0"><Leaf size={20} className="text-primary" /></div>
              <div>
                <p className="text-sm font-bold text-foreground mb-1">نوشیدن آب ولرم در صبح</p>
                <p className="text-xs text-foreground/70 leading-6">مصرف یک لیوان آب ولرم با چند قطره لیموی تازه در صبح، سیستم گوارش را فعال کرده و متابولیسم را تحریک می‌کند.</p>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div>
            <h2 className="text-base font-bold text-foreground mb-3">دسترسی سریع</h2>
            <div className="grid grid-cols-4 gap-2">
              {[
                { icon: Calendar, label: "رزرو نوبت", color: "bg-blue-50 text-blue-600", action: () => navigateScreen("BookStep1") },
                { icon: BookOpen, label: "محتوای آموزشی", color: "bg-purple-50 text-purple-600", action: () => navigateScreen("ArticlesList") },
                { icon: ShoppingBag, label: "فروشگاه", color: "bg-amber-50 text-amber-600", action: () => navigateScreen("StoreMain") },
                { icon: MessageCircle, label: "تماس با دکتر", color: "bg-green-50 text-green-600", action: () => navigateScreen("ChatScreen") },
              ].map(a => (
                <button key={a.label} onClick={a.action} className="flex flex-col items-center gap-1.5">
                  <div className={`w-14 h-14 ${a.color} rounded-2xl flex items-center justify-center active:scale-95 transition-transform`}><a.icon size={22} /></div>
                  <span className="text-[10px] font-semibold text-foreground/70 text-center leading-tight">{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mood-based product suggestions */}
          <div className="mt-4 overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 to-red-500 shadow-md" dir="rtl">
            <div className="flex h-[290px]">
              <div className="flex w-[150px] shrink-0 flex-col items-center justify-between px-4 py-6">
                <div className="flex flex-col items-center gap-5">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full text-3xl" />
                  <h2 className="text-center text-sm font-black leading-6 text-white">
                    محصولات
                    <br />
                    پیشنهادی مزاج شما
                  </h2>
                </div>
                <button
                  onClick={() => navigateScreen("StoreMain")}
                  className="w-full rounded-xl bg-white py-2.5 text-xs font-bold text-red-500 transition hover:bg-gray-100 active:scale-95"
                >
                  مشاهده همه
                </button>
              </div>

              <div className="flex-1 overflow-hidden py-4">
                <div className="flex h-full gap-3 overflow-x-auto pr-3 scrollbar-hide">
                  {PRODUCTS
                    .filter((p) => p.doctor)
                    .map((p) => (
                      <button
                        key={p.id}
                        onClick={() => navigateScreen("ProductDetail", { productId: p.id })}
                        className="group flex h-full w-[164px] shrink-0 flex-col overflow-hidden rounded-xl bg-white text-right shadow-sm transition hover:shadow-lg"
                      >
                        <div className="relative flex h-[150px] items-center justify-center bg-gray-50 p-3">
                          <img
                            src={
                              p.img.includes("http")
                                ? p.img
                                : `https://dkstatics-public.digikala.com/digikala-products/4c4f54bac1a1ce34861061a7cf1ba65a97dedb0d_1675624081.jpg?x-oss-process=image/resize,m_lfit,h_600,w_600/quality,q_80/format,webp`
                            }
                            alt={p.name}
                            className="h-full w-full object-contain mix-blend-multiply transition duration-300 group-hover:scale-105"
                          />
                          <span className="absolute right-2 top-2 rounded-full bg-red-100 px-2 py-1 text-[10px] font-bold text-red-700">
                            توصیه دکتر
                          </span>
                        </div>

                        <div className="flex flex-1 flex-col justify-between p-3">
                          <div>
                            <p className="line-clamp-2 text-[13px] font-medium leading-5 text-gray-800">{p.name}</p>
                            <p className="mt-1 line-clamp-1 text-[11px] text-gray-400">{p.cat}</p>
                          </div>
                          <div className="border-t border-gray-100 pt-2">
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-base font-black text-gray-900">{formatPrice(p.price)}</span>
                              <span className="text-[10px] text-gray-500">تومان</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}

                  <button
                    onClick={() => navigateScreen("StoreMain")}
                    className="mr-2 flex w-36 shrink-0 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-white/60 bg-white/20 text-white transition hover:bg-white/30"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-red-500 text-xl">←</div>
                    <span className="text-sm font-bold">مشاهده همه</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Latest notifications */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-foreground">اعلان‌های اخیر</h2>
              <button onClick={() => navigateScreen("NotificationCenter")} className="text-primary text-xs font-semibold">همه</button>
            </div>
            <div className="space-y-2">
              {NOTIFICATIONS.filter(n => !n.read).map(n => (
                <div key={n.id} className="bg-primary/5 border border-primary/15 rounded-2xl p-3 flex items-center gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{n.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{n.desc}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">{n.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Articles */}
          <div className="pb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-foreground">مقالات آموزشی</h2>
              <button onClick={() => navigateScreen("ArticlesList")} className="text-primary text-xs font-semibold">همه مقالات</button>
            </div>
            <div className="space-y-3">
              {ARTICLES.slice(0, 2).map(a => (
                <button key={a.title} onClick={() => navigateScreen("ArticleDetail", { title: a.title })} className="w-full bg-white rounded-2xl p-3.5 border border-border shadow-sm flex items-center gap-3 text-right">
                  <div className="w-14 h-14 bg-accent rounded-xl flex-shrink-0 flex items-center justify-center"><BookOpen size={20} className="text-primary" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-tight mb-1 truncate">{a.title}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-secondary text-primary px-2 py-0.5 rounded-full font-semibold">{a.cat}</span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock size={10} /> {a.time} مطالعه</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
