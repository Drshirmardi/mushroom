# F12-FE01-BR01 — Patient app identity

Status: DONE/software; sole Codex /root implementation and review. Scope explicitly confirmed by owner: apps/app only; landing is the read-only asset source. No next task, push or deployment.

- All patient-app display references to سبز زندگی now use دکتر شیرمردی, including metadata and product titles. Repeated store/search wording is shortened; the welcome helper now simply describes entering the app.
- The approved landing SVG/PNG mark and square icon are copied unchanged into public/brand. BrandLogo renders the static mark in store, onboarding and entry recovery, and the original eight-second six-part assembly animation in welcome. Reduced-motion shows a complete static mark. Owner correction: home header retains its text identity without an added logo; the browser regression explicitly checks its absence.
- icon.svg, multi-size favicon.ico and apple-icon.png are exact copies of the approved landing files. Next's metadata file conventions expose them automatically. Domain icons (health, products, etc.) keep their semantic purpose.
- Technical package/import/storage identifiers and historical documentation are not product copy. No contracts, dependencies, authentication, landing or dashboard implementation changed. Existing unrelated edits, including app AGENTS.md, remain untouched.

Verification: app typecheck, all 212 unit tests, optimized production build; brand.browser.mjs checks exact icon response bytes, home/store identity and title, six animated paths, five widths (320/375/414/768/1440), reduced motion and zero page exceptions. No actual patient/provider writes. Source search finds no old Persian brand in apps/app/src. Mobile welcome/store screenshots reviewed in .local/brand; physical devices and deployed icon caches remain unverified.


Owner placement refinement (2026-11-05): onboarding restores its semantic health icon and contains no brand logo. Welcome uses a compact static 48×24 mark only in the existing header outside questionnaire mode; questionnaire mode omits the mark. This removes repeating motion from the data-entry flow. The home exclusion and icon assets remain intact. Updated browser regression covers static welcome branding, five widths, reduced motion and no questionnaire logo.
