const STATUS_STYLES: Record<string, string> = {
  "پایان یافته": "bg-gray-100 text-gray-500",
  "در حال انجام": "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300",
  "تایید شده": "bg-blue-50 text-blue-700",
  "در انتظار تایید": "bg-amber-50 text-amber-700",
  "لغو شده": "bg-red-50 text-red-600",
  "موجود": "bg-emerald-100 text-emerald-700",
  "رو به اتمام": "bg-amber-50 text-amber-700",
  "ناموجود": "bg-red-50 text-red-600",
  "فعال": "bg-emerald-100 text-emerald-700",
  "غیرفعال": "bg-gray-100 text-gray-500",
  "ارسال شده": "bg-blue-50 text-blue-700",
  "در حال آماده‌سازی": "bg-amber-50 text-amber-700",
  "در انتظار پرداخت": "bg-orange-50 text-orange-700",
  "تحویل داده شده": "bg-emerald-100 text-emerald-700",
  "منتشرشده": "bg-emerald-100 text-emerald-700",
  "پیش‌نویس": "bg-gray-100 text-gray-500",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status] ?? "bg-gray-100 text-gray-500"}`}>
      {status}
    </span>
  );
}
