"use client";

import { StoreIcon } from "./store-icon";

/** Decorative storefront identity; the illustration is not a product or an offer. */
export function StoreIntro({ onExplore }: { onExplore: () => void }) {
  return <section className="store-intro" aria-labelledby="store-intro-title">
    <div className="store-intro__copy">
      <p className="store-intro__eyebrow">برای زندگی، برای شما</p>
      <h2 id="store-intro-title">مراقبت روزمره،<br />با انتخاب شما</h2>
      <p className="store-intro__description">محصولات سلامت را ببینید؛ جزئیات و قیمت را مقایسه کنید و انتخاب خودتان را داشته باشید.</p>
      <button type="button" className="store-intro__action" onClick={onExplore}>دیدن محصولات<StoreIcon name="arrowLeft" size={17} /></button>
    </div>
    <div className="store-intro__art" aria-hidden="true">
      <span className="store-intro__orbit" />
      <span className="store-intro__glass store-intro__glass--back" />
      <span className="store-intro__glass store-intro__glass--front"><StoreIcon name="shoppingBag" size={76} /></span>
      <span className="store-intro__leaf"><StoreIcon name="heart" size={27} /></span>
      <span className="store-intro__pearl" />
      <span className="store-intro__base" />
    </div>
  </section>;
}
