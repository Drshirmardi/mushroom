"use client";

import { useEffect, useState } from "react";
import { StoreIcon } from "./store-icon";
import { Button } from "../ui/button";
import { StoreCollection } from "./store-collection";
import { formatPrice, toP } from "../../lib/format";
import { TEST_OFFERS, type TestOffer } from "../../stores/offers";

/** Milliseconds from `from` to the next local midnight (daily deal reset). */
export function msToMidnight(from: number): number {
  const end = new Date(from);
  end.setHours(24, 0, 0, 0);
  const diff = end.getTime() - from;
  return diff <= 0 ? diff + 86_400_000 : diff;
}

export function pad2(value: number): string {
  return toP(String(value).padStart(2, "0"));
}

function useNow(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

/** Minimal display-only offer card mirroring the reference widget (test data only). */
function OfferCard({ item }: { item: TestOffer }) {
  return <article className="store-offer" aria-label={item.title}>
    <div className="store-offer__media">
      <img src={item.image} alt="" width={300} height={300} loading="lazy" draggable={false} />
      <span className="store-discount">{toP(item.discount)}٪</span>
    </div>
    <p className="store-offer__title">{item.title}</p>
    <div className="store-offer__price">
      <span className="store-offer__row">
        <s>{formatPrice(item.oldPrice)} <span>تومان</span></s>
      </span>
      <span className="store-offer__row">
        <b>{formatPrice(item.price)}</b>
        <span className="store-offer__currency">تومان</span>
      </span>
    </div>
  </article>;
}

/** Daily-offers panel: live midnight countdown + test offer rail. */
export function IncredibleOffers({ onViewAll }: { onViewAll: () => void }) {
  const now = useNow();
  const remaining = Math.max(0, now === null ? 0 : msToMidnight(now));
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  return <section className="store-offers" aria-label="پیشنهاد شگفت‌انگیز">
    <StoreCollection
      title="پیشنهاد شگفت‌انگیز"
      id="store-offers"
      railClassName="store-product-rail--offers"
      header={<div className="store-offers__head">
        <div className="store-offers__title">
          <StoreIcon name="clock" size={20} />
          <h2 id="store-offers">پیشنهاد شگفت‌انگیز</h2>
        </div>
        <div className="store-offers__timer" aria-hidden="true">
          {[hours, minutes, seconds].map((unit, position) => (
            <span key={position} className="store-offers__tick-row">
              <span className="store-offers__tick">{pad2(unit)}</span>
              {position < 2 && <span className="store-offers__colon">:</span>}
            </span>
          ))}
        </div>
        <Button variant="ghost" className="store-offers__all" onClick={onViewAll} aria-label="مشاهده همه پیشنهادها">
          مشاهده همه<StoreIcon name="arrowLeft" size={16} />
        </Button>
      </div>}
    >
      {TEST_OFFERS.map((item) => <OfferCard key={item.id} item={item} />)}
    </StoreCollection>
  </section>;
}
