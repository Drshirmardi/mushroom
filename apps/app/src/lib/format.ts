/** Convert Latin digits (0-9) to Persian digits (۰-۹). */
export const toP = (n: number | string) =>
  String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);

/** Format a number as a localized Persian price string. */
export const formatPrice = (n: number | bigint) => toP(n.toLocaleString("fa-IR"));
