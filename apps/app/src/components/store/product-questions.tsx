"use client";

import { MessageCircleQuestion } from "lucide-react";
import { StoreCollection } from "./store-collection";
import type { ProductQuestion } from "../../stores/product-extras";

/** Buyer questions with seller answers as a scrollable rail. */
export function ProductQuestions({ questions, count }: { questions: ProductQuestion[]; count: number }) {
  if (questions.length === 0) return null;
  return <StoreCollection
    title="پرسش و پاسخ"
    id="store-questions"
    railClassName="store-product-rail--cards"
    header={<header className="store-collection__header">
      <h3 id="store-questions">پرسش و پاسخ</h3>
      <span className="store-count">{count}</span>
    </header>}
  >
    {questions.map((item) => (
      <article key={item.id} className="store-question">
        <p className="store-question__q">{item.question}</p>
        <div className="store-question__a">
          <p className="store-question__who"><MessageCircleQuestion size={14} aria-hidden="true" />{item.answerBy} · {item.date}</p>
          <p>{item.answer}</p>
        </div>
      </article>
    ))}
  </StoreCollection>;
}
