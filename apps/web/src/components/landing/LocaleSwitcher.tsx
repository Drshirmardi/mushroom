
"use client";

import { useCallback, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown, Globe2 } from "lucide-react";

import { usePathname, useRouter } from "@/i18n/navigation";
import { isLocale, isRtlLocale, type Locale } from "@/i18n/routing";
import styles from "./LocaleSwitcher.module.css";

const LANGUAGES = [
    {
        value: "fa",
        name: "فارسی",
        short: "FA",
    },
    {
        value: "en",
        name: "English",
        short: "EN",
    },
    {
        value: "zh-CN",
        name: "简体中文",
        short: "ZH",
    },
    {
        value: "ar",
        name: "العربية",
        short: "AR",
    },
] as const satisfies ReadonlyArray<{
    value: Locale;
    name: string;
    short: string;
}>;

export function LocaleSwitcher() {
    const locale = useLocale();
    const t = useTranslations("Common");
    const router = useRouter();
    const pathname = usePathname();

    const [isPending, startTransition] = useTransition();
    const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
    const attachTrigger = useCallback((element: HTMLButtonElement | null) => {
        // Native modal dialogs make body portals inert and paint above them.
        setPortalContainer(element?.closest("dialog") ?? null);
    }, []);

    const current =
        LANGUAGES.find((language) => language.value === locale) ??
        LANGUAGES[0];

    const direction = isRtlLocale(locale) ? "rtl" : "ltr";

    function changeLanguage(nextLocale: string) {
        if (
            !isLocale(nextLocale) ||
            nextLocale === locale ||
            isPending
        ) {
            return;
        }

        // Preserve search parameters and URL fragment.
        const href =
            pathname +
            window.location.search +
            window.location.hash;

        startTransition(() => {
            router.replace(href, {
                locale: nextLocale,
                scroll: false,
            });
        });
    }

    return (
        <DropdownMenu.Root dir={direction} modal={false}>
            <DropdownMenu.Trigger asChild>
                <button
                    ref={attachTrigger}
                    type="button"
                    className={styles.trigger}
                    disabled={isPending}
                    aria-busy={isPending}
                    aria-label={`${t("language")}: ${current.name}`}
                >
                    <span className={styles.globe}>
                        <Globe2 size={17} strokeWidth={1.8} aria-hidden />
                    </span>

                    <span className={styles.currentName} lang={locale}>
                        {current.name}
                    </span>

                    <span className={styles.currentCode} aria-hidden>
                        {current.short}
                    </span>

                    <ChevronDown
                        size={14}
                        strokeWidth={2}
                        className={styles.chevron}
                        aria-hidden
                    />
                </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal container={portalContainer}>
                <DropdownMenu.Content
                    className={styles.content}
                    align="end"
                    side="bottom"
                    sideOffset={10}
                    collisionPadding={12}
                    aria-label={t("language")}
                >
                    <DropdownMenu.RadioGroup
                        value={locale}
                        onValueChange={changeLanguage}
                    >
                        {LANGUAGES.map((language) => (
                            <DropdownMenu.RadioItem
                                key={language.value}
                                value={language.value}
                                className={styles.item}
                                disabled={isPending}
                            >
                                <span
                                    className={styles.languageName}
                                    lang={language.value}
                                    dir="auto"
                                >
                                    {language.name}
                                </span>

                                <span className={styles.indicatorSlot}>
                                    <DropdownMenu.ItemIndicator
                                        className={styles.indicator}
                                    >
                                        <Check
                                            size={15}
                                            strokeWidth={2.5}
                                            aria-hidden
                                        />
                                    </DropdownMenu.ItemIndicator>
                                </span>
                            </DropdownMenu.RadioItem>
                        ))}
                    </DropdownMenu.RadioGroup>
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    );
}
