import { p } from "@/lib/utils";

export type HealthMetric = "pain" | "sleep" | "stress" | "mood" | "weight";

export interface HealthMetricConfig {
  label: string;
  color: string;
  unit: string;
}

export const HEALTH_METRIC_CONFIGS: Record<HealthMetric, HealthMetricConfig> = {
  pain: { label: "سطح درد", color: "#EF4444", unit: "/۱۰" },
  sleep: { label: "خواب", color: "#6366F1", unit: "/۱۰" },
  stress: { label: "استرس", color: "#F97316", unit: "/۱۰" },
  mood: { label: "حال و هوا", color: "#10B981", unit: "/۱۰" },
  weight: { label: "وزن", color: "#1B5E42", unit: " کگ" },
};

export interface HealthPoint {
  day: string;
  value: number;
}

export const HEALTH_DATA: Record<HealthMetric, HealthPoint[]> = {
  pain: [8, 7, 7, 6, 5, 5, 4, 4, 3, 4, 3, 3, 2, 3].map((v, i) => ({ day: p(i + 1), value: v })),
  sleep: [6, 7, 5, 8, 7, 8, 9, 7, 8, 8, 9, 8, 9, 9].map((v, i) => ({ day: p(i + 1), value: v })),
  stress: [8, 7, 7, 6, 6, 5, 6, 5, 4, 5, 4, 3, 4, 3].map((v, i) => ({ day: p(i + 1), value: v })),
  mood: [5, 6, 6, 7, 7, 7, 8, 7, 8, 9, 8, 9, 9, 9].map((v, i) => ({ day: p(i + 1), value: v })),
  weight: [78, 78, 77.5, 77.5, 77, 77, 76.5, 76.5, 76, 76, 75.5, 75.5, 75, 75].map((v, i) => ({ day: p(i + 1), value: v })),
};
