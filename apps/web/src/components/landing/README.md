# Landing presentation

- Identity comes from the current patient Home (`apps/app/src/app/globals.css`, `.home-page`) and storefront, not the legacy green root variables. Web tokens are scoped to this app; apps/app is unchanged.
- `Landing.tsx` owns the interactive path/service presentation. Original doctor copy is organized in `src/messages/{fa,en,zh-CN,ar}.json`; keep all dictionaries structurally aligned.
- `WebExperience` remains above locale routes. Header and its lazy native OTP dialog stay mounted while Next navigation changes locale. The attempt is held only in page memory, never browser storage; a full document reload starts a new attempt.
- `LocaleSwitcher` preserves current query/hash and saves `NEXT_LOCALE`. `next-intl` renders Persian at `/`, English at `/en`, Simplified Chinese at `/zh-CN`, Arabic at `/ar`, and handles language discovery. Persian and Arabic use RTL and self-hosted IRANYekanX (400/500); the HTML direction, navigation arrows and keyboard tab order follow the locale.
- Auth transport responses retain their legacy Persian `message` and add optional error `code` for translated OTP feedback. API payloads, challenge authority, deadlines, cookies and role/allowlisted destinations stay unchanged.
- Runtime patient-app URLs retain any configured base path. Non-Persian visitors are told that the destination patient application is currently Persian. Authentication still accepts Iranian mobile numbers only.
- Fonts are self-hosted. Regenerate the Chinese font subset after changing Chinese messages; see `public/fonts/README.md`.
- `/images/doctor-portrait.png` is the new owner-supplied portrait with its gray background removed to alpha transparency. PNG dimensions remain 1448 x 1086; it is served directly without lossy conversion or an image-optimization downscale. The hero frame is transparent on desktop and mobile.
- No miracle-oil feature, synthetic clinical metrics, invented testimonials or discount offers are rendered.
- Browser coverage: `pnpm exec playwright test -c playwright.landing.config.ts`; it intercepts auth traffic and never sends real SMS.
- Editable brand/interaction review: https://www.figma.com/design/PDSyoFnawEkzug9JKNrE2L?node-id=2-9 (review board, not a full-page design export).
