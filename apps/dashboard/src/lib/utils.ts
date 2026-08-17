/** تبدیل ارقام لاتین به ارقام فارسی */
export const p = (n: number | string) =>
  n.toString().replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);

/** قالب‌بندی مبلغ به تومان با ارقام فارسی */
export const fm = (n: number) => p(n.toLocaleString("en-US")) + " تومان";
