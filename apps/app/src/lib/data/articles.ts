export type Article = {
  title: string;
  time: string;
  cat: string;
  img: string;
};

export const ARTICLES: Article[] = [
  { title: "فواید آکوپانکچر برای کاهش استرس", time: "۵ دقیقه", cat: "درمان", img: "photo-1512290923902-8a9f81dc236c" },
  { title: "رژیم غذایی مناسب در دوران درمان", time: "۸ دقیقه", cat: "تغذیه", img: "photo-1490645935967-10de6ba17061" },
  { title: "مزاج‌شناسی در طب سنتی ایران", time: "۶ دقیقه", cat: "طب سنتی", img: "photo-1544367567-0f2fcb009e0b" },
  { title: "تأثیر خواب کافی بر بهبود بیماری‌ها", time: "۴ دقیقه", cat: "سبک زندگی", img: "photo-1520206183501-b80df61043c2" },
  { title: "نقش ذهن‌آگاهی در کاهش درد مزمن", time: "۷ دقیقه", cat: "سبک زندگی", img: "photo-1506126613408-eca07ce68773" },
];

export const ARTICLE_CATEGORIES = ["همه", "درمان", "تغذیه", "سبک زندگی", "طب سنتی"];
