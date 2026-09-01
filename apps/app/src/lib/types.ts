// ── App-wide types ───────────────────────────────────────────────────────────

export type TabId =
  | "home"
  | "storemain"
  | "assessment"
  | "treatment"
  | "profile"
  | "appointments";

export type Product = {
  id: string;
  name: string;
  price: number;
  rating: number;
  reviews: number;
  img: string;
  doctor: boolean;
  cat: string;
  desc: string;
};

export type CartItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
  img: string;
  doctorRec?: boolean;
};

export type Task = { id: number; text: string; done: boolean };

export type Med = {
  id: string;
  name: string;
  dose: string;
  time: string;
  duration: string;
  taken: boolean;
  sideEffects: string;
  notes: string;
};

export type AppNotification = {
  id: string;
  title: string;
  desc: string;
  time: string;
  type: "prescription" | "medication" | "appointment" | "article" | "order";
  read: boolean;
};

export type ChartPoint = { day: string; value: number };

export type MoodPoint = {
  day: string;
  mood: number;
  sleep: number;
  energy: number;
};

export type MezajType = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  badge: string;
  desc: string;
};

export type SheetState = { type: string; data?: any } | null;
