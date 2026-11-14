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
  book: 0xf180,
  call: 0xf19b,
  check: 0xf1d6,
  checkCircle: 0xf1d5,
  checklist: 0xf1de,
  deliveryBox: 0xf21c,
  digitalDevice: 0xf224,
  checklistBold: 0xf1db,
  clock: 0xf1ea,
  close: 0xf1ef,
  documentFile: 0xf237,
  documentFileBold: 0xf229,
  delete: 0xf218,
  discount: 0xf228,
  errorCircle: 0xf264,
  errorTriangle: 0xf268,
  eyeBold: 0xf26a,
  eye: 0xf26d,
  externalLink: 0xf269,
  heart: 0xf2b7,
  heartBold: 0xf2b5,
  history: 0xf2cc,
  image: 0xf2dc,
  infoCircle: 0xf2e4,
  location: 0xf314,
  minus: 0xf32e,
  minusCircle: 0xf32d,
  medicalBag: 0xf329,
  medicalBagBold: 0xf326,
  logout: 0xf320,
  more: 0xf34a,
  notification: 0xf366,
  pen: 0xf372,
  phoneAndTablet: 0xf37a,
  pillBox: 0xf382,
  pillBoxBold: 0xf37f,
  person: 0xf376,
  personBold: 0xf373,
  plus: 0xf392,
  receipt: 0xf3ac,
  receiptBillSearchBold: 0xf3ad,
  receiptBillSearch: 0xf3b0,
  refresh: 0xf3b8,
  search: 0xf3f3,
  shieldLock: 0xf3ff,
  share: 0xf3fb,
  shoppingBag: 0xf407,
  shoppingBagBold: 0xf400,
  shoppingBasket: 0xf40b,
  shoppingBasketBold: 0xf408,
  star: 0xf42e,
  starBold: 0xf42c,
  store: 0xf432,
  undo: 0xf47a,
  transactionBold: 0xf46b,
  transaction: 0xf46e,
  tv: 0xf476,
  walletInBold: 0xf49e,
  walletIn: 0xf4a1,
  walletBold: 0xf497,
  wallet: 0xf4a2,
  walletOut: 0xf4a6,
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
  const glyph = glyphs[name] ?? glyphs.documentFile;

  return (
    <span
      aria-hidden="true"
      className={`store-icon${className ? ` ${className}` : ''}`}
      style={{ fontSize: displaySize }}
    >
      {String.fromCodePoint(glyph)}
    </span>
  );
}
