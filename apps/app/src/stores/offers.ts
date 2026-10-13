/**
 * TEST DATA — Digikala's own incredible-offer products (images, titles, prices)
 * for UI testing only. These numbers are THEIR sample data used to shape the
 * layout; they must be replaced by real catalog products with server-provided
 * `compareAtPriceToman` before production. Never treat as real prices.
 */
export type TestOffer = {
  id: string;
  title: string;
  image: string;
  price: number;
  oldPrice: number;
  discount: number;
};

const img = (hash: string) =>
  `https://dkstatics-public.digikala.com/digikala-products/${hash}.jpg?x-oss-process=image/resize,m_lfit,h_300,w_300/quality,q_80`;

export const TEST_OFFERS: TestOffer[] = [
  { id: "t1", title: "صندل زنانه نیکتا مدل آپولیا کد BK.2964", image: img("7c0612d47df7558212f39ad05fc6aff58d19e36f_1779191400"), price: 620000, oldPrice: 1098000, discount: 44 },
  { id: "t2", title: "صندل زنانه کیتو مدل النا ضربدری", image: img("11723c854034fc4f707e396e04a4b278e09b6982_1790078911"), price: 2160000, oldPrice: 4000000, discount: 46 },
  { id: "t3", title: "صندل زنانه مدل alexander", image: img("7492eec7e2617efd6253dca1319e44eabc6f071a_1779191644"), price: 1057400, oldPrice: 2190000, discount: 52 },
  { id: "t4", title: "هدفون بلوتوثی نوکسو مدل HN-3", image: img("9b6cf48b48a2668a63b1af0b258f6bddc36274cf_1776250314"), price: 8096000, oldPrice: 14720000, discount: 45 },
  { id: "t5", title: "قرص ویتامین ب 12 یوروویتال بسته 60 عددی", image: img("d78814ec9f011d38cd86f612fc68fa1a9bd8ce07_1779541612"), price: 290000, oldPrice: 683100, discount: 58 },
  { id: "t6", title: "قرص جوشان ویتامین ث 1000 نکستایل بسته 20 عددی", image: img("9ff5d8bc7db78728c1b934d6168dbacf031ba0c5_1686036354"), price: 255000, oldPrice: 264000, discount: 3 },
  { id: "t7", title: "قرص جوشان کلسیم 500 میلی گرم نیچرز پلنتی بسته 20 عددی", image: img("ba0f750dc1c1a6cf76046fe8702b725126312f82_1782217197"), price: 198000, oldPrice: 264000, discount: 25 },
  { id: "t8", title: "کپسول زینک پلاس یوروویتال بسته 60 عددی", image: img("437d4abbd236b3f52e4e65d58ce9f63c28c651af_1623064234"), price: 338000, oldPrice: 1034000, discount: 67 },
];
