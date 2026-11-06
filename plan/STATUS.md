DEV BUILD ENTITLEMENT DONE (2026-11-06): `F12-T02-D01-R1`, branch `codex/dev-build-entitlement` from `dev@eea4dee`; sole Codex /root review PASS. BuildKit now requires explicit host-file entitlement for the build-only CA secret introduced by D01. Added `build.entitlements: [fs.read=/etc/ssl/certs/ca-certificates.crt]` to Dev Compose `bootstrap` and extended `scripts/test-dev-runtime-image.sh` to assert the exact entitlement. Local `bash scripts/test-dev-runtime-image.sh` PASS (real HTTPS APT install, CA isolation, missing-CA negative case); YAML/diff checks PASS. No production/runtime secret change; owner must merge and rerun Dev sync. Evidence: logs/phase-12.md#f12-t02-d01-r1--dev-build-ca-read-entitlement.

DEV APT D01 DONE (2026-11-06): F12-T02-D01 / F12-B21 main review PASS, claim RELEASED; sole Codex /root. Dev runtime uses owner-tested Fama HTTPS Debian archive + official HTTPS security archive, temporary build-only host CA, signed metadata and bounded APT requests. Actual package installation and final image checks, Compose trust isolation, existing Dev deployment regression, installer contracts/shared assets, actionlint and diff checks PASS. Evidence: logs/phase-12.md#f12-t02-d01--dev-runtime-https-apt-connectivity. No live deployment or installer release. Next owner merges reviewed PR to dev and verifies automatic deployment; AN05 GA4 receipt remains pending. Unrelated product-page work preserved.

PUBLIC INSTALLER I11 DONE (2026-11-06): F12-B20 main review PASS/claim released. Public v1.0.1 published from26c6387; full hosted run42168105175 PASS, anonymous checksum/download/Ubuntu bootstrap/update and immutable publish-rerun PASS. Mushroom consumes exact public source; old private first-admin/environment/restore gates retained. All I09/I10/I11 software tasks accepted. Evidence: logs/phase-12.md#f12-t02-i11--automatic-public-release-and-install-acceptance. No live VPS/application deployment. Next owner runs public bootstrap on server; AN05 remains separately eligible after Dev configuration.

INSTALLER UPDATE I10 DONE (2026-11-06): F12-B19 reviewed PASS/released; sole Codex. Public commit51751ec adds checked versioned activation/bootstrap, retained legacy/config/secrets and explicit panel updates. Ubuntu regression88 plus final22 updater cases and fresh/legacy bootstrap PASS; hosted I09 all gates PASS. Evidence: logs/phase-12.md#f12-t02-i10--versioned-installer-update. Next eligible I11; serialized owner authorization retained.

INSTALLER EXTRACTION I09 DONE (2026-11-06): batch F12-B18 review PASS, claim released. Source moved to public Drshirmardi/mushroom-installer@9bb617e; private application contracts and first-admin verification retained. DeepSeek attempt aborted without implementation; Codex sole implementer/reviewer. Evidence: logs/phase-12.md#f12-t02-i09--public-installer-extraction. Next eligible I10; user authorizes serialized continuation of installer plan.

PR37 CI FIXTURE REPAIR DONE (2026-11-06): `F12-FE01-AN04-CI03` accepted, batch `F12-B17` review gate PASS and claim RELEASED; sole Codex /root on `codex/analytics-ga4`. Commits `3f7a3ad` (original four reporting/Mezaj/migration/OpenAPI fixtures) and `84b2115` (previously skipped isolated assessment suite adapted to owned initial-entry/paid access; no trigger disabled or test weakened). Hosted PR37 run42156349184: all eight checks PASS, including verify job127691312043. Local: 435/435 isolated-suite tests, 118 API files/582 tests, API test TypeScript, lint and diff check PASS. No merge/deploy; runtime image scan remains disabled and CI02 zlib remediation remains deferred; next eligible work is AN05 after reviewed Dev deployment.

INSTALLATION-08 DONE (2026-11-01): `F12-T02-I08` accepted, review gate PASS; Codex /root sole agent. Server-readiness hardening for a real Ubuntu 24.04 host: chat schema probe extracted to `wait_for_chat_schema`, which retries transient `docker compose exec psql` failures inside the existing 15×2s window instead of aborting preparation on the first error; and when this installer installs Docker it now writes `/etc/docker/daemon.json` (`json-file`, `max-size=10m`, `max-file=5`) with one restart, preserving any existing config or pre-existing engine. Verification: 56 installer cases (48 PASS plus 8 pre-existing platform skips) including three new regressions; `--help` and `git diff --check` PASS. No dependency/service/port/bundle change. Evidence: [phase-12 log](logs/phase-12.md#f12-t02-i08--server-readiness-hardening). No next batch; owner rebuilds the bundle and deploys.

INSTALLATION-07 DONE (2026-11-01): `F12-T02-I07` accepted, batch `F12-B16` review gate PASS and claim RELEASED; Codex /root sole agent; ADR-0046. Bare `sudo mushroom` opens an ANSI panel on an installed host and still starts `install` on a fresh one. The panel is a thin shell over existing operations: TTY-only refusal, exact typed confirmation for restart/setup-chat/proxy/install, and a `0600` `/etc/mushroom/panel.log` that records only action and environment. `installation/{manager.py,test_installation.py,README.md}` changed and `setup_chat`/`setup_storage` extracted so CLI and panel share one path; no dependency, service, port or bundle change. Verification: 53 installer cases (45 PASS plus 8 pre-existing platform skips), `manager.py --help`, `git diff --check` and a disposable panel render PASS; the hosted installer workflow for this change and any real VPS TTY session remain external. Evidence: [phase-12 log](logs/phase-12.md#f12-t02-i07--interactive-installer-panel). No next batch; owner decides commit/push and the follow-up task.

MZ04/MZ05 OWNER PUBLICATION AUTHORIZATION (2026-10-31): owner explicitly authorizes separate reviewed task commits and push to dev; historical no-commit notes below are superseded. Local dev-readiness checks PASS (33 targeted tests,109 fresh migrations, app/dashboard builds, API/app/dashboard types, SDK/release contracts). No manual server operation; remote CD/live bank acceptance remains operational. Unrelated website/AGENTS changes excluded; broader F12-FE01 remains REWORK. Evidence: logs/phase-12.md#mz05-dev-publication-gate--2026-10-31.

MZ05 FINAL SOFTWARE ACCEPTANCE (2026-10-31): F12-FE01-MZ05 DONE/software, sole /root review PASS; scoped claim RELEASED. Owner-final entry/public workflow fully connected: independent entry price/text, paid optional deferral and Home resume reminder, actual shared payment proof, entry-only FREE access, paid public retakes, hidden acquisition guards, valid Mizaj profile/history and couple context retakes.109 fresh/upgraded disposable migrations,33 targeted PG/rules tests,16 responsive intercepted browser cases, contracts/SDK/types/diff PASS. No stage/commit/deploy; operational migrations/live PSP acceptance remain deployment work. Broad F12-FE01 remains REWORK. No next batch; stop per owner instruction. Evidence: logs/phase-12.md#mz05-owner-final-entrypublic-workflow-acceptance--2026-10-31.

PR35 CONTRACT FOLLOW-UP (2026-10-27): F12-FE01 scoped repair reviewed / remote integration verification PENDING; sole /root on same branch. Correct Swagger scalar/UUID metadata and regenerate actual OpenAPI/SDK; align nullable patientDisplayName expectation without weakening access tests. Nine runtime contract tests, API test types, SDK generation/build and dashboard types PASS. PostgreSQL integration must be confirmed by CI (local service unavailable). Commit/push authorized; no merge/deploy or next batch, broad phase remains REWORK.

PR35 CI FOLLOW-UP (2026-10-27): F12-FE01 scoped fixes DONE / main review PASS; sole /root on codex/landing-content-structure, claim RELEASED. Dashboard lint render-ref errors and treatment ReactNode type error fixed; API unit transport fixture aligned. Dashboard lint (8 existing warnings), typecheck, build, all167 unit tests, Graphify and diff review PASS. Commit/push authorized for PR35 to dev; remote checks pending. No landing/API contract change, merge/deploy or next batch; broad F12-FE01 remains REWORK. Evidence: logs/phase-12.md#pr35-dashboard-ci-repair--2026-10-27.

LANDING COUPLES HEART (2026-10-27): F12-FE01-WEB02 follow-up DONE / scoped review PASS; sole /root, claim RELEASED. Rose central heart with2.8s heartbeat, aura and two fading ripple rings; fixed geometry and static reduced-motion fallback. Typecheck, four localized responsive scenarios and targeted motion/layout checks PASS; mobile/desktop previews reviewed. Evidence: logs/phase-12.md#couples-heart-pulse-and-ripples--2026-10-27. No new commit/push/deploy or next batch.

LANDING INTERACTION COMMIT GATE (2026-10-27): F12-FE01-WEB02 follow-up DONE / main review PASS; sole /root on codex/landing-content-structure, claim RELEASED. Owner approved current trust-seal, quote-loop and scrollbar changes and authorized their local commit. Final typecheck/build, 29 units and all18 browser scenarios PASS. Includes four-language labels, Chinese subset, existing Persian address refinement, source notes and regressions. No app/backend change, push/deploy or next batch. Evidence: logs/phase-12.md#approved-footer-and-motion-commit--2026-10-27.

LANDING SCROLLBAR (2026-10-27): F12-FE01-WEB02 follow-up DONE / scoped review PASS; sole /root, claim RELEASED. Minimal blue/ice rounded page scrollbar, native defaults in forced-colors and existing dialog scrollbar preserved. Four responsive cases, wheel/scroll-lock/forced-colors checks, visible scrollbar screenshot, Graphify and diff review PASS. Existing quote/eNAMAD changes preserved. Evidence: logs/phase-12.md#minimal-branded-page-scrollbar--2026-10-27. No commit/push/deploy or next batch.

LANDING QUOTE MOTION (2026-10-27): F12-FE01-WEB02 follow-up DONE / scoped review PASS; sole /root, claim RELEASED. Hero quote reveals/erases whole words with full-text hold, repeat, future phrase-array support, stable card geometry and reduced-motion handling. Typecheck/build, four locale motion regressions, four responsive scenarios, screenshots, Graphify and diff check PASS. Existing eNAMAD work preserved. Evidence: logs/phase-12.md#hero-word-by-word-quote-loop--2026-10-27. No commit/push/deploy or next batch.

LANDING ENAMAD (2026-10-27): F12-FE01-WEB02 follow-up DONE / scoped review PASS; sole /root on codex/landing-content-structure, claim RELEASED. Issuer seal below desktop introduction / beside mobile contact details; fixed geometry and local unrated fallback while loading or unavailable, exact verification link preserved. Four-language labels, Chinese subset updated. Typecheck/build, 29 units, eight targeted browser cases, screenshots, Graphify and diff check PASS. Live issuer returns403 from this environment; actual status is available through issuer link, no local verification claim. Evidence: logs/phase-12.md#footer-enamad-seal--2026-10-27. No commit/push/deploy or next batch.

LANDING FOLLOW-UP COMMIT GATE (2026-10-27): F12-FE01-WEB02 follow-ups DONE / main review PASS; sole /root on codex/landing-content-structure, claim RELEASED. Owner accepted all current changes and explicitly authorized a local commit, superseding earlier no-commit constraints. Final web typecheck/build, 29 unit tests and all 10 browser scenarios PASS. Includes approved four-language presentation, dropdown/auth fix, portrait refinement, selected logo/icons and navbar motion, current contact/copy edits and existing Radix package/lockfile changes. No push/deploy or next batch. Evidence: logs/phase-12.md#approved-landing-follow-up-commit--2026-10-27.

LANDING LOGO MOTION (2026-10-27): F12-FE01-WEB02 follow-up DONE / scoped review PASS; sole /root, claim RELEASED. Navbar logo assembles on entry and collapses/reassembles on an eight-second loop; reduced-motion is static and wrapper layout stays fixed. Typecheck, four localized responsive cases, animation phase/layout/motion checks, screenshots, Graphify and diff review PASS. Evidence: logs/phase-12.md#navbar-logo-assembly-loop--2026-10-27. Prior changes preserved; no commit/push/deploy or next batch.

LANDING SHIN LOGO (2026-10-27): F12-FE01-WEB02 follow-up DONE / scoped review PASS; sole /root, claim RELEASED. Owner-selected logo converted to transparent SVG/PNG and used in header/footer; matching SVG, multi-size ICO and Apple icons provided. Typecheck/build and four localized responsive cases PASS; asset responses/metadata and mobile/desktop previews checked. Prior changes preserved. Evidence: logs/phase-12.md#approved-shin-logo-and-favicon--2026-10-27. No commit/push/deploy or next batch.

LANDING ARABIC (2026-10-27): F12-FE01-WEB02 owner follow-up DONE / scoped review PASS; sole /root on codex/landing-content-structure, claim RELEASED. Arabic /ar, full messages/auth errors, language selector, persisted locale, metadata alternates and shared RTL handling added. Existing IRANYekanX Arabic glyph coverage verified. Web typecheck/build, 29 unit tests, four localized responsive cases and auth continuity/regression cases PASS, including Arabic cookie/fallback/phone checks. Arabic 320/390/768/1440 and mobile/desktop sign-in screenshots reviewed. Graphify and diff check PASS. Prior and concurrent changes preserved; no apps/app/API/SMS change, commit/push/deploy or next batch. Evidence: logs/phase-12.md#arabic-landing-language--2026-10-27.

LANDING PORTRAIT REFINEMENT (2026-10-27): F12-FE01-WEB02 follow-up DONE / scoped technical review PASS; sole /root, claim RELEASED. Built-in imagegen natural face refinement saved as separate 1448x1086 transparent PNG; hero references variant, previous PNG and CSS fade preserved. Three localized responsive scenarios PASS, mobile/desktop previews reviewed. Owner visual acceptance pending. Evidence: logs/phase-12.md#natural-portrait-refinement--2026-10-27. No commit/push/deploy or next batch.

LANDING LOGIN LANGUAGE MENU (2026-10-27): F12-FE01-WEB02 follow-up DONE / scoped review PASS; sole /root, claim RELEASED. Dropdown portal stays inside native modal dialog so options are visible and interactive. Typecheck, six existing browser cases and two new mobile/desktop regressions PASS; screenshots reviewed; Graphify and diff check PASS. Concurrent edits preserved. Evidence: logs/phase-12.md#login-language-menu-portal--2026-10-27. No commit/push/deploy or next batch.

LANDING LOCALE STYLESHEET FIX (2026-10-27): F12-FE01-WEB02 follow-up DONE / scoped review PASS; sole /root, claim RELEASED. Missing CSS module added and Radix dropdown dependency registered in web. Typecheck, production build and three localized responsive scenarios PASS. Concurrent changes preserved. Evidence: logs/phase-12.md#locale-switcher-missing-stylesheet--2026-10-27. No commit/push/deploy or next batch.

LANDING MOBILE NAV / KICKER (2026-10-27): F12-FE01-WEB02 follow-up DONE / scoped review PASS; sole /root on codex/landing-content-structure, claim RELEASED. Mobile menu hidden below 768px; hero dot has a gentle pulse disabled for reduced motion. Three localized responsive browser scenarios and targeted 467/768/1440 menu/motion checks PASS; screenshot reviewed. Existing portrait fade and concurrent LocaleSwitcher edits preserved. Evidence: logs/phase-12.md#mobile-menu-and-hero-dot--2026-10-27. No commit/push/deploy or next batch.

LANDING PORTRAIT FADE (2026-10-27): F12-FE01-WEB02 owner follow-up DONE / scoped review PASS; sole /root on codex/landing-content-structure, claim RELEASED. CSS-only portrait fade starts at 86% desktop / 88% mobile; halo fades separately. Three localized browser scenarios PASS across 320/390/768/1440; all twelve visual combinations reviewed. Original PNG hash unchanged; auth and API untouched. Graphify and diff check PASS. Evidence: logs/phase-12.md#portrait-bottom-edge-follow-up--2026-10-27. No commit/push/deploy; no next batch. Broader F12-FE01 remains REWORK.

LANDING BLUE / THREE LANGUAGES (2026-10-27): F12-FE01-WEB02 DONE / scoped main review PASS; sole /root on codex/landing-content-structure, claim RELEASED. Owner now authorizes the local task commit. Blue/white interactive landing, doctor copy, fa/en/zh-CN and localized in-place OTP with state retention; new owner portrait served as full-dimension transparent PNG. Web types/build, 27 unit tests and 6 intercepted browser scenarios PASS; full browser/unit gates rerun immediately before commit. Graphify and editable Figma review board complete. No apps/app/backend/API/SMS mutation; no push/deploy or next batch. Evidence: logs/phase-12.md#landing-task-commit-gate--2026-10-27. Broader F12-FE01 remains REWORK.

LANDING OTP CONTINUITY (2026-10-26): F12-FE01-WEB01 follow-up DONE/review PASS, sole /root on dev; claim RELEASED. Dismissal/reopen retains the in-memory phone, OTP challenge, partial code and pending request/result. One expiry/resend control waits for expiry and server cooldown. Web types, 25 unit tests, 9 intercepted browser tests (mobile390/desktop1440 continuity plus existing responsive/auth coverage), build, Graphify and diff review PASS. Owner-authorized commit/push; no backend/contract/database change. Evidence: logs/phase-12.md#landing-otp-continuity-and-unified-expiry-2026-10-26. No next batch; broader F12-FE01 remains REWORK.

LANDING OTP PR FOLLOW-UP (2026-10-25): PR #32 was behind newly merged dev PR #31, making the branch non-mergeable and causing overlapping plan-log edits. Merged latest origin/dev into codex/landing-otp-pr, preserved both histories, and retained the OTP implementation. API-client build, web typecheck, all 25 web tests, production build, and diff check PASS after sync. PR CI's only failure is the unrelated API Assessment reliability integration step; GitHub's job-log endpoint failed to return the raw log, so waiting for rerun result before claiming that gate resolved.

LANDING OTP VISUAL CORRECTION (2026-10-25): Same F12-FE01-WEB01 owner follow-up DONE/review PASS, sole /root, claim RELEASED on codex/landing-otp-dialog. White semantic presentation, central phone symbol removed, full-width sheet below768px/centered480px modal from768px. Clipped overlay/viewport eliminate translated-panel transient scrollbars; panel remains scrollable in short viewports with hidden track. Optimized build/TypeScript and7 browser cases PASS, including animation-frame overflow/monotonic motion and320/390/430/480/600/767/768/1440 breakpoint checks. Desktop/mobile screenshots reviewed, Graphify AST refreshed. Evidence logs/phase-12.md#landing-otp-white-sheet-correction-2026-10-25. Auth contracts unchanged; no real SMS/deploy. Owner visual/real-phone acceptance next; broad F12-FE01 remains REWORK, no next batch.

LANDING OTP (2026-10-25): F12-FE01-WEB01 software slice DONE, main /root review PASS, scoped claim RELEASED on codex/landing-otp-dialog. Existing OTP and role/allowlisted next contracts retained; password/register components/services remain dormant. In-place desktop modal/mobile draggable sheet, six-digit owner-reference orbit and server-confirmed success. Web typecheck/build and17 unit tests PASS;6 intercepted Chromium cases PASS including320/390/430/768/1440, short viewport, animation geometry/no overflow, focus/Escape/drag/backdrop, errors/expiry/resend and legacy-route destination/cookie preservation. Graphify AST update PASS with unrelated extractor warnings. Evidence logs/phase-12.md#f12-fe01-web01--in-place-landing-otp. No real SMS/account writes/dependencies/schema/deployment; real-phone keyboard/live-provider and owner visual acceptance remain external. Broad F12-FE01 stays REWORK; no next batch started.

INSTALLER CHAT AUTOMATION (2026-10-24): F12-T02-I06 DONE; INSTALLATION-06 claim released, sole /root review PASS. Local native RSA/Compose/Caddy HTTP and deployment/rollback checks passed; hosted installer workflow40065714815 PASS on implementation2e5d9f1 includes real engine/SQL/retention, API environment, administrator bootstrap and encrypted restore. PR30 targets dev. Next action: owner merge, updated installer transfer/setup-chat and normal shared-dev deploy/manual acceptance. No live VPS mutation or next batch. Evidence: logs/phase-12.md#f12-t02-i06--automated-retained-chat-preparation. Broad F12-FE01 remains REWORK.

WELCOME MOBILE REDESIGN (2026-10-24): same CLIENT-INTEGRATION / F12-FE01, sole /root; scoped review PASS, READY_FOR_OWNER_VISUAL_REVIEW, broader task REWORK/unchecked. Brain imagery removed; compact responsive welcome/profile, real step count, explicit next step, native labeled birth/gender controls and matching assessment/result styles. App types and intercepted browser checks320/390/430/768/1440 PASS: no overflow,44px targets, prefill, error retention and exact demographic payload. Source/desktop/mobile screenshot review PASS. No real profile writes, backend/dependency/migration/deploy/commit. Evidence: logs/phase-12.md#welcome-mobile-redesign-2026-10-24. Owner phone review next; no new batch.

MEZAJ PAID CONTENT (2026-10-24): F12-FE01-MZ01 software slice DONE, sole /root review PASS on codex/mezaj-paid-content; claim released, broader F12-FE01 remains REWORK. Ordered pair/icon configuration, exact11+1/scalar recommendations, result services/products, owned Home library and admin/qualified-physician workspace reuse retained PROGRAM payment/access.47 program/entry/guard tests +28 commerce cases PASS;83 fresh/additive migrations/no drift, API/app/dashboard/SDK types, dashboard ESLint, token validators and320/390/1440 intercepted browser checks PASS. One additive migration prepared, not applied to main/VPS; no real content/terms/recommendation activation or live payment. Evidence: logs/phase-12.md#f12-fe01-mz01--paid-mezaj-services-and-result-products. Next: owner visual review, deployment migration and actual approved content/terms configuration; no new batch.

NOTIFICATION RENDER FIX (2026-10-25): Owner-authorized same F12-FE01 continuation on dev, sole /root; IMPLEMENTED_UNVERIFIED / REWORK. Added missing FINANCIAL type/Wallet icon to dashboard notifications page and panel, plus Bell fallback in both renderers. Owner runtime trace matches this defect; prior branch fix was absent from current dev. Source review complete; execution checks deferred, no commit/DONE. Owner refresh next; evidence phase-12 log.

PROGRAMS PRICING CORRECTION (2026-10-25): F12-FE01-MZ01 owner-authorized software continuation DONE/review PASS on dev, sole /root; claim RELEASED. Saved tariff and active scoped terms read; exact Persian toman input, preserved duration/TTL, explicit retention/terms review, translated blockers and publication/retry/409 states.19 isolated publication tests +3 price tests, API/dashboard types, SDK/lint/tokens and320/390/1440 browser checks PASS; Graphify AST updated. No schema/persistent database/policy activation/push/deployment. Evidence: logs/phase-12.md#programs-pricing-correction-2026-10-25. Broad F12-FE01 remains REWORK; no next batch.

STATIC READY SERVICE TERMS (2026-10-25): F12-FE01-MZ01 scoped correction DONE/review PASS on dev, sole /root; claim RELEASED. Fixed owner-approved Persian terms require no manual policy setup; new ready-service publications use permanent account access. Retained consent/payment/ownership and historical/custom contracts preserved. Publication23 + purchase33, final paid-purchase33, API/dashboard/SDK types, responsive pricing320/390/1440 PASS; migration86 applied only to local sabz_zendegi, no drift. Evidence: logs/phase-12.md#ready-service-static-purchase-terms-2026-10-25. Broad F12-FE01 remains REWORK; no next batch/push/VPS/deploy.

# وضعیت زنده اجرای پروژه

VISIT CARE WORKSPACE (2026-10-27): owner-authorized same CLIENT-INTEGRATION / F12-FE01 continuation, sole /root on dev, IMPLEMENTED_UNVERIFIED / REWORK. Integrated visit prescriptions, notes/patient summary, treatment draft/publish and real SKU lookup/add-to-patient-cart; standalone patient selection and issued-only patient reader. Existing clinical grants/custom-program/payment boundaries retained. Create retry IDs, exact revisions, atomic draft replacement and cart increment/audited replay implemented. Visit provenance is recorded in creation audit, not a schema field. No migration/dependency/real clinical or financial writes/commit/DONE. SDK types generated; source/syntax review only. Tests/types/lint/build/runtime Swagger parity/browser/access/concurrency checks deferred to owner review; see phase-12 log and prescription dashboard contract continuation. No next batch.


READY SERVICE RETENTION INPUT REMOVAL (2026-10-25): same F12-FE01-MZ01 owner-authorized software continuation DONE/review PASS on dev, sole /root; claim RELEASED. Reference input/helper/review copy removed; omitted reference accepted as null for ready services, no fabricated policy.21 publication+33 purchase tests, API/dashboard types, SDK/lint/tokens and three pricing browser cases PASS. Migration85 applied to configured local sabz_zendegi, status up to date and schema diff clear. Existing history/custom professional/price/terms/approval/ownership retained. Graphify updated; no VPS/push/deploy. Evidence: logs/phase-12.md#ready-program-retention-input-removal-2026-10-25. Broad F12-FE01 remains REWORK; no next batch.

PROGRAMS COMPACT LIST / DIALOG (2026-10-25): same F12-FE01-MZ01 owner-authorized software continuation DONE/review PASS on dev, sole /root; claim RELEASED. Compact responsive rows; native editor modal with independent scroll, sticky header, focus cycle/return and guarded Escape/backdrop; exact list scroll and form/price/Mezaj drafts retained. Five workspace browser viewports and three pricing viewports, dashboard types/lint/tokens and screenshots PASS. Graphify AST refreshed. No API/schema/payment/dependencies/DB/push/deploy changes. Evidence: logs/phase-12.md#programs-compact-list-and-editor-dialog-2026-10-25. Broad F12-FE01 remains REWORK; no next batch.

PROGRAM SOURCE REMOVAL (2026-10-25): same F12-FE01-MZ01 owner-authorized software continuation DONE/review PASS, sole /root on dev; claim RELEASED. Source picker/save gate and ready-service source dependencies removed; omitted references accepted; historical metadata preserved.20 definition+19 publication+33 purchase tests, API/dashboard types, SDK/lint/tokens and five responsive source-free creation/scroll cases PASS. Additive84 and pending83 applied to configured local sabz_zendegi at localhost:5432; no content/policy activation/VPS/push/deployment. Custom professional and current service approval/payment authority retained. Evidence: logs/phase-12.md#ready-program-source-removal-2026-10-25. Broader F12-FE01 remains REWORK; no next batch.

PROGRAMS VISUAL/SCROLL CORRECTION (2026-10-25): same F12-FE01-MZ01 owner-authorized software continuation DONE/review PASS on dev, sole /root; claim RELEASED, baseline47d7579. Page-owned scrolling under unchanged dashboard shell, responsive service/editor surfaces, grouped fields and persistent content/Mezaj/price sections. Dashboard types/lint/tokens PASS; real wheel/End and emulated mobile touch reachability PASS375/390/768/1440 and844x390 landscape; pricing browser regression PASS320/390/1440. ui-ux-pro-max/ui-styling applied; Graphify AST refreshed. No backend/schema/dependencies/persistent data/deploy changes. Evidence: logs/phase-12.md#programs-workspace-visual-scroll-correction-2026-10-25; broader F12-FE01 remains REWORK, no next batch.

NOTIFICATION RECIPIENT CONTEXT (2026-10-25): owner-authorized F12-FE01 continuation, sole /root on dev; IMPLEMENTED_UNVERIFIED / REWORK. Admin notification projection adds actual profile recipientDisplayName; dashboard page/header panel show recipient and identify the original patient-directed text. Only selected first/last name exposed; no patient response/data/permission/schema change. Source review complete, execution checks deferred, no commit/DONE. Owner review next; phase-12 log.

PR29 FOLLOW-UP (2026-10-24): Owner-authorized same F12-FE01 continuation on codex/patient-entry-flow, /root coordinator, LOCAL_REVIEW_PASS / hosted 8643f17 wallet fixture failures corrected (wallet15 + product media49 PASS), new hosted PR checks pending; broader task remains REWORK. Scope: repair incomplete API test fixtures and exact account-security gate exceptions; independent self-reported onboarding without consent capture/policy prerequisite; reuse entry demographics, simplify patient UI and reduce unrelated dependencies; remediate Zod audit blocker. Root owns API/domain/migration/OpenAPI/app/tests and plan evidence. Worker /root/zod_security exclusively owns apps/web/package.json and pnpm-lock.yaml; no commit ownership. Expected gates: PostgreSQL regressions/full API suite, frontend/SDK types/tests, browser mobile/desktop, production audit and hosted PR checks. No global clinical-sharing/purchase consent removal, no assessment-policy activation, no new phase/batch.

PATIENT ENTRY CORRECTIVE SLICE (2026-10-24): Same owner-authorized F12-FE01 continuation, sole /root on `codex/patient-entry-flow`; slice READY_FOR_OWNER_TEST. All incomplete accounts must supply name, surname, gender and birth date independently of assessment configuration; assessment cohort/source pinning remains unchanged. Fixed legacy attempt demographic repair, durable profile-only completion, and the rejected profile cutoff. Scheduling type/Swagger pagination blockers corrected. API emit/test types and all three frontend types PASS; isolated PostgreSQL12/12, targeted API11/11, app9/9 and SDK12/12 PASS; four intercepted desktop/mobile browser flows PASS. Actual root `pnpm dev` launched all services; API live/ready/chat and three frontends HTTP200. Both forward migrations deployed to owner-configured primary database after validated backup and populated-clone rehearsal; schema has no drift and patient/profile/submission/result fingerprints unchanged. No real assessment policy activated. Evidence: `logs/phase-12.md#patient-entry-final-correction-and-primary-migration-2026-10-24`; SpecKit package: `specs/011-patient-entry-flow/`. Feature changes remain uncommitted for owner review. Broader F12-FE01 remains REWORK/unchecked; next action is owner's manual entry-flow test, no new batch.

PR28 RELEASE REHEARSAL (2026-10-23): Same F12-FE01-CHAT01, REWORK/unchecked. Hosted b725780 security, installer and all four artifact jobs PASS. Release rehearsal exposed an intermittent SIGPIPE141 in grep|head under pipefail; limited matches within grep and retained every ordering assertion. Disposable Linux non-root deployment/rollback rehearsal PASS. Full hosted verification remains pending; no merge/deployment/DONE or unrelated worktree changes.

PR28 STABILIZATION (2026-10-23): Same CLIENT-INTEGRATION / F12-FE01-CHAT01, sole /root; REWORK/unchecked. Corrective review and local checks PASS in an isolated checkout: API/all frontend types, workspace lint, 349 frontend/SDK tests, 18 PostgreSQL chat-policy/rate/moderation cases and 29 configuration/auth cases. Legacy REST-write fixtures now use the private engine policy; no fallback restored. Next security update passes high/critical audit. PR28 targets dev; complete hosted CI rerun and owner clinical/browser/deployment acceptance remain pending. Ten unrelated original worktree changes preserved. Evidence: logs/phase-12.md#pr28-stabilization-and-verification-2026-10-23.

PR28 CONTRACT FOLLOW-UP (2026-10-23): Hosted e7d2b36 passed security, installer, release contracts and all four artifact build/HTTP/security jobs. Main verification passed lint/types and 517 API tests, then exposed three stale contract/waiting-room assertions. Runtime Swagger metadata and actual exporter/client output synchronized; numeric gateway pagination retained, UUID metadata documented. Updated explicit-closure/preparation tests and 10 targeted contract/waiting-room cases PASS; API clean emit/test types and regenerated SDK12 cases PASS. Full hosted rerun pending; same task remains REWORK/unchecked, no merge/new batch.

PR28 CLINICAL BOUNDARY (2026-10-23): Dependency review found an indirect legacy send in the isolated assigned-consultation suite and an actual branch regression: chat persistence had also removed assigned-physician clinical expiry bounds. Restored the original clinical grace/worklist predicates; chat still closes explicitly. Native-policy consultation fixture and all14 real PostgreSQL consultation/authorization/concurrency cases PASS on a second disposable database; clean API test types PASS. Hosted815a798 passed main pnpm test and reached build; final boundary correction requires its hosted rerun. Same ownership/REWORK, no clinical task completion or merge.

CHAT AREA CHECKPOINT COMMITS (2026-10-23): Owner reports testing/review complete and requested area-separated commits on `codex/chat-ejabberd`. Backend `4acddcf`, patient/dashboard clients `f4d50c9`, consultation workspace `9d90ad9`, local/deployment runtime `4a9f823`. No push/PR. F12-FE01-CHAT01 remains REWORK/unchecked until the complete acceptance record is reconciled; unrelated booking, availability, calendar and settings changes remain unstaged in the worktree.

PATIENT CHAT MOBILE KEYBOARD (2026-10-23): same F12-FE01 / F12-FE01-CHAT01, sole /root continuation, REWORK/unchecked. Patient chat room now follows VisualViewport resize/offset so its composer stays above the mobile keyboard; message region explicitly allows shrinking and scrolling after close. Source review only; no tests/typecheck/lint/build/browser automation/commit. Owner to check on a phone; IMPLEMENTED_UNVERIFIED.

CHAT SASL CORRECTION (2026-10-23): same F12-FE01 / F12-FE01-CHAT01, sole /root continuation, REWORK/unchecked. Reported HTTP101/reconnecting traced to Stanza preferring X-OAUTH2 while native ejabberd JWT expects PLAIN password verification. Shared client disables OAuth mechanisms; engine advertises only PLAIN, local configuration reload succeeded. Ephemeral bridge probe rejected X-OAUTH2 and accepted PLAIN; after reload native engine reports two connected sessions and two occupants in the reported room. Actual patient/physician message delivery and owner acceptance remain pending. No build/tests/browser automation/commit; scoped runtime diagnosis only.

CONSULTATION WORKFLOW (2026-10-23): owner-authorized same F12-FE01 / F12-FE01-CHAT01, sole /root; IMPLEMENTED_UNVERIFIED / REWORK, unchecked. Explicit audited physician/authorized ADMIN chat closure replaces completion/elapsed-time closure;15min preparation retained. Role-aware paginated visits and merged waiting view open one visit workspace with chat/exact encounter notes/existing prescriptions. Existing permissions/consents retained; source/client generation only. Tests/types/lint/build/Swagger parity/browser/delivery and runtime SDK rebuild deferred until owner review; no DB mutation/migration/commit/new batch. Handoff: logs/phase-12.md#consultation-workflow-and-explicit-chat-closure--implemented_unverified-2026-10-23.

EJABBERD LOCAL STARTUP VERIFIED (2026-10-23): same CLIENT-INTEGRATION / F12-FE01, sole /root; scoped F12-FE01-CHAT01 on codex/chat-ejabberd from dev@c54d129, broader task REWORK/unchecked. Latest owner explicitly authorizes fixing and verifying the complete local launch before reporting. Actual pnpm dev cold/repeated start passed: ejabberd+chat PostgreSQL healthy; strict API/shared-client builds passed; API live/ready/chat200, web200, patient /chat200, dashboard /messages200. Native WebSocket features, private-room create/existing-room retry/member add-remove/disposable cleanup PASS;3 targeted regression tests PASS; policy without secret401. Ctrl+C stopped all owned servers/containers, released lock, retained keys/volumes. Fixed mod_muc allowpm option, enabled mod_muc_admin, validated v2 options object, TypeScript union/optional/SDK void return mismatches and nullable Swagger cursors; pinned Stanza browser metadata patch with Docker build inputs; fixed Windows API watcher scope/Turbo noninteractive launch. Offline Swagger exporter works with temporary key; scoped chat contracts match actual output; pre-existing unrelated commerce drift preserved. Frozen lockfile install check PASS. No application migration/seed, manual medical/financial mutation or VPS deployment; no final task commit/push/PR. Full authenticated patient-to-physician delivery, moderation/security matrix and broader acceptance remain pending. Exact evidence: phase-12 log local startup verification, deploy/ejabberd/README.md. No new batch.

Sadad detail 500 correction (2026-10-22): owner reports deployed request detail failures. Same F12-FE01 /root continuation, REWORK/unchecked. Source identifies UNION text ID compared against UUID parameter; corrected detail comparison to text, retaining controller UUID validation and clinic/permission filters. IMPLEMENTED_UNVERIFIED, no server-log/runtime confirmation or tests/build/browser/Graphify executed. Preserve pre-existing patient sheet/profile changes; next: deploy correction and owner retry, then authorized real PostgreSQL regression.

Sadad diagnostics checkpoint (2026-10-22): owner explicitly requests committing this slice on dev before deferred execution checks. Commit is a review checkpoint only; F12-FE01 remains REWORK/unchecked and IMPLEMENTED_UNVERIFIED. No push, final acceptance or next batch authorized.

CLIENT-INTEGRATION Sadad diagnostics IMPLEMENTED_UNVERIFIED (2026-10-22): same active F12-FE01 /root sole writer/reviewer, owner-authorized continuation, REWORK/unchecked. Provider settings request search/filter/server pagination/detail, clinic-authorized commerce+billing read contracts, bounded secret-free adapter REQUEST/CALLBACK/VERIFY events using existing audit storage, additive client source and unexecuted regression sources. Historical saved codes visible; missing historical telemetry not reconstructed. Preserve financial decisions/permissions; no actual payment/provider/configuration changes or migration. Tests/typecheck/lint/build/browser/Graphify remain deferred until owner review. Handoff logs/phase-12.md#sadad-request-diagnostics--implemented-unverified; no DONE/task commit/new batch.

CLIENT-INTEGRATION bottom-sheet handle focus correction (2026-10-22): F12-FE01 /root owner-authorized continuation, scoped review PASS. Shared handle uses grip-only focus indicator and transparent touch highlight; native focus and drag handlers retained. Actual notification sheet at390px: no button rectangle/overflow, keyboard grip indicator2px, Escape dismissal and trigger-focus restoration PASS. Real Safari/iPhone remains unverified; broader task REWORK/unchecked, no commit. Evidence phase-12 log below.

INSTALLATION-05 / F12-T02-I05 DONE (2026-10-22), review PASS/claim RELEASED. New first-admin bootstrap uses input-selected user/clinic IDs to create exactly one clinic membership atomically with account/role/audit. Real PostgreSQL default/new-clinic fixtures with generated phones, concurrent retry, audit rollback, password/revocation preservation PASS. [Evidence](logs/phase-12.md#f12-t02-i05--initial-administrator-clinic-membership). Existing owner-repaired account remains unchanged; no historical access backfill. Next action: future installations use updated checkout; no next roadmap batch started.

DEV-COMPILE-HEAP / F12-T02-CI04 DONE (2026-10-22), software review PASS/claim RELEASED. Compiler-only bootstrap heap640→1536MiB; actual clean full API emit at1536MiB PASS (10.9s), release contracts and dev retry/recovery rehearsal PASS. [Evidence](logs/phase-12.md#f12-t02-ci04--development-api-compiler-heap). Owner MSS test enabled transfer/all migrations; actual VPS startup/capacity still awaiting retry. No next batch started; broader acceptance unchanged.

DEV-SYNC-DIAGNOSTICS / F12-T02-CI03 DONE (2026-10-22), software review PASS/claim RELEASED. Named phase/completion/failure logs, rsync list/progress/stat output and90s I/O idle timeout, SSH keepalives implemented and intercepted success/failure checks PASS. [Evidence](logs/phase-12.md#f12-t02-ci03--make-stalled-source-upload-observable-and-bounded). Actual VPS transfer/deployment incident remains REWORK; root cause unproven. Next action: inspect new dev-sync execution; no next roadmap batch started.

DEV-SSH / F12-T02-CI02 DONE (2026-10-22), review PASS/claim RELEASED. Owner-approved dev commit/push restores real deployment and applies observed successful SSH compatibility options to SSH/rsync. Syntax, intercepted command composition, actionlint and release contracts PASS. [Evidence](logs/phase-12.md#f12-t02-ci02--restore-dev-deployment-with-working-ssh-options). Actual deployment result remains external; next action: inspect automatically triggered shared-dev workflow. No next batch started; broader F12-FE01 remains REWORK.

PR27-CI / F12-T02-CI01 DONE (2026-10-22), claim RELEASED; hosted CI/security, installer and all release artifacts PASS on1827010; owner merged PR27. Local repair/review PASS: lint/types, dashboard build, frontend/client suites, all formerly failing API cases in clean disposable databases, historical migrations and fresh-schema drift. Corrective checkpoint to front updates PR27; Hosted review gate satisfied; prior pending statements below are historical. No agent merge, server data change or provider activation. Broader F12-FE01 remains REWORK. [Evidence](logs/phase-12.md#f12-t02-ci01--pr27-validation-repair).

INSTALLATION-04 / F12-T02-I04 DONE, review PASS, claim RELEASED (2026-10-22), sole Codex /root. Docker host/none null IPAM.Config normalized; overlap/idempotency guards retained; unexpected CLI errors redacted.38 cases:36 PASS/2 existing tool skips; actual local Docker inspect reproduces old failure and corrected allocation/retry PASS. Fresh manager.py/archive ready. [Evidence](logs/phase-12.md#f12-t02-i04--docker-default-network-ipam). No live server change/push; next action: owner replaces manager.py in uploaded bundle and resumes saved installation. F12-FE01 unchanged; no next batch started.

INSTALLATION-03 / F12-T02-I03 DONE, review PASS, claim RELEASED (2026-10-22), sole Codex /root. Nominal VPS RAM preflight tolerates10% below4/2GiB; owner3.8GiB dev passes,2GiB dev still fails; disk guard unchanged.36 installer cases:34 PASS/2 existing tool skips on Ubuntu24.04 WSL. Fresh archive/checksum ready. [Evidence](logs/phase-12.md#f12-t02-i03--nominal-vps-memory-preflight). No live server change/push; next action: owner replaces bundle and resumes saved install. F12-FE01 REWORK unchanged; no next batch started.

INSTALLATION-02 / F12-T02-I02 DONE, review PASS, claim RELEASED (2026-10-21), sole Codex /root. Termius invalid-byte input now retries the same ordinary/hidden prompt; launchers force Python UTF-8 and failures report redacted type/location/errno. All34 tests PASS on disposable Ubuntu24.04, fresh bundle/checksum ready. [Evidence](logs/phase-12.md#f12-t02-i02--terminal-encoding-recovery). No live server change or push; next action: owner transfers the replacement bundle and resumes installation. F12-FE01 stays REWORK; no next task started.

INSTALLATION-01 / F12-T02-I01 DONE, review PASS, claim RELEASED (2026-10-21), sole Codex /root. Standalone Ubuntu 24.04 amd64 installation bundle, environment coverage, independent production CD/manual or opt-in automatic promotion, first-admin bootstrap and encrypted backup/restore manager implemented and locally verified. [Evidence](logs/phase-12.md#f12-t02-i01--standalone-server-installation-and-private-repository-cd). No live server/provider/DNS/GitHub change or push. Existing F12-FE01 stays REWORK/unchecked. Next action: owner-selected clean-VPS installation and F12-T13 operational acceptance; no next batch started.

CLIENT-INTEGRATION owner-requested checkpoint (2026-10-21): all pending initial-entry, Home journey/status, dashboard selection, migrations, generated contracts and verification evidence saved together as one cohesive F12-FE01 checkpoint at explicit owner request. Earlier uncommitted statements below describe historical implementation stages. Focused checks retain their recorded results; existing dashboard type failures and broader acceptance remain outstanding. Overall REWORK/unchecked; no release, policy activation, push or next batch.

CLIENT-INTEGRATION initial entry flow IMPLEMENTED / OWNER REVIEW (2026-10-21): same F12-FE01 /root, prior uncommitted Home work preserved. Separate basic-details→configured free published assessment→result→Home; Persian birth date and minimal ice/glass UI, no medical intake/consent fabricated. New private patient API guard and App root gate, exact bound submission access, saved-answer resume, audited/pinned completion. Assessment dashboard «ورود اولیه» selects source/enables cohort from first activation; old accounts grandfathered, no real activation/source selection performed. Two additive local migrations applied;79 fresh migrations and6 real isolated PostgreSQL scenarios PASS,17 focused units PASS, App/API types PASS; browser-only flow/redirect/focus/mobile-desktop preview PASS. Whole dashboard typecheck has existing unrelated failures (revenue ES2017 BigInt, legacy query metadata and older assessment preview statuses); no new entry UI errors reported. No real medical/financial/user-profile writes or new commit; overall REWORK/unchecked. Evidence Phase12 entry-flow log and ADR0038.

CLIENT-INTEGRATION Home setup/status/actions IMPLEMENTED (2026-10-21): owner continuation after clean checkpoint b93b3be/3103f37/109f243, same F12-FE01 /root. Three server-derived setup steps and matching actual onboarding form/review; successful Home-origin completion returns Home. Hero switches at authoritative isComplete to real latest-result/profile status, pending categories below. Exact payment/resume/grant/active-plan/couple/link selectors independent of historical preview; completed content/top-ups excluded, legacy nextAction retained. Additive generated Journey contract, no migration/real medical/payment write.12 focused units PASS, App types PASS/API type command completed without diagnostics; scoped real + browser-only simulated complete/error/empty/mobile/desktop checks PASS. Full PostgreSQL/clinical/financial acceptance and broad build/regression deferred, task REWORK/unchecked. New implementation uncommitted for owner review. Evidence: Phase12 log Home setup/status/actions.

CLIENT-INTEGRATION shared patient frame (2026-10-21): owner supersedes separate Product480px and Store768px expansion. Same F12-FE01 /root continuation; Home/Store/Product use shared720px cap below1024 and1120px cap from1024. Purchase/cart bars inherit cap; Product retains vertical sticky-image panel. Scoped browser geometry matches at360/768/900/1024/1440; narrow Product scroll/sticky/no horizontal overflow confirmed. Broader task REWORK/unchecked; other tests/build/Graphify deferred, no commit. Evidence Phase12 log.

> این فایل فقط وضعیت فعلی، ownership، blocker و handoff کوتاه را نگه می‌دارد. شواهد taskهای
> تکمیل‌شده در [`logs/`](logs/README.md) ثبت می‌شوند؛ checklist کامل هر فاز نیز در فایل همان
> فاز منبع حقیقت است.

## وضعیت کلی

CLIENT-INTEGRATION operational orders workspace (2026-10-22): explicit owner continuation, same F12-FE01 /root sole writer/reviewer, REWORK/unchecked. IMPLEMENTED_UNVERIFIED; handoff logs/phase-12.md#operational-orders-workspace--implemented-unverified. Dashboard orders feature/API wrapper and relevant regression sources; commerce order read-only search/detail DTO/controller/service and existing billing integration wrappers; exclusive OpenAPI/client source; scoped plan evidence. Contract: keep operational/financial state machines and permissions, server search/pagination, order items/address/payment/refund visibility, in-page confirmations/forms (no browser prompt/confirm), stable idempotency on retries, source-backed allowed actions and separate reconciliation failures. No actual order/payment/refund writes by agent; no dependencies/migrations planned. Owner defers tests/typecheck/lint/build/browser/Graphify until review; no DONE/commit/new batch.

CLIENT-INTEGRATION retained-result assessment deletion (2026-10-21): owner explicitly requires deleting an assessment while preserving patient results. Same F12-FE01 /root REWORK/unchecked. IMPLEMENTED_UNVERIFIED: assessment status/schema/additive migration/client source, admin deletion/list/lifecycle, patient historical questionnaire/resume, local delete UI, focused unexecuted test sources and scoped evidence. ADR0037; local migration20261021120000 applied successfully. Handoff logs/phase-12.md#assessment-delete-with-retained-results--implemented-unverified. Implement terminal DELETED tombstone, retain source/questions/submissions/results/FKs/audit, block new starts/publications; unlink only required booking-policy reference atomically with audit. No actual assessment deletion executed; all tests/types/lint/build/browser/Graphify deferred.

CLIENT-INTEGRATION restore full assessment connections (2026-10-21): owner explicitly rejects removing full offering/connection settings for11+1; same F12-FE01 /root REWORK/unchecked. IMPLEMENTED_UNVERIFIED: assessment-connections.tsx, parent tab label and scoped evidence only. Handoff logs/phase-12.md#restore-full-assessment-settings--implemented-unverified. Restore full form access and retained state, correct11+1 offering engine, retain actual draft-save API and ADMIN ordinary publication without physician approval IDs; explicitly distinguish unsupported11+1 paid activation/band-guidance/couple delivery. No financial/clinical authority migration, no fake compatibility or actual publication. All execution checks remain deferred.

CLIENT-INTEGRATION ADMIN educational11+1 publication (2026-10-21): explicit owner instruction supersedes prior general physician gate; all ordinary11+1 authoring/publication operations belong to existing ADMIN. Same F12-FE01 /root, REWORK/unchecked. IMPLEMENTED_UNVERIFIED: admin publication service/DI, free11+1 access and result provenance, dashboard readiness/connection wording, focused unexecuted regression sources and scoped ADR/status/evidence. ADR0036 records owner approval; handoff logs/phase-12.md#admin-111-publication--implemented-unverified. Preserve existing commercial/paid/legacy physician contracts and retained reviews; no role expansion, fabricated clinical approval or actual publication. Tests/types/lint/build/browser/Graphify deferred.

CLIENT-INTEGRATION assessment connection simplification (2026-10-21): owner asks why complex and reports services.data.filter crash. Same F12-FE01 /root assessment ownership, no other batch; REWORK/unchecked. IMPLEMENTED_UNVERIFIED: assessment-connections.tsx, connection tab wording in assessment page, assessment service wrapper/regression source and scoped plan evidence only. Handoff logs/phase-12.md#assessment-connection-simplification--implemented-unverified. Fix real paginated services contract; hide unsupported schema3 commercial/guidance/couple forms, retain legacy functions behind optional controls, explain physician review accurately. ADR0022 requires physician approval for commercial publication; previous continuation extended this to general11+1, which is a separate product-policy decision and is not silently changed here. No backend authority/deletion/publication change; preserve concurrent Store edits. All tests/types/lint/build/browser/Graphify remain deferred.

CLIENT-INTEGRATION 11+1 publication/runtime (2026-10-21): IMPLEMENTED_UNVERIFIED; handoff logs/phase-12.md#assessment-111-publication-and-small-screen-hold--implemented-unverified. Local additive migration20261021100000 applied successfully; no real review/publication/submission/deletion performed. Physician approval API exists, physician UI does not; actual content and qualified approval remain release prerequisites. Explicit owner continuation after checkpoint commits; same F12-FE01 /root sole writer/reviewer, REWORK/unchecked. IMPLEMENTED: local hold control (stable label width,touch gesture/pointer capture/no-focus-scroll); API versioned domain/admin/protocol/access/patient service/DTO and related existing modules; additive protocol-review compatibility migration; patient assessment wizard/result/wrappers only; dashboard publication readiness; generated OpenAPI single writer; focused test sources and scoped plan evidence. Contract: retain scalar/v2 behavior, enable schema3 publication only after structural completeness and exact qualified physician protocol/active policy approval; no fabricated clinical key/content or actual publication/review/patient write. Authoritative server11+1 decision on saved answers,partial save/resume,at-most-one correct follow-up,immutable idempotent educational result,no fake percentages. Paid/couple release constraints retained. Tests/types/lint/build/browser stay deferred; no new batch/commit/DONE.

CLIENT-INTEGRATION owner pending checkpoint (2026-10-21): pending Store work saved on current front branch as4f5f363 plus this documentation checkpoint, at explicit owner request. Assessment changes already c797d07/0629386/45e24b5. No tests/build/browser or acceptance/push; same F12-FE01 REWORK. Next authorized work: repair narrow-screen hold control and complete real11+1 assessment publication/runtime.

CLIENT-INTEGRATION owner-requested assessment checkpoints committed (2026-10-21): c797d07 API/guarded deletion/migration/OpenAPI;0629386 dashboard modal/hold-to-delete/client. Source/staged/whitespace review only; prior explicit tests/types/lint/build/browser/Graphify deferral preserved. All retained changes saved with evidence in Phase12 log; IMPLEMENTED_UNVERIFIED and full F12-FE01 REWORK/unchecked, no final acceptance/push/new batch.

CLIENT-INTEGRATION assessment hold-to-delete (2026-10-21): IMPLEMENTED_UNVERIFIED; handoff logs/phase-12.md#assessment-hold-to-delete--implemented-unverified. Same F12-FE01 /root sole writer/reviewer. Owner replaces browser deletion confirmation with press-and-hold on delete. Owned: assessment page/new local hold-delete button and focused unexecuted regression source, coordinator status/phase/log. Contract: deliberate continuous primary-pointer or Enter/Space hold1.5s, visible progress; release/leave/cancel/blur/hidden/disabled/unmount cancels; click/hover alone never deletes; one callback per press. Existing API hash/reference/auth protections unchanged, no record deleted. Tests/types/lint/build/browser remain deferred; REWORK/unchecked, no automatic commit.

CLIENT-INTEGRATION assessment delete error routing (2026-10-21): IMPLEMENTED_UNVERIFIED. Central allowlist fixed; scoped read-only database diagnosis found5 archived versions,all with existing submissions (some also Mezaj results). Handoff logs/phase-12.md#assessment-delete-error-routing--implemented-unverified. Same F12-FE01 /root. Owner reports generic409 on delete. Source confirms new delete error codes absent from central allowlist, so HTTP filter replaces them with CONFLICT. Narrow extension to common/errors/api-error.ts and its enum in OpenAPI/generated source, focused filter regression test source, read-only assessment reference diagnosis if needed. Preserve all deletion/reference safeguards and previous changes. No delete attempt or automated execution checks; task REWORK/unchecked.

CLIENT-INTEGRATION archived assessment deletion (2026-10-21): IMPLEMENTED_UNVERIFIED. Local migration20261021090000 applied successfully; no record deleted. Handoff logs/phase-12.md#archived-assessment-deletion--implemented-unverified. Owner explicitly extends deletion to RETIRED versions. Same F12-FE01 /root sole writer/reviewer, REWORK/unchecked; preserve modal/draft-delete changes. Owned: same assessment page/wrapper/API/audit/tests/OpenAPI paths plus a new additive SQL trigger migration and scoped plan handoff. Contract: DRAFT or RETIRED only, exact current hash, clinic/permission/locks/audit, all existing ON DELETE RESTRICT references retained; PUBLISHED remains undeletable and archive is still separate. No record deletion executed by agent. Existing migrations never edited. Tests/types/lint/build/browser remain deferred; migration activation must be accurately reported, no automatic commit/DONE.

CLIENT-INTEGRATION assessment modal/delete (2026-10-20): IMPLEMENTED_UNVERIFIED, owner review pending at http://localhost:3002/assessments; handoff logs/phase-12.md#assessment-modal-and-draft-deletion--implemented-unverified. Same F12-FE01 /root sole writer/reviewer, REWORK/unchecked. Owner requests native modal management over retained assessment list and delete action on main list. Owned paths: assessment page/new dialog/wrapper and focused test sources; API admin controller/DTO/service, audit action, focused auth/deletion tests; exclusive OpenAPI/client generation; coordinator status/phase/log. Contract: DELETE only unreferenced DRAFT with expected current contentHash, clinic/permission/row-lock/audit preserved; published/retired and any referenced version retain history, use existing archive for published. Existing database Restrict/immutability controls reused, no migration/dependency/clinical release change. No real delete executed. Tests/typecheck/lint/build/browser remain deferred; no automatic commit or DONE.

CLIENT-INTEGRATION owner-requested checkpoint commits (2026-10-20): explicit instruction to commit all current changes separately authorizes checkpoint commits before deferred verification; no completed-task acceptance is implied. Shell/Home db6a8fd; product lifecycle13fcc80; product workspace109b7c0; assessment API/contracts f416b72; assessment dashboard ebf93c4; system-design artifacts e9d0282; this documentation commit records status/contract/handoff. F12-FE01 and batch remain REWORK/unchecked, implementation stages IMPLEMENTED_UNVERIFIED. Tests/typecheck/lint/build/browser/Graphify remain deferred, no push. Next action is owner dashboard review, not another task/batch.

CLIENT-INTEGRATION Mizaj 11+1 authoring (2026-10-20): IMPLEMENTED_UNVERIFIED, owner review pending at http://localhost:3002/assessments. Contract/handoff: plan/assessment-mizaj-11plus1.md and logs/phase-12.md#mizaj-111-authoring--implemented-unverified. Owner supersedes prior 11+4 proposal. Same F12-FE01 /root sole writer/reviewer, overall REWORK/unchecked. Implemented dashboard authoring plus real ADMIN draft validation/preview: exactly11 main questions, at most1 targeted follow-up for exact tied candidate set (primary or secondary); no tie means no follow-up; absent/multiway/unresolved cases explicit, no forced clinical certainty. Owned: assessments dashboard feature/wrapper; API domain new versioned draft and existing admin service/DTO; API OpenAPI/generated source single writer; focused unexecuted domain test source; plan status/phase/log and scoped contract note. Existing v1/v2 contracts/versions/release/physician/privacy controls preserved. No patient runtime/release change in this dashboard-first stage, no migration/dependency/Graphify rebuild/agents/final commit. All tests/typecheck/lint/build/browser still deferred for owner review. Clinical question/mapping approval remains required, no invented follow-up content.

CLIENT-INTEGRATION assessment administration (2026-10-20): IMPLEMENTED_UNVERIFIED, awaiting owner review at http://localhost:3002/assessments; source/contract review only, no execution PASS claimed. Handoff: plan/logs/phase-12.md#assessment-administration--implemented-unverified. Explicit owner continuation, same F12-FE01 / CLIENT-INTEGRATION, sole Codex /root writer/reviewer; preserve all shell/store checkpoints. Scope: current /assessments authoring and supported ADMIN assessment APIs, all schema-v1 question types/sections/result bands; preserve/edit bounded schema-v2 draft and exact synthetic preview; real version/policy/results pagination and related offering/protocol/commercial/guidance administration where authorized. Ownership: apps/dashboard/src/features/assessments/**, src/lib/assessment-api.ts and directly related assessment wrapper/test sources; admin-assessments.controller.ts query documentation plus packages/api-client/{openapi.json,src/schema.generated.ts} exclusively for the confirmed missing list-query metadata (source generation only, no API build); coordinator STATUS/Phase12 log/checklist; task-local System Design DOCX from the explicitly invoked retained template. Existing backend behavior is the contract baseline; no clinical algorithm, consent/legal text, physician authority, release gate or patient answer data may be invented or bypassed. No new batch, agents, Graphify rebuild, SpecKit chain or final commit. Tests/typecheck/lint/build/automated browser remain deferred; source/contract and document-only render review allowed. Overall task stays REWORK/unchecked pending owner review/final verification.

CLIENT-INTEGRATION Store product workflow (2026-10-20): IMPLEMENTED_UNVERIFIED, pending owner review at http://localhost:3002/store; source/contract review only. Handoff: plan/logs/phase-12.md#store-product-workflow--implemented-unverified. Explicit owner continuation of same F12-FE01 /root sole-writer batch; stage 1 dashboard remains implemented/unapproved. Scope: image-led grid/list catalog and one product workspace for base fields, existing protected image workflow, editorial content/review and SKU/inventory; restore archived product to DRAFT via existing PATCH contract. Owned paths: apps/dashboard/src/features/store/{store-page,product-catalog,product-content-editor,product-image-editor,product-workspace,product-thumbnail,product-sku-editor}.tsx and directly related catalog helpers/wrappers; apps/api/src/modules/commerce/catalog/admin-commerce-catalog.service.ts (only ARCHIVED→DRAFT lifecycle), directly affected focused test source if needed; coordinator STATUS/Phase12 checklist/log. Existing CSS shell/dashboard work preserved; no schema, generated-client, lockfile or permission changes. Source/contract review only; tests/typecheck/lint/build/browser and graph update remain deferred per owner. F12-FE01 stays REWORK/unchecked; no final commit or other feature batch.

CLIENT-INTEGRATION dashboard archive stage 1 (2026-10-20): explicit owner extension of F12-FE01, same batch and sole Codex /root coordinator/writer; no new batch or delegated work. Status: IMPLEMENTED_UNVERIFIED / awaiting owner visual review, broader F12-FE01 remains REWORK/unchecked. Source/contract review complete for this stage; deferred runtime gates have not run. Preview: http://localhost:3002/dashboard. Handoff: plan/logs/phase-12.md#dashboard-archive-stage-1--implemented-unverified. Owned paths: apps/dashboard/src/app/{layout.tsx,globals.css}, src/components/layout/**, src/components/shared/kpi-card.tsx, src/features/dashboard/**, directly required src/lib/dashboard-home-reporting.ts, public/fonts/vazirmatn/**; coordinator plan/STATUS.md, phases/12-PRODUCTION-HARDENING.md and logs/phase-12.md. Archive is read-only visual reference. Preserve all current navigation/features, operational clinic scope, ADMIN/session/permissions and existing API contracts. No backend/schema/generated client/dependency changes; no products/CRM/orders/messages/settings feature redesign in this stage. Stop after shell + real-data Home preview for owner visual review. Tests, typecheck, lint, build and automated browser verification deferred by owner until implementation and owner review; source/contract review only. No DONE, final task commit or graph rebuild/update. Existing couples work and test-results preserved. Follow-on order: products, CRM, orders (server search/pagination), messages, settings.

CLIENT-INTEGRATION shared glass navigation review PASS (2026-10-20): owner-authorized F12-FE01 shared-dock scope, sole /root. Unified Home/store/profile surface/font/active state,56% ice glass/actual28px blur, centered720px maximum. Browser390/1440 confirms identical computed styles/widths, correct active routes and0 overflow; types/diff/AST update PASS. Prefix order corrected after inspecting emitted CSS. Destinations/badges/product exclusion/focus/safe area/page themes preserved. Evidence Phase12 log; broader task remains REWORK/unchecked,no new batch/final task commit.

CLIENT-INTEGRATION Home integrated redesign READY FOR OWNER VISUAL REVIEW (2026-10-20): previous visual checkpoint superseded by owner request. Same F12-FE01 /root sole writer. Unified ice/blue/teal Home and real glass layers, IRANYekanX400/500, full-width mobile copy/short actions, personal access hub and all lower sections redesigned. Independent activity UI removed; Journey/domain helpers/data retained. Original JPEG already truncates both lateral contours; separate imagegen decorative transparent full-contour PNG prepared, original unchanged/provenance documented. All17 actions ×3 widths,320–1440 layout, keyboard/modal/error/content/profile-isolation checks PASS; types/build and176 tests with external temporary alias config PASS. Full-page reviewed screenshots/evidence: [Phase12 log](logs/phase-12.md#f12-fe01--integrated-home-corrective-visual-review). Unrelated couples work/protected files preserved; full task stays REWORK/unchecked, no new batch/final task commit.

CLIENT-INTEGRATION Home brain-glass checkpoint review PASS (2026-10-20): same F12-FE01 /root sole writer/reviewer. Original owner brain JPEG copied byte-for-byte, no crop/recompression/filter/opacity change; cream matte integrated into Home-only glass/ice surface. Responsive320–1440, all17 Journey actions, loading/error/retry/empty/populated previews, modal focus and profile isolation PASS. Types/production build PASS; default Vitest hits an existing billing alias-resolution failure, temporary external alias config passes176/176 without product/test-config edits. Screenshots and evidence: [Phase12 log](logs/phase-12.md#f12-fe01--home-blue-brain-glass-checkpoint). Unrelated couples edits/protected files preserved. Full F12-FE01 stays REWORK/unchecked; no new batch/final task commit.

CLIENT-INTEGRATION ordered Mezaj commerce (2026-10-20): explicit owner request extends same F12-FE01 sole /root write-set to commerce API/schema/migration/generated client/dashboard/app/tests. Freeze: four canonical codes damavi/safravi/balgami/sodavi, ordered 4×4 including repeats; admin-configured exact published MEZAJ version+band → collection, bounded active product membership and optimistic revisions; self-only audited recommendations from latest accessible valid result, no inference from titles/scores, no clinical scoring change or fabricated assignments. Preserve all existing storefront/profile/wallet work. Task REWORK until PostgreSQL/contract/consumer/browser gates pass.

Ordered Mezaj checkpoint review PASS:74 fresh/additive migrations,28 isolated PostgreSQL API cases/no schema drift, API/test and app/dashboard types, generated contract/client freshness/5 tests, app176 and dashboard152 tests, app46/dashboard32 production builds,14 general-store and6 personalization browser cases PASS. Final dashboard request-state/ref refinements pass targeted ESLint/types and2 desktop/mobile editor regressions; source references fetched in batches. Local sole pending migration deployed; live docs route present. No existing OpenAPI path/schema semantics changed. [Contract/operator setup](commerce-mezaj-v1.md), [finding dispositions](store-design-audit-2026-10-20.md), [evidence](logs/phase-12.md). Real product/source assignments remain intentionally empty for qualified configuration in the new Store tab; no clinical mappings seeded. Full F12-FE01 remains REWORK/unchecked for broader acceptance, no final task commit/new batch.

CLIENT-INTEGRATION full storefront (2026-10-20): owner goal authorizes completing store design/frontend end to end. Same F12-FE01 sole /root write-set extends all store routes/components and necessary shared AppShell/address presentation. Preserve existing edits, no fabricated commerce/clinical data, no schema/provider/financial-rule changes. Work covers audit06–20 and catalog→SKU→cart→delivery→payment/order UI; evidence required per route/state. Full goal active and F12-FE01 REWORK/unchecked.

CLIENT-INTEGRATION store first fixes (2026-10-20): owner authorizes initial audit fixes. Same F12-FE01 sole /root coordinator/writer; scope findings01–05: remove public test offers, guard catalog request ordering/paginate, shared validated delivery selection, native modal BottomSheet and notification wrapper migration. Shared modal consumers included for regression verification. Preserve current profile/wallet edits and protected files; no backend/API/schema/provider changes or real financial writes. Review gate PASS: types/170 tests/build and6 desktop/mobile E2E tests; findings01–05 fixed,06–20 pending. Evidence in store-design-audit-2026-10-20.md. Full task REWORK/unchecked, no final task commit.

CLIENT-INTEGRATION store design audit (2026-10-20): owner explicitly invokes5 design/UI skills for a complete store review. Read-only product-code audit complete:20 prioritized findings (5P1), live320/390/1280 and fully intercepted search/pagination/address/cart/checkout scenarios. Search stale-result overwrite, inaccessible remaining catalog, delivery-state mismatch and modal focus escape reproduced; fake-offer content/desktop width/font inconsistency documented. No purchase/payment/address write, code fix or commit. Existing profile/wallet edits preserved. [Full report](store-design-audit-2026-10-20.md); F12-FE01 remains REWORK/unchecked.

CLIENT-INTEGRATION wallet typography (2026-10-19): owner requests wallet cleanup/font selection. Same F12-FE01 /root wallet UI scope: IRANYekanX400/500 body, IRANSansFaNum400 balance/transaction amounts/topup input/presets, calmer white balance panel and compact hierarchy. Types/23 targeted wallet tests PASS; intercepted browser fonts/large BigInt exactness/320-1280 no overflow/input formatting PASS, no payment writes. Profile preview preserved. Full task REWORK/unchecked.

CLIENT-INTEGRATION profile font sizing (2026-10-19): owner rejects oversized/heavy Yekan preview. Same F12-FE01 profile-only scope: title18px, name16px, menu13px, percentage20px; replace bold/extrabold/semibold with true Medium500 and scope --font-weight-medium:500 because global Medium token was600. Browser computed sizes/500 and320/390/1280 no overflow PASS. Home/global tokens untouched. Full task REWORK/unchecked.

CLIENT-INTEGRATION profile font preview (2026-10-19): owner requests IRANYekanX only on /profile. Same F12-FE01 /root scope; reuse font-iranyekanx utility and remove profile percentage Digikala override. Intercepted browser confirms Yekan heading/menu, both400/500 faces loaded,320/390/1280 no overflow; Home computed family unchanged. No API/auth/other route font changes. Two-line presentation preview plus evidence uncommitted; full task REWORK/unchecked.

CLIENT-INTEGRATION commit handoff (2026-10-19): owner explicitly requested all remaining changes committed in separate related sections.13 implementation/config checkpoints plus documentation handoff; final combined31 files/165 tests and production build PASS, exact staged-path/diff gates PASS. All reviewable current changes are saved locally; full F12-FE01 remains REWORK/unchecked, no remote push/provider activation. Commit/file map and next action: [commit handoff](logs/client-integration-commits-2026-10-19.md). Earlier no-commit notes are historical and superseded by this owner request, not a change to the acceptance gate.

CLIENT-INTEGRATION loading simplification (2026-10-19): owner supersedes previous heart/copy loader. Same F12-FE01 /root scope: removed AppShell timed2.4s SplashScreen plus unused splash store state; pending session now only3 small brand-blue dots, accessible hidden label and reduced-motion. Auth/errors/retry unchanged. Types/7 session tests/build PASS; fully intercepted auth→profile-pending→profile→store confirms1 refresh/no branded splash/no second full-screen loader;503/retry PASS. Full task REWORK/unchecked.

CLIENT-INTEGRATION session presentation (2026-10-19): same F12-FE01 sole /root frontend scope. SessionGate checking/anonymous now has white loading view, heart icon/orbit and friendly Persian copy; real unavailable stays explicit with working retry, no indefinite spinner or auth-policy change. Typecheck and intercepted browser checking→503→retry→checking→503,320/390/1280 and reduced-motion PASS. Evidence: service-screens-verification.md. Full task remains REWORK/unchecked.

CLIENT-INTEGRATION product-rail arrows (2026-10-19): same F12-FE01 sole /root frontend scope. Shared StoreCollection now overlays44px native previous/next buttons at rail edges, only for directions with hidden content; preserves touch/mouse drag and cancels inertia on arrow navigation. Typecheck/diff and live320/390/1280 RTL start/middle/end/Enter/resize plus single-product no-overflow DOM scenario PASS. Evidence: service-screens-verification.md. Full task remains REWORK/unchecked; no final task commit.

CLIENT-INTEGRATION price-font preview (2026-10-19): same F12-FE01 sole /root frontend/assets scope. Downloaded three owner-supplied font URLs unchanged; self-hosted IRANSansFaNum is active for shared price components, IRANYekanX400/500 registered for later use. Browser FontFaceSet load/check all3 PASS; live320/390/1280 prices use requested family without overflow. No pricing/API change; full task remains REWORK/unchecked. Provenance/hashes: apps/app/public/fonts/README.md.

CLIENT-INTEGRATION store refinement (2026-10-19): same F12-FE01 owner/write-set; owner-supplied card structure and white app/catalog/gallery surfaces implemented. Types/165 tests/build PASS; browser320/390/1280 white surfaces/no overflow/44px favorite and detail navigation PASS. Catalog has only currentPriceToman; no invented discounts. Existing offer rail remains display-only TEST_OFFERS, not connected promotions. Evidence: service-screens-verification.md. Full integration stays REWORK; no final task commit.

- آخرین به‌رورسانی: `2026-10-20`
- Milestone فعال: `Milestone E — Phase 12 IN_PROGRESS`
- فاز فعال: `Phase 12 — Production Hardening`
- وضعیت فاز فعال: `IN_PROGRESS`
- batch فعال: CLIENT-INTEGRATION — REWORK; Home slice and targeted verification PASS 2026-10-19, full client acceptance pending; Codex /root sole writer/reviewer, no subagents.
- task فعال: F12-FE01 — Home and linked service-screen design, notifications and wallet clarification implemented. Latest app types/165 tests/build and scoped browser checks PASS. [Destination design evidence](service-screens-verification.md), [connection limitations](home-client-verification.md). Preserve unrelated .gitignore and protected slider-data.ts/justforcheck.md; full integration remains REWORK/unchecked, no final task commit/new batch.
- blocker فعال: `F12-T05 BLOCKED — Liara WAL/archive/restore capability evidence is absent.`؛ `F12-T07 BLOCKED — written Liara managed-secret-store/rotation capability evidence is absent.`

## Patient Journey continuous backend execution (2026-10-16)

ASSESSMENT-VERIFICATION (2026-10-19): owner explicitly requested functional checks of individual/couple assessments; this supersedes the earlier test deferral for this scope. Existing client tests/typecheck, read-only live browser checks, fully intercepted synthetic browser scenarios and real PostgreSQL isolated suites executed. Findings/evidence and exact next action: [assessment-verification](assessment-verification.md). Product source unchanged during review; no real patient write/payment/policy publication/provider/production change. Keep F12-FE01 REWORK and continue this batch only; no final task commit.



CLIENT-INTEGRATION Home guide refinement (2026-10-19): owner rejects the verbose service-process accordion. Remove it, use a direct services heading and a light onboarding action only when the actual initial profile is incomplete; no generic step card or fabricated completion. Same F12-FE01 Home/CSS write-set; types/diff/live390px and incomplete-to-complete browser fixture PASS. No broad test/build repeat; evidence Phase12 log. Full integration stays REWORK/unchecked.

CLIENT-INTEGRATION destination design (2026-10-19): owner authorizes completing user-facing design of Home destinations. Same sole /root F12-FE01 frontend write-set, shared patient service layout and primary assessment/couples/booking/program/appointments/treatment/chat/health-record/orders/articles routes plus relevant detail/header states. Preserve financial/consent/API authority and existing Store/Wallet design, no new dependencies/backend/schema/provider or patient writes. Design slice ready for owner review: app types/165 tests/final build and live/synthetic mobile/desktop navigation/error/populated states PASS. Exact scope: [service-screens-verification](service-screens-verification.md). Full F12-FE01 remains unchecked/REWORK, no final task commit.

CLIENT-INTEGRATION notification sheet (2026-10-19): owner requests Home notification controls open a bottom sheet. Same F12-FE01 frontend write-set; reuse notification center for page/sheet, native modal focus/Escape semantics and refresh unread indicator after successful read complete. Types/build/15 related tests and browser open/read/close/Escape/backdrop/drag/focus checks PASS. Full integration remains REWORK; evidence Phase12 log.

CLIENT-INTEGRATION notification fix (2026-10-19): owner-reported notifications crash caused by missing FINANCIAL category in frontend types/icon/setting labels. Same F12-FE01 frontend scope: shared exhaustive presentation plus runtime fallback, both notification pages and focused regressions complete.15 targeted tests/app types and7-category browser/read/preference scenarios PASS; evidence Phase12 log. No backend/schema/data/financial changes.

CLIENT-INTEGRATION wallet clarification (2026-10-19): owner-reported exact TOPUP payment investigated using read-only local DB lookup (browser tool has a different patient session). Existing TOPUP prohibition on spending the same wallet is correct; improve shared chooser explanation/units/recovery and retain a created top-up reference on gateway error. Same F12-FE01 frontend write-set; no financial/provider/database mutation. Focused18 tests/types/browser fixtures PASS; shared top-up explanation and failed-gateway intent reference fixed, wallet spending for service intents verified with intercepted requests. Evidence Phase12 log. No live financial action or final task commit.

CLIENT-INTEGRATION Home handoff (2026-10-19): Home redesign/real destinations/shared blue patient theme and prior assessment findings corrected. App typecheck,148 tests/28files,production build and targeted live/synthetic browser verification PASS. Exact backend connection matrix and limitations: [home-client-verification](home-client-verification.md). Couple policy still503 (unpublished policy); commercial catalogs empty; real bank and two-account live acceptance pending. Home slice ready for owner review, F12-FE01 remains REWORK/unchecked/no final commit; continue this batch only.

CLIENT-INTEGRATION handoff (2026-10-19): F12-FE01 IN_PROGRESS / implementation prepared for owner review, not accepted. Home/Journey, historical/revision-aware assessment wizard/result/guidance, paid individual purchases, independent couple linking/invitation/consent/shared purchase/joint education, ready/custom programs/care/delivery, shared digital payment routing, real security sessions, appointment-specific assessment sharing and chat appointment selection implemented. Existing onboarding/native clinical/tracking/Store bindings retained; legacy raw appointment/follow-up requests now use session-aware transport. Scope/routes/remaining acceptance: [client-integration](client-integration.md). No automated tests, browser, build, typecheck, live provider or DB operation run; no task commit/DONE. Next action: owner's interface review, then explicitly requested verification/fixes on this same task; do not start a new batch. Historical banner ownership released by already-present commit 7b7bd43.

CLIENT-INTEGRATION claim (2026-10-19): F12-FE01; baseline 7b7bd43; sole Codex /root coordinator/writer/reviewer, no subagents. Owner authorized continuing patient-client implementation across all sections before tests; automated/browser/build/typecheck verification deferred until owner review and subsequent instruction. Frozen inputs: existing checked-in OpenAPI and accepted Patient Journey/assessment/couple/program/wallet contracts. Own apps/app/src client/UI integration, plan/client-integration.md inventory, this STATUS, Phase12 checklist/log. No API/schema/generated contracts/dependencies/provider/deploy/persistent DB changes. Preserve pre-existing .gitignore change, slider-data.ts and justforcheck.md. Static source review during implementation; exact pending validation recorded, no final commit/DONE before acceptance. Prior STORE-BANNER-REVIEW implementation is now committed in 7b7bd43 (verified against Git history); its stale active ownership is released, without claiming new verification.

STORE-BANNER-REVIEW READY_FOR_REVIEW (2026-10-19): F12-T12-R13; baseline6ac21e8 unchanged; sole /root owner/reviewer; main review PASS. Fixed pre-commit R2 overwrite/deletion, missing durable orphan cleanup, stale concurrent mutation, arbitrary storage-key attachment/public read, post-I/O unpublication race, internal URL/null handling, stale-token fetch, unbounded Blob URL cache, upload confirmation/reselection, misleading customer preview and React/lint failures.76 focused tests/types/generated/targeted lint PASS; new localhost55419/store_banner_review_test clone only. All existing changes and corrections remain unstaged/uncommitted under explicit owner request. No new schema/migration/install/browser/live R2/provider/deploy/persistent DB change. Evidence Phase12 log; no new task started while this reviewed batch is held for owner review/commit instruction.

PJ-M01 DONE/review PASS/released (2026-10-18): F12-PJ-M01; sole /root owner/reviewer. Original 11-question/44-option owner CSV preset, 16 unreviewed educational profiles, bounded dimension draft storage and admin synthetic scoring preview; ties/insufficient evidence explicit.65 focused API/domain tests plus client5/API+test/app/dashboard types and generated contracts PASS. Actual PostgreSQL clone only; audit/locking/hash/roles/clinic/v1 regression and legacy-editor downgrade prevention verified. No patient/runtime/payment/schema/clinical release. Evidence Phase12 log; usage plan/mizaj-draft-preview.md. No next frozen/unblocked patient batch; separately define runtime/provenance/SQL/approval integration before patient use.

PJ-M01 CLAIMED (2026-10-18): F12-PJ-M01; baseline front@810e2a5; sole /root writer/reviewer. Dependencies R03/G01/R04 accepted. Own new assessments/domain dimension draft validator/scorer and candidate preset, narrow existing admin assessment service/controller/DTO/audit action, one stable API error, focused domain/actual HTTP tests and exact existing authoring clone guard, narrow CI test inclusion, official OpenAPI/client additive delta and scoped governance/usage/evidence. No schema/migration/patient engine/payment/protocol/source CSV mutation/actual medical approval/frontend/provider/persistent DB. Preserve existing Store/banner/media/.gitignore and generated deltas. Dedicated new disposable PostgreSQL clone only. Required bounded validation/ties/16-profile coverage/exact hash and state/roles/clinic/no answers stored/atomic audit/v1 regression/generated/types review before isolated task commit. Runtime dimension integration is separately scoped; no clinical validity or whole-product completion claim.

PJ-R04 DONE/review PASS/released (2026-10-18): F12-PJ-R04; sole /root owner/reviewer. Actual paid private-context leak reproduced; one SQL relation predicate aligns generic admin patient detail with accepted P02. Two new wallet/engine privacy cases;103 focused API6 files/types/OpenAPI PASS, evidence Phase12 log. Original/accepted/persistent DBs and unrelated user/banner/generated work preserved. No schema/API/default grant changes. Next safe step: actual qualified clinical/owner legal/retention/configuration release and controlled provider acceptance; no further scoped backend batch currently frozen/unblocked. Optional recommendation/result-review expansion needs a separate contract. No whole-backend/frontend/production acceptance claim.

PJ-R04 historical claim (accepted/released 2026-10-18): F12-PJ-R04; baseline front@16b7f70; sole /root writer/reviewer, no subagents. Frozen admin-paid-assessment-projection-v1; enforce existing P02 private-context exclusion, not a new permission policy. Own narrow patients/admin/admin-patients.service.ts assessment relation query, existing assessment-purchase.integration.spec.ts and couple-assessment-paid.integration.spec.ts focused actual-fixture assertions, exact auth-test-support disposable clone name and scoped plan/contract/evidence. New private_admin clone only, original/accepted/persistent DBs and unrelated banner source/generated work preserved. No schema/migration/endpoint/API/default grant/clinical/legal/frontend/provider/push/deploy. Required real wallet/engine individual stages+legacy canary/zero excluded-read audits/withdrawal, independent paid couple participants, own/explicit care/J02/admin/OpenAPI/types regression and main review before isolated commit.

PJ-J02 DONE/review PASS/released (2026-10-18): F12-PJ-J02; sole /root owner/reviewer. Exact native medical purpose/locale/clinic/current hash and transactional read/correction/consistent reporting;18 new PostgreSQL cases,87 distinct focused API11 files/types PASS, evidence Phase12 log. No schema/API/default permission change; unrelated user/banner work and accepted/persistent DBs preserved. Next: separately frozen R04 closes verified paid-context leak in legacy admin patient assessment projection under existing P02 privacy contract.

PJ-J02 historical claim (accepted/released 2026-10-18): F12-PJ-J02; baseline front@953cfb4; sole /root writer/reviewer, no subagents. Frozen admin-medical-consent-purpose-v1; technical correction of verified broad active-policy selectors. Own only patients/admin/admin-patients.service.ts, new scoped real PostgreSQL medical-purpose test, existing admin-patients.authorization.spec.ts mock seam if required, auth-test-support exact named clone, narrow CI test inclusion and scoped plan/contract/evidence. Reuse existing purpose/fa-IR/native consent, evaluation/canonical corrections/audit; no schema/migration/API/permission/default grant/frozen contract change, actual medical/legal data/frontend/live provider/persistent DB/push/deploy. New disposable medical_purpose test/regression clones only; preserve original/accepted proof DBs and unrelated Store/banner generated/source work. Required purpose/locale/clinic/current matching consent, reporting/native completion, current-policy/consent lock races, atomic audit, canonical replay/legacy/tests/types/main review before isolated task commit. No next batch before acceptance.

PJ-PG05 DONE/review PASS/released (2026-10-18): F12-PJ-PG05; sole /root owner/reviewer, no subagents. Shared custom payment and assigned reviewed native delivery;23 new PostgreSQL cases,251 distinct focused API16 files+client5/fresh73/populated132-table preservation/no drift/types PASS. Eight forward-only migrations66–73; real deferred-proof/deadlock/current-medical-policy regressions reproduced and fixed, evidence [Phase12 log](logs/phase-12.md#f12-pj-pg05--shared-paid-custom-right-and-assigned-reviewed-native-delivery). Original/accepted proof/persistent DBs and unrelated banner work preserved. Next: narrow separately frozen admin medical-purpose consent isolation. No whole-backend/clinical/legal/provider/frontend acceptance claim.

PJ-PG05 historical claim (accepted/released 2026-10-18): F12-PJ-PG05; baseline front@4e95ba2; sole /root writer/reviewer, no subagents. Frozen custom-program-native-delivery-v1/ADR-0034; PG01–PG04/shared billing/native clinical accepted. One inseparable financial/native-boundary batch. Own new programs/custom-delivery/** and clinical/custom-program-boundary helper; narrow existing program purchase service/target/module/DTO/readiness and custom request metadata/controller; native TreatmentPlan/Activity/Progress module/use-case bound-only access and task/reminder/audit seams; Home bounded custom metadata/action; Prisma one retained native-version binding/two optional ProgramPurchase FKs/narrow inverses/forward SQL, app/errors/CLI only if directly required, focused real DB/upgrade/CI/native/payment tests, generated API/client and scoped governance/evidence. Single writer shared schema/generated/new disposable clones; original and accepted proof DBs preserved; concurrent Store/banner/.gitignore changes preserved/excluded. Reuse exact request/care/intake/current assigned qualified physician, existing PROGRAM/free/wallet/server Verify/no ordinary refund/captured compensation and native plan/tasks/adherence/derived progress. No new engine/provider/permission/default grant/automatic therapy/actual clinical/legal data/frontend/live provider/persistent DB/push/deploy. Custom charge remains unavailable until all native generic read/write/issue/privacy/financial/SQL/audit/concurrency/legacy/fresh/populated/no-drift/generated/types/main-review gates pass. No next batch before accepted isolated commit.

PJ-PG04 DONE/review PASS/released (2026-10-18): F12-PJ-PG04; baseline front@aa6a46e; sole Codex /root owner/reviewer. Exact named custom request plus consecutive independently scoped care authority, generic consent/WalletCommand aliases/current directory/qualified physician/audit/limiter reused.21 new PostgreSQL cases;216 distinct focused API12 files+client5/fresh65/populated130-table preservation/no drift/official API and consumer types PASS. Actual malformed NULL final-withdrawal tuple reproduced, applied64 preserved and forward65 closes CHECK UNKNOWN. Original63 proof DBs/original60 preserved; new disposable clones only. No custom charge/chart access/native therapy/default grants/actual legal content/frontend/live provider/persistent DB/push/deploy. Existing Store/banner source and generated changes preserved and excluded from isolated PG04 commit. Evidence Phase12 log; next PG05 must protect bound native clinical paths before custom payment activation.

PJ-PG04 CLAIMED (2026-10-18): F12-PJ-PG04; baseline front@aa6a46e; sole Codex /root writer/reviewer, no subagents. Dependencies PG01/PG02/PG03/generic consent/directory accepted; frozen custom-program-request-care-v1/ADR-0033. Own new programs/custom-requests/**, two retained request/care authorization models/narrow inverses/forward migrations, exact-purpose consent CLI/test, app/errors, focused real DB/upgrade/CI and narrow existing test-safety helper allowlist, official API/client and scoped plan/evidence. Single writer schema/generated/new disposable clones; original patient_journey_test60 and current accepted PG03 proof DBs preserved. Reuse named real service/qualified physician/current independent patient/session/generic consent/WalletCommand/audit/limiter. No actual clinical/legal/default capability, medical intake/assessment data access, custom charge, native TreatmentPlan write, frontend/live provider/persistent DB/push/deploy. Required current source/identity/consent/hash/alias/retry/renewal/withdrawal/concurrency/SQL/audit/clock/fresh/populated/no drift/generated/types/main review before independent commit. Follow-up separately claims shared custom payment plus assigned native reviewed TreatmentPlan/tasks/progress delivery; backend source inspection verified existing native mutable/unbound read/write paths that must be protected for bound paid plans before charging.

PJ-PG03 DONE/review PASS/released (2026-10-18): F12-PJ-PG03; baseline front@5fe92e1; sole Codex /root owner/reviewer. READY_EDUCATION only: retained exact terms/purchase/one proved grant, PROGRAM shared free/wallet/server Verify, owned curriculum/period/receipt/Home and no ordinary refund.30 new real PostgreSQL cases plus typed effect case;222 distinct focused API16 files+client5/fresh63/populated128-table preservation/no drift/generated/API/test/consumer types PASS. Existing PG01 lock-race fixture clock corrected without changing assertions; actual audit UUID defect reproduced and forward62 fixed, forward63 exact quote/beneficiary guards. Original journey test DB60/persistent DB preserved; reviewer-required new disposable program/wallet clones only. Exact source/terms/identity/privacy/payment/compensation/audit/races/main review and evidence Phase12 log PASS. No actual clinical/legal/retention data/default capability/custom charge/clinical plan/frontend/live PSP/push/deploy. Unrelated .gitignore preserved/excluded. Next: separately freeze/claim assigned custom professional request and native TreatmentPlan preparation/qualified issue/progress with exact consent and shared payment; no second treatment/payment engine.

PJ-PG03 CLAIMED (2026-10-17): F12-PJ-PG03; baseline front@5fe92e1; sole Codex /root owner/reviewer, no subagents; unrelated .gitignore preserved/excluded. Accepted PG01/PG02/P01/shared wallet/provider software dependencies; actual owner no ordinary program refunds. Frozen ready-program-purchase-access-v1/ADR-0032. Own new programs/purchases/**, two retained models/narrow inverse/FK and additive forward billing constraints; narrow billing target reservation discriminant/create purpose-self/refund/view/filter DTO seams; current Home service/DTO bounded metadata/action; app/errors, focused actual DB/upgrade/CI and legacy target tests, official API/client and scoped governance/evidence. Single writer schema/generated/disposable DB. Reuse generic consent, free/wallet/server Verify, no new engine/permission or clinical record. READY_EDUCATION only; custom charge/delivery remains unsupported until separately accepted. No actual content/legal/retention data/default grant/frontend/live provider/persistent DB/push/deploy. Required identity/quote/terms/payment-to-one-grant/source/expiry/price replacement/no-refund/compensation/direct SQL/audit/fresh/populated/generated/types/old-target/Home/main review before independent commit.

PJ-PG02 DONE/review PASS/claim RELEASED (2026-10-17): F12-PJ-PG02; baseline front@bf5ee45; sole Codex /root owner/reviewer. One immutable ProgramOfferingPublication/migration60, exact clinical/terms references, real custom directory fee, explicit price/access/quote/retention configuration and owner-confirmed no ordinary refunds.18 new PostgreSQL+one CLI purpose case;144 focused API11 files+client5/freshness/build/API/test/consumer types PASS; fresh60/populated59-to60 all127-table preservation/current program and paid readability/no drift. CAS/replacement/final retirement/live identity/source/legal/fee races/audit rollback/clock/SQL/foreign scope/main review PASS; evidence Phase12 log. No patient purchase/entitlement/therapy/actual clinical or legal source/default grant/frontend/provider/persistent DB/push/deploy. Existing .gitignore excluded. Next: separately freeze/claim ready educational program purchase and owned access using existing wallet/server Verify; custom assigned delivery follows separately and must remain unavailable until implemented.

PJ-PG02 CLAIMED (2026-10-17): F12-PJ-PG02; baseline front@bf5ee45; sole Codex /root owner/reviewer, no subagents; unrelated .gitignore preserved/excluded. Dependencies accepted PG01/G01/current directory/owner consent release; owner explicitly no ordinary refund for ready/custom services. Frozen program-commercial-publication-v1/ADR-0031. Own new programs/publication/**, narrow existing ProgramDefinitionModule service export/limiter export if required, one ProgramOfferingPublication/narrow Prisma inverses/forward migration, exact-purpose CLI/test, app/errors, focused real DB/upgrade/CI checks, official API/client and scoped governance/evidence. Single writer schema/generated/disposable DB. No patient purchase/entitlement, payment/provider engine, patient treatment/record access, real clinical/legal/retention data/default grant/frontend/persistent DB/push/deploy. Required exact source/terms/custom price/current identity/canonical retry/consecutive CAS/retirement/immutability/audit/fresh/populated/no drift/generated/types/main review before isolated commit. Subsequent shared purchase/access and assigned custom delivery remain separate serialized tasks.

Owner decision (2026-10-17, explicit reply): ready paid programs and custom physician program services also have no ordinary refund after successful payment. Preserve existing duplicate/late/captured-unfulfillable financial compensation separately; do not infer service-delivery, clinical suitability or actual legal text from this decision.

PJ-PG01 DONE/review PASS/claim RELEASED (2026-10-17): F12-PJ-PG01; baseline front@af6d637; sole Codex /root owner/reviewer. One immutable ProgramDefinitionVersion/migration59, exact G01 sources/safety, real DoctorService clinical snapshot and qualified physician approval/final revocation.19 new actual PostgreSQL cases;127 focused API10 files+client5/freshness/build/API/test/consumer types PASS; fresh59/populated58-to59 all126-table row preservation/no drift. Real cross-clinic isolation, source-retirement lock race, SQL immutability/audit rollback/rate limit and application-clock skew proof; main review/evidence Phase12 log. No sale/patient program/automatic therapy/actual clinical or legal content/default grant/frontend/provider/persistent DB/push/deploy. Unrelated .gitignore excluded. Next: separately freeze/claim configurable immutable program commercial publication/access duration/exact owner-released terms; then shared financial entitlement and existing TreatmentPlan delivery as distinct scoped tasks. Owner explicitly confirmed no ordinary refund for paid ready/custom services.

PJ-PG01 CLAIMED (2026-10-17): F12-PJ-PG01; baseline front@af6d637; sole Codex /root owner/reviewer, no subagents; unrelated .gitignore preserved/excluded. Depends on accepted G01/G02/current directory/clinical. Frozen program-definition-v1/ADR-0030. Own new programs/definitions/**, one ProgramDefinitionVersion with narrow Prisma inverse relations/forward migration, app/error wiring, focused real DB/upgrade/CI tests, official API/client and scoped governance/evidence. Single writer schema/generated/disposable DB. Reuse G01 authority/safety/approved references and actual DoctorService; no change to frozen G01 patient access or existing TreatmentPlan, no commercial sale/patient data/payment/clinical algorithm/legal data/default capability/frontend/persistent DB/provider/push/deploy. Required real identity/review/source/safety/concurrency/immutability/audit/current dependency/fresh/populated/no drift/generated/types/main review before independent commit. Paid program publication/entitlement and assigned custom delivery remain later serialized batches with actual commercial/service policy release gates.

PJ-D02 DONE/review PASS/claim RELEASED (2026-10-17): F12-PJ-D02; baseline front@e19e64c; Codex /root sole owner/reviewer. Narrow assigned qualified physician worklist/context/start/complete, current live specialty and explicit DOCTOR VIEW/EDIT, existing SIGN qualification, atomic audit and shared doctor-to-appointment locking.14 new real PostgreSQL cases;142 distinct focused API12 files+client5/freshness/build/API/test/consumer types PASS; fresh58 replay/legacy appointment6/no drift, indexed EXPLAIN and main review/evidence Phase12 log. Pre-fix shared same-target retries/worklist omission/unpublished specialty cases reproduced and corrected. No schema/migration/default capability/medical source/frontend/provider/persistent DB/push/deploy. Existing .gitignore excluded. Next: separately freeze/claim reusable versioned ready-program/clinical service definition foundation before any paid program publication or personalized therapy activation; commercial delivery/refund terms remain actual owner-controlled release data.

PJ-D02 review addendum: real test reproduced a still-actionable ongoing visit omitted by the default startsAt lower bound. Owned scope includes frozen assigned-consultation-worklist-window-v1: default query also retains live operational visits by endsAt+4h; explicit from/to remains strict, no eligibility/time-window extension or new persistence.

PJ-D02 CLAIMED (2026-10-17): F12-PJ-D02; baseline front@e19e64c; unrelated .gitignore preserved/excluded; sole Codex /root coordinator/writer/reviewer. Dependencies D01/C04/current clinical/booking/chat accepted; frozen assigned-consultation-operations-v1/ADR-0029. Own new appointments/assigned/**, exact existing AdminAppointmentsService start/complete transaction-aware seams and doctor→appointment locking/re-read, existing module export, bounded ClinicalAccessAuditService.recordMany only, app/errors, focused real DB/CI tests, official generated API/client and scoped plan/contracts/ADR/evidence. Exclusive generated/test DB writer. Strict current assigned qualified DOCTOR plus existing VIEW/EDIT/SIGN, no default grant/APPOINTMENTS_MANAGE expansion/new model/booking/payment/session/chat engine/clinical review/actual medical/legal source/frontend/persistent DB/provider/push/deploy. Required own worklist/context/existing operator state→start/encounter→complete, privacy/full deny/window/current capability/assignment/transactional audit/old admin-vs-assigned concurrency/legacy billing/chat/D01/C04/contracts/types/main review before isolated task commit. Later clinical review/program/service rules and actual release gates remain separate.

PJ-D01 DONE/review PASS/claim RELEASED (2026-10-17): F12-PJ-D01; baseline front@8870377; Codex /root sole owner/reviewer, no subagents. One retained explicit own source/physician/appointment sharing ledger and final withdrawal/current qualified clinician educational summary, exact-purpose legal release opt-in, migrations57-58.19 new real PostgreSQL cases including actual paid couple nonpayer private care;135 distinct focused API11 files+client5/freshness/build/API/test/consumer types PASS; fresh58/populated56-to58 all124-table preservation/no drift, scoped EXPLAIN/main review/evidence Phase12 log. SQL NULL withdrawal-command defect reproduced before forward58 and fixed without rewriting applied57. No raw response/score/partner/joint disclosure, actual medical/legal/default capability/frontend/provider/persistent DB/push/deploy. Unrelated .gitignore excluded. Next: separately freeze/claim assigned-physician worklist/context and reuse existing start/end/encounter/text consultation lifecycle without blanket appointment management. Clinical review and program/service rules, real legal/clinical/provider release remain separate.

PJ-C04 review seam (2026-10-17): discovery gap found before acceptance. Existing patient catalog exposes active COUPLES tariff but C03 needs jointProtocolId/hash available only to privileged C02 APIs. Owned new paid/** scope now includes read-only patient couple-assessment-offerings/:publicationId via frozen additive couple-assessment-offering-discovery-v1; reuse existing publication/joint readiness and own age/current identity, no private pair definitions or consent/entitlement mutation. Existing frozen contracts remain unchanged.

PJ-C04 DONE/review PASS/claim RELEASED (2026-10-17): F12-PJ-C04; baseline front@d1edf53; Codex /root sole owner/reviewer, no subagents. Existing shared ASSESSMENT wallet/server Verify now atomically backs two independent engine grants and one retained mutually authorized approved joint education. Safe patient catalog discovery, own-only receipts/Home/paid resume and current clinical/consent privacy boundaries; migrations54-56.30 new real PostgreSQL cases;332 distinct focused API24 files+client5/freshness/build/API/test/consumer types PASS; fresh56/populated53-to56 all123-table preservation/no drift, scoped indexed EXPLAIN and main review/evidence Phase12 log. No actual clinical/legal/permission data seeded or frontend/live PSP/persistent DB/push/deploy. Unrelated .gitignore Archive addition excluded. Next: separately freeze/claim explicit patient-authorized assessment summaries for the assigned clinician/appointment; clinical result review and program/service rules remain separate. Full backend and provider production acceptance not declared complete.

PJ-C03 DONE/review PASS/claim RELEASED (2026-10-17): F12-PJ-C03; baseline front@b86a501; unrelated .gitignore Archive addition preserved/excluded. Codex /root single owner/coordinator/reviewer; frozen couple-assessment-participation-v1/ADR-0026. Immutable exact context and two participant models/migration53; C01 independently linked adult identities, C02/O03 exact approved configuration, own existing P02 processing acceptance plus pair-specific joint disclosure; final context withdrawal/derived readiness, no implicit old-consent revival. Five self operations/four paths, minimized own/partner status projections, current identity/age/clinic/session and atomic audit; existing limiter/module reuse.16 new real PostgreSQL cases;115 distinct focused API7 files plus client5/freshness/build/types/consumer types PASS; fresh53/populated52-to53 all121-table preservation/no drift. Main review/staged gate, evidence Phase12 log. No charge/grant/private answers/shared result generation/actual medical/legal content/frontend/live provider/persistent DB/push/deploy; C01 and P02 frozen behavior retained. Next candidate: separately freeze/claim shared ASSESSMENT couples purchase, exact two beneficiary proofs, existing individual engine and mutually authorized persisted joint education. Actual clinical/legal/retention/provider acceptance remains external.

PJ-C02 DONE/review PASS/claim RELEASED (2026-10-17): F12-PJ-C02; baseline front@a1de43e; unrelated .gitignore Archive addition preserved/excluded; single Codex /root owner/coordinator/reviewer. Frozen couple-result-protocol-v1/readiness addendum/ADR-0025. Retained CoupleResultProtocolVersion/migration52; exact O02 source/review and owner-managed COUPLES_RESULT_SHARING disclosure, complete physician-curated unordered band-pair mapping to approved G01 education, versioned technical lookup/no fabricated clinical algorithm. Eight administrative/physician paths, strict live same-clinic authority/session, immutable drafts/qualified approval/final revocation, bounded history and fail-closed exact readiness/no old fallback.15 new real PostgreSQL cases;129 focused API8 files plus client5/freshness/build/types/consumer types, fresh52/populated51-to52 all120-table row preservation/no drift PASS. Main review/staged gate, evidence Phase12 log. No actual medical/legal mappings seeded, patient answers/checkout/new engine/provider/frontend/persistent DB/push/deploy. Next: independently consented pair-specific participation session using accepted C01 identities and exact C02/O03 source; then separate shared two-beneficiary financial/access integration. Existing individual checkout remains unchanged and couples checkout remains unsupported until those tasks pass.

PJ-P02 DONE/review PASS/claim RELEASED (2026-10-17): F12-PJ-P02; baseline front@ea263af clean; single Codex /root coordinator/owner/reviewer. Frozen assessment-purchase-access-v1/privacy-retirement addendum/ADR-0024. Two retained purchase/grant models and forward migrations50/51; shared ASSESSMENT BillingTarget/consents/immutable tariff and actual wallet/server-verified bank proof; one owned engine attempt; all result/history/Mezaj/guidance/Home/booking privacy boundaries; legacy null contexts preserved and no future commercial free bypass. No ordinary digital refund/cancellation; independent Store/appointment intact, captured-unfulfillable compensation separate. Verification PASS:23 new real PostgreSQL purchase cases;306 distinct focused API tests28 files plus client5/freshness/build, API/test and App/Dashboard/Web types; fresh51/populated49-to50-to51 preservation/no drift; indexed scoped EXPLAIN; main review/staged gate. Review reproduced/fixed unfinished withdrawn attempt409, paid attempt deletion reset, and legacy resume/publication lock inversion; metadata retained, no applied migration rewritten. API268 paths, all260 retained,259 unchanged path definitions plus additive admin billing purpose enum. Graphify8785 nodes/24072 edges. Evidence phase-12 log. Unrelated .gitignore Archive addition preserved/excluded. No couples checkout/actual medical or legal content/real grant/frontend/live provider/persistent migration/push/deploy. Next candidate: exact physician-approved versioned joint-result protocol and mutual disclosure prerequisite, then separately claim paid couple participation using existing individual engine/shared billing. Actual clinical/legal/retention/provider acceptance stays an external release gate.

PJ-P02 scoped review extension: existing O02 internal clinical-authority locking seam is shared rather than duplicated. New assessment-purchase-privacy-retirement-v1 addendum retains/invalidates unfinished bound attempts atomically with final privacy withdrawal, following a real pre-fix409 reproduction; paid-attempt deletion also blocked so one-grant consumption cannot be reset. Applied migration50 remains unchanged; forward SQL-only51 owns this guard refinement. No new permission/purchase refund/clinical algorithm or legacy null-context behavior introduced.

PJ-O03 DONE/review PASS/claim RELEASED (2026-10-17); F12-PJ-O03; baseline front@4ae6818 clean; Codex /root single owner/coordinator/reviewer. Frozen assessment-commercial-publication-v1/ADR-0023. One retained commercial publication/migration49 references exact configurable O01 draft, qualified O02 protocol, owner-controlled ASSESSMENT_PURCHASE_TERMS and fixed PRE_START/min18/no ordinary refund/cancellation/nonexpiry decisions. Five admin operations/four new paths; price replacement atomically retires old tariff, never overwrites it; explicit final retirement and no old fallback. Old draft contract remains unchanged. Verification PASS:18 new real PostgreSQL cases;227 distinct scoped API cases19 files (one direct-SQL fixture timestamp corrected for observed host/database clock skew, affected18 rerun PASS),client5/freshness/build and API/test/consumer types;fresh49/populated48-to49 all-legacy preservation/no drift;indexed EXPLAIN;main review/staged check. Graphify local AST refresh8647 nodes/23533 edges, existing parser warnings unchanged. Evidence phase-12 log. No patient checkout/entitlement activation, actual clinical/legal text/real grant/frontend/provider/persistent DB/push/deploy. Next candidate: shared BillingIntent assessment purchase/access grants and all result-route checks, preserving old free attempts and Store/appointment behavior; couples checkout separately gated by mutual consent/joint rules.

PJ-O02 DONE/review PASS/claim RELEASED (2026-10-17): F12-PJ-O02; baseline front@76cd380 clean; Codex /root single coordinator/owner/reviewer. Frozen assessment-protocol-review-v1/ADR-0022. One retained append-only exact questionnaire/scoring/ASSESSMENT_PROCESSING consent physician review ledger, seven operations/six new paths, bounded nonpatient source preview/queue/history; explicit withdrawal/review revision/idempotency and current physician authority. Reused G01 authority/SQL, existing engine and unchanged canonical authoring hash. No offering/payment activation or actual clinical/legal text seeded. Verification PASS:19 new PostgreSQL cases;200 focused tests17 files plus8 OpenAPI=208 distinct API tests;client5/freshness/build and API/test/App/Dashboard/Web types;fresh48 replay/populated47-to48 all-legacy preservation/no schema drift; indexed latest-review EXPLAIN; main review/staged check. Dedicated CI port aligned to existing isolated test guards, new suite added; hosted CI not executed locally. Graphify update now succeeded (8554 nodes/23245 edges), superseding earlier launcher limitation for this run; SQL/HCL parser dependencies absent and one existing chat extraction warning, no packages installed. Evidence phase-12 log. Next prerequisite is configurable commercial publication referencing exact draft/protocol/consent, then shared assessment purchase/entitlement and all result-route enforcement under separate claims. Owner decisions PRE_START/no ordinary refunds/min18/no invitation expiry preserved; actual source/legal/retention/joint algorithm remain release data gates.

Owner digital assessment decisions (2026-10-17): successful assessment purchases have no ordinary refunds/cancellation; payment is before starting; results remain stored in the owning account with approved relevant recommendations. Individual/couples assessment prices must be configurable via dashboard administrative APIs, never fixed/hardcoded; preserve per-purchase tariff snapshots when later configurations change. Do not alter independent Store/appointment refund policies or conflate duplicate/late verified financial compensation with an ordinary assessment refund. Digital purchase/release contracts must enforce PRE_START, no ordinary assessment refund and configurable versioned price. Existing legacy free assessments retain their frozen behavior until explicitly scoped digital contexts exist.

PJ-P01 DONE/review PASS/claim RELEASED (2026-10-17); F12-PJ-P01; baseline front@50b3d57 clean; Codex /root single coordinator/owner/reviewer. Frozen billing-target-effects-v1/ADR-0017. Replaced bare reserve/settle IDs with explicit domain effects, strict purpose/UUID projection and explicit prepared columns; existing order/appointment adapters and free/wallet/verified gateway dispatcher updated. Verification PASS:15 real PostgreSQL wallet cases (including new cross-domain rollback/retry and free fulfillment),9 effect cases +28 provider/credential/OpenAPI cases=52 API tests; client5/freshness and API/test types PASS, main review/staged check PASS. No schema/migration/wire/generated/frontend/provider changes; no digital entitlement activation. Evidence phase-12 log. Disposable wallet_test added inside task-owned container; persistent DB untouched. Owner confirmed configurable administrative prices, PRE_START and no ordinary assessment refunds; independent Store/appointment rules remain unchanged. Next prerequisite is qualified review of exact questionnaire/scoring/assessment-processing consent before new paid offering publication, then digital purchase/entitlement/result access enforcement. Existing clinical source data/legal text still supplied by owner, not invented.

PJ-G02 DONE/review PASS/claim RELEASED (2026-10-17); F12-PJ-G02; baseline front@6769078 clean; Codex /root single coordinator/owner/reviewer. Frozen assessment-guidance-v1/ADR-0021. One retained mapping model/migration47, nine APIs, exact questionnaire/hash/band/technical WEIGHTED_SUM identity, ordered approved content and semantic service references; qualified physician approval/final revocation. Own completed patient delivery rejects missing/inconsistent provenance, requiresReview, revoked latest mapping or changed/unavailable dependencies without older fallback; no private answers/score queried or emitted. Reused G01 authority/projections and existing directory visibility/clinical audit. Verification PASS:18 new PostgreSQL cases;187 distinct focused API tests18 files +client5; fresh47/all-populated-legacy preservation/no drift; API/test/client/consumer types; official250-path contracts, all241 old path definitions unchanged; staged whitespace/main review PASS. Evidence phase-12 log. No real clinical content/mappings/grants seeded, scoring/new policy/provider/frontend/persistent DB unchanged. Technical metadata is not scientific validation; new paid publication must add entitlement checks to this route as well as all other result routes. Next candidate: existing shared BillingTarget typed financial effects and digital entitlement extension, with its own contract/claim; no new provider or payment engine. Disposable DB remains task-owned.

PJ-G01 DONE/review PASS/claim RELEASED (2026-10-17); F12-PJ-G01; baseline front@bf64ace clean; Codex /root single coordinator/owner/reviewer. Owner explicitly approved linked active same-clinic physician plus existing clinical-sign permission; ordinary ADMIN cannot approve. Frozen guidance-content-v1/ADR-0021. One retained immutable Article-derived model (migration46), nine admin/physician/self-patient APIs, provenance/safety/hash-bound approval and final revocation. No real health content or grants seeded; old Article publication unchanged and never medical approval. Verification PASS: 18 new PostgreSQL cases;167 distinct focused API tests plus client5, fresh46/45→46 populated all-legacy-table preservation/no drift, API/test/client/consumer types, official241-path contracts (all232 prior retained), main-agent scoped review. Evidence phase-12 log. No live provider/persistent DB/frontend/production acceptance. Earlier generation was temporarily denied because approval-review usage quota was unavailable; resumed with fresh approved execution after explicit user continuation, no bypass. Next eligible candidate: separately freeze/claim exact result-band-to-approved-content/service mapping and patient delivery; technical WEIGHTED_SUM provenance is not clinical validity, actual content/taxonomy/legal/refund/retention remain release gates. Disposable DB remains task-owned.

PJ-C01 pre-release review addendum frozen: couple-account-link-privacy-v1. Registered-phone-only routing would disclose membership through201/422; require the recipient's privately shared existing patient-profile address as well as normalized phone, retain independent authentication+secret acceptance, and redact the address. No public contact lookup/new identity engine. This is part of the same uncommitted C01 privacy acceptance, not a new task or modification of a frozen base contract.

PJ-C01 DONE/review PASS/claim RELEASED; F12-PJ-C01; baseline front@b8cb39d clean; Codex /root single coordinator/owner/reviewer. ADR-0020/couple-account-link-v1 plus frozen pre-release privacy addendum. Delivered three same-clinic link/invitation/consent models (migration45), eight self APIs, explicit independent adult consent and intended-recipient auth, one-time hashed secret/no automatic expiry, final privacy withdrawal and bounded Journey references. Recipient must share its existing profile routing address plus phone; no phone-only membership lookup. No answers/results/entitlement/payment granted; assessmentReady=false. Verification PASS: 21 new PostgreSQL couple cases + prior106 + consent CLI4/security9 =140 API tests, client5; fresh45 replay/44→45 populated legacy preservation, no drift, all225 prior paths plus7 (eight operations), API/test/client/consumer types/freshness and main-agent review. Resolved clock rollback blocking withdrawal with monotonic evidence timestamp and recipient-phone enumeration before release; no migration rewrite. Evidence phase-12 log. Actual owner legal policy not seeded/published; registered-recipient-only and no frontend remain explicit. Disposable DB remains task-owned; persistent/providers unchanged. Next independent scope: versioned educational guidance snapshots/mappings using existing content; proposed qualified reviewer boundary (linked active doctor, clinic scope, existing clinical-sign permission; no ordinary ADMIN approval) is pending owner reply, so approval activation must await that reply. No scientific/clinical definition inferred.

Owner policy decisions received: minimum participant age18; invitations must not automatically expire and remain usable until explicit authenticated acceptance (opening/prefetching a link is not acceptance); purchase cancellation disabled for now. Consent withdrawal/data-access revocation remains separate from purchase cancellation. No blanket refund-denial or scientific algorithm approval is inferred. Next couples identity/invitation foundation must enforce these choices; actual questionnaire/joint algorithm, qualified health content, consent text, refund exceptions/retention remain undefined.

PJ-R03 DONE/review PASS/claim RELEASED; F12-PJ-R03; Codex /root single coordinator/owner/reviewer; baseline front@a8ccc44 clean. Contract assessment-authoring-reliability-v1. Three defects reproduced before fix: unscorable boolean accepted201; eight concurrent creates yielded500 conflicts; audit failure left a persisted draft. Corrected structural scoring validation, consecutive version allocation, row-locked partial/state edits and atomic changed-write audit. Verification PASS: 106 focused API tests (11 new PostgreSQL authoring, 18 validator, 5 existing admin, 72 current assessment/journey/offerings), client5, API/test types, official unchanged225-path export/client freshness and main-agent scoped review. No schema/migration, permissions, scoring semantics, billing, frontend or historical-contract change. Evidence phase-12 log. Next: couple account-link/invitation/consent foundation with approved age18/nonexpiring invitations; paid assessment access, actual clinical algorithms/content and retention/refund exceptions stay separate gates. Disposable database remains task-owned for continued verification.

PJ-O01 DONE/review PASS/claim RELEASED; F12-PJ-O01; baseline front@374394d clean; Codex /root coordinator/owner/reviewer, one agent. ADR-0019 / frozen assessment-offering-drafts-v1. Append-only individual/couples commercial draft versions, immutable questionnaire references, integer prices/payment points, policy configuration and explicit missing release gates. Publication is denied at database/API; no clinical/commercial rule invented. Owned schema/new migration44, new offerings Nest module/wiring/errors, focused offering/upgrade/CI tests, pinned historical R01 upgrade proof, official contracts and scoped plan/evidence. Verification PASS: offering12 plus focused assessment/journey60 =72 API tests; client5; clean44 replay, legacy43→44 populated patient/result/billing/order/wallet preservation, no schema drift, originalR01 upgrade43, API/test/client/consumer types and path preservation (221 existing +4). Scoped main-agent review PASS; evidence phase-12 log. Persistent DB/provider/frontend unchanged; disposable container remains task-owned. Next independent candidate: technical assessment-authoring validation/concurrency/audit correction; digital entitlement/couples/guidance activation still requires actual policy/clinical definitions, requested asynchronously without stopping independent work.

PJ-R02: F12-PJ-R02 DONE/review PASS/claim RELEASED; Codex /root coordinator/owner/reviewer, one agent; baseline front@79badad clean. Dependencies R01/J01 DONE. Frozen additive contract assessment-discovery-v1. Preserved existing owned historic get/save/submit behavior; added missing questionnaire retrieval/discovery and explicit technical provenance, no clinical retirement/eligibility policy change. Owned: assessment patient service/controller/DTO/audit/scoring identity; journey resume projection/test; discovery PostgreSQL tests and CI; official generated contracts; scoped plan/evidence. No schema/migration, frontend, billing or role changes. Verification PASS: 60 focused API tests (10 new discovery, 13 journey, 21 reliability, 3 scoring, 5 assessment authorization, 8 eligibility), client5; API/test/client/consumer types and generated freshness; 218 old API paths preserved plus3. Main-agent scoped review PASS; evidence phase-12 log. Disposable DB remains task-owned for subsequent serialized checks. Next candidate F12-PJ-O01 configurable offering/version/release-readiness foundation; actual price, age, algorithms, clinical review/retention/refund rules remain owner decisions and new publication must fail closed.

Owner explicitly requested nonstop implementation of the remaining backend. This supersedes the prior stop-after-task boundary for this track; tasks remain serialized, independently verified/reviewed/documented/committed. No frontend, production release, live provider or persistent database migration authorization is inferred. Clinical questionnaire weights, result taxonomy and approved content remain undefined; owner described roughly 10–15 questions and possible mixed temperaments, not an approved algorithm. Infrastructure may proceed with new clinical release disabled.

Batch PJ-J01; task F12-PJ-J01; DONE/review PASS/claim RELEASED; coordinator/owner/reviewer Codex /root; one agent; baseline front@82fa9c4, clean. Contract: patient-journey-v1; dependencies R01 and accepted onboarding/booking/billing/clinical modules. Delivered bounded self-only derived Home/Next Action API, repeatable-read composition and atomic sensitive audit, no state table or new clinical/payment rules. Owned paths: new patients/journey module; SelfProfileService and PatientBookingEligibilityService transaction-aware read seams; app.module.ts; focused journey PostgreSQL tests and CI invocation; official generated OpenAPI/client; scoped plan/contract/checklist/log. Prisma schema/migrations and frontend unchanged. Verification: 45 distinct focused API tests (13 new journey, 21 reliability, 8 eligibility, 3 self-profile), client5; API/test/client/consumer types and generated freshness PASS; 217 old paths preserved, one new. Main-agent scoped review PASS; no claim of full clinical/product acceptance. Disposable PostgreSQL remains task-owned for the next serialized verification; persistent DB unchanged. Graphify launcher still fails before execution. Next candidate R02 owned attempt discovery/historical questionnaire/provenance using preserved existing submission behavior, then inactive offerings/clinical release foundation; normal freeze/claim before edits.

## Patient Journey backend — R01 accepted handoff (2026-10-16)

Authority: owner explicitly requested backend implementation after reviewing the patient journey report and comprehensive requirements. The backend-first instruction overrides frontend delivery for this scoped task; whole-product acceptance remains separate. Baseline: front@ebbb2b3, clean working tree. Phase 12 remains active; no closed phase is reopened.

Batch: PJ-R01; Task: F12-PJ-R01; DONE; claim RELEASED; owner/coordinator/reviewer Codex /root; one agent.
Contract baseline: ADR-0018 and assessment-reliability-v1 additive extension; frozen assessment-booking-v1 remains unchanged.
Dependencies: accepted Phase 03/08 assessment persistence and API, existing identity/session and Phase 12 test infrastructure; no clinical/provider decision required for this technical correction.
Owned paths: assessment patient service/controller/DTO and audit action constants; PatientAssessmentSubmission revision field and one new migration; shared error-code allowlist; directly affected assessment tests and new isolated PostgreSQL reliability/upgrade tests; dedicated isolated test step in existing CI; generated OpenAPI/client via official commands; this status, Phase12 checklist/log, new scoped ADR/contract and patient-journey-backend task map.
Exclusive resources: Prisma/schema/migration, generated OpenAPI/client and disposable PostgreSQL, all single writer. No frontend, billing/provider, lockfile or historical contract writes.
Verification PASS: three pre-fix defects reproduced; 78 distinct focused API tests (including 21 isolated PostgreSQL reliability cases) and 5 client tests; 43-migration fresh replay/legacy upgrade/duplicate-active refusal and no schema drift; API/test/client/app/dashboard/web types and generated-contract freshness; main-agent diff/security review. All 217 previous API paths retained. Temporary PostgreSQL removed; persistent DB unchanged.
Evidence: [Phase12 log](logs/phase-12.md#f12-pj-r01--assessment-concurrency-revisions-and-transactional-audit). Legacy revision omission remains serialized last-write-wins; new clients must send expectedRevision for stale-edit protection. Migration must precede runtime activation and refuses existing duplicate active attempts for reviewed resolution. Graphify update remains blocked by the existing uv launcher failure.
Next candidate: F12-PJ-J01 derived journey API after normal additive DTO/action-contract freeze and claim, within the existing owner implementation authorization. No next task started, honoring the per-task execution boundary. Historical questionnaire resume/review, offerings, couples, guidance and programs are not completed by R01; clinical/product decisions stay explicit.

## Wallet backend — accepted handoff (2026-10-16)

Batch: WAL-BE01; Task: F12-WAL-BE01; Coordinator/owner/reviewer: Codex /root; DONE, claim RELEASED.
Baseline: front@06780a1; pre-existing frontend edits and proposal preserved. Contract: ADR-0017 and wallet-billing-v1.
Owner request explicitly covers all backend scope; staged frontend tasks are not started.
Owned paths: new billing module; Prisma/schema/new migrations/development-admin seed; directly related commerce payment/order/inventory/reporting adapters; appointments and scheduling payment/capacity seams; common auth/errors, configuration; outbox financial handler; API wiring; focused API tests and isolated wallet CI step; generated OpenAPI/client; plan governance/evidence.
Exclusive: Prisma, OpenAPI/client, auth and disposable PostgreSQL, all single writer. No user frontend edits, persistent DB migration, secrets, live PSP, push or deploy.
Verification PASS: 42-migration replay/legacy financial upgrade, no schema drift; 70 distinct API tests + 5 client tests; API/test/client/app/dashboard/web typechecks; contract freshness, unchanged old API paths, source review and scoped diff check. Disposable PostgreSQL removed; persistent database unchanged. Graphify launcher remains unavailable.
Evidence: [Phase 12 log](logs/phase-12.md#f12-wal-be01--shared-wallet-and-prepaid-booking-backend). [Exact API/UI/rollout handoff](contracts/wallet-backend-handoff.md).
Next eligible wallet work: patient and dashboard integration against the frozen contract, including the result page and prepaid booking flow, under a separate frontend claim. No next task started; backend completion never marks UI, real PSP acceptance or production readiness done.

## Product Details B1B — independent review corrections accepted (2026-10-14)

`F12-PD-B1B-R1 DONE`; batch `PD-B1B-R1` claim RELEASED; owner/coordinator/reviewer Codex /root;
one agent; baseline front@8ebfdbe, initially clean. Explicit owner continuation covered only conflict
auto-rebase and unsaved-draft loss during token refresh. Both reproduced before application edits.
Review PASS WITH FIXES: 409 keeps the old draft/revision and gates save/approve until confirmed
replacement with current server content; token rotation preserves the draft, product/account keys
isolate editors and existing session/permission enforcement stays authoritative.
6 mocked desktop/mobile browser tests, 10 focused unit tests, dashboard typecheck and scoped lint PASS.
[Evidence and limitations](logs/phase-12.md#f12-pd-b1b-r1--focused-conflict-and-session-review-corrections).
No backend/schema/DB/generated-client/frozen-contract changes, real backend acceptance, push or deploy.
Next action is separately authorized real B1B local acceptance after its database prerequisite; this
review did not apply migrations. B1C/B2 NOT started; no automatic next batch.

## Product Details V1 — B1A backend accepted (2026-10-14)

`F12-PD-B1A DONE`; `PD-B1A` claim RELEASED; coordinator/owner/reviewer Codex /root; one agent.
Authority: separate owner B1A instruction, G01/e681517, ADR-0016 and frozen content contract 1.0.
Backend content/provenance/revision/explicit approval, legacy preservation, public projection and
generated OpenAPI/client accepted. Evidence and exact editor handoff:
[B1A](logs/phase-12.md#f12-pd-b1a--product-content-backend-foundation).
37-migration clean replay/legacy upgrade, 62 focused API tests, 5 client tests, schema drift/API/test/
client/consumer typechecks PASS. Temporary PostgreSQL removed; persistent DB not migrated.
Next eligible candidate: `F12-PD-B1B`, Dashboard Content Editor, requires its own start instruction
and fresh normal claim. No B1B/B1C/B2 started; no frontend/source-media/checkout/production changes.
Graphify update was attempted but the pre-existing uv trampoline is unavailable; API/client freshness passed.

## Product Details V1 — governance accepted (2026-10-14)

`F12-PD-G01 DONE`; documentation-only claim RELEASED; coordinator/reviewer Codex /root.
Authority/rationale: [ADR-0016](decisions/ADR-0016-store-product-details-v1.md).
[Version 1.0 contract](contracts/store-product-details-v1.md) freezes B1 revision-bound admin approval,
legacy visibility and API compatibility; B2 architecture/order integrity gates are accepted but initial
category definitions and its wire appendix remain owner decisions. [Phase 12 task map](phases/12-PRODUCTION-HARDENING.md#product-details-v1--approved-governance-and-planned-batches-2026-10-14);
evidence: [G01](logs/phase-12.md#f12-pd-g01--product-details-v1-architecture-approval-and-governance).
G01 approval alone did not start implementation; the separate accepted B1A instruction above controls.
B1B depends on accepted B1A; B1C on B1A/B1B; B2 on B1C plus explicit owner definitions/frozen appendix.
Closed Phase 09, initial-release/media contracts and independent production blockers are unchanged.

## Local R2 acceptance — F12-MEDIA-S01 closed

F12-T06-S1 DONE; owner/coordinator/reviewer Codex /root; claim RELEASED 2026-10-14 after local real-storage acceptance and review. One agent; explicit product-owner development-only approval; dependencies R1 (44d472e), R2 (e49e615), frozen wire contract unchanged. Independent production blockers remain intact.
Real Dashboard/Uppy → NestJS → disposable PostgreSQL → dev-sabz upload, authenticated/public eligibility, replace/remove, ETag, same-key replay, interrupted-response recovery, invalid-file and ownership checks PASS. Three task objects deleted by normal outbox; six cleanup jobs DELIVERED; temporary database/configuration/fixtures removed; owned services stopped. Original persistent database remains at35 migrations without media migration. Evidence: [phase-12 log](logs/phase-12.md#f12-t06-s1--local-real-r2-product-media-acceptance).
Only governance/evidence files changed; no runtime fixes, schema/wire/source changes, bucket-setting changes or deployment. Privacy controls are owner-attested disabled; unsigned S3 returned400 InvalidArgument, not a claimed403/control-plane audit. Windows Sharp verified; Linux/container, exclusive IAM-policy inspection and production approval remain separate. Next Store slice Phase04C requires separate instruction/claim; not started.

## Store media dashboard handoff — F12-MEDIA-B01B closed

F12-T06-R2 DONE; coordinator/reviewer Codex /root; claim RELEASED 2026-10-14 after review and dashboard acceptance. Explicit Phase04B product-owner approval; dependency F12-T06-R1 DONE (44d472e); frozen backend contract unchanged.
Evidence, version pins and exact Phase04C handoff: [phase-12 log](logs/phase-12.md#f12-t06-r2--dashboard-product-image-uploader).
Next Store slice: Phase04C / Batch01C customer image integration, requires its separate instruction/claim; not started. No active media paths claimed. No live R2, backend/schema/customer source changes, production activation or deployment. Historical initial-release envelope and independent Phase12 blockers remain unchanged.

## Store media handoff — F12-MEDIA-B01A closed

F12-T06-R1 DONE; coordinator/reviewer Codex /root; claim RELEASED 2026-10-14 after backend acceptance and review. Evidence and exact Batch 01B handoff: [phase-12 log](logs/phase-12.md#f12-t06-r1--store-product-media-backend-foundation).
Authority: [ADR-0015](decisions/ADR-0015-store-product-media-development.md); [frozen development contract](contracts/store-product-media-v1.md). Historical F12-T06 initial-release N/A, Phase12 state and independent blockers remain unchanged.
Backend handoff superseded by the accepted dashboard F12-T06-R2 handoff above. Phase04C, live R2, production activation and deployment are not authorized by either completed slice. No backend media paths remain claimed.

## Current Patient UI workspace — owner override 2026-10-13

Active checkout: X:/Git/mushroom; implementation branch: front, based on dev 2bb6f8f and retaining PUI-T01 0a99208 and PUI-T02 2e4e2b0. Previous worktree and port notes below are historical and superseded.
Authoritative coordination: this checkout's plan/STATUS.md; independent scope: plan/patient-ui.md. No cross-worktree claim procedure is needed for the current single-checkout UI work. Existing eligibility/review/commit gates remain mandatory. No active UI batch; no next task started.
No dev merge/push; dev reference remains unchanged. Services are stopped. X:/Git/mushroom-patient-ui is inactive and preserved with its existing uncommitted changes; do not execute or implement there.

## Patient UI coordination — PUI-B01 closed

PUI-T01 DONE; PUI-B01 DONE; claim RELEASED on 2026-10-13 after coordinator review and task commit.
Owner/reviewer: Codex /root — Mushroom Patient App UI conversation.
Independent plan/evidence: X:/Git/mushroom-patient-ui/plan/patient-ui.md and plan/logs/patient-ui.md.
Implementation: feat/patient-app-ui; commit 0a99208e57d7d01811b8a990548d5dc947f2810d — feat(PUI-T01): implement patient foundations and Store catalog.
Verification: app typecheck, 59 tests, staged diff check, actual local API catalog and Playwright mobile/desktop/RTL/font/keyboard/recovery passed. Purchase mutations/payments and complete checkout journey not verified.
No active Patient UI paths remain claimed; no next batch started. Product detail/cart are a proposal only and require scope/eligibility review before claim.
For future claims, main dev worktree plan/STATUS.md remains the authoritative local registry; UI worktree STATUS links here. Read authority before writes and stop if inaccessible. This local coordination exception does not authorize changing other dev source or bypassing Phase12 gates.
Main dev HEAD unchanged. UI code not merged/pushed; Phase12 stays active. Original frontend localhost3001 and API3003 running; UI preview localhost3002/store uses an already-allowed, previously free origin. Dashboard not started; 3002 must be reassigned before a future Dashboard startup.
## Patient UI coordination — PUI-B02 closed

PUI-T02 DONE; PUI-B02 DONE; claim RELEASED on 2026-10-13 after coordinator review and task commit.
Owner/reviewer: Codex /root; branch feat/patient-app-ui; worktree X:/Git/mushroom-patient-ui.
Commit: 2e4e2b06d8ae82d3e53aa6de79c256ed03ce5883 — feat(PUI-T02): unify Store detail cart and favorites UI.
Scope completed: Product Details + Cart + Favorites; shared Store components and consistent existing bottom navigation.
Evidence: plan/logs/patient-ui.md in UI worktree; typecheck, 65 tests, diff check, Playwright mobile390x844/desktop1440x900, RTL/keyboard/empty/loading/error/recovery and reversible synthetic cart/favorite operations PASS. Initial memberships and quantities restored. No orders/payments/SMS; complete checkout unverified.
Runtime now supersedes PUI-B01 ports: Patient UI normal dev localhost3001; existing API3003. Old servers stopped. Main application source unchanged; only this approved coordination file updated.
No active UI paths claimed. Independent plan and UI STATUS point to this authority. Phase12 unchanged; no push/merge. Next proposed batch: checkout presentation, requires normal eligibility/claim before implementation; not started.

## پیشرفت کلان

- [x] Monorepo با pnpm workspace و Turborepo ایجاد شده است.
- [x] سایت عمومی `apps/web` پیاده‌سازی ظاهری شده است.
- [x] اپ کاربر `apps/app` پیاده‌سازی ظاهری و mock شده است.
- [x] داشبورد `apps/dashboard` پیاده‌سازی ظاهری و mock شده است.
- [x] بک‌اند NestJS پایه ایجاد شده است.
- [x] PostgreSQL و migration پایه ایجاد شده‌اند.
- [x] احراز هویت واقعی جایگزین mock شده است.
- [x] onboarding پزشکی و consent واقعی شده‌اند.
- [x] آزمون اصلی و eligibility قابل تنظیم واقعی شده‌اند.
- [x] اولین جریان end-to-end رزرو نوبت کامل شده است.
- [x] اطلاعات بالینی واقعی شده‌اند.
- [ ] فروشگاه و پرداخت واقعی شده‌اند.
- [x] چت واقعی شده است.
- [ ] production readiness تأیید شده است.

## وضعیت فازها

- [x] `Phase 00` — Foundation — `DONE` — checklist: [`phases/00-FOUNDATION.md`](phases/00-FOUNDATION.md)
- [x] `Phase 01` — Identity & Access — `DONE` — checklist: [`phases/01-IDENTITY-ACCESS.md`](phases/01-IDENTITY-ACCESS.md)
- [x] `Phase 02` — Patient Onboarding & Consent — `DONE`
- [x] `Phase 03` — Assessment Engine & Booking Eligibility — `DONE`
- [x] `Phase 04` — Clinic, Doctors, Services & Availability — `DONE (CLOSED)`
- [x] `Phase 05` — Appointment Booking & Dashboard Operations — `DONE (CLOSED)`
- [x] `Phase 06` — Encounter & Clinical Workspace — `DONE (CLOSED)`
- [x] `Phase 07` — Prescription & Treatment — `DONE (CLOSED)`
- [x] `Phase 08` — Follow-up, Health Tracking, Notifications & Content — `DONE (CLOSED)`
- [x] `Phase 09` — Commerce, Inventory & Payments — `DONE (CLOSED)`
- [x] `Phase 10` — Chat & Online Consultation — `DONE (CLOSED)`
- [x] `Phase 11` — Dashboard Reporting & Access Expansion — `DONE (CLOSED)`
- [ ] `Phase 12` — Production Hardening — `IN_PROGRESS`
- [ ] `Deferred` — AI, Bots & Advanced Automation — خارج از roadmap اجرایی فعلی

## handoff فاز فعال

## آخرین batch تکمیل‌شده — PD-B1C

`F12-PD-B1C DONE` 2026-10-14؛ single agent Muse Spark؛ review gate PASS (scope/contract/tests). شواهد کامل: [phase-12 log](logs/phase-12.md#f12-pd-b1c--customer-product-details-integration). هیچ batch بعدی شروع نشده است (B2 منوط به دستور جدا).

`F12-PD-B1B DONE` 2026-10-14؛ single agent Muse Spark؛ review gate PASS (scope/contract/tests). شواهد کامل: [phase-12 log](logs/phase-12.md#f12-pd-b1b--dashboard-product-content-editor). هیچ batch بعدی شروع نشده است (B1C/B2 منوط به دستور جدا).

## آخرین batch تکمیل‌شده — 04C-B01C

04C-T01 DONE 2026-10-14؛ single agent Muse Spark؛ review gate PASS (scope/discipline/tests). شواهد کامل: [phase-12 log](logs/phase-12.md#04c-t01--customer-store-real-product-image-integration). هیچ batch بعدی شروع نشده است.

```text
Batch ID: 04C-B01C
Coordinator/Thread: Muse Spark (single agent, no subagents per task instruction)
Started at: 2026-10-14 Asia/Tehran
Phase: Phase 04C — Customer Store real product image integration
Batch status: IN_PROGRESS
Contract baseline: plan/contracts/store-product-media-v1.md (frozen); baselines 44d472e / e49e615 / e80573c; S1 handoff plan/logs/phase-12.md#f12-t06-r2
Coordinator-only files: plan/STATUS.md, plan/logs/phase-12.md (04C entry on completion)
Tasks:
  - Task ID: 04C-T01
    Agent/Thread: Muse Spark (single agent)
    Status: CLAIMED
    Depends on: F12-T06-R1 DONE, F12-T06-R2 DONE, F12-T06-S1 DONE; frozen media contract
    Scope: Customer App image integration only (catalog/detail/cart/wishlist/recent + neutral fallback + Digikala mapping removal + focused tests + Playwright)
    Owned paths: apps/app/src/components/store/**, apps/app/src/stores/product-images.ts, apps/app/src/app/(public)/store/**, apps/app/src/app/(app)/store/**, apps/app/src/lib/patient-ui.test.ts (or focused new spec), apps/app test config for Playwright scenario
    Shared/exclusive resource: none (no Prisma, no OpenAPI client, no dashboard, no R2 changes; main local DB migration stays unapplied per instruction)
    Expected verification: app typecheck, focused vitest, Playwright desktop+mobile mock-API render, git diff --check
```

## آخرین batch تکمیل‌شده — F01-B06-B-R1

Coordinator/Thread: `Codex /root`
Started at: `2026-10-12 Asia/Tehran`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE`
Contract baseline: `F01-R06-B` / `F01-R06-C` و قرارداد freeze‌شدهٔ `contracts/otp-sms-auth-v1.md`.

- Task ID: `F01-R06-B-R1`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: `F01-R06-B DONE` و قرارداد OTP/SMS پذیرفته‌شده.
  - Scope: حفظ کدهای خطای OTP/SMS از فیلتر HTTP، انتشار پاسخ‌های OTP در OpenAPI/client و regression test.
  - Owned paths: `apps/api/src/common/errors/api-error.ts`، `apps/api/src/modules/identity/presentation/http/auth.controller.ts`، `apps/api/test/**`، `packages/api-client/openapi.json`، `packages/api-client/src/schema.generated.ts`، `apps/web/src/services/auth.ts`، `plan/STATUS.md`، `plan/phases/12-PRODUCTION-HARDENING.md`، `plan/logs/phase-12.md`.
  - Shared/exclusive resource: API error registry و generated OpenAPI/client، single-writer.
  - Expected verification: filter regression، API test typecheck، OTP integration در صورت وجود DATABASE_URL، OpenAPI runtime drift/client generation، frontend typecheck/test و `git diff --check`.
  - Contract: هر کد خطای literal که از API پرتاب می‌شود باید در registry بماند؛ مقدارهای غیرخطا مثل role code وارد enum نمی‌شوند. رفتار fallback برای کد ناشناخته حفظ می‌شود.
  - Review: PASS — کدهای error literal ثبت شدند؛ OTP error responses در OpenAPI مستند و client بازتولید شد؛ fallback ناشناخته حفظ شد.
  - Verification: API typecheck، filter/OpenAPI/OTP integration و treatment-plan integration، client test/build و web typecheck/test پاس شدند. اجرای کل API suite شکست‌های مستقل reminders/database fixtures/config داشت که در `plan/logs/phase-12.md` ثبت شده‌اند.
  - Commit: در این handoff ایجاد می‌شود.
  - Next eligible work: F12 blockers و ترتیب جاری Phase 12؛ batch جدیدی در این handoff شروع نمی‌شود.

## آخرین batch تکمیل‌شده — F01-B06-C

Coordinator/Thread: `Codex /root`
Started at: `2026-10-11 UTC`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE`
Contract baseline: `F01-R06-B` commit `492d934` and generated OTP/admin API contract.

- Task ID: `F01-R06-C`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: `F01-R06-A` and `F01-R06-B DONE`.
  - Scope: OTP-first/password-secondary web UX, responsive dashboard SMS/provider/policy/log UX, frontend regressions and deployment observation.
  - Owned paths: `apps/web` auth UI/service/tests, dashboard SMS settings/API/settings integration and final coordinator evidence.
  - Shared/exclusive resource: generated client is frozen by B; no schema/API change in this task.
  - Review: PASS — ورود و ثبت‌نام OTP-first هستند، password روش ثانویه و session/redirect موجود را reuse می‌کند؛ داشبورد provider/policy/log را بدون secret read-back مدیریت می‌کند.
  - Verification: web 13/13، dashboard 75/75، typecheckهای web/dashboard/API، Chrome OTP E2E (2/2) و build webpack هر دو frontend پاس شدند؛ Turbopack در sandbox روی CSS-worker port bind محدود بود.
  - Deployment: GitHub Action `38173139936` برای commit `23ffeae` در `2026-10-12` PASS شد؛ shared-dev API readiness و `/login` هر دو پاسخ موفق دادند. تا تنظیم runtime live و credential توسط ADMIN، OTP عمداً fail-closed است.

## آخرین batch تکمیل‌شده — F01-B06-B

Coordinator/Thread: `Codex /root`
Started at: `2026-10-11 UTC`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE`
Contract baseline: `F01-R06-A` commit `6dc106b` and the frozen OTP/SMS contract.

- Task ID: `F01-R06-B`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: `F01-R06-A DONE`.
  - Scope: HMAC OTP engine, rate-limit/idempotency/concurrency, passwordless account provisioning, session reuse, public endpoints and generated client.
  - Owned paths: identity OTP/session code, auth controller/DTOs, OTP integration tests and OpenAPI/generated client.
  - Shared/exclusive resource: identity session infrastructure and generated API contract are single-writer resources.
  - Expected verification: API typecheck, PostgreSQL integration including single-use concurrency, password regression and OpenAPI drift.
  - Review: PASS — OTP code فقط در memory ارسال، verifier به‌صورت HMAC، consume اتمیک و provisioning بدون credential جعلی انجام می‌شود؛ session همان زیرساخت موجود است.
  - Verification: PostgreSQL integration single-use/concurrency، 18 تست regression رمز/session، API test typecheck و OpenAPI generated-client drift پاس شدند.
  - Next eligible batch: `F01-B06-C` برای web/dashboard UX و evidence نهایی.

## آخرین batch تکمیل‌شده — F01-B06-A

Coordinator/Thread: `Codex /root`
Started at: `2026-10-11 UTC`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE`
Contract baseline: [`contracts/otp-sms-auth-v1.md`](contracts/otp-sms-auth-v1.md), owner-authorized OTP/SMS change control.

- Task ID: `F01-R06-A`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: no active batch; contract frozen by the owner.
  - Scope: ADR/change control, independent SMS schema/migration, credential encryption/runtime configuration, FarazSMS port/registry and ADMIN provider/policy backend.
  - Owned paths: `apps/api/prisma/**`, `apps/api/src/modules/communications/sms/**`, API runtime/config/error wiring, deployment env/secret contract, `apps/api/package.json`, lockfile, and coordinator plan files.
  - Shared/exclusive resource: Prisma, API module wiring, environment contract and lockfile are single-writer resources.
  - Expected verification: migration replay/generate, SMS unit and admin authorization tests, API typecheck/build, deployment-env contract and `git diff --check`.
  - Review: PASS — schema، AES-256-GCM keyring، runtime fail-closed، registry واقعی FarazSMS و API صرفاً ADMIN با credential write-only پیاده شدند.
  - Verification: PostgreSQL 16 migration replay، API typecheck، SMS security tests، release/dev deployment contracts و shell syntax پاس شدند.
  - Next eligible batch: `F01-B06-B` برای OTP engine و public auth/OpenAPI.

## آخرین batch تکمیل‌شده — F12-B12-R12

Coordinator/Thread: `Codex /root`
Started at: `2026-10-11 UTC`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE`
Contract baseline: a change to the versioned bootstrap/deployment contract invalidates prior stage state and must
re-run idempotent migrations plus all generated runtime artifacts before service readiness is accepted.

- Task ID: `F12-T12-R12`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: F12-T12-R11 flag propagation and live refresh `500` evidence after stale migration state.
  - Scope: include the deployment orchestrator in the runtime fingerprint and make runtime-contract changes reconcile
    API client, Prisma generation/migrations, API compilation and frontend runtime config.
  - Owned paths: `deploy/vps/deploy-dev.sh`, dev deployment contract tests, and coordinator plan files.
  - Shared/exclusive resource: existing versioned migrations may only run via idempotent `prisma migrate deploy`; no
    schema or application auth contract changes.
  - Expected verification: dev/release deployment contract suites, shell syntax, `git diff --check`, push, API health
    and authenticated refresh observation.
  - Review: PASS — the orchestrator is part of the runtime fingerprint and any runtime-contract change forces the
    complete idempotent bootstrap reconciliation before all services are recreated and probed.
  - Verification: dev VPS regression, release pipeline contract, shell syntax and `git diff --check` passed.
    Post-push migration/refresh observation remains the external acceptance gate.

## آخرین batch تکمیل‌شده — F12-B12-R11

Coordinator/Thread: `Codex /root`
Started at: `2026-10-11 UTC`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE`
Contract baseline: every build stage selected by `deploy-dev.sh` must be explicitly present in the bootstrap container
environment; host-shell flags are not assumed to cross the Compose boundary.

- Task ID: `F12-T12-R11`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: F12-T12-R10 artifact fingerprinting and live failure evidence from run `38113797757`.
  - Scope: pass all selected dependency/client/Prisma/migration/API/runtime-config stages into bootstrap and lock the
    Compose boundary with a regression contract.
  - Owned paths: `deploy/vps/compose.dev.yaml`, deployment contract tests, and coordinator plan files.
  - Shared/exclusive resource: no database schema, application runtime contract, secret value or provider call changes.
  - Expected verification: deployment contract suites, shell syntax, `git diff --check`, then push and VPS readiness.
  - Review: PASS — all eight bootstrap controls are now declared at the Compose environment boundary, including the
    API source fingerprint; the contract suite asserts each mapping independently.
  - Verification: full release pipeline contract, dev VPS sync regression, shell syntax and `git diff --check` passed.
    Post-push shared-dev readiness remains the external acceptance observation.

## آخرین batch تکمیل‌شده — F12-B12-R10

Coordinator/Thread: `Codex /root`
Started at: `2026-10-11 UTC`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE`
Contract baseline: a shared-dev API artifact is runnable only when its recorded source fingerprint matches the current
API inputs; a missing or stale artifact must trigger a clean compile before the API container is recreated.

- Task ID: `F12-T12-R10`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: completed F12-T12-R9 live Sadad runtime and the existing incremental shared-dev deployment.
  - Scope: bind the API dist artifact to its source fingerprint, clean stale output before compilation, and add a
    regression proving a same-source rerun repairs an incoherent artifact rather than starting stale JavaScript.
  - Owned paths: `deploy/vps/{deploy-dev.sh,dev-service.sh,compose.dev.yaml}`, deployment contract tests, and
    coordinator plan files.
  - Shared/exclusive resource: no runtime secret value, database, payment credential or provider call is changed.
  - Expected verification: shell syntax, dev VPS deployment contract regression, release pipeline contract and
    `git diff --check`, followed by push and shared-dev readiness observation.
  - Review: PASS — the API dist directory is cleaned before compilation, receives its source SHA-256 marker only
    after a successful emit, and any absent/mismatched marker forces compile plus API recreation on a same-source rerun.
  - Verification: dev VPS sync regression and release pipeline contract checks passed; shell syntax and
    `git diff --check` passed. Post-push shared-dev readiness remains the external acceptance observation.

## آخرین batch تکمیل‌شده — F12-B12-R9

Coordinator/Thread: `Codex /root`
Started at: `2026-10-11 UTC`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE`
Contract baseline: deployment mode proves that the server is permitted to contact Sadad; encrypted provider revisions
snapshot `RIAL` readiness; an authorized dashboard administrator remains the sole owner of enabled/default state.
Disabling stops new attempts while callbacks for already-created attempts remain processable.
Coordinator-only files: Prisma/OpenAPI client, `plan/STATUS.md`, phase checklist/log.

- Task ID: `F12-T12-R9`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: completed Sadad protocol adapter/orchestration, F12-T12-R7 credential contract and F12-T12-R8 adapter controls.
  - Scope: replace the dormant Sadad runtime with an explicit disabled/live deployment mode; wire real attempt,
    redirect, callback and Verify orchestration; derive readiness from validated runtime configuration; keep final
    enable/default and emergency disable in dashboard settings; return a redirect URL to the patient app.
  - Owned paths: Sadad/payment services, controllers, DTOs/config/module wiring and tests under `apps/api`; payment
    page/API under `apps/app`; payment settings status under `apps/dashboard`; deployment env/compose documentation;
    generated OpenAPI/client artifacts; coordinator plan files.
  - Shared/exclusive resource: OpenAPI/generated client single-writer; no credential values, external payment call,
    production environment mutation or database migration in the repository task.
  - Expected verification: config/adapter/unit tests, PostgreSQL integration when available, API/app/dashboard
    typecheck and focused tests, OpenAPI drift check, disabled-mode regression and `git diff --check`.
  - Review: PASS — runtime only selects the real bounded HTTPS transport under validated `live` configuration;
    ADMIN enable/default remains independent, callback/Verify can finish after an administrative disable, and only a
    matching successful Verify produces the single payment/order/inventory effect. Callback input is allowlisted and
    rate-limited, unknown/timeout outcomes remain reconciliation-safe, and concurrent attempt reuse keeps one OrderId.
  - Verification: clean PostgreSQL 16 replayed all `33` migrations and seed; live provider-config integration `1/1`
    and disabled checkout/payment integration `2/2` passed. API TypeScript plus focused `27/27`, OpenAPI `7/7`, app
    `52/52`, dashboard `75/75`, generated-client drift/typecheck and `git diff --check` all passed.
  - External next action: deploy this commit, set the documented non-secret runtime values on the VPS using the exact
    merchant-confirmed redirect profile, enter/rotate the three credentials in Dashboard, enable/default Sadad, then
    execute the controlled low-value acceptance transaction. No real credential or Sadad transaction was used here.

## آخرین batch تکمیل‌شده — F12-B12-R8

Coordinator/Thread: `Codex /root`
Started at: `2026-10-11 UTC`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE`
Contract baseline: the dashboard lists the provider registry dynamically, exposes each adapter's code-owned
configuration and callback guidance, and controls enabled/default state through the existing authorized API. Sadad
activation remains fail-closed while `goLiveReady=false`; deactivation and credential rotation remain available.
Coordinator-only files: `plan/STATUS.md`, phase checklist/log.

- Task ID: `F12-T12-R8`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: completed F12-T12-R7 payment credential contract and the Phase 09 provider registry/config API.
  - Scope: replace the single-form payment editor with adapter cards and a focused adapter detail view; show current
    public API callback/back-link and provider redirect information; connect enable/disable and default-provider
    controls to the existing API; preserve stable activation blockers and write-only credential rotation.
  - Owned paths: `apps/dashboard/src/features/settings/payment-provider-settings.tsx`,
    `apps/dashboard/src/lib/{api.ts,commerce-payment-provider-api*}`, provider-state service/tests under
    `apps/api/src/modules/commerce/payments/` and relevant dashboard/API tests; coordinator-only
    `plan/{STATUS.md,logs/phase-12.md,phases/12-PRODUCTION-HARDENING.md}`.
  - Shared/exclusive resource: no database, migration, API route, OpenAPI, generated client, credential-storage,
    runtime transport or payment-attempt change.
  - Expected verification: payment adapter URL/state unit tests, dashboard test/typecheck/lint, responsive read-only
    browser inspection when environment permits, and `git diff --check`.
  - Review: PASS — registry results are rendered as adapter cards; the selected adapter exposes environment-specific
    callback, technical endpoints, write-only credential rotation and state controls. Disabling all adapters provides
    the payment-wide off action; per-adapter disable also clears stale default state. Enable/default controls remain
    unavailable when the server reports `goLiveReady=false`.
  - Verification: dev runtime config confirms `apiUrl=https://dev-api.roxco.ir`, callback helper tests cover dev and
    staging origins, dashboard TypeScript/ESLint and `75/75` tests across `22` files pass, API test TypeScript and
    OpenAPI contract `7/7` pass, and `git diff --check` passes. Post-push shared-dev inspection remains external.
  - External next action: push `dev`, observe deployment, and inspect adapter list/detail at desktop/mobile widths.

## batch تکمیل‌شده — F12-B12-R7

Coordinator/Thread: `Codex /root`
Started at: `2026-10-10 UTC`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE`
Contract baseline: every settings entity exposes its accepted lifecycle (create, edit, activate/deactivate and guarded
delete); Sadad configuration requires write-only `merchantId`, `terminalId` and `terminalKey` as one encrypted revision.
Coordinator-only files: `plan/STATUS.md`, phase checklist/log, runtime OpenAPI and generated API client.

- Task ID: `F12-T12-R7`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: completed Phase 04 directory/scheduling CRUD, Phase 09 payment credential encryption, and F12-T12-R6.
  - Scope: connect the existing update/delete endpoints for every dashboard settings category with explicit edit,
    deactivate and confirmed-delete UX; map dependency conflicts to actionable feedback; define and validate the three
    Sadad credential fields in backend/OpenAPI/client and replace the ambiguous dashboard secret input.
  - Owned paths: `apps/dashboard/src/features/settings/**`, `apps/dashboard/src/lib/directory-settings-api*`,
    `apps/api/src/modules/commerce/payments/**`, relevant API tests, `packages/api-client/{openapi.json,src/schema.generated.ts}`;
    coordinator-only `plan/{STATUS.md,logs/phase-12.md,phases/12-PRODUCTION-HARDENING.md}`.
  - Shared/exclusive resource: OpenAPI/generated client single-writer; existing encrypted credential storage is reused;
    no migration, payment enablement, role or permission change.
  - Expected verification: API unit/integration and OpenAPI checks, generated-client drift check, dashboard adapter/UI
    tests, API/dashboard typecheck/lint, desktop/mobile browser inspection, mutation safety review and `git diff --check`.
  - Review: PASS — تمام رکوردهای directory/scheduling اکنون edit، activate/deactivate و confirmed delete دارند؛
    delete وابسته با `DIRECTORY_RECORD_IN_USE` به غیرفعال‌سازی هدایت می‌شود. فرم سداد سه فیلد صریح دارد و API
    همان سه مقدار را اجباری و write-only اعتبارسنجی و در credential revision رمزنگاری می‌کند.
  - Verification: API test TypeScript، OpenAPI contract `7/7`، generated client build، dashboard TypeScript/ESLint،
    dashboard `73/73` test در `22` فایل و `git diff --check` پاس شدند. build پیش‌فرض Next در sandbox هنگام bind
    پردازشگر CSS Turbopack با `Operation not permitted` متوقف شد؛ این محدودیت محیط است و typecheck/lint/test پاس است.
  - External next action: push `dev` و مشاهدهٔ deployment/browser روی shared dev.

## آخرین batch تکمیل‌شده — F12-B12-R6

Coordinator/Thread: `Codex /root`
Started at: `2026-10-10 UTC`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE`
Contract baseline: settings opens as a read-first operational overview; mutations are available only inside an
explicitly opened, focused editor and remain server-confirmed after submit.
Coordinator-only files: `plan/STATUS.md`, `plan/logs/phase-12.md`, `plan/phases/12-PRODUCTION-HARDENING.md`.

- Task ID: `F12-T12-R6`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: completed F12-T12-R4 workflow and F12-T12-R5 pagination corrective.
  - Scope: replace the always-open settings forms with a compact clinic overview and descriptive category cards;
    open each editor in an accessible responsive modal/sheet, keep writes behind explicit submit actions, and preserve
    existing directory/scheduling/payment API behavior and error feedback.
  - Owned paths: `apps/dashboard/src/features/settings/**`; coordinator-only
    `plan/{STATUS.md,logs/phase-12.md,phases/12-PRODUCTION-HARDENING.md}`.
  - Shared/exclusive resource: no API, database, OpenAPI, generated-client, auth or role change.
  - Expected verification: focused settings tests, dashboard test/typecheck/lint, responsive browser review on desktop
    and mobile widths, keyboard dialog behavior, and `git diff --check`.
  - Review: PASS — the initial route is read-first and contains only server-backed summary/status data plus descriptive
    category cards; every form is isolated in an explicitly opened editor, draft input is discarded on close, and the
    responsive dialog owns scroll/focus, Escape/backdrop close and keyboard focus wrapping.
  - Verification: dashboard `69/69` tests across `21` files, TypeScript, ESLint and `git diff --check` PASS. Desktop
    and mobile browser inspection remains the post-push shared-dev gate.
  - External next action: push `dev`, verify the deployment, then inspect the overview and at least one editor at
    desktop and mobile widths without submitting a mutation.

## آخرین batch تکمیل‌شده — F12-B12-R5

Coordinator/Thread: `Codex /root`
Started at: `2026-10-10 18:03 UTC`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE`
Contract baseline: every dashboard settings list request must respect the accepted API maximum `pageSize=50`; a
single invalid list query must not make a valid authenticated settings session appear unavailable.
Coordinator-only files: `plan/STATUS.md`, `plan/logs/phase-12.md`, `plan/phases/12-PRODUCTION-HARDENING.md`.

- Task ID: `F12-T12-R5`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: completed F12-T12-R4 settings workflow and the existing Phase 04 directory/scheduling list contracts.
  - Scope: align dashboard settings list pagination with the API maximum, add a regression assertion for the emitted
    queries, and verify the authenticated shared-dev settings route no longer fails with `BAD_REQUEST`.
  - Owned paths: `apps/dashboard/src/lib/directory-settings-api*`; coordinator-only
    `plan/{STATUS.md,logs/phase-12.md,phases/12-PRODUCTION-HARDENING.md}`.
  - Shared/exclusive resource: generated API client is read-only; no API, database, OpenAPI, auth or role change.
  - Expected verification: focused adapter test, dashboard test/typecheck/lint, `git diff --check`, then authenticated
    browser observation after the `dev` deployment.
  - Review: PASS — all seven paginated directory/scheduling reads now send the API-supported maximum `pageSize=50`;
    the regression test inspects every emitted list URL, while authentication and authorization contracts are unchanged.
  - Verification: authenticated shared-dev browser diagnosis reproduced `400 BAD_REQUEST` with
    `pageSize must not be greater than 50` on all seven list endpoints; focused `7/7` tests, full dashboard `69/69`
    tests, TypeScript, ESLint and `git diff --check` PASS.
  - External next action: push `dev`, observe deployment, then repeat the authenticated browser request to confirm all
    settings reads return `2xx` and the workflow renders server data.

## آخرین batch تکمیل‌شده — F12-B12-R4

Coordinator/Thread: `Codex /root`
Started at: `2026-10-10 UTC`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE`
Contract baseline: dashboard settings must express the accepted directory publication prerequisites and keep each
clinic, doctor, offering, schedule and calendar mutation visibly scoped to its own form.
Coordinator-only files: `plan/STATUS.md`, `plan/logs/phase-12.md`, `plan/phases/12-PRODUCTION-HARDENING.md`.

- Task ID: `F12-T12-R4`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: completed Phase 04 directory/scheduling APIs and completed F12-T12-R3 dashboard navigation corrective.
  - Scope: replace the ambiguous settings form with a guided clinic → specialty/doctor → service/offering → schedule
    workflow, preserve backend error codes, repair refresh/success state handling, isolate form selections, and add
    explicit payment-setting feedback without changing API or persistence contracts.
  - Owned paths: `apps/dashboard/src/features/settings/**`, `apps/dashboard/src/lib/directory-settings-api*`;
    coordinator-only `plan/{STATUS.md,logs/phase-12.md,phases/12-PRODUCTION-HARDENING.md}`.
  - Shared/exclusive resource: existing generated API client is read-only; no API, database, OpenAPI or role change.
  - Expected verification: focused adapter/workflow regression tests, dashboard test/typecheck/lint, supported build or
    shared-dev route compilation, responsive source review and `git diff --check`.
  - Review: PASS — new records follow API publication prerequisites in one guided path; old drafts have explicit
    repair actions; mutation messages retain stable server error codes; successful writes are re-read before progress
    changes; independent forms no longer overwrite one another's doctor or date selection.
  - Verification: dashboard `69/69` tests across `21` files, TypeScript, ESLint, settings contract scan and
    `git diff --check` PASS. Shared-dev `/settings` compilation remains the post-push build observation because this
    executor cannot capture Next child-process output during a production build.
  - External next action: push `dev`, verify the shared-dev workflow and request `/settings` from the live dashboard.

## آخرین batch تکمیل‌شده — F12-B12-R3

Coordinator/Thread: `Codex /root`
Started at: `2026-10-10 UTC`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE`
Contract baseline: dashboard navigation and status affordances expose only API-backed operational capabilities;
empty, loading and failure states remain distinct; the shell remains usable on narrow viewports.
Coordinator-only files: `plan/STATUS.md`, `plan/logs/phase-12.md`, `plan/phases/12-PRODUCTION-HARDENING.md`.

- Task ID: `F12-T12-R3`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: completed Phase 05–11 dashboard connections and the deferred AI/bot/advanced-automation boundary.
  - Scope: remove fabricated dashboard badges and mock/deferred navigation, remove false header affordances, expose
    the real audit route, distinguish patient-list failure from an empty list, resolve the authorized clinic for CRM,
    replace raw chat UUID entry with an API-backed appointment selector, and add responsive shell navigation.
  - Owned paths: `apps/dashboard/src/**`; coordinator-only `plan/{STATUS.md,logs/phase-12.md,phases/12-PRODUCTION-HARDENING.md}`.
  - Shared/exclusive resource: dashboard navigation/session UI only; no API, database, OpenAPI or generated-client change.
  - Expected verification: focused dashboard regression tests, dashboard typecheck/build, mock/navigation scan,
    responsive browser inspection where available, and `git diff --check`.
  - Review: PASS — operational navigation contains only API-backed features, deferred routes fail closed with an
    explicit unavailable state, CRM/chat no longer require copied UUIDs, health loading/error/empty states are
    distinct, and the responsive shell exposes an accessible mobile drawer.
  - Verification: dashboard `66/66` tests, TypeScript, ESLint, route/mock scan and `git diff --check` PASS. The
    sandbox cannot execute Next's child-process `tsc --showConfig` or Turbopack's internal bind, so production-build
    verification is deferred to the post-push CI/shared-dev compile; direct TypeScript configuration output is valid.
  - External next action: push to `dev`, verify the GitHub sync and compile representative dashboard routes on the
    shared development origin.

## آخرین batch تکمیل‌شده — F12-B02-R23

Coordinator/Thread: `Codex /root`
Started at: `2026-10-10 UTC`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE`
Contract baseline: shared-dev frontend watchers keep their original Next development compiler and may use available
host memory during first-route compilation without a per-container memory ceiling.
Coordinator-only files: `plan/STATUS.md`, `plan/logs/phase-12.md`.

- Task ID: `F12-T02-R23`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: live app compilation repeatedly restarting under the 768 MiB container limit and a local root-route
    compile measurement of approximately 1.07 GiB RSS.
  - Scope: restore the original app Turbopack command and remove only the web/app/dashboard dev memory ceilings.
  - Owned paths: `deploy/vps/{dev-service.sh,compose.dev.yaml,README.md}`,
    `scripts/{test-vps-dev.sh,test-release-pipeline.mjs}`; coordinator-only `plan/{STATUS.md,logs/phase-12.md}`.
  - Shared/exclusive resource: shared-dev frontend resource policy only.
  - Expected verification: original compiler command and absent frontend memory-ceiling contracts, full dev/release
    deployment checks and `git diff --check`.
  - Review: PASS — all frontend watchers retain the default Next development command, while their dev Compose
    services no longer impose a memory cgroup below measured compilation demand.
  - Verification: shell syntax, full dev VPS simulation, release pipeline contract and `git diff --check` PASS.
  - External next action: push to `dev` and verify the app root compilation completes with available host RAM.

## آخرین batch تکمیل‌شده — F12-B02-R22

Coordinator/Thread: `Codex /root`
Started at: `2026-10-10 UTC`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE`
Contract baseline: the app remains a development watcher with fast source refresh, but its compiler process must stay
resident after serving the first route.
Coordinator-only files: `plan/STATUS.md`, `plan/logs/phase-12.md`.

- Task ID: `F12-T02-R22`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: completed `F12-T02-R21` and live diagnostics showing Next Turbopack repeatedly exits cleanly after
    detecting `next.config.ts`, with `RestartCount=16`, `OOM=false` and intermittent successful root responses.
  - Scope: run only the unstable shared-dev app watcher on Next's webpack development compiler and preserve web and
    dashboard Turbopack watchers.
  - Owned paths: `deploy/vps/{dev-service.sh,README.md}`, `scripts/{test-vps-dev.sh,test-release-pipeline.mjs}`;
    coordinator-only `plan/{STATUS.md,logs/phase-12.md}`.
  - Shared/exclusive resource: shared-dev app watcher command only.
  - Expected verification: service command contract, dev/release deployment checks and `git diff --check`.
  - Review: PASS — only `apps/app` selects webpack development mode; the existing dev server, bind mount, HMR and
    isolated web/dashboard commands are preserved.
  - Verification: shell syntax, full dev VPS simulation, release pipeline contract and `git diff --check` PASS.
  - External next action: push to `dev` and verify the app watcher remains resident on the shared server.

## آخرین batch تکمیل‌شده — F12-B02-R21

Coordinator/Thread: `Codex /root`
Started at: `2026-10-10 UTC`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE`
Contract baseline: frontend readiness checks must fail within a bounded interval and attempt one safe recovery of a
stalled Next development watcher before rejecting the synced source.
Coordinator-only files: `plan/STATUS.md`, `plan/logs/phase-12.md`.

- Task ID: `F12-T02-R21`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: completed `F12-T02-R20` and live evidence that `app` accepts a container start but never answers HTTP.
  - Scope: bound frontend readiness retries, emit diagnostics promptly, clear only the affected derived `.next` cache,
    recreate that watcher once and verify readiness again.
  - Owned paths: `deploy/vps/{deploy-dev.sh,README.md}`, `scripts/{test-vps-dev.sh,test-release-pipeline.mjs}`;
    coordinator-only `plan/{STATUS.md,logs/phase-12.md}`.
  - Shared/exclusive resource: shared-dev watcher lifecycle only; no database, secret, API contract or release behavior.
  - Expected verification: stalled-app recovery simulation, dev/release deployment checks, shell syntax and
    `git diff --check`.
  - Review: PASS — a stalled frontend now produces diagnostics promptly, receives one isolated cache reset/recreate,
    and either becomes ready or fails the deployment within a bounded interval.
  - Verification: shell syntax, first/unchanged/per-service sync plus stalled-app recovery simulation,
    `pnpm release:test` and `git diff --check` PASS.
  - External next action: push to `dev`, observe the shared-dev sync and verify all three public frontend origins.

## آخرین batch تکمیل‌شده — F12-B12-R2

Coordinator/Thread: `Codex /root`
Started at: `2026-10-10 Asia/Tehran`
Phase: `12-PRODUCTION-HARDENING` (public web alert severity corrective)
Batch status: `DONE`
Contract baseline: authentication/API failures must be visually destructive and accessible; success, information and
warning notices must retain distinct semantic colors.
Coordinator-only files: `plan/STATUS.md`, `plan/logs/phase-12.md`.

- Task ID: `F12-T12-R2`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: existing typed auth error mapping and live theme evidence that `destructive` has no web color token.
  - Scope: define public-web semantic alert colors and preserve Sonner severity variants without changing auth/API
    behavior or Persian error mappings.
  - Owned paths: `apps/web/src/app/globals.css`, `apps/web/src/components/{auth/AuthErrorAlert.tsx,ui/sonner.tsx}`;
    coordinator-only `plan/{STATUS.md,logs/phase-12.md}`.
  - Shared/exclusive resource: none.
  - Expected verification: web tests/typecheck/build, rendered semantic alert colors, accessibility role and
    `git diff --check`.
  - Review: PASS — inline auth/API failures now use the destructive red palette and Sonner success, information,
    warning and error variants keep separate green, blue, amber and red palettes.
  - Verification: 12 web tests, web typecheck, webpack production build, Chromium computed-style checks for the auth
    `role=alert` and information toast, plus `git diff --check` PASS.
  - External next action: push to `dev` and verify the public login error alert after shared-dev sync.

## آخرین batch تکمیل‌شده — F12-B12-R1

Coordinator/Thread: `Codex /root`
Started at: `2026-10-10 UTC`
Phase: `12-PRODUCTION-HARDENING` (public web visual asset and mobile corrective)
Batch status: `DONE`
Contract baseline: public web icons and typography must render from repository dependencies/assets without runtime
font or icon services; the home page must keep a bounded mobile viewport through and after the footer.
Coordinator-only files: `plan/STATUS.md`, `plan/logs/phase-12.md`.

- Task ID: `F12-T12-R1`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: completed public web baseline and live mobile evidence that unresolved Material Symbols render as text
    and the page wrapper adds blank space below the footer.
  - Scope: replace font-based generic icons with local component icons, self-host Yekan Bakh typography, correct the
    mobile footer/page boundary and verify responsive rendering without external asset requests.
  - Owned paths: `apps/web/**`, root dependency manifests; coordinator-only `plan/{STATUS.md,logs/phase-12.md}`.
  - Shared/exclusive resource: root lockfile only; no API, authentication, database, app, dashboard or deployment
    behavior change.
  - Expected verification: focused tests/typecheck/build, mobile/desktop browser layout and asset-request checks,
    live shared-dev sync and `git diff --check`.
  - Review: PASS — all generic web icons are typed, tree-shaken Lucide SVG components; Yekan Bakh FaNum is a
    self-hosted variable font; and the mobile page ends at the footer without the previous trailing padding.
  - Verification: 12 web tests, web typecheck, supported webpack production build, Chromium at 320/390/768/1440px,
    same-origin font request/no external icon request, zero horizontal overflow and `git diff --check` PASS.
  - External verification: GitHub run `38017448280` synced commit `9453128` successfully. Fresh Chromium at 390px on
    `https://dev.roxco.ir` loaded Yekan Bakh from the same origin, rendered 56 Lucide SVGs and zero Material Symbols,
    had no failed requests or horizontal overflow, and ended the document at the footer.

## آخرین batch تکمیل‌شده — F12-B02-R20

Coordinator/Thread: `Codex /root`
Started at: `2026-10-10 UTC`
Phase: `12-PRODUCTION-HARDENING` (shared-dev browser hydration and fast frontend sync corrective)
Batch status: `DONE`
Contract baseline: shared dev remains a bind-mounted Next development runtime without full frontend builds; browser
hydration, dev-origin authorization and changed-service refresh must be verified after every source sync.
Coordinator-only files: `plan/STATUS.md`, `plan/logs/phase-12.md`.

- Task ID: `F12-T02-R20`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: completed `F12-T02-R19` and live evidence that the public dev page serves HTML while its Next client
    does not hydrate, leaving the account header in its server-rendered checking state.
  - Scope: allow explicit remote/LAN Next development origins, fingerprint frontend source independently, restart only
    changed watcher services without production builds, and add a browser-realistic HMR deployment probe.
  - Owned paths: `apps/{web,app,dashboard}/next.config.ts`, `deploy/vps/{compose.dev.yaml,deploy-dev.sh,
    dev-env.example,README.md}`, `scripts/{test-vps-dev.sh,test-release-pipeline.mjs}` and a focused dev browser probe;
    coordinator-only `plan/{STATUS.md,logs/phase-12.md}`.
  - Shared/exclusive resource: shared-dev frontend watcher lifecycle only; no authentication policy, API runtime,
    database, secret, staging, production-sim or release artifact change.
  - Expected verification: config parsing/typechecks, first/unchanged/per-frontend sync simulations, browser hydration
    probe contract, release/deployment checks and `git diff --check`.
  - Review: PASS — all three Next 16 development servers receive normalized explicit hostnames, changed frontend
    source recreates only its own persistent watcher, and deployment requires a public-origin HMR WebSocket `101`
    after bounded CDN/watcher warm-up retries before it records the synced source as ready.
  - Verification: focused origin parsing, all frontend typechecks, first/unchanged/dependency/API/per-frontend dev sync
    simulations, `pnpm release:test`, a live local browser-origin HMR handshake and `git diff --check` PASS.
  - External verification: GitHub run `38015897226` synced commit `4ef2d24` successfully. A fresh Chromium session on
    `https://dev.roxco.ir` rendered both login/register controls, observed the expected anonymous refresh `401` and
    reported no failed browser requests. Existing `APP_ORIGINS` supplied Next's allowlist; no server secret, database,
    port or Caddy change was required.

## آخرین batch تکمیل‌شده — F12-B02-R19

Coordinator/Thread: `Codex /root`
Started at: `2026-10-09 +03:30`
Phase: `12-PRODUCTION-HARDENING` (shared-dev Next warm-up corrective)
Batch status: `DONE`
Contract baseline: persistent Next dev watchers must be warmed serially by deployment readiness probes; Docker health
checks must not concurrently trigger their expensive first route compilation with a shorter timeout.
Coordinator-only files: `plan/STATUS.md`, `plan/logs/phase-12.md`.

- Task ID: `F12-T02-R19`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: completed `F12-T02-R18` and live app logs showing 6–7 second initial Next compilation versus a
    five-second health/readiness timeout.
  - Scope: make dev watcher health cadence and sequential readiness timeouts accommodate bounded initial compilation.
  - Owned paths: `deploy/vps/{compose.dev.yaml,deploy-dev.sh}`, `scripts/{test-vps-dev.sh,test-release-pipeline.mjs}`;
    coordinator-only `plan/{STATUS.md,logs/phase-12.md}`.
  - Shared/exclusive resource: shared-dev Next watcher startup only; no API runtime, database, secret, Caddy, staging
    or production-sim change.
  - Expected verification: startup timeout/cadence contract, dev/release deployment tests and `git diff --check`.
  - Review: PASS — Docker no longer concurrently compiles all three Next root routes through healthchecks. The
    existing deployment probes warm web, app and dashboard serially and allow 30 seconds for their first compile.
  - Verification: `bash scripts/test-vps-dev.sh`, `pnpm release:test` and targeted `git diff --check` PASS.
  - External next action: push the corrective to `dev`; a failed probe now also prints restart/OOM state. No server
    configuration change is required.

## آخرین batch تکمیل‌شده — F12-B02-R18

Coordinator/Thread: `Codex /root`
Started at: `2026-10-09 +03:30`
Phase: `12-PRODUCTION-HARDENING` (shared-dev sync serialization corrective)
Batch status: `DONE`
Contract baseline: a newly dispatched shared-dev sync must serialize behind an already-running remote sync instead
of failing immediately, and rsync must preserve the complete server-generated API source directory.
Coordinator-only files: `plan/STATUS.md`, `plan/logs/phase-12.md`.

- Task ID: `F12-T02-R18`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: completed `F12-T02-R17` and live concurrent-sync/rsync warning evidence.
  - Scope: queue GitHub runs, wait with a bounded timeout for the remote deploy lock before source upload and deploy,
    and exclude the complete ignored API generated directory from source deletion.
  - Owned paths: `.github/{workflows/dev-sync.yml,CI.md}`, `scripts/deploy-dev-vps.mjs`, `deploy/vps/deploy-dev.sh`,
    `scripts/{test-vps-dev.sh,test-release-pipeline.mjs}`; coordinator-only `plan/{STATUS.md,logs/phase-12.md}`.
  - Shared/exclusive resource: shared-dev source sync and deployment lock only; no application, database, secret,
    Caddy, staging or production-sim change.
  - Expected verification: lock-contention simulation, generated-directory preservation contract, dev/release tests
    and `git diff --check`.
  - Review: PASS — GitHub no longer cancels an in-flight sync, source upload and deployment both wait up to ten
    minutes for the remote kernel lock, and rsync preserves the complete ignored API generated directory rather than
    attempting to delete its parent.
  - Verification: live lock-contention simulation, first/unchanged/dependency/API/frontend dev sync cases,
    `pnpm release:test` and `git diff --check` PASS.
  - External next action: push the corrective to `dev`; do not delete `state/deploy.lock`. No server configuration
    change is required.

## آخرین batch تکمیل‌شده — F12-B02-R17

Coordinator/Thread: `Codex /root`
Started at: `2026-10-09 +03:30`
Phase: `12-PRODUCTION-HARDENING` (shared-dev build-context corrective)
Batch status: `DONE`
Contract baseline: the dev runtime image must always build from the validated synced workspace, independent of the
remote shell working directory or Docker Compose project-directory resolution.
Coordinator-only files: `plan/STATUS.md`, `plan/logs/phase-12.md`.

- Task ID: `F12-T02-R17`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: completed `F12-T02-R16` and live failure evidence showing Compose resolved the build context outside
    the synced workspace.
  - Scope: anchor the dev image build context to the already validated absolute `DEV_WORKSPACE_PATH` and freeze that
    contract in release/deployment tests.
  - Owned paths: `deploy/vps/compose.dev.yaml`, `scripts/test-release-pipeline.mjs`; coordinator-only
    `plan/{STATUS.md,logs/phase-12.md}`.
  - Shared/exclusive resource: shared-dev image build context only; no application, database, secret, Caddy, staging
    or production-sim change.
  - Expected verification: rendered Compose context, dev/release deployment tests, `git diff --check`.
  - Review: PASS — Compose now receives the validated absolute workspace as its build context, so neither the remote
    login directory nor Compose project-directory semantics can move the Docker build outside the synced source.
  - Verification: rendered Compose context, `bash scripts/test-vps-dev.sh`, `pnpm release:test` and
    `git diff --check` PASS.
  - External next action: push the corrective to `dev`; no server-side runtime.env, secret, database, Caddy or port
    change is required.

## آخرین batch تکمیل‌شده — F12-B02-R16

Coordinator/Thread: `Codex /root`
Started at: `2026-10-09 +03:30`
Phase: `12-PRODUCTION-HARDENING` (shared-dev delivery and browser-runtime correctives)
Batch status: `DONE`
Contract baseline: Next services remain genuine development servers with bind-mounted source and HMR; the API keeps
its OOM-safe compile-on-sync runtime. Unchanged bootstrap work must be skipped, and public runtime configuration must
execute synchronously before hydration in web, app and dashboard.
Coordinator-only files: `plan/STATUS.md`, `plan/logs/phase-12.md`, `plan/logs/phase-01.md`.

- Task ID: `F12-T02-R16`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: completed `F12-T02-R15` and live healthy/OOM-free API evidence.
  - Scope: fingerprint API client, Prisma, public config and API emit inputs; run only changed bootstrap stages, avoid
    API recreation when its emit is unchanged, and reduce fresh-runner rsync retransmission.
  - Owned paths: `.github/CI.md`, `scripts/deploy-dev-vps.mjs`,
    `deploy/vps/{deploy-dev.sh,dev-service.sh,README.md}`, `scripts/{test-vps-dev.sh,test-release-pipeline.mjs}`.
  - Shared/exclusive resource: shared-dev sync lifecycle only; no release, staging, production-sim or product change.
  - Expected verification: first/dependency/source-only/frontend-only sync simulations, release contracts, syntax and
    `git diff --check`.
  - Review: PASS — unchanged/frontend-only syncs skip bootstrap and recreation; API-only changes transpile and
    recreate only API; dependency/runtime changes retain the full safe path. Generated artifacts persist across rsync.
  - Verification: `bash scripts/test-vps-dev.sh`, `pnpm release:test`, shell/Node syntax and `git diff --check` PASS.

- Task ID: `F01-R08`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: accepted browser auth/session baseline and live dev evidence that client hydration never attaches.
  - Scope: load the generated public runtime configuration as a native blocking head script before Next client chunks
    in web, app and dashboard; cover the shared contract and retain secret-free public values.
  - Owned paths: `apps/{web,app,dashboard}/src/app/layout.tsx`, `scripts/test-runtime-config-loading.mjs`.
  - Shared/exclusive resource: browser runtime-config bootstrap only; no auth policy, API or secret change.
  - Expected verification: runtime-config loading contract, three frontend typechecks, web tests/build, live-browser
    hydration reproduction locally, and `git diff --check`.
  - Review: PASS — runtime config now executes synchronously in the document head before any hydratable body content;
    all three clients retain the same generated secret-free public values and no longer depend on Next's script
    scheduler to begin hydration.
  - Verification: runtime-config contract, web tests/build, serial web/app/dashboard typechecks, local browser header
    hydration and intercepted login submission, and `git diff --check` PASS.
  - External next action: push both accepted task commits to `dev`; after the workflow completes, verify the public
    header leaves its account-checking skeleton and login submits to `https://dev-api.roxco.ir/v1/auth/login` rather
    than navigating with `POST https://dev.roxco.ir/login`.

## آخرین batch تکمیل‌شده — F12-B02-R15

Coordinator/Thread: `Codex /root`
Started at: `2026-10-09 +03:30`
Phase: `12-PRODUCTION-HARDENING` (`F12-T02` shared-dev live corrective)
Batch status: `DONE` (shared-dev API compiler/runtime isolation corrective)
Contract baseline: every Git sync compiles the API once in the one-shot bootstrap container; the persistent API
container only runs the emitted application so compiler and runtime memory cannot accumulate under its `1g` cgroup.
Coordinator-only files: `plan/STATUS.md`, `plan/logs/phase-12.md`.

- Task ID: `F12-T02-R15`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: completed `F12-T02-R14` and live cgroup evidence (`oom=2`, `oom_kill=2`, container unhealthy).
  - Scope: move shared-dev API compilation into bootstrap, leave only the emitted Node runtime in the API container,
    recreate that runtime once per completed sync, and freeze the separation in deployment tests.
  - Owned paths: `deploy/vps/{dev-service.sh,deploy-dev.sh}`, `scripts/{test-vps-dev.sh,
    test-release-pipeline.mjs}`; coordinator-only
    `plan/{STATUS.md,logs/phase-12.md}`.
  - Shared/exclusive resource: shared-dev API process lifecycle only; no application compiler contract, production
    runtime, database, secret, Caddy, port, staging or production-sim change.
  - Expected verification: constrained compiler emission with decorator metadata, dev/release deployment tests,
    shell syntax and `git diff --check`.
  - Review: PASS — bootstrap completes migration, optional seed and bounded transpilation before activation; the API
    container now runs only emitted Node code and source-only syncs recreate only that container.
  - Verification: constrained `640 MiB` emit with decorator metadata in 111 files, `pnpm release:test`, direct dev
    VPS contract test, Node/shell syntax and `git diff --check` PASS.
  - External next action: push this commit to `dev`; the runtime hash change forces recreation and replaces the live
    compiler-bearing unhealthy API container without any manual Caddy, database, secret or port change.

## آخرین batch تکمیل‌شده — F12-B02-R14

Coordinator/Thread: `Codex /root`
Started at: `2026-10-09 +03:30`
Phase: `12-PRODUCTION-HARDENING` (`F12-T02` shared-dev live corrective)
Batch status: `DONE` (low-memory shared-dev API compiler corrective)
Contract baseline: shared dev retains TypeScript decorator metadata and CI typechecking, but its persistent compiler
must emit without full semantic/declaration work inside the existing `1g` API container; failed probes must print the
service state and logs in the workflow.
Coordinator-only files: `plan/STATUS.md`, `plan/logs/phase-12.md`.

- Task ID: `F12-T02-R14`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: completed `F12-T02-R13` and repeated live API reset/restart evidence after the heap-only corrective.
  - Scope: make the API dev compiler transpile-only without losing decorator metadata, bound it below the previous
    heap ceiling, and expose API logs automatically when readiness fails.
  - Owned paths: `apps/api/scripts/dev.mjs`, `apps/api/test/dev-runtime.spec.ts`,
    `deploy/vps/deploy-dev.sh`, `scripts/test-release-pipeline.mjs`; coordinator-only
    `plan/{STATUS.md,logs/phase-12.md}`.
  - Shared/exclusive resource: API development compilation and dev readiness diagnostics only; no production runtime,
    database, secret, Caddy, port, staging or production-sim change.
  - Expected verification: constrained transpile with decorator metadata, focused API dev-runtime test, API build,
    dev/release deployment tests, syntax and `git diff --check`.
  - Review: PASS — dev `tsc` now skips semantic/declaration work, stays bounded at `640 MiB`, and preserves emitted
    Nest decorator metadata; CI/full builds retain normal typechecking. A failed health probe now prints service state
    and the last 200 log lines before exiting.
  - Verification: clean constrained emit at `640 MiB` with decorator metadata in 111 files, focused API dev-runtime
    test (3/3), full API build, `pnpm release:test`, Node/shell syntax and `git diff --check` PASS.
  - External next action: push this commit to `dev` and rerun `Sync shared dev VPS`; no server-side configuration
    change is required. If readiness still fails, the workflow will now include the actionable API logs.

## آخرین batch تکمیل‌شده — F12-B02-R13

Coordinator/Thread: `Codex /root`
Started at: `2026-10-09 +03:30`
Phase: `12-PRODUCTION-HARDENING` (`F12-T02` shared-dev live corrective)
Batch status: `DONE` (shared-dev API compiler heap corrective)
Contract baseline: shared dev keeps its existing `1g` API container limit; only the TypeScript compiler subprocess
receives a larger V8 old-space ceiling so the application runtime and other services are unaffected.
Coordinator-only files: `plan/STATUS.md`, `plan/logs/phase-12.md`.

- Task ID: `F12-T02-R13`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: completed `F12-T02-R12` secret-mount corrective and live logs proving compiler heap exhaustion.
  - Scope: prevent the shared-dev API compiler from restarting at the container-aware default V8 heap ceiling and
    add a focused regression assertion.
  - Owned paths: `apps/api/scripts/dev.mjs`, `apps/api/test/dev-runtime.spec.ts`; coordinator-only
    `plan/{STATUS.md,logs/phase-12.md}`.
  - Shared/exclusive resource: API development compiler process only; no production runtime, container limit,
    database, secret, staging or production-sim change.
  - Expected verification: focused API dev-runtime test, API development build, Node syntax and `git diff --check`.
  - Review: PASS — both TypeScript compiler invocations receive a `768 MiB` V8 old-space ceiling while the Nest
    runtime and the existing `1g` API container limit remain unchanged.
  - Verification: focused API dev-runtime test (3/3), API build, Node syntax and `git diff --check` PASS.
  - External next action: push this commit to `dev` and rerun `Sync shared dev VPS`; no server-side environment,
    database, secret, Caddy or port change is required.

## آخرین batch تکمیل‌شده — F12-B02-R12

Coordinator/Thread: `Codex /root`
Started at: `2026-10-09 +03:30`
Phase: `12-PRODUCTION-HARDENING` (`F12-T02` shared-dev live corrective)
Batch status: `DONE` (shared-dev lower-case secret mount corrective)
Contract baseline: Compose mounts lower-case file-secret names while application environment variables remain
upper-case; shared dev must translate between those names without changing secret files or release environments.
Coordinator-only files: `plan/STATUS.md`, `plan/logs/phase-12.md`.

- Task ID: `F12-T02-R12`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: completed `F12-T02-R11` build-context corrective and the first successful live dev image build.
  - Scope: make the shared dev secret loader read Compose's lower-case `/run/secrets/*` paths while exporting the
    existing upper-case API environment variables, and add a regression contract assertion.
  - Owned paths: `deploy/vps/dev-service.sh`, `scripts/test-release-pipeline.mjs`; coordinator-only
    `plan/{STATUS.md,logs/phase-12.md}`.
  - Shared/exclusive resource: shared-dev file-secret adapter only; no secret value, application contract, database,
    staging or production-sim change.
  - Expected verification: dev/release contract suite, VPS behavior simulation, shell syntax and `git diff --check`.
  - Review: PASS — one shared loader now maps upper-case environment-variable names to Compose's lower-case secret
    filenames, covering database, JWT, refresh pepper and both payment-key files without changing their values.
  - Verification: `pnpm release:test`, `bash scripts/test-vps-dev.sh`, `bash -n deploy/vps/dev-service.sh` and
    `git diff --check` PASS.
  - External next action: push this commit to `dev`; the existing PostgreSQL volume/container may remain in place and
    the sync can resume bootstrap without recreating secrets. No batch is started in this handoff.

## آخرین batch تکمیل‌شده — F12-B02-R11

Coordinator/Thread: `Codex /root`
Started at: `2026-10-09 +03:30`
Phase: `12-PRODUCTION-HARDENING` (`F12-T02` shared-dev live corrective)
Batch status: `DONE` (shared-dev build-context and Caddy corrective)
Contract baseline: shared dev remains isolated on `3300–3303`; Caddy terminates HTTPS; Compose build context must be
the synced workspace regardless of the deployment user's home path.
Coordinator-only files: `plan/STATUS.md`, `plan/logs/phase-12.md`.

- Task ID: `F12-T02-R11`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: completed `F12-T02-R10` port corrective and the second live dev-sync failure.
  - Scope: stop overriding Compose's file-relative project directory so `../..` resolves to the synced workspace,
    add a regression assertion for the resolved build context, and replace the obsolete Nginx example with the
    owner-confirmed Caddy virtual hosts on `3300–3303`.
  - Owned paths: `deploy/vps/{deploy-dev.sh,README.md}`, `scripts/test-release-pipeline.mjs`; coordinator-only
    `plan/{STATUS.md,logs/phase-12.md}`.
  - Shared/exclusive resource: shared-dev bootstrap build path and reverse-proxy documentation only; no application,
    database, secret, staging or production-sim change.
  - Expected verification: resolved Compose build-context assertion, dev/release contract suite, shell syntax and
    `git diff --check`.
  - Review: PASS — removing the unnecessary project-directory override restores Compose's file-relative `../..`
    resolution to the synced workspace. Caddy documentation now matches the confirmed live proxy and `3300–3303`.
  - Verification: resolved Compose JSON context equals the repository/workspace root; `pnpm release:test`,
    `bash scripts/test-vps-dev.sh`, shell syntax and `git diff --check` PASS.
  - External next action: update the live dev `runtime.env` and Caddy upstreams to `3300–3303`, push this corrective
    to `dev`, and rerun `Sync shared dev VPS`. No batch is started in this handoff.

## آخرین batch تکمیل‌شده — F12-B15-R1

Coordinator/Thread: `Codex /root`
Started at: `2026-10-08 +03:30`
Phase: `12-PRODUCTION-HARDENING` (owner-approved release regression correctives)
Batch status: `DONE`
Contract baseline: `ADR-0001` browser session contract, accepted Phase 09 commerce boundary, and the owner-approved
requirement that product browse/search/detail is public while patient-owned commerce mutations remain authenticated.
Coordinator-only files: `plan/{STATUS.md,phases/12-PRODUCTION-HARDENING.md,logs/phase-12.md}` and generated OpenAPI/client.

- Task ID: `F01-R05`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: accepted Phase 01 identity/session baseline and Phase 11 ADMIN-only dashboard admission.
  - Scope: renew the memory-only access token before protected app/dashboard requests, preserve single-flight refresh
    rotation and absolute session deadlines, and distinguish authentication expiry from real authorization denial.
  - Owned paths: `packages/api-client/src/index.ts`, focused API-client tests,
    `apps/app/src/{auth,components/auth,lib/api*}`, `apps/dashboard/src/{auth,components/auth,lib/api*,
    features/settings/settings-page.tsx}`, and focused frontend tests.
  - Shared/exclusive resource: API-client request transport and browser refresh-token rotation contract; no API
    token/session lifetime or role policy change.
  - Expected verification: expired-token request refresh, concurrent single-flight behavior, refreshed bearer use,
    refresh failure, 401/403 presentation, app/dashboard tests/typechecks/builds and `git diff --check`.
  - Review: PASS — protected requests now renew an expired memory-only access token through the existing single-flight
    refresh session before sending, without changing access/session lifetime or exposing refresh credentials. App and
    dashboard retain their authenticated view during renewal, and settings distinguish 401 from a real 403 denial.

- Task ID: `F09-T04-R1`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: accepted F09-T04 catalog/cart implementation; independent of F01-R05 implementation.
  - Scope: make active product browse/search/detail public for the single active release clinic, keep cart/wishlist/
    checkout/order/payment protected, and prevent protected personalization failures from hiding the public catalog.
  - Owned paths: `apps/api/src/modules/commerce/catalog/{patient-commerce-catalog.controller.ts,
    patient-commerce-catalog.service.ts}`, focused API/OpenAPI tests; `apps/app/src/app/**/store/**`, app layouts,
    `apps/app/src/lib/commerce-catalog-api*`, focused app tests; generated OpenAPI/client.
  - Shared/exclusive resource: commerce catalog route contract and generated OpenAPI/client; no Prisma change.
  - Expected verification: anonymous public catalog/detail plus active-clinic filtering, protected patient commerce
    authorization regression, OpenAPI/client freshness, app/API tests/typechecks/builds and `git diff --check`.
  - Review: PASS — active-clinic product browse/search/detail is available without a bearer token, while inactive
    products/categories/SKUs and other clinics stay hidden. Cart, wishlist, address, checkout, order and payment
    remain protected; a protected personalization failure no longer hides the public catalog.
  - Verification: disposable PostgreSQL workspace suite (5/5 packages; API 95 files/385 tests, app 12/50,
    dashboard 18/62, web 4/9, API client 1/5), API/app typechecks and production builds, generated OpenAPI/client
    freshness, focused anonymous/protected contract checks and `git diff --check` PASS.

- Task ID: `F12-T02-R10`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: accepted `F12-T02-R9` shared-dev delivery and live collision evidence from the first dev sync.
  - Scope: move the documented/default shared-dev host bindings away from the already-reserved production-sim
    `3200–3203` range to `3300–3303`, retaining the existing fail-closed cross-environment validation.
  - Owned paths: `deploy/vps/{dev-env.example,README.md}`, `scripts/{test-vps-dev.sh,
    test-release-pipeline.mjs}`; coordinator-only `plan/{STATUS.md,logs/phase-12.md}`.
  - Shared/exclusive resource: VPS loopback port allocation only; no container internal port, database, secret,
    production runtime or application contract change.
  - Expected verification: simulated collision rejection, dev/release contract suite, exact port-reference scan and
    `git diff --check`.
  - Review: PASS — the live blocker was a correct fail-closed boundary check, not a container failure. The dev
    defaults now use the unreserved `3300–3303` range; production-sim retains `3200–3203`.
  - Verification: `bash scripts/test-vps-dev.sh`, `pnpm release:test`, exact port-reference scan and
    `git diff --check` PASS. The behavior test now models both staging (`3100–3103`) and production-sim
    (`3200–3203`) before accepting the new dev range.
  - External next action: change only the dev `runtime.env` and the four dev reverse-proxy upstreams to `3300–3303`,
    then push this corrective and rerun the same `dev` SHA. Do not change production-sim.

- Batch review gate: PASS — all three independently committed tasks have implementation, focused/integration
  verification and recorded evidence. The active claim is cleared; no new batch is started. `F12-T05` and
  `F12-T07` remain externally blocked, `F12-T09` remains dependency-gated, and `F12-T11`/`F12-T12` remain
  unclaimed.

## آخرین batch تکمیل‌شده — F12-B02-R9

Coordinator/Thread: `Codex /root`
Started at: `2026-10-08 +03:30`
Phase: `12-PRODUCTION-HARDENING` (`F12-T02` owner-approved development-delivery extension)
Batch status: `DONE` (isolated fast shared development delivery)
Contract baseline: one shared internal `dev` branch/environment on the existing VPS; source-sync and hot reload are
isolated from immutable `main` release workflows, databases, secrets, ports and state.
Coordinator-only files: `plan/STATUS.md`, `plan/logs/phase-12.md`, deployment workflow and ADR.

- Task ID: `F12-T02-R9`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: accepted VPS deployment baseline and completed `F07-T11-R1` corrective.
  - Scope: implement a gated `dev`-branch source-sync workflow, persistent Docker Compose watch services, isolated
    PostgreSQL/secrets/ports, dependency and migration bootstrap, health verification, operator setup documentation
    and focused contract/behavior tests without changing the production release path.
  - Owned paths: `.github/workflows/dev-sync.yml`, `.github/CI.md`, `deploy/vps/{Dockerfile.dev,compose.dev.yaml,
    dev-*.sh,dev-env.example,README.md}`, `scripts/{deploy-dev-vps.mjs,test-vps-dev.sh,
    test-release-pipeline.mjs}`, one deployment ADR; coordinator-only `plan/{STATUS.md,logs/phase-12.md}`.
  - Shared/exclusive resource: VPS deployment identity and host resource envelope; no production runtime state,
    Prisma schema, OpenAPI contract or application feature code change.
  - Expected verification: dev workflow/release contracts, simulated VPS source/bootstrap/watch behavior, shell/Node
    syntax, YAML parse, production workflow non-regression and `git diff --check`.
  - Review: PASS — `dev` now has a gated source-sync path, persistent Nest/Next watchers, isolated/capped Compose
    state and fail-closed boundary checks. Existing `main` CI, immutable release and promotion files are unchanged.
  - Verification: `pnpm release:test`, `bash scripts/test-vps-dev.sh`, Node/shell syntax, dev workflow YAML parse and
    `git diff --check` PASS. The focused simulation covers first bootstrap/seed, source-only hot update, dependency
    reinstall/recreate and staging-port collision rejection.
  - External next action: configure the documented VPS runtime/secrets/DNS/reverse proxy and GitHub variable, create
    branch `dev`, then record the first live four-endpoint sync. No batch is started in this handoff.

## آخرین batch تکمیل‌شده — F12-B14-R1

Coordinator/Thread: `Codex /root`
Started at: `2026-10-08 +03:30`
Phase: `12-PRODUCTION-HARDENING` (`F07-T11` CI reliability corrective)
Batch status: `DONE` (prescription concurrency-test reliability corrective)
Coordinator-only files: `plan/STATUS.md`, `plan/logs/phase-12.md`

- Task ID: `F07-T11-R1`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Scope: remove the nondeterministic winner assumption from the real-PostgreSQL concurrent prescription revision
    assertion while preserving the one-winner/one-conflict and exact issued-evidence contract.
  - Owned paths: `apps/api/test/prescription.integration.spec.ts`; coordinator-only
    `plan/{STATUS.md,logs/phase-12.md}`.
  - Review: PASS — the test still requires exactly one committed revision and one stale-revision conflict, but now
    verifies issued/history evidence against whichever concurrent request PostgreSQL serialized first.
  - Verification: CI run `37727025727` passed the original race; post-merge run `37727664058` reproduced the opposite
    valid winner and isolated the sole flaky assertion. Patched main CI run `37729167480`, API typecheck and
    `git diff --check` PASS.
  - Next eligible work: no batch is started in this handoff; the requested isolated fast dev environment can be
    claimed next without modifying the production release path.

## آخرین batch تکمیل‌شده — F12-B13-R1

Coordinator/Thread: `Codex /root`
Started at: `2026-10-08 +03:30`
Phase: `12-PRODUCTION-HARDENING` (`F02-T08` release-readiness corrective)
Batch status: `DONE` (patient profile and consent-policy release corrective)
Contract baseline: `plan/contracts/patient-onboarding-v1.md`; missing policy remains fail-closed and no production
placeholder may be introduced.
Coordinator-only files: `plan/STATUS.md`, `plan/logs/phase-12.md`

- Task ID: `F02-T08-R1`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Scope: restore newly registered patient profile access when the consent policy is unavailable, preserve the
    explicit onboarding blocker, expose the real generated-client error code, and add release-safe consent-policy
    verification/provisioning support without running the development seed.
  - Owned paths: `apps/app/src/lib/onboarding/**`, `apps/app/src/app/(app)/profile/**`, focused app tests;
    `apps/api/prisma/*consent-policy*`, `apps/api/package.json`, focused API/script tests; VPS release scripts,
    deployment documentation and their contract tests; coordinator-only `plan/{STATUS.md,logs/phase-12.md}`.
  - Shared/exclusive resource: consent-policy lifecycle and VPS release activation sequence; no schema/OpenAPI change.
  - Review: PASS — profile/edit/medical views now load only their own resources; generated-client error bodies retain
    stable error codes; onboarding remains explicitly fail-closed when consent is unavailable. Rehearsal deployment
    publishes and verifies an environment/hash-bound policy after migrations and before application activation.
  - Verification: focused app 10/10 and consent-policy 3/3 tests, full app 48/48 tests, app/API typechecks and builds,
    release/VPS contracts, shell/Node syntax and `git diff --check` PASS. The full API integration suite was not
    asserted because no local PostgreSQL listener or Docker engine is available; failures stopped at database setup.
  - Next eligible work: no batch is started. Deploy this commit through the existing release path and confirm a new
    patient can open profile and complete consent in staging; production still requires a separately approved policy.

## آخرین batch تکمیل‌شده — F12-B02-R8

Coordinator/Thread: `Codex /root`
Started at: `2026-10-08 +03:30`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE` (non-root file-secret ownership corrective)

- Task ID: `F12-T02`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Scope: correct file-secret ownership for the accepted non-root Distroless UID/GID after the first live staging
    deployment proved that Compose file secrets retain host ownership.
  - Owned paths: `deploy/vps/deploy-release.sh`, `scripts/test-vps-deploy.sh`, VPS deployment documentation;
    coordinator-only `plan/{STATUS.md,logs/phase-12.md}`.
  - Expected verification: VPS behavior contract, release contract, shell syntax, security/ordering review and
    `git diff --check`; live staging rerun remains external evidence.
  - Review: PASS — the accepted API artifact now performs a no-network, read-only, capability-bounded ownership helper
    before migration/activation. Host owner `deploy` is retained, runtime group `65532` receives read access and no
    secret becomes world-readable.
  - Verification: VPS behavior/release contracts, shell syntax and `git diff --check` PASS. Live run `37715705119`,
    attempt 4, completed successfully; all five staging containers and API live/ready plus three Next HTTP probes pass.
  - Next eligible work: no batch is started. Record baseline release `37715705119` for the later two-update and
    rollback rehearsal; production-sim promotion remains an explicit owner operation.

## آخرین batch تکمیل‌شده — F12-B02-R7

Coordinator/Thread: `Codex /root`
Started at: `2026-10-08 +03:30`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE` (private GitHub Free test-VPS credential boundary)

- Task ID: `F12-T02`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Scope: adapt the test-VPS CD workflows to the confirmed private-repository GitHub Free boundary by using
    repository-scoped SSH inputs, while preserving automatic staging, explicit owner promotion/rollback,
    immutable manifests and the two isolated VPS environments.
  - Owned paths: `.github/workflows/{release,promote,rollback}.yml`, `.github/CI.md`, `deploy/vps/README.md`,
    `scripts/test-release-pipeline.mjs`, affected SpecKit/decision documentation; coordinator-only
    `plan/{STATUS.md,logs/phase-12.md}`.
  - Expected verification: workflow contract tests, YAML/actionlint, permission and owner-gate review,
    repository-input documentation review and `git diff --check`.
  - Review: PASS — GitHub Environment references were removed from the three VPS workflows because the confirmed
    private repository on GitHub Free cannot configure them. Repository-scoped SSH inputs are validated before use;
    staging remains opt-in/automatic, while production-sim promotion and rollback retain explicit actor matching.
  - Verification: `pnpm release:test`, six-workflow YAML parse, actionlint and `git diff --check` PASS.
  - External next action: repository Actions currently reports zero repository variables and zero repository secrets.
    Configure the documented four SSH secrets and four variables, keep `VPS_CD_ENABLED=false` until present, then set
    it to `true` and merge a baseline update to exercise staging. No new batch is started.

CI maintenance handoff (owner-authorized, 2026-10-04): ordinary checks retained; security/browser/artifact
gates added; frozen chat capacity is manual-only without changing its contract. Browser 7/7, typecheck,
dependency High/Critical gate, tracked-source secret scan and workflow validation pass. Artifact smoke/scan
remains unverified because the local Docker Linux engine is unavailable; no full-green claim or task DONE.
No roadmap task/batch selected, no existing blocker/dependency changed. Scope is CI configuration/helpers/docs
only. Evidence and exact remaining verification: [`logs/ci-maintenance-2026-10-04.md`](logs/ci-maintenance-2026-10-04.md).

`F10-T09 REWORK` CI/load-test isolation is accepted; Phase 10 remains `DONE (CLOSED)`. `F11-T01` through `F11-T11`
remain accepted with independent closure evidence in [`logs/phase-11.md`](logs/phase-11.md); Phase 11 remains
`DONE (CLOSED)` and is out of scope. `F12-T01` is accepted with evidence in [`logs/phase-12.md`](logs/phase-12.md).
`F12-T02 REWORK` is accepted with corrective evidence in [`logs/phase-12.md`](logs/phase-12.md): bounded bigint
request values now cross the actual transport as JSON number tokens, and top-level `Amount`/`OrderId` response
literals remain exact through Verify parsing. The `@sabz-zendegi/api-client` resolver was a fresh-worktree artifact
preparation issue (`dist/` missing despite a correct workspace link); its package build and dashboard checks pass.
`F12-T06` remains accepted and unchanged. `F12-T03` is accepted with evidence in
[`logs/phase-12.md`](logs/phase-12.md): the frozen mixed result is PASS at 99.944% success and p95 21.81ms; the
boundary 401s are a known iteration-based harness artifact rather than a product/capacity failure; and the complete
frozen chat workload passes with its per-batch timing and final count/sequence invariants. The harness rotates from
JWT `exp` with a safety margin and keeps all-route-2xx only as a short preflight check. Mixed, booking-conflict and
simulated-Sadad results were retained, not rerun. `F12-T05` remains
unchecked and unclaimed: Liara's official CLI evidence confirms
manually created/downloadable backups but not the approved daily backup plus continuous WAL/archive, restore/PITR,
or RPO/RTO capability. `F12-T02`'s corrective provider-neutral OCI artifact extension is accepted with evidence in
[`logs/phase-12.md`](logs/phase-12.md): the pinned Distroless Node 24 non-root runners, explicit API-image migration,
public-only runtime configuration, Compose health and Liara documentation-profile gates pass; all four actual release
images scan `0 Critical / 0 High`. This proves local artifact behavior only, not Liara or Sadad external readiness.

## آخرین batch تکمیل‌شده — F12-B02-R6

Coordinator/Thread: `Codex /root`
Started at: `2026-10-08 +03:30`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE` (free-plan-compatible manifest preservation and optional provenance attestation)

- Task ID: `F12-T02`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Scope: preserve the immutable release manifest before optional provenance work, skip GitHub artifact attestations
    unless explicitly enabled on a supporting plan, and retain digest-only promotion/deployment guarantees.
  - Owned paths: `.github/workflows/release.yml`, `.github/CI.md`, `deploy/vps/README.md`,
    `scripts/test-release-pipeline.mjs`; coordinator-only `plan/{STATUS.md,logs/phase-12.md}`.
  - Expected verification: workflow contract tests, YAML/actionlint, permission/order review and `git diff --check`.
  - Review: PASS — GitHub run `37540615770` attempt 3 published all four private images and produced exact digests,
    then failed only because private-repository artifact attestation is unavailable on the organization's Free plan.
    The manifest is now uploaded before optional attestation work, and all provenance steps require the explicit
    `GHCR_ATTESTATIONS_ENABLED=true` repository variable. Digest-only promotion and deployment remain unchanged.
  - Verification: `pnpm release:test`, six-workflow YAML parse, actionlint 1.7.12 and `git diff --check` PASS.
  - Next eligible work: no batch is started. Merge this corrective, allow the resulting main release to publish a
    retained manifest, then configure the VPS inputs before enabling staging delivery.

## آخرین batch تکمیل‌شده — F12-B02-R5

Coordinator/Thread: `Codex /root`
Started at: `2026-10-06 +03:30`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE` (continuous-delivery software/readiness scope; live VPS acceptance remains a release gate)

- Task ID: `F12-T02`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: accepted provider-neutral OCI artifacts, release build/scan gates and F12-T10 application-only
    rollback contract. No active batch or ownership conflict exists.
  - Scope: clarify and implement automatic immutable-image publication, staging deployment to a disposable/test VPS,
    owner-gated production promotion, explicit migration and application-only rollback. Preserve provider-neutral
    application/runtime code and keep real Sadad and production activation blocked.
  - Owned paths: `specs/010-production-hardening/{spec.md,plan.md,tasks.md}`, `.github/workflows/**`,
    `deploy/**`, `scripts/**`, release documentation and package scripts needed by this corrective;
    coordinator-only `plan/{STATUS.md,phases/12-PRODUCTION-HARDENING.md,logs/phase-12.md}`.
  - Shared/exclusive resources: GHCR release namespace, deployment workflow contracts, migration/release manifest and
    VPS staging interface.
  - Expected verification: workflow validation, least-privilege permission review, immutable digest and provenance
    assertions, offline migration, disposable/local deployment rehearsal, VPS deployment/update/rollback evidence when
    target access is supplied, and `git diff --check`.
  - Review: PASS — successful protected-main CI is the only private-GHCR publication trigger; the four exact digests
    are preserved in one release manifest, staging delivery is automatic only when explicitly enabled, production-sim
    promotion/rollback is a separate owner-dispatched operation, and the VPS script enforces pinned SSH, non-root use,
    isolated Compose projects, temporary registry authentication, migration-before-switch and application-only rollback.
  - Verification: SpecKit analysis has 100% requirement/task coverage and no HIGH/CRITICAL finding; release contract,
    workflow YAML/actionlint, synthetic Compose configuration, staged/failed-release rollback behavior, lint/typecheck
    and actual four-image build/smoke/scan all pass. The four images remain `0 Critical / 0 High` and all run as the
    accepted non-root Distroless UID/GID.
  - External gate: no GHCR publication or VPS deployment was performed. Before release sign-off, configure a GitHub
    plan that supports private-repository Environment secrets, repository variables, environment-scoped SSH material
    and the isolated test VPS; then retain evidence for one baseline, two sequential updates and controlled rollback.
  - Next eligible work: no batch is started. F12-T05/F12-T07 remain blocked by their existing external evidence; F12-T09
    remains dependency-gated. Real production and Sadad activation remain blocked through F12-T13.

## آخرین batch تکمیل‌شده — F12-B02-R4

Coordinator/Thread: `Codex /root`
Started at: `2026-10-05 +03:30`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE` (owner-requested release-build and CI corrective)

- Task ID: `F12-T02`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: accepted provider-neutral OCI artifacts, artifact smoke/scan gates and documentation from F12-T02.
    No active batch or ownership conflict exists.
  - Scope: replace four manually repeated image-build commands with one declarative Docker Buildx Bake entry point;
    keep deterministic commit tags and lowercase registry derivation; diagnose and correct cross-event GitHub Actions
    cancellation without weakening tests. Do not publish images, deploy, provision a provider, touch runtime code or
    activate Sadad.
  - Owned paths: `docker-bake.hcl`, `scripts/release-images.mjs`, `package.json`, `README.md`, `docs/PRODUCTION.md`,
    `.github/workflows/{ci.yml,container-checks.yml}`; coordinator-only `plan/{STATUS.md,logs/phase-12.md}`.
  - Shared/exclusive resource: release artifact build configuration and CI concurrency keys.
  - Expected verification: Bake print/target/tag assertions, wrapper dry-run and argument validation, workflow parse
    and concurrency review, targeted package-script validation, current remote CI evidence and `git diff --check`.
  - Review: PASS — Docker Buildx Bake now defines the four release targets once, and the root wrapper derives a
    lowercase registry plus commit-based tags for print/build/verify/push. The full local verification built all four
    Distroless/non-root artifacts, passed their disposable smoke checks and reported `0 Critical / 0 High` for every
    image. Workspace lint, typecheck and all tests also pass against a disposable PostgreSQL 16 database.
  - CI diagnosis: the canceled post-merge `pnpm test` step contains no failed assertion and the same test command
    passes locally and in the following pull-request run. GitHub's retained log reports only an external cancellation,
    so it does not identify the initiator. CI and artifact checks now use GitHub's documented `head_ref || run_id`
    pattern: stale runs for one pull-request branch cancel, while every protected `main` push gets a unique group and
    cannot be canceled by workflow concurrency. Container CI consumes the same Bake targets.
  - Next eligible work: no batch is started. Existing F12-T05/F12-T07 external-evidence blockers and the F12-T09
    dependency remain unchanged.

## آخرین batch تکمیل‌شده — F12-B02-R3

Coordinator/Thread: `Codex /root`
Started at: `2026-10-05 +03:30`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE` (owner-requested documentation-only corrective)

- Task ID: `F12-T02`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: accepted provider-neutral OCI artifacts and migration/rollback procedure from `F12-T02` and
    `F12-T10`. No active batch or ownership conflict exists.
  - Scope: add one development/Codespaces runbook and one production image build/promotion runbook, then replace
    the stale root README overview with accurate project entry points and links. Do not change runtime code,
    dependencies, migrations, deployment artifacts, provider configuration, secrets or external environments.
  - Owned paths: `README.md`, `docs/DEVELOPMENT.md`, `docs/PRODUCTION.md`; coordinator-only
    `plan/{STATUS.md,logs/phase-12.md}`.
  - Shared/exclusive resource: documentation only.
  - Expected verification: command/path/config review against package scripts, Dockerfiles, Compose files and CI;
    Markdown link validation; no-secret review; `git diff --check`.
  - Review: PASS — root README now routes contributors to two focused runbooks. Development covers local and
    Codespaces configuration, valid synthetic secrets, migrations, seed, runtime URLs and lifecycle. Production
    covers four provider-neutral image builds, artifact smoke/scan, registry digest capture, file-backed secrets,
    Compose migration/start, staging promotion, update and application-only rollback. All relative links and
    documented repository paths/scripts resolve; 36 Bash blocks pass syntax validation; the documented loopback
    port-variable shape passes `docker compose config`; no real secret or provider action is present. A post-push
    usability correction now derives and lowercases the GHCR namespace instead of exposing a copyable uppercase
    `OWNER` placeholder that Docker rejects.
  - Next eligible work: no batch is started. Existing F12-T05/F12-T07 blockers and the F12-T09 dependency remain
    unchanged.

## batch تکمیل‌شده — F12-B05-R1

Coordinator/Thread: `Codex /root`
Started at: `2026-10-04 +03:30`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE` (reduced single-task migration/rollback rehearsal)

- Task ID: `F12-T10`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: `F12-T02` and `F12-T04` are DONE. `F12-T09` is not eligible because `F12-T07` remains BLOCKED;
    F12-T05 and F12-T07 are excluded and retain their existing owners/paths. No active ownership conflict exists:
    the pre-existing uncommitted F12-T07 secret-rotation files remain untouched, unstaged and out of this task.
  - Scope: on run-owned disposable PostgreSQL only, rehearse empty-database replay, an older schema baseline upgrade,
    current/previous application compatibility at rollout, application rollback against the current schema, and
    Prisma validate/generate/migrate-status/client compatibility. Record expand/migrate/contract and forward-fix
    policy, commands, duration, result and cleanup. Do not create, rewrite or remove an accepted migration, a
    destructive data rollback, shared/staging/production database, capacity run, container scan, Sadad operation or
    F12-T02 rerun.
  - Owned paths: `apps/api/test/phase-12-migration-rollback.integration.spec.ts`,
    `deploy/phase-12-migration-rollout.md`; coordinator-only
    `plan/{STATUS.md,phases/12-PRODUCTION-HARDENING.md,logs/phase-12.md}`.
    Shared/exclusive resource: schema/migration compatibility rehearsal and fully labelled run-owned PostgreSQL
    container/databases; no schema, migration, dependency, client-generation output or F12-T07 file may be changed.
  - Expected verification: fresh 32-migration replay, selected pre-current baseline upgrade, previous/current API
    startup and client compatibility at the rollout boundary, explicit rollback-to-previous-artifact startup, Prisma
    validate/generate/migrate status, test evidence, cleanup and `git diff --check`.
  - Review: PASS — labelled PostgreSQL 16 child databases replayed all 32 immutable migrations, passed Prisma
    validate/generate/status and proved the actual Phase 09→10 SQL upgrade is forward-only. Clean source artifacts
    from `d8e9948` (previous) and `df24278` (current) each built non-root, and readiness passed in order
    previous → current → previous against the current schema. No data/schema rollback was performed; application
    rollback leaves the expanded schema in place. All run-owned Docker databases, containers, networks and images
    were removed. Evidence: [`logs/phase-12.md`](logs/phase-12.md).
  - Next eligible work: no batch is started. F12-T09 remains ineligible while F12-T07 is BLOCKED; F12-T11 and
    F12-T12 are not started by this task.

## آخرین batch تکمیل‌شده — F12-B02-R2

Coordinator/Thread: `Codex /root`
Started at: `2026-10-02 +03:30`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE` (single-task Distroless runtime corrective extension)

- Task ID: `F12-T02`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: accepted `F12-T01`; original T02 and its serialization corrective (`44667c2`) are accepted. No
    active ownership conflict: the pre-existing, uncommitted F12-T07 secret-rotation files are preserved and
    explicitly excluded from this task's staging and commit.
  - Scope: record ADR-0011 and update the release envelope/SpecKit task map; make API/web/app/dashboard OCI
    artifacts provider-neutral and non-root; add public runtime URL configuration, explicit API-image migration,
    production Compose example and a Liara documentation-only profile. Verify image build/smoke/health/migration and
    scan the real artifacts. No provider provisioning, external Sadad call, secret, or production deployment.
  - Initial verification: API/web/app/dashboard typechecks and entrypoint shell syntax pass; `git diff --check` passes.
    Docker Desktop's service is stopped, cannot be started from this non-elevated session, and its existing Linux-engine
    named pipes accept no CLI response (`docker version` and the run-owned image build remained silent). Therefore no
    OCI image, smoke/health/migration result or actual container scan exists and none is claimed.
  - Prior verification: `docker version` (`28.4.0`) and `docker run --rm hello-world` pass. The API image built
    as non-root `mushroom`; its run-owned tag was removed during cleanup. The web image failed at `next build` because
    Docker could not resolve workspace package `@sabz-zendegi/api-client`, although the same local web build passes.
    No web/app/dashboard image, smoke, migration, Compose validation or image scan ran after this gate failure.
  - Resumption scope: owner diagnosis confirms the workspace symlink is correct; ignored `dist/` plus imported
    `tsconfig.tsbuildinfo` made TypeScript skip its output. This run owns only ignoring incremental/turbo caches,
    forcing API-client output generation with an `dist/index.js` assertion, then the remaining artifact gates. Keep the
    pre-existing F12-T07 changes unstaged; do not provision Liara or contact Sadad.
  - Result: the clean client-output assertion unblocked all four OCI image builds; non-root runtime config, one-shot
    migration and API liveness/readiness pass. Production Compose fails before startup at line 27 because its inline
    mapping contains an unquoted `${VAR:?message}` with `:`. The run-owned Docker containers/networks were removed.
  - Current execution: all required Compose interpolations are quoted and API/web/app/dashboard environments use
    block mappings; `docker compose config` resolves with synthetic values. All four images rebuilt and the
    disposable migration passed, but the Compose API container rejected deliberately non-secret yet malformed AES and
    keyring test values before reaching health. The three Next services were healthy/non-root. All run-owned
    containers, network and images were removed.
  - Review: PASS — the owner-approved pinned Distroless Node 24 Debian 13 non-root final base, numerical
    `65532:65532` ownership, Node-only API/Next entrypoints, clean API-client assertion, explicit Prisma JavaScript
    migration, runtime-config promotion, Compose health and Liara documentation-profile gates all pass. Docker Scout
    reports `0 Critical / 0 High` for each of API, web, app and dashboard. All run-owned Docker resources were
    removed. F12-T07 remains unstaged and outside this commit. Evidence: [`logs/phase-12.md`](logs/phase-12.md).
  - Next eligible work: no batch is started. F12-T05 and F12-T07 remain external-evidence blockers; do not start B05.

## batch تکمیل‌شده — F12-B04-R2

Coordinator/Thread: `Codex /root`
Started at: `2026-10-02 +03:30`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE` (single-task corrective override compatibility experiment)

- Task ID: `F12-T08`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: `F12-T01` and `F12-T02` DONE; no active ownership conflict. F12-T07’s uncommitted secret-rotation
    work remains preserved and excluded from every T08 stage/commit. The experiment owns only the bounded root
    `pnpm.overrides` entries, corresponding lockfile paths and T08 scan/evidence/status hunks. It tests the
    registry-stable advisory versions `deepmerge-ts@8.0.2` (GHSA-ggr8-5vv4-36mx requires >=8.0.0) and
    `mysql2@3.24.5` (GHSA-3f6p-5ww8-9rcr requires >=3.22.0), without Prisma 8 or MySQL configuration. Frozen
    install, Prisma validate/generate, fresh disposable PostgreSQL migration/replay, typechecks, affected tests/build,
    abuse suite and final audit passed. The final audit is `0 critical`, `0 high`, `5 moderate`, `0 low`; T08 is
    accepted. No B05 work is authorized.

## batch نیازمند بازکاری — F12-B04-R1

Coordinator/Thread: `Codex /root`
Started at: `2026-10-02 +03:30`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `REWORK` (single-task corrective batch closed without completion commit)

- Task ID: `F12-T08`
  - Agent/Thread: `Codex /root`
  - Status: `REWORK (unchecked; claim released)`
  - Depends on: `F12-T01` and `F12-T02` DONE; no active task ownership conflict. F12-T07’s uncommitted secret-rotation
    work is preserved but excluded from every T08 stage/commit. Owned resource: dependency/lockfile remediation,
    scan results and abuse verification. The source audit had 30 unique GHSA advisories, represented by 35
    advisory-plus-patched-version entries across 47 advisory-path occurrences (18 unique dependency paths). The serialized Next, Nest/Fastify and bounded
    transitive remediation removes all critical findings, but the final production audit is `0 critical`, `2 high`,
    `6 moderate`, `0 low`: Prisma 7.10.0 still resolves `deepmerge-ts@7.1.5` (GHSA-ggr8-5vv4-36mx; patched >=8.0.0)
    and `mysql2@3.15.3` (GHSA-3f6p-5ww8-9rcr; patched >=3.22.0). No compatible stable parent upgrade exists;
    Prisma 8 is pre-release/major and was not adopted blindly. Exact next action: owner-approved Prisma-major
    compatibility remediation or wait for a compatible stable Prisma release, then rerun the final audit and abuse
    suite. No B05 work is authorized.

## آخرین batch نیازمند بازکاری — F12-B04

Coordinator/Thread: `Codex /root`
Started at: `2026-10-02 +03:30`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `REWORK/BLOCKED` (closed without a successor batch)

- Task ID: `F12-T04`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: `F12-T03` DONE. Disposable query-plan, bounded-pool saturation and controlled timeout-recovery
    checks passed. The accepted T03 result has no measured query/pool/timeout bottleneck, so no runtime setting,
    index, datastore or topology was changed. Owned resource: query-plan, pool/timeout code/tests and T04-only
    evidence.
- Task ID: `F12-T07`
  - Agent/Thread: `Codex /root`
  - Status: `BLOCKED (unchecked; claim released)`
  - Depends on: `F12-T01` and `F12-T02` DONE. Software-level versioned key rotation, validation and synthetic
    continuity tests are prepared, but acceptance requires written Liara managed-secret-store capability and an
    authorized environment drill. That evidence is absent and remains a F12-T13 sign-off gate. Owned resource:
    secret inventory/rotation procedure, secret-template boundary and key-rotation test/evidence.
- Task ID: `F12-T08`
  - Agent/Thread: `Codex /root`
  - Status: `REWORK (unchecked; claim released)`
  - Depends on: `F12-T01` and `F12-T02` DONE. Corrective serialized remediation reduced the production audit from
    10 critical/37 high to 0 critical/2 high, but did not and may not mute or waive the remaining Prisma transitives:
    `deepmerge-ts@7.1.5` (GHSA-ggr8-5vv4-36mx; patched >=8.0.0) and `mysql2@3.15.3`
    (GHSA-3f6p-5ww8-9rcr; patched >=3.22.0). Exact next action: owner-approved Prisma-major compatibility
    remediation or compatible stable parent release, then rerun audit and abuse coverage. Owned resource: scan
    configuration/results and auth/rate-limit/Sadad callback-redirect/secret-disclosure abuse coverage.

The coordinator serialized the shared Phase 12 checklist, status and evidence updates. T04 received its independent
commit; T07/T08 have no completion commit because their acceptance gates are unresolved. No runtime secret, provider
provisioning, external Sadad request, enable/default, production deployment, push or PR is authorized.

## آخرین batch تکمیل‌شده — F12-B03-R3

Coordinator/Thread: `Codex /root`
Started at: `2026-10-02 +03:30`
Completed at: `2026-10-02 +03:30`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE`

- Task ID: `F12-T03`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: `F12-T01` and `F12-T02` are DONE; no active ownership conflict. `F12-T06` remains accepted and
    excluded; `F12-T05` remains separately BLOCKED and unclaimed.
  - Scope: corrected the capacity-harness token rotation/acceptance diagnosis; recorded the valid frozen mixed result;
    passed a short boundary preflight; then ran only the outstanding frozen chat workload with durable ignored stdout/stderr.
    Mixed, booking conflict, and simulated Sadad invariants were not rerun.
  - Owned paths: F12 capacity harness, run-owned capacity logs and coordinator-only
    `plan/{STATUS.md,phases/12-PRODUCTION-HARDENING.md,logs/phase-12.md}`. No payment runtime, schema/migration,
    dependency, workflow or F12-T05/T06 path.
  - Review: `PASS` — frozen mixed acceptance is `17,990/18,000` (`99.944444%`) and p95 `21.8106ms`, satisfying the
    authoritative `>=99%` and `<=750ms` thresholds. The all-route-2xx assertion is preflight-only. The short boundary
    preflight passed, and the frozen chat execution exited `0` after `2202.78s` with both tests passing, including
    `20 msg/s × 30 min`, a `61s` gap, `50 msg/s × 5 min`, every batch `<=1000ms`, and count/sequence `511` per
    conversation. API typecheck, `git diff --check`, owned-path review and disposable database/container cleanup pass.

## آخرین batch نیازمند بازکاری — F12-B03-R2

Coordinator/Thread: `Codex /root`
Started at: `2026-10-01 22:20 +03:30`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `REWORK`

- Task ID: `F12-T03`
  - Agent/Thread: `Codex /root`
  - Status: `REWORK (unchecked/unclaimed)`
  - Depends on: `F12-T01` and `F12-T02` are DONE; no ownership conflict. F12-T06 remains accepted and excluded;
    F12-T05 remains separately blocked and unclaimed.
  - Scope: after preflight PASS, execute the exact approved mixed authenticated profile once and then the exact frozen
    Phase 10 chat workload serially, each with durable ignored stdout/stderr and exit-code evidence. No booking/Sadad
    rerun without a new cause.
  - Owned paths: F12 capacity harness, run-owned capacity logs and coordinator-only
    `plan/{STATUS.md,phases/12-PRODUCTION-HARDENING.md,logs/phase-12.md}`. No payment runtime, schema/migration,
    dependency, workflow or F12-T05/T06 path.
  - Review: `SUPERSEDED` — R2's frozen mixed metrics, `17,990/18,000` (`99.944%`) and p95 `21.81ms`, meet the only
    authoritative acceptance thresholds. The ten boundary 401s were an iteration-based harness artifact; the prior
    per-route all-2xx assertion was not an authoritative gate. See accepted F12-B03-R3 evidence for the corrected
    expiry-driven rotation, boundary preflight and completed chat workload.

## آخرین batch نیازمند بازکاری — F12-B03-R1

Coordinator/Thread: `Codex /root`
Started at: `2026-10-01 18:20 +03:30`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `REWORK`
Contract baseline: approved mixed/booking capacity profile and frozen Phase 10 chat contract in
`plan/contracts/phase-12-release-envelope.md`, `specs/010-production-hardening/`, accepted F12-T02 at `44667c2`,
and existing payment/booking contracts.

- Task ID: `F12-T03`
  - Agent/Thread: `Codex /root`
  - Status: `REWORK (unchecked/unclaimed)`
  - Depends on: `F12-T01` and `F12-T02` are DONE; no ownership conflict. T06 is accepted and excluded; T05 remains
    unclaimed with its separate host-evidence blocker.
  - Scope: execute the approved mixed authenticated `10 req/s × 30 min`, booking-conflict `2 req/s` one-slot,
    unchanged frozen chat `20 msg/s × 30 min`, 61-second gap, `50 msg/s × 5 min`, `<=1000 ms` per batch, and
    simulated-only Sadad/financial-idempotency capacity checks. Record historical `1015ms`/`1032ms`, CI isolation and
    scheduled/manual evidence as inputs; do not change workload or thresholds.
  - Owned paths: `apps/api/test/**` capacity harness/evidence only, capacity command documentation if required, and
    coordinator-only `plan/{STATUS.md,phases/12-PRODUCTION-HARDENING.md,logs/phase-12.md}`. No payment runtime,
    schema/migration, provider configuration, dependency, workflow or T05/T06 path.
  - Shared/exclusive resource: the F12 capacity harness and run-owned local PostgreSQL container/databases. Tests are
    serialized; no shared or production database is permitted.
  - Review: `REWORK` — the authoritative mixed run completed 1,800 seconds/18,000 requests with p95 `48.84ms`, but
    only `11,250/18,000` successful requests (`62.5%`); it cannot satisfy the frozen `>=99%` acceptance gate. The
    diagnostic preflight identifies `/v1/me` as 401 because the synthetic patient has no durable session and both
    clinical read journeys as 503 because no clinical fixture exists. The booking/Sadad invariants passed on a separate
    disposable child database. No frozen threshold/workload changed; no chat result was available to accept.
  - Safe next action: build valid session and clinical fixtures for all selected release journeys, rotate the capacity
    token before the post-profile booking check, rerun preflight, then rerun only the approved mixed profile and the
    still-unverified frozen chat profile with durable logs. Do not claim a new batch until this REWORK is reviewed.

## آخرین batch تکمیل‌شده — F12-B03

Coordinator/Thread: `Codex /root`
Started at: `2026-10-01 17:35 +03:30`
Completed at: `2026-10-01 17:45 +03:30`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE (REDUCED)`
Contract baseline: `plan/contracts/phase-12-release-envelope.md`, frozen `specs/010-production-hardening/`,
`plan/04-ENGINEERING-STANDARDS.md`, and accepted F12-T02 evidence at `44667c2`.

- Task ID: `F12-T06`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: `F12-T01 DONE`; no ownership conflict. F12-T02 remains accepted but is not a dependency of this task.
  - Scope: inventory actual API/app/dashboard/package file consumers and record whether object storage remains N/A. Do
    not add a bucket, storage SDK, upload endpoint, schema, dependency, retention job, or configuration without an
    approved real consumer.
  - Owned paths: storage-decision evidence/contract and coordinator-only
    `plan/{STATUS.md,phases/12-PRODUCTION-HARDENING.md,logs/phase-12.md}`.
  - Shared/exclusive resource: the Phase 12 object-storage decision is single-writer; it does not overlap F12-T03's
    load harness or F12-T05's recovery procedure.
  - Expected verification: source/API/schema consumer inventory, deferred-chat/architecture contract cross-check,
    no-storage-dependency/configuration diff review, and `git diff --check`.
  - Review: `PASS` — current API/app/dashboard/web/package/deployment consumers contain no real upload, attachment,
    medical-file or binary consumer; no multipart/upload transport, storage persistence model, object-store SDK,
    bucket configuration or secret exists. The only attachment-related persistence migration explicitly defers it.
    `N/A` is documented with a mandatory re-entry review; no object-storage infrastructure, dependency, schema,
    configuration or secret was introduced. Evidence: [`contracts/phase-12-object-storage-decision.md`](contracts/phase-12-object-storage-decision.md)
    and [`logs/phase-12.md`](logs/phase-12.md).

Excluded, unchecked tasks and exact next action:

- `F12-T03 BLOCKED`: Docker Desktop client is installed but `dockerDesktopLinuxEngine` is not running; no `postgres`,
  `initdb`, or PostgreSQL service is present. Start Docker Desktop (or supply a local disposable PostgreSQL runtime),
  then create a run-owned database and execute the frozen capacity profiles. Do not use a shared or production-like
  database as a substitute.
- `F12-T05 BLOCKED`: obtain written Liara evidence covering daily base backup retention, continuous WAL/archive,
  restore/PITR procedure and supported RPO/RTO before claiming recovery acceptance. The official CLI supports manual
  backup create/list/download, but that is insufficient evidence for the approved recovery objective.

## آخرین batch تکمیل‌شده — F12-B02-R1

Coordinator/Thread: `Codex /root`
Started at: `2026-10-01 00:05 +03:30`
Completed at: `2026-10-01 17:20 +03:30`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE`
Contract baseline: `plan/contracts/sadad-ipg-v1.md`, `plan/contracts/phase-12-release-envelope.md`, frozen
`specs/010-production-hardening/`, and the original F12-T02 completion commit `24cee87` (which will not be rewritten).

- Task ID: `F12-T02`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: `F12-T01 DONE`; no other active batch or ownership conflict existed before this corrective claim.
  - Defect: request `Amount` and `OrderId` used `bigint.toString()` and were then emitted by `JSON.stringify` as JSON
    strings, contrary to the frozen `Number` / `Number(Long)` contract. `response.json()` could also lose precision for
    provider financial integers before `verifyPayment` compares them.
  - Scope: preserve exact bounded integer lexical values as JSON number tokens on the real transport boundary; preserve
    numeric response precision until financial parsing; update affected tests to inspect local/simulated-fetch wire
    payloads; diagnose and, if preparation-caused, repair the workspace `@sabz-zendegi/api-client` resolver failure.
    No real Sadad request, provider activation/default, credential, provisioning, deployment, push, PR, schema,
    migration, dependency, workflow, or F12-B03 work.
  - Owned paths: `apps/api/src/modules/commerce/payments/sadad-payment-provider.adapter.ts`,
    `apps/api/test/sadad-payment-provider.adapter.spec.ts`, and coordinator-only
    `plan/{STATUS.md,phases/12-PRODUCTION-HARDENING.md,logs/phase-12.md}`. Package build artifacts may be regenerated
    locally for verification but are not task source or commit content.
  - Shared/exclusive resource: Sadad adapter/transport and F12 status/evidence are single-writer resources for this
    corrective batch. `F12-B03` remains unclaimed.
  - Review: `PASS` — the real Fetch transport writes `Amount` and `OrderId` as unquoted exact integer JSON literals
    without converting bigint to Number, rejects unsafe or out-of-range values before fetch, and parses raw successful
    responses so `Amount`/`OrderId` retain their lexical int64 values before Verify financial matching. A loopback HTTP
    server proves both normal and boundary wire payloads; no Sadad endpoint was contacted. The workspace resolver
    failure was caused only by the missing ignored `packages/api-client/dist` artifact in this new worktree; the
    workspace junction was correct, package build recreated the artifact, and dashboard test/typecheck pass. No
    schema, migration, dependency, workflow, activation/default, credential, provisioning, deployment, push, PR, or
    F12-B03 work occurred. Evidence: [`logs/phase-12.md`](logs/phase-12.md).
  - Next eligible batch: `F12-B03` (`F12-T03`, `F12-T05`, `F12-T06`), unclaimed. Stop before starting it.

## آخرین batch تکمیل‌شده — F12-B02

Coordinator/Thread: `Codex /root`
Started at: `2026-09-30 22:12 +03:30`
Completed at: `2026-09-30 23:06 +03:30`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE`
Contract baseline: `plan/contracts/phase-12-release-envelope.md`, frozen `specs/010-production-hardening/`,
`b7f84b8` F12-T02 change control, and existing Phase 09 payment contracts.

- Task ID: `F12-T02`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: `F12-T01 DONE`; no active batch, task, blocker, or ownership conflict at claim time.
  - Scope: deployment/staging artifact-promotion/rollback preparation and the approved gap-only Sadad software path:
    transport, request/redirect/callback/Verify wiring, timeout/ambiguous outcome, retry, reconciliation, idempotency,
    config validation, safe env-template documentation and tests. No purchase/provisioning, external Sadad call,
    enable/default, production deployment, real secret, push or PR.
  - Owned paths: deployment/container/IaC/release documentation, `apps/api/src/modules/commerce/payments/**`, payment
    controllers, API contract/client when changed, `apps/api/.env.example`, local ignored `.env` placeholders, focused
    payment tests, and coordinator-only `plan/{STATUS.md,phases/12-PRODUCTION-HARDENING.md,logs/phase-12.md}`.
  - Shared/exclusive resource: payment adapter/orchestration/config/API-contract and deployment release-path surfaces;
    no other task may write them in this batch.
  - Review: `PASS` — the Liara staging/promotion/rollback path is recorded without provisioning; the completed Sadad
    protocol adapter supports only explicitly injected simulation while Nest runtime stays `SADAD_GO_LIVE_BLOCKED`.
    Request/redirect/callback/Verify parsing, RIAL/order/amount matching, timeout-to-reconciliation, same-attempt
    retry, duplicate-safe Verify and redaction boundaries are covered. Encrypted credential revision storage remains
    unchanged; `.env.example` validates non-secret settings and a local ignored template contains no real secret.
    No schema/migration/dependency/workflow, external Sadad request, provider enable/default, provisioning,
    production deployment, push or PR occurred. Evidence: [`logs/phase-12.md`](logs/phase-12.md).
  - Remaining release gates: the project owner must obtain Liara static outbound-egress confirmation and merchant
    acceptance evidence; these block real connection/enable/default/payment sign-off only, not this accepted task.
  - Next eligible batch: `F12-B03` (`F12-T03`, `F12-T05`, `F12-T06`), unclaimed. Stop before starting it.

## آخرین batch تکمیل‌شده — F12-B01

Coordinator/Thread: `Codex /root`
Started at: `2026-09-30 21:52 +03:30`
Phase: `12-PRODUCTION-HARDENING`
Completed at: `2026-09-30 22:00 +03:30`
Batch status: `DONE`
Contract baseline: frozen `specs/010-production-hardening/`, owner-approved Liara/staging/production/recovery/
availability decisions, and `b7f84b8` Sadad F12-T02 extension change control.

- Task ID: `F12-T01`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: Phase 10 and Phase 11 `DONE (CLOSED)`; no active batch, task, blocker, or ownership conflict at claim time.
  - Scope: record the approved target release, capacity and availability objectives, environment strategy, external gates,
    owners and change-control boundary as the executable F12-T01 release envelope. No provider purchase/provisioning,
    external Sadad request, secret, runtime/schema/migration/dependency/workflow change, deployment, push or PR.
  - Owned paths: `plan/{STATUS.md,phases/12-PRODUCTION-HARDENING.md,contracts/phase-12-release-envelope.md,logs/phase-12.md}`.
  - Shared/exclusive resource: Phase 12 release-decision record and status/checklist/evidence coordination; later tasks must
    consume this record and may not alter it without approved change control.
  - Review: PASS — the executable release envelope preserves all owner-approved Liara, staging/production, manual
    promotion/rollback, capacity, availability, recovery, secrets, object-storage N/A and Sadad boundaries. It assigns
    every external dependency to its consuming future task without treating it as completed evidence. No runtime,
    schema, migration, dependency, workflow, provisioning, connection, activation, secret, push or PR was added.
    Evidence: [`contracts/phase-12-release-envelope.md`](contracts/phase-12-release-envelope.md) and
    [`logs/phase-12.md`](logs/phase-12.md).
  - Next eligible work: `F12-B02` / `F12-T02`, unclaimed.

## آخرین batch تکمیل‌شده — F10-R36-CI-CAPACITY-ISOLATION

Coordinator/Thread: `Codex /root`
Started at: `2026-09-29 18:55 +03:30`
Phase: `10-CHAT-CONSULTATION`
Completed at: `2026-09-29 19:12 +03:30`
Batch status: `DONE`
Contract baseline: frozen F10-T09 20 msg/s × 30 min, 61-second gap, 50 msg/s × 5 min, and per-batch `<= 1000ms`
criterion; the two observed CI/local timing failures (`1015ms`, `1032ms`) and Phase 10 evidence.

- Task ID: `F10-T09 REWORK`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: all original F10-T09 prerequisites and Phase 10 closure evidence are accepted; no active batch or
    blocker existed before this claim.
  - Scope: remove only the long synthetic capacity workload from the ordinary `pnpm test` path; retain it unchanged
    behind an explicit `test:capacity` command and a separate scheduled/manual-or-chat-change CI workflow.
  - Owned paths: `package.json`, `apps/api/package.json`, `.github/workflows/{ci.yml,chat-capacity.yml}`, and
    coordinator-only `plan/{STATUS.md,phases/10-CHAT-CONSULTATION.md,logs/phase-10.md}`.
  - Shared/exclusive resource: workspace/API test scripts and GitHub Actions workflow configuration; no runtime,
    schema, migration, dependency, lockfile, Phase 11, or Phase 12 path.
  - Expected verification: ordinary `pnpm test`, workspace typecheck, targeted disposable-PostgreSQL capacity
    preflight, workflow syntax/trigger review, and `git diff --check`.
  - Review: PASS — the ordinary workspace suite excludes only the frozen long capacity file and passed 91 API files/
    373 API tests in 7m29s; the unchanged capacity bootstrap preflight passed on a run-owned PostgreSQL database.
    `test:capacity` and the separate `Chat capacity` workflow preserve the full workload for schedule/manual and
    chat/capacity-relevant PR or main changes. No runtime, schema, migration, dependency, lockfile, Phase 11, or
    Phase 12 path changed. Evidence: [`logs/phase-10.md`](logs/phase-10.md).
  - Next eligible work: Phase 12 remains `NOT_STARTED`; no task or batch is selected or claimed.

## آخرین batch تکمیل‌شده — F11-B11

Coordinator/Thread: `Codex /root`
Started at: `2026-09-28 23:55 +03:30`
Completed at: `2026-09-29 00:21 +03:30`
Phase: `11-REPORTING-ACCESS`
Batch status: `DONE`
Contract baseline: frozen `specs/009-reporting-access/`, Phase 11 roadmap, `F11-T01` through `F11-T10` accepted
evidence, and the formal pre-implementation reviewer gate.

- Task ID: `F11-T11`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: `F11-T01` through `F11-T10` DONE; no active batch or blocker at claim time.
  - Scope: independent requirement-by-requirement Phase 11 review and closure evidence only. The required migration,
    contract/client, PostgreSQL, authorization/audit/reporting/CRM, dashboard, browser, history, protected-path, and
    SpecKit traceability checks passed with no closure-owned or predecessor defect.
  - Owned paths: coordinator-only `plan/{STATUS.md,phases/11-REPORTING-ACCESS.md,logs/phase-11.md}` and any
    closure-review checklist/evidence explicitly required by the frozen plan. All runtime, schema/migration,
    dependency/lockfile, generated-client, dashboard/product, and Phase 12 paths are review-only.
  - Shared/exclusive resource: final Phase 11 status/checklist/evidence and run-owned disposable PostgreSQL databases.
    No other task or batch may write Phase 11 closure state.
  - Review: PASS — all required typecheck/build, OpenAPI/client, disposable PostgreSQL migration and 40-test API
    suites, normal dashboard Vitest (18 files/61 tests), independent Playwright (7/7), and diff/history isolation
    checks passed. The closure commit owns documentation/status/evidence only. Evidence:
    [`logs/phase-11.md`](logs/phase-11.md).
  - Next eligible work: `Phase 12` is `NOT_STARTED`; no task or batch is selected or claimed.

## آخرین batch تکمیل‌شده — F11-B10

Coordinator/Thread: `Codex /root`
Started at: `2026-09-28 22:38 +03:30`
Completed at: `2026-09-28 23:16 +03:30`
Phase: `11-REPORTING-ACCESS`
Batch status: `DONE`
Contract baseline: owner-approved CRM change control in [`specs/009-reporting-access/`](../specs/009-reporting-access/),
including `FR-023`, `FR-027–033`, `SC-008–010`, and
[`contracts/customer-crm-api.md`](../specs/009-reporting-access/contracts/customer-crm-api.md).

- Task ID: `F11-T10`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: `F11-T07` and `F11-T09` DONE; `F11-T01` through `F11-T09` accepted before claim.
  - Result: real, read-only, clinic-scoped operational customer CRM is delivered inside the existing commerce domain.
    It requires an active persisted ADMIN session and pre-existing `ClinicalClinicAccess`, derives only its approved
    non-medical projection from canonical `PatientProfile`, `UserProfile`, Payment, Refund, and order-line records,
    validates bounded query input, and audits each disclosed patient with fixed redacted provenance.
  - Review: PASS — integration on a migrated-and-seeded disposable PostgreSQL database proves payment/refund math,
    deterministic segments, integer-truncated TOMAN summary, search/filter/sort/pagination validation, clinic denial,
    PATIENT/DOCTOR/STAFF denial, disabled/revoked/expired session denial, and non-sensitive audit metadata. API/client
    freshness, API/dashboard typechecks, ordinary dashboard Vitest (18 files/61 tests), independent Phase 11
    Playwright (7/7), and `git diff --check` passed. The only Vitest configuration change excludes `e2e/**`; the
    Playwright suite remains intact. No schema, migration, aggregate, dependency, lockfile, shared-auth, marketing,
    export, campaign, saved-segment, audience, bulk-message, or medical-profiling surface changed. Evidence:
    [`logs/phase-11.md`](logs/phase-11.md).
  - Next eligible task: `F11-T11`, unclaimed. Stop before starting it.

## آخرین batch تکمیل‌شده — F11-B09

Coordinator/Thread: `Codex /root`
Started at: `2026-09-28 17:32 +03:30`
Completed at: `2026-09-28 18:16 +03:30`
Phase: `11-REPORTING-ACCESS`
Batch status: `DONE`
Contract baseline: frozen `specs/009-reporting-access/` (`FR-017–022`, `SC-005`,
`contracts/authorization-matrix.md`, and `quickstart.md`), with `F11-T01` through `F11-T08` DONE.

- Task ID: `F11-T09`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: `F11-T07` DONE; `F11-T01` through `F11-T08` accepted; no active batch or blocker at claim time.
  - Scope: prove the frozen ADMIN-only reporting/audit access matrix at backend and browser boundaries, including
    denied roles, disabled/revoked ADMIN sessions, tenant/clinic isolation, medical-ownership limits, and no API/UI/
    export disclosure. This batch adds verification only; it does not expand the release capability.
  - Owned paths: `apps/api/test/reporting-authorization.integration.spec.ts`,
    `apps/dashboard/e2e/phase-11-access.spec.ts`, `playwright.phase11.config.ts`, and coordinator-only
    `plan/{STATUS.md,phases/11-REPORTING-ACCESS.md,logs/phase-11.md}`.
  - Shared/exclusive resource: the new authorization-matrix test and browser E2E suite plus their run-owned
    disposable PostgreSQL databases. `common/auth`, audit/report runtime modules, schema/migrations, OpenAPI/client,
    dashboard session gate, dependencies/lockfile, and CRM/segmentation remain outside this task.
  - Review: PASS — the run-owned PostgreSQL matrix proves ADMIN access only for the active clinic-scoped report,
    revenue, and redacted audit routes; PATIENT/DOCTOR/STAFF receive no protected disclosure; disabled/revoked
    ADMIN sessions receive `401`; an inactive foreign clinic and foreign medical workspace remain denied; export
    routes do not exist. Browser E2E proves the same direct-navigation boundary before dashboard UI disclosure.
    Workspace typechecks and API-client/OpenAPI freshness passed, with no runtime authorization, schema, migration,
    dependency, generated-client, or later-task path change. Evidence: [`logs/phase-11.md`](logs/phase-11.md).
  - Next eligible task: `F11-T10`, unclaimed. Stop before starting it.

## آخرین batch تکمیل‌شده — F11-B08

Coordinator/Thread: `Codex /root`
Started at: `2026-09-28 17:22 +03:30`
Completed at: `2026-09-28 17:26 +03:30`
Phase: `11-REPORTING-ACCESS`
Batch status: `DONE`
Contract baseline: frozen `specs/009-reporting-access/` (`FR-016`, `FR-017`, `FR-024–026`, `SC-003`,
`contracts/conditional-exclusions.md`, and `contracts/authorization-matrix.md`), with `F11-T01` through
`F11-T08` DONE after review.

- Task ID: `F11-T08`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: `F11-T07` DONE; no active batch or blocker at claim time.
  - Scope: prove the confirmed release exclusion of staff membership/invitation and capability menus; preserve the
    ADMIN-only admission boundary and add no membership, invitation, role mutation, route, UI capability, email,
    export, schema, migration, dependency, or generated-client surface.
  - Owned paths: `apps/api/test/phase-11-exclusions.spec.ts`, `apps/dashboard/src/auth/session.test.ts`, and
    coordinator-only `plan/{STATUS.md,phases/11-REPORTING-ACCESS.md,logs/phase-11.md}`.
  - Shared/exclusive resource: exclusion evidence tests and disposable PostgreSQL test database. `common/auth`,
    schema/migrations, OpenAPI/client, final authorization matrix/browser E2E, and CRM remain owned by other tasks.
  - Review: PASS — source, schema, migration-name, and checked-in OpenAPI inspection prove no staff
    membership/invitation mutation, capability menu, role builder, or report/audit export surface was introduced.
    Dashboard refresh clears a `STAFF` bearer token and retains no authenticated snapshot. Backend ADMIN-only policy,
    reporting/audit tenant/clinic isolation, redaction, and disabled/revoked-session regression all passed on a
    disposable PostgreSQL database. Workspace typechecks and API-client contract freshness passed; no runtime,
    schema, migration, dependency, generated-client, or later-task path changed. Evidence:
    [`logs/phase-11.md`](logs/phase-11.md).
  - Next eligible tasks: `F11-T09` and `F11-T10`; both remain unclaimed. Stop before starting either task.

## آخرین batch تکمیل‌شده — F11-B07

Coordinator/Thread: `Codex /root`
Started at: `2026-09-28 17:03 +03:30`
Completed at: `2026-09-28 17:14 +03:30`
Phase: `11-REPORTING-ACCESS`
Batch status: `DONE`
Contract baseline: frozen `specs/009-reporting-access/` (`FR-016–019`, `SC-003–004`,
`contracts/authorization-matrix.md`), with `F11-T01` through `F11-T06` DONE.

- Task ID: `F11-T07`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: `F11-T06` DONE; no active batch or blocker at claim time.
  - Scope: froze ADMIN-only dashboard/admin admission and shared backend authorization enforcement while preserving
    patient self-service and the existing tenant/clinic, medical-ownership, audit-redaction, and session controls.
  - Owned paths: `apps/api/src/common/auth/{access-token.guard,authorization.guard,authorization.policy,release-admin-session.guard,auth.module}.ts`,
    focused T07 authorization tests under `apps/api/test/`, `apps/dashboard/src/auth/{session,session.test}.ts`, and
    coordinator-only `plan/{STATUS.md,phases/11-REPORTING-ACCESS.md,logs/phase-11.md}`.
  - Shared/exclusive resource: `common/auth` policy/guards and disposable PostgreSQL authorization test database.
    T009 remains the sole owner of the final full authorization-matrix and browser E2E suites.
  - Review: PASS — `DOCTOR` and `STAFF` no longer receive `DASHBOARD_ACCESS`; dashboard admission is ADMIN-only.
    A global shared guard requires a persisted active, unrevoked, unexpired session for every ADMIN request before
    controller execution. Focused unit tests, full workspace typechecks, real disposable PostgreSQL reporting/audit
    integrations, and revenue regression passed. No schema, migration, dependency, endpoint, generated client,
    membership/invitation, CRM, export, browser E2E, or later-task path changed. Evidence:
    [`logs/phase-11.md`](logs/phase-11.md).
  - Next eligible tasks: `F11-T08`, `F11-T09`, and `F11-T10`; all remain unclaimed. Do not start another task in
    this batch.

## آخرین batch تکمیل‌شده — F11-B06

Coordinator/Thread: `Codex /root`
Started at: `2026-09-28 02:49 +03:30`
Completed at: `2026-09-28 03:06 +03:30`
Phase: `11-REPORTING-ACCESS`
Batch status: `DONE`
Contract baseline: `F11-T01` through `F11-T05` DONE; frozen `specs/009-reporting-access/` (`FR-020–021`,
`SC-005`, `contracts/audit-viewer.md`, and `contracts/authorization-matrix.md`).

- Task ID: `F11-T06`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: `F11-T05` DONE; no active batch or blocker at claim time.
  - Scope: deliver the minimum-necessary ADMIN audit viewer/support read under `apps/api/src/modules/identity/audit/`
    and `apps/dashboard/src/features/audit/`, with an authorized, clinic-scoped redacted cursor page and sensitive
    read audit. No export, raw metadata, unbounded search, or support mutation is included.
  - Owned paths: `apps/api/src/modules/identity/audit/**`, `apps/api/src/modules/identity/identity.module.ts`,
    `apps/api/test/audit-viewer.integration.spec.ts`, `apps/dashboard/src/features/audit/**`,
    `apps/dashboard/src/app/(app)/audit/page.tsx`, `apps/dashboard/src/lib/audit-viewer-api.{ts,spec.ts}`, generated
    `packages/api-client/{openapi.json,src/schema.generated.ts}` only through the endpoint owner, and coordinator-only
    `plan/{STATUS.md,phases/11-REPORTING-ACCESS.md,logs/phase-11.md}`. Any schema/migration or shared auth change is
    excluded unless separately proved required by the frozen contract and assigned to this task.
  - Shared/exclusive resource: audit-viewer route/contract and API-client generation; disposable PostgreSQL test DB.
    `common/auth` policy/guard and broader release authorization matrix remain exclusively deferred to `F11-T07`.
  - Review: PASS — the endpoint is ADMIN-only and checks an active, unrevoked session before query execution;
    `PatientAccessAudit` is queried only with an explicit active-clinic predicate and returned solely through the
    redacted cursor projection. The generic `AuditEvent` table is deliberately not queried because it has no clinic
    provenance. The viewer audits each disclosed clinical event through the existing clinical-audit writer; it exposes
    no export/raw metadata path. No schema, migration, dependency, shared `common/auth` policy/guard, role matrix,
    CRM, browser E2E, or later-task work changed. Evidence: [`logs/phase-11.md`](logs/phase-11.md).
  - Next eligible task: `F11-T07` only, unclaimed; do not start it in this task.

## آخرین batch تکمیل‌شده — F11-B05

Coordinator/Thread: `Codex /root`
Started at: `2026-09-27 22:42 +03:30`
Completed at: `2026-09-28 02:42 +03:30`
Phase: `11-REPORTING-ACCESS`
Batch status: `DONE`
Contract baseline: `F11-T01` through `F11-T04` DONE; frozen `specs/009-reporting-access/` (`FR-015`, `SC-006`,
`research.md`, `quickstart.md`, `data-model.md`, and `contracts/reporting-api.md`).

- Task ID: `F11-T05`
  - Status: `DONE`
  - Scope: captured and replayed `EXPLAIN (ANALYZE, BUFFERS)` for 18 actual clinic-scoped report query shapes across
    appointments, patient/onboarding population, assessments, treatments, and operational commerce revenue.
  - Review: PASS — a migrated-and-seeded run-owned PostgreSQL database reported explicit clinic scope on every plan,
    deterministic replay, and no reproduced bottleneck. The direct-query baseline is accepted; no index, aggregate,
    schema, migration, OpenAPI/client, endpoint, dashboard, authorization, role, audit, CRM, browser-E2E, or later
    task path changed. Evidence: [`logs/phase-11.md`](logs/phase-11.md).
  - Next eligible task: `F11-T06` only, unclaimed.

## آخرین batch تکمیل‌شده — F11-B04

Coordinator/Thread: `Codex /root`
Started at: `2026-09-27 22:05 +03:30`
Completed at: `2026-09-27 22:36 +03:30`
Phase: `11-REPORTING-ACCESS`
Batch status: `DONE`
Contract baseline: frozen `specs/009-reporting-access/` (`FR-002–003`, `FR-012–013`, `SC-002–003`,
`contracts/kpi-inventory.md`, and `contracts/reporting-api.md`).

- Task ID: `F11-T04`
  - Status: `DONE`
  - Scope: Dashboard Home now reads only ADMIN-authorized, inventory-approved reporting sources and exposes
    truthful loading/error/forbidden/empty/zero/partial/stale states without a substitute value.
  - Review: PASS — final Home composition is KPI-01–05, KPI-09, KPI-11, KPI-14–15, KPI-19, and KPI-21 plus the
    permitted today appointment and limited operational-activity lists. KPI-21 is supplied by the existing commerce
    reporting endpoint as a clinic-scoped `Refund{REQUESTED, APPROVED}` snapshot rather than inferred in the client.
    No schema/migration, aggregate/index, shared authorization/session infrastructure, navigation, role/staff,
    audit, CRM, browser E2E, or provider activation changed. Evidence: [`logs/phase-11.md`](logs/phase-11.md).
  - Next eligible task: `F11-T05` only, unclaimed.

## آخرین batch تکمیل‌شده — F11-B03

Coordinator/Thread: `Codex /root`
Started at: `2026-09-27 21:24 +03:30`
Phase: `11-REPORTING-ACCESS`
Completed at: `2026-09-27 21:30 +03:30`
Batch status: `DONE`
Contract baseline: frozen `specs/009-reporting-access/` (`FR-005–006`, `SC-004`,
`contracts/kpi-inventory.md`, and `contracts/reporting-api.md`).

- Task ID: `F11-T03`
  - Status: `DONE`
  - Scope: existing ADMIN commerce revenue route and dedicated revenue view reconciled with the operational
    verified-Payment minus completed-Refund `TOMAN` contract; no Sadad production acceptance/settlement claim.
  - Review: PASS — explicit clinic scope and response provenance added; `WEEK` granularity, operational label,
    real-source empty/error/forbidden states, OpenAPI/client freshness, and disposable-PostgreSQL evidence passed.
    No schema/migration, aggregate, common authorization, Dashboard Home, provider activation, or network transport
    changed. Evidence: [`logs/phase-11.md`](logs/phase-11.md).
  - Next eligible task: `F11-T04` only, unclaimed.

## آخرین batch تکمیل‌شده — F11-B01

Coordinator/Thread: `Codex /root`
Started at: `2026-09-27 16:18 +03:30`
Phase: `11-REPORTING-ACCESS`
Completed at: `2026-09-27 16:27 +03:30`
Batch status: `DONE`
Contract baseline: `fa2285ad docs(spec): freeze phase 11 reporting access baseline`,
[`specs/009-reporting-access/`](../specs/009-reporting-access/)

Tasks:

- Task ID: `F11-T01`
  - Status: `DONE`
  - Depends on: `none`
  - Scope: preserve the frozen KPI/widget inventory as typed response metadata only in the existing patient,
    appointment, assessment, clinical treatment-plan, clinical treatment-activity, and commerce-reporting domain
    DTO modules. This is the response-contract foundation; it does not add reporting routes, queries, dashboard UI,
    authorization changes, migrations, OpenAPI/client generation, or aggregates.
  - Owned paths: `apps/api/src/modules/patients/admin/admin-patients.dto.ts`,
    `apps/api/src/modules/appointments/admin-appointments.dto.ts`,
    `apps/api/src/modules/assessments/admin/admin-assessment-submissions.dto.ts`,
    `apps/api/src/modules/clinical/treatment-plan-response.dto.ts`,
    `apps/api/src/modules/clinical/treatment-activity-response.dto.ts`,
    `apps/api/src/modules/commerce/reporting/commerce-revenue.dto.ts`, one focused API contract test path if required,
    and coordinator-only `plan/{STATUS.md,logs/phase-11.md,phases/11-REPORTING-ACCESS.md}`.
  - Shared/exclusive resource: the six existing domain response contracts; OpenAPI output and generated clients stay
    exclusively deferred to their declared later endpoint owner.
  - Verification: API source and test typechecks, focused metadata-contract regression (2/2), isolated PostgreSQL
    migration smoke (3/3), frozen inventory cross-check, and `git diff --check` all passed.
  - Contract: every released widget must carry its frozen identifier, formula, data owner, PostgreSQL/API source of
    truth, explicit tenant/clinic scope, `Asia/Tehran` timezone, and zero/partial/stale-data behavior. Do not invent
    KPI semantics or create a central reporting module.
  - Result: all KPI-01–21 definitions are exported from their existing domain DTO owners and the focused regression
    proves exactly one complete, PostgreSQL-backed, tenant/clinic-scoped, Tehran-calendar metadata entry per KPI.
    Evidence: [`logs/phase-11.md`](logs/phase-11.md).

## آخرین batch — F10-R36-CI-CAPACITY-RATE-LIMIT-INDEXES

Coordinator/Thread: `Codex (managed worktree)`
Started at: `2026-09-27 +03:30`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — local persistence/capacity gates passed; PR #15 CI recheck pending; Phase 10 remains CLOSED`
Baseline: `b7b6605 test(F10-T09): make capacity bootstrap portable`

- Task IDs: `F10-T02 REWORK (rate-limit persistence indexes)` and `F10-T09 REVALIDATION`
- Scope: add only the two PostgreSQL indexes required by the frozen sender/conversation rate-limit windows, prove their query plans on a disposable database, and revalidate the unchanged capacity compiler/typecheck/preflight gates.
- Owned paths: `apps/api/prisma/schema.prisma`, one additive Phase 10 migration, `apps/api/test/chat-migrations.integration.spec.ts`, and Phase 10 evidence/status only.
- Frozen: `20 msg/s × 30m`, the 61-second gap, `50 msg/s × 5m`, the `1000ms` ceiling, all assertions, and the CI workflow remain unchanged.
- Excluded: `.gitignore`, `plan/phases/12-PRODUCTION-HARDENING.md`, Phase 11, unrelated product behavior and old databases/data.
- Verification: the CI failure was confirmed at the first 50 msg/s batch (`1239ms`). A 36,000-row disposable PostgreSQL diagnostic proved the sender rate-limit query used a full sequential scan and the conversation window revisited heap rows; the two matching indexes changed both predicates to index-only scans. Prisma validate/generate, test compiler, API typecheck, the focused Phase 10 migration test (1/1), full migration smoke (3/3), and the short 100/300/600 PostgreSQL/Socket.IO preflight (1 passed, long workload skipped) all passed; `git diff --check` passed.
- Cleanup: both standalone SQL diagnostic databases were dropped and the successful capacity preflight removed its run-owned database. Four retained `sabz_zendegi_chat_capacity_*` databases were observed after the earlier configuration-only preflight abort; because no trustworthy before-snapshot identified ownership, they were left untouched as required. No old database or data was deleted.
- Next action: push the isolated commit and let GitHub Actions provide the only next full 20/50 capacity execution. If CI is green and no review blocker exists, merge PR #15 with a merge commit; do not start Phase 11.

## آخرین batch — F10-R35-CI-CAPACITY-PORTABILITY

Coordinator/Thread: `Codex (managed worktree)`
Completed at: `2026-09-26 08:10 +03:30`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — local portability gates passed; PR #15 CI recheck pending; Phase 10 remains CLOSED`
Baseline: `ebca431 test(F10-T09): renew capacity fixture against persisted sessions`

- Task ID: `F10-T09 REWORK (capacity bootstrap portability)`
  - Scope: make the deferred application bootstrap import resolve under TypeScript/Node16 and Linux CI while preserving the disposable-database-before-AppModule ordering.
  - Changed path: `apps/api/test/chat-capacity.load.spec.ts`, plus Phase 10 evidence/status only.
  - Verification: exact CI TypeScript failure reproduced before the fix; test compiler and API typecheck PASS after the fix; focused real-PostgreSQL bootstrap/Socket.IO capacity scenario PASS (1 passed, long rate test skipped); `git diff --check` PASS.
  - Result: dynamic bootstrap now uses the Node16-compatible `.js` module specifier. Product code, authorization, workflow, rate, duration, 61-second gap and 1000ms threshold are unchanged. The accepted full capacity run was not repeated locally.
  - Excluded: `.gitignore` and `plan/phases/12-PRODUCTION-HARDENING.md` remain outside this task.
- Next action: push the isolated commit and let GitHub Actions provide the only next full capacity execution. Do not merge or start Phase 11.

## آخرین batch — F10-R34-CI-CAPACITY-SESSION

Coordinator/Thread: `Codex (this session)`
Completed at: `2026-09-25 23:55 +03:30`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — accepted for isolated F10-T09 commit; Phase 10 remains CLOSED`
Baseline: `1a7c3ae docs(F10-CLOSE): close chat consultation phase after security review`

- Task ID: `F10-T09 REWORK (capacity fixture persisted session)`
  - Scope: renew synthetic load JWTs against the original persisted patient/doctor sessions. No product authorization, rate, duration, or assertion changed.
  - Owned paths: `apps/api/test/chat-capacity.load.spec.ts`, Phase 10 evidence/status/checklist only.
  - Verification: CI-mirror worktree (`1a7c3ae` + this fix only) with `NODE_ENV=test`, `LOG_LEVEL=error` on a disposable PostgreSQL database → full capacity suite PASS (exit 0; 2/2 tests; 20 msg/s × 30 min + 50 msg/s × 5 min; every per-second batch ≤ 1000 ms; 511 messages per conversation, count == max sequence). API typecheck PASS. Main local database row counts unchanged (read-only before/after snapshot). Disposable database dropped; no orphan test processes. Evidence: [`logs/phase-10.md`](logs/phase-10.md).
  - Result: PR #15 CI failure mode (HTTP 403 instead of 201 after token renewal) is resolved; forged-session negative control still returns 403.
  - Excluded: `.gitignore` and `plan/phases/12-PRODUCTION-HARDENING.md` remain user-owned and unstaged.
- Next eligible work: Phase 11, `NOT_STARTED` and not claimed here.

## آخرین batch — F10-CLOSE

Coordinator/Thread: `Codex /root`
Completed at: `2026-09-25 03:41 +03:30`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE (CLOSED)`
Baseline: `b8ff5f8 test(F10-T11): verify durable revocation gates`

- Scope: documentation-only closure after independent security/closure review PASS.
- Result: all F10 tasks and remediation/revalidation commits accepted; Milestone D complete.
- Excluded: `.gitignore` and `plan/phases/12-PRODUCTION-HARDENING.md` remain user-owned and unstaged.
- Next eligible work: Phase 11, `NOT_STARTED` and not claimed here.

## active batch — F10-R33-DURABLE-REVOCATION-FINAL-GATES

Coordinator/Thread: `Codex /root`
Started at: `2026-09-25 02:05 +03:30`
Phase: `10-CHAT-CONSULTATION`
Batch status: `DONE — accepted for isolated F10-T11 commit; Phase 10 READY_FOR_REVIEW`
Contract baseline: `chat-consultation-v1`, `ADR-0010`, `bb69c3e`, `efe5c16`, and `3167815`.

- Task ID: `F10-T11 REVALIDATION (durable revocation fence)`
  - Status: `DONE`
  - Scope: final production build, real Chrome authenticated chat journey, commit isolation/freshness review, and joint audit of every durable session/user revocation path after F10-T03/F10-T04.
  - Owned paths: Phase 10 evidence/status/checklist only unless a final gate exposes an in-scope defect.
  - Verification: `pnpm build` → PASS (5/5 packages); real Chrome `pnpm exec playwright test --config playwright.phase10.config.ts` → PASS (1 test, 18.8s); source/commit isolation and `git diff --check` → PASS. The accepted 40-minute capacity workload was not rerun.
  - Result: all durable paths are post-commit invalidated: logout/explicit session revoke → `disconnectSession`; logout-all/password change/user deactivation → `disconnectUser`; refresh reuse/disabled refresh → `disconnectSession`. The middleware holds user and active-session `FOR SHARE` locks through registration, giving the barrier-tested fail-closed ordering. The first Chrome attempt found only missing web/app local listeners; after starting those unchanged local services, the same unmodified test passed.

## active batch — F10-R32-SOCKET-REVOCATION-REVALIDATION

Coordinator/Thread: `Codex /root`
Started at: `2026-09-25 01:49 +03:30`
Phase: `10-CHAT-CONSULTATION`
Batch status: `DONE — accepted for isolated F10-T09 commit; Phase 10 remains REWORK`
Contract baseline: `chat-consultation-v1`, `ADR-0010`, and `efe5c16`.

- Task ID: `F10-T09 REVALIDATION (durable revocation fence)`
  - Status: `DONE`
  - Scope: rerun the PostgreSQL/Socket.IO regression set after F10-T03/F10-T04, including REST durable-session authorization, handshake/revoke barrier, refresh reuse eviction, reconnect, authorization, moderation, ordering, presence and rate limits.
  - Owned paths: Phase 10 evidence/status/checklist only.
  - Verification: API typecheck, disposable PostgreSQL `chatRevalidation` (8 files, 27 tests), and `git diff --check` → PASS.
  - Result: REST durable-session authorization, handshake/revoke serialization, refresh reuse eviction, reconnect, ordering, moderation/tombstones, authorization, presence and rate limits remain green after `efe5c16`; F10-T11 is next.

## active batch — F10-R31-SOCKET-REVOCATION-FENCE

Coordinator/Thread: `Codex /root`
Started at: `2026-09-25 01:38 +03:30`
Phase: `10-CHAT-CONSULTATION`
Batch status: `DONE — accepted for isolated F10-T04 commit; Phase 10 remains REWORK`
Contract baseline: `chat-consultation-v1`, `ADR-0010`, and independent P1 review.

- Task ID: `F10-T04 REWORK (durable revocation fence)`
  - Status: `DONE`
  - Scope: serialize persisted session validation/registration against revocation and notify the local Socket.IO registry after every durable revocation path, with real PostgreSQL/Socket.IO barrier and refresh-reuse regressions.
  - Owned paths: chat gateway/registry boundary, identity revocation use cases and focused gateway/identity tests, plus Phase 10 evidence/status/checklist.
  - Shared/exclusive resource: Socket.IO identity handshake and session lifecycle; serialized after F10-T03.
  - Verification: API typecheck → PASS; focused identity unit tests → PASS (18); disposable PostgreSQL `chatRevalidation` → PASS (8 files, 27 tests); `git diff --check` → PASS.
  - Result: the handshake locks the active session through registration, so a concurrent revoke either rejects it or disconnects it after commit. Logout, session management, logout-all, user deactivation, refresh reuse/disabled refresh, and password change all now reach local socket invalidation only after their durable change commits.

## active batch — F10-R30-REST-SESSION-AUTHORIZATION

Coordinator/Thread: `Codex /root`
Started at: `2026-09-25 00:30 +03:30`
Phase: `10-CHAT-CONSULTATION`
Batch status: `DONE — accepted for isolated F10-T03 commit; Phase 10 remains REWORK`
Contract baseline: `chat-consultation-v1`, `ADR-0010`, and independent P1 review.

- Task ID: `F10-T03 REWORK (persisted session authorization)`
  - Status: `DONE`
  - Scope: require an active persisted principal session on all chat REST authorization paths, with real PostgreSQL history/send regressions; no Socket.IO lifecycle or shared identity invalidation changes.
  - Owned paths: chat service and focused REST/integration tests, plus Phase 10 evidence/status/checklist.
  - Shared/exclusive resource: chat REST authorization and serialized PostgreSQL test environment.
  - Verification: disposable PostgreSQL `outboxAfterChat` → PASS (2 files, 4 tests); API typecheck and `git diff --check` → PASS.
  - Result: chat actor authorization requires an unrevoked, unexpired session owned by `principal.sessionId`; the real REST regression proves the same signed JWT can neither read history nor create a message after session-management revocation.

## active batch — F10-R29-DISABLED-USER-FINAL-GATES

Coordinator/Thread: `Codex /root`
Started at: `2026-09-25 00:13 +03:30`
Phase: `10-CHAT-CONSULTATION`
Batch status: `DONE — accepted for isolated F10-T11 commit; Phase 10 READY_FOR_REVIEW`
Contract baseline: `chat-consultation-v1`, `ADR-0010`, `12f84ce`, and `3442992`.

- Task ID: `F10-T11 REVALIDATION (disabled user Socket.IO)`
  - Status: `DONE`
  - Scope: final build, real Chrome authenticated chat journey, freshness/isolation checks and joint session-revoke/deactivation review.
  - Verification: workspace build → PASS (5/5 packages); `pnpm exec playwright test --config playwright.phase10.config.ts` → PASS (1 real Chrome text-chat test, 7.3s); `git diff --check` → PASS.
  - Result: session logout/revoke remains post-persistence `disconnectSession`, logout-all remains post-persistence `disconnectUser`, and the new durable deactivation owner performs transaction-then-`disconnectUser`; the shared locked handshake prevents an analogous race. The accepted 40-minute capacity evidence remains unchanged and was not repeated.

## active batch — F10-R28-DISABLED-USER-SOCKET-REVALIDATION

Coordinator/Thread: `Codex /root`
Started at: `2026-09-25 00:10 +03:30`
Phase: `10-CHAT-CONSULTATION`
Batch status: `DONE — accepted for isolated F10-T09 commit; Phase 10 remains REWORK`
Contract baseline: `chat-consultation-v1`, `ADR-0010`, and `12f84ce`.

- Task ID: `F10-T09 REVALIDATION (disabled user Socket.IO)`
  - Status: `DONE`
  - Scope: focused PostgreSQL/Socket.IO regression proof for session revocation, ACTIVE-user admission, deactivation eviction, reconnect, ordering, authorization, moderation and rate limit.
  - Verification: run-owned disposable PostgreSQL `chatRevalidation` completed with exit code 0; API typecheck and `git diff --check` had already passed for the accepted remediation.
  - Result: targeted behavior remains fail-closed. The frozen 40-minute capacity proof was not repeated because its workload/criterion is unaffected.

## active batch — F10-R27-DISABLED-USER-SOCKET-INVALIDATION

Coordinator/Thread: `Codex /root`
Started at: `2026-09-25 00:05 +03:30`
Phase: `10-CHAT-CONSULTATION`
Batch status: `DONE — accepted for isolated F10-T04 commit; Phase 10 remains REWORK`
Contract baseline: `chat-consultation-v1`, `ADR-0010`, `a860a47`, `18e4fdf`, and `ce5e4d1`.

- Task ID: `F10-T04 REWORK (disabled user socket invalidation)`
  - Status: `DONE`
  - Scope: persisted active-user Socket.IO admission, single-instance durable user deactivation invalidation, and a real PostgreSQL/Socket.IO race proof.
  - Owned paths: identity application/module, chat realtime gateway, focused gateway tests, evidence/status/checklist.
  - Verification: API typecheck and run-owned disposable PostgreSQL `chatRevalidation` suite → PASS (8 files, 24 tests); it includes the real Socket.IO proof for ACTIVE admission, active-session/DISABLED-user rejection, buffered concurrent join/deactivation, post-commit socket disconnect, and no later fan-out.
  - Result: no client heartbeat or additional message is necessary to remove sockets after durable deactivation. The frozen 40-minute capacity criterion was not rerun because send, capacity and topology paths did not change.

## active batch — F10-R22-FINAL-REVOCATION-GATES

Coordinator/Thread: `Codex /root`
Started at: `2026-09-24 19:25 +03:30`
Phase: `10-CHAT-CONSULTATION`
Batch status: `DONE — accepted for isolated F10-T11 commit; Phase 10 READY_FOR_REVIEW`
Contract baseline: `chat-consultation-v1`, `ADR-0010`, `d35772c`, and `a3c3bd1`.

- Task ID: `F10-T11 REVALIDATION`
  - Status: `DONE`
  - Depends on: accepted F10-T04 immediate socket invalidation and F10-T09 targeted revalidation.
  - Scope: final isolated workspace verification, production builds and real Chrome Phase 10 E2E after the gateway lifecycle change; evidence/status/checklist only unless a gate exposes a defect.
  - Owned paths: test/evidence/status/checklist only.
  - Shared/exclusive resource: isolated disposable PostgreSQL, local API/web/app/dashboard processes and Chrome.
  - Verification: Chrome trace confirms `POST /v1/auth/login` sets the refresh cookie for web origin, and `POST /v1/auth/refresh` from app origin sends it and returns 200 with credentialed CORS. The strengthened no-bypass E2E passed (1 test). Captured disposable workspace gate passed with exit code 0: 5/5 Turbo tasks, API 84 files / 347 tests, 40m39.022s. Production workspace build passed (5/5 packages); `git diff --check` passed.
  - Result: the earlier failure was a fixture readiness race: it treated the app URL as authenticated before SessionGate completed its refresh bootstrap. The fixture now waits for the real refresh response and authenticated shell; no auth/product contract changed.

## active batch — F10-R21-SOCKET-REVOCATION-REVALIDATION

Coordinator/Thread: `Codex /root`
Started at: `2026-09-24 19:15 +03:30`
Phase: `10-CHAT-CONSULTATION`
Batch status: `DONE — accepted for isolated revalidation commit; Phase 10 remains REWORK`
Contract baseline: `chat-consultation-v1`, `ADR-0010`, and `d35772c`.

- Task ID: `F10-T09 REVALIDATION`
  - Status: `DONE`
  - Depends on: accepted F10-T04 immediate session/user invalidation.
  - Scope: targeted real PostgreSQL/Socket.IO authorization, revocation, reconnect, visibility/tombstone, presence and rate-limit revalidation only; no capacity criterion or topology change.
  - Owned paths: focused API test/evidence/status/checklist only if coverage is insufficient.
  - Shared/exclusive resource: serialized PostgreSQL and Socket.IO test environment.
  - Verification: real PostgreSQL/Socket.IO gateway, immediate session/user revoke, reconnect, authorization, moderation/tombstone, presence, ordering and rate-limit suites → PASS (8 files, 23 tests); API typecheck and `git diff --check` → PASS.
  - Result: the immediate invalidation registry preserves the frozen high-water, moderation, authorization and rate-limit contracts. The change is not on the send, capacity or topology path; the accepted 40-minute capacity evidence is unchanged and was not rerun.

## active batch — F10-R20-IMMEDIATE-SOCKET-REVOCATION

Coordinator/Thread: `Codex /root`
Started at: `2026-09-24 15:30 +03:30`
Phase: `10-CHAT-CONSULTATION`
Batch status: `DONE — accepted for isolated task commit; Phase 10 remains REWORK`
Contract baseline: `chat-consultation-v1`, `ADR-0010`, `d257f70`, and independent closure-review P1.

- Task ID: `F10-T04 REWORK`
  - Status: `DONE`
  - Depends on: accepted prior F10-T04/F10-T09/F10-T11 work; this remediation precedes their revalidation.
  - Scope: process-local immediate invalidation of Socket.IO connections by authenticated session and user, wiring the real session-revoke path, and focused PostgreSQL/Socket.IO proof for session and user revocation with no follow-up client event.
  - Owned paths: chat realtime gateway/module/registry, identity session-management wiring, focused chat realtime integration tests, Phase 10 evidence/status/checklist.
  - Shared/exclusive resource: single realtime API instance and serialized PostgreSQL/Socket.IO test environment.
  - Verification: API typecheck → PASS; PostgreSQL/Socket.IO session revoke, user-wide revoke, gateway presence and session-use-case suites → PASS (3 files, 14 tests); `git diff --check` → PASS.
  - Result: the registry is single-instance and process-local by ADR-0010. Session revoke disconnects only that session's sockets; logout-all disconnects every socket for that user. Both happen after durable revoke and before a further room fan-out, without a client heartbeat or message.

## active batch — F10-R19-FINAL-GATES

Coordinator/Thread: `Codex /root`
Started at: `2026-09-23 20:53 +03:30`
Phase: `10-CHAT-CONSULTATION`
Batch status: `DONE — all final gates passed; Phase 10 READY_FOR_REVIEW`
Contract baseline: `chat-consultation-v1`, `ADR-0010`, `9b760a3`, and `48a5841`.

- Task ID: `F10-T11 REVALIDATION`
  - Status: `DONE`
  - Depends on: accepted F10-T08 and F10-T09 revalidation.
  - Scope: final migration/client/typecheck/test/build/freshness and real Chrome E2E verification, including the minimal
    disposable-PostgreSQL verification harness required to eliminate shared-DB contamination.
  - Owned paths: `scripts/with-disposable-postgres.mjs`, root `package.json`, `apps/api/package.json`, test/evidence/status/checklist only.
  - Shared/exclusive resource: local PostgreSQL, API/web/app/dashboard processes and browser environment.
  - Expected verification: targeted migration/reminder proof on a disposable DB, then full workspace gate and Chrome E2E;
    `READY_FOR_REVIEW` only if every gate passes.
  - Verification: chat-producer-then-outbox fixture proof → PASS (2 files, 3 tests); the frozen 1,000ms capacity
    threshold rerun → PASS (1 file, 2 tests); full isolated workspace gate → PASS (5/5 tasks, API 84 files / 346
    tests, 40m45.245s); production workspace build → PASS; real Chrome Phase 10 E2E → PASS (1 test).
  - Result: the harness DB `sabz_zendegi_verify_e18a6a1ea96d429faa07fcde10d00149` was independently confirmed
    absent after `finally` cleanup. The fixture no longer depends on a globally empty outbox queue, and no capacity
    criterion was changed. Phase 10 is `READY_FOR_REVIEW`; do not start Phase 11 or closure.

## active batch — F10-R18-POST-RECOVERY-REALTIME

Coordinator/Thread: `Codex /root`
Started at: `2026-09-23 20:35 +03:30`
Phase: `10-CHAT-CONSULTATION`
Batch status: `DONE — accepted for isolated task commit`
Contract baseline: `chat-consultation-v1`, `ADR-0010`, and committed `9b760a3`.

- Task ID: `F10-T09 REVALIDATION`
  - Status: `DONE`
  - Depends on: accepted `F10-T08 REWORK`.
  - Scope: real PostgreSQL/Socket.IO reconnection, authorization/revocation, visibility/tombstone, block-policy, and high-water contract regression verification only.
  - Owned paths: focused API realtime/integration tests if a coverage gap is found, plus Phase 10 evidence/status/checklist.
  - Shared/exclusive resource: serialized PostgreSQL and Socket.IO test environment.
  - Expected verification: real gateway/reconnect/authorization/moderation/block suites, API typecheck, and diff isolation.
  - Verification: PostgreSQL/Socket.IO reconnect, realtime/visibility/revocation, moderation/block, authorization,
    ordering/presence and rate-limit suites → PASS (8 files, 22 tests); API typecheck → PASS.
  - Result: real infrastructure confirms the high-water reconnect contract and every prior security remediation;
    no product source change was required.

## active batch — F10-R17-HIGH-WATER-RECOVERY

Coordinator/Thread: `Codex /root`
Started at: `2026-09-22 01:20 +03:30`
Phase: `10-CHAT-CONSULTATION`
Batch status: `DONE — accepted for isolated task commit`
Contract baseline: `chat-consultation-v1`, `ADR-0010`, and independent closure-review findings on `4d56ca5`.

- Task ID: `F10-T08 REWORK`
  - Status: `DONE`
  - Depends on: accepted `F10-T03/T04`; remediation is limited to client recovery.
  - Scope: app/dashboard high-water-bounded reconnect recovery, explicit failure before `connected`, and cancellation-safe restore retry only after a successful next join.
  - Owned paths: `apps/app/src/lib/chat-api.ts`, `apps/app/src/lib/chat-api.spec.ts`, `apps/dashboard/src/lib/chat-api.ts`, `apps/dashboard/src/lib/chat-api.spec.ts`, plus Phase 10 evidence/status/checklist.
  - Shared/exclusive resource: app/dashboard chat adapters and focused test suites.
  - Verification: app 45 tests and dashboard 52 tests, their typechecks and production builds, and `git diff --check` → PASS.
  - Result: recovery page budget derives from frozen sequence distance, validates contiguous progress through high-water, reports `recovery-failed` rather than `connected` on any unreachable/stalled/empty page, and restore work resumes only after a later successful join.

## آخرین batch — F10-R16-CLOSURE-GATES

Coordinator/Thread: `Codex /root`
Phase: `10-CHAT-CONSULTATION`
Batch status: `DONE — accepted for isolated task commit; Phase 10 READY_FOR_REVIEW`

- Task ID: `F10-T11 REVALIDATION`
  - Status: `DONE`
  - Result: Prisma/client/typechecks/tests/builds and real Chrome Phase 10 E2E passed. Playwright discovers retained Phase 09 and Phase 10 suites. Independent security/closure review is next; Phase 11 is not claimed.

## آخرین batch — F10-R15-SECURITY-REVALIDATION

Coordinator/Thread: `Codex /root`
Phase: `10-CHAT-CONSULTATION`
Batch status: `DONE — accepted for isolated task commit`

- Task ID: `F10-T09 REVALIDATION`
  - Status: `DONE`
  - Result: all real PostgreSQL/Socket.IO P1 regression gates passed; F10-T11 is next eligible and not yet claimed.

## آخرین batch — F10-R14-CLIENT-PAGINATION

Coordinator/Thread: `Codex /root`
Started at: `2026-09-21 23:20 +03:30`
Phase: `10-CHAT-CONSULTATION`
Batch status: `DONE — accepted for isolated task commit`
Contract baseline: `chat-consultation-v1`, `ADR-0010`, `7d8fe59`, and `975bc25`.

- Task ID: `F10-T08 REWORK`
  - Status: `DONE`
  - Depends on: F10-T03/T04 REWORK
  - Scope: bounded, cancellable app/dashboard history and reconnect pagination through authorized REST high-water; Socket.IO remains body-free signaling.
  - Owned paths: app/dashboard chat adapters and focused tests, Phase 10 evidence/status/checklist.
  - Shared/exclusive resource: app/dashboard source and test suites.
  - Expected verification: >150-message reconnect pagination, stale-disconnect safety, app/dashboard tests/typechecks/builds, diff/isolation.

- Result: F10-T08 REWORK passed. Next eligible task is F10-T09 REVALIDATION, not yet claimed.

## آخرین batch — F10-R13-SOCKET-REVOCATION

Coordinator/Thread: `Codex /root`
Started at: `2026-09-21 23:10 +03:30`
Phase: `10-CHAT-CONSULTATION`
Batch status: `DONE — accepted for isolated task commit`
Contract baseline: `chat-consultation-v1`, `ADR-0010`, and committed `7d8fe59`; Socket.IO is signaling only.

- Task ID: `F10-T04 REWORK`
  - Status: `DONE`
  - Depends on: `F10-T03 REWORK`
  - Scope: immediately revoke a socket after failed current authorization; prove missed visibility signaling reconciles through PostgreSQL.
  - Owned paths: chat realtime gateway/publisher and real Socket.IO integration tests, Phase 10 evidence/status/checklist.
  - Shared/exclusive resource: Socket.IO gateway and PostgreSQL integration environment.
  - Expected verification: real Socket.IO deactivation/revocation and disconnect-before-publish recovery, API typecheck and diff/isolation.

- Result: F10-T04 REWORK passed. Next eligible task is F10-T08 REWORK, not yet claimed.

## آخرین batch — F10-R12-VISIBILITY-RECONCILIATION

Coordinator/Thread: `Codex /root`
Started at: `2026-09-21 22:05 +03:30`
Phase: `10-CHAT-CONSULTATION`
Batch status: `DONE — accepted for isolated task commit`
Contract baseline: `chat-consultation-v1` and `ADR-0010`; PostgreSQL remains authority and Socket.IO is body-free signaling.

- Task ID: `F10-T03 REWORK`
  - Status: `DONE`
  - Depends on: accepted `F10-T01/T02`; no new persistence migration required because immutable moderation actions are durable.
  - Scope: authorized REST visibility reconciliation independent of message sequence; block enforcement only on human send.
  - Owned paths: chat REST/service/DTO/OpenAPI slice, focused PostgreSQL/API tests, Phase 10 evidence/status/checklist.
  - Shared/exclusive resource: common chat authorization and PostgreSQL test DB.
  - Expected verification: real PostgreSQL history/reconciliation/block regression, API typecheck, OpenAPI freshness, diff/isolation.

- Result: F10-T03 REWORK passed. Durable moderation actions reconcile current authorized visibility using a server-bound
  checkpoint independent of message sequence; block remains send-only. Next eligible task is F10-T04 REWORK, not yet claimed.

## آخرین batch — F10-CLOSE

Coordinator/Thread: `Codex /root`
Completed at: `2026-09-21 21:51 +03:30`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE (CLOSED)`
Baseline: `8165d0b test(F10-T11): revalidate paginated restore closure`

- Scope: documentation-only formal closure after the user-provided fifth independent closure-review PASS.
- Result: all F10 tasks and accepted remediations/revalidations are closed; Milestone D is complete.
- Excluded: `.gitignore` and `plan/phases/12-PRODUCTION-HARDENING.md` remain user-owned, unstaged and absent from
  every Phase 10 commit.
- Next eligible work: `Phase 11 — Dashboard Reporting & Access Expansion`, `NOT_STARTED` and not claimed here.

## آخرین batch — F10-R11-RESTORE-PAGINATION-CLOSURE

Coordinator/Thread: `Codex /root`
Started at: `2026-09-21 21:25 +03:30`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — accepted for isolated task commit; Phase 10 READY_FOR_REVIEW`
Baseline: `a8e60b0 test(F10-T09): revalidate paginated restore visibility`

- Task: `F10-T11 REVALIDATION`
- Scope: final closure gates after bounded restore pagination; output is `READY_FOR_REVIEW`, never `DONE (CLOSED)`.
- Do not change/stage: `.gitignore` or `plan/phases/12-PRODUCTION-HARDENING.md`.
- Result: Prisma/OpenAPI/client, API/app/dashboard types/tests/builds, Chrome E2E, source scans, diff and commit
  isolation passed. Only fifth independent closure review may decide formal closure.

## آخرین batch — F10-R09-RESTORE-PAGINATION-REVALIDATION

Coordinator/Thread: `Codex /root`
Started at: `2026-09-21 21:15 +03:30`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — accepted for isolated task commit`
Baseline: `78c4f25 fix(F10-T08): reconcile paginated restored messages`

- Task: `F10-T09 REVALIDATION`
- Scope: PostgreSQL/Socket.IO confirmation that sequence 101 restore remains body-free, cursor-recoverable and
  unauthorized to outsiders, plus affected adapter/reconnect/history correctness.
- Do not change/stage: `.gitignore` or `plan/phases/12-PRODUCTION-HARDENING.md`.
- Result: all affected real database/gateway and client adapter checks passed; frozen capacity evidence remains
  applicable because no gateway, send, rate-limit or throughput path changed.

## آخرین batch — F10-R08-RESTORE-PAGINATION

Coordinator/Thread: `Codex /root`
Started at: `2026-09-21 20:10 +03:30`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — accepted for isolated task commit`
Baseline: `63befff test(F10-T11): revalidate restored visibility closure`

- Task: `F10-T08 REWORK`
- Scope: bounded, authorized cursor pagination for a body-free restore visibility event beyond the first history page.
- Do not change/stage: `.gitignore` or `plan/phases/12-PRODUCTION-HARDENING.md`.
- Result: each client uses server event identity only to find the restored record across authorized REST pages; stale
  requests cannot replace a newer safe state after disconnect, and duplicate fetches are coalesced per message.

## آخرین batch — F10-R11-RESTORE-CLOSURE

Coordinator/Thread: `Codex /root`
Started at: `2026-09-21 19:55 +03:30`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — accepted for isolated task commit; Phase 10 READY_FOR_REVIEW`
Baseline: `fdb91c7 test(F10-T09): revalidate restored visibility`

- Task: `F10-T11 REVALIDATION`
- Scope: final closure gates after the restore visibility remediation. The output state is `READY_FOR_REVIEW`, never
  `DONE (CLOSED)`.
- Do not change/stage: `.gitignore` or `plan/phases/12-PRODUCTION-HARDENING.md`.
- Result: Prisma migration status/validate, OpenAPI/client freshness, app/dashboard tests and builds, Chrome E2E,
  source scans and diff/isolation checks all passed. A fourth independent closure review remains required.

## آخرین batch — F10-R03-RESTORE-TRANSITION

Coordinator/Thread: `Codex /root`
Started at: `2026-09-21 +05:05`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — accepted for isolated task commit`
Baseline: `e9efe7d test(F10-T11): revalidate phase 10 closure`

- Task: `F10-T03 REWORK`
- Scope: durable, audited `RESTRICTED → VISIBLE` transition yields an opaque post-commit publication fact; no body or preview.
- Do not change/stage: `.gitignore` or `plan/phases/12-PRODUCTION-HARDENING.md`.
- Result: restore creates a durable, audited opaque transition fact containing conversation/message identity, sequence
  and `VISIBLE` only; it contains no body or preview.

## آخرین batch — F10-R04-RESTORE-EVENT

Coordinator/Thread: `Codex /root`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — accepted for isolated task commit`
Baseline: `dade0b7 fix(F10-T03): publish restore visibility transition`

- Task: `F10-T04 REWORK`
- Scope: publish authorized body-free `message:visibility-changed` restore events to the conversation room only.
- Do not change/stage: `.gitignore` or `plan/phases/12-PRODUCTION-HARDENING.md`.
- Result: a joined, authorized recipient gets one body-free restore event only from the same conversation room.

## آخرین batch — F10-R08-RESTORE-RECONCILIATION

Coordinator/Thread: `Codex /root`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — accepted for isolated task commit`
Baseline: `6fe0c2c fix(F10-T04): publish restore visibility event`

- Task: `F10-T08 REWORK`
- Result: app and dashboard ignore body-free restore event content and refresh the authoritative authorized REST history.
- Verification: app adapter (5 tests), dashboard adapter (2 tests), app/dashboard typechecks and `git diff --check` → PASS.

## آخرین batch — F10-R11-VISIBILITY-CLOSURE

Coordinator/Thread: `Codex /root`
Started at: `2026-09-21 +04:50`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — accepted for isolated task commit; Phase 10 READY_FOR_REVIEW`
Baseline: `a9be31d test(F10-T09): revalidate visibility transitions`

- Task: `F10-T11 REVALIDATION`
- Scope: final related Prisma/API/OpenAPI/client/app/dashboard/browser/security/deferred-media/commit-isolation gates
  after F10-T03/T04/T08/T09. The output state is `READY_FOR_REVIEW`, not `DONE (CLOSED)`.
- Owned paths: final evidence/status/checklist and a focused verification-only regression if a gap is found.
- Do not change/stage: `.gitignore`, `plan/phases/12-PRODUCTION-HARDENING.md`, product feature/schema/migration,
  dependency, client output, API or UI source unless a verification gap requires its owning remediation task instead.
- Result: all related final gates passed. The phase returns to `READY_FOR_REVIEW`, never `DONE (CLOSED)`; only a third
  independent closure review can authorize any closure decision.
- Verification: Prisma migration status (31 applied), schema validate, API/app/dashboard/api-client typechecks,
  OpenAPI export/generated-client freshness, app build, dashboard build, app tests (12/38), dashboard tests (15/45),
  live Chrome Phase 10 browser E2E, scoped deferred-media/external-messenger scan, rework commit-isolation review and
  `git diff --check` → PASS.
- Review: user-owned `.gitignore` and `plan/phases/12-PRODUCTION-HARDENING.md` are not owned, edited or staged.

## آخرین batch — F10-R09-VISIBILITY-REVALIDATION

Coordinator/Thread: `Codex /root`
Started at: `2026-09-21 +04:20`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — accepted for isolated task commit`
Baseline: `bfcb1ae fix(F10-T08): reconcile restricted message tombstones`

- Task: `F10-T09 REVALIDATION`
- Scope: real PostgreSQL/Socket.IO validation for both connected restriction paths, history/cursor/reconnect safety,
  authorization/clinic isolation and app/dashboard tombstone regressions affected by F10-T03/T04/T08.
- Owned paths: revalidation-only test/evidence/status/checklist paths. No product feature, schema, migration,
  dependency, OpenAPI/client or UI source work.
- Do not change/stage: `.gitignore` or `plan/phases/12-PRODUCTION-HARDENING.md`.
- Result: current production paths revalidated against PostgreSQL and live Socket.IO include direct and
  report-resolution tombstones while connected, and body-free history/sync/reconnect after restriction.
- Verification: PostgreSQL API/gateway set → PASS (9 files, 16 tests): REST/ordering, authorization, abuse/block,
  moderation, receipts, live Socket.IO direct+resolution event, presence, and reconnect. App adapter → PASS (4);
  dashboard adapter → PASS (1); API typecheck and `git diff --check` → PASS. Existing accepted F10-T09 frozen
  capacity evidence remains the authoritative 100/300/600, sustained/burst and reconnect-storm evidence.
- Review: user-owned `.gitignore` and `plan/phases/12-PRODUCTION-HARDENING.md` are not owned, edited or staged.

## آخرین batch — F10-R08-VISIBILITY-CACHE

Coordinator/Thread: `Codex /root`
Started at: `2026-09-21 +04:05`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — accepted for isolated task commit`
Baseline: `6bf1eca fix(F10-T04): publish safe visibility tombstones`

- Task: `F10-T08 REWORK`
- Scope: consume `message:visibility-changed` in app and dashboard; replace cached messages by ID/sequence with the
  authoritative tombstone and prevent ordinary UI rendering of the prior body.
- Owned paths: app/dashboard chat adapters/pages and their focused tests, plus Phase 10 status/evidence/checklists.
- Do not change/stage: `.gitignore`, `plan/phases/12-PRODUCTION-HARDENING.md`, API/schema/migrations/dependencies,
  gateway/runtime publication, or OpenAPI/public REST contract.
- Result: both chat clients subscribe to `message:visibility-changed` and reconcile its ID/sequence replacement into
  local state. The entire old message object is replaced, so a prior `body` cannot remain for ordinary rendering.
- Verification: app adapter suite → PASS (4 tests); dashboard adapter suite → PASS (1 test), each covering direct
  and report-resolution tombstones; app/dashboard typechecks and `git diff --check` → PASS.
- Review: user-owned `.gitignore` and `plan/phases/12-PRODUCTION-HARDENING.md` are not owned, edited or staged.

## آخرین batch — F10-R04-VISIBILITY-EVENT

Coordinator/Thread: `Codex /root`
Started at: `2026-09-21 +03:50`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — accepted for isolated task commit`
Baseline: `f2c8c45 fix(F10-T03): persist safe moderation transitions`

- Task: `F10-T04 REWORK`
- Scope: publish a body-free `message:visibility-changed` fact only after the direct or report-resolution PostgreSQL
  transaction commits; prove authorized room-only Socket.IO delivery for connected ordinary participants.
- Owned paths: chat service post-commit publisher call, realtime publisher/gateway tests, and Phase 10
  status/evidence/checklists.
- Do not change/stage: `.gitignore`, `plan/phases/12-PRODUCTION-HARDENING.md`, schema/migrations, dependencies,
  OpenAPI/public REST contract, or app/dashboard source.
- Result: Socket.IO now emits `message:visibility-changed` only to the server-authorized conversation room, and only
  after the direct-moderation or report-resolution transaction committed. Its payload is the canonical tombstone fact
  with no body or preview.
- Verification: real PostgreSQL/Socket.IO gateway integration covers an already delivered visible message, then direct
  restriction and report-resolution restriction while the patient remains joined → PASS (1 file, 5 tests); API
  typecheck and `git diff --check` → PASS.
- Review: user-owned `.gitignore` and `plan/phases/12-PRODUCTION-HARDENING.md` are not owned, edited or staged.

## آخرین batch — F10-R03-VISIBILITY

Coordinator/Thread: `Codex /root`
Started at: `2026-09-21 +03:30`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — accepted for isolated task commit`
Baseline: `e9efe7d test(F10-T11): revalidate phase 10 closure`

- Task: `F10-T03 REWORK`
- Scope: canonical, safe visibility-transition facts for direct moderation and report-resolution restriction;
  PostgreSQL-only persistence proof. Socket.IO publication and UI cache handling are deferred to the succeeding
  serialized `F10-T04 REWORK` and `F10-T08 REWORK` tasks.
- Owned paths: chat service/REST moderation transition, T03 PostgreSQL tests, and Phase 10 status/evidence/checklists.
- Do not change/stage: `.gitignore`, `plan/phases/12-PRODUCTION-HARDENING.md`, schema/migrations, dependencies,
  gateway/runtime publication, or app/dashboard source.
- Result: direct ADMIN restriction and report-resolution restriction share the same PostgreSQL-persisted, body-free
  transition fact. The fact exists only after transaction commit; Socket.IO publication is intentionally deferred to
  `F10-T04 REWORK`.
- Verification: PostgreSQL moderation integration proof covers both paths, REST history and cursor/realtime sync for
  patient, doctor and ADMIN, and explicit-audited review only → PASS (1 file, 1 test); API typecheck and
  `git diff --check` → PASS.
- Review: user-owned `.gitignore` and `plan/phases/12-PRODUCTION-HARDENING.md` are not owned, edited or staged.

## آخرین batch — F10-R03

Coordinator/Thread: `Codex /root`
Started at: `2026-09-21 +03:30`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — accepted for isolated task commit`
Baseline: `2335ee1 test(F10-T11): close chat consultation verification`

- Task: `F10-T03 REWORK`
- Depends on: accepted `F10-T02`; closure-review HIGH restricted-content finding.
- Scope: ordinary REST/history/cursor/realtime response mappers never disclose restricted message text, including to
  ADMIN; explicit audited moderation review remains the sole text-returning path.
- Owned paths: chat REST/runtime response mapping, T03 moderation/REST regression tests, generated contract if its
  public schema changes, and task status/evidence/checklist only.
- Shared/exclusive resource: serialized PostgreSQL integration database.
- Do not change/stage: `.gitignore` or `plan/phases/12-PRODUCTION-HARDENING.md`.
- Connectivity recovered: container `healthy`, internal `psql SELECT 1`, and host Node/pg using the API environment →
  PASS. No repository connection string, volume, proxy, reset, or user-owned file changed.
- Result: ordinary REST history, cursor/realtime sync and post-commit payload mapping return a tombstone only for every
  restricted message, including to ADMIN. The explicit ADMIN-only moderation-review endpoint is the sole ordinary API
  path that returns the original body and writes `RESTRICTED_CONTENT_REVIEWED` against that message.
- Verification: PostgreSQL API regression suite (REST, authorization, moderation and OpenAPI contract) → PASS
  (4 files, 11 tests); API typecheck → PASS; generated OpenAPI/client freshness → PASS; `git diff --check` → PASS.
- Review: user-owned `.gitignore` and `plan/phases/12-PRODUCTION-HARDENING.md` were neither edited nor staged.

## آخرین batch — F10-R04

Coordinator/Thread: `Codex /root`
Started at: `2026-09-21 +03:30`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — accepted for isolated task commit`
Baseline: `ed5724f fix(F10-T03): restrict moderated message visibility`

- Task: `F10-T04 REWORK`
- Depends on: accepted `F10-T03 REWORK`; closure-review HIGH sync-to-room subscription race finding.
- Scope: use a server-authorized join-before-backlog fence and prove with deterministic PostgreSQL/Socket.IO integration
  that a commit during the former sync/join interval reaches the reconciled client without a sequence gap or durable
  duplicate.
- Owned paths: chat realtime gateway, T04 gateway/client reconciliation tests, and task status/evidence/checklist only.
- Shared/exclusive resource: serialized PostgreSQL integration database and local Socket.IO gateway.
- Do not change/stage: `.gitignore` or `plan/phases/12-PRODUCTION-HARDENING.md`.
- Result: authorization is checked before room subscription, then sync re-authorizes and captures the post-subscription
  high-water/backlog; a failed second check leaves the room. The app reconciliation uses message ID replacement and
  sequence ordering, making the permitted early-event/backlog duplicate harmless.
- Verification: real PostgreSQL/Socket.IO gateway suite → PASS (4 tests, including deterministic sync/join race);
  app reconciliation unit suite → PASS (3 tests); API/app typechecks and `git diff --check` → PASS.

## آخرین batch — F10-R09

Coordinator/Thread: `Codex /root`
Started at: `2026-09-21 +03:30`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — accepted for isolated task commit`
Baseline: `10bd7d0 fix(F10-T04): fence realtime sync and room join`

- Task: `F10-T09 REVALIDATION`
- Scope: rerun authoritative PostgreSQL correctness, authorization/moderation/block/rate-limit, reconnect/capacity and
  new race verification affected by T03/T04. Do not start F10-T11 until accepted.
- Do not change/stage: `.gitignore` or `plan/phases/12-PRODUCTION-HARDENING.md`.
- Verification: authoritative PostgreSQL correctness suite (ordering/idempotency, REST, authorization, moderation,
  abuse/block, rate limit, reconnect and fenced gateway race) → PASS; frozen capacity/reconnect run completed at 20
  msg/s × 30m then 50 msg/s × 5m with the 100-consultation/300-participant/600-connection storm scenario.

## آخرین batch — F10-R11

Coordinator/Thread: `Codex /root`
Started at: `2026-09-21 +03:30`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — accepted for isolated task commit`
Baseline: `3a7147a test(F10-T09): revalidate chat realtime correctness`

- Task: `F10-T11 REVALIDATION`
- Scope: final Prisma/API/app/dashboard/browser/realtime/privacy/OpenAPI/client/deferred-media/secret and commit-isolation
  verification after T03/T04/T09; final state remains `READY_FOR_REVIEW`, never `DONE (CLOSED)`.
- Do not change/stage: `.gitignore` or `plan/phases/12-PRODUCTION-HARDENING.md`.
- Result: all final gates passed after T03/T04/T09. Phase 10 is returned to `READY_FOR_REVIEW` only; Phase 11 remains
  `NOT_STARTED` and a second independent closure review remains required.

## آخرین batch — F10-B11

Coordinator/Thread: `Codex /root`
Started at: `2026-09-20 +03:30`
Phase: `10-CHAT-CONSULTATION`
Completed at: `2026-09-20 +03:30`
Status: `DONE — accepted for isolated task commit`
Baseline: `24bbe75 docs(F10-T10): defer video consultation for MVP`

- Scope: final Phase 10 migration/API/realtime/UI/browser/privacy/deferred-media verification and closure evidence.
- Owned paths: task-owned final tests/config and Phase 10 status/evidence/checklists only.
- Do not change: product runtime/schema/migrations/OpenAPI client/dependencies, `.gitignore`, or Phase 12 plan.
- Result: real PostgreSQL migration/status/validate, authoritative API/gateway/lifecycle/moderation/reconnect suites,
  app/dashboard tests and builds, deferred-media/privacy scans, and an isolated Chrome patient browser journey all
  passed. The synthetic browser journey registers and authenticates a patient, opens an eligible online appointment
  chat, sends a committed text message, and proves no audio/video control, external messenger request, or token URL.

## batch فعال — F10-B10

Coordinator/Thread: `Codex /root`
Started at: `2026-09-20 +03:30`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — accepted for isolated task commit`
Baseline: `8ba6687 test(F10-T09): prove chat security and capacity`

- Scope: prove the MVP video/voice deferral only; record absence of provider, SDK, token, room, join URL, callback,
  credential, environment, migration, external request and app/dashboard join control.
- Owned paths: Phase 10 status/evidence/checklist and task-owned absence verification only.
- Do not change: chat runtime/API/schema/migrations, app/dashboard implementation, dependencies/lockfile, `.gitignore`,
  or Phase 12 plan.
- Result: `DEFERRED / NOT_APPLICABLE FOR MVP`. Scoped runtime/manifest scans found no WebRTC/STUN/TURN/provider SDK,
  room/token/join/callback/credential/environment configuration or audio/video join control. No implementation added.

## batch فعال — F10-B09

Coordinator/Thread: `Codex /root`
Started at: `2026-09-19 23:20 +03:30`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — accepted for isolated task commit`
Baseline: `e9a3523 feat(F10-T08): connect chat consultation interfaces`

- Scope: task-owned PostgreSQL/gateway ordering, reconnect, abuse/authorization, rate and capacity/load proof with
  only synthetic data; the narrowly scoped Prisma Pg pool remediation required by the demonstrated throughput defect;
  evidence/status after all acceptance gates pass.
- Owned paths: `apps/api/src/database/prisma/prisma.service.ts`,
  `apps/api/test/{chat-ordering.integration.spec.ts,chat-reconnect-load.spec.ts,chat-abuse-authorization.integration.spec.ts,chat-rate-limit.integration.spec.ts,chat-capacity.load.spec.ts,chat-test-support.ts}`, task-owned load scripts/config, and Phase 10 status/evidence.
- Shared/exclusive resource: serialized PostgreSQL test database, local Socket.IO gateway and load environment.
- Do not change: production chat/API implementation, Prisma schema/migrations, OpenAPI/client, app/dashboard source,
  dependencies/lockfile, `.gitignore`, or Phase 12 plan.
- Result: Docker PostgreSQL healthy; disposable migration/seed database creation and cleanup passed. Ordering,
  idempotency, authorization, moderation, block, rate-limit and reconnect suites passed (6 tests). Capacity proof
  passed with 100 consultations, 300 authenticated participants, 600 Socket.IO connections, 95% signal delivery
  within two seconds, a 300-participant reconnect storm under 60 seconds, 20 committed messages/second for 30 minutes,
  and 50 committed messages/second for five minutes; durable message count/sequence reconciliation passed.

## آخرین batch — F10-B08

Coordinator/Thread: `Codex /root`
Started at: `2026-09-19 23:00 +03:30`
Phase: `10-CHAT-CONSULTATION`
Completed at: `2026-09-19 23:15 +03:30`
Status: `DONE — accepted for isolated task commit`
Baseline: `092c5ca feat(F10-T07): add waiting room presence`

- Scope: app/dashboard use the generated REST client and Socket.IO adapter for authorized text consultations;
  remove in-scope mock conversation and unsupported phone/video UI.
- Owned paths: `apps/app/{src/app/(app)/{chat,appointments/waiting-room}/**,src/lib/chat-api.*,package.json}`,
  `apps/dashboard/{src/{app/(app)/messages,features/messages,lib/chat-api.ts,data/messages.ts},package.json}`, the
  already-frozen Socket.IO-client lockfile entries, task-owned UI tests, and Phase 10 status/evidence.
- Do not change: API/schema/migration/OpenAPI client, Socket.IO version selection (T04 baseline remains `4.8.1`),
  appointment/encounter state, attachment, video provider/SDK, `.gitignore`, or Phase 12 plan.
- Review: PASS — patient chat and dashboard use the generated REST client for authoritative history/send and the
  authenticated Socket.IO adapter only for realtime/presence. Reconnect joins with the latest applied sequence;
  REST remains the sole write path. Loading, offline/reconnecting, forbidden, tombstone and read-only states are
  explicit; STAFF is denied locally and the server remains authoritative for clinic/appointment/linked-doctor checks.
  Mock conversation data and phone/video controls are absent from both surfaces. Evidence: [`logs/phase-10.md`](logs/phase-10.md).
- Next eligible batch: `F10-B09 / F10-T09` only; do not claim it in this task.

## batch فعال — F10-B06

Coordinator/Thread: `Codex /root`
Started at: `2026-09-19 09:00 +03:30`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — accepted for isolated task commit`
Baseline: `8d9c4a1 feat(F10-T05): add chat receipts and safe outbox`

- Scope: remove/hide in-scope app/dashboard text-chat attachment, image, file and audio mocks; record deferred absence.
- Owned paths: `apps/app/src/app/(app)/chat/**`, `apps/dashboard/src/features/messages/**`, `apps/dashboard/src/data/messages.ts`, task-owned absence tests,
  and Phase 10 status/evidence only.
- Do not change: API/schema/migrations, uploads/object storage/malware pipeline, media dependencies, realtime, app/dashboard
  chat runtime beyond attachment mock controls, `.gitignore`, or Phase 12 plan.
- Result: `DEFERRED / NOT_APPLICABLE FOR MVP`. Chat surfaces expose text-only composition; attachment/image/file/audio
  mocks and fake filenames are absent. No storage, upload, attachment schema, scanner, object lifecycle or dependency exists.
- Verification: scoped absence scan, app/dashboard typechecks and `git diff --check` passed. Video/voice call controls are
  intentionally retained for the separately owned F10-T10 deferral task.
- Next eligible batch: `F10-B07 / F10-T07` only; no task is claimed by this completion.

## batch فعال — F10-B05

Coordinator/Thread: `Codex /root`
Started at: `2026-09-17 03:20 +03:30`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — accepted for isolated task commit`
Baseline: `51d8716 feat(F10-T04): add authenticated chat realtime gateway`

- Scope: participant-scoped monotonic receipt acknowledgement and safe post-commit chat outbox/notification handling.
- Owned paths: `apps/api/src/modules/communications/chat/{receipts,notifications}/**`, task-required chat service/gateway
  extensions, `apps/api/src/modules/outbox/**`, `apps/api/src/modules/assessments/notifications/**`,
  `apps/api/test/chat-receipts-notifications.integration.spec.ts`, and task evidence/status.
- Do not change: Prisma schema/migration, REST/OpenAPI/generated client ownership, Socket.IO dependency/lockfile,
  waiting-room/presence, app/dashboard UI, media, `.gitignore`, or Phase 12 plan.
- Result: receipts are authenticated, participant-scoped and monotonic; chat outbox records only opaque identifiers and
  is safely consumed without a text preview or a user-visible notification unsupported by the current category model.
- Verification: PostgreSQL Socket.IO receipt acknowledgement and outbox privacy integration suites passed; API typechecks
  and `git diff --check` passed. No task stage includes user-owned files.
- Next eligible batch: `F10-B06 / F10-T06` only; no task is claimed by this completion.

## batch فعال — F10-B04

Coordinator/Thread: `Codex /root`
Started at: `2026-09-17 03:00 +03:30`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — accepted for isolated task commit`
Baseline: `ffa06cf feat(F10-T03): add appointment chat REST API`

- Scope: pinned Socket.IO/Nest gateway dependency and lockfile, handshake-authenticated connection lifecycle,
  backend-authorized conversation join/reconnect/sync, token expiry and three-live-connection boundary, and targeted
  gateway tests only.
- Owned paths: `apps/api/package.json`, `pnpm-lock.yaml`, `apps/api/src/app.module.ts`,
  `apps/api/src/modules/communications/chat/realtime/**`, task-required extension points under
  `apps/api/src/modules/communications/chat/**`, `apps/api/test/chat-realtime.gateway.spec.ts`, and task status/evidence.
- Do not change: Prisma schema/migrations/seed, REST/OpenAPI/generated client surface, receipt/outbox runtime,
  waiting-room/presence runtime, app/dashboard UI, attachment/video runtime, `.gitignore`, or Phase 12 plan.
- Acceptance focus: auth payload only (never URL), no client-selected arbitrary room/publish, server-side rechecks on
  join/reconnect/sync, expiry close, bounded reconnect high-water recovery and at-least-once signal semantics.
- Result: Socket.IO remains an in-process signaling/connection layer only. REST remains the sole persist path; a
  committed message is emitted only after the PostgreSQL transaction returns successfully.
- Verification: pinned dependency advisory scan found no Socket.IO/Nest websocket finding; targeted unit plus live
  Socket.IO/PostgreSQL integration tests and API typecheck passed. Repository-wide audit findings are pre-existing,
  out-of-scope Next/Fastify/Prisma dependencies and are not masked by this task.
- Next eligible batch: `F10-B05 / F10-T05` only; no task is claimed by this completion.

## batch فعال — F10-B03

Coordinator/Thread: `Codex /root`
Started at: `2026-09-16 05:05 +03:30`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — accepted for isolated task commit`
Baseline: `62f2921 feat(F10-T02): persist chat consultation records`

- Scope: appointment-bound chat REST authorization, conversation/history/cursor/send/report/moderation/block endpoints,
  PostgreSQL-backed sequence/idempotency/rate checks, stable errors, OpenAPI and generated client slice, and targeted
  integration/authorization/moderation tests only.
- Owned paths: `apps/api/src/modules/communications/chat/**`, `apps/api/src/common/{auth,errors}/**` only where the frozen
  contract requires a common capability, `apps/api/src/app.module.ts`, `apps/api/test/{chat-rest.integration.spec.ts,
  chat-authorization.integration.spec.ts,chat-moderation.integration.spec.ts,openapi-contract.spec.ts}`, `packages/api-client/**`,
  and `plan/{STATUS.md,logs/phase-10.md,phases/10-CHAT-CONSULTATION.md}` plus `specs/008-adopt-phase-10/tasks.md`.
- Do not change: Prisma schema/migrations/seed, Socket.IO dependencies or lockfile, receipt/outbox runtime, waiting-room/
  presence runtime, app/dashboard UI, attachment/video runtime, `.gitignore`, or Phase 12 plan.
- Acceptance focus: server-side permission + clinic + appointment/conversation membership checks; no STAFF or unlinked-doctor
  access; REST-only committed send with stable idempotency/order/error behavior; moderation/block audit boundaries; generated
  OpenAPI/client consistency. No realtime, receipt, waiting-room, attachment, or video implementation is claimed.
- Result: REST-only, PostgreSQL-backed appointment chat authorization, history/cursor, idempotent ordered send, report,
  moderation and scoped-block APIs are accepted with stable errors and generated OpenAPI client coverage. Socket.IO,
  receipts/outbox, presence/waiting-room, UI and media remain unclaimed.
- Verification: targeted REST, authorization and moderation integration tests passed against PostgreSQL; OpenAPI contract,
  API/test/client TypeScript checks, export/generation and `git diff --check` passed. Coordinator review excluded
  user-owned `.gitignore` and Phase 12 changes.
- Next eligible batch: `F10-B04 / F10-T04` only; no task is claimed by this completion.

## batch فعال — F10-B02

Coordinator/Thread: `Codex /root`
Started at: `2026-09-16 03:45 +03:30`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — accepted for isolated task commit`
Baseline: `79e7979 docs(F10-T01): freeze chat consultation contract`

- Scope: additive PostgreSQL/Prisma persistence only for the frozen appointment-bound text-chat contract: conversation,
  participant, message/sequence/idempotency, receipt, report, block, moderation, retention/legal-hold and safe audit
  boundaries; migration replay/Phase 09 upgrade/seed idempotency/schema-drift evidence.
- Owned paths: `apps/api/prisma/{schema.prisma,migrations/20260916034500_phase_10_chat_persistence/migration.sql,seed.mjs}`,
  `apps/api/test/{chat-migrations.integration.spec.ts,migrations.integration.spec.ts}` only when Phase 10 migration
  coverage is necessary, and `plan/{STATUS.md,logs/phase-10.md,phases/10-CHAT-CONSULTATION.md}` plus
  `specs/008-adopt-phase-10/tasks.md` for accepted-task synchronization.
- Shared writer: `F10-T02` exclusively owns Prisma schema/migrations/seed. Do not add REST, authorization, OpenAPI,
  generated client, Socket.IO, outbox handler, waiting-room runtime, app/dashboard, attachment, or video work.
- Result: accepted persistence schema/migration stores only appointment-bound text-chat facts and preserves exclusive
  Prisma ownership. It adds no runtime REST, Socket.IO, attachment/video, Redis/Centrifugo, generated client or UI work.
- Verification: clean replay and Phase 09 upgrade/seed/invariant suite (4 tests) passed against disposable PostgreSQL;
  `prisma migrate deploy/status`, migrations-to-schema drift and database-to-schema drift all passed; development seed
  ran twice idempotently; Prisma validate/generate, API typecheck and `git diff --check` passed.
- Next eligible batch: `F10-B03 / F10-T03` only; no task is claimed by this completion.

## batch فعال — F09-CI01

Coordinator/Thread: `Codex /root`
Started at: `2026-09-15 20:40 +03:30`
Phase: `09-COMMERCE-PAYMENTS`
Status: `DONE — accepted for isolated remediation commit`
Baseline: `984579c docs(F09-CLOSE): close commerce payments phase`

- Scope: correct only the five Phase 09 `react-hooks/set-state-in-effect` errors exposed by the repository root
  `pnpm lint` PR gate, rerun the local CI-aligned verification, synchronize Phase 09 evidence/status, and prepare
  the existing branch for a pull request to `main`.
- Owned paths: `apps/dashboard/src/features/{discounts/discounts-page.tsx,orders/orders-page.tsx,revenue/revenue-page.tsx,settings/payment-provider-settings.tsx,store/store-page.tsx}` and
  `plan/{STATUS.md,logs/phase-09.md,phases/09-COMMERCE-PAYMENTS.md}`.
- Do not change: the two pre-existing patient-workspace lint warnings; `.gitignore` (user-owned); product
  contracts, migrations, generated artifacts, confidential Sadad material, provider activation, or Phase 10.
- Result: the five Phase 09 Dashboard effects now start their initial asynchronous reads directly and cancel
  stale completions on unmount; user-triggered refresh callbacks remain available. Root `pnpm lint` passes with
  zero errors (the two pre-existing patient-workspace warnings remain untouched). Dashboard tests `44/44`,
  Dashboard typecheck/build, root typecheck, the complete database-backed root test suite (API `72/72` files,
  `320/320` tests; app/dashboard/web `34/44/9`) and root production build all pass. `git diff --check` passes.
- PR note: the repository workflow currently exports `NODE_ENV=test` globally into its Next production-build
  step; local reproduction proves that non-production value can fail Next prerendering, while the same root build
  with `NODE_ENV=production` passes. This is a pre-existing CI configuration risk to confirm from the live PR;
  no workflow/config bypass was added to this Phase 09 remediation.

## closure review — F09-CLOSE

Coordinator/Thread: `Codex /root`
Started at: `2026-09-15 19:05 +03:30`
Phase: `09-COMMERCE-PAYMENTS`
Completed at: `2026-09-15 20:05 +03:30`
Status: `DONE (CLOSED)`
Baseline: `b5d3eda test(F09-T12): verify commerce payment phase`

- Scope: independent evidence/code/contract review and fresh Phase 09 verification only.
- Owned paths: `plan/{STATUS.md,logs/phase-09.md,phases/09-COMMERCE-PAYMENTS.md}` and
  `specs/007-adopt-phase-09/{spec.md,plan.md,tasks.md}` only when final synchronization is required.
- Do not change: product code, migrations, generated artifacts, tests, `.gitignore` (user-owned), confidential
  Sadad materials, provider activation/network transport, or Phase 10.
- Result: PASS — task/commit isolation for `F09-T01` through `F09-T12`, frozen contracts, source boundaries,
  migration/seed/drift, PostgreSQL commerce suites, full API suite (72 files/320 tests), OpenAPI/client,
  app/dashboard/web checks, Chrome localhost E2E and disposable-data cleanup all passed. One historical Spec Kit
  phrase incorrectly implied that `SADAD_GO_LIVE_BLOCKED` blocked closure; it was synchronized with the frozen
  contract/ADR/Phase 12 decision. No product finding or convergence task remains.
- Next eligible batch: `F10-B01 / F10-T01` only, `NOT_STARTED` and unclaimed.

## batch فعال — F09-B12

Coordinator/Thread: `Codex /root`
Started at: `2026-09-14 00:10 +03:30`
Phase: `09-COMMERCE-PAYMENTS`
Batch status: `DONE`
Contract baseline: F09-T01 FROZEN at `750d53f`; accepted T11 at `8aa5fc9`; `SADAD_GO_LIVE_BLOCKED`

- `F09-T12` — `DONE`
  Dependencies: `F09-T01` through `F09-T11` are `DONE`; no active batch existed when claimed.
  Scope: final migration/drift/OpenAPI/client/API/app/dashboard/PostgreSQL/browser verification; removal only of
  proven in-scope local commerce source-of-truth remnants; Phase 09 evidence, checklist and closure-review handoff.
  Owned paths: `apps/{api/test/**,api/scripts/**,app/src/**,dashboard/src/**,web/src/**}`, `packages/api-client/**`,
  root `package.json`, `pnpm-lock.yaml`, `playwright.config.ts`, `tests/e2e/phase-09/**`,
  `plan/{STATUS.md,logs/phase-09.md,phases/09-COMMERCE-PAYMENTS.md}`, and `specs/007-adopt-phase-09/**`.
  Do not change: accepted product architecture/contracts/migrations unless a demonstrated in-scope defect requires
  the smallest fix; `.gitignore` (user-owned); confidential Sadad samples/PDF/credentials; provider enable/default/
  network transport; or Phase 10.
  Review: `PASS` — final Chrome-channel multi-context E2E ran twice on localhost using real PostgreSQL and
  run-scoped disposable data. It proves secure context/native `crypto.randomUUID`, cart/order persistence,
  persisted PICKUP/Courier prices, fail-closed `503 SADAD_GO_LIVE_BLOCKED` with no PaymentAttempt/Payment/token/
  redirect/external request, patient isolation/404 direct access, ADMIN Dashboard cancellation, one reservation
  release/ledger effect, unchanged revenue, controlled console/page errors, and exact cleanup. Full API (72 files,
  320 tests), migration smoke (3/3), drift, Prisma, OpenAPI/client, app/dashboard/web tests/typechecks/builds and
  scope/secret/artifact review pass. No provider was enabled, defaulted or contacted; user-owned `.gitignore` and
  confidential Sadad material remain excluded. Evidence: [`logs/phase-09.md`](logs/phase-09.md).
  Next action: `independent Phase 09 closure review` only; do not start Phase 10.

## آخرین batch — F09-B11

Coordinator/Thread: `Codex /root`
Started at: `2026-09-13 21:15 +03:30`
Phase: `09-COMMERCE-PAYMENTS`
Batch status: `DONE`
Contract baseline: F09-T01 FROZEN at `750d53f`; accepted commerce experience at `6298181`

- `F09-T11` — `DONE`
  Dependencies: `F09-T01` through `F09-T10` are `DONE`; no active batch existed when claimed.
  Scope: clinic-scoped direct PostgreSQL revenue read model from authoritative Payment and completed Refund only;
  ADMIN API/OpenAPI-client/dashboard revenue surface, task-owned integrations and documentation/evidence.
  Owned paths: `apps/api/src/modules/commerce/reporting/**`, `apps/api/src/modules/commerce/catalog/admin-commerce-catalog.module.ts`,
  `apps/api/test/commerce-revenue.integration.spec.ts`, `apps/dashboard/src/{features/revenue/**,app/(app)/revenue/**,lib/commerce-revenue-api.ts,lib/commerce-revenue-api.spec.ts,features/dashboard/dashboard-page.tsx,data/revenue.ts}`,
  `packages/api-client/**`, `plan/{STATUS.md,logs/phase-09.md,phases/09-COMMERCE-PAYMENTS.md}`, and
  `specs/007-adopt-phase-09/**`.
  Do not change: existing Payment/Refund data or their T08/T09 mutation boundaries; `.gitignore` (user-owned);
  confidential Sadad paths/credentials; provider activation/network; patient payment experience; or F09-T12 work.
  Review: PASS — the bounded direct query reads only `Payment.commerceAmountToman` with a verified Payment
  aggregate and `Refund.amountToman` at `COMPLETED`; payment provider amount/unit, callbacks, attempts, unpaid
  orders and catalog values are not revenue sources. Clinic-local Tehran boundaries, ISO-week/month buckets,
  ADMIN-only access, inactive-clinic isolation, safe integer serialization and real `/revenue` loading/empty/
  error/forbidden/retry states are covered. No migration, provider activation or network transport was added.
  Evidence: [`logs/phase-09.md`](logs/phase-09.md).
  Next eligible batch: `F09-B12 / F09-T12` — eligible and unclaimed; do not start it in this task.

## آخرین batch — F09-B10

Coordinator/Thread: `Codex /root`
Started at: `2026-09-13 20:45 +03:30`
Phase: `09-COMMERCE-PAYMENTS`
Batch status: `DONE`
Contract baseline: F09-T01 FROZEN at `750d53f`; T09 at `cdf23cc`; `SADAD_GO_LIVE_BLOCKED`

- `F09-T10` — `DONE`
  Dependencies: `F09-T01` through `F09-T09` are `DONE`; no active batch existed when claimed.
  Scope: patient-scoped payment initiation/status/result/receipt/tracking with no client-authoritative callback;
  real dashboard order operations and source-backed operational widgets; minimal safe read DTO/API only if
  existing endpoints cannot support that UI; task-owned client/tests/docs.
  Owned paths: `apps/{api/src/modules/commerce/{payments/**,checkout/**,orders/**,catalog/admin-commerce-catalog.module.ts},app/src/{app/(app)/store/{payment/**,order-success/**,order-tracking/**,orders/**,checkout/**},lib/commerce-catalog-api.ts,lib/commerce-catalog-api.spec.ts},dashboard/src/{features/{orders/**,dashboard/**},app/(app)/{orders/**,dashboard/**},lib/commerce-orders-api.ts,data/store.ts}}`, `packages/api-client/**`, `apps/api/test/{commerce-payment-experience.integration.spec.ts,openapi-contract.spec.ts}`, `plan/{STATUS.md,logs/phase-09.md,phases/09-COMMERCE-PAYMENTS.md}`, and `specs/007-adopt-phase-09/**`.
  Do not change: accepted migrations unless a minimal additive read-model migration is unavoidable; user-owned
  `.gitignore`; confidential Sadad paths/credentials; provider enable/default/network transport; revenue/reporting
  (F09-T11), Phase-wide cleanup (F09-T12), or unrelated app/dashboard mock surfaces.
  Review: PASS — checkout now hands its persisted order to payment; the patient page uses a stable idempotency
  key and shows `SADAD_GO_LIVE_BLOCKED` without a fake attempt, token, redirect or success. Result, receipt and
  tracking re-read owner-scoped API data; receipt is unavailable without an authoritative Payment and exposes no
  provider token, credentials or raw callback data. The API exposes a minimal redacted tracking/refund read model.
  Dashboard operations call existing authorized lifecycle endpoints, and Home renders source-backed operational
  counts only (no revenue). Evidence: [`logs/phase-09.md`](logs/phase-09.md).
  Next eligible batch: `F09-B11 / F09-T11` — eligible and unclaimed; do not start it in this task.

## batch فعال — F09-B09

Coordinator/Thread: `Codex /root`
Started at: `2026-09-12 03:34 +03:30`
Phase: `09-COMMERCE-PAYMENTS`
Batch status: `DONE`
Contract baseline: F09-T01 FROZEN at `750d53f`; provider-neutral payment foundation at `4b23bb1`; `SADAD_GO_LIVE_BLOCKED`

- `F09-T09` — `DONE`
  Dependencies: `F09-T01` through `F09-T08` are `DONE`; the active-batch check was clear before this claim.
  Scope: transactional ADMIN fulfillment and manual tracking; owner/ADMIN-only pre-payment cancellation with
  exactly-once reservation release; ADMIN cancellation/return requests and manually evidenced TOMAN refunds;
  safe reconciliation of ambiguous attempts through the existing verification boundary; the corresponding
  ADMIN API, real dashboard `/orders`, OpenAPI/generated client, PostgreSQL integration tests, and task
  documentation/evidence.
  Owned paths: `apps/api/{prisma/{schema.prisma,migrations/20260912034000_phase_09_order_operations/**},src/{common/errors/api-error.ts,modules/commerce/{catalog/admin-commerce-catalog.module.ts,checkout/**,discounts/**,inventory/**,orders/**,payments/payment-verification.service.ts}},test/{commerce-order-operations.integration.spec.ts,commerce-checkout.integration.spec.ts,openapi-contract.spec.ts,migrations.integration.spec.ts}}`, `apps/dashboard/src/{app/(app)/orders/**,features/orders/**,lib/commerce-orders-api.ts,lib/commerce-orders-api.spec.ts}`, `packages/api-client/{openapi.json,src/schema.generated.ts,src/index.ts,test/api-client.spec.ts}`, `plan/{STATUS.md,logs/phase-09.md,phases/09-COMMERCE-PAYMENTS.md,contracts/commerce-payment-provider-v1.md}`, and `specs/007-adopt-phase-09/{spec.md,data-model.md,tasks.md}`.
  Shared/exclusive resource: order/payment/refund/inventory/discount transaction boundary, additive Prisma
  migration, commerce module wiring, API error contract, OpenAPI/client generation and PostgreSQL lifecycle tests.
  Do not change: accepted migrations; the accepted Sadad adapter/callback/Verify flow except an unavoidable
  reconciliation boundary change; `.gitignore` (user-owned); Sadad sample/PDF/credential paths; provider
  activation/defaulting or network calls; revenue (F09-T11), patient receipt/result/tracking UI (F09-T10), or
  any later task.
  Required verification: PostgreSQL lifecycle, authorization/clinic isolation, idempotency/audit, exactly-once
  cancellation release, concurrent over-refund prevention, manual-evidence enforcement, no synthetic
  provider-refund, reconciliation concurrency/exactly-once payment effect, HTTPS tracking URL validation,
  migration/drift, OpenAPI/client/API/dashboard checks and production dashboard build.
  Review: PASS — the additive order-operations persistence preserves immutable commercial snapshots and only
  exposes ADMIN operations (apart from owner-scoped pending-payment cancellation). Fulfillment reads immutable
  shipping method; manual tracking accepts HTTPS only; refunds are TOMAN-only, manual/evidenced and bounded by
  a locked Payment; reconciliation is conditional and enters the accepted verification boundary exactly once.
  PostgreSQL replay/upgrade/seed, migration status, API/client/dashboard checks and production dashboard build
  passed. User-owned `.gitignore` remains outside the task commit. Evidence: [`logs/phase-09.md`](logs/phase-09.md).
  Next eligible batch: `F09-B10 / F09-T10` — eligible and unclaimed; do not start it in this task.

## آخرین batch — F09-B08

Coordinator/Thread: `Codex /root`
Started at: `2026-09-11 19:25 +03:30`; completed at: `2026-09-12 03:21 +03:30`
Phase: `09-COMMERCE-PAYMENTS`
Batch status: `DONE`
Contract baseline: F09-T01 FROZEN at `750d53f`; F09-T07 at `8f50018`; `SADAD_GO_LIVE_BLOCKED`

- `F09-T08` — `DONE`
  Dependencies: `F09-T01/T02/T06/T07 DONE`; no active batch existed when claimed.
  Scope: provider-neutral port/registry/capabilities; fake test-only provider; disabled Sadad protocol adapter;
  encrypted credential/config revisions and ADMIN management; patient attempt/status and safe callback/verify
  orchestration; dashboard settings and generated OpenAPI/client slice.
  Owned paths: `apps/api/src/modules/commerce/{payments/**,catalog/admin-commerce-catalog.module.ts,inventory/**}`, `apps/api/src/common/errors/api-error.ts`, `apps/api/test/{payment-provider-contract.spec.ts,sadad-adapter.spec.ts,payment-idempotency.integration.spec.ts,payment-provider-config.integration.spec.ts,openapi-contract.spec.ts,commerce-checkout.integration.spec.ts,inventory-reservation-expiry.integration.spec.ts}`, `apps/dashboard/src/{features/settings/settings-page.tsx,lib/commerce-payment-provider-api.ts}`, `packages/api-client/{openapi.json,src/schema.generated.ts,src/index.ts,test/api-client.spec.ts}`, `plan/{STATUS.md,logs/phase-09.md,phases/{09-COMMERCE-PAYMENTS.md,12-PRODUCTION-HARDENING.md},contracts/{commerce-payment-provider-v1.md,sadad-ipg-v1.md},decisions/ADR-0009-multi-provider-payment-architecture.md}`, `specs/007-adopt-phase-09/{spec.md,data-model.md,tasks.md}`.
  Shared/exclusive resource: payment/config/credential transaction boundary, commerce module wiring, inventory
  consumption boundary, OpenAPI/client generation and PostgreSQL payment tests.
  Do not change: accepted migrations/schema, user-owned `.gitignore`, confidential Sadad sample/PDF/credentials,
  fulfillment/refund/reconciliation operations, app/dashboard receipt flows, F09-T09 or later tasks.
  Required verification: provider contract/capability/registry/crypto/redaction/rotation/auth/clinic/default and
  attempt concurrency/idempotency; callback/Verify 0/100/mismatch/timeout/retry; no network while
  UNCONFIRMED; real PostgreSQL regression, OpenAPI/client/dashboard, typecheck/test/build/diff/scope review.
  Review: PASS — provider-neutral registry/configuration/credential lifecycle, dormant RIAL adapter and SignData,
  Form Data allowlist, injected transport orchestration and all financial idempotency paths meet T08 criteria.
  PostgreSQL, migration, generated client and dashboard gates passed. Owner approval moves merchant acceptance,
  deployment and production sign-off to Phase 12 without allowing Sadad activation in Phase 09. User-owned
  `.gitignore` and confidential material remain outside the task commit. Evidence: [`logs/phase-09.md`](logs/phase-09.md).
  Next eligible batch: `F09-B09 / F09-T09` — eligible and unclaimed; do not start it in this task.

## آخرین batch — F09-B07

Coordinator/Thread: `Codex /root`
Started at: `2026-09-11 15:10 +03:30`
Phase: `09-COMMERCE-PAYMENTS`
Completed at: `2026-09-11 19:16 +03:30`
Batch status: `DONE`
Contract baseline: F09-T01 FROZEN at `750d53f`; checkout/inventory at `dd3d108`; owner-confirmed discount policy dated `2026-09-11`

- `F09-T07` — `DONE`
  Dependencies: `F09-T05 DONE` at `3e20784`; `F09-T06 DONE` at `dd3d108`; no active batch existed when claimed.
  Scope: additive discount-reservation persistence; one-code server-authoritative checkout pricing and immutable
  snapshot; transactional global/per-patient limits; internal release/consume/expiry coordination; ADMIN-only
  audited discount API; real dashboard `/discounts`; this endpoint slice's OpenAPI/generated client and tests.
  Owned paths: `apps/api/{prisma/{schema.prisma,migrations/20260911152000_phase_09_discount_reservations/**},src/{common/errors/api-error.ts,modules/commerce/{catalog/admin-commerce-catalog.module.ts,checkout/**,discounts/**,inventory/**}},test/{commerce-discount.integration.spec.ts,discount-usage-concurrency.integration.spec.ts,commerce-checkout.integration.spec.ts,inventory-reservation-expiry.integration.spec.ts,migrations.integration.spec.ts,openapi-contract.spec.ts}}`, `apps/dashboard/{src/{app/(app)/discounts/**,features/discounts/**,lib/commerce-discount-api.ts,lib/commerce-discount-api.spec.ts}}`, `packages/api-client/{openapi.json,src/schema.generated.ts,src/index.ts,test/api-client.spec.ts,README.md}`, `plan/{STATUS.md,logs/phase-09.md,phases/09-COMMERCE-PAYMENTS.md,contracts/commerce-payment-provider-v1.md}`, `specs/007-adopt-phase-09/{spec.md,data-model.md,tasks.md}`.
  Shared/exclusive resource: Prisma/schema migration, checkout-discount transaction boundary, commerce module wiring,
  API error contract, OpenAPI/client generation, dashboard discounts source of truth and PostgreSQL test databases.
  Do not change: accepted migrations; user-owned `.gitignore`; Sadad sample/PDF/credentials; provider/callback/Verify;
  fulfillment/public cancellation/refund; unrelated app behavior; F09-T08 or later work.
  Review: PASS — PostgreSQL empty replay/Phase-08 upgrade and idempotent seed; SQL constraints for code/amount/order
  uniqueness; atomic server-priced checkout plus discount snapshot/reservation and canonical idempotency; API ADMIN
  authorization/audit; OpenAPI/client freshness; API/dashboard typechecks and dashboard build. `git diff --check`
  and scope/secret/Sadad review passed. Evidence: [`logs/phase-09.md`](logs/phase-09.md).
  Next eligible batch: `F09-B08 / F09-T08` — do not claim or start in this task.

## آخرین batch — F09-B06

Coordinator/Thread: `Codex /root`
Started at: `2026-09-11 14:40 +03:30`
Phase: `09-COMMERCE-PAYMENTS`
Completed at: `2026-09-11 15:02 +03:30`
Batch status: `DONE`
Contract baseline: F09-T01 FROZEN at `750d53f`; checkout snapshots at `3e20784`; owner-confirmed inventory/reservation semantics dated `2026-09-11`

- `F09-T06` — `DONE`
  Dependencies: `F09-T05 DONE` at `3e20784`; no active batch existed when claimed.
  Scope: atomic checkout reservation, deterministic/global inventory ledger entries, internal idempotent
  reserve/release/consume operations, a bounded concurrency-safe expiry worker with injected clock and
  configurable 20-minute default TTL, system cancellation only after safe expiry conditions, and routing the
  existing ADMIN inventory adjustment through the ledger.
  Owned paths: `apps/api/{src/modules/commerce/{catalog/admin-commerce-catalog.service.ts,checkout/commerce-checkout.service.ts,inventory/**},src/common/errors/api-error.ts,test/{commerce-checkout.integration.spec.ts,inventory-concurrency.integration.spec.ts,inventory-reservation-expiry.integration.spec.ts,admin-commerce-catalog.integration.spec.ts,migrations.integration.spec.ts},prisma/{schema.prisma,migrations/20260911150000_phase_09_inventory_reservations/**}}`, `plan/{STATUS.md,logs/phase-09.md,phases/09-COMMERCE-PAYMENTS.md,contracts/commerce-payment-provider-v1.md}`, `specs/007-adopt-phase-09/{spec.md,data-model.md,tasks.md}`.
  Shared/exclusive resource: commerce checkout/inventory transaction boundary, Prisma schema/migration if required, API error contract, test PostgreSQL databases and catalog inventory mutation.
  Do not change: accepted migrations through F09-T05; `.gitignore` (user-owned); Sadad sample/PDF/credentials;
  discount eligibility; provider/Sadad/callback/Verify; public cancellation/fulfillment/refund; app/dashboard/
  OpenAPI/generated client absent an unavoidable accepted inventory-contract change; and F09-T07 or later work.
  Required verification: PostgreSQL checkout contention/rollback/idempotency, reserve/release/consume ledger
  consistency, expiry/recovery/retry and expiry-consume race with injected clock, ADMIN lower-than-reserved
  rejection, previous checkout/outbox regressions, migration/drift/diff and scoped review.
  Review gate: `PASS` — checkout uses atomic conditional reservation and full rollback; ledger mutations are
  global-idempotent; expiry is bounded, clock-driven and reconciliation-safe; consume remains internal for future
  Verify. PostgreSQL tests cover contention, rollback, replay and race behavior. No accepted migration was changed,
  and no provider/Sadad/outbox/UI/OpenAPI work or user-owned `.gitignore` is included.
  Evidence: [`logs/phase-09.md`](logs/phase-09.md).
  Next eligible batch: `F09-B07 / F09-T07` — do not claim or start in this task.

## آخرین batch — F09-B05

Coordinator/Thread: `Codex /root`
Started at: `2026-09-11 14:00 +03:30`
Completed at: `2026-09-11 14:32 +03:30`
Phase: `09-COMMERCE-PAYMENTS`
Batch status: `DONE`
Contract baseline: F09-T01 FROZEN at `750d53f`; commerce persistence at `fa1aec4`; patient catalog/cart at `8a96539`; owner-confirmed courier-rate policy dated `2026-09-11`

- `F09-T05` — `DONE`
  Dependencies: `F09-T04 DONE` at `8a96539`; no active batch existed when claimed.
  Scope: a new additive PostgreSQL migration for clinic-scoped courier rates and the non-sensitive initial seed; ADMIN rate API/dashboard with authorization/audit; patient address management and selection; server-priced idempotent checkout; immutable order/line/address/shipping/commercial snapshots; patient checkout/order surfaces; and the task-owned OpenAPI/generated-client slice.
  Owned paths: `apps/api/{prisma/schema.prisma,prisma/seed.mjs,prisma/migrations/20260911140000_phase_09_commerce_shipping_rates/migration.sql,src/common/errors/api-error.ts,src/modules/commerce/{catalog/admin-commerce-catalog.module.ts,shipping/**,checkout/**,orders/**},test/{admin-commerce-shipping-rate.integration.spec.ts,commerce-checkout.integration.spec.ts,openapi-contract.spec.ts,migrations.integration.spec.ts}}`, `apps/dashboard/{src/lib/commerce-catalog-api.ts,src/lib/commerce-catalog-api.spec.ts,src/features/store/store-page.tsx}`, `apps/app/{src/app/(app)/store/{checkout/**,orders/**},src/lib/commerce-catalog-api.ts,src/lib/commerce-catalog-api.spec.ts}`, `packages/api-client/{openapi.json,src/schema.generated.ts,src/index.ts,test/api-client.spec.ts,README.md}`, `plan/{STATUS.md,logs/phase-09.md,phases/09-COMMERCE-PAYMENTS.md,contracts/commerce-payment-provider-v1.md,decisions/ADR-0009-multi-provider-payment-architecture.md}`, `specs/007-adopt-phase-09/{spec.md,data-model.md,tasks.md}`.
  Shared/exclusive resource: Prisma schema/migration/seed, commerce module wiring, checkout/order route family, and this task's OpenAPI/generated-client slice.
  Do not change: accepted F09-T02 migration; `.gitignore` (user-owned); Sadad sample/PDF/credentials; payment/provider/Sadad behavior; discount eligibility; reservation/ledger/expiry/stock mutation; fulfillment/refund; and F09-T06 or later implementation.
  Required verification: PostgreSQL clean replay and baseline upgrade with the additive migration, seed idempotency and rate constraints; authorization/audit/address ownership/idempotency/immutable-snapshot integration; OpenAPI/client freshness; API/app/dashboard/client tests/builds; drift/diff/review and user-change/confidential-path preservation.
  Review gate: `PASS` — only claimed checkout/shipping/migration/API/app/dashboard/generated-client/planning paths are included. The new additive migration preserves F09-T02; `PICKUP` is server-priced at zero, `COURIER` is fail-closed with no active clinic rate, and no provider/Sadad path is activated. User-owned `.gitignore` and confidential sample/PDF paths remain unstaged.
  Evidence: [`logs/phase-09.md`](logs/phase-09.md).
  Next eligible batch: `F09-B06 / F09-T06` — do not claim or start in this task.

## آخرین batch — F09-B04

Coordinator/Thread: `Codex /root`
Started at: `2026-09-10 20:52:27 +03:30`
Completed at: `2026-09-10 21:17 +03:30`
Phase: `09-COMMERCE-PAYMENTS`
Batch status: `DONE`
Contract baseline: F09-T01 FROZEN at `750d53f`; payment persistence at `fa1aec4`; dashboard catalog at `858246d`

- `F09-T04` — `DONE`
  Dependencies: `F09-T03` DONE at `858246d`; no active batch existed when claimed.
  Scope: authenticated patient catalog browse/search/detail plus persisted, patient-scoped wishlist and cart.
  Owned paths: `apps/api/src/modules/commerce/catalog/**`, `apps/api/src/modules/commerce/cart/**`, `apps/api/test/patient-commerce-catalog.integration.spec.ts`, `apps/api/test/patient-cart.authorization.spec.ts`, `apps/api/test/openapi-contract.spec.ts`, `apps/app/src/app/(app)/{page.tsx,store/**}`, `apps/app/src/stores/cart.ts`, `apps/app/src/stores/wishlist.ts`, `apps/app/src/lib/data/catalog.ts`, `apps/app/src/lib/commerce-catalog-api.ts`, `apps/app/src/lib/commerce-catalog-api.spec.ts`, `packages/api-client/{openapi.json,src/schema.generated.ts,src/index.ts,test/api-client.spec.ts,README.md}`, `plan/{STATUS.md,logs/phase-09.md,phases/09-COMMERCE-PAYMENTS.md}`, `specs/007-adopt-phase-09/**`.
  Contract: preserve integer TOMAN, active product plus active SKU visibility, patient isolation, and no stock reservation on cart mutation. Do not implement checkout, address/shipping, order, discount, payment, provider, or Sadad behavior.
  Verification: real-PostgreSQL catalog/cart/wishlist integration and isolation tests; API/app/client checks;
  OpenAPI/client freshness; production app build; migration-ledger drift check; diff review; preservation of
  unrelated and confidential Sadad paths — PASS.
  Review gate: `PASS` — only claimed API/app/client/generated/status/evidence/spec paths are included. Integer
  TOMAN remains string-serialized at the boundary; cart mutations do not reserve stock or write the ledger;
  no checkout/order/discount/payment/Sadad behavior, schema/migration, credential, sample/PDF or user-owned
  `.gitignore` change is included.
  Next eligible batch: `F09-B05 / F09-T05` — do not claim or start in this task.

## آخرین batch — F09-B03

Coordinator/Thread: `Codex /root`
Started at: `2026-09-10 06:35 +03:30`
Completed at: `2026-09-10 20:05 +03:30`
Phase: `Phase 09 — Commerce, Inventory & Payments`
Batch status: `DONE`
Contract baseline: accepted `F09-T01` at `750d53f`; persistence baseline `F09-T02` at `fa1aec4`

Tasks:

- Task ID: `F09-T03`
  Agent/Thread: `Codex /root`
  Status: `DONE`
  Depends on: `F09-T02 DONE` — verified at `fa1aec4`
  Scope: ADMIN-only catalog/category/product/SKU/price/inventory API and audit, response DTOs/stable errors/pagination, dashboard `/store` and `/store-builder` real data states, and this endpoint slice's OpenAPI/generated client.
  Owned paths: `apps/api/{src/modules/commerce/**,src/app.module.ts,src/common/auth/authorization.policy.ts,src/common/errors/api-error.ts,test/admin-commerce-catalog.integration.spec.ts,test/openapi-contract.spec.ts}`, `apps/dashboard/{src/features/store/**,src/features/store-builder/**,src/data/store.ts,src/lib/commerce-catalog-api.ts,src/lib/commerce-catalog-api.spec.ts,src/app/(app)/store/**,src/app/(app)/store-builder/**}`, `packages/api-client/{openapi.json,src/schema.generated.ts,src/index.ts,test/api-client.spec.ts,README.md}`, `plan/{STATUS.md,logs/phase-09.md,phases/09-COMMERCE-PAYMENTS.md}`, `specs/007-adopt-phase-09/**`
  Shared/exclusive resource: commerce module wiring, task-owned OpenAPI export/generated API-client slice and dashboard commerce source of truth
  Do not change: `.gitignore` (user-owned), `apps/app/**`, Prisma schema/migrations/seed, payment/discount/order/refund/revenue/reservation/ledger behavior, non-commerce dashboard surfaces, Sadad adapter/configuration/network, or confidential Sadad PDF/.NET sample.
  Verification: PostgreSQL API integration for authorization/audit/validation/lifecycle/constraints/pagination,
  dashboard API-client loading/error/empty/retry and mutation coverage, OpenAPI runtime/checked-in freshness,
  API/dashboard/client typecheck/test/build, scope review and `git diff --check` — PASS.
  Review gate: `PASS` — only task-owned API/dashboard/client/generated/status/evidence/spec paths are included;
  no Prisma migration, app/cart/checkout/order/discount/reservation/provider/Sadad behavior, credential, sample
  or PDF path is included. The user-owned `.gitignore` remains unstaged.
  Next eligible batch: `F09-B04 / F09-T04` — do not claim or start in this task.

## آخرین batch — F09-B02

Coordinator/Thread: `Codex /root`
Started at: `2026-09-10 04:50 +03:30`
Phase: `Phase 09 — Commerce, Inventory & Payments`
Completed at: `2026-09-10 06:20 +03:30`
Batch status: `DONE`
Contract baseline: accepted `F09-T01` commit `750d53f`; Phase 08 final schema and migration ledger

Tasks:

- Task ID: `F09-T02`
  Agent/Thread: `Codex /root`
  Status: `DONE`
  Depends on: `F09-T01 DONE` — verified at `750d53f`
  Scope: persist the frozen commerce/catalog/SKU/inventory/cart/wishlist/address/discount/order/payment-provider/payment/refund foundation, one coherent Phase 09 migration, non-sensitive idempotent seed and PostgreSQL-backed migration/constraint coverage only.
  Owned paths: `apps/api/{prisma/schema.prisma,prisma/seed.mjs,prisma/migrations/20260910050000_phase_09_commerce_foundation/migration.sql,test/migrations.integration.spec.ts}`, `plan/{STATUS.md,logs/phase-09.md,phases/09-COMMERCE-PAYMENTS.md}`, `specs/007-adopt-phase-09/**`
  Shared/exclusive resource: Prisma schema, Phase 09 migration ledger, seed and local PostgreSQL migration-test databases
  Do not change: `apps/api/src/**`, `apps/{app,dashboard}/**`, `packages/**`, OpenAPI/generated client, prior migrations, payment-provider implementation, credentials, network configuration, or the confidential Sadad PDF/.NET sample directory.
  Verification: Prisma validate/generate, TypeScript migration-test compile, manual SQL/constraint review, credential/plaintext and TOMAN×10 scan, `git diff --check`, a real PostgreSQL empty replay with seed twice, Phase 08→09 upgrade and a shadow-database migration/schema drift check all passed.
  Review gate: `PASS` — only owned paths changed; no credential, provider call, Sadad sample/PDF path, API/UI or generated output is included.
  Next eligible batch: `F09-B03 / F09-T03` — do not claim or start in this task.

## آخرین batch — F09-B01

Coordinator/Thread: `Codex /root`
Started at: `2026-09-10 04:25 +03:30`
Completed at: `2026-09-10 04:36 +03:30`
Phase: `Phase 09 — Commerce, Inventory & Payments`
Batch status: `DONE`
Contract baseline: owner decisions supplied for `F09-T01`; Sadad production enablement remains fail-closed

Tasks:

- Task ID: `F09-T01`
  Agent/Thread: `Codex /root`
  Status: `DONE`
  Depends on: owner policy decisions — `DONE`
  Scope: freeze the catalog/SKU/price/tax/shipping/order/payment/refund and provider-neutral/Sadad-first contract; move unresolved Sadad acceptance facts to the explicit go-live gate; synchronize Phase 09 planning/specification documents and record task evidence only.
  Owned paths: `plan/{STATUS.md,phases/09-COMMERCE-PAYMENTS.md,contracts/commerce-payment-provider-v1.md,contracts/sadad-ipg-v1.md,decisions/ADR-0009-multi-provider-payment-architecture.md,logs/phase-09.md}`, `specs/007-adopt-phase-09/**`
  Shared/exclusive resource: Phase 09 contract baseline and lifecycle/error/authorization/endpoint/money/capability matrices
  Do not change: `apps/**`, `packages/**`, Prisma schema/migrations, OpenAPI/generated client, the confidential Sadad PDF/.NET sample directory, credentials, or callback payloads.
  Result: accepted; cross-document policy traceability, frozen-matrix completeness, no-secret/no-sample diff review, `git diff --check`, and Spec Kit/constitution review passed. Evidence: [`logs/phase-09.md`](logs/phase-09.md).

## آخرین batch — F08-MR

Coordinator/Thread: `Codex /root`
Started at: `2026-09-05 12:55 +03:30`
Completed at: `2026-09-05 13:15 +03:30`
Phase: `Phase 08 — Follow-up, Health Tracking, Notifications & Content`
Batch status: `DONE`
Contract baseline: final committed Phase 07 schema to final committed Phase 08 schema; branch-local unreleased migration history only

Tasks:

- Task ID: `F08-MR`
  Agent/Thread: `Codex /root`
  Status: `DONE`
  Depends on: `F08-T01 through F08-T11 DONE`
  Scope: replace only the unreleased Phase 08 migration sequence with a coherent final-schema baseline; reconstruct a separate local candidate database from data-only source records; validate clean replay, ledger, constraints, Phase 08 regressions, and full integration.
  Owned paths: `apps/api/prisma/migrations/20260905*phase_08*/**`, `plan/{STATUS.md,logs/phase-08.md,phases/08-FOLLOWUP-CONTENT.md}`, `specs/006-adopt-phase-08/**`
  Shared/exclusive resource: local PostgreSQL candidate/shadow databases and Phase 08 migration ledger
  Do not change: `Phase 07` or earlier migrations, existing rehearsal database/checksums, Phase 09 paths, application runtime/schema behavior, or production/shared environments.
  Result: one generated Phase 07→final-Phase-08 migration replaces the five unreleased branch-local migrations. Fresh replay, idempotent seed, schema diff, preserved-data fingerprints, full API suite, generated contract, app/dashboard, and whitespace gates passed; evidence: [`logs/phase-08.md`](logs/phase-08.md).

## آخرین batch — F08-B10R

Coordinator/Thread: `Codex /root`
Started at: `2026-09-05 12:10 +03:30`
Completed at: `2026-09-05 12:20 +03:30`
Phase: `Phase 08 — Follow-up, Health Tracking, Notifications & Content`
Batch status: `DONE`
Contract baseline: accepted F08-T06/F08-T07 outbox and reminder behavior; closure finding in `plan/logs/phase-08.md`

Tasks:

- Task ID: `F08-T10`
  Agent/Thread: `Codex /root`
  Status: `DONE`
  Depends on: `F08-T01 through F08-T09 DONE`
  Scope: stale `PROCESSING` outbox-claim recovery, restart/idempotency regression, and deterministic affected Phase 08 verification fixtures only
  Owned paths: `apps/api/src/modules/outbox/**`, `apps/api/test/{outbox,reminders,mezaj-results,patient-appointments}.integration.spec.ts`, `plan/{STATUS.md,logs/phase-08.md,phases/08-FOLLOWUP-CONTENT.md}`, `specs/006-adopt-phase-08/**`
  Shared/exclusive resource: outbox claim lifecycle and local PostgreSQL rehearsal database
  Expected verification: stale-claim restart delivery without duplicate notification, existing reminder/preference coverage, deterministic Mezaj/Tehran suites, API typecheck, and diff validation

## آخرین batch — F08-B11

Coordinator/Thread: `Codex /root`
Started at: `2026-09-05 11:40 +03:30`
Completed at: `2026-09-05 11:50 +03:30`
Phase: `Phase 08 — Follow-up, Health Tracking, Notifications & Content`
Batch status: `DONE`
Contract baseline: accepted F08-T01 through F08-T10 contracts and verification

Tasks:

- Task ID: `F08-T11`
  Agent/Thread: `Codex /root`
  Status: `DONE`
  Depends on: `F08-T01 through F08-T10 DONE`
  Scope: in-scope Phase 08 mock/local-state fallback removal, final Milestone C review, evidence, and Spec Kit consistency/convergence only
  Owned paths: `apps/{app,dashboard}/src/**` only for demonstrated Phase 08 mock removal, `plan/{STATUS.md,logs/phase-08.md,phases/08-FOLLOWUP-CONTENT.md}`, `specs/006-adopt-phase-08/**`
  Shared/exclusive resource: Phase 08 final evidence and status synchronization
  Expected verification: in-scope mock review, targeted frontend checks, contract/freshness review, and Spec Kit consistency/convergence

## آخرین batch — F08-B10

Coordinator/Thread: `Codex /root`
Started at: `2026-09-05 11:30 +03:30`
Completed at: `2026-09-05 11:35 +03:30`
Phase: `Phase 08 — Follow-up, Health Tracking, Notifications & Content`
Batch status: `REWORK`
Contract baseline: accepted F08-T01 through F08-T09 API and UI slices

Tasks:

- Task ID: `F08-T10`
  Agent/Thread: `Codex /root`
  Status: `REWORK`
  Depends on: `F08-T01 through F08-T09 DONE`
  Scope: integrated restart/retry/idempotency, timezone, and browser E2E verification only; minimal in-scope repair only if a demonstrated defect requires it
  Owned paths: `apps/{api,app,dashboard}/test/**`, existing Phase 08 test paths, `plan/{STATUS.md,logs/phase-08.md,phases/08-FOLLOWUP-CONTENT.md}`, `specs/006-adopt-phase-08/**`
  Shared/exclusive resource: local PostgreSQL rehearsal database and browser validation
  Expected verification: focused restart/retry/idempotency/timezone APIs and local browser journey

## آخرین batch — F08-B09

Coordinator/Thread: `Codex /root`
Started at: `2026-09-05 11:20 +03:30`
Completed at: `2026-09-05 11:25 +03:30`
Phase: `Phase 08 — Follow-up, Health Tracking, Notifications & Content`
Batch status: `DONE`
Contract baseline: F08-T02/T04/T05 APIs and generated client

Tasks:

- Task ID: `F08-T09`
  Agent/Thread: `Codex /root`
  Status: `DONE`
  Depends on: `F08-T02, F08-T04, F08-T05, F08-T08 DONE`
  Scope: dashboard health, notification, and published-content connection
  Owned paths: `apps/dashboard/**`, `apps/api/src/modules/assessments/notifications/**`, `apps/api/test/notifications.integration.spec.ts`, `packages/api-client/**`, `plan/{STATUS.md,logs/phase-08.md,phases/08-FOLLOWUP-CONTENT.md}`, `specs/006-adopt-phase-08/**`
  Shared/exclusive resource: dashboard Phase 08 API adapters, notification read contract, and generated client
  Expected verification: dashboard typecheck, notification authorization integration, generated-client build, and targeted dashboard connection checks

## آخرین batch — F08-B08

Coordinator/Thread: `Codex /root`
Started at: `2026-09-05 11:00 +03:30`
Completed at: `2026-09-05 11:15 +03:30`
Phase: `Phase 08 — Follow-up, Health Tracking, Notifications & Content`
Batch status: `DONE`
Contract baseline: F08-T02/T03/T04/T05 APIs and generated client

Tasks:

- Task ID: `F08-T08`
  Agent/Thread: `Codex /root`
  Status: `DONE`
  Depends on: `F08-T02, F08-T03, F08-T04, F08-T05 DONE`
  Scope: patient-app tracker, notification, mezaj, and published-content connection
  Owned paths: `apps/app/**`, `plan/{STATUS.md,logs/phase-08.md,phases/08-FOLLOWUP-CONTENT.md}`, `specs/006-adopt-phase-08/**`
  Shared/exclusive resource: patient-app Phase 08 API adapters and in-scope mock removal
  Expected verification: app typecheck and targeted patient-app connection checks

## آخرین batch — F08-B07

Coordinator/Thread: `Codex /root`
Started at: `2026-09-05 10:05 +03:30`
Completed at: `2026-09-05 10:57 +03:30`
Phase: `Phase 08 — Follow-up, Health Tracking, Notifications & Content`
Batch status: `DONE`
Contract baseline: Phase 05 appointments, Phase 07 treatment tasks, and F08-T06 durable outbox

Tasks:

- Task ID: `F08-T07`
  Agent/Thread: `Codex /root`
  Status: `DONE`
  Depends on: `F08-T06 DONE`
  Scope: idempotent appointment and treatment reminder event creation and delivery
  Owned paths: `apps/api/{src/modules/**,test/**}`, `plan/{STATUS.md,logs/phase-08.md,phases/08-FOLLOWUP-CONTENT.md}`, `specs/006-adopt-phase-08/**`
  Shared/exclusive resource: reminder outbox consumer and existing schedule mutation hooks
  Expected verification: repeat-safe reminder integration tests and worker retry test

## آخرین batch — F08-B05

Coordinator/Thread: `Codex /root`
Started at: `2026-09-05 09:57 +03:30`
Completed at: `2026-09-05 10:01 +03:30`
Phase: `Phase 08 — Follow-up, Health Tracking, Notifications & Content`
Batch status: `DONE`
Contract baseline: published-only patient content and metadata-only media policy

Tasks:

- Task ID: `F08-T05`
  Agent/Thread: `Codex /root`
  Status: `DONE`
  Depends on: `F08-T04 DONE`
  Scope: content publication lifecycle and media policy API
  Owned paths: `apps/api/{prisma,schema/migrations,src/modules/**,test/**}`, `packages/api-client/**`, `plan/{STATUS.md,logs/phase-08.md,phases/08-FOLLOWUP-CONTENT.md}`, `specs/006-adopt-phase-08/**`
  Shared/exclusive resource: content schema and API contract
  Expected verification: migration deploy, published-only authorization tests, Prisma/OpenAPI/client validation, and `git diff --check`

## آخرین batch — F08-B03

Coordinator/Thread: `Codex /root`
Started at: `2026-09-05 09:43 +03:30`
Phase: `Phase 08 — Follow-up, Health Tracking, Notifications & Content`
Completed at: `2026-09-05 09:47 +03:30`
Batch status: `DONE`
Contract baseline: immutable completed assessment submission and version result snapshot

Tasks:

- Task ID: `F08-T03`
  Agent/Thread: `Codex /root`
  Status: `DONE`
  Depends on: `F08-T02 DONE`
  Scope: assessment-version-derived MezajResult persistence and patient read API
  Owned paths: `apps/api/{prisma,schema/migrations,src/modules/assessments/**,test/**}`, `packages/api-client/**`, `plan/{STATUS.md,logs/phase-08.md,phases/08-FOLLOWUP-CONTENT.md}`, `specs/006-adopt-phase-08/**`
  Shared/exclusive resource: Prisma schema/migration, completed-assessment transaction and API contract
  Expected verification: migration deploy, assessment-derived result persistence/read authorization tests, Prisma/OpenAPI/client validation, and `git diff --check`

## آخرین batch — F08-B02

Coordinator/Thread: `Codex /root`
Started at: `2026-09-05 09:33 +03:30`
Phase: `Phase 08 — Follow-up, Health Tracking, Notifications & Content`
Completed at: `2026-09-05 09:41 +03:30`
Batch status: `DONE`
Contract baseline: `plan/contracts/health-observation-v1.md`

Tasks:

- Task ID: `F08-T02`
  Agent/Thread: `Codex /root`
  Status: `DONE`
  Depends on: `F08-T01 DONE`
  Scope: health-observation persistence, tracker write/query, and dashboard health views
  Owned paths: `apps/api/{prisma,schema/migrations,src/modules/**,test/**}`, `apps/dashboard/src/{features,app,data}/health*`, `plan/{STATUS.md,logs/phase-08.md,phases/08-FOLLOWUP-CONTENT.md}`, `specs/006-adopt-phase-08/**`
  Shared/exclusive resource: Prisma schema/migration, health-observation API contract, PostgreSQL integration test
  Expected verification: migration replay, real PostgreSQL write/query and authorization tests, dashboard connection checks, Prisma validation/generation, and `git diff --check`

- فاز قبلی: `Phase 01 — Identity & Access` پس از Bugbot و Security Review مستقل بدون یافته باز تکمیل شد؛ شواهد: [`logs/phase-01.md`](logs/phase-01.md)
- regression مسیر dev API که metadata تزریق وابستگی Nest را حذف می‌کرد در `F01-R01` اصلاح شد؛ شواهد: [`logs/phase-01.md`](logs/phase-01.md)
- هدر وب برای session معتبر دکمه داشبورد نمایش می‌دهد؛ شواهد: [`logs/phase-01.md`](logs/phase-01.md)
- تشخیص LAN: CORS و API سالم‌اند؛ session cookie بین `localhost` و IP شبکه مشترک نیست؛ شواهد: [`logs/phase-01.md`](logs/phase-01.md)
- رابط‌های app، dashboard و web در صورت معطل‌ماندن refresh حداکثر پس از ۱۰ ثانیه از حالت checking خارج می‌شوند؛ شواهد: [`logs/phase-01.md`](logs/phase-01.md)
- build dashboard دیگر فایل cache موقت `.next/dev` را typecheck نمی‌کند؛ build کامل workspace پاس شد؛ شواهد: [`logs/phase-01.md`](logs/phase-01.md)
- اجرای production هر چهار سرویس با `pnpm start` ممکن است و رابط‌ها روی شبکه bind می‌شوند؛ شواهد: [`logs/phase-01.md`](logs/phase-01.md)
- runtime API و Prisma Client با CommonJS صریح هم‌راستا شدند؛ اجرای واقعی API روی پورت ۳۰۰۳ تأیید شد؛ شواهد: [`logs/phase-01.md`](logs/phase-01.md)
- roadmap از Phase 02 به بعد بر اساس app + dashboard + API بازطراحی شد؛ تصمیم: [`ADR-0002`](decisions/ADR-0002-feature-first-roadmap.md).
- آزمون اصلی و booking eligibility به پیش از scheduling منتقل شدند؛ الزام آزمون از dashboard قابل خاموش/روشن‌کردن است.
- Dashboard Home تدریجی است و widget فاقد منبع داده واقعی پنهان می‌شود؛ عدد mock/صفر ساختگی مجاز نیست.
- قرارداد onboarding v1 در `F02-T01` پس از سه review مستقل freeze شد؛ شواهد: [`logs/phase-02.md`](logs/phase-02.md).
- workflow از این نقطه batch-based است: حداکثر سه task مستقل توسط subagentها اجرا و فقط پس از review یکپارچه Agent اصلی تیک می‌خورند.
- `F02-B01` با تکمیل و review مستقل `F02-T02` بسته شد؛ شواهد: [`logs/phase-02.md`](logs/phase-02.md).
- `F02-B02` با review و verification یکپارچه بسته شد؛ شواهد: [`logs/phase-02.md`](logs/phase-02.md).
- `F02-B03` با review مستقل و verification یکپارچه بسته شد؛ endpointهای self-profile، consent/intake و admin patient همراه OpenAPI freeze شدند؛ شواهد: [`logs/phase-02.md`](logs/phase-02.md).
- `F02-B04` با review مستقل و verification کامل app/dashboard/API بسته شد؛ UIها فقط از generated client استفاده می‌کنند و mockهای همان scope حذف شده‌اند؛ شواهد: [`logs/phase-02.md`](logs/phase-02.md).
- `F02-B05` با تأیید دستی جریان واقعی، رفع blocker مرورگر، mock audit و گیت کامل بسته شد؛ `F02-T13` پذیرفته شد.
- `F03-T01` تا `F03-T08` مطابق checklist فاز تکمیل شده‌اند؛ شواهد بازسازی‌شده `F03-T03` تا `F03-T06` و verification جدید در [`logs/phase-03.md`](logs/phase-03.md) ثبت شد.
- dependency: `Phase 02` → DONE.

## prerequisite repair تکمیل‌شده — F06-R01

Coordinator/Thread: `Codex /root`
Started at: `2026-09-03 22:58 +03:30`
Completed at: `2026-09-03 23:24 +03:30`
Status: `DONE`
Scope: repository-baseline reconciliation discovered by `F07-T02`; represent the two existing `clinical_record_revisions` user foreign keys and its database-generated UUID default in the Prisma schema.
Owned paths: `apps/api/prisma/schema.prisma`, `apps/api/prisma.config.ts`, `apps/api/.env.example`, `plan/STATUS.md`, `plan/logs/phase-06.md`
Excluded: all existing migration files, any 14-constraint compatibility migration, Phase 07 migration generation, local database mutation, and `F07-T03`.
Expected verification: isolated full migration replay and zero-drift diff against the corrected Phase 06 schema, Prisma validate/generate, focused Phase 06 clinical persistence/revision tests, and diff/whitespace validation.

Result: the Prisma schema now represents both existing nullable user foreign keys and the database-generated UUID default. All 18 committed migrations replayed in isolation; migration-history → corrected committed schema produced an empty diff; Prisma validate/generate, 5 focused clinical revision/reconciliation tests, and 2 empty-database migration/seed smoke tests passed. No migration was added or changed. Evidence: [`logs/phase-06.md`](logs/phase-06.md).

## آخرین batch تکمیل‌شده — F07-B02

Coordinator/Thread: `Codex /root`
Started at: `2026-09-03 22:20 +03:30`
Phase: `Phase 07 — Prescription & Treatment`
Batch status: `DONE`
Contract baseline: `plan/contracts/prescription-treatment-policy-v1.md`

Tasks:

- Task ID: `F07-T02`
  Agent/Thread: `Codex /root`
  Status: `DONE`
  Depends on: `F07-T01 DONE`
  Scope: migration prescription/treatment/task/adherence
  Owned paths: `apps/api/prisma.config.ts`, `apps/api/.env.example`, `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/20260903222000_phase_07_prescription_treatment_foundation/migration.sql`, `apps/api/test/migrations.integration.spec.ts`, `plan/logs/phase-07.md`, `plan/STATUS.md`, `plan/phases/07-PRESCRIPTION-TREATMENT.md`, `specs/005-adopt-phase-07/{data-model.md,contracts/phase-07-adoption.md,tasks.md}`
  Shared/exclusive resource: `Prisma schema, migration, migration integration test`
  Expected verification: Prisma validation/generation, empty-database migration smoke, focused migration integration assertions, `git diff --check`
  Result: a generated-only Phase 07 foundation migration was reviewed, applied to the clean reconstructed local database, and verified with isolated shadow, fresh PostgreSQL smoke, real constraint exercise, and Phase 06/API regression checks. The original database and verified backups remain rollback protection. Evidence: `plan/logs/phase-07.md`.

## وضعیت taskهای Phase 07

- `F07-T01` — `DONE`؛ approved issuance-policy baseline and verification: [`contracts/prescription-treatment-policy-v1.md`](contracts/prescription-treatment-policy-v1.md), evidence: [`logs/phase-07.md`](logs/phase-07.md).
- `F07-T02` — `DONE`؛ migration prescription/treatment/task/adherence with clean local switchover verification: [`logs/phase-07.md`](logs/phase-07.md).
- `F07-T03` — `DONE`؛ prescription create/draft/issue/revision API with append-only issued history and real PostgreSQL verification: [`logs/phase-07.md`](logs/phase-07.md).
- `F07-T04` — `DONE`؛ treatment medication/session/exercise/nutrition plan API with the owner-approved persisted `TreatmentSessionPlan` boundary and fresh PostgreSQL verification: [`contracts/treatment-session-plan-v1.md`](contracts/treatment-session-plan-v1.md), evidence: [`logs/phase-07.md`](logs/phase-07.md).
- `F07-T05` — `DONE`؛ one-off treatment-task scheduling, repeat-safe patient completion, and keyed medication-adherence recording with PostgreSQL verification: [`contracts/treatment-task-activity-v1.md`](contracts/treatment-task-activity-v1.md), evidence: [`logs/phase-07.md`](logs/phase-07.md).
- `F07-T06` — `DONE`؛ real task-state-derived progress and append-only patient-action timeline with PostgreSQL verification: [`contracts/treatment-progress-v1.md`](contracts/treatment-progress-v1.md), evidence: [`logs/phase-07.md`](logs/phase-07.md).
- `F07-T07` — `DONE`؛ selected-patient prescription builder and dashboard treatment/progress summary use accepted F07 APIs without fabricated data: [`contracts/prescription-dashboard-connection-v1.md`](contracts/prescription-dashboard-connection-v1.md), evidence: [`logs/phase-07.md`](logs/phase-07.md).
- `F07-T08` — `DONE`؛ patient treatment app uses accepted plan/activity/progress APIs without fabricated treatment data: [`contracts/patient-treatment-app-connection-v1.md`](contracts/patient-treatment-app-connection-v1.md), evidence: [`logs/phase-07.md`](logs/phase-07.md).
- `F07-T09` — `DONE`؛ explicit `PRESCRIPTION_ISSUE`, default `DOCTOR` mapping, tenant/resource authorization, transactional issuance audit, and owner-approved automated-safety-rule deferral: [`contracts/prescription-treatment-policy-v1.md`](contracts/prescription-treatment-policy-v1.md), evidence: [`logs/phase-07.md`](logs/phase-07.md).
- `F07-T10` — `DONE`؛ exported accepted F07 OpenAPI, regenerated the checked-in client, and replaced the completed F07 dashboard/app transport duplication with generated-client wrappers; evidence: [`logs/phase-07.md`](logs/phase-07.md).
- `F07-T11` — `DONE`؛ local browser journey and PostgreSQL verification confirm immutable issued revisions, revision-only amendment, ownership, audit, persisted patient activity, and real-event progress; evidence: [`logs/phase-07.md`](logs/phase-07.md).
- `F07-T12` — `DONE`؛ final Phase 07 verification, evidence reconciliation, and Spec Kit consistency/convergence review passed; evidence: [`logs/phase-07.md`](logs/phase-07.md).

## آخرین batch تکمیل‌شده — F07-B03

Coordinator/Thread: `Codex /root`
Started at: `2026-09-04 03:31 +03:30`
Phase: `Phase 07 — Prescription & Treatment`
Batch status: `DONE`
Contract baseline: `plan/contracts/prescription-treatment-policy-v1.md`

Tasks:

- Task ID: `F07-T03`
  Agent/Thread: `Codex /root`
  Status: `DONE`
  Depends on: `F07-T01 DONE`, `F07-T02 DONE`
  Scope: prescription create/draft/issue/revision API
  Owned paths: `apps/api/src/modules/clinical/{prescription*.ts,clinical.module.ts}`, `apps/api/test/prescription*.spec.ts`, `plan/logs/phase-07.md`, `plan/STATUS.md`, `plan/phases/07-PRESCRIPTION-TREATMENT.md`, `specs/005-adopt-phase-07/{spec.md,plan.md,quickstart.md,tasks.md}`
  Shared/exclusive resource: `Clinical module/API contract and PostgreSQL integration test`
  Expected verification: input/response validation, PostgreSQL lifecycle/revision/constraint integration, authorization/resource-boundary regression, Prisma validation/generation, API smoke, and `git diff --check`
  Result: append-only prescription draft/revision and exact-revision issue API accepted with optimistic concurrency, immutable issued history, integrity evidence, current clinical capability/resource boundary, and real PostgreSQL coverage. The dedicated `PRESCRIPTION_ISSUE`, audit, and contraindication enforcement remains exclusively owned by `F07-T09`; generated client synchronization remains exclusively owned by `F07-T10`.

## آخرین batch تکمیل‌شده — F07-B04

Coordinator/Thread: `Codex /root`
Started at: `2026-09-04 03:45 +03:30`
Phase: `Phase 07 — Prescription & Treatment`
Batch status: `DONE`
Contract baseline: `plan/contracts/treatment-session-plan-v1.md`

Tasks:

- Task ID: `F07-T04`
  Agent/Thread: `Codex /root`
  Status: `DONE`
  Depends on: `F07-T01 DONE`, `F07-T02 DONE`, `F07-T03 DONE`
  Scope: treatment medication/session/exercise/nutrition plan API
  Owned paths: `apps/api/prisma/{schema.prisma,migrations/*_phase_07_treatment_session_plan/migration.sql}`, `apps/api/src/modules/clinical/{treatment-plan*.ts,admin-treatment-plans.controller.ts,patient-treatment-plans.controller.ts,clinical.module.ts}`, `apps/api/src/common/errors/api-error.ts`, `apps/api/test/{migrations.integration.spec.ts,treatment-plan*.spec.ts}`, `plan/contracts/treatment-session-plan-v1.md`, `plan/logs/phase-07.md`, `plan/STATUS.md`, `plan/phases/07-PRESCRIPTION-TREATMENT.md`, `specs/005-adopt-phase-07/{spec.md,plan.md,research.md,data-model.md,quickstart.md,contracts/phase-07-adoption.md,tasks.md}`
  Shared/exclusive resource: `Prisma schema/migration, Clinical module/API contract, and PostgreSQL integration test`
  Expected verification: reviewed additive migration SQL; fresh PostgreSQL migration/constraint smoke; DTO/response validation; real PostgreSQL treatment-plan persistence and clinic-resource boundary; Prisma validation/generation; focused API smoke; and `git diff --check`
  Contract: owner-approved `TreatmentSessionPlan` definition only; no schedule, recurrence, reminder, attendance, completion, appointment/encounter/task relation, media, modality, revision, or per-session exercise/diet/video persistence. F07-T05/F07-T06 retain execution and derived status.
  Result: the isolated additive migration creates only `treatment_session_plans`, its unique `(treatment_plan_id, position)` index, and a restrictive foreign key to `treatment_plans`. The API supplies validated plan and definition CRUD, patient reads, current clinic/resource authorization, and clinical audit evidence without changing F07-T02, generating the checked-in client, or adding F07-T05 scheduling/execution behavior. Evidence: `plan/logs/phase-07.md`.

## آخرین batch تکمیل‌شده — F07-B05

Coordinator/Thread: `Codex /root`
Started at: `2026-09-04 16:41 +03:30`
Phase: `Phase 07 — Prescription & Treatment`
Batch status: `DONE`
Contract baseline: `plan/contracts/treatment-task-activity-v1.md`

Tasks:

- Task ID: `F07-T05`
  Agent/Thread: `Codex /root`
  Status: `DONE`
  Depends on: `F07-T01 DONE`, `F07-T02 DONE`, `F07-T03 DONE`, `F07-T04 DONE`
  Scope: task schedule and idempotent medication/task recording
  Owned paths: `apps/api/src/modules/clinical/{treatment-activity*.ts,admin-treatment-tasks.controller.ts,patient-treatment-activity.controller.ts,clinical.module.ts}`, `apps/api/src/common/errors/api-error.ts`, `apps/api/test/treatment-activity*.spec.ts`, `plan/contracts/treatment-task-activity-v1.md`, `plan/logs/phase-07.md`, `plan/STATUS.md`, `plan/phases/07-PRESCRIPTION-TREATMENT.md`, `specs/005-adopt-phase-07/{spec.md,plan.md,research.md,data-model.md,quickstart.md,contracts/phase-07-adoption.md,tasks.md}`
  Shared/exclusive resource: `Clinical module/API contract, common error contract, and PostgreSQL integration test`
  Expected verification: task/adherence lifecycle and idempotency, patient/clinic-resource authorization, audit, runtime OpenAPI, Prisma validation/generation, focused real PostgreSQL API integration, and `git diff --check`
  Contract: each `TreatmentTask` is a one-off medication or exercise occurrence and its `scheduledFor` is the future reminder source. No session-plan relation, recurrence engine, reminder dispatch, progress-event write/calculation, frontend connection, generated-client synchronization, or Phase 08 behavior is included.
  Result: the F07-T02 persistence foundation is reused unchanged for authorized one-off task scheduling, patient-owned repeat-safe completion, and keyed medication-adherence replay. The existing clinical capability, clinic-resource boundary, patient self boundary, audit convention, and runtime OpenAPI declarations are covered by real PostgreSQL integration. No migration, session relationship, recurrence, reminder dispatch, progress event, frontend connection, checked-in client update, or Phase 08 behavior was added. Evidence: `plan/logs/phase-07.md`.

## آخرین batch تکمیل‌شده — F07-B06

Coordinator/Thread: `Codex /root`
Started at: `2026-09-04 16:57 +03:30`
Phase: `Phase 07 — Prescription & Treatment`
Batch status: `DONE`
Contract baseline: `plan/contracts/treatment-progress-v1.md`

Tasks:

- Task ID: `F07-T06`
  Agent/Thread: `Codex /root`
  Status: `DONE`
  Depends on: `F07-T01 DONE`, `F07-T02 DONE`, `F07-T03 DONE`, `F07-T04 DONE`, `F07-T05 DONE`
  Scope: real progress calculation and treatment timeline API
  Owned paths: `apps/api/src/modules/clinical/{treatment-progress*.ts,admin-treatment-progress.controller.ts,patient-treatment-progress.controller.ts,treatment-activity.service.ts,clinical.module.ts}`, `apps/api/test/treatment-progress*.spec.ts`, `plan/contracts/treatment-progress-v1.md`, `plan/logs/phase-07.md`, `plan/STATUS.md`, `plan/phases/07-PRESCRIPTION-TREATMENT.md`, `specs/005-adopt-phase-07/{spec.md,plan.md,research.md,data-model.md,quickstart.md,contracts/phase-07-adoption.md,tasks.md}`
  Shared/exclusive resource: `Clinical module/API contract, F07-T05 activity integration, and PostgreSQL integration test`
  Expected verification: real event append-only behavior, task-state-derived progress calculation, patient/clinic-resource authorization, audit, runtime OpenAPI, Prisma validation/generation, focused real PostgreSQL API integration, and `git diff --check`
  Contract: the existing `TreatmentProgressEvent` table records only `TASK_COMPLETED` and `MEDICATION_ADHERENCE_RECORDED` actions performed through F07-T05. Progress is derived from non-cancelled task state, while timeline entries are persisted real events. No session lifecycle, scheduling, recurrence, reminder dispatch, UI connection, generated-client synchronization, or Phase 08 behavior is included.
  Result: accepted F07-T05 task completion and medication-adherence writes now append exactly one corresponding progress event in the same transaction; retry paths append none. Authorized reads return a task-state-derived percentage and paginated persisted timeline without adding a migration, session behavior, UI connection, client sync, or Phase 08 scope. Evidence: `plan/logs/phase-07.md`.

## آخرین batch تکمیل‌شده — F07-B07

Coordinator/Thread: `Codex /root`
Started at: `2026-09-04 17:14 +03:30`
Phase: `Phase 07 — Prescription & Treatment`
Batch status: `DONE`
Contract baseline: `plan/contracts/prescription-dashboard-connection-v1.md`

Tasks:

- Task ID: `F07-T07`
  Agent/Thread: `Codex /root`
  Status: `DONE`
  Depends on: `F07-T01 DONE`, `F07-T02 DONE`, `F07-T03 DONE`, `F07-T04 DONE`, `F07-T05 DONE`, `F07-T06 DONE`
  Scope: prescription builder and dashboard patient-workspace connection
  Owned paths: `apps/dashboard/src/{features/prescriptions/**,features/patients/workspace/**,lib/prescription-treatment-api.ts}`, `apps/dashboard/src/lib/**.spec.ts`, `plan/contracts/prescription-dashboard-connection-v1.md`, `plan/logs/phase-07.md`, `plan/STATUS.md`, `plan/phases/07-PRESCRIPTION-TREATMENT.md`, `specs/005-adopt-phase-07/{spec.md,plan.md,research.md,quickstart.md,contracts/phase-07-adoption.md,tasks.md}`
  Shared/exclusive resource: `Dashboard clinical API adapter and treatment/prescription UI`
  Expected verification: authenticated selected-patient flow, real prescription draft/revision reads/writes, real treatment/progress reads, error/empty states without fabricated patient data, dashboard type/lint tests, API regression, and `git diff --check`
  Contract: a dashboard clinical user enters `/prescriptions` with an explicit `patientId`; absent identity shows no fabricated patient. The selected patient’s prescription builder and treatment/progress summary use accepted F07 APIs. F07-T10 retains generated-client synchronization and any remaining broad mock/local-state cleanup; F07-T08 retains patient-app connection.
  Result: accepted after dashboard adapter contract tests, full dashboard tests/typecheck/lint/build, focused F07 API regression, and whitespace review. The prescription builder is reachable only from a selected real patient and the workspace renders server data/error states without fabricated patient, prescription, treatment, or progress data. Evidence: `plan/logs/phase-07.md`.

Next eligible batch: `F07-B08` — `F07-T08` is eligible, unclaimed, and not started.

## آخرین batch تکمیل‌شده — F07-B08

Coordinator/Thread: `Codex /root`
Started at: `2026-09-04 17:17 +03:30`
Phase: `Phase 07 — Prescription & Treatment`
Batch status: `DONE`
Contract baseline: `plan/contracts/patient-treatment-app-connection-v1.md`

Tasks:

- Task ID: `F07-T08`
  Agent/Thread: `Codex /root`
  Status: `DONE`
  Depends on: `F07-T01 DONE`, `F07-T02 DONE`, `F07-T03 DONE`, `F07-T04 DONE`, `F07-T05 DONE`, `F07-T06 DONE`, `F07-T07 DONE`
  Scope: patient-app treatment, medication, session, exercise, and real-progress connection
  Owned paths: `apps/app/src/{app/(app)/treatment/**,lib/patient-treatment-api.ts}`, `apps/app/src/lib/**.spec.ts`, `plan/contracts/patient-treatment-app-connection-v1.md`, `plan/logs/phase-07.md`, `plan/STATUS.md`, `plan/phases/07-PRESCRIPTION-TREATMENT.md`, `specs/005-adopt-phase-07/{spec.md,plan.md,research.md,quickstart.md,contracts/phase-07-adoption.md,tasks.md}`
  Shared/exclusive resource: `Patient treatment API adapter and treatment UI`
  Expected verification: authenticated patient own-resource reads, medication adherence and task completion wiring where available, real treatment/session/exercise/progress display, truthful loading/error/empty states, app type/tests/build, focused F07 API regression, and `git diff --check`
  Contract: the treatment app reads only the authenticated patient's accepted F07 APIs. It renders persisted treatment definitions, tasks, and derived progress without a fabricated plan, medication, session, exercise, diet, task, or timeline. F07-T09 retains authorization/audit/warning policy; F07-T10 retains generated-client synchronization and any remaining broad mock/local-state cleanup; F07-T11 retains browser E2E.
  Result: accepted after patient treatment adapter contract tests, full app tests/typecheck/build, focused F07 API regression, and whitespace review. The app reads patient-owned data and records only the accepted completion/adherence actions. Evidence: `plan/logs/phase-07.md`.

Next eligible batch: `F07-B10` — `F07-T10` is eligible, unclaimed, and not started.

## آخرین batch تکمیل‌شده — F07-B10

Coordinator/Thread: `Codex /root`
Started at: `2026-09-04 19:12 +03:30`
Phase: `Phase 07 — Prescription & Treatment`
Batch status: `DONE`
Contract baseline: `plan/contracts/prescription-dashboard-connection-v1.md`, `plan/contracts/patient-treatment-app-connection-v1.md`, and `plan/contracts/prescription-treatment-policy-v1.md`

Tasks:

- Task ID: `F07-T10`
  Agent/Thread: `Codex /root`
  Status: `DONE`
  Depends on: `F07-T01 DONE`, `F07-T02 DONE`, `F07-T03 DONE`, `F07-T04 DONE`, `F07-T05 DONE`, `F07-T06 DONE`, `F07-T07 DONE`, `F07-T08 DONE`, `F07-T09 DONE`
  Scope: Phase 07 OpenAPI export/generated client synchronization and removal of the temporary typed Phase 07 dashboard/app API adapters or remaining in-scope mock/local state
  Owned paths: `apps/api/openapi.json`, `packages/api-client/{openapi.json,src/schema.generated.ts,src/index.ts,test/**}`, `apps/{app,dashboard}/src/{lib,features}/**` only where a completed F07 connection uses a temporary Phase 07 adapter, `plan/{STATUS.md,logs/phase-07.md,phases/07-PRESCRIPTION-TREATMENT.md}`, `specs/005-adopt-phase-07/**`
  Shared/exclusive resource: OpenAPI export, generated API client, and Phase 07 client-adapter integration
  Expected verification: runtime OpenAPI/export/client freshness, app/dashboard generated-client connection tests and type/build checks, focused API regression, no in-scope mock/local-state fallback, and `git diff --check`
  Contract: synchronize accepted F07 contracts only. Preserve the approved no-active-contraindication-rule boundary, existing issuance authorization/audit/revision integrity, treatment-session boundary, and all F07-T05 scheduling scope. Do not add endpoints, migrations, authorization rules, role-management UI, browser E2E, Phase 08 work, or fabricated fallback data.
  Result: accepted F07 runtime OpenAPI was exported and generated client types refreshed. Both completed F07 transport adapters now use generated operation paths/request bodies/response types with their existing error/timeout behavior, and no in-scope mock/local fallback remains. No server contract/product behavior changed. Evidence: `plan/logs/phase-07.md`.

Next eligible batch: `F07-B11` — `F07-T11` is eligible, unclaimed, and not started.

## آخرین batch تکمیل‌شده — F07-B11

Coordinator/Thread: `Codex /root`
Started at: `2026-09-04 19:35 +03:30`
Completed at: `2026-09-04 22:56 +03:30`
Phase: `Phase 07 — Prescription & Treatment`
Batch status: `DONE`
Contract baseline: `plan/contracts/prescription-treatment-policy-v1.md`, `plan/contracts/prescription-dashboard-connection-v1.md`, `plan/contracts/patient-treatment-app-connection-v1.md`, and the F07-T11 browser gate in `specs/005-adopt-phase-07/quickstart.md`

Tasks:

- Task ID: `F07-T11`
  Agent/Thread: `Codex /root`
  Status: `DONE`
  Depends on: `F07-T01 DONE`, `F07-T02 DONE`, `F07-T03 DONE`, `F07-T04 DONE`, `F07-T05 DONE`, `F07-T06 DONE`, `F07-T07 DONE`, `F07-T08 DONE`, `F07-T09 DONE`, `F07-T10 DONE`
  Scope: integrated immutability/amendment/ownership verification and local browser E2E for the accepted Phase 07 dashboard issue → patient app display → patient log → dashboard review journey
  Owned paths: `apps/{api,app,dashboard}/test/**` or existing F07 test paths only if a verification gap needs a focused regression, `plan/{STATUS.md,logs/phase-07.md,phases/07-PRESCRIPTION-TREATMENT.md}`, and `specs/005-adopt-phase-07/**`
  Shared/exclusive resource: local browser verification, integration test database, and F07 acceptance evidence
  Expected verification: issued-revision immutability/amendment and authorization/ownership/audit regression; fresh dashboard/app browser journey with persisted data across refresh and a second authenticated session; real derived progress; no active contraindication rule behavior; and `git diff --check`
  Contract: verification only unless a demonstrated F07 defect requires a minimal in-scope repair. Preserve F07-T01–T10 behavior and the approved no-active-contraindication-rule, TreatmentSessionPlan, task scheduling, and generated-client boundaries. Do not add role management, new product behavior, migrations, or Phase 08 work.
  Result: accepted after a local browser flow using disposable synthetic accounts, persisted patient activity across a fresh page and a second authenticated session, dashboard review, exact revision/audit inspection, focused real-PostgreSQL API tests, dashboard/app tests and typechecks, Prisma validation/status, and whitespace review. The synthetic data was removed after verification; no preserved local-development record was changed.

Next eligible batch: `F07-B12` — `F07-T12` is eligible, unclaimed, and not started.

## آخرین batch تکمیل‌شده — F07-B12

Coordinator/Thread: `Codex /root`
Started at: `2026-09-04 23:00 +03:30`
Completed at: `2026-09-04 23:09 +03:30`
Phase: `Phase 07 — Prescription & Treatment`
Batch status: `DONE`
Contract baseline: the accepted Phase 07 roadmap, contracts, and `specs/005-adopt-phase-07/` artifacts

Tasks:

- Task ID: `F07-T12`
  Agent/Thread: `Codex /root`
  Status: `DONE`
  Depends on: `F07-T01` through `F07-T11` `DONE`
  Scope: final Phase 07 verification, evidence, authoritative checklist/status reconciliation, and Spec Kit consistency/convergence review only
  Owned paths: `plan/{STATUS.md,logs/phase-07.md,phases/07-PRESCRIPTION-TREATMENT.md}` and `specs/005-adopt-phase-07/**`
  Shared/exclusive resource: Phase 07 final evidence and status synchronization
  Expected verification: Prisma migration/schema status, runtime OpenAPI/generated-client freshness, relevant API/frontend suites, `git diff --check`, in-scope mock/local-state and Phase 08 leakage review, and Spec Kit prerequisite/consistency/convergence analysis
  Contract: do not change product code, migrations, generated artifacts, completed F07 tasks, or Phase 08. Mark `F07-T12` done only after every gate passes; leave Phase 07 `READY_FOR_REVIEW` for an independent closure review.
  Result: all gates passed. The active clean PostgreSQL database reports all 22 committed migrations applied; Prisma validation passed; runtime OpenAPI/client regeneration created no drift; the API, generated-client, dashboard, and app suites/typechecks/builds passed; in-scope F07 sources contain no mock or browser-local-state fallback; no Phase 08 path or behavior was added; and final Spec Kit prerequisite, requirement-coverage, ordering, consistency, and convergence checks found no gap or new task. Phase 07 is `READY_FOR_REVIEW`; independent closure review remains required before any later phase is considered.

## آخرین batch بسته‌شده

`F07-CLOSE` — `DONE (CLOSED)`

- review مستقل closure تمام معیارهای `F07-T01` تا `F07-T12`، قراردادهای accepted، migration/schema،
  generated OpenAPI/client، authorization/resource scope، audit، immutable prescription revision،
  treatment/task/adherence/progress، dashboard/app behavior، browser evidence، و Spec Kit را
  مرور کرد و blocker، drift یا تغییر unrelated پیدا نکرد؛ شواهد: [`logs/phase-07.md`](logs/phase-07.md).
- `Phase 08` همچنان `NOT_STARTED` است؛ هیچ task، batch یا آماده‌سازی برای آن انجام نشده است.

## وضعیت taskهای فاز پیشین

- `F06-T01` — `DONE`؛ شواهد: [`logs/phase-06.md`](logs/phase-06.md)
- `F06-T02` — `DONE`؛ شواهد: [`logs/phase-06.md`](logs/phase-06.md)
- `F06-T03` — `DONE`؛ شواهد: [`logs/phase-06.md`](logs/phase-06.md)
- `F06-T04` — `DONE`؛ شواهد: [`logs/phase-06.md`](logs/phase-06.md)
- `F06-T05` — `DONE`؛ شواهد: [`logs/phase-06.md`](logs/phase-06.md)
- `F06-T06` — `DONE`؛ شواهد: [`logs/phase-06.md`](logs/phase-06.md)
- `F06-T07` — `DONE`؛ شواهد: [`logs/phase-06.md`](logs/phase-06.md)
- `F06-T08` — `DONE`؛ شواهد: [`logs/phase-06.md`](logs/phase-06.md)
- `F06-T09` — `DONE`؛ شواهد: [`logs/phase-06.md`](logs/phase-06.md)
- `F06-T10` — `DONE`؛ شواهد: [`logs/phase-06.md`](logs/phase-06.md)
- `F06-T11` — `DONE`؛ شواهد: [`logs/phase-06.md`](logs/phase-06.md)
- `F06-T12` — `DONE`؛ شواهد: [`logs/phase-06.md`](logs/phase-06.md)


### وضعیت تاریخی Phase 05

- `F05-T01` — `DONE`؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md)
- `F05-T02` — `DONE`؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md)
- `F05-T03` — `DONE`؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md)
- `F05-T04` — `DONE`؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md)
- `F05-T05` — `DONE`؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md)
- `F05-T06` — `DONE`؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md)
- `F05-T07` — `DONE`؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md)
- `F05-T08` — `DONE`؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md)
- `F05-T09` — `DONE`؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md)
- `F05-T10` — `DONE`؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md)
- `F05-T11` — `DONE`؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md)
- `F05-T12` — `DONE`؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md)
- `F05-T13` — `DONE`؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md)
- `F05-T14` — `DONE`؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md)

### وضعیت تاریخی Phase 04

- `F04-T01` — `DONE`
- `F04-T02` — `DONE`؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md)
- `F04-T03` — `DONE`؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md)
- `F04-T04` — `DONE`؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md)
- `F04-T05` — `DONE`؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md)
- `F04-T06` — `DONE`؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md)
- `F04-T07` — `DONE`؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md)
- `F04-T08` — `DONE`؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md)
- `F04-T09` — `DONE`؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md)
- `F04-T10` — `DONE`؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md)
- `F04-T11` — `DONE`؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md)
- `F04-T12` — `DONE`؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md) و [`../specs/002-adopt-phase-04/evidence.md`](../specs/002-adopt-phase-04/evidence.md)

## آخرین batch بسته‌شده

`F06-CLOSE` — `DONE (CLOSED)`

- review مستقل closure تمام معیارهای پذیرش `F06-T01` تا `F06-T12`، قرارداد policy بالینی،
  migrationهای applied، generated OpenAPI/client، revision/sign/publish، authorization/resource
  scope، audit/redaction، patient visibility، test/build و evidence مرور شد و blocker یا drift
  پیدا نشد؛ شواهد: [`logs/phase-06.md`](logs/phase-06.md).
- `Phase 07` همچنان `NOT_STARTED` است؛ هیچ task یا batch آن claim یا آماده‌سازی نشده است.

`F06-B12` — `DONE`

- `F06-T12` evidence، full verification و review سازگاری/همگرایی Spec Kit را پذیرفت؛ Phase 06
  اکنون `READY_FOR_REVIEW` است و هیچ task جدیدی به roadmap افزوده نشد؛ شواهد:
  [`logs/phase-06.md`](logs/phase-06.md).
- next action: independent Phase 06 review; `Phase 07` remains `NOT_STARTED`.

`F06-B11` — `DONE`

- `F06-T11` OpenAPI runtime/client را با response schemaهای clinical همگام کرد، dashboard/app را
  به generated client منتقل کرد، و gateهای security/revision/browser را پذیرفت؛ شواهد:
  [`logs/phase-06.md`](logs/phase-06.md).
- task واجد شرایط بعدی: `F06-T12`؛ هنوز claim نشده است.

`F06-B10` — `DONE`

- `F06-T10` سه surface بیمار را به summary/history/timeline مجاز persisted وصل و mockهای visit,
  prescription, score و treatment را حذف کرد؛ شواهد: [`logs/phase-06.md`](logs/phase-06.md).
- task واجد شرایط بعدی: `F06-T11`؛ هنوز claim نشده است.

`F06-B09` — `DONE`

- `F06-T09` patient workspace dashboard را به clinical workspace مجاز، note/record revision،
  sign/publish، appointment، assessment و timeline واقعی وصل کرد؛ traditional analysis بدون
  data model Phase 06 صادقانه empty state است؛ شواهد: [`logs/phase-06.md`](logs/phase-06.md).
- task واجد شرایط بعدی: `F06-T10`؛ هنوز claim نشده است.

`F06-B08` — `DONE`

- `F06-T08` permissionهای بالینی configurable، grant صریح actor-to-clinic، guard fail-closed و
  audit تراکنشی redacted را برای readهای clinical بیمار و writeهای note/reconciliation پذیرفت؛
  export/download هنوز endpoint ندارد و بنابراین خارج از permission/audit قابل دسترسی نیست؛ شواهد:
  [`logs/phase-06.md`](logs/phase-06.md).
- task واجد شرایط بعدی: `F06-T09`؛ هنوز claim نشده است.

`F06-B07` — `DONE`

- `F06-T07` patient-safe timeline/history/visit-summary read model را فقط از current explicitly
  published summary روی encounter تکمیل‌شده می‌خواند؛ private/draft/signed-but-unpublished content
  و audit metadata خارج می‌مانند؛ شواهد: [`logs/phase-06.md`](logs/phase-06.md).
- task واجد شرایط بعدی: `F06-T08`؛ هنوز claim نشده است.

`F06-B06` — `DONE`

- `F06-T06` چهار نوع clinical record را فقط از provenance immutable intake و human review صریح
  ایجاد می‌کند؛ edit و signing برای revision جاری append-only، private-by-default و دارای
  optimistic-concurrency است؛ شواهد: [`logs/phase-06.md`](logs/phase-06.md).
- task واجد شرایط بعدی: `F06-T07`؛ هنوز claim نشده است.

`F06-B05` — `DONE`

- `F06-T05` revision chain private-by-default برای ClinicalNote را با optimistic concurrency،
  signing exact revision و amendment append-only پذیرفته کرد؛ شواهد:
  [`logs/phase-06.md`](logs/phase-06.md).
- task واجد شرایط بعدی: `F06-T06`؛ هنوز claim نشده است.

`F06-B04` — `DONE`

- `F06-T04` یک Encounter جدا را هنگام start appointment معتبر و در همان transaction می‌سازد و
  هنگام complete آن را تکمیل می‌کند؛ retryهای start/call-next duplicate تولید نمی‌کنند؛ شواهد:
  [`logs/phase-06.md`](logs/phase-06.md).
- task واجد شرایط بعدی: `F06-T05`؛ هنوز claim نشده است.

`F06-B03` — `DONE`

- `F06-T03` persistence افزایشی encounter، clinical core، source provenance و patient access audit
  را با migration/constraint و smoke PostgreSQL واقعی پذیرفته کرد؛ شواهد:
  [`logs/phase-06.md`](logs/phase-06.md).
- task واجد شرایط بعدی: `F06-T04`؛ هنوز claim نشده است.

`F06-B02` — `DONE`

- `F06-T02` قرارداد intake خوداظهاری به clinical record reviewed را با provenance immutable،
  human review صریح، جداسازی clinical output، visibility private-by-default و مرزبندی taskهای
  migration/reconciliation freeze کرد؛ شواهد: [`logs/phase-06.md`](logs/phase-06.md).
- task واجد شرایط بعدی: `F06-T03`؛ هنوز claim نشده است.

`F06-B01` — `DONE`

- `F06-T01` پس از freeze قرارداد policy داده بالینی، بررسی traceability با roadmap/standards/
  authorization/audit و review coordinator پذیرفته شد؛ شواهد:
  [`logs/phase-06.md`](logs/phase-06.md).
- task واجد شرایط بعدی: `F06-T02`؛ هنوز claim نشده است.

`F05-CLOSE` — `DONE (CLOSED)`

- review مستقل closure تمام taskها، migration/seed، contract/client، concurrency، browser E2E،
  buildها، mock boundary و evidence/spec synchronization را پذیرفت؛ شواهد:
  [`logs/phase-05.md`](logs/phase-05.md).
- `Phase 05` اکنون `DONE (CLOSED)` است. `Phase 06` همچنان `NOT_STARTED` و بدون claim است.

`F05-B14` — `DONE`

- `F05-T14` پذیرفته شد: تمام taskهای Phase 05، exit criteria، migration/seed smoke، suiteهای
  مرتبط، browser evidence و Spec Kit consistency/convergence review پاس شده‌اند؛ Phase 05
  اکنون `READY_FOR_REVIEW` است؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md).
- task جدیدی claim نشده است. review مستقل فاز باید پیش از `DONE` شدن و فعال‌سازی Phase 06 انجام شود.

`F05-B13` — `DONE`

- `F05-T13` پذیرفته شد: browser E2E محلیِ synthetic از register/profile/assessment تا booking و
  عملیات dashboard/queue پایان یافت؛ calendar و Home V1 با داده‌های عملیات هم‌خوان بودند و
  baseline query/load PostgreSQL ثبت شد؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md).
- task واجد شرایط بعدی: `F05-T14`؛ هنوز claim نشده است.

`F05-B12` — `DONE`

- `F05-T12` پذیرفته شد: PostgreSQL واقعی ۱۰۰ درخواست هم‌زمان را با دقیقاً یک رزرو موفق و
  ۹۹ conflict پایدار کنترل می‌کند؛ idempotency، authorization و transitionهای تکراری نیز
  regression-tested هستند؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md).
- task واجد شرایط بعدی: `F05-T13`؛ هنوز claim نشده است.

`F05-B11` — `DONE`

- `F05-T11` پذیرفته شد: runtime OpenAPI و generated client تمام endpointهای Phase 05 را پوشش
  می‌دهند و fixture appointment و badgeهای عملیاتی ساختگی حذف شدند؛ شواهد:
  [`logs/phase-05.md`](logs/phase-05.md).
- task واجد شرایط بعدی: `F05-T12`؛ هنوز claim نشده است.

`F05-B10` — `DONE`

- `F05-T10` پذیرفته شد: Dashboard Home V1 فقط KPI و برنامهٔ امروز clinic-local و activity
  واقعی رزرو را نمایش می‌دهد؛ widgetهای بیمار و assessment نیز فقط منابع زندهٔ پیشین دارند.
  integration PostgreSQL، typecheck و test dashboard پاس شدند؛ شواهد:
  [`logs/phase-05.md`](logs/phase-05.md).
- task واجد شرایط بعدی: `F05-T11`؛ هنوز claim نشده است. OpenAPI/generated client فقط در همین
  task هماهنگ خواهد شد.

`F05-B09` — `DONE`

- `F05-T09` پس از typecheck/build dashboard و integration واقعی PostgreSQL برای list و queue
  مرتب‌شده پذیرفته شد؛ شواهد:
  [`logs/phase-05.md`](logs/phase-05.md).
- task واجد شرایط بعدی: `F05-T10`؛ هنوز claim نشده است.
- هماهنگ‌سازی generated OpenAPI client عمداً در مالک آن، `F05-T11`، باقی مانده است؛ بنابراین
  `test/openapi-contract.spec.ts` تا آن task runtime document را با client checked-in ناسازگار گزارش می‌کند.

`F05-B01` بسته شد: `F05-T01` پس از review قرارداد lifecycle، cancellation/reschedule و price
snapshot پذیرفته شد؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md).

`F04-B08` بدون تغییر implementation بسته شد: generated client مانع `F04-T08` و `F04-T09` بود. با authorization صریح مالک، `F04-B10` فقط prerequisite slice از `F04-T10` را اجرا و review کرد؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md).

`F04-B08-R1` برای `F04-T08` پس از dashboard verification و review coordinator بسته شد؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md).

`F04-B09` برای patient doctor detail، انتخاب doctor/service و availability مشتق‌شده پس از review coordinator بسته شد؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md).

`F04-B10-R1` برای completion نهایی `F04-T10` پس از migration/seed smoke، contract drift و review coordinator بسته شد؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md).

`F04-B11` پس از review coordinator و گیت واقعی PostgreSQL/API/browser بسته شد؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md).

`F04-B12` پس از migration/seed smoke، full API suite، frontend/client verification، evidence reconciliation و review coordinator بسته شد؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md) و [`../specs/002-adopt-phase-04/evidence.md`](../specs/002-adopt-phase-04/evidence.md).

`F04-CLOSE` با independent review بسته شد: تمام taskها، migration/seed، OpenAPI/generated client، تست‌های نهایی، browser evidence، mock boundary و Spec Kit consistency پذیرفته شدند؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md) و [`../specs/002-adopt-phase-04/evidence.md`](../specs/002-adopt-phase-04/evidence.md).

`Phase 04` اکنون `DONE (CLOSED)` است. `F05-B01` تا `F05-B03` پس از review بسته شدند؛ شواهد:
[`logs/phase-05.md`](logs/phase-05.md). `F05-T04` در batch جاری claim شده است.

## Blockerها و تصمیم‌های باز

- [ ] متن و الزامات حقوقی consent/retention پیش از release عمومی Phase 02؛ مدل versioned consent در خود Phase 02 اجباری است.
- [ ] تعیین سرویس SMS/OTP پیش از فعال‌سازی کانال پیامکی در `Phase 08`؛ in-app notification مستقل است.
- [ ] `Phase 09`: policy تجاری `F09-T01` freeze شده است. Amount/formula، نسخه/محیط، redirect،
  callback/date transport، egress IP/domain و credential سداد `SADAD_GO_LIVE_BLOCKED` هستند؛ تا تأیید
  کتبی Sadad enabled/default یا متصل واقعی نمی‌شود و sandbox/inquiry/webhook/refund/partial-refund
  capability ندارد.
- [ ] تعیین provider و policy ویدئو پیش از قابلیت ویدئویی `Phase 10`؛ chat متنی می‌تواند مستقل اجرا شود.
- [ ] تعیین deployment provider، RPO/RTO و secret manager در release planning فاز `Phase 12`.

## یادداشت وضعیت repository در زمان ایجاد این برنامه

- فایل `apps/app/src/components/home/slider-data.ts` دارای تغییر محلی از قبل بوده و متعلق به این برنامه نیست.
- فایل `justforcheck.md` untracked و منبع تحقیق معماری کاربر است.
- Agentها نباید این دو مورد را بدون درخواست صریح کاربر تغییر، حذف یا reset کنند.

CLIENT-INTEGRATION payment follow-up clarification (2026-10-20): owner reports absent wallet method and apparently retained cancelled Home action. Same active F12-FE01, sole /root; bounded write-set Home payment presentation/helper/tests and wallet pay cancellation feedback/browser regression. Read-only owner browser confirms original TOPUP CANCELLED and Home points to a different intent. Preserve Journey priority, TOPUP financial rules and all unrelated work. No real financial writes, backend/schema changes, new batch or final task commit; full task stays REWORK/unchecked.

CLIENT-INTEGRATION payment follow-up review PASS (2026-10-20): same F12-FE01 /root; original TOPUP confirmed cancelled, Home referenced another intent. Exact purpose/amount/multiple-request context and explicit cancellation/Home feedback added; financial rules/Journey priority preserved. Types,17 focused units and2 desktop/mobile intercepted cancellation/advance cases PASS; screenshots reviewed, no actual financial writes. Full task stays REWORK/unchecked; no final task commit/new batch.

CLIENT-INTEGRATION voluntary top-up correction (2026-10-20): owner explicitly rejects funded wallet still being prompted to recharge. Same F12-FE01 /root sole writer; extend bounded scope to PatientJourneyService selection, its existing integration test and contract clarification, app browser regression and evidence. Freeze: voluntary TOPUP stays discoverable/pending but never becomes the Home next required action; genuine non-TOPUP pending payment remains eligible regardless of balance and independently of capped previews. No automatic cancellation, ledger/provider/schema/auth changes. Full task REWORK/unchecked; no new batch/final task commit.

CLIENT-INTEGRATION optional top-up next-action correction PASS (2026-10-20): same F12-FE01 /root. Journey excludes TOPUP only from next-action selection; pending previews/history and all money retained. Actual service payment selected independently of capped previews. API/test/app types,15 isolated PostgreSQL cases/all74 migrations,2 desktop-mobile intercepted cases PASS; live owner Home now shows assessment result. Disposable clone cleaned up; main DB untouched. Evidence Phase12 log; full task REWORK/unchecked, no final task commit/new batch.

CLIENT-INTEGRATION compact personal access rail (2026-10-20): same F12-FE01 /root sole writer, owner requests horizontal scroll for Home personal-access items when space is narrow. Scope Home-only CSS and responsive browser verification; preserve destinations, shared navigation, all pre-existing changes and protected files. Native RTL scrolling, nonshrinking targets, keyboard focus visibility and no whole-page overflow required. Full task REWORK/unchecked, no new batch/final task commit.

CLIENT-INTEGRATION compact access rail PASS (2026-10-20): same F12-FE01 /root. Home personal-access links scroll horizontally in RTL when narrow, share width on desktop; minimum104px targets/snap/thin scrollbar/focus padding. Browser320–1440, six destinations, keyboard last-item reveal and no page overflow PASS; reviewed mobile screenshots. Home-only CSS; full task remains REWORK/unchecked, no final task commit.

CLIENT-INTEGRATION store header polish (2026-10-20): same F12-FE01 /root sole writer. Owner requests clearer cart icon and responsive search hint. Scope public Store header and Store-only CSS; preserve cart destination/count/search behavior and unrelated changes. Verify compact/desktop text fit, icon and clear interaction. Full task REWORK/unchecked; no new batch/final task commit.

CLIENT-INTEGRATION Store header polish PASS (2026-10-20): same F12-FE01 /root. ShoppingCart replaces basket icon, Store placeholder scales12–15px to search width; input remains readable16px.320/390/768/1440 browser text-fit/icon/destination/clear/no-overflow and types PASS; screenshots reviewed. No data/behavior/shared-input change; full task REWORK/unchecked, no final task commit.

CLIENT-INTEGRATION owner-requested checkpoint commits (2026-10-20): reviewed completed session changes committed in related payment/Home/Store groups at owner's explicit request; broader F12-FE01 remains REWORK/unchecked. Final app34 files/178 tests PASS; previous targeted API/consumer/browser evidence retained in Phase12 log. Existing unrelated couples changes and temporary test-results excluded; no push/deploy or next batch.

CLIENT-INTEGRATION Home-aligned Store design (2026-10-21): explicit owner requests creative Store identity aligned with Home, including product cards. Same F12-FE01 /root sole writer/reviewer. Owned public Store catalog, local Store intro/component/card/shortcuts, catalog-only styling and shell route marker if needed; coordinator plan evidence. Freeze Home ice/teal palette, luminous frosted surfaces, existing Persian fonts/real products/prices/search/cart/wishlist/address/banner/personalization/pagination behavior. No fictional offers, backend/schema/dependencies or actual shopping writes. Owner explicitly defers mid-implementation automated tests and reserves final review; no test/typecheck/build/browser regression runs or completion claim during this preview. Full task REWORK/unchecked, no new batch/automatic commit.

CLIENT-INTEGRATION Home-aligned Store IMPLEMENTED_UNVERIFIED (2026-10-21): ice/teal frosted catalog, new decorative glass intro, integrated search/address, soft shortcut cards, image-led real-product cards with exact SKU details action and matched collection/results/states. Same F12-FE01 /root; scoped styles/shell marker preserve Home and checkout; existing backend/handlers retained. Owner review at /store pending, all test/typecheck/build/browser/Graphify gates deferred per request. Evidence Phase12 log. No fabricated data, real writes or automatic commit; full task REWORK/unchecked.

CLIENT-INTEGRATION Store card dimensions (2026-10-21): source implemented square contain-image wells, consistent title/body/footer and responsive2/3/4 rail widths; owner review pending. Upload standard documented in store-product-image-guide.md from actual5MiB/1600/WebP80 processor. No upload/backend/behavior change or execution checks; same F12-FE01 /root, IMPLEMENTED_UNVERIFIED/REWORK/unchecked.

PR27-CI hosted follow-up: owns scripts/test-installation-{postgres,restore}.mjs readiness probes. Hosted restore failed at createdb after socket readiness; use TCP readiness to exclude the image temporary initdb server. No production installer change.

PR27-CI scope follow-up: owns existing dashboard/e2e/phase-11-access.spec.ts. Browser replay exposed removed account-label/manual clinic controls; assert current authenticated navigation and mock authorized clinic lookup before CRM request. Preserve non-ADMIN/revoked-session no-disclosure/no-protected-request assertions.

LANDING OTP FONT (2026-10-25): Owner-requested follow-up on F12-FE01-WEB01, sole /root, same codex/landing-otp-dialog branch. Landing login dialog scoped to app IRANYekanX Regular/Medium; copied asset hashes match. No tests run for font-only refinement. Evidence: logs/phase-12.md#landing-otp-iranyekanx-font.

LANDING OTP SHABNAM FONT (2026-10-25): Owner-requested F12-FE01-WEB01 typography follow-up on codex/landing-otp-dialog. Dialog now uses Shabnam Regular/Medium/Bold; phone field uses tabular Shabnam Medium digits. License and source recorded. Browser preview confirms font loading and scoped styling. Evidence: logs/phase-12.md#landing-otp-shabnam-typography.
LANDING OTP NUMBER CLARITY (2026-10-25): Owner feedback prompted a clearer 22px Shabnam Medium number field; browser preview confirms the font and sizing. Graphify refreshed. Evidence: logs/phase-12.md#landing-otp-number-clarity-follow-up.
LANDING OTP NUMBER WEIGHT (2026-10-25): Phone field now uses Shabnam Bold for its digits per owner request. Evidence: logs/phase-12.md#landing-otp-number-weight-adjustment.
LANDING OTP COUNTRY FIELD (2026-10-25): Outlined legend field, +98 prefix, Persian placeholder and numeric keypad implemented. Handles local 10-digit input and preserves canonical phone submission; English digits explicitly use Shabnam Bold. Web typecheck and Graphify update PASS. Evidence: logs/phase-12.md#landing-otp-country-code-field.
LANDING OTP TYPE STANDARD (2026-10-25): Phone legend 14px, +98 prefix 18px, and placeholder/typed number 20px all use Shabnam Medium. Evidence: logs/phase-12.md#landing-otp-typography-standardization.
LANDING OTP NUMERIC FIELD (2026-10-25): Owner corrective request on F12-FE01-WEB01, same codex/landing-otp-dialog branch. Phone input now strips non-digit characters during typing and paste while accepting ASCII, Persian, and Arabic-Indic digits; Shabnam Medium is explicitly applied to entered digits with default numeric feature substitutions disabled. Web typecheck and git diff check PASS; font cmap confirms all three digit ranges. Graphify AST refreshed with pre-existing extractor warnings. Evidence: logs/phase-12.md#landing-otp-numeric-only-and-shabnam-medium-2026-10-25. Owner visual acceptance remains pending; no real SMS/deploy.

## Object storage provider selection — 2026-10-26

Owner-authorized continuation of CLIENT-INTEGRATION by the existing sole coordinator Codex /root; no parallel worker/new batch. Task F12-FE01-MEDIA01, READY_FOR_OWNER_TEST on codex/object-storage-providers; baseline clean dev. Depends on accepted product-image/banner storage contracts and F12-T06. Frozen contract: one explicitly selected provider per environment (disabled/r2/arvancloud), separate credentials, no automatic fallback or relocation of existing objects; private API-mediated media and production-disabled gate retained. Owned paths: API media adapter/config/tests/smoke script, deployment media wiring/examples/runbook, related plan evidence and generated Graphify output. No schema/OpenAPI/frontend changes. Verification: provider isolation and failure regression, SDK transport roundtrip, API types, deployment checks, Graphify and final diff review. Owner will create Arvan bucket/configure local credentials; real local provider acceptance and dev push/deployment wait for that test. Broader F12-FE01 remains REWORK; no next batch.

MEDIA01 software review PASS: 18 media tests with actual loopback SDK transport, API/source+test types, dev deploy provider/profile/key-rotation regressions, shell syntax, Graphify and diff review. Claim retained for owner bucket/credential setup and real local SDK/dashboard test; no DONE, task commit, push or deployment. Handoff: logs/phase-12.md#object-storage-provider-selection-2026-10-26.

MEDIA01 owner acceptance (2026-10-26): owner reports actual local run and test successful. F12-FE01-MEDIA01 DONE, scoped claim RELEASED; software evidence retained. Task commit now authorized by repository commit gate; no push/deploy. Owner requests next scoped upload-failure recovery correction, to be claimed separately within CLIENT-INTEGRATION.


SADAD MAIN-DOMAIN CALLBACK (2026-10-26): owner-authorized CLIENT-INTEGRATION continuation, sole Codex /root on dev. F12-FE01-PAY01 IN_PROGRESS; no new parallel batch. Baseline clean. Frozen contract: explicit SADAD_RETURN_URL may use merchant main domain independently of PUBLIC_API_URL, exact HTTPS callback path with no credentials/query/fragment; preserve POST/body and existing Verify/idempotency. Owned API callback validation/runtime/tests, dashboard callback display/runtime delivery, deployment proxy examples/runbook/env, installer override preservation, Graphify and plan evidence. Required gates: focused API/dashboard/installer tests, types, real local proxy POST/303 transport and diff review. One final commit per owner request; no live VPS mutation/payment. Broader F12-FE01 remains REWORK.

SADAD MAIN-DOMAIN CALLBACK software review PASS (2026-10-26): F12-FE01-PAY01 DONE (software), sole /root on dev; scoped claim RELEASED. Explicit HTTPS merchant return URL, exact-path Caddy forwarding, dashboard runtime display/delivery and installer override preservation complete. API21/dashboard6 tests, API source/test and dashboard types, lint/build, real Caddy POST/303, installer35 pass/4 gated skips, runtime/dev/release contracts, Graphify and diff review PASS. One owner-requested commit; no push/VPS/deployment/payment. Live activation/error1023 acceptance remains external; next safe action deploy/sadad-live-runbook.md. Broader F12-FE01 REWORK; no next batch. Evidence: logs/phase-12.md#sadad-main-domain-callback--2026-10-26.

SADAD DEPARTURE/RESUME (2026-10-26): owner-authorized F12-FE01-PAY02 IN_PROGRESS, CLIENT-INTEGRATION same sole /root on clean dev. Depends on PAY01 software. Freeze: browser document on configured merchant callback origin before bank navigation, fixed Sadad destination/referrer origin, token fragment/no sensitive server log; resume existing active billing attempt under intent lock instead of creating another bank request, preserve Verify/ownership/financial guards. Owned API billing/payment service/controller/helper/tests, generated OpenAPI/client, directly required reconciliation UI, Caddy/runbook/proxy-browser regressions and plan evidence. Required real PostgreSQL concurrency/ownership/recovery and actual browser Referer tests, types, contract/proxy checks. One final scoped commit; no real payment/VPS mutation/push. Broad F12-FE01 REWORK; no parallel batch.

SADAD DEPARTURE/RESUME review PASS (2026-10-26): F12-FE01-PAY02 DONE (software), sole /root on dev; scoped claim RELEASED. Real merchant-origin HTML/fragment token/fixed bank destination, locked active-attempt resumption and ready-attempt reconciliation complete. API+financial36/SDK12, real Chromium Referer, Caddy callback/start transport, types/build/contracts, Graphify and diff PASS. Disposable PostgreSQL removed; no real financial/VPS writes or push/deploy. One final scoped commit authorized. Next: deploy and add start path to existing root-domain Caddy matcher per runbook; bank1023 acceptance external. Broad F12-FE01 REWORK; no next batch. Evidence: logs/phase-12.md#sadad-merchant-departure-and-pending-attempt-recovery--2026-10-26.

SADAD CALLBACK CASING (2026-10-26): F12-FE01-PAY03 IN_PROGRESS, same CLIENT-INTEGRATION sole /root on clean dev; depends PAY02. Owner runtime evidence confirms POST form OrderId/ResCode/lowercase token and callback422 before Verify. Scope: explicit token/Token compatibility with ambiguity rejection, unchanged numeric bounds/Verify/ownership/idempotency, synthetic actual-HTTP paid topup/replay regression, OpenAPI/client, protocol/runbook and plan evidence/Graphify. No live financial action or copied real callback/card/session values. Required API/PostgreSQL/type/contract gates; one final task commit, no push/VPS/deploy; broad F12-FE01 REWORK.

SADAD CALLBACK CASING review PASS (2026-10-26): F12-FE01-PAY03 DONE (software), sole /root on dev; scoped claim RELEASED. Owner-confirmed lowercase token normalized, Token retained; conflicting/duplicate/malformed inputs rejected. Actual production parser in HTTP callback regression reaches Verify303/result and one wallet credit on replay. API44/SDK12 tests, fresh isolated86 migrations, source/test/consumer types, SDK build, Graphify/diff PASS; temporary DB removed. One scoped commit; no push/deploy/live financial mutation. Next: deploy API and Verify original paid attempt in existing admin reconciliation; bank settlement external. No Caddy/env/schema change; broad F12-FE01 REWORK, no next batch. Evidence: logs/phase-12.md#sadad-live-callback-token-casing--2026-10-26.

CHECKOUT RECOVERY (2026-10-26): F12-FE01-PAY04 IN_PROGRESS, CLIENT-INTEGRATION sole /root on dev, depends PAY03. Owner authorizes same-order retry with immutable accepted price, temporary inventory holds independent of order lifetime, atomic stock reacquisition, safe late-payment compensation and automatic visible-page status refresh. Owned commerce inventory/discount/checkout/order billing, shared billing lifecycle, app payment/cart flows, focused tests and plan/ADR evidence. Preserve Verify, ownership, amount, ledger and double-payment guards. Required isolated PostgreSQL recovery/concurrency/expiry tests, frontend focused checks, API/app types, Graphify and combined review. One final task commit; no push/VPS/deploy/live payment. Broad F12-FE01 remains REWORK; no parallel batch.

CHECKOUT RECOVERY review PASS (2026-10-26): F12-FE01-PAY04 DONE (software), sole /root on dev; scoped claim RELEASED. ADR0043, same-order immutable-price stock reacquisition, non-cancelling stock expiry, detached checkout cart, guarded attempt recovery, late verified compensation and visible quiet polling complete.29 isolated PostgreSQL/14 focused app units/3 intercepted browser cases and API source/test/app types PASS. Graphify/diff review PASS. One final task commit; no push/VPS/live payment. Next: deploy API+app together to dev and perform owner acceptance (no new migration/env/Caddy). Closed historical orders are not reopened; token-bearing uncertain receipts retain reconciliation protection. Broader F12-FE01 stays REWORK/unchecked; no next batch. Evidence: logs/phase-12.md#saved-order-payment-recovery--2026-10-26.

HOME ORDER PROGRESS (2026-10-27): F12-FE01-HOME05 IN_PROGRESS, same CLIENT-INTEGRATION /root continuation, depends PAY04 and existing Home/order tracking. Owner explicitly forbids commits. Freeze: one server-selected verified paid unfulfilled order in existing TRACK_ORDER action (independent of capped unpaid previews); compact real order stepper links to its existing tracking route; no financial/state/schema/DTO changes. Own journey service/projection and focused tests, app Home order card/shared compact OrderProgress/Home styles/helper, related evidence append-only. Preserve all pre-existing clinical/treatment/dashboard/generated-client and governance changes; generated files untouched. Required focused unit/PostgreSQL/browser responsive/navigation checks, types, Graphify/diff. No commit/stage/push/deploy; broader F12-FE01 REWORK.

HOME ORDER PROGRESS review PASS (2026-10-27): F12-FE01-HOME05 DONE (software), same /root scoped claim RELEASED; owner explicitly requests NO COMMIT. Existing Home TRACK_ORDER now independently selects one owned verified-paid unfulfilled order, after urgent appointment/payment actions; compact4-stage card uses actual scoped order read and existing progress renderer, links exact tracking route, handles pickup/dispatch and hides closed states.9 projection+18 app units,1 real PostgreSQL regression with status/ownership/proof/capped-preview checks,2 Chromium cases across320/390/768/1440 and API test/app types PASS; visual/diff/Graphify review PASS. All pre-existing clinical/treatment/dashboard/generated changes preserved; only append to shared governance. No schema/DTO/migration/financial writes, staging/commit/push/deploy. Next owner visual review on local Home; broad F12-FE01 REWORK, no next batch. Evidence: logs/phase-12.md#home-compact-paid-order-progress--2026-10-27.
ASSESSMENT LONG QUESTIONS (2026-10-27): F12-FE01-MZ02 DONE (software), CLIENT-INTEGRATION sole /root on dev; scoped review PASS, claim RELEASED. Main/follow-up and legacy dimension question limit1000→20000 in dashboard/server; structure128→768KiB within installed HTTP1MiB.54 domain+11 dashboard tests and API source/test/dashboard types PASS; Graphify/diff review PASS. No migration/real assessment write/deployment. Evidence: logs/phase-12.md#long-assessment-question-text--2026-10-27. Next: owner local save with longer text; no next batch, broad F12-FE01 remains REWORK.

ASSESSMENT TEXT WHITESPACE (2026-10-27): F12-FE01-MZ03 DONE (software), CLIENT-INTEGRATION sole /root on dev; main review PASS, scoped claim RELEASED. Exact owner57-character sentence passes; reproduced failure for trailing space/newline before fix. Display text now permits surrounding whitespace without changing stored content; blank-only rejection, identifier strictness and length/byte/scoring rules retained.66 focused domain tests/API source+test types/Graphify/diff PASS. Evidence: logs/phase-12.md#assessment-pasted-text-whitespace--2026-10-27. Next owner local save; no deployment or new batch, broad F12-FE01 REWORK.

ASSESSMENT SEQUENTIAL TIES (2026-10-30): F12-FE01-MZ04 IN_PROGRESS; CLIENT-INTEGRATION sole /root. Owner authorizes versioned secondary-tie elimination chains, authoring/runtime/preview and percentage charts. Own assessment domain, dashboard Mizaj, patient wizard/result, generated contracts, focused tests and evidence. Preserve existing fa.json. No deployment; complete verification and review before task commit.

ASSESSMENT SEQUENTIAL TIES (2026-10-30) handoff: F12-FE01-MZ04 REWORK, same sole /root ownership retained. Implementation plus API69/dashboard5/chart2/types/OpenAPI/SDK/390+1440 dashboard browser PASS. Native PostgreSQL unavailable and Docker engine absent; new HTTP integration source unexecuted, full patient-browser save/resume/back gates pending. No DONE/commit/push/deploy/new batch. Exact safe next action and boundaries: logs/phase-12.md#secondary-elimination-and-response-composition-chart--2026-10-30.

MZ04 browser follow-up: patient320/390/1440 dynamic path/reload/back/direct-stop/dependent-answer clearing/revision/idempotency-header/chart/no-overflow PASS; mobile screenshot reviewed. Previous pending patient-browser item superseded. Sole remaining acceptance blocker is unavailable local PostgreSQL; same REWORK task, no DONE/commit/new batch.

MZ04 POSTGRESQL ACCEPTANCE (2026-10-30): F12-FE01-MZ04 DONE/software main review PASS; sole /root claim RELEASED. Owner restored Docker and explicitly forbids commits. Three targeted real HTTP/PostgreSQL cases PASS (new version2 preview, direct+two-step persisted patient lifecycle/replay/privacy/guards, old11+1 compatibility); API test types/diff PASS. Disposable55419 container removed, existing5432 main DB untouched. No blocker, stage/commit/push/deploy or next batch. Evidence: logs/phase-12.md#mz04-postgresql-acceptance--2026-10-30. Broader F12-FE01 REWORK.

ASSESSMENT SIMPLIFICATION (2026-10-30): F12-FE01-MZ05 IN_PROGRESS, CLIENT-INTEGRATION sole /root. Owner-approved plan: ADMIN publication, offering-scoped texts, four free/paid individual/couple modes, comparison results. Preserve entire existing MZ04 worktree and fa.json; no staging/commit per retained owner instruction. Single writer schema/migrations/contracts. First serialized lane: scoped policy storage and exact draft validation; next lanes atomic publication, access/payment, couples, dashboard/app. No live DB/deployment. Required isolated PostgreSQL, domain, contract/types/browser and combined review before DONE.

MZ05 storage handoff (2026-10-30): IN_PROGRESS/unchecked, same /root claim retained; additive offering-scoped policy migration and87-migration populated preservation/independent scope/constraint proof PASS, Prisma/API source types PASS. Full publication/access/payment/couples/UI plan remains unimplemented; exact safe next action: logs/phase-12.md#admin-offering-simplification--storage-foundation--2026-10-30. No final commit/deploy/new batch; existing MZ04 work preserved.

MZ05 continuation: same sole /root claim, inline offering authoring lane; add real endpoint accepting texts and derived identity, atomic offering+scoped documents, dashboard form connection. Preserve legacy endpoints and existing MZ04 changes. Full ADMIN publication/access/couples gates still pending.

MZ05 inline authoring software slice (2026-10-30): IN_PROGRESS, same /root claim. Normal form accepts per-offer texts without manual keys/algorithm/consent refs; real atomic inline endpoint and text snapshot migration connected. All88 migrations,14 actual offering HTTP/PG tests, API source/test + dashboard types, OpenAPI/client build and scoped lint PASS. Full ADMIN publication/access/payment/couples/browser/edit-readback remains pending; see inline authoring continuation in phase12 log. No DONE/commit/deploy/new batch.

MZ05 atomic-source/readback continuation: same /root claim. Extend inline save to atomically publish valid drafts using exact expected hash; expose immutable text snapshots and restore copy-to-new-version. Preserve commercial access guards until explicit ADMIN provenance migration/runtime is complete.

MZ05 atomic-source/readback slice (2026-10-30): IN_PROGRESS, /root claim retained. Transactional saved-DRAFT publication+offering documents, exact hash/replay/rollback and text readback/new-version form implemented.15 full offering PG tests plus2 schema3 version1/2 mode-matrix PG tests, API source/test types and OpenAPI/SDK PASS. Commercial ADMIN publication/access/free/couples/readiness and dirty-state/browser integration remain; no DONE/commit/deploy. See phase12 atomic questionnaire save handoff.

MZ05 ADMIN publication continuation: owner explicitly requests completion, NO STAGE/COMMIT. Same /root; implement explicit retained ADMIN publication evidence separately from legacy physician publications, with exact scoped document/source guards. Never fabricate review records or loosen legacy payment checks.

MZ05 ADMIN publication evidence (2026-10-30): IN_PROGRESS, sole /root retained; actual ADMIN provenance/doc/source/session SQL guards and atomic publication now recorded separately from legacy reviews, response/readiness labels synchronized.89 migrations/17 offering PG tests PASS; no fake review, no stage/commit/deploy. Modern purchase/access/free/couples adapters and end-to-end gates still required; see phase12 explicit ADMIN publication evidence.

MZ05 access continuation (2026-10-30): same sole /root claim, no stage/commit. Implement explicit FREE ADMIN entitlement on existing access grants, with exact offer-scoped real consent, active adult self ownership, no purchase/financial proof fabrication; preserve legacy PAID guards. Block unentitled direct starts for ADMIN-governed questionnaires. Continue remaining paid/couples/UI gates before DONE.

MZ05 individual access continuation (2026-10-30): same /root claim retained, NO STAGE/COMMIT. FREE and PAID ADMIN authority adapters now connect scoped real consent to existing wizard/results and actual shared billing, preserve legacy doctor/financial guards, and block unentitled direct starts. Individual v1/v2 financial/privacy/browser checks passed; broad regression/final checks in progress. Modern couples and final full-plan acceptance remain; see phase12 individual FREE/PAID access handoff. IN_PROGRESS/unchecked, no next batch.

MZ05 required-entry follow-up (2026-10-30): same sole /root claim retained. Editable introduction and explicit start connected; independent entry publication action provided. Offered-source selection rejected before enrollment; enabled entry sources cannot acquire inline offerings. 7 targeted PG/rules + 2 intercepted mobile/desktop checks, API/app/dashboard types and contracts PASS. Nullable introduction migration applied only to disposable proof DB; main/VPS unchanged. Offered-source mandatory consent/access integration remains unsupported; broad MZ05 unchecked. No stage/commit/deploy. Evidence: logs/phase-12.md#mz05-required-entry-introduction-and-supported-source-boundary--2026-10-30.

MZ05 ENTRY DISTRIBUTION (2026-10-31): same sole /root claim. Owner-approved entry/public separation, independent entry pricing, deferred entry reminder, paid retakes. No stage/commit/deploy. Begin serialized server-enforced public visibility lane; do not claim whole plan complete before entry entitlement/payment/UI integration and focused evidence.

MZ05 ENTRY/PUBLIC HANDOFF (2026-10-31): IN_PROGRESS/unchecked, same sole /root claim. Distribution setting, audited admin API/dashboard toggle, modern public guards and acquisition SQL groundwork implemented; 1 focused PG test/API+dashboard types/SDK/diff PASS. New migrations only disposable DB. Full plan remains incomplete: entry origin/tariff/consent/payment, deferral/reminder, retakes/profile, legacy couple visibility and end-to-end gates. See logs/phase-12.md#mz05-entrypublic-distribution-foundation--2026-10-31. No stage/commit/deploy.

MZ05 ENTRY ORIGIN (2026-10-31): same sole /root claim, IN_PROGRESS/unchecked. Owner removes extra entry acceptance. Explicit unique owned entry submission origin, atomic engine binding and same offered questionnaire support implemented; 3 targeted PG cases/API source+dashboard types PASS. Migration only disposable DB. Independent entry payment, deferral/Home reminder and full final gates remain pending. No stage/commit/deploy. Evidence: logs/phase-12.md#mz05-explicit-initial-entry-origin-without-extra-acceptance--2026-10-31.

MZ05 FINAL SOFTWARE ACCEPTANCE (2026-10-31): F12-FE01-MZ05 DONE/software, sole /root review PASS; scoped claim RELEASED. Owner-final entry/public workflow fully connected: independent entry price/text, paid optional deferral and Home resume reminder, actual shared payment proof, entry-only FREE access, paid public retakes, hidden acquisition guards, valid Mizaj profile/history and couple context retakes.109 fresh/upgraded disposable migrations,33 targeted PG/rules tests,16 responsive intercepted browser cases, contracts/SDK/types/diff PASS. No stage/commit/deploy; operational migrations/live PSP acceptance remain deployment work. Broad F12-FE01 remains REWORK. No next batch; stop per owner instruction. Evidence: logs/phase-12.md#mz05-owner-final-entrypublic-workflow-acceptance--2026-10-31.

MARRIAGE SERVICE (2026-11-01): F12-FE01-MZ06 IN_PROGRESS, same CLIENT-INTEGRATION sole /root, owner-approved implementation plan. No stage/commit/push/deploy. Dependencies MZ04/MZ05 DONE. Serialized tasks MZ06-C01 contract, C02 versioned marriage roles/config/interpretation, C03 phone-bound requests/acceptance, C04 explicit durable invitation SMS, C05 runtime/payment/UI/integration acceptance. Single writer assessment offerings/couples/access/purchase, SMS invitation adapter, Prisma additive migrations/schema, OpenAPI/client, dashboard/app assessment/service request surfaces and focused tests; append-only plan evidence. Preserve baseline installer files/ADR0046, app/dashboard AGENTS and web/fa.json. No automatic conversion of legacy versions or writes to primary DB.

MZ06 CONTINUATION (2026-11-02): same sole /root claim IN_PROGRESS/unchecked, no stage/commit/deploy. Offering marriage roles/dashboard, phone requests/verified OTP session proof, app routes/return, legacy linking/educational adapter, SMS queue and role-aware result connected in source. App/dashboard/API+test types, OpenAPI/SDK and2 meaningful actual HTTP/PG tests PASS (future-account/concurrent acceptance and full two-submission/one-wallet-payment/fallback/withdrawal).110 fresh migrations on disposable55419; main DB untouched. SMS/replacement/browser/upgrade and final gates remain, no DONE. Exact safe handoff: logs/phase-12.md#mz06-marriage-requests-continuation--2026-11-02. Preserve installer/ADR0046/AGENTS/fa.json baseline.

MZ06 follow-up2026-11-02: IN_PROGRESS unchanged. Replacement endpoint/app route and retained/clinic/binding SQL guards added.111 fresh migrations +2 focused actual HTTP/PG scenarios PASS together, including replacement/replay and full wallet/two-tests/fallback/withdrawal; publication-boundary3 tests/types/export/SDK PASS. SMS and browser/upgrade/final gates remain. No stage/commit/deploy/new batch. Exact continuation in phase12 MZ06 log.

MZ06 CONTRACT COMMIT GATE (2026-11-02): F12-FE01-MZ06-C01 DONE; isolated documentation review PASS. ADR0047, marriage-service-v1 and user-flow diagram freeze the owner-approved rules; no runtime completion claim. Owner supersedes earlier no-commit instruction only for independently accepted tasks. C02–C05 remain IN_PROGRESS/unchecked under the same sole /root claim; SMS/browser/populated-upgrade/final gates remain. Preserve installer/ADR0046/AGENTS/fa.json baseline. No push/deploy. Evidence: logs/phase-12.md#mz06-c01--contract-and-user-flow-review.

MZ06 SMS REVIEW (2026-11-02): owner requests deep invitation-flow/SMS review, same /root C04/C05 continuation. Explicitly authorizes one real relevant SMS to the supplied test number after checks, no other recipients; destination remains out of governance logs. Installed farazsms1.1.0 README/types/source inspected (npm403, Context7 missing). Add TEXT_SEND/sendSimple through existing adapter and independent invitation mode/sender config; OTP pattern retained. Fix fail-open empty/HTTP-error responses, bounded abortable transport, queued delivery claim timestamps/pinned provider revision/terminal-state evidence. No main migration, fake invitations or provider configuration changes. Local real transport waits for successful review/test gate; provider acceptance is not carrier delivery.

MZ06 SMS REVIEW RESULT (2026-11-02): source/test types and build PASS,12 real-SDK/loopback+OTP cases and5 real HTTP/PG cases PASS on112 fresh migrations. Raw TEXT_SEND and invitation-only sender/mode integrated; OTP unchanged, queue revision pin/lease/recovery/immutability and response failures corrected. One owner-authorized raw test accepted as26604507; owner no arrival, provider reports pending-approval/not-started with zero sent/delivered. No resend/configuration/main migration; only minimized SMS test history/audit written to primary DB. Delivery approval and overall browser/upgrade gates remain; same IN_PROGRESS, no implementation commit/push/deploy. See phase12 SMS review log.

MZ06 FINAL COMMIT/PUSH REVIEW (2026-11-02): owner now explicitly authorizes task-isolated final commits and push to origin/dev; same sole /root claim. Pattern approval/live carrier acceptance deferred by owner as an operational gate, never represented as delivery proof. Complete remaining browser, populated-upgrade and combined review before implementation commits. Preserve unrelated installer/ADR0046/AGENTS/fa.json. No deployment authorized.

MZ06-C02 DONE/software (2026-11-02): sole /root review PASS; Immutable offering JSON now carries two adult semantic roles, editable genders/minimum ages and required generic interpretation; marriage pair identities stay ordered while historical offers retain symmetry. Existing dashboard offering editor handles creation/readback/copy-to-new-version. Runtime interpretation remains the dependent C05 integration boundary; this serialization avoids coupling the authoring commit to request storage. No separate engine or automatic conversion. Three domain boundaries and the complete offering HTTP/PostgreSQL suite PASS within the 58-test final review; dashboard390/1440 real-browser authoring with intercepted HTTP verifies emitted roles, age21 and fallback. Dashboard types/build/scoped ESLint and generated-client checks PASS. Owner authorizes isolated commits and push to origin/dev. Pattern approval/live receipt remain deferred operational work. Same serialized MZ06 batch continues; unrelated installer/AGENTS/fa.json excluded. Evidence: logs/phase-12.md#mz06-c02--accepted-software.

MZ06-C03 DONE/software (2026-11-02): sole /root review PASS; Phone-only requests work before the recipient exists; encrypted/HMAC-bound identity, independent verified-phone sessions, self/foreign-account refusal, atomic acceptance/replacement/cancellation and retained clinic/publication bindings connect to existing couple participation. Requester name is visible only after recipient authentication; own gender/age refusal reason never exposes the other profile. Server rechecks eligibility for payment/access. App discovery/history, consent and login/entry return are connected. Shared request/initial queue storage belongs here; claim/provider pin storage follows only in C04. HTTP/PostgreSQL existing/future-account, no phantom account, wrong phone, minor/gender refusal, corrected profile, concurrent acceptance/replay and replacement PASS. Actual production-built app plus disposable API/PostgreSQL browser create and second-account acceptance PASS. Intercepted390/1440 UI save/reload/replace/cancel/history and entry/login return PASS. OTP persistence and ownership-proof checks PASS; source/test/app types and app build PASS. Populated migration preserves143 old tables (17 populated); final schema drift zero. Owner authorizes isolated commits and push to origin/dev. Pattern approval/live receipt remain deferred operational work. Same serialized MZ06 batch continues; unrelated installer/AGENTS/fa.json excluded. Evidence: logs/phase-12.md#mz06-c03--accepted-software.

MZ06-C04 DONE/software (2026-11-02): sole /root review PASS; Existing Faraz adapter now supports explicit raw text or an independently configured invitation pattern, never changing OTP pattern. Durable pinned-revision queue, explicit send UI,60s/3/10/5 limits, claim leases and terminal uncertainty prevent hidden replay. Production/dev API receive PUBLIC_APP_URL. Approved invitation pattern takes variable link and may use a generic invitation text; no provider configuration was changed automatically. Actual SDK/loopback12 transport+OTP cases and4 actual PostgreSQL/SDK queue cases PASS: concurrent replay, cooldown/quota, cancel/crash recovery, revision pin, late queue claim, independent PATTERN payload and retained OTP. Compose YAML/API-origin wiring PASS. One prior authorized raw test was accepted26604507 but pending-approval/not-started with zero delivery; user explicitly defers approved pattern and carrier acceptance. This task is software-complete, not live-delivery accepted. Owner authorizes isolated commits and push to origin/dev. Pattern approval/live receipt remain deferred operational work. Same serialized MZ06 batch continues; unrelated installer/AGENTS/fa.json excluded. Evidence: logs/phase-12.md#mz06-c04--accepted-software.

MZ06-C05 DONE/software (2026-11-02): sole /root review PASS; Final integration retains one payment/two fresh independent grants and assessments; roles order result text independently of inviter, specific ordered text falls back only for resolved results. Sharing withdrawal stops joint access. All software gates accepted; no deployed marriage service, live pattern or carrier delivery claim. C02/C03/C04 remain separate task commits with their own generated-contract snapshots. 58 targeted tests across9 files PASS (full offering/educational access/OTP contracts, domain, session and SDK/queue suites; two added proof cases independently rerun).112 migrations from empty plus109-to112 populated upgrade PASS;143 retained tables,17 populated, unchanged and zero Prisma diff. Production app/dashboard builds, API source/test/consumer types, SDK drift/build, scoped dashboard ESLint, Compose parsing, Graphify and diff review PASS. Browser: real PostgreSQL/API create/second-person acceptance and real paid joint results with two readable charts390/1440 PASS; auth bootstrap alone supplies disposable sessions. Separate intercepted UI cases exercise explicit SMS, replacement/cancel, reload, self refusal, authoring and return through login/entry. Fixture-only errors in selectors/pagination/auth method were corrected; final browser runs passed. Owner authorizes isolated commits and push to origin/dev. Pattern approval/live receipt remain deferred operational work. Same serialized MZ06 batch continues; unrelated installer/AGENTS/fa.json excluded. Evidence: logs/phase-12.md#mz06-c05--accepted-software.

MZ06 FINAL SOFTWARE ACCEPTANCE (2026-11-02): C01–C05 DONE/software, main review PASS; same /root claim RELEASED. Owner authorizes scoped task commits and origin/dev push. Approved invitation pattern and live receipt deferred to operator; provider acceptance never means delivery. No new batch, primary migration or manual deployment. Next: operator configures an approved invitation pattern and performs one explicit delivery acceptance. Broad F12-FE01 remains REWORK. Evidence: logs/phase-12.md#mz06-c05--accepted-software.

MZ07 IN_PROGRESS (2026-11-02): owner authorizes scoped UX repair and push to dev; sole /root. Own couples entry/legacy history, marriage catalogue/review contract, dashboard defaults/role labels and focused checks. Preserve installer/AGENTS/fa.json. No live invitation, provider send or primary migration.

MZ07 DONE/software (2026-11-02): F12-FE01-MZ07 sole /root review PASS, claim RELEASED. Couples service-first entry/legacy compatibility, clear dashboard defaults/semantic roles, server-filtered catalogue and independent private eligibility review connected. One expanded real PostgreSQL/HTTP test, types/SDK/scoped lint/diff PASS; no migration or provider send. Owner authorizes scoped commit and push to dev. Live browser acceptance and invitation pattern remain operator follow-up. No next batch. Evidence: logs/phase-12.md#f12-fe01-mz07--service-first-couples-navigation.
MZ08 IN_PROGRESS (2026-11-02): sole /root; owner-approved nullable age draft, unified publication validation and save-to-offering guidance. Dashboard-only, no API/DB changes. Targeted tests/types/lint then scoped commit and push dev; preserve unrelated changes.

MZ08 DONE/software (2026-11-02): F12-FE01-MZ08 sole /root review PASS; claim RELEASED. Nullable age drafts, one publication validator with actionable field errors, numeric-only payload and focus after questionnaire save implemented.12 targeted validation/React-render cases, dashboard types/scoped ESLint and Graphify/diff PASS. No API/DB changes; no live publication. Owner authorizes task commit and push dev; no next batch. Evidence: logs/phase-12.md#f12-fe01-mz08--publication-form-validation.

MZ09 DONE (2026-11-03): F12-FE01-MZ09 sole /root review PASS, single-task claim RELEASED. Invitation review/loading bounded; 30s visible pending polling, retained consent/data, Retry-After recovery. 10 targeted tests, app types, scoped lint and intercepted browser lifecycle PASS. No DB/API contract change. Next eligible task MZ10; MZ11 follows MZ10. Broader F12-FE01 unchanged.


MZ10 DONE/software (2026-11-03): F12-FE01-MZ10 sole /root review PASS, single-task claim RELEASED. Invitation-scoped profile/consent/payment/assessment continuation, dedicated OTP login, per-account/per-intent return recovery and accepted-recipient binding connected. Real PostgreSQL HTTP paid two-person flow and ownership checks, 11 targeted units, app/web builds and API/app/web/SDK types PASS. New-code lint PASS; unchanged baseline lint errors documented. No migration, provider send or deployment. Next eligible MZ11; broader F12-FE01 unchanged. Evidence: logs/phase-12.md#f12-fe01-mz10--invitation-scoped-entry.



MZ11 DONE/software (2026-11-03): F12-FE01-MZ11 sole /root review PASS, single-task claim RELEASED. Flat responsive questionnaire, adaptive continuation labels, explicit selection/focus, long consent and readable result legend connected. App build/types/scoped lint, two chart units and local browser scenarios PASS (seven widths, 200% text, five input types, save/resume, duplicate-click and sequential follow-up). No API/schema/scoring change, real SMS/payment or deployment. Approved MZ09-MZ11 scope complete; broader F12-FE01 unchanged. No next batch started. Evidence: logs/phase-12.md#f12-fe01-mz11--responsive-assessment-journey.



MZ12 DONE/software (2026-11-03): F12-FE01-MZ12 sole /root review PASS, single-task claim RELEASED. Final approved journey audit aligned initiator consent with recipient consent: required full text visible, explicit checkbox and mobile touch/focus. Types/scoped lint and focused intercepted-browser consent PASS; no API/schema/payment changes. Approved assessment-journey software scope complete, owner final manual check remains by request. No next batch. Evidence: logs/phase-12.md#f12-fe01-mz12--final-journey-audit.



MZ13 DONE/software (2026-11-03): sole /root review PASS, single-task claim RELEASED. Invitation assessment links retain scope; safe profile return preserves creation/replacement and request destinations, including unchanged/discard/save exits. Four targeted units, app types, scoped lint (zero errors; one unchanged avatar warning) and local profile/entry browser PASS. No API/schema/general entry changes. Next eligible MZ14, then MZ15; neither started.



MZ14 DONE/software (2026-11-03): sole /root review PASS, claim RELEASED. Actionable private phone/SMS/recovery errors, role/consent hints, busy controls and modal cancellation connected.13 targeted units, app types/scoped lint and local browser phone focus/cancel-abort/one cancellation PASS. No API/schema/provider mutation. Next eligible MZ15, not started; overall MZ13-MZ15 goal remains active.



MZ15 DONE/software (2026-11-03): sole /root review PASS, claim RELEASED. Pending-only30s visible/online participation reads, single-flight/cooldown, mutation coordination and quiet state retention implemented.6 loader units plus13 focused regression units, types/scoped lint/app build and local browser seven widths/200%-text/axe/focus/counts PASS. MZ13-MZ15 software plan complete; final manual deployed review remains user-owned; live UX audit Incomplete. No next batch, API/schema/provider action or manual deployment. Evidence: logs/phase-12.md#f12-fe01-mz15--bounded-participation-and-final-review.



MZ16 DONE/software (2026-11-03): sole /root review PASS, claim RELEASED. Requester-only original-destination masked phone/date and independent historical/new purchase consent display delivered. One expanded actual PostgreSQL ownership/privacy/phone-change test, generated contract build, API test/app types, scoped lint/app build and seven-width/200%-text/keyboard/axe local browser PASS. No schema/primary-DB/provider action. Next eligible MZ17, then MZ18; neither started. Evidence: logs/phase-12.md#f12-fe01-mz16--invitation-identity-and-consent-display.



MZ17 DONE/software (2026-11-04): sole /root review PASS, claim RELEASED. Shared-result quiet bounded reads with immediate denial hiding; pre-send numeric range guidance; explicit unsaved app-exit modal and reload warning implemented. Baseline/after local browser, adaptive320/390/1440 regression,6 loader units/types/lint/app build PASS. Native browser Back not certified; limitation recorded per approved plan. No API/schema/scoring/provider change. Next MZ18; not started. Evidence: logs/phase-12.md#f12-fe01-mz17--assessment-continuity.



MZ18 DONE/software (2026-11-04): sole /root review PASS, single-task claim RELEASED. Empty legacy catalogue groups hidden while loading/error/pagination and old access remain; four legacy assessment cost pages show exact toman units. Intercepted production-browser catalogue/purchase seven widths, catalogue200%/keyboard, error/retry/pagination and exact remainder PASS;9 wallet units, app types/build and scoped lint delta PASS (four unchanged baseline findings). MZ16-MZ18 software plan complete; deployed manual acceptance remains pending and native Back limitation from MZ17 remains. No next task selected. Evidence: logs/phase-12.md#f12-fe01-mz18--catalogue-and-cost-clarity.




MZ19 DONE/software (2026-11-04): sole /root review PASS; single-task claim RELEASED. Follow-up to MZ17 native Back limitation implemented with document-scoped history positions, capture rollback and exact destination replay; no sentinel entries/auto-save. Stay/save/discard, Forward, busy Back, failed save, final submit and native cross-document warning PASS in local Chromium dev and production. Existing MZ17 regression/types/build/lint delta PASS. Previous native same-document Back limitation is superseded for tested scenarios; physical mobile/Safari/Firefox and final online acceptance remain unverified. No API/schema/provider action or next task selected. Evidence: logs/phase-12.md#f12-fe01-mz19--native-assessment-history-guard.


VP01 DONE/software: sole /root review PASS, single-task claim RELEASED. Flow-based dock/actual-height reservation, one bounded content scroller, safe-area frame and scalable nav labels. Local baseline overlap reproduced; eight-size/200%-text/end-action production-browser, types/lint/build and MZ17/MZ19 regressions PASS. Exact Android device report and physical iOS/Android unverified. Next eligible VP02 (keyboard/action footer), then VP03 (installation); neither implemented.


VP02 DONE/software (2026-11-04): sole /root review PASS, claim RELEASED. Shared visible viewport/keyboard observer, action/overlay portals, dynamic sheet/chat height, transparent nav outer backing and removal of frame paint implemented. Desktop resize false-positive fixed. Injected viewport + touch fallback production-browser, eight-size shell/cart, zoom/text200%, saved-answer/history regressions, types/build and scoped lint delta PASS. Physical iOS/Android/real browser chrome remain unverified. Next eligible VP03 (standalone/install), not started.


VP04 DONE/software (2026-11-04): sole /root review PASS, claim RELEASED. Removed nested dock glass/blur/shadow and moved home gradient to frame for continuous backing. Supplied screenshot + local baseline/after production interactions/seven widths/44px nav targets, existing shell regression/types/build PASS. Full UX Audit verdict Incomplete: authenticated live connection unavailable, no live gates/perf/axe certification. VP03 explicitly DEFERRED by user; no install work. Remaining: live home journey error diagnosis and real-device acceptance.


VP05 DONE/software (2026-11-04): sole /root review PASS, claim RELEASED. User correction supersedes VP04 dock-removal choice. Original rounded glass restored; nav-only footer overlaps page transparently instead of reserving a flat full-width band, with measured scroll/focus clearance. Action-bar footers remain normal flow. Local dev+production home/nav/shell, viewport keyboard/cart/product regression, types/build PASS. Live/device audit remains unverified; VP03 deferred.


AH01 DONE/software (2026-11-04): sole /root review PASS, single-task claim RELEASED. Additive status/direction marriage-list filter, state-aware assessment history helper and regenerated OpenAPI/client ready. Expanded actual disposable PostgreSQL older-pending/ownership/verified-phone/clinic/privacy and invalid-query test PASS; API/test/app types and generated client build PASS. No page UI change yet. Next eligible AH02: implement approved action-first assessment UI, preserving exact invitation context and legacy records. VP03 remains deferred.


AH02 DONE/software (2026-11-04): sole /root review PASS, claim RELEASED. Approved action-first assessment hub connected to real pending/ongoing/catalogue/history/purchase reads, two URL-driven tabs, scoped styles and legacy access. Exact owned marriage context added to history projection; OpenAPI/client regenerated. Unit projection/API test types/client build, app types/lint/build, production hub/catalogue and dev history/continuity browser PASS. Live/device audit remains unverified. No next task selected; installation deferred.


AH03 DONE/software (2026-11-04): sole /root review PASS, claim RELEASED. Assessment hub initial/Suspense/tab text loaders replaced with invite/card/row skeletons using existing shimmer and reduced-motion primitive. Screen-reader-only status retained; shared error/retry untouched. Held-response dev+production skeleton/error/retry/seven-width/reduced-motion and hub browser, types/lint/build PASS. No API/other-page changes or live/device certification. No next task selected.

AH04 DONE/software (2026-11-04): sole /root review PASS, single-task claim RELEASED. EvilCharts-adapted full radial result and semi home chart, saved-score percentages, muted animated skeleton and reduced-motion support delivered with installed Recharts2; no dependency/API/scoring change. Eight units, app types/build, scoped lint delta and local dev+production seven-width/zero/loading/200%-text/reduced-motion browser PASS. Online/physical-device acceptance unverified. No next task selected.

PR01 DONE/software (2026-11-05): sole /root review PASS, single-task claim RELEASED. Profile card preserved; home shortcut and card share medical summary, redundant lower medical entries removed, readable saved health/optional data and medical edit-return delivered. Local dev+production interaction/empty/error/retry, four-route seven-width/text200/axe, types/build/scoped lint delta PASS. Live baseline read-only observed; exhaustive UX Audit remains Incomplete and deployed/device final acceptance unverified. No next batch selected.

PR02 DONE/software (2026-11-05): sole /root review PASS, claim RELEASED. Database Decimal weight normalized before global serialization; first-step health validation scoped and save errors navigate to correct step. Actual Prisma Decimal/class-transformer2 tests, intake4 tests, app/API types and scoped lint delta PASS. No DB/API-schema/SDK change, no actual patient write. Live browser re-edit remains manual; next batch none.

ST01 DONE/software (2026-11-05): sole /root review PASS, claim RELEASED. Store header logo removed, brand text/store title retained; app types and scoped lint delta PASS. No next batch.

AN01 DONE/software (2026-11-06): F12-FE01-AN01, ANALYTICS-01 sole /root review PASS, claim RELEASED. Shared opt-in/disabled-by-default GA4 browser foundation, logical routes and explicit landing CTA dispatch; original analytics plan unchanged. Five unit cases, Chromium SDK transport test, both frontend types/production builds, SDK build and two runtime regression scripts PASS. No API/DB/browser-history archive or live GA4 activation. Original checkout product change untouched. Next eligible AN02 (semantic app/commerce events and attribution), not started per per-task commit boundary. AN03/AN04 dependent/unstarted. Evidence: logs/phase-12.md#analytics-an01-browser-foundation.

AN02 DONE/software (2026-11-06): F12-FE01-AN02 / ANALYTICS-02 sole /root review PASS; claim RELEASED. Browser-only CTA/campaign handoff to configured app origin, property-scoped optional GA IDs, TTL/cleanup, origin-only referral, active engagement/CTA impressions/internal navigation and registered request outcomes/public commerce metadata. 10 pure tests, 3 Chromium SDK transport/journey cases and25 existing frontend API/auth/cart cases PASS; both frontend types/production builds PASS. No extra application API requests, schema/database writes or actual GA4 activation. Next eligible AN03: confirmed server conversions and bounded Outbox; not started. Original plan unchanged; live property and full product acceptance remain AN04. Evidence: logs/phase-12.md#analytics-an02-behavior-and-attribution.

AN03 DONE/software (2026-11-06): F12-FE01-AN03 / ANALYTICS-03 sole /root review PASS; claim RELEASED. Confirmed conversions, partitioned existing Outbox, bounded retries/cleanup and private opt-in configuration. Owner chose financial-only refunds after short context expiry. Isolated PostgreSQL settlement/queue, protocol/loopback transport, browser transport, contracts/types/builds PASS. No schema/new service, real property activation, push or deployment. Next eligible AN04 integration/browser/operator acceptance, not started under per-task boundary. Full evidence: logs/phase-12.md#analytics-an03-authoritative-conversions.

AN04 DONE/software (2026-11-06): F12-FE01-AN04 / ANALYTICS-04 sole /root review PASS; claim RELEASED. Owner-approved software/operational split. Existing loader real Dev DebugView/Realtime receipt and raw-URL duplicate correction verified; secure Dev-only installer hidden-secret setup/panel, optional debug, environment audit and runtime/secret rotation detection complete. Windows installer61 cases (8 skips), Linux69 (6 dependency skips), Dev sync contract,12 API tests/five Chromium/runtime private-secret tests, types/builds/diff/Graphify PASS. Local task commit/push/PR to dev authorized. No merge/deployment. Next eligible AN05: post-merge Dev secret/domain/actual server receipt/policy sign-off; not started. Evidence logs/phase-12.md#analytics-an04-software-publication-gate.

AN04 SOFTWARE PUBLICATION AUTHORIZED (2026-11-06): owner explicitly accepted adding secure Dev installer setup and separating software readiness from post-merge operational acceptance, then pushing this branch and opening a PR to dev. Same ANALYTICS-04 sole /root claim now also owns installation manager/tests/README/bundle allowlist. Finish AN04 software with reviewed installer tests and current analytics evidence; record remaining real VPS/server-secret/receipt/domain/policy acceptance as dependent AN05, unchecked. No merge or actual server deployment is authorized yet. Preserve all existing AN04 changes; no unrelated files.

AN04 CI REWORK (2026-11-06): F12-FE01-AN04 same PR36, sole /root corrective claim ANALYTICS-04-CI. Clean baseline492672d. CI129 fails on production joi GHSA-4528-x5fx-h6hg (<18.3.1) and existing dashboard MizajChart render-time offset reassignment. Own only targeted dependency/lock update, chart correction, focused validation and plan evidence. No rule weakening, merge/deployment or AN05 work. Gate: reproduce relevant failures, production audit, workspace lint, API validation/types, dashboard build/types, hosted checks.

AN04 CI FOLLOW-UP (2026-11-06): same sole /root corrective batch split by independent failure boundary. F12-FE01-AN04-CI01 DONE/local review PASS: dashboard pure offsets and joi18.3.1 package/targeted lock repair; frozen install, lint, production high/critical audit,12 API tests/API test types, dashboard types/build and5 authoring tests, diff/Graphify PASS. F12-FE01-AN04-CI02 remains BLOCKED for full PR acceptance: every pinned Distroless Debian13 image reports zlib1g CVE-2026-76844 HIGH, no fixed stable package in scan/Debian repository. No waiver/base-image architecture switch implemented. Current image package confirmed locally; latest remote manifest check returned403. Push CI01 correction authorized; retain CI02 claim for owner-approved/upstream resolution, no merge/deploy or AN05.

AN04-CI02 RESUMED (2026-11-06): owner explicitly authorizes continuing runtime remediation on codex/analytics-ga4/PR36, including the smallest verified compatible base-image correction while keeping security gates. Sole /root; clean baseline63da084. Own Docker runtime definitions, targeted artifact/smoke contracts, ADR/evidence/status; no unrelated app data/logic or Production deployment. First establish official patch coverage and scanner-visible package provenance; do not assume sid packages or a newer tag fixes stable Debian metadata.

AN04-CI02-D01 DONE (2026-11-06): owner explicitly supersedes the previous no-suspension instruction and stops runtime remediation for now. Sole /root review PASS; temporary PR runtime-image scan/report upload disabled through RUNTIME_IMAGE_SCAN_ENABLED=false; image build/smoke and dependency checks remain active. CI02 remains unresolved/DEFERRED; its active remediation claim is released. No runtime/base-image change, merge or deployment. Workflow actionlint and release contracts in an isolated LF checkout PASS; local CRLF shell parsing limitation recorded. Same-branch commit/push and replacement PR to dev authorized. Evidence: logs/phase-12.md#analytics-runtime-scan-temporary-suspension. Other CI130 API test failures remain unresolved; no green-PR claim. No next implementation batch.
