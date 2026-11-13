const glyphs = {
  arrowDown: 0xf11c,
  arrowLeft: 0xf12f,
  arrowRight: 0xf132,
  arrow2Left: 0xf120,
  arrow2Down: 0xf11c,
  arrow2Right: 0xf124,
  arrow2Up: 0xf128,
  bankCard: 0xf156,
  barcode: 0xf170,
  check: 0xf1d6,
  checkCircle: 0xf1d5,
  checklist: 0xf1de,
  clock: 0xf1ea,
  close: 0xf1ef,
  deliveryBox: 0xf21c,
  documentFile: 0xf237,
  delete: 0xf218,
  discount: 0xf228,
  errorCircle: 0xf264,
  errorTriangle: 0xf268,
  externalLink: 0xf269,
  heart: 0xf2b7,
  heartBold: 0xf2b5,
  image: 0xf2dc,
  location: 0xf314,
  minus: 0xf32e,
  medicalBag: 0xf329,
  more: 0xf34a,
  pillBox: 0xf382,
  plus: 0xf392,
  receipt: 0xf3ac,
  refresh: 0xf3b8,
  search: 0xf3f3,
  share: 0xf3fb,
  shoppingBag: 0xf407,
  shoppingBagBold: 0xf400,
  shoppingBasket: 0xf40b,
  shoppingBasketBold: 0xf408,
  star: 0xf42e,
  store: 0xf432,
  undo: 0xf47a,
  wallet: 0xf4a2,
} as const;

export type StoreIconName = keyof typeof glyphs;

export function StoreIcon({
  name,
  size = 20,
  className,
}: {
  name: StoreIconName;
  size?: number;
  className?: string;
}) {
  const displaySize = size <= 18 ? size * 1.25 : size <= 32 ? size * 1.15 : size <= 56 ? size * 1.1 : size;

  return (
    <span
      aria-hidden="true"
      className={`store-icon${className ? ` ${className}` : ''}`}
      style={{ fontSize: displaySize }}
    >
      {String.fromCodePoint(glyphs[name])}
    </span>
  );
}
