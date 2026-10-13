"use client";

import { useState } from "react";
import { Check, Sparkles, Star, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { StoreCollection } from "./store-collection";
import { toP } from "../../lib/format";
import type { ProductExtras, ProductReview } from "../../stores/product-extras";

function Stars({ value }: { value: number }) {
  return <span className="store-stars" role="img" aria-label={`امتیاز ${toP(value)} از ۵`}>
    {Array.from({ length: 5 }, (_, position) => (
      <Star key={position} size={14} aria-hidden="true" fill="currentColor" className={position < Math.round(value) ? "store-star--on" : "store-star--off"} />
    ))}
  </span>;
}

function Summary({ extra }: { extra: ProductExtras }) {
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  return <section className="store-summary-card" aria-label="خلاصه دیدگاه‌ها (نمایشی)">
    <p className="store-summary-card__badge"><Sparkles size={14} aria-hidden="true" />خلاصه دیدگاه‌ها</p>
    <p className="store-summary-card__text">{extra.summary.text}</p>
    <div className="store-summary-card__chips">
      {extra.summary.pros.map((pro) => (
        <span key={pro} className="store-point store-point--pro"><Check size={13} aria-hidden="true" />{pro}</span>
      ))}
      {extra.summary.cons.map((con) => (
        <span key={con} className="store-point store-point--con"><X size={13} aria-hidden="true" />{con}</span>
      ))}
    </div>
    <p className="store-summary-card__note">این خلاصه نمایشی است</p>
    <div className="store-summary-card__vote">
      <span>آیا این خلاصه برایتان مفید بود؟</span>
      <button type="button" aria-label="مفید بود" aria-pressed={vote === "up"} onClick={() => setVote((current) => (current === "up" ? null : "up"))} className={vote === "up" ? "store-vote--on" : undefined}><ThumbsUp size={16} aria-hidden="true" /></button>
      <button type="button" aria-label="مفید نبود" aria-pressed={vote === "down"} onClick={() => setVote((current) => (current === "down" ? null : "down"))} className={vote === "down" ? "store-vote--on" : undefined}><ThumbsDown size={16} aria-hidden="true" /></button>
    </div>
  </section>;
}

/** Buyer reviews: summary card, anchor chips and a scrollable review rail. */
export function ProductReviews({ extra }: { extra: ProductExtras }) {
  const { reviews } = extra;
  if (reviews.length === 0) return null;
  return <>
    <Summary extra={extra} />
    <div className="store-count-chips">
      <a href="#store-reviews">{toP(extra.reviewsCount)} دیدگاه</a>
      <a href="#store-questions">{toP(extra.questionsCount)} پرسش و پاسخ</a>
    </div>
    <StoreCollection
      title="دیدگاه کاربرها"
      id="store-reviews"
      railClassName="store-product-rail--cards"
      header={<header className="store-collection__header">
        <h3 id="store-reviews">دیدگاه کاربرها</h3>
        <p className="store-reviews__score"><Star size={16} aria-hidden="true" fill="currentColor" className="store-star--on" />{toP(extra.rating.average)}<span>({toP(extra.rating.count)} دیدگاه)</span></p>
      </header>}
    >
      {reviews.map((review: ProductReview) => (
        <article key={review.id} className="store-review">
          <div className="store-review__head">
            <span className="store-review__name">{review.name}</span>
            <span className="store-review__buyer">خریدار</span>
            <span className="store-review__date">{review.date}</span>
          </div>
          <Stars value={review.rating} />
          <p className="store-review__text">{review.text}</p>
        </article>
      ))}
    </StoreCollection>
  </>;
}
