/**
 * TEST DATA — fake per-product extras (rating, seller) for PDP UI testing only.
 * Do not treat these as catalog content. They mirror the exact fields the
 * backend must add to ProductDto (see the P0 list in the store UI notes);
 * until then every product renders these placeholders so the layout exists.
 * (Product images left this module in Phase 04C; gallery is API-driven now.)
 */

export type ProductSpec = { key: string; value: string };
export type ProductReview = { id: string; name: string; rating: number; date: string; text: string; likes: number };
export type ProductQuestion = { id: string; name: string; date: string; question: string; answer: string; answerBy: string };
export type ProductExtras = {
  brand: string;
  rating: { average: number; count: number };
  reviewsCount: number;
  questionsCount: number;
  seller: { name: string; verified: boolean; satisfaction: number; performance: string };
  guarantees: string[];
  summary: { text: string; pros: string[]; cons: string[] };
  specs: ProductSpec[];
  reviews: ProductReview[];
  questions: ProductQuestion[];
};

const DEFAULT_EXTRAS: ProductExtras = {
  brand: "برند نمونه",
  rating: { average: 4.5, count: 1260 },
  reviewsCount: 593,
  questionsCount: 74,
  seller: { name: "داروخانه مرکزی", verified: true, satisfaction: 92, performance: "عالی" },
  guarantees: ["تاریخ انقضا بیشتر از شش ماه", "مرجوعی در صورت مغایرت کالا"],
  summary: {
    text: "بیشتر خریداران از بسته‌بندی و سرعت ارسال رضایت داشتند و قیمت را نسبت به داروخانه‌های سطح شهر مناسب ارزیابی کردند.",
    pros: ["بسته‌بندی مناسب", "ارسال سریع"],
    cons: ["تنوع کمتر نسبت به برندهای مشابه"],
  },
  specs: [
    { key: "ماده اصلی", value: "ویتامین C" },
    { key: "تعداد", value: "۶۰ عدد" },
    { key: "شکل دارویی", value: "قرص" },
    { key: "کشور تولیدکننده", value: "ایران" },
    { key: "مناسب برای", value: "بزرگسالان" },
  ],
  reviews: [
    { id: "r1", name: "سارا م.", rating: 5, date: "۱۲ مهر ۱۴۰۴", text: "بسته‌بندی تمیز و ارسال سریع بود. از خرید راضی‌ام.", likes: 7 },
    { id: "r2", name: "امیر ر.", rating: 4, date: "۳ مهر ۱۴۰۴", text: "قیمت مناسب‌تری نسبت به داروخانه سطح شهر داشت.", likes: 2 },
    { id: "r3", name: "نگار ک.", rating: 5, date: "۲۸ شهریور ۱۴۰۴", text: "تاریخ انقضای بالا و پلمپ سالم. پیشنهاد می‌کنم.", likes: 5 },
  ],
  questions: [
    { id: "q1", name: "رضا ح.", date: "۵ مهر ۱۴۰۴", question: "تاریخ انقضای محصول چقدر است؟", answer: "سلام، محصولات با حداقل شش ماه تاریخ انقضا ارسال می‌شوند.", answerBy: "فروشنده" },
    { id: "q2", name: "مریم ت.", date: "۱ مهر ۱۴۰۴", question: "ارسال به شهرستان هم دارید؟", answer: "بله، به سراسر کشور ارسال می‌شود.", answerBy: "فروشنده" },
  ],
};

const OVERRIDES: Record<string, Partial<ProductExtras>> = {};

export function productExtras(productId: string): ProductExtras {
  return { ...DEFAULT_EXTRAS, ...(OVERRIDES[productId] ?? {}) };
}

/** Test-only override point (e.g. Storybook-style previews). */
export function setProductExtrasOverride(productId: string, extras: Partial<ProductExtras>): void {
  OVERRIDES[productId] = extras;
}
