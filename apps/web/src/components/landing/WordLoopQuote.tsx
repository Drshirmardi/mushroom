"use client";

import { useEffect, useMemo, useState } from "react";

export function WordLoopQuote({ quotes, locale }: { quotes: readonly string[]; locale: string }) {
    const phrases = useMemo(() => {
        const segmenter = new Intl.Segmenter(locale, { granularity: "word" });
        return quotes.filter(text => text.trim()).map(text => {
            const words: string[] = [];
            let prefix = "";
            for (const part of segmenter.segment(text)) {
                if (part.isWordLike) { words.push(prefix + part.segment); prefix = ""; }
                else if (words.length) words[words.length - 1] += part.segment;
                else prefix += part.segment;
            }
            return { text, words: words.length ? words : [text] };
        });
    }, [quotes, locale]);
    const [frame, setFrame] = useState({ phrase: 0, visible: 0 });

    useEffect(() => {
        if (!phrases.length) return;
        const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
        let timer: ReturnType<typeof setTimeout>;
        let phrase = 0;
        let visible = 0;
        let erasing = false;
        function tick() {
            visible += erasing ? -1 : 1;
            setFrame({ phrase, visible });
            let delay = erasing ? 130 : 300;
            if (!erasing && visible === phrases[phrase].words.length) { erasing = true; delay = 3200; }
            else if (erasing && visible === 0) {
                phrase = (phrase + 1) % phrases.length;
                erasing = false;
                delay = 500;
            }
            timer = setTimeout(tick, delay);
        }
        function restart() {
            clearTimeout(timer);
            phrase = 0; visible = 0; erasing = false;
            setFrame({ phrase: 0, visible: motion.matches ? phrases[0].words.length : 0 });
            if (!motion.matches) timer = setTimeout(tick, 300);
        }
        restart();
        motion.addEventListener("change", restart);
        return () => { clearTimeout(timer); motion.removeEventListener("change", restart); };
    }, [phrases]);

    if (!phrases.length) return null;
    const current = phrases[frame.phrase] ?? phrases[0];
    return <p className="word-loop-quote">
        <span className="word-loop-accessible">{phrases.map(phrase => phrase.text).join(" ")}</span>
        <span className="word-loop-stage" aria-hidden="true">
            {phrases.map((phrase, index) => <span className="word-loop-size" key={index}>{phrase.text}</span>)}
            <span className="word-loop-line" key={frame.phrase}>
                {current.words.map((word, index) => <span className="word-loop-word" data-visible={index < frame.visible} key={index}>{word}</span>)}
            </span>
        </span>
    </p>;
}
