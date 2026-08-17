"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { formatPrice, toP } from "@/lib/format";
import { useScreenNavigation } from "@/lib/navigation";

const ORDERS = [
  { id: "10023", date: "۵ مرداد", status: "تحویل شد", statusColor: "bg-green-50 text-green-700", total: 280000, items: 3 },
  { id: "10022", date: "۲۵ تیر", status: "تحویل شد", statusColor: "bg-green-50 text-green-700", total: 185000, items: 1 },
];

export default function OrderHistoryPage() {
  const router = useRouter();
  const navigateScreen = useScreenNavigation();
  return (
    <div>
      <PageHeader title="تاریخچه سفارشات" onBack={() => router.back()} />
      <div className="px-4 space-y-3 pb-4">
        {ORDERS.map(o => (
          <button key={o.id} onClick={() => navigateScreen("OrderTracking")} className="w-full bg-white rounded-2xl border border-border shadow-sm p-4 text-right">
            <div className="flex items-center justify-between mb-2"><span className="text-xs font-bold text-primary"># {toP(o.id)}</span><span className={`text-xs font-bold px-2.5 py-1 rounded-full ${o.statusColor}`}>{o.status}</span></div>
            <div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-foreground">{formatPrice(o.total)} تومان</p><p className="text-xs text-muted-foreground mt-0.5">{toP(o.items)} محصول · {o.date}</p></div><ChevronLeft size={16} className="text-muted-foreground" /></div>
          </button>
        ))}
      </div>
    </div>
  );
}
