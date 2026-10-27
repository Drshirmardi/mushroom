# Landing sign-in typography

## Multilingual landing (2026-10-27)

- Persian: the existing, unchanged IRANYekanX Regular 400 / Medium 500 assets, matching patient Home/storefront.
- English: `Geist-Variable.woff2`, self-hosted from Google Fonts' `ofl/geist/Geist[wght].ttf`; license `Geist-OFL.txt`.
- Simplified Chinese: `NotoSansSC-Variable.woff2`, an OFL subset of Google Fonts' `ofl/notosanssc/NotoSansSC[wght].ttf`; license `NotoSansSC-OFL.txt`.
- Regenerate both OFL fonts with `python apps/web/scripts/prepare-landing-fonts.py` (fonttools + brotli). Chinese glyphs are collected from `src/messages/zh-CN.json` plus ASCII; rerun after changing Chinese copy. System CJK fallbacks remain available for other characters.
- Only the current locale's face is preloaded/used. There is no runtime font CDN or translation-service request.

The landing login dialog uses the same IRANYekanX Regular (400) and Medium (500) font files as pps/app/public/fonts. The files are copied unchanged so Persian and Latin digits use the same local family as the app.
