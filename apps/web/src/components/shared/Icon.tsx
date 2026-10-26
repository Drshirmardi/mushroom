import {
    Activity,
    Apple,
    ArrowLeft,
    ArrowRight,
    BadgeCheck,
    BadgePercent,
    Brain,
    CalendarCheck,
    ChevronDown,
    ChevronLeft,
    CircleAlert,
    ClipboardCheck,
    ClipboardPlus,
    Droplets,
    Dumbbell,
    Eye,
    EyeOff,
    FileText,
    Flower2,
    Headset,
    HeartPulse,
    LayoutDashboard,
    LockKeyhole,
    Mail,
    MapPin,
    PersonStanding,
    Phone,
    Search,
    ShieldCheck,
    ShoppingCart,
    Sparkles,
    Stethoscope,
    WandSparkles,
    type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

const icons = {
    accessibility_new: PersonStanding,
    add_shopping_cart: ShoppingCart,
    arrow_back: ArrowLeft,
    arrow_forward: ArrowRight,
    assignment: ClipboardCheck,
    auto_awesome: Sparkles,
    bloodtype: Droplets,
    call: Phone,
    chevron_left: ChevronLeft,
    dashboard: LayoutDashboard,
    description: FileText,
    error: CircleAlert,
    event_available: CalendarCheck,
    expand_more: ChevronDown,
    face: WandSparkles,
    fitness_center: Dumbbell,
    healing: HeartPulse,
    health_and_safety: ShieldCheck,
    local_offer: BadgePercent,
    location_on: MapPin,
    lock: LockKeyhole,
    mail: Mail,
    medical_information: ClipboardPlus,
    monitor_heart: Activity,
    psychology: Brain,
    restaurant: Apple,
    search: Search,
    spa: Flower2,
    stethoscope: Stethoscope,
    support_agent: Headset,
    verified: BadgeCheck,
    visibility: Eye,
    visibility_off: EyeOff,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof icons;

export function Icon({ name, className }: { name: IconName; className?: string }) {
    const IconComponent = icons[name];

    return (
        <IconComponent
            aria-hidden="true"
            strokeWidth={1.9}
            className={cn("inline-block size-[1em] shrink-0 text-xl", className)}
        />
    );
}
