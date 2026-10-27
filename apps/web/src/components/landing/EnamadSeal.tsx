"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

const code = "1S4CAYPwv3TxOdNZrWHL0UxywYOkTiSO";
const query = `id=750189&Code=${code}`;

export function EnamadSeal() {
    const t = useTranslations("Common");
    const [loaded, setLoaded] = useState(false);
    const [failed, setFailed] = useState(false);

    return <a className="footer-enamad" href={`https://trustseal.enamad.ir/?${query}`}
        target="_blank" rel="noopener" referrerPolicy="origin" aria-label={t("enamadTitle")} data-loaded={loaded}>
        <span className="footer-enamad-art" aria-hidden="true">
            <img className="footer-enamad-fallback" src="/brand/enamad-fallback.png" width="112" height="112" alt="" loading="lazy" decoding="async" />
            {!failed && <img className="footer-enamad-live" src={`https://trustseal.enamad.ir/logo.aspx?${query}`}
                width="112" height="112" alt="" referrerPolicy="origin" loading="lazy" decoding="async" {...{ code }}
                onLoad={event => {
                    if (event.currentTarget.naturalWidth >= 32 && event.currentTarget.naturalHeight >= 32) setLoaded(true);
                    else setFailed(true);
                }}
                onError={() => setFailed(true)} />}
        </span>
    </a>;
}
