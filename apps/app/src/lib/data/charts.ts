import type { ChartPoint, MoodPoint } from "@/lib/types";

export const painData: ChartPoint[] = [
  { day: "شن", value: 7 }, { day: "یک", value: 6 }, { day: "دو", value: 5 },
  { day: "سه", value: 6 }, { day: "چه", value: 4 }, { day: "پنج", value: 3 }, { day: "جم", value: 4 },
];

export const moodData: MoodPoint[] = [
  { day: "شن", mood: 5, sleep: 6, energy: 4 }, { day: "یک", mood: 6, sleep: 7, energy: 5 },
  { day: "دو", mood: 7, sleep: 6, energy: 6 }, { day: "سه", mood: 6, sleep: 8, energy: 7 },
  { day: "چه", mood: 8, sleep: 7, energy: 7 }, { day: "پنج", mood: 7, sleep: 8, energy: 8 },
  { day: "جم", mood: 8, sleep: 7, energy: 7 },
];
