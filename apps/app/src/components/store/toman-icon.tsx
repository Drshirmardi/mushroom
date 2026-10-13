/**
 * Toman currency mark drawn in the brand typeface as a vector wordmark
 * (mirrors the compact mark used by reference storefronts instead of a
 * spelled-out muted word). Decorative: callers must provide the accessible
 * "تومان" name next to it.
 */
export function TomanIcon() {
  return (
    <svg className="store-toman" viewBox="0 0 40 24" fill="none" aria-hidden="true" focusable="false">
      <text
        x="20"
        y="17.5"
        textAnchor="middle"
        fontFamily="Digikala, Vazirmatn, sans-serif"
        fontSize="14.5"
        fontWeight={700}
        fill="currentColor"
      >
        تومان
      </text>
    </svg>
  );
}
