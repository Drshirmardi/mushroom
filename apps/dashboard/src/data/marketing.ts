export interface MarketingDaily {
  day: string;
  visitors: number;
  views: number;
  clicks: number;
  conv: number;
}

export const MKTG_DAILY: MarketingDaily[] = [
  { day: "شنبه", visitors: 420, views: 1240, clicks: 85, conv: 12 },
  { day: "یکشنبه", visitors: 380, views: 1050, clicks: 72, conv: 9 },
  { day: "دوشنبه", visitors: 510, views: 1480, clicks: 110, conv: 15 },
  { day: "سه‌شنبه", visitors: 490, views: 1390, clicks: 98, conv: 13 },
  { day: "چهارشنبه", visitors: 630, views: 1820, clicks: 142, conv: 21 },
  { day: "پنجشنبه", visitors: 720, views: 2050, clicks: 168, conv: 27 },
];
