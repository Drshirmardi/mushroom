import { Phone, Video } from "lucide-react";

export function TypeBadge({ type }: { type: string }) {
  return type === "آنلاین"
    ? <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700"><Video size={10} />آنلاین</span>
    : <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700"><Phone size={10} />حضوری</span>;
}
