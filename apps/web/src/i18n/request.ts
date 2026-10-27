import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { isLocale } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
    const requested = await requestLocale;
    const saved = (await cookies()).get("NEXT_LOCALE")?.value;
    const locale = requested && isLocale(requested) ? requested : saved && isLocale(saved) ? saved : "fa";
    return { locale, messages: (await import(`../messages/${locale}.json`)).default };
});
