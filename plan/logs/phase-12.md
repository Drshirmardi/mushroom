# Phase 12 Execution Evidence

## Patient entry final correction and primary migration (2026-10-24)

Same F12-FE01 CLIENT-INTEGRATION corrective slice, sole /root on `codex/patient-entry-flow`. Owner explicitly authorized fixing review findings, clearing startup blockers and migrating the configured primary database. This entry supersedes the earlier IMPLEMENTED_UNVERIFIED/profile-cutoff proposal below. Scope review PASS; slice READY_FOR_OWNER_TEST. Broader F12-FE01 stays REWORK/unchecked, no new task/batch or completion commit.

Corrections:

- Mandatory names, profile gender and birth date apply to every incomplete account, independently of assessment configuration. Removed the proposed profile cutoff from final schema while preserving the existing assessment cohort cutoff.
- Profile-only completion is persisted, so later assessment activation does not reopen completed registration. An existing started/completed assessment permits missing-demographic repair without discarding its pinned source, answers, submission or completion timestamp.
- Patient and policy transaction locks serialize conflicting entry/policy changes. Forward SQL guards retain same-clinic ownership, exact free submission binding, completed/valid submission checks and immutable terminal bindings while allowing demographic correction. Consent/intake remain separate.
- Corrected occupied-window TypeScript shape and explicit numeric Swagger pagination metadata in scheduling; regenerated the affected runtime-derived client contracts and corrected the stale pagination test expectation. No scheduling business rule changed.
- Profile UI requires gender, prefills saved values and displays one or three steps according to the actual assessment requirement. Existing gate, result persistence and recommendation engines remain authoritative. Review covered endpoint boundaries, source pinning, labelled controls and unrelated/protected changes.

Verification:

- API production emit, full API types/test types, patient/dashboard/web types: PASS. Prisma generate and SDK build/typecheck/parity: PASS.
- Fresh disposable PostgreSQL16 database: all81 migrations and seed deployed; entry integration12/12 PASS, including legacy repair, concurrent profile save/start, durable completion, SQL bypass rejection, source pinning, owner authorization and consent isolation. Disposable database removed afterward.
- Targeted API rules/Home journey/availability authorization11/11; app Persian date/Home status/directory9/9; SDK12/12: PASS.
- Chromium synthetic intercepted API journeys at390px and1440px: profile-only to Home and required assessment through saved result to Home,4/4 PASS. Required-gender disabling, payload fields, overflow and JS errors checked. These browser fixtures do not write main patient data or substitute for the owner's real manual acceptance.
- Actual root `pnpm dev` launched API and all three frontends. API live/ready/chat, web3000, patient3001/welcome and dashboard3002 all HTTP200. Owned smoke processes stopped, ports3000–3003 released and dev lock removed. Windows Turbo shutdown required terminating its verified owned child tree after Ctrl+C stalled; root cleanup then completed. Chat containers restored to their pre-smoke running state; main PostgreSQL remained running.
- Graphify update completed; optional SQL/Erlang/HCL and existing chat parser warnings only. Final diff whitespace review PASS.

Primary migration:

- Validated custom-format backup: `C:/Users/R3dPi/AppData/Local/Mushroom/Backups/patient-entry-before-20261024-bfb8efbc.dump` (963822 bytes). Aggregate row fingerprints/counts retained beside it; no patient data placed in repository evidence.
- Restored populated backup to a random temporary database and applied both forward migrations. No schema drift or user/profile/entry/submission/Mezaj fingerprint changes; clone dropped.
- Applied `20261024100000_patient_entry_profile_cutoff` and corrective `20261024110000_patient_entry_completion` via Prisma migrate deploy to the owner's configured `localhost:5432/sabz_zendegi`. Applied migration history preserved. All81 migrations current; Prisma schema diff reports no differences. Primary user, patient/user profile, entry, assessment submission and Mezaj data fingerprints/counts match the premigration snapshot.
- No real assessment policy enabled, no patient answers/results altered, no seed on primary. Normal browser authentication refresh during startup may rotate sessions.

Handoff: feature files remain uncommitted for owner review. From repository root run `pnpm dev`, open patient app at `http://localhost:3001`, and test an incomplete existing account plus a fresh account without an assessment. For the required-assessment journey, the owner can select a published supported assessment in dashboard entry settings and use a fresh account; verify resume, saved result and Home transition. No additional roadmap batch started.

## Patient entry corrective slice — IMPLEMENTED_UNVERIFIED (2026-10-24)

Owner-authorized continuation of the existing `F12-FE01` CLIENT-INTEGRATION task on `codex/patient-entry-flow`; SpecKit package: `specs/011-patient-entry-flow/`. Source review confirmed that a disabled/missing assessment policy bypassed all entry, the profile form omitted gender, and unavailable assessment state could precede profile collection. The correction adds immutable `profileEnforcedFrom` independent of assessment `enforcedFrom`, requires name/surname/profile gender/birth date for the new cohort regardless of assessment configuration, then follows the existing exact-version assessment/result flow only when required. It preserves separate medical-intake `sexAtBirth`/consent and reuses patient-owned assessment/Mezaj recommendation records. The migration seeds the cutoff for existing clinics and supplies defaults/fallbacks for future policy/clinic rows; no live policy/source activation or patient mutation was performed.

Verification: fresh disposable PostgreSQL migration and patient-entry integration harness → PASS (7/7); pure entry boundary rules → PASS (3/3); API client generated-contract parity/typecheck/build → PASS; API build/typecheck both encounter pre-existing `patient-availability.service.ts:88` errors; app typecheck encounters pre-existing `directory-api.ts:38` pagination-contract errors and no errors in changed entry files. No browser journey was run. `graphify update .` completed; its existing optional SQL/Erlang/HCL extractors and one unrelated chat parser warning were reported. `git diff --check` → PASS. The slice remains `IMPLEMENTED_UNVERIFIED`; `F12-FE01` remains REWORK/unchecked. Safe next action: clear the unrelated workspace type errors and run scoped browser acceptance, then review/commit this isolated branch slice.

## Bottom-sheet handle focus correction (2026-10-22)

F12-FE01 / CLIENT-INTEGRATION, owner-authorized continuation, sole /root. Clean baseline; source review traced native showModal autofocus to the first wide handle button and shared teal focus-visible outline. Add a scoped handle class, suppress its outer outline/touch highlight and put the keyboard focus indicator on its40px grip instead. Keep44px touch target, accessible close label, keyboard click, native modal focus handling and existing pointer/drag callbacks. All shared BottomSheet callers inherit the correction; no financial, notification or API behavior change.

Scoped live Chromium verification on actual local Home notification sheet at390×844: button width168px has outline none, tap highlight transparent, no horizontal overflow; keyboard Tab/Shift+Tab gives grip-only solid2px outline while button remains unoutlined. Escape closes after existing exit animation and restores focus to notification trigger. Main-agent diff/whitespace review PASS. Real Safari/iPhone and full browser matrix not run; no full build, new tests, graph rebuild, commit or deployment. Small presentation-only correction; overall F12-FE01 remains REWORK/unchecked.

## Owner-requested initial entry and Home checkpoint (2026-10-21)

Owner explicitly requests committing all remaining changes. One cohesive F12-FE01 checkpoint includes required initial entry and dashboard source selection, Home status/pending-action projection, related retained medical onboarding UI, both additive migrations, generated API contracts, focused test sources, ADR0038 and coordinator evidence. These changes share authentication, Journey and generated contracts and are saved atomically rather than leaving an intermediate incompatible checkout. Prior uncommitted statements below are historical.

Main-agent working-tree/staged scope and whitespace review completed; no unrelated files or protected slider-data.ts/justforcheck.md included. Retain final previously recorded verification: 17 focused units and6 isolated PostgreSQL integration cases PASS, all79 migrations deploy to disposable database, App/API typechecks PASS, synthetic mobile/desktop entry flow reviewed. Dashboard whole-project typecheck retains documented pre-existing errors; broad build/clinical/provider/Graphify acceptance remains deferred. This is an owner-requested checkpoint, not a completed-task acceptance commit: F12-FE01 remains REWORK/unchecked. No further test repetition, real policy activation, patient mutation, push, deployment or new batch performed for this commit.

## Required initial patient entry — owner implementation (2026-10-21)

Task F12-FE01 / CLIENT-INTEGRATION /root, same continuation; ADR0038 records explicit owner change replacing initial medical onboarding with basic details plus designated assessment. Existing uncommitted Home/status work remains; no automatic commit. Main-agent source/contract review completed; overall production task stays REWORK/unchecked for owner review and broader outstanding acceptance.

Implementation: new patient entry policy/progress Prisma models and local migrations20261021150000 and20261021151000 (both applied successfully; deployed initial migration content retained). Basic DOB snapshot stored separately; first/last names reuse UserProfile. Medical intake/revision/consent and booking controls remain independent. ADMIN assessment-policy tab «ورود اولیه» selects a specific same-clinic fa-IR published noncommercial source, rejects draft/schema2/paid sources, uses expectedRevision and transactional audit. First enable stamps immutable account-enrollment cutoff; existing accounts remain usable and disabled policies release enforcement. Changing selection preserves started source; retired started assessments resume; deleted/unavailable source has explicit retry UI and ADMIN can disable even after retirement. No actual policy or source selection activated by agent.

New entry service/controller/global guard enforces authenticated private patient resources after existing authentication/authorization guards. Auth/entry endpoints and exact bound submission GET/questionnaire/result/provenance/save/submit only are allowed while required. Other private app resources and arbitrary assessment starts/other patients' submissions rejected. Same existing engine owns saved revisions/idempotent submit; entry start serializes per patient and reuses saved engine attempt. Entry acknowledgement verifies owned noninvalidated COMPLETE submission under lock, then freezes completed entry; ambiguity is not a reason to demand a different clinical result. Patient/clinic/source binding and terminal completion protected in SQL; metadata audit contains policy identity/revision but never birth date/answers. Public anonymous catalog/dashboard roles unchanged.

App root gate resolves status before rendering authenticated app content; direct Store/Home/profile navigation redirects to /welcome, with no bottom navigation. New three-stage view uses local IRANYekanX, existing transparent decorative brain, ice glass surfaces, named controls and one primary action. Date selectors display Persian calendar and persist validated Gregorian date via runtime Intl matching, including leap-day checks. Existing wizard embedded entry mode has no outward exit/header links, resumes first unanswered question and focuses each new question; ordinary routes retain normal behavior. Result displays only real stored authored summary/tendencies/notes; neutral review/unavailable cases supported. Explicit enter-Home calls verified completion; Home never reintroduces medical setup tracker and labels basic information without claiming medical intake complete. Journey prefers latest matching initial assessment key for enrolled users. Existing medical form remains separate. OpenAPI/client additions generated from live source metadata and merged without unrelated API drift; Prisma/client declarations generated for local runtime.

Final checks:17 focused units (API entry-boundary2 + retained Home projection8; App Persian calendar3 + result-summary4) PASS. API/App tsc noEmit PASS. Whole dashboard tsc FAIL on pre-existing untouched revenue-panel BigInt/ES2017, old assessment-builder FOLLOW_UP label keys, legacy number/Object query contracts; new entry tab/wrappers produce no reported diagnostics. Not claimed as full dashboard acceptance.

Real isolated PostgreSQL harness test/patient-entry-verify.mjs creates unique loopback-only temporary DB, applies all79 migrations, seeds without developer dashboard credentials, runs6 API integration cases and cleans DB in finally. All6 PASS: anonymous/DOCTOR policy denial/draft rejection; new cohort private gating vs old accounts; no medical intake or consent creation; invalid DOB and concurrent same-attempt start; other-submission denial/server COMPLETE requirement/idempotent acknowledgement/real Journey after completion; pinned source across selection change; unavailable retired source and successful ADMIN disable. Early harness environment/package-path issues corrected; actual disable upsert issue fixed by choosing explicit UPDATE after policy lock rather than native INSERT-trigger upsert. Final successful isolated run exits0; no application data touched.

Browser UI checks use clearly synthetic intercepted entry/assessment responses only: direct /store redirects /welcome;360/768/1440 no document overflow; two name inputs plus three Persian calendar selectors; no bottom navigation or save-and-exit during quiz; question focus verified; profile→start→answer/save/submit→result→Home passes and no Home setup tracker remains. All route fixtures removed, live Home restored. Screenshots visually inspected: .playwright-mcp/entry-profile-mobile.png, entry-profile-desktop.png and entry-result-mobile-preview.png (explicitly labeled test result content). No real patient response, consent, payment, published questionnaire, role or policy mutation. Broader clinical/provider/full app build/Graphify acceptance remains deferred; no push/commit.

## Home setup/status/actions — owner implementation (2026-10-21)

Task F12-FE01 / CLIENT-INTEGRATION, same /root sole writer/reviewer; remains REWORK/unchecked for broader acceptance. Owner first requested committing all pending work: b93b3be assessment checkpoint,3103f37 Home/Store/frame fixes,109f243 evidence; clean worktree confirmed before this feature. New feature is deliberately uncommitted for review.

Contract: initial steps PROFILE (first/last name,birth date,sex at birth), HEALTH (declarations and active consent; optional lifestyle remains optional), CONFIRM (server finalization). No localStorage completion flag or inferred completion. Once onboarding.isComplete true, setup UI disappears and same brain/glass hero becomes profile/latest-assessment status. Latest readable non-invalidated completed source selected independently of history caps; actual result fetched through existing audited self-only result endpoint. Educational profile/band only, unresolved/review status respected, no medical score or clinical approval invented. No result yields neutral completed-profile message. Result error does not revert to setup. New Home actions are ordered representative pending categories (one selected resource per category, not all records): appointment,payment,unused paid grant,resumable assessment,couple,custom request,booking requirements,ACTIVE treatment,pending order,pending couple link. Three initially visible, expand remainder; complete results/COMPLETED plans/readable program content/voluntary TOPUP excluded. Selected order/couple duplication suppressed. Complete lists remain existing destinations; categories may remain actionable while their underlying ongoing resource is ACTIVE.

Owned implementation: patient Journey DTO/service/new home-journey.projection; couple delivery internal Home selection reuses same scoped/private SQL and selects pending independently of capped history; API OpenAPI/client schemas; Home page/new home-journey component and home-status helper; Home-scoped CSS; onboarding form now actually3 steps, saved-state resume/review and Home-origin return. Existing save/consent/revision/completion endpoints/guards remain. Legacy nextAction intentionally preserved for other consumers. Corrected summary resumeAvailable for terminal DELETED source to match existing command boundary. No migration/schema/dependency/actual patient answer, consent, payment or publication mutations. Scope extension into related onboarding/couple selector is necessary for consistent displayed steps and pending selection.

Context7 official React effect cleanup documentation consulted; existing identity-keyed usePatientResource generation guard reused; Home refresh on visible/BFCache return; accessibility and existing glass/RTL/IRANYekan rules retained. OpenAPI obtained from running current API DTO metadata then merged only Journey additions into prior contract (runtime documentation also contains unrelated pre-existing discount/ordering drift, excluded from this change). Client source generated and ignored dist declarations emitted with noCheck for local consumer use; no app production build.

Final scoped checks: API home-journey.projection8 unit cases PASS (authoritative completion, basic/consent blockers, completed-content exclusion, TOPUP exclusion, exact selectors/integer money, order/couple deduplication, no duplicate onboarding blocker); App home-status4 units PASS (tie/review/real title/legacy fallback). App tsc --noEmit --incremental false exited0; API same type command completed without diagnostics. Source whitespace review PASS. Actual Home GET/render shows correct persisted missing-basic stage;360/768/1440 frame widths360/720/1120,3 steps, loaded intact brain and no document horizontal overflow. Browser-only intercepted completion fixtures: setup hidden and no pending section when empty; pending action below status hero at360/1440 with no horizontal overflow;503 retains brain/error hero and no false setup. Fixtures removed and live Home restored. Actual onboarding navigation has exactly3 labeled steps; review opens read-only without saving. Screenshots .playwright-mcp/home-setup-mobile.png and home-setup-desktop.png visually inspected. No isolated PostgreSQL/full application regression/build/Graphify; new SQL selection exercised by actual Home read, but full concurrency/privacy/provider acceptance remains deferred. No claims of real end-to-end medical completion.

## Owner checkpoint before Home onboarding/status split (2026-10-21)

Explicit owner request saves all pre-existing uncommitted work before the new Home feature. b93b3be checkpoints adaptive assessment API/authoring/patient result/retained-result deletion and their source tests/contracts/ADRs; prior migrations already applied as documented. Home notification removal/shared responsive frames/Store cart refresh and badge styling checkpointed separately. Source diff/whitespace review only; no new assessment tests/types/build or acceptance claimed. Existing scoped responsive browser evidence remains in its entry. F12-FE01 REWORK/unchecked, no push. This documentation checkpoint saves outstanding status/phase evidence; new Home implementation starts afterward.

## Shared Home, Store and Product frame — scoped responsive correction (2026-10-21)

Same F12-FE01 / CLIENT-INTEGRATION /root continuation, owner-requested responsive alignment supersedes Product480px preview. globals.css now supplies a shared frame cap variable:720px below viewport1024,1120px from1024, inherited by Store purchase/cart bars. Removed independent Store768 expansion and Product480 cap. Earlier removal of Product desktop two-column override remains; sticky image and vertical details panel retained. Obsolete Product shell modifier removed. Unrelated assessment/API/generated edits preserved.

Owner explicitly requested comparison at different widths, authorizing this scoped browser geometry check: at viewports360/768/900/1024/1440, all three route frames measured360/720/720/1024/1120 respectively, same centered offsets0/24/90/0/160 and no document horizontal overflow. Actual loaded Product purchase bar matches frame;360px panel display:block, gallery sticky, scrollTop150 accepted, scrollable true, no panel horizontal overflow. Source whitespace review passed. No broader functional tests/types/build/Graphify or clinical/financial writes; no commit/DONE. Overall task stays REWORK/unchecked.

## F12-T06-S1 — local real R2 product media acceptance

Completed/reviewed: 2026-10-14 UTC; batch F12-MEDIA-S01; coordinator/reviewer Codex /root, one agent. Baseline front / e49e615eac1a18cd045121c4695d534d3fd41a26, initially clean. Dependencies backend44d472e/dashboarde49e615 accepted. Explicit owner authorization covers disposable local development CRUD in dev-sabz only; ADR-0015 and frozen-contract addenda record this subsequent permission without rewriting historical release decisions. No Phase04C, deployment, bucket configuration or production activation.

### Environment and credentials

- Existing Docker sabz-zendegi-postgres-1 / PostgreSQL16.14 at localhost5432 retained. Original development database had35 migrations and lacked the media migration; it was never migrated, reset or seeded. Created only mushroom_r2_smoke_1065e55bc20f, deployed all36 existing migrations and ran existing development seed there. Used the owner-provided synthetic admin identity only in that disposable database.
- Existing API dev command ran on127.0.0.1:3003; existing Dashboard Next dev command with --hostname127.0.0.1 --webpack on3002. API live/ready and Dashboard/store returned200. Process-local overlay selected scratch DATABASE_URL, development mode and disabled SMS/payment transports; no tracked default activation changed.
- R2 keys already existed in ignored/untracked apps/api/.env; validated endpoint/account, bucketdev-sabz, regionauto and moder2 without displaying keys. Dashboard environment contained no R2 credentials. Task overlay and fixtures were also ignored/untracked; no secret entered tracked config, clients or browser. Credentials were passed in memory, never extracted into stdout.
- Existing R2ProductImageStorage initialized successfully; DNS/TCP443/TLS and SDK HeadBucket returned200. Real put/read/delete proved the credentials' required operations on dev-sabz. Exclusive token-policy scope beyond this bucket was not inspected, and no other bucket was accessed.
- Owner attested Public Development URL and every Custom Domain disabled. Unsigned path-style and virtual-host S3 requests returned400 InvalidArgument while a task object existed; no anonymous bytes were returned. This is the observed response, not a claimed403 or independent Cloudflare control-plane privacy audit. No public access/settings were enabled or modified.

### Real browser/application evidence

Playwright MCP removed previous mock routes and used the actual local Dashboard, API and R2. Product09b2057e-e55f-4d81-b9f3-9aafe18e30e5 / r2-smoke-1065e55bc20f was created through the Dashboard in the synthetic development clinic.

1. Uppy uploaded a2,886,499-byte1200×800 PNG through the editor; PUT200, imagec3feefb9-4b95-42b1-b227-d88cd59adefe and matching quoted ETag. Persisted image READY; existing adapter HeadObject200 and read matched Prisma size658,188. Sharp outputWebP1200×800 without EXIF/ICC/XMP. Authenticated preview200 matched the R2 SHA-256 04268832ff67e5a065e67e76c2bb6db1703eb70bc77fc4c1a4c753ace43f1bc3.
2. Draft public delivery404. Added an active disposable SKU via existing admin endpoint201 and published the fixture200; public delivery200 with bytes identical to authenticated preview. No real patient or production records used.
3. Uppy replacement200 with If-Match of the first generation, new ETag/image8c4a1a28-19c9-41f7-b853-de69970775a6;2000×1200 input became1600×960 WebP /2,812 bytes. Old public generation immediately404; old R2 object eventually404 through normal outbox.
4. Invalid PNG content reached the real API and returned422 with the expected Persian error; current image retained. SVG rejected by Uppy before upload. No unsupported format was accepted.
5. Safely simulated a lost response after a successful real PUT using Playwright route.fetch followed by abort; backend/R2 committed normally. UI offered explicit same-operation retry. Replay200 returned the same image531101f6-f30c-455d-b62e-4175fd18088b, same idempotency key and original If-Match. Real progressbar observed; UI success awaited server confirmation. No database/storage outage injection.
6. Valid multipart request with fresh operation key and stale If-Match returned412 / COMMERCE_IMAGE_REVISION_CONFLICT. Unauthenticated private preview401; authenticated access to a scratch product in another inactive clinic404.
7. Dashboard removal204 / ETag "none" with the current generation's If-Match. Exact DELETE replay204; public route immediately404; editor displayed its no-image fallback.

### Cleanup, verification and issues

- Existing outbox worker completed all six COMMERCE_PRODUCT_IMAGE_CLEANUP events, each DELIVERED on attempt1. No deadline/queue mutation or direct diagnostic deletion. Existing adapter HeadObject returned404 for all three recorded object identities; Prisma image rows for the fixture were0. No unrelated object was listed/deleted.
- API focused storage/processor/configuration tests:3 files /13 PASS. Dashboard controller/API/catalog tests:3 files /24 PASS. API build/Prisma generation and live watcher compilation passed; native Windows Sharp executed successfully. No code changes justified additional generated-contract rebuilds or broad audits.
- Initial diagnostic commands encountered shell/Node stdin quoting and crypto binding issues; corrected only diagnostic execution. Corepack/network and local socket sandbox restrictions required normal approved execution outside the sandbox. No application runtime fix was made.
- Two attempts to replay raw browser multipart request buffers through APIRequestContext returned500 and were discarded as invalid harness evidence; they are not proof of contract replay/conflict behavior. Subsequent actual Uppy same-intent replay200 and correctly constructed multipart stale-version412 establish those checks. Browser selection timing/retained-file restriction was handled by waiting and clearing selection through the existing UI; no upload code changed.
- Automatic review rejected credential stdout extraction and broad Chrome debugging/profile enumeration. Neither executed; continued using owner-supplied credentials and the existing isolated MCP browser, with no profile enumeration or credential stdout workaround.
- Owned API/Dashboard processes stopped and ports3002/3003 released. Dropped only the guarded, task-owned scratch database after R2 cleanup. Removed guarded ignored task overlay/fixtures. Original database remained35 migrations with zero media migration; Docker PostgreSQL and original apps/api/.env preserved.

Main-agent review: scope, frozen contract, real evidence, cleanup, secret handling and remaining limits PASS. Only five governance/evidence documents changed; no application code, database schema/migration, dependency, generated client or architecture change. Diff gate passed before the independent task commit. Local development acceptance DONE; exclusive IAM-policy/control-plane audit, Linux container Sharp execution, production activation and independent Phase12 blockers remain separate. Phase04C is eligible for its separate instruction/claim and has not started.

## F01-R06-B — OTP authentication and session integration

Task ID: `F01-R06-B`
Completed at: `2026-10-11 UTC`
Agent/Thread: `Codex /root`
Batch ID: `F01-B06-B`
Reviewed by: `Codex /root`

Changed files:

- `apps/api/src/modules/identity/application/{otp-authentication,session-issuer}.use-case.ts`
- `apps/api/src/modules/identity/presentation/http/{auth.controller.ts,dto/otp.dto.ts}` and identity wiring
- checked-in OpenAPI and generated TypeScript client

Tests run:

- PostgreSQL integration: request → verify → passwordless patient/profile/session result, second verify rejection and two-request concurrency → PASS.
- password login/register/session regression (18 tests) and API test typecheck → PASS.
- OpenAPI export plus `openapi-typescript --check` → PASS.

Result:

- public request/resend/verify endpoints are Origin validated, idempotent/rate-limited and do not reveal code or account existence;
- verifier is context-bound HMAC-SHA-256, challenges expire/lock/supersede/consume explicitly and only one concurrent verify succeeds;
- existing users and newly provisioned OTP-only patients receive the same access/refresh session contract; no fake Credential is created.

Known limitations:

- browser/provider acceptance remains in `F01-R06-C`; integration used an internal fake delivery seam and sent no external SMS.

Next batch:

- `F01-B06-C` — web/dashboard UX and deployment evidence.

## F01-R06-A — SMS provider foundation and administration

Task ID: `F01-R06-A`
Completed at: `2026-10-11 UTC`
Agent/Thread: `Codex /root`
Batch ID: `F01-B06-A`
Reviewed by: `Codex /root`

Changed files:

- `plan/contracts/otp-sms-auth-v1.md`, `plan/decisions/ADR-0014-passwordless-otp-sms-boundary.md`
- `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/20261011100000_otp_sms_auth/migration.sql`
- `apps/api/src/modules/communications/sms/**`, runtime/deployment secret contracts and `farazsms@1.1.0`

Tests run:

- Prisma schema format/validate and PostgreSQL 16 full migration replay (34 migrations) → PASS.
- `sms-otp-security.spec.ts`, environment/origin regression and API test typecheck → PASS.
- release pipeline, VPS dev/release behavior, shell syntax and `git diff --check` → PASS.

Result:

- only the real FarazSMS adapter is registered; transport defaults to disabled and external calls require explicit live runtime;
- SMS credentials are write-only, independently AES-256-GCM encrypted and revisioned; ADMIN controls provider state, policy, tests and safe logs;
- new dev secrets are generated on the VPS without entering Git/logs, while release environments still require managed secret files.

Known limitations:

- no real provider credential or SMS was used; live activation remains an explicit ADMIN operation after setting runtime live.

Next batch:

- `F01-B06-B` — OTP engine, public auth and generated client.

## F12-T02-R19 — shared-dev Next watcher warm-up corrective

Task ID: F12-T02-R19
Batch ID: F12-B02-R19
Completed at: 2026-10-09 +03:30
Coordinator/Thread: Codex /root
Reviewed by: Codex /root

Observed live failure:

- `mushroom-dev-app-1` repeatedly started `Next.js 16.3.8 (Turbopack)` and first compilation of `/` took 6.7–7.1
  seconds, while both Docker healthchecks and deployment curl probes had a five-second limit.
- The workflow therefore issued overlapping, aborted root requests and declared the app unavailable before its first
  development compile could complete.

Changed files:

- `deploy/vps/compose.dev.yaml`, `deploy/vps/deploy-dev.sh`
- `scripts/test-vps-dev.sh`, `scripts/test-release-pipeline.mjs`
- `plan/STATUS.md`, `plan/logs/phase-12.md`

Verification:

- dev watcher startup timeout/cadence contract → PASS
- `bash scripts/test-vps-dev.sh` → PASS across first, unchanged, dependency, API-only, frontend-only and lock-contention syncs
- `pnpm release:test` → PASS
- targeted `git diff --check` for task-owned files → PASS

Result:

- **PASS / DONE.** Docker healthchecks were removed only from the three persistent Next development watchers; they
  previously caused parallel first-route compilation. The deployment's existing ordered probes remain authoritative.
- Web, app and dashboard readiness probes now allow 30 seconds, enough for observed 6–7 second initial Turbopack
  compilation without retry pressure. API readiness remains unchanged at five seconds.
- A failed probe now prints the container restart count, OOM flag, exit code and health state before its logs.

Known limitation:

- This eliminates the demonstrated short-timeout and concurrent-warm-up failure. If the app still restarts, the next
  workflow output will identify whether it is an OOM kill; live confirmation requires pushing the corrective to `dev`.

Next work:

- No new batch is claimed; continue Phase 12 according to its eligible task map after live confirmation.

## F12-T02-R18 — shared-dev synchronization corrective

Task ID: F12-T02-R18
Batch ID: F12-B02-R18
Completed at: 2026-10-09 +03:30
Coordinator/Thread: Codex /root
Reviewed by: Codex /root

Observed live failure:

- Rsync reported `cannot delete non-empty directory: apps/api/src/generated` while preserving its excluded Prisma
  child generated on the server.
- The newly dispatched workflow then failed with `another dev sync is active` because the previous remote deployment
  still held the kernel lock after GitHub dispatched the next run.

Changed files:

- `.github/workflows/dev-sync.yml`, `.github/CI.md`
- `scripts/deploy-dev-vps.mjs`
- `deploy/vps/deploy-dev.sh`
- `scripts/test-vps-dev.sh`, `scripts/test-release-pipeline.mjs`
- `plan/STATUS.md`, `plan/logs/phase-12.md`

Verification:

- real lock contention simulation: second deployment waits and then completes → PASS
- first, unchanged, dependency, API-only and frontend-only dev sync simulations → PASS
- generated API directory preservation contract → PASS
- `pnpm release:test` → PASS
- `git diff --check` → PASS

Result:

- **PASS / DONE.** Shared-dev GitHub runs are queued instead of canceling a remote deployment mid-flight. A new
  runner waits up to 600 seconds for the server lock before source upload, and the deployment repeats the bounded
  lock acquisition defensively before mutation; the kernel lock remains the single-writer guard.
- Rsync excludes the complete ignored `apps/api/src/generated/` directory, matching the repository's generated-file
  boundary and preventing parent-directory deletion warnings.
- No lock file is deleted and no concurrent deployment bypass is introduced.

Known limitation:

- If a genuinely running deployment holds the lock for more than ten minutes, the new run fails explicitly rather
  than risking concurrent mutation. Live confirmation requires pushing the corrective to `dev`.

Next work:

- No new batch is claimed; continue Phase 12 according to its eligible task map after live confirmation.

## F12-T02-R17 — absolute shared-dev build-context corrective

Task ID: F12-T02-R17
Batch ID: F12-B02-R17
Completed at: 2026-10-09 +03:30
Coordinator/Thread: Codex /root
Reviewed by: Codex /root

Observed live failure:

- The dev workflow reached `mushroom-dev-runtime:local Building` and then BuildKit failed with
  `resolve : lstat /home/***/mushroom/***: no such file or directory` before it could load `Dockerfile.dev`.
- The masked path was the dev environment root rather than its synced `workspace`, proving the relative `../..`
  context was resolved against a different Compose project directory on the VPS.

Changed files:

- `deploy/vps/compose.dev.yaml`
- `scripts/test-release-pipeline.mjs`
- `plan/STATUS.md`, `plan/logs/phase-12.md`

Verification:

- rendered Docker Compose config resolves bootstrap build context to the supplied absolute workspace → PASS
- `bash scripts/test-vps-dev.sh` → PASS across first, unchanged, dependency, API-only and frontend-only syncs
- `pnpm release:test` → PASS
- `git diff --check` → PASS

Result:

- **PASS / DONE.** The runtime image build now uses the same absolute `DEV_WORKSPACE_PATH` already checked against
  `$HOME/mushroom/dev/workspace` by the deployment boundary.
- Image rebuilds no longer depend on the SSH login directory or Docker Compose relative project-directory behavior.
- No runtime environment, secret, database, Caddy, port, staging or production-sim setting changed.

Known limitation:

- Live confirmation requires pushing this corrective to `dev` and observing the next shared-dev workflow.

Next work:

- No new batch is claimed; continue Phase 12 according to its eligible task map after live confirmation.

## F12-T02-R16 — incremental shared-dev sync corrective

Task ID: F12-T02-R16
Batch ID: F12-B02-R16
Completed at: 2026-10-09 +03:30
Coordinator/Thread: Codex /root
Reviewed by: Codex /root

Changed files:

- `.github/CI.md`
- `scripts/deploy-dev-vps.mjs`
- `deploy/vps/deploy-dev.sh`, `deploy/vps/dev-service.sh`, `deploy/vps/README.md`
- `scripts/test-vps-dev.sh`, `scripts/test-release-pipeline.mjs`
- `plan/STATUS.md`, `plan/logs/phase-12.md`

Verification:

- `bash scripts/test-vps-dev.sh` → PASS across first, unchanged, dependency, API-only and frontend-only syncs
- `pnpm release:test` → PASS
- shell/Node syntax and `git diff --check` → PASS

Result:

- **PASS / DONE.** The three Next.js services remain genuine persistent `next dev` servers with bind-mounted source
  and HMR. An unchanged or frontend-only push skips bootstrap and all container recreation.
- Dependency installation, API-client build, Prisma generation/migration, runtime-config generation and bounded API
  transpilation are independently fingerprinted. API recreation happens only when its emitted runtime changes.
- Rsync compares content and preserves server-generated Prisma/API-client/API outputs plus environment-specific public
  runtime configuration instead of deleting or retransmitting them from each fresh GitHub runner.

Known limitation:

- GitHub-hosted runner allocation and SSH startup remain fixed external latency. The VPS path no longer performs
  unrelated builds, but it is intentionally not a server-side `git pull` because that would require a repository
  deploy credential on the VPS.

Next task in the active batch:

- `F01-R08` remains claimed for the browser hydration/runtime-config corrective.

## F12-T02-R15 — shared-dev API compiler/runtime isolation corrective

Task ID: F12-T02-R15
Batch ID: F12-B02-R15
Completed at: 2026-10-09 +03:30
Coordinator/Thread: Codex /root
Reviewed by: Codex /root

Observed live failure:

- Live cgroup evidence confirmed the API container exceeded its `1g` limit: `oom=2`, `oom_kill=2`, Docker health was
  `unhealthy`, restart count was `16`, and `OOMKilled=true`.
- The earlier low-memory compiler still remained concurrently resident with the Nest runtime. Current memory after
  the kill was only about `90 MiB`, which represented the surviving wrapper/compiler state rather than peak usage.

Changed files:

- `deploy/vps/dev-service.sh`
- `deploy/vps/deploy-dev.sh`
- `scripts/test-vps-dev.sh`
- `scripts/test-release-pipeline.mjs`
- `plan/STATUS.md`, `plan/logs/phase-12.md`

Verification:

- clean bounded TypeScript emit at `640 MiB` → PASS; Nest decorator metadata retained in 111 emitted files
- `pnpm release:test` → PASS
- `bash scripts/test-vps-dev.sh` → PASS, including source-only API recreation without frontend recreation
- shell/Node syntax and `git diff --check` → PASS

Result:

- **PASS / DONE.** Every Git sync now performs migration, optional seed and one bounded API compilation inside the
  one-shot bootstrap container. The persistent API container runs only `dist/main.js`; no TypeScript compiler or
  compiler watcher shares its `1g` cgroup.
- A source-only sync recreates only API after bootstrap completes. Dependency/runtime changes retain the existing full
  service recreation, while Next development watchers remain persistent on ordinary source updates.

External next action:

- Push the corrective to `dev`. The changed runtime fingerprint forces replacement of the existing unhealthy API
  container. No manual server configuration or container deletion is required.

## F12-T02-R14 — low-memory shared-dev API compiler corrective

Task ID: F12-T02-R14
Batch ID: F12-B02-R14
Completed at: 2026-10-09 +03:30
Coordinator/Thread: Codex /root
Reviewed by: Codex /root

Observed live failure:

- After the heap-only R13 corrective, the API readiness endpoint still repeatedly reset the connection while the
  PostgreSQL and frontend containers remained running. Raising the compiler heap alone did not make the shared VPS
  runtime stable and increased the risk of exhausting the existing `1g` container envelope.
- The API dev runner was performing full semantic checking and declaration/declaration-map emission twice at startup:
  once before launch and again when the persistent compiler watch initialized. CI and normal API builds already own
  full typechecking, while shared dev only needs correct JavaScript emission and Nest decorator metadata.

Changed files:

- `apps/api/scripts/dev.mjs`
- `apps/api/test/dev-runtime.spec.ts`
- `deploy/vps/deploy-dev.sh`
- `scripts/test-release-pipeline.mjs`
- `plan/STATUS.md`, `plan/logs/phase-12.md`

Verification:

- clean TypeScript emit with `--max-old-space-size=640 --noCheck --declaration false --declarationMap false` → PASS
- emitted Nest `design:paramtypes` metadata → PASS (111 files)
- focused API dev-runtime test → PASS (1 file / 3 tests)
- normal API build with full TypeScript checking → PASS
- `pnpm release:test` (including simulated VPS sync) → PASS
- Node/shell syntax and `git diff --check` → PASS

Result:

- **PASS / DONE.** The initial and persistent dev compilers now perform transpile-only emission at a lower heap ceiling
  while retaining the official TypeScript compiler and decorator metadata required by Nest dependency injection.
  Normal CI/build typechecking is unchanged.
- A readiness timeout now emits `docker compose ps` plus the failing service's last 200 log lines, so a future failure
  is actionable directly from GitHub Actions instead of appearing only as repeated curl resets.

External next action:

- Push the corrective to `dev` and rerun `Sync shared dev VPS`. No runtime.env, secret, database, Caddy or port change
  is required.

## F12-T02-R13 — shared-dev API compiler heap corrective

Task ID: F12-T02-R13
Batch ID: F12-B02-R13
Completed at: 2026-10-09 +03:30
Coordinator/Thread: Codex /root
Reviewed by: Codex /root

Observed live failure:

- The API container stayed below its Compose memory limit (`oom=false`) but restarted seven times while readiness on
  host port `3303` returned empty/reset connections.
- The API log terminated inside V8 with `JavaScript heap out of memory` near a `512 MiB` old-space ceiling. This was
  the initial TypeScript compilation run by `apps/api/scripts/dev.mjs`; PostgreSQL remained healthy.

Changed files:

- `apps/api/scripts/dev.mjs`
- `apps/api/test/dev-runtime.spec.ts`
- `plan/STATUS.md`, `plan/logs/phase-12.md`

Verification:

- focused API dev-runtime test → PASS (1 file / 3 tests)
- API build (`tsc -p tsconfig.build.json`) → PASS
- `node --check apps/api/scripts/dev.mjs` → PASS
- `git diff --check` → PASS

Result:

- **PASS / DONE.** Initial and watch-mode TypeScript compiler subprocesses now receive a `768 MiB` V8 old-space
  ceiling. The Nest runtime, Compose `1g` API memory limit, other services, database, secrets and release environments
  are unchanged.

External next action:

- Push the corrective to `dev` and rerun `Sync shared dev VPS`. No manual server configuration change is required.

## F12-T02-R12 — shared-dev secret mount name corrective

Task ID: F12-T02-R12
Batch ID: F12-B02-R12
Completed at: 2026-10-09 +03:30
Coordinator/Thread: Codex /root
Reviewed by: Codex /root

Observed live failure:

- After the dev build context was corrected, the runtime image built and the isolated PostgreSQL container became
  healthy. The one-shot bootstrap then stopped at `/run/secrets/DATABASE_URL is not readable`.
- Compose mounts the declared `database_url` secret at `/run/secrets/database_url`; the shared dev loader used the
  upper-case environment-variable name as the filename. The same mismatch affected JWT, refresh pepper and both
  payment-key secrets that API startup would read next.

Changed files:

- `deploy/vps/dev-service.sh`
- `scripts/test-release-pipeline.mjs`
- `plan/STATUS.md`, `plan/logs/phase-12.md`

Verification:

- `pnpm release:test` → PASS, including the lower-case file-secret mapping contract
- `bash scripts/test-vps-dev.sh` → PASS
- `bash -n deploy/vps/dev-service.sh` → PASS
- `git diff --check` → PASS

Result:

- **PASS / DONE.** The loader lowercases only the mounted filename while retaining the existing upper-case exported
  environment variable. No secret value, host permission, database state, staging or production-sim path changed.

External next action:

- Push the corrective to `dev` and observe the next `Sync shared dev VPS`. The already-created isolated PostgreSQL
  container and volume are safe to retain; bootstrap will continue idempotently.

## F12-T02-R11 — shared-dev build-context and Caddy corrective

Task ID: F12-T02-R11
Batch ID: F12-B02-R11
Completed at: 2026-10-09 +03:30
Coordinator/Thread: Codex /root
Reviewed by: Codex /root

Observed live failure:

- After the port collision was corrected, both the main-carried update and a later `dev` push reached the runtime
  image build, then stopped with `resolve : lstat /home/<user>/mushroom/<path>: no such file or directory`.
- `deploy-dev.sh` passed `--project-directory "$workspace"` while `compose.dev.yaml` already used a file-relative
  `context: ../..`. Compose therefore resolved the context two levels above the synced workspace and looked for the
  Dockerfile in a nonexistent host path.
- The live reverse proxy is Caddy, not Nginx; its four dev upstreams still referenced the old `3200–3203` range.

Changed files:

- `deploy/vps/deploy-dev.sh`, `deploy/vps/README.md`
- `scripts/test-release-pipeline.mjs`
- `plan/STATUS.md`, `plan/logs/phase-12.md`

Verification:

- rendered dev Compose JSON resolves `services.bootstrap.build.context` exactly to the repository/workspace root →
  PASS
- `pnpm release:test` → PASS
- `bash scripts/test-vps-dev.sh` → PASS
- `bash -n deploy/vps/deploy-dev.sh` and `git diff --check` → PASS

Result:

- **PASS / DONE.** The redundant project-directory override is removed, so the absolute Compose file location is the
  base for `../..` and Docker builds from the synced workspace on any deployment-user home path.
- Operator documentation now matches the confirmed Caddy setup and points the four dev hosts to `3300–3303`.
  Application code, databases, secrets, staging, production-sim and immutable release workflows are unchanged.

External next action:

- Apply the four dev runtime/Caddy port substitutions on the VPS, push this commit to `dev`, and rerun the dev sync.

## F12-T02-R10 — shared-dev port collision corrective

Task ID: F12-T02-R10
Batch ID: F12-B15-R1
Completed at: 2026-10-08 +03:30
Coordinator/Thread: Codex /root
Reviewed by: Codex /root

Observed live failure:

- The first `dev` source-sync stopped before Docker operations with `API_PORT crosses into production-sim`.
- The live staging containers correctly occupy `3100–3103`; the server's configured `production-sim/runtime.env`
  reserves `3200–3203`, which were mistakenly selected as the initial dev defaults. The collision guard behaved as
  designed even though production-sim containers were not running.

Changed files:

- `deploy/vps/dev-env.example`, `deploy/vps/README.md`
- `scripts/test-vps-dev.sh`, `scripts/test-release-pipeline.mjs`
- `plan/STATUS.md`, `plan/logs/phase-12.md`

Verification:

- `bash scripts/test-vps-dev.sh` → PASS; it now configures staging on `3100–3103` and production-sim on
  `3200–3203`, accepts dev on `3300–3303`, and still rejects a deliberate collision.
- `pnpm release:test` → PASS
- exact dev deployment/reference scan and `git diff --check` → PASS

Result:

- **PASS / DONE.** Shared dev defaults and documented Nginx targets are now `3300` web, `3301` app,
  `3302` dashboard and `3303` API. No production-sim setting, container, database, secret or release artifact is
  changed.

External next action:

- Update only `/home/deploy/mushroom/dev/runtime.env` and the four dev virtual-host `proxy_pass` values, push this
  corrective to `dev`, then rerun/observe `Sync shared dev VPS`.

## F12-T02-R9 — fast isolated shared development delivery

Task ID: F12-T02-R9
Batch ID: F12-B02-R9
Completed at: 2026-10-08 +03:30
Coordinator/Thread: Codex /root
Reviewed by: Codex /root

Owner request:

- Keep the accepted full CI and immutable-image CD path for `main`, while making ordinary development updates
  available quickly to the team on the same VPS.
- Separate dev from release databases, secrets, ports and state, and identify the exact one-time GitHub/server work.

Changed files:

- `.github/workflows/dev-sync.yml`, `.github/CI.md`
- `deploy/vps/Dockerfile.dev`, `compose.dev.yaml`, `deploy-dev.sh`, `dev-service.sh`, `dev-env.example`, `README.md`
- `scripts/deploy-dev-vps.mjs`, `scripts/test-vps-dev.sh`, `scripts/test-release-pipeline.mjs`
- `plan/decisions/ADR-0013-fast-shared-vps-dev-environment.md`
- `plan/STATUS.md`, `plan/logs/phase-12.md`

Verification:

- `pnpm release:test` → PASS, including production release contract non-regression and dev Compose config validation
- `bash scripts/test-vps-dev.sh` → PASS: first runtime build/install/seed, source-only sync without recreate,
  dependency-triggered install/recreate, one-time seed and staging-port collision rejection
- `bash -n` for the dev deployment/service/behavior scripts and `node --check scripts/deploy-dev-vps.mjs` → PASS
- dev GitHub workflow YAML parse with the installed `js-yaml` parser → PASS
- `git diff --check` and owned-path review → PASS

Result:

- **PASS / DONE.** Pushes to the fixed `dev` branch can now rsync source through host-key-pinned SSH without registry
  credentials or image publication. Persistent Nest/Next watchers keep source-only latency low; dependency/runtime
  fingerprints trigger only the necessary bootstrap or recreate.
- Dev uses project `mushroom-dev`, a dedicated PostgreSQL volume, file secrets, workspace/cache/state, loopback ports,
  public URLs and explicit CPU/memory caps. Runtime validation rejects identity/environment mismatches and collisions
  with configured staging or production-sim values. Sadad remains disabled.
- Frontend public runtime configuration is regenerated during every bootstrap so the three browser apps target the
  dev API rather than committed localhost defaults. Prisma uses generation plus forward-only migrate deploy; the
  development seed runs once and no normal path contains reset, down migration or Compose down.
- Existing `main` CI/release/promotion/rollback workflow and production Compose files are unchanged.

External activation and limits:

- Live VPS activation is not claimed: the owner must supply DNS/TLS/access control, synthetic dev secrets,
  `runtime.env`, repository variable `VPS_DEV_CD_ENABLED=true`, and create the `dev` branch as documented.
- Full workspace application tests were not repeated because no application feature or shared contract changed; the
  deployment-specific behavior and existing release contract suites passed. The shared-host capacity must be checked
  before enabling the bounded dev services.

Next batch:

- No batch is started in this handoff. After external setup, capture the first live sync SHA and four endpoint checks.

## F07-T11-R1 — deterministic concurrent prescription test assertion

Task ID: F07-T11-R1
Batch ID: F12-B14-R1
Completed at: 2026-10-08 +03:30
Coordinator/Thread: Codex /root
Reviewed by: Codex /root

Observed failure:

- Pull-request CI run `37727025727` passed the PostgreSQL prescription concurrency test.
- The same product code in post-merge main CI run `37727664058` committed the other concurrent request first. The
  database still produced exactly one revision and rejected the stale competitor with
  `PRESCRIPTION_REVISION_CONFLICT`, but the test hard-coded the first payload as the winner and failed at line 89.
- The failure was isolated to one assertion: 94 other test files and 384 other tests passed.

Changed files:

- `apps/api/test/prescription.integration.spec.ts`
- `plan/STATUS.md`, `plan/logs/phase-12.md`

Verification:

- comparative CI evidence from runs `37727025727` and `37727664058` → both legal serialization orders observed
- patched main CI run `37729167480` → PASS
- API typecheck, including Prisma generation → PASS
- `git diff --check` → PASS
- local PostgreSQL rerun was unavailable because this host has neither a PostgreSQL listener nor Docker engine; the
  required PostgreSQL integration coverage passed in the main CI service database

Result:

- **PASS / DONE.** The test derives the expected persisted item from the fulfilled concurrent request. It retains
  assertions for one success, one stale conflict, revision number/parentage, issued integrity evidence, immutable
  history and later amendment behavior without imposing an invalid promise-scheduling order.

Next batch:

- No batch is started in this handoff. The requested isolated fast dev environment is eligible as a separate batch.

## F12-T02 — non-root VPS file-secret ownership corrective

Task ID: F12-T02
Batch ID: F12-B02-R8
Completed at: 2026-10-08 +03:30
Coordinator/Thread: Codex /root
Reviewed by: Codex /root

Observed failure:

- Live Release run `37715705119` published the immutable release successfully, then staging migration failed because
  the UID/GID `65532:65532` Distroless API could not read `/run/secrets/database_url`.
- The VPS secret files correctly began as host-owned mode `600`; Compose file secrets are bind mounts and retained
  that ownership rather than remapping it to the application UID.

Changed files:

- `deploy/vps/deploy-release.sh`
- `deploy/vps/README.md`
- `scripts/test-vps-deploy.sh`
- `plan/STATUS.md`
- `plan/logs/phase-12.md`

Verification:

- `bash scripts/test-vps-deploy.sh` → PASS, including permission-helper-before-migration ordering and bounded runtime
- `pnpm release:test` → PASS
- `bash -n deploy/vps/deploy-release.sh` → PASS
- `git diff --check` → PASS
- live host metadata → all staging and production-sim secrets are `deploy:65532` mode `640`
- Release run `37715705119`, attempt 4 → eligibility/publish/deploy-staging PASS
- live staging → PostgreSQL/API/web/app/dashboard healthy; API live/ready and three Next loopback probes PASS

Result:

- **PASS / DONE.** Before migration or rollback activation, the trusted API image runs a short helper as root with no
  network, a read-only root filesystem and only `CHOWN`, `FOWNER` and `DAC_OVERRIDE`. It preserves the host deployment
  user as owner, grants read access only to runtime GID `65532`, and sets mode `640`. Application containers remain
  non-root and secrets are never world-readable.

Known limitation and next action:

- Run `37715705119` is the accepted live baseline. Two sequential update deployments and controlled rollback remain
  F12-T13 evidence. production-sim promotion remains manual and owner-gated.

## F12-T02 — private GitHub Free test-VPS CD boundary

Task ID: F12-T02
Batch ID: F12-B02-R7
Completed at: 2026-10-08 +03:30
Coordinator/Thread: Codex /root
Reviewed by: Codex /root

Observed baseline:

- Protected-main CI run `37711152615` for SHA `fc4f18fa5a8a999b49ff457588104d5a8c3f0d5a` passed.
- Release run `37711880141` passed publication and retained artifact
  `release-fc4f18fa5a8a999b49ff457588104d5a8c3f0d5a`; staging was correctly skipped while CD was disabled.
- Repository Actions metadata reported zero repository variables and zero repository secrets before activation.
- The private organization repository uses GitHub Free, which cannot configure GitHub Environments for a private
  repository; retaining those job references would make live deployment unavailable on the selected plan.

Changed files:

- `.github/workflows/release.yml`
- `.github/workflows/promote.yml`
- `.github/workflows/rollback.yml`
- `.github/CI.md`
- `deploy/vps/README.md`
- `scripts/test-release-pipeline.mjs`
- `specs/010-production-hardening/plan.md`
- `specs/010-production-hardening/quickstart.md`
- `plan/decisions/ADR-0012-free-plan-test-vps-cd.md`
- `plan/STATUS.md`
- `plan/logs/phase-12.md`

Verification:

- `pnpm release:test` → PASS
- all six workflow YAML files parsed → PASS
- actionlint → PASS
- owner-gate, manifest, SSH host-key and least-privilege permission review → PASS
- `git diff --check` → PASS

Result:

- **PASS / DONE.** The one-host non-production rehearsal now uses repository-scoped SSH inputs supported on GitHub
  Free. staging remains gated by `VPS_CD_ENABLED`; production-sim remains manual and actor-gated; immutable digests,
  temporary GHCR authentication and isolated VPS state are unchanged.

Known limitation and next action:

- This shared credential boundary is accepted only for the test VPS. Real production must use separately scoped
  credentials and an approval-capable control plane. Configure the documented repository secrets/variables before
  setting `VPS_CD_ENABLED=true`; live baseline/two-update/rollback evidence remains part of F12-T13.

## F12-T02 — GitHub Free-plan attestation corrective

Task ID: F12-T02
Batch ID: F12-B02-R6
Completed at: 2026-10-08 +03:30
Coordinator/Thread: Codex /root
Reviewed by: Codex /root

Observed release evidence:

- GitHub Actions run `37540615770`, attempt 3, accepted protected-main SHA
  `d922f099594267ec726b3f4527f9b51fefc733b6` and passed build, smoke, High/Critical scan and private-GHCR publish.
- Published immutable references:
  - API: `ghcr.io/drshirmardi/mushroom-api@sha256:ceaf21a494b14b658abdfe4e049507484f7281e31c6c69900b738df905024629`
  - web: `ghcr.io/drshirmardi/mushroom-web@sha256:4d1e7967ef9933800bae859f4f2f41462a42a78537acbca6f6b75319f0e912c1`
  - app: `ghcr.io/drshirmardi/mushroom-app@sha256:4c53b12011fbb1b85487a5c1bbefad81a288996ed2e881bd98ae18a35ffaf7b8`
  - dashboard: `ghcr.io/drshirmardi/mushroom-dashboard@sha256:194858125d169ce2896cfffc18d32f1c536a93f4d74b41483b6b8a8a87ff3ab2`
- The subsequent API attestation step failed with GitHub's explicit `Feature not available` response for a private
  repository in the `Drshirmardi` Free-plan organization. Because manifest upload followed attestations, the valid
  generated manifest was not retained and staging correctly remained skipped.

Corrective contract:

- Upload the strict digest manifest immediately after successful publication, before any optional provenance step.
- Run subject extraction and all four `actions/attest-build-provenance` steps only when repository variable
  `GHCR_ATTESTATIONS_ENABLED` is exactly `true`. Unsupported plans leave it absent or `false`.
- Attestation is supplemental evidence. Publication, immutable manifest validation, staging/promotion and rollback
  continue to use the exact four registry digests and do not weaken their gate when attestation is unavailable.

Verification:

- `pnpm release:test` → PASS, including manifest-before-attestation order and five explicit plan gates
- all six workflow YAML files parsed → PASS
- actionlint `1.7.12` → PASS
- `git diff --check` → PASS

Result:

- **PASS / DONE.** Private GHCR publication remains accepted; the next main run can retain its manifest on the current
  plan without treating an unavailable supplemental GitHub feature as a release failure.

## F12-T02 — private GHCR continuous delivery and VPS rehearsal corrective

Task ID: F12-T02
Batch ID: F12-B02-R5
Completed at: 2026-10-06 +03:30
Coordinator/Thread: Codex /root
Reviewed by: Codex /root

Changed files:

- `.github/workflows/{release.yml,promote.yml,rollback.yml,container-checks.yml}`
- `deploy/contracts/release-manifest.schema.json`
- `deploy/vps/{README.md,compose.yaml,deploy-release.sh,env.example}`
- `scripts/{deploy-vps.mjs,release-images.mjs,release-manifest.mjs,test-release-pipeline.mjs,test-vps-deploy.sh}`
- `docker-bake.hcl`, `package.json`
- `README.md`, `.github/CI.md`, `deploy/README.md`, `docs/PRODUCTION.md`
- `specs/010-production-hardening/{spec.md,plan.md,tasks.md,research.md,data-model.md,quickstart.md}` and its
  release-readiness contract/checklist
- coordinator-only `plan/{STATUS.md,phases/12-PRODUCTION-HARDENING.md,logs/phase-12.md}`

Accepted delivery contract:

- Pull-request CI must pass before merge. A successful CI run for the current protected `main` SHA is the only trigger
  that may build, verify, scan and publish the four private GHCR images. Publication uses the scoped workflow token and
  records OCI source/revision labels plus provenance attestations.
- One strict release manifest binds source SHA, CI/release run IDs and the API/web/app/dashboard repositories to exact
  `sha256` digests. Staging and production-sim consume that manifest without rebuilding or accepting mutable tags.
- The release workflow stops after automatic `staging` delivery. `production-sim` promotion is a separate manual
  workflow that verifies the named release run and successful staging job, then requires the caller to match the
  configured `RELEASE_APPROVER`. GitHub Environment review may add a second approval when the repository plan supports
  it for private repositories.
- Deployment originates on an ephemeral GitHub-hosted runner over host-key-pinned SSH to a restricted non-root user.
  The private GHCR workflow token is piped only to a temporary Docker configuration, used to pull the exact digests,
  logged out and deleted. The VPS stores no registry PAT and runs no persistent runner or polling update agent.
- The VPS contract isolates `staging` and `production-sim` by Compose project, root directory, PostgreSQL database/user,
  volume, secret files, loopback ports, public origins and release state. Sadad is disabled and production data or
  credentials are prohibited.
- Migration is forward-only and completes before application switching. Failed staging verification automatically
  restores the recorded previous application digest set; production-sim rollback remains an explicit owner operation.
  No path resets, reverses or rolls back the database.

Verification:

- SpecKit requirements checklist → 11/11 PASS; pre-implementation checklist → 15/15 PASS
- read-only SpecKit analysis → 33/33 requirements and buildable success criteria mapped; 0 HIGH/CRITICAL findings
- `pnpm release:test` → PASS: triggers/permissions, manual approval, manifest strictness, digest-only references,
  secret/registry policy, Compose interpolation and script syntax
- all six workflow YAML files parsed; pinned `actionlint 1.7.12` → PASS
- `scripts/test-vps-deploy.sh` in a disposable Linux/Node environment → PASS: baseline and sequential staging updates,
  controlled staging failure with automatic application rollback, production-sim failed candidate retention, manual
  rollback, migration-before-switch and ephemeral Docker configuration
- `pnpm lint` → PASS with 0 errors and the same 3 pre-existing dashboard warnings; `pnpm typecheck` → PASS
- `IMAGE_REGISTRY=local IMAGE_TAG=f12-b02-r5 pnpm images:verify` → PASS: all four real images built, non-root smoke
  checks passed, and Trivy reported `0 Critical / 0 High` for API/web/app/dashboard. The shared temporary Trivy cache
  was removed after the run.
- no release container or task-owned Docker volume remained; `git diff --check` → PASS

Result:

- **PASS / DONE for the software/readiness scope.** The repository now contains the standard private-GHCR CI/CD path,
  immutable promotion boundary, non-production VPS deployment contract and rollback controls requested by the owner.

External acceptance still required:

- No package was published and no external server was changed in this batch. Set up a GitHub plan that supports
  Environment secrets for a private repository, configure `VPS_CD_ENABLED`, `RELEASE_APPROVER`, pinned SSH material and
  the two isolated VPS runtime/secret directories, then run and retain evidence for one baseline plus two sequential
  updates and the controlled rollback exercises.
- Until that evidence and the remaining Phase 12 gates exist, F12-T13 must reject production readiness. F12-T05,
  F12-T07, real Sadad acceptance and production deployment remain unchanged and blocked by their own gates.

## F12-T02 — release image build and CI concurrency corrective

Task ID: F12-T02
Batch ID: F12-B02-R4
Completed at: 2026-10-05 +03:30
Coordinator/Thread: Codex /root
Reviewed by: Codex /root

Changed files:

- `docker-bake.hcl`
- `scripts/release-images.mjs`
- `package.json`
- `README.md`
- `docs/PRODUCTION.md`
- `.github/workflows/{ci.yml,container-checks.yml}`
- coordinator-only `plan/{STATUS.md,logs/phase-12.md}`

Release build contract:

- Docker Buildx Bake is the single declarative source for the API, web, app and dashboard image targets. The
  `images:print`, `images:build`, `images:verify` and `images:push` package scripts use that same graph.
- The wrapper derives the GitHub owner in Codespaces or from `origin`, normalizes the registry to lowercase, tags a
  clean build with the 12-character source commit and appends `-dirty` to non-published worktree builds. Publishing
  rejects a dirty worktree and prints immutable registry digests after push.
- Container CI selects one target from the same Bake definition per matrix job. No provider SDK, deployment action,
  production secret or Sadad activation was added.

CI cancellation diagnosis:

- GitHub Actions push run `37334407135` ended as `cancelled` while displaying `pnpm test`; no failing assertion was
  reported. Pull-request run `37334669014` ran the same workspace test command successfully and completed its build.
- GitHub's retained run/job logs report only an external cancellation and do not expose the initiator, so a more
  specific cancellation source is not claimed. CI and artifact workflows now use GitHub's documented
  `github.head_ref || github.run_id` pattern: stale runs for one pull-request branch can still cancel, while every
  protected-branch push gets a unique group and therefore cannot be canceled by workflow concurrency.

Verification:

- wrapper syntax, supported-mode rejection, dirty-push rejection, lowercase registry normalization and Bake print
  target/tag assertions → PASS
- workflow YAML parse and concurrency/config review → PASS
- `pnpm install --frozen-lockfile --ignore-scripts` → PASS
- `pnpm lint` → PASS with 0 errors and 3 pre-existing cached dashboard warnings
- `pnpm typecheck` → PASS across all 5 workspaces
- disposable PostgreSQL 16: all 32 migrations and seed → PASS; `pnpm test` → PASS across all 5 workspaces, including
  API 94 files / 382 tests; database/container removed after the run
- `IMAGE_REGISTRY=local IMAGE_TAG=f12-b02-r4 pnpm images:verify` → PASS: four images built and loaded; all four
  disposable smoke checks passed; Trivy 0.75.0 reported `0 Critical / 0 High` for API/web/app/dashboard
- no smoke container remained after verification; `git diff --check` → PASS

Result:

- **PASS / DONE.** One standard command now builds the complete production artifact set, and the misleading
  post-merge cancellation mechanism is corrected without skipping or weakening tests.

Known limitations:

- Images were not pushed and no environment was deployed. Registry authentication and external deployment remain
  explicit operator actions.
- F12-T05 backup/restore and F12-T07 secret-manager evidence remain blocked, and F12-T09 observability remains
  dependency-gated. Production and real Sadad activation still require F12-T13 sign-off.

## F12-T02 — development and production runbook corrective

Task ID: F12-T02
Batch ID: F12-B02-R3
Completed at: 2026-10-05 +03:30
Coordinator/Thread: Codex /root
Reviewed by: Codex /root

Changed files:

- `README.md`
- `docs/DEVELOPMENT.md`
- `docs/PRODUCTION.md`
- coordinator-only `plan/{STATUS.md,logs/phase-12.md}`

Documentation contract:

- The root README describes the current four-application/PostgreSQL architecture and directs developers to separate
  Development/Codespaces and Production runbooks instead of the stale foundation-era setup.
- The Development runbook covers Node/pnpm/Docker prerequisites, local PostgreSQL, ignored API environment values,
  generated client, Prisma migrate/seed, all application URLs, Codespaces forwarded origins/runtime config, restart,
  reset, update and troubleshooting. Sadad stays disabled and no real data or credential is requested.
- The Production runbook follows the accepted provider-neutral artifact boundary: build the four existing
  Dockerfiles once, smoke and scan actual artifacts, push and record immutable digests, promote those exact digests
  through staging, run migration explicitly, start with file-backed secrets, update without `compose down`, and
  perform application-only rollback while retaining the expanded schema.

Verification:

- all relative Markdown links in the three public documents resolve → PASS
- documented repository paths and root package scripts exist → PASS
- Bash syntax validation for all 36 documented `bash` command blocks → PASS
- documented loopback port variables and required synthetic release variables with
  `docker compose -f compose.production.example.yaml config --quiet` → PASS
- command/config review against `compose.yaml`, `compose.production.example.yaml`, both release Dockerfiles,
  `scripts/ci-container-smoke.mjs`, API environment validation and Phase 12 migration policy → PASS
- no-secret/no-provider-action review → PASS
- `git diff --check` → PASS
- post-push command review after a real Codespaces attempt → PASS: the GHCR namespace is now derived from
  `GITHUB_REPOSITORY`, normalized to lowercase, printed before build and shown as `ghcr.io/drshirmardi` in release
  examples; the literal uppercase `OWNER` placeholder that Docker rejects is no longer copyable.

Result:

- **PASS / DONE.** The documentation is executable against the accepted repository interfaces and makes the local,
  Codespaces, build, promotion, update and rollback paths discoverable without modifying runtime behavior or claiming
  deployment readiness.

Known limitations:

- No image was rebuilt and no environment was deployed for this documentation-only corrective; the previously
  accepted F12-T02 artifact evidence remains authoritative.
- F12-T05 backup/restore and F12-T07 secret-manager evidence remain blocked, and F12-T09 observability remains
  dependency-gated. Production and real Sadad activation still require F12-T13 sign-off.

## F12-T10 — low-downtime migration and application-rollback rehearsal

Task ID: F12-T10
Batch ID: F12-B05-R1
Completed at: 2026-10-04 +03:30
Coordinator/Thread: Codex /root
Reviewed by: Codex /root

Changed files:

- `apps/api/test/phase-12-migration-rollback.integration.spec.ts`
- `deploy/phase-12-migration-rollout.md`
- coordinator-only `plan/{STATUS.md,phases/12-PRODUCTION-HARDENING.md,logs/phase-12.md}`

Rehearsal design:

- The rollout is **expand → migrate → contract**. Accepted migrations are immutable; migration runs once before
  application promotion and never from ordinary API startup. Contract/removal work is deferred to a separately
  rehearsed later release after the previous artifact is retired.
- Rollback is application-only: retain the expanded schema and return to the previous verified artifact. There is no
  down SQL, `prisma migrate reset`, truncation or destructive data rollback. Any discovered incompatibility requires a
  forward-fix migration that preserves migration history and data.
- The chosen pre-current artifact is `d8e994887a6a78a8f903275459952e6fefc17fd3`; its migration tree is identical
  to the current `df24278` tree. The meaningful historical schema upgrade remains Phase 09 final
  `20260913204000_phase_09_payment_immutability_trigger_fix` through the two accepted Phase 10 migrations. This is
  exercised separately from the artifact-boundary startup sequence.

Verification and measured results:

- A labelled, loopback-only PostgreSQL 16 container `mushroom-f12t10-postgres` supplied uniquely named child
  databases only. No shared, staging or production database was contacted.
- `pnpm --filter @sabz-zendegi/api exec vitest run test/phase-12-migration-rollback.integration.spec.ts
  --no-file-parallelism --reporter=dot` → PASS: 2 tests in `9.42s`. It replayed all 32 migration directories on a
  blank database, `migrate status` reported no pending migration, and it rebuilt the Phase 09 baseline before applying
  the two Phase 10 migrations. The ten chat tables and the two rate-limit indexes exist; the upgraded SQL contains no
  table/column/type drop, truncate or data-delete statement.
- `prisma validate` → PASS; `prisma generate` → PASS in `596ms`; API `typecheck` → PASS.
- Exact promoted-image command `node_modules/prisma/build/index.js migrate deploy` on a fresh measured child database
  replayed all 32 migrations in `6.59s`; subsequent `migrate status` was PASS and `_prisma_migrations` had 32 finished
  rows.
- Clean Git archives excluded all uncommitted F12-T07 work. The previous `d8e9948` API source (Prisma 7.9.1) and
  current `df24278` API source (Prisma 7.10.0) each built as numerical UID/GID `65532:65532` artifacts. Against the
  expanded current schema, readiness passed in the required order: previous `1.70s`, current `1.69s`, previous again
  `1.61s`. The initial previous-artifact attempt exposed only a missing synthetic `TRUSTED_PROXIES` production fixture;
  after adding the documented explicit loopback proxy/origin fixture, no application or schema defect remained.
- `git diff --check` → PASS. No accepted migration was rewritten, removed or created.

Cleanup:

- Child databases, the labelled PostgreSQL container, all three startup containers, both run-owned Docker networks and
  both temporary API image tags were removed. Run-owned source archives and command logs are outside Git and contain
  no real credential or production data.

Result:

- **PASS / DONE.** The rehearsal proves application rollback to the selected previous artifact does not prevent API
  startup or damage data on the expanded schema. It does not claim database rollback, production deployment, backup
  restore, provider readiness or Sadad activation.
- F12-T09 remains unstarted and blocked by F12-T07. F12-T05 and F12-T07 remain untouched.

## F12-T02 corrective provider-neutral OCI artifact extension R7 — DONE

Batch ID: F12-B02-R2
Completed at: 2026-10-04 +03:30
Coordinator/Thread: Codex /root
Reviewed by: Codex /root

Owner-approved final runners are pinned to
`gcr.io/distroless/nodejs24-debian13:nonroot@sha256:9eeb7f5887d0e239e78264b06f7f11d2e14be534050481803a9e4728fcdd278e`.
The official Node 24 slim images remain build-only. API, web, app and dashboard final layers have no shell or global
package manager, copy files with numerical ownership `65532:65532`, and run as that numerical non-root identity.
Small Node entrypoints replace shell startup: API reads only declared `*_FILE` inputs before `dist/main.js`; Next writes
only validated public URLs to `public/runtime-config.js` before `server.js`. No real secret, provider provisioning,
production deployment, external Sadad call, enable/default or provider-specific runtime code was introduced.

The API production deploy is intentionally minimal and includes Prisma 7.10.0 as an already locked production
dependency so the standalone, explicit migration command `node_modules/prisma/build/index.js migrate deploy` is
available from the promoted image. This is not a Prisma upgrade, does not alter an advisory resolution, and normal API
startup does not execute migrations. `pnpm why` reconfirmed that the prior `brace-expansion` and `js-yaml` image paths
were copied development/tooling trees, not the production API/web dependency closures; the API's production Swagger
path resolves `js-yaml@5.3.0`, and web has neither path in its production closure.

Verification (all run against disposable, labelled resources and then removed):

- API, web, app and dashboard each built from their production Dockerfile path. Every Next build forced a clean
  API-client build and asserted `packages/api-client/dist/index.js` before the Next build.
- Docker Scout SARIF scans of each actual release image report `0 Critical / 0 High`. The complete machine-readable
  reports are run-owned temporary artifacts outside Git; no scanner result was muted or waived.
- A fresh PostgreSQL 16 database accepted all 32 migrations through the explicit API-image migration command.
  The API liveness and readiness routes, plus all three Next HTTP endpoints, returned `200` through production Compose.
  Compose health checks were recreated after correcting their command to the Distroless Node binary; all four services
  became `healthy`.
- Direct runtime checks proved UID `65532` for API, web, app and dashboard. The same web image tag served separate
  staging and production public URL configurations without rebuild; both served HTTP `200`, the generated files differ
  only in public URL values, and no secret-shaped runtime key was emitted.
- `docker compose config` with synthetic non-secret values and the documentation-only Liara profile gate passed. The
  profile contains only port, health, domain/HTTPS, secret injection and static-outbound-egress guidance; no Liara SDK,
  API or runtime branch appears in the artifacts. Realtime remains single-instance, with multi-instance blocked pending
  an approved distributed Socket.IO/session adapter.
- API typecheck with a build-only disposable `DATABASE_URL`, both Node entrypoint syntax checks, and `git diff --check`
  passed. The pre-existing F12-T07 files remained unstaged and were not reviewed as this task's implementation.

Cleanup removed the named run-owned Compose services, PostgreSQL database/container, network, direct runtime-promotion
containers and all four temporary release-image tags. This evidence proves local artifact behavior only; it does not
claim Liara static-outbound-egress, managed-secret capability, backup/WAL capability, real Sadad acceptance or
production readiness.

Result: **DONE.** F12-T02's corrective extension satisfies its software/artifact acceptance gates. F12-T05 and F12-T07
remain external-evidence blockers for F12-T13. Do not start B05 from this completion.

## F12-T02 corrective provider-neutral OCI image-hardening analysis R6 — REWORK

Batch ID: F12-B02-R2
Recorded at: 2026-10-04 +03:30
Coordinator/Thread: Codex /root

Only API and web were rebuilt for this staged investigation. Complete Docker Scout SARIF reports for both images and
for the two official Node 24 slim bases, plus the base recommendation output, were written outside Git in run-owned
temporary storage. They retain advisory ID, package PURL, installed/source path and fixed-version fields; no secret,
credential or application data was included.

Classification of the API/web Critical/High findings is evidence-based:

- **Debian/base image:** Bookworm contains unfixed `CVE-2026-12087` and `CVE-2026-13221` (both Critical, `perl`),
  and unfixed High findings `CVE-2026-102010`/`CVE-2026-95619` (`gcc-12`), `CVE-2026-103111` (`pcre2`),
  `CVE-2026-48959`, `CVE-2026-48962`, `CVE-2026-57432`, `CVE-2026-82560` (`perl`),
  `CVE-2026-76642`, `CVE-2026-78408`, `CVE-2026-78409`, `CVE-2026-78410` (`util-linux`) and
  `CVE-2026-84782` (`openssl`). Their SARIF locations are Debian package paths and their fixed version is
  `not fixed`.
- **Official Node global tooling:** `brace-expansion`, `undici`, `ip-address`, `tar` and
  `http-cache-semantics` under `/usr/local/lib/node_modules/npm/` are not application runtime dependencies. Their
  reported patched versions include `brace-expansion` `5.0.8` through `5.0.11`, `undici` `6.28.1`,
  `ip-address` `10.3.1` and `tar` `7.5.21`; `CVE-2026-93748` for `http-cache-semantics` is `not fixed`.
  Removing npm/npx/Corepack/pnpm/Yarn from final runners remains a valid future hardening slice, but cannot clear
  the unresolved official base-image gate by itself.
- **Application runtime dependency paths:** only the copied workspace tree produced Critical/High SARIF locations:
  `brace-expansion@2.1.4` (`CVE-2026-102276`, `CVE-2026-102278`; fixes `2.1.5`/`2.1.6`) and
  `js-yaml@4.3.1` (`CVE-2026-84375`; fix `4.3.2`). The scan also sees `brace-expansion@5.0.7` in the base npm tree;
  dependency manifest or lockfile remediation is not started because it overlaps the accepted F12-T08 security
  resource and requires a separate ownership review.

Official-base comparison: Docker Scout recommends official `node:24-bookworm-slim` digest
`sha256:5cbc7caba8c2c0f0bca675d1b61b9f2857e1cf1853c6164ee9dd409501a936e7` (Node `24.21.0`), but its SARIF has
21 Critical/High results, including the unfixed Critical entries above. Official
`node:24-trixie-slim@sha256:8ec5d7557396cfe32d21c3f9c13072355ceab22b584578ca4bb28af31120cffe` has fewer results
(12 High, no Critical), but remains unacceptable for the zero gate: `CVE-2026-102010` and `CVE-2026-95619` for
`gcc-14`, and `CVE-2026-93748` for `http-cache-semantics`, are `not fixed`. Trixie compatibility was therefore not
selected or introduced; no Alpine migration, blanket `apt upgrade`, waiver, mute, dependency-major upgrade or
manifest/lockfile change occurred.

Result: F12-T02 stays `REWORK` and its claim is released. The requested `0 Critical / 0 High` API/web threshold
cannot be reached from either currently scanned official Node 24 slim base without weakening the gate. The exact next
action is to obtain an official compatible Node 24 slim base digest with zero Critical/High findings, or approve a
different supported base-image strategy; only then pin it, remove global package-manager tooling from final runners,
rebuild API/web and rescan before considering app/dashboard or the final smoke. The run-owned API/web tags were
removed; F12-T07 remains untouched and unstaged. Do not start B05.

## F12-T02 corrective provider-neutral OCI artifact extension R5 — REWORK

Batch ID: F12-B02-R2
Recorded at: 2026-10-04 +03:30
Coordinator/Thread: Codex /root

The owner-provided disposable fixtures were used only through temporary mounted secret files and a non-secret active
key-version environment value. Their literal values are intentionally not persisted here, in Git, in `.env.example`,
or in any release artifact. Existing encryption/keyring validation was not changed or weakened.

Verification passed before the security gate:

- API, web, app and dashboard OCI images built successfully; every final image configured non-root user `mushroom`
  (UID `10001`). The clean API-client build assertion remained in every Next build path.
- `docker compose ... config` passed with quoted required interpolation and block-style environment mappings. The
  API image applied all 32 migrations to a fresh run-owned PostgreSQL 16 database using the explicit one-shot command.
- Production Compose started all four services. API liveness/readiness and web/app/dashboard HTTP smoke endpoints all
  returned `200`; every service ran as UID `10001`.
- The same immutable web image digest served two different valid public runtime configurations (staging and
  production) without rebuild; the generated runtime files differed only in public URL values and contained no
  secret-shaped key.
- The Liara documentation-only profile was reviewed with the Compose artifacts: it maps only generic port, health,
  secret-boundary, HTTPS/domain and static-outbound-IP gate guidance. Runtime artifacts contain no Liara SDK, API or
  provider-specific branch; multi-instance realtime remains explicitly blocked.

Docker Scout `1.18.3` scanned every actual release image with the Critical/High filter. The API image digest reported
`2 Critical / 23 High`; each web, app and dashboard image reported `2 Critical / 19 High`. The reported paths include
unfixed Bookworm base-system packages (including `perl`, `util-linux` and `openssl`) plus runtime Node dependency
paths such as `brace-expansion`, `ip-address`, `undici`, `tar` and `js-yaml`; no finding was muted, waived or
reclassified. This is independent of the earlier accepted source dependency audit and prevents a production-readiness
PASS for the artifacts.

Cleanup: the named `mushroom-f12t02-compose-*` services, disposable PostgreSQL container, two runtime-promotion
containers, network and all four run-owned image tags were removed. Temporary run-owned local files could not be
deleted because this session's filesystem policy rejected the removal request; they contain only the non-real
disposable fixtures and scanner reports, are outside Git, and no shared Docker resource or real credential was
touched. F12-T07's pre-existing uncommitted secret-rotation changes remain untouched and unstaged.

Result: retain F12-T02 corrective extension as `REWORK`, release its claim and create no completion commit. The
precise next action is a separately reviewed image-hardening remediation: trace each scanner path, select compatible
patched base-image/runtime dependency changes, then rebuild and rescan all four images without weakening the scan
gate. Do not start B05.

## F12-T02 corrective provider-neutral OCI artifact extension R4 — REWORK

Batch ID: F12-B02-R2
Recorded at: 2026-10-04 +03:30
Coordinator/Thread: Codex /root

The limited Compose corrective change is complete: every required `${VAR:?message}` interpolation is quoted and all
API, web, app and dashboard `environment` declarations are block mappings. `docker compose ... config` resolved the
production example using temporary non-secret values; no required interpolation is unquoted and no flow-style
environment mapping remains. The documentation-only Liara profile remains free of executable provider configuration,
SDK or runtime API, so there is no provider-specific YAML artifact to parse or merge.

The four OCI images rebuilt successfully. The Next build stage rebuilt `@sabz-zendegi/api-client` after removing its
incremental state and asserted `packages/api-client/dist/index.js`; all four final images specify non-root user
`mushroom`. The explicit API-image migration applied all 32 migrations to a fresh, run-owned PostgreSQL 16 database.
The Compose example then started API, web, app and dashboard; web/app/dashboard became healthy and served HTTP 200.

The required API health gate failed. Its mounted **synthetic** `PAYMENT_CREDENTIAL_ENCRYPTION_KEY` was not a canonical
base64 32-byte AES-256 key and its synthetic `PAYMENT_CREDENTIAL_DECRYPTION_KEYS` value was not a valid
`version:canonical-base64-32-byte-key` keyring. Existing validation correctly rejected both values before Nest bound
the health endpoint; the API exited 1/restarted and no API health, runtime-promotion, Liara-profile gate or container
scan can be marked PASS. This is a test-fixture defect, not a claim about deployment readiness, real credentials,
Sadad, Liara or the Compose syntax.

Cleanup: the named `mushroom-f12t02-compose-*` services, its network, disposable PostgreSQL container and all four
run-owned image tags were removed. No shared Docker resource or real secret was touched. The temporary local values
remain non-secret and outside Git. F12-T07's pre-existing uncommitted secret-rotation changes remain untouched and
unstaged.

Result: retain F12-T02 corrective extension as `REWORK`, release its claim and create no completion commit. The exact
safe next action is to use generated canonical base64 32-byte **synthetic** encryption/keyring fixtures, then repeat
the remaining Compose/API health and public-runtime-promotion gates, the Liara documentation-profile review and actual
image container scans. Do not start B05.

## F12-T02 corrective provider-neutral OCI artifact extension R3 — REWORK

Batch ID: F12-B02-R2
Recorded at: 2026-10-04 +03:30
Coordinator/Thread: Codex /root

The owner-confirmed incremental-cache corrective change is implemented: `.dockerignore` excludes `*.tsbuildinfo` and
`.turbo`; the Next build stage removes the API-client incremental state and output, rebuilds the client and asserts
`packages/api-client/dist/index.js` before building the selected application. The web image first passed this exact
gate; API, app and dashboard images then passed as well, each configured as non-root `mushroom` (UID `10001`).

Verification completed before the Compose gate:

- Two containers from the same immutable web image, with separate staging and production public URLs, each served
  HTTP `200` and produced different public-only `runtime-config.js` values. No secret was emitted; both ran as UID
  `10001`.
- The API image's explicit migration command was corrected to invoke its bundled Prisma binary rather than triggering
  an on-demand Corepack download. It applied all 32 migrations on a fresh, labelled PostgreSQL 16 disposable database
  and then reported no pending migration. OpenSSL is explicitly installed in build and runner stages so Prisma no
  longer falls back to an undetected OpenSSL variant.
- API container liveness and readiness returned HTTP `200` against the disposable database as UID `10001`.
- A production-Compose smoke prepared a second disposable PostgreSQL 16 database and synthetic mounted secret files;
  the same API image applied all 32 migrations successfully to it.

Required Compose gate failed before any service started. `docker compose ... config` rejects
`compose.production.example.yaml` at line 27: the flow-style `environment` mapping has unquoted `${VAR:?message}`
values, and the `:` in that interpolation is invalid YAML there. Consequently Compose service health, profile smoke
and actual-image container scans remain unrun. This is a repository configuration defect, not a provider, credential,
Sadad or external-service failure.

Cleanup: all named `mushroom-f12t02-*` containers, the run-owned network and the four tagged run-owned images were
removed. No shared Docker resource or real secret was removed; the temporary local directory contains only synthetic
test values and was not removable by this session's filesystem policy.

Result: retain F12-T02 corrective extension as `REWORK`, release its claim and create no completion commit. The next
safe action is to make Compose environment mappings YAML-safe, run `docker compose config`, then repeat the Compose
smoke and run the Liara-profile review and container scans against the already verified images. Do not start B05 or
stage F12-T07 changes.

## F12-T02 corrective provider-neutral OCI artifact extension R2 — REWORK

Batch ID: F12-B02-R2
Recorded at: 2026-10-02 +03:30
Coordinator/Thread: Codex /root

The project owner confirmed Docker Desktop's Linux engine after moving its data directory: `docker version` reports
client/server `28.4.0`, and `docker run --rm hello-world` passed. The retained F12-T02 deployment artifacts were
verified without changing or staging the pre-existing F12-T07 secret-rotation work.

Verification:

- API OCI build → PASS in 1m25s. The resulting `mushroom-api:f12t02-r2` image configured the non-root `mushroom`
  user. It was removed as a run-owned artifact after the later Next build failure.
- Web OCI build → FAIL in 1m18s. After frozen install and a successful API-client package build, `next build` failed
  with `Module not found: Can't resolve '@sabz-zendegi/api-client'` from `apps/web/src/auth/web-session.ts` and
  `apps/web/src/lib/api.ts`. The same local `pnpm --filter @sabz/web build` passed, so the defect is confined to the
  current Docker workspace dependency/layout resolution rather than the web source or API client export itself.
- App/dashboard images, non-root runtime smoke/health/readiness, public runtime-config promotion check, disposable
  PostgreSQL migration, production-Compose smoke, Liara-profile smoke and image scans were deliberately not run after
  this required build gate failed. No real Sadad call, secret, provider provisioning or production deployment occurred.
- Cleanup → PASS: no `mushroom-*` container existed; the exact run-owned API image tag/digest was removed. No broad
  Docker prune or shared resource cleanup was performed.

Result: keep F12-T02's corrective extension `REWORK` and create no completion commit. The safe corrective action is to
adjust and review the Next Docker build so the workspace client package link and its built export remain resolvable in
the build stage, then rebuild all four images and execute the remaining smoke, one-shot migration, Compose and image
scan gates from new run-owned artifacts. Do not start B05 and do not stage F12-T07 files.

## F12-T02 corrective provider-neutral OCI artifact extension — REWORK

Batch ID: F12-B02-R2
Recorded at: 2026-10-02 +03:30
Coordinator/Thread: Codex /root

Owner-approved change control is recorded in ADR-0011, the Phase 12 release envelope and the SpecKit plan/task map.
The implementation adds provider-neutral non-root OCI definitions for API, web, app and dashboard; standalone tracing
for all Next applications; `PORT`/`HOSTNAME` runtime binding; a fixed public-only runtime URL file; explicit API-image
migration instructions; a production Compose example for external PostgreSQL/file secrets; and a documentation-only
Liara profile. It adds no Liara SDK/API/runtime branch, provider provisioning, real secret, Sadad request, payment
enable/default or production deployment. Existing F12-T07 secret-rotation changes remain unstaged and out of scope.

Verification completed:

- API, web, app and dashboard typechecks → PASS; API Prisma client generation used a non-secret build-only PostgreSQL
  URL.
- `sh -n` for API and Next entrypoints → PASS.
- `git diff --check` → PASS.

Required artifact verification is not complete. Docker Desktop's `com.docker.service` is `Stopped` and a non-elevated
start attempt was denied. Docker Desktop was launched, but `docker version` and the run-owned API build stayed silent
despite the existing Linux-engine pipes; no image was produced. The local `C:` volume also had only about 0.5 GB free.
The run-owned Docker CLI processes were stopped; no container, database, image or provider resource was created.

Result: keep this corrective extension `REWORK` and do not create a completion commit. After an authorized owner
restores a responsive Docker Linux engine with sufficient disk, build all four images, prove non-root runtime config and
health/readiness, run the explicit API-image migration against a fresh disposable PostgreSQL container, validate the
production Compose example, scan the resulting images, and then update the prior F12-T08 artifact-scan N/A evidence
with the actual independent corrective scan. Do not rerun accepted dependency remediation or start B05.

## F12-T08 corrective override compatibility R2 — DONE

Batch ID: F12-B04-R2
Recorded at: 2026-10-02 +03:30
Coordinator/Thread: Codex /root

The official npm registry reports stable `deepmerge-ts@8.0.2` (latest; Node >=16.9) and stable
`mysql2@3.24.5` (latest; Node >=8), satisfying the advisory minima respectively: `GHSA-ggr8-5vv4-36mx >=8.0.0`
and `GHSA-3f6p-5ww8-9rcr >=3.22.0`. A first multi-parent pnpm selector was rejected before any resolution changed;
the supported, bounded selectors are `@prisma/config>deepmerge-ts: 8.0.2` and `prisma>mysql2: 3.24.5`.

`pnpm why` proves the final production paths are only:

- `apps/api > @prisma/client > prisma > @prisma/config > deepmerge-ts@8.0.2`;
- `apps/api > @prisma/client > prisma > mysql2@3.24.5`.

No Prisma 8, MySQL configuration, service, connection, secret, or runtime database-provider change was added.
`pnpm install --frozen-lockfile` passed. Prisma 7.10.0 `validate` and `generate` passed. On the fresh loopback-only,
run-owned `mushroom-f12-b04r2-postgres` PostgreSQL 16 container (label `codex.batch=F12-B04-R2`), all 32 migrations
were applied successfully to one clean database and replayed from zero on a second newly created database; migration
status was up to date for both. This is PostgreSQL-only evidence, not a MySQL configuration exercise.

API/app/web/dashboard typechecks passed. App/web/dashboard test suites passed (`45`, `9`, `61` tests); API build
passed. The recorded disposable integration run `%TEMP%/mushroom-f12-t08-r2-verification.log` shows seed completion
and the focused auth/session, audit redaction, chat rate-limit, Sadad callback/redirect/fail-closed and simulated
payment idempotency suite: 5 files, 25 tests, 103.89 seconds, exit 0. It made no real Sadad call. The final
`%TEMP%/mushroom-f12-t08-pnpm-audit-r2.json` has `0 critical`, `0 high`, `5 moderate`, `0 low` (the pnpm audit
process exit `1` reflects remaining moderate findings, not a Critical/HIGH gate failure).

Main-agent review: PASS. The temporary overrides are limited to the two Prisma transitive paths and their lockfile
resolution; they meet the two advisory patch requirements and all compatibility checks above. Existing F12-T07
uncommitted secret-rotation files and their plan hunks are preserved and excluded from the F12-T08 commit. The
run-owned PostgreSQL container was removed after review. T08 is accepted; B05 remains unstarted.

## F12-T08 corrective dependency remediation R1 — REWORK

Batch ID: F12-B04-R1
Recorded at: 2026-10-02 +03:30
Coordinator/Thread: Codex /root

The initial run-owned `%TEMP%/mushroom-f12-t08-pnpm-audit.json` was parsed before change: the reported `10 critical`
and `37 high` are **30 unique GHSA advisories**, represented by **35 HIGH/CRITICAL advisory-plus-patched-version
entries** (five `fast-uri` advisories each appear for its two supported major branches), over **47 advisory-path
occurrences** and **18 distinct dependency paths**. They are not 47 different advisories. `pnpm why` was run for
every affected package path. The findings,
their advisory-recommended patched version, and the parent/path decision were:

| Group / resolved package path | Advisory IDs and patched version requested by the advisory | Compatibility-reviewed action |
| --- | --- | --- |
| `apps/{app,dashboard,web} > next` | `GHSA-2xp9-vwfh-vxw4 >=16.3.3`; `GHSA-p293-qw3h-jr36 >=16.3.3`; `GHSA-vcvr-r3jv-pc5j >=16.3.6` (each on all three direct workspace paths) | Direct Next upgrade `16.3.1 → 16.3.8`; its resolved `sharp` path also clears `GHSA-rgj7-g3m4-5g8c >=0.35.4`. |
| `apps/api > @nestjs/platform-fastify > @fastify/middie` | `GHSA-72c6-fx6q-fr5w >=9.3.2`; `GHSA-8p85-9qpw-fwgw >=9.2.0`; `GHSA-cxrg-g7r8-w69p >=9.1.0`; `GHSA-v9ww-2j6r-98q6 >=9.3.2` | Aligned Nest `11.1.8 → 11.2.7`, then a same-major Fastify override after parent inspection; final audit contains no middie finding. |
| `apps/api > @nestjs/platform-fastify` | `GHSA-6v32-fjc9-9qf6 >=11.1.24`; `GHSA-r4wm-x892-vjmx >=11.1.14`; `GHSA-wf42-42fg-fg84 >=11.1.16`; `GHSA-9c5c-9qcx-q35q >=11.2.4` | Direct aligned Nest `common/core/platform-fastify/platform-socket.io/websockets` update to `11.2.7`. |
| `apps/api > {fastify, @nestjs/platform-fastify > fastify}` | `GHSA-247c-9743-5963 >=5.8.5`; `GHSA-jx2c-rxcm-jvmq >=5.7.2`; `GHSA-667r-xxjv-c9mm`, `GHSA-p68q-wchp-6fh7`, `GHSA-hwr6-493r-vm6h`, `GHSA-9q9j-q6p8-xq58` (each `>=5.12.2`) | Direct Fastify `5.6.0 → 5.12.5`; Nest 11.2.7 still pins `5.11.3`, so a bounded `@nestjs/platform-fastify>fastify: 5.12.5` same-major override was independently tested. |
| `apps/api > @fastify/static > glob > minimatch > brace-expansion` | `GHSA-6j4f-fj2g-mc7p >=5.0.10`; `GHSA-qhr7-859c-m2p7 >=5.0.11` | Direct static update `8.3.0 → 10.1.5`; its still-pinned `brace-expansion@5.0.9` received only a same-major patch override to `5.0.11`. |
| `apps/api > @nestjs/core > path-to-regexp` and `apps/api > joi` | `GHSA-j3q9-mxjg-w52f >=8.4.0`; `GHSA-6h2x-m376-mqjq >=18.2.6` | The aligned Nest update clears the former; direct Joi update `18.2.5 → 18.2.9` clears the latter. |
| Fastify AJV chains: `... > {fast-uri@4, ajv > fast-uri@3}` | `GHSA-5jgf-p345-68v8`, `GHSA-f65p-4m7j-42xc`, `GHSA-fph4-wmhf-6fwf` (each `>=4.1.3` / `>=3.1.6` per path); `GHSA-jqff-g426-hqxp >=4.1.3 / >=3.1.6`; `GHSA-qw65-cvwx-89v3 >=4.1.4 / >=3.1.7` | `pnpm why` identified `fast-uri@4.1.2` and `3.1.5`; bounded patch-only overrides select `4.1.4` and `3.1.7` within their existing major ranges. |
| Prisma chains: `apps/api > @prisma/client > prisma > @prisma/config > deepmerge-ts` and `... > prisma > mysql2` | `GHSA-ggr8-5vv4-36mx >=8.0.0`; `GHSA-3f6p-5ww8-9rcr >=3.22.0` | Direct Prisma family update `7.9.1 → 7.10.0` was the current stable parent upgrade; it still resolves `deepmerge-ts@7.1.5` and `mysql2@3.15.3`. No override can satisfy these advisory requirements within their current majors. |

No `pnpm audit --fix --force`, blind major update, waiver, mute, or unreviewed override was used. Each override is
limited to a patched version in the existing dependency major and was followed by frozen-install integrity and
affected-package checks. The intended T08-only files are the dependency manifests, root override policy and
lockfile; the uncommitted F12-T07 `.env.example`, validation, crypto service, tests, deploy procedure and their
shared-plan hunks remain preserved and excluded from any T08 stage/commit.

Verification:

- Per-group `pnpm install --frozen-lockfile` passed after the lockfile was generated; API, app, web and dashboard
  typechecks passed. API build (with disposable local test configuration) and app/web/dashboard builds passed.
  Package tests passed: app `45`, web `9`, dashboard `61`.
- Final `%TEMP%/mushroom-f12-t08-pnpm-audit-final.json` exits `1`, correctly because it reports `0 critical`,
  `2 high`, `6 moderate`, `0 low`. The two HIGH paths are precisely the two unresolved Prisma rows above.
- Disposable PostgreSQL abuse run `mushroom-f12-b04r1-postgres` was loopback-only, labelled `codex.batch=F12-B04-R1`
  and removed after verification. The recorded rerun `%TEMP%/mushroom-f12-t08-abuse-rerun.log` exited `0`: 5 files,
  25 tests, 83.02 seconds. It covers auth/session reuse and audit redaction, chat rate limit, Sadad callback
  allowlisting/redirect/fail-closed behavior, simulated timeout/duplicate-callback financial-effect protection. It
  makes no real Sadad request.
- There is no application Dockerfile, Compose file, Containerfile or committed release image artifact. Therefore
  release-container scanning is `N/A` with evidence, not a vulnerability waiver; the disposable PostgreSQL
  container is not a release artifact.

**Result: REWORK / unchecked.** The remaining HIGH advisories are not hidden. The project owner must approve a
Prisma-major compatibility remediation (Prisma 8 is currently pre-release) or wait for a compatible stable parent
release. Only then may F12-T08 rerun the production audit and abuse suite. F12-T13 release sign-off remains blocked;
no T08 completion commit exists.

## F12-B04 handoff — F12-T07 blocked and F12-T08 rework

Batch ID: F12-B04
Recorded at: 2026-10-02 +03:30
Coordinator/Thread: Codex /root
Result: closed without a successor batch; only F12-T04 is accepted/committed.

### F12-T07 — software rotation coverage, external-capability blocker

- Inventory confirms runtime values are intended for a deployment managed-secret boundary; merchant/terminal material
  remains exclusively in immutable encrypted payment-provider credential revisions. No real secret was read, written,
  logged or committed.
- A real software gap was found and covered: historical credential revisions stored a key version but decrypt used
  only the current key. The prepared versioned managed-secret keyring keeps an old version decryptable after a new
  write key is promoted, rejects malformed/duplicate keyring entries, and fails closed when a required historic key
  is unavailable. The synthetic unit/environment tests pass (2 files, 11 tests), as do a disposable PostgreSQL
  payment-provider configuration and credential-retention run (2 files, 2 tests) and API typecheck.
- `deploy/phase-12-secret-rotation.md` records the 90-day/exposure procedure, rollback, retention and secret-free
  evidence requirements. It expressly does not claim a provider drill or expose a key.
- **BLOCKED / unchecked:** no written Liara evidence yet proves managed runtime secrets, versioned references,
  auditability, or a no-disclosure/no-disruption rotation procedure in the selected staging/production service. The
  project owner must obtain that evidence and authorize a real environment drill. Until then this remains an F12-T13
  release-sign-off gate, and there is no F12-T07 completion commit.

### F12-T08 — scan and abuse review

- `pnpm audit --prod --json` exited `1` and its run-owned JSON is retained at
  `%TEMP%/mushroom-f12-t08-pnpm-audit.json`. It reports `10 critical`, `37 high`, `17 moderate` and `1 low`
  vulnerabilities across 488 production dependencies. Critical findings include the Next.js chain and
  `@fastify/middie`; high findings include Fastify, `@nestjs/platform-fastify`, `@fastify/static`, `joi`,
  `path-to-regexp`, `sharp`, `fast-uri`, `deepmerge-ts`, `brace-expansion` and `mysql2` paths. They are not muted,
  threshold-filtered, waived or treated as a passing result.
- Targeted disposable-PostgreSQL abuse coverage completed successfully: auth session/reuse and audit redaction,
  chat rate limits, Sadad callback allowlisting/redirect profiles/fail-closed gate, and simulated timeout/duplicate
  financial-effect protection. No real Sadad request occurs in these tests.
- No application Dockerfile, Compose file or committed container image artifact exists, so an application-image scan
  is `N/A`; the local PostgreSQL test container is not a release artifact. This does not waive the dependency result.
- **REWORK / unchecked:** an approved, separately reviewed dependency remediation and compatibility plan is required
  before altering direct versions/lockfile across the API and the three Next.js applications. After remediation,
  rerun the production audit and the same abuse coverage; F12-T13 remains blocked until no unreviewed release
  findings remain.

## F12-T04 — measured query, pool and timeout review

Task ID: F12-T04
Batch ID: F12-B04
Completed at: 2026-10-02 +03:30
Agent/Thread: Codex /root
Review result: PASS; accepted and ready for its independent task commit.

Decision and scope:

- The accepted F12-T03 mixed profile (`17,990/18,000`, `99.944444%`, p95 `21.8106ms`) supplied no measured
  query, connection-pool or timeout bottleneck. This task therefore made no speculative runtime, index, datastore
  or scale-topology change.
- A new opt-in disposable-PostgreSQL regression test records `EXPLAIN (ANALYZE, BUFFERS, COSTS OFF, FORMAT JSON)`
  for the active-offerings directory, patient appointment-history and payment-reconciliation release query shapes.
  All plans completed with clinic scoping and measurable planning/execution timings; the test deliberately records
  rather than invents an unapproved performance threshold.
- The same test starts 25 concurrent short database sleeps through the application Prisma service and observes the
  existing bounded pool (configured maximum `20`) without exceeding it. A controlled `statement_timeout` cancellation
  is then required to surface, and a subsequent query proves connection recovery. This is local fault injection, not
  a production timeout setting change.

Verification, environment and review:

- `pnpm --filter @sabz-zendegi/api test:phase-12-performance` → PASS (`1` file, `2` tests; `16.28s`). The initial
  test instrumentation accidentally observed lazy Prisma promises and selected a void `pg_sleep` result; both were
  corrected before this accepted run. Neither was a product finding or used as performance evidence.
- `pnpm --filter @sabz-zendegi/api typecheck` (including Prisma generation) → PASS.
- `git diff --check` → PASS. The test-only owned-path review → PASS: one opt-in API performance test and command,
  plus coordinator-only Phase 12 checklist/status/evidence changed; no schema, migration, dependency, runtime pool,
  index, secret, provider setting or unrelated path changed.
- The test used only the run-owned local `postgres:16-alpine` container for F12-B04 on loopback with a separate
  parent database. Its generated child database was absent after cleanup. No shared/Liara/production database or
  Sadad endpoint was contacted; this evidence does not claim production or Liara capacity.

Result:

- `F12-T04` is DONE with an evidence-based no-change decision. Future changes to pool size, indexes, timeouts or
  topology require a newly measured bottleneck and applicable change control.

## F12-T03 — capacity profiles and chat acceptance

Task ID: F12-T03
Batch ID: F12-B03-R3
Completed at: 2026-10-02 +03:30
Agent/Thread: Codex /root
Review result: PASS; accepted and ready for its independent task commit.

Scope and contract correction:

- Frozen mixed acceptance is the prior durable run's `17,990/18,000` successful requests (`99.944444%`) and p95
  `21.8106ms`; it meets the authoritative `>=99%` success and p95 `<=750ms` contract. The ten 401 responses were
  caused by a test token issued before setup and rotated only by loop second; they are a harness artifact, not a
  product/capacity failure. No mixed rerun occurred.
- The harness now reads each JWT's actual integer `exp` claim and rotates the same persisted Session token with a
  30-second safety margin. The old 15-minute comment and iteration-based rotation are removed. The all-route-2xx
  condition remains only in the short preflight, not as a mixed acceptance gate.
- Boundary preflight: PASS — test TypeScript compilation plus the opt-in two-second mixed wiring run passed; all eight
  selected routes were 2xx, clinical access audits were written, a forced pre-expiry rotation issued a distinct valid
  token for the persisted Session, and its child database cleanup completed.

Frozen chat execution:

- Durable stdout: `%TEMP%/mushroom-f12-t03-chat-acceptance.log`; stderr:
  `%TEMP%/mushroom-f12-t03-chat-acceptance.log.err`.
- Exit code: `0`; Vitest: `1` file / `2` tests passed; reported duration: `2202.78s` (`2200.62s` tests).
- The accepted workload remained exact: `20 msg/s × 30 min`, a `61s` gap, then `50 msg/s × 5 min`. The test's
  per-batch `<=1000ms` assertion passed throughout. The final invariant passed: each conversation has count and
  maximum sequence both equal to `511`, so no durable sequence gap remains.
- Stderr contained one non-failing pg deprecation warning about overlapping `client.query()` execution; it did not
  alter the exit code, timing assertions or final invariants and is not treated as an acceptance failure.

Environment, review and cleanup:

- Only run-owned local PostgreSQL was used: `postgres:16-alpine`, loopback `127.0.0.1:17781`, 1 GiB / 2 CPUs and
  label `codex.task=F12-T03`. No shared/production/Liara database or Sadad endpoint was contacted; this result does
  not claim production capacity or Liara readiness.
- API typecheck (including Prisma generation) → PASS. `git diff --check` → PASS. Owned-path review → PASS: only the
  capacity commands/harnesses and coordinator-only Phase 12 status/evidence/checklist changed; no payment runtime,
  schema/migration, dependency, workflow, secret or F12-T05/T06 path changed.
- The chat child database was absent after the test cleanup; the labeled run-owned container was then stopped and its
  `--rm` removal completed. Mixed, booking-conflict and simulated-Sadad results were preserved and not rerun.

Next batch:

- `F12-B04` is not claimed or started. `F12-T05` remains independently BLOCKED pending written Liara WAL/archive,
  restore/PITR and RPO/RTO capability evidence.

## F12-T03 — serial acceptance R2 (REWORK)

Task ID: F12-T03
Batch ID: F12-B03-R2
Run: 2026-10-01 22:22–22:53 +03:30
Result: REWORK; unchecked, unclaimed, no task-completion commit.

Durable logs:

- stdout: `%TEMP%/mushroom-f12-t03-serial-acceptance.log`
- stderr: `%TEMP%/mushroom-f12-t03-serial-acceptance.log.err`

Preflight and mixed result:

- Preflight PASSed before the acceptance run: all eight selected routes were 2xx; empty clinical timeline/history
  emitted audits; rotating and post-profile tokens were verified against the persisted fixture Session; child-database
  cleanup passed. A real credential was also required by `/v1/me`; Session alone fixes the clinical audit FK but not
  current-account availability.
- Mixed executed the frozen `10 req/s × 1,800 s` profile: `18,000` requests, `17,990` success, `99.944444%`, p95
  `21.8106ms`. The threshold checks pass, but the explicit per-route all-2xx gate failed: ten `401`s appeared at
  token-expiry boundaries (`/assessments` 1, timeline 1, appointments 2, history 2, `/me` 1, directory 1,
  onboarding 1, booking-eligibility 1). Clinical audit count was `4,497` and the post-profile token was tied to the
  persisted Session.
- Exit codes: mixed `1`; chat `-1` (not started by the serial runner after mixed failed). Therefore there is no R2
  chat result for the frozen `20 msg/s × 30 min`, 61-second gap, `50 msg/s × 5 min`, `<=1000ms` batches or its final
  invariants. The known prior diagnostic evidence remains preserved and is not a substitute for this acceptance run.

Correction (2026-10-02):

- The frozen mixed acceptance contract is only `>=99%` success and p95 `<=750ms`. R2's `17,990/18,000`
  (`99.944444%`) and p95 `21.8106ms` therefore PASS. The previous per-route all-2xx assertion was not an
  authoritative acceptance gate. Its ten 401s arose because the 10-minute JWT was issued before loop setup but was
  rotated only at the loop's second-600 boundary; they are a known harness artifact, not a product/capacity failure.
- F12-B03-R3 uses the token's actual JWT `exp` claim plus a safety margin, validates that boundary in a short
  preflight, and then runs only the still-unverified frozen chat workload. R2 mixed, booking-conflict and
  simulated-Sadad results are retained and are not rerun.

## F12-T03 — capacity profile execution (REWORK)

Task ID: F12-T03
Batch ID: F12-B03-R1
Executed at: 2026-10-01 18:20–21:35 +03:30
Agent/Thread: Codex /root
Review result: REWORK; unchecked, unclaimed and not committed.

Run-owned environment:

- Docker Desktop engine `28.4.0`; container `mushroom-f12-t03-postgres` on `postgres:16-alpine` / PostgreSQL `16.14`.
- Container constraints: 1 GiB memory, 2 CPUs; random loopback-only host port `17781`; label `codex.task=F12-T03`.
- Every test database was a uniquely named child of the local run-owned parent. No shared, production, Liara or Sadad
  service was contacted. Results do not demonstrate production capacity or Liara readiness.

Verification and findings:

- Harness typecheck and short preflight exercised migration, seed, authentication, selected routes and child-database
  cleanup. The preflight is explicitly non-acceptance; its opt-in two-second duration does not change the approved
  30-minute profile.
- The first durable mixed run completed `1,800` seconds and `18,000` requests, with p95 `43.78ms`, but failed at
  `20.83%` success after the initial harness omitted token rotation. That result is diagnostic only.
- After rotating the synthetic token during the profile, the second durable mixed run completed `1,800` seconds and
  `18,000` requests, p95 `48.84ms`, and `11,250/18,000` successful requests (`62.5%`): FAIL against the frozen
  `>=99%` criterion. The contract and thresholds were not changed.
- Diagnostic preflight produced: `/v1/me` → `401` (synthetic patient has no durable session); `/v1/patients/me/clinical/timeline`
  and `/v1/patients/me/clinical/history` → `503` (fixture has no clinical journey data). Assessment, onboarding,
  booking eligibility, directory and appointment-list journeys returned `200`.
- Booking conflict and simulated-only Sadad financial idempotency were independently verified on a separate disposable
  child database: `patient-appointments.integration.spec.ts` and `commerce-checkout.integration.spec.ts` → `2 files,
  8 tests PASS`. This includes one-slot conflict protection, duplicate callback/Verify, retry/reconciliation,
  mismatch rejection and exactly-one financial effect; no Sadad transport was used.
- The earlier Phase-10 chat workload has no durable final result for this run and is not accepted here. Its frozen
  `20 msg/s × 30 min`, 61-second gap, `50 msg/s × 5 min`, `<=1000ms` contract remains unchanged; historical
  `1015ms`/`1032ms`, CI isolation and scheduled/manual outcome remain inputs, not a replacement execution.

Safe next action:

- Build a valid durable-session fixture and clinical timeline/history fixture for every selected authenticated release
  journey, ensure the test token is valid through the post-profile booking check, rerun the short preflight, then
  rerun only the approved mixed profile and the still-unverified frozen chat profile with durable logs. Keep F12-T03
  unchecked until those runs satisfy their frozen gates. Do not start F12-B04.

## F12-T06 — object-storage applicability review

Task ID: F12-T06
Completed at: 2026-10-01 17:45 +03:30
Agent/Thread: Codex /root
Batch ID: F12-B03 (reduced)
Reviewed by: Codex /root

Changed files:

- `plan/contracts/phase-12-object-storage-decision.md`
- `plan/STATUS.md`, `plan/phases/12-PRODUCTION-HARDENING.md`, `plan/logs/phase-12.md`

Verification:

- Source-consumer inventory across API routes/services, Prisma schema/migrations, app/dashboard/web source, workspace
  packages, dependency manifests and deployment configuration → PASS: no multipart/upload transport, presigned URL,
  object-store SDK, bucket configuration, file/attachment/media model or API-backed product consumer exists.
- Phase 10 contract/migration cross-check → PASS: chat attachment is explicitly `DEFERRED / NOT_APPLICABLE FOR MVP`;
  its persistence migration explicitly creates no attachment transport or storage.
- No-storage-infrastructure/dependency/configuration review and `git diff --check` → PASS.

Result:

- Object storage remains `N/A` for the initial release. The decision records no provider/bucket/configuration and a
  mandatory product-owner re-entry review for any future real binary consumer, including private access, validation,
  quarantine, retention/disposition, restore and secret boundaries.
- No object-storage infrastructure, dependency, schema, secret, deployment, provider contact, push or PR was added.

Batch exclusions and next action:

- `F12-T03` remains `BLOCKED` and unchecked. Docker Desktop's engine is not running and no local PostgreSQL runtime
  exists; start a local disposable runtime before running the frozen capacity profiles. A real/shared database must not
  be used as a substitute.
- `F12-T05` remains `BLOCKED` and unchecked. The project owner must obtain written Liara evidence for daily backup,
  continuous WAL/archive, restore/PITR and supported RPO/RTO. The official Liara CLI documents manual backup creation,
  listing and download only; that is insufficient for recovery acceptance.
- Do not start F12-B04 in this handoff.

## F12-T02 REWORK — lossless Sadad financial integer serialization

Task ID: F12-T02
Completed at: 2026-10-01 17:20 +03:30
Agent/Thread: Codex /root
Batch ID: F12-B02-R1
Reviewed by: Codex /root

Corrective finding:

- The original F12-T02 adapter passed `Amount` and `OrderId` as `bigint.toString()` values into `JSON.stringify`,
  making frozen `Number`/`Number(Long)` fields quoted JSON strings. Its `response.json()` path could also coerce an
  unsafe provider financial integer before Verify performs immutable amount/order matching.

Changed files:

- `apps/api/src/modules/commerce/payments/sadad-payment-provider.adapter.ts`
- `apps/api/test/sadad-payment-provider.adapter.spec.ts`
- `plan/STATUS.md`, `plan/phases/12-PRODUCTION-HARDENING.md`, `plan/logs/phase-12.md`

Verification:

- API test TypeScript compilation → PASS.
- Focused `sadad-payment-provider.adapter.spec.ts` → PASS (1 file, 4 tests). A loopback HTTP server captures raw
  request text: ordinary values and `9223372036854775807` boundaries are unquoted JSON numeric literals; unsafe
  Number coercion and int64 overflow reject before fetch. The same loopback raw Verify response preserves exact
  `OrderId` and `Amount` values through adapter financial parsing. No external Sadad request occurs.
- `@sabz-zendegi/api-client` resolver diagnosis → worktree preparation cause confirmed: dashboard's workspace junction
  targets the correct package but its ignored `dist/index.js` export was absent in this newly prepared worktree.
  `pnpm --filter @sabz-zendegi/api-client build` recreated it without source drift; dashboard test → PASS (18 files,
  61 tests) and dashboard typecheck → PASS.
- `git diff --check` and owned-path review → PASS.

Result and remaining gates:

- Fetch serialization never converts bigint to JavaScript Number; bounded integer literals remain exact on the wire.
  Fetch response parsing captures top-level financial integer literals from raw JSON before native JSON parsing can
  lose precision, then Verify converts the exact decimal text to bounded bigint.
- The correction keeps the Nest runtime transport `SADAD_GO_LIVE_BLOCKED`; it does not provision infrastructure,
  contact Sadad, expose credentials, enable/default a provider, deploy, push, or create a PR.
- The disposable workspace harness was not reasserted in this corrective run because it requires a parent
  `DATABASE_URL`, which is absent from this worktree environment. That does not reclassify the resolver as a product
  defect; its affected package build, dashboard test and typecheck were rerun successfully.

Next batch:

- `F12-B03` remains eligible and unclaimed. Do not start it in this handoff.

## F12-T02 — Liara release path and Sadad software completion

Task ID: F12-T02
Completed at: 2026-09-30 23:06 +03:30
Agent/Thread: Codex /root
Batch ID: F12-B02
Reviewed by: Codex /root

Changed files:

- `deploy/phase-12-liara-release.md`
- `apps/api/.env.example`, environment validation and the ignored local API `.env` template
- Sadad adapter/payment port/orchestration and focused payment tests
- `plan/STATUS.md`, `plan/phases/12-PRODUCTION-HARDENING.md`, `plan/logs/phase-12.md`

Migrations, dependencies, generated API client and public API contract:

- none

Verification:

- API typecheck (including Prisma client generation) → PASS
- focused simulated Sadad adapter, payment contract and environment-validation tests: 3 files / 12 tests → PASS
- disposable PostgreSQL payment-provider configuration test → PASS; confirms encrypted revision handling and public
  callback/config enablement remain `SADAD_GO_LIVE_BLOCKED`
- disposable PostgreSQL commerce checkout test: 2 tests → PASS; confirms timeout/reconciliation, explicit same-attempt
  Verify retry, duplicate callback/Verify, mismatched amount/order and exactly one financial effect
- staged release-path and external-gate review → PASS
- `git diff --check` → PASS

Result:

- The deployment record fixes separate Liara staging/production, isolated PostgreSQL/HTTPS, immutable artifact
  promotion and owner-authorized rollback without provisioning any provider resource or performing a deployment.
- The Sadad adapter now serializes the frozen PaymentRequest and Verify protocol through a transport abstraction;
  simulated transport is explicit and test-only. The Nest-registered transport remains blocked, so an environment
  value cannot connect, enable/default, create a live attempt or accept a runtime callback.
- Non-success request results are persisted safely; request/Verify timeouts become reconciliation work and an explicit
  retry can use only the same timed-out attempt. Verify success still requires immutable order/amount/unit matching
  before the existing idempotent financial finalization.
- Merchant credentials remain only in encrypted credential revisions. The new environment entries are non-secret
  deployment controls or the external encryption-key reference; the local ignored template contains placeholders only.

Known limitations and gates:

- No real Sadad request, merchant acceptance test, static outbound-egress confirmation, credential provisioning,
  callback activation, enable/default, production deployment or release sign-off occurred. `SADAD_GO_LIVE_BLOCKED`
  remains required until all owner/merchant evidence is accepted by F12-T13.
- A full disposable-workspace test attempt stopped in the unrelated dashboard package before the API suite because its
  local resolver could not load `@sabz-zendegi/api-client`. Targeted API typecheck and all F12-T02 payment tests above
  passed; this does not represent an asserted whole-workspace PASS.

Next batch:

- `F12-B03` is eligible and unclaimed. Do not start it in this handoff.

## F12-T01 — target release, SLO, traffic profile and environment strategy

Task ID: F12-T01
Completed at: 2026-09-30 22:00 +03:30
Agent/Thread: Codex /root
Batch ID: F12-B01
Reviewed by: Codex /root

Changed files:

- `plan/contracts/phase-12-release-envelope.md`
- `plan/STATUS.md`
- `plan/phases/12-PRODUCTION-HARDENING.md`
- `plan/logs/phase-12.md`

Migrations:

- none

Tests run:

- release-envelope required-control traceability scan → PASS
- external-gate owner/boundary review → PASS
- no-secret/no-runtime owned-path review → PASS
- `git diff --check` → PASS

Result:

- The target release and approved F12-T02 Sadad extension are recorded without claiming payment activation or
  acceptance completion.
- Liara staging/production and manual artifact promotion/rollback are fixed; static outbound egress confirmation is
  assigned to the project owner and blocks only real Sadad connection/payment sign-off.
- Capacity, availability, RPO/RTO, secret rotation/key-readability, object-storage N/A and fail-closed Sadad rules are
  executable task inputs with owning future tasks.

Known limitations:

- Liara static outbound egress, merchant acceptance, backup/secret-store capability and monthly availability evidence
  remain future external/implementation gates. They do not block F12-T01.

Next batch:

- F12-B02 / F12-T02 remains unclaimed.
# F01-R05 — browser session continuity before protected requests

Task ID: F01-R05
Completed at: 2026-10-08 21:42 +03:30
Agent/Thread: Codex /root
Batch ID: F12-B15-R1
Reviewed by: Codex /root

Changed files:

- `packages/api-client/src/index.ts` and focused request-transport tests
- app/dashboard API clients, session managers, gates and focused session tests
- dashboard directory-settings API/UI and focused response-mapping tests
- `plan/STATUS.md`, `plan/phases/12-PRODUCTION-HARDENING.md`, `plan/logs/phase-12.md`

Migrations, dependencies and generated API contract:

- none

Verification:

- API client build and tests: 1 file / 5 tests → PASS
- app tests: 12 files / 49 tests → PASS
- dashboard tests: 18 files / 62 tests → PASS
- app and dashboard typechecks → PASS
- app and dashboard production builds → PASS
- `git diff --check` and owned-path review → PASS

Result:

- Every protected app/dashboard request now asks the existing session manager for a valid memory-only access token
  immediately before sending. An expired token is renewed through the existing credentialed, single-flight refresh
  flow; concurrent callers share that refresh and receive the renewed bearer token.
- Refresh/login remain outside the session-aware transport, preventing recursion. Failed refresh removes the stale
  bearer and drives the existing anonymous redirect without persisting tokens in browser storage.
- Access-token TTL remains ten minutes and refresh-session absolute deadlines remain 24 hours or 30 remembered days.
  The authenticated screen is retained while a background renewal runs.
- Dashboard settings now render a 401 as session expiry and reserve the permission-denied message for a real 403.

Known limitation:

- The correction covers HTTP API requests. Existing long-lived socket reconnect behavior was not changed because it
  is outside the reported protected-page regression and the task's frozen scope.

Next task in the active batch:

- `F09-T04-R1` remains claimed and is now active; make catalog browse/search/detail public while retaining protected
  patient commerce mutations.

## F09-T04-R1 — public commerce catalog boundary

Task ID: F09-T04-R1
Completed at: 2026-10-09 01:30 +03:30
Agent/Thread: Codex /root
Batch ID: F12-B15-R1
Reviewed by: Codex /root

Changed files:

- public commerce catalog controller/service plus focused API and OpenAPI contract tests
- app public store route group, protected app/onboarding layouts, optional session context and commerce adapter tests
- generated `packages/api-client/openapi.json` and `packages/api-client/src/schema.generated.ts`
- `plan/STATUS.md`, `plan/phases/12-PRODUCTION-HARDENING.md`, `plan/logs/phase-12.md`

Migrations and dependencies:

- none

Verification:

- disposable PostgreSQL workspace suite → PASS: 5/5 packages; API 95 files / 385 tests, app 12 / 50,
  dashboard 18 / 62, web 4 / 9 and API client 1 / 5
- API typecheck/build, app typecheck/production build and API-client build → PASS
- focused anonymous catalog, protected cart and OpenAPI security contract checks → PASS
- generated OpenAPI/client freshness, owned-path review and `git diff --check` → PASS

Result:

- **PASS / DONE.** Product browse, search and detail use no bearer token and resolve the deterministic active release
  clinic. Only active products, categories and SKUs are exposed; inactive and other-clinic records remain hidden.
- `/store` and product detail are public app routes. An optional authenticated session may add cart/wishlist state,
  but failure of that protected personalization cannot replace or hide the public catalog.
- Cart, wishlist, address, checkout, order and payment routes keep their existing authentication, ownership and
  authorization boundaries. Anonymous cart access is explicitly covered as `401`.
- No guest cart, role expansion, multi-clinic selector, Prisma migration or payment behavior was introduced.

Known limitation:

- The release contract still assumes one active clinic. Deterministic first-active-clinic selection prevents data
  mixing if inconsistent data temporarily contains more than one, but multi-clinic storefront selection remains out
  of scope.

Next work:

- No new batch is claimed. `F12-T05` and `F12-T07` remain blocked on external provider evidence; `F12-T09` remains
  dependency-gated. `F12-T11` and `F12-T12` remain unclaimed.

## F12-T02-R20 — shared-dev browser hydration and fast frontend sync corrective

Task ID: F12-T02-R20
Completed at: 2026-10-10 02:04 UTC
Agent/Thread: Codex /root
Batch ID: F12-B02-R20
Reviewed by: Codex /root

Changed files:

- shared Next development-origin helper and all three frontend Next configurations
- shared-dev Compose environment, deployment lifecycle, examples and operator documentation
- focused origin, changed-watcher and release-pipeline contract tests
- `plan/STATUS.md` and `plan/logs/phase-12.md`

Migrations and dependencies:

- none

Verification:

- focused development-origin parser checks → PASS
- web, app and dashboard typechecks → PASS
- first, unchanged, dependency, API and individual web/app/dashboard sync simulations → PASS
- release-pipeline contract suite and shell syntax checks → PASS
- local Next 16 public-origin `/_next/hmr` handshake → `101 Switching Protocols`
- GitHub shared-dev sync run `38015897226` for commit `4ef2d24` → PASS
- fresh Chromium check on `https://dev.roxco.ir` → login/register visible, anonymous refresh `401`, no failed requests
- `git diff --check` and owned-path review → PASS

Result:

- **PASS / DONE.** The three Next development servers normalize the explicit `APP_ORIGINS` URLs into
  `allowedDevOrigins`, so remote HTTPS domains and configured LAN hostnames can establish the HMR connection required
  for client hydration.
- Shared-dev stays in true bind-mounted development mode and performs no full frontend build. A source-only change now
  recreates only the affected persistent watcher; dependency/runtime changes still recreate the complete compatible
  service set.
- Deployment now performs a browser-realistic WebSocket handshake with bounded CDN/watcher warm-up retries against
  every public frontend origin and records successful input hashes only after HTTP and HMR readiness pass.

Known limitation:

- A new public or LAN hostname still has to be added to the explicit origin environment. The deployment reuses the
  existing `APP_ORIGINS`, while a local workspace uses `NEXT_ALLOWED_DEV_ORIGINS` for Next and `APP_ORIGINS` for API
  CORS.

Next work:

- No server-side action remains for this corrective. Add future remote/LAN hostnames to the explicit Next/API origin
  lists before using them.

## F12-T12-R1 — public web self-hosted visual assets and mobile corrective

Task ID: F12-T12-R1
Completed at: 2026-10-10 02:33 UTC
Agent/Thread: Codex /root
Batch ID: F12-B12-R1
Reviewed by: Codex /root

Changed files:

- typed Lucide icon adapter and affected public-web content types
- self-hosted Yekan Bakh FaNum variable font plus Next local-font wiring and typography tokens
- public home page mobile boundary and hero heading typography
- `plan/STATUS.md` and `plan/logs/phase-12.md`

Migrations and dependencies:

- none; the existing `lucide-react` package is used and no runtime asset service was added

Verification:

- `pnpm --filter @sabz/web test` → PASS: 5 files / 12 tests
- `pnpm --filter @sabz/web typecheck` → PASS
- `pnpm --filter @sabz/web exec next build --webpack` → PASS: four static routes
- Chromium widths 320, 390, 768 and 1440 → exact viewport width, zero horizontal document overflow
- browser asset check → local Yekan Bakh WOFF2 loaded, 56 Lucide SVGs, zero Material Symbols or external icon/font request
- mobile document boundary → footer bottom equals document height; no trailing page padding
- GitHub shared-dev sync run `38017448280` for commit `9453128` → PASS
- fresh public Chromium at 390px → same-origin Yekan Bakh, 56 Lucide SVGs, no failed requests/overflow/trailing space
- `git diff --check` and owned-path review → PASS

Result:

- **PASS / DONE.** Missing Material Symbols can no longer become visible icon names or stretch mobile cards. Each
  existing icon token maps to a fitting local Lucide SVG and unsupported future tokens fail typecheck.
- Public web body and display headings use a preloaded, same-origin Yekan Bakh FaNum variable font with local system
  fallbacks, ligatures, kerning and antialiasing.
- The home wrapper clips decorative horizontal paint and no longer adds 80 pixels below the mobile footer.

Known limitation:

- This focused corrective does not complete the broader `F12-T12` browser/device/accessibility release matrix.

Next work:

- No server-side action remains for this corrective.

## F12-T12-R2 — public web alert severity color corrective

Task ID: F12-T12-R2
Completed at: 2026-10-10 19:08 +03:30
Agent/Thread: Codex /root
Batch ID: F12-B12-R2
Reviewed by: Codex /root

Changed files:

- public-web semantic color tokens
- inline authentication error alert styling
- Sonner severity variant styling
- `plan/STATUS.md` and `plan/logs/phase-12.md`

Migrations and dependencies:

- none

Verification:

- `pnpm --filter @sabz/web test` → PASS: 5 files / 12 tests
- `pnpm --filter @sabz/web typecheck` → PASS
- `pnpm --filter @sabz/web exec next build --webpack` → PASS: four static routes
- Chromium login flow with unavailable API → Persian auth error rendered through `role=alert` with red
  foreground/background/border
- Chromium information toast → blue foreground/background/border
- `git diff --check` and owned-path review → PASS

Result:

- **PASS / DONE.** Existing API error codes and Persian message mapping are unchanged. Their inline authentication
  presentation now has an explicit destructive theme token and a stronger red visual treatment.
- Sonner no longer forces every severity onto the neutral card palette: success is green, information is blue,
  warning is amber and error is red; default/loading notices remain neutral.

Known limitation:

- This focused corrective does not complete the broader `F12-T12` browser/device/accessibility release matrix.

Next work:

- Push `dev`, observe shared-dev sync and verify the public login failure state.

## F12-T02-R21 — shared-dev stalled frontend recovery

Task ID: F12-T02-R21
Completed at: 2026-10-10 UTC
Agent/Thread: Codex /root
Batch ID: F12-B02-R21
Reviewed by: Codex /root

Changed files:

- bounded frontend readiness and one-time watcher recovery in `deploy/vps/deploy-dev.sh`
- stalled-app recovery regression coverage in `scripts/test-vps-dev.sh`
- release contract assertions and operator documentation
- `plan/STATUS.md` and `plan/logs/phase-12.md`

Migrations and dependencies:

- none

Verification:

- `bash -n deploy/vps/deploy-dev.sh scripts/test-vps-dev.sh` → PASS
- `bash scripts/test-vps-dev.sh` → PASS, including six simulated app timeouts followed by isolated recovery
- `pnpm release:test` → PASS
- `git diff --check` and owned-path review → PASS

Result:

- **PASS / DONE.** A Next development watcher that starts at the container level but does not answer HTTP can no
  longer hold the workflow for repeated 30-second requests over tens of minutes.
- Deployment prints service/container/OOM diagnostics, deletes only that application's derived `.next` cache,
  recreates only that watcher once and runs a bounded second readiness window before accepting or rejecting source.

Known limitation:

- Recovery intentionally runs only once; a persistent application error fails deployment and keeps its diagnostics.

Next work:

- Push `dev`, verify the shared environment and record the external run outcome.

## F12-T02-R22 — stabilize the shared-dev app watcher

Task ID: F12-T02-R22
Completed at: 2026-10-10 UTC
Agent/Thread: Codex /root
Batch ID: F12-B02-R22
Reviewed by: Codex /root

Changed files:

- shared-dev `apps/app` watcher command in `deploy/vps/dev-service.sh`
- release command contract and operator documentation
- `plan/STATUS.md` and `plan/logs/phase-12.md`

Migrations and dependencies:

- none

Verification:

- shell syntax and `bash scripts/test-vps-dev.sh` → PASS
- `pnpm release:test` → PASS
- `git diff --check` and owned-path review → PASS

Result:

- **PASS / DONE.** Live recovery diagnostics proved the app served a root request but Turbopack repeatedly exited
  cleanly after reporting `next.config.ts` changes (`RestartCount=16`, `OOM=false`).
- Only the app now uses Next's webpack development compiler, retaining development HMR while avoiding the observed
  Turbopack/bind-mount restart loop. Web and dashboard keep their existing default compiler.

Known limitation:

- This is deliberately scoped to the live-failing app watcher; it does not change production builds.

Next work:

- Push `dev` and verify all shared-dev frontend origins plus the public app HMR handshake.

## F12-T02-R23 — remove shared-dev frontend memory ceilings

Task ID: F12-T02-R23
Completed at: 2026-10-10 UTC
Agent/Thread: Codex /root
Batch ID: F12-B02-R23
Reviewed by: Codex /root

Changed files:

- restored the original shared-dev app Next command in `deploy/vps/dev-service.sh`
- removed frontend-only memory limits from `deploy/vps/compose.dev.yaml`
- release policy assertion and operator documentation
- `plan/STATUS.md` and `plan/logs/phase-12.md`

Migrations and dependencies:

- none

Verification:

- local app root compilation with Next webpack for diagnosis → PASS in 8 seconds, approximately 1.07 GiB
  `next-server` RSS
- shell syntax and `bash scripts/test-vps-dev.sh` → PASS
- `pnpm release:test` → PASS
- `git diff --check` and owned-path review → PASS

Result:

- **PASS / DONE.** The previous 768 MiB cgroup ceiling was below the measured memory demand of the app's first root
  compilation, so freeing host memory could not help the container. Web, app and dashboard may now use available host
  RAM in shared dev.
- App again uses the original default Next development compiler; this corrective does not change compilation mode,
  production builds, API/database limits or staging configuration.

Known limitation:

- Host-level capacity still must be sufficient; stopped staging containers now make that capacity available to dev.

Next work:

- Push `dev`, verify the shared-dev sync and all public frontend origins.

## F12-T12-R3 — Dashboard operational truthfulness and responsive navigation

Date: `2026-10-10 UTC`

Scope:

- removed fabricated order/message/bot counters and the unconditional message indicator;
- removed mock marketing, automation and bot routes from operational navigation and made direct visits explicitly
  unavailable without rendering sample data;
- exposed the real audit viewer, removed the inert global search, and rendered session-backed account identity;
- resolved the authorized clinic from `/v1/admin/clinic` for CRM instead of accepting a pasted UUID;
- replaced raw chat appointment UUID entry with the real authorized appointment list while retaining server-side chat
  authorization;
- separated health patient-list failure from a valid empty list and added responsive dashboard navigation.

Changed paths:

- `apps/dashboard/src/{app/(app)/**,components/layout/**,features/{health-tracking,messages,store-crm}/**,lib/**}`
- `plan/{STATUS.md,phases/12-PRODUCTION-HARDENING.md,logs/phase-12.md}`

Verification:

- dashboard Vitest → PASS, `20` files and `66/66` tests;
- dashboard TypeScript and ESLint → PASS;
- operational route/mock and fabricated-badge scans → PASS;
- `git diff --check` → PASS;
- direct `tsc --showConfig` → valid JSON and dashboard `tsc --noEmit` → PASS;
- Next production build could not run inside this executor: Turbopack child CSS processing cannot bind an internal
  port and the webpack path cannot capture child-process `tsc --showConfig` stdout. Both are executor restrictions;
  shared-dev/CI route compilation remains the post-push external verification.

Result:

- **PASS / DONE pending external compile observation.** Operational dashboard navigation no longer reports fabricated
  counts or presents mock feature data as real. Existing API authorization remains authoritative and no backend,
  database, OpenAPI or generated-client contract changed.

Next work:

- Push `dev`, watch the shared-dev workflow, and request representative dashboard routes from
  `https://dev-dashboard.roxco.ir` to confirm compilation.

## F12-T12-R4 — Dashboard settings workflow corrective

Date: `2026-10-10 UTC`

Problem and accepted behavior:

- the old UI created a doctor without a specialty and then attempted to publish it without `specialtyIds`, which the
  accepted API correctly rejects;
- specialties were created as unpublished but had no publish action, so the doctor publication prerequisite could not
  be completed from the dashboard;
- doctor, offering, availability and leave forms shared selection/date state, mutation errors discarded stable API
  codes, fields remained populated after success, and a successful write followed by refresh failure looked like a
  failed write;
- payment credential failures produced no user-facing result.

Implementation:

- added a server-confirmed five-step progress model for published specialty, doctor, service, offering and schedule;
- new specialty/doctor/service/offering records are created active and published with all accepted parent
  prerequisites, while legacy drafts receive explicit completion actions;
- preserved directory/scheduling error codes and mapped duplicate name/offering, invalid publication, invalid input
  and overlap cases to Persian messages;
- separated all form state, converted user-facing toman to the API's IRR contract, named ISO weekdays, retained old
  data when a post-write refresh fails, and moved payment configuration into a collapsed advanced section;
- directory settings now request up to 100 records per accepted list endpoint instead of silently relying on the
  smaller default page.

Verification:

- dashboard Vitest → PASS, `21` files and `69/69` tests;
- dashboard TypeScript and ESLint → PASS;
- settings publication/placeholder scan and `git diff --check` → PASS;
- focused tests cover draft-vs-operational progress, full readiness, specialty publication transport and stable API
  error preservation;
- Next production build remains unavailable in this executor because Next child-process stdout is suppressed; live
  shared-dev `/settings` compilation is the external post-push gate.

Result:

- **PASS / DONE pending external compile observation.** No API, database, OpenAPI, generated-client, permission or
  payment activation contract changed.

Next work:

- Push `dev`, observe the shared-dev sync and request `https://dev-dashboard.roxco.ir/settings`.

## F12-T12-R5 — Dashboard settings pagination contract corrective

Date: `2026-10-10 UTC`

Problem and diagnosis:

- an authenticated Chromium run against `https://dev-dashboard.roxco.ir/settings` confirmed login and refresh both
  returned `200`, so session continuity and account access were valid;
- `/v1/admin/clinic` returned `200`, while all seven paginated directory/scheduling requests returned
  `400 BAD_REQUEST` with `pageSize must not be greater than 50` because the dashboard sent `pageSize=100`;
- `loadDirectorySettings` intentionally aggregates the required sources, so those invalid queries correctly surfaced
  as the generic settings load failure. The R4 assumption that `100` was accepted was incorrect.

Implementation:

- aligned the shared settings list query with the existing API maximum `pageSize=50`;
- extended the adapter regression test to inspect every emitted list URL and require `page=1&pageSize=50`;
- kept API, OpenAPI, database, session, role and permission contracts unchanged.

Verification:

- focused directory settings adapter test → PASS, `7/7` tests;
- full dashboard Vitest → PASS, `21` files and `69/69` tests;
- dashboard TypeScript and ESLint → PASS;
- `git diff --check` → PASS.

Result:

- **PASS / DONE pending post-push shared-dev observation.** The authenticated failure is a frontend/API pagination
  mismatch, not a session, credential or authorization failure.

Next work:

- Push `dev`, observe the shared-dev deployment, and repeat the authenticated browser run to confirm all settings list
  requests return `2xx` and the settings workflow renders.

## F12-T12-R6 — Responsive settings overview and focused editors

Date: `2026-10-10 UTC`

Problem and accepted behavior:

- every settings form was expanded on initial load, making operational status difficult to scan and exposing all
  mutations at once;
- settings must open read-first with server-backed clinic/status summaries, then require an explicit category choice
  before any editable control is shown;
- the selected editor must remain usable on narrow mobile and desktop viewports, keep keyboard focus inside, close by
  Escape/backdrop when idle, and discard unsaved drafts when closed.

Implementation:

- replaced the long initial form stack with a clinic overview, four operational counts, five readiness indicators and
  eight descriptive category cards;
- moved clinic, specialty, doctor, service, offering, schedule, closure/leave and payment forms into one focused
  responsive dialog: full-height on mobile and bounded/scrollable on desktop;
- added focus restore/trapping, body scroll lock, Escape/backdrop close, disabled close during directory/scheduling
  writes and draft reset on open/close;
- preserved every existing API mutation, validation, publication prerequisite, server refresh and stable error message.

Verification:

- dashboard Vitest → PASS, `21` files and `69/69` tests;
- dashboard TypeScript and ESLint → PASS;
- `git diff --check` → PASS.

Result:

- **PASS / DONE pending post-push responsive browser observation.** No API, database, OpenAPI, generated-client,
  authentication, authorization or payment activation contract changed.

Next work:

- Push `dev`, observe deployment, and verify overview/editor behavior at desktop and mobile widths without submitting
  any mutation.


## F12-T12-R7 — Complete settings lifecycle and Sadad credential contract

Date: `2026-10-10 UTC`

Problem and accepted behavior:

- settings records could be created and some could be published, but existing tariffs, schedules, closures and other directory records had no complete edit/delete lifecycle in the dashboard;
- destructive actions must be explicit and dependency-aware, while records already used by bookings or other settings must remain available for deactivation;
- the Sadad editor exposed one ambiguous secret although the runtime adapter requires Merchant ID, Terminal ID and a Base64 TripleDES Terminal Key.

Implementation:

- connected every existing directory and scheduling PATCH/DELETE endpoint to the settings UI, with prefilled edit forms, activate/deactivate controls, inline confirmed deletion and actionable `DIRECTORY_RECORD_IN_USE` feedback;
- made doctor specialties multi-select, made every tariff field editable, and distinguished doctor leave from additional availability in schedule exceptions;
- added typed dashboard adapters for scheduling updates and all supported deletes, including correct handling of empty `204` responses;
- replaced the Sadad secret input with the three issued credential fields and clear replacement/write-only behavior;
- defined the three-field credential DTO in the API/OpenAPI contract, made it required, rejected missing/extra/invalid data, verified the terminal key decodes to exactly 24 bytes, and retained encrypted revision rotation without exposing secret values;
- regenerated the checked-in OpenAPI document and TypeScript client.

Verification:

- API test TypeScript → PASS;
- API OpenAPI contract → PASS, `7/7` tests;
- API production TypeScript/OpenAPI export and generated API-client build → PASS;
- dashboard TypeScript and targeted ESLint → PASS;
- dashboard Vitest → PASS, `22` files and `73/73` tests;
- `git diff --check` → PASS;
- default Next/Turbopack production build could not open its internal CSS worker port in the restricted workspace (`Operation not permitted`); direct TypeScript, ESLint and all dashboard tests passed. The webpack fallback reached Next's TypeScript config probe but hit the repository/toolchain `--showConfig` parsing failure.

Result:

- **PASS / DONE pending post-push shared-dev browser observation.** Payment enablement remains blocked and no migration, role or permission change was introduced.

Next work:

- push `dev`, observe the deployment, then inspect settings cards/editors on desktop and mobile and confirm the three Sadad labels without submitting real credentials.

## F12-T12-R8 — Payment adapter control center and callback guidance

Date: `2026-10-11 UTC`

Problem and accepted behavior:

- payment settings were a Sadad-only credential form and did not expose the registered adapters, per-adapter state, default selection or environment callback information;
- the dashboard must derive public callback guidance from the current environment's public API URL, not from the dashboard/browser origin;
- disabling payment must remain available as an emergency action, while enabling a provider must respect the server-owned `goLiveReady` gate.

Implementation:

- replaced the single form with a registry-driven adapter overview, aggregate online-payment state, adapter cards and a focused adapter detail view;
- added per-adapter enable/disable and default-provider controls through the existing authorized provider-config endpoint, plus a payment-wide off action that disables all currently enabled adapters;
- made provider disable clear `isDefault` atomically so a disabled adapter cannot remain the default;
- added the Sadad credential editor inside its adapter detail and retained encrypted write-only revision rotation;
- added copyable callback, PaymentRequest and Verify addresses, readiness explanation and capability summary;
- built callback URLs from dashboard `PUBLIC_API_URL`, producing `https://dev-api.roxco.ir/v1/payments/providers/sadad/callback` in shared dev and the equivalent API origin in each other environment.

Verification:

- dashboard TypeScript and targeted ESLint → PASS;
- dashboard Vitest → PASS, `22` files and `75/75` tests;
- API test TypeScript → PASS;
- API OpenAPI contract → PASS, `7/7` tests;
- shared-dev runtime config inspection confirms `apiUrl=https://dev-api.roxco.ir`;
- `git diff --check` → PASS.

Result:

- **PASS / DONE pending post-push shared-dev browser observation.** Sadad enable/default remains unavailable while `goLiveReady=false`; no transport, payment-attempt, schema, migration, OpenAPI or credential-storage contract changed.

Next work:

- push `dev`, observe deployment, then inspect adapter overview/detail and responsive callback/credential layouts without entering real credentials.

## F12-T12-R9 — Sadad live runtime and administrator activation

Date: `2026-10-11 UTC`

Problem and accepted behavior:

- the Sadad adapter had a complete dormant protocol implementation, but Nest always registered a blocked transport and
  patient checkout could never receive a provider redirect;
- deployment permission to contact Sadad and clinic administrator enable/default state must remain separate controls;
- callbacks for an attempt already created must remain verifiable after an administrator disables new attempts, and no
  redirect or browser callback may create a financial effect without a matching server-to-server Verify.

Implementation:

- added validated `disabled/live` runtime configuration, bounded request timeout, exact public API callback, result URL
  and code-owned redirect profile; Compose and environment examples pass only these non-secret controls;
- wired the live Nest adapter to the fixed Sadad PaymentRequest and Verify HTTPS endpoints, retaining encrypted
  Merchant ID, Terminal ID and Terminal Key revisions in the database;
- connected patient payment creation to the enabled/default operational revision, moved the external request outside
  the database transaction, returned the allowlisted Sadad redirect to the app and made concurrent idempotent callers
  wait for the same attempt result rather than issuing another OrderId;
- implemented the public form callback, bounded its IP/order replay rate, correlated OrderId/Token, loaded the immutable
  credential revision, ran Verify and redirected with only the internal order ID; `0/100` are authoritative success,
  `-1/101` are non-success, and timeout/unknown results remain `REQUIRES_RECONCILIATION` on the same attempt;
- made a live runtime expose activation availability to Dashboard; enabling a dormant configured provider atomically
  promotes the credential reference into a new immutable `RIAL/goLiveReady` revision, while disabling clears default
  state and blocks only new attempts;
- regenerated OpenAPI/client artifacts, aligned the release/protocol contracts with the owner's explicit live-runtime
  authorization, and added `deploy/sadad-live-runbook.md` with the exact shared-dev callback/result values.

Verification:

- clean disposable PostgreSQL 16: all `33` migrations plus development seed → PASS;
- live provider configuration/activation/callback rate-limit integration → PASS, `1/1`;
- disabled-mode checkout, concurrent idempotency, Verify `0/100/-1/101`, timeout, unknown response, mismatch and
  exactly-one financial effect integration → PASS, `2/2`;
- API test TypeScript and focused config/adapter/runtime/contract/OpenAPI suite → PASS, `5` files and `27/27` tests;
- OpenAPI contract → PASS, `7/7`; generated API client drift check and TypeScript → PASS;
- app TypeScript and Vitest → PASS, `13` files and `52/52` tests;
- dashboard TypeScript, targeted ESLint and Vitest → PASS, `22` files and `75/75` tests;
- API production TypeScript/OpenAPI export and `git diff --check` → PASS.

Result:

- **PASS / DONE.** The repository is live-capable and defaults every deployment to `disabled`. No real credential was
  committed or logged, no external Sadad request was made, and no shared/production environment was mutated.

External activation:

- deploy the commit, apply the runbook values with the exact merchant-confirmed redirect profile, then use Dashboard to
  rotate the three credentials, enable Sadad and select it as default before the controlled low-value acceptance test.

## F12-T12-R10 — Shared-dev API artifact integrity corrective

Task ID: `F12-T12-R10`
Completed at: `2026-10-11 UTC`
Agent/Thread: `Codex /root`
Batch ID: `F12-B12-R10`
Reviewed by: `Codex /root`

Changed files:

- `deploy/vps/compose.dev.yaml`
- `deploy/vps/deploy-dev.sh`
- `deploy/vps/dev-service.sh`
- `scripts/test-vps-dev.sh`
- `scripts/test-release-pipeline.mjs`
- `plan/STATUS.md`
- `plan/phases/12-PRODUCTION-HARDENING.md`
- `plan/logs/phase-12.md`

Migrations:

- none.

Tests run:

- `bash -n deploy/vps/deploy-dev.sh deploy/vps/dev-service.sh scripts/test-vps-dev.sh` → PASS.
- `bash scripts/test-vps-dev.sh` → PASS, including an incoherent artifact marker on an unchanged source tree.
- `node scripts/test-release-pipeline.mjs` → PASS.
- `git diff --check` → PASS.

Result:

- an API artifact is accepted only when `apps/api/dist/main.js` exists and `dist/.source.sha256` matches the current
  API input fingerprint;
- compilation removes the whole stale dist directory and writes the marker only after TypeScript emits successfully;
- a same-SHA workflow rerun repairs stale JavaScript and recreates the API container instead of trusting state alone;
- Sadad still defaults to `disabled`, while the explicitly authorized runtime value `live` remains deployable.

Known limitations:

- the real VPS readiness observation occurs after this commit is pushed; the repository tests use an isolated fake
  Docker/Compose boundary and do not read or log any server runtime secret.

Next task:

- observe the shared-dev deployment and then complete the controlled Sadad credential/enablement acceptance flow.

## F12-T12-R11 — Shared-dev bootstrap control propagation corrective

Task ID: `F12-T12-R11`
Completed at: `2026-10-11 UTC`
Agent/Thread: `Codex /root`
Batch ID: `F12-B12-R11`
Reviewed by: `Codex /root`

Changed files:

- `deploy/vps/compose.dev.yaml`
- `scripts/test-release-pipeline.mjs`
- `plan/STATUS.md`
- `plan/phases/12-PRODUCTION-HARDENING.md`
- `plan/logs/phase-12.md`

Migrations:

- none.

Tests run:

- `node scripts/test-release-pipeline.mjs` → PASS.
- `bash -n deploy/vps/deploy-dev.sh deploy/vps/dev-service.sh scripts/test-vps-dev.sh` → PASS.
- `bash scripts/test-vps-dev.sh` → PASS.
- `git diff --check` → PASS.

Result:

- Compose now passes dependency install, seed, API client build, Prisma generation, migration, API compile, API source
  fingerprint and public runtime-config controls into the one-shot bootstrap container;
- the prior host-shell-only flags can no longer silently evaluate to `false` inside bootstrap;
- the contract test checks every required Compose mapping and would fail if one is removed.

Known limitations:

- GitHub run `38113797757` provided the failure evidence; the repaired VPS observation follows the corrective push.

Next task:

- observe shared-dev API readiness, then continue the controlled Sadad credential/enablement acceptance flow.

## F12-T12-R12 — Shared-dev bootstrap state reconciliation corrective

Task ID: `F12-T12-R12`
Completed at: `2026-10-11 UTC`
Agent/Thread: `Codex /root`
Batch ID: `F12-B12-R12`
Reviewed by: `Codex /root`

Changed files:

- `deploy/vps/deploy-dev.sh`
- `scripts/test-vps-dev.sh`
- `scripts/test-release-pipeline.mjs`
- `plan/STATUS.md`
- `plan/phases/12-PRODUCTION-HARDENING.md`
- `plan/logs/phase-12.md`

Migrations:

- no new migration; existing pending migrations are applied only through `prisma migrate deploy`.

Tests run:

- `bash -n deploy/vps/deploy-dev.sh deploy/vps/dev-service.sh scripts/test-vps-dev.sh` → PASS.
- `bash scripts/test-vps-dev.sh` → PASS, including runtime-contract state reconciliation.
- `node scripts/test-release-pipeline.mjs` → PASS.
- `git diff --check` → PASS.

Result:

- `deploy-dev.sh` itself now participates in the runtime fingerprint, so orchestration changes cannot reuse a state
  written by an older contract;
- a runtime-contract change forces API client build, Prisma generation, `prisma migrate deploy`, clean API compile and
  public runtime-config generation before service recreation;
- this repairs the stale state that allowed new refresh-session SQL to run before its existing versioned migration.

Known limitations:

- the live authenticated refresh acceptance check follows deployment because it requires the server database and an
  actual browser session; no credential or token is recorded in repository evidence.

Next task:

- verify shared-dev API health and browser refresh, then continue controlled Sadad activation.

## F01-R06-C — OTP-first web and SMS settings UX

Task ID: `F01-R06-C`
Completed at: `2026-10-12 UTC`
Agent/Thread: `Codex /root`
Batch ID: `F01-B06-C`
Reviewed by: `Codex /root`

Changed files:

- `apps/web/src/components/auth/{LoginForm,SignupForm,OtpAuthForm}.tsx`
- `apps/web/src/services/auth.{ts,test.ts}`
- `apps/dashboard/src/features/settings/{settings-page,sms-settings}.tsx`
- `apps/dashboard/src/lib/sms-settings-api.ts`
- `tests/e2e/phase-12/otp-auth.spec.ts`
- `playwright.otp.config.ts`

Migrations:

- none; the OTP/SMS schema migration and API contract are owned by `F01-R06-A/B`.

Tests run:

- web typecheck → PASS; web Vitest → 5 files / 13 tests PASS.
- dashboard typecheck → PASS; dashboard Vitest → 22 files / 75 tests PASS.
- API typecheck → PASS.
- Chrome browser OTP E2E with intercepted fake transport → 2/2 PASS: request, code input, credentialed verify response,
  refresh cookie and patient-app redirect; password UI regression also passed. No external provider or real SMS was used.
- `next build --webpack` for web and dashboard → PASS.
- `git diff --check` → PASS.

Result:

- login and signup present OTP first and retain password as the explicit alternate route; OTP form supports normalized Persian digits,
  browser autofill/paste, expiry/resend, phone correction, Persian errors and role-aware redirects.
- ADMIN has a responsive read-first SMS settings panel with dynamic provider fields, write-only secret preservation, enable/default,
  controlled connection/test-SMS actions, OTP policy and safe delivery-attempt history.
- default runtime remains fail-closed until an authorized administrator supplies credentials and enables a live provider.

Known limitations:

- plain Turbopack build could not run in the managed sandbox because its CSS worker attempts a forbidden local port bind;
  the equivalent webpack production builds and real Chromium E2E passed.

Deployment observation:

- GitHub Action [38173139936](https://github.com/Drshirmardi/mushroom/actions/runs/38173139936) for `23ffeae` passed in
  2m40s on `2026-10-12`.
- `https://dev-api.roxco.ir/v1/health/ready` returned `{"status":"ok"}` and `https://dev.roxco.ir/login` returned HTTP 200.

## F01-R06-B-R1 — حفظ کدهای پایدار خطای API و تکمیل قرارداد OTP

Task ID: F01-R06-B-R1
Completed at: 2026-10-12 Asia/Tehran
Agent/Thread: Codex /root
Batch ID: F01-B06-B-R1
Reviewed by: Codex /root

Changed files:

- `apps/api/src/common/errors/api-error.ts`
- `apps/api/src/modules/identity/presentation/http/auth.controller.ts`
- `apps/api/test/http-exception.filter.spec.ts`
- `apps/api/test/otp-error-contract.integration.spec.ts`
- `apps/api/test/openapi-contract.spec.ts`
- `apps/api/test/treatment-plan.integration.spec.ts`
- `apps/web/src/services/auth.ts`
- `apps/web/src/services/auth.test.ts`
- `packages/api-client/openapi.json`
- `packages/api-client/src/schema.generated.ts`
- `plan/STATUS.md`
- `plan/phases/12-PRODUCTION-HARDENING.md`
- `plan/logs/phase-12.md`

Migrations:

- none.

Tests run:

- API typecheck → PASS.
- Filter, OpenAPI contract and OTP HTTP integration tests → 3 files / 11 tests PASS; wrong OTP returns HTTP 401 with `OTP_INVALID`.
- Treatment plan integration → 1 file / 3 tests PASS, including registered `CLINICAL_RESOURCE_FORBIDDEN` response.
- API client generation, tests (5/5) and build → PASS.
- Web typecheck and tests (5 files / 14 tests) → PASS.
- `git diff --check` → PASS.
- Full API suite was attempted; it exposed unrelated reminders/outbox and database-fixture/config failures (including suites without `DATABASE_URL`). These remain outside this task and are not represented as passing.

Result:

- Stable literal API error codes are recognized instead of being collapsed into status fallbacks; unknown codes retain the fallback behavior.
- OTP response codes are documented in runtime OpenAPI and generated client types, with UI messages for the OTP account-provisioning and idempotency errors.
- Attachment assessment: the core diagnosis was correct, but limiting the fix to OTP-only registry entries would leave other emitted literal API errors unmapped. The registry now covers those literals as well; non-error role constants are excluded.

Known limitations:

- The broader API test suite has pre-existing/environment-dependent failures described above; focused task acceptance checks pass.

Next batch:

- No batch started; continue the existing Phase 12 eligibility/blockers after this handoff.

## F12-T06-R1 — Store product media backend foundation

Task ID: F12-T06-R1
Status: DONE (backend development slice only)
Completed at: 2026-10-14 Asia/Tehran
Batch ID: F12-MEDIA-B01A / Store Phase 04A
Agent/Thread and reviewer: Codex /root, Store media chat (one agent)
Authority: explicit product-owner storage re-entry approval, recorded in ADR-0015 and the historical F12-T06 decision addendum. Dependencies complete; no competing active owner. Initial-release N/A and independently blocked F12-T05/F12-T07 remain unchanged.
Task commit: `feat(F12-T06-R1): add private product media backend` (created after this evidence and final diff gate).

### Changed files

- `apps/api/.env.example`
- `apps/api/package.json`
- `pnpm-lock.yaml`
- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20261014120000_store_product_image/migration.sql`
- `apps/api/src/app.factory.ts`
- `apps/api/src/common/errors/api-error.ts`
- `apps/api/src/config/environment.validation.ts`
- `apps/api/src/modules/commerce/media/product-image.dto.ts`
- `apps/api/src/modules/commerce/media/product-image.errors.ts`
- `apps/api/src/modules/commerce/media/product-image-processor.ts`
- `apps/api/src/modules/commerce/media/product-image-storage.ts`
- `apps/api/src/modules/commerce/media/product-image-storage.module.ts`
- `apps/api/src/modules/commerce/media/product-image.service.ts`
- `apps/api/src/modules/commerce/media/product-image.controller.ts`
- `apps/api/src/modules/commerce/catalog/admin-commerce-catalog.dto.ts`
- `apps/api/src/modules/commerce/catalog/admin-commerce-catalog.module.ts`
- `apps/api/src/modules/commerce/catalog/admin-commerce-catalog.service.ts`
- `apps/api/src/modules/commerce/catalog/patient-commerce-catalog.dto.ts`
- `apps/api/src/modules/commerce/catalog/patient-commerce-catalog.service.ts`
- `apps/api/src/modules/commerce/cart/patient-commerce-cart.service.ts`
- `apps/api/src/modules/outbox/outbox.module.ts`
- `apps/api/src/modules/outbox/outbox.worker.ts`
- `apps/api/src/modules/outbox/product-image-cleanup.handler.ts`
- `apps/api/test/product-image-configuration.spec.ts`
- `apps/api/test/product-image-processor.spec.ts`
- `apps/api/test/product-image-storage.spec.ts`
- `apps/api/test/product-image.integration.spec.ts`
- `apps/api/test/product-image-migration.integration.spec.ts`
- `deploy/docker/api-entrypoint.mjs`
- `packages/api-client/openapi.json`
- `packages/api-client/src/schema.generated.ts`
- `plan/decisions/ADR-0015-store-product-media-development.md`
- `plan/contracts/store-product-media-v1.md`
- `plan/contracts/phase-12-object-storage-decision.md`
- `plan/phases/12-PRODUCTION-HARDENING.md`
- `plan/STATUS.md`
- `plan/logs/phase-12.md`

No dashboard/app source, protected slider-data.ts/justforcheck.md, historical migration, existing test assertion or unrelated user change was modified. Start baseline: branch `front`, clean HEAD `0e9141b16cc5e23ba5412bbc868791797656ef2c`.

### Migration and compatibility

New additive table `commerce_product_images` and READY/DELETE_PENDING enum; unique product ID and object key, restrict FK, WebP/size/dimension checks. Existing CommerceProduct/SKU data and relations are preserved. No backfill or binary database column. Products without an image return nullable metadata. The optional nullable DTO addition preserves existing generated-client consumers.

PostgreSQL 16 disposable container `mushroom-media-04a`, localhost port 55439/database media_04a and synthetic credentials: all 36 migrations and seed PASS. Upgrade test separately replays all 35 prior migrations into its own randomly named database, creates an old product, applies the new migration, proves the product unchanged with image:null, and checks uniqueness/WebP/dimension constraints. Test guard refuses other hosts/ports/databases; only its own database is dropped. The owned test container and its image-created anonymous data volume were removed after verification, with no remaining container using that volume. No existing development/production database was accessed.

### Implementation and review

- Installed runtime inspected: NestJS 11.2.7/Fastify 5.12.5; official `@fastify/multipart` 10.1.3 request.parts handles multipart PUT. No Express upload interceptor. AWS SDK v3 client-s3 3.1151.0 and sharp 0.35.5 are backend dependencies; no Uppy/UI dependency installed.
- One primary processed image per product. JPEG/PNG/WebP extension/MIME/signature/decode validation; one file named file, optional altText <=240 chars; 5 MiB, 20 million input pixels, max8192px input side; animated/unsupported/malformed rejection. WebP output max1600px with metadata stripped. Original buffers are transient only.
- Existing authentication/COMMERCE_MANAGE and active-clinic product ownership; mutation audit. Per-instance maximum two uploads, 30s operation deadline, image processing timeout, bounded storage/body read and existing DB-backed IP/user rate limiter.
- If-Match image generation plus durable fingerprint/result idempotency. Product-row lock serializes publication; a failed/concurrent replacement cannot overwrite the committed image. Cleanup intent commits before any R2 write; unknown writes remain unpublished and get reclaimed after the upload deadline plus safety delay. Old-key cleanup never removes a current READY reference and deletes pending DB metadata only for the matching generation. Outbox retries survive worker restarts.
- Controlled public reads require current READY image, active clinic/product/category and an active SKU; eligibility is checked again after remote I/O. Admin preview supports drafts with permission/ownership. Bytes use no-store and nosniff, and no object key/provider URL is returned. R2 errors are redacted.
- Validated disabled-by-default config with incomplete enabled config rejected, server-side _FILE credential injection and production-mode activation blocked. No real R2 connection, credentials request or deployment.
- Existing export/generation scripts produced OpenAPI and typed clients; no manual edits to generated contracts.
- Main-agent review PASS: implementation, acceptance criteria, ownership, transaction/cleanup boundaries, fault/concurrency assertions, generated contract and combined diff. All required backend gates passed; no remaining backend blocker.

### Verification

- `prisma generate` and disposable-DB `prisma migrate deploy`/seed -> PASS.
- `pnpm generate:api-client` -> PASS (includes API build/typecheck and runtime OpenAPI export).
- `pnpm --filter @sabz-zendegi/api-client build` -> PASS (freshness and TypeScript).
- API `tsc -p tsconfig.test.json --noEmit` -> PASS; rerun after final test-fixture cleanup change -> PASS.
- Sequential API Vitest selection -> 10 files / 44 tests PASS: product-image processor/configuration/storage/integration/migration; existing patient-commerce-catalog, patient-cart.authorization, admin-commerce-catalog, environment-validation and openapi-contract.
- Final product-image-configuration repeat -> 3/3 PASS, including child-process file-backed secrets without printing values. This repeat is not counted as additional distinct tests.
- `pnpm --filter @sabz-zendegi/api-client test` -> 5/5 PASS and generated freshness PASS.
- `graphify update .` -> PASS, AST-only/no LLM calls; graph outputs remain ignored. Existing optional SQL/HCL parser omissions and unrelated chat extraction warning were reported by the tool and were not changed by this task.
- `git diff --check` and staged diff gate -> PASS.

The integration suite covers success/normalized bytes, no-image null/ETag and OpenAPI schema, unauthorized/staff/cross-clinic access, invalid/oversized/extra-file uploads, disabled/rate-limit/busy states, replace/remove, concurrent 412, committed replay and changed-key conflict, pending/expired attempt replay, ambiguous R2 failure, DB failure after put, durable orphan cleanup and cleanup retry through the actual worker, old cleanup versus a later generation, catalog/cart/wishlist metadata, and draft/category/SKU/clinic visibility (including visibility changed during remote read).

### Known limits and exact Batch 01B handoff

No live R2 connectivity/IAM/private-bucket configuration or Linux deployment/native sharp runtime was tested; no UI/browser end-to-end acceptance occurred. Limits are per API instance. Production retention, recovery and activation require separate approval. Backend acceptance does not make Store media production-ready. Historical initial-release gates remain independent.

Batch 01B is the next Store slice, not started here. It must claim its own task/paths and use existing dashboard components/session refresh with Uppy core/react Headless + xhr-upload and Persian/RTL localization; do not build an upload engine. Contract: [store-product-media-v1](../contracts/store-product-media-v1.md).

1. GET `/v1/admin/commerce/products/{productId}/image` returns metadata or null and ETag (`"none"` or quoted image UUID). CORS exposes ETag. Keep this as the version for the next intent.
2. PUT that path with exactly one multipart `file` and optional altText, Bearer auth, If-Match and idempotency-key. Snapshot the payload, original ETag and operation key for retries; do not change headers/body for a replay. 200 returns committed metadata and ETag. Refetch current metadata after completion/replay because another operation may already have advanced the generation.
3. DELETE that path with If-Match/idempotency-key; 204 hides the image immediately. Refresh metadata afterward. Concurrent mutations return 412; reload before a new user intent. Pending operation returns 409 COMMERCE_IMAGE_OPERATION_PENDING; expired returns 409 COMMERCE_IMAGE_OPERATION_EXPIRED and requires reload/new operation key. Changed payload with the same key returns IDEMPOTENCY_KEY_REUSED. Do not silently resubmit conflicts as fresh mutations.
4. Admin preview GET adds `/content` and needs Bearer auth; fetch through the authenticated client as a blob, release object URLs, and respect no-store. Private R2 URLs/object keys never reach UI. Customer DTO contentPath is for Batch 01C, not this dashboard task.
5. Show actual progress, preview, errors, retry, replacement/removal and busy/disabled states using existing styling. Client restrictions improve UX; backend remains authoritative. Reuse existing refresh flow for expired access tokens. Avoid XHR/OpenAPI JSON serialization of binary FormData.
6. Dashboard integration and eventual customer integration require their own focused tests/acceptance. No live bucket test or production switch is implied by this handoff. Stop at the backend task commit; no Batch 01B/01C execution.

## F12-T06-R2 — Dashboard product image uploader

Task ID: F12-T06-R2
Status: DONE (Phase04B / development dashboard slice only)
Completed at: 2026-10-14 Asia/Tehran
Batch ID: F12-MEDIA-B01B
Agent/Thread and reviewer: Codex /root, Store media chat; one agent, no subagents
Approval: explicit product-owner Phase04B Dashboard Product Image Uploader request. Dependency F12-T06-R1 DONE, frozen store-product-media-v1 and ADR-0015 remain unchanged. No ownership conflict. Historical initial-release N/A, Phase12 state and unrelated blockers remain intact.
Baseline: clean branch front, commit 44d472ee355775015b7c0d9e5b2ec7e66ae2c7d5.
Task commit: `feat(F12-T06-R2): add dashboard product image uploader`, created after this evidence/final staged review gate.

### Changed files

- `apps/dashboard/package.json`
- `pnpm-lock.yaml`
- `apps/dashboard/src/components/auth/dashboard-session-gate.tsx`
- `apps/dashboard/src/features/store/store-page.tsx`
- `apps/dashboard/src/features/store/product-image-editor.tsx`
- `apps/dashboard/src/features/store/product-image-controller.ts`
- `apps/dashboard/src/features/store/product-image-controller.spec.ts`
- `apps/dashboard/src/lib/commerce-product-image-api.ts`
- `apps/dashboard/src/lib/commerce-product-image-api.spec.ts`
- `apps/dashboard/e2e/product-image-browser.mjs`
- `apps/dashboard/e2e/product-image.spec.ts`
- `apps/dashboard/e2e/playwright.product-image.config.ts`
- `plan/STATUS.md`
- `plan/phases/12-PRODUCTION-HARDENING.md`
- `plan/logs/phase-12.md`

No API/schema/migration/generated contract, customer app, checkout/payment, bucket/deployment config, protected slider-data.ts/justforcheck.md or unrelated source was changed.

### Packages and UI integration

Pinned runtime dependencies: @uppy/core 5.2.0, @uppy/react 5.2.0, @uppy/xhr-upload 5.2.0, @uppy/locales 5.3.0 (fa_IR). Peer compatibility inspected for the installed Next16.3.8/React19.3.0 workspace. Provisional Uppy6 was rejected during dependency review because its Headless components requested unrelated Google-picker peers; only the final compatible 5.2 set is committed. Original autoInstallPeers workspace setting is preserved. Lockfile contains the required upstream transitives, including Uppy companion-client; no Companion service/plugin, Dashboard, Tus or AWS-S3 plugin is configured or added as a direct dependency. Uppy introduces use-sync-external-store, which pnpm also binds to Zustand's existing optional peer without changing the application's source or Zustand version.

Existing Store ProductCard gains a media-management action; product creation, lifecycle, pricing, inventory and categories are retained. The editor loads through next/dynamic with ssr:false only when opened. No generic upload platform or duplicate product-management route. Existing dashboard token classes, fonts and Persian/RTL conventions are reused; there are no shared Button/Input/Dialog primitives in this dashboard to duplicate. The browser's native dialog is used with the existing settings editor's focus-cycle convention.

UppyContextProvider and useDropzone own drag/drop, native file selection and keyboard selection; custom markup only composes the dashboard UI. The upstream generated Dropzone hardcodes an English label, so its supported Headless hook is used for full Persian labels. Uppy owns transient files, multipart PUT and real XHR progress. One JPEG/PNG/WebP up to5MiB, autoProceed:false; client validation is usability only. Separate local and saved previews, optional altText<=240, upload/replace, explicit saved-image removal, loading/success/error/conflict feedback and busy-action disabling are implemented. No image transforms or binary/token persistence. Real image decode, mobile width and keyboard picker/focus/escape were checked.

### Frozen API, authentication and mutation behavior

- Generated-client GET metadata accepts null and requires the exact server ETag, including quotes; unavailable ETag fails closed. The backend already exposes ETag through CORS; no backend/proxy change needed.
- XHRUpload sends PUT, formData:true, fieldName:file, allowedMetaFields:[altText], bundle:false, limit:1. onBeforeRequest uses the existing DashboardSessionManager bootstrap through a minimal exported accessor and attaches current Bearer, captured If-Match and idempotency-key. No second refresh system, token metadata/storage/logging or Next proxy.
- Native XHR35s deadline covers a lost response; Uppy stalled-progress feedback alone does not settle all lost-response cases. The supported request hook connects native timeout to the existing Uppy error path. Automatic transport retries are disabled.
- Each deliberate mutation captures an immutable key/precondition/payload. Same-intent retry preserves key/body/original ETag after reconciliation; changed payload/new action gets a new key. 409 pending remains unresolved; expired/other409 and412 stop, load current state, and require a deliberate new action (the UI labels fresh-version submission). Unresolved operations cannot edit/clear the file, change altText or start another mutation.
- Ambiguous/time-out/error outcomes reload current metadata without treating a different generation as proof of this upload. A known accepted response can settle via a successful reload without resending. Replay success always reloads the current generation, never replaces it with an old result. 100% transfer is not a persistence success message.
- DELETE uses the same captured-key/precondition rules and expects204; queue removal never deletes persisted media. Success reloads metadata/preview and refreshes the existing catalog state, which is the dashboard's current catalog cache.
- Protected preview uses the existing authorized generated client with parseAs:blob and no-store. Object URLs are revoked on replacement/queue removal/unmount. Per-product controller/Uppy identities and read-generation checks prevent stale reads crossing editors. On unmount, UI/URL/read cleanup is immediate; an already authorized bounded mutation settles under its original intent before releasing Uppy, avoiding the upstream async-auth-hook abort/send race. It cannot update the new editor or catalog after disposal.

### Verification and main-agent review

- Dashboard `tsc --noEmit` -> PASS, including focused tests/browser test config.
- ESLint on all changed dashboard source/test files with --max-warnings0 -> PASS, zero errors/warnings. No unrelated full-monorepo build/audit.
- Vitest four files -> 37 tests PASS: product-image-controller (15), product-image-api (5), existing auth/session (13), existing commerce-catalog-api (4). Real Uppy multipart/XHR path is exercised with deterministic test XHR; generated API requests use real openapi-fetch with controlled responses.
- Saved Chrome scenario: `node node_modules/@playwright/test/cli.js test --config apps/dashboard/e2e/playwright.product-image.config.ts --reporter=line` -> 1/1 PASS after final review. Isolated Next preview on localhost3102; every /v1 request intercepted, public fake API localhost3199, no real backend/R2/database.
- Playwright MCP also ran the saved scenario successfully through its VM adapter: 7 mutation requests, 4 logical mock uploads, 1 deletion; desktop1440x900/mobile390x844, empty-state, real bytes preview, drag/drop, focus/Escape, fields/headers, progress-before-confirmation, replace/remove, deliberate412, expired-token refresh, ambiguous commit/replay, protected preview, product switching and URL cleanup. MCP's file-chooser modal interrupts long code calls, so native keyboard chooser was additionally covered by the complete saved Chrome test; MCP uses the same harness with that chooser step bypassed.
- The browser scenario exposed and drove a real Tab-wrap correction in the dialog; assertions were preserved and rerun. Earlier provisional tests/tool-environment failures were resolved before acceptance. No backend tests were changed or weakened.
- Graphify final AST-only update -> PASS; generated ignored graph refreshed. Existing optional SQL/HCL extractor omissions/unrelated chat parse warning remain outside scope.
- Combined diff, ownership, frozen-contract adherence, session reuse, concurrency/idempotency, navigation lifecycle, lazy-loading boundary and required acceptance criteria -> main-agent review PASS.
- `git diff --check` and final staged diff gate -> PASS. Preview is stopped after acceptance; no deployment or Phase04C start.

### Limits and exact Phase04C handoff

No live Cloudflare R2 end-to-end test, bucket/IAM validation, production activation, customer integration, production bundle-size benchmark or full browser/device release matrix is claimed. Verification is deterministic mock API plus the separately accepted backend tests from04A. Backend storage remains disabled by default. Store images are not declared production-ready; independent initial-release and Phase12 gates remain in place.

Next Store slice: Phase04C / Batch01C Customer Image Integration, requires its separate instruction and ownership claim; not started.

1. Use the frozen generated nullable image metadata already present in customer catalog/detail/cart/wishlist DTOs: id, contentPath, mimeType, sizeBytes, width, height, altText. Backend/schema/generated contract remain frozen; report any blocking contract issue rather than rewrite them.
2. Customer bytes come from public `/v1/commerce/products/{productId}/images/{imageId}` via the configured API origin. Never use protected admin preview routes, internal keys, R2 credentials or private bucket URLs in customer UI. The public endpoint rechecks current READY/published eligibility.
3. Preserve meaningful null/loading/error/fallback states and Persian alt text; handle404 after replacement/unpublication and503 disabled/unavailable storage. A versioned path is not permanent authority: respect the backend's no-store/revocation contract when selecting the image loader/cache behavior.
4. Integrate only the existing customer Store cards/detail/cart/wishlist surfaces approved for04C; retain independent product/cart/order behavior. This dashboard editor is reusable for admin operations only; do not port upload/auth logic into the customer app.
5. Run focused app typecheck/lint/tests and isolated mock-API browser coverage of actual image loading, RTL/mobile, null/error fallbacks and generation changes. Real R2 or deployment needs separate authorization. Keep the original release N/A and production gates independent.

## 04C-T01 — Customer Store real product image integration

Task ID: 04C-T01
Completed at: 2026-10-14
Agent/Thread: Muse Spark (single agent, no subagents per task instruction)
Batch ID: 04C-B01C
Reviewed by: Muse Spark (coordinator self-review; combined diff scope-checked)
Changed files:
  - apps/app/src/lib/product-image.ts (new: URL resolver + alt helper + local neutral placeholder)
  - apps/app/src/lib/product-image.spec.ts (new: 5 tests)
  - apps/app/src/components/store/product-image.tsx (new: single img path with error guard)
  - apps/app/src/components/store/product-card.tsx (real image)
  - apps/app/src/components/store/product-gallery.tsx (resilient imgs, empty fallback, switching reset)
  - apps/app/src/components/store/product-gallery.spec.tsx (empty-fallback contract)
  - apps/app/src/components/store/store-ui.tsx (CartItem imageUrl)
  - apps/app/src/components/store/recent-card.tsx (snapshot imageUrl)
  - apps/app/src/stores/cart.ts (imageUrl threading, no extra requests)
  - apps/app/src/stores/recently-viewed.ts (imageUrl snapshot, legacy-safe)
  - apps/app/src/stores/product-extras.ts (gallery fabrication removed; reviews/specs untouched)
  - apps/app/src/stores/product-extras.spec.ts (gallery test removed)
  - apps/app/src/stores/product-images.ts + product-images.spec.ts (DELETED: Digikala pool/mapping)
  - apps/app/src/app/(public)/store/page.tsx (cart cache imageUrl)
  - apps/app/src/app/(public)/store/products/[id]/page.tsx (real gallery + key + recent snapshot + metadata alt)
  - apps/app/src/app/(app)/store/cart/page.tsx (cart cache imageUrl)
  - apps/app/src/lib/patient-ui.test.ts (imagery contract rewritten + 6 new presentation tests)
  - apps/app/vitest.config.mts (new: e2e exclusion, mirrors dashboard)
  - apps/app/e2e/playwright.store-images.config.ts + store-images.spec.ts + store-images-browser.mjs (new: mock-API desktop/mobile)
  - plan/STATUS.md (batch claim + release)
Migrations:
  - none (main local DB product-media migration stays unapplied per instruction; dev API returns imageless products so the neutral fallback path is what local dev shows)
Tests run:
  - pnpm --filter @sabz/app typecheck → PASS
  - pnpm --filter @sabz/app test → 23 files / 97 tests PASS (was 89; +8 new)
  - Playwright store-images (desktop 1440x900 + mobile 390x844, mock API, real PNG bytes, 404 case) → 2/2 PASS
  - No backend/dashboard/R2 tests touched; F12-T06-S1/R2 storage tests not repeated per instruction
Result:
  - catalog cards render API images, neutral fallback otherwise → PASS
  - PDP single API image, metadata Persian alt, no fabricated gallery → PASS
  - cart/wishlist images from embedded response metadata, zero extra requests → PASS
  - recent rail snapshots imageUrl, legacy entries fall back → PASS
  - null/404/removed/replaced/unpublished states fall back; no loops; no stale on switch (key + src-reset) → PASS
  - Digikala product-image mappings removed (grep-clean in product slots) → PASS
  - layout/aspect/RTL/keyboard unchanged; plain img without Next optimization caching → PASS
Known limitations:
  - Hero banners, shortcuts rail and incredible-offers still use Digikala hotlinks (explicitly out of scope, separate batch)
  - product rating/seller/specs/reviews/questions remain test placeholders (explicitly out of scope)
  - Main local DB lacks the product-media migration, so local dev API serves imageless products; production acceptance needs the migration applied (recorded for final development acceptance)
  - App has no lint script; typecheck + tests + diff check stand in
  - Cart/wishlist browser coverage deferred (routes require auth); covered by unit presentation tests
Next task:
  - none (stop after Phase 04C per instruction; no next phase started)

## F12-PD-G01 — Product Details V1 architecture approval and governance

Task ID: F12-PD-G01
Completed at: 2026-10-14 Asia/Tehran
Agent/Thread: Codex /root (one agent, no subagents)
Batch ID: F12-PD-G01 (documentation/governance only)
Reviewed by: Codex /root (main-agent document consistency/compatibility review)
Authority:
  - Explicit owner message: Product Details V1 Product Owner Architecture Approval & Governance.
  - Authorization is limited to architecture documentation, ADR, contract freeze and task planning;
    the owner expressly says not to start implementation.
Baseline: front@ee0a21c; clean working tree; ahead 4 relative to the local origin/front reference.
Changed files:
  - plan/decisions/ADR-0016-store-product-details-v1.md (new ACCEPTED architecture)
  - plan/contracts/store-product-details-v1.md (new version 1.0)
  - plan/phases/12-PRODUCTION-HARDENING.md (scoped extension, task dependencies/scopes/gates)
  - plan/STATUS.md (governance-only claim/release and future candidate)
  - plan/logs/phase-12.md (this evidence)
Migrations:
  - none; no schema/source/client/dependency/database/runtime changes.
Verification:
  - Existing role/permission and content/catalog contract dependencies inspected; approval requires
    existing ADMIN release role plus COMMERCE_MANAGE and product clinic/resource ownership.
  - Document review: controlled fields/source/revision/no-op/null/edit invalidation, explicit exact-revision
    approval, concurrency and public/private projection defined; no automatic/clinical certification.
  - Legacy migration compatibility: preserve descriptions/status/publication as unreviewed; no automatic
    approval, structured health conversion or migration unpublication. Explicit later edits enter the
    pending lifecycle with an editor visibility warning.
  - B2 review: template version pins, strict Product/SKU scopes, no invented definitions, mandatory
    immutable selected-SKU title/meaningful-attribute order snapshots and old-order compatibility.
  - Local Markdown file links and plan/ADR/contract/task dependency consistency -> PASS.
  - Git diff hygiene/document-only scope -> PASS; final staged scope checked before task commit.
  - Builds, application tests, migrations, browser tests, Prisma/database/R2 operations -> NOT RUN
    (not authorized or needed for this documentation task; future checks are acceptance plans only).
Result:
  - ADR-0016 accepted without superseding historical ADR-0009/ADR-0015 -> PASS.
  - B1 architecture/API version 1.0 frozen; B2 definitions/wire appendix explicitly pending -> PASS.
  - B1A/B1B/B1C/B2 sequential scopes, ownership, tests and acceptance mapped in existing Phase 12 -> PASS.
  - Customer demo-claim retirement approved in B1C; UGC/marketplace/warranty/campaign scope excluded -> PASS.
  - G01 DONE/claim RELEASED; all four implementation tasks unchecked and unclaimed -> PASS.
Known limitations / remaining owner decisions:
  - B2 needs actual initial category templates, required fields, units/options, meaningful variant keys,
    health-attribute approval linkage and finalized publication/category-transition/wire appendix.
  - No real product facts or source material are supplied by this governance task; administrators must
    supply and explicitly approve source-supported content during authorized future implementation/use.
  - Independent Phase 12 production blockers remain; no deployment/start authorization is implied.
Next batch:
  - F12-PD-B1A only after a separate start instruction and fresh eligibility/claim. Do not start now.

## F12-PD-B1A — Product content backend foundation

Task ID: F12-PD-B1A
Completed at: 2026-10-14 Asia/Tehran
Agent/Thread: Codex /root; one agent, no subagents
Batch ID: PD-B1A
Reviewed by: Codex /root (main-agent scoped implementation, contract and acceptance review)
Authority: explicit owner B1A implementation instruction; ADR-0016 and frozen store-product-details-v1 1.0.
Baseline: front@e681517; clean worktree, five commits ahead of the local origin/front reference.
Changed files:
  - apps/api/prisma/schema.prisma
  - apps/api/prisma/migrations/20261014150000_product_content_v1/migration.sql
  - apps/api/src/common/errors/api-error.ts
  - apps/api/src/modules/commerce/catalog/product-content.dto.ts
  - apps/api/src/modules/commerce/catalog/product-content.policy.ts
  - apps/api/src/modules/commerce/catalog/admin-product-content.controller.ts
  - apps/api/src/modules/commerce/catalog/admin-commerce-catalog.controller.ts
  - apps/api/src/modules/commerce/catalog/admin-commerce-catalog.dto.ts
  - apps/api/src/modules/commerce/catalog/admin-commerce-catalog.module.ts
  - apps/api/src/modules/commerce/catalog/admin-commerce-catalog.service.ts
  - apps/api/src/modules/commerce/catalog/patient-commerce-catalog.dto.ts
  - apps/api/src/modules/commerce/catalog/patient-commerce-catalog.service.ts
  - apps/api/src/modules/commerce/cart/patient-commerce-cart.service.ts
  - apps/api/test/product-content.integration.spec.ts
  - apps/api/test/product-content-migration.integration.spec.ts
  - packages/api-client/openapi.json
  - packages/api-client/src/schema.generated.ts
  - plan/STATUS.md
  - plan/phases/12-PRODUCTION-HARDENING.md
  - plan/logs/phase-12.md
Migrations:
  - 20261014150000_product_content_v1: optional editorial fields and source enum/pair; nonnegative
    revision; nullable exact-revision approval metadata and approver FK; four metadata consistency checks.
    No additional index, historical migration, SKU/inventory/order/image column or money contract changed.
  - Existing rows classified legacy revision 0 with absent approval/source; description/status/timestamps
    preserved byte-for-byte. New-row default is managed/unapproved. No normalization/destructive backfill.
  - Existing persistent local PostgreSQL was not migrated, reset or cleaned.
Environment/isolation:
  - Task-owned postgres:16-alpine container mushroom-pd-b1a-test, no volume, loopback port 55439;
    media_04a disposable database reused solely to satisfy the existing media regression test guard.
  - Migration upgrade test creates/drops its own random pd_b1a_upgrade_* database within this temporary
    instance. Tests refuse any other host/port/database or non-test NODE_ENV.
  - Synthetic authenticated users/products and dummy test-only environment secrets; real R2/SMS/Sadad
    disabled for acceptance. Existing media test replaces storage with a deterministic mock; no real CRUD.
  - Temporary container identity checked and stopped/auto-removed after acceptance. Original PostgreSQL
    sabz-zendegi-postgres-1 on port 5432 remained running; no existing service/config/credential altered.
Tests run (working directories apps/api or packages/api-client unless stated):
  - pnpm exec prisma validate -> PASS.
  - pnpm exec prisma generate -> PASS, existing Prisma 7.10.0, ignored generated runtime client.
  - pnpm exec prisma migrate deploy against EMPTY disposable database -> PASS, all 37 migrations.
  - pnpm exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code
    against that same database -> PASS, no difference detected.
  - pnpm exec tsc --noEmit and pnpm exec tsc -p tsconfig.test.json --noEmit -> PASS.
  - pnpm run openapi:export -> PASS; regenerated through established runtime exporter, no manual edits.
  - Client pnpm run generate/build/typecheck and pnpm test -> PASS, generated freshness and 5 tests.
  - pnpm exec vitest run test/product-content.integration.spec.ts
    test/product-content-migration.integration.spec.ts test/admin-commerce-catalog.integration.spec.ts
    test/patient-commerce-catalog.integration.spec.ts test/commerce-checkout.integration.spec.ts
    test/product-image.integration.spec.ts test/openapi-contract.spec.ts --no-file-parallelism --silent
    -> PASS, 7 files / 62 tests, 33.29s; 34 new content/migration cases plus 28 existing regression cases.
  - Final UUID/error documentation completion: re-export/regenerate followed by direct content + existing
    OpenAPI contract suites -> PASS, 2 files / 41 tests; final client freshness/typecheck PASS.
  - Existing frontend consumer pnpm --dir apps/app exec tsc --noEmit and corresponding dashboard
    command from repository root -> PASS; no frontend source changed or frontend task started.
  - Scoped diff hygiene, forbidden-path review and staged task-only scope -> PASS before commit.
  - graphify update . -> unavailable: pre-existing uv trampoline cannot canonicalize its script path.
    No tooling/dependency installation or graph reconstruction was performed to bypass this limitation.
Implementation/debug review:
  - Initial tests exposed nested relation disconnect issuing a separate SQL update and violating the
    approval tuple constraint. Fixed by one atomic scalar approval-clear/revision UPDATE; subsequent
    real PostgreSQL edit/approval/replay/race and rollback tests pass. Assertions were not weakened.
  - Initial migration fixture attempted another ACTIVE clinic despite the existing one-active-clinic
    constraint. Fixture now uses the migration-established active clinic; release scoping is unchanged.
  - Raw UTF-8 request limit is installed on the relevant existing/new product write routes before
    registration; whitespace-heavy JSON is rejected with 413/PAYLOAD_TOO_LARGE, no global/media change.
Acceptance results:
  - Optional approved fields, NFKC/edge trimming with paragraph retention, post-normalization limits,
    omission/null/no-op/clear and 128 KiB body boundary -> PASS.
  - Malformed/unknown nested input, forged approval metadata, duplicate description, invalid source,
    empty approval and unsupported source-kind rejection -> PASS; stable safe errors registered.
  - Approval requires existing ADMIN role + COMMERCE_MANAGE and active-clinic product ownership;
    unauthenticated/staff/patient/foreign-clinic and direct unauthorized service approval denied -> PASS.
  - Exact expected revision, row-lock serialization, atomic save/invalidation/approval/audit, one effective
    approval replay and audit-failure rollback -> PASS. All approval metadata clears on material edits.
  - Legacy description remains public/unreviewed; managed pending content is hidden; approved values
    embedded in detail; summaries in list/cart/wishlist have no draft/source/approver leakage -> PASS.
  - Product visibility, nullable image identity/path, SKU price/id, persisted cart/wishlist and existing
    checkout/media/OpenAPI regression -> PASS. No checkout/inventory/media code or frozen wire changed.
  - Task complete and reviewed; checkbox/status synchronized and claim released. Commit contains only
    the 20 owned implementation/test/generated/evidence paths above; no push/next batch.
Known limitations:
  - Persistent development database must receive this forward migration before the new runtime is used;
    this task deliberately did not apply it there. Production deployment/readiness remains unauthorized.
  - Legacy description-only PATCH has the frozen compatibility limitation: old clients without an
    expected revision cannot detect a stale form, but edits still invalidate approval. New editor must
    always use strict revision-aware content endpoints; no automatic approval or conflict overwrite.
  - Graphify auxiliary update unavailable as above; API/generated-client freshness is verified.
  - Existing pg client concurrency deprecation warning is non-blocking; no dependency upgrade in scope.
  - API ran locally on Windows with real PostgreSQL in Linux Docker; this is not Linux API/container or
    production acceptance. Existing storage/production prerequisites remain independent.
Exact B1B handoff (not started):
  - Depend on this accepted B1A task and frozen contract; obtain a separate start instruction and normal
    claim before dashboard edits. No B1C/B2/production authorization is implied.
  - Existing admin product responses embed content. GET /v1/admin/commerce/products/{productId}/content
    (adminProductContentGet) returns the latest fields/revision/status/provenance/approval metadata.
  - PATCH same path (adminProductContentUpdate) sends expectedContentRevision plus fields and/or
    provenance. Omit unchanged fields; null clears values; provenance is null or the full source pair.
    Save and approval must be distinct actions; pending managed content is hidden publicly.
  - POST same path + /approve (adminProductContentApprove) sends expectedContentRevision ONLY.
    Use the revision from successful save/read, never a hardcoded revision or image ETag/idempotency key.
  - Consume generated AdminProductContentDto, UpdateProductContentDto, ProductContentFieldsDto,
    ProductContentProvenanceDto and ApproveProductContentDto. Status: LEGACY_UNREVIEWED /
    PENDING_APPROVAL / APPROVED. Show legacy/no-approval honestly; no medical/certification badge.
  - Handle 409 COMMERCE_CONTENT_REVISION_CONFLICT/currentRevision with deliberate refetch/review,
    retaining unsaved form; 422 field/source errors; normal session/403 and 413. Never auto-approve/retry
    an overwrite. Warn that a material edit hides controlled public content until explicit approval.
  - Existing Store editor/design/RTL/session conventions and Uppy/media editor remain intact; focused
    dashboard/editor/keyboard/mobile tests and browser evidence are B1B's own acceptance gate.
Next batch:
  - none (STOP after B1A per its instruction; B1B started later under its own instruction/claim).

## F12-PD-B1B — Dashboard product content editor

Task ID: F12-PD-B1B
Completed at: 2026-10-14 Asia/Tehran
Agent/Thread: Muse Spark (single agent, no subagents per task instruction)
Batch ID: PD-B1B
Reviewed by: Muse Spark (coordinator self-review; combined diff scope-checked)
Authority: explicit owner B1B implementation instruction; ADR-0016 and frozen store-product-details-v1 1.0.
Baseline: front@78c7209 (B1A) + e681517 (governance); clean worktree at claim.
Changed files:
  - apps/dashboard/src/lib/commerce-product-content-api.ts (new: GET/PATCH/approve wrappers, status+code error class, Persian messages)
  - apps/dashboard/src/lib/commerce-product-content-api.spec.ts (new: 5 tests)
  - apps/dashboard/src/features/store/product-content-draft.ts (new: sections, limits, dirty, null-conversion, provenance, approval rules)
  - apps/dashboard/src/features/store/product-content-draft.spec.ts (new: 5 tests)
  - apps/dashboard/src/features/store/product-content-editor.tsx (new: dialog, 5 Persian RTL sections, revision-safe save, explicit approval, dirty guard, conflict flow)
  - apps/dashboard/src/features/store/store-page.tsx (integration only: content button + status line + editor wiring)
  - apps/dashboard/e2e/playwright.product-content.config.ts + product-content.spec.ts + product-content-browser.mjs (new: mock-API desktop/mobile)
  - plan/STATUS.md (batch claim + release)
Tests run (working directory apps/dashboard unless stated):
  - pnpm --filter @sabz/dashboard typecheck → PASS
  - eslint on all 6 touched source/test files --max-warnings 0 → PASS (one set-state-in-effect corrected via queued microtask, mirroring the image editor)
  - vitest focused (content-api + draft specs) → 2 files / 10 tests PASS
  - vitest full dashboard suite → 27 files / 106 tests PASS, no regressions
  - Playwright product-content (desktop 1440x900 + mobile 390x844, deterministic mock API) → 2/2 PASS: status badge, five sections, save rev+invalidation, explicit approval, dirty guard, 409 conflict with draft kept + deliberate resave, 403 denial staying pending, RTL, no overflow, image-editor entry intact
  - No backend/Prisma/R2/customer-app tests touched; B1A storage suites not repeated
Result:
  - editor integrated in existing Store workflow (per-card button + status line) → PASS
  - all eight B1 fields + provenance pair-or-null with server limits → PASS
  - existing data preserved (draft initialized from server; legacy description untouched until edited) → PASS
  - save and approval independent; approval never automatic; no-op save keeps approval → PASS (client disables approve while dirty; server authority unchanged)
  - stale-revision conflicts reload server state, keep draft, require deliberate resave; no auto-overwrite/retry → PASS
  - approval status from server only; unauthorized approve surfaces 403 safely → PASS
  - Persian RTL, responsive, focus trap, Escape/discard guard, role=status/alert → PASS
  - legacy first-edit visibility warning + pending-hidden note shown → PASS
  - no unrelated changes (image editor, SKU, pricing, inventory, checkout untouched) → PASS
Known limitations:
  - Persistent development database still lacks the B1A migration (deliberate); UI verified against mock API only — real runtime acceptance remains pending and is reported, not claimed
  - Client cannot distinguish ADMIN-without-COMMERCE_MANAGE before attempting approval; conservative always-enabled button + safe 403 handling stands in
  - Playwright harness needed one correction during development (resave-synced Escape closes directly); implementation was correct throughout
Next task:
  - none (STOP after B1B per instruction; B1C/B2 NOT started, no push/deploy)

## F12-PD-B1B-R1 — focused conflict and session review corrections

Task: F12-PD-B1B-R1; batch PD-B1B-R1; completed 2026-10-14 Asia/Tehran.
Owner/coordinator/reviewer: Codex /root, one agent, no subagents.
Authority: explicit owner continuation of the interrupted independent review, limited to two high-risk
issues; B1B baseline front@8ebfdbe, B1A 78c7209 and unchanged frozen B1 content contract.
Claim recorded before implementation in STATUS/checklist; baseline worktree clean, no other claim.
Verdict: PASS WITH FIXES for these two issues. Historical B1B evidence above is preserved; this entry
supersedes its claim that automatic refetch + full-draft resave safely resolves conflicts.

Confirmed causes (High):
- On save/approval 409, reloadKeepDraft advanced the server baseline while retaining all stale draft
  fields. The next full-field PATCH could erase another administrator's changes at the new revision.
- Initial content-loading effect depended on accessToken; a successful session refresh restarted GET
  and replaced unsaved fields, even when the original save subsequently failed.

Before-fix reproduction:
- Added focused browser tests before editing application code, using fully intercepted API requests.
- First harness run exposed an invalid mock category=null; corrected the fixture to the actual catalog
  shape (no application fix for that harness error).
- Desktop regression run then failed on both intended assertions: Save enabled after 409; refreshed
  session replaced brand "پیش‌نویس نشست" with "برند 1" following a deliberately rejected PATCH.

Corrections:
- Preserve both draft and its original revision after 409; no automatic content GET or second mutation.
  Block save and approval in handlers and controls. Explicit two-step reload warns that current draft
  will be replaced; cancellation and failed reload retain it and keep the conflict gate. Successful
  reload installs one coherent current snapshot; re-entered changes preserve the other editor's fields.
- Initial load now follows product identity, not bearer-token rotation. Existing session-aware fetch
  supplies fresh credentials. Existing product key and the added authenticated-user key isolate editor
  lifetimes; current props/session gate continue to control operations. No new authorization claims.
- Updated the original mock conflict flow to require explicit resolution; mock material edits now
  faithfully mark content PENDING_APPROVAL instead of retaining a stale status.

Changed files:
- apps/dashboard/src/features/store/product-content-editor.tsx
- apps/dashboard/src/features/store/store-page.tsx (authenticated-user identity key only)
- apps/dashboard/e2e/product-content-regressions.mjs (new focused browser regressions)
- apps/dashboard/e2e/product-content.spec.ts
- apps/dashboard/e2e/product-content-browser.mjs
- plan/STATUS.md, plan/phases/12-PRODUCTION-HARDENING.md, this log.

Verification (actual results):
- pnpm exec playwright test --config apps/dashboard/e2e/playwright.product-content.config.ts
  --project desktop --grep regression: before application fix, 0/2 PASS, both intended defects observed.
- pnpm exec playwright test --config apps/dashboard/e2e/playwright.product-content.config.ts:
  after fixes, 6/6 PASS (desktop 1440x900 and mobile 390x844). Covers save/approval revisions, retained
  draft and blocked mutations on 409, explicit reload/cancel/failure/retry, remote field preservation,
  approval conflict, unchanged-content approval preservation, token refresh + failed save + retry using
  fresh bearer, product switching/discard guard, account editor isolation, session role-loss unmount,
  existing 403 feedback, RTL/overflow and media-editor entry.
- pnpm --filter @sabz/dashboard test -- src/features/store/product-content-draft.spec.ts
  src/lib/commerce-product-content-api.spec.ts: 2 files / 10 tests PASS.
- pnpm --filter @sabz/dashboard typecheck: PASS.
- pnpm exec eslint src/features/store/product-content-editor.tsx src/features/store/store-page.tsx
  e2e/product-content-browser.mjs e2e/product-content-regressions.mjs e2e/product-content.spec.ts
  (cwd apps/dashboard): PASS, no diagnostics.
- git diff --check: PASS. Scoped diff and acceptance reviewed; no unrelated changes.
- graphify update .: PASS, AST-only; ignored graph outputs updated. Tool reported existing optional
  SQL/HCL parser gaps and an unrelated chat extraction warning; no installs or unrelated corrections.

Environment/limitations:
- Reused existing Dashboard dev server on localhost:3002. A start attempt returned EADDRINUSE;
  no existing process was stopped/restarted. Browser API calls were all mocked, with no database/R2 CRUD.
- No backend, Prisma, migration, database, generated-client, frozen-contract, dependency or other
  Dashboard feature changes. No real backend acceptance claimed; persistent B1A migration remains an
  external prerequisite per owner instruction and was not investigated/applied.
- Review correction scope only; earlier Medium/Low observations are not promoted into new work.
  Server ADMIN + commerce:manage + clinic authorization remains authoritative; no new permission API.
- Real B1B local acceptance is the next handoff under separate authorization. B1C/B2 not started;
  production readiness, deployment, merge and push are not claimed or performed.
Final gate: DONE, claim released; one corrective task-level commit, no next batch started.

## F12-PD-B1C — Customer Product Details Integration

Task ID: F12-PD-B1C
Completed at: 2026-10-14 Asia/Tehran
Agent/Thread: Muse Spark (single agent, no subagents per task instruction)
Batch ID: PD-B1C
Reviewed by: Muse Spark (coordinator self-review; combined diff scope-checked)
Authority: explicit owner B1C implementation instruction; ADR-0016 and frozen store-product-details-v1 1.0.
Baseline: B1A 78c7209 + B1B 8ebfdbe + B1B-R1 43fa0ba DONE; clean worktree at claim.
Changed files:
  - apps/app/src/components/store/product-content-sections.tsx (new: conditional A-E sections from public DTO, plain-text only, no fake claims)
  - apps/app/src/app/(public)/store/products/[id]/page.tsx (PDP wired to real content + metadata alt; rating/seller/specs/reviews/questions blocks removed)
  - apps/app/src/components/store/store-ui.tsx (fake CartItem seller row removed; cart logic untouched)
  - apps/app/src/stores/product-extras.ts + product-extras.spec.ts (DELETED)
  - apps/app/src/components/store/product-specs.tsx + product-reviews.tsx + product-questions.tsx (DELETED, PDP-only)
  - apps/app/src/lib/patient-ui.test.ts (5 new content/cart presentation tests)
  - apps/app/e2e/product-content.spec.ts + product-content-browser.mjs (new: mock-API desktop/mobile)
  - apps/app/e2e/playwright.store-images.config.ts (second spec file registered)
  - plan/STATUS.md (batch claim + release)
Tests run (working directory apps/app unless stated):
  - pnpm --filter @sabz/app typecheck → PASS
  - pnpm --filter @sabz/app test → 22 files / 99 tests PASS (product-images suite retired with its module; net +5 B1C tests)
  - Playwright store PDP content (desktop 1440x900 + mobile 390x844, deterministic mock API) → 2/2 PASS: approved sections, legacy description, pending emptiness, no fabricated claims, image fallback intact, RTL, no overflow, purchase flow intact
  - Existing store-images Playwright suite re-ran in the same run → 2/2 PASS (no image regression)
  - Real dev API probed read-only: 4 products exist but carry no image/content/descriptions, so approved-content rendering was verified against mocks only (no product data mutated, per instruction)
  - No backend/Prisma/dashboard/R2 tests touched
Result:
  - approved public fields render (brand/manufacturer/short/full/ingredients/usage/warnings/contra) with legacy/top-level fallbacks exactly per visibility table → PASS
  - missing/unapproved fields render nothing; no approval badges or source claims invented → PASS
  - hardcoded ratings/counts, fake reviews/Q&A, fictional seller verification/satisfaction/warranties, hardcoded specs, cart seller row removed → PASS
  - plain text stays plain (escaping test) and warnings are never collapsed → PASS
  - title/image/SKU/price/cart/wishlist/navigation/loading/error preserved; no variant selector → PASS
Known limitations:
  - Hero banners/shortcuts/offers still hotlink Digikala (separate batch, untouched per instruction)
  - Local dev catalog has no approved products yet, so the approved PDP path is mock-verified; first real approval should be eyeballed after B1B-R1 acceptance data exists
  - Cart/wishlist browser coverage still deferred (auth routes); unit-covered
  - App has no lint script; typecheck + tests + diff check stand in
Next task:
  - none (STOP after B1C per instruction; B2 NOT started, no push/deploy)


## F12-WAL-BE01 — Shared wallet and prepaid booking backend

Task ID: F12-WAL-BE01
Completed at: 2026-10-16 Asia/Tehran
Agent/Thread: Codex /root; one agent, no delegated workers
Batch ID: WAL-BE01
Reviewed by: Codex /root (source/combined-contract/scope review); PASS WITH FIXES
Authority: explicit owner request for all backend wallet work; arbitrary online top-up, wallet as a payment method everywhere, full payment before final booking, ADMIN credit/debit/set-balance from patient detail. No user withdrawals/transfers. ADR-0017 freezes one inseparable shared-contract backend operation; app/dashboard/live release are separate.
Baseline: front@06780a104dc2bcd7bc5b145a0b13814bcaf55f0c. Pre-existing customer-app changes, motion folder and planning proposal preserved and excluded from this commit.

Changed files (complete groups within the task write set):
- apps/api/src/modules/billing/*: ledger, commands, intent/target registry, gateway recovery/reconciliation, DTO/controllers, reports and maintenance worker.
- apps/api/prisma/schema.prisma; five additive migrations 20261016120000 through 20261016120400; prisma/seed.mjs explicit development ADMIN clinic grant.
- appointments/{appointment-billing.target,patient-appointments.service,admin-appointments.service,patient-appointments.module}; paid booking, capacity, cancellation/refund and paid reprice guard.
- commerce/payments/{order-billing.target,payment-providers.module,payment-attempt-orchestration.service,payment-attempt.service,payment-verification.service,payment-credential-retention.service,payment-provider.port,sadad-payment-provider.adapter}; shared existing provider infrastructure, callback dispatch and legacy interoperability.
- commerce/catalog/admin-commerce-catalog.module; checkout DTO/service; inventory service; orders/commerce-order-operations.service; outbox/outbox.worker.
- common/auth/authorization.policy; common/errors/api-error; config/environment.validation; .env.example.
- test/wallet-billing.integration.spec.ts; wallet-migration-upgrade.mjs; patient-appointments.integration.spec.ts (isolated free legacy fixtures and cleanup); payment-credential-retention.spec.ts; payment-live-runtime.spec.ts (required billing dependency mock).
- .github/workflows/ci.yml: dedicated wallet_test database step; immutable financial fixtures never share the normal regression database.
- packages/api-client/openapi.json and src/schema.generated.ts.
- plan/decisions/ADR-0017-shared-wallet-backend.md; contracts/wallet-billing-v1.md and wallet-backend-handoff.md; STATUS/Phase12 checklist/this evidence.

Skills/plugins/tools actually used:
- Installed graphify skill: initial scoped graph audit; CLI query/update attempted, pre-existing uv trampoline failure. Existing graph inspected through Python/NetworkX during audit; no claim that it was rebuilt.
- nestjs-feature-audit for the preceding feature audit; nestjs-best-practices for module ownership, DI, transaction/error/security boundaries; ponytail for reuse and scope.
- Installed Prisma client API/CLI skills including transaction reference; installed Context7 MCP fetched Prisma transaction documentation. The implementation uses installed Prisma 7.10 API, existing NestJS/PostgreSQL and existing PSP adapter; no new runtime package/service was added.
- Plugin Management discovery inspected relevant backend tooling; no new external account, plugin install, live credential, cloud database or paid service was needed. This is source review and correctness verification, not a claimed Codex Security scan.

Verification (all local, synthetic credentials/PSP, real PostgreSQL 16):
- Isolated container mushroom-wallet-be01, bound only 127.0.0.1:55417; wallet_test, wallet_regression and wallet_upgrade databases. Original sabz-zendegi-postgres-1:5432 never migrated/reset.
- Prisma migrate deploy: clean 41-migration replay plus final additive migration; final 42-migration full replay through test/wallet-migration-upgrade.mjs PASS. Upgrade fixture inserts a legacy verified bank attempt/payment and completed refund after the 37 old migrations, applies all five new migrations, compares every old payment/attempt field, refund evidence, and absence of invented wallet balances: PASS.
- prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code: no difference, PASS.
- Final financial run: 36 tests / 6 files PASS: wallet-billing.integration (13 real DB scenarios), payment-provider-contract, payment-live-runtime, sadad-payment-provider.adapter, payment-credential-retention, patient-appointments.authorization. WALLET_BILLING_TEST_ISOLATED=1; database wallet_test.
- Regression run: 20 tests / 7 files PASS: patient-appointments.integration + authorization, commerce-checkout.integration, inventory-concurrency.integration, inventory-reservation-expiry.integration, payment-provider-order-id.integration, commerce-revenue.integration. Separate wallet_regression database.
- payment-provider-config.integration: 1 PASS with live operational settings and synthetic HTTPS domains/credentials; no real PSP traffic. Initial disabled-shell-env fixture failure and retained credential count were resolved by the test's intended live shell configuration and its normal scratch cleanup; no provider implementation weakened.
- authorization.guard + security-audit.integration: 16 tests PASS. Across those four API reports: 70 DISTINCT API tests (duplicate appointment authorization execution deduplicated), all PASS. API-client: 5 tests PASS.
- API build and test TypeScript checks PASS; OpenAPI export from the actual initialized app PASS; generated client freshness/build/test PASS; app, dashboard and web TypeScript checks against the final generated client PASS.
- OpenAPI baseline comparison: no old paths removed; 22 new paths; operation IDs unique. New receipt method fields are additive/optional in existing commerce DTOs.
- Development-only seed with synthetic admin, NODE_ENV=development on scratch DB: explicit clinic grant exists exactly once, PASS. Production seed credential restriction preserved.
- EXPLAIN ANALYZE/BUFFERS for bounded journal history on actual synthetic DB: Bitmap Index Scan using wallet_journals_account_id_version_key, 4 rows; 0.172ms observed execution. This justifies the account lookup index, not a production load/SLO claim.
- CI YAML parses. Dedicated database/opt-in suite wired for remote CI; remote CI itself not run. Direct installed Node/Prisma/TypeScript/Vitest CLIs used because local Corepack pnpm resolution tried unavailable registry access.
- git diff --check on owned paths PASS. Unrelated frontend changes not staged. Graphify update attempted and blocked by the existing launcher error, recorded separately; no graph outputs modified.

Acceptance/source review:
- Immutable double-entry journal, checked projection and nonnegative customer balances; direct raw balance overwrite, journal/entry mutation, balanced-entry-without-projection insertion and deletion of bank/refund financial history rejected by DB.
- 100 concurrent debits against 100 IRR at 3 IRR each: exactly 33 accepted, remaining 1 IRR, ledger mismatch count zero. Admin CREDIT/DEBIT/SET_BALANCE including zero, replay/conflicting payload/stale version, clinic/role rejection, patient redaction and admin actor display verified.
- Real checkout wallet debit/Payment/inventory/discount settlement atomic; duplicate wallet request no second debit; refund cap serialized; bank orders retain their own verified proof. Legacy refund dispatch depends on actual payment source, not mere intent existence.
- TOPUP never creates a commerce sale/order. Concurrent repeated Verify credits once; original provider revision retained; credentials needed by pending/recent billing attempts cannot be shredded. Timeout remains reconcilable.
- Callback token recovery requires authoritative exact amount and OrderId, even after reviewed manual failure. A callback can settle before the original request response without VERIFIED being overwritten. Browser result code never establishes success.
- Appointment creation only after full wallet/bank payment; unpaid capacity held/expired/cancelled safely; late bank success compensated to wallet without an appointment. Same-price reschedule retained; different paid price requires cancel/rebook. Cancellation refunds remaining wallet amount or opens an evidenced bank refund. One-rial service refund verified without rounding.
- Patient/admin APIs authenticated, permission- and clinic-scoped, input validated, bounded and rate limited; immutable actor/reason/audit and transactional financial outbox notifications preserved. Required DI now fails startup rather than silently bypassing billing hooks.
- Summary separates liability, manual credits/debits, actual gateway receipts, top-ups, service/order totals and refunds. Existing commerce revenue remains based on real order Payment/Refund facts.

Known limitations / exact next action:
- Backend only. App wallet/payment-result/payment selection/prepaid booking and dashboard patient wallet controls are NOT implemented. Follow wallet-backend-handoff.md under a separately claimed frontend task; no next batch started.
- No persistent development/staging/production migration, real PSP acceptance, deployment, push, merge or secret change. Backend cannot be rolled out alone while the old paid-booking UI still uses direct creation. Production monitoring/restore/PSP gates and existing Phase12 infrastructure blockers remain open.
- Token-less ambiguous requests require verified callback proof or reviewed manual failure; automatic retry cannot fabricate a lost token. Gateway refunds are manual with evidence; no user cash-out/transfer endpoint.
- Full repository suite/browser acceptance/remote CI/production capacity were not claimed; targeted checks above passed. Graphify launcher needs independent repair before a future graph update.
- Task-owned PostgreSQL container and all synthetic DBs removed after verification; original container remains running on 5432.

Final gate: F12-WAL-BE01 DONE; WAL-BE01 claim RELEASED. One task-level commit owns backend/contract/evidence changes only. Whole wallet feature and Phase12 are not marked complete.

## F12-PJ-R01 — Assessment concurrency, revisions and transactional audit

Task ID: F12-PJ-R01
Completed at: 2026-10-16 Asia/Tehran
Batch: PJ-R01
Agent/Thread: Codex /root; one agent, no subagents
Reviewed by: Codex /root; focused source/combined-diff, contract and security-boundary review PASS
Baseline: front@ebbb2b3; clean worktree. Authority: explicit owner instruction to begin the reviewed Patient Journey backend implementation and use relevant skills/plugins. Backend-first override is limited to this task; Phase12 stays active. Full brief and clinical release remain unaccepted.

Changed files:
- apps/api/src/modules/assessments/patient/patient-assessments.{service,controller,dto}.ts
- apps/api/src/modules/assessments/application/assessment-audit.ts; src/common/errors/api-error.ts
- apps/api/prisma/schema.prisma; new migration 20261016170000_assessment_submission_reliability
- apps/api/test/assessment-reliability.integration.spec.ts; assessment-reliability-upgrade.mjs; patient-assessments.authorization.spec.ts
- .github/workflows/ci.yml: dedicated disposable assessment reliability test step
- packages/api-client/openapi.json and src/schema.generated.ts, generated by official scripts
- ADR-0018, assessment-reliability-v1, patient-journey-backend map, STATUS/Phase12 checklist/this evidence

Pre-fix evidence:
- Existing completion key replay onto a second submission with identical answers returned 201/the first result instead of 409.
- Latest Mezaj returned 200 after its source was invalidated instead of 404.
- Induced PostgreSQL audit failure returned 500 but saved changed answers beforehand; expected rollback failed.
- These three cases failed before application edits. Concurrent start passed in that particular baseline scheduling run; its unsafe check/create race was established from source, not falsely claimed as reproduced in that run.

Implementation and acceptance:
- One partial unique active-attempt constraint plus patient/version start lock; concurrent starts return the same ID and allocate one attempt. Publication share lock prevents version retirement racing a new start.
- Owned row locks serialize save/submit; completion-key namespace locks prevent same-patient key races across distinct submissions. Equal completed retries return the same immutable completion and one MezajResult; competing keys fail with a stable conflict. Keys never replay another resource, even with equal saved answers.
- Server-owned revision and optional expectedRevision precondition; changed stale saves/submit fail; identical draft snapshots are no-ops. Database advances revisions for older writers and preserves terminal revisions/content. Existing no-body submit and answers-only save remain valid.
- Sensitive read/resume and changing commands audit inside their transaction, with safe ID metadata only. Induced audit failure rolls back start, answers/revision, completion and Mezaj; sensitive reads fail closed.
- Self/resource/clinic checks preserve 404 concealment, including same-patient data attached to another clinic. Latest Mezaj ignores invalidated source submissions. MAIN/MEZAJ separation, scoring, clinical-review visibility and booking policy remain unchanged.

Verification (local, synthetic fixtures; PostgreSQL16):
- Owned disposable container mushroom-pj-r01 on 127.0.0.1:55419; databases patient_journey_test, patient_journey_upgrade and patient_journey_fresh. Existing sabz-zendegi-postgres-1:5432 never migrated/reset.
- Final focused API run: 55 tests / 8 files PASS (21 assessment reliability PostgreSQL/API cases; patient assessment authorization, scoring, booking contract/eligibility, Mezaj integration, admin assessment and submission authorization).
- Additional OpenAPI contract + authorization.guard: 23 tests / 2 files PASS. Total 78 distinct API tests; earlier repeated runs not added to this count.
- Official API-client generation/test/build: 5 tests PASS; freshness PASS. All 217 old API paths retained, zero removed. Optional expectedRevision JSON body/field and optional revision response tested; 201 completion response now documented alongside existing 200 documentation.
- API build TypeScript, API test TypeScript and app/dashboard/web typechecks PASS. No frontend source changes or browser execution.
- Full 43-migration clean replay PASS; Prisma migrate diff reports no difference. Upgrade script manually replays 42 prior migrations, inserts legacy active/completed/result fixtures, proves duplicate-active migration refusal is atomic and preserves all rows, removes only its deliberately introduced uncompleted duplicate fixture, and proves successful upgrade preserves every historical answer/result field. Old-writer revision advancement and terminal-content/revision immutability PASS.
- Upgrade fixture initially collided with the migration-created active clinic; fixed the fixture to reuse that clinic, recreated only the owned scratch upgrade DB, then the complete proof passed. No production rule was weakened.
- EXPLAIN ANALYZE for the actual active-attempt lookup on the small scratch population: Seq Scan selected, observed 0.046ms; no performance improvement/SLO is claimed. Partial unique index is primarily a correctness constraint.
- Scoped git diff --check PASS. No unrelated source, historical contract, billing/provider or lockfile changes. Temporary PostgreSQL container and all scratch DBs removed; main PostgreSQL container remains running.

Skills/plugins actually used:
- graphify skill: scoped graph navigation; CLI query/update attempted, existing uv trampoline failure; graph not regenerated or claimed fresh.
- nestjs-best-practices: module sharing, input/guards and transaction guidance; Prisma plugin client API skill/reference for typed transaction and raw-query use; ponytail for the smallest existing-engine correction.
- Plugin Management discovery and existing Context7 MCP resolve/query used for transaction documentation. Local Prisma 7.10 client/types and existing repository patterns remain the authority when a current documentation result refers to a newer API. No plugin/package installed and no external provider/account data accessed.
- nestjs-code-audit collector read-only, scoped to src/modules/assessments/patient (7 files), plus bundled semantic/security lanes. Its HTTP-exception heuristic is an established Nest application-service boundary, not a confirmed defect. The collector itself did not run lint/TypeScript; compiler/tests were executed separately as above. This is a focused main-agent review, not an independent full Codex Security scan.

Known limitations and next action:
- Old clients omitting expectedRevision still have serialized last-write-wins draft saves. Strict stale-edit protection is proven only for clients sending the precondition; future paid/couples entry points must require it and define their own session-scoped attempt invariant.
- No retired-questionnaire resume policy, algorithm change/version contract, qualified review/publication gate, commercial offering, digital entitlement, couples, personalized guidance or program delivery is declared complete. No full-brief percentage or production-readiness claim.
- Persistent environments require the new migration before activating this code. Existing duplicate active attempts deliberately block deployment for reviewed resolution; no automatic patient-data deletion/invalidation. No persistent DB, provider/SMS, push, merge, deploy, secret or frontend modification.
- Graphify launcher remains unavailable; no installation attempted. Package-manager wrappers were sandbox-blocked; used the already cached pinned pnpm10.10.0 entrypoint with scoped command approval, without installing packages.
- Remote CI and full repository/browser/load suites were not run; focused checks cover the accepted task. Added CI step was source-reviewed, its equivalent PostgreSQL run passed locally.
- Next candidate F12-PJ-J01: prepare/freeze the additive derived journey/action contract, then normal claim under existing owner authorization. F12-PJ-R02 historical resume requires the explicit retirement-policy decision. No next batch started, honoring the repository per-task stop boundary.

Final gate: F12-PJ-R01 DONE; PJ-R01 claim RELEASED. One final task-level commit contains implementation, verification and governance only. The comprehensive Patient Journey backend and Phase12 remain incomplete.

## F12-PJ-J01 — Derived patient Home and next action

2026-10-16; Codex /root single owner/reviewer; front@82fa9c4 clean baseline. Owner explicitly superseded the per-task stop with nonstop serialized backend execution. Each task retains its own review and commit. Contract patient-journey-v1 frozen before runtime changes; no closed phase or existing frozen contract modified.

Delivered GET /v1/patients/me/journey with PATIENT plus self-domain permissions, private/no-store response and patient/clinic derivation from the authenticated principal. Existing onboarding and booking eligibility readers accept a transaction client and retain their old default behavior. One repeatable-read transaction composes bounded assessment/appointment/billing/order/treatment references and atomically records a minimized PatientAccessAudit READ through the existing clinical audit service. Missing patient does not provision; failed audit produces 503 with no summary. No new schema/table/state machine, provider call or clinical recommendation.

Each collection uses take6, emits at most5 plus hasMore. Independent one-row action queries avoid hiding an actionable draft/result/near appointment behind the bounded summary. Current appointment windows retain existing one-/four-hour time bounds; opening its detail grants no chat permission. Medical onboarding is separate from shopping. Money remains integer strings with explicit IRR/TOMAN. Draft clinical plans, answers, result values, names, addresses, medical declarations and payment snapshots/tokens never enter the projection. Retired-draft summaries conservatively advertise no questionnaire resume until R02's historical retrieval contract; existing submission commands are unchanged.

Verification PASS:
- Disposable mushroom-pj-j01 PostgreSQL16 on localhost55419, patient_journey_test; all43 existing migrations replayed and development fixtures seeded. No new migration or persistent database changes.
- Pinned cached pnpm10.10.0: API vitest journey13 + assessment-reliability21 + patient-booking-eligibility8 =42; self-profile.integration3 separately =45 distinct focused tests. Final journey13 rerun after scoped review corrections PASS. Real HTTP tests cover anonymous/role/session denial, missing patient/no provision, incomplete/complete progress, foreign patient/query override/foreign clinic, retired draft, bounded lists and hidden actionable reference, pending/expired payments/currency, pending Store orders/privacy, near/terminal appointment/no chat creation, minimized audit and injected database audit failure. Initial fixture-only failures (lifecycle timestamps, revocation reason and overlapping doctor fixture) were corrected without weakening constraints.
- API source and test TypeScript checks PASS; official openapi:export and api-client generate/test/build PASS (5 client tests); App/Dashboard/Web typechecks PASS. All217 old paths retained; exactly one new journey path. Generated-file reordering comes from official Nest traversal; no manual generated edits.
- Main-agent controller→guard→transaction→projection/audit review PASS. Read-only nestjs-code-audit collector scoped to four journey files: no heuristic candidates; compiler/tests run separately. Review added independent action queries and preserved confirmed-appointment grace. No full-repository scan/browser/load/remote-CI acceptance claimed.
- NestJS best-practices and Prisma client API plugin skill used. Context7 transaction lookup returned newer ORM8 APIs; local installed7.10 types and actual PostgreSQL tests remain authoritative. graphify update . attempted; pre-existing uv trampoline canonicalization failure persists, graph not claimed fresh. git diff --check PASS.

No frontend, new questionnaire/clinical algorithm, digital entitlement, couples result, qualified guidance, live Sadad acceptance, push or deployment completed by this task. The task-owned disposable DB remains available for the next serialized batch. Independent production/clinical approvals stay open. Final gate: F12-PJ-J01 DONE, PJ-J01 RELEASED; next eligible R02 discovery/historical questionnaire/provenance contract, then inactive offering/release foundation. Continuous owner instruction authorizes continuation after this task-level commit.

## F12-PJ-R02 — Owned assessment discovery and provenance

2026-10-16; front@79badad clean baseline; Codex /root one owner/reviewer; continuous backend authority. Contract assessment-discovery-v1 frozen before runtime writes. No frozen historical contract modified, no schema/migration, clinical policy or frontend change.

Delivered three additive PATIENT/self-read/no-store APIs: strict paginated/filterable history (page<=10000, pageSize<=50, safe summaries), exact owned questionnaire including immutable retired versions, and completed-result provenance. History count/data/audit share repeatable-read; all new sensitive reads audit before responding. Foreign patient/clinic, draft/invalidated questionnaire and incomplete/invalidated provenance stay concealed. Retired start remains404; existing owned save/submit behavior is preserved and questionnaire retrieval now makes that continuation usable. J01 resume projection follows this additive extension rather than substituting the latest published version. Invalidated history remains a safe nonresumable reference.

New completions persist the existing technical WEIGHTED_SUM/v1 identity, version content hash and completion answer payload hash in the existing immutable result snapshot. No scoring semantics, weights or clinical validity changed. Old snapshots are never rewritten or recalculated; absent algorithm metadata is explicitly null/LEGACY_UNRECORDED. Provenance does not grant scientific/clinical approval, paid entitlement or result release. New paid/couples offerings must apply shared gates to every legacy/new resource path before activation.

Checks PASS using cached pinned pnpm10.10.0 and the existing disposable patient_journey_test DB:
- API focused vitest discovery10 + journey13 + reliability21 + scoring3 =47, plus existing patient-assessments.authorization5 + eligibility8 =13, 60 distinct total. New cases cover strict query/unknown fields and paging, minimized summaries, retired exact questionnaire/save/complete and retired start denial, foreign patient/clinic/draft/invalidated denial, new and untouched legacy provenance, incomplete/foreign/invalidated result denial, role/session gates and injected PostgreSQL audit failures across all three reads. Audit failure returns safe500 consistent with existing assessment service; no raw SQL or synthetic error reaches clients. Test fixture implicit-any corrected; final test TypeScript PASS.
- Official openapi:export/client generate/test/build PASS (client5); API/test and App/Dashboard/Web types PASS. All218 previous paths retained, exactly3 additive paths (221 total). No manual generated edits.
- Main-agent scoped authorization/projection/transaction/hash/immutability/replay/combined-diff review PASS; git diff --check PASS. nestjs-code-audit read-only collector scoped to patient assessment files: only existing HTTP-exception-import heuristic, appropriate at the established Nest application boundary; no actionable defect. NestJS/Prisma skill guidance reused; graphify update . attempted and still fails at the pre-existing uv trampoline, no graph freshness claim.

No persistent database, live provider, installs, frontend, push/deploy or remote CI/full/browser test. Clinical review flags remain legacy informational behavior; no sixteen-type result taxonomy or new approval rules invented. Disposable PostgreSQL remains owned for the following serialized batch. F12-PJ-R02 DONE, PJ-R02 RELEASED; next candidate offering/version/release-readiness foundation with publication disabled until actual owner/clinical decisions exist.

## F12-PJ-O01 — Versioned assessment offering draft foundation

2026-10-16; front@374394d clean baseline; Codex /root one coordinator/owner/reviewer; explicit continuous backend authority. ADR-0019 and assessment-offering-drafts-v1 frozen before implementation. The owner's approximate temperament/question count description was recorded as unapproved algorithm input; age/invitation/refund definitions were requested asynchronously while independent work continued.

Delivered one append-only AssessmentOfferingVersion table and migration44 (20261016180000_assessment_offering_drafts), ADMIN + ASSESSMENTS_MANAGE + explicit active-clinic membership APIs for create next version/list/read/retire, strict DTOs, atomic audit, canonical command replay and database-serialized consecutive versions. Stable kind/locale/questionnaire family and same-clinic immutable source are enforced by both service and database. Commercial edits append versions; content rewrites/deletes/publication are rejected. FREE stores zero/no payment point without financial or provider records; PAID draft may remain unpriced or records exact integer IRR and PRE_START/PRE_RESULT_UNLOCK. Algorithm/policy references are unapproved draft configuration, never scientific/clinical approval. No seeded policies/prices and no patient-facing draft exposure or checkout. Response releaseReadiness is always false with explicit owner/clinical/access and conditional missing-config/couples reasons.

Migration review corrected SQL CHECK three-valued-null behavior before first application (FREE amount explicitly nonnull) and aligned the composite FK name with Prisma. New inserts must begin DRAFT; later publication requires a separately reviewed forward migration/contract. No applied migration rewritten. Historical R01 upgrade proof now explicitly selects migrations through its original43 boundary instead of being invalidated by later migrations; its actual checks remain unchanged and passed.

Verification PASS:
- Existing task-owned PostgreSQL16 mushroom-pj-j01 / patient_journey_test upgraded43→44; separate empty patient_journey_offering_fresh replayed all44 migrations. Prisma validate/generate and migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code: no difference. Persistent database untouched.
- New isolated assessment-offerings-upgrade.mjs replayed prior43, populated synthetic user/patient, active/completed assessment and Mezaj, pending BillingIntent, pending Store order and zero wallet, applied44 and compared every original row exactly. Offering table initially empty, retained legacy result unchanged; new content immutability/delete/publication SQL checks PASS. Original R01 upgrade proof also PASS at43, including duplicate-active atomic refusal and legacy writer revisions. Proof databases remain disposable and task-owned.
- API vitest offering12 + discovery10 + journey13 + reliability21 + scoring3 + patient authorization5 + eligibility8 =72 distinct focused tests, all PASS. New coverage: same-key10-way canonical replay/changed payload conflict, eight consecutive concurrent versions, kind/locale/family stability, explicit-role/clinic membership/resource scoping, strict money/nested/query bounds, partial paid/couples drafts, privacy/no fabricated payment, bounded list and concurrent retirement/replay, direct-SQL content/delete/publication/version-gap/null-free-amount/kind/clinic constraints, audit rollback on create/retire and fail-closed reads. Test JSON read/write typing corrected without weakening assertions; API/test types PASS.
- Official OpenAPI export and client generation/test/build PASS (client5); App/Dashboard/Web types PASS. All221 previous paths preserved plus4 administrative paths (225 total); no manual generated edits.
- EXPLAIN ANALYZE bounded clinic/createdAt/id list used assessment_offerings_clinic_created_idx via Index Only Scan Backward, 0.137ms on synthetic small data. This supports index/query alignment, not a production performance claim. Unique version/command indexes enforce invariants.
- Main-agent controller→guards→membership→locks→constraints→projection/audit review and git diff --check PASS. Read-only nestjs-code-audit collector scoped to four offering files: no heuristic candidates; checks executed separately. NestJS architecture/security/transaction guidance, Prisma plugin client/CLI references and existing module conventions used. graphify update . attempted; pre-existing uv trampoline failure persists, no graph freshness claim.

No clinical approval, algorithm taxonomy, saleable paid assessment, entitlement/refund activation, couples participation/result, personalized guidance, frontend/browser/full repository/remote CI/live provider/push/deployment acceptance. No persistent DB migration or installs. New migration must precede runtime activation in a separately authorized environment. F12-PJ-O01 DONE/review PASS, PJ-O01 RELEASED; next independent technical candidate is safe authoring validation/concurrency/audit for the reused questionnaire engine, with publication/policy decisions still gated. Continuous owner instruction authorizes the next serialized claim after this independent commit.

## F12-PJ-R03 — Questionnaire authoring validation and atomic lifecycle

2026-10-16; front@a8ccc44 clean baseline; Codex /root one owner/reviewer; assessment-authoring-reliability-v1 frozen before changes. Continuous backend authority; no schema/migration, frontend, permission expansion or frozen historic-contract edits.

Pre-fix real PostgreSQL/HTTP reproduction: missing boolean scoring weights accepted201 instead of422; eight concurrent create requests returned two201/six500 from version allocation races; an induced audit failure returned500 but left one persisted draft. All three expected assertions failed before runtime edits and now pass. Faults affected only disposable synthetic records.

Changed: domain structural validator checks engine-supported question types, canonical/unique ids, required flags, boolean weights, choice options/duplicates/finite scores, text limits, numeric bounds/nonoverlapping ranges, result-band bounds/ids/overlap/risk/review flags. Drafts can remain empty for editing; new publication requires at least one question. No question count, weight, temperament category, scientific claim or scoring formula is invented. Old immutable versions/results stay unchanged; already-published idempotent operation preserves legacy behavior. Invalid historical copies remain repairable drafts and must validate before publication.

Create/duplicate allocate versions under clinic/key/locale advisory lock. Changed update/publish/archive operations lock the same-clinic version row before reading state and applying changes; a partial edit merges with current locked data. Publication also serializes its namespace and retains stable single-publication conflict behavior. Every changed operation and its existing audit commit/roll back together; structure/medical values never enter audit metadata. Legacy same-field updates remain serialized last-write-wins and create/duplicate remain distinct commands without new idempotency headers; neither is falsely claimed as stronger precondition/replay behavior.

Verification PASS:
- Focused vitest10 files, 106 distinct tests: prior72 + authoring PostgreSQL11 + structure validator18 + existing admin authorization/lifecycle5. New integration covers malformed draft/no write, eight-way create and duplicate version races, concurrent partial-field edits, edit/publication race and terminal immutability, audit rollback across create/update/duplicate/publish/archive, empty publication repair, stable two-version publication conflict, foreign-clinic concealment and nonadmin HTTP denial. New unit cases exercise all five question types and unchanged deterministic score, malformed/nonfinite/ambiguous structures, duplicate ids and empty draft/publication separation.
- API source/test types PASS; official OpenAPI export produced no wire change (all225 paths and generated client unchanged); client freshness/tests5 PASS. Existing consumer types passed O01 immediately before this internal-only change; no unnecessary new frontend/build/browser run.
- Scoped main-agent lock-order/state/transaction/validation/ownership review PASS; NestJS/Prisma transaction guidance reused. Read-only nestjs-code-audit collector scoped to existing admin assessment files: only established HTTP-exception boundary heuristics, not actionable findings; separate compiler/tests above. graphify update . attempted and failed at the known uv launcher; no graph freshness claim. git diff --check PASS.
- Existing disposable PostgreSQL with44 applied migrations reused; no migration or persistent DB/provider/configuration action. Equivalent focused CI invocation extended; remote CI/full repository/browser/load not run.

During this task owner specified age minimum18, invitations without automatic expiry until recipient action and no purchase cancellation for now. Recorded in STATUS/task map; opening/prefetching a link is not authenticated consent acceptance, and consent/data-access revocation remains separate from purchase cancellation. No blanket refund denial inferred. Clinical algorithms/content/consent text and retention/refund exceptions remain unresolved.

F12-PJ-R03 DONE/review PASS, PJ-R03 RELEASED; next serialized candidate couple account-link/invitation/consent foundation using the approved technical age/expiry choices, without claiming paid assessment or joint result completion. Disposable container remains task-owned for that continued verification; continuous owner authorization remains active.

## F12-PJ-C01 — Adult independent couple account links and invitations

2026-10-16; front@b8cb39d clean baseline; Codex /root single owner/reviewer; continuous backend authority and explicit owner age18/nonexpiring invitation/new-assessment purchase-cancellation-off decisions. ADR-0020/couple-account-link-v1 frozen before runtime changes. Frozen pre-release privacy addendum records the review correction without changing the base contract. No closed phase or historical contract modified.

Delivered three scoped relational models and migration45 (20261016190000_couple_account_link, Prisma-generated relational scaffold plus reviewed SQL invariants): CoupleSession/Participant/Invitation. Same-clinic composite FKs, two unique participant slots and independent patient identities, one pending invite, immutable identity/policy/consent evidence, final revocation and deferred aggregate consistency. Existing intake DOB supplies a boolean UTC age18 check; no DOB duplicate or verified legal-age claim. Existing ConsentPolicyVersion reused, with independent exact account-link consent under each participant's active session. No individual attempt is linked/reused, no answers/clinical records/results or billing are exposed or processed. assessmentReady=false explicitly.

Eight authenticated self operations over seven additive paths: current link policy, create/list/detail session, invitation issue/replacement, secret-body preview, explicit accept, own consent withdrawal. Required self permissions/current session, explicit true consent, ownership/clinic/intended recipient, existing authenticated rate limiter, private/no-store, bounded lists and atomic minimized audit. Home adds bounded own coupleLinks; original action priority remains. Recipient must first register and deliberately share existing self-profile routing address plus normalized phone. This is routing, not identity authentication or consent; the recipient must still authenticate independently and possess the 256-bit secret. No public contact search or new identity/OTP infrastructure, no copied phone or peer id/name/medical data in read DTOs. No SMS/email sent.

Only SHA-256 invitation secret stored; plaintext returned once. Same-key replay returns the same resource with token=null. Explicit replacement creates a new secret and revokes the former pending token; lost initial response recovery is replacement, not raw-token storage. No expiry deadline or automatic timeout. Preview/open does not accept or create participant. Withdrawal idempotently disables shared link and pending invitation immediately; it is neither a purchase cancellation nor automatic refund. Existing Store/consultation cancellation/payment contracts remain unchanged.

Owner consent publisher keeps its medical default and requires explicit CONSENT_POLICY_KEY=COUPLES_ACCOUNT_LINKING with matching exact-body hash, allowed environment and release reference for the new purpose. No actual legal text published/seeded; missing policy503 is an activation blocker. Changed/retired pinned policy requires updated consent flow; it does not silently expire/delete the token. Account-link consent is not medical assessment/answer/result disclosure consent. Request body invitation token/phone/routing address redacted; global exception filter returns safe errors without logging raw Prisma exceptions.

Review corrections and evidence:
- An intermittent withdrawal500 was traced using only task-container error causes/sanitized timestamps: test-server wall clock stepped backwards ~0.8s, violating revokedAt>=acceptedAt. Runtime clamps event evidence with PostgreSQL GREATEST(current timestamp, prior timestamp); a deterministic future-grant test proves privacy revocation remains immediate despite clock rollback. Applied migration45 was not rewritten.
- Phone-only routing would reveal membership through registered201/unknown422. Before release, froze the privacy addendum and required the recipient's privately shared existing profile address plus phone. Tests verify missing/wrong address gives the same error across registered/unknown phones. No new lookup service/identity table; read/audit projections hide address and phone. One-time secret and account authentication remain independent mandatory gates.
- Lock-order review aligns clinic KEY SHARE before policy/session locks with the existing owner policy publisher (clinic first), and locks the active policy FOR SHARE with a stable changed-policy conflict. Session row serialization protects issue/accept/withdraw; no automatic regrant.

Verification PASS:
- 21 new real PostgreSQL HTTP/constraint cases: missing policy/explicit consent, missing/under18/exact birthday, eight-way session create/accept/secret issuance replay, intended account/self/foreign/third account denial, hashed-only storage/one-time replay/normalization, preview nonconsumption, explicit replacement, invitation created2020 still accepted, concurrent/final withdrawal/no financial mutation, clinic/policy gates, strict queries/DTO, backward-clock revocation, acceptance/withdrawal race, bounded own list/Home, eight audit-failure read/write paths with full rollback/no secrets in errors, command rate limit/session revocation, immutable consent/slot/retention/regrant SQL guards, orphan/forged identity/duplicate pending invite rejection and membership-oracle prevention.
- Full focused13-file API gate140 tests PASS: prior106 plus couple21, consent document CLI4 and identity-security9. Final API/test TypeScript PASS. CLI tests preserve old medical-purpose behavior, exact hash/environment checks and explicit couple opt-in; scratch cleanup now verifies its resolved absolute temp prefix before recursive deletion. No full repository/browser/load/remote-CI acceptance claimed.
- Separate empty patient_journey_couple_fresh replayed all45 migrations. New couple-link-upgrade.mjs replayed44, populated legacy identity/session/intake/assessment/Mezaj/billing/order/wallet/offering/consent rows, applied45 and compared every prior row unchanged. New link tables initially empty; direct DB independent consent/old invitation acceptance/final revocation proved, with legacy rows still unchanged after operations. Prisma validate/generate and schema diff: no difference. All DBs are in task-owned mushroom-pj-j01 on localhost55419; persistent data unchanged.
- Official OpenAPI export/client generation/test/build PASS (client5). All225 prior paths preserved plus7 paths/eight operations (232 total); additive Home property. App/Dashboard/Web types PASS. No manual generated source edits.
- EXPLAIN ANALYZE own-session bounded semijoin/list: small synthetic107 sessions/137 participants, sequential scans/hash join/sort chosen,0.184ms. New participant/session/command/token indexes align ownership lookups and uniqueness; no production latency improvement claimed.
- Main-agent combined diff/authorization/age/consent/hash/lock/race/privacy/retention-boundary review and git diff --check PASS. Read-only NestJS collector scoped to five couple files: established HTTP boundary heuristics only; checks run separately. NestJS/Prisma client/CLI guidance and existing identity/consent/audit mechanisms reused. graphify update . attempted; pre-existing uv canonicalization failure persists, no graph freshness claim.

Explicit limitations: registered recipients only, separately shared routing address and manual link delivery; no frontend/single-device browser flow or real owner legal-policy publication, scientific questionnaire/joint algorithm, paid assessment/entitlement, private-answer sharing, result/clinical guidance activation, actual retention/refund exception policy, provider acceptance, persistent migration, install, push or deploy. New runtime/API requires migration45 in any later authorized environment. No overall completion percentage or complete couples-assessment claim.

F12-PJ-C01 DONE/review PASS, PJ-C01 RELEASED; disposable verification container retained for continuous serialized work. Next independent candidate is versioned educational guidance snapshots/provenance/mappings reusing Article. Proposed qualified reviewer boundary (linked active doctor, clinic scope, existing clinical-sign capability; no ordinary ADMIN approval) has been asked asynchronously and remains pending; approval activation must await owner choice. Actual clinical/algorithm data remain owner/professional inputs, not generated defaults.

## F12-PJ-G01 — immutable educational guidance and physician publication

Accepted: 2026-10-17. Batch PJ-G01; Codex /root coordinator/owner/reviewer, one agent; baseline front@bf64ace clean. Continuous implementation authority plus explicit owner approval of linked active same-clinic physician/current clinical-sign permission; ordinary ADMIN cannot approve. ADR-0021 and frozen guidance-content-v1. Main-agent review PASS, task DONE/claim RELEASED; whole backend/product is not DONE.

Implemented one GuidanceContentVersion model/migration46 using existing Article editor/source, DoctorProfile, ClinicalClinicAccess, live UserRole/clinical grants and sessions. Immutable consecutive snapshots bind exact text, locale, educational category, supplied provenance and safety boundaries with SHA256. DRAFT→APPROVED→REVOKED or draft withdrawal, no restore/delete. Qualified physician verifies exact hash and explicitly attests education-only/no diagnosis or individualized therapeutic diet. Retained profile/user/session/time evidence, scoped locks, same-clinic guards and transactional metadata-only audit. No real content/grants seeded; synthetic fixtures only. Former mutable Article publication remains compatible and confers no medical approval. No source fetching, clinical assertions or new editor/assessment engine.

Nine APIs: admin capture/list/get/draft withdrawal, physician list/get/approve/revoke, patient approved-version retrieval. Ordinary admin approval denied; live scoped linked published active physician and existing clinical-sign capability mandatory, database checks independently enforce physician/owned active session for approval. Patient projection hides draft/revoked/unavailable physician authority and all private actor/session/profile identifiers, preserves exact approved text after source edit. Lists bounded; no-store; strict nested DTOs/calendar dates; safe errors and provenance/safety redaction. No result mapping or clinical patient-record access is inferred.

Verification PASS:
- New guidance PostgreSQL HTTP suite:18 cases. Concurrent same-key create/distinct version allocation/approval/withdrawal, stale hash/unsafe attestations, all authority/profile/clinic/permission/session boundaries, source edit/replay/new-version isolation, final revocation, rollback-clock evidence, direct SQL retained/immutable/forged identity/evidence/version guards, six audit-failure rollback/read paths and private projection.
- Focused combined11 files140 API cases; existing admin/patient assessment authorization/booking eligibility3 files18; existing content publication/OpenAPI2 files9.167 distinct API tests across16 files PASS. OpenAPI freshness8 rerun after documentation-only error additions PASS (not counted twice). No full repository test/build/browser run.
- Prisma7.10 generation/validate, API/test TypeScript, all46 migrations on independent empty disposable database, populated45→46 proof in guidance-content-upgrade.mjs, and schema diff no difference PASS. Upgrade proof snapshots every existing table, including legacy medical/Mezaj/billing/order/wallet/Article/couple consent/invitation history, before new migration and after guidance operations; no legacy changes. New table starts empty; qualified approval/final revocation enforced.
- Official OpenAPI export/generated client: all232 prior paths retained +nine=241; no manual generated edits. Client freshness/tests5/build and App/Dashboard/Web typechecks PASS. API export compiles scoped API only; not full workspace build.
- Scoped Nest read-only collector4 feature files, no heuristic candidates; main review traced guards→DTO→service→SQL→projection/audit and reviewed combined owned changes. Not an independent security audit. git diff --check PASS. Actual list EXPLAIN over86 synthetic snapshots chose small-table sequential scan/sort, execution0.266ms; index matches clinic/status/created/id filtering/order. No production latency claim or benchmark improvement inferred.

Relevant implementation: apps/api/src/modules/content/guidance/*; schema/migration20261016200000; app wiring/shared error allowlist/log redaction; focused tests/upgrade script and existing dedicated CI invocation; official client; scoped governance. No existing frozen contracts, roles/grants, frontend, provider configuration, persistent database, secret, push/deploy touched. Task-owned localhost55419 PostgreSQL retained for authorized next work.

Tool limitation: graphify query/update still fail with pre-existing uv trampoline canonicalization error; graph was not refreshed. Initial Prisma generation was not executed when automatic approval review could not run due usage quota; after user continuation it was rerun successfully with normal reviewed escalation. No bypass/install. Test setup initially omitted existing published-specialty/session-revocation-pair constraints and omitted-header helper used a default key; fixtures/helper corrected to exercise actual repository rules before acceptance.

Remaining: actual qualified-reviewed sources/text and professional credential verification/clinical correctness are owner/operator responsibilities. Technical publication gate does not establish scientific validity of temperament. Next candidate is separately contracted exact result-band mapping/delivery, then paid entitlement/couples assessment scope/authorized consultation context. No claim of live PSP, UI or full clinical acceptance.

## F12-PJ-G02 — exact result to approved education/service mapping

Accepted:2026-10-17. Batch PJ-G02; Codex /root single coordinator/owner/reviewer; baseline front@6769078 clean; continuous owner implementation authorization and approved physician publication boundary. Frozen assessment-guidance-v1, ADR-0021. Task DONE/review PASS/claim RELEASED; full backend/product/clinical acceptance not claimed.

One additive AssessmentGuidanceVersion/migration47 captures exact immutable questionnaire hash, source band definition, existing technical WEIGHTED_SUM/v1 identity, ordered approved same-locale content/hash references, semantic public service snapshots and explicit consultation recommendation. Draft creation/version allocation/idempotency, physician exact-hash/safety-attested approval and final withdrawal retained. Database checks same-clinic questionnaire FK, exact source/reference snapshots, live qualified physician/owned session, versions/evidence/immutability and retained history. No scoring engine duplicated/recomputed, taxonomy invented or actual mapping/content/role grant seeded.

Nine APIs: admin create/list/get/draft revoke; physician list/get/approve/revoke; GET assessment-submissions/:id/guidance for own valid completed result. Supported persisted provenance and matching source band required. Legacy/unsupported metadata, individual review flag, latest approved mapping revocation, source hash or reference semantic/visibility/qualified-reviewer loss yield explicit empty delivery statuses. No older approved fallback after withdrawal; a later explicit approval can replace it. Retired exact questionnaire remains usable historically. Service recommendations confer no booking/price/entitlement; existing directory and financial/booking rules remain authoritative. Clinical audit READ and response are one repeatable-read transaction. SQL excludes answers/score before reading provenance; output excludes private identifiers/answers/score.

Reused G01 physician authority as one exported service without permission changes; G01 projection/current-approved-content seam reused. Extracted existing patient-directory service visibility expression once, preserving its filters; clinician SQL guards independently check matching constraints. Existing Article and assessment behavior unchanged; no previously frozen contract modified. App module order preserved to prevent unnecessary generated-contract churn.

Verification PASS:
-18 new real PostgreSQL HTTP cases: actual existing-engine completion→physician content approval→mapping approval→own READY result; strict metadata; clinic/patient/live-role/physician authority; legacy and unknown/tampered provenance; review flag and retirement; no shadow by drafts/no old fallback after latest revocation; guidance/reference reviewer revocation; service semantic change and public withdrawal (tariff change remains independently current); eight-way retry/version/publication/withdrawal races; direct SQL retained/immutable/forged/version guards; five metadata-audit failure paths and clinical-read audit failure503 with write rollback/no sensitive response.
- Combined17 focused files179 cases + OpenAPI freshness8=187 distinct API tests PASS; G01's18 regression cases included. Existing directory2/content1/assessment/eligibility/consent/security cases included; no full repository suite/browser. Initial historical fixtures tried mutating completed immutable rows and were correctly rejected; replaced with separate synthetic legacy imports rather than weakening existing guards. Explicit Prisma JsonNull handling corrected fixture type; API/test typecheck PASS.
- Prisma generate/validate, fresh47 replay in independent empty disposable DB, populated46→47 assessment-guidance-upgrade.mjs proof and schema diff no difference PASS. Proof preserves every existing table/row, including Article/directory, qualified reviewer evidence, approved/revoked guidance, medical/Mezaj/billing/order/wallet/couple consent history. New mappings start empty; source/content/service constraints and final revocation verified.
- Official generated OpenAPI/client:250 paths, all241 previous path definitions exactly unchanged; nine additive paths. Client freshness/tests5/build, API/test types and App/Dashboard/Web types PASS. OpenAPI freshness rerun after module-order stabilization PASS, not double-counted. Generated sources never manually edited.
- Scoped Nest read-only collector4 new feature files, no heuristic candidates; main-agent review traced controller/DTO/authority/transaction/SQL/projection/audit and shared reuse changes. Staged diff check includes new files and PASS. EXPLAIN selected source-version bitmap index on synthetic mapping history; execution0.141ms; no production performance or independent security audit claim. Graphify update remains blocked by pre-existing uv trampoline canonicalization failure; no graph refresh claimed.

Owned changes: new assessments/guidance module and migration/schema; G01 authority/service/module reuse; shared directory visibility/service seam; app/errors; new integration/upgrade tests and existing CI step; official generated client; scoped plan/evidence. No persistent DB, provider/PSP, frontend, real content, role policy/seed, packages, push/deploy touched. Task-owned disposable PostgreSQL retained for continuing authorized work. All future paid offering release gates must include this new guidance route alongside every legacy/new result/history/Mezaj route; no paywall is active while offerings remain DRAFT-only. Next candidate is typed shared BillingTarget financial effects/digital entitlement, under its own claim and policy contract.

## F12-PJ-P01 — explicit shared billing target effects

Accepted:2026-10-17. PJ-P01/F12-PJ-P01; baseline front@50b3d57 clean; Codex /root single coordinator/owner/reviewer. Dependencies accepted ADR-0017 wallet/order/appointment payment infrastructure; frozen additive internal billing-target-effects-v1. DONE/review PASS/claim RELEASED. No digital payment activation/completion inferred.

Bare reserve()/settle() strings were automatically treated as appointment-hold/appointment IDs. Replaced with explicit discriminated NONE/APPOINTMENT_HOLD and NONE/APPOINTMENT effects. Billing projects only purpose-compatible valid UUID fields, rejects unknown/missing/malformed/cross-domain effects with existing BILLING_STATE_CONFLICT, and explicitly selects prepared intent columns rather than spreading adapter output. Appointment/order adapters return named effects; free/wallet/server-verified-gateway settlement paths updated. Domain inventory/order/appointment/journal/refund/compensation rules unchanged. This prevents a future digital target ID from entering appointment relations; does not add a second payment engine or provider.

Verification PASS:
-9 focused effect cases cover valid projections, ORDER/TOPUP/future nonappointment NONE, rejected cross-domain effects, malformed/unknown outputs and mandatory appointment fulfillment IDs.
-15 real PostgreSQL wallet/billing cases in isolated task-owned localhost55419/wallet_test with synthetic PSP. Existing13 cover100 concurrent debits without overspend, balanced immutable journals, admin/HTTP scope/idempotency, actual order checkout/inventory/receipt/refund/reporting, duplicate Verify credit protection, pending bank-vs-wallet exclusion, full paid appointment/slot/cancellation refunds, late compensation/replay, bank appointment/manual evidenced refund, admin actor binding, callback-before-response race and frozen wallets. Two new regressions verify successful free appointment without artificial debit and injected cross-domain settlement AFTER real receipt/inventory/debit writes: transaction fully rolls back, then identical command safely retries with one debit/receipt and no appointment relation.
-28 provider contract/Sadad adapter/disabled-live-runtime/credential retention/OpenAPI cases across5 files PASS; no external provider calls.52 distinct API tests total, client5/freshness and all API/test TypeScript PASS. Existing250-path OpenAPI/client untouched; no wire/type consumer change. No workspace build/browser/full repository tests.
- Main-agent reviewed all four production files and modified/new tests, traced zero-price, wallet, successful gateway and late compensation effects; staged whitespace check includes new files. Scoped Nest collector10 existing billing files, one unchanged controller HTTP-exception heuristic at normal Nest boundary; no new finding, not independent security audit. Graphify update still blocked by existing uv launcher failure.

Files: billing-target.registry.ts, billing.service.ts, appointment-billing.target.ts, order-billing.target.ts, billing-target-effects.spec.ts, wallet-billing.integration.spec.ts and scoped plan/contract/evidence. No Prisma/schema/migration/generated-client/frontend/provider configuration/real secrets/persistent DB/push/deploy changes. Existing47 migrations/development fixtures loaded only into new disposable wallet_test in task-owned container. Test startup first rejected a mistyped synthetic base64 key and exited before any test; canonical32-byte synthetic key generation fixed setup, all checks then passed without weakening key validation.

Owner clarified while work continued: configurable dashboard/admin prices for both assessments; successful assessment purchase has no ordinary refund/cancellation; pay before start and store result in account with approved recommendations. Independent Store/appointment refunds unchanged, duplicate/late-receipt compensation remains financial integrity. Next prerequisite is exact questionnaire/scoring/consent physician review; then new paid offering publication/purchase/entitlement and all result-route enforcement, under separate claim. Actual questions/weights/taxonomy, joint algorithm, reviewed sources, legal consent and retention are not invented.

## F12-PJ-O02 — exact questionnaire/scoring/consent physician review

Accepted:2026-10-17. PJ-O02/F12-PJ-O02; baseline front@76cd380 clean; Codex /root single coordinator/owner/reviewer, continuous backend authorization and approved qualified physician boundary. Frozen assessment-protocol-review-v1/ADR-0022. DONE/review PASS/claim RELEASED; full patient journey and paid release not inferred.

One new retained AssessmentProtocolReview model/migration48 appends exact APPROVED/WITHDRAWN decisions per immutable questionnaire, supported existing WEIGHTED_SUM/v1 identity, canonical source hash and explicitly owner-managed ASSESSMENT_PROCESSING consent/hash. Reuse G01 authority/session/clinic/SQL qualification. Source canonical hashing extracted unchanged from existing authoring; no scoring engine/editor/taxonomy duplicated. Seven admin/physician operations over six additive paths expose bounded queue/preview/history and explicit hash/revision/idempotency-bound review/withdrawal. Ordinary ADMIN has scoped read/preparation only. No patient record/answer access, actual policy/clinical content or real permission grant seeded.

Latest retained decision plus current exact published source/active consent/current qualified reviewer controls internal usableApproval(tx); no fallback after withdrawal and no inheritance across policy/source change. Historical event replay does not imply current usability. Withdrawal remains possible after source/policy retirement. Source row shared lock plus protocol namespace serialize authoring retirement and review; consecutive sequence and monotonic evidence tolerate backwards clocks. SQL rejects mutation/deletion/forged reviewer/session/mismatched source and invalid withdrawal predecessors; transactional metadata-only audit and withdrawal-text operational redaction.

Verification PASS:
-19 new real PostgreSQL HTTP/constraint cases: actual admin authoring hash to physician review; missing legal policy explicit readiness; exact hash/attestations/strict inputs; eight-way duplicate command and stale distinct review races; complete role/membership/profile/clinical-sign/session matrix; admin read/no approve; cross-clinic/draft/wrong purpose/locale; legacy source mismatch refusal; consent rotation; append-only withdrawal/reapproval/no old fallback; retired-source withdrawal; current reviewer loss; bounded history/queue and private identifier exclusion; SQL retained sequence/session/withdrawal evidence; monotonic time; five atomic-audit failure paths and safe errors.
-200 tests17 scoped API files plus8 OpenAPI freshness=208 distinct API tests PASS. Repeated run initially exposed a synthetic wrong-purpose active-policy fixture collision; changed to per-run synthetic purpose, no production guard weakened. Audit metadata assertion narrowed to the protocol subject to avoid including legitimate existing authoring events. Existing authoring publish201 respected. API/test TypeScript, client5/freshness/build and App/Dashboard/Web types PASS. Official OpenAPI256 paths; all250 previous path definitions byte-for-byte equivalent after JSON parsing, no manual generated edits.
-Prisma generate/validate, fresh48 replay in empty task-owned patient_journey_protocol_fresh, populated47-to48 assessment-protocol-upgrade.mjs proof and schema diff no difference PASS. Proof preserves every existing table/row, including old identity/medical/results/Mezaj/financial/order/wallet/couple/educational content and mapping history. New ledger empty before append; valid physician approve/withdraw preserved, forged admin and update/delete rejected. No applied migration rewritten.
-Scoped Nest read-only collector4 files with no heuristic candidates; main-agent traced controller/DTO/hash/transaction/locks/SQL/authority/audit/projection and additive shared changes. EXPLAIN latest-review uses backward source-number unique index, synthetic execution0.111ms; no production performance claim. CI dedicated journey step now uses mapped55419 to match existing isolation guards and includes new suite; hosted CI itself was not run. Staged whitespace/main review PASS.
-Graphify update now succeeds locally:8554 nodes/23245 edges/388 communities, AST-only. Earlier uv failure no longer applies in this run. Existing missing SQL/HCL parser dependencies and pre-existing chat extraction warning reported; no packages installed or semantic labeling performed. Generated graph directory is ignored/untracked by repository policy, no forced staging.

Owned files: new protocol module/helper, schema/migration48, admin hash import, consent CLI purpose opt-in/tests, API wiring/errors/redaction/security assertion, new integration/upgrade tests/CI, official generated contracts/client and scoped plan/ADR/evidence. No persistent DB, external provider, frontend implementation, actual professional/legal approval, push/deploy. Task-owned disposable PostgreSQL retained for continued serialized backend work. Next candidate: immutable configurable commercial publication bound to exact draft/protocol/consent under a separately frozen contract, followed by shared purchase/entitlement and all result-route protection. New digital publication must enforce PRE_START/min18/no ordinary refunds while preserving independent Store/consultation behavior.

## F12-PJ-O03 — configurable assessment commercial publication

Accepted:2026-10-17. PJ-O03/F12-PJ-O03; baseline front@4ae6818 clean; single Codex /root owner/coordinator/reviewer. Continuous backend authorization and explicit owner configurable-price/PRE_START/no ordinary refund/cancellation/min18/nonexpiring invitation decisions. Frozen assessment-commercial-publication-v1/ADR-0023. DONE/review PASS/claim RELEASED. Configuration completion does not imply purchase/entitlement/whole-product acceptance.

One retained AssessmentOfferingPublication/migration49 references exact immutable O01 draft, O02 physician protocol, exact owner-released purchase terms and fixed versioned commercial policy. Additive same-clinic unique reference index on drafts; old draft state/API/readiness unchanged. New positive integer IRR prices for individual/couples are configured through existing create-draft API then exact-hash commercial publication. Atomic replacement retires prior tariff with actor/session/time/REPLACED evidence; immutable previous amount remains. Final administrative WITHDRAWN retirement has no purchase-cancellation/refund effect. No reactivation/delete/content rewrite; command replay describes historical event, never republishes it. Current commercial prerequisite rejects retired sources, stale protocol/policy/hash or reviewer qualification, with no old fallback. A couples tariff is configuration only; future checkout must require separately approved mutual processing/joint-result rules.

Five administrator operations over four additive paths: exact preview, publish, bounded history, detail/readiness, final retire. ASSESSMENTS_MANAGE plus live database ADMIN, owned live session and explicit active-clinic membership. G01 authority and O02 exact protocol reused. Ordinary ADMIN still cannot medically approve. Existing consent release CLI adds explicit ASSESSMENT_PURCHASE_TERMS purpose; actual terms/retention/visibility legal text must be owner supplied with correct hash/environment/release evidence, never invented/seeded. Publication requires explicit reviewedTermsAndRetention and fixed no ordinary refund/patient cancellation, age18/PRE_START and no automatic invitation/entitlement expiry. Retention references are owner attestations, not automated legal correctness or unlimited medical-data retention permission.

Verification PASS:
-18 new real PostgreSQL cases exercise real admin authoring→physician protocol approval→configurable draft→exact commercial publication; both kinds without payment/answer/link side effects; retained price replacement; canonical eight-way duplicate retry and distinct stale revision races; replacement vs withdrawal; immutable idempotent history; full live role/member/session matrix; strict DTO/query/hash/attestation; historical incomplete drafts preserved but new publication rejected; wrong clinic/purpose/locale concealment; terms hash/rotation; clinician withdrawal/re-review/no inherited release; draft retirement/reviewer loss; bounded projections; SQL immutable evidence/sequence/forged actor/session/fixed policy and deferred atomic-successor guard; monotonic retirement/republication and six audit failures with rollback of initial/replacement/withdrawal and safe read errors.
-227 distinct scoped API tests19 files accepted. Initial combined run226 passed and one direct-SQL test assumed client Date.now was not earlier than stored database createdAt; observed host/database clock skew reached monotonic-shape guard before intended deferred-successor guard. Corrected only fixture to derive time from retained database evidence; affected18 rerun PASS. Production code already uses GREATEST(database clock,latest retained time). First absent-route assertion corrected401→404 without adding route/weakening authentication. API/test TypeScript, consent CLI6, OpenAPI freshness8, client5/freshness/build and App/Dashboard/Web types PASS. Official API260 paths, all256 prior path definitions unchanged, generated sources never manually edited.
-Prisma generate/validate, fresh49 replay in independent empty patient_journey_commercial_fresh, populated48-to49 assessment-publication-upgrade.mjs proof and schema diff no difference PASS. Proof retains every existing table/row including old results/Mezaj/financial/order/wallet/couple/guidance/mapping/protocol approval-withdrawal history, starts commercial ledger empty, rejects forged doctor-as-admin, preserves exact old tariff and proves atomic replacement/final withdrawal. No applied migration rewritten; no persistent DB migration.
-Scoped read-only Nest collector4 source files with no heuristic candidates, main-agent controller/DTO/authority/hash/locks/current-source/SQL/projection/audit/compatibility review PASS. Latest-publication EXPLAIN uses backward key-number unique index, synthetic execution0.076ms; no production performance/security-audit claim. CI dedicated journey step includes suite; hosted CI not run. Staged whitespace check includes new files. Graphify AST refresh8647 nodes/23533 edges/379 communities; existing absent SQL/HCL parsers and existing chat extraction warning unchanged, no installs/semantic labeling.

Files: new publication module/schema/migration49; consent CLI opt-in/test; API wiring/error allowlist; new integration/upgrade tests and CI step; official generated API/client; scoped plan/contract/ADR/evidence. No patient catalog/checkout/access grant, actual legal/clinical content/grants, frontend, live Sadad/SMS, persistent DB, push/deploy changes. Disposable task-owned PostgreSQL retained for continuing work. Next candidate is shared assessment purchase/access grants and all legacy/new result/questionnaire/history/Mezaj/guidance access enforcement under its own financial contract, preserving grandfathered legacy free attempts and independent Store/consultation financial policies.

## F12-PJ-P02 — paid individual assessment purchase, consent and owned engine access

Accepted:2026-10-17. PJ-P02/F12-PJ-P02; baseline front@ea263af clean; Codex /root single coordinator/owner/reviewer. Continuous backend authorization and confirmed configurable administrative tariffs, PRE_START, age18, no ordinary assessment cancellation/refund, qualified physician approval. Frozen assessment-purchase-access-v1, privacy-retirement addendum and ADR-0024. DONE/review PASS/claim RELEASED. No whole-product or live-provider acceptance inferred.

Two retained models AssessmentPurchase/AssessmentAccessGrant; nullable immutable BillingIntent purchase and submission grant references; additive migrations50/51. Exact original publication/hash/positive integer IRR tariff/processing and terms acceptance snapshots, no answer/score in purchase metadata. Existing BillingTarget registry issues one INDIVIDUAL beneficiary grant atomically with real wallet debit or server-verified exact bank receipt. Deferred final SQL proof follows existing dispatcher order and rejects unpaid/manual PAID flips, wrong-kind journal, cross-patient/source/method/snapshot proofs, free payment, multiple/missing grants and ordinary assessment BillingRefund. Old Store/appointment/top-up lifecycles preserved. Price replacement retains unexpired original quote; clinical/commercial/consent withdrawal blocks new fulfillment. Failed/ambiguous/abandoned payment grants nothing; captured-unfulfillable/late payment follows existing exactly-once wallet compensation, separately from ordinary product refunds. No PSP implementation or real acceptance claim.

Purpose-specific explicit PatientConsentRecord acceptance and final processing withdrawal reuse existing identity/session/policy evidence. New acceptance never revives old grants; linking/intake consent does not imply assessment consent. Original terms/receipt evidence retained. Actual legal/clinical source and retention text remain owner-supplied release data. Existing engine handles grant-bound start/autosave/resume/completion/scoring/result/provenance; one retained attempt per grant. All legacy null/free contexts grandfathered with no backfill/rebind; commercial sources cannot obtain future free starts/listing even after retirement. Shared predicate/SQL gates cover get/questionnaire/provenance/result/history/Mezaj/guidance/Home/booking completion. New paid answers excluded from ordinary legacy admin raw reads; authorized care context is separate. Current physician review loss pauses processing while consent-valid completed own historical result remains stored/readable; G02 separately controls approved guidance. Review-dependent sources and couples checkout are explicitly unsupported until their workflows exist.

Eight self-patient paths support catalog/detail, exact independent consent/withdrawal, existing billing intent create, own purchase history/detail and grant start/resume. Strict inputs reject amount/patient/clinic/status overrides; current live patient role/session/clinic and existing self permissions, no-store and atomic metadata-only audit. Home derives bounded purchase summaries and unused-grant next action without a new journey table; missing processing approval prevents misleading resume actions. Onboarding consent-decision query now restricts medical-intake purpose. IdentityModule reused for existing financial rate guard, no duplicate limiter/provider.

Review corrections verified before acceptance:
- Real409 reproduction: privacy withdrawal left an unfinished active attempt blocking new explicit reconsent/purchase. Applied migration50 was retained unchanged; forward51 permits only exact metadata IN_PROGRESS-to-INVALIDATED with actual bound withdrawal, revision increment and original answers/source/grant retained. Atomic withdrawal invalidates such unfinished contexts; completed records unchanged. Paid attempt deletion rejected so grant consumption cannot reset. Subsequent explicit acceptance/purchase creates a distinct grant/attempt. Withdrawal/autosave share consent-before-attempt ordering; audit failure rolls back both consent and invalidation.
- Deterministic PostgreSQL lock test reproduced legacy paid resume holding commercial boundary while waiting for protocol, opposing publication protocol-before-commercial order. Legacy start now takes the existing protocol namespace before commercial boundary. Pre-fix test failed false/true, corrected test and complete affected four suites67 cases PASS; no schema/clinical behavior change.
- Expiry test initially used fixed2.1sec delay, but observed VM database clock correction meant the quote was still genuinely unexpired at settlement. Fixture now observes expires_at<=database CURRENT_TIMESTAMP with bounded short waits before calling expiry/Verify; runtime expiry guard was unchanged. Synthetic MEZAJ fixtures use isolated imported locales without weakening existing one-published-family/authoring locale rules.

Verification PASS (no full repository audit/build/browser/install):
-23 real PostgreSQL purchase HTTP/constraint/race cases, synthetic source/qualified reviewer/legal fixture and simulated PSP only. Actual wallet-to-owned stored result and approved recommendations, eight-way start/intent/consent/wallet/Verify retries, exact bank proof/callback-hint mismatch, timeout/wrong amount/definitive failure, clinical withdrawal/expired quote compensation, immutable quoted price, min18/missing DOB, unsupported review/couples no-charge, strict DTO/live roles/session/clinic/foreign reads, processing withdrawal across every clinical surface, no ordinary refund/cancel, retained grant/attempt/SQL wrong journal/no free insertion/rebind/deletion, legacy continuation, current professional loss, audit rollback and new consent isolation.
-Combined22 scoped files267 tests initially PASS; subsequent new lock-order test and affected four suites67 PASS yield268 distinct tests in those22 files. Separate wallet/Sadad adapter/credential suites22 cases, provider-contract9 and self-profile/live-runtime7 PASS:306 distinct focused API cases28 files. Repeated subsets are not counted twice. Existing PostgreSQL wallet cases exercise actual Store order/inventory/receipt/refund and full prepaid/free appointment/slot/refund flows. No real external transport called. Existing pg8 concurrent-query deprecation warning observed; no pg9 upgrade or repository-wide concurrency refactor made.
-API/test tsc --noEmit -p tsconfig.test.json, Prisma generate/validate, schema diff --from-config-datasource --to-schema ... --exit-code (no difference), official API OpenAPI export, client generate/test5/freshness/build and App/Dashboard/Web typechecks PASS.268 API paths; all260 prior paths retained,259 path definitions identical after parsing; sole existing-path change adds ASSESSMENT to administrative billing purpose query. Home/optional billing-reference additions documented; generated sources never manually edited.
-Fresh51 replay in empty task-owned patient_journey_purchase_fresh and populated assessment-purchase-upgrade.mjs proof through49/50/51 PASS. Every pre50 row preserved exactly apart from new nullable references, initially empty new ledgers, valid retained paid context, false PAID flip and ordinary refund/immutability checks. Full populated50-to51 comparison preserves every existing row, metadata-only privacy transition accepted while disguised answer mutation/deletion rejected. Main patient_journey_test and separate wallet_test migrated only inside task-owned mushroom-pj-j01 localhost55419. Persistent database never touched; applied migrations not rewritten.
-Scoped Nest read-only collector five purchase files: no heuristic candidates; compiler/tests run separately. Main-agent reviewed combined controller/DTO/module/authority/SQL/hash/payment/locks/privacy/read projections/legacy compatibility and staged whitespace gate. EXPLAIN purchase history uses backward assessment_purchases_patient_created_idx (synthetic0.123ms); grant predicate uses assessment_grants_patient_source_idx (cold synthetic29.640ms), no production load claim. CI dedicated journey step adds suite and canonical synthetic AES key; hosted CI not run.
-Installed NestJS best-practices/Prisma plugin client/CLI guidance reused. Graphify AST refresh8785 nodes/24072 edges/396 communities PASS; ignored outputs retained. Existing missing SQL/HCL parser and unrelated chat extraction warnings unchanged. Stored Python path lacked graphify, so installed graphify command was used successfully without install. Temporary automatic approval-review quota failure prevented one check from executing; after explicit user continuation/reset the same normal reviewed escalation succeeded, no bypass.

Files: two new assessment modules, purchase/grant schema/new migrations50/51, narrow existing assessment/read/Home/onboarding/billing/publication/protocol seams, app/error wiring, integration/upgrade/effect/unit fixture tests and CI, official API/client and scoped plan/contracts/ADR/evidence. Unrelated .gitignore Archive addition appeared during continuation and was preserved/excluded. No frontend, new engine/provider, real clinical/legal text or permission grants, persistent migration, push/deploy. Next candidate is exact qualified physician-approved versioned joint-result protocol, then independently consented paid two-participant processing using existing engine and shared billing; authorized consultation context also remains separate.

## F12-PJ-C02 — qualified versioned joint educational result protocol

Accepted:2026-10-17. PJ-C02/F12-PJ-C02; baseline front@a1de43e with unrelated .gitignore Archive addition preserved/excluded. Codex /root single owner/coordinator/reviewer; continuous backend authorization and approved qualified physician boundary. Frozen couple-result-protocol-v1/readiness projection addendum and ADR-0025. DONE/review PASS/claim RELEASED. This is configuration acceptance, not paid couple participation or actual medical/legal release.

One retained CoupleResultProtocolVersion/migration52 binds exact existing individual questionnaire/hash/current O02 protocol, owner-controlled same-locale COUPLES_RESULT_SHARING consent/hash, ordered hash-pinned approved G01 education and immutable versioned APPROVED_PAIR_LOOKUP/v1 metadata. The operation selects professional-authored education for unordered band pairs; no scoring engine, temperament taxonomy, compatibility percentage, diagnosis or diet is invented. Source1..32 supported non-review-dependent bands, max528 unique unordered pairs,1..5 content IDs per pair/max50 distinct references, retained JSON128KiB. Source-order normalization rejects reversed duplicates/unknown bands and canonicalizes idempotent commands. Partial drafts allowed, approval requires all n(n+1)/2 pairs; no inferred default. Physician reviews exact hash and educational/no-therapy/joint-disclosure attestations. Actual pair associations, reviewed educational content and legal wording remain unseeded owner/professional data.

Eight additive admin/physician operations/paths: append immutable draft, bounded list, exact detail/readiness, administrative draft-only retirement, qualified clinical approve/revoke and clinical reads. Existing live role/session/active-clinic membership, clinical-sign/profile qualification, protocol/current policy/content approval and atomic metadata audit reused. Draft→approved→finally revoked or draft→revoked; no edit/delete/reactivation. Latest ever-approved selection never falls back past revocation/unavailable dependencies; newer unapproved draft does not replace approved version. Exact pins remain explicit for future receipts. Internal usable(...,lock=true) stabilizes source/protocol/configuration/disclosure/content/current physician authority; does not grant consent/payment/patient-record access. List projection explicitly requires detail readiness to avoid per-row dependency queries. No participant answers/patient endpoint/checkout changes.

Verification PASS:
-15 new real PostgreSQL cases exercise actual authoring→O02 qualified protocol→G01 approved education→new draft→joint qualified approval→exact readiness/revocation, database usability, symmetric explicit lookup/no missing default, partial coverage and review-dependent refusal, reversed duplicate/unknown band/reference checks, eight-way canonical command retry and six retained-version races, strict DTO/hash/attestation/no price/patient override, complete admin/doctor/patient/live role/member/session/profile/clinical-sign matrix, new draft vs latest approved/final withdrawal/no older fallback, concurrent approval/revocation, deterministic readiness-lock vs final revocation, policy rotation/content withdrawal/source retirement/protocol withdrawal/reviewer loss, SQL immutable definition/deletion/exhaustive approval/forged actor/session/final state, bounded metadata with no clinical/purchase/link side effects, and atomic audit rollback for create/approve/revoke/read/list. Initial cross-clinic test attempted a second active clinic, correctly rejected by existing clinics_one_active_idx; fixture uses inactive foreign membership and expects403 plus random owned-clinic UUID404. No repository rule weakened.
-Seven focused suites120 cases initially PASS; final15-case new suite (one additional readiness lock case) PASS yields121 distinct cases across those seven suites. Official OpenAPI freshness8 PASS:129 distinct focused API tests8 files. Includes all23 P02 purchase,19 O02 protocol,18 O03 commercial,18 G01 content,21 C01 linking and7 consent CLI cases. New CLI case requires explicit disclosure purpose and correct document/environment/hash without publishing actual text. Client5/freshness/build, API/test tsc and App/Dashboard/Web types PASS. No full repository audit/build/browser/install or live PSP/SMS.
-Prisma generate/validate and schema diff no difference PASS. Fresh52 replay in independent empty patient_journey_couple_protocol_fresh PASS. Upgrade script requires exact localhost55419/patient_journey_couple_protocol_upgrade, an independent container-local clone of accepted populated P02 proof; verifies migration51 guard/retained paid purchase/grant before applying52 transactionally. Every row across all120 pre-existing tables identical afterward; new joint ledger empty/unavailable. Reuses previous populated proof without modifying its script or source DB. No applied migration rewritten or persistent DB touched.
-Official276-path API/client generated from Nest exporter; all268 prior path definitions unchanged after JSON parsing, no removed path/manual generated edits. Scoped read-only Nest collector five new files no heuristic candidates; compiler/tests executed separately. Main-agent reviewed DTO/controllers/DI/shared authority/source/provenance/coverage/policy/content/current qualification/lifecycle/locks/SQL/metadata-audit/retention/compatibility and staged whitespace gate. EXPLAIN latest-approved uses source-number unique index via bitmap scan (synthetic0.125ms); no production performance/security-audit claim. Existing pg8 concurrent-query deprecation warning remains unrelated to changing dependency versions.
-NestJS best-practices and installed Prisma plugin client/CLI guidance reused. Graphify scoped query and final AST update PASS (8886 nodes/24424 edges), existing absent SQL/HCL parsers and unrelated chat extraction warning unchanged. CI dedicated patient-journey step includes new suite; hosted CI not run.

Files: new result-protocol module/definition/DTO/controllers/service, Prisma schema/inverse references/new migration52, consent release CLI opt-in/test, app/error wiring, real DB/upgrade tests and CI, official generated API/client, scoped plan/contracts/ADR/evidence. No actual medical/legal content or permission grants seeded, patient answers/shared results/paid couples activation/frontend/live provider/persistent migration/push/deploy. Next candidate: exact pair-specific independently accepted participation/processing/disclosure context using C01 identity/link and C02/O03 definitions; then separate two-beneficiary shared billing/existing-engine integration. Full patient journey remains incomplete.

## F12-PJ-C03 — exact independently consented couple assessment participation

Accepted:2026-10-17. PJ-C03/F12-PJ-C03; baseline front@b86a501, unrelated .gitignore Archive addition preserved/excluded. Codex /root single coordinator/owner/reviewer under continuous backend authorization. Frozen couple-assessment-participation-v1/ADR-0026. DONE/review PASS/claim RELEASED. Consent-context acceptance does not imply paid assessment or joint-result acceptance.

Two retained models/migration53: immutable CoupleAssessmentSession pins C01's exact independent LINKED identities/slots, O03 COUPLES tariff/hash, C02 exact joint protocol/hash, questionnaire and processing/disclosure policy hashes in bounded canonical context; two exact CoupleAssessmentParticipant identities refer to the existing C01 slots. Context creation leaves both unconsented. Each current independent patient explicitly binds its own existing P02 PatientConsentRecord for exact processing policy/hash plus this context's joint disclosure/linked-partner acknowledgement. Owned session/time/hash/idempotency evidence retained; no proxy, global partner-sharing permission or duplicate consent engine. SQL preserves identity/definition/acceptance, validates purpose/policy/medical owner/session and exact two participants at deferred commit; no orphan/third participant/deletion/rebind.

Final own sharing withdrawal works before acceptance and after source/policy/link retirement, without withdrawing independent medical consent, deleting private answers, or implying ordinary refund/cancellation. Bound global medical withdrawal, C01 withdrawal and current identity/adult/source/physician/policy/content loss stop derived mutual readiness. New medical acceptance never rebinds an old context. A new explicit context is allowed after final context withdrawal; one unresolved context per link/exact publication is serialized. No automatic expiry. C01 assessmentReady:false and P02 unsupported couples checkout remain unchanged; no charge/grant/answer/joint-result side effect.

Five self operations/four new paths: create exact context, bounded minimized list, exact policy/detail/readiness, independent consent and final privacy withdrawal. Strict existing self/age permissions, current patient role/session/user/clinic, both adults from existing current intake and same-clinic independent link. Reuse C01 limiter via narrow module guard export and existing IdentityModule dependency. No-store plus atomic metadata-only audit. All projections exclude partner patient/user IDs/name/phone/DOB, medical consent/session IDs and joint mapping/raw responses. Only own consent reference and minimum participant slot/consent coordination state exposed; list reports DETAIL_READINESS_REQUIRED/mutualConsentComplete:false and detail performs exact current checks. Database reads for normal list/commands exclude joint pair definition/policy bodies and unrelated medical acceptance/session metadata; policy text fetched only for explicit detail. No journey state table.

Verification PASS:
-16 real PostgreSQL cases exercise actual C01 invitation acceptance, qualified O02/C02/G01/O03 configuration and two separately authenticated P02 processing/context acceptances; SQL/internal exact mutual readiness and no payment/grant/answer side effects; all private projections/audit-safe errors; third-party/admin/doctor/proxy/foreign medical record denial; strict amounts/identity/false attestations/hash/key/page limits; eight-way same create/accept retry, distinct two-person setup race leaves exactly one context/two participants, independent actor keys and cross-context original key conflicts; context withdrawal before acceptance/after configuration retirement, final replay/no revival/new explicit context; global medical withdrawal/no old rebind; clinical/link/current role/disabled identity/revoked session/minor/missing current DOB checks; SQL immutable definition/identity/acceptance/retention/orphan/third/proxy/final revocation; simultaneous sharing acceptance/withdrawal, global medical withdrawal/acceptance, locked mutual readiness vs final withdrawal; audit create/accept/withdraw/read/list rollback. No actual clinical/legal text or professional grants seeded outside disposable fixtures.
-Six scoped suites initially105 passed/one lock-observation test failed (106 total). It polled pg_stat_activity within one transaction, whose cached activity snapshot missed the new waiting backend. Test now observes live pg_locks/pg_blocking_pids tied to the holding backend and explicitly asserts pending withdrawal has not finished; targeted test then PASS, full C03 suite15+OpenAPI8 PASS. Added distinct setup race1 PASS afterward. Final accepted115 distinct API tests7 files =16 C03 +15 C02 +23 P02 +21 C01 +13 Journey +19 O02 +8 OpenAPI, without double-counting repeated subsets. Runtime locking was unchanged by that test correction.
-Prisma generate/validate/schema diff no difference, API/test TypeScript, official Nest OpenAPI export, client generate/test5/freshness/build and App/Dashboard/Web typechecks PASS.280 API paths, all276 previous path definitions unchanged after JSON parsing; generated files never manually edited. CI dedicated journey step adds suite; hosted CI not run. No whole workspace build/browser/install/full audit/live provider.
-Fresh53 replay in independent empty patient_journey_participation_fresh PASS. Upgrade script strictly targets localhost55419/patient_journey_participation_upgrade, container-local clone of accepted populated52 proof; appends synthetic still-approved joint protocol/disclosure and fresh owned synthetic sessions in that clone, snapshots every row, applies53 transactionally and proves all121 pre-existing tables unchanged, prior joint usability preserved and new participation ledgers empty/unconsented. Source clone and persistent database untouched; no applied migration rewritten. Initial missing inverse Prisma clinic relation caught by validate and corrected before migration generation/application.
-Main-agent reviewed all four new source files, schema/SQL/controller/DTO/privacy/hash/independent consent/current qualification/lock ordering/module reuse/audit/legacy compatibility and combined diff; staged whitespace gate includes new files. Scoped read-only Nest collector four files no heuristic candidates; types/tests separate. EXPLAIN own bounded history uses indexed context id/clinic lookup with a small synthetic participant scan (126 rows; planner selected scan at that size),0.244ms synthetic, no production load/security-audit claim. Installed NestJS best-practices/Prisma plugin guidance reused; Graphify AST refresh PASS, existing SQL/HCL parser omissions/chat warning unchanged. Existing pg8 concurrent-query deprecation warning remains, no dependency upgrade.

Files: participation module/DTO/controller/service, two models/inverse references/new migration53, narrow C01 guard export, app/error wiring, real DB/upgrade/CI tests, official API/client and scoped plan/contracts/ADR/evidence. No frontend/new engine/provider/actual clinical or legal content/real permission grant/persistent migration/push/deploy. Next eligible candidate is explicit shared ASSESSMENT two-beneficiary payment/access extension plus existing individual attempts and mutually authorized retained joint education, under its own frozen financial/clinical contract; broader care-authorized consultation context remains separate. Full backend journey not declared complete.

## F12-PJ-C04 — one paid coupled service, two private engine grants and mutually authorized joint education

Accepted:2026-10-17. PJ-C04/F12-PJ-C04; baseline front@d1edf53, unrelated .gitignore Archive addition preserved/excluded. Codex /root sole owner/coordinator/reviewer, no subagents. Frozen couple-assessment-paid-access-v1 and additive couple-assessment-offering-discovery-v1/ADR-0027. DONE/review PASS/claim RELEASED. One inseparable financial/access/delivery operation; no full-backend or production acceptance inferred.

Existing ASSESSMENT BillingTarget/registry now explicitly dispatches individual schemaVersion1 or coupled schemaVersion2 snapshots. One exact payer wallet debit or server-verified bank attempt atomically supplies exactly two independently owned grants matching C03 participants/processing consent. Existing intent/quote/immutable tariff/provider/callback/reconciliation/wallet compensation reused; no provider or engine rebuilt. Context and both patient/questionnaire locks prevent overlapping individual/coupled purchases. Deferred SQL demands exactly two correct beneficiaries and the same actual financial proof; no half/extra/free/manual-PAID/rebind bypass. Ordinary successful assessment refunds/cancellation remain prohibited; captured-unfulfillable/expired funds are compensated through the existing traceable wallet path exactly once. Commercial replacement honors an unexpired original quote; paid delivery ignores later commercial retirement/terms rotation while retaining current clinical and independent consent gates.

Each beneficiary uses the existing owned engine start/autosave/resume/revision/completion/result/history/Mezaj/guidance/eligibility surfaces. Shared readable/processable proof now supports explicit nonpayer beneficiaries; new processing stabilizes current intake/adult eligibility, historical own result remains separately medical-consent governed. Payer receipts and Home receipt queries expose only payer-owned grant/attempt IDs. Partner-specific sharing withdrawal blocks joint content and completion coordination while preserving independently authorized own individual results. Global own medical withdrawal hides that source and stops processing without withdrawing the other participant's private benefit.

One retained CoupleAssessmentJointResult binds exact two COMPLETE immutable source attempts/completion hashes, original C02 protocol/hash and minimized approved educational snapshot. Existing G02 technical provenance validation is shared, not duplicated scoring. Application and final SQL proof project only completion/provenance/band metadata, excluding raw responses and score. Original physician-approved APPROVED_PAIR_LOOKUP/v1 selects approved G01 references/consultation recommendation; no classification or compatibility formula invented. Unique context/purchase plus lock/idempotency yields one retained result across either actor's concurrent requests. Reads recheck mutual sharing, live identities, current source/qualified approvers/disclosure/content; revoked dependencies never fall back or silently recompute. Joint output/audits contain no private attempt/grant/medical/patient identifiers, individual bands, score or responses. Both patient audit entries carry the real requesting actor and shared education/context references only.

Five self operations/four additive paths: coupled billing intent, minimized paid state, generate/read joint result, plus safe current offering preview. Review found C03 creation needed joint protocol/hash otherwise discoverable only via privileged definitions; the separate frozen additive preview resolves safe exact references from existing patient COUPLES catalog without exposing pair definitions or creating consent/context/payment. P02 individual-only detail/checkout and C01 assessmentReady:false remain unchanged. Home adds bounded own coupled summaries and a dedicated ready-to-generate action; paid owned resume precedes booking requirements, preserving near-appointment/onboarding priority and prior free-attempt ordering. No journey persistence table.

Verification PASS:
-30 new real PostgreSQL HTTP/financial cases: patient catalog→safe approved preview→actual C01 linked identities/C03 independent processing+joint acceptance→either payer→single wallet/synthetic server Verify→two grants→both existing autosave/completion/own results→one joint education/Home; cross-patient/admin/live role/session/strict-input denial and redaction; six/eight-way intent/wallet/Verify/joint retries, concurrent owned starts, pending/unused individual↔coupled collisions; wrong callback/browser hint/timeout/amount mismatch/definitive failure/retry; price replacement/expired quote/retirement/terms rotation; medical/sharing/qualification/protocol loss and concurrent final withdrawal; forbidden refund/paid cancellation; SQL unpaid flip/wrong-credit proof/immutable result/deletion/rebind; second-grant and financial/clinical audit rollback. Current final run30+8 OpenAPI freshness cases PASS. Earlier13 dependent suites215 cases PASS; nine focused domain/provider/credential/OpenAPI suites72 PASS; wallet15 PASS in independent wallet_test. Total332 distinct API cases24 files (not counting retries), client5/freshness/build PASS. API/test and App/Dashboard/Web types PASS. Real PSP/SMS, frontend browser and full repository audit/build not run.
-Prisma generate/validate and current/fresh schema diff no difference PASS. Fresh replay through56 in guarded disposable patient_journey_couple_paid_fresh PASS. Strict clone-only upgrade proof patient_journey_couple_paid_upgrade_final applies53→54→55→56 and compares every row in all123 prior tables, excluding only added null columns; earlier paid/readability state unchanged, new coupled references null and new joint ledger empty. Source accepted C03 proof and persistent database untouched. Existing C03 ledgers were empty in that source proof; no claim of populated C03-participant upgrade evidence. Real populated new coupled financial/clinical paths separately exercised by30 integration cases.
-Migration54 first failed an unaccepted PL/pgSQL CASE expression before its guard was created; disposable test DB had partially applied the DDL prefix. Corrected CASE parentheses and added explicit BEGIN/COMMIT before successful acceptance; completed only the previously unexecuted SQL suffix in that disposable DB, then official Prisma resolve --applied. Fresh full replay subsequently PASS. Runtime individual regression exposed ambiguous local source vs PatientConsentRecord.source; forward55 renamed the local variable and retained a direct individual target regression. Main review then added forward56 to minimize SQL clinical proof projection. Applied54/55 were not rewritten. No production/shared migration or destructive reset occurred.
-Initial audit test selected the wrong resource-type string and strict-body test expected422 instead of actual400; fixtures/assertions corrected to the actual transport/audit contract. A foreign fixture attempted a second active clinic and was correctly rejected by clinics_one_active_idx; changed to inactive foreign clinic without weakening production rules. Multi-request scenarios initially exceeded default5s under concurrent compilation/AST work; explicit bounded15s per scenario (12s for two known longer paths/expiry), final isolated30-case run PASS. One client-generation subprocess failed transiently; full official export/generate/freshness/test/build rerun PASS, no manual generated edits or unsupported cause asserted.
-284 official API paths; all280 previously accepted path definitions remain byte-structure equivalent after JSON parsing, no removal. CI dedicated journey step includes new suite; hosted CI not executed. Scoped read-only Nest collector5 source files flagged only HTTP BadRequestException in a controller, reviewed as transport validation at its proper boundary; no independent security-audit claim. Main-agent review covers DI/source/authority/financial proof/privacy/locks/SQL/frozen compatibility/consumer wiring and staged whitespace, including new files. EXPLAIN context purchase uses assessment_purchases_couple_created_idx (synthetic0.463ms); joint read uses session/clinic unique index (0.108ms), no production-load claim. Installed NestJS/Prisma plugin guidance and Graphify query/update reused; AST9086 nodes/25169 edges. Existing missing SQL/HCL parsers/chat extraction and pg8 concurrent-query deprecation warnings remain; no package installation/upgrade.

Files: paid module/DTO/controllers/billing/delivery, shared provenance helper and narrow existing seams, Prisma model/inverses plus migrations54–56, Home projection/module/DTO/action, errors, real DB/upgrade/CI verification, official generated API/client and scoped governance/evidence. No actual clinical/legal content or permission grants seeded, frontend/provider/persistent DB/push/deploy changes. Next eligible scope: explicitly patient-authorized assessment context for the assigned clinician/appointment using existing clinical permissions/booking/text consultation, under a separate frozen scope and claim. Doctor result review and ready-program clinical/service rules remain separate; full patient backend is not declared complete.

## F12-PJ-D01 — explicit patient permission for an assessment summary in assigned care

Accepted:2026-10-17. PJ-D01/F12-PJ-D01; baseline front@8870377, unrelated .gitignore Archive addition excluded/preserved. Single Codex /root owner/coordinator/reviewer, no subagents. Frozen assessment-assigned-care-context-v1/ADR-0028. DONE/review PASS/claim RELEASED. Technical assigned-care integration only; no full-backend, real medical/legal or frontend/provider acceptance.

One retained AssessmentCareShare pins one independently consenting patient, exact owned completed source/completion hash, original current O02 review/hash, own processing consent, one appointment and its assigned qualified doctor, exact owner-released ASSESSMENT_CARE_SHARING policy/version/hash, context/payload hashes and accepting/withdrawing session/actor/time/command. This scoped permission cannot be inferred from global processing consent, booking, payment or linking. Existing versioned policy/explicit release CLI, processing acceptance, source/provenance/qualification/current clinical capability and audit reused; no new consent engine or journey state. No actual policy body, question, clinical content or real role/capability grant seeded.

Five operations/four additive paths: patient exact optional preview, bounded own history, explicit accept and final own withdrawal; assigned clinician's bounded educational context. New data has default no permission. Current independent PATIENT/session/clinic/appointment/source is required; paid source must retain its original processing record. Legacy source needs explicit current exact processing acceptance. Exact context is revalidated under appointment→protocol/definition→policies/medical locks; immutable scoped evidence, active appointment/source uniqueness and patient command keys stop duplicates/rebinding/revival. Final withdrawal works even after source/policy retirement or visit completion, without refund, answer deletion or changed medical records. Distinct new explicit acceptance after withdrawal creates another retained row.

Clinician must currently be the exact linked active published assigned same-clinic DOCTOR, have a published specialty/clinic membership and existing sign qualification plus explicit current DOCTOR-role CLINICAL_RECORD_VIEW. Ordinary ADMIN/STAFF/unassigned physicians cannot impersonate. Reuse existing consultation operational window, conservatively for both visit modes: startsAt−15m through endsAt+60m for CONFIRMED or +4h for operational states; terminal/PENDING stops this new channel. Consent may be configured in advance for a future confirmed appointment; patient currentlyAvailable reflects permission/source readiness without the physician's opening-time check. Existing chat/lifecycle/historical clinical permissions are unchanged. No default clinical grant is introduced.

SQL and application derive current access from exact scope, current source/review/qualified authorities, live patient, care policy/body hash, original own unwithdrawn processing and current assignment/visit state. Minimized metadata queries exclude raw responses/score. Existing shared technical provenance validator checks persisted source; no scoring rerun, medical interpretation or clinical fact created. Physician receives only authorized own educational band/technical provenance/version/title/time, educationalOnly:true/clinicalFact:false. No private consent/session/actor/grant IDs, partner or joint result is disclosed. A nonpayer coupled beneficiary is a separately owned source; it never authorizes partner/joint disclosure. Clinical review-required/unsupported/incomplete/unpaid sources remain unavailable through this educational channel; this is not the later clinical review/release workflow.

Verification PASS:
-19 new real PostgreSQL cases cover paid existing engine→exact preview→explicit acceptance→assigned physician summary, legacy/in-person opt-in, no mutation on preview, denied foreign/admin/unassigned/live-role/session/view/strict scope/hash/consent access, six-way idempotent acceptance/active duplicate conflict, independent final withdrawal/fresh acceptance/no revival, own medical withdrawal/new consent non-revival, care policy/protocol/qualification changes, future/grace/terminal windows with no encounter/chat creation, retained SQL identity/consent/source/withdrawal constraints, atomic audit rollback/suppressed reads, actual shared coupled payment by the other participant→two private completed attempts→nonpayer's own professional sharing with no partner/joint leakage, read/withdrawal race, terminal/policy-retired withdrawal and paid unfinished-source rejection. Care/helper fixture uses actual authoring/qualified review/shared billing/wallet/engine APIs; existing confirmed appointment is a scoped synthetic DB fixture, not a claim of full patient booking/browser acceptance.
-Ten focused suites124 cases PASS initially (16 care cases plus direct P02/C04/O02/Home/clinical/appointment/chat and consent CLI dependencies). Final18 care+8 OpenAPI freshness26 PASS, nineteenth care case PASS separately; explicit active-grant query filter then four relevant care/read/withdrawal cases PASS. Total135 distinct API tests11 files, excluding retries. One new CLI case keeps explicit purpose/hash/environment gates and publishes nothing. Client5/freshness/build, API/test and App/Dashboard/Web type checks PASS. Existing pg8 concurrent-query warning unchanged; no dependency upgrade/full repo audit/build/browser/live PSP/SMS.
-Prisma generate/validate/current and fresh schema diff no difference PASS. All58 migrations fresh replay in patient_journey_care_fresh PASS. Strict disposable patient_journey_care_upgrade clones accepted populated56 proof and compares all rows in every124 previous tables plus existing paid readability across57→58; preserved exactly, new care ledger/policy absent by default. Source proof and persistent DB untouched. Earlier C04 ledgers in that cloned proof were empty; populated coupled care interoperability is separately demonstrated by the real new nonpayer case. Applied57/58 not rewritten.
-Main review reproduced a concrete SQL CHECK/NULL defect after applied57: direct otherwise-valid self withdrawal without its command key passed UNKNOWN, demonstrated by a rollback-only failing test. Forward58 wraps the shape in COALESCE and explicitly demands the key; exact pre-fix test PASS afterward, existing valid57 rows retained. A test offering key initially violated existing uppercase authoring rules; corrected synthetic key, no production contract relaxed. DTO JSON narrowing corrected by projecting the already-validated provenance band, not casting unverified JSON.
-288 official paths, all284 previous path definitions unchanged after parsed structural comparison; no manual generated edits. Main-agent review covers every new module/DTO/controller/service/model/SQL/purpose-release and shared wiring diff, own/nonpayer/current authority/medical/legal/immutability/clock/locking/audit/minimization/compatibility. Scoped read-only Nest collector4 files no heuristic candidates; not an independent security audit. Clinician list/count explicitly prefilter withdrawn_at IS NULL so old consent history does not require eligibility evaluation. Scoped EXPLAIN on77 synthetic retained rows chose sequential scan/sort at that small size (0.171ms); active uniqueness/ordered appointment history indexes match query predicates, no forced plan or production-load claim. Staged whitespace gate includes new files.
-Installed NestJS/Prisma plugin guidance and Graphify query/AST refresh reused:9180 nodes/25499 edges, subsequent refresh found no topology change. Existing SQL/HCL parser omissions/unrelated chat warning remain. CI dedicated journey step includes care suite; hosted CI not run.

Files: apps/api/src/modules/assessments/care/{module,controller,dto,service}, schema/inverse references and migrations57–58, explicit-purpose CLI/test, app/error wiring, new real DB/upgrade tests, CI, official API/client and scoped plan/contracts/ADR/evidence. No frontend/provider/persistent database/push/deploy. Next candidate is a separately frozen assigned-physician consultation worklist/context and start/end facade reusing existing appointment/encounter/text-chat lifecycle, without blanket appointment-management permission. Later clinical review/publication and ready-program clinical/service rules remain separate; actual medical/legal release and Phase12 provider/backup/secrets gates remain open.


## F12-PJ-D02 — Assigned consultation workflow and atomic existing visit operations

2026-10-17; PJ-D02 DONE/review PASS/claim RELEASED; baseline front@e19e64c; sole Codex /root coordinator/writer/reviewer, no subagents. Continuous owner backend authorization; frozen assigned-consultation-operations-v1 and additive assigned-consultation-worklist-window-v1/ADR-0029. Unrelated .gitignore Archive addition preserved and excluded.

Four additive HTTP operations return only assigned worklist/operational context and reuse existing checked-in/queued→IN_PROGRESS→COMPLETED/Encounter lifecycle. Qualified live linked active published same-clinic DOCTOR, active published specialty, clinic membership/session, existing SIGN qualification and explicit real DOCTOR-role VIEW/EDIT govern each read/mutation transaction; no blanket appointment management or default grants. Current assignment is reauthorized after doctor advisory lock and appointment row lock/re-read. Old admin wrappers and all old API path definitions remain unchanged. Context reports existing D01 readiness and existing ONLINE text pointer only; no automatic encounter/chat/consent on GET and no voice/video implementation. Body/query cannot override patient/doctor/clinic/state/price; strict UTC timestamps, bounded page size/range and safe SQL pagination offsets.

Main review reproduced/fixed three concrete seams: six same-target legacy admin starts originally produced one success/five conflicts; shared lock/re-read now yields six successes with one encounter/history/activity, and mixed assigned/admin completion is also idempotent. An ongoing visit beginning255 minutes ago/ending225 minutes ago remained actionable but was omitted from the initial default start-time filter; additive frozen query contract retains operational visits by end+4h without extending eligibility or explicit filters. Real unpublished-specialty denial exposed that the shared guidance qualification does not itself require a specialty; this facade now locks/checks current published active specialty explicitly, without changing shared guidance/previous clinical contracts. No broader clinical qualification audit is claimed.

14 new actual PostgreSQL/HTTP cases PASS: assigned ONLINE/in-person lifecycle/no GET side effects/minimized data, own patient/admin/other physician denial, live view/edit/sign/profile/link/specialty/membership/real role/session/disabled-patient gates, strict query/body/pagination/time/status, future/expired/pending/unchecked-in/terminal visits, same-target legacy and mixed retries, two simultaneous eligible visits/one doctor, deterministic cancellation while start waits, bulk audit and read/start/complete rollback, and actual approved existing engine→own processing consent→D01 exact care share→assigned context→existing explicit text chat→completion/closed source access and read-only retained message history. Audit batches one bounded insert and fails closed atomically; mutation failure leaves no appointment/encounter/history/activity effect.

Verification:142 distinct focused API cases across12 files PASS (assigned14, existing appointments6, appointment authorization, clinical notes, Chat REST/authorization, D01 care, C04 paid couples, P02 purchases, Home/journey, billing target effects and wallet15), plus official client5/freshness/build, API/test and App/Dashboard/Web types. Initial combined run125/127: new test fixture first used an invalid publication state/date pair, corrected without weakening constraints; the old global dashboard test expected exactly one ongoing visit but retained earlier fixtures correctly made18. That unchanged6-case legacy suite passed against a separately created fresh58-migration seeded disposable patient_journey_d02_legacy; all other affected cases passed in the original fixture DB, and final assigned14 passed after code/fixture corrections. No runtime defect is attributed to that global fixture assumption.

No schema/migration/model added. Existing58 migrations replayed freshly for legacy regression; original journey DB no schema drift/Prisma validation PASS, wallet disposable upgraded55→58 before15 passing cases. Persistent database unchanged. EXPLAIN actual two-row bounded worklist uses appointments_doctor_schedule_idx and patient/user indexes (~0.3ms synthetic local execution, no production-load claim); no new index justified. Official API292 paths, all288 previous path definitions unchanged. Scoped Nest collector reviewed HTTP exception heuristics at normal Nest application boundaries; no whole-repository/security audit claim. Graphify AST refresh9257 nodes/25718 edges; prior missing SQL/HCL parser and existing chat parser warnings unchanged, no installs.

Final sole-agent review checked claim/acceptance/owned changes, current professional and patient boundaries, state idempotency/shared lock ordering and no stale reopen, audit rollback/minimized DTOs, generated compatibility and preserved user work. No unresolved scoped blocker. Changed: new appointments/assigned four source files/test, narrow AdminAppointmentsService transaction seams/module export, bulk audit/app/error wiring, CI case inclusion, official API/client and scoped governance/evidence. Real clinical/legal data, operational capability enablement, frontend, provider acceptance and Phase12 backup/secrets remain independent release gates. Next eligible foundation: versioned ready-program/professional-service definitions reusing approved content and existing TreatmentPlan, before separately defined commercial entitlement/delivery and personalized therapy rules.


## F12-PJ-PG01 — Reviewed versioned program and professional-service definitions

2026-10-17; PJ-PG01 DONE/review PASS/released; baseline front@af6d637; sole Codex /root coordinator/writer/reviewer, no subagents. Continuous backend authorization; frozen program-definition-v1/ADR-0030; dependencies accepted G01/G02/current directory/TreatmentPlan/clinical workflow. Existing .gitignore Archive addition excluded. Owner's later explicit reply confirms no ordinary refund after successful payment for ready/custom program services; no current sale or financial behavior is activated by this foundation or that reply.

One retained ProgramDefinitionVersion separates versioned program identity/clinical curriculum or professional-service specification from future tariff/payment and patient-specific treatment. READY_EDUCATION is independently authored general curriculum with exact approved same-clinic/locale G01 references and explicit safety/limitations/contraindications/professional-care guidance; no diagnosis, medication or individualized therapeutic diet. CUSTOM_PROFESSIONAL_PLAN binds a real published DoctorService clinical snapshot(id/doctor/service/mode/duration), with future assigned professional review and delivery through existing TreatmentPlan. No duplicate patient plan, assessment engine, payment engine or G01 source publication workflow. Original approved educational references keep their existing patient access; privileged program curriculum is not exposed through G01. No real program/medical/legal content or default capability seeded.

Eight new privileged HTTP operations author/list/read/draft-revoke and physician list/read/exact approve/final revoke. Current independent live actor/session, actual ADMIN or linked active published qualified same-clinic DOCTOR/SIGN authority and clinic membership are checked/locked with mutation/audit. Ordinary ADMIN never approves or withdraws approved definitions. Immutable definition/source/safety/content hashes and creator command/session evidence, consecutive stable-kind identity versions, canonical normalized command retries, no edit/delete API, final retained revocation. Dynamic exact source/service/current reviewer loss suppresses usability without substituting older source/version; price-only directory changes leave clinical snapshot intact. No patient identifiers, price/checkout or therapeutic activation in responses; commercialReady remains false. Lists/readiness queries bounded and batch current predicates in one round trip, no application N+1 state fetch. Reuses existing persistent rate-limit port/implementation with program-specific namespace/error, no coupling to couple request quotas.

19 new actual PostgreSQL/HTTP cases PASS: both kinds/private drafts/real source and service snapshots; no patient/sale/therapy side effects; canonical concurrent retries/consecutive versions; strict invalid metadata/privileged fields/source hashes; live actual admin and qualified professional/clinic/profile/role/session/SIGN boundaries; exact safety acknowledgements, concurrent approval and final revocation; retired source/current reviewer/clinical service loss and price-only preservation; bounded lists; actual independently authored foreign-clinic definition/source concealment; deterministic source revocation while approval waits/no stale release; persistent30-write limiter; direct SQL immutability/retention/forged approval/session/safety/source refusal; audit read/create/approve/revoke rollback; and independent application clock+90s proof.

Main review corrections were verified before acceptance. Initial boot lacked the identity dependency required by the controller guard; narrowed final module imports existing IdentityModule directly and reuses its limiter in program scope. Initial tests reused one account beyond the real30-write limit; each scenario now has independent real actors and an explicit rate-limit test, without bypassing production limits. Five approval cases exposed mixed Prisma application-default creation time versus DB approval time (created timestamp20ms ahead of approval). Creation/approval/revocation now all explicitly use the transaction DB clock; +90s application-clock case and final19/full focused regressions PASS. Applied59 was not edited or replaced to fix application/fixture errors.

Verification:127 distinct focused API cases10 files PASS (main118 across program19/G01/G02/D01/D02/C04 six files; separate clean59 database existing treatment-plan/activity/progress/directory9 across four files), plus official client5/freshness/build and API/test/App/Dashboard/Web typechecks. Official API300 paths/all292 previous path definitions unchanged. Fresh59 official replay/no drift and populated58-to59 clone preserve every row across126 existing tables, prior paid readability, and populated individual grants/couple joint results/care consent evidence; definitions empty by default. Clone raw SQL comparison intentionally preserves original migration ledger, separate official fresh replay verifies the ledger. Main journey disposable officially upgraded58→59/no drift; persistent DB unchanged.

EXPLAIN20-row list on ~100 synthetic definitions naturally selects small-table sequential scan/top-N(~0.2ms); rollback-only enable_seqscan=off diagnostic confirms backward index-only scan via program_definitions_clinic_status_created_idx. This justifies prefix/order compatibility, not production-scale performance. Unique identity/version index covers version allocation. Scoped Nest collector reviewed, no findings; no full repo/security scan claim. Graphify AST9359 nodes/26050 edges; existing missing SQL/HCL parser and old chat parse warnings unchanged, no install.

Final sole-agent review checked exact scoped contract/acceptance, retained FK/constraints/NULL fail-closed shape/current dependencies/actor ownership, clock consistency, no patient or financial side effect, generated/backward compatibility and untouched user work. No unresolved scoped blocker. Changed new programs/definitions four source files, narrow Prisma inverse refs/new59 migration, app/error wiring, real DB/upgrade tests/CI, official API/client and scoped plan/ADR/contract/evidence. Next eligible separately frozen batch: immutable configurable program commercial publication, access duration and exact owner-controlled terms with the now-confirmed no-ordinary-refund rule; subsequent shared financial entitlement and assigned custom delivery reuse existing billing and TreatmentPlan. Actual medical/legal/service content and release/provider/Phase12 backup/secrets gates remain open.


## F12-PJ-PG02 — Immutable program price/access and exact commercial publication

2026-10-17; PJ-PG02 DONE/review PASS/released; baseline front@bf5ee45; sole Codex /root owner/coordinator/reviewer, no subagents. Continuous backend authorization, accepted PG01/G01/directory/consent release; frozen program-commercial-publication-v1/ADR-0031. Owner explicitly confirmed ready/custom paid programs also have no ordinary refund; independent Store/appointment rules and traceable duplicate/late/captured-unfulfillable compensation preserved. Existing .gitignore Archive change excluded.

One retained ProgramOfferingPublication separates price/access/legal revisions from PG01 medical review and future patient purchase/delivery. Bind exact clinic/program identity/definition hash, immutable integer IRR/free-or-paid price, explicit duration/perpetual or custom one-delivery access, quote TTL, owner retention reference and exact active PROGRAM_PURCHASE_TERMS/hash, fixed no-ordinary-refund/pre-access-or-request policy and real publisher session/key/time/final retirement evidence. No default amount/duration/terms/retention or actual policy/medical data. READY_EDUCATION price is configurable; CUSTOM_PROFESSIONAL_PLAN fee equals current real DoctorService priceAmount/currencyIRR, not a separate invented tariff or Toman conversion. One delivery does not expire a clinical record or declare suitability. No patient purchase/access activation or automatic therapy.

Five privileged operations/four paths: side-effect-free POST preview200, idempotent publish201, bounded list/detail and final retirement. Actual current ADMIN/CONTENT_MANAGE/live session/active-clinic membership required; ordinary doctor/patient cannot price/publish. Exact preview hash plus expected publication CAS; shared definition-locking SQL seam reuses PG01/current G01 professional/source checks and directory locks, followed by exact legal lock. Concurrent same-key repeats create one; competing new keys at one expected revision yield one success/rest409. Replacement atomically retires old ACTIVE as REPLACED; one-active partial unique, immutable retained old terms/price, no edit/delete/restore. Explicit MANUAL retirement remains possible after source/legal loss; repeats no-op. Dynamic current clinical/legal/directory-price loss suppresses new-sale configuration, no old fallback. CheckoutAvailable false identifies that publication itself grants no patient payment/access.

Existing owner-controlled consent CLI adds opt-in PROGRAM_PURCHASE_TERMS with default purpose/hash/environment/release safeguards preserved. Existing persistent program limiter reused through a narrow module export; no new rate infrastructure. Shared moneyRial/limit parser reused, response amounts are strings. All publication timestamps derive from DB/GREATEST with prior revision to remain monotonic across lock waits and application-clock skew. Readiness lists batched, private/no-store and metadata-only transactional audit; no patient/curriculum/private author-session data in publication output.

18 new real PostgreSQL/HTTP cases plus one CLI purpose case PASS: both approved program kinds/configurable/free price/explicit access; exact real custom fee; preview no sale/clinical side effect; canonical concurrent retries/stale CAS/replacement/retained old snapshot; final retirement/SQL no resurrection; wrong purpose/locale/current policy and clinical/current reviewer loss; directory fee changes without rewriting clinical approval; strict money/access/hash/safety/retention/privileged field input and actual admin/session/role/membership gates; direct SQL forgery/immutable retention; bounded lists; deterministic fee change while publish waits; genuine independently authored foreign-clinic source/publication concealment; +90s application-clock monotonic create/replace/retire proof; and audit-failure read/replacement/retirement rollback preserving the original active tariff. Raw invalid-insert tests first retire the original and provide a valid next revision/time/cleared retirement evidence so unrelated one-active/history failures do not mask money/access/policy constraints.

Verification:144 distinct focused API cases11 files PASS(main135 across program publication18/PG01/G01/O03/P02/C04/consent CLI9; clean60 directory/treatment-plan/activity/progress9 across4 files), plus official client5/freshness/build/API/test/App/Dashboard/Web types. Fresh60 official replay/no drift; populated59-to60 clone preserves every row across127 existing tables, exact paid readability and PG01 usability, actual prior individual/couple/care/program evidence. New offerings and actual program terms absent by default. Raw clone proof preserves prior Prisma ledger deliberately; independent fresh official replay verifies the ledger. Main disposable officially advanced59→60/no drift; no persistent database touched. Migration60 passed first apply and was not rewritten.

Official API304 paths/all300 previous path definitions unchanged. Scoped Nest collector no findings; no whole-repo/security audit claim. EXPLAIN bounded20-row list naturally scans ~50 synthetic rows(~0.1ms); rollback-only index diagnostic uses program_publications_one_active_key. Prefix/status/date list index and identity/revision/active uniqueness align actual query/serialization; no production-scale performance claim. Graphify AST9458 nodes/26342 edges; unchanged missing SQL/HCL parsers/existing chat parse warnings; no installs.

Final sole-agent review checked scoped acceptance/current identity/qualified exact clinical source and owner legal/fee boundaries, stable no-refund policy/money/access shape, source locks/CAS/atomic replacement/retained history, readiness/clinical-financial lifecycle separation, audit rollback/clock/NULL-safe SQL and generated compatibility. No unresolved scoped blocker. Changed new programs/publication four source files, narrow existing limiter export, schema inverses/new60 migration/CLI purpose/test, app/error wiring, new real DB/upgrade tests/CI, official API/client and scoped plan/ADR/contract/evidence. Next eligible separately frozen batch: shared ready educational program purchase/access via existing wallet/server Verify, exact free activation/purchased-version/duration and owned progress. Custom payment/assigned TreatmentPlan delivery requires later independent acceptance. Real clinical/legal/retention data, frontend, actual provider and Phase12 backup/secrets gates remain separate.

## F12-PJ-PG03 — Shared educational program purchase and proved owned access

2026-10-18; PJ-PG03 DONE/review PASS/released; baseline front@5fe92e1; sole Codex /root owner/writer/reviewer, no subagents. Continuous owner backend authorization and explicit no ordinary refund for ready/custom program services. Frozen ready-program-purchase-access-v1/ADR-0032. Preserved unrelated .gitignore. READY_EDUCATION only; CUSTOM_PROFESSIONAL_PLAN remains unchargeable until separately accepted assigned professional delivery.

Added immutable ProgramPurchase and ProgramAccessGrant, same-clinic/patient publication references and typed PROGRAM reservation FK on existing BillingIntent. Existing generic PatientConsentRecord retains exact PROGRAM_PURCHASE_TERMS with independent actual live patient/session acceptance; existing WalletCommand stores namespaced hashed command responses for canonical retries/current-acceptance aliases even after legal retirement. No new consent/financial/clinical engine, permission, actual medical/legal source, default price/period/retention or capability. General education needs no invented assessment, intake, DOB or age gate. All seven new self APIs use existing capabilities/persistent limiter/private no-store/current patient resource scope and atomic minimal audit; catalog excludes custom services and never returns private curriculum before access.

Existing shared zero-tariff branch issues FREE access atomically; wallet requires exact immutable real debit; gateway requires server Verify amount/reference/noncompensated proof. No callback hint/client claim grants access. Shared creation/view/filter/refund and typed target effects have narrow additive extensions only. Exact quote/source/terms/owned consent snapshots cannot reprice or rebind. Patient/source then publication serialization rejects concurrent pending/live same-version purchases; later reviewed version and expired/abandoned financial quote are explicit new purchases. Unexpired REPLACED tariff can settle at the old price; manual/clinical/legal retirement blocks settlement. Existing captured-unfulfillable/late/separately reconciled duplicate bank compensation credits wallet once and adds no access. Ordinary successful cancellation/refund rejected in shared API, target and SQL.

One proved owned grant at final commit for each PAID PROGRAM; unpaid/abandoned/COMPENSATED has none. Deferred exact financial/actor/snapshot proof, retained intent/attempt/consent/purchase/grant history and direct SQL scope/method/amount/quote/beneficiary/period boundaries. DB grant time plus exact days*24hours or perpetual NULL; existing financial engine clocks unchanged. Paid receipt and clinical body availability are separate: later tariff/terms sale retirement preserves purchased rights, while current clinical/source/qualified approver loss suppresses body without fallback. Home adds bounded own metadata and OPEN_PROGRAM after existing urgent/onboarding/paid-assessment priorities, before medical booking eligibility; no new journey or ready-curriculum progress table.

30 new actual PostgreSQL/HTTP cases PASS: catalog/current exact terms/price/safety/no private body or invented onboarding gate; FREE/perpetual and wallet/days/cross-session receipt recovery; concurrent same-key create/pay and distinct duplicate rejection; canonical terms aliases after retirement; live patient/role/session/ownership and genuine foreign-clinic concealment; strict DTO/price/clinic overrides/wrong consent/hash/free bypass; insufficient/frozen wallet; REPLACED quote; paid retained content versus manual/legal/clinical/source/reviewer retirement; server verification/callback hint/wrong token/concurrent verify; failed/ambiguous/mismatched provider; unfulfillable and expired bank compensation/explicit later purchase; late successful separately reconciled old attempt while original grant stays singular; no ordinary refund/direct SQL refund; SQL immutable history and another purchase debit rejected by the exact deferred proof; forged acceptance session; DB period with application clock+90s; actual distinct reviewed-version retention; Home action; deterministic legal change after observed publication-lock wait; acceptance/payment/content audit rollback and persistent thirty-first-write rejection. End-of-period predicate tested at end-minus1ms and exact end against real persisted grant; no claim of waiting30 real days or production load.

Verification:222 distinct focused API cases16 files PASS: final main9 files177(program30, PG01 nineteen, PG02 eighteen, individual purchase23, paid couples30, care19, assigned consultation14, Home13, target effects11); separate existing wallet15; clean63 legacy appointments/profile/scoring12 plus booking/patient/admin assessment authorization18. Initial combined run169/170 found the pre-existing PG01 synthetic revocation fixture using host newDate before its persisted approval; fixture now uses DB GREATEST approval time, original source-lock observation/stale-approval-denial assertions unchanged, PG01 nineteen subsequently PASS. No production G01 semantics changed. Official client5/freshness/build and API/test/App/Dashboard/Web types PASS. Official311 paths, all304 retained;303 previous path definitions unchanged, remaining admin billing filter additively accepts PROGRAM. Home/intent response schema additions compatible; frontend sources unchanged.

Fresh official63 replay/seed/no drift PASS; populated60-to63 raw proof preserves every row across128 existing tables, prior paid readability/program definition/publication readiness; every old billing program FK NULL, new purchases/grants empty by default. Original patient_journey_test remains60. Automatic review rejected the original proposed existing-test mutation and required cloning: new patient_journey_program_purchase_test and wallet_program_purchase_test only received official migrations; separate patient_journey_program_purchase_upgrade/fresh verify preservation/replay. Existing test safety checks now use an explicit localhost:55419 two-name allowlist plus isolation flag; wallet retains original CI wallet_test behavior and permits only the explicitly named55419 clone. No host/remote safety bypass, persistent database change or reviewer bypass. Upgrade raw proof intentionally retains the old Prisma ledger; independent official replay proves the current ledger.

Migration61 first real application exposed UUID audit subject compared with text during deferred proof:16 initial failures/2 passes, no orphan purchases/grants survived. Applied61 was preserved; forward62 fixes UUID comparison; forward63 adds exact DB purchase/quote/current beneficiary/terms creation boundaries identified during main review. Both forward changes and all63 migrations replayed freshly. No applied migration rewritten.

Actual EXPLAIN bounded own history uses program_purchases_patient_created_idx and billing_intents_program_purchase_key (~0.4ms synthetic local plan). Catalog initially spent~245ms rechecking clinical proof for178 stale-legal tariffs; materialized current-legal candidate filtering before the unchanged full current-publication proof reduced that check to one candidate/~10.5ms with~235 retained synthetic tariffs. Existing active publication/consent and definition indexes suffice; no cache or new state table/index. Lists batch consent/access projections rather than per-item DB calls. No production-scale latency claim. Scoped Nest read-only collector no candidates; API/test actual typechecks separate, no full audit/build/browser run. Graphify AST9577 nodes/26777 edges; known missing SQL/HCL parsers and existing chat parse warning unchanged; no installations.

Final sole-agent review checked claim/contract/dependencies/combined owned diff, current identity and clinic boundaries, exact approved and legal provenance, payment-to-one-grant proof and retention, no-free-bypass/no-refund/compensation, lock waits/quote/version/expiry/clock rules, minimal atomic audits, official client compatibility and unrelated user work. No unresolved scoped blocker. Changed five new programs/purchases files, schema inverses/three forward migrations, narrow billing/Home/app/error seams, new30-case and populated-upgrade tests, narrow existing test safety/clock fixture/typed effect changes, CI/API/client and scoped governance/evidence. Next eligible separately frozen scope: assigned custom professional request/payment/native TreatmentPlan preparation/qualified issue/progress. Actual clinical/legal/retention release, real PSP acceptance, frontend and Phase12 backup/secrets remain separate; full backend not declared complete.

## F12-PJ-PG04 — Named custom service selection and request-specific care authority

2026-10-18; baseline front@aa6a46e; PJ-PG04 sole Codex /root writer/reviewer, no subagents. FROZEN custom-program-request-care-v1 / ADR-0033; prior PG01/PG02/PG03 accepted; owner continuously authorizes serialized backend implementation. DONE/review PASS/released. This is backend request/consent foundation only. No custom charge, entitlement, chart access, native TreatmentPlan mutation, automatic clinical suitability or frontend acceptance.

Two retained Prisma models CustomProgramRequest/CustomProgramCareAuthorization with narrow inverses and forward64/65. New four-file programs/custom-requests module exposes eight own operations on six paths: custom program catalog/detail, create/history/detail requests, accept/history request-specific authority and final own withdrawal. Exact selected immutable publication/clinical hash/named real DoctorService/DoctorProfile/IRR fee retained; current actual PATIENT/session/clinic and qualified named physician required. No intake/DOB/assessment prerequisite invented for metadata. Both checkoutAvailable and clinicalDeliveryAvailable remain false with explicit delivery-not-released blocker. Missing actual CUSTOM_PROGRAM_CARE policy is explicit; CLI exact-purpose/hash/environment validation only, no real legal text seeded. No new permission/default grant/state machine/payment/treatment engine.

Generic PatientConsentRecord evidence can be reused only after explicit independent acceptance for each request; WalletCommand namespaced hashed aliases retain canonical IDs and replay current retained states. Consecutive expected-version acceptance, one-open partial unique, body hash, actual independent session, immutable source/ownership, final withdrawal/supersession with deferred next-version proof, DB timestamps and shared identity/request/source/legal locks enforced. Withdrawal affects one request, survives clinical/legal retirement and never cancels/refunds/revives financial or other care state. Old acceptance retries after withdrawal return withdrawn evidence. Later legal changes suppress current authority until explicit renewal; clinical/named-doctor loss suppresses without fallback. Later commercial retirement/repricing preserves original selected context and permits clinical/legal-valid care renewal. Every sensitive metadata read/command has atomic body-free audit and fails closed; persistent existing limiter/private no-store reused.

Verification: 21 distinct new PostgreSQL/HTTP cases, including real role/session ownership, public/no-private-body projections, missing/wrong-purpose/wrong-hash legal policy, no financial/clinical effects, source/fee retention, same-key concurrency, independent-key aliases, per-request isolation, scoped final withdrawal, explicit consecutive renewal, legal supersession, SQL forgery/history/NULL/one-open/identity/source/hash/session boundaries, audit rollback, DB clock under host+90s, and observed PostgreSQL lock waits followed by committed physician/legal changes. Initial fixture publication correctly refused a physician without active published specialty; fixture corrected to actual directory workflow. Initial18-case run passed17 and reproduced CHECK UNKNOWN accepting a final tuple with NULL reason. Applied64 was preserved; forward65 uses COALESCE false. Reproduction DB retained unchanged; a new verified clone of accepted63 received both migrations,18 original cases then passed. Final20-case combined run plus later new forged-consecutive-authority case and strengthened exact legal DTO case passed.

Combined197 tests/10 files: custom20, ready purchases30, definitions19, publications18, individual purchases23, couples paid30, assessment care19, assigned consultation14, Home13, typed effects11. Additional new SQL case raises distinct total198; consent CLI10 and OpenAPI contract8 give216 focused API cases/12 files. Client5/freshness/build, API/test TypeScript, App/Dashboard/Web typechecks, Prisma validate/no drift PASS. Scoped Nest read-only collector no candidates; manual connected-code/SQL/claim/contracts/authorization/privacy/audit/concurrency/source-retirement/generated compatibility/main review PASS. No broad audit/build/browser tests or installations.

Fresh official65 replay/seed PASS; new request/care tables and actual CARE policy empty by default. Separate populated63-to65 raw proof preserves every row across130 existing tables and prior program/assessment readability; new ledgers empty. Raw upgrade intentionally leaves old Prisma ledger; separate fresh official replay proves ledger. All writes only new disposable localhost55419 clones patient_journey_custom_request_test (retained defect reproduction), patient_journey_custom_request_verified_test, patient_journey_custom_request_upgrade/fresh. Original patient_journey_test60 and accepted PG03 proof DBs unchanged. Safety helper adds exact local clone names/isolation flag and PG03 test reuses helper; CI explicitly includes new case. No persistent/remote DB changes.

Official combined working tree has321 paths;315 previous paths unchanged and six new PG04 paths/nine schemas/two additive error codes. Four pre-existing concurrent banner paths and their generated types retained in working tree, excluded from task commit using a separately generated HEAD+PG04-only document/client. No banner/frontend/media/.gitignore source staged. Actual EXPLAIN uses custom_program_requests_patient_created_idx (~0.1ms synthetic local) and custom_program_care_request_version_key (~0.04ms); no production load claim/new speculative index. Graphify AST update9815 nodes/27454 edges; known missing SQL/HCL parsers and pre-existing chat parse warning remain, no installs.

Main review found no unresolved scoped blocker. Changed four module files, two models/inverses/two new migrations, exact-purpose CLI/test, app/errors, new route/upgrade tests, narrow prior test-safety helper use, CI, official generated API/client and scoped plan/ADR/evidence. Next eligible PG05: separately freeze/claim shared custom purchase and assigned native reviewed TreatmentPlan/tasks/progress delivery; protect all bound legacy clinical read/write paths before accepting custom payments. Actual clinical/legal/retention content/provider acceptance/frontend/release and Phase12 backup/secrets remain separate.

## F12-PJ-PG05 — Shared paid custom right and assigned reviewed native delivery

2026-10-18; PJ-PG05 DONE/review PASS/released; baseline front@4e95ba2; sole Codex /root coordinator/writer/reviewer, no subagents. Frozen custom-program-native-delivery-v1/ADR-0034; accepted PG01–PG04/shared billing/native clinical dependencies. One inseparable financial/native-boundary operation: charging accepted only after generic bound reads/writes, professional issue, own patient delivery and financial verification passed. Concurrent Store/banner/media/frontend/.gitignore work preserved and excluded.

ProgramPurchase adds nullable exact custom request/care FKs; explicit custom snapshot schemaVersion2 extends the existing PROGRAM target, free/wallet/server Verify, ProgramAccessGrant and technical captured-funds compensation. Educational v1 remains unchanged; no duplicate engine/provider/ledger. Exact original source/price/terms/current independent patient/session/scoped care and actual ready named professional required before collecting fee and again at settlement. Known missing VIEW/EDIT/SIGN/specialty blocks charge. Pending/live right serialized per request; explicit failed retries, original unexpired replaced quote, one right, no ordinary refund. Custom right is never an educational-body permission.

One CustomProgramPlanVersion retains consecutive exact request/care/current completed medical-intake revision and native TreatmentPlan hash plus live author/session/key/qualified issue/final revocation evidence. Actual content only in native medications/sessions/exercise/nutrition, never a duplicate clinical JSON ledger. New draft creates then freezes native advice; correction creates a new version, latest exact qualified human issue activates it and voids superseded native plans/tasks/reminders atomically. No automatic therapy/assessment gate/extra patient medical fields/reassignment/blanket physician grant. Assigned worklist and bounded self-reported intake context require actual same-clinic linked active published physician, active published specialty, DOCTOR and explicit VIEW/EDIT/SIGN, current scoped care/source/payment/session. ADMIN/other physician/partner/foreign patient cannot read preparation. Privacy withdrawal closes clinician access; patient's already-issued record and payment history remain. Explicit clinical revocation suppresses active body/tasks; retained metadata and superseded own medical history remain. Replayed issue aliases never revive revoked advice.

Native plan/child/task/adherence/progress/generic lists/report/Home seams enforce the bound boundary; unbound legacy behavior preserved. Native create/read transaction helpers avoid another treatment engine/module cycle. Exact same-transaction audit/progress/ownership/immutable SQL proofs, qualified assigned operational scheduling and own patient adherence reuse existing native infrastructure. DB clinical/activity times tolerate application clock skew. Home excludes custom grants from educational cards, adds bounded own custom metadata and independently selected actionable request after urgent/onboarding/assessment priorities. No journey table. Ten new operations/nine paths, strict bounded DTOs/UUID/hash/version/ASCII key, existing capabilities and persistent limiter, private no-store, transactional PatientAccessAudit plus body-free AuditEvent.

Forward migrations66–73 only, all applied exclusively to new disposable clones. Applied corrections preserved: deferred proof local-variable qualification failed first native COMMIT (forward68); native task/adherence/progress proofs tightened69; actual doctor worklist/native child lookup indexes70/71; real native-policy/consent/parent versus context read deadlock reproduced500 and fixed with consistent medical-policy-first locking72. Retired processing policy still allowed old intake before73; regression reproduced, forward73 aligns with existing onboarding completion rule (patients/domain/onboarding.ts completionCurrent compares completed consent to current active consent). Accepting new consent alone does not relabel historical revision; existing native accept/complete API creates revision2, old draft issue stays409 and fresh human preparation can issue. Original66–72 untouched. No orphan version/native rows survived failed deferred/audit tests.

23 new actual PostgreSQL cases PASS in final complete suite: free full native task/progress/Home, shared mocked PSP server verification/no callback-only right/concurrent settlement/captured compensation, wallet one debit/right/no refund/ready-route404, readiness, strict DTO/version/key/scope, unpaid/incomplete-intake, generic draft/body/content/activation denial, private care withdrawal/retained own history, concurrent canonical drafts/issues, supersede/revoke/task-reminder cancellation/replay finality, observed PostgreSQL lock waits and committed care/intake/medical withdrawal, native medical lock-order deadlock regression, exact policy renewal via existing API, source fee replacement, real session/role loss, SQL forgery/provenance/immutability, audit503 rollback and host+90s. New multistep native reconsent case exceeded default5s in first combined run; explicit15s integration-test budget, all assertions unchanged; isolated and final23-case runs PASS. Existing pg concurrency deprecation warning remains; no runtime bypass.

251 distinct focused API cases across16 files PASS: original combined218/11 files (custom20 plus custom-request21/ready purchase30/definition19/publication18/individual purchase23/couples paid30/assessment care19/assigned consultation14/Home13/typed effects11), then final custom23 raises distinct total221; native7/3 files plus OpenAPI8 and wallet15. Final native7 and OpenAPI8 repeated at73. Client5/freshness/build, API/test and App/Dashboard/Web types PASS. Prisma generate/validate/no drift PASS. Official combined working document330 paths; all321 prior definitions unchanged, nine own paths14 schemas/six owned additive schema changes. Isolated staged document326 paths derives from HEAD317 plus own9; all four unrelated banner paths/types preserved only in working tree. No unrelated source/generated hunks staged.

Fresh official70 replay/seed followed by additive71–73 on fresh_final PASS; current73 validate/no drift, native/OpenAPI regressions, empty custom request/version/purchase/actual program policy and absent default DOCTOR SIGN confirmed. Final reproducible populated65→73 clone script preserves every row across132 existing tables, real previously readable educational grants and scoped care; old custom purchase FKs NULL/new native ledger empty. Raw comparison intentionally leaves old migration ledger; official fresh replay verifies ledger. Main disposable custom DB73, separate fresh and wallet clones only. Original journey60/accepted PG03/PG04 proof DBs and persistent database untouched. Upgrade script explicitly guards localhost55419/named clones. No actual clinical/legal/retention content seeded; mocked test provider is not Sadad production acceptance.

EXPLAIN uses custom_program_requests_doctor_created_idx for actual bounded assigned query and custom_program_plan_request_version_key for own history. Tiny synthetic child tables naturally choose sequential scan; rollback-only enable_seqscan=off confirms exercise_plans_native_content_idx/nutrition_plans_native_content_idx provide exact native FK/order index-only access. No production SLO claim. Scoped Nest collector no candidates; sole-agent connected-code/combined diff/frozen contracts/source identity/clinic/privacy/clinical/payment/audit/concurrency/SQL/generated compatibility review PASS, no unresolved scoped blocker. Graphify AST refresh9958 nodes/28048 edges; known absent SQL/HCL parsers/pre-existing chat parse warning remain, no install/full audit/build/browser/live provider/push/deploy.

Changed: programs/custom-delivery four files; native boundary helper/clinical module/plan/activity/progress seams; program purchase/module/DTO and PG04 request readiness; Home DTO/service; Prisma/narrow inverses/eight forward migrations; app/errors; exact safety/CI and real DB/upgrade/legacy tests; isolated official API/client; contract/ADR and phase evidence/status/map. Next eligible separate task: verified admin patient reporting/detail/intake-correction selectors lack exact medical-processing purpose/locale and could mistake other-purpose consent for medical consent now multiple purposes coexist. Freeze a narrow purpose-isolation correction before implementation; do not expand custom charge/clinical scope or silently rewrite existing frozen contracts. Actual clinical/legal/retention/provider acceptance, frontend delivery and Phase12 operational gates remain open; whole backend/product not declared complete.

## F12-PJ-J02 — Isolate administrative medical consent from other purposes

2026-10-18; PJ-J02 DONE/review PASS/released; baseline front@953cfb4; sole Codex /root owner/coordinator/reviewer, no subagents. Frozen admin-medical-consent-purpose-v1; existing native MEDICAL_INTAKE_PROCESSING/fa-IR consent/completion rules, no new product/clinical policy. Actual regression reproduced administrative patient detail returning a medical body with only PROGRAM_PURCHASE_TERMS acceptance. Initial fixture correctly hit the repository's one-active-clinic constraint; dedicated disposable fixtures now switch active clinic and keep foreign clinic inactive. Withdrawal fixtures retain all required actor/session/key evidence; no constraint bypass.

AdminPatientsService list/summary/report/detail/correction now resolve exact same-patient/same-clinic ACTIVE medical purpose/fa-IR and matching content hash/unwithdrawn consent. Purchase, assessment, couple, custom-care, other locale/clinic/retired or withdrawn acceptances never substitute. List/report use consistent RepeatableRead snapshots and medical-only consent projections; current policy availability is clinic-specific, not a global any-policy flag. Existing evaluation still requires the completed revision's exact consent to match current acceptance; new processing acceptance can authorize the existing self-reported snapshot without retroactively declaring old completion current. No schema, migration, permission/default grant or API shape changes.

Detail and correction acquire current medical policy SHARE, then exact acceptance SHARE, then correction's intake UPDATE; current matched rows come directly from locking SELECT, avoiding an unlocked successor selected after a concurrent retirement/withdrawal. Medical snapshot is fetched after authorization, not before a lock wait. Corrections re-read locked current parent/revision; canonical same-key retry still checks consent and exact operation hash, concurrent identical retries retain one revision. Existing read/correction and legacy assessment audit writes share the use-case transaction; failed audit withholds read body or rolls back revision/parent. Existing permission/clinic routing and legacy assessment behavior intentionally unchanged in this task.

18 new real PostgreSQL HTTP cases plus existing admin authorization/idempotency3 PASS (21/2 files): independent four other purposes, wrong locale/clinic; valid medical acceptance with unrelated policy inserted first; withdrawn fallback denial, replacement/old completion, hash mismatch; summary/list/report; patient/unauthenticated denial; canonical replay/key conflict/current withdrawal; observed consent-row and policy-row waits for READ/CORRECT followed by committed withdrawal/retirement; concurrent corrections; actual audit trigger failure/no medical body/write rollback. Targeted default5s budgets preserved except observed-lock cases15s. A separate regression clone passes66 cases/9 files: Home13, PG05custom23, native consent/domain/authorization, real reporting/authorization/metadata and OpenAPI contract.87 distinct focused API cases11 files overall PASS; final API/test TypeScript PASS. Current generated API/client remain unchanged by J02; existing consumer/client verification from accepted PG05 applies, OpenAPI contract is freshly checked. No unnecessary generated/banner changes staged.

Tests run only new named localhost55419 medical_purpose_test/regression clones. Reporting integration uses its guarded fresh uniquely named disposable database and official migration replay/cleanup. All original/accepted proof/persistent databases untouched. No package installation/full audit/build/browser/live provider/push/deploy. Graphify refreshed after final source/test changes; known SQL/HCL parser and pre-existing chat warnings remain. No added index or clinical/legal fixture seeded into real environments.

Sole-agent connected-code/frozen contract/diff/privacy/locking/audit/consistency/idempotency/authorization/backward-API review PASS; no unresolved scoped blocker. Changed one service, new scoped test, narrow legacy mock/test-database/CI seams, frozen correction contract and scoped phase evidence/status/map. Separate next verified candidate: AdminPatientsService's legacy assessment projection still lacks the accessGrantId:null restriction required by accepted assessment-purchase-access-v1 (ordinary admin raw paid contexts must be excluded). Keep it out of this task; freeze/claim R04 privacy projection correction after this commit. Actual clinical/legal/retention/provider/frontend and independent Phase12 operational gates remain open.

## F12-PJ-R04 — Close legacy administrative private paid-assessment projection

2026-10-18; PJ-R04 DONE/review PASS/released; baseline front@16b7f70; sole Codex /root owner/coordinator/reviewer, no subagents. Frozen admin-paid-assessment-projection-v1 enforces accepted P02 assessment-purchase-access-v1 ordinary-admin privacy, not a new product/access policy. Actual wallet-paid individual regression reproduced generic admin patient detail exposing the private IN_PROGRESS submission ID/source/state before correction; completed result would use the same unfiltered relation. Existing dedicated admin assessment list/detail already use accessGrantId:null.

One source-line correction adds the identical null-context predicate directly to AdminPatientsService's assessment relation query. Paid individual/couples participant bodies are never fetched into this legacy projection, regardless of completion or processing-consent state. Existing null-context legacy results and their minimal read audit remain visible; excluded paid rows are not recorded as body reads. No payment, entitlement, own beneficiary, aggregate reporting or explicitly authorized assigned-care predicate changes. No schema/migration/DTO/controller/generated/client/default grant/clinical source/frontend changes. No new assessment/payment infrastructure.

Reuse actual shared wallet/engine fixtures in existing individual/couples paid suites, no duplicate setup engine. Two new real PostgreSQL cases PASS: individual paid start/autosave/completion/own result then processing withdrawal, same-patient visible null-context synthetic legacy result canary, zero excluded paid-row legacy admin audit and positive allowed legacy audit; two independent paid couple participants each retain own result, partner cannot read the other's private result, neither private result appears in generic admin detail/audit. Canary initially correctly hit existing native completion-evidence CHECK; fixture now carries the same legacy key/hash evidence as accepted discovery fixtures, with no constraint bypass or new clinical validity claim. Before/after private projection regression recorded; final focused pair passes.

Final combined103 cases/6 files PASS: individual24, couples-paid31, assessment-care19, admin medical-purpose18, legacy admin authorization/idempotency3, OpenAPI8. API/test TypeScript PASS. New tests are inside existing CI-included suites, no unnecessary CI edit. Response contracts unchanged and official OpenAPI regression freshly passes; prior generated/client/consumer checks remain applicable. Sole-agent connected-code/frozen contract/actual SQL predicate/own-vs-admin-vs-assigned boundaries/audit/legacy compatibility/scoped diff review PASS; no unresolved scoped blocker.

Only new explicitly guarded localhost55419 private_admin_test clone used, from accepted fresh73 baseline. Original/accepted proof and persistent databases untouched. No new migration replay required for this one-query correction. Graphify final AST9973 nodes/28082 edges; known absent SQL/HCL parser and pre-existing chat warning unchanged, no installation/full audit/build/browser/live PSP/push/deploy. Existing Store/banner/media/frontend/.gitignore and generated additions preserved/excluded from commit. Changed one service line, two existing real DB test cases, narrow disposable-name helper, new frozen correction contract and scoped phase status/map/evidence. Map routes the original umbrella reminders to accepted P01/P02/C02–C04/D01–D02/PG01–PG05 tasks; it does not claim frontend or clinical/production acceptance.

Next safe Patient Journey step is release input and acceptance: actual qualified physician-approved questions/taxonomy/weights/joint educational rules/content, owner-released purpose-specific legal text/retention references, explicit qualified accounts/service prices/configuration, and controlled real provider acceptance. No further implementation batch in this backend map is currently frozen/unblocked; do not invent clinical choices, publish synthetic fixtures, bypass permissions or turn on Sadad. Optional new recommendation targets or a patient-specific result-review workflow need separately scoped contracts and product/clinical decisions; existing paid offering readiness explicitly rejects unsupported review-required bands. Frontend connection and Phase12 operational/provider/backup/secrets/sign-off gates remain separate; whole backend/product/production not declared complete.


## F12-PJ-M01 — Mizaj draft authoring and synthetic dimension preview

Task ID: F12-PJ-M01
Completed at: 2026-10-18 23:51 Asia/Tehran
Agent/Thread: Codex /root, sole writer and reviewer; no subagents
Batch ID: PJ-M01
Reviewed by: Codex /root — PASS
Authority: owner explicitly requests working foundations now, final inputs later; retains physician-only publication. ADR-0035 and mizaj-draft-preview-v1, without modifying existing v1 frozen contracts.

Changed files:
- assessments/domain/assessment-dimension-draft.ts and mizaj-draft-preset.ts
- existing admin-assessments controller/DTO/service and assessment audit action
- common/errors/api-error.ts (one stable conflict code)
- new assessment-dimension-draft domain and PostgreSQL HTTP tests; exact old authoring test clone guard
- narrow .github/workflows/ci.yml test inclusion
- official OpenAPI/client task-only additions; unrelated pre-existing banner additions remain unstaged/uncommitted
- ADR/contract/usage and Phase12 task/status/routing/evidence
Migrations: none; no schema change or persistent DB operation.

Tests run:
- API tsc --noEmit and tsc -p tsconfig.test.json --noEmit → PASS
- vitest run test/assessment-dimension-draft.integration.spec.ts test/assessment-authoring.integration.spec.ts test/assessment-dimension-draft.spec.ts test/assessment-scoring.spec.ts --no-file-parallelism → 65 PASS across 4 files (final run)
- api-client test → 5 PASS plus official generation freshness
- api-client build → PASS
- @sabz/app and @sabz/dashboard tsc --noEmit → PASS (actual package names; initial unmatched filter attempts are not evidence)
- scoped API OpenAPI compile/export and generated client → PASS; semantic pre/post comparison proves exactly two new routes, four DTOs and one error enum addition, with all baseline banner schema/routes preserved
- graphify update . → PASS, AST-only; known parser warnings unchanged. Final refresh after compatibility review recorded locally.

Acceptance:
Original owner-designated source SHA256 810249629f4a7df0a2bc950f2e47a65ddb27cd5fcd1b977e0f2ecc2e6b0020f6, 11 questions/44 options preserved. Questions 1/5/7/8/9 carry explicitly proposed candidate weights; other questions remain nonscoring.16 unreviewed reflective educational profiles cover four single + twelve ordered distinct pairs; no second label invented from zero evidence. Positive independent dimension totals, insufficient evidence, first/second ties, neutral choices, strict bounded definitions, source/profile completeness and unknown/malformed answers PASS. No medical validity claim or automatic advice.

Actual PostgreSQL HTTP proves preset/no row creation, draft create/get/update/duplicate/preview, metadata-only audit and no patient submission/result persistence; ADMIN vs unauthenticated/PATIENT/DOCTOR; foreign/missing source; exact changed hash/current draft/published/retired/v1 denial; strict DTO/proxy rejection; audit failure withholds output. Observed real writer lock followed by changed hash returns 409 without preview audit. Existing v1 authoring/concurrency/audit/scoring/publish/retirement tests PASS.

Review caught the legacy scalar dashboard editor silently defaulting vector weights to zero and rewriting schemaVersion1. Saved dimension drafts now reject schema-family downgrade; scalar create/publish carrying DIMENSION_RANK also rejects. New actual HTTP regression PASS. No frontend file changed and no new draft editor or patient result screen claimed.

Verification isolation: new localhost:55419 patient_journey_mizaj_preview_test cloned from accepted fresh73 baseline only. Existing original/accepted proof databases and persistent DB untouched. Existing Docker management pipe was unresponsive; recovered only the previously used same-task local disposable connection, never changed credentials or restarted services. Temporary local connection handoff removed. No installation, full audit/build/browser/live provider/deploy/push. No actual clinical/legal content, price, approval or patient record seeded into a real environment.

Known limitations: M01 is an admin authoring/preparation capability. DIMENSION_RANK is deliberately not accepted by the existing patient scorer/protocol/guidance/SQL/commercial/paid/couple/care release paths. Source weights and copy remain UNREVIEWED; final qualified clinical/provenance/legal/retention/rights/provider inputs remain external. Authoring APIs can be used per plan/mizaj-draft-preview.md; current dashboard visual editor supports only v1.
Next batch: none currently frozen/unblocked in this track. Separately scope source algorithm/provenance/SQL/protocol/guidance/individual+couple financial/care integration before patient runtime activation; frontend remains separate. No full patient journey/clinical/production acceptance claim.


## F12-T12-R13 — Uncommitted Store/banner corrective review

Task ID: F12-T12-R13
Verification completed: 2026-10-19 00:15 Asia/Tehran
Agent/Thread: Codex /root, sole writer/reviewer; no subagents
Batch ID: STORE-BANNER-REVIEW
Status: READY_FOR_REVIEW — main review/verification PASS; owner explicitly requests NO COMMIT. All work is unstaged; baseline HEAD6ac21e8 unchanged. No task-level commit or DONE checkbox.
Contract: store-banner-review-v1. Scope is the pre-existing uncommitted Store/banner change and its direct dependencies, not a full repository audit.

Verified defects and corrections:
- A fixed R2 object was overwritten before metadata/audit commit, so failed transactions could alter a published image. Removal deleted bytes before commit. New immutable per-upload keys, version-pinned two-phase publication, same-clinic/banner namespace checks and durable generic-outbox orphan/replaced/removed cleanup fix rollback and concurrency behavior. No new table/migration/provider.
- New image mutations require If-Match and Idempotency-Key. Exact replay does not rewrite storage; mismatched reuse rejects. Stale replacement/removal and stale editor PATCH reject; no implicit rebase. Metadata detach+audit/cleanup reservation is atomic. Cleanup failures remain retriable and duplicate cleanup is safe. Private/public content rechecks current key/publication after remote I/O.
- Arbitrary content storage keys could be attached through existing banner JSON and served publicly. Banner attachment is now through validated upload only; foreign/unsupported namespaces cannot be served. Public projection has only id/title/destination/contentPath and excludes unpublished/no-image records. The legacy patient banner list retains its prior no-image behavior. Lists are bounded to100; no-store responses.
- Relative /store URLs were rejected and null clearing crashed. Valid root-relative and absolute HTTP(S) links work, null clears, unsafe schemes/protocol-relative/backslash/control/credential links reject. Client navigation and banner image paths enforce matching boundaries too.
- Banner fetches bypassed the existing session-aware transport and could use expired bearer tokens; new typed generated-client requests refresh through the existing provider, have bounded timeouts/abort and preserve explicit version/operation headers. OpenAPI has real list/entity/multipart/header response definitions, no guessed result casts.
- A global authenticated Blob URL map grew without revocation and product images remained cached by product ID after replacement. Component-scoped abort/revoke lifecycle with bounded concurrency replaces it; product image identity invalidates the preview. Next Image explicitly unoptimized handles authenticated/local Blob URLs without server optimization.
- Uppy tried to clear selection while still locked in confirming state. It now clears after confirmation; failed refresh retries confirmation without reuploading, and ambiguous transfer retry keeps its original operation/version. New intent requires deliberate reselection. Parent controls prevent simultaneous copy/media changes; unsaved copy survives a remote change, and a newly created selection is not overwritten by the old list.
- Customer preview included DRAFT products and inactive first SKUs; filter now matches ACTIVE/category-active/active-SKU visibility and picks an active SKU consistently for price, inventory and the summary counter (including an inactive first SKU). Unknown banner/catalog loads display unknown state instead of fabricated zero/empty content. Existing Archive/data-for ignore intent retained. Storage fallback restored to the existing configured5000ms default instead of an ineffective20s value outside the validator bounds.
- Targeted lint exposed React ref writes during render and state synchronization effects; corrected using external callback effects, guarded prop-change state adjustment, derived selection and asynchronous request callbacks. No rule disable or package installation.

Changed paths: existing uncommitted Content controllers/module/service, app Store/page/slider/banner store, dashboard Store builder/banner/media/API helpers and tests, generated client/OpenAPI; necessary Content DTO/stable errors/banner policy+media service/outbox cleanup handler and wiring; narrow CI regression step; Phase12 contract/status/evidence. No unrelated committed Mizaj code changed.

Verification:
- API tsc --noEmit; final tsc -p tsconfig.test.json --noEmit → PASS
- Real isolated PostgreSQL HTTP + private-storage double: content-banner-media.integration.spec.ts9, legacy content-publication.integration.spec.ts1; actual image processor/storage/config unit tests13 → 23 PASS across5 files. Covers durable-before-put, sanitized upload, replay/key mismatch, metadata/null/unsafe URL and stale edit, publish/private/public projections, deletion/replacement/failure retry, audit rollback/orphan cleanup, real concurrent same-revision replacement and unpublication during I/O, arbitrary key/auth/role rejection, malformed media/disabled storage.
- Dashboard: banner uploader transport5 + editor3 + storefront7 + session-aware banner API3 + existing product uploader15 → 33 PASS across5 files. Real Uppy XHR transport double; no browser claim.
- App: public banner destination/image-boundary13 + existing banner-store2 → 15 PASS
- api-client:5 PASS; official generation freshness and build PASS
- Actual @sabz/app and @sabz/dashboard tsc --noEmit → PASS
- Targeted dashboard ESLint over eight directly affected source/test files → PASS, zero errors/warnings on final run
- git diff --check → PASS; git diff --cached empty; HEAD remains6ac21e8
- graphify update . AST-only refresh → PASS (local log); existing parser warnings unchanged

Only new localhost:55419/store_banner_review_test clone received test writes, from the accepted fresh73 baseline. Original/accepted proof/persistent DBs and real R2 objects untouched. No full build/audit, browser run/installation, migration/install/commit/stage/push/deploy. Live R2 acceptance and browser interaction checks were not performed here. CI includes the new regression using a separately named disposable DB.

Test refinement: one cleanup test initially assumed a single transient deletion error would preserve an object despite two independently valid cleanup intents. The fixture now models a sustained outage for that exact key, verifies both durable retries, then restores storage and verifies only the current object remains. Assertions are preserved for the intended failure condition.

Remaining/next action: no unresolved defect in the reviewed scope after final checks. Held READY_FOR_REVIEW and unchecked only because the owner explicitly defers commit. Keep all corrections and original work unstaged/uncommitted; do not auto-commit or start another task in this held batch. Wider browser/live-provider/production acceptance remains separate.

## F12-FE01 — Patient client integration implementation handoff (verification deferred)

Task ID: F12-FE01
Recorded at: 2026-10-19 Asia/Tehran
Agent/Thread: Codex /root
Batch ID: CLIENT-INTEGRATION
Status: IN_PROGRESS — implementation prepared; owner review and requested verification pending
Reviewed by: Codex /root (source/contract reading only; no runtime acceptance)
Authority:
  - Owner explicitly requested connecting all client sections before tests, then owner interface review followed by separately requested testing.
  - This overrides per-section test gates for implementation sequencing only; no DONE/final task commit/production acceptance follows.
Baseline and preservation:
  - HEAD 7b7bd43. Only pre-existing local change was .gitignore; preserved untouched.
  - Historical banner claim was stale: its reviewed implementation already exists in commit 7b7bd43. STATUS/checklist synchronized against Git history and existing evidence; no new banner tests claimed.
Changed files:
  - apps/app/src/app/(app)/page.tsx — live Journey/actions/summaries plus actual article/notification reads, no fabricated patient temperament/treatment progress.
  - apps/app/src/app/(app)/assessment/** and components/assessments/assessment-wizard.tsx — history/exact questionnaire/revision-aware saves, frozen submit retries, paid individual offers/consent/purchase/grants, result/provenance/approved guidance; independent couple linking/invitation/consent/payment/private own attempts/joint approved education.
  - apps/app/src/app/(app)/programs/** and guidance/[id]/page.tsx — ready education offerings/purchase/access/content, custom offering/request/care authorization/payment/versioned native delivery.
  - apps/app/src/app/(app)/appointments/[id]/** — discoverable appointment-bound assessment-sharing preview/accept/withdraw.
  - apps/app/src/app/(app)/profile/{page.tsx,security/page.tsx,wallet/pay/page.tsx,wallet/payment-result/page.tsx} — program discovery, actual auth-session management, shared digital payments and outcome destinations.
  - apps/app/src/app/(app)/chat/page.tsx — appointment selection when no appointmentId; existing socket/conversation implementation retained.
  - apps/app/src/lib/{patient-request,use-patient-resource,use-operation-key,patient-journey-api,digital-services-api,couples-api,assessment-sharing-api,security-api}.ts — generated-contract calls, stale-resource isolation, bounded pagination, explicit command keys and confirmed-success key retirement.
  - apps/app/src/lib/{api,appointment-api,follow-up-api,assessment-api,navigation,wallet-labels}.ts — existing session transport reuse, timeout/no-store for legacy direct reads, historical assessment and payment/navigation additions.
  - apps/app/src/components/shared/{patient-resource-state,patient-pagination,policy-acceptance,global-sheet,page-header}.tsx — retry/empty/error separation, explicit policy review, safe text rendering, real navigation/copy in legacy sheet and accessible back control.
  - plan/client-integration.md, STATUS, Phase12 checklist/log — inventory, owned scope, handoff and deferred acceptance.
  - graphify-out generated code graph — AST-only refresh; no LLM extraction.
Migrations:
  - None. No API/schema/generated client/dependency/provider/deployment or persistent database change.
Tests run:
  - NOT RUN by explicit owner request: automated tests, browser/E2E, build, typecheck, lint, API/provider acceptance and database checks.
Other work:
  - Existing code and checked-in OpenAPI inspected; known Object-typed numeric list queries use narrow documented consumer casts without changing wire values.
  - graphify query then graphify update . used for code navigation/AST refresh; graph rebuild is not product verification. Existing SQL/HCL parser dependencies unavailable; no dependency installed.
Pending acceptance:
  - Owner review of routes listed in plan/client-integration.md, then explicit test instruction and focused fixes.
  - Actual published clinical/legal/commerce data and independent Phase12 production gates remain prerequisites for live use.
  - No task commit created, no F12-FE01 checkbox checked, no final review PASS claimed.
Next safe action:
  - Continue this same active task from owner feedback; execute validation only when requested. Preserve unrelated .gitignore and protected user files.

F12-FE01 handoff addendum (same run): both AST-only graph refreshes completed successfully; final graph reports 10,233 nodes/29,343 edges. Source-only Git whitespace check passed after trimming trailing empty lines in task-owned client files. These are repository maintenance checks, not application tests, typechecking or acceptance. No API/generated-client edits, staged changes or task commit were created. Existing bottom-navigation visibility choices were preserved; new routes are discoverable from Home/Profile/appointment detail. Security/session and legacy-sheet corrections are included in the same patient integration scope.

## F12-FE01 — Owner-requested individual/couple assessment verification

Task ID: F12-FE01
Recorded at: 2026-10-19 Asia/Tehran
Agent/Thread: Codex /root, single reviewer; no subagents
Batch ID: CLIENT-INTEGRATION
Status: REWORK — scoped verification executed, whole-task acceptance not granted
Authority: Owner explicitly requested functional verification of individual and couple assessments after prior implementation; supersedes the test deferral only for this scope.
Product source changes: None during this review. Existing uncommitted implementation and unrelated .gitignore preserved. No commit.
Evidence/report: plan/assessment-verification.md (exact sources, reproduction, live/mocked boundaries and safe next action).
Checks:
  - pnpm --filter @sabz/app typecheck -> FAIL: three errors (nullable payment callback, two Object-typed numeric sharing query values).
  - focused assessment/session/wallet app tests -> 17 PASS.
  - pnpm --filter @sabz/app test -> 131 PASS / 5 FAIL in 27 files; failures are legacy appointment/follow-up mocks lacking sessionFetch, not evidence by themselves of failed live endpoints.
  - Real browser reads: assessment/history/offering/purchase APIs200; existing completed result renders score/band/date and no-approved-guidance state. No medical answers or purchase/consent writes in current environment.
  - Real couple setup: sessions/contexts200 empty; link policy503; no paid individual offering published. Live two-person purchase/output acceptance remains unavailable in that environment.
  - Isolated HTTP-intercepted browser: individual required/save revision0/1/submit revision2 + key/result PASS; exact retired questionnaire/conflict lock/reload control PASS; couple independent processing/sharing/partner acknowledgement and mutual gating/payment navigation/joint education PASS.
  - UI defect reproduced for both EXPIRED and CANCELLED couple intents: no fresh purchase action despite supported server contract.
  - Dedicated disposable PostgreSQL16 container on 127.0.0.1:55419: all73 migrations replayed and seed completed. Current5432 DB untouched. Synthetic secrets/payment adapters only; live SMS/PSP/storage disabled.
  - Eight backend files (scoring, structure validation, reliability, discovery, individual purchase, couple link, participation, paid delivery): first run140 PASS / 4 timeouts of144, 358.04s. All four timeouts were the default5000ms in participation file.
  - Independent participation rerun --testTimeout=30000 ->16/16 PASS,48.06s. Each144 distinct backend case passed at least once; original default-deadline failure retained in evidence. pg concurrent-query deprecation warning remains diagnostic, no assertion failures after rerun.
Cleanup: Verified exact disposable container name, codex.task label and anonymous volume, then removed that container and its volume. Original PostgreSQL container remains running. Temporary browser fixture pages closed and routes isolated to those pages.
Limits: No real bank transaction or two-account live browser acceptance; DIMENSION_RANK16-profile/11-question draft remains intentionally outside patient runtime; no medical-validity assertion. Build omitted because typecheck already failed.
Safe next action: Fix reported client compile blockers, closed couple-payment recovery and stale mocks in this existing batch; rerun targeted gates. Do not start a new task or mark DONE/commit before acceptance.

## F12-FE01 — Home redesign and linked-client verification (partial task review)

Task ID: F12-FE01
Reviewed at: 2026-10-19 Asia/Tehran
Agent/Thread: Codex /root
Batch ID: CLIENT-INTEGRATION
Reviewed by: Codex /root; no subagents
Status: Home slice PASS; full client task remains REWORK/unchecked, no final task commit.
Changed files: patient Home/home-journey and focused spec; patient shell/theme/session fallback; onboarding theme/step controls; treatment selection/retry; health-record retry/navigation; order history/tracking/status labels; couple terminal-payment recovery; payment null narrowing; assessment-share query typing; two transport mocks; scoped plan evidence.
Migrations/API/provider operations: none. Existing user .gitignore and protected slider-data.ts/justforcheck.md preserved.
Tests run:
- app typecheck PASS; full app 148/148 tests across28 files PASS.
- app production build PASS,46 static pages and dynamic routes.
- browser live Home and14 service/list destinations: HTTP/API200 except couple-policy503 caused by missing active policy; exact boundaries in plan/home-client-verification.md. Existing assessment-result link: all4 read APIs200.
- browser mobile/desktop320/390/720/1280; no overflow; Home visible controls>=44px; visual screenshots reviewed.
- all-API-intercepted synthetic Home empty/error/retry/list/guide, couple EXPIRED/CANCELLED recovery/terms/idempotency, selected/missing treatment, clinical timeline retry and order navigation PASS. No real patient write or payment.
- git diff --check PASS; graphify AST update run (existing missing SQL/HCL parsers and backend extraction warning).
Result: old Home marketing/dead routes replaced by real service journeys; blue patient tokens applied; prior3 type errors,5 stale mock failures and terminal couple-payment UI defect resolved. Full evidence and per-domain connection inventory: plan/home-client-verification.md.
Known limitations: missing actual active couple policy, empty published commercial services, draft-only new Mizaj engine, no actual bank payment or two-account real API acceptance in this Home run. Development API temporarily restarted during inspection; failed first attempt repeated successfully after recovery.
Next safe action: continue CLIENT-INTEGRATION acceptance under existing contracts after owner-managed policy/content publication in an appropriate environment; no new task/batch, no incomplete final task commit.

## F12-FE01 — Clarify top-up versus wallet spending (partial task verification)

Reviewed at: 2026-10-19 Asia/Tehran
Batch: CLIENT-INTEGRATION; Codex /root sole writer/reviewer; full task remains REWORK/unchecked.
Trigger: owner reports missing wallet option on a supplied payment URL despite sufficient balance.
Evidence: normal browser-tool session is a different patient (owned API returns404 for supplied intent); no conclusion about owner's balance drawn from that session. Exact owner-provided intent checked through a narrowly scoped SELECT in BEGIN READ ONLY/ROLLBACK on local configured DB. Confirmed purpose TOPUP/PENDING, linked wallet funded and unfrozen, no order/appointment/assessment/program target. No names/contacts/token/credentials or identifiers persisted in this log. BillingGatewayService.methods intentionally omits WALLET for TOPUP; BillingService.payWallet also rejects TOPUP. Existing ownership/financial rules preserved.
Changes:
- Shared PaymentChooser explains adding funds versus paying for a service, offers wallet/home destinations, labels top-up amount/cancel and unavailable bank specifically.
- Payment page adds explicit تومان beside its heading amount.
- Gateway-disabled error no longer tells a top-up customer to fund the same wallet with itself.
- TopupSheet retains the created intent reference before gateway call so a failed attempt still offers inspection.
- Three PaymentChooser presentation regression tests: top-up with disabled bank, funded order with enabled wallet, insufficient assessment funds with separate recharge action.
Verification:
- app focused payment chooser/wallet adapter/money tests18/18 PASS; initial SSR test import aliases needed explicit mocks, corrected and rerun PASS.
- app typecheck PASS; git diff --check PASS.
- all-API-intercepted browser: TOPUP explanation/unit/no wallet/disabled gateway PASS; ORDER displays funded wallet and emits one wallet-payment POST with idempotency and no client amount, routes to result PASS. No real financial writes.
- intercepted TopupSheet create then gateway503 retains result reference and correct explanation PASS. Initial alert selector also matched Next's empty route announcer; narrowed selector and rerun PASS.
- graphify AST update PASS (10263 nodes/29406 edges), prior unrelated parser warnings remain.
No real purchase/top-up/cancel/ledger/provider/schema/API changes, no gateway enablement and no incomplete final task commit. Live owner-session bank/payment acceptance remains separate; safe next action is user's actual order/service checkout with its own intent, not repurposing a TOPUP.

## F12-FE01 — Notification FINANCIAL category crash

Reviewed at: 2026-10-19 Asia/Tehran
Batch: CLIENT-INTEGRATION; Codex /root sole writer/reviewer; full integration remains REWORK/unchecked.
Cause: backend NotificationCategory enum and WALLET_CHANGED outbox include FINANCIAL, while frontend's manual union/icon map/settings labels contained only REMINDER/TREATMENT/CONTENT/SYSTEM. Direct destructuring crashed on a financial notification. The same settings lookup would fail.
Changed files:
- apps/app/src/lib/follow-up-api.ts: include FINANCIAL in the known notification category union.
- apps/app/src/lib/notification-presentation.ts: shared exhaustive known-category icon/style/label/description and own-property guarded SYSTEM fallback for unknown/missing/prototype-named categories.
- apps/app/src/app/(app)/notifications/page.tsx: use safe presentation; preserve title/body/read actions, decorative icon hidden from assistive technology.
- apps/app/src/app/(app)/profile/notifications/page.tsx: same safe financial label/description mapping.
- apps/app/src/lib/notification-presentation.spec.ts:12 regression cases.
Verification:
- focused notification-presentation + follow-up API tests15/15 PASS.
- app typecheck PASS; git diff --check PASS.
- Fully intercepted browser fixture renders all5 known categories plus FUTURE_CATEGORY and constructor:7 cards, zero pageerror events. Marking financial read updates unread7→6. Financial preference PATCH retains category FINANCIAL and false setting. PASS; no real patient notifications or preferences mutated.
- Graphify AST update performed; existing unrelated SQL/HCL/backend parser warnings remain.
No API/schema/provider/dependency changes; unrelated worktree files preserved. No final commit of incomplete F12-FE01. This notification defect is resolved; existing integration release limitations remain in the prior handoff.

## F12-FE01 — Home notifications bottom sheet

Reviewed at: 2026-10-19 Asia/Tehran
Batch: CLIENT-INTEGRATION; Codex /root sole writer/reviewer; full task remains REWORK/unchecked.
Owner request: show notifications in a panel sliding up from the bottom when Home notification controls are clicked.
Changed files:
- apps/app/src/app/(app)/page.tsx: bell, all-notifications control and recent notification cards open the sheet without leaving Home; reload preview/unread indicator after successful read.
- apps/app/src/components/notifications/notification-center.tsx: reuse existing real notification list/read/read-all/empty/error behavior in full page and embedded mode, including financial/unknown-category safety.
- apps/app/src/components/notifications/notification-sheet.tsx: existing draggable BottomSheet inside native modal dialog; close control, Escape, focus containment and explicit focus restoration; underlying Home stays in place.
- apps/app/src/app/(app)/notifications/page.tsx: thin wrapper around shared center preserves direct route.
- apps/app/src/app/globals.css: button styling for Home notification triggers and transparent native backdrop (existing sheet overlay supplies shading).
Verification:
- app typecheck PASS; production build PASS (46 static pages plus dynamic routes).
- notification-presentation/follow-up targeted tests15/15 PASS.
- fully intercepted browser fixture: all3 Home triggers open on same URL; financial read sends one intercepted read command and clears Home unread dot; standalone notifications route still renders; no runtime errors. Real notification data/preferences unchanged.
- live browser empty account: sheet visual checked; Escape/close/backdrop and drag handle dismissal PASS. Initial focus-return check exposed a gap; explicit restoration added and live Escape/drag reruns return focus to bell PASS.
- git diff --check PASS; graphify AST update performed, existing unrelated parser warnings retained.
No shared BottomSheet behavior changed for other consumers; no API/schema/provider/financial changes. No final commit of incomplete integration task. Home notification sheet is ready for user review.

## F12-FE01 — Home destination design and navigation

Reviewed at: 2026-10-19 Asia/Tehran
Batch: CLIENT-INTEGRATION; sole Codex /root writer/reviewer; full integration remains REWORK/unchecked.
Owner request: improve frontend/design/user journeys on pages reached from Home.
Changed files: shared service-page and PageHeader/resource-state presentation; assessment/couples/program hubs; booking steps1–3; appointments/list/detail; treatment; chat appointment picker; health record/onboarding title; orders/tracking; articles/list/detail; payment; twelve assessment/program/guidance detail frames; assessment-catalog helper/spec; appointment labels; scoped CSS and plan evidence. No unrelated user/protected source, API/schema/provider/dependency or persistent data changes.
Validation: app types PASS; full165 tests/31files PASS; final app build PASS (46 static plus dynamic routes);12 live primary destinations at320/1280 no overflow/pageerror;4 primary390px screenshots/touch44px PASS; fully intercepted populated/empty/error/retry/catalog-version/history/program/booking/selected-treatment/article-share fixtures PASS; view URL and correct back-section fixtures PASS; ten detail404/retry states PASS. Exact scope/results: plan/service-screens-verification.md. No real clinical/financial command executed.
Result: Home-connected services share patient blue/Vazirmatn rhythm, clear next actions, sections, meaningful empty states and return navigation. Store/Wallet existing designs preserved. Version grouping preserves exact identities/languages and does not choose a new clinical version; source publication data remains authoritative.
Known limitations: full real two-account/provider/clinical/legal release remains separate; previously observed missing couple policy and unpublished commercial content are not bypassed. No final incomplete F12-FE01 commit or next batch started. Owner can review UI at current localhost3001.

## F12-FE01 — Remove verbose Home service-process accordion

Reviewed at: 2026-10-19 Asia/Tehran; CLIENT-INTEGRATION; sole Codex /root.
Owner feedback: Home's «مراحل دریافت خدمات چگونه است؟» panel is distracting.
Changes: removed the generic accordion and its CSS; services now have a direct «خدمات سلامت» heading. A small unboxed onboarding link appears only when actual Journey onboarding is incomplete, and disappears after completion. All4 service destinations and the authoritative next action remain intact. No new step card, backend rule, patient write or unrelated source change.
Verification: app typecheck PASS; git diff --check PASS; live390px Home/4links/no old accordion/no horizontal overflow PASS. Fully intercepted Journey fixture incomplete→complete confirms hint appears then disappears and all4 services remain. graphify AST update run. No broad test/build repeat for this reversible presentation refinement. Full F12-FE01 remains REWORK/unchecked; no final task commit.

## F12-FE01 — White product-card refinement

2026-10-19 Asia/Tehran; CLIENT-INTEGRATION, sole Codex /root. Owner explicitly requested frontend-design and supplied retail-card markup. White app/profile/catalog/gallery surfaces, neutral outlined product/recent/offer cards, larger contain images, two-line readable titles, discount badge on offer image and stacked offer prices. Neutral white fallback replaces gray image placeholder. Real catalog price and SKU identity untouched; no synthetic discounts added. Existing TEST_OFFERS rail remains display-only/unconnected, disclosed to owner. Protected slider-data.ts/justforcheck.md and unrelated .gitignore preserved.
Verification: app typecheck PASS;31 files/165 tests PASS; build PASS. Live320/390/1280: no horizontal overflow, white shell/frame/cards and44px favorite; detail link identity and white gallery/no gradient PASS; Home white shell/frame PASS. Last gallery CSS-only follow-up verified live after build. graphify AST update run; known SQL/HCL/backend parser warnings independent. Evidence/screenshots: service-screens-verification.md. Same F12-FE01 remains REWORK/unchecked; no final task commit or new batch.

## F12-FE01 — Owner-supplied price fonts

2026-10-19; sole Codex /root; same CLIENT-INTEGRATION frontend/assets scope. Added exact owner-supplied IRANSansFaNum and IRANYekanX Regular/Medium binaries, local @font-face/font-display:swap, reusable family tokens/utilities. IRANSans active for shared store prices/old offer prices/service prices/wallet amount; Yekan registered only. Provenance/hashes in public/fonts/README.md, no runtime remote font dependency.
Verification: WOFF signatures and browser FontFaceSet load/check all3 PASS; live320/390/1280 no price/page/catalog overflow; screenshot visually reviewed. git diff --check PASS; graphify AST update run. No broad tests/build repeat for reversible CSS/assets; no money/API logic or patient write changed. Full F12-FE01 REWORK/unchecked, no final task commit.

## F12-FE01 — Overflow-aware product-rail arrows

2026-10-19, sole Codex /root, same CLIENT-INTEGRATION write-set. Shared StoreCollection uses existing scroll edge state for overlaid previous/next44px native buttons with Persian labels/aria-controls; hide exhausted direction, render none for fitting content. RTL-aware existing move preserved, cancels inertia. Removed unused old control CSS, no dependencies or backend/patient writes.
Verification: typecheck/diff PASS; live390px assertions start→middle→end→Enter back→start PASS;320/1280 resize/no page overflow/44px buttons PASS; separate temporary DOM single-product no-arrows PASS. Screenshots visually reviewed; graphify update run. No broad test/build repeat. Evidence service-screens-verification.md; F12-FE01 remains REWORK/unchecked, no final task commit.

## F12-FE01 — Friendly session loading/error presentation

2026-10-19; sole Codex /root; same CLIENT-INTEGRATION frontend scope. SessionStatus now shows heart/orbit checking state and colloquial Persian copy, static unavailable with retry and dedicated anonymous redirect copy. White/minimal layout, status/alert semantics, reduced-motion support; no auth-manager behavior/security/API change.
Verification: typecheck/diff PASS; fully intercepted browser initial wait→503→retry wait→503 PASS,2mock refreshes/no pageerrors/no real API writes;320/390/1280 no overflow and reduced-motion animation none PASS. Screenshots reviewed, graphify update run, targeted session.test.ts7/7 PASS. Evidence service-screens-verification.md. Full F12-FE01 REWORK/unchecked; no final task commit or broad build repeat.

## F12-FE01 — Remove duplicate splash, minimal session dots

2026-10-19; sole Codex /root, same CLIENT-INTEGRATION. Owner rejects previous large session illustration and branded splash. Removed AppShell SplashScreen/timed2.4s delay, deleted unused component and splash UI state. Session pending now3 small brand-blue dots on white, SR label/status and reduced-motion; real error/retry/auth-manager policy preserved.
Verification: types/7 session tests/build PASS; intercepted auth wait→success→profile data wait→profile→store proves1 refresh/no second fullscreen loader/no old tagline via MutationObserver/no pageerror;503→retry→503 PASS. Screenshot reviewed, diff check PASS, no stale splash references. graphify update run. Evidence service-screens-verification.md; full F12-FE01 REWORK/unchecked, no final task commit.

## F12-FE01 — Owner-requested scoped commit handoff

2026-10-19, sole Codex /root. Owner explicitly requests committing all uncommitted work in related sections, superseding earlier instructions to leave reviewable changes uncommitted.13 implementation/config commits plus one documentation handoff, same F12-FE01 scope. Final combined gate:31 files/165 tests PASS, production build/TypeScript/46 static pages PASS, whitespace and explicit staged-path ownership PASS. Full task remains REWORK/unchecked; checkpoints do not claim external/two-account/provider/clinical/legal acceptance. Existing .gitignore additions preserved verbatim in dedicated chore commit; protected slider-data.ts/justforcheck.md untouched. No remote push or deployment.

Commit hashes, messages, changed-file lists and next safe action: [handoff](client-integration-commits-2026-10-19.md).

## F12-FE01 — Profile-only IRANYekanX preview

2026-10-19; sole /root, same CLIENT-INTEGRATION. Owner asks to preview installed Yekan fonts only on /profile. Added existing font-iranyekanx utility to profile root and removed percent-only Digikala override. Home and global typography untouched. Browser check used a fresh temporary tab with all /v1/** intercepted after live authenticated Home failed to appear; no real patient write. FontFaceSet400/500 PASS, computed h1/menu IRANYekanX,320/390/1280 no overflow, Home computed family before/after identical. Screenshot .playwright-mcp/profile-iranyekan-preview.png visually reviewed. git diff --check PASS; graphify AST update PASS. No broad tests/build repeat for two presentation-class edits; no automatic new commit. F12-FE01 remains REWORK/unchecked.

## F12-FE01 — Refine oversized profile Yekan typography

2026-10-19; owner rejects large/heavy preview. Same /root profile-only frontend scope. Title22→18px, name18→16px, menu14→13px, percentage24→20px. Heavy weights replaced by Medium. Browser exposed global --font-weight-medium600; profile-local token now500 so installed actual Medium face is used instead of600/700/800 synthesis. Hints stay legible12px; body Regular unchanged, Home/global token untouched. Fully intercepted browser computed18/16/13px and500 PASS;320/390/1280 no overflow, screenshot profile-iranyekan-refined.png visually reviewed. diff check and graphify AST update PASS. No broad tests/build repeat for typography-only edits; no new commit, F12-FE01 REWORK/unchecked.

## F12-FE01 — Wallet text/amount font pairing

2026-10-19; sole /root, same CLIENT-INTEGRATION wallet UI scope. Owner asks wallet cleanup and appropriate fonts. Chosen Yekan Regular/Medium400/500 for copy; IRANSansFaNum Regular400 for balance, signed ledger amounts, remaining balance, topup input and suggested amounts. White outlined balance surface replaces gradient/decorations; moderate24–32px balance/24px input,44px refresh/topup control. Direction/isolation/wrapping preserves full amounts, no financial/API flow change. Existing profile preview preserved.
Verification: typecheck and23 wallet-money/labels/API/payment-chooser tests PASS. Fully intercepted browser balance+credit/debit+rial remainder, loaded/computed family and400 amount weight PASS; topup input۵۰۰۰۰۰→۵۰۰٬۰۰۰ PASS.90071992547409935 rial displays exact BigInt/10 toman (beyond safe Number),320/390/1280 no overflow;0 payment writes. Wallet/topup screenshots visually reviewed, including settled animation. diff check and graphify AST update PASS. No broad build/test repeat needed; full F12-FE01 REWORK/unchecked, no new commit.

## F12-FE01 — Store design/UX audit, no implementation

2026-10-20 Asia/Tehran; sole /root. Owner invokes frontend-design/design-taste-frontend/ui-styling/ui-ux-pro-max/web-design-guidelines to audit entire store. Current guidelines fetched; local UX rules consulted; code/brand/IA inspected. Live store/PDP320/390/1280; temporary all-API-intercepted search ordering,45-total/20-page listing, selected delivery/cart/checkout scenarios.20 findings (5P1) with exact source lines, reproduction/evidence class, fixes and scope limits. Search old response overwrites new query, pagination absent, selected address reset and keyboard modal escape reproduced; hidden nav focus and desktop720px measured. No real payment/order/address write and no product code changes; existing uncommitted profile/wallet work preserved. No broad tests/build repeated for read-only audit. Full report: [store audit](../store-design-audit-2026-10-20.md). F12-FE01 REWORK/unchecked; next safe action is fixing the prioritized issues within this same batch when authorized.

## F12-FE01 — First store audit fixes01–05

2026-10-20 Asia/Tehran; sole /root; owner authorizes initial fixes, same CLIENT-INTEGRATION batch. Removed public test offers/promo, request-generation guard and real20-item pagination, shared user-scoped delivery preference validated against current address list, native modal BottomSheet and notification-wrapper migration. Shared address-form Escape listener removed to preserve dirty confirmation. Prior profile/wallet changes and protected files preserved.
Review: types/32files170tests/build PASS;6/6 deterministic desktop/mobile Playwright tests PASS (catalog45=20/20/5, late search response, error503, selected/deleted address, focus/Escape, notifications/topup/dirty address confirmation). No real order/payment/address write. Visual320/390/1280 no overflow; first real card~407px on mobile without published hero, versus~1008px in prior audit. Fixture banner schema corrected during visual check, final0pageerrors. graphify update/diff PASS; final one-line keyboard-handle/trigger semantics checked separately after build.
Evidence and remaining06–20: [store audit](../store-design-audit-2026-10-20.md). Full F12-FE01 remains REWORK/unchecked, no final task commit/new batch. Next safe scope: URL state, coherent desktop/store typography/shortcut assets and checkout form/summary; do not imply missing backend commerce fields exist.

## F12-FE01 — Storefront completion and ordered16 Mezaj collections

2026-10-20, sole /root; same CLIENT-INTEGRATION batch, explicit owner extension to16 primary/secondary pairs. Preserve previous profile/wallet/store edits; protected slider-data.ts/justforcheck.md untouched. Completed URL/catalog/desktop/SKU/address/summary/price/metadata/hero/error/navigation findings with current API boundaries; detailed finding dispositions and remaining content/sort limitations: [store audit](../store-design-audit-2026-10-20.md).

New additive commerce tables and contract: [commerce-mezaj-v1](../commerce-mezaj-v1.md). Exact immutable MEZAJ version+band → ordered pair → bounded ordered active products. Four codes × four, including repeats; reverse pairs independent. Admin matrix/editor with source/product paging, enable/reorder/remove, revision conflict recovery and draft preservation across token refresh. Same-clinic compound FKs/checks, serialized config writes, batched source lookups, medical read audit and no-store self endpoint. Latest accessible result/provenance/review/paid-withdrawal policy checked; no answer/score selection, no clinical scoring change, no inferred classifications or product assignments. Store renders personalized products before generic discovery, with real missing/review/error/config states.

Verification: isolated PostgreSQL74 migrations/additive upgrade preserves seeded catalog;27 new feature API cases +1 catalog regression =28/28 PASS; Prisma no drift. All16 mappings, reverse order, patient isolation, roles, exact source, unsupported/review/unmapped latest result, stale/concurrent config, inactive products, disabled collection, DB code constraints and audit checked. API source/test types, generated client freshness/build/5 tests PASS; no semantic changes to existing OpenAPI paths/schemas. App176/176 and dashboard152/152 tests PASS. App46 and dashboard32 static-page production builds PASS. Browser14/14 general storefront/checkout/receipt/modal regressions and6/6 Mezaj app/dashboard scenarios PASS; final small copy/account key/mobile table focus+scroll changes rechecked with browser. All browser commerce commands mocked/intercepted; no real patient/order/payment write.

Local migration status showed only20261020010000 pending; deploy applied that additive migration successfully after isolated verification. Existing live API docs exposes the new endpoint. Personalization collections remain unconfigured until qualified product/source assignments are entered; no clinical seed invented. Ordinary live public catalog200/4cards/0 pageerrors/mobile no overflow verified. Graphify AST update/diff review performed; existing SQL/HCL/chat parser limitations retained. Full task remains REWORK/unchecked for broader real-account/provider/clinical/legal acceptance, no final task commit or new batch.

Final review follow-up: replaced per-source DB reads with bounded batch lookups and reran isolated28/28/no-drift gate PASS. Scoped dashboard ESLint exposed new render-ref/synchronous-effect setters; moved token ref synchronization to an effect and used request-key/page-bound async responses plus event-driven config reset, retaining draft isolation. Targeted ESLint, dashboard types and2 desktop/mobile editor regressions PASS, including reaching the far edge of the16-cell table. No suppression/bypass or unrelated cleanup. Small frontend refinements after production build were verified by these targeted checks; no broad build repeat required. Existing OpenAPI paths/schemas have zero semantic diff; generated order changes are registration order only.

## F12-FE01 — Home blue-brain glass checkpoint

Task ID: F12-FE01
Completed checkpoint: 2026-10-20, Asia/Tehran
Agent/reviewer: Codex /root; no subagents
Batch: existing CLIENT-INTEGRATION; full task remains REWORK/unchecked.

Owner approved the reviewed Home design with a compact mobile hero, blue-brain
identity art, unchanged Journey/data/functions/font and browser screenshot delivery.
Changed files: apps/app/src/app/(app)/page.tsx, apps/app/src/app/globals.css (Home
selectors only), apps/app/src/components/layout/app-shell.tsx (exact-root class),
apps/app/public/images/home/blue-brain-original.jpg and provenance README, and
coordinator STATUS/phase/evidence. Preserved pre-existing couples page/new component
and CSS files; protected slider-data.ts and justforcheck.md untouched. No API,
schema, provider, dependency, auth or clinical/financial business-rule changes.

Image: source and shipped JPEG SHA-256 both
1df66d327c9e3a09b3081dbb2a888b8a20c09902c66bfb7099700fc60b7d2616;
720x1280,191690 bytes. Original source preserved, copied byte-for-byte; no derivative,
crop, recompression, background removal, generated detail, blur or opacity reduction.
Full image uses contain with natural aspect ratio. Blank top/bottom canvas is
accounted for by negative layout margins without clipping; all image bounds stay
inside the hero at every checked width. Cream #f6f1ed background matching extends
beyond the image into the glass/ice surface. Browser inspection found no distinct
rectangular photo boundary after correcting the matte transition; the original
fine background texture remains. Glass blur is behind the opaque image, not on it.

Presentation: native RTL two-column status/action and complete brain on mobile,
348px hero for the ordinary resume state at320/390; longer real copy grows naturally
(390px viewport: longest consent-unavailable440.6px, error412.6px, loading358px).
No arbitrary fixed height/truncation. Desktop exact-root frame1120px, hero1040x528px,
text right/image left. Follow-ups precede services; desktop has adjacent sections.
All service/access/store/article destinations, show-more5-to7-to5, recent notification
limit3/article limit2, unread label and notification bottom sheet remain intact.
Profile summary uses the same real counts/isComplete as compact text, no health score.

Verification:
- corepack pnpm --filter @sabz/app typecheck: PASS (initial and final).
- corepack pnpm --filter @sabz/app build: PASS,46 static pages.
- Default test command:173 tests passed,33 files passed; billing/payment-chooser
  suite fails before collection resolving @/components/shared/bottom-sheet.
  HEAD already contains that import; Home changes do not touch its callers/tests.
- Temporary ignored .playwright-mcp/home-vitest.config.mts adds only the missing
  @ source alias and retains original test exclusions:34 files,176/176 PASS.
  No product or committed test configuration was changed to hide this limitation.
  An earlier temporary spec-only selection passed140 tests; this is superseded by
  the complete176-test run above.
- Live Home inspected at390x844 and1440x1000 including lower service/access/store/
  notification areas; source data loaded without clinical/financial commands.
- Fully intercepted browser contexts:320/390/600/768/1280/1440 no horizontal overflow,
  original720:1280 ratio preserved, complete image inside card, filter none/opacity1,
  text/image columns separate, Vazirmatn unchanged and three navigation links.
- All17 Journey nextAction codes resolve to their existing exact-resource routes.
- Loading/busy/named heading/image retained;503 error/retry recovers; empty and
  populated previews; show-more aria-expanded; content limits and service URLs PASS.
- Notification sheet open/Escape/return focus PASS; visible keyboard outline2px.
  At320, visible Home links/buttons all meet44px minimum in each dimension.
- Profile navigation has no patient-home-shell class, retains720px frame max and
  its existing IRANYekanX family. Store/root route logic unchanged by inspection.
- Synthetic browser contexts:0 pageerrors,0 unexpected requests,0 resource mutation
  commands. Live browser's only console error is the existing favicon.ico404.
- git diff --check PASS. Main review: combined Home diff/data boundaries/assets/
  scoped CSS/ownership PASS. graphify update . PASS (AST-only,no LLM),10507 nodes;
  existing SQL/HCL dependency/chat parser warnings remain unrelated.

Screenshots, rendered and visually reviewed:
.playwright-mcp/home-brain-mobile-final.png
.playwright-mcp/home-brain-desktop-final.png
.playwright-mcp/home-brain-lower-desktop.png

Limitations: default Vitest alias setup remains a separate pre-existing issue;
no native screen-reader/device certification or real patient/financial mutation.
No final F12-FE01 task commit because broader real-account/provider/clinical/legal
acceptance remains incomplete. Continue only the existing CLIENT-INTEGRATION batch
when authorized; this checkpoint does not start the next roadmap task.

## F12-FE01 — Integrated Home corrective visual review

Checkpoint date:2026-10-20,Asia/Tehran. Existing CLIENT-INTEGRATION,sole Codex /root
writer/reviewer,no subagents. Owner explicitly rejected the preceding Home visual
checkpoint; this entry supersedes that visual result, without rewriting history.
Full roadmap task remains REWORK/unchecked; this slice is ready for owner review.

Scope: existing Home page and Home CSS/exact-root shell presentation; image assets
and provenance; coordinator evidence/status. No API/schema/authorization/provider/
clinical/scoring changes. Pre-existing couples diff remains101 added/89 removed
with its two untracked files preserved; protected slider-data.ts/justforcheck.md
untouched. The original Home service/access routes and notifications interactions
remain available. homeActivities and its tests/domain/API data were not deleted;
only the independent activity section/render state/import was removed as requested.

Visual changes: every Home surface shares ice white/light blue/teal; removed cream
matte matching entirely. Main card has translucent43% surface, actual backdrop blur/
saturation, independent blue/cyan luminous layers behind it, reflective inset rim
and restrained shadow. Image/text/button have no blur/mask/opacity reduction. Mobile
copy spans the full312px inner width at390; action and complete brain share the lower
row. Desktop copy525.6px,brain302px. IRANYekanX existing local Regular400/Medium500
used only for Home (including root dock labels); no global font registration/root
layout edits. Short action labels preserve full accessible names and exact Journey
URLs. Personal access is now directly after hero, a shared glass hub with3x2 mobile
and6x1 desktop icon destinations, rather than a row list/repeated standalone cards.
Services4 cards, store, notifications and articles receive coordinated surfaces.

Image investigation/preparation: original720x1280 JPEG contains blue subject pixels
at x=0,y407–555 and x=719,y457–652. Its lateral silhouette is already truncated; old
contain CSS was not the cause. Original SHA256 still
1df66d327c9e3a09b3081dbb2a888b8a20c09902c66bfb7099700fc60b7d2616.
Using built-in imagegen edit with the actual brain as reference, prepared a separate
transparent decorative illustration including reconstructed lateral contours. This
is explicitly not recovery of missing medical information or a pixel-preserving
cutout. blue-brain-complete.png1161x1355/RGBA/2054649bytes, SHA256
036dcb03df4aecf8a6fbe7f5a4a849f534110011bb35c84cd7ae40b7e94c2627.
Solid alpha bounds(19,92)–(1143,1315); all corners alpha0. Whole silhouette/stem fit;
no cream box. Output copied without further crop/recompression/format changes.
Prompt, built-in tool mode, original and derived provenance documented in
apps/app/public/images/home/README.md. Original remains intact as reference.

Verification:
- App typecheck PASS; production build PASS (46 static pages).
- Existing complete176 tests/34 files PASS with the previously documented external
  ignored alias-only Vitest configuration. Native test-config alias limitation from
  the earlier checkpoint remains; no unrelated billing/test-config fix included.
- Responsive320/390/600/768/1280/1440:0 overflowing elements, image ratio1161:1355
  preserved, all image bounds inside card, no image/text/action overlap, opacity1,
  filter none, contain. Consent state hero390px at320,418.75px at390,498.45px desktop.
- All17 Journey actions tested at320/390/1440 (51 combinations), exact owned URLs
  retained, no overflow. Found one two-line CTA at390, shortened to 'پیش‌نیاز رزرو';
  focused recheck confirms46px single-line button at original destination.
- Independent 'پیگیری‌های شما' absent even with owned pending-payment data; original
  Journey nextAction controls remain. Six access hrefs/four service destinations
  unchanged; content limits3 notifications/2 articles preserved with long titles.
- Both local IRANYekanX400/500 faces loaded; computed Home family confirmed. Profile
  remains outside Home shell at720px max with its existing font. Scope inspection
  confirms no Store/other route style changes.
- Loading/busy/heading/brain retained;503/retry recovery PASS; populated/empty content
  inspected. Notification sheet open/Escape/return focus PASS. All visible Home
  targets>=44px;19 sequential keyboard focus positions clear the fixed dock.
- Contrast: white/action4.88:1,muted/ice5.09:1,ink/ice10.19:1.
- Fully intercepted fixtures:0 pageerrors,0 unexpected endpoints,0 real mutation
  commands. Live view has no runtime errors; shared global Vazirmatn preload now
  warns unused on Home because Home uses Yekan; global preload retained for other
  routes rather than changing shared layout outside this scope.
- Main review of source/assets/real-data boundaries/route isolation PASS. Compared
  whole-page captures with owner references: cool palette, translucent lit surfaces,
  integrated complete anatomy artwork, subtle typography, no fake charts/scores or
  imported UI screenshots. Prior cream panel and narrow stacked-copy layout removed.
- graphify update . PASS,AST-only/no LLM:10510 nodes,30130 edges; existing SQL/HCL/chat
  parser warnings retained. git diff --check PASS.

Visually reviewed final screenshots (actual local UI/current API state, not a mockup):
.playwright-mcp/home-integrated-mobile-final.png (390x844)
.playwright-mcp/home-integrated-desktop-final.png (1440x1000)
.playwright-mcp/home-integrated-mobile-full-final.png
.playwright-mcp/home-integrated-desktop-full-final.png
Full-page captures expand only browser viewport height to1883/1576 respectively,
so the app's real inner scroll content is visible together; no production styles
or screenshot pixels changed. Normal-height viewport checks were performed first.

No new batch/final task commit; remaining full F12-FE01 clinical/legal/provider/
real-account acceptance and native test-alias repair stay separate. Next safe action:
owner reviews this complete Home design; continue only the current authorized batch.

Home reload removal (2026-10-20),same F12-FE01 /root: owner requests removal of
hero reload button. Removed control/unused RefreshCw import and orphan Home refresh
styles; Journey load and error retry remain. Types/diff-check PASS; live browser
confirms0 reload buttons, retained next-step label/action. Full task remains
REWORK/unchecked; no new batch/final commit.

Shared glass bottom navigation (2026-10-20),same F12-FE01 /root: owner explicitly
extends scope to every existing bottom-nav consumer. Promoted Home dock appearance
to shared navigation, removed Home-only overrides/inline Vazirmatn, unified IRANYekanX
and500 labels, ice active pill, muted/active colors,24px radius/white border/shadow.
Background56% (previous Home82%) and actual28px backdrop blur. Max720px centered
nav makes desktop width identical across Home/store/profile without widening pages.
Preserved links/current-page marker, cart badge, hidden tabs, product-page exclusion,
44px+ targets, reduced motion/focus and safe-area bottom padding.

Browser inspection caught CSS prefix-normalization dropping backdrop-filter when
standard declaration preceded its WebKit alias. Reordered WebKit first/standard
last; computed blur now blur(28px),not none,in all three routes at390 and1440.
Same background/font/radius,390 mobile/720 desktop nav width (dock366/696), correct
active labels/hrefs and0 overflow confirmed. Image/text/icon content is not blurred.
No page theme/font outside the navigation changed. Typecheck/diff-check PASS;
graphify update . PASS (no topology changes; existing parser warnings). No broad
build/unit repeat for CSS/inline-font-only change. Evidence screenshots:
.playwright-mcp/shared-glass-home-final.png
.playwright-mcp/shared-glass-store-final.png
.playwright-mcp/shared-glass-profile-final.png
Full F12-FE01 remains REWORK/unchecked,no new batch/final task commit.

## F12-FE01 — Home payment follow-up context and cancellation review (2026-10-20)

Owner reported missing wallet payment and an apparently retained cancelled Home action. Same CLIENT-INTEGRATION /root ownership; no new batch, backend or financial-rule change. Read-only owner IAB verified supplied original intent as TOPUP/CANCELLED, while Home action href pointed to a different intent. No actual payment/cancellation was performed by the agent. TOPUP intentionally excludes WALLET (billing-gateway.service.ts methods, billing.service.ts payWallet); cancellation sets CANCELLED atomically; Journey selects only nonexpired PENDING intents, newest first. The repeated generic action hid the resource change, rather than evidence of failed cancellation.

Implemented: Home resolves the exact Journey resourceId against pendingPayments, displays its real purpose/amount, distinguishes top-up CTA/bank explanation and explains multiple pending requests (bounded count honors hasMore). Missing match falls back without selecting another intent. Cancelled wallet-pay page now confirms the authoritative status and provides an explicit Home/next-step link. Domain priority, routes, money, wallet policy and other page behavior retained.

Verification: app typecheck PASS;17 focused Home/PaymentChooser unit cases PASS. All-API-intercepted desktop1440/mobile390 browser flow PASS (2 cases): failed cancellation cannot show success, successful cancellation removes chooser, return Home advances to the other intent/amount, final cancellation removes payment action for Journey's next action; no horizontal overflow. Screenshots reviewed: .playwright-mcp/home-payments-pending-{desktop,mobile}.png, home-payment-cancelled-{desktop,mobile}.png and home-payment-{desktop,mobile}.png. Test fixture-only assertion ambiguity fixed; final scenarios PASS. No real account balance or financial data altered. Unrelated couples edits and protected files preserved. Broader F12-FE01 REWORK/unchecked, no final task commit.

## F12-FE01 — optional top-up excluded from Home next action (2026-10-20)

Owner clarified that an already funded wallet must not be pushed to recharge. This supersedes the prior presentation-only correction: the defect was Journey prioritizing any live billing intent, including voluntary TOPUP, as the required next action. Same CLIENT-INTEGRATION /root scope extended before edits to the existing Journey service/tests/contract. No financial policy, balance, provider, schema or authorization change.

PatientJourneyService now independently selects the newest owned nonexpired PENDING non-TOPUP intent for its existing payment priority slot. Selection occurs in the same repeatable-read/audited transaction and is independent of capped preview lists, so six newer top-ups cannot hide an actual service/order payment. Existing pendingPayments still includes voluntary top-ups; none are auto-cancelled or rewritten. Remaining priorities and response shape unchanged. Contract clarification records explicit owner correction.

Verification PASS: API source and test TypeScript checks; app typecheck;15 actual PostgreSQL Journey integration cases, including funded/zero wallet with pending top-up and preserved balance/status, non-TOPUP payment behind six top-ups, cross-patient isolation and terminal exclusion. Replayed all74 migrations and seed in a newly created guarded patient_journey_topup_regression on the existing task-owned localhost55419 container; used WalletService ledger entries for funded synthetic fixture, never bypassed ledger constraints. New disposable DB removed in finally; main5432/accepted proof DBs untouched. Existing stopped same-task test container started; no other service restarted. Two intercepted desktop/mobile browser cases PASS: funded WALLET remains offered for an order, rejected cancellation cannot show success, confirmed cancellations advance, remaining TOPUP does not retain payment CTA. No actual payment/cancellation/provider calls. Live owner IAB read confirms Home now shows VIEW_ASSESSMENT_RESULT instead of recharge. API dev emitted code contains correction. Reviewed scope/diff and preserved unrelated couples/Home design work and protected files. AST graph updated; known existing parser warnings unchanged. Broader F12-FE01 remains REWORK/unchecked; no new batch/final task commit or full-production/payment acceptance claim.

## F12-FE01 — compact Home personal access scroll (2026-10-20)

Owner requested scroll instead of squeezing all personal-access links into the card at narrow sizes. Home-only CSS now uses one native RTL horizontal grid rail with minimum104px item width, thin visible scrollbar, proximity snapping and padded focus outlines. Items share free space when wide enough; no arbitrary breakpoint forces squeezing or wrapping. No markup/data/destination/shared-navigation change. All unrelated pending edits preserved.

Browser PASS at320/390/600/768/1440: single row, narrow rail overflows inside card only, desktop all six fit, page never overflows horizontally; all six exact destinations retained, Tab reaches final offscreen item and brings it fully into view. Reviewed .playwright-mcp/home-access-mobile.png and home-access-scrolled-mobile.png. Verification script/config ignored under .playwright-mcp; no permanent test added for this reversible CSS change. Diff whitespace PASS. Same CLIENT-INTEGRATION /root; full F12-FE01 REWORK/unchecked, no final task commit/new batch.

## F12-FE01 — Store cart icon and responsive search hint (2026-10-20)

Owner requested clearer Store cart icon and smaller responsive search placeholder. Public Store header now uses Lucide ShoppingCart23px/1.75 stroke; existing cart href, count badge and accessible name preserved. Store-only search container sizing drives placeholder12–15px with normal400 weight; entered text stays16px to retain mobile input readability/avoid focus zoom. Other inputs unchanged.

Checks PASS: app typecheck; browser320/390/768/1440 confirms new icon/exact cart destination, placeholder scales and complete text measures within input at every width, no horizontal page overflow, typing/clear still works. Reviewed .playwright-mcp/store-header-390.png and store-header-1440.png. Native API intercepted in verification; no real writes. Diff whitespace PASS; AST update run. Same F12-FE01 /root; unrelated/protected edits preserved, full task REWORK/unchecked, no final task commit/new batch.

## F12-FE01 — owner-requested session commits (2026-10-20)

Owner explicitly requested committing the completed reviewed session changes. Recorded as scoped checkpoints, without marking the broader F12-FE01 production task DONE. Payment/optional-top-up flow committed separately as5694950; Home design/assets/responsive access and shared frosted navigation as810f4e6. Final Store icon/search polish and cumulative session evidence are recorded in the following scoped commit. Final app unit run:34 files/178 tests PASS using the previously documented external alias configuration; prior API/test/app types,15 isolated PostgreSQL Journey cases, mobile/desktop browser checks and builds remain recorded above. Staged diffs reviewed/whitespace checked. Unrelated existing couples page/component/styles and temporary test-results output excluded; no staging/reset/delete of those paths, no push/deploy. Full F12-FE01 remains REWORK/unchecked for broader acceptance.


## Dashboard archive stage 1 — implemented unverified

Task ID: F12-FE01 (owner-authorized dashboard extension)
Date: 2026-10-20 Asia/Tehran
Batch: CLIENT-INTEGRATION; sole coordinator/writer/source reviewer: Codex /root
Status: IMPLEMENTED_UNVERIFIED — stop for owner visual review; full task remains REWORK/unchecked.

Changed files:
- apps/dashboard/src/app/{layout.tsx,globals.css}
- apps/dashboard/src/components/layout/{app-shell,sidebar,header,notif-panel,command-palette,theme-toggle}.tsx
- apps/dashboard/src/components/shared/kpi-card.tsx
- apps/dashboard/src/features/dashboard/{dashboard-page,revenue-panel}.tsx
- apps/dashboard/public/fonts/vazirmatn/{Vazirmatn-Variable.woff2,OFL.txt,README.md}
- Coordinator plan STATUS/checklist/this handoff.

Implementation: adapt archive white/zinc/crimson tokens, local variable font and glass/grid/aurora shell; retain every NAV destination and ADMIN session/authorization; desktop collapsible navigation, native modal mobile drawer and Ctrl/Cmd+K page search; light/dark/system theme and reduced-motion CSS; existing real notification panel retained with Escape/focus handling. Keep the dashboard operational across the clinic, assessments, treatment and commerce. Home preserves all previously displayed daily metrics, today's bounded appointment preview and recent appointment activity, and adds visual presentation of existing patient/treatment aggregates. No mock archive data/scripts or invented trends imported.

Data/source review: unchanged loadDashboardHomeReporting retains six existing parallel real requests and its authorization/error behavior. The independent range chart starts concurrently and uses existing getCommerceRevenue + generated CommerceRevenueDto for 7/30/90 calendar days with daily buckets. Backend source confirms series contains only event-bearing dates; plot uses actual date spacing, has an empty state, distinguishes reporting freshness and exposes exact amounts in a table. Financial displays remain BigInt; Number is used only for bounded plot coordinates. Existing Recharts dependency inspected; archive-like SVG/CSS implemented without a new package. Shared KpiCard caller in Billing reviewed at source level. Archive, backend, schema, generated client, lockfile, auth/session and future feature screens not modified. Unrelated patient/couple/protected paths not touched.

Executed: source/diff/contract inspection only; existing dashboard development listener identified at localhost:3002 and API listener at :3003. No test/typecheck/lint/build, browser automation, graph rebuild/update, migration, data write, commit or final acceptance.

Deferred verification (explicit owner instruction; no PASS claimed):
- Owner visual comparison with archive, then necessary refinements.
- Dashboard typecheck/lint/targeted tests/build after implementation and owner review.
- Targeted chart cases: exact large/negative/zero amounts, empty/single/sparse dates, range/request ordering and API failure/forbidden/partial/stale.
- Desktop/mobile/RTL at narrow and wide widths; font loading, scroll/overflow, collapsed navigation, preserved destinations, native dialog focus/Escape, command search, notifications, theme persistence/system changes and reduced motion.
- Source-dependent regression checks for shared tokens and KpiCard consumers; real reporting/permission behavior.

Limits: no runtime or visual verification yet; global tokens also restyle existing feature pages, whose detailed redesign and regression verification remain pending. The appointment preview remains the existing first ten rows; mean wait remains unavailable when not provided. No traffic/device/heatmap/report-builder or fake growth inserted. No provider/banking acceptance inferred from operational revenue. Working preview uses the existing authenticated ADMIN flow; no authentication bypass or synthetic production data.

Next action: owner reviews http://localhost:3002/dashboard. Stop here. After owner feedback, continue products, customers, orders (server-side search/pagination), messages, settings in that order; investigate backend gaps only for the feature then being implemented. Do not close F12-FE01 or create its final task commit before final acceptance and deferred verification.


## Store product workflow — implemented unverified

Task: F12-FE01; batch CLIENT-INTEGRATION; sole writer/source reviewer Codex /root.
Date: 2026-10-20 Asia/Tehran. Status: IMPLEMENTED_UNVERIFIED, owner review pending; overall task REWORK/unchecked.

Owner scope: improve ADMIN /store usability, show whole actual product images with essential information, provide grid/list views and one centered product workspace; expose base-field editing and archived-product recovery. The user-mentioned System Design template was read together with its manifest: it produces a reference DOCX architecture document, so no document was created for this UI request. Previously read frontend/UI/token/React guidance reused; relevant NestJS guidance read for the narrow lifecycle addition. No global analysis, Graphify rebuild, SpecKit chain or agents.

Changed this stage:
- apps/dashboard/src/features/store/{product-catalog,product-thumbnail,product-workspace,product-sku-editor,store-page,product-image-editor,product-content-editor}.tsx
- apps/dashboard/src/features/store/catalog-view.ts (shared editor-state type only)
- apps/dashboard/src/features/store/product-catalog.spec.tsx (adapt existing source expectations; not run)
- apps/api/src/modules/commerce/catalog/admin-commerce-catalog.service.ts (ARCHIVED -> DRAFT only)
- apps/api/test/admin-commerce-catalog.integration.spec.ts (restore/denial/direct-republish/persistence assertions; not run)
- coordinator STATUS, phase checklist and this log. Prior shell/Home changes retained.

Source review and behavior:
- Grid is the default, with an explicit list toggle. Real protected admin image preview is fetched lazily for visible products with current session transport; blob URLs are revoked and requests aborted on unmount/replacement. object-contain preserves the full image; explicit absent/unavailable states replace invented imagery. Cards/rows show actual category, lifecycle/content status, active-SKU minimum price and physical/free/reserved inventory. Image/name/manage controls open the same product workspace.
- One native dialog owns focus/Escape and contains base fields, image, editorial content and SKU/inventory. Heavy editors load on first visit and remain mounted when switching sections so unsaved input/file selection is preserved. Parent observes actual child busy/dirty/unresolved state; in-flight operations cannot be abandoned and unsaved dismissal requires an explicit choice. Existing image controller, ETags/idempotency/session handling and content revision/source/explicit approval semantics are reused; no nested modal is opened in embedded mode.
- Base fields use the existing typed product PATCH for title/slug/category; descriptions and all supported editorial details remain in the content section to avoid competing description drafts. SKU editor exposes code/title/active status/price/tax, separate stock-ledger adjustment and new SKU creation inside the same workspace. Newly created products continue directly to their own inventory section rather than a different store tab. Existing category/shipping/Mezaj/global inventory capabilities remain.
- Verified from current service source: base-field editing already existed; archived recovery did not. The transaction/clinic lock/audit/ADMIN authorization remain unchanged. The sole new lifecycle edge is ARCHIVED -> DRAFT, not ARCHIVED -> ACTIVE; explicit subsequent activation and independent content approval remain. Existing DTO/OpenAPI enum and PATCH request/response shapes are unchanged; no schema/migration/generated-client/package change needed.

Executed: focused source/diff/contract/caller inspection only. No tests, typecheck, lint, build, automated browser verification, Graphify update, real product/media/financial write or commit. Test-source updates are unexecuted and are not evidence of a passing gate.

Deferred: owner visual/interaction review; targeted API PostgreSQL lifecycle + authorization/audit/preservation suite; dashboard types/lint/catalog/editor/controller regressions/build; desktop/mobile/RTL card/list and protected-image loading; complete modal base save, content revision/conflict/approval, upload/replacement/removal/unknown-outcome, SKU edit/create/stock reservation and cross-section draft/close/focus regression. Prior dashboard deferred gates remain pending too.

Limits: product search and category/status filters still apply to the currently fetched server page and are labelled accordingly; existing server pagination remains available. The backend's real image contract supports one primary image, not an invented gallery. Saving stays explicit per section, and stock remains a separate authoritative ledger action; no claim of an atomic save across APIs. No runtime success or owner acceptance claimed.

Next action: owner reviews http://localhost:3002/store; refine from that feedback. Do not mark DONE or create the final task commit before owner acceptance and deferred verification. No automatic continuation into CRM/orders/messages/settings in this run.

## Assessment administration — implemented unverified

Date: 2026-10-20 Asia/Tehran. Task F12-FE01, batch CLIENT-INTEGRATION, sole writer/source reviewer Codex /root. Explicit owner extension into /assessments; shell/store work preserved. Status IMPLEMENTED_UNVERIFIED; overall task REWORK/unchecked. No new batch or final commit.

Changed:
- apps/dashboard/src/features/assessments/assessments-page.tsx; new assessment-authoring.ts, assessment-builder.tsx, assessment-connections.tsx, assessment-authoring.spec.ts.
- apps/dashboard/src/lib/assessment-api.ts: generated-contract wrappers and stable error handling.
- apps/api/src/modules/assessments/admin/admin-assessments.controller.ts: only missing list ApiQuery documentation.
- packages/api-client/openapi.json and src/schema.generated.ts: only assessmentKey/status/page/pageSize list metadata. Source generation executed successfully; runtime OpenAPI export/freshness gate deferred because API build remains deferred.
- artifacts/assessment-system-design/assessment-system-design.{docx,pdf}; coordinator status/checklist/log.

Source/contract findings and implementation:
- Previous builder handled SINGLE_CHOICE only in the first section. Existing scalar engine supports five types: SINGLE_CHOICE, MULTIPLE_CHOICE, BOOLEAN, NUMBER, TEXT. Builder now edits every section, question, option, order, required flag, bounded text/numbers, scalar weights/ranges, result bands/risk/review flags. Source fields are retained by spreads. Validation catches duplicate IDs, overlap and gaps across possible scores; unknown schemas are refused rather than downgraded.
- Existing exact version CRUD/duplicate/publish/archive are reused. Published/retired versions are immutable; duplicate creates a draft. Server key/status filtering and pagination replace capped first-page assumptions. Booking policy uses actual published selection, nullable validity and latest-version flag. Actual paged submissions/detail use existing ADMIN privacy contract, with patient links; paid/private contexts are not exposed by bypassing exclusions.
- Schema v2 is intentionally an educational UNREVIEWED draft in backend, not a releasable patient assessment. Real Mizaj preset is loaded from server. UI preserves scoring identity/source/dimensions/profiles, edits question weights and profile text, and calls the real synthetic-only preview with saved contentHash. No scalar-to-dimensional conversion, medical algorithm or patient result is invented. Dimension count/identity stays fixed by the preset; adding a new clinical model is outside this change.
- Offering creation/list/details/retirement/clone-form exposes actual policy, price/payment-point and algorithm reference fields. Commercial preview shows exact legal text/readiness; publication requires explicit review, matching preview hash and expected revision, retained idempotency key. Publication list/detail/retirement are connected independently from questionnaire publication.
- Protocol preview and physician history are ADMIN read-only. Guidance drafts connect actual approved educational content and active services to real result bands. Couples drafts configure all unordered result pairs including repeats, approved content and consultation choice; real protocol/disclosure references and physician approval remain required. Content lookup for each couple pair loads only when expanded, avoiding hundreds of simultaneous requests.
- Advanced tabs remain mounted after first visit, preserving unsaved form inputs. Main navigation observes busy state and conservatively warns after advanced form edits; this warning may remain after a successful advanced save until leaving/reopening. Duplicate/reload/leave actions protect dirty input. Pagination buttons are explicitly non-submit inside forms. Network/conflict failures retain inputs and never report success.

Limits:
- Qualified consent/legal/review references currently use exact existing UUID inputs; these APIs do not provide an ADMIN legal/consent authoring or universal picker route. No consent text or legal approval was fabricated. Physician approval/revocation remains the authorized physician workflow. Guidance content authoring itself remains its existing domain; this page selects approved snapshots.
- Scalar preview is visual only because the current ADMIN scoring-preview endpoint supports dimension draft only; no parallel frontend clinical scoring engine added.
- No claim that all operations pass at runtime. End-to-end availability still depends on real approved references, clinic permissions and backend readiness gates. No real patient, consent, policy, commercial or financial write executed.

Verification executed: focused source/controller/service/DTO/caller inspection; targeted generated-client source generation only. Authoring test source added (five types/all sections, score coverage, duplicate IDs, unknown schema) but NOT run. Tests, typecheck, lint, build, automated browser, Graphify update and final commit were NOT run.

Deferred gates: owner visual/interaction review at http://localhost:3002/assessments; dashboard typecheck/lint/build and assessment wrapper/authoring regression tests; runtime OpenAPI export comparison; isolated API contract/auth/privacy tests; real draft create/read/update/duplicate, scalar publication/archive and booking policy conflicts; all five answer types, multi-section ordering and number/result boundary completion; dimension exact-hash preview/conflict/release denial; offering idempotency/unknown outcome and commercial readiness/hash/revision; physician-only denial, guidance/couples approved-reference and complete-pair constraints; pagination/error/retry/dirty-navigation/RTL/mobile/keyboard review. Run only after owner review authorizes resuming deferred gates.

Requested artifact-template-system-design skill used with retained reference DOCX (SHA256 13504f6c221a42c1726460a9e865e563355539ff97d702d6c9b2267b4b261d76). Source geometry/styles/tables retained; six-page Persian factual design records boundaries and deferred gates. Source reference unchanged. LibreOffice renderer unavailable; native Word read-only PDF export used, all six final pages visually inspected. Text-only footer/footnote and actual contract hyperlink adapted. Document rendering is separate from deferred application/browser verification.

Next: owner reviews assessments UI and authoring flow; incorporate feedback, then perform deferred verification before final acceptance. Keep existing batch/task active; do not mark DONE or commit as completed.

## Mizaj 11+1 authoring — implemented unverified

2026-10-20 Asia/Tehran. Same F12-FE01 / CLIENT-INTEGRATION, sole writer/source reviewer Codex /root. Latest owner rule supersedes11+4: all11 main answers, then only one question for the exact tied candidate set, maximum12. Overall task REWORK/unchecked; no new batch/final commit. Contract: ../assessment-mizaj-11plus1.md.

Implemented:
- New dashboard mizaj-authoring.ts, mizaj-builder.tsx, mizaj-preview.tsx: dedicated main/follow-ups/results/rules views; map each actual answer to one dimension or informational; six pair cases plus exact multiway cases; one-question authoring per case; actual profile editing and server-only simulation. Existing shared shell/tokens/fonts/ADMIN permissions and other assessment types retained. New explicit action copies actual source preset into a separate schema3 draft; no stored source/version overwritten.
- assessments-page.tsx, assessment-authoring.ts and lib/assessment-api.ts: creation/validation/schema routing, dirty/in-flight protections and stable errors. Publish remains disabled for unreviewed dimension models; new preview is exact saved hash and synthetic-only.
- API domain/assessment-tiebreak-draft.ts: bounded strict schema3, four dimensions,11 required/four-option main questions, single membership or informational answer; reuse unchanged dimension evaluator. Exact unordered primary/secondary tie selection, unknown/off-path/extra answers rejected, unchanged main counts, unresolved/multiway states preserved; no forced result/second follow-up.
- Existing admin service/DTO: narrow draft validation/preview dispatch; prevent schema-version relabeling. Shared OpenAPI/client response source adds optional selected-question/used fields and explicit statuses; no new endpoint/auth/migration/dependency.
- New focused API domain and dashboard helper test sources; NOT executed. Previous shell/store/assessment changes preserved.

Source review: caller/validation/DTO/generated contract and old-version behavior inspected. Important limits reviewed: all11 answers required even if informational; exact tie only, no fabricated near-tie threshold; a missing bank case remains explicit; three-way tie never chooses an arbitrary pair; follow-up can resolve primary while secondary remains tied, with no additional question. No clinical question was invented. Blank follow-up questions/options must be authored before save. Missing cases allowed for draft construction, not advertised as release readiness. Original minInformativeAnswers5 and mappings remain unreviewed proposals, editable in draft; no diagnostic accuracy/percentage claimed.

Generation: normal client generation initially hit a Windows UNKNOWN file-write error. Generation then succeeded to a task-specific temporary output using the package generator; exact generated bytes copied to schema.generated.ts. The root-level generator lookup attempt found no root binary. No app checks were run or claimed. Runtime OpenAPI export comparison/client build remain deferred.

Deferred: owner UI/source contract review; focused domain/helper/admin auth/hash/version-preservation and PostgreSQL CRUD/preview suites; dashboard types/lint/build and generated-client/runtime-export freshness; browser11-step back/change/reset/synthetic acknowledgement/exact follow-up/no-follow-up/null-answer/three-way/error/retry/dirty navigation/RTL/mobile/accessibility flows. Tests/typecheck/lint/build/automated browser/Graphify update intentionally NOT executed. No patient,policy,consent,publication,clinical or financial write executed. Owner acceptance pending; keep task active.

Next: review http://localhost:3002/assessments → «آزمون مزاج ۱۱ + ۱». Author/review real tie-break content and mappings; refine dashboard feedback, then resume deferred gates. Patient runtime/publication remains a later explicitly scoped step; do not enable release merely because authoring simulation exists.

## Owner-requested checkpoint commits — dashboard, store and assessments

2026-10-20. Owner explicitly requested all remaining changes committed in separate related groups. This supersedes earlier no-commit checkpoints for storage only; it does not waive acceptance or authorize DONE. Same F12-FE01 / CLIENT-INTEGRATION /root ownership, no new batch. Staged exact owned paths per group; no pre-existing staged content or active Git hooks found.

| Commit | Message | Files/scope |
|---|---|---|
| db6a8fd | feat(F12-FE01): checkpoint archive dashboard shell and real-data Home |14 files: dashboard shell/components/styles/Home and local Vazirmatn assets/license |
|13fcc80 | fix(F12-FE01): checkpoint archived product restoration to draft |2 files: catalog service and lifecycle integration test source |
|109b7c0 | feat(F12-FE01): checkpoint unified product workspace and image catalog |9 store feature/helper/test-source files |
| f416b72 | feat(F12-FE01): checkpoint assessment 11+1 draft engine and API contracts |7 API domain/admin/test-source/OpenAPI/generated-client files |
| ebf93c4 | feat(F12-FE01): checkpoint assessment authoring and targeted tie-break preview |10 dashboard assessment/helper/wrapper/test-source files |
| e9d0282 | docs(F12-FE01): save assessment system design artifacts |3 files: DOCX,PDF,provenance README |
| this documentation commit | docs(F12-FE01): record unverified dashboard checkpoints and handoff |STATUS,Phase12 checklist/log and11+1 contract |

All checkpoint commits succeeded. Review this run was limited to Git status,scoped diffs/staged file lists and commit results. No tests,typecheck,lint,build,automated browser,Graphify update or real application write executed. Test-source files are unexecuted. No push. Prior source reviews,explicit clinical/patient-release limits and all deferred gates remain in the respective handoffs above. No protected files changed. Keep task/batch REWORK and phases unchecked; next action is owner UI/interaction review, then agreed deferred verification and resolution before final acceptance. No next batch started.

## Assessment modal and draft deletion — implemented unverified

2026-10-20 Asia/Tehran. Same F12-FE01 / CLIENT-INTEGRATION /root sole writer/source reviewer. Owner requests management in a popup over the main list and deletion from that list. IMPLEMENTED_UNVERIFIED; overall task REWORK/unchecked. Previous checkpoint commits retained; no automatic new commit or push.

Changes:
- Dashboard assessment-dialog.tsx and assessments-page.tsx: create/open/duplicate all manage within native showModal dialog, same list/filter/page retained behind it. Shared font/tokens/cards, internal scrolling and fixed dialog heading/close retained. Native top-layer focus containment/inert background, Escape/backdrop/X close use existing dirty confirmation; busy state prevents closing. Body scroll restored; focus returns to connected opener or main heading after list refresh. Errors/success/busy messages shown inside the active management dialog. All main/Mizaj/preview/advanced authoring features retained.
- Main list shows explicit «حذف پیش‌نویس» for DRAFT only, with irreversible-action confirmation including title. Actual successful delete refreshes server list and steps back when deleting the last row of a later page. Failures preserve the item and show stable errors. Published versions keep the separate archive action; no misleading delete-as-archive label.
- New DELETE /v1/admin/assessments/{id}?expectedContentHash=...; existing ASSESSMENTS_MANAGE permission, active-clinic scope, UUID/query validation, locked DRAFT status/current hash and per-key advisory lock. Actual DELETE and ASSESSMENT_DRAFT_DELETED audit are atomic. Existing FKs all use Restrict; P2003 becomes ASSESSMENT_DELETE_REFERENCED. Published/retired return ASSESSMENT_DELETE_NOT_DRAFT; changed draft returns ASSESSMENT_DELETE_CONFLICT. No cascade/soft-delete/migration or patient-history bypass. Existing database trigger permits only DRAFT deletion, independently preserving published history.
- Admin controller/DTO/service and audit constant; generated OpenAPI/source client, typed dashboard wrapper and Persian errors. Generator ran to a task-specific temp output and generated bytes copied to source; no build/runtime export verification.
- Unexecuted tests: new isolated PostgreSQL API suite for ADMIN denial/hash conflict/audit/actual delete/repeated404/reference retention/published protection/foreign-clinic scope/input validation; existing authorization matrix includes remove; dashboard wrapper checks DELETE/hash/auth/conflict. Fixture suite requires explicit disposable local database and leaves fixture history intact. These are test source, not passing evidence.

Source review executed: current page/dialog product pattern, API caller/DTO/service/audit, assessment schema relations and original publish-immutability/booking-policy triggers, generated contract changes and exact owned diff. No actual delete/request against application data executed. No tests,typecheck,lint,build,automated browser or Graphify update. No unrelated/protected changes.

Deferred: owner visual/interaction review; native popup sizing/RTL/mobile/keyboard/Escape/backdrop/focus/dirty and busy regression; all schema editors and preview paths inside modal; focused isolated PostgreSQL deletion/auth/concurrency/FK/audit rollback and wrapper tests; generated-client/API-export freshness/types/lint/build. Exact task remains REWORK/unchecked; next action owner reviews http://localhost:3002/assessments, then agreed deferred verification. Clinical release/approval restrictions unchanged.

## Archived assessment deletion — implemented unverified

2026-10-21 Asia/Tehran. Same F12-FE01 / CLIENT-INTEGRATION /root. Owner explicitly requests deletion of archived assessments. This supersedes the earlier draft-only restriction; keep modal and prior work. Overall REWORK/unchecked; stage IMPLEMENTED_UNVERIFIED, no automatic commit/DONE.

- Main list now exposes «حذف آزمون» for RETIRED as well as existing draft deletion. Confirmation identifies the archived version and irreversible action; dependent records remain protected. Failure preserves the list row; actual success refreshes server page.
- API remove accepts DRAFT or RETIRED, denies PUBLISHED with ASSESSMENT_DELETE_NOT_ALLOWED; same current contentHash/clinic/ADMIN/row and advisory locks. Actual deletion and generic ASSESSMENT_VERSION_DELETED audit with prior status are atomic. Previous draft-deleted audit rows are not changed. All existing FK Restrict constraints remain; referenced versions return ASSESSMENT_DELETE_REFERENCED. Wrapper errors and OpenAPI/generated source descriptions synchronized; old NOT_DRAFT error recognized for compatibility.
- New migration apps/api/prisma/migrations/20261021090000_assessment_archived_delete/migration.sql replaces only the existing trigger function's DELETE eligibility: DRAFT or RETIRED. All published/retired UPDATE immutability checks and published DELETE rejection retained verbatim. Existing migrations/schema not edited; no cascade or data deletion.
- Source review confirmed the original trigger and all current assessment-version FK relations. Scoped read-only migration metadata showed loopback PostgreSQL localhost:5432, only the new migration pending and no failed migration. Standard pnpm --filter @sabz-zendegi/api prisma:migrate:deploy succeeded and applied only20261021090000. This is local feature migration activation, not production release or test execution. No assessment record was deleted by the agent.
- Shared client source generated to task-specific temp output and copied verbatim. Focused isolated PostgreSQL test source now includes archived success/audit/status, unauthorized/stale hash, retained retired UPDATE immutability, and existing submission preservation. Existing draft/published/foreign-clinic tests updated for generic deletion event/error. These tests have NOT run.

Deferred: owner review of archived delete confirmation/action; focused PostgreSQL suite including direct DB trigger/FK behavior,hash/concurrency/audit rollback and wrapper/UI regressions; runtime OpenAPI freshness/types/lint/build/automated browser and prior checkpoints. No tests,typecheck,lint,build,browser or Graphify update executed. No real assessment/patient/financial write or deletion, except explicitly authorized additive local trigger migration. No next batch/commit/push; owner review remains next.

## Assessment delete error routing — implemented unverified

2026-10-21 Asia/Tehran. F12-FE01 / CLIENT-INTEGRATION /root. Owner reports generic409 during archived deletion.

Confirmed source cause: prior deletion implementation introduced ASSESSMENT_DELETE_NOT_ALLOWED/CONFLICT/REFERENCED but omitted them from common/errors/api-error.ts API_ERROR_CODES. HttpExceptionFilter intentionally replaces unregistered codes with status fallback CONFLICT; dashboard therefore fell through to its generic409 message. Fixed the central registry and ApiErrorResponseDto enum in OpenAPI/generated source, leaving strict unknown-code filtering unchanged. Added a focused source-only filter regression for all three reasons. Existing dashboard translations already handle them; no deletion protection relaxed.

Read-only diagnosis: configured local PostgreSQL transaction BEGIN READ ONLY/ROLLBACK,statement timeout5s. Queried FK metadata for assessment_versions and bounded archived-version reference counts only (limit20,no patient answer/text reads). Found5 current RETIRED versions, all referenced by patient_assessment_submissions;2 also referenced by mezaj_results. Thus these actual versions are blocked by existing reference integrity, independently of role permissions. No delete/retry/write attempted, no medical/history rows changed.

Changed: API common/errors/api-error.ts, test/http-exception.filter.spec.ts; OpenAPI/generated schema source; coordinator status/phase/log. Generator only succeeded; no runtime API build/export,test,typecheck,lint,browser or Graphify update run. Prior migration remains applied; no new migration/commit/push. Keep IMPLEMENTED_UNVERIFIED and task REWORK/unchecked; next owner confirms the specific dependency message. Deleting actual response/result history is outside this fix and has not been authorized or performed.

## Assessment hold-to-delete — implemented unverified

2026-10-21 Asia/Tehran. F12-FE01 / CLIENT-INTEGRATION /root sole writer/source reviewer. Owner rejects browser confirmation for deleting assessments and asks holding the delete control to serve as confirmation.

Changed assessments-page.tsx and new local hold-delete-button.tsx: deletion no longer invokes window.confirm. «برای حذف نگه دارید» requires a continuous1.5s primary-pointer/touch or Enter/Space press, displays directional fill progress and instructions. Hover or short click does not delete. Pointer release/leave/cancel,focus/window blur,hidden document,disabled state and unmount cancel pending action. Context menu prevented on the button to allow touch hold; page scroll pointer cancellation remains native. Escape cancels. Timer fires once per press,ignores repeat until release; same existing API/parent busy lock/hash check/permission/reference integrity used. Keyed by versionID+contentHash+status so a changed/replaced target cancels the old hold. Other archive/unsaved-edit confirmations are outside this request and unchanged.

Source review only; new unexecuted hold-delete-button.spec.ts covers short press/cancel,full interval after restart,one callback per continuous press/repeat protection and cleanup cancellation. No dependency/backend/schema or actual record change. No tests,typecheck,lint,build,browser,Graphify or commit executed. Prior deletion blockers for patient/history references still apply. IMPLEMENTED_UNVERIFIED/task REWORK/unchecked; owner reviews behavior next, then deferred pointer/touch/keyboard/cancel/visibility/busy/target-replacement and API integration checks.

## Owner-requested assessment checkpoint commits — 2026-10-21

Owner explicitly requested committing all remaining uncommitted changes. Same F12-FE01 / CLIENT-INTEGRATION /root source reviewer. This authorizes checkpoint commits of the retained implemented/unverified work; it does not authorize claiming deferred gates passed or closing the broader task.

- c797d07 — feat(F12-FE01): checkpoint guarded assessment deletion and API contracts.11 files: admin API/DTO/service/audit/error allowlist, additive archived-delete migration, generated OpenAPI/client and authorization/deletion/filter regression sources.
- 0629386 — feat(F12-FE01): checkpoint assessment modal and hold-to-delete controls.6 files: retained-list modal management, hold control/timer source, client wrapper/messages and source regression cases.
- Following documentation commit records this handoff and the prior modal/deletion/error/hold implementation evidence.

Review performed: current Git changes/ownership and dependency grouping, source diffs including clinic/permission/exact-hash locks/audit/Restrict protection, migration immutability, modal/hold handling, test source and staged file lists. git diff --check and each staged whitespace check passed; commits succeeded. No tests/typecheck/lint/build/automated browser/runtime OpenAPI export/Graphify executed: prior explicit owner deferral remains in force. Existing local migration was already applied by the previous implementation; no migration or actual record deletion executed during this commit run. No business code edits, dependency changes, push or next batch. Status remains IMPLEMENTED_UNVERIFIED, F12-FE01 REWORK/unchecked; next action remains owner review and authorized deferred verification before final acceptance.

## Store identity aligned with Home — implemented unverified

2026-10-21 Asia/Tehran. Explicit owner asks for a creative storefront with the Home identity, including product cards, using relevant design skills. Same F12-FE01 / CLIENT-INTEGRATION /root sole writer. Owner explicitly requests no repeated implementation tests and reserves final review; IMPLEMENTED_UNVERIFIED, overall task REWORK/unchecked.

Applied redesign-existing-projects, ui-ux-pro-max, design-system, ui-styling and accessibility guidance with owner's Home references taking priority. Existing stack, local Persian fonts and Home ice/blue/teal values retained. No external design dependency/plugin installation or fabricated product imagery required: a code-native decorative glass-bag/leaf composition uses existing Lucide/SVG and CSS; it is not a purchasable item or a promotion.

Implementation:
- Public Store page imports local store-home.module.css; scoped tokens/surfaces isolate changes from Home, profile and checkout. Exact /store shell marker removes the white frame against the luminous ice background. Existing shared bottom dock retained.
- Calm brand header with existing wishlist/cart actions and real counts. Search/address grouped in one frosted panel, desktop side-by-side and compact stacked layout; input remains16px with responsive hint. All handlers/labels/sheet/guest paths preserved.
- New StoreIntro: compact translucent display with readable copy, one real catalog CTA and decorative layered glass illustration. Existing CMS banner slider still uses its original real destinations/assets/controls, followed by three softly elevated shortcuts and the existing data-driven personalized collection/hint. No recommendation inference, clinical claims or fabricated discounts.
- Product card: soft rounded ice surface, neutral white contain-image well (actual image color/details preserved), distinct favorite state, existing real in-cart badge/category/variant/current SKU price. Dedicated footer and accessible44px details action open the same exact product+SKU route; no unrequested add-to-cart mutation. ProductCard's shared basic footer style reaches its existing Store consumers; full glass skin is scoped to the catalog only.
- Collection rails/grid/arrows, results/back/pagination, empty/error/retry/personalized hints use the same visual language. Rail padding/margins explicitly scoped to avoid inheriting previous broad desktop bleed. Compact two-column grid, desktop four columns; flexible prices/currency and image aspect ratio retained.44px favorite/details controls, named actions, focus outlines, reduced-motion conditional transitions and forced-color fallback included.

Source review only: inspected existing fetch/version guards/search debounce/pagination/address/cart/wishlist/banner/recommendation interfaces and stylesheet specificity. No domain fetch/payment/API/schema/provider/permission changes, no real shopping/account writes. No tests/typecheck/lint/build/browser regression or Graphify run; no execution PASS or visual acceptance claimed. Attempted initial read-only binding of ambient Store tab was unavailable; no current browser screenshot was used as evidence. Final preview is for owner review at http://localhost:3001/store (including view=all, search, product cards and narrow widths). No automatic commit/push/new batch. Next: owner's visual feedback, then explicitly authorized deferred verification.

Store identity preview correction (2026-10-21): owner explicitly removes the entire «برای زندگی، برای شما» introductory card. Removed StoreIntro import/render from the public catalog; retained its unused source/style for the current uncommitted design review. Existing CMS banners, search/address, shortcuts, personalization and product-card design unchanged. Source-only edit; owner's execution-test deferral retained, no automatic commit or acceptance claim.

## Store product card dimensions and upload standard — implemented unverified

2026-10-21. Owner requests consistent product-card dimensions and a practical upload specification. Same F12-FE01 /root. Catalog CSS now explicitly sets square nonshrinking image wells with contain/center, one inset layer instead of competing media/link padding, two-line48px title space, minimum158px flexible body and bottom-aligned two-column price/44px details footer. Responsive rails use roughly2 mobile (minimum160px),3 medium,4 desktop cards rather than fixed188px desktop cards; existing2/3/4 catalog grid preserved. No forced total height that clips variants/long prices. Actual imagery, product routes, SKU/pricing/cart/favorite behavior unchanged.

Read existing processor and uploader source:5MiB JPEG/PNG/WebP static, up to8192 per dimension/20MP input, output fit-inside1600 without enlargement, WebP quality80. No backend/upload behavior changed. Added Persian plan/store-product-image-guide.md:1600-square sRGB, centered complete80–84% subject/8–10% margins, white/transparent backdrop, PNG or JPEG90–95 source under5MiB, separate original preservation and honest server conversion explanation. Nominal card/frame sizes are geometry estimates, not measured browser results. Owner's no-intermediate-test/final-owner-review rule preserved: no tests/typecheck/build/browser/Graphify or commit. IMPLEMENTED_UNVERIFIED and F12-FE01 REWORK/unchecked.

Store card favorite placement (2026-10-21): owner clarifies heart should not occupy the small catalog card, but remain in the main product detail. ProductCard now has showFavorite default true to preserve existing wishlist/other consumers; public Store renderProduct explicitly sets false, covering discovery/results/personalized cards. Product detail's existing named heart/toggle and header wishlist entry remain untouched. Source-only reversible presentation edit; prior no-runtime-test rule retained. No wishlist data mutation, no commit/DONE.

Store full-bleed card imagery (2026-10-21): owner requests image well touching the main product card edges and filling rounded corners. Catalog-only CSS removes outer card7px padding (including narrow5px override), inner media border/radius and media-link inset; square image fills the top width, clipped by the main card radius. Display now cover/center without distortion; nonsquare source may crop, square upload guide remains1600×1600. White margins baked into source are not removed. Body alone retains readable padding; product detail page unchanged. Updated upload guide and nominal frame sizes to supersede contain/inset design. Source-only, no automated checks or commit; same F12-FE01 review pending.

Store banner controls removal (2026-10-21): owner dislikes the visible multi-banner navigation panel below the slider and requests removing it entirely. Removed visible arrows/dots/control row plus unused active-slide state/icon imports. Native swipe/drag, existing autoplay/reduced-motion/focus handling and real banner destinations remain. A screen-reader/keyboard-focus-only pause/resume button remains over the hero when focused, so ongoing automatic movement can still be stopped without a persistent lower panel. No tests/build/browser per owner's deferred-review rule; no data/commit or unrelated personalized-products changes.

Store continuous banner looping (2026-10-21): owner reports last banner rewinds to first. Removed conditional rewind (previously active below3 banners) and enables actual loop for2+ originals. Inspected installed Swiper14 loopFix source: centered1.12 view rounds to3 and requires2 buffer entries; short sequences are repeated as whole cycles to reach at least5 rendered entries (2->6,3->6,4->8), preserving order/destinations and unique render keys. Original IDs key Swiper to rebuild on collection change. Single banner uses1 view/no autoplay/loop; existing pause/reduced motion and hidden controls preserved. No backend/banner data mutation or new dependency. Source review only, no automated/runtime/browser tests per owner deferral; full F12-FE01 remains unverified/REWORK, no commit.

Store full banner on mobile (2026-10-21): owner reports banner visible on desktop but cropped on mobile. Existing .store-hero__image fixed180px/mobile and240px/desktop with cover caused aspect-ratio-dependent cropping. Replaced fixed heights with width100%/height:auto and contain, removed desktop fixed-height override. Native source ratio now determines banner height at every width; standard1600×800 remains2:1 and full image/text is visible without stretch or cover cropping. No original image modification, slider/loop/destination change or new mobile asset requirement. This supersedes the earlier prompt's need to protect against implementation cropping, though short readable mobile text remains desirable. Source-only fix; owner no-runtime-tests rule retained, no commit/DONE.

Store uniform banner aspect ratio (2026-10-21): owner rejects independent natural heights because banner ratios are inconsistent. Supersedes previous height:auto fix: all clickable slide frames now explicitly2:1, image100%×100% contain/center, with one consistent ice background for any letterbox area. Thus all banners share geometry at a given viewport and full source stays visible. Current asset pixels are never cropped/distorted; non2:1 sources cannot both fill that frame and stay uncut, so1600×800 source preparation is the stated standard for full-bleed output. No upload/backend/persisted asset change; loop preserved. Owner's source-only preview/no automatic runtime checks/commit policy retained.

Store banner cover restored and safe-area prompt (2026-10-21): owner explicitly rejects fixed2:1 letterboxing, requests previous cover behavior and a preparation prompt accounting for mobile/desktop content placement. Restored180px image height/mobile,240px from768px, centered cover, no forced slide aspect ratio. Existing loop intact. Recommend1600×800 with all required product/text inside conservative center box X240–1360/Y250–550; outside decorative bleed only. This is a source-geometry guideline for current typical320–1120 viewport/frame widths, not measured universal crop safety. Very long text/aspect extremes require separate responsive art, not impossible no-crop promise. User's no-runtime-tests rule retained; no actual images modified/generated or automatic commit.

Store banner framing/prompt clarification (2026-10-21): owner requests original fill behavior plus a prompt limited to dimensions and content placement. Source inspection already shows centered cover with180px mobile/240px desktop and no fixed slide aspect ratio; intended restoration is already present, so no CSS overwrite was necessary. Proposed1600×800 source with content-safe central X200–1400/Y260–540; product left X220–700/Y270–530 and RTL text right X820–1380/Y270–530, exterior background expendable. Geometry estimates for current320px-and-up/mobile and bounded desktop layout, not a runtime universal guarantee. Existing design/product/loop behavior unchanged; tests and browser review remain owner-deferred. No commit.

## Owner Store checkpoint before assessment publication

2026-10-21. Owner explicitly requests all pending changes committed on current branch before continuing assessment publication and narrow-screen hold fix. Assessment changes were already saved as c797d07/0629386/45e24b5. Remaining Home-aligned Store work saved as4f5f363 (8 owned product files); this docs checkpoint saves its existing status/log/checklist and image guide. Source/staged-path review only; no tests/types/lint/build/browser/Graphify. No acceptance/push/new batch; F12-FE01 remains REWORK/unchecked. Next authorized scope is assessment hold interaction and real11+1 publication/runtime.


## Assessment 11+1 publication and small-screen hold — IMPLEMENTED_UNVERIFIED

2026-10-21; same F12-FE01 / CLIENT-INTEGRATION, /root sole writer/reviewer; owner explicitly requests pending work checkpointed then publication completion and narrow-screen deletion fix. Pre-existing assessment commits c797d07/0629386/45e24b5 retained; pending Store implementation checkpoint4f5f363 and documentationa12f04d committed on existing front branch. No push or final acceptance. New work remains uncommitted for owner review.

Hold control now retains a constant label/width, prevents focus scrolling, uses touch-none/primary-pointer capture, cancels outside bounds/lost capture/resize, and preserves1.5s deliberate keyboard/pointer confirmation. Source cause: holding previously replaced the label with shorter text, potentially moving the pointer outside a wrapped narrow-screen button; actual responsive behavior awaits owner review/browser checks.

Publication path now validates all11main questions, existing complete16profiles and6exact pair follow-up cases, then checks/locks the real exact physician protocol approval/active processing policy. Protocol review service/DTO/additive SQL guard support schema3 draft review with DIMENSION_TIEBREAK1; scalar/v2 and commercial/couple restrictions preserved. Approval is never fabricated; changed content invalidates approval and old approvals remain withdrawable history. Dashboard shows actual publication blockers/readiness. Physician API exists but no physician frontend was found; real content and qualified approval remain prerequisites. No published record was created.

Patient API/wizard now validate partial saved progress, project only public questions, select exactly one matching follow-up after11answers, reject wrong-path answers and premature submit, preserve revision/idempotency and record reviewed educational result/engine/hash/review provenance with score:null. Patient result renders actual reviewed profile and uncertainty, no invented accuracy or grade. Active review is enforced for start/resume/save/submit; completed historical results remain readable, retired owned attempts can resume. Paid/couple/guidance/assigned-care contracts still scalar-only and are not claimed complete for11+1; free-patient consent behavior unchanged.

Deployment evidence: read-only loopback5432 migration metadata showed only20261021100000_assessment_tiebreak_protocol pending and no unfinished migrations. Standard migrate deploy applied it successfully (76migrations). Existing migrations untouched; no schema-model change/generation needed. OpenAPI code/status enums and generated client source updated with source-only generation. Source reviewed: module DI, canonical hash/authority locks, SQL guard/FK boundaries, UI progression/projection, legacy paths and errors. Added unexecuted domain tests and isolated integration scenario for physician approval/current-content invalidation, partial/off-path answers, selected follow-up, completion replay, retired resume, withdrawal denial/history readability. Existing authorization mocks updated for service injection.

Deferred: all application tests/typecheck/lint/build/browser and Graphify, including the new test sources; no PASS claimed. No actual assessment review, publication, answer write or deletion performed. F12-FE01 remains REWORK/unchecked; owner review then authorized checks and physician interface/content readiness remain necessary before final acceptance. No next batch/DONE/final task commit.

Final scoped status review: Store page.tsx and store-home.module.css became dirty again after the checkpoint while assessment work was in progress; these subsequent unrelated edits were not inspected, staged or overwritten by this continuation.


## Assessment connection simplification — IMPLEMENTED_UNVERIFIED

2026-10-21, same F12-FE01 /root assessment continuation. Owner reports services.data.filter TypeError and asks which connections are excessive. Narrow source trace confirms GET admin/services returns DirectoryPageResponseDto {items,page,pageSize,total} via listNamed; assessment wrapper incorrectly asserted ServiceResponseDto[]. Corrected wrapper to actual page, added active/PUBLISHED server filters and page argument; guidance consumes items and offers existing PageControls, retaining selection across pages. Regression source added for envelope, filters/page/auth (not executed).

Schema3 now displays its actual11+1 authoring/published-result path, with optional content-review history. Unsupported scalar-only sale, band-guidance and couple forms no longer appear for11+1; schema2 shows its draft limitation. Legacy schema1 functions retained behind opt-in settings, starting with content-review history rather than a commercial form. Components fetch only after optional section first opens, retain mounted form state on collapse, preserve parent dirty/busy protection. Manual consent UUID inspection placed in advanced disclosure; technical protocol heading explained as question/answer/result/consent review. Parent tab renamed settings-more. No backend/authority/clinical/commerce deletion or publication action changed.

Policy finding: ADR0022 lines7–13 separates technical ADMIN questionnaire publication from physician review, requiring latest qualified approval for future paid/commercial release. Previous11+1 continuation extended the gate to free/general schema3 publication and processing; that is additional product policy, not a technical prerequisite or a requirement from the owner's simple assessment request. It remains in backend pending explicit policy resolution; neither frozen commercial authority nor existing approval evidence was silently bypassed. Physician approval API exists but no physician frontend; this remains a practical blocker. For this owner's core flow, commercial tariffs/TTL/entitlements, couple pairing, manual reference IDs and scalar guidance mappings are unnecessary primary UI. Existing resultProfiles already author the11+1 output; no extra guidance-mapping setup is required.

Source/contract review only. All tests/typecheck/lint/build/browser/Graphify remain deferred, regression not executed; no runtime PASS/commit/DONE. Concurrent Store edits and all earlier uncommitted assessment work preserved. F12-FE01 REWORK/unchecked; next decision is general educational11+1 publication authority, then owner review and authorized verification.


## ADMIN 11+1 publication — IMPLEMENTED_UNVERIFIED

2026-10-21; owner explicitly rejects physician account requirement and authorizes all ordinary educational11+1 steps through ADMIN. Same F12-FE01 /root, no new batch. ADR0036 supersedes prior general physician gate; existing commercial authority remains a separate preserved contract. Removed admin publication's physician-review service dependency/gate (and associated module/test injection); complete structural validation, same-clinic/lifecycle locks, audit and actual publisher recording remain. Free11+1 start/resume/save/submit now require the published version and active patient self-access, without doctor review/policy lookup. Existing paid processing path unchanged. Snapshot now accurately marks ADMIN_PUBLISHED, with existing exact version/hash provenance and no fake physician review or extra exposed actor ID.

Readiness panel no longer queries physician protocol API; uses saved authored structure and specific missing-pair hints, clearly defers authoritative validation to server publication. Builder/connection copy states ADMIN owns creation through publication;11+1 does not mount physician-history controls. Existing legacy advanced commercial functions remain outside this workflow. Removed obsolete dashboard physician-required error text. No actual publication, approval, patient write or DB migration performed in this continuation; historic ledger/result records preserved.

Regression sources revised for no-review/no-active-processing-policy ADMIN publication, incomplete-case rejection, nonADMIN denial, private questionnaire, selected follow-up, idempotent score:null/ADMIN_PUBLISHED completion and retired owned resume. Frontend readiness missing-case source added. No tests/typecheck/lint/build/browser/Graphify executed, no PASS claim. Source review only; prior concurrent Store/Home edits untouched. F12-FE01 remains REWORK/unchecked, implementation unverified and uncommitted; next owner review then authorized deferred checks.


## Restore full assessment settings — IMPLEMENTED_UNVERIFIED

2026-10-21, owner explicitly corrects earlier simplification: full offering/connection forms must remain available for11+1 and ordinary publication must not require a physician approval ID. Same F12-FE01 /root continuation. Restored parent tab label and full directly visible settings tabs, starting at offerings; forms load on first visit and retain state across tabs. Preserved all offering fields: identity/title, individual/couple, FREE/PAID amount/payment point, technical engine, optional processing consent, ages/TTL/access/invite validity, refund/retention/visibility references. Existing offering draft API accepts11+1 source after questionnaire publication without a physician review; default/copied engine now DIMENSION_TIEBREAK1 rather than incorrect scalar identity. Draft-source save is disabled with explicit publish-first explanation; form may still be filled. Existing list/detail/duplicate/retire settings functions retained.

11+1 source publication remains ADMIN-only ordinary publication from dialog header without physician ID; source/publication metadata panel replaces unrelated professional-review form for schema3. Unsupported11+1 paid activation is stated in its panel instead of asking for proof IDs or suggesting it is already supported. Legacy actual commercial flow remains unchanged. Scalar-band guidance and shared couple forms remain discoverable with honest unsupported11+1 explanation; their unavailable creation stays disabled, no fabricated result-band mapping or physician ID required in schema3. Couple professional-review field retained only for existing legacy contract. No backend/financial/clinical authority/migration changes or actual offering/publication writes performed.

Narrow source/contract review confirmed offering creation source must be PUBLISHED/RETIRED and physician review is not an input; commercial publication still enforces supported scalar-engine/delivery contract. Restoring settings does not claim11+1 commercial/couple delivery completion. Tests/typecheck/lint/build/browser/Graphify remain deferred; no PASS/commit/DONE. Owner review pending; F12-FE01 REWORK/unchecked. Earlier full database cleanup was separately owner-authorized and is not repeated here. Concurrent Home/Store edits untouched.


## Assessment delete with retained results — IMPLEMENTED_UNVERIFIED

2026-10-21; owner explicitly requires deleting the assessment while preserving the user's recorded result. Same F12-FE01 /root; ADR0037. DELETE now performs terminal status DELETED for any lifecycle with current contentHash/clinic/permission/locks/audit, idempotent replay and no physical removal. Admin list/get/edit/duplicate hide tombstones. Hold-delete now offered on published cards too, with explicit result-preserved success message. Source/questions/hash, submissions, Mezaj results and FK Restrict references remain. Completed patient history/result/provenance and exact questionnaire still readable; deleted source has resumeAvailable:false and no save/submit/new-start access. Required booking-policy reference clears atomically to NOT_REQUIRED and count is audited; source share-lock in the policy guard closes assignment/deletion race. Other source-selection/commercial APIs retain PUBLISHED-only guards.

Migration20261021120000 adds enum state, lifecycle constraint and terminal immutable source guard; deletion can change only status/updatedAt and cannot resurrect or physically remove a tombstone. Required-policy SQL guard serialization updated additively. Confirmed exact current lifecycle constraint and two source triggers from read-only local metadata before applying. Sole pending migration applied successfully on configured loopback5432 (77migrations). No assessment/result row was deleted or changed by this continuation. Previous owner-authorized full test-data cleanup is separate and not repeated.

Prisma client and OpenAPI enum/operation/client source generated without application build. Isolated delete regression source rewritten for retained rows/audit/idempotence/auth/hash/clinic, no resurrection, actual completed submission immutable equality, patient result/history/questionnaire readability and new-start denial. Test sources not executed. Source/contract review covered self result/Mezaj selectors, completed replay, questionnaire projection, admin lifecycle and required booking reference. All tests/typecheck/lint/build/browser/Graphify remain deferred; no PASS/commit/DONE. F12-FE01 REWORK/unchecked; owner review and authorized deferred verification next. All unrelated concurrent Home/Store edits preserved.


## F12-T02-I01 — Standalone server installation and private-repository CD

Task ID: F12-T02-I01
Completed at: 2026-10-21 Asia/Tehran
Agent/Thread: Codex /root
Batch ID: INSTALLATION-01
Reviewed by: Codex /root (single writer; no subagents)
Baseline: e7c6d07; clean worktree before this task. Existing F12-FE01 stays REWORK/unchecked.
Authority: explicit owner request to implement the reviewed server-side installer, preserve the private repository, manually hand GitHub connection material to the owner, and verify environment coverage. ADR-0039.

Changed files:
- installation/{install.sh,manager.py,build.py,README.md,.gitignore,test_installation.py,test_postgres_restore.py}
- .gitattributes (portable LF shell/Python sources)
- .github/workflows/{installation.yml,production.yml,production-rollback.yml}
- apps/api/prisma/bootstrap-installation.mjs
- apps/api/src/config/environment.validation.ts; apps/api/test/environment-validation.spec.ts
- compose.production.example.yaml
- deploy/README.md; deploy/vps/{compose.yaml,compose.dev.yaml,deploy-release.sh,deploy-dev.sh,dev-service.sh,env.example,dev-env.example,production-env.example}
- docs/{ENVIRONMENT.md,PRODUCTION.md}
- scripts/{deploy-vps.mjs,test-release-pipeline.mjs,test-vps-deploy.sh,test-installation-bootstrap.mjs,test-installation-postgres.mjs,test-installation-restore.mjs}
- plan/decisions/ADR-0039-standalone-server-installation.md; STATUS; Phase 12 checklist and this evidence.

Migrations: no migration/schema changes. All 79 existing migrations replayed successfully in a new disposable PostgreSQL 16 installer fixture only.

Implementation and main review:
- Allowlisted, independently transferable tar.gz plus SHA-256; no private application source, real .env, credential, token, tests or generated outputs in the package. Relocation/help execution tested.
- Ubuntu Server 24.04 amd64 is the supported host, matching current single-architecture GitHub images. Root performs host preparation; non-root deployment users receive separate dev/staging versus production SSH identities. No permanent GitHub/GHCR token is installed. Existing engines, foreign proxies/sites, management SSH ports and unrelated files are preserved; incompatible topology stops with a specific pending action.
- Interactive domain/IP/SSH/repository/release-policy/SMS/Sadad/backup/first-administrator configuration; isolated public runtime.env, exact proxy gateway, free port/subnet allocation, independent file-backed secrets and atomic state. Missing established secrets are not regenerated. Compose installation previews package removals before preserving the existing engine.
- DNS-only A/IPv4 profile reports required external records and waits for correct DNS; Caddy proposed config is validated before live writes. HTTPS and external PostgreSQL version/connectivity can be checked by doctor; verify checks deployed public endpoints. Existing custom Caddy sites require an explicit import.
- Production Compose now covers required OTP/SMS/payment keys, log/session/billing options and public API URL; production PostgreSQL remains external. Product-media production policy remains disabled. Dev optional R2 credentials are file-backed and runtime/key changes restart the API via existing sync logic.
- First administrator uses the application's existing password policy and Argon2id parameters, a transactional advisory lock, migrated ADMIN reference data and one audit event. The default migration clinic may be named only before any users exist. Existing-user access grants and password resets are refused; concurrent/repeated initialization is idempotent. First-run plaintext is removed after success. No demo/medical/legal content is seeded in production.
- Existing immutable release pipeline retained. Production uses PRODUCTION_VPS_* credentials and the exact successful staging manifest. Default is named-owner manual promotion; PRODUCTION_AUTO_DEPLOY explicitly permits same-repository main/success/staging-gated automatic updates. Production deploy/rollback share concurrency, use pinned SSH and temporary registry credentials. Consent validates before migrations; failed migration never switches applications; repeated deployment preserves the previous rollback target.
- Daily age-encrypted logical backups, operator-selected retention and separate restore-test-only recovery are implemented. No plaintext dump file; failed pipelines never record success. Original backup keys are preserved. Provider PITR/off-site transfer, actual legal/provider acceptance and full production sign-off remain separate.

Tests run and results:
- Ubuntu 24.04 Docker: installer suite at that checkpoint, 25/25 PASS, including actual Caddy validation, actual age encryption/decryption/tamper detection, permissions, package relocation, retries, state preservation, DNS waits, network allocation, UFW management-port ordering, subprocess redaction and failed pipeline behavior.
- Final POSIX suite: python3 -B -m unittest discover -s installation -p "test_*.py" -q -> 29 cases, PASS, 3 expected optional skips (real age/Caddy covered above; isolated real-DB restore run separately). Includes subsequently added port-allocation and existing-engine/Compose compatibility guards.
- node scripts/test-installation-postgres.mjs -> PASS: 79 fresh migrations; real first-admin creation, concurrent replay, password preservation, pre-existing-user/different-admin denial and one audit event. Fixture container/volumes cleaned; existing local databases untouched.
- node scripts/test-installation-restore.mjs -> PASS in separate Ubuntu/PostgreSQL Docker network: real pg_dump -> age -> pg_restore, two rows including Persian text, source unchanged, occupied target rejected, damaged archive rejected with zero restored tables. Dedicated server, volumes and network cleaned.
- node scripts/test-release-pipeline.mjs -> PASS: existing dev regressions, immutable manifest, new production credential/authorization gates and real Compose rendering for existing profiles.
- bash scripts/test-vps-deploy.sh -> PASS: staging failure/automatic application rollback, production-sim rollback, real-production no-local-Postgres initialization, repeated release preserving previous state, migration failure retaining current state, explicit production application rollback.
- Production Compose rendering with generated synthetic settings -> PASS: exactly four services, eight file-backed API secrets, loopback bindings and explicit gateway network; no local PostgreSQL service.
- API environment-validation.spec.ts -> 4/4 PASS. Blank optional PUBLIC_API_URL is accepted only while Sadad is disabled; live validation remains required.
- Read-only validation of actual apps/api/.env against the actual source Joi schema -> VALID, no errors, no values logged or changed. Some optional/defaulted API keys and PUBLIC_* keys in local frontend .env files are absent; server generation does not depend on them.
- Environment audit -> PASS, all 34 API schema keys covered by examples/Compose plus three frontend public templates.
- Actionlint for installation/production/production-rollback workflows -> PASS. Whole-repository Actionlint also reports two pre-existing SC2155 warnings in unrelated ci.yml lines 58/69; no unrelated CI script was changed.
- Shell/Node syntax and git diff --check -> PASS. Graphify AST update -> PASS on prior completed runs; known missing SQL/HCL/PDF extraction extras and existing chat extractor warning are non-blocking and unrelated to changed code.

Known limitations:
- No actual VPS, DNS, SSH/GitHub settings, provider credential, real medical/legal data, payment or live deployment was changed. Real clean-host systemd/Docker installation, ACME issuance, GitHub runner connectivity and two end-to-end releases still require the owner-selected server and remain F12-T13 operational acceptance.
- Current profile is Ubuntu 24.04 amd64, direct IPv4 DNS and external production PostgreSQL 16+. CDN/DNS-provider APIs, ARM/multi-architecture publication, custom CA/provider topology, managed WAL/PITR and off-site backup/alert integrations are not silently simulated.
- Existing F12-FE01/client acceptance, provider backup/rotation gates, production R2 restriction and production sign-off remain open. No whole-product production-readiness claim.
- Bundle is generated locally under ignored installation/dist; committed source reproduces it. GitHub workflows must first exist on main; this task creates a local commit only, no push/merge.

Result: software implementation/main review PASS; F12-T02-I01 DONE. Live deployment acceptance remains a separate explicitly authorized operational action.
Next eligible action: owner transfers the matching installer archive/checksum to an Ubuntu 24.04 amd64 server after merging the workflow changes, runs preparation/doctor, adds the generated GitHub Secrets/Variables and triggers the first dev/staging release. No next roadmap batch started.

## F12-T02-I02 — Terminal encoding recovery

Task ID: F12-T02-I02
Completed at: 2026-10-21
Agent/Thread: Codex /root
Batch ID: INSTALLATION-02
Depends on: F12-T02-I01 DONE
Reviewed by: Codex /root; scoped source/diff and acceptance review PASS

Problem: owner VPS traceback identified UnicodeDecodeError in new_configuration → ask → input. Reading input happened outside the validation retry and the CLI hid its exception type/location. The prior earlier failure immediately after the backup answer did not include a traceback; its exact original location is not established by this later trace.

Changed files:
- installation/manager.py: ordinary/hidden input share strict UTF-8 representability validation and retry Unicode errors without displaying raw bytes. Both password entries retain whitespace and use matching NFC comparison. EOF/interrupt terminate cleanly; other handled errors report only class, source basename/line and OS errno, never exception values/locals.
- installation/install.sh and persisted manager launcher: Python UTF-8 mode independent of locale.
- installation/test_installation.py: invalid-byte exceptions/surrogateescape recovery, real Linux pseudo-terminal visible and hidden entry (including no password echo), exact Persian value/hash, password preservation, full dev/live/Sadad/no-backup questionnaire recovery, EOF/interrupt and redacted failure diagnostics.
- installation/README.md: terminal encoding and replacement archive instructions, preserve existing server state/secrets.
- plan/STATUS.md, phase checklist and this evidence: claim/review/handoff.
Migrations: none. App/config/secrets/provider contracts: unchanged.

Verification:
- Baseline e315392 new_configuration with deterministic invalid UTF-8 input: reproduces uncaught UnicodeDecodeError before fix.
- WSL Ubuntu24.04.4: python3 -B -m unittest discover -s installation -p test_installation.py -q →34 cases,32 PASS/2 tool-availability skips (age/caddy).
- Disposable Docker ubuntu:24.04 with actual python3/age/caddy, read-only repository mount: same suite →34/34 PASS, no skips. Container automatically removed; no original services changed.
- Actual pseudo-terminal child processes run as their own session/controlling tty; both input and getpass receive invalid bytes, retry, and preserve valid Persian text. This is terminal transport evidence, not a real Termius/VPS acceptance claim.
- bash -n installation/install.sh →PASS.
- python3 -X utf8 -B installation/manager.py audit-env →PASS, all34 API keys plus3 frontend templates covered.
- python3 -B installation/build.py and sha256sum --check →PASS; regenerated ignored installation/dist/mushroom-installer.tar.gz (25,668 bytes), SHA256 d6b0d32e0c7b52296c1bc31aa859219bf34c6395e69a7b5ebaf3b51242f9716d. Allowlist/no-secrets archive regression PASS.
- graphify update . →exit0; pre-existing missing SQL/HCL extras and chat extractor partial-parse warning unchanged/nonblocking. Outputs remain ignored.
- git diff --check →PASS (line-ending normalization notice only).

Result: DONE; review gate PASS, claim released. No live server edit, push, merge or real credential operation. User must transfer both fresh archive and checksum, verify/extract, and rerun the ordinary launcher. An incorrectly encoded terminal must still be switched to UTF-8; the installer does not guess encodings or mutate corrupted credentials. Installation success on the owner VPS remains unverified. F12-FE01 and broader production gates unchanged. Next eligible action: owner retries this bundle on the selected VPS; no next batch started.

## F12-T02-I03 — Nominal VPS memory preflight

Task ID: F12-T02-I03
Completed at: 2026-10-22
Agent/Thread: Codex /root
Batch ID: INSTALLATION-03
Depends on: F12-T02-I01/I02 DONE
Reviewed by: Codex /root; scoped source/diff/acceptance review PASS

Owner evidence: nproc=2, free reports3.8GiB total/3.2GiB available/no swap. Existing guard incorrectly requires Linux MemTotal >= exactly4GiB in a dev profile. No CPU-count guard caused this rejection.

Changed files:
- installation/manager.py: treat4GiB(dev)/2GiB(without dev) as nominal classes, allowing10% for visible-memory differences. Report nominal requirement, minimum visible RAM and detected total on failure; keep disk/pre-existing-service checks and saved-state behavior intact. Swap is not counted and no resources are provisioned by this fix.
- installation/test_installation.py: preflight tests reach a sentinel package step without installing anything; accepted95%-visible/decimal-GB hosts/exact90% boundary and rejected one-KiB-below/half-size hosts for both profiles (10 subcases). Separate3.8GiB memory/9GiB-free disk test proves disk guard still blocks before package changes.
- installation/README.md: actual memory-class threshold, MemTotal/swap distinction and capacity limitation.
- coordinator STATUS/checklist/this log: claim, evidence and handoff.
Migrations: none. Runtime resource settings, actual server/secrets and application source: unchanged.

Verification:
- Baseline3b8a4e8 with MemTotal=3984588KiB and dev profile → reproduced incorrect4GiB rejection.
- Ubuntu24.04.4 WSL: python3 -B -m unittest discover -s installation -p test_installation.py -q →36 cases,34 PASS,2 skips for unavailable age/caddy; those unchanged tool integrations passed on actual disposable Ubuntu during I02. No redundant database/provider tests run for this preflight-only change.
- Build and SHA256 verification →PASS; ignored archive installation/dist/mushroom-installer.tar.gz:26,062 bytes; SHA256 e734d20bf04ac2c9d0469adf854b14a7fc94df0663cac862b1912965165ce3e2. Allowlist/no-secrets package regression included in suite.
- git diff --check →PASS (line-ending normalization notice only).
- Graphify AST update run after code change; existing optional-extractor limitations remain unrelated.

Result: software review gate PASS, DONE/claim released. User must replace the two archive/checksum files in /root, verify/extract and resume the normal launcher; do not delete /etc/mushroom or existing secrets. No remote server access, push/merge, swap creation, resource tuning or production sign-off. Passing this guard does not prove all environments/builds fit concurrently or establish sustained-load capacity. Next eligible action: owner resumes installation on the chosen VPS; no next batch started.

## F12-T02-I04 — Docker default network IPAM

Task ID: F12-T02-I04
Completed at: 2026-10-22
Agent/Thread: Codex /root
Batch ID: INSTALLATION-04
Depends on: F12-T02-I01/I02/I03 DONE
Reviewed by: Codex /root; source/combined diff and acceptance review PASS

Problem: owner VPS completes package setup then allocate_networks attempts to iterate IPAM.Config=null on Docker default networks. Actual local Docker confirms host/none Config=null; previous tests only covered networks with explicit subnet lists. This is an installer bug; apt/needrestart/systemctl informational messages preceding it are not its cause.

Changed files:
- installation/manager.py: treat null/missing IPAM/Config as no assigned subnet, retain IPv4 overlap/host-route/isolation/saved-choice rules. CLI wrapper catches unexpected Exception as well as KeyboardInterrupt and uses existing redacted class/source location diagnostics; argparse SystemExit still propagates normally.
- installation/test_installation.py: standard host/none/bridge plus missing/null IPAM/config, foreign IPv4 collision, IPv6 and retry fixtures; retained three distinct persisted subnets and no network writes. CLI unexpected-TypeError no raw message/traceback test and preserved argparse exit test.
- installation/README.md: manager-only recovery for the already-uploaded bundle; retain state/packages/secrets.
- coordinator STATUS/checklist/this log: claim, review and handoff.
Migrations/runtime resource/secret contracts: unchanged.

Verification:
- Ubuntu24.04 WSL: python3 -B -m unittest discover -s installation -p test_installation.py -q →38 cases,36 PASS,2 existing skips (age/caddy unavailable in WSL; unchanged integrations verified during I02).
- Actual local Docker network inspect bridge/host/none: bridge has explicit subnet; host/none Config=null. Baseline4e81baa fails with TypeError on actual local Docker network-list/inspect data. Fixed allocator with identical read-only network commands and a temporary state directory →PASS; three distinct subnets, identical second-run state. No Docker network/container creation/removal/restart. Host routes are fixtures for this Windows-hosted inspection test; their collision coverage remains in the unit suite.
- python3 -B installation/build.py and SHA256 check →PASS. Fresh ignored archive:26,268 bytes; SHA256 bb2eab7106f445a7d4e2fcdd1bf0562158b33aae2142528856b000afa9923674. Standard archive allowlist regression included in suite.
- bash -n installation/install.sh and git diff --check →PASS.
- graphify update . →exit0; pre-existing optional SQL/HCL extraction dependencies/chat parser limitation unchanged. Outputs ignored.

Result: DONE, main review PASS, claim released. User can transfer only the updated installation/manager.py to /root/mushroom-installer/installation/manager.py then rerun the same install.sh. The saved packages step prevents unnecessary package reinstallation and persist_bundle updates the installed manager copy. No actual owner server access/change, reboot, real credentials/provider operation or push/merge. End-to-end VPS installation still awaiting owner retry. Next eligible action: owner resumes installation; no next batch started.

## F12-T02-CI01 — PR27 validation repair

Task/batch: F12-T02-CI01 / PR27-CI; sole coordinator/writer Codex /root; 2026-10-22.
Owner request: diagnose/fix failed front → dev PR27 checks. Baseline9a1ba8b clean. Local main-agent source/combined-diff review PASS; READY_FOR_CI, claim retained until hosted checks pass. F12-FE01 product/clinical acceptance remains REWORK.

Observed hosted failures: CI lint stopped later gates; installer API build lacked DATABASE_URL for Prisma generation; workflow actionlint rejected masked assignment exit codes; dashboard artifact typecheck exposed missing statuses, ES2017 BigInt and stale numeric query schema. Security and app/web/API artifact jobs passed.

Changes:
- CI split assignment/export, installer build-only DB placeholder, OTP_PEPPER passthrough; explicit disposable historical product/media/Mezaj integration steps retain coverage and destructive-test isolation.
- Dashboard React lifecycle/ref lint corrections, missing follow-up labels, ES2020 target; numeric Swagger query annotations and regenerated OpenAPI/client with pagination contract regression. Generated existing endpoint/shape drift aligned with actual API source.
- Vitest source aliases, current schema3/card-link expectations, hold callback regression. No check/rule disabled or immutable migration rewritten.
- Clean full-suite run revealed obsolete historical product fixtures/latest-ORM seeding, hardcoded migration count, unisolated media fixtures, stale retained-cart expectation, live-config import timing and overbroad staff exclusion. Correct fixtures/opt-in CI execution and assertions; preserve row/constraint/permission coverage.
- Six PatientEntry/PatientEntryPolicy Prisma onUpdate annotations now explicitly NoAction, matching immutable SQL. Fresh full-history drift regression added. No DB behavior/migration/data change.

Verification (local):
- pnpm lint and pnpm typecheck PASS; dashboard production build PASS (32 pages); API test TypeScript compile PASS.
- Dashboard39 files/168 tests, App36 files/185 tests, client2 files/12 tests PASS.
- Clean tracked-file sandbox, no .env, unique PostgreSQL16: initial full run517 API tests passed and nine files exposed failures above; it was NOT a green full run. After corrections, all failed areas rerun: five runtime files56 tests PASS; Mezaj/catalog28 PASS; historical product migration2 cases PASS; Phase12 full-history/drift2 PASS. Final schema diff: No difference detected.
- Actual Chromium StrictMode hold-to-delete: early release, latest callback, disabled cancellation and keyboard hold PASS; no page errors.
- actionlint all workflows PASS; release-contract script PASS; real installation PostgreSQL bootstrap/all79 migrations and Ubuntu encrypted restore rehearsals PASS.
- git diff --check PASS; protected slider-data.ts/justforcheck.md and migration SQL unchanged. Final Graphify AST update required/completed before checkpoint; known optional SQL/HCL extractor warnings unrelated.

Isolation: own ephemeral PostgreSQL containers and copied workspaces only, cleaned after runs; no real server/provider/GitHub secret or user data mutation. Logs retained in local Temp (hc1fxz initial, sUojQH corrected runtime, 4Aw0YW final drift). No subagents, merge or deployment. Next action: push corrective checkpoint and require full hosted checks before final acceptance.

Hosted follow-up on3084568: security, release contract and all four app/web/dashboard/API image build/smoke/scans PASS. Main CI lint/typecheck/pnpm test, wallet and historical-product steps PASS (advanced to build). Installer build/environment/fresh bootstrap PASS; restore failed at createdb after socket-only readiness. Both fixture runners now require TCP readiness, excluding temporary initdb server. Corrected real bootstrap and Ubuntu encrypted restore rehearsals both PASS; own containers/networks removed. Sole-writer scope extended to these two fixture runners; no production manager change. Hosted revalidation still pending.

Browser follow-up: existing Phase11 suite still expected removed account text/manual clinic input. Scope includes this e2e fixture; assert current authenticated navigation/sidebar, mock authorized clinic lookup and retain request scope/auth/no-export checks. Non-ADMIN/disabled/revoked-session no-disclosure/no-protected-request checks preserved. Actual production standalone Chromium replay:7/7 PASS (4.8s). No application auth/UI behavior changed.

Hosted assessment follow-up:417/421 cases PASS; four failures confined to custom-program-delivery lock observations/time budgets in the shared historical-fixture database. All23 unchanged cases PASS in a fresh disposable database (65.6s tests), including exact consent withdrawal and lock-order assertions. Give this existing suite its own patient_journey_custom_delivery_test CI step, leaving all23 cases/production behavior unchanged; remaining22 suites retain shared assessment step. Local sandbox used an exclusive random forwarded port and changed only copied isolation-helper expected port to avoid the pre-existing localhost:55419 database; no original guard or existing database modified. Scope remains CI fixture isolation; no authority/medical runtime changes.

## F12-T02-CI02 — Restore dev deployment with working SSH options

Completed:2026-10-22; batch DEV-SSH; sole coordinator/writer/reviewer Codex /root. Depends on F12-T02-CI01 hosted checks PASS on1827010 (CI39684652238, installer39684652370, artifacts39684652239); owner merged PR27. Previous READY_FOR_CI entries are historical; CI01 claim released. Owner now explicitly requests commit/push on dev. Clean/current origin/dev baseline4689734.

Observed: GitHub OpenSSH10.2 connection closes during sntrup KEX before user authentication; private key fingerprint matches successful server-local test. Owner-provided GitHub test using curve25519-sha256 and IPQoS=none authenticates and exits0. This proves that combination works on the observed path; it does not isolate which setting fixes the network problem.

Changes: scripts/deploy-dev-vps.mjs adds ConnectTimeout=20, KexAlgorithms=curve25519-sha256 and IPQoS=none to existing common sshOptions, covering all3 SSH commands and rsync transport. .github/workflows/dev-sync.yml restores real sync/deploy command in place of temporary diagnostic printf. Pinned host-key verification, identity restrictions, exclusions and existing deployment guards retained. Coordinator STATUS/checklist/this evidence synchronized. No real secret, application/schema/migration/provider or production change.

Verification: node --check PASS; intercepted execution of actual module with synthetic environment PASS (3 SSH calls + rsync all carry expected compatibility/security options; port9011, env exclusions and source-SHA deployment command retained); no network command executed by this check. node scripts/test-release-pipeline.mjs PASS; actionlint1.7.12 all workflows PASS; git diff --check PASS. Graphify AST update performed, existing optional extractor warnings unchanged. Main-agent combined diff/owned paths review PASS. No broad application tests needed for transport-option/workflow-only change.

Result: software task DONE, review PASS, claim released. Push to dev intentionally triggers real shared-dev deployment per owner request; live deployment success is not yet established. Next eligible action: inspect that workflow; broader F12-FE01/F12-T13 acceptance remains separate, no next roadmap batch started.

## F12-T02-CI03 — Make stalled source upload observable and bounded

Completed:2026-10-22; sole coordinator/writer/reviewer Codex /root; batch DEV-SYNC-DIAGNOSTICS; baseline0ac681e clean/current dev. Continuation of owner-authorized dev deployment repair/commit/push.

Evidence: server rsync134059 sleeping in do_select; workspace4KiB. Associated SSH connection reports zero send/receive queues, bytes_sent3259/acked3259, bytes_received2486 and lastsnd/lastrcv341899ms. Thus no new data in about342s, but this does not distinguish sender/protocol/path causes. Existing local tracked source about18MiB. Prior working test only establishes SSH authentication with the observed option combination, not bulk transfer.

Change: scripts/deploy-dev-vps.mjs logs start/complete/failure of directory, lock, upload and build/verify stages without credential/host values. rsync prints file-list/progress/stats using line buffering and fails after90s without data I/O. Existing SSH options gain15s encrypted keepalive interval/4 unanswered probes. Preserve checksum, delayed deletion/update, env/generated output exclusions, pinned host verification and stop-before-build on upload failure. No speculative cipher/MTU/firewall/server-data changes.

Checks: node --check PASS; node scripts/test-release-pipeline.mjs PASS; intercepted actual-module success/failure scenarios PASS: all4 named phases, all3 SSH calls/rsync transport include security/compatibility/keepalive options, expected rsync timeout/progress/exclusions preserved, simulated rsync exit30 propagates and never invokes build. No real network command executed by this verification. git diff --check PASS; Graphify AST update run, known optional extractor limitations unchanged; combined diff/owned-path review PASS. No application test suite repeated for transport diagnostics only.

Software task DONE; deployment incident remains REWORK, cause unproven. GitHub old run39703762190 on0ac681e observed in progress; new dev push triggers replacement diagnostic execution. Next action: inspect upload progress/error before choosing any transport workaround. Broader F12-FE01/production acceptance unchanged.

## F12-T02-CI04 — Development API compiler heap

Completed:2026-10-22; batch DEV-COMPILE-HEAP; sole writer/coordinator/reviewer Codex /root. Owner continuation of dev VPS deployment repair; clean/current4899c1c baseline.

Observed: after owner applies temporary SSH MSS1200 diagnostic rule, source upload and all79 migrations complete. tsc then aborts SIGABRT at about635MiB old heap. deploy/vps/dev-service.sh explicitly imposed max-old-space-size640 on the compiler. This is V8 heap exhaustion, not evidence of kernel/container OOM or a migration failure. Bootstrap service has no API runtime1GiB memory limit; raising that separate runtime limit would not fix this compiler setting.

Changes: deploy/vps/dev-service.sh raises only the compile command Node heap to1536MiB. scripts/test-release-pipeline.mjs expected compiler contract updated accordingly. Existing compiler flags, dist cleanup/source marker, no-watch API runtime, runtime memory limits, ordered bootstrap and migration/credential handling remain unchanged. Coordinator status/checklist/evidence synchronized. No direct server/database or secret modification.

Verification: actual TypeScript5.9 clean full API emit using Node --max-old-space-size1536, same noCheck/declaration flags, incremental=false and exclusive temporary output PASS (10.9s), main.js exists; checked Temp-child cleanup removes only generated temporary output. Local environment differs from live Linux VPS; this establishes compiler headroom locally, not total-host capacity. node scripts/test-release-pipeline.mjs PASS (includes shell syntax); bash scripts/test-vps-dev.sh PASS covering first sync, unchanged retry, source/artifact refresh, failure recovery, readiness/cache repair and lock wait; git diff --check PASS. Graphify AST update run with known optional extractor limitations unchanged. Main-agent combined diff/owned paths review PASS. No unrelated application suites repeated.

Result: scoped software task DONE; claim released. Push to dev triggers new deployment. Existing successful migrations are retained and normal deploy retries apply only pending migrations; first-admin bootstrap remains after successful compile. Actual VPS compile/startup and sustained RAM/swap capacity remain external until observed. No next roadmap batch started; F12-FE01/F12-T13 acceptance unchanged.

## F12-T02-I05 — Initial administrator clinic membership

Completed:2026-10-22; batch INSTALLATION-05; sole writer/coordinator/reviewer Codex /root. Explicit owner request to fix the installer and commit, without a static phone. Baseline dcad898/current dev clean. Depends on I01/I04 and CI04 accepted installer/deploy contracts; no ownership conflict, no subagents.

Problem: initial helper created ADMIN identity/role but no clinical_clinic_accesses membership; wallet administration separately requires exact clinic scope. Owner already repaired the current account manually.

Changed files:
- apps/api/prisma/bootstrap-installation.mjs: retain selected default-clinic ID or RETURNING ID from newly inserted clinic; insert one membership for newly created user ID inside original transaction; existing first-admin audit records clinicId using UUID-typed parameters. All identity selection remains driven by validated input.phone; no static owner phone/IDs or all-admin/all-clinic grant.
- scripts/test-installation-bootstrap.mjs: generated valid synthetic admin phone per run; real membership/phone/clinic/audit identity assertions; rejecting audit trigger verifies membership already exists and all identity/scope rows roll back; concurrent retry remains single; password hash policy/unchanged retry, different-user denial and later scope-revocation preservation covered.
- scripts/test-installation-postgres.mjs: clone the untouched fully migrated disposable database before first case; run same real suite for default clinic and no-active-clinic creation, exclusively inside its own UUID-named PostgreSQL16 container.
- installation/README.md: document exact initial clinic scope and existing-account retry boundary.
- plan/STATUS.md, phase checklist and this log: ownership/review/evidence synchronization.

Verification:
- node --check for helper and both fixture runners PASS.
- node scripts/test-installation-postgres.mjs PASS: all79 immutable migrations, both default/new-clinic suites, generated input phones, exactly one correct active-clinic membership/audit under concurrent initialization, audit-failure rollback, credential preservation, refusal to upgrade an existing ordinary user/change administrator, invalid password rejection, no fabricated consent, and revoked membership not silently restored on retry. Own fixture container/databases removed by finally; no real server/database accessed.
- node scripts/test-release-pipeline.mjs PASS; git diff --check PASS; Graphify AST update completed with existing optional SQL/HCL extraction/chat-parser limitations unchanged; generated graph outputs ignored.
- Main-agent source/combined-diff review PASS: only owned paths, no schema/migration/auth-policy/API/client or protected-file edits. No broad application suite repeated for this bootstrap-only fix.

Result: software task DONE, claim released. Commit/push on current dev as requested in ongoing session. The helper is consumed from the repository deployment checkout, not bundled as standalone manager code; manager.py/archive runtime behavior unchanged. Fresh installations gain exact clinic scope; existing-admin early return intentionally preserves existing/revoked scopes and password. Current owner manual repair is retained; no automatic historical backfill or live data mutation. Next eligible action: updated checkout for future first-run installation; no next roadmap batch started, broader F12-FE01/F12-T13 acceptance unchanged.


## Operational orders workspace — IMPLEMENTED_UNVERIFIED

2026-10-22; explicit owner instruction to make dashboard orders operational and remove browser confirmations/prompts; same F12-FE01 /root sole writer/reviewer, REWORK/unchecked. Initial worktree clean; existing completed installation/CI/handle work preserved. Applied frontend-design/ui-ux-pro-max/ui-styling and Vercel React guidance to existing dashboard tokens, and scoped NestJS/ponytail guidance to additive reads. No dependencies, schema migrations or new batch.

Dashboard orders now has server-backed query/status/shipping filters, local-digit normalization, server counts/pagination, responsive cards/table, preserved order list on errors, and separate legacy reconciliation errors. Each order opens an accessible native dialog with focus/scroll restoration, real line items and SKU/quantity/prices, stored recipient/address, total breakdown, actual latest50 order activities, payment/refund data and current allowed controls. Shipping, cancellation/return/rejection, refund, refund approval/manual execution/completion/rejection, shared-billing refund/completion, gateway retry/failure resolution and legacy evidence reconciliation use inline forms and explicit in-page submission. Removed all window.prompt/window.confirm from the order workspace; discard warning is in the dialog. No bank success is invented for shared billing: success comes from existing gateway retry/verification; reviewed failure uses existing evidence endpoint.

Read-only backend additions: bounded GET admin/commerce/orders/search and scoped GET admin/commerce/orders/:orderId; same class ADMIN/COMMERCE_MANAGE guard and existing active-clinic scope, no mutation-policy changes. Search covers exact order number, patient phone, recipient JSON and product snapshot name; stable createdAt/id ordering, server page/total. Detail selects stored lines/address, latest50 operations, minimal shared-billing/refund/attempt metadata and explicit refundRoute based on the same verified payment markers as existing legacy refund guard. Old list remains compatible with Home summary/callers. No financial authorities/permission gates expanded; shared refund/attempt mutations still require existing BILLING_MANAGE.

Money handling uses BigInt exclusively: order entry/display TOMAN, shared refund request amount×10 to IRR, shared result display preserves subTOMAN remainders, pending/completed refund holds deducted from available amount. Existing mutation wrapper signatures accept optional supplied command keys; dialog preserves key per opened action and exact payload on retry. Fulfillment target is captured on action opening so a timeout/refetch cannot advance an extra stage. Tracking+shipping are existing sequential operations with separate stable keys; a shipping failure can leave successfully saved tracking, shown by actual refresh. Failed action keeps form/error; post-success refresh failure explicitly reports success plus refresh issue rather than inviting duplicate mutation. No fabricated evidence sent for transitions that do not require it.

OpenAPI source updated for additive reads and client schema regenerated using openapi-typescript only; no app build/export/typecheck used. Added unexecuted regression sources: backend clinic-scoped search pagination/digits and detail denial, frontend fulfillment branches/refund hold arithmetic, wrapper command-key propagation and exact large TOMAN-to-IRR conversion. Source review only: traced controller→domain for every action, legacy/shared refund distinction, existing strict workflow states, SQL/Prisma read shapes, idempotency/refresh behavior, UI field limits and access boundaries. No actual order/payment/refund mutation, provider activation or database write executed by agent.

Deferred at explicit owner request: all tests, typecheck, lint, build, automated browser and Graphify update. No PASS/commit/DONE claimed. Practical limits: only actual backend-supported stage transitions are offered; existing rejected-request terminal states and old order/payment contracts are not silently reinterpreted. Legacy reconciliation queue retains its existing read contract; modern ambiguous attempts are managed in the related order dialog, using pending-payment filters to locate orders. Next: owner review at http://localhost:3002/orders, then explicitly authorized final verification. F12-FE01 remains REWORK/unchecked.


## Sadad request diagnostics — IMPLEMENTED_UNVERIFIED

Owner subsequently explicitly authorized a dev-branch checkpoint commit before execution verification. This supersedes the earlier no-commit hold for this slice only; tests and acceptance remain deferred, F12-FE01 stays unchecked/REWORK. No push requested.

2026-10-22; explicit owner request, same F12-FE01 /root sole writer/reviewer; no subagents/new batch. Initial worktree clean; preceding orders implementation preserved. Owner defers all tests/typecheck/lint/build/automated browser/Graphify until interface review. Task REWORK/unchecked, no final commit or DONE.

Finding: BillingGatewayAttempt already retains resultCode while the patient response deliberately returns only status/amount/redirect; legacy PaymentAttempt retains providerResultCode. Transport failures previously discarded HTTP status and collapsed into ambiguous request/verify codes. Existing provider settings had no attempt history. No claim about the numeric cause of the owner's historical FAILED sample was made from status alone.

Implemented: Settings → payment providers → Sadad → requests/events, with server search (attempt/intent/order/provider-order IDs, phone/name/result code), exact status and creation-date filters, bounded pagination, loading/error/empty/retry handling, native detail dialog/focus restoration and explicit refresh. Detail shows user identity, purpose, amount in IRR, immutable request/provider identifiers, configuration revision, current status/code, bank reference/trace and timestamps. Current and legacy paths share one scoped read projection; no tokens/credential columns selected. Read endpoints require existing COMMERCE_MANAGE + BILLING_MANAGE and actual clinical clinic membership; the ADMIN role already holds both. Bound SQL only, no raw interpolation; clinic/config/patient scope checked before reading trace events.

Adapter REQUEST/VERIFY and validated browser CALLBACK events use existing indexed AuditEvent storage; no new dependency/table/migration/logging subsystem. Metadata is an explicit whitelist of source/stage/outcome/numeric ResCode/duration and safe HTTP/network/timeout/invalid-response classifications. No raw bodies/headers/error text/card data/Token/SignData/terminal credentials recorded or returned. Persistence failure logs only a generic warning and cannot change financial decisions. Verify receives only the already-known provider order ID as optional diagnostic context; existing amount/proof/idempotency/settlement/reconciliation logic retained. Browser callbacks are marked RECEIVED, never treated as payment proof. Stage success is distinguished from final settled status; settlement retry remains visible through existing saved local codes. Invalid callbacks without a validated known attempt are not captured as transaction history.

Historical attempts show their existing saved status/code/reference; unrecorded stage details cannot be recovered and are identified explicitly. HTTP status is available for transport HTTP/invalid-JSON failures; successful HTTP status is not separately stored. Trace detail returns at most the latest100 events with a truncation indicator. Numeric provider codes are shown verbatim without speculative translations; existing local codes have explanatory text.

Additive OpenAPI source updated directly from the DTO/controller source and schema.generated.ts regenerated with openapi-typescript only (no API export/build). Added unexecuted diagnostic regression sources covering secret redaction, exact rejection codes, untrusted legacy callback handling, safe HTTP classification, authorization-before-event-read and response-body exclusion. Source review traced both actual gateway flows, DI/module wiring, DTO/schema/wrapper agreement, SQL table/column mappings and safe projections, retained financial branches, permission merge and ADMIN grants, dialog lifecycle and stale-response protection. No runtime validation result is claimed.

Pending after owner review: actual PostgreSQL list/detail pagination and clinic isolation (both paths); execute new diagnostics plus existing adapter/shared/legacy payment regressions including logging failure; Swagger export/source parity, typecheck/lint/build; responsive/keyboard/focus/error/empty browser review. No live bank call/payment/refund/configuration/credential/database mutation executed by agent. Next: owner reviews Settings → payment gateway → Sadad → requests/events and can paste the reported attempt ID to locate its persisted code; then run explicitly authorized deferred verification.


## Sadad detail500 correction — IMPLEMENTED_UNVERIFIED

2026-10-22; same F12-FE01 /root, owner reports GET /admin/commerce/payment-providers/sadad/requests/BILLING/:attemptId returning500 on dev (reported request IDs6da157c8-cfa0-4bfa-8958-14286c180f42 and7cb7c1bd-4732-4d61-bd25-c1d00dad7a19). Source-level defect: both branches of rows() project a.id::text, but detail() compares r.id with a UUID-cast parameter. PostgreSQL has no text=uuid equality operator. List reads do not perform that incompatible comparison. Corrected the bound detail parameter cast to text; controller ParseUUIDPipe, source discriminator, permissions and clinic membership predicates unchanged. No migration/client/financial-state change.

Static review only; no server logs or actual runtime/SQL replay inspected, no tests/typecheck/lint/build/browser/Graphify run under the continuing owner deferral. Required deferred regression: execute the real shared UNION detail query on PostgreSQL for BILLING and COMMERCE valid IDs, missing UUID and out-of-clinic UUID, plus authorized deployed request retry. No claim of deployed recovery. Pre-existing patient profile/address/sheet changes preserved. Owner subsequently authorized a separate correction checkpoint commit on dev; execution checks remain deferred. Task remains REWORK/unchecked, no final acceptance. Next: deploy this narrow fix and retry the affected request.

## F12-FE01-CHAT01 — ejabberd backend replacement — IMPLEMENTED_UNVERIFIED

Date: 2026-10-23 Asia/Tehran. Coordinator/writer/reviewer: Codex /root, continuation of CLIENT-INTEGRATION / F12-FE01; no parallel batch. Owner explicitly requests ejabberd replacement, a new branch before changes, inspection of all chat connections before implementation, and reserves frontend plus all execution testing. PR to dev is authorized only after successful testing. Branch created from the observed clean `dev@c54d129`: `codex/chat-ejabberd`. No task-level commit, push, PR or merge performed.

Read source connection map before implementation: patient chat/waiting-room/detail/Home links and client; dashboard messages/client; assigned physician appointment context; chat tables/relations and read/send/UTC-window/block/report/moderation/receipt/audit policies; identity session/user revocation registry; outbox worker; Swagger and deployment boundaries. Full mapping: `plan/chat-ejabberd-handoff.md`. Existing Phase10 rules and retained data were preserved; owner-approved transport decision recorded in ADR-0040.

Changed sources:
- New `apps/api/src/modules/communications/chat/ejabberd/{ejabberd.config,ejabberd-api.client,ejabberd-session.service,ejabberd.controller,ejabberd.dto}.ts`.
- Existing chat service/module, gateway, publisher and connection registry for policy reuse, native write admission, visibility invalidation and existing revocation hooks.
- Narrow environment validation, stable error-code registration, private request-body/header redaction and optional engine readiness dependency.
- `deploy/ejabberd/{Dockerfile,mod_sabz_chat.erl,ejabberd.yml,compose.yaml,env.example,nginx.conf.example,README.md}`.
- Scoped ADR/connection handoff/STATUS/checklist and this log. No app/dashboard source, frontend dependency, lockfile, application migration or database records changed.

Implementation: bounded private engine API client; verified private-room options per existing conversation; five-minute-or-less RS256 leases bound to current application user/session/expiry and fixed resource; fresh role/clinic/appointment authorization; lease tracking and existing three-connection/session revocation fences; engine JWT admission plus per-stanza fail-closed policy; existing idempotent canonical text commit before routing; safe native live/MAM projections; retained REST cursor history and visibility reconciliation; body-free live restriction/restore invalidation; receipt markers update existing monotonic receipts. Native engine login/publish fails closed on old/untracked/revoked credentials, stale roles, unavailable policy or unauthorized rooms. Temporary upstream errors use service-unavailable, rate limiting uses resource-constraint and policy denial uses forbidden. No direct user messaging, public room creation/invitation, federation, unvalidated rich payload or public medical upload is enabled.

Deployment: isolated ejabberd-managed PostgreSQL database/role on the same PostgreSQL service; pinned 26.09 engine/OTP compiler profile; private admin API and callback, loopback-only reverse-proxied WSS; environment/file-mounted secrets stay outside Git; `CHAT_TRANSPORT=socketio` remains default until explicit owner cutover. In ejabberd mode the old Socket.IO admission/direct legacy send are rejected and API readiness probes the engine. Engine archive is a delivery projection; existing PostgreSQL clinical history/moderation/audit remain canonical. Current release topology is single API instance. Media and calls remain outside this accepted text-only cutover; private attachment integration is explicitly unfinished and not represented as ready.

Review/evidence: static source tracing against official ejabberd 26.09 command/JWT/c2s hook/MAM APIs, DI/config/protocol and ownership review; `git diff --check` clean. Graphify AST refresh completed locally with no LLM/API usage; SQL/Erlang extractor dependencies absent, graph warnings retained. Its chat.service.ts parser warning was checked using TypeScript source parsing only (zero parse diagnostics), not a compiler/typecheck or runtime test. This does not establish integration correctness or production readiness.

Not executed, explicitly reserved to owner: tests, API typecheck/build, Erlang compilation/image build, Compose/proxy validation, actual DB/engine/server startup, two-user/reconnect/retry/revocation/moderation/window/resource checks, browser/frontend implementation, and official OpenAPI/client generation (normal command compiles API). DTO/Swagger source is implemented; generated client remains pending that owner gate. Exact setup/endpoint/SDK/renewal/idempotency/visibility/receipt/acceptance handoff: `deploy/ejabberd/README.md`.

Status: IMPLEMENTED_UNVERIFIED / REWORK, task unchecked; no completed-task commit. Next: owner frontend and isolated acceptance, then coordinator review, synchronized evidence and task-level commit/PR targeting dev. No new batch is eligible to start under this claim.


## F12-FE01-CHAT01 — both frontends, sole engine and Caddy continuation — IMPLEMENTED_UNVERIFIED

2026-10-23, same sole /root CLIENT-INTEGRATION / F12-FE01 coordinator; no new batch or commit. Owner supersedes previous frontend handoff, asks implementation in both frontends and actual proxy compatibility, then explicitly rejects retaining two transports. All execution tests remain owner-reserved.

- Reviewed patient/dashboard chat routes/wrappers, session-aware fetch, assigned-appointment links, native policy/identity lease flow, VPS Compose/dev/release scripts, installer proxy generation/bundle/environment audit, and Next local client directive documentation. Applied React performance skill and existing NestJS/Graphify/Context7 guidance. Context7 did not index the XMPP Stanza package (returned an unrelated NLP library); used official upstream and installed 12.22.1 source/API declarations instead.
- Removed runtime Socket.IO gateway, both duplicated browser adapters, API/frontend dependencies and obsolete Socket.IO-specific transport specs/load specs. Retained original PostgreSQL clinical ledger, authorization/moderation/report/receipt/outbox business behavior. Removed old public REST message POST and generated operation. Remaining business integration fixtures that call the removed POST are owner adaptation work, not accepted evidence for this engine.
- Shared packages/api-client/src/chat-engine.ts dynamically loads StanzaJS, scopes private room/session, confirms canonical echo with stable origin IDs, renews/reconnects, performs retained history and visibility reconciliation, keeps credentials in memory and never selects another write transport. Latest 50 messages and on-demand older pages replace eager full history. Patient/dashboard update functionally, guard in-flight sends, preserve edited drafts after an await/error, keep retry UUID for the same payload, format timestamps and distinguish senders. Token refresh no longer clears the dashboard draft. Read-only state can be rechecked.
- Native lease JIDs include a random connection nonce to avoid same-second multi-tab resource collisions. Normal expiry/revocation removes affiliations when reachable; API crashes/cleanup failures can leave policy-denied expired rows, documented as operational housekeeping. No media/upload/call claim.
- Actual deployment uses Caddy in installation/manager.py and deploy/vps/README.md. Removed the nginx example. Supplied exact API-domain WebSocket route, browser Origin allowlist and private-policy denial; installer preserves external per-environment imports. Dev/release scripts require chat.compose.yaml; installer operations include it and audit covers its settings. Bundled only safe configuration/runbook examples. Required keys/SQL/engine image and Caddy snippet remain owner provisioning. Existing application release manifest remains four images; publish a reviewed engine digest first. Chat health /v1/health/chat is independent of ordinary API readiness.
- Changed files: API chat controller/DTO/module/service, engine policy/session/API/config sources and Socket.IO gateway removal; API health/config/error/log registrations and env/package; both frontend chat pages/wrappers, dashboard session fetch export and package dependencies; shared API-client source/export/OpenAPI/generated types, pnpm-lock; deployment engine files, VPS deploy scripts and template comments; installer manager/bundle list; ADR0040, handoff, STATUS/phase/log. Unrelated protected paths remain untouched.
- Executed dependency manifest/lock operations with lifecycle scripts ignored; synchronized source OpenAPI and ran openapi-typescript generation only (not Nest Swagger exporter/API compilation). Windows transient file locks caused write attempts to fail; generation was retried. Source/whitespace review only. No tests, typechecks, lint/build, Erlang compile, browser, Docker, database changes or actual deploy. Graph metadata refresh is AST-only and separate from runtime verification.
- Acceptance remains unchecked REWORK. Owner must run the exact native-engine/contract/build/security/retry/history/multi-tab/moderation/browser/deployment checklist in deploy/ejabberd/README.md. After successful acceptance only: final task-level review/commit, push and PR targeting dev. No parallel batch started.

Graph refresh completed (AST-only, exit 0): 11180 nodes / 32069 edges. SQL/Erlang/HCL extractors were unavailable; chat.service.ts again received the graph parser syntax warning and partial extraction. This is not a TypeScript compile result; owner compilation remains required. Final whitespace diff review reported no errors. Protected unrelated paths were not edited.



## F12-FE01-CHAT01 — pnpm dev local chat startup — IMPLEMENTED_UNVERIFIED

2026-10-23, explicit owner continuation: make root pnpm dev bring up chat automatically. Same /root coordinator, CLIENT-INTEGRATION / F12-FE01 scope, REWORK/unchecked; no new batch. Prior execution-test deferral remains active.

- Inspected root/package API dev commands, Turbo strict environment, API dotenv precedence, root PostgreSQL Compose, engine deployment config/Dockerfile, development guide and ignore rules. Applied Graphify/Ponytail and official Compose guidance for health waiting and host connectivity.
- Added scripts/dev.mjs and deploy/ejabberd/compose.local.yaml. Root dev/dev:api preflight local Docker/Compose, create/reuse ignored local credentials/RSA keys with restrictive Unix modes, claim a per-checkout PID lock, build/start private engine SQL and ejabberd with health waiting, build shared client and launch Turbo. Forward fixed local engine settings/host API port through Turbo strict env. Windows process-tree termination uses the known child PID, POSIX uses its child group. Ctrl+C/failure stops only the dedicated checkout project and preserves volumes/keys; no database reset, migration or seed. Refuse non-development settings. First-run download/build happens when the owner runs the command, not during this agent turn.
- Additional SQL container is local-only and unpublished; no alteration to the existing application DB, its Docker Compose or VPS integration. Normal original DB/environment initialization remains prerequisite. Host API listens on0.0.0.0 for Docker's host.docker.internal policy callback. Browser WS/admin bindings are127.0.0.1 only. Multiple checkouts use separate project/volume/image identities but need distinct ports if concurrent.
- Backend WS validation permits plaintext only for loopback in development; WSS remains required elsewhere. The local helper targets same-host browsers; LAN/Codespaces/remote use requires a reachable WSS deployment profile. .local is excluded from Git and Docker build context, including COPY . . images. Credentials are not printed and malformed JSON is reported without echoing its contents.
- Changed scope: scripts/dev.mjs, deploy/ejabberd/compose.local.yaml, package.json, turbo.json, environment.validation.ts, .gitignore/.dockerignore, API env comment, README/development/engine runbooks and existing task governance files. No dependencies or lockfile change required by this continuation.
- Source review only. No pnpm dev, Docker invocation/container, app/client build, tests/typechecks/lint/browser or database operations executed by agent. Owner must run Docker + pnpm dev and the existing native smoke/acceptance gates. No commit/push/PR or DONE state. Graph refresh is AST-only metadata, not verification.

Local-startup source/whitespace review completed without diff errors. Graphify AST refresh completed with exit0 (11194 nodes/32091 edges); unsupported extractor warnings are not compile results. Protected slider-data.ts and justforcheck.md remain unchanged. No runtime/build/test was executed; owner acceptance remains pending.


Local startup corrective (owner-reported pnpm dev preflight error): bounded read-only diagnostics confirm Docker CLI28.4.0, Compose v2.39.4 and current desktop-linux context; Docker Desktop/backend processes exist, but docker info and docker desktop status time out. No containers started/stopped, no Docker restart, no database/build/test. Split dev.mjs preflight into CLI/Compose/engine checks, report timeout distinctly and retain engine readiness guidance. Source-only corrective, task remains REWORK/unchecked; engine responsiveness is an external blocker before owner smoke acceptance.

## F12-FE01-CHAT01 — BEAM container startup corrective

2026-10-23, same /root scoped task, REWORK/unchecked. Owner ran pnpm dev: image built and chat PostgreSQL healthy; ejabberd exited1 before boot. Read-only stopped-container logs show erlexec Error1 executing /opt/ejabberd-26.09/erts-16.4.0.2/bin/beam.smp; inspected state confirms no OOM, exit within a fraction of a second. Upstream 26.09 container Dockerfile explicitly applies cap_net_bind_service=+ep to beam.smp. Our cap_drop ALL conflicts with that file capability. Consultation listeners use5280/5281 and need no privileged-port capability.

Corrective: custom Dockerfile installs/ensures libcap tooling as build-time root, removes BEAM's inherited file capability, and immediately restores USER ejabberd. Existing cap_drop ALL/no-new-privileges and unprivileged runtime/listeners remain. Same image correction covers local and VPS profiles. No volume/database/credential changes, no capability widening or root runtime. Owner reruns pnpm dev to rebuild via existing --build and confirm startup. No image build, live container start, API/browser/functional test performed by agent; read-only logs/state/source diagnosis and whitespace review only. No DONE/commit/PR.

## F12-FE01-CHAT01 — ejabberd JWT key format corrective

2026-10-23, same task/coordinator REWORK/unchecked. Owner startup retry passes BEAM exec and reaches configuration, then exits1: Invalid value jwt_key: No valid JWT key found in /run/secrets/ejabberd_public_key. Read-only logs/state show current rebuilt image, no OOM. Upstream26.09 ejabberd_options.erl loads jwt_key with jose_jwk:from_binary(Data); supplied PEM is the wrong format.

Corrective: scripts/dev.mjs derives public.jwk JSON from the existing checked signing key without rotating credentials; local Compose mounts that JSON at the existing public-key secret target. Added a small standard-library public-key export CLI for VPS setup (exclusive output write, distinct paths, RSA>=2048, public material only); runbook and env example now require .jwk. Existing private PEM, SQL volumes and credentials stay unchanged. No dependency, real key conversion, build, container start, database mutation or runtime test by agent; owner reruns pnpm dev. Source/whitespace review and AST graph refresh only. No DONE/commit/PR.

## F12-FE01-CHAT01 — local startup verification and final corrective pass

2026-10-23, same sole /root CLIENT-INTEGRATION / F12-FE01 coordinator. Owner explicitly says fix completely and report afterwards; this authorizes actual local startup/build/container verification and supersedes the previous startup execution deferral. Broader feature remains REWORK/unchecked; no new batch/commit/PR.

Root causes and fixes:
- Native boot rejected allow_private_messages: ejabberd26.09 uses allowpm. Updated both default-room YAML and backend create-room options. Engine then became healthy.
- Shared-client compilation surfaced opaque cursor object types, optional stanza IDs and Agent.disconnect typed void. Guard optional IDs/cursors, normalize void-or-Promise disconnect, make nullable cursor Swagger types explicit, and regenerate client. API strict compilation also required safe narrowing of message body/tombstone union.
- Turbo interactive:true rejected execution without its terminal UI. Dev servers do not require task input; kept persistent dev while removing the interactive requirement.
- Next/Turbopack resolved Stanza's Node platform and failed on DNS imports. Applied minimal pinned pnpm patch to Stanza12.22.1 browser metadata for platform/index.js and platform/node/index.js; package manifest/lock track the patch. Both OCI build templates COPY patches before frozen installation. No hand-edited installed dependency is required on the next checkout/install.
- Windows API watch reacted to unrelated generated tree changes; scoped Node watch to dist on Windows and excluded generated/local/dependency directories from TypeScript watch.
- The native room API was absent although node status was healthy: enabled mod_muc_admin. Native v2 get_room_options returns an object, not name/value array; now validate all required secure object fields. Fail closed on unsafe options. Added3 scoped regression tests.
- Offline Swagger export lacked new engine configuration. Added temporary export-only RSA key/default metadata with guaranteed cleanup; ran official exporter and synchronized only chat/health/error contracts. Existing unrelated commerce Swagger drift was left intact.

Execution evidence:
- Original failed launch reproduced; after fixes actual root pnpm dev launched both Docker services and all four applications. Repeat from stopped state also passed. Image used unprivileged ejabberd, stripped upstream privileged-port capability and existing cap_drop ALL/no-new-privileges; no privilege widening.
- Container ejabberd and chat PostgreSQL healthy. API /v1/health/live200, /ready200, /chat200; web localhost3000 /200, patient3001 /chat200, dashboard3002 /messages200, twice. These are real HTTP compilation/health checks, not screenshots or authenticated clinical-flow acceptance.
- Strict API tsc build PASS; shared API-client generate/build PASS. Official Swagger export PASS to ignored local output, chat-only synchronization and client rebuild PASS.
- vitest test/ejabberd-api.client.spec.ts:3/3 PASS (secure v2 options map/allowpm, existing-room retry, unsafe private-message option rejection).
- Native disposable room create, existing-room secure retry, member add/remove PASS using actual backend engine client. Room deleted successfully afterwards. No application conversation/user/message was fabricated or changed.
- Native WebSocket framing/features handshake PASS. Public policy request without shared secret returned401.
- Actual Ctrl+C on the final interactive launch stopped Turbo/Next/API and both chat containers; lock removed, application ports3000-3003 released, volumes/keys retained. Earlier controlled failure-stop also cleaned up.
- pnpm install --frozen-lockfile --lockfile-only --ignore-scripts PASS. Whitespace review clean. No application database migration/seed, manual clinical/financial operation or real message send, no VPS/production deployment, no final commit/push/PR.

Owned continuation files: native YAML and engine API/session client, shared chat adapter and source/generated contract, targeted API-client spec, API dev watcher/config and offline exporter, Turbo config, root patchedDependencies/lock + patches/stanza@12.22.1.patch, Docker API/Next patch inputs, scoped runbooks and plan evidence. Earlier backend/frontend replacement changes remain preserved; protected slider-data.ts and justforcheck.md remain untouched.

Remaining acceptance: actual authenticated patient/assigned physician/clinic operator delivery and stable-ID retry, moderation/privacy/window/revocation matrix, browser UI acceptance and real deployment/resource evidence. Keep full task unchecked until those pass; do not infer production readiness from local startup success.


## Consultation workflow and explicit chat closure — IMPLEMENTED_UNVERIFIED (2026-10-23)

Owner-authorized continuation of F12-FE01 / F12-FE01-CHAT01, sole /root writer/reviewer; same active batch, broader task REWORK/unchecked. No commit or DONE. Existing unrelated ejabberd, deployment, scheduling/settings and patient work preserved.

Implemented source: chat opens15 minutes before an eligible online appointment; slot expiry and COMPLETED no longer terminate chat. Persisted ChatConversation.closedAt now fences new messages under the same conversation lock used by explicit closure; re-read after send lock prevents send/close races. Assigned physician or clinic-authorized ADMIN can deliberately close with an audited, idempotent action; patient cannot close. Cancellation/no-show, pending approval, current identity/clinic/assignment and moderation checks remain. Retained history is not deleted. Additive access/close endpoints expose canSend/reason/opensAt/closedAt/canClose; explicit metadata projection avoids returning joined appointment/private fields. Shared transport polls readiness15s while visible and transitions to actual closed/waiting/connection states, preserving credentials in memory. No timer-based medical completion or automatic chat close.

Dashboard: role-aware paginated appointment list with real patient/service names, Tehran day/status filters, queue order and visible-page refresh; primary action opens /appointments/[id]. Legacy /queue displays the waiting view; duplicate queue navigation removed. Assigned DOCTOR uses existing clinical appointment/context/action routes rather than ADMIN operations. Per-doctor start conflict remains server-enforced; one physician no longer disables all others in UI. Shared workspace holds online chat, exact appointment encounter notes and existing patient prescription editor in persistent lazy tabs; completion uses inline confirmation and does not close chat. Chat closure has its own inline confirmation. Existing note editor extracted/reused with handled errors; no invented clinical/prescription source. Patient completed-visit history can still open its conversation.

OpenAPI additive source and official generated TypeScript synchronized for the new routes/fields; no formal new contract/spec chain, migration, schema change, historical backfill, actual patient/message/appointment mutation or provider action. The old completed local appointment was diagnosed read-only in the previous turn; no status was rewritten.

Source/diff review only. Owner-deferred tests, typecheck, lint, build, generated-vs-runtime Swagger parity and automated browser remain UNEXECUTED. Runtime SDK dist was not rebuilt in this turn; normal root pnpm dev startup rebuilds the shared client, so the current running process may still have the earlier dist until restarted. Required after owner review: actual physician/patient/admin delivery (including the previously completed appointment), readiness threshold/renewal/reconnect, explicit close/send ordering and unauthorized close, retained history, multi-doctor queues, clinical grant denial, exact encounter notes and prescription controls, pagination/mobile layout. Existing clinical/assessment consent time windows are not silently expanded by longer chat access. Voice/video remain unsupported.

Scoped source review follow-up: patient appointment list/detail now include real visitMode; online conversation links remain available after completion and are no longer offered for in-person visits. Patient appointment status OpenAPI enum corrected to the statuses actually returned. Official client generation completed; temporary Windows write-lock failures retried successfully without deleting or replacing unrelated source. Runtime compilation and delivery remain deferred. Clinical note drafts remain mounted across tabs; automatic status refresh only fetches the encounter until this appointment has one, avoiding background replacement of an open note editor.

### Native SASL connection correction (2026-10-23)

Same task/owner, REWORK/unchecked. Owner reported both real clients continually reconnecting despite canSend=true and HTTP101. Native logs show repeated X-OAUTH2 Invalid token: Stanza prefers X-OAUTH2 over PLAIN, whereas native auth_method=jwt verifies a JWT passed as a PLAIN password. Public Stanza Factory.disable API confirmed in installed source/types. Shared chat adapter now disables X-OAUTH2 and OAUTHBEARER; ejabberd configuration disables offering both. Official option reference: https://docs.ejabberd.im/admin/configuration/toplevel/#disable-sasl-mechanisms . No policy bypass, privilege widening, token logging or data changes.

Scoped runtime diagnosis: ephemeral45s bridge credential generated in memory from existing ignored local key; identical credential rejected under X-OAUTH2 and accepted under PLAIN. This special bridge identity does not validate patient policy or message delivery. Reloaded only the existing local engine configuration successfully; feature probe advertises PLAIN only. Real browser retry subsequently resulted in two connected native sessions and two authenticated occupants in the owner-reported conversation room (native get_room_occupants exit0, two rows with session resource). No new patient messages were sent and full patient-to-physician delivery is not claimed. Previous OAuth errors ceased in the inspected60s log window.

No SDK rebuild, tests, typecheck, lint, application build or automated browser. Server advertisement fixes existing running clients immediately; source adapter defense becomes active on normal future SDK rebuild. Full conversation delivery and UI owner review remain pending. No commit/DONE/new batch; unrelated work retained.

### Patient chat keyboard viewport (2026-10-23)

Owner-authorized UI-only continuation of same active task, REWORK/unchecked. Patient chat room now tracks `window.visualViewport` resize/scroll and adjusts its fixed room top/height to the visible viewport, keeping the composer and explicit closed-conversation card above a mobile keyboard. The message area now has `min-h-0`, vertical scrolling, and contained overscroll so it can use the remaining height when closed.

Source review only. As instructed, no tests, typecheck, lint, build, browser automation, or commit. Owner should verify keyboard/composer and closed-history scrolling on mobile; status IMPLEMENTED_UNVERIFIED.

## F12-FE01-CHAT01 — owner-requested area checkpoint commits (2026-10-23)

The owner reports testing/review complete and requested the branch work be committed by area. Four commits were created on `codex/chat-ejabberd`:

- `4acddcf` — `feat(F12-FE01-CHAT01): add ejabberd chat backend` (API policy/transport, removal of the Socket.IO gateway, and chat contract/client generation).
- `f4d50c9` — `feat(F12-FE01-CHAT01): connect chat clients to ejabberd` (shared Stanza adapter and patient/dashboard chat clients).
- `9d90ad9` — `feat(F12-FE01-CHAT01): add consultation visit workspace` (appointment access/closure and the patient/clinician visit workspace).
- `4a9f823` — `build(F12-FE01-CHAT01): provision ejabberd for development and deploy` (local `pnpm dev`, engine configuration, deployment and installer integration).

Each staged area passed `git diff --cached --check`. No tests or builds were run in this commit turn; the previously recorded local-startup, API/client compile and native smoke evidence remains in the earlier entry above. No push or PR was created. F12-FE01-CHAT01 remains unchecked/REWORK pending reconciliation of its full authenticated clinical/browser/moderation acceptance and deployment requirements; these commits are checkpoints and do not claim task completion. Unrelated booking/availability/calendar/settings changes were not staged and remain in the worktree.

## PR28 stabilization and verification (2026-10-23)

Task: F12-FE01-CHAT01 with existing F12-FE01 dashboard CI blockers. Same coordinator /root; corrective review, no new batch. Owner requested taking over and correcting the recent CI-repair process. PR28 is open against `dev`; no merge or deployment performed.

Reviewed the four recent CI fixes. Both deployment fixtures correctly supply the actual required ejabberd overlay. API image smoke now supplies disposable signing material and passed hosted artifact build/HTTP/non-root/security checks on 6b422c8. The latest installer failure was the unchanged environment-validation fixture, not a runtime regression. Hosted lint and Next security failures concealed additional stale test contracts.

Corrections:

- Removed the added unguarded microtask loads. Initial fetches update React state in their asynchronous response callbacks; filter/selection/retry resets run in user events. User/visit keys reset the message workspace, and token changes disable stale connection state. Request generations and effect cleanup still reject obsolete responses.
- Existing order/payment-request loading is derived from the current request identity; loading/error resets no longer synchronously cascade through effects. No financial action, permission or API contract changed.
- Dashboard appointment test mocks the actual session-aware transport. API validation fixtures include the required synthetic chat settings. Vitest creates and removes a temporary RSA key and points external engine calls at a closed loopback test port, independently of the owner's `.env`.
- Seven PostgreSQL chat suites now issue credentials through the public session API and submit native SEND policy callbacks. They assert the actual HTTP200/messageId contract. Persisted test roles match the JWT roles. External room administration alone is mocked; HTTP authentication, policy guard, session/resource checks and PostgreSQL remain real.
- Added policy regressions for the removed public send route, missing/incorrect policy key, signed distinct credentials, connection eviction, moderation at native delivery, durable revocation, and explicit closure after a completed visit. A first fixture revocation failed the existing paired-field DB constraint; corrected it to use the real session-deletion API, then all four policy regressions passed.
- Next advanced to resolved 16.4.2 with eslint-config-next16.4.1. Regenerated from the previous lockfile so unrelated React/Playwright/Turbo updates were excluded. Existing Stanza patch retained. No audit threshold or lint rule weakened.

Verification:

- A managed detached verification checkout contains only these corrections; the ten original unstaged booking/availability/calendar/settings/compose changes are absent. API test typecheck and app/dashboard/web typechecks PASS there. Original-checkout API typecheck reported only the two pre-existing patient-availability union errors; no edits were made to that owner file.
- Workspace `pnpm lint` PASS (zero errors; three existing request-generation cleanup warnings).
- Patient174, dashboard163 and SDK12 tests PASS (349 total); SDK OpenAPI/client generation parity check PASS.
- Isolated PostgreSQL16 container with a unique name and dynamic loopback port: all79 migrations and development seed PASS; six retained chat suites12 cases PASS; two rate-limit cases PASS; four new policy cases PASS. Application/owner databases were not used.
- Four validation/auth suites29 cases PASS.
- Frozen dependency installation PASS. `pnpm audit --prod --audit-level high` exits0 with zero high/critical findings (one low/five moderate remain).

Hosted checks must be rerun on the corrective commits. These policy tests do not substitute for actual two-browser native XMPP delivery, reconnection, browser/mobile workflow or VPS acceptance. F12-FE01-CHAT01 remains REWORK/unchecked; no next batch or final clinical-completion claim.

### PR28 runtime contract follow-up (2026-10-23)

Hosted e7d2b36: security, installer, release-contract and all four artifact build/HTTP/non-root/security jobs PASS. Main CI lint/types PASS; regular API run reported517 passed/3 failed (32 explicitly isolated suites skipped). The three failures were strict runtime OpenAPI parity, a legacy REST-send contract assertion and elapsed-time waiting-room closure expectations.

Corrected the fixtures to assert the real session/private-policy contract, absence of the retired public write/private policy in public Swagger, numeric diagnostics pagination, fifteen-minute preparation and explicit authorized closure. Waiting-room checks retain pending/cancelled rejection and verify no encounter creation. Added explicit Number metadata to diagnostics pagination and UUID metadata on the new appointment/chat operations; validation and financial/business rules are unchanged.

Built the clean verification API and ran the official exporter against the disposable review database; regenerated the complete SDK source. Compared the old/new documents after ignoring object/required/query-parameter ordering: schema shapes are unchanged; semantic path differences are the session UUID format and descriptions of the new access/close operations. Larger generated-file diffs reflect canonical runtime property ordering, not added business scope. Manual partial document synchronization is no longer used for this correction.

API clean emit/test typecheck PASS; actual runtime OpenAPI equality and waiting-room suite10 cases PASS; SDK generated parity and12 tests PASS. No live/owner database or unrelated local file was changed. Full hosted rerun remains the next gate; no merge, deployment, new batch or task-DONE claim.

### PR28 assigned-consultation boundary (2026-10-23)

Follow-up release gate: hosted b725780 passed security, installer and all four artifact jobs. The release-contract rehearsal intermittently exited141 after successful rollback: grep piped through head under pipefail can receive SIGPIPE when the consumer stops early. Replaced the five first-match pipelines with grep's own match limit, preserving missing-match failure and all migration/policy/secret/switch ordering assertions. Ran the full deployment rehearsal in an ephemeral Ubuntu24.04 container as non-root with a read-only repository mount: PASS, including failed candidate recovery, migration failure and rollback. Graphify update completed; no topology change. Full hosted verification remains pending.

Reviewed downstream isolated suites before the next hosted gate. The assigned-consultation fixture used its own indirect REST-send helper and still assumed completion closed chat. Migrated that scenario to the authenticated native policy callback, including follow-up after completion, explicit authorized closure, rejected post-closure send and retained history. Extracted the existing external room-administration mock as a named test-only helper; application policy, persistent roles and database enforcement remain real.

The first isolated run passed13/14 cases and exposed a real source regression in this branch: `AssignedAppointmentService.open` and its default worklist had lost the previous clinical expiry bounds while chat expiry was being removed. Restored the original one-hour confirmed/four-hour checked-in/queued/in-progress predicates and stale-worklist filter. ChatService retains independent explicit closure. Kept the expired-start rejection assertion; did not weaken it to make the test pass.

Started a second uniquely named disposable PostgreSQL16 container on the isolation guard's required loopback55419, applied all79 migrations and seed, and ran the real isolated assigned-consultation suite: all14 cases PASS, including concurrency, current capabilities, clinical consent/privacy, audit rollback, expired-start rejection and retained chat after completion. Clean API test typecheck PASS. Owner PostgreSQL and all ten original worktree files untouched. Hosted815a798 passed the complete main `pnpm test` step and reached build; the final correction needs its own complete hosted gate. No merge/deployment/DONE or new batch.

### PR29 self-reported onboarding follow-up (2026-10-24)

Owner-authorized F12-FE01 corrective continuation on `codex/patient-entry-flow`; this is not completion of the broader Phase12 roadmap. ADR-0041 records the explicit product change to independent patient-authored health intake. No next batch started.

Changes:

- Replaced patient `/onboarding` with health declarations, optional lifestyle and response review. Existing account name/gender/birth date are reused; historical clinical sex-at-birth answers are preserved without inference. Draft saving, honest unknown/unanswered distinctions, local validation, retry and accessible mobile/desktop controls remain. Separate consent capture and unrelated policy/journey requests were removed.
- Entry and onboarding resources retain unsaved forms across access-token rotation; account identity changes still fence resources. Account security exceptions are exact authenticated GET/PATCH `/v1/me` and POST `/v1/me/change-password`; other patient features retain initial-registration enforcement.
- Self-intake draft/completion and status no longer require a policy/grant or clinical sex-at-birth answer. Current exact existing processing grants retain their revision reference for independently authorized clinical care; no consent is silently created. Sharing, purchase, couple and custom-care authorization remains enforced. Completion now uses the already published HTTP200 contract.
- Protected-feature test patients explicitly include completed registration; cleanup respects retained foreign keys. Journey tests no longer depend on another suite having created a doctor service. Production web Zod was upgraded to4.6.7 with a narrow frozen lockfile change.

Database:

- Forward migration `20261024120000_self_intake_independent_completion` relaxes only the consent-reference condition for completed PATIENT_ENTRY revisions; completed timestamps and operator correction requirements remain.
- Configured loopback primary migrated successfully to82 migrations after a validated pg_dump and populated-clone rehearsal. Backup: `%LOCALAPPDATA%/Mushroom/Backups/self-intake-before-20261024-ec181681.dump` with adjacent count/hash evidence. Profile, entry, intake/revision, consent, assessment-submission and mezaj-result counts/fingerprints were unchanged. No real patient/assessment policy data was backfilled or activated.

Verification evidence:

- Workspace typechecks PASS; API production/test typechecks PASS, including final optional-grant logic. Workspace lint PASS with only seven existing dashboard warnings. Patient app178/178, web14/14 and generated SDK12/12 PASS; web production build and SDK build PASS. Full official OpenAPI exporter/client generation completed; final runtime equality and intake unit suites13/13 PASS.
- Mobile390px and desktop1440px browser flows PASS: registration prefill, incomplete validation, multiline declarations, partial save, optional skip, review/completion, access-token expiry refresh, no consent requests, no horizontal overflow or JavaScript errors. Screenshots visually reviewed. Final loader additionally avoids refetching on token rotation.
- Real PostgreSQL entry/appointments19/19 PASS; pure entry/domain/intake/home projection23/23 PASS. New self-report regression covers no configured policy/consent, null clinical sex, exact idempotency and ownership. Final no-policy rerun pending after optional-grant compatibility adjustment.
- Full normal API sweep: reminder3/3, then526 passed/8 failed/527 explicitly skipped across142 files. Failures were isolated to five appointment fixture collisions, stale home-projection expectation, HTTP completion status and OpenAPI regeneration; their corrected targeted reruns passed. No full-green normal-suite claim is made from that intermediate run.
- Broad isolated assessment/program/care sweep passed413 tests and exposed eight failures in four suites. Targeted rerun passed couple-assessment and admin-purpose suites; journey fixture independence was corrected. Final journey/custom-delivery checks pending. Local Docker CLI stopped responding, so final disposable PostgreSQL checks use a temporary loopback55419 forward to the configured local server, freshly created allowlisted test databases and unconditional owned-database cleanup; no application database is used by these tests.
- Production audit exits0 at high threshold: no high/critical vulnerabilities (five low/nine moderate remain). Bounded Zod collection exploit now rejects before parsing10,000 children; resolver/auth controls pass. Graphify AST update completed.

Gate: final targeted checks and hosted PR rerun pending; no merge/deployment claim. F12-FE01 remains REWORK/unchecked.

Final local review gate: PASS. Journey15/15 and custom-program-delivery23/23 pass on separate newly migrated disposable databases; the latter includes policy retirement/recompletion, exact existing-grant reference, observed row-lock withdrawal and lock-order checks. Couple/admin-purpose targeted rerun also passed (35 combined cases). Fresh patient-entry13/13 passes after optional-grant compatibility, proving no-policy completion still succeeds. Final app types and onboarding14/14 pass; runtime contract/intake units13/13 pass. All owned disposable databases and loopback forwarding were removed. Initial broad-suite failures are resolved by the recorded targeted reruns; hosted clean full CI remains the final shared-dev gate. No timeout budget, SQL clinical authority, global patient gate or audit threshold was weakened.

### PR29 hosted wallet fixture correction (2026-10-24)

Hosted `8643f17`: all four artifact jobs, release-contract and security PASS; SDK12/web14/app178/dashboard163, reminders3 and normal API521 tests PASS. Verify then stopped at three wallet HTTP403 failures. Those fixtures lacked initial-registration completion, so the entry guard correctly denied them before wallet validation/controller execution. The old isolated media cart/wishlist fixture had the same omission and would run later in CI.

Reused `createCompleteTestPatient` in wallet and product-image fixtures; removed duplicate profile insertion from wallet's optional completed-medical-intake setup. Entry enforcement, wallet/booking/financial logic, production files, database schema and test assertions are unchanged. Targeted fresh disposable PostgreSQL: wallet15/15 and product-image/content49/49 PASS. API test typecheck and diff whitespace check PASS; Graphify AST update completed. Test databases/temporary loopback forward removed; primary application data untouched. Same F12-FE01 corrective continuation; broader task remains REWORK and hosted rerun is the next gate. No next batch started.

## F12-T02-I06 — Automated retained chat preparation

Task ID: F12-T02-I06; coordinator/reviewer: Codex /root; owner-requested INSTALLATION-06 continuation, 2026-10-24. Dependencies I01/I02/I03/I04/I05 are complete. Initial worktree clean; new branch codex/installer-chat-setup starts at merged origin/dev. Broader F12-FE01 unchanged.

Implementation: initial install and explicit setup-chat command now prepare the standalone engine without an application checkout/host Node. The bundle includes only curated engine build assets. Generate/validate RSA/JWK and independent credentials once; refuse missing retained credentials/private keys or a retained database volume without saved credentials. Preserve operator engine/database configuration. New default engine storage is a private per-environment PostgreSQL container and persistent volume, independent of application PostgreSQL. Bootstrap starts only engine/storage, checks TCP authentication and actual SQL schema, and preserves the source-hashed local image during release pulls. Setup installs validated exact-origin Caddy snippets; custom non-equivalent snippets are retained with an actionable failure. Caddy2.6 validation exposed a previously invalid multi-value header matcher; corrected it to an exact CEL origin allowlist. All deploy/rollback/manager paths retain the optional managed database overlay.

Local review/verification: Linux standard-library suite49 cases,46 PASS/3 explicit skips (opt-in real Docker rehearsal and PostgreSQL restore fixture gates); real OpenSSL3072/JWK, retained bytes across retries, missing key/credential and wrong public key rejection, external-production application URL preservation, native Compose model, real Caddy2.6 config and HTTP origin/policy/fallback controls PASS. Dev incremental/recovery/serialization rehearsal and immutable staging/production deploy/rollback contract scripts PASS. Environment audit covers40 required API keys and all three frontend examples; allowlisted archive/checksum and relocated CLI PASS. Graphify AST update run. No application database, live VPS or real patient/provider data changed.

Gate: local reviewed implementation PASS; hosted installer job includes an opt-in clean-runner real engine build/SQL initialization/retry/archive-retention/pull-policy rehearsal. Local Docker Desktop daemon is unresponsive (bounded probes timed out), so no local native-engine run is claimed. Hosted rehearsal remains the explicit acceptance gate before marking this corrective task DONE. Owner must merge the matching deployment helper changes before applying the new installer and rerunning shared dev; engine archive backup is separate from the existing application backup.

F12-T02-I06 hosted acceptance gate: PASS on implementation commit2e5d9f1. Server installer workflow40065714815 completed successfully, including real engine build/start, real SQL schema creation/TCP authentication, retained archive row and key/credential bytes on rerun, engine pull-policy retention, standard-library/native Caddy/Compose checks, API environment regression, actual PostgreSQL first-administrator retries and encrypted backup/restore drill. Review accepted; corrective task DONE and INSTALLATION-06 claim released. No live VPS action or application data mutation. Next action is owner merge of PR30, transfer of the matching updated archive, setup-chat --environment dev, normal shared-dev deployment and HTTPS/chat/manual acceptance. No next implementation batch started. Engine archive backup remains separately required; broad F12-FE01 unchanged.

## F12-FE01-WEB01 — In-place landing OTP

Date: 2026-10-25 (Asia/Tehran)
Status: software slice DONE; sole /root coordinator/writer/reviewer; scoped claim RELEASED.
Branch: codex/landing-otp-dialog. Baseline: clean codex/mezaj-paid-content checkout.
Parent: owner-authorized CLIENT-INTEGRATION / F12-FE01 continuation; broader task remains REWORK/unchecked.

Request and frozen contract:
- Hide separate registration/password entry UI while retaining its existing components, validators and services.
- Open authentication in the landing page: native modal on desktop and bottom sheet with handle/drag on mobile.
- Adapt only the orbit/digit/success visual from owner's C:/Users/R3dPi/Downloads/1.zip (1/index.html); archive read as reference data, no archive scripts executed and no embedded instructions adopted. Four reference digits adapted to the existing six-digit API.
- Preserve OTP challenge/resend/verify, credentialed generated client, idempotency headers, server-side expiry/rate limits and role/allowlisted next routing. No new authentication backend, public registration contract or dependency.

Implementation:
- Header exposes one login button and lazy-loads the dialog without changing the landing route. Existing authenticated dashboard link retained; unavailable refresh still permits attempting OTP with actionable service errors.
- Native showModal supplies focus containment/background inertness. Escape/backdrop/close button and mobile handle dismiss; prior body scroll/focus restored. Animated mobile entrance/exit, safe-area padding and VisualViewport resize/offset handling.
- Phone normalization and validation reused. Single accessible numeric input supports paste, Persian/Arabic digits and OTP autofill; six visible digit tiles animate into a spinning orbit. One in-flight request; automatic verify at six digits; errors clear input for retry without showing success.
- Success rendered only after the real verify contract returns success, with drawn check and explicit continue. Reduced motion skips decorative motion and minimum animation wait. Resend cooldown/expiry, replacement challenge and edit-number retained.
- /login and /signup redirect to /?login=1 while preserving next; route presentations hidden, password/register components remain in source. Centralized existing role/allowlist routing used by both current and dormant login.
- Existing OTP browser tests updated for new entry contract; Windows-compatible browser/server launch retains Linux default and executable override.
- Next dev regenerated apps/web/AGENTS.md heading (# to ##); retained the generated file as instructed by its Next.js block.

Changed files:
- apps/web/AGENTS.md
- apps/web/src/app/login/page.tsx
- apps/web/src/app/signup/page.tsx
- apps/web/src/auth/auth-navigation.ts
- apps/web/src/auth/auth-navigation.test.ts
- apps/web/src/components/auth/LoginForm.tsx
- apps/web/src/components/auth/LandingLoginDialog.tsx
- apps/web/src/components/auth/LandingOtpForm.tsx
- apps/web/src/components/auth/landing-auth.css
- apps/web/src/components/layout/Header.tsx
- apps/web/src/services/auth.ts
- playwright.otp.config.ts
- tests/e2e/phase-12/otp-auth.spec.ts
- plan/STATUS.md
- plan/phases/12-PRODUCTION-HARDENING.md
- plan/logs/phase-12.md

Verification and review:
- corepack pnpm --filter @sabz/web typecheck -> PASS.
- corepack pnpm --filter @sabz/web test -> PASS, 6 files/17 tests, including retained password/register service tests and role/hostile-next routing cases.
- corepack pnpm --filter @sabz/web build -> PASS, actual optimized Next16.4.2 build, landing statically rendered and legacy entry routes dynamic.
- corepack pnpm exec playwright test --config=playwright.otp.config.ts -> PASS, 6 Chromium tests. Sizes320/390/430/768/1440 plus390x420 short viewport; phone focus/Escape restoration, no password/signup UI, original route/query/cookie/destination behavior, numeric/Persian input, automatic verify orbit geometry/no horizontal overflow, single request, invalid-code recovery, replacement challenge, expiry/cooldown, SMS-unavailable copy, number retention, drag and reduced-motion/backdrop dismissal.
- First browser run exposed initial dialog focus landing on close; fixed by focusing phone after showModal. Alert assertions scoped to dialog to distinguish Next route announcer. Final browser suite6/6 PASS.
- Desktop/mobile phone/code/orbit/success screenshots visually reviewed. Animated tiles geometrically verified; rotating layer clipped to prevent a horizontal scrollbar. Local preview images retained under ignored .local/landing-otp-preview/.
- git diff --check -> PASS. Sole-agent combined source/acceptance review PASS: no unresolved software blocker, unrelated/protected files and dependency/lock/schema unchanged.
- graphify update . -> PASS (AST only/no LLM). Existing missing SQL/Erlang/HCL extractors, unsupported-symbol files and unrelated chat-service partial extraction reported; graph remains ignored, no dependency installed to expand this task.

Limitations and next action:
- Browser OTP/auth/refresh/provider responses intercepted. No real SMS, account creation/login, database mutation, provider change or deployment performed. Real iOS/Android keyboard and actual SMS transport need owner acceptance.
- Owner should visually review the desktop modal/mobile sheet and then run the existing real OTP flow in the configured environment. No further batch started; broader F12-FE01 remains REWORK.

## Landing OTP white sheet correction (2026-10-25)

Task: F12-FE01-WEB01 owner-requested visual follow-up, DONE; sole /root main review PASS/claim RELEASED.
Branch: codex/landing-otp-dialog. Baseline: clean e803523. Parent F12-FE01 remains REWORK.

Request: smooth mobile entrance without a scrollbar flashing beside it, full-screen-width bottom sheet on compact viewports and centered popup on larger screens, white surface, remove the central phone illustration.

Root cause and correction:
- The animated sheet translated outside the full-screen native dialog/viewport container; their default overflow allowed a temporary outer scroll track during entrance. Clip those two animation boundaries, while retaining internal panel overflow-y:auto for short viewports and keyboard access. Hide only the panel scrollbar track, not its ability to scroll.
- Base sheet previously kept max-width480px below the desktop breakpoint, so widths481-767 produced a narrow floating sheet. Remove that cap from the base layout and apply it only from768px; compact sheets now span the viewport and stay anchored to its bottom.
- Use a460ms eased entrance with backwards fill to establish the initial transform before painting; retain drag/close/reduced-motion behavior. Responsive assertions now await the actual animation finish rather than assuming a450ms duration.
- White panel/light color scheme with existing primary, foreground, muted, border and secondary tokens; update digit, focus, verification orbit, error and success styling for the light surface.
- Remove only the central decorative phone symbol and its CSS. Keep the small field icon and all OTP/session/API/redirect behavior unchanged.

Changed files:
- apps/web/src/components/auth/landing-auth.css
- apps/web/src/components/auth/LandingOtpForm.tsx
- tests/e2e/phase-12/otp-auth.spec.ts
- plan/STATUS.md
- plan/phases/12-PRODUCTION-HARDENING.md
- plan/logs/phase-12.md

Verification:
- Optimized web build including Next TypeScript check PASS.
- OTP Chromium browser suite7/7 PASS. Existing login/role destination/cookie, invalid/expired OTP, resend/replacement, keyboard focus/Escape, mobile drag, short viewport and reduced-motion checks retained.
- Responsive sizes320/390/430/480/600/767/768/1440 PASS, including exact full viewport width below768 and480px centered popup from768.
- New550ms requestAnimationFrame sampling test: no native-dialog vertical/horizontal overflow during entrance, monotonic upward travel, clipped animation containers, white background, absent central symbol and hidden internal track PASS.
- Source/main-agent review and desktop1024/mobile600 screenshots PASS; images in ignored .local/landing-otp-preview/white-sheet-600.png and white-modal-desktop.png.
- graphify update . PASS, AST only; existing unrelated SQL/Erlang/HCL extractor and partial chat extraction warnings unchanged.
- git diff --check PASS. No unrelated files, dependencies, backend, auth contracts or protected paths changed.

Next: owner visual acceptance on the existing local preview and actual phone keyboard check. Browser service responses intercepted; no real SMS/account mutation or deployment. No further batch started.

## Landing OTP IRANYekanX font (2026-10-25)

Owner-requested visual refinement on codex/landing-otp-dialog: load the same IRANYekanX Regular (400) and Medium (500) assets used by apps/app, and scope the family to the landing OTP panel only. Both copied font files match the app originals by SHA-256. No global web typography or auth behavior changed. Font-only change; no test suite run.

## Landing OTP Shabnam typography (2026-10-25)

Owner-requested follow-up on F12-FE01-WEB01, same codex/landing-otp-dialog branch. Replaced the dialog-only IRANYekanX face with Shabnam Regular/Medium/Bold from the owner-provided Bale URLs; included the upstream SIL OFL 1.1 license and source note. Phone input uses Shabnam Medium with tabular-number features and reduced letter spacing for clearer, steadier digits. Browser preview confirmed Shabnam is the computed dialog/input family, Regular/Bold load, and Medium loads on the number field. Graphify AST refreshed. No auth behavior or site-wide typography changed; no test suite run.

## Landing OTP number clarity follow-up (2026-10-25)

Owner feedback: the Shabnam change was too subtle at its initial 19px input size. Increased phone-entry digits to 22px while keeping Shabnam Medium, tabular numeral settings and local font loading. Refreshed the landing page and reopened the dialog; browser computed styles confirmed Shabnam, 22px, weight 500, and 1.6px letter spacing. Visual preview reviewed; Graphify update PASS. No test suite run.
## Landing OTP number weight adjustment (2026-10-25)

Owner-requested quick refinement: changed only the phone input numeral weight from Shabnam Medium (500) to Shabnam Bold (700). Existing font size, spacing, and auth behavior are unchanged.
## Landing OTP country-code field (2026-10-25)

Owner-requested phone field styling now follows the supplied outlined fieldset reference: legend label, separate +98 country prefix, Persian-digit placeholder, and numeric keypad/pattern. The prefix is presentation-only; local 10-digit numbers beginning with 9 are normalized to the canonical 09... form before validation/submission, while existing full Iranian forms remain supported. Phone input explicitly uses Shabnam Bold so English digits render in the requested face. Web typecheck and Graphify update PASS.
## Landing OTP typography standardization (2026-10-25)

Owner requested Shabnam Medium for both placeholder and typed phone digits, plus consistent field typography. Scoped styles now set the legend to 14px Medium, country code to 18px Medium, and input/placeholder to 20px Shabnam Medium with 1px spacing. The input explicitly names Shabnam so entered Latin digits use the same face. Existing numeric parsing and country-prefix handling are unchanged.

## Landing OTP numeric-only input and Shabnam Medium (2026-10-25)

Owner reported that non-numeric text could still be typed and English digits did not appear in Shabnam. The phone input now removes all non-digit characters immediately, including pasted content, while preserving ASCII, Persian, and Arabic-Indic digits. Updated its HTML pattern to match that accepted set. The field explicitly uses the Shabnam family at Medium weight with default numeric substitutions disabled; inspected the local WOFF2 cmap and confirmed it contains all three digit ranges. Web TypeScript check and `git diff --check` PASS; `graphify update .` PASS with existing extractor warnings. The project preview/browser could not be rechecked in this corrective pass.


## Landing OTP local phone example (2026-10-25)

Owner requested removing the separate +98 prefix entirely. Removed the prefix/divider and its unused style, simplified the instruction to enter the mobile number, and changed the placeholder to ۰۹۱۲ ۳۴۵ ۶۷۸۹. Validation feedback now uses the same leading-zero example. Numeric filtering and Shabnam Medium presentation remain. Web typecheck PASS. No commit per owner instruction; visual acceptance remains pending.

## Landing OTP IRANYekanX design trial (2026-10-25)

Owner rejected Shabnam and requested professional design review plus an IRANYekan trial. Applied focused ui-ux-pro-max typography guidance. Source review found independently stacked spacing, centered copy against an RTL field, inconsistent field/button corner geometry, and redundant clinic eyebrow competing with the title. This is a source-based assessment, not screenshot acceptance.

Copied the app's unchanged IRANYekanX Regular/Medium assets; both SHA-256 hashes match and cmap inspection confirms Persian digit coverage and actual 400/500 weights. Scoped the whole dialog, input and OTP digits to this family. Title uses 24px Medium; explanation/button 16px; label/supporting text 14px; number input 20px Medium. Aligned heading/copy to RTL start, removed the redundant eyebrow, aligned label/input insets, replaced stacked form margins with a 16px gap, and matched the 12px field/button corners. Kept the no-prefix, leading-zero example and numeric-only Persian display behavior.

Web typecheck and diff check PASS; live dev logs confirm recompilation. No new browser access attempted after its prior policy rejection; responsive appearance and final font preference remain owner-review pending. No commit or deployment.

## Landing OTP annotated screenshot corrections (2026-10-25)

Applied four explicit owner annotations on the supplied 538×764 screenshot: centered title and instruction; reduced phone digits from fixed 20px to fluid clamp(16px, 14px + 0.5vw, 18px); placed a decorative 20px Lucide Smartphone inside the field on its right, in normal flex layout with reserved spacing and no overlap. At the supplied viewport the input size is 16.69px. IRANYekanX Medium, local leading-zero example, numeric filtering and canonical submission are retained. Web typecheck and diff check PASS. No commit per owner instruction; latest visual acceptance pending.

## Landing OTP dev PR validation (2026-10-25)

Owner explicitly requested commit, push and PR to `dev`. Prepared an isolated `codex/landing-otp-pr` branch based on `origin/dev`, transferring only F12-FE01-WEB01 landing authentication changes and their plan evidence; unrelated F12-FE01-MZ01/API/app/dashboard changes are excluded. Final review includes the no-prefix `۰۹۱۲ ۳۴۵ ۶۷۸۹` example, numeric-only Persian digit display and canonical phone submission, app-matching IRANYekanX Regular/Medium, responsive fluid number sizing, centered heading/instruction, and a right-aligned decorative phone icon inside the field. Removed rejected Shabnam trial font assets.

Validation: offline frozen workspace install succeeded without lockfile changes; API client generated package build PASS; `pnpm --filter @sabz/web typecheck` PASS; web Vitest suite PASS (6 files, 25 tests); `pnpm --filter @sabz/web build` PASS; `git diff --cached --check` PASS; `graphify update .` PASS (existing optional PDF/SQL/Erlang/HCL extractor warnings only). Branch scope reviewed: 21 staged feature/evidence paths, none under API, dashboard or Mezaj. No live SMS, user-account mutation, or deployment.
## Welcome mobile redesign 2026-10-24

Task ID: F12-FE01 (bounded continuation; broader task REWORK/unchecked)
Agent/Thread: Codex /root
Batch ID: CLIENT-INTEGRATION (no new batch)
Reviewed by: Codex /root
Status: READY_FOR_OWNER_VISUAL_REVIEW
Changed files:
- apps/app/src/app/welcome/page.tsx
- apps/app/src/app/globals.css (entry-only rules)
- coordinator STATUS/phase checklist/this log
Scope: applied redesign-existing-projects skill to the existing Next/React/CSS screen. Removed both welcome brain images, retained the Home asset. Brand/leaf motif, responsive split desktop/compact mobile layout, real one/three-step progress, explicit next action, labeled native Persian birthday selectors, native radio selection highlight, 16px controls, safe-area/dynamic viewport handling, reduced motion and forced-colors support. Existing demographic prefill, profile/start/complete/result requests and assessment engine retained.
Verification:
- pnpm --filter @sabz/app typecheck -> PASS.
- node .local/welcome-mobile-check.mjs -> PASS at320/390/430/768/1440: synthetic refresh/entry only, no real profile writes; profile values/date/gender prefill, no brain images, one/three progress items, controls at least44px, no horizontal page overflow, failed save retains values, successful retry sends exact ISO date/gender, assessment introduction and result states display without overflow or runtime errors.
- Profile screenshots320/390/430/768/1440, start/result screenshots same widths saved in ignored .local/welcome-review;390/1440 profile reviewed visually;390 spacing compacted after review.
- git diff --check -> PASS.
- Graphify AST update requested; final outcome recorded below.
Migrations: none. API/contracts/dependencies unchanged.
Limits: native desktop Chromium emulation, not real iOS/Android keyboard/safe-area acceptance; active question engine behavior was not changed or tested end-to-end in this visual slice. Owner phone review pending. No commit/push/deploy or next batch.
- Graphify update . -> PASS (AST graph rebuilt); existing extractor limitations for SQL/Erlang/HCL and partial chat.service.ts extraction reported, unrelated to this UI slice.

## F12-FE01-MZ01 — paid Mezaj services and result products

Task ID: F12-FE01-MZ01
Completed at: 2026-10-24 Asia/Tehran
Agent/Thread: Codex /root
Batch ID: CLIENT-INTEGRATION, bounded owner-authorized continuation
Reviewed by: Codex /root; PASS
Status: software slice DONE; broad F12-FE01 remains REWORK/unchecked
Branch: codex/mezaj-paid-content, clean baseline dev34e3c79

Changed files:
- API: optional ProgramMezajPresentation Prisma model/additive migration; shared assessment provenance/pair resolver; scoped commerce selector/query/source-version metadata; program recommendation/configuration/library DTOs/controllers/service and existing module registration; exact-result welcome read exception only.
- Contracts: existing program definition/purchase numeric query Swagger metadata corrected, actual exported OpenAPI and generated SDK synchronized.
- App: shared token-based service/owned cards, parallel result recommendations, exact-result product call, result/welcome/Home wiring; existing protected offering/purchase/content routes retained. Welcome acknowledges entry before recommendation navigation.
- Dashboard: programs route/menu/meta, text version/source editor, qualified physician review, optimistic ordered pair/icon settings, commercial preview/publication using actual terms/retention; local primitive/semantic/component tokens and focused styling.
- Regression/evidence: program purchase suite additions, exact welcome guard tests, reproducible disposable harness/package command, strict local test-helper allowlist, updated commerce unknown-query assertion, intercepted browser runner; contract/design/status/checklist/log.

Implementation decisions:
- Existing READY_EDUCATION definitions/publications/PROGRAM billing/grants are authoritative; no second payment or entitlement system. Full paid text never travels in recommendations/library. Prior paid content stays on its exact retained definition; result/config/tariff changes do not erase owned grants.
- Shared resolver selects the requested self-owned accessible completed submission or the latest accessible completion. It accepts canonical MEZAJ/MIZAJ keys, explicit uppercase preset IDs to canonical store codes, hashes/source engine/version/profile checks and SINGLE->same-pair; unsupported/latest-unmapped/tied results never fall back to an older recommendation. Scalar band mapping remains supported. No clinical score recomputation or label inference.
- Program cards select actual current publications, preserve PENDING/OWNED actions and use exact IRR->TOMAN formatting including sub-toman remainder. Home library is independent of the latest result and commercial placement, paginated and server-authorized.
- Admin authoring/publishing remains distinct from qualified physician approval. Pure physician view uses existing clinical list/approve APIs and hides administrative mutation controls. Source approval and actual purchase terms are never fabricated.

Migrations:
- 20261024120000_program_mezaj_presentations: one optional bounded placement record per exact definition, composite clinic/source FK, icon/pair/enabled/revision constraints and clinic-enabled index. Existing definitions receive a supporting compound unique key. No patient or payment table rewrite.
-83 fresh migrations plus additive upgrade/catalog/result preservation and final schema diff PASS on a random disposable local database. Main/owner/VPS database untouched.

Verification:
- pnpm --filter @sabz-zendegi/api test:mezaj-programs ->47/47 PASS (program purchase/access integration32, existing entry13, exact welcome recommendation guard2). Includes11+1 ordered/reverse pairs, explicit older result, cross-patient denial, no-body metadata, pending/owned, tamper/no fallback, concurrent revisions, invalid SQL/DTO shape, revoked placement and tariff retirement retaining owned access, existing wallet/server-Verify/clinical source/lifecycle regressions. Synthetic encryption keys and gateway only; temporary DB destroyed.
- pnpm --filter @sabz-zendegi/api test:commerce-mezaj ->28/28 PASS;83 migrations, legacy catalog/results preserved, no schema difference. Old patientId query fixture updated to400 because the now-documented DTO correctly rejects unknown selection inputs; normal self NO_RESULT response retained.
- Prisma generate, API source/test types, patient app/dashboard types and generated SDK generate/build ->PASS. OpenAPI exported from compiled Nest application; no manual contract patch.
- pnpm --filter @sabz/dashboard exec eslint src/features/programs/program-services-page.tsx src/lib/program-services-api.ts ->PASS. Initial root ESLint attempt had no root config; used the actual dashboard configuration. Effect loading corrected to asynchronous cancellation-safe callbacks, no disable or rule weakening.
- design-system validate-tokens.cjs --dir apps/dashboard/src/features/programs and --dir apps/app/src/components/programs ->PASS. Primitive definitions in dedicated token file; component colors semantic, no new raw hex.
- node apps/app/e2e/mezaj-services.browser.mjs ->PASS320/390/1440: real compiled pages with intercepted API fixtures, result/services/product display, exact result query, correct purchase/read destinations and protected text reading, welcome acknowledgement+navigation, independent owned Home library, dashboard16 ordered pairs,409 preserves selection, no overflow/page errors. Screenshots ignored under .local/mezaj-review; result390 and dashboard390 visually inspected. Existing local frontends served on3001/3002 for review; no main API/database command or payment sent.
- git diff --check ->PASS. Graphify AST update ->PASS; existing missing SQL/Erlang/HCL extractors/partial chat extraction noted, unrelated to feature.

Review:
- Clean baseline and explicit write-set reviewed; protected slider-data.ts/justforcheck.md and dependency/lockfile untouched. Generated Next AGENTS heading change removed.
- Main-agent scope, authorization, data ownership, exact source/retention, SDK contracts, UI states, mobile rendering and no real data mutations reviewed. No unresolved software blocker in this slice.

Known limits / next action:
- Operator must apply the additive migration through normal deployment before the new endpoints query the main database. No main/VPS migration, merge, push or deployment performed.
- Configure actual educational source/text, qualified approval, active PROGRAM_PURCHASE_TERMS/retention reference, publication and real products/pairs in dashboard. None is seeded or silently activated.
- Browser checks emulate Chromium mobile sizes, not actual iOS/Android keyboard; live bank/provider, clinical/legal content acceptance and broader release review remain owner-operated.
- Next action is owner visual review and authorized rollout/configuration. No unrelated task or next batch started.

## Landing OTP PR branch synchronization (2026-10-25)

PR #32 initially used `9b8c40e` as its dev base. After PR #31 merged as `4121081`, GitHub reported the OTP branch as non-mergeable and the local branch no longer contained the current dev tip. Merged `origin/dev` into `codex/landing-otp-pr`; the only content conflict was the append-only phase log, resolved by preserving both the OTP and dev entries. No OTP code conflict or lockfile change. The resulting PR diff remains based on current dev.

The original PR CI reported `verify` failure only at “Assessment reliability in an isolated disposable database”; API security and artifact checks passed, as did the preceding lint, types, full test, database regression, and build steps. The failure is outside OTP-owned paths. GitHub’s job-log download endpoint returned a transport error, preventing identification of the specific failing assertion from that run. After merging dev, API-client build, web typecheck, all 25 web tests, web production build, and diff checks pass. Push the merge update and inspect the new hosted CI run before declaring the reported error resolved.

## Dev pull conflict resolution (2026-10-25)

Owner-reported interrupted pull on dev; sole /root scoped merge repair, same F12-FE01 continuation. Local HEAD34e3c79 and incoming8956044 include independent local work, paid Mezaj PR31 and landing OTP PR32. Resolved four files: welcome page keeps the optional recommendation destination after successful finishPatientEntry; three plan files keep incoming additions alongside existing local history. Five conflict blocks removed; all four paths staged as resolved. No unrelated reset, checkout, stash, new pull or backend change. Source/conflict-marker review only; tests/typecheck/lint/build/browser remain deferred. Merge commit/push not performed per existing owner restriction; merge remains ready for authorized commit, broader task not DONE.

Owner follow-up explicitly authorizes completing this interrupted dev integration (2026-10-25). Fresh git fetch origin dev confirms incoming8956044 remains the current remote tip. All conflict paths resolved and staged, no unstaged tracked changes, staged whitespace review PASS. Proceed with an integration merge commit preserving local34e3c79 plus remote PR31/32; no task DONE, application execution checks or push authorized by this integration.

## Dashboard notification render fix on dev (2026-10-25)

Owner supplied NotificationsPage runtime trace: Element type is invalid at ICONS[item.category]. Current dev had neither the FINANCIAL category in DashboardNotification nor icon/fallback in either notification renderer. Confirmed backend Prisma NotificationCategory includes FINANCIAL. Restored FINANCIAL type, Wallet mapping and Bell fallback in apps/dashboard/src/lib/phase-08-api.ts, apps/dashboard/src/features/notifications/notifications-page.tsx and apps/dashboard/src/components/layout/notif-panel.tsx. Same F12-FE01 continuation, sole /root; IMPLEMENTED_UNVERIFIED / REWORK, no DONE or commit. Source/contract review only; tests/typecheck/lint/build/browser remain owner-deferred. No backend/API/data/dependency change. Owner refresh/retry is next.

## Dashboard notification recipient context (2026-10-25)

Owner reports wallet notifications address the administrator as if they owned the changed wallet. Existing admin endpoint lists clinic notifications intended for users, but omits recipient identity. Same F12-FE01 continuation, sole /root on dev, IMPLEMENTED_UNVERIFIED / REWORK. Admin list now selects only notification presentation fields and recipient.userProfile firstName/lastName, returning nullable recipientDisplayName without phone/email/medical data or nested user object. Patient endpoint and stored notification text unchanged. Existing active-clinic filter/permission/100-item limit preserved. Both dashboard page and header panel show actual recipient name (explicit name-not-registered fallback) and label body as text sent to that user, avoiding ambiguous administrator-directed copy. Names are current profile data, not historical snapshots.

Changed: notifications.service.ts adminList; dashboard phase-08-api.ts optional additive field, notifications-page.tsx and notif-panel.tsx. Current admin list OpenAPI response is unspecified; no generated response schema exists to regenerate for this additive field. No schema/migration/real database write/dependency/financial change. Source projection/schema/consumer review performed; tests/types/lint/build/browser and runtime API confirmation deferred per owner. No commit/DONE; owner preview next.

## Programs pricing correction (2026-10-25)

Task ID: F12-FE01-MZ01 (owner-requested corrective continuation)
Branch/baseline: dev@c05feb8; baseline worktree clean.
Agent/reviewer: Codex /root, sole writer, no subagents.
Status: software review PASS; broad F12-FE01 remains REWORK.

Changes:
- Existing ADMIN/CONTENT_MANAGE/clinic/session authority guards a new audited, private/no-store setup read. It returns the retained latest same-identity tariff, exact active same-clinic/locale purchase terms and an actual historical retention reference suggestion; no new schema or policy mutation.
- Dashboard loads saved price, marks retired/unusable/older-text tariffs, accepts Persian/Arabic/grouped toman and preserves one-rial remainders and maximum BigInt amounts. Existing DAYS/PERPETUAL access and quote TTL are retained when repricing.
- Active terms are displayed directly; manual terms UUID input removed. Missing real terms explain the blocker. Retention reference is populated from real publication history where available and still explicitly reviewed. No fabricated initial retention/legal configuration.
- Preview shows exact final price/terms/retention, publication is explicit and idempotent, success updates the saved-tariff block,409/network errors retain inputs, explicit reload asks before replacing them. Unsaved price is clearly labeled as unpublished.
- Split publication form and price conversion from the existing program workspace; existing create/review/Mezaj-placement/purchase/grant flows retained.

Owned files:
- apps/api/src/modules/programs/publication/program-publication.{controller,dto,service}.ts
- apps/api/test/program-publication.integration.spec.ts
- apps/dashboard/src/features/programs/program-services-page.tsx, program-services.css, program-publication.tsx, program-price.ts, program-price.spec.ts
- apps/dashboard/src/lib/program-services-api.ts
- apps/app/e2e/program-pricing.browser.mjs
- packages/api-client/openapi.json, src/schema.generated.ts
- scoped contract/design/status/phase/log evidence

Verification:
- API openapi:export PASS; generated semantic diff adds only setup endpoint and ProgramPublicationSetupDto (other textual changes are schema ordering).
- API client generate/build PASS.
- Isolated patient-entry-verify harness with PATIENT_JOURNEY_TEST_ISOLATED=1, program-publication.integration.spec.ts:19/19 PASS; randomly named local database migrated/seeded/dropped; retained-price/retired-terms/read-only behavior and existing authorization/CAS/immutability/audit/price replacement cases.
- API test TypeScript and dashboard TypeScript PASS; focused dashboard ESLint PASS.
- Dashboard program-price.spec.ts:3/3 PASS (Persian/Arabic/grouping/free, exact one-rial/max round trip, invalid/out-of-range amounts).
- apps/app/e2e/program-pricing.browser.mjs PASS320/390/1440: saved price, Persian toman->exact rial, explicit review and publication,409 input retention/retry, reopened persisted price, DAYS/TTL preservation, translated blockers, missing terms, failed-load retry, no page errors/overflow. Actual compiled Next page with intercepted API; no real writes.390px screenshot reviewed, images under ignored .local/program-pricing/.
- Design-system token validator and git diff --check PASS.
- Next generated only its AGENTS heading during the owned review server startup; restored that generated-only change and stopped the owned review server after browser verification.

Known limitations / next action:
- First real PROGRAM_PURCHASE_TERMS activation and the approved retention reference remain operator responsibilities; no legal text or real content auto-created. Price drafts are not persisted until publication.
- No persistent/main/VPS database mutation, new migration, live payment, push or deployment in this corrective turn. Owner can review and request publication of the local fix.
- No next roadmap batch started.
- Graphify AST update PASS (11531 nodes); existing missing SQL/Erlang/HCL extractors and unrelated chat parser warnings retained. No generated graph files tracked in this commit.

## Programs workspace visual scroll correction (2026-10-25)

Task ID: F12-FE01-MZ01, owner-authorized corrective continuation.
Baseline: dev@47d7579, clean worktree. Sole agent/reviewer: Codex /root; no subagents.
Status: scoped software review PASS, claim released; broad F12-FE01 remains REWORK.

Root cause: dashboard AppShell deliberately uses a fixed-height flex viewport with hidden overflow and delegates scroll ownership to each page. Programs lacked flex shrink/min-height/overflow-y, so its lower content was clipped. Prior overflow-width and locator auto-scroll checks were insufficient evidence for actual wheel/touch reachability.

Implementation:
- Programs owns one focusable labeled scroll region with flex:1/min-height:0/overflow-y:auto. Shared shell is unchanged; terms body no longer creates a nested scroll region.
- Responsive bounded list/editor, service cards with icon/status/version, distinct headings/action rows, larger consistent fields and spacing reuse existing dashboard semantic tokens.
- Content/Mezaj/price section buttons use pressed state and controlled mounted panels; switching sections retains drafts. Pure physician authority and existing create/approve/placement/price/purchase contracts are unchanged.
- Authoring groups introduction, paid text, usage boundaries and source selection. Long descriptions use multiline controls; missing sources have an explanation; unsaved text close is confirmed. Icon select has an explicit associated label.
- No added package, schema, backend endpoint, financial policy or persistent data change.

Files: apps/dashboard/src/features/programs/program-services-page.tsx, program-services.css, program-services.tokens.css; apps/app/e2e/program-workspace.browser.mjs; existing pricing and Mezaj browser runners updated for section navigation; scoped design/status/phase/log evidence.
Skills: ui-ux-pro-max and ui-styling supplied by owner. Local focused dataset searches were inspected; generic scroll/Next suggestions did not address the shell ownership defect, so the supplied responsive/form/accessibility quick-reference guidance and existing project stack were applied. No dependency/framework migration.

Verification:
- Dashboard typecheck and focused ESLint PASS; design-system token validator PASS; git diff --check PASS.
- program-workspace.browser.mjs PASS375x820,390x850,768x850,1440x900,844x390 landscape: actual mouse wheel and focused End-key scrolling reach final actions; CDP touch gestures on375/390 scroll the form; no horizontal overflow, page errors, React hydration/duplicate-key warnings; dirty-close cancel preserves text; section changes preserve icon and price drafts. Fixtures use synthetic API interception and unique IDs; no real records written.
- program-pricing.browser.mjs PASS320/390/1440 after section navigation change: exact saved/Persian price, publication,409 retention/retry,reopen,duration/TTL,missing terms and load retry.
- Desktop list and mobile form/editor screenshots reviewed under ignored .local/program-workspace/. Price screenshot reviewed under .local/program-pricing/.
- Graphify AST update PASS with existing SQL/Erlang/HCL dependency and unrelated chat parser warnings. No graph output staged.
- Owned Next review server stopped; generated-only AGENTS heading change restored. No other user process stopped.

Limits/next: real Safari/device keyboard acceptance remains external. No push/deploy or next roadmap batch. Owner can review the local frontend fix before publishing it.

## Ready program source removal (2026-10-25)

Task ID: F12-FE01-MZ01, owner-authorized policy correction; baseline dev@a40bcd6, clean.
Agent/reviewer: Codex /root, sole writer. Status: scoped software review PASS; broad F12-FE01 stays REWORK, claim released.

Owner explicitly rejects external educational-source requirements for Mezaj text services such as personality content. This overrides earlier source-required READY_EDUCATION contracts. No new architecture or clinical service type introduced.

Implementation/files:
- definitions/program-definition.dto.ts: contentReferences optional/default empty; compatible with older explicit-reference clients.
- definitions/program-definition.service.ts: no nonempty ready-service source requirement; omitted references normalized; ready approval independent of legacy source state. Explicit legacy references still validated at creation; custom professional checks retained.
- prisma/migrations/20261025150000_ready_program_sources_optional/migration.sql: additive transaction replaces shape constraint, dependency predicate, lifecycle guard and publication locking seam. Empty-reference READY_EDUCATION is valid; legacy refs remain immutable metadata and do not suppress ready approval/sale/read after retirement. Service's own physician approval, scope/session/immutability/payment/terms and custom professional service/source rules remain. No existing content/hash/purchase rows rewritten.
- Dashboard program-services-page.tsx/program-services.css: source picker, source calls/state/pagination and source-dependent save disabling removed; draft payload omits references. Native required fields and busy-state guard retained.
- Official OpenAPI/SDK regenerated for optional create field; only semantic contract change is required->optional contentReferences with default[].
- Existing program-mezaj-verify.mjs accepts optional targeted suite arguments, preserving defaults. Definition/purchase tests and workspace browser runner cover new policy.
- Scoped STATUS/phase/contract/design/log evidence updated.

Verification:
- API openapi:export, SDK generate/build, API test TypeScript, dashboard TypeScript/focused ESLint and design token validation PASS.
- Publication19/19 and purchase33/33 PASS in isolated migrated/seeded temporary PostgreSQL, including create->approve->publish->purchase->owned-read with no source field, and continued access/publication after legacy source retirement. Existing payment/reviewer/ownership/access regressions pass.
- Definition20/20 PASS on final isolated run: omitted-source creation/approval, retained legacy metadata and revoked-reference independence; custom professional service and qualified reviewer checks retained. Initial assertions that expected source-dependent readiness were updated to the explicit new policy; custom-service duration invalidation still expects false and passes.
- program-workspace.browser.mjs PASS375/390/768/1440 and844x390: all real fields filled, enabled save and successful synthetic creation without a source payload or source API request; wheel/touch/keyboard reachability, draft section retention/dirty close, no overflow/React/page errors. No real test content created.
- prisma migrate deploy applied exactly pending20261024120000_program_mezaj_presentations and20261025150000_ready_program_sources_optional to configured local sabz_zendegi at localhost:5432. Follow-up migrate status:84 migrations, schema up to date. No remote/VPS migration or deployment.
- Graphify AST updated, existing missing extractor/unrelated chat parser warnings retained. Owned review server stopped; generated-only Next AGENTS heading restored. Diff check PASS.

Next/limits: owner can test local /programs and request push/deployment; server needs the committed migrations on deployment. No next roadmap batch or real source/legal/content activation.

## Programs naming correction (2026-10-25)

Task: F12-FE01-MZ01 owner-selected label follow-up; sole /root, dev. Renamed the dashboard navigation, page heading, header metadata and browser title to «خدمات اختصاصی مزاج». Source search confirms all four runtime occurrences replaced. Static text-only review and diff check PASS; no runtime tests needed for this label change. No API/route/data change, push/deployment or next batch.

## Programs compact list and editor dialog (2026-10-25)

Task: F12-FE01-MZ01 owner-authorized frontend continuation; baseline dev@f5ffa24, clean. Sole writer/reviewer Codex /root, no subagents.

Scope/files: program-services-page.tsx, program-services.css, program-services.tokens.css; program-workspace.browser.mjs; scoped design/status/phase/log evidence.

Changes:
- Tall service cards replaced with compact icon/title/introduction/version/status/edit rows and responsive one/two-column list. Synthetic cards stay under170px in all tested viewports; full title wraps and full description remains readable in the editor.
- Existing editor/new-service form opens in native dialog instead of replacing list. Main list remains mounted and retains exact scroll position on close. Native modal/inert background and scoped overflow lock prevent background scrolling.
- Viewport-bounded dialog independently scrolls; sticky header keeps close available. Focus starts on close, wraps at Tab boundaries and returns to opener without scrolling. Escape/backdrop follow the same dirty-text confirmation and in-flight fieldset guard. No additional dependency.
- Content/Mezaj/pricing state, actual API operations and source-free creation preserved. Removed stale generic source-dependent error wording.

Verification:
- program-workspace.browser.mjs PASS375/390/768/1440 and844x390 landscape: compact-height assertions; native dialog; touch/End form scrolling and bottom actions; repeated Tab focus cycle; Escape/focus return/exact list scroll; desktop backdrop dismissal; dirty-close cancel; section draft retention; filled-form source-free create with no source API request; no page/React/overflow errors.
- Initial boundary Tab check exposed native browser chrome traversal; explicit first/last control handling added and final five viewport checks pass.
- program-pricing.browser.mjs PASS320/390/1440 inside popup: exact price/publish/409/reopen/DAYS/TTL/terms/retry preserved.
- Mobile compact list/popup and desktop list screenshots reviewed under ignored .local/program-workspace/. Dashboard typecheck, focused ESLint and token validator PASS; diff check PASS.
- Graphify AST refreshed. Owned review server stopped; Next generated-only AGENTS heading restored.

No API/schema/database/dependency/payment/policy/deployment changes. Local frontend commit only, no push. Broad F12-FE01 remains REWORK; no next batch. Owner can review and request publication.

## Ready program retention input removal (2026-10-25)

Task: F12-FE01-MZ01 owner-requested ready text-service correction, sole writer/reviewer Codex /root on dev@d305195, clean baseline. Scoped software review PASS; claim released, broad F12-FE01 stays REWORK.

Problem: an internal retention-policy reference was required by the ready-service publication form/API/NOT NULL/check constraint, so the owner could not publish a Mezaj service without unrelated technical configuration.

Changes/files:
- ProgramOfferingPublication.retentionPolicyRef nullable; migration20261025170000_ready_program_retention_optional relaxes ready-service nullability/shape while preserving explicit custom-professional reference validation in SQL guard. No existing text, price, reference, receipt or grant data rewritten.
- publication DTO/service: optional nullable input normalized to null, nullable retained response; custom professional API still requires reference. Existing explicit-reference clients and publication hash/idempotency semantics retained.
- Dashboard program-publication.tsx removes reference input/helper/validation/preview; checkbox reviews actual price and purchase terms. No fake identifier or policy auto-created. Existing price, real terms, approval, duration/TTL, revision and payment rules retained.
- Official OpenAPI/SDK regenerated; schema diff limited to optional/nullable program retention reference. Definition/source and assessment-policy fields unaffected.
- Publication/purchase/browser regressions and scoped contract/design/status/phase/log updated.

Verification:
- Isolated PostgreSQL program-publication21/21 and program-purchase33/33 PASS,85 fresh migrations. Ready publication accepts omitted reference as null and preserves old explicit reference on retained retired publication. Complete source-free/reference-free publication->purchase->owned content read PASS. Custom professional omitted reference rejected by API and direct SQL; existing price/idempotency/approval/access regressions pass.
- API Prisma generate and openapi export PASS; SDK generate/build PASS; API test/dashboard TypeScript and focused dashboard ESLint PASS; token validator/diff check PASS.
- program-pricing.browser.mjs PASS320/390/1440: no retention label/input or payload field; exact price/preview/publish,409 preservation/retry,reopen,duration/TTL/real terms and load recovery retained in popup. Synthetic intercepted API, no actual purchase/content writes.
- Applied exactly20261025170000_ready_program_retention_optional to configured local sabz_zendegi at localhost:5432 after disposable verification. migrate status:85/up to date; Prisma datasource-to-schema diff:No difference detected.
- Graphify AST update, owned review-server stop and generated-only Next AGENTS heading restoration completed. No unrelated user process stopped.

Next/limits: ready publication still follows its actual program approval and active purchase terms; this change removes only the unrelated retention input. No remote/VPS migration, policy activation, push or deployment, no next batch. Owner can test local pricing/publication before publishing commits.


## Ready service static purchase terms (2026-10-25)

Task ID: F12-FE01-MZ01 owner-authorized continuation. Coordinator/reviewer: Codex /root, sole writer on dev@81d76f9. Scoped implementation DONE/review PASS; claim released. Broad F12-FE01 remains REWORK, no new task selected.

Problem: ready-service publication required an independently configured active purchase policy; the owner explicitly requires fixed simple copy and permanent access in the purchaser's account.

Changes/files:
- publication/ready-program-terms.ts defines the owner-approved Persian copy once. Authenticated scoped administrator preview/publication automatically materializes its real same-clinic/locale immutable consent policy under a transaction advisory lock. No fabricated identifier, operator prerequisite or new dependency. Setup GET remains read-only and exposes defaultTerms.
- publication DTO/service make input terms ID optional for permanent READY_EDUCATION only. Publication hash uses actual resolved terms; legacy explicit-ID idempotency payloads remain compatible. Custom professional requests still require explicit original policy/configuration.
- purchases/program-purchase.service.ts accepts the fixed purpose through the existing patient/session/hash/acceptance boundary. Existing money, retained receipts and owned content engine unchanged.
- migration20261025190000_ready_program_static_terms updates current/quoted/publication/acceptance SQL guards to recognize the fixed purpose only for perpetual ready services; locks exact static copy/hash/version/locale against edits/deletes. Historical/manual/custom policies, purchases and grants unchanged. Reuses latest custom/retention SQL function contracts.
- dashboard program-publication.tsx displays default copy and removes missing-policy preview gate/payload ID. New publication always PERPETUAL/null end date; price, preview/CAS/idempotency and actual review remain. OpenAPI/SDK generated officially. Tests/fixtures and contract/design/status/checklist updated.

Verification:
- Disposable local PostgreSQL,86 fresh migrations: publication23/23 + purchase33/33 PASS. Includes no active manual terms, concurrent default resolution, immutable static evidence, permanent-only restriction, custom exclusion and legacy financial/ownership regressions.
- Final paid-purchase suite33/33 PASS after enhancing the source-free service case: automatic fixed terms, paid wallet debit, no retention input, owned grant endsAt:null, retained acceptance, body access and recovery with a newly issued patient session. One intervening rerun hit a Windows worker/memory process failure before collecting tests; clean serial rerun with a bounded Node heap passed.
- API test TypeScript, official OpenAPI export, SDK generation/build, dashboard TypeScript/focused ESLint and design token validation PASS. One initial concurrent TypeScript process exited unexpectedly; serial rerun PASS.
- Pricing browser checks320/390/1440 PASS: exact saved/Persian toman price, permanent access payload without terms ID or retention input,409 retry/draft preservation, reopen, translated blockers, setup error recovery, publication enabled with no manual terms, no overflow/page errors. Intercepted API with synthetic fixtures; mobile screenshot inspected. Workspace fixture updated for additive setup contract.
- Applied only new migration86 to configured local sabz_zendegi at localhost:5432 after disposable gates; migrate status up to date, schema diff no difference. No historical row rewrite. Static policy rows are created only when a real scoped administrator requests ready-service preview/publication.
- Graphify AST refreshed; generated-only Next AGENTS heading restored; review server stopped; final diff reviewed and diff check passed.

Limits/next: no live bank transaction, VPS migration, push or deployment. Owner can restart local API/dashboard and test the actual service price/publication/purchase. Existing content approval and account ownership remain required. No next batch started.

## Landing OTP continuity and unified expiry (2026-10-26)

Task: F12-FE01-WEB01 owner follow-up; sole /root writer/reviewer on current dev, clean baseline 7ab62e8. Owner authorizes frontend-only implementation, commit and push on the current branch. Software review PASS; scoped claim released; broader F12-FE01 remains REWORK.

Closing now hides the lazily loaded native dialog while retaining its mounted form in page memory. Reopening restores the entered phone, current challenge, partial OTP, pending request, error or successful result; close-animation/drag state resets independently. Body scroll locking, viewport listeners, Escape/backdrop/handle dismissal and focus restoration follow visibility. Hidden request completion updates the retained attempt without opening the dialog or stealing focus. No phone/code/session data is persisted to browser storage.

The separate validity text and resend button are one full-width control: readable disabled validity countdown, then resend after both the original expiry and server cooldown. Submission uses the existing resend API and duplicate-request guard; a replacement challenge clears the old code and restarts the countdown from the server response. Absolute deadlines remain authoritative across dismissal and background timer throttling. Backend, SMS delivery and server contracts are unchanged.

Changed: Header.tsx, LandingLoginDialog.tsx, LandingOtpForm.tsx, landing-auth.css, existing OTP browser suite, and plan evidence/checklist.

Verification: web TypeScript PASS; Vitest 6 files/25 tests PASS; production web build PASS; final intercepted Chromium OTP suite 9/9 PASS. Mobile390 and desktop1440 cases cover phone draft, response received while closed, partial code, drag/Escape, no duplicate send on reopening, expiry while closed, unified resend/replacement challenge, and verification completing while closed with successful continuation/focus on reopen. Existing breakpoint320–1440, short viewport, animation overflow, numeric input, error/expired code/cooldown/provider failure, redirects, cookie/destination, keyboard focus and reduced-motion cases remain green. Updated older phone selectors/expectations to the accepted Persian-digit field; mobile drag waits for entrance animation before the gesture. Graphify AST update PASS with pre-existing optional extractor warnings; diff review/check PASS.

Limit: continuity lasts within the current landing-page instance; full navigation/reload starts a new UI instance. All browser service responses are synthetic/intercepted; no live SMS, account, database or deployment action. Next: owner visual/real-device review, no next batch.

## Object storage provider selection (2026-10-26)

Task ID: F12-FE01-MEDIA01
Status: READY_FOR_OWNER_TEST (unchecked; real local provider acceptance pending)
Agent/Thread: Codex /root, sole writer/reviewer
Batch ID: CLIENT-INTEGRATION, owner-authorized scoped continuation; no new batch
Branch: codex/object-storage-providers (clean dev baseline)
Reviewed by: Codex /root — software/combined-diff review PASS
Contract: one active environment-level disabled/r2/arvancloud profile. Existing R2 configuration retained; Arvan uses separate ARVAN_* credentials/bucket, region default, path-style and required-only request checksum. Both private product and banner consumers use the existing port; no automatic fallback, replication or per-object provider routing. Production-disabled gate retained. No schema/OpenAPI/frontend/dependency changes.
Changed files:
  - apps/api/src/config/{environment.validation.ts,product-media.config.ts}
  - apps/api/src/modules/commerce/media/product-image-storage{,.module}.ts
  - apps/api/test/product-image-{configuration,storage}.spec.ts
  - apps/api/scripts/product-media-smoke.ts; apps/api/package.json; apps/api/.env.example
  - deploy/docker/api-entrypoint.mjs
  - deploy/vps/compose.dev.yaml; deploy/vps/{dev-service,deploy-dev}.sh
  - deploy/vps/{dev-env,env,production-env}.example
  - deploy/vps/OBJECT-STORAGE.md; deploy/vps/README.md
  - scripts/test-vps-dev.sh; scoped plan status/checklist/evidence and Graphify output
Migrations: none; no database writes performed.
Tests run:
  - pnpm --filter @sabz-zendegi/api exec vitest run test/product-image-storage.spec.ts test/product-image-configuration.spec.ts test/product-image-processor.spec.ts --no-file-parallelism -> PASS, 3 files / 18 cases.
  - Includes actual SDK HTTP PUT/GET/DELETE against temporary loopback server for both providers, selected credential/bucket/signing-region assertions, raw Arvan upload bytes, dormant credentials, disabled defaults, active-profile completeness, production gate, secret-file handoff, safe provider diagnostics/no fallback and retained media validation.
  - pnpm --filter @sabz-zendegi/api exec tsc --noEmit -> PASS.
  - pnpm --filter @sabz-zendegi/api exec tsc -p tsconfig.test.json --noEmit -> PASS.
  - bash -n deploy/vps/{dev-service,deploy-dev}.sh -> PASS after preserving LF as required by .gitattributes.
  - bash scripts/test-vps-dev.sh -> PASS; adds provider switch, Arvan bucket change and key rotation recreation cases; retained existing deploy/recovery/isolation checks.
  - pnpm --filter @sabz-zendegi/api storage:smoke without --confirm-write -> expected exit1 before loading local credentials or writing any object.
  - graphify update . -> PASS, 11552 nodes / 33178 edges; pre-existing SQL/Erlang/HCL extractor dependencies and chat parser warnings retained.
  - git diff --check and combined implementation/config/test/runbook review -> PASS.
Known limitations / owner setup:
  - Owner confirmed no Arvan bucket yet. No live Arvan or R2 test, real dashboard upload or remote deployment performed; external compatibility is not claimed from loopback tests.
  - Owner creates private regional bucket, supplies local apps/api/.env ARVAN_ENDPOINT/BUCKET/REGION/ACCESS_KEY_ID/SECRET_ACCESS_KEY/REQUEST_TIMEOUT_MS and selects PRODUCT_MEDIA_STORAGE_MODE=arvancloud.
  - Safe next action: run pnpm --filter @sabz-zendegi/api storage:smoke --confirm-write, then restart local API and verify product and banner upload/read/replacement/delete. Command writes one unique diagnostic WebP, verifies exact downloaded bytes and deletes it; reports its key if cleanup fails.
  - Existing objects/outbox keys do not record provider; any switch with retained media requires a controlled transfer at identical keys and synchronized API/worker config. Runbook covers pause/copy/verify/switch/rollback. No silent split across providers.
  - Final task commit and dev push wait for owner local acceptance; do not mark DONE or start a next batch. Broader F12-FE01 stays REWORK.

MEDIA01 owner acceptance follow-up (2026-10-26): owner explicitly reports local run/test successful (exact console transcript not supplied). Combined source/config review and recorded automated checks PASS; F12-FE01-MEDIA01 accepted/DONE. Prior pending-owner statements are historical. No remote push/deployment; next owner-requested work is frontend upload failure recovery under a separate scoped task.

## Sadad main-domain callback — 2026-10-26

Task: F12-FE01-PAY01 — DONE (software). Owner authorized this scoped CLIENT-INTEGRATION continuation on dev, sole coordinator/writer/reviewer Codex /root, and requested one commit for all related changes. Baseline worktree clean. Broader F12-FE01 remains REWORK; no next batch.

### Accepted contract and implementation

- SADAD_RETURN_URL is explicit deployment configuration independent of PUBLIC_API_URL. Shared HTTPS/exact-path validation at startup, runtime and adapter rejects credentials/query/fragment. Existing callback parsing, server Verify, reconciliation and idempotency remain authoritative.
- Caddy exact-path handle forwards main-domain callback to same-VPS dev API port3303, preserving POST/form/query and backend303/Location; no-store and unchanged other site routes. Cross-host TLS/Host/trusted-proxy and environment-isolation limitations documented.
- Dashboard shows configured public return URL with old API-origin fallback when unset. Shared-dev bootstrap and immutable dashboard receive it; callback-only changes refresh public config/API. Synchronous runtime script precedes client evaluation; existing appearance script retained.
- Installer reconfiguration preserves explicit merchant callback while updating old API-derived defaults; portable installer includes snippet/runbook.
- No schema/migration/OpenAPI/dependency/secret change; no VPS access/deployment/payment/bank-setting mutation.

### Verification and main-agent review

PASS:
- API targeted payment-live-runtime, environment-validation and sadad-payment-provider.adapter suites: 21 tests.
- Dashboard payment-provider/runtime-config suites: 6 tests.
- API source and test TypeScript; dashboard TypeScript, targeted ESLint and optimized build. Generated settings HTML has synchronous runtime-config.js.
- python scripts/test-sadad-callback-proxy.py: real Docker Caddy exact-path forwarding, encoded POST form/query, repeated delivery,303/Location,no-store and unaffected website routes. Synthetic backend only; container cleaned up.
- node scripts/test-sadad-runtime-config.mjs: actual immutable entrypoint emits merchant callback and supports disabled empty setting.
- node scripts/test-runtime-config-loading.mjs: all three apps; prohibition scoped to runtime script, unrelated appearance script permitted.
- python -m unittest discover -s installation -p test_installation.py: 39 cases,35 pass/4 existing platform-gated skips on Windows. Configure read/write regression verifies merchant override and old-default update.
- bash scripts/test-vps-dev.sh: includes callback-only public config/API refresh. bash -n for changed shell scripts.
- node scripts/test-release-pipeline.mjs: release contracts.
- graphify update .:11579 nodes/33255 edges. Existing SQL/Erlang/HCL extractor and unrelated chat parser warnings. Graph output Git-ignored; not force-staged.
- Main-agent scoped diff review and git diff --check. Protected files and existing financial authority preserved.

### External acceptance and safe next action

No unresolved software blocker. Live activation/error1023 resolution remains unverified. Apply the Caddy import inside the existing drshirmardi.com site, validate/reload, set dev SADAD_RETURN_URL=https://drshirmardi.com/v1/payments/providers/sadad/callback, deploy and perform owner-authorized payment/cancellation/replay acceptance per deploy/sadad-live-runbook.md. PUBLIC_API_URL stays on dev API. Never send production traffic to dev or share one callback between concurrent environments. No next batch.

### Changed files

- apps/api/.env.example
- apps/api/src/config/environment.validation.ts
- apps/api/src/config/sadad-callback-url.ts
- apps/api/src/modules/commerce/payments/sadad-payment-provider.adapter.ts
- apps/api/src/modules/commerce/payments/sadad-runtime-config.service.ts
- apps/api/test/environment-validation.spec.ts
- apps/api/test/payment-live-runtime.spec.ts
- apps/dashboard/src/app/layout.tsx
- apps/dashboard/src/lib/commerce-payment-provider-api.spec.ts
- apps/dashboard/src/lib/commerce-payment-provider-api.ts
- deploy/docker/next-entrypoint.mjs
- deploy/sadad-live-runbook.md
- deploy/vps/compose.dev.yaml
- deploy/vps/compose.yaml
- deploy/vps/deploy-dev.sh
- deploy/vps/dev-env.example
- deploy/vps/dev-service.sh
- deploy/vps/env.example
- deploy/vps/production-env.example
- deploy/vps/sadad-callback.caddy.example
- docs/ENVIRONMENT.md
- installation/manager.py
- installation/test_installation.py
- plan/STATUS.md
- plan/phases/12-PRODUCTION-HARDENING.md
- scripts/test-runtime-config-loading.mjs
- scripts/test-sadad-callback-proxy.py
- scripts/test-sadad-runtime-config.mjs
- scripts/test-vps-dev.sh

## Sadad merchant departure and pending attempt recovery — 2026-10-26

Task F12-FE01-PAY02: DONE (software), same CLIENT-INTEGRATION, sole /root on dev, main-agent review PASS. Owner explicitly authorized both fixes and one commit for all related changes. Baseline clean; PAY01 dependency complete. Broader F12-FE01 remains REWORK; no next batch.

### Evidence and frozen behavior

Owner supplied browser evidence: Sadad Purchase navigation carried a dev-app Referer even with a main-domain callback, and a new gateway-attempt request returned BILLING_PAYMENT_PENDING for an existing ready attempt. Domain rejection occurred before callback; exact PSP whitelist rule remains unconfirmed. ADR-0042 records owner-approved merchant document and financial recovery boundaries.

Both shared billing and retained legacy payment response paths now return the configured callback origin's /v1/payments/providers/sadad/start URL. The token is in a fragment, so no token enters merchant proxy/API HTTP request logs. A real public rate-limited HTML document removes the fragment from history, validates bounds, URI-encodes the token into the fixed configured bank purchase endpoint and navigates with Referrer-Policy origin. Nonce CSP, no-store, no external resources, nosniff, frame/base restrictions and a manual continue link retained. No request-controlled redirect destination, amount, merchant credential or financial action is accepted by the page. Existing bank profiles and callback Verify authority remain unchanged.

Gateway creation under the existing intent/target locks reuses an active attempt for fresh idempotency keys. No duplicate PSP request or financial record is created; token, amount and revision remain original. Ambiguous/in-flight attempts return their current state without a new bank request. Owner access, expiry, legacy pending guard, wallet spending/cancel guards and late verified callback recovery are preserved. REDIRECT_READY is visible in existing authorized billing reconciliation for server Verify and reviewed failure resolution. A bank-confirmed definitive failure permits a fresh attempt; browser failure alone cannot mark a payment failed or successful.

Caddy forwards exactly callback and start paths. OpenAPI and generated client include the public HTML route. Deployment instructions describe updating the existing /etc/caddy/sadad.caddy matcher, validation/reload and normal dev deployment. No schema, dependencies, frontend source changes or server/database mutation.

### Verification

- Real PostgreSQL wallet suite:17 tests PASS, including actual public HTTP page, six different-key concurrent creates producing one PSP request/row, ready-token/order resumption, cross-patient rejection, timeout remains ambiguous/no replacement, exactly-once credit, definitive Verify failure permits a fresh attempt, and ready reconciliation visibility.
- Targeted API browser-start/live-runtime/provider-adapter plus wallet suite:36 tests PASS total.
- All86 migrations and dev seed applied only to task-owned temporary Docker PostgreSQL at127.0.0.1:55419/wallet_test. Container removed after verification; original local/VPS databases untouched.
- scripts/test-sadad-browser-start.mjs PASS with real Chromium and actual controller HTML through Fastify: app -> merchant document -> intercepted bank destination has merchant Referer; encoded token preserved; fragment absent from merchant HTTP request; malformed/empty token refuses navigation. No bank network/payment.
- scripts/test-sadad-callback-proxy.py PASS with real Caddy: exact GET start and POST callback, original form/query, repeated delivery,303/Location,no-store and unrelated-route preservation.
- API build and source/test types PASS. SDK regenerated/built,12 client tests PASS; app/dashboard types PASS.
- scripts/test-release-pipeline.mjs PASS. Combined diff and git diff --check PASS.
- Graphify AST update PASS:11604 nodes/33313 edges; existing SQL/Erlang/HCL extractor and unrelated chat parser warnings. Ignored output not force-staged.

### Handoff

Software has no unresolved blocker. One final task commit on dev; no push/deployment or actual financial writes. Next safe action: push/deploy this commit, extend existing main-domain Caddy handle to callback AND start as documented in deploy/sadad-live-runbook.md, validate/reload, and resume the prior intent. Confirm Purchase Referer is https://drshirmardi.com/ with Preserve log. PSP error1023 resolution remains an external acceptance gate, not proven by local browser behavior. Expired/uncertain tokens require existing admin Verify/reconciliation; never delete/reset financial records. No next batch.

### Changed files

- apps/api/src/common/errors/api-error.ts
- apps/api/src/modules/billing/billing-gateway.service.ts
- apps/api/src/modules/billing/billing-reporting.service.ts
- apps/api/src/modules/commerce/payments/patient-payment-attempt.controller.ts
- apps/api/src/modules/commerce/payments/payment-attempt.service.ts
- apps/api/src/modules/commerce/payments/sadad-browser-start.ts
- apps/api/test/payment-live-runtime.spec.ts
- apps/api/test/sadad-browser-start.spec.ts
- apps/api/test/wallet-billing.integration.spec.ts
- deploy/sadad-live-runbook.md
- deploy/vps/sadad-callback.caddy.example
- packages/api-client/openapi.json
- packages/api-client/src/schema.generated.ts
- plan/STATUS.md
- plan/decisions/ADR-0042-sadad-merchant-browser-departure.md
- plan/phases/12-PRODUCTION-HARDENING.md
- scripts/test-sadad-browser-start.mjs
- scripts/test-sadad-callback-proxy.py

## Sadad live callback token casing — 2026-10-26

F12-FE01-PAY03 DONE (software), same CLIENT-INTEGRATION, sole coordinator/writer/reviewer /root on dev. Owner supplied actual POST application/x-www-form-urlencoded callback field names: lowercase token, ResCode, OrderId, plus unrelated SwitchResCode/CSRF/card-hash/wallet fields. Prior parser accepted only Token and reproduced the observed422. No real callback/token/card/session data copied into source, fixtures or logs.

Accepted correction: normalize only the observed token alias to the canonical internal token, retain Token compatibility, and reject conflicting aliases, arrays/repeated parameters, empty/oversized values and existing invalid numeric fields. Equal scalar aliases are accepted. Existing token matching, provider-order/amount checks, server Verify and exactly-once settlement remain unchanged. Browser ResCode0 alone cannot settle money. No schema/migration, dependency, Caddy, environment or frontend behavior change. Protocol contract records owner-provided runtime evidence; runbook explains original-attempt Verify recovery.

OpenAPI/client explicitly require OrderId/ResCode and at least one typed token spelling. Generated callback body remains an intersection with typed alternatives rather than unknown. Regeneration also synchronizes the PAY02 PAYMENT_START_RATE_LIMITED error code already present in runtime source; no new error runtime behavior in this slice.

Verification PASS:
- payment-provider-contract, sadad-payment-provider.adapter and payment-live-runtime:26 tests, including lowercase/uppercase compatibility and malformed/conflicting/duplicate tokens.
- Wallet/billing real PostgreSQL:18 tests. Simulated PSP now uses the actual production callback parser. Real HTTP lower-token form with synthetic extra bank fields reaches server Verify then303 to /profile/wallet/payment-result; replay gives one persisted wallet credit. Wrong token409, conflicting aliases422 and repeated token parameters422 cannot credit money. Existing concurrency, ownership, reconciliation and financial tests retained.
- Dedicated ephemeral Docker PostgreSQL on127.0.0.1:55419/wallet_test, all86 migrations and seed; removed after checks. Original local/VPS DB untouched.
- API source build/test types; generated SDK build/drift check and12 SDK tests; app/dashboard consumer types.
- Graphify AST refresh:11604 nodes/33316 edges; existing unsupported SQL/Erlang/HCL and unrelated chat parser warnings. Ignored graph output not force-staged.
- Main-agent combined diff/contract review and git diff --check. No unresolved software blocker.

One final scoped commit; no push, deployment, live bank call or financial write. Next: deploy API commit; no Caddy/env/migration action. For the existing debited transaction, use administrator billing reconciliation Verify on its original attempt and follow the bank result. Do not initiate another payment or manually force success. Actual bank verification/settlement remains owner acceptance; broad F12-FE01 stays REWORK and no next batch starts.

Changed files: API payment adapter/controller; payment-provider-contract and wallet-billing tests; packages/api-client/openapi.json and src/schema.generated.ts; deploy/sadad-live-runbook.md; plan/contracts/sadad-ipg-v1.md; plan/STATUS.md, phases/12-PRODUCTION-HARDENING.md and this log.

## Saved order payment recovery — 2026-10-26

F12-FE01-PAY04 DONE (software), depends PAY03, CLIENT-INTEGRATION sole coordinator/writer/reviewer /root on dev, clean initial baseline. Owner requests implementation with focused verification and one commit; explicitly confirms preserving the saved order amount. ADR0043 freezes this policy. Broader F12-FE01 remains REWORK/unchecked; scoped claim RELEASED, no next batch.

Implemented: inventory expiry releases shared-path stock without cancelling its order; actual fresh payment/verified settlement reacquires every expired item under order/inventory locks. Entire required stock is checked before acquisition, with deterministic SKU lock ordering and per-cycle reservation/release ledger keys; consumption remains once. Accepted order/price/tax/shipping/discount snapshot remains immutable. Discount quota for new accepted orders survives stock expiry until consumption or explicit cancellation; historical expired discounts may settle at accepted value. Cancellation closes the unpaid order/releases stock and discount even if inventory already expired. New checkout detaches unchanged cart snapshot rows atomically; historical matching pending checkout can be resumed after expiry.

Ready bank attempts resume before inventory viability checks, avoiding duplicate PSP requests when the original hold expires. Existing worker verifies ready attempts after20-minute grace; only definitive provider failure frees that payment guard. Uncertain Verify is retried through existing reconciliation. Token-less requests expire after two minutes, cannot expose a late response token, and retain proof-based late callback recovery. A late shared receipt reacquires stock and settles the original order or closes it and credits existing compensation exactly once. Legacy ambiguous receipts preserve their prior separate reconciliation protection; no force-success/cancellation from browser hints.

Visible pending generic/store/result payment screens refresh every five seconds without loading flicker, confirmation loss or request overlap in the polling loop. Resource generations suppress stale session/resource responses. Terminal results stop polling. Normal manual status-refresh controls removed, error retry retained. Wallet/cancel controls honor unresolved bank guards and ready bank button resumes its original attempt. Stock and initial bank failure feedback is actionable.

Verification PASS:
- Real disposable PostgreSQL:29 tests across wallet-billing24, inventory expiry3 and commerce checkout2. Covers repeated expiry/reacquisition ledger cycles; recorded price despite catalog price change; concurrent wallet retries/one debit; competing last-unit orders/one sale; shared pending stock release and independent next order; resume original bank token after expiry; late original-order settlement; multi-item shortage with no partial acquisition and once-only wallet compensation; accepted discount and explicit cancellation; abandoned ready/token-less maintenance. Existing ownership, proof mismatch, callback parsing/replay, wallet/refund/appointment/ledger regressions retained.
- App focused units:14 across wallet labels/API/cart. Browser:3 intercepted Chromium cases, actual subsequent polls preserve confirmation on both wallet and store payment; ambiguous result becomes server-confirmed paid automatically and stops reading. Fixtures updated for current entry gate and complete order DTO; initial Strict Mode double reads cannot satisfy polling assertions.
- API build-source and test TypeScript, app TypeScript, git diff --check PASS. No HTTP DTO/schema/dependency change or SDK regeneration required. Full unrelated test/build suites intentionally not run.
- Graphify AST refreshed after source edits (11615 nodes/33351 edges), existing unsupported SQL/Erlang/HCL and unrelated chat parser warnings only. Ignored graph output not staged.
- Main-agent combined implementation/contract/acceptance diff review PASS; protected files untouched, no unrelated changes.

All86 migrations/seed ran only in task-owned ephemeral127.0.0.1:55419/wallet_test Docker database. Database removed after checks; main local/VPS database and real bank untouched. No secrets copied from owner browser evidence. One task commit, no push/deploy. Dev acceptance: deploy API and app together; no new migration/env/Caddy settings. Existing stock TTL remains configurable/default20 minutes; server worker runs expiry every minute/bank maintenance every30 seconds, UI reads every5 seconds. Test return/abandonment then same-order retry, independent purchase, successful wallet/bank purchase and resulting tracking/receipt. Historical closed orders are not reopened; provider outages cannot safely be converted into invented failure for token-bearing attempts.

Changed files:
- apps/api/src/modules/billing/billing-gateway.service.ts
- apps/api/src/modules/billing/billing-target.registry.ts
- apps/api/src/modules/billing/billing.service.ts
- apps/api/src/modules/commerce/checkout/commerce-checkout.service.ts
- apps/api/src/modules/commerce/discounts/commerce-discount.service.ts
- apps/api/src/modules/commerce/inventory/commerce-inventory.service.ts
- apps/api/src/modules/commerce/payments/order-billing.target.ts
- apps/api/test/commerce-checkout.integration.spec.ts
- apps/api/test/inventory-reservation-expiry.integration.spec.ts
- apps/api/test/wallet-billing.integration.spec.ts
- apps/app/e2e/wallet.spec.ts
- apps/app/src/app/(app)/profile/wallet/pay/page.tsx
- apps/app/src/app/(app)/profile/wallet/payment-result/page.tsx
- apps/app/src/app/(app)/store/checkout/page.tsx
- apps/app/src/app/(app)/store/payment/page.tsx
- apps/app/src/components/billing/payment-chooser.tsx
- apps/app/src/lib/use-patient-resource.ts
- apps/app/src/lib/use-payment-refresh.ts
- apps/app/src/lib/wallet-billing-api.ts
- apps/app/src/lib/wallet-labels.ts
- plan/STATUS.md
- plan/contracts/billing-target-effects-v1.md
- plan/contracts/wallet-billing-v1.md
- plan/decisions/ADR-0043-order-payment-recovery.md
- plan/phases/12-PRODUCTION-HARDENING.md
- plan/logs/phase-12.md

## Visit care workspace implementation (2026-10-27)

Task: owner-authorized CLIENT-INTEGRATION / F12-FE01 continuation; sole /root on dev. Status IMPLEMENTED_UNVERIFIED / REWORK; broader task unchecked. Owner retains final manual acceptance and defers tests, typecheck, lint, application build and browser automation. No commit/push/new batch.

Implementation:
- Existing visit workspace retains lazy-mounted chat, visit note/patient summary and prescriptions, and adds treatment instructions and product/cart panels. Real patient/visit identity remains fixed. New visit opens a new prescription form rather than silently editing a prior visit's latest prescription. Existing tabs keep in-memory drafts. Explicit in-page discard/exit confirmation and unfinished-work indication protect writing; no sensitive local-storage persistence. Clinical note signing/publishing now refuses unsaved edits, with visible field labels and current-visit note draft state propagated; authorized earlier notes can be read without leaving the visit.
- Standalone prescriptions now selects patients through existing admin server search/pagination or clinician assigned-visit pages. Server-authorized profile name is returned with the prescription list; arbitrary URL name is not used. The editor selects any loaded prescription, creates independent prescriptions, pages older prescriptions and revision history, retains text on errors, and disables issuance until exact current inputs are saved. Issuance requires in-page confirmation and the existing exact revision API. Selection confirmations cannot discard data while an operation is in flight; token renewal does not reset a loaded draft.
- CreatePrescriptionDto optional commandId/appointmentId: current clinical grants retained, contextual creation checks appointment/patient/assignment and clinic access. Clinical CREATE audit records visit provenance and request hash. Command UUID pins new prescription identity; advisory lock, owning patient/clinic/author and hash checks replay a creation retry without duplication. This is audit provenance only, not a new relational prescription-to-appointment field. Revision/issue immutability and audit remain intact.
- Added authorized admin revision-history pagination and self-only patient issued-prescription reader. Patient query returns only the current issued revision even when a newer amendment is DRAFT; exact issued pointer is checked. Clinical READ audit, private no-store and existing self permission retained. Patient treatment page displays prescriptions independently of treatment-plan loading, with pagination; appointment details and profile history link to it. No draft or other user's record is substituted.
- Treatment authoring uses existing medications, nutrition, exercise and session definitions. Save DRAFT and explicit publish ACTIVE are independent; stored drafts can be revisited/edited. New commandId protects create retries; draft replacement is one transaction with row lock, expectedUpdatedAt, DRAFT-only state, scheduled-task fence and custom-program boundary checks. Existing goals/private session instructions are carried through editing. Published/custom programs, paid ownership and clinical authority are not weakened.
- Visit-specific product lookup performs real active-clinic SKU search/pagination (12/page) without granting generic commerce-admin access. Adding to patient cart requires ADMIN or currently assigned active DOCTOR, clinical edit grant and clinic access; appointment scope is rechecked in transaction. Atomic quantity increment preserves other items and the existing 100-unit cap. Existing AuditEvent storage pins the command and result in the same transaction; mismatched replay conflicts, same replay does not increment again. Clinical audit records actor/visit/SKU/added quantity. No stock reservation, checkout/order/payment or provider operation is performed; checkout retains real price/stock decisions.

Owned source: clinical module, prescription DTO/service/admin controller/response and new patient-prescriptions controller; treatment-plan DTO/service/admin controller; new visit-care service/controller; dashboard prescriptions editor + patient selector/API; visit workspace/notes/new treatment/product panels and reused clinical-note editor; patient treatment issued-reader/component and appointment/profile-history links; packages/api-client/openapi.json and generated schema source; existing prescription dashboard contract and coordinator status/phase/log. Working tree was clean at claim; protected slider-data.ts/justforcheck.md and dependencies/lockfile/schema unchanged.

Verification performed: source review of schema, controller/service callers, scope guards, issued visibility, retry/atomicity paths and UI async lifetimes. Official API-client generate completed successfully after scoped additive OpenAPI edits. TypeScript source syntax parsing (24 changed/new TS/TSX files) reports zero syntax diagnostics; this is not a typecheck or behavioral test. git diff whitespace review passed. No test/typecheck/lint/application build/automated browser or actual clinical/cart database mutation executed. Runtime Swagger export parity remains deferred; shared SDK dist was not rebuilt, and new endpoint consumers use the existing session-aware HTTP transport.

Owner checks still required: assigned physician versus other clinician/clinic denial; create/save/amend/issue exact content and double-click/network retry; previously issued content remains visible while amendment is draft; patient self-only reads; tab/token-renewal retention and narrow-screen forms; new/draft/active/custom treatment boundaries, stale draft edits and publication; product search, variant/quantity, existing cart preservation/retry/concurrent patient edits/cap; current-visit note signing/summary publication and end-visit behavior. Automatic reminder/schedule generation from free-text prescriptions is not introduced. Existing clinical clinic/role grants must already be configured. Next action: owner manual review, resolve reported issues, then authorized deferred checks before acceptance/DONE.

## Home compact paid-order progress — 2026-10-27

F12-FE01-HOME05 DONE (software), same CLIENT-INTEGRATION sole /root continuation; scoped claim RELEASED. Owner asks for a compact order stepper in Home upcoming actions after verified purchase, linking the existing tracking page, explicitly NO COMMIT. Baseline contains unrelated uncommitted clinical/prescription/treatment/dashboard/generated-client/governance work; preserved entirely. Shared governance changes are append-only. No stage/commit/push/deploy or next batch; broad F12-FE01 stays REWORK.

Home previously projected only pending-payment orders. Add a separate bounded findFirst scoped by patient/clinic, verified/partially-refunded Payment evidence and active fulfillment statuses (PAID, FULFILLMENT_PENDING, FULFILLING, READY_FOR_PICKUP, SHIPPED). It does not depend on the capped unpaid-order previews. Existing TRACK_ORDER shape remains unchanged; one paid representative takes priority over unpaid tracking, following urgent appointment/payment actions and staying within the first3 visible items. Delivered, fulfilled, cancelled, refund and cancellation-request states are not selected. Existing next-action authority/payment/order state remains unchanged.

Home fetches details only for this single selected order using the existing owned order endpoint/resource generation guard. Entire compact card is an ordinary keyboard-focusable link to that exact tracking URL. Reuse existing OrderProgress with an optional compact presentation: hide the already-completed registration step and verbose header/hint, retaining real payment/preparation/dispatch-or-pickup/delivery statuses. Tracking page keeps its full5-step renderer. Error/loading fallback remains a useful link without invented progress; a terminal detail response hides the stale action. Ice/teal Home tokens, RTL connectors,12px stage labels, visible focus and compact28px icons fit the existing card layout; sibling action cards retain their own height. No normal polling or financial write introduced.

Verification PASS:
-9 Home projection tests, including exact urgent/payment/paid-order ordering and one representative category.
-18 existing app Home status/journey unit tests.
-1 targeted real PostgreSQL integration regression (other15 cases intentionally not run): actual balanced synthetic wallet/payment proof, foreign patient exclusion, PAID-without-proof exclusion,7 newer unpaid orders beyond preview cap, all5 active fulfillment and5 closed/requested states. Production constraints remain enabled; no mocked PostgreSQL. Fresh isolated86 migrations/seed on task-owned127.0.0.1:55419/patient_journey_test; ephemeral Docker database removed after verification. No main DB/live financial writes.
-2 intercepted Chromium browser cases:320/390/768/1440, compact card height<215px, no horizontal overflow, RTL stage positions, exact tracking click/full5-step destination, real preparation/dispatch/pickup stages, delivered hiding and error fallback without progress. Visual review of390/1440 screenshots with neighboring appointment/payment actions PASS.
-App typecheck and API test/source TypeScript PASS; combined scoped diff and whitespace review PASS. Full unrelated suites/build deliberately omitted. Shared OpenAPI/client untouched by this task because no DTO change (pre-existing dirty generated work retained).
-Graphify AST refresh PASS; existing optional SQL/Erlang/HCL extractor and unrelated chat parser warnings retained. Ignored graph output not staged.

Files owned by this slice:
- apps/api/src/modules/patients/journey/patient-journey.service.ts
- apps/api/src/modules/patients/journey/home-journey.projection.ts
- apps/api/test/patient-journey.integration.spec.ts
- apps/api/test/home-journey.projection.spec.ts
- apps/app/src/components/home/home-order-progress.tsx
- apps/app/src/components/home/home-journey.tsx
- apps/app/src/components/store/order-progress.tsx
- apps/app/src/app/globals.css
- apps/app/src/lib/home-status.ts
- apps/app/e2e/home-order-progress.spec.ts
- playwright.home-order.config.ts
- plan/STATUS.md (append only)
- plan/phases/12-PRODUCTION-HARDENING.md (append only)
- plan/logs/phase-12.md (this entry only)

Next: owner visual review of Home with an actual paid unfulfilled order; API and app changes must both be running. No migration/env/Caddy change required. All changes deliberately remain uncommitted per owner instruction.

## Blue multilingual landing — 2026-10-27

Owner-approved F12-FE01 continuation; sole /root, branch codex/landing-content-structure, baseline 15bc0ea. Scope READY_FOR_OWNER_VISUAL_REVIEW / software review PASS; broad phase/task remains REWORK. No commit, push, deployment or subsequent batch.

### Result

Replaced the visible legacy landing with a current app-aligned ice-blue/white presentation: #E9F4FE/#EDF9FC/#F5FBFF, ink #173D59, muted #486B82, action #087C91 and hover #066477. Individual/couples/visit selector and service explorer have native keyboard tab navigation and real existing app destinations. Mobile places the doctor portrait beside the heading in the first view. Original supplied doctor phrases are arranged in doctor/journey/nutrition/couples/consultation sections. Generic store entry, localized questions/contact and metadata remain; no miracle-oil, invented statistics/testimonials or discount feature is rendered. The prior portrait is a temporary reference: no new photograph was provided.

next-intl 4.14.9 provides fa at /, en at /en and Simplified Chinese at /zh-CN, a remembered language choice, localized metadata/hreflang and legacy login/signup redirects preserving next. IRANYekanX 400/500 matches current patient Home/storefront; Geist and dictionary-subset Noto Sans SC are self-hosted with OFL files and a regeneration script. English/Chinese inform visitors that the patient destination is Persian; phone sign-in still requires an Iranian number. The root WebExperience keeps the dialog and OTP state alive while locale routes change. Error codes are carried additively by the web service for translated feedback; backend/API/SMS/cookie/security/role rules are unchanged. Closing after a language change restores focus to the persistent header when the original page button no longer exists.

### Verification and evidence

- Web TypeScript PASS; production Next build PASS, including locale pages, legacy routes and icon.
- Web Vitest PASS: 7 files / 27 tests, including dictionary/content/error-key parity.
- Browser suite PASS: 6 scenarios; three SSR locales at 320/390/768/1440, RTL/LTR and actual font families, no horizontal overflow, hero keyboard and service selection, FAQ, numeric filtering, phone and partial OTP retention across languages/dismissal, one request, translated verification errors, expiry control, mobile full-width/desktop 480px dialog, left close button, automatic success navigation, safe next preservation, localized 404 and reduced motion. Focus-return addition rechecked separately PASS. All auth calls were synthetic interceptions; no live SMS/account write.
- Desktop/mobile screenshots reviewed for all locales; files under the system temporary mushroom-landing-preview directory, including the Persian full-page view. Native in-app preview also reviewed.
- Main contrast pairs: action/white 4.88:1, ink/ice 10.19:1, muted/ice 5.09:1. Keyboard/reflow checks performed; no claim of a comprehensive WCAG certification or actual-device acceptance.
- ui-ux-pro-max and design-system guidance applied. Figma MCP created and visually reviewed an editable brand/interaction board (23 text nodes): https://www.figma.com/design/PDSyoFnawEkzug9JKNrE2L?node-id=2-9. This is a review board rather than a full-page Figma reconstruction.
- Graphify AST refresh PASS with existing optional SQL/Erlang/HCL extractor and unrelated chat parser warnings; diff whitespace review PASS. apps/app, apps/api and shared generated clients unchanged.

Owner visual review and a newly supplied photograph are the next inputs. English/Chinese medical/editorial copy remains reviewable draft content; no remote publication was performed.

### Owner portrait replacement — 2026-10-27

Same landing continuation, sole /root, codex/landing-content-structure. Owner supplied a 1448x1086 RGB PNG and requested replacement at its full resolution with the gray background removed. Built-in image_gen used for a transparent cutout, saved as apps/web/public/images/doctor-portrait.png (1448x1086 RGBA, 757433 bytes; alpha spans 0..255, 1110218 fully transparent pixels). The file is served directly as lossless PNG; no web optimizer or lossy conversion is applied. Hero JSX uses the real dimensions; photo borders, rounded frame and rectangular shadow removed on desktop/mobile so page blue shows through. Existing source portrait and all unrelated changes preserved.

Web TypeScript and three localized browser layout cases PASS (fa/en/zh-CN at 320/390/768/1440). Desktop/mobile and in-app English preview inspected; browser reports naturalWidth=1448, naturalHeight=1086 and complete=true for the new PNG. No new tests, backend changes, commit, push or deployment. Owner visual review remains the next step; older temporary-portrait note above is superseded.

### Landing task commit gate — 2026-10-27

Owner explicitly requested a correct local commit on the existing branch. This supersedes the earlier no-commit instruction for this landing slice only; push/deploy remain unauthorized. Register the approved presentation scope as F12-FE01-WEB02, dependent on completed WEB01 sign-in foundations and the existing blue patient Home/storefront identity. Software slice DONE / sole /root combined review PASS; no incomplete backend roadmap work is marked done and broad F12-FE01 remains REWORK.

Reviewed the complete tracked diff and every untracked path. Scope is apps/web implementation and assets (including local font licenses, regeneration script and full-dimension transparent owner portrait), the next-intl lockfile entries, landing browser configuration/scenarios and this task's plan evidence. No apps/app, apps/api, protected slider-data.ts, justforcheck.md or shared generated client change. Existing type/build evidence retained; 27 web tests and all 6 intercepted browser scenarios rerun against final source immediately before staging and PASS. git diff --check PASS. One final task-level commit: feat(F12-FE01-WEB02): build blue trilingual landing. No next batch, push or deployment.

### Portrait bottom edge follow-up — 2026-10-27

Owner-authorized continuation of F12-FE01-WEB02 on the same branch, sole /root, scoped review PASS and claim released. Applied frontend-design and ui-ux-pro-max guidance to a CSS-only adjustment: image alpha stays opaque through 86% of its displayed height on desktop and 88% below 768px, then fades to transparent at the bottom. Halo has its own 75%-to-bottom mask, including its decorative pseudo-element. Both standard and WebKit mask properties supplied. Figure, quote card and caption remain outside the portrait mask. No layout, content, authentication or API change.

Three existing localized Playwright cases PASS, covering fa/en/zh-CN at 320/390/768/1440 with no horizontal overflow. Visually inspected all twelve locale/width combinations: coat bottom blends into the existing blue background and hands stay opaque. Additional browser inspection confirms computed 88%/86% mask stops across the mobile/desktop boundary and natural image size 1448x1086. Original PNG SHA256 remains E0638DA8F655313A947FE90B59D82EBA441F4BD926FA5C1CD7AD430D66E12032. Graphify update PASS (no topology changes; existing optional extractor warnings); git diff --check PASS. Targeted browser verification is proportional to this CSS-only change; no new tests or build rerun needed.

Before previews preserved under %TEMP%/mushroom-landing-preview/portrait-before-{desktop,mobile}.png; after previews under %TEMP%/mushroom-portrait-fade-after/. Changes left uncommitted as explicitly requested; no push, deployment or next batch.

### Mobile menu and hero dot — 2026-10-27

Same owner continuation, sole /root on codex/landing-content-structure; scoped review PASS, claim released. CSS-only change hides site-mobile-menu below 768px (tablet menu and desktop navigation preserved) and adds a 2.8-second transform/opacity pulse on the hero kicker dot's decorative pseudo-element. Reduced-motion preference disables the animation. No layout animation, dependencies, auth or content changes. Existing uncommitted portrait fade and concurrent LocaleSwitcher.tsx edits preserved without modification.

Three existing localized responsive Playwright cases PASS across 320/390/768/1440. Targeted browser assertions PASS for hidden mobile menu at 467, visible tablet menu at 768, visible desktop navigation at 1440, active dot animation and no animation under reduced motion. Reviewed 467px screenshot at %TEMP%/mushroom-landing-preview/mobile-navbar-pulse.png. Graphify update and diff whitespace check PASS; no build rerun for this CSS-only adjustment. Local web preview running on port 3000. No commit/push/deployment or next task.

### Locale switcher missing stylesheet — 2026-10-27

Owner reported the missing LocaleSwitcher.module.css import in the concurrently edited dropdown implementation. Added that CSS module with all referenced class names, blue identity, focus states and compact mobile presentation. Registered its existing Radix dropdown dependency in apps/web (it had been added only to apps/app by pre-existing work); pnpm updated the lockfile. Preserved LocaleSwitcher.tsx, navigation.ts, apps/app changes and earlier uncommitted landing edits. Web typecheck, production build and three localized responsive browser cases PASS (320/390/768/1440); diff whitespace check PASS. No commit/push/deployment and no persistent server started by this fix.

### Compact language menu — 2026-10-27

Owner requested only language choices in the dropdown. Removed the visible heading/separator, duplicated descriptions and symbol tiles; kept native language names, selected checkmark, accessible menu label and 44px touch rows. Panel reduced from 248px to 184px wide. Typecheck and diff whitespace check PASS. Browser verification at 496px: exactly three named radio choices, panel 184x146, English-to-Persian navigation PASS; screenshot visually reviewed. Same WEB02 owner follow-up, scoped review PASS, no commit/push and unrelated changes preserved.

### Login language menu portal — 2026-10-27

Owner-reported mobile/desktop bug: dropdown content defaulted to document.body, outside the native showModal dialog's top layer, making it obscured and inert. LocaleSwitcher now finds the trigger's closest dialog via a stable ref callback and portals into that dialog; ordinary header usage retains the default body portal. No z-index workaround or auth behavior change. Updated existing locale-switch test interactions to the current radio-menu UI and added regression coverage at 390/1440 for visible interactive menu within dialog, Escape closing only the menu and restoring trigger focus, locale change retaining phone and login query. Typecheck PASS, existing six browser cases PASS (including OTP challenge/code retention and automatic success), both new regressions PASS; screenshots visually reviewed on mobile/desktop. Graphify update and diff check PASS. Same WEB02 continuation, sole /root scoped review PASS, no commit/push/deploy; unrelated edits preserved.

### Natural portrait refinement — 2026-10-27

Owner requested improved facial appearance in the hero. Used built-in imagegen edit with original studio photograph as identity reference and existing transparent cutout as placement reference. Prompt: restore the original photographic face, reduce etched/overprocessed sharpening artifacts, subtly balance exposure and white balance; preserve identity, age, expression, skin texture, hair, pose, hands, coat, scale and crop; genuine transparent background, no added elements. Generated output saved non-destructively as apps/web/public/images/doctor-portrait-refined.png (1448x1086, 762782 bytes, 32-bit alpha, corner alpha 0). Hero references the refined variant; previous PNG remains byte-identical (SHA256 E0638DA8F655313A947FE90B59D82EBA441F4BD926FA5C1CD7AD430D66E12032). Existing CSS fade preserved. This is a generated photographic retouch, with owner visual acceptance still appropriate for identity-sensitive presentation.

Three localized browser layout cases PASS at 320/390/768/1440; reviewed Chinese mobile and English desktop screenshots. Diff whitespace check PASS. No behavior change or new tests/build required for this asset replacement; no commit/push/deploy. Same WEB02 owner continuation, sole /root scoped technical review PASS; unrelated work preserved.

### Arabic landing language — 2026-10-27

Owner requested Arabic as an additional landing language. Same WEB02 continuation, sole /root scoped review PASS, claim released on codex/landing-content-structure. Added /ar and a structurally complete Arabic dictionary for metadata, landing content, service/FAQ arrays, footer, fallback pages and OTP labels/errors. Four-choice language dropdown saves the existing locale cookie. Arabic shell, native sign-in dialog, tabs and directional arrows use shared isRtlLocale; routing now discovers supported locales from the path rather than a three-language expression. Header/dialog remain mounted across language changes; transport, Iranian phone requirement, challenge deadlines and automatic-success continuation unchanged. Arabic visitors are told the destination app is Persian. Arabic uses existing self-hosted IRANYekanX 400/500, with dictionary glyph coverage checked against font cmap; no new font/dependency or app/backend change.

Verification: web TypeScript, production build and 29 unit tests PASS. Nine browser cases PASS (four languages at 320/390/768/1440, OTP state and partial code retained through Arabic, translated invalid-code error, automatic success, two native-dialog portal regressions and existing fallback/motion coverage). A further Arabic-specific case PASS for cookie discovery from root, localized 404, legacy login redirect preserving next, Arabic-Indic number normalization, radio selection state, Escape menu/dialog behavior and phone retention after reopening. Arabic metadata alternate verified. Visually reviewed Arabic desktop/mobile, 320/768 boundary captures and sign-in menu at 390/1440 under %TEMP%/mushroom-landing-preview/landing-ar-*.png. Graphify AST update and git diff --check PASS. No real SMS, commit, push, publication or next batch. Existing concurrent Footer, dictionaries, app package and lockfile work preserved.

### Approved Shin logo and favicon — 2026-10-27

Owner selected the supplied geometric Persian Shin mark and requested background removal, site branding and the same favicon. Built-in imagegen extracted a transparent PNG, saved in public/brand/shirmardi-logo.png. Converted the original approved silhouette directly into public/brand/shirmardi-logo.svg with six independently named vector paths (three body sections, three dots), flat brand #087C91 and no background/frame. Reproducible conversion script: scripts/prepare-brand-logo.py (OpenCV/NumPy, no runtime dependency). Header/footer now display this SVG instead of ScanFace branding, with responsive width and transparent wrapper. Existing service icons are unchanged. No animation added.

Updated native Next.js icon.svg with the full mark centered in a transparent 64-square canvas; generated transparent 256px shirmardi-icon.png, ICO 16/32/48/64/128/256 and 180px apple-icon.png from that SVG. Next metadata advertises all three icon formats with content-derived URLs. All asset routes return 200 and correct image content types; SVG has exactly six paths and no background rectangle, raster alpha spans 0..255. Typecheck and production build PASS, four localized responsive cases PASS at 320/390/768/1440; reviewed 320px Persian and desktop English header screenshots, plus the icon raster. Initial footer write was transiently blocked by a mapped-file handle; retried with an atomic patch, then all checks passed. Existing concurrent edits preserved. Same WEB02 owner continuation, sole /root scoped review PASS; no apps/app/backend/auth changes, commit/push/deploy or next batch.

### Navbar logo assembly loop — 2026-10-27

Owner requested entrance animation and periodic collapse/reassembly of the chosen navbar logo. Added AnimatedBrandLogo, reusing the six existing SVG path IDs through same-origin SVG use references, with no duplicate geometry or runtime library. Body parts arrive first, followed by the three dots; CSS transform/opacity cycle repeats every eight seconds with a long fully visible interval, then collapses around a shared center and returns. Fixed wrapper dimensions prevent navigation layout movement. Reduced-motion preference removes animation and shows the full mark. Footer/favicon remain static.

Typecheck and four localized responsive cases PASS (320/390/768/1440). Browser animation inspection PASS at entrance, assembled hold, end-of-cycle collapse and second-cycle assembly; wrapper position/width stable. Reduced-motion shows all six parts opaque without animation. Desktop and 320px screenshots reviewed. An initial inspection sampled just after the next cycle had already begun; corrected the sampling time and confirmed all phases. Graphify AST update and whitespace diff review PASS; full build not repeated for this isolated presentation change. Same WEB02 continuation, sole /root scoped review PASS, claim released; unrelated changes preserved and no commit/push/deploy or next batch.

### Approved landing follow-up commit — 2026-10-27

Owner accepted all current changes and explicitly requested their local commit on the same branch. This overrides earlier no-commit instructions for the approved WEB02 follow-ups; push/publication remain outside the request. Sole /root combined review PASS, claim released. Reviewed tracked changes and each untracked file: Arabic dictionary/routing/RTL/metadata, compact accessible dropdown and native-dialog portal fix, existing localized copy and footer contact edit, portrait variant/fade, mobile nav/dot pulse, chosen transparent logo/vector conversion, favicon assets, reduced-motion-aware navbar logo assembly, documentation and browser regressions. Preserve the existing apps/app Radix dropdown dependency addition and its lockfile entries as part of the owner's accepted current state; app runtime source is unchanged. No backend, API, SMS, protected slider data or justforcheck change.

Final verification rerun against the exact implementation before staging: web typecheck PASS; all 29 unit tests across seven files PASS; optimized web build PASS; all 10 Playwright scenarios PASS, including 16 locale/viewport combinations, four-language OTP continuity, native-dialog portal regressions, Arabic cookie/fallback/numeric input and automatic success. Previous motion, image-alpha and asset-route checks retained; Graphify AST current. git diff --check PASS. Commit message: feat(F12-FE01-WEB02): refine four-language landing and animated branding. No blocker or next batch; broader F12-FE01 remains REWORK.

### Footer eNAMAD seal — 2026-10-27

Owner provided issuer seal id 750189 / Code 1S4CAYPwv3TxOdNZrWHL0UxywYOkTiSO and requested desktop placement below the doctor introduction, suitable mobile placement and a local fallback. Same WEB02 continuation, sole /root scoped review PASS, claim released. Footer CSS grid puts the seal below introduction on desktop and beside contact details below full-width navigation on mobile. EnamadSeal keeps a fixed-size neutral local image visible during live loading and on network/image failure; live success replaces it without layout movement. Undersized placeholder images retain fallback. Exact issuer target, origin referrer policy and supplied code preserved; new-tab link uses noopener (not noreferrer) so the requested origin policy remains effective. Accessible label/action translated in all four dictionaries.

Issuer profile/badge could not be fetched by web reader; direct badge request returned HTTP403 in this environment. Issuer homepage was accessible and its available graphics carried five-star ratings, so they were not used as generic fallback. Downloaded an unmodified neutral 1024px transparent mark without rating stars from the public logo archive; source recorded in public/brand/README.md. No issuer verification status claimed or fabricated. The live verification link remains the source for current status. No image generation or logo alteration performed.

Verification: web typecheck/build and 29 unit tests PASS. Eight targeted browser cases PASS: all four locale layouts at 320/390/768/1440 plus controlled pending/success/failure seal scenarios on390/1440, correct verification link/referrer/target, visible fallback, live handover and exactly stable seal geometry, desktop/mobile placement. Reviewed footer screenshots in Chinese464, Persian390, English1440 and Arabic320. Chinese font subset regenerated for new translated labels and cmap coverage PASS; original English font restored unchanged after regeneration. Graphify AST and git diff --check PASS. Changes remain uncommitted; no push/deploy, app/backend/auth mutation or next batch.

Owner visual correction: removed the surrounding seal panel border, background, padding and visible verification caption. Only the issuer image (or local fallback when unavailable) is shown; accessible link label and exact verification target remain. Four existing pending/success/failure mobile/desktop regressions rerun and PASS; browser computed styles confirm zero border, transparent background and no caption text. Persian464 footer screenshot reviewed. No commit/push; this supersedes the initial panel treatment above.

### Hero word-by-word quote loop — 2026-10-27

Owner requested repeated word-by-word writing and erasing of the doctor quote, with room for additional quotes later. Added WordLoopQuote with a translated phrase-array input (currently only the existing approved quote), locale-aware Intl.Segmenter word grouping including Chinese, preserved punctuation/spacing, 300ms word reveal, 3.2s full-text hold, 130ms reverse erase and 500ms restart gap. Opacity/translation transitions smooth each word; hidden full-phrase measurement reserves card size for every configured phrase. Stable full text is exposed to screen readers while animated copies are aria-hidden. Reduced-motion preference shows the complete first quote with no timer, supports live preference changes, and timers/listeners clean up on unmount/locale change. Navbar and mobile doctor introduction remain unchanged.

Typecheck, optimized production build and four browser motion regressions PASS, one per locale at 810px: first word, full phrase, reverse erase, second cycle, identical card geometry and static reduced-motion output. Four existing responsive/browser scenarios also PASS at 320/390/768/1440. Quote snapshots reviewed in fa/en/zh-CN/ar. Initial ad-hoc timer sampling raced hydration/real clock; final deterministic tests pause the browser clock and restart from reduced-motion, all PASS. Graphify AST and diff whitespace review PASS. Same WEB02 continuation, sole /root scoped review PASS, claim released; existing uncommitted eNAMAD work preserved, no commit/push/deploy or next batch.

### Minimal branded page scrollbar — 2026-10-27

Owner requested a minimal browser/page scrollbar matching the existing identity. CSS-only viewport styling uses the current action blue thumb, pale ice track and rounded shape. WebKit/Blink use a 10px track with 2px thumb inset and no arrow buttons; standards-based thin/scrollbar-color provides the alternative engine path. Styling is limited to html, leaving the sign-in panel's hidden track unchanged. Forced-colors mode retains browser defaults. No scroll interception, JavaScript or dependency added.

Browser checks PASS for computed brand colors/dimensions, real wheel scrolling, native-dialog body scroll lock and automatic forced-colors fallback. Captured visible native scrollbar with Chromium's screenshot hide-scrollbars argument disabled; viewport1440/client1430 confirms 10px gutter, screenshot reviewed. Four localized responsive cases PASS at 320/390/768/1440. Graphify AST and diff review PASS. Build/unit gates not repeated for this CSS-only change; existing uncommitted quote/eNAMAD work preserved. Same WEB02 continuation, sole /root scoped review PASS, claim released; no commit/push/deploy or next batch.

### Approved footer and motion commit — 2026-10-27

Owner accepted the current changes and explicitly requested their local commit. Main-agent review PASS for this WEB02 follow-up, sole /root on codex/landing-content-structure, claim released. Scope: unframed footer eNAMAD image with fixed-size local fallback and exact live verification URL, four-language accessible labels and updated Chinese subset, word-by-word translated quote loop with stable geometry/reduced-motion support, branded minimal scrollbar, existing Persian address province refinement, asset provenance, docs and regression scenarios. All tracked and untracked paths reviewed; no apps/app/backend/generated client or protected file changes.

Final checks rerun before staging: web typecheck PASS; optimized production build PASS; 29 unit tests in seven files PASS; all18 Playwright scenarios PASS, including four languages/four responsive widths, authentication continuity and native-dialog language menus, Arabic persistence, seal loading/failure, four quote-loop motion cases and reduced motion. Existing scrollbar/forced-colors visual checks retained; Graphify current and whitespace diff review PASS. Commit message: feat(F12-FE01-WEB02): add trust seal and landing interactions. No unresolved blocker, push, deployment or next batch; broader F12-FE01 remains REWORK.

### Couples heart pulse and ripples — 2026-10-27

Owner requested a rich red central couples icon, heartbeat, halo and waves. Wrapped only the couples illustration's existing HeartHandshake in a fixed49px decorative span, increased stroke1.1 to1.5 and used local rose #d94668. CSS creates a restrained2.8s double heartbeat with a radial aura and two delayed expanding/fading rings. Existing blue orbits, caption and surrounding content remain unchanged. Animations use transform/opacity; wrapper geometry stays fixed. Reduced-motion disables movement and ripple rings while retaining a soft static aura. No dependency or auth/backend change.

Typecheck and four localized responsive browser cases PASS at320/390/768/1440. Targeted browser inspection PASS for rose color, four animation tracks (icon, aura, two waves), unchanged wrapper bounds and reduced-motion static fallback. Mobile535/desktop1440 illustration snapshots reviewed. Graphify update and diff review recorded at final handoff. Same WEB02 continuation, sole /root scoped review PASS, claim released; no new commit/push or PR update, no next batch.

### PR35 dashboard CI repair — 2026-10-27

Owner requested repair of PR35 targeting dev on codex/landing-content-structure. Diagnostics at aadde9596ded722158566b266cf6a2d4f9c040d3 showed CI verify failing on five react-hooks/refs render accesses in prescriptions-page, and dashboard artifact build failing on an unknown-to-ReactNode union in visit-treatment. The PR was mergeable; web/app/API artifact and security checks passed. The subsequent missing-dashboard-image scan error was a consequence of the failed build.

The prescription editor now stores successful patient-data readiness in React state for rendering while retaining the effect-only initialization ref. Both initial load and successful reload update readiness; failure still prevents editing until a successful fetch. Treatment instructions project session patientInstructions into the same typed instructions shape as nutrition/exercise before rendering, preserving patient-facing content without a cast. Full dashboard tests exposed an existing API mock missing apiBaseUrl/sessionFetch after createPrescription moved onto clinicalRequest; the fixture now supplies both and normalizes fetch inputs so URL/method/header/body assertions cover both transport paths.

Verification: dashboard lint PASS (zero errors, eight existing warnings); typecheck PASS; production build PASS (33 routes); all167 unit tests across40 files PASS; Graphify AST update PASS with existing optional parser warnings; whitespace and combined diff review PASS. No backend/API/SDK/schema/dependency/landing or protected-file changes. Main-agent scoped review PASS, claim released. Commit/push is owner-authorized for this repair; remote CI must run on the resulting commit. Broad F12-FE01 remains REWORK, no other task started or PR merged/deployed.
### PR35 API contract continuation — 2026-10-27

Remote verification of35fe034 passed all four production artifacts, release-contract, security, repository lint and types. The full API suite then exposed two inherited failures: generated/runtime OpenAPI mismatch and prescription access test expecting the old response without patientDisplayName (539 other tests passed). Same owner-authorized PR repair, sole /root. Expanded write-set only to visit-care/patient-prescriptions/admin-treatment-plans Swagger metadata, prescription integration fixture, generated OpenAPI/SDK and evidence.

Page is now explicitly numeric with the same existing bounds/default, patient cursor remains a typed UUID string, and draft planId retains UUID documentation. Exported OpenAPI from the real application and regenerated SDK rather than patching generated files manually. Reviewed semantic differences: no endpoint, permission, body or response removal; existing runtime empty summaries/order now reflected and page validation metadata accurately documented. The integration expectation includes the nullable name returned by the existing service; forbidden-before-grant and forbidden-resource checks remain exact.

Local verification: nine runtime OpenAPI contract tests PASS; API source/test TypeScript PASS; SDK generation parity/build PASS; dashboard TypeScript PASS; whitespace/semantic diff review PASS. No local PostgreSQL service/container engine available, so prescription integration is pending the next CI run; prior CI proved its sole failing assertion was the added nullable response field. Graphify update requested after final edits. No database/runtime permission/business logic or landing change. This verification commit enables remote integration checks and is not a claim that the broad F12-FE01 task is DONE. No merge/deploy or next batch.

## Long assessment question text — 2026-10-27

Task ID: F12-FE01-MZ02
Completed at: 2026-10-27 (client date)
Agent/Thread: Codex /root
Batch ID: CLIENT-INTEGRATION (existing coordinator continuation)
Reviewed by: Codex /root, scoped main-agent review PASS
Status: DONE (software)

Problem: schema2/3 question titles were capped at1000 characters in domain validation and dashboard controls; follow-up client validation used the same cap. Every server structure error maps to the same generic Persian message mentioning six tie cases, so long text could be misreported as incomplete tie-break content. A separate128KiB structure cap could still reject a questionnaire after only lifting individual field limits.

Changed files:
- apps/api/src/modules/assessments/domain/assessment-dimension-draft.ts
- apps/api/src/modules/assessments/domain/assessment-tiebreak-draft.ts
- apps/api/test/assessment-tiebreak-draft.spec.ts
- apps/dashboard/src/features/assessments/assessment-authoring.ts
- apps/dashboard/src/features/assessments/assessment-builder.tsx
- apps/dashboard/src/features/assessments/mizaj-authoring.ts
- apps/dashboard/src/features/assessments/mizaj-authoring.spec.ts
- apps/dashboard/src/features/assessments/mizaj-builder.tsx
- plan/STATUS.md
- plan/phases/12-PRODUCTION-HARDENING.md
- plan/logs/phase-12.md

Migrations: none; existing JSON storage and object API schemas unchanged; no generated client change needed.

Verification:
- API: pnpm exec vitest run test/assessment-tiebreak-draft.spec.ts test/assessment-dimension-draft.spec.ts --no-file-parallelism → PASS,54 tests.
- Dashboard: pnpm exec vitest run src/features/assessments/mizaj-authoring.spec.ts src/features/assessments/assessment-authoring.spec.ts → PASS,11 tests.
- API: pnpm exec tsc --noEmit → PASS; pnpm exec tsc -p tsconfig.test.json --noEmit → PASS.
- Dashboard: pnpm exec tsc --noEmit → PASS.
- Installed Fastify initialConfig.bodyLimit →1048576 bytes; new aggregate domain cap786432 bytes leaves envelope headroom.
- graphify update . → PASS,11794 nodes; existing SQL/Erlang/HCL extractor dependencies and unrelated chat parsing warning retained. Outputs are ignored by current Git configuration.
- Scoped combined diff/main review and git diff --check → PASS.

Result:
- Main/follow-up question text supports20000 UTF-16 code units in both server and dashboard; same capacity for legacy dimension draft editor.
- Full11-question Persian content plus all6 long pair-case questions passes publication validation above the old128KiB budget; patient projection preserves full question text and selected question12.
-20001-character main/follow-up questions and aggregate content above768KiB remain rejected. Frontend reports the individual20000-character limit before sending oversized field values.
- Scoring, answer memberships, option limits, six-case publication requirements, historical versions and user data unchanged.
- Pre-existing apps/web/src/messages/fa.json preserved and excluded from task staging.

Known limitations: bounded at20000 characters per question and768KiB total, not unlimited. Actual browser/database save and deployed owner acceptance not run; focused validators/projection/types verified. No real assessment write, migration, publication, push or deployment.
Next task: owner local acceptance with a long question; no next batch started; broader F12-FE01 remains REWORK.

## Assessment pasted text whitespace — 2026-10-27

Task ID: F12-FE01-MZ03
Completed at: 2026-10-27 (client date)
Agent/Thread: Codex /root
Batch ID: CLIENT-INTEGRATION (existing coordinator continuation)
Reviewed by: Codex /root, scoped main-agent review PASS
Status: DONE (software)
Depends on: F12-FE01-MZ02

Reproduction: exact owner sentence «آیا میزان علاقمندی شما به خوردن شیرینی بیشتر است یا ترشی؟» has57 UTF-16 code units and passes current validateTieBreakDraft. Append one space or newline (58 units) and it throws AssessmentStructureError, which the dashboard translates to the misleading general six-case message. This demonstrates an independent whitespace defect, not the field-length limit; the actual failed browser payload was not captured.

Changed files:
- apps/api/src/modules/assessments/domain/assessment-dimension-draft.ts
- apps/api/src/modules/assessments/domain/assessment-tiebreak-draft.ts
- apps/api/test/assessment-tiebreak-draft.spec.ts
- plan/STATUS.md
- plan/phases/12-PRODUCTION-HARDENING.md
- plan/logs/phase-12.md

Fix: display-text validators require nonblank trimmed content instead of requiring exact equality with trimmed content. Preserve exact supplied strings, hashes, internal newlines and immutable historical data. Keep character/aggregate bounds and blank rejection. Explicit identifier trim checks retain canonical IDs, including rejecting a final newline that JavaScript regular-expression dollar anchors otherwise permit.

Verification:
- New regression cases BEFORE fix:4 expected failures for surrounding space,LF,CRLF and tab; original sentence and blank-only rejection already pass.
- pnpm exec vitest run test/assessment-tiebreak-draft.spec.ts test/assessment-dimension-draft.spec.ts --no-file-parallelism AFTER fix → PASS,66 tests.
- Regression cases cover exact owner text in main/follow-up questions, pasted whitespace in options/result summary, preservation without mutation, blank-only rejection, main/follow-up identifier whitespace rejection, existing long-text and aggregate boundaries/scoring/publication/projection cases.
- pnpm exec tsc --noEmit → PASS.
- pnpm exec tsc -p tsconfig.test.json --noEmit → PASS.
- graphify update . → PASS; pre-existing unrelated extractor dependency/chat warnings retained, ignored outputs refreshed.
- Combined diff/main-agent review and git diff --check → PASS.

Migrations/API schema/client: none; no change to stored format, DTO structure, access, answer mapping or six-case publication requirement.
Known limitations: actual failed browser payload and database save not inspected; this exact-text-plus-whitespace failure is reproduced and fixed. No real assessment write/publication, persistent data changes, push or deployment. Pre-existing apps/web/src/messages/fa.json preserved/excluded.
Next task: owner retry in an environment running the updated API; no new batch. Broad F12-FE01 remains REWORK.


## Secondary elimination and response composition chart — 2026-10-30

Task F12-FE01-MZ04 / CLIENT-INTEGRATION, sole /root, REWORK pending final acceptance gates. Owner approved implementation of the chat plan. Baseline had only apps/web/src/messages/fa.json modified; preserved unchanged by this task. No migration or production/account/assessment writes.

Implemented schema3/scoring2 opt-in paths with 2-option shrinking candidate sets, terminal direct outcomes and bounded ordered steps; previous v1 behavior retained. Server validates path-only partial/full answers and projects visited/current questions without scoring mappings. Engine identity and recommendation provenance use the actual source version. Dashboard authoring can create/delete-by-replacement paths, choose tested candidates, edit authored questions/options and simulate authoritative sequential evaluation. Patient wizard supports dynamic follow-ups, resume and dependent-answer clearing. Question presentation uses Persian alphabet badges. Both result surfaces show real main-score percentages with exact100% largest-remainder rounding, zero-value legends and no-evidence handling. OpenAPI and generated client updated. Next dev regenerated the dashboard AGENTS heading (# to ##); no manual instruction change.

Verification PASS: API domain69 tests including new early-stop/second-question/preserved-primary/no-score-change/off-path/duplicate/incomplete/4-candidate-structure cases; dashboard authoring5 tests; app percentage2 tests; API source/test TypeScript, dashboard/app TypeScript; actual offline OpenAPI export and client generation/build; intercepted real Chromium dashboard preview chain and chart at390/1440 with production domain evaluation, no page errors; mobile screenshot visually inspected. Browser regression retained at apps/dashboard/e2e/mizaj-sequential.browser.mjs (requires built API and dashboard dev server). Graphify AST refresh completed with pre-existing Erlang/HCL/chat-extractor warnings; final refresh follows final source edits. Diff whitespace check passed.

Unverified gates: local PostgreSQL connection unavailable; Docker Linux engine pipe absent. Added real-PostgreSQL HTTP regression source to assessment-dimension-draft.integration.spec.ts but did not claim it executed. Full patient-browser save/resume/back/revision/idempotency and320px/keyboard coverage remain required. No DONE checkbox, final task commit, push/deploy or next batch. Safe next action: bring up disposable local PostgreSQL, run guarded assessment HTTP/patient publication integration suites including the new v2 case; exercise patient dynamic path with intercepted browser save/resume/back scenarios, complete final review/types/graph/diff, then task-only commit. Four-candidate secondary runtime is unreachable with four total dimensions plus a distinct primary; retain structural support without manufacturing such patient evidence.


MZ04 patient-browser follow-up: PASS real Chromium at320/390/1440 with intercepted transport backed by the compiled production domain evaluator/projection/answer validator. Exercised main-answer resume to pending root, null branch to question2, reload resume at question2, back to question1, direct-answer early completion, revision checks, one final idempotency-key-bearing submit, primary preservation, clearing downstream answer and chart/no-page-overflow/no-page-errors. Patient wizard now resumes all attempts at the first unanswered visible question. Mobile320 result screenshot visually reviewed. Regression: apps/app/e2e/mizaj-sequential.browser.mjs. Supersedes the pending patient-browser save/resume/back item above; PostgreSQL remains the final unavailable gate. Final types/diff/graph refresh follows. Local dev servers are verification helpers only; no deployment or task commit.

MZ04 final local checks: API source/test, dashboard/app types and diff check PASS; app chart plus existing assessment API tests6 PASS, giving80 targeted unit tests overall (69 API +5 dashboard +6 app). App and dashboard AGENTS headings were both regenerated by Next dev. Five intercepted browser viewport scenarios PASS. Final Graphify refresh completed/extraction warnings retained; only disposable PostgreSQL integration remains unverified. Task remains REWORK and uncommitted per commit gate.


## MZ04 PostgreSQL acceptance — 2026-10-30

Owner restored Docker and explicitly requested database verification only, NO COMMIT and no unnecessary tests. Same CLIENT-INTEGRATION / F12-FE01-MZ04 sole /root. Baseline existing changes preserved. Started one --rm postgres:16-alpine container named mushroom-mz04-verify on loopback55419 with disposable patient_journey_test; existing sabz-zendegi-postgres-1 on5432 was not modified. Applied existing migrations and synthetic seed only to this temporary database.

PASS three targeted actual HTTP/PostgreSQL tests across assessment-dimension-draft.integration.spec.ts and assessment-protocol.integration.spec.ts (28 unrelated cases deliberately excluded using name filter): (1) saved version2 draft and authoritative preview with next-question and off-path checks; (2) new patient integration for both direct first-answer completion and two-step elimination, actual persisted answer resume, private questionnaire projection, refusal of premature/off-path completion, immutable stored result readback, primary/main-score preservation and idempotent same-command replay; (3) existing11+1 ADMIN publication/patient progression compatibility. No mocked database or mocked API services. Source/test TypeScript and diff review PASS. No runtime implementation correction required. The new patient integration test is retained as regression coverage.

Verification container stopped and auto-removed after tests; original5432 container remains running. Final Graphify refresh follows added test. Scoped task DONE/software main review PASS; claim RELEASED, broader F12-FE01 remains REWORK. No stage/commit/push/deploy, per explicit owner instruction. No remaining MZ04 software blocker; no next batch started.


## ADMIN offering simplification — storage foundation — 2026-10-30
Task ID: F12-FE01-MZ05
Batch ID: CLIENT-INTEGRATION
Agent/Thread: Codex /root (sole writer)
Status: IN_PROGRESS; full owner plan NOT complete.
Changed files in this lane: Prisma schema (offering scope/relation/index metadata), migration20261030120000, assessment-scoped-policies-upgrade.mjs, ADR0044, assessment-admin-offering-v2 contract and append-only governance evidence. All pre-existing MZ04/app/dashboard/generated-client/fa changes retained.
Implementation: optional offering-owned consent policies, independent active policy per offering/purpose/locale, unchanged legacy unique-active rule; FK, same-clinic/locale, bounded assessment purposes and immutable scope. No historic data backfilled/retired. This is storage only, not a working ADMIN publication/purchase flow.
Verification: disposable postgres:16-alpine mushroom-mz05-proof on127.0.0.1:55429/mz05_proof only. Upgrade script replays all87 migrations, seeds legacy consent before new migration, proves exact preservation; two independent offering policies coexist with legacy active policy. Duplicate-active, cross-locale, non-assessment purpose, scope rebinding and legacy duplicate are rejected. PASS. Initial fixture lowercase offering identity fixed without changing production constraints. Prisma generate and API source tsc --noEmit PASS. git diff --check PASS. Graphify refresh requested.
Safe next action: implement atomic ADMIN publication service/controller and inline-text DTO, explicit ADMIN provenance/nullable legacy review and purchase/access SQL migration; resolve scoped policies explicitly (never generic clinic-wide lookup). Then free/paid individual/couple lifecycle, comparisons, frontend/API contract generation and complete integration/browser gates. Current API runtime still requires legacy reviews; do not advertise/remove its gates prematurely. New scoped policies must not be activated by the UI until scoped readers are connected. Existing generic policy CLI/readers must filter unscoped policies when that rollout starts.
Remaining: atomic publication, new provenance, free access, payment and access guards, both-participant consent/joint comparison, all UI changes, OpenAPI and patient/browser/financial/concurrency verification. No completed-task commit; retained no-commit instruction. No main DB/real patient/financial/remote writes or deployment.


## MZ05 inline authoring continuation — 2026-10-30
Status IN_PROGRESS; full owner plan remains incomplete. Same CLIENT-INTEGRATION sole /root, all baseline MZ04 changes preserved, NO COMMIT.
Implemented POST /v1/admin/assessment-offerings/inline-versions with ADMIN/ASSESSMENTS_MANAGE and active clinic scope. Accepts actual inline texts/title/kind/price and questionnaire ID, derives stable key/actual engine version, validates published structure, atomically saves immutable offering, exact text snapshot and offering-scoped processing/paid terms/couple disclosure documents with audited ownership. Uses retry key/hash and purpose version locks, never retires another offer's text. Additional authoring_texts migration preserves exact editable source, bound at256KiB. Source structure errors map to422. Generic legacy protocol resolution and policy CLI now exclude scoped documents unless an exact ID is supplied.
Dashboard normal offering form now uses this endpoint, inline editable defaults, conditional paid/disclosure fields, auto-generated command identity and in-flight guard. No manual offering/algorithm/policy references in this normal save form. It explicitly says save does not activate purchases and still requires published questionnaire. Removed old copy action pending actual inline text readback/edit implementation; source records preserved. Legacy commercial publication screens/guards still exist and must be replaced in the next lane.
Verification: new isolated Docker mushroom-mz05-inline, loopback55429/patient_journey_test only, applied all88 migrations. Full assessment-offerings.integration.spec.ts14 real HTTP/PostgreSQL tests PASS (including four inline save modes/exact owned docs/retry/idempotency conflict and all legacy regressions). API source/test types PASS; actual offline OpenAPI export/generated client build PASS; dashboard types and focused ESLint PASS (one unused saved-state warning subsequently resolved by rendering selected saved version). Existing null-JSON fixture spreads updated explicitly to Prisma.DbNull. No real payment, user acceptance, production policy or release performed. No browser acceptance yet.
Next: explicit ADMIN publication provenance and atomic questionnaire+offering publication; migrate legacy clinical review SQL/runtime boundaries; free/paid access; couples comparison; remove old publication references; inline edit/readback; precise field errors; schema3/v1-v2 full mode HTTP and browser/financial/concurrency/rollback acceptance. Do not mark this full task DONE or imply saved drafts are purchasable. API+schema migration deployment must be coordinated, not applied separately to live environments.


## MZ05 atomic questionnaire save and inline readback — 2026-10-30
Same CLIENT-INTEGRATION, sole /root; full task IN_PROGRESS, not DONE. Existing uncommitted MZ04 and fa changes retained, no commit/deploy.
Inline save now locks the exact source, accepts DRAFT/PUBLISHED and requires the expected saved hash for DRAFT. Valid draft publication, publication audit, immutable offering, all scoped documents and their audits share one transaction. Another published source for same key/locale is rejected. Replay returns the original offer before source/hash checks, avoiding retry breakage after successful publish. Failures roll back the original draft state. This is atomic questionnaire publication plus offering DRAFT creation, NOT commercial activation.
Offering response/OpenAPI now expose typed immutable authoringTexts. New-version action restored, initializing the inline form from saved title/kind/price/exact original texts; legacy offers without inline snapshots do not pretend to have source text. User-visible action distinguishes publishing saved questionnaire from activating purchases; no fabricated physician approval.
Verification: fresh disposable mushroom-mz05-atomic localhost55429, all88 migrations; full prior offering suite15 HTTP/PostgreSQL cases PASS, including new transactional rollback/stale-hash/concurrent exact retry/document readback. Additional2 parameterized HTTP cases PASS exercising every free/paid individual/couple save with real DIMENSION_TIEBREAK1/2 drafts and all six pair questions, correct derived version, stored text, published ADMIN actor and zero physician reviews. API source/test types and actual OpenAPI/SDK generation/build PASS. Dashboard types/lint follow final import correction. Main DB untouched; temporary container removed after testing. No whole-flow/browser/real payment/couple result acceptance claimed.
Remaining: explicit ADMIN commercial publication provenance and forward SQL guards; remove review dependency consistently from purchase/access/delivery; free access path; couples11+1 comparison/optional pair text with mutual disclosure; actual readiness and old manual commercial form replacement; final browser/finance/permissions/concurrency/upgrade gates. The action currently publishes the saved questionnaire, not unsaved builder edits; full single-action UI integration must handle dirty state and refresh its source publication state without discarding edits. No full-task completion claim.


## MZ05 explicit ADMIN publication evidence — 2026-10-30
Owner requests completion and NO STAGE/COMMIT. Same sole /root claim, full task remains IN_PROGRESS.
Implemented a retained AssessmentAdminPublication authority model and additive20261030122000 migration, deliberately separate from old physician-publication history. Each inline atomic transaction now creates an ADMIN publication recording exact questionnaire hash, purpose document hashes, live publisher/session and timestamp. SQL guards enforce actual active persisted ADMIN role, same-clinic membership/session identity, exact published source, owned active purpose documents and body hashes. Evidence cannot be rewritten/deleted; only final ACTIVE→RETIRED status change is supported. No professional review fabricated and no legacy financial/reviewer guard disabled.
Response/list/get/replay expose adminPublicationId/publicationAuthority; inline ADMIN rows no longer falsely request owner/clinical approvals. Remaining DIGITAL_ACCESS_INTEGRATION_REQUIRED explicitly reflects the unimplemented modern runtime. No assertion of purchasability. Dashboard saved-version panel labels real ADMIN publication; old schemas/readiness remain for legacy rows.
Verification: disposable mushroom-mz05-admin on127.0.0.1:55429/patient_journey_test, all89 migrations replayed. Full17 HTTP/PG offering tests PASS covering v1/v2 11+1/four modes, exact metadata, publication immutability/retention, existing atomic failure rollback/retry/readback and old offering behaviors. Initial5 tests failed because the old test helper only issued JWT roles but did not persist actual UserRole; fixed fixtures to persist roles, rather than weakening production SQL. Prisma generate/source types and OpenAPI/client generation/build PASS; source/test/dashboard type checks completed as recorded in session. Main DB untouched, temporary container removed. Graphify refresh requested. No real bank/payment/user consent/deployment and NO stage/commit.
Next required continuation: adapt modern ADMIN publication consumption end-to-end. Existing AssessmentPurchase and couple sessions reference physician-led AssessmentOfferingPublication; add explicit modern authority binding (exactly one modern/legacy source) and forward SQL guards, preserving verified billing evidence and exact participant consent. Then free access, app catalog/checkout/grant routing, couple consent+comparison, actual readiness, final browser/security/upgrade/finance/concurrency checks. Never insert an ADMIN publication ID into an existing legacy FK or mark ready by removing its guards. Full plan is not complete.


### MZ05 individual FREE and PAID ADMIN access — 2026-10-30 (in progress)

Same owner-authorized CLIENT-INTEGRATION /root claim; explicit NO STAGE/COMMIT remains. Added forward migrations20261030123000/124000/125000: existing grants explicitly distinguish FREE ADMIN authority from real paid purchase proof; immutable deduplicated free commands; purchases have exactly one retained legacy or ADMIN publication authority. Legacy physician evidence is not fabricated and all deferred financial proof checks remain.

FREE: exact scoped acceptance, active adult self ownership, serialized single entitlement, withdrawal invalidation and retained private history. No AssessmentPurchase, BillingIntent, journal or gateway attempt is created. Direct legacy start/list now excludes ADMIN-governed sources; a SQL start boundary prevents bypass, coordinated with publication. PAID: exact price/source/document acceptances feed the existing ASSESSMENT billing target, wallet debit and synthetic bank verification. ADMIN purchase/processing branches use persisted authority and scoped policies; old review guards remain on legacy records.

App: generated-contract educational catalog/detail, actual acceptance, free access or existing payment handoff, existing owned wizard/results. Dashboard: rejects publication of a stale saved source while questionnaire edits are unsaved, refreshes published source status without discarding offer text. Readiness is boolean and computed for implemented individual modes/documents; COUPLES remains blocked pending its explicit adapter.

Evidence so far: fresh91-migration database; additive92nd migration applied to populated disposable regression database;7 FREE HTTP/PG cases and17 offering cases passed before paid extension;8 actual ADMIN paid cases passed across algorithm versions1/2, wallet/gateway, failure and withdrawal compensation, with exactly-one access and real shared financial proof. Four intercepted app browser cases (FREE/PAID x390/1440) and two dashboard inline/dirty-source/status-refresh cases passed. API source/test and app/dashboard types passed before final receipt metadata addition; SDK generated and built. Broad final87-case legacy/modern regression and final types/contracts are running; do not count task DONE. Initial broad fixture failures were missing synthetic medical consent on fresh migrations-only DB; fixture now provisions it explicitly, without touching operational DB. All databases used are named disposable containers mushroom-mz05-free/mushroom-mz05-regression; main DB unchanged.

Outstanding: finish/review modern couples free/paid participation, independent sharing consent and two-result/chart delivery with optional pair text; remove legacy manual controls from normal workflow; price replacement and populated historical migration proof, final browser/privacy/concurrency/rollback/contract/type gates. Do not report whole plan complete, stage, commit, push or deploy.


## MZ05 purchase consent navigation and expired couple quote — 2026-10-30

Same CLIENT-INTEGRATION / F12-FE01-MZ05 sole /root claim; owner requested only these two fixes and lightweight verification. No stage/commit/deploy.
- Purchase projection now supplies managementHref for legacy, ADMIN individual and ADMIN educational couple authority; app consumes the generated contract instead of always linking to the legacy offering endpoint.
- Couple detail uses the PostgreSQL transaction clock to exclude expired pending quotes. In-flight gateway attempts remain visible and block duplicate payment while reconciliation is pending.
- Targeted real PostgreSQL couple-v2-PAID test PASS (1 run / 12 unrelated scenarios skipped): actual receipt management destination, current quote, simulated future DB clock with both participants seeing no expired continuation, wallet settlement and actual results. Time simulation does not mutate immutable financial history. Initial fixture attempt to modify expiry was correctly rejected by the immutable billing guard; fixture corrected without weakening the guard.
- OpenAPI export, generated SDK build and app typecheck PASS; API test typecheck verified. No broad suite rerun for these fixes. Prior interrupted full suite completed separately: 103/103 PASS before these two edits, not counted as post-fix verification.
- Broader MZ05 acceptance remains unchecked; this entry accepts only these two scoped repairs.


## MZ05 required-entry introduction and supported-source boundary — 2026-10-30

Same CLIENT-INTEGRATION / F12-FE01-MZ05, sole /root; owner requested editable mandatory assessment introduction and investigation/fix of the entry start failure. Scoped software repair accepted; broader task remains unchecked. No stage/commit/deploy or operational database changes.
- Add nullable <=20000-character introduction to entry policy; existing clients omitting it preserve stored text, blank clears to default. Status returns plain text for the selected source, with default for differently pinned historical attempts.
- Dashboard entry policy edits introduction; welcome displays multiline escaped text after demographics and before explicit Continue/start. Add explicit independent questionnaire publication action for initial entry, reusing existing source publication validation. Existing offering publication action remains available.
- Entry remains a single standalone free questionnaire for the existing new-account cohort. It does not support offered questionnaires, including ADMIN FREE offerings. Policy validation and database guard reject those upfront with a clear error rather than enrolling users in an unstartable path. Status availability now agrees with the direct-start boundary; already-bound attempts retain resume capability.
- Inline offering publication rejects sources currently selected as enabled entry assessments. Clinic locks serialize API publication versus policy configuration. No commercial consent/payment guard is bypassed, no implicit acceptance or access is manufactured, no financial/age/old-account rules are changed.
- Migration 20261030133000_entry_introduction applied successfully only to the named disposable legacy-proof DB on localhost55429; not main/VPS. Existing records retained, field nullable.
- Final targeted PostgreSQL + rules: 7 PASS / 11 unrelated skipped, covering introduction roundtrip/default/old-client omission, ADMIN-offered rejection at API/SQL, reverse publication conflict, concurrent start and pinned source. Initial standalone rerun exposed test ordering assumptions; fixture now explicitly configures its own entry policy.
- Browser interception: 390/1440 both PASS for custom introduction, text escaping, no automatic start, explicit click and unavailable recovery. Dashboard/app/API test typechecks, OpenAPI/SDK build and diff check PASS. Browser uses synthetic responses; no real-user writes or bank requests. No heavy whole-suite rerun.
- Remaining outside this repair: offered FREE/PAID/couples enrollment during mandatory entry would require a separate exact consent/access flow; it has deliberately not been enabled. Deploy must apply the new migration before updated API use.


## MZ05 entry/public distribution foundation — 2026-10-31

Status IN_PROGRESS/unchecked; sole /root, same CLIENT-INTEGRATION claim. Owner explicitly requests full new entry/public plan; this entry is a partial handoff, not acceptance of that plan.
- Forward migrations 20261031100000_assessment_distribution and 20261031101000_assessment_distribution_acquisition store mutable distribution separately from immutable questionnaire versions and guard new purchase/FREE acquisition. Default public visibility preserves existing records. Ownership-authorized audited admin read/update endpoints and dashboard switch connected; OpenAPI/SDK synchronized.
- Modern catalog/detail/new individual purchase/FREE claim and modern couple creation enforce public availability. Unoffered plain questionnaire list/start also enforce it; exact pending initial entry may start a hidden standalone source. Retained owned results/quotes are not silently rewritten or removed.
- Targeted actual PostgreSQL test PASS: hide source via API, omit from public questionnaire catalog, reject direct public start, allow exact required-entry start. Repeated after final acquisition trigger migration: 1 PASS /15 unrelated skipped. API source/test types, dashboard types, SDK build and diff check PASS. Both migrations applied only to named disposable proof DB at localhost55429, never main/VPS. No stage/commit/deploy.
- REMAINING: full entry-specific grant provenance and per-account one-time free entitlement; independent entry tariff/public publication selection and exact scoped consent; remove previous standalone-only entry restriction safely; paid entry reservation/Verify/resume; defer/return/reminder endpoints + Home/welcome UI; retake entitlement eligibility and latest-valid profile result; full hidden-source coverage of retained legacy couples catalog routes; targeted authorization/concurrency/rollback/browser and migration acceptance.
- Safe next step: extend the frozen entry/public contract and migrate explicit ENTRY versus PUBLIC acquisition origins before enabling hidden offered entry, so distribution guards gain a narrowly bound entry branch instead of being bypassed. Keep financial proofs, age, exact questionnaire binding and real consent. Finish only after required checks; no DONE or staged files.


## MZ05 explicit initial-entry origin without extra acceptance — 2026-10-31

Same owner-approved full plan, IN_PROGRESS/unchecked, sole /root. Owner now explicitly removes the additional assessment-entry consent step. No new checkbox, fake consent row, purchase or bank/wallet receipt is created for free entry.
- Add a nullable unique entry_patient_id provenance FK to submissions. SQL enforces own same-clinic exact pinned questionnaire, one origin per account and immutable provenance, separately from commercial grants.
- Required-entry start now pins source, starts/resumes the engine and binds the submission inside one transaction. It can use the exact questionnaire that also has a public PAID offering, with no copy of scoring and no commercial-consent bypass for public purchases.
- Replace standalone-only policy restriction and remove inline publication rejection of the selected entry source. Explicit entry origin is trusted server-only input, never patient DTO. Public hidden direct start requires actual server entry origin.
- Forward migration20261031102000_assessment_entry_origin applied only to named disposable proof DB at55429. API source types and dashboard types PASS. Three actual PG tests PASS: offered questionnaire entry without acceptance/financial records, concurrent single start and changed-policy pinned source. Broad regression not run.
- Whole plan STILL INCOMPLETE: independent entry price and verified billing target; paid deferral/resume and Home reminder; full hidden legacy couples coverage; paid retake/latest valid profile acceptance and all final contract/browser/payment gates. Public commercial consent remains its existing boundary; owner's no-extra-entry-acceptance rule is implemented without forged data. Do not claim completion or deploy. No stage/commit.


## MZ05 owner-final entry/public workflow acceptance — 2026-10-31

Task: F12-FE01-MZ05 — DONE/software, sole /root review PASS; scoped claim RELEASED. The owner's final2026-10-31 plan replaces the original public four-mode pricing matrix: FREE is initial-entry-only; all new public attempts are paid. Broader F12-FE01 remains REWORK. Owner explicitly forbids staging/committing and live deployment; no next batch started.

Implemented behavior:
- One configurable initial questionnaire; per-version public distribution independent of requirement and price. Hidden sources cannot create new public attempts/purchases even via direct links. Public catalogs require published paid offerings. Existing financial receipts, scoped text versions, clinical reviews, acceptance records and owned results are retained.
- Editable initial introduction, independent initial IRR fee (zero/free), optional paid deferral default false. Deferred users can enter Home, see their actual pending reminder and explicitly resume. Completed registration remains completed after selection changes; started source and fee stay pinned. Existing already-started legacy free entries remain free without rewriting rows.
- Explicit unique owned entry origin on submissions; no additional initial consent screen, no invented acceptance, no financial record for free entry. Source pin/start/audit/parent binding are atomic, retry-safe and rollback without orphan submissions. Existing private commercial/couple-sharing boundaries remain separate.
- Positive initial fee uses ENTRY_ASSESSMENT on shared billing,900-second invoices, actual wallet debit/PSP Verify and matching deferred SQL proof. Failed/wrong-amount verification cannot start a paid entry; late verified payment for an unavailable source is compensated exactly once. Pending/unused initial payments and public reservations share source guards. Actual successful payment is reused on resume rather than charged again.
- Public individual retake UI supports new purchases while preserving previous result access and pending invoice continuation. Each buy has a new operation/attempt/result. Completed educational couple contexts may start a fresh independent context; pending ones are reused under link locks, preserving both accounts' participation/privacy.
- Latest valid dimension result creates a real MezajResult regardless of arbitrary assessment key; ambiguous/insufficient results do not replace the last valid profile. Actual profile card reads the private current-result API without HTTP caching. Paid-entry raw answers are excluded from generic administrative patient/assessment views, matching existing paid-result privacy.

Migrations:
- 20261031100000_assessment_distribution
- 20261031101000_assessment_distribution_acquisition
- 20261031102000_assessment_entry_origin
- 20261031103000_initial_entry_payment
- 20261031104000_entry_adult_fallback
- 20261031105000_public_paid_only
- 20261031106000_educational_couple_retake
- 20261031107000_entry_public_pending_boundary
- 20261031108000_entry_unused_paid_boundary
- Total109 forward migrations PASS on fresh disposable database and upgraded disposable proof database on localhost55429. Main/VPS database unchanged. Earlier138-table original-history preservation proof remains recorded; current migrations add metadata/guards/indexes rather than rewriting clinical/financial history.

Final verification:
- API: vitest run test/patient-entry.integration.spec.ts test/patient-entry.rules.spec.ts test/assessment-educational-access.integration.spec.ts --no-file-parallelism --testTimeout 30000 ->33/33 PASS (ignored .local/mz05-final-delivery.log).
- Includes actual HTTP/PostgreSQL free entry on a paid-public source; paid initial wallet success and repeated-payment replay; forced versus optional deferral; pending/resume; source/price pinning; fake-paid SQL rejection; transaction audit rollback; initial/free then two real paid Mizaj retakes with latest profile; bank success/failure/wrong amount/compensation; hidden public rejection; no new public FREE grant; real v1/v2 couple charts, ownership, sharing withdrawal and fresh context retake.
- Browser interception,390/1440: inline paid no-ID publication2 PASS; admin initial price/introduction/deferral2 PASS; initial introduction2 PASS; paid-entry defer/Home/resume2 PASS; public retake2 PASS; latest Mizaj profile2 PASS; paid couple participation/result/privacy4 PASS. Total16 cases. No real bank/user/SMS/network writes.
- OpenAPI export + SDK generation/build PASS. API source/test, app and dashboard TypeScript PASS. Diff check and single-writer review PASS. Graphify AST refreshed; graph artifacts retain expected existing unrelated changes.
- Initial fixture/test-draft failures were corrected rather than weakening production guards: synthetic admin clinic membership, correct HTTP201 submission status, independent policy setup, valid mocked profile addresses/schema and one test helper assertion placement. Retired public-FREE positive tests were replaced by negative entry-only boundary tests, not silently skipped.

Delivery boundaries:
- No stage, commit, push, merge or deployment. The application requires the supplied migrations before the updated API runs against an operational database. Live PSP credential/provider acceptance is external; synthetic Verify exercised the actual shared settlement code.
- No implementation remains for the owner-final software plan. Existing general public historical acceptance and mutual couple-sharing controls are preserved; no extra acceptance is introduced for initial entry. No new batch or unrelated cleanup started; stop per owner instruction.

## MZ04 commit authorization — 2026-10-31

Owner now explicitly authorizes task-separated commits and push to dev, superseding prior no-commit instructions. MZ04 source, focused regressions, matching preview contracts and task evidence are staged independently. Prior recorded domain/unit, browser and PostgreSQL acceptance remains applicable; current API/app/dashboard types and app/dashboard builds pass. Unrelated website copy and generated AGENTS heading changes are excluded. No direct server operation.

## MZ05 dev publication gate — 2026-10-31

Owner explicitly authorizes independent task commits followed by push to dev, superseding historical no-stage/no-commit instructions. MZ04 is isolated in d49ce10; this task contains offering publication, scoped versioned texts, ADMIN provenance, paid public distribution, owned initial-entry origin/payment/deferral/resume, repeat purchases, latest-valid profile Mizaj and educational couple delivery, plus 23 additive migrations and matching clients/UI/regressions. Unrelated website Persian copy and auto-generated AGENTS headings remain unstaged.

Current verification: API source/test, app and dashboard types PASS; app/dashboard production builds PASS; OpenAPI SDK checked build PASS; release pipeline contracts PASS; fresh disposable database all109 migrations and synthetic seed PASS; 33 targeted PostgreSQL/rules cases PASS. Initial verification had four missing synthetic encryption-key failures and one5s timeout; supplying a process-local synthetic AES key and20s test timeout produced33/33 PASS with no application change. Detailed ignored logs: apps/api/.local/dev-readiness-postgres-final.log and .local/dev-readiness-{app-build,dashboard-build,release}.log. Earlier16 intercepted responsive browser cases remain recorded acceptance; no unnecessary broad-suite rerun.

Operational boundaries: no manual server/database operation performed. Dev rollout must back up its database, apply pending migrations before the new API and preserve existing seeded marker; rerunning development seed against edited physician schedules can still fail its exclusion constraint. Live bank-provider acceptance remains pending. Push to dev can activate the configured shared-dev CD workflow; remote execution/result is separate from local verification. Broader F12-FE01 remains REWORK, no next task started.

## F12-T02-I07 — Interactive installer panel

Task ID: F12-T02-I07
Completed at: 2026-11-01 01:55 +03:30
Agent/Thread: Codex /root (sole agent)
Batch ID: F12-B16
Depends on: F12-T02-I01…I06 DONE
Reviewed by: Codex /root; source/combined-diff and acceptance review PASS
Authority: direct owner request ("calling the tool should open a panel and everything is controlled from that terminal"); owner selected the plain ANSI menu over the current core instead of a curses TUI. ADR-0046.

Changed files:
- installation/manager.py — `panel`, `run_panel`, `render_panel`, `environment_state`, `choose_environment`, `typed_confirmation`, `panel_menu`, `panel_audit`, eleven thin action handlers, and extraction of `setup_chat`/`setup_storage` from `main`; `command` is now optional and defaults to `panel` when an installation exists, otherwise `install`.
- installation/test_installation.py — seven panel cases: non-TTY refusal, rendering without secret values, unique keys/storage hidden without dev, dispatch plus audit log, exact typed confirmation, canonical environment choice, EOF exit.
- installation/README.md — Persian panel section with the key-to-CLI mapping and safety rules.
- plan/decisions/ADR-0046-installer-interactive-panel.md; plan/phases/12-PRODUCTION-HARDENING.md; plan/STATUS.md; this log.
Migrations: none. Bundle allowlist, secrets, Compose, Caddy templates and application source: unchanged.

Implementation:
- The panel is a thin shell: every entry calls an existing operation (`compose_command`, `doctor`, `restart`, `setup_chat`, `configure`, `setup_storage`, `backup`, `github_handoff`, `configure_proxy`, `install`). No new operational logic, service, port or dependency (standard library only, no curses/whiptail).
- State display reads only markers: `runtime.env` boundary keys, `state/current`, `state/chat.initialized`, `bootstrap/first-run.json` and `PRODUCT_MEDIA_STORAGE_MODE`. Secret files are never opened for display.
- TTY-only: a non-interactive invocation raises with the exact CLI alternatives instead of half-rendering.
- Destructive entries (`restart`, `setup-chat`, proxy re-apply, full install) require the exact typed environment name or `install`; a wrong token changes nothing.
- Every selection is appended to `/etc/mushroom/panel.log` (mode `0600`) as timestamp/action/environment only; UUIDs, values and paths are deliberately excluded.
- Loop is testable via injected `reader`/`confirm`/`emit`; `render_panel` is pure.

Verification:
- `python -B -m unittest discover -s installation -p "test_*.py"` → PASS, 53 cases: 45 passed, 8 pre-existing platform skips (real caddy/age/POSIX-container cases executed by the hosted `installation.yml` job).
- `python -B installation/manager.py --help` → PASS (optional command, `panel` listed, exit 0); `bash -n installation/install.sh` was not executed on this host (file unchanged, empty `git diff`; the hosted installer job runs it); `git diff --check` → PASS.
- Disposable render of `render_panel(panel_menu(config))` with prepared dev/staging/production fixtures → PASS; output showed only environments, markers, media mode and menu, no secret value.
- Existing CLI paths preserved: `setup-chat`/`setup-storage` messages and ordering unchanged; `install.sh` still passes `install` explicitly.

Known limitations:
- Hosted installer workflow has not yet run for this change; the 8 local skips are exactly the cases it covers.
- Panel navigation was verified with injected input/output, not a real VPS TTY; no live server, DNS, Docker or provider operation was performed.
- Redraw is print-based (no cursor addressing); the ADR records this trade-off and its revisit trigger.

Result: DONE (software), review gate PASS, claim released. `sudo mushroom` on an installed host now opens the panel; a fresh host still starts `install`. No commit/push/deploy performed by this task. Next eligible action: owner reviews the panel on the target VPS, then decides commit/push; no next batch started.

## F12-T02-I08 — Server-readiness hardening

Task ID: F12-T02-I08
Completed at: 2026-11-01 02:50 +03:30
Agent/Thread: Codex /root (sole agent)
Batch ID: F12-B16 (same coordinator; follow-up task)
Depends on: F12-T02-I07 DONE
Reviewed by: Codex /root; source/combined-diff and acceptance review PASS
Authority: direct owner request to finish the installer completely before deploying it on a real Ubuntu 24.04 server.

Changed files:
- installation/manager.py — new `wait_for_chat_schema` and `configure_docker_logging`; `install_packages` records whether it installed the engine; the chat probe loop now calls the bounded helper.
- installation/test_installation.py — three regressions for retry, bounded attempts and idempotent log configuration.
- installation/README.md — log-rotation behaviour on fresh versus pre-existing engines.
- plan/phases/12-PRODUCTION-HARDENING.md; plan/STATUS.md; this log.
Migrations: none. Bundle allowlist, secrets, Compose, Caddy and application source: unchanged.

Problems and fixes:
1. Chat preparation aborted on the first transient probe failure. `prepare_chat`'s 15-attempt loop called `run()`, which raises on any non-zero exit, so a not-yet-ready TCP/socket/psql attempt ended the whole step with `sh failed (exit N)` and no retry — exactly the slow-first-boot case on a real VPS. The probe now lives in `wait_for_chat_schema`: it catches `InstallationError` per attempt, keeps the 15×2s window, returns the table count, and raises the existing "Chat SQL schema not ready … Credentials retained" message only after the last attempt.
2. Container logs were unbounded (`json-file` defaults) on a 2–4 GiB host with a 10 GiB disk floor. When this installer installs Docker it now writes `/etc/docker/daemon.json` (`log-driver=json-file`, `max-size=10m`, `max-file=5`) and restarts Docker once, before any project container exists. An existing `daemon.json` is preserved with a notice, and a pre-existing engine is never restarted or reconfigured by the installer.

Verification:
- `python -B -m unittest discover -s installation -p "test_*.py"` → PASS, 56 cases: 48 passed, 8 pre-existing platform skips (real caddy/age/POSIX-container cases run in the hosted job).
- New regressions: two transient failures then a count returns `4` after 3 calls; permanent failure raises after exactly the configured attempts with `sleep` called attempts-1 times; log configuration writes the expected JSON and restarts once, preserves an operator file without restarting, and defers the restart when asked.
- `python -B installation/manager.py --help` and `git diff --check` → PASS.
- Existing `install_packages` tests still pass unchanged: they model an already-present engine, so no rotation write or restart occurs.

Known limitations:
- Log rotation applies to containers created after the write; containers that already exist keep their driver until recreated by the next deployment.
- Hosted installer workflow for this change and any real VPS run remain external; no server, DNS or Docker operation was performed here.

Result: DONE (software), review gate PASS. Both changes harden the same installer/panel surfaces without altering CLI semantics. Next eligible action: owner rebuilds the bundle (`python installation/build.py`) and runs the installer on the chosen Ubuntu 24.04 server; no next batch started.


## MZ06 marriage requests continuation — 2026-11-02

Owner-authorized continue; same sole /root, no stage/commit/deploy. Existing installer/ADR0046, AGENTS and fa.json changes preserved. ADR0047 and marriage-service-v1 contract added; no task checkbox accepted yet. Optional immutable offering-scoped marriage roles/age/gender/generic text, ordered pair validation, dashboard editor, generated contracts, new phone-encrypted requests, independent verified-phone session proof (only OTP issuer sets it), authenticated sender/recipient list/details/accept/cancel, legacy invitation materialization preserving SQL consent constraints, role-aware result/fallback and dynamic processing eligibility implemented. SMS-specific durable queue/worker/limits/provider pattern added, not yet accepted. App new/request/history routes, catalogue navigation, explicit SMS/copy controls and return-through-login/required-entry implemented. Old offer/invitation semantics retained.

PASS: app/dashboard/API source TypeScript and API test types; actual offline OpenAPI export/client generate/build;110 migrations from empty disposable postgres16 container mushroom-marriage-proof (localhost55419, patient_journey_test); meaningful HTTP/PostgreSQL future-recipient-account test (no phantom account; no verified-phone proof404; same-gender refusal; correction and concurrent acceptance replay; encrypted phone and two participants). Separate real HTTP/PostgreSQL full marriage service test PASS: fresh independent submissions, scoped real processing/sharing consent, one real wallet payment for two grants with replay, real save/submit for both, semantic FIRST/SECOND order opposite inviter order, generic fallback, privacy and sharing withdrawal. These two tests passed;17/7 unrelated cases deliberately filtered. Initial full-flow test exceeded default5s; removed unrelated synthetic-clock branch and set targeted30s timeout, then passed in8s. Main5432 DB untouched. No real SMS/provider or money outside disposable fixture.

Remaining, mandatory before DONE: finish invitation replacement and sender/recipient rejection-state UX; SMS queue/concurrency/quota/failure/restart tests with isolated provider transport; explicit deployment PUBLIC_APP_URL validation/runbook and separate pattern config verification; SQL request clinic/identity/delete guards and populated migration preservation/drift; versioned role/fallback validation regressions and legacy/OTP regression; mobile/desktop actual browser flows including pending return; final graph/diff/type checks and review. Do not claim live SMS delivery. Existing simple seed does not substitute for these gates. Latest API edit scopes link command keys by hash and preserves idempotent SMS queue replay; recheck affected tests. Container cleanup and final graph refresh follow. Task remains IN_PROGRESS/unchecked, scoped claim retained, no next batch.


MZ06 continuation follow-up2026-11-02: replacement endpoint and app route added (immutable predecessor/successor binding, same-command replay and old invitation invalidation); additive111th migration enforces request clinic/publication/link/assessment/replacement identity and retained history. Source lock now follows clinic-before-publication. OTP verified-phone marker is carried through production session creation, legacy password sessions receive none. App catalogue exposes marriage-specific paid services and links; ordinary legacy catalogue untouched. Explicit invitation SMS does not auto-send; code preserves replay and classifies pre-transport configuration failures FAILED versus post-contact uncertainty UNKNOWN.

Rebuilt API/export/SDK PASS. Final app/dashboard source types and API test types PASS; marriage publication-boundary3 tests PASS. Recreated disposable postgres16 from empty and applied all111 migrations; reran both focused HTTP/PG tests together, PASS (24 unrelated cases filtered). Phone test now additionally verifies atomic replacement and retry, old status REPLACED, account created only by intended person, verified phone mismatch, role failure/correction and concurrent acceptance. Full real wallet/two-submission/role-fallback/sharing-withdrawal test PASS again. No simulated clock in the new payment case. No new DONE checkbox: durable SMS/provider/quota/restart/OTP regression, full browser/gender/profile remediation, populated upgrade/drift and final combined review remain unverified. No real SMS or commit/deploy. Test container stopped after checks; graph refresh follows. Scoped /root claim remains IN_PROGRESS.


## MZ06-C01 — Contract and user-flow review

Task F12-FE01-MZ06-C01 DONE;2026-11-02, sole /root documentation review PASS. Owner explicitly requests the flow and correct task-isolated commits, superseding previous no-commit instruction; no push/deploy authorized. Accepted artifacts: ADR0047, marriage-service-v1 and marriage-service-flow.md. Review checks: two adult semantic roles, per-service gender/age predicates, independent fresh attempts, verified-phone-only acceptance with and without an existing account, independent consent, one payment/two beneficiaries, ordered specific/fallback interpretation, cancellation/replacement, explicit SMS and provider-acceptance distinction, historical compatibility and privacy are consistent with the approved plan. Mermaid nodes/edges reviewed. No runtime tests needed for this documentation-only task.

C02–C05 code remains uncommitted and unchecked: existing PostgreSQL evidence is not a substitute for pending SMS, browser, populated-upgrade and final review gates. Installer/ADR0046/AGENTS/fa.json and unrelated governance hunks are excluded from the task commit. Shared plan files are staged from HEAD plus only this task's routing/evidence to preserve all unrelated worktree edits. No new implementation batch started. Next action remains completion of the active MZ06 implementation gates, not publishing or committing unfinished code.


## MZ06 SMS adapter and queue review — 2026-11-02

Same sole /root C04/C05 continuation, owner explicitly requests detailed review and one actual service-related SMS to their supplied test destination after checks. Destination and credential contents are omitted from governance. Installed farazsms1.1.0 official README, declaration and SDK implementation reviewed: sendSimple(text,recipients,line), local recipient format and default90008361. npm page returned403 and Context7 had no package; local pinned package was authoritative. No dependency upgrade.

Added TEXT_SEND through existing Faraz adapter, invitation-only mode/sender settings and optional existing pattern mode. Corrected SDK default transport's unchecked HTTP errors by preserving SDK helper serialization with abortable HTTP-status-aware request handling. Empty/malformed/unacknowledged replies and5xx/timeouts are UNKNOWN; no auto resend. Nested provider reference supported. OTP pattern endpoint/default line unchanged. Corrected raw environment timeout coercion found by the live read-only preflight. Fixed input-type trust boundary and validated invitation setting combinations.

Queue review fixed stale-lease bug (claim time, not enqueue age), pinned provider revision to prevent pending jobs following later configuration, terminal evidence immutability and recovery without retries. Added112th migration only on isolated proof database. Shared number quota locks use normalized current key fingerprint even for older encrypted requests. Disabled/cancelled and missing config never contact provider; pre-contact failure FAILED versus contacted uncertainty UNKNOWN. Global pending-queue fixture interference was found on repeat test execution; clean isolated replay and per-fixture terminal cleanup resolve it without relaxing assertions.

PASS:12 adapter/OTP security cases, using actual SDK helpers and actual loopback HTTP for payload, sender/recipient, OTP isolation, bad replies,403/503, abort/timeouts and no retries. PASS5 actual HTTP/PostgreSQL cases across3 files,24 unrelated cases deliberately excluded: future-account/replacement/concurrent acceptance; real wallet/two submissions/role-aware fallback/withdrawal; durable SMS concurrent enqueue/replay/cooldown/pinned revision; cancellation/crash recovery/old queue/fresh lease; lifetime and independent sender/recipient daily limits. All112 migrations replayed from empty disposable postgres16. API build and source/test types PASS. No mocked database, real payment-provider call or unsolicited SMS.

Live authorized test: main SMS configuration/credential read without logging secrets; real provider lines GET succeeded; accessible default SDK line90008361 selected. Exactly one raw SMS submitted through the updated adapter, provider reference26604507, recorded in existing sms_delivery_attempts as isTest and a minimized audit event. A local once-only journal prevents accidental replay; no raw real destination in tracked files. Owner reports not received. Provider read-only request/item reports: pending-approval/not-started, total_count1, sent_count0, delivered_count0, no rejection reason. Actual API acceptance is verified; delivery is not. No second send, new invitation/account or primary schema/provider configuration changes occurred. One diagnostic history record/audit is the only intentional primary database write.

Still pending: provider approval/carrier receipt for the single live test, browser/whole-feature/upgrade final gates. Do not mark MZ06 fully DONE or commit incomplete implementation. No push/deploy. Disposable container cleanup, final diff/type checks and Graphify refresh follow. Reference report retained only under ignored .local diagnostics with private content excluded from public output.

## MZ06-C02 — Accepted software

Task ID: F12-FE01-MZ06-C02
Date: 2026-11-02
Coordinator/reviewer: Codex /root, sole writer; same owner-authorized MZ06 serialized batch.
Status: DONE (software); scoped review PASS.

Immutable offering JSON now carries two adult semantic roles, editable genders/minimum ages and required generic interpretation; marriage pair identities stay ordered while historical offers retain symmetry. Existing dashboard offering editor handles creation/readback/copy-to-new-version. Runtime interpretation remains the dependent C05 integration boundary; this serialization avoids coupling the authoring commit to request storage. No separate engine or automatic conversion.

Verification: Three domain boundaries and the complete offering HTTP/PostgreSQL suite PASS within the 58-test final review; dashboard390/1440 real-browser authoring with intercepted HTTP verifies emitted roles, age21 and fallback. Dashboard types/build/scoped ESLint and generated-client checks PASS.

Commit boundary: only task-owned source/tests/generated artifacts and these acceptance records. Existing installer/ADR0046/AGENTS/fa.json remain outside the index. No primary migration, extra real SMS or manual deployment. Owner explicitly authorizes task commits and origin/dev push; live invitation pattern approval and actual carrier receipt are operational acceptance, deferred by owner.

## MZ06-C03 — Accepted software

Task ID: F12-FE01-MZ06-C03
Date: 2026-11-02
Coordinator/reviewer: Codex /root, sole writer; same owner-authorized MZ06 serialized batch.
Status: DONE (software); scoped review PASS.

Phone-only requests work before the recipient exists; encrypted/HMAC-bound identity, independent verified-phone sessions, self/foreign-account refusal, atomic acceptance/replacement/cancellation and retained clinic/publication bindings connect to existing couple participation. Requester name is visible only after recipient authentication; own gender/age refusal reason never exposes the other profile. Server rechecks eligibility for payment/access. App discovery/history, consent and login/entry return are connected. Shared request/initial queue storage belongs here; claim/provider pin storage follows only in C04.

Verification: HTTP/PostgreSQL existing/future-account, no phantom account, wrong phone, minor/gender refusal, corrected profile, concurrent acceptance/replay and replacement PASS. Actual production-built app plus disposable API/PostgreSQL browser create and second-account acceptance PASS. Intercepted390/1440 UI save/reload/replace/cancel/history and entry/login return PASS. OTP persistence and ownership-proof checks PASS; source/test/app types and app build PASS. Populated migration preserves143 old tables (17 populated); final schema drift zero.

Commit boundary: only task-owned source/tests/generated artifacts and these acceptance records. Existing installer/ADR0046/AGENTS/fa.json remain outside the index. No primary migration, extra real SMS or manual deployment. Owner explicitly authorizes task commits and origin/dev push; live invitation pattern approval and actual carrier receipt are operational acceptance, deferred by owner.

## MZ06-C04 — Accepted software

Task ID: F12-FE01-MZ06-C04
Date: 2026-11-02
Coordinator/reviewer: Codex /root, sole writer; same owner-authorized MZ06 serialized batch.
Status: DONE (software); scoped review PASS.

Existing Faraz adapter now supports explicit raw text or an independently configured invitation pattern, never changing OTP pattern. Durable pinned-revision queue, explicit send UI,60s/3/10/5 limits, claim leases and terminal uncertainty prevent hidden replay. Production/dev API receive PUBLIC_APP_URL. Approved invitation pattern takes variable link and may use a generic invitation text; no provider configuration was changed automatically.

Verification: Actual SDK/loopback12 transport+OTP cases and4 actual PostgreSQL/SDK queue cases PASS: concurrent replay, cooldown/quota, cancel/crash recovery, revision pin, late queue claim, independent PATTERN payload and retained OTP. Compose YAML/API-origin wiring PASS. One prior authorized raw test was accepted26604507 but pending-approval/not-started with zero delivery; user explicitly defers approved pattern and carrier acceptance. This task is software-complete, not live-delivery accepted.

Commit boundary: only task-owned source/tests/generated artifacts and these acceptance records. Existing installer/ADR0046/AGENTS/fa.json remain outside the index. No primary migration, extra real SMS or manual deployment. Owner explicitly authorizes task commits and origin/dev push; live invitation pattern approval and actual carrier receipt are operational acceptance, deferred by owner.

## MZ06-C05 — Accepted software

Task ID: F12-FE01-MZ06-C05
Date: 2026-11-02
Coordinator/reviewer: Codex /root, sole writer; same owner-authorized MZ06 serialized batch.
Status: DONE (software); scoped review PASS.

Final integration retains one payment/two fresh independent grants and assessments; roles order result text independently of inviter, specific ordered text falls back only for resolved results. Sharing withdrawal stops joint access. All software gates accepted; no deployed marriage service, live pattern or carrier delivery claim. C02/C03/C04 remain separate task commits with their own generated-contract snapshots.

Verification: 58 targeted tests across9 files PASS (full offering/educational access/OTP contracts, domain, session and SDK/queue suites; two added proof cases independently rerun).112 migrations from empty plus109-to112 populated upgrade PASS;143 retained tables,17 populated, unchanged and zero Prisma diff. Production app/dashboard builds, API source/test/consumer types, SDK drift/build, scoped dashboard ESLint, Compose parsing, Graphify and diff review PASS. Browser: real PostgreSQL/API create/second-person acceptance and real paid joint results with two readable charts390/1440 PASS; auth bootstrap alone supplies disposable sessions. Separate intercepted UI cases exercise explicit SMS, replacement/cancel, reload, self refusal, authoring and return through login/entry. Fixture-only errors in selectors/pagination/auth method were corrected; final browser runs passed.

Commit boundary: only task-owned source/tests/generated artifacts and these acceptance records. Existing installer/ADR0046/AGENTS/fa.json remain outside the index. No primary migration, extra real SMS or manual deployment. Owner explicitly authorizes task commits and origin/dev push; live invitation pattern approval and actual carrier receipt are operational acceptance, deferred by owner.

## F12-FE01-MZ07 — Service-first couples navigation

2026-11-02; sole /root coordinator and reviewer; DONE/software after scoped review. Owner authorizes implementation, targeted verification, commit and push to dev.

Main couples entry now introduces the service-first telephone invitation flow, clear two-person price/consent sequence and an actionable empty catalogue; legacy account-ID/code forms remain under /assessment/couples/legacy with existing publication links routed there. Existing sessions/results are untouched. Dashboard defaults new couple offerings (including copied legacy seeds) to marriage conditions, requires valid adult roles/fallback before publishing and labels specific interpretations with semantic role titles. Published versions are unchanged.

Catalogue filters MARRIAGE on the server before counting/pagination. Independent authenticated recipient-only review command records generic eligibility status without accepting consents or linking accounts; app invokes it on pending recipient entry. Personal refusal reasons remain private. Profile correction preserves the invitation return. No migration, live invitation, SMS or payment.

Verification: one expanded actual HTTP/PostgreSQL phone-request integration PASS (17 unrelated cases deliberately filtered), with server-filtered catalogue, review before consent, sender refusal and generic/private projections;112 migrations replayed only on disposable localhost55419. API source/test, app/dashboard types, generated SDK build/drift and scoped dashboard ESLint PASS. Graphify/diff review PASS. No browser interaction test claimed for this patch; prior tests of the old entry did not cover this routing gap. Existing unrelated installer/ADR0046/AGENTS/fa.json and their plan hunks excluded. Next: owner reviews deployed new couples entry and configures approved invitation pattern separately.

## F12-FE01-MZ08 — Publication form validation

2026-11-02; sole /root coordinator/reviewer, owner-approved plan; DONE/software, review PASS.

Changed dashboard MarriageSettings, InlineOfferingForm, optional TextField error metadata, assessment save/configure focus, plus offering-validation helper and tests. New UI-only MarriageDraft uses number|null ages; NaN becomes null, renders empty, never defaults to0/18. Shared validation drives issue summary, inline accessible field errors, disabled publication and submit guard; numeric payload conversion rejects incomplete roles. Individual offerings ignore marriage fields. Title/price/required texts/role constraints/pair texts and unsaved questionnaire all yield explicit reasons. Save label clarifies questionnaire-only persistence; focus/scroll waits for dynamically loaded offering heading. Existing same-version component identity preserves entered offering state.

Checks:12 targeted Vitest cases PASS (clear/re-enter, invalid/fractional/out-of-range age, required fields, max price, pair text, individual compatibility, actual React field render without console errors and actual form button enabled/disabled); dashboard TypeScript and scoped ESLint PASS. Graphify and staged diff review PASS. Same-version preservation and deferred focus reviewed in source; no live browser publication or full-suite run claimed. No API/schema/migration/DB changes. Unrelated installer/ADR0046/AGENTS/fa.json and existing governance hunks excluded. One task commit and origin/dev push authorized; next action: owner checks deployed dashboard form.

## F12-FE01-MZ09 — Invitation refresh loop — 2026-11-03

Task: F12-FE01-MZ09; sole coordinator/reviewer Codex /root; single-task batch review PASS, claim RELEASED.

Implementation: one single-flight loader per user/request, initial recipient review only once; explicit retry permits re-review; quiet refresh retains prior private data while surfacing recoverable errors. Pending-only visible/online polling every30s, paused during commands, stopped at terminal state. GET/review cooldown honors Retry-After with60s minimum on429 and30s network cooldown. Commands wait for in-flight reads; successful mutation clears read cooldown before refreshing its outcome. No backend limit raised, no DB/API contract/migration.

Changed paths: marriage-service.tsx, use-patient-resource.ts, patient-request.ts, marriage-request-loader.ts and its spec, e2e/marriage-request-polling.browser.js.

Verification:
- app Vitest marriage-request-loader.spec.ts:10 PASS (deduplication, one review, initiator/terminal exclusions, numeric/date Retry-After, cooldown, explicit review retry, mutation recovery).
- app tsc --noEmit:PASS; changed source/spec ESLint using existing dashboard toolchain from app cwd:PASS.
- Playwright CLI against local Next3017 with intercepted APIs and controlled time:PASS; checkbox retained through polling and429, no review loop, bounded reads, cooldown honored, acceptance displayed, terminal polling stopped. Test exposed mutation/read cooldown interaction, fixed and browser rerun PASS. No live recipient action/SMS/payment or PostgreSQL exercise in this frontend-only task.
- Expected deliberate429 browser resource error and development unused-font warning observed; no pageerror. This is scoped functional proof, not a complete UX-audit verdict.
- Graphify AST refresh completed (existing missing SQL/Erlang/HCL parsers and template warnings); no full test suite run.

Next: MZ10 invitation-scoped entry and server access boundary; then MZ11 responsive journey. Neither task implemented in this commit. Unrelated installer/AGENTS/web changes preserved.

## F12-FE01-MZ10 — Invitation-scoped entry

Completed: 2026-11-03. Sole coordinator/reviewer Codex /root. Depends MZ09. Single-task batch review PASS, claim RELEASED. ADR-0048 records the owner-approved entry exception.

Implementation:
- Existing PatientEntryGuard admits only verified invited recipients and exact sources related to this request; optional X-Marriage-Request-Id is only a locator. Incomplete names/gender/birth date block acceptance and downstream actions. Existing endpoint authority, eligibility, version, consent, financial and submission checks remain.
- Pending read/review/accept; accepted own participation, versioned consent, own grant/submission/result/guidance/provenance, own related purchase/payment are explicitly matched. Unrelated APIs remain gated; no independent top-up path in invited payment.
- After acceptance the recipient patient ID governs request ownership/listing. Later number holders cannot read/list previous invitations; original recipient ownership survives a phone change with new verification.
- MarriageRequestDto adds continuation.profileRequired/nextPath. Global optional-header OpenAPI and generated SDK refreshed; normalized comparison found no operation drift beyond the header. Retry-After exposed to browser.
- Dedicated compact invitation login reuses existing OTP, validates the exact patient origin/path, supports existing sessions, and reveals no identities before login. General login retains existing landing behavior. Mobile primary-button token inheritance corrected after screenshot review.
- App preserves invitation context through profile, consent, payment and assessment. Return storage is scoped to account AND billing intent, not unrelated purchases. General entry is never completed/deferred by this path; leaving the service restores its gate. Questionnaire save/exit returns to this service; paid results return through the invitation.

Verification:
- PostgreSQL17 temporary Docker on127.0.0.1:55419/patient_journey_test:112 existing migrations from empty, no new migration. One expanded real HTTP integration in assessment-educational-access.integration.spec.ts PASS, seven unrelated cases filtered. It verifies missing/foreign header, unverified session, incomplete-profile acceptance refusal/profile save, general entry remaining required, unrelated lists/submission refusal, independent consent, one repeated/concurrent wallet payment by the incomplete-entry recipient, two real independent submissions and role-aware shared results, withdrawal, and number reassignment/list privacy/retained original ownership. Initial fixture attempts to undo completed entry or insert completion after enforcement were rejected by retained DB invariants; corrected fixtures create an incomplete recipient initially and reuse the existing completed stranger for reassignment.
- Targeted units: API entry rules/recommendation guard5, web navigation4, app context2:11 PASS. API source/test, app, web and generated SDK types/build contract check PASS.
- App and web production builds PASS. New app context/gate/request/API and web login/navigation source ESLint PASS. Wider touched-file lint still reports three unchanged HEAD baseline errors (runtime synchronous bootstrap script; existing wizard render-ref/effect reset), plus pre-existing warnings; stdin comparison against HEAD confirms zero new errors. Broader F12-FE01/MZ11 retains those concerns; no blanket lint-success claim.
- Playwright CLI with intercepted APIs: app profile-to-invitation-to-participation/payment and bank-return context PASS (10 context-bearing checks, zero general entry starts); leaving to Home restores the required entry. OTP guest login and exact invitation destination PASS375/1440; one intercepted OTP challenge, no actual SMS; primary action visible. Existing-session branch reuses the existing session manager. Screenshots reviewed under ignored .local/mz10-login-mobile.png and desktop.png. Browser mocks and real HTTP/PostgreSQL are separate proofs; no full UX-audit verdict, real carrier/bank or hardware keyboard claim.
- Graphify AST update and scoped diff review PASS; known missing parser/template warnings remain. Full test suite not run. Owned temporary servers/browser/DB stopped; primary DB and existing user changes untouched.

Changed areas: API entry/requests/contracts; patient app entry/navigation/payment/assessment context; web invitation login; generated SDK; scoped tests and this evidence. No dashboard, schema, pricing, scoring or OTP transport changes.

Next eligible task: F12-FE01-MZ11 responsive assessment presentation and adjacent UI refinement. Not implemented by this commit. Commit/push to dev authorized by owner plan; no manual deployment.


## F12-FE01-MZ11 — Responsive assessment journey

Date: 2026-11-03. Owner/reviewer: sole `/root`. Depends on accepted MZ09/MZ10. Review gate PASS; claim RELEASED. Scope is the approved assessment journey, not certification of the whole app.

- Removed welcome stepper only during answering and the outer questionnaire card; one fluid reading surface retains question count/progress. Independent alphabet-labelled cards use pressed state, checkmark, touch targets and visible focus. Long questions/options scroll naturally; actions remain in normal flow.
- Each account/attempt remounts private questionnaire state. Question changes focus the heading; a synchronous operation lock prevents double writes. Adaptive follow-ups say save/continue until server resolution; scoring/path selection remains server-owned. Back, downstream clearing, explicit reload/conflict recovery and save/resume retain existing semantics.
- Long consent is full natural-flow text with explicit independent checkbox; missing-profile invitation has a primary completion action and no premature acceptance block. Generic result chart is present in welcome; long legend labels wrap and zero dimensions remain visible. Prefix offsets are pure; percentages unchanged.

Verification (targeted only):

- `pnpm --dir apps/app exec tsc --noEmit` PASS. Scoped ESLint of the five changed TSX files PASS with zero errors/warnings. `pnpm --dir apps/app run build` PASS.
- `pnpm --dir apps/app exec vitest run src/components/assessments/mizaj-chart.spec.ts`: 2 PASS, percentage rounding and zero input.
- `PATIENT_APP_TEST_URL=http://127.0.0.1:3017 AXE_SOURCE=<local axe4.14 bundle> node apps/app/e2e/assessment-ux.browser.mjs`: all four scenarios PASS. Questionnaire/consent widths320,375,414,768,1024,1280,1440; result375/1440; no horizontal overflow. Five input types, required error, back/retained selection, duplicate-click one write/final submission, saved reload/exit and result verified. Consent review remained one request; checkbox gates acceptance. Zero scores render no chart. Keyboard focus/200% text at320 PASS. Console/page errors zero; axe Critical/Serious zero on scoped pages.
- `PATIENT_APP_TEST_URL=http://127.0.0.1:3017 node apps/app/e2e/mizaj-sequential.browser.mjs`: PASS320/390/1440, actual server domain projection/validation helpers behind intercepted HTTP; sequential and direct follow-up, primary preservation, back/reload, downstream clearing, one final submit. Continuation browser selector follows the clearer profile CTA.
- Visual inspection: local screenshots `.local/mz11-quiz-375.png`, `mz11-quiz-1440.png`, `mz11-result-375.png`; responsive result and long labels legible. `.local/mz11-browser-final.log` records all four PASS summaries. These are isolated local intercepted-HTTP browser fixtures, not live-account/carrier/bank acceptance. No new DB boundary: MZ10 PostgreSQL evidence remains the access/payment gate.
- Graphify AST update completed with existing missing SQL/Erlang/HCL parser and extraction/community-label warnings; no paid LLM relabel requested. Diff review preserves unrelated installer/AGENTS/fa changes. No schema/API/pricing/score changes; no real SMS/payment or manual deployment.

Accepted task-level commit/push to `dev` authorized by user. MZ09-MZ11 requested software scope complete; broader F12-FE01 remains REWORK. No next batch selected.


## F12-FE01-MZ12 — Final journey audit

2026-11-03; sole /root coordinator/reviewer. Depends MZ11 DONE. User authorized completing the approved assessment-journey plan, finding/fixing consequential adjacent process problems, targeted checks and isolated dev commit/push. Final manual acceptance explicitly stays with user.

Found: MarriageNew still hid required linking terms in a closed details element while recipient terms were natural-flow and visible. Product UX Expert (recognition/error prevention), Mobile Responsive (long text/touch target) and current Web Design Guidelines (semantic labelled controls, focus, content handling) guided reusing PolicyAcceptance, preserving exact terms/explicit independent consent and server command. No new visual framework, backend rule, schema, pricing or consent shortcut.

Changed: marriage-service.tsx initiator terms use the existing shared accessible component. assessment-ux.browser.mjs extends the consent scenario to creation at320px and allows explicit scenario selection (unknown names rejected). No invitation is actually created by the test.

Targeted verification: app tsc --noEmit PASS; scoped marriage-service ESLint zero errors/warnings PASS; browser script syntax PASS. `UX_SCENARIO=consent PATIENT_APP_TEST_URL=http://127.0.0.1:3017 AXE_SOURCE=<local axe> node apps/app/e2e/assessment-ux.browser.mjs` PASS: recipient long terms/checkbox/review1 and seven widths retained; initiator long terms visible without disclosure, unchecked disables creation, typing phone then checking enables it, no horizontal overflow320; console/page errors zero. Local fixture log .local/mz12-browser.log. Initial lint invocation omitted the existing dashboard config; corrected explicit config invocation PASS. No full suite or redundant app rebuild for component reuse; MZ11 app build remains evidence for the broader presentation change.

Completion audit of the approved MZ09-MZ11 plan (current sources plus task-specific evidence inspected, no claim about all app features):

| Requirement | Authoritative implementation and evidence |
| --- | --- |
| One review per request/account; retained data/checkbox; bounded visible pending polling and429 recovery | marriage-service, marriage-request-loader, use-patient-resource; MZ09 ten units and polling browser evidence |
| Existing/new account OTP continuation without pre-auth identity disclosure | web InvitationLogin/auth-navigation and app session gate; MZ10 login/continuation browser and PostgreSQL existing/future account evidence |
| Profile/role/independent consent before payment and tests; unrelated general entry remains gated | MarriageEntryAccess, continuation DTO and app context; MZ10 actual PostgreSQL paid two-person/ownership/profile tests and generated contracts |
| Account/request/intent return through profile, gateway route, grant/submission/result; no independent top-up | marriage-context/return, PaymentChooser, welcome, assessment and result links; MZ10 context units/browser plus HTTP owned payment flow. No real bank transaction claimed |
| Flat mobile questionnaire without top entry stepper; long answers, labelled cards, focus, natural scroll, adaptive back/change/save/submit | assessment-wizard/CSS and welcome; MZ11 seven-width,200%-text/five-input browser plus actual server-domain sequential projection script |
| Readable explicit consent, clear actions and result chart with accessible textual guide/zero handling | PolicyAcceptance, marriage-service, MizajChart, welcome result; MZ11 consent/result/browser/chart units plus MZ12 initiator correction |
| Skills applied, limited checks, evidence, isolated commits and dev push | MZ09-MZ12 task records and individual commits; all seven requested skills were used in the execution recorded by prior tasks; this pass uses Product UX Expert/Mobile Responsive/current Web Guidelines. No blanket UX-audit verdict |

Software completion covers the approved assessment journey. User owns final manual review on deployed dev; approved SMS pattern/carrier receipt and real bank acceptance are separately deferred operational work, not claimed as tested here. Broader F12-FE01 and unrelated installer/AGENTS/fa changes remain untouched. No next batch selected.


## F12-FE01-MZ13 — Invitation and profile round-trip

2026-11-03; sole /root, single-task review PASS; claim RELEASED. Implements first task of owner-approved MZ13-MZ15 plan. Next MZ14 then MZ15; no second task in this commit.

Changed: educational-couples own-grant/submission link now uses existing marriageHref, retaining invitation context for unfinished general entry. MarriageNew profile link includes exact service publication/replacement destination. New pure marriageProfileReturn accepts only exact internal UUIDv4 request/new routes with at most one valid replaceRequestId; foreign origins, fragments, unrelated/duplicate/malformed query values rejected. Profile save, unchanged return and discard/save-exit dialog use this destination; ordinary profile flow retains fallback. Conditions reload on service remount. No general entry completion/defer, API/schema, financial or privacy rule changes.

Skills: approved Product UX Expert round-trip recovery; Responsive/Mobile keeps existing components/touch layout; Context7 Next16 Link query documentation consulted during planning. UX Audit live verdict remains Incomplete: no usable deployed session in previous preflight; this is scoped local intercepted-HTTP functional verification, not full audit.

Evidence:
- `vitest run src/lib/marriage-profile-return.spec.ts src/lib/marriage-context.spec.ts`:4 tests PASS. App tsc --noEmit PASS after final changes.
- Scoped ESLint of three changed components/profile page and helper: zero errors; existing unchanged no-img-element avatar warning retained. No full suite or unrelated formatting.
- `node apps/app/e2e/marriage-profile-return.browser.mjs`: PASS375px. Actual navigation/typing/save: creation and replacement -> edit -> unchanged back, then edit firstName/save -> original service.2 PATCH,12 settings reads, no pageerror. Screenshots .local/mz13-profile-before.png and after.png. Fixture APIs only; no real accounts/SMS/payment.
- Existing marriage-entry-continuation.browser.js executed via isolated Playwright Node harness:PASS,10 scope checks,0 general assessment starts; invited profile/consent/payment return and unrelated-route gate retained. Initial harness import path was wrong; root package import corrected and test PASS.
- Graphify AST update completed (existing parser warnings); diff review PASS. User-owned installer/AGENTS/fa and associated plan changes excluded from commit. Owner final manual acceptance remains pending by request.


## F12-FE01-MZ14 — Invitation error recovery and cancellation

2026-11-03, sole /root single-task coordinator/reviewer. Depends MZ13 DONE. Review PASS; claim RELEASED. MZ15 remains next; broader plan not declared complete.

Implementation: localized explicit phone-invalid/self-invite field errors, labelled/described/invalid phone input and post-busy focus. Server normalization (including Persian digits) unchanged. SMS unavailable/quota copy preserves shareable link and existing accepted-not-delivered wording. Read failure uses raw loader error to distinguish session/access recovery from network/404/429; absent invitation no longer implies wrong account. Existing generic hook/API contract unchanged. Shared BottomSheet confirms cancellation with explicit inactive-link consequence; dismiss has no request, operation lock prevents duplicate confirmed send. Replacement link blocked while operation runs. Busy labels and nearby missing role/consent hints make next action visible. No recipient-account disclosure, API/schema/financial/primary-DB changes.

Skills: Product UX Expert error prevention/recovery, Mobile/Responsive existing full-width controls and BottomSheet, UX Audit scoped interaction evidence. Live audit stays Incomplete, not certified; Context7 query-navigation guidance retained from planning, no new framework API introduced.

Verification: marriage-errors.spec plus existing marriage-request-loader.spec13 cases PASS (phone categories,401/403 vs network/404/429/500, SMS link and prior bounded-loader behavior). App tsc --noEmit PASS. Scoped ESLint final zero errors/warnings; an unused import introduced during implementation was removed before review. Local `node apps/app/e2e/marriage-recovery.browser.mjs` PASS375px: typed Persian invalid/self phone, clicked creation, asserted inline error/focused tel; opened cancellation, dismissed/no POST, reopened/double-click confirmation/exactly one POST and terminal label. No pageerror. Expected422 resource console errors are injected rejection fixtures, not a clean live audit. Screenshots .local/mz14-phone-error.png, mz14-cancel-before.png, mz14-cancel-after.png. Test APIs intercepted; no actual invitation/SMS/payment action. Existing server tests already own phone normalization; not duplicated. Graphify AST update done with existing parser warnings; diff review PASS. Full suite not run.

Only MZ14 source/tests/evidence staged; installer/AGENTS/fa and their plan hunks preserved. User authorizes task commit/push dev. Next MZ15 bounded participation polling and seven-width verification.


## F12-FE01-MZ15 — Bounded participation and final review

2026-11-03; sole /root coordinator/reviewer, depends MZ14 DONE. Review PASS; claim RELEASED. Final task of owner-approved MZ13-MZ15 plan. No next batch.

Implementation: participationLoader scopes a single GET flight/cooldown to request/account.429 respects Retry-After or60s fallback; other failures back off30s; explicit refresh cannot bypass. Successful mutation allows authoritative readback. Workspace polls30s only for waiting consent/payment/grants, visible+online, stops on joint-result or any sharing withdrawal. Operations set a synchronous parent busy ref before awaiting existing GET, suppress automatic reads, await authoritative quiet readback and release. Quiet refresh preserves checked consent, data, scroll and focus; manual refresh no longer unmounts the form. Existing private-context key resets only on actual semantic changes. Action links are block/min44px; wrapping stays within existing service layout. No API/schema/scoring/pricing/privacy change.

Targeted evidence:
- participation-loader.spec:6 PASS (single flight, waiting/terminal states,429 header20/90s/fallback60s, network30s, successful mutation recovery). Final regression marriage-errors/profile-return/context:13 PASS across4 files. Previous MZ14 loader10 tests remain evidence for unchanged invitation logic.
- App tsc --noEmit PASS; scoped ESLint of changed component/helper/spec zero errors/warnings; app production build PASS (.local/mz15-build.log). Initial account-key memo warning resolved with explicit account/request scope.
- node apps/app/e2e/participation-refresh.browser.mjs PASS: real page interactions over intercepted HTTP, controlled browser time;6 reads/1 processing POST, checked consent retained through poll/429, manual retry blocked during cooldown, hidden-page no reads, operation crossing timer tick no read, result and withdrawal stop polling. Seven widths320/375/414/768/1024/1280/1440 no horizontal overflow; long consent/title; doubled computed text at320 no overflow, focused action above bottom nav, Tab navigation. axe Critical/Serious zero on scoped participation page. No pageerror; injected429 browser resource error is expected fixture evidence, not clean live-audit claim. Screenshots .local/mz15-consent-before.png, after.png, text-200.png inspected.
- Existing assessment-ux.browser.mjs consent scenario PASS again: recipient long consent seven widths, review1/checkbox retention; initiator visible consent320, axe Critical/Serious0. No real invitation/SMS/payment. Test controls document visibility synthetically; not a physical-device claim.
- Initial slow-mutation fixture advanced60s past the existing HTTP timeout; corrected to cross the timer tick within3s. Initial axe run stalled with paused browser clock; resumed clock before axe. Corrected final runs PASS; neither tooling condition changed product timeout or limits.
- Graphify AST update completed with existing parser warnings, final diff review PASS. Full test suite not run. Unrelated installer/AGENTS/fa and their plan hunks preserved.

Completion audit against the accepted plan:

| Requirement | Current evidence |
| --- | --- |
| Same-invitation start/resume/result/login, unfinished general entry not completed | MZ13 marriageHref link repair, retained context unit tests and entry-continuation browser10 scope checks/0 general starts; MZ10 underlying authenticated server boundaries unchanged |
| Profile creation/replacement safe return, save/unchanged/discard behavior | MZ13 pure destination validation and actual profile round-trip browser2 PATCH/readback; all three exit paths share validated return; ordinary fallback retained |
| Invalid/self phone, network/session/not-found/quota recovery | MZ14 typed error mapping13 tests plus real form Persian input/inline focus browser;404/network/429 no account-recovery action; link remains usable for SMS failure |
| Cancellation dismiss/no mutation and confirm/one mutation; operation hints and locks | MZ14 BottomSheet browser cancel0/confirm-double-click1; nearby role/consent requirements and disabled replacement during work |
| Bounded automatic/manual requests, terminal stops, no operation overlap, retained form | MZ15 helper tests and timed browser count checks above; no increase of server limits |
| Responsive long content,200% text, focus/touch, meaningful scoped checks | Seven-width consent/participation browser, text200/focus bound, axe; production build/types/scoped lint; existing questionnaire adaptive flow unchanged |
| Skills and delivery | Product UX Expert recovery/status principles, Responsive/Mobile existing tokens/flow, UX Audit scoped interactions/screenshots with honest live verdict; Context7 Next16 navigation consulted in planning. MZ13/MZ14 independent pushed commits; MZ15 owns final commit and evidence |

Live UX Audit verdict: Incomplete (no usable deployed authenticated walkthrough or full manifest/performance sweep). This is deliberately targeted software acceptance per user choice; final manual deployed checks remain user-owned. Approved pattern/carrier and real bank acceptance remain separate previously deferred work. No primary DB, SMS, payment or manual deployment. MZ13-MZ15 requested software implementation complete; broader F12-FE01 remains unchanged.


## F12-FE01-MZ16 — Invitation identity and consent display

2026-11-03; sole /root coordinator/reviewer. First single-task batch of owner-approved MZ16-MZ18. Review PASS; claim RELEASED. Next MZ17 then MZ18; not mixed into this commit.

API: MarriageRequestDto adds required nullable recipientPhoneMasked. Projection decrypts only the stored invitation envelope for initiator, normalizes original destination and emits09 + five bullets + last4; recipient gets null without decrypting the destination. Existing ownership/verified phone checks precede projection. Creation, listing, detail and command responses share the projection. Later recipient phone/profile changes cannot replace the historical destination. No full number/account-existence/profile leak, schema/migration or financial rule changes. OpenAPI/generated type diff contains only this field.

App: request detail displays masked destination for initiator and Tehran-localized invitation date; sent history displays masked destination and creation date. Bidi isolates phone. Existing permission controls unchanged. Individual owned-offer conditions render historical consent status from actual returned IDs, separate from editable draft checkboxes. Entering repeat purchase resets both draft confirmations false; returning/reloading retains historical status. Server consent validity/reuse rules unchanged; no automatic consent or purchase commands. Existing style/touch tokens retained.

Skills: Product UX Expert recognition/status/ethical consent; Responsive/Mobile seven-width text flow; React best practices state separation without effects that overwrite user drafts. UX Audit scope is local functional evidence, not a new live full-audit verdict. A1/A2 were reproduced live in prior audit; local before-state review confirmed their exact render/state causes before patch.

Verification:
- Actual disposable PostgreSQL16,127.0.0.1:55419/patient_journey_test,112 retained migrations/seed: expanded assessment-offerings.integration.spec phone request test PASS (1 selected,17 skipped). Asserts requester detail/list mask, no raw phone/hash/profile ID, receiver null, existing ownership/verification/future-account/concurrency behavior and original mask after recipient phone change/new verified phone. No primary DB use. Test container mz16-test-pg stopped/removed.
- API openapi:export/source compile PASS; generated client generate/build/drift check PASS; API test tsc and app tsc PASS. App build PASS (.local/mz16-build.log); scoped two-page ESLint zero errors/warnings.
- node apps/app/e2e/assessment-identity-consent.browser.mjs PASS. Local intercepted APIs: sent history/detail original mask, receiver view no mask; historical status stable initial/return/reload with no disabled misleading checkboxes; repeat-purchase starts two unchecked boxes, action disabled until explicit checks, then return/re-enter unchecked again.0 consent/purchase mutations,0 console/page errors. Invitation/historical/new consent widths320/375/414/768/1024/1280/1440 no horizontal overflow;200% computed text at320 and keyboard navigation; axe Critical/Serious0 on tested consent page. Local screenshots mz16-invitation.png (visually inspected), mz16-historical.png, mz16-text-200.png. No live SMS/payment/invitation/user write.
- Graphify AST refresh completed with existing missing-parser/extraction warnings; final diff review isolates this task. Related report .local/audits/assessment-ux-2026-11-03.md marks A1/A2 implemented/software pending deployed manual review; remaining B1/B2/C1/A3/A4 unchanged.

No full test suite, manual deployment or whole-app quality claim. Unrelated installer/AGENTS/fa and associated plan hunks preserved. Independent task commit/push dev authorized by owner.


## F12-FE01-MZ17 — Assessment continuity

2026-11-04; sole /root coordinator/reviewer. Depends MZ16 DONE; single-task review PASS, claim RELEASED. MZ18 remains next and not implemented here.

Baseline reproduction: `MZ17_BEFORE=1 node apps/app/e2e/assessment-continuity.browser.mjs` PASS as defect reproduction: out-of-range11 withmax10 reached mocked PUT, changed selection left via bottom Home without dialog, and result text disappeared while the next15s GET was held. Initial one-question fixture prematurely submitted; corrected to two questions before baseline acceptance. No real answers or accounts changed.

Implementation: shared-result page wraps its exact account/request loader in existing single-flight/backoff helper and uses quiet refresh;15s visible+online permission checks continue, preserving mounted authorized content during GET.401/403/404 produces an explicit denied state and removes shared content, with manual retry; automatic checks stop once denied. Network errors retain existing data with recoverable error;429/network cooldown applies to explicit retry as well. Global usePatientResource unchanged.

Wizard numeric answers show contract min/max; required empties focus numeric input. Finite/min/max validation runs before advance and before draft persistence, including save/exit; errors are associated with input and preserve server validation. Decimal allowed per existing assessment-scoring finite-number rule; step=any matches it. No score/contract rule changes.

Dirty answers remain explicit-save only. App same-origin link clicks are captured only while this attempt is mounted, with native BottomSheet choices stay/save-and-exit/discard; top exit uses the same choice. Operation/submission locks block app link navigation during commands. Failed save stays in modal, successful save navigates to chosen destination. beforeunload warns on dirty reload/close. No localStorage/sessionStorage answer cache or auto-save introduced. Native same-document browser-history Back is not guaranteed by this mechanism: separate harness investigation was inconclusive (re-entry locator timeout), not claimed as passing. No history sentinel/rewrite was added. This is the limitation explicitly allowed to be documented in the approved plan; app links and reload were actually verified.

Verification:
- Final continuity browser PASS with0 invalid-answer PUT,1 failed-save PUT and1 successful-save PUT; number error focuses input, seven widths320/375/414/768/1024/1280/1440 no horizontal overflow. Modal stay retains value; reload beforeunload dismissed; save failure stays; retry success exits. Shared result remains visible during held GET,403 hides it. Expected mocked422/403 responses are rejection fixtures, not clean live audit. Screenshots .local/mz17-number.png and mz17-exit.png. All APIs intercepted; no actual payment/SMS/consent.
- Existing mizaj-sequential.browser.mjs PASS320/390/1440 (back/resume/direct early completion/primary preservation). participation-loader.spec6 PASS for coalescing and429/network backoff. App tsc PASS; scoped wizard/result ESLint zero errors/warnings; app production build PASS (.local/mz17-build.log). Full suite not run.
- Graphify final AST update and diff review PASS with existing parser warnings. Product UX Expert error recovery/status, Mobile/Responsive existing layout, React practices scoped effects/cleanup/state used. Live UX Audit remains Incomplete; no physical-device/screen-reader or full live-matrix certification.

Only task-owned source/browser proof and evidence included. Unrelated installer/AGENTS/fa and associated plan hunks preserved. Owner authorizes independent commit/push dev; no schema/API/primary database/manual deployment.


## F12-FE01-MZ18 — Catalogue and cost clarity

2026-11-04; sole /root coordinator/reviewer. Depends MZ17 DONE; single-task review PASS, claim RELEASED.

A3: clinic and legacy paid catalogue sections are hidden only after successful empty results. Loading and errors remain visible; paid total>0 retains pagination and a page-scoped empty message. Published version grouping/history links unchanged. Educational and marriage service sections are retained.

A4: purchase detail, legacy offering detail, couple participation and legacy couple-link preview use explicit toman units. New additive formatter preserves the existing exact rial remainder (10001 rial => ۱٬۰۰۰ تومان و ۱ ریال); existing formatter/conversion/contract/amounts remain unchanged. No database/API/generated client/pricing changes.

Verification: node apps/app/e2e/assessment-catalog-price.browser.mjs PASS against the local production build, intercepted synthetic API only: educational item visible with empty legacy groups;503 remains visible with successful retry;21-item pagination moves to an empty page and back; purchase10000/10001 amounts exact; catalogue and purchase at320/375/414/768/1024/1280/1440 without horizontal overflow; catalogue200% CSS zoom and actual Tab focus PASS. Zero unexpected mutation calls; screenshots .local/mz18-catalog.png and mz18-amount.png inspected. Initial cold dev run timed out before catalogue mount; reruns on warmed dev and production passed. No real accounts/SMS/payment/consents touched.

Existing wallet-money.spec.ts9 tests PASS; app tsc --noEmit and production build PASS (.local/mz18-build.log). Scoped ESLint compared every changed TS/TSX against HEAD: no introduced diagnostics; four pre-existing findings retained, so this is not a clean full lint claim. Graphify AST refresh PASS with existing parser warnings; final owned diff reviewed. Full suite not run. No live/device/screen-reader/full mobile interaction certification: deployed UX Audit remains Incomplete. Existing MZ17 native browser Back limitation remains explicit. MZ16-MZ18 implementation complete; final manual online acceptance pending.

Unrelated AGENTS/installer/fa/plan hunks preserved. Task-owned implementation, browser proof and evidence only committed; no next batch begun or manual deployment.


## F12-FE01-MZ19 — Native assessment history guard

2026-11-04; user explicitly authorized fixing the MZ17 native Back limitation. Single-task sole /root implementation/review PASS; claim RELEASED; depends MZ18 DONE. Task scope: assessment wizard, new assessment-history tracker, minimal root mount, browser regression and plan evidence. Unrelated worktree retained.

Baseline: MZ19_BEFORE=1 node apps/app/e2e/assessment-history.browser.mjs reproduced native Back from an actual catalogue history link to a text-answer draft: route returned to catalogue, input disappeared, zero PUTs and no choice. All API calls were intercepted synthetic data; no actual account/answers/consents/SMS/payments changed.

Implementation: root mounts a nonvisual document-lifetime tracker before entering an assessment, adding a private position field to existing pushState/replaceState objects while preserving Next routing fields. No extra history entries, history sentinels, URL rewrites or answer storage. Only a mounted assessment registers a blocker. Capturing popstate prevents Next from unmounting the dirty attempt, restores its existing position, then opens the existing accessible BottomSheet. Stay/Escape leaves state and history intact; save/discard replays the exact original history offset (Back or Forward). Save rejection stays in place; busy traversal is restored without a second save. Explicit navigation is one-shot. Clean assessments and other routes traverse normally. Successful final submission authorizes exit, so no obsolete unsaved warning remains.

History traversal itself is not cancelable via ordinary popstate: the address can move briefly before restoration, while the attempt remains mounted. Cross-document Back/reload/close retain the browser-native beforeunload prompt; these cannot use the in-app three-action sheet. No new API or scoring/pricing/consent/auth rule. The root tracking mount is necessary to identify the pre-assessment destination without fabricating a duplicate entry.

Verification:
- Focused history browser PASS on both dev and local production build: repeated Back/stay and Escape; exact destination; failed-save422 stays with original text; retry save held while another Back occurs (one additional PUT only); successful save exits; clean Back/Forward; discard without save; Forward/stay/discard; history.length unchanged through repeated cycles; completed submit has no modal; true cross-document Back dismissed preserves draft and accepted exits.3 PUTs total (one rejected, one retry, one final answer save); no pageerror events. Seven widths320/375/414/768/1024/1280/1440 no horizontal overflow in modal. Screenshot .local/mz19-back.png inspected after motion settled. Initial final-button fixture used an abbreviated label and timed out; corrected to the actual label before accepting final results.
- Existing assessment-continuity.browser.mjs PASS (numeric rejection, app-link modal/save failure, reload warning and shared-result permission regression). App tsc --noEmit PASS; production build PASS (.local/mz19-build.log).
- Scoped ESLint: wizard/tracker zero diagnostics; root layout has one identical pre-existing no-sync-scripts error for runtime-config.js, verified against HEAD. Zero introduced diagnostics, not a clean global-lint claim. Full suite not run.
- Graphify AST refresh completed with existing parser warnings; final owned code/diff review passed. Mobile Responsive and Vercel React practices used; local Next useRouter/native-history docs and Context7 checked. Navigation API cancellation was not assumed; current MDN Navigation API documentation notes traversal cancellation limitations (https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API).

This supersedes MZ17's unverified native same-document Back limitation for the exercised local Chromium scenarios. Firefox/WebKit binaries were not installed; physical Android Back/iOS swipe/Safari/Firefox, screen reader and deployed manual acceptance were not performed. No live UX Audit certification or all-browser guarantee. Next action is manual online/device acceptance; no next roadmap batch begun.


## F12-FE01-VP01 — Flow navigation and bounded shell

Sole /root, single-task coordinator review PASS. Product UX Expert/Mobile Responsive applied; existing visual tokens, dock order/hidden items and720px cap retained. Replaced overlapping absolute dock and96px reserved padding with normal flex-flow footer and min-height:0 content scroller. Shell uses100dvh with100vh fallback, safe top/side insets; nav owns bottom safe inset once. Labels scale with text size and wrap;44px minimum targets. No keyboard/action-footer changes claimed here; reserved for VP02. No API/database/financial changes.

Before: VP01_BEFORE=1 node apps/app/e2e/app-shell.browser.mjs reproduced content bounds extending behind dock across eight sizes. This verifies the structural overlap, not the exact reported physical Android obstruction. After: same targeted browser PASS on dev and production build at320x568/375x640/414x812/768x900/1024x768/1280x900/1440x900/667x375. No document horizontal overflow or extra body scrolling; content ends at nav.200% text: nav visible,44px targets, final action reachable above dock after scroll. Synthetic intercepted API only; screenshots .local/vp01-before.png and vp01-after.png inspected. No real account/provider mutations. Physical device/safe-area/browser-toolbar behavior remains unverified.

App types, scoped shell/nav ESLint zero diagnostics, production build (.local/vp01-build.log) PASS. Existing assessment-history.browser and assessment-continuity.browser PASS, including save failure/Back/Forward/numeric/shared permission. Full suite not run. Graphify AST update completed with existing parser warnings; owned diff reviewed. Unrelated installer/AGENTS/fa/plan hunks preserved. VP02 and VP03 remain unchecked and not started; per-task boundary observed.


## F12-FE01-VP02 — Visible viewport and shared bottom actions

2026-11-04, sole /root coordinator/review PASS; single-task claim RELEASED, depends VP01 DONE. User clarified only the outer navbar backing should be removed; dock appearance retained. Removed frame bg-background paint and explicitly transparent footer/nav surround, with no outer border/shadow/blur. This changes the shared shell, not individual page backgrounds. No claim of reproducing the precise physical Android screenshot.

A document-level VisibleViewport observer coalesces focus/resize/orientation/viewport-scroll in RAF, cleans up listeners/properties, and sets shared visible-height/top/keyboard CSS state. Editable focus plus significant viewport loss detects keyboard; pinch zoom does not rescale layout, browser toolbar loss below threshold is not keyboard. Rotation rebases measurements. Desktop window resize with layout=visual height no longer falsely hides nav (caught by existing VP01 regression and fixed). Coarse-pointer/no-VisualViewport fallback hides nav only during editing. Text/focus remain mounted. Physical keyboard/OS behavior not certified.

AppShell action and overlay portals reserve actual bar heights. Product purchase/cart bars are normal-flow above navigation, with no76px/80px dependency; zero placeholder height when no bar/nav. Product price/theme container styles preserved after portal move. Toast follows measured total footer height; route cleanup disconnects ResizeObserver. Shared dialog viewport and max panel height follow visible area, long panel scrolls; native focus trap retained. Chat fills the existing immersive content area instead of an independent100dvh fixed overlay; its actual messaging/transport flow was not exercised. Store business/amount logic unchanged; no API/schema/auth/storage contract changes.

Verification: visible-viewport.browser.mjs PASS on local dev and final production build. Explicitly simulated EventTarget VisualViewport: focused shrink hides nav; value/focus retained; restore shows nav; toolbar/scale2/rotation avoid false-positive;300px-height modal last action reachable. Eight-size cart320x568/375x640/414x812/768x900/1024x768/1280x900/1440x900/667x375: action precedes nav, no horizontal overflow; text200% check. Product action in footer with nav absent; add-to-cart toast above measured footer, exactly1 intercepted synthetic cart PUT and0 answer PUTs. Separate touch/no-VisualViewport context hides/shows nav and preserves text. No real API/database/SMS/payment/account mutations. No pageerror. Screenshots .local/vp02-sheet.png, vp02-cart.png and vp02-product.png inspected.

Existing app-shell.browser (eight sizes/text200%/end-action), assessment-history.browser (Back/Forward/save failure/final) and assessment-continuity.browser PASS. App tsc and production build (.local/vp02-build.log) PASS. Scoped ESLint nine changed TS/TSX files: new observer/slots/shell/sheet zero diagnostics; root1/toast1/chat2/cart2/product4 pre-existing diagnostics unchanged by rule and first message line. Initial comparison falsely treated embedded line-number shifts as new warnings; normalized comparison and code diff confirmed no additions. Full suite not run. Graphify AST refresh completed with existing parser warnings. Product UX Expert/Mobile Responsive applied. Final coarse-pointer input text minimum16px added to avoid iOS focus auto-zoom conflicting with pinch detection; simulated touch assertion and rebuilt production browser PASS, not actual Safari verification. Frame and nav computed backgrounds both verified transparent; dock styling retained.

Physical Android/iOS keyboards, browser chrome, installed mode, pinch gesture, VoiceOver and chat transport remain unverified. Simulated viewport tests are not represented as real-device validation. Final manual online acceptance remains pending; VP03 not started. Task-owned sources/test/evidence only staged; unrelated AGENTS/installer/fa/plan edits preserved.


## F12-FE01-VP04 — Screenshot-targeted home/navigation backing

2026-11-04; sole /root coordinator/review, claim RELEASED. User explicitly pointed at the nav in the attached home screenshot. Previous VP02 removed outer/frame paint but left nested dock glass. V1 finding: translucent dock fill+white border+28px blur+shadows creates a separate panel. V2: home gradient painted only inside scroller stops before footer, exposing flat shell backing. Both visual issues reproduced in local fixture/screenshots and matched to actual CSS. Fix: dock transparent fill/border, no blur or shadow; same border width keeps layout stable. Move identical home gradient from .home-page to home frame; page transparent. Active-item pill, icon/label styles, safe areas, footer layout, navigation and app content unchanged.

### UX Audit status — Incomplete
Persona locked from product context: returning Persian-speaking patient, low technical comfort, mobile browser, wants quick access to own services and clear navigation. Scope requested home and shared navbar; live surfaces audited0/2. Browser preflight: CUA getState failed kernel-assets initialization; Playwright MCP listed only about:blank, no shared signed-in session. Per UX Audit authenticated browser gate, no fresh unauthenticated session was presented as a live patient audit. Full Interaction Manifest incomplete; console/network/axe/performance live gates not measured,11 scenarios and full stress not run, self-critique not run because audit stopped at preflight. Therefore no live Pass/Conditional Pass and no complete-app quality claim. Skill: C:/Users/R3dPi/.codex/skills/ux-audit/SKILL.md, “Do not silently fall back to a fresh Playwright session for an authenticated app”.

Observed screenshot follow-up: hero says اطلاعات شما دریافت نشد and offers retry. This is a separate unresolved data/recovery state; screenshot does not establish backend status or root cause. Do not classify the intentionally mocked503 below as the live error. No extra unverified findings padded into a Top5. Actual online error diagnosis and live/device checks remain open. No physical iOS/Android/VoiceOver certification.

### Scoped local fix verification (not the full audit)
VP04_BEFORE=1 node apps/app/e2e/home-navbar.browser.mjs reproduced rgba(245,252,255,.56),blur28px,white border and shadows. After local dev and production: computed dock fill/border transparent,blur/shadow none; frame gradient present,page background none. Actual clicks: retry increments intercepted journey GET and retains recoverable error card; notification button opens native dialog, Escape closes; Home→Store→Back restores route and aria-current. Seven widths320/375/414/768/1024/1280/1440 have no horizontal document overflow, nav links>=44px. No pageerror. Intentional503 simulates the supplied error visual; this is synthetic UI fixture data, not live network/audit green gates. Initial store fixture incorrectly returned object for addresses and threw; corrected to array before accepting baseline and final runs. No actual write calls permitted by harness. App types, production build (.local/vp04-build.log), existing app-shell.browser eight-size/text200%-end-action regression PASS. No new application JS; CSS-only product edit, no API/schema changes; full suite not run. Graphify AST refresh completed with existing parser warnings; owned diff reviewed.

Artifacts: .local/vp04-before.png, vp04-after.png, before/after-sheet.png, vp04-browser.log (timestamped local interaction observations). Images inspected. Both states capture user screenshot-like recovery UI with synthetic identity. All APIs intercepted. Quick win delivered: dock/background; structural follow-up: live home-data error diagnosis; advanced polish not added. Holistic local judgment: controls now read as part of the home surface rather than a separate glass tray; the unresolved hero recovery state still prevents claiming a reassuring complete home experience.

User explicitly deferred installation: VP03 remains unchecked/deferred. Only task CSS/browser/evidence and necessary task/defer status are committed; unrelated AGENTS/fa/installer/plan edits retained.


## F12-FE01-VP05 — Restore glass, remove flat navigation band

2026-11-04; sole /root coordinator/review PASS, claim RELEASED. User explicitly rejected VP04 removing the rounded glass. This task supersedes that visual decision; it is not a request for another style redesign. Exact previous translucent fill, white border,24px radius,28px blur and shadows restored. Active pill untouched. Home gradient continuity from VP04 retained.

Root cause of remaining band: normal-flow nav reserved a separate full-width footer region, so transparent wrappers still showed the underlying flat backdrop instead of scrolling page content. A nav-only footer now overlaps content by its already-measured --app-footer-height. Content gains the same measured bottom padding and scroll-padding to keep the final action reachable and focus clear. No fixed96px offset or extra solid backing. Existing portal-based purchase/cart action footer is explicitly excluded from overlap and remains stacked in normal flow. Keyboard hiding reduces measured nav height to0, preserving viewport behavior. No new JS/product/data/financial rules.

Verification: home-navbar.browser now asserts original glass paint, transparent footer and page content extending behind dock; actual local retry, notifications/Escape, Home→Store→Back and active tab check PASS on dev and final production. Intentional mocked journey503 recreates user screenshot's recovery visual, not a live backend finding. Eight-size app-shell.browser PASS including200% text, no horizontal/body overflow, minimum44px targets and final action fully above nav after scroll. Updated old content-box non-overlap assertion to the intentionally floating geometry, retaining end-action safety assertion. visible-viewport.browser dev regression PASS (simulated keyboard/fallback, rotation/zoom, modal, normal-flow cart/product/footer/toast). App types and production build PASS (.local/vp05-build.log), owned diff/check PASS. Full suite not run; CSS-only application change, no new TS diagnostics introduced. Graphify AST refresh completed with existing parser warnings.

Evidence .local/vp05-home.png and vp05-sheet.png inspected; .local/vp05-browser.log records production fixture interaction. No real patient/provider/account writes, no API/schema/contracts or install work. Existing unrelated AGENTS/fa/installer/plan changes preserved. Full live UX audit and actual iOS/Android acceptance remain unverified; VP03 deferred by user. Next action is viewing the intended glass-over-content appearance on the deployed browser; no other task started.


## F12-FE01-AH01 — Action-first assessment read contracts

2026-11-04; sole /root coordinator/reviewer, single-task gate PASS, claim RELEASED. First of two user-approved tasks. AH02 UI explicitly not started; this is not delivery of the new screen.

GET /v1/patients/me/marriage-requests gains optional status=PENDING|ACCEPTED|CANCELLED|REPLACED and direction=SENT|RECEIVED. Filter enters the Prisma where clause before both pagination and count; clinic and actor/verified-phone ownership predicates remain mandatory. Unverified received queries use an empty ownership OR and return no items. Omitted filters preserve existing list behavior and20-item pagination. No schema/migration changes. Controller validates the new DTO; generated OpenAPI and client updated. App list helper filter type derives from generated operation query, not hand-maintained enum copies. App history helper exposes existing server state query for IN_PROGRESS/COMPLETE/INVALIDATED.

Actual PostgreSQL: dedicated codex-ah01-postgres --rm container on127.0.0.1:55419/patient_journey_test, separate from primary5432, initialized with existing112 migrations/seed. Expanded marriage-phone test in assessment-offerings.integration.spec:21 newer CANCELLED requests bury the PENDING request in the unfiltered first page; server received/PENDING query still returns the one older request and total1. Sent/received distinction, unverified number empty list, unrelated account empty list, foreign-clinic matching phone rejected404, invalid enums400 and requester-only masked original number/repeated acceptance privacy remain covered.1 expanded test PASS,17 unrelated cases skipped; tests8.34s. No actual SMS/payment/provider calls or primary DB changes. Disposable container stopped/removed after verification.

Fixture corrections during verification: cloning a CoupleSession alone violates independent consent integrity, so setup now calls the existing CoupleLinkService for valid sessions; second clinic explicitly INACTIVE per single-active-clinic constraint; foreign-clinic response404 is asserted rather than inventing200 empty. Expanded real-DB test timeout30s replaces default5s for this one case; production limits unchanged. Earlier broad string replacement caused a controller type error and was corrected before all final checks. pg emitted an existing deprecation warning about concurrent client.query; no browser/audit warning-free claim.

API test TypeScript/app tsc and regenerated api-client build/check PASS; OpenAPI export compiled API successfully. Diff/check and sole-writer contract review PASS. Graphify AST updated with existing parser warnings. Full suite not run. Unrelated AGENTS/fa/installer/plan hunks preserved; shared schema/lockfiles/auth/financial paths untouched. NestJS guidance used for boundary validation and ownership.

Next: AH02 connects real cards/two tabs, source-specific pagination, legacy view aliases and remaining authority/context mapping. Preserve exact request context when continuing invited attempts; never attach the last remembered unrelated invitation. No mock prices/progress or catalogue data enter product. Frontend interaction/responsive/Back tests belong to AH02. Full live UX Audit remains Incomplete, authenticated browser unavailable earlier; no online/device certification.


## F12-FE01-AH02 — Action-first assessment page

2026-11-04, sole /root coordinator/reviewer, depends AH01 DONE; single-task gate PASS, claim RELEASED. User explicitly authorized implementing the selected اقدام‌محور preview. UI Styling/Mobile Responsive patterns used with existing patient tokens, no new framework, navbar redesign, mock prices or progress counts.

App assessment main replaced: title آزمون‌ها, at most one real pending received invitation with AH01 server filters and one resumable IN_PROGRESS item from the current history head; count links open corresponding My section. No empty promo cards or permanent marriage-tracking CTA. Two URL-driven tabs آزمون جدید/آزمون‌های من use router navigation and useSearchParams inside Suspense; start/history/purchases legacy views preserved, purchases section prioritizes financial records. Keyboard arrows/Home/End change/focus tabs. Catalogue uses real individual/marriage offerings, exact currency formatter and same authority-specific links; legacy offerings kept, published versions accessible under disclosures with explicit start action. No name-based deduplication. My sources retain independent pagination, masked invitation phone/date/status, result/resume links, financial status/access links; highlighted request/submission IDs excluded from duplicate list rows. Existing old couple histories remain reachable under compact disclosure. Empty and loading/error states are distinct; unrelated purchase/consent/questionnaire screens unchanged.

Narrow read-contract addition needed for correct continuation: PatientAssessmentHistoryItemDto.marriageRequestId nullable UUID derives only from the owned attempt grant→educational participant→session→request join, clamped to caller clinic. Internal grant joins and grantId are stripped from response. Resume/result links append this exact context, never browser's last unrelated invitation. No ownership/exemption decision or source score/price/consent rules changed. OpenAPI and generated client updated by sole writer; no schema/migration. Existing history filters/authorization retained. Header selects only latest20 IN_PROGRESS items, highlights first resumeAvailable; count/link exposes all in-progress entries with normal pagination, not a fabricated resumable total.

Verification:
- API assessment-history-invitation.spec1 unit PASS: individual null, exact same-clinic context, foreign-clinic context null, internal joins absent, owner/clinic/state query retained. This is a mocked projection boundary test, not a new PostgreSQL grant-flow certification. AH01 already verified invitation filtering with actual disposable PostgreSQL; no primary DB/provider mutations in AH02.
- API test tsc, app tsc, generated api-client build/check and API compilation/export PASS (.local/ah02-contract.log). App scoped ESLint zero diagnostics; final production build PASS (.local/ah02-build.log). No full suite.
- assessment-hub.browser.mjs PASS on dev and final production: real-shaped invitation/more count, highlighted dedup, exact10001-rial display, legacy purchases alias and result link, tab Back navigation, explicit invitation context in actual resume/questionnaire navigation, legacy version disclosure/start link, keyboard arrows/End, seven widths320/375/414/768/1024/1280/1440 on My and unbroken long catalogue title, text200%, empty/error distinction. All APIs intercepted;0 unexpected mutations/pageerror. Mock503 intentional error fixtures, not live hard-gate results. Initial Back test raced router commit; fixed harness to wait start URL before goBack.
- Updated existing catalogue/price browser to the new non-internal headings and scoped keyboard starting point (Next dev portal is not an app focus bug): production PASS for error retry, independent old-offering pagination, exact rial remainder and seven widths. Updated history browser only label from ادامهٔ پاسخ‌ها to ادامه; history and continuity regressions PASS on dev (Back/Forward, save failures, final submission, numeric/shared result behavior). Real click-through acceptance/payment/result rendering on live accounts is not claimed; new result/purchase paths verified as exact links and existing downstream routes unchanged.
- Screenshots .local/ah02-new.png and ah02-mine.png inspected; .local/ah02-browser.log contains production outcomes. Graphify AST refreshed with existing parser warnings; combined owned diff reviewed. Physical mobile, screen reader, online authenticated UX Audit and real acceptance/payment were not performed. Live audit remains Incomplete, no global quality certification.

Task-only source/tests/generated contracts/evidence committed; unrelated AGENTS/installer/fa/plan edits preserved. AH01–AH02 software implementation complete; final deployed manual acceptance remains pending. VP03 stays deferred per user; no next batch begun.


## F12-FE01-AH03 — Assessment skeleton loading

2026-11-04, sole /root coordinator/review PASS, single-task claim RELEASED. User requested skeletons instead of generic receiving-information text in the newly delivered assessment screens. Scope is assessment hub and its two tabs, not all app routes. UI Styling/Mobile Responsive used; existing shared skeleton/shimmer and reduced-motion behavior reused.

Local AssessmentResourceState replaces visible loading paragraphs with invite/card/row placeholders appropriate to header, catalogue, histories and purchases. Static Suspense page fallback uses the same shapes; only hidden status text is announced, decorative blocks aria-hidden, no fake interactive buttons. Loading shapes contain no names/prices/progress sample data. Shared PatientResourceState retained only for errors; its alert/retry behavior and all other app pages unchanged. No API/query/data lifecycle/auth/financial changes.

Targeted assessment-loading.browser.mjs PASS on dev and final production build: deliberately held intercepted GETs show skeletons at initial entry and My tab; loading text is not shown visually; released data removes placeholders; real-shaped rows appear; mocked503 still shows alert with working retry; reduced-motion pseudo-element animation none. Seven widths320/375/414/768/1024/1280/1440 no horizontal overflow. No unexpected writes or pageerror. Initial harness used global role=alert and caught Next's route announcement before the actual error; changed it to the app main alert containing a retry button, then final cases passed. Strengthened the same scope in existing hub browser; full targeted hub regression PASS. No fake/live audit claim: all API data synthetic/intercepted, no actual SMS/payment/patient mutations.

App tsc, scoped page/loading ESLint zero diagnostics and production build PASS (.local/ah03-build.log). Screenshots .local/ah03-skeleton.png and ah03-mine-skeleton.png inspected, production output .local/ah03-browser.log. Suspense fallback shares static shape code; no separate JS-disabled streaming test claimed. Graphify AST refreshed with existing parser warnings; owned diff/check reviewed. Full suite not run, physical device/screen reader/online acceptance not performed. Other routes' generic loaders and shared default intentionally preserved. Unrelated AGENTS/installer/fa/plan hunks preserved. No next batch begun.


### F12-FE01-AH04 — Radial temperament result and home visualization

2026-11-04, sole /root implementation and review PASS; single-task claim RELEASED. User requested EvilCharts static radial chart in app results and semi-circle in the home status card instead of the brain image, including chart loading. UI Styling and Mobile Responsive used. Read user-referenced https://evilcharts.com/docs/recharts/radial-chart/static and MIT upstream implementation/license, and Context7 Recharts2 API documentation. Adapted relevant concentric geometry/rounded tracks/gradient/loading behavior to already-installed Recharts2.15.2 instead of importing Recharts3-only compound wrappers or adding dependencies; upstream MIT notice retained adjacent to component. No API, database, price, scoring or dock changes. Dashboard simulator renderer is outside this app-only slice and unchanged.

Shared app MizajChart now supports full/semi/isLoading. PolarAngleAxis domain0..100 prevents largest score auto-filling the whole arc. Existing largest-remainder percentage math remains untouched: one decimal and total100%, zero dimensions retained in the accessible textual legend. Four existing colors retained. Loading shows four muted placeholder arcs changing every1500ms with no percentages; timer cleaned up, reduced-motion freezes values/disables transitions. Full loading connected to result route; welcome result inherits the shared renderer. Home uses only saved DIMENSION_TIEBREAK scores/dimensionTitles, never inferred ranks or sample scores. Missing/legacy results show no invented chart; zero effective scores show existing no-data text. Brain artwork removed from Hero, semi chart placed above action on narrow screens and beside copy on wider layouts. Result error/retry remains existing behavior.

Verification: existing two percentage tests plus home-summary/source tests8 total PASS; app tsc PASS; scoped ESLint delta PASS5 files, zero added diagnostics (two baseline warnings). Root eslint command unavailable; used existing repository loading-lint harness backed by dashboard ESLint. Final app production build PASS (.local/ah04-build.log). Graphify AST refreshed (.local/ah04-graph.log); owned diff/check reviewed.

New mizaj-radial.browser.mjs PASS in local development and final production: held result requests expose semi and full skeleton before real data; actual interaction clicks home result link; exact40.0/30.0/30.0/0.0 legend, zero-state removes chart, no brain image, no pageerror, widths320/375/414/768/1024/1280/1440 no horizontal overflow, result200%-root-text, reduced-motion placeholder path remains static over1700ms. All requests intercepted, unexpected writes rejected. Screenshots .local/ah04-loading.png, ah04-home.png, ah04-result.png inspected; production output replaces dev captures. These are synthetic local UI proofs, not authenticated online or physical iOS/Android acceptance. No actual SMS/payment/provider mutations. Unrelated AGENTS/installer/fa/plan edits preserved and excluded from task commit. No next batch started.


## F12-FE01-PR01 — Consolidated profile medical navigation and readable health summary

Task ID: F12-FE01-PR01. Completed2026-11-05 Asia/Tehran; sole /root implementation/coordinator/review PASS; single-task batch claim RELEASED. Scope requested profile medical/self-report duplicates and related patient pages, using Product UX Expert, UI Styling, UX Audit and Mobile Responsive. No schema/API/dependency/consent/clinical fact change; original profile progress card markup/computation preserved. Five owned source files: app home shortcut, profile root, medical summary, published clinical timeline labels/navigation, onboarding back action.

### UX Audit status — Incomplete

Persona: returning Persian-speaking patient on phone, wants inspect/update own health details without internal terminology; first-time lens applied to naming and actions. This is a focused fix with real read-only baseline interaction and local fixture verification, not an exhaustive UX Audit Pass. Live authenticated IAB interaction: opened /profile, clicked existing main medical card, observed /profile/medical, clicked edit and observed /onboarding with back target home, returned with browser Back. Console reads at profile/medical/onboarding returned0 warnings/errors. Tool screenshots captured before navigation and on medical page, containing account data and not copied into repository. Initial old tab had a failed-site error document; new HTTPS profile tab was accessible with existing session. One attempted resource inventory through DOM-scope performance API was unavailable; no live network/axe/performance certification claimed. No live field typed or patient data saved. Required full per-route interaction manifests/stress/performance/all gates are incomplete. Local intercepted503 fixtures are intentional recovery tests, not deployed hard-gate observations. Final live/mobile audit remains Incomplete.

Ranked findings (three concrete findings, no padded Top5):
- PR-F1, Interaction, Medium, /profile: complete account had prominent medical card plus self-reported-medical row and health-record row; incomplete account adds another completion row (code evidence). Home shortcut targeted a different clinical timeline. Reproduce: open profile, compare card and lower health/account rows; from home open health shortcut. Patient cannot tell which is their entered information. Patch: preserve original card, use same /profile/medical destination from home with from=home back context, remove3 redundant lower entries, name remaining group سلامت و مراقبت. Actual published clinical summaries remain reachable inside summary under خلاصهٔ مشاوره‌های من; old /profile/health-record resource preserved, no redirect/data merge. Verified in local complete/incomplete fixtures and actual card/shortcut clicks.
- PR-F2, Visual/Architecture, Medium, /profile/medical: live had two h1 (PageHeader plus اطلاعات خوداظهاری), raw currentRevision and developer-like clinical caveat, while summary omitted saved optional values editable in intake. Reproduce: open medical, compare title/header and optional saved fields in edit. Patch: one h1, short explicit self-reported source statement, plain COMPLETE/incomplete status, primary edit/complete action, separate allergy/condition/medication sections, actual optional fields translated using existing form options. NONE/UNKNOWN/unanswered remain distinct; no default negative declarations or clinical verification claim. Main landmark added to profile/medical after axe found existing profile region warning. Screenshots .local/pr01-profile.png and pr01-medical.png; synthetic long-text only, not live medical records.
- PR-F3, Interaction, Medium, /profile/medical -> /onboarding: live edit opened generic onboarding whose back link targets home. Reproduce: card -> edit -> inspect back destination. Patch: edit uses from=medical, explicit header back returns to same summary; generic/default onboarding still returns home; save retains existing medical-summary destination and revision-aware requests. Only fixed internal destinations selected, no arbitrary return URL. Local typed fixture save -> summary shows changed data; cancellation sends0 writes. No actual patient mutation.

Self-critique fresh sub-agent: /root/profile_findings_review, Drafted3 Kept3 Generic0 Duplicate0. Distinct clinical records risk explicitly retained through in-summary navigation. Original screenshot review driven by main agent, no independent live audit claim. Smallest-patch roadmap: above3 current fixes accepted; full live/device/performance acceptance remains manual; no unrelated redesign or advanced polish selected.

### Software verification

- App tsc PASS; final app production build PASS (.local/pr01-build.log). Scoped existing ESLint-delta harness PASS5 files,0 new errors/warnings;1 error and2 warnings are unchanged baseline diagnostics. Initial wrong working-directory invocations rerun successfully from apps/app. Full suite not run; no new unit tests for reversible presentation-only markup.
- Playwright CLI isolated pr01 session, .local/pr01-browser.js run-code PASS development and same final built app at3018 (.local/pr01-production.log). Intercepted API shape only; assertions reject unexpected mutations. Actual user-style click card, type synthetic medical item, continue/review/final save, observe returned updated summary. Exactly one expectedRevision-aware PUT and one completion POST, both intercepted; edit-and-back adds0 writes. Clinical summaries reachable and round-trip; home medical shortcut returns home; complete/empty/incomplete profile duplicates absent; NONE/UNKNOWN/missing distinct; intentional503 error then retry succeeds;0 pageerror. CLI logs include initial unmocked connection probe and intentional503 console errors, not a clean-console/full-audit claim. No real SMS/payment/medical data writes.
- Final production responsive checks PASS /profile, /profile/medical, /profile/health-record, /onboarding?from=medical at320/375/414/768/1024/1280/1440 and320px text200%; no horizontal overflow. Long report text verified in medical summary. Keyboard focus to final clinical link leaves it above floating dock (.local/pr01-medical-end.png); edit target>=44px. Text enlargement is CSS text200%, not a certified physical browser zoom test.
- axe-core4.13.0 after actual route readiness: initial profile moderate region issue fixed with main landmark; final dev and production four-route scans0 violations (.local/pr01-production-axe.log). Not a VoiceOver/physical-device certification. No live LCP/CLS/INP benchmark performed.
- Graphify AST refreshed after final sources (.local/pr01-graph-final.log). Main reviewed complete owned diff, clinical/source separation, missing data, exact card retention, fixed internal return paths and unrelated edits. Manual deployment not performed.

Hold this in your hands: the patient now has one recognizable place to read their own health information and a visible way to change it, while clinician-published summaries have a separate, understandable label. The small-screen reading path is calmer; whether that feels equally clear on the deployed app and real phones remains to be checked there. Unrelated AGENTS/installer/fa/plan edits preserved and excluded. Next batch: none selected.

PR01 post-review evidence clarification: the initial unmocked local CLI page, before intercepted profile verification began, also logged a hydration mismatch between SessionGate loading and PatientEntryGate unavailable-error markup after /auth/refresh connection refusal, plus unused-preload warnings. The trace points to existing auth-shell branches, outside the five profile UI files; it is recorded as an unverified startup/auth follow-up, not dismissed as a proven harmless warning or fixed here. All subsequent scoped fixture runs had zero pageerror. This reinforces the Incomplete whole/live-audit verdict; no clean global-console claim is made. Captures moved to ignored .local/pr01-cli-evidence after closing only the pr01 browser session.



## F12-FE01-PR02 — Saved weight re-edit serialization and correct validation step

2026-11-05, sole /root implementation/review PASS, claim RELEASED. User reported unrelated weight2..500 error when re-editing first health step. Root cause reproduced with real Prisma.Decimal65.50 and class-transformer instanceToPlain: the global ClassSerializerInterceptor (app.factory.ts) traverses Decimal into its internal object fields. PatientIntakeService.snapshot returned that object unchanged, so intakeDraft String(weightKg) became [object Object], rejected by numeric validation. All intake response paths now normalize weight to number before global transformation, using the same snapshot helper; null optional weight retained. No schema/contract change: API already declares weight number. No SDK generation, migrations or primary DB mutation required.

Separate UI cause: first-step Continue validated hidden optional weight/height. intakeIssue now accepts explicit health-only scope for step0; full save checks remain intact. A save error on a hidden measurement selects step1 and focuses its heading, including draft saves; no bad weight is silently cleared or submitted. Health-answer missing/detail validation retained.

Targeted verification: API intake-snapshot.spec.ts2 tests PASS using actual generated Prisma Decimal and real class-transformer before/after JSON serialization (old response object versus fixed65.5), null and numeric input preserved. App intake-form.spec.ts4 tests PASS, including hidden malformed saved weight not blocking health step while full save rejects it, corrected weight65.5 sent numeric. App tsc and API build-tsconfig noEmit PASS. Scoped app lint-delta0 new diagnostics; existing baseline findings retained. Graphify AST updated (.local/pr02-graph.log); owned diff checked. No full suite, PostgreSQL run, live medical mutation or browser flow certification claimed; actual serializer test exercises the fault without needing DB. Exact live account payload not inspected; reproduction uses the same database value type and global serializer. Previous unrelated auth-startup warning remains separate. Owner manual re-edit after deployment remains pending. Unrelated AGENTS/installer/fa/plan edits excluded. Next batch none.


## F12-FE01-ST01 — Remove store header logo

2026-11-05, sole /root review PASS. Removed BrandLogo render/import only from public store page header at user request. Existing brand text, heading, controls, responsive styles and shared logo on other pages preserved. App tsc and existing scoped ESLint delta PASS (0 new diagnostics;5 baseline errors/1 baseline warning untouched). Source diff reviewed; no behavior/test/API/dependency changes and no unnecessary new tests or broad suite. Graphify AST refreshed (.local/st01-graph.log). No new browser/online/device certification claimed. Unrelated changes excluded; no next batch.

## Analytics AN01 browser foundation

Task ID: F12-FE01-AN01
Completed at: 2026-11-06 Asia/Tehran
Agent/Reviewer: Codex /root (single agent)
Batch ID: ANALYTICS-01
Branch: codex/analytics-ga4 (isolated managed worktree, baseline dev8278608)

Changed files: config/analytics{,-browser}.{ts,test.mjs}, config/ANALYTICS.md; both frontend root layouts and analytics-tracking components; landing/header explicit CTA attributes; Docker next-entrypoint, VPS dev-service, both compose manifests; contract/checklist/status/evidence; generated graphify-out artifacts.
Migrations/API: none. No primary database or external analytics property changed.

Verification:
- Failing-first node test: expected ERR_MODULE_NOT_FOUND before implementation.
- node --experimental-strip-types --test config/analytics.test.mjs: 5 PASS.
- node --test config/analytics-browser.test.mjs: Chromium actual compiled SDK, intercepted external scripts; 1 PASS. One initialization, sanitized metadata, one repeated route view, CTA, no application API requests and dispatch-time opt-out verified.
- pnpm api-client build; app/web typecheck; app/web production build: PASS.
- node scripts/test-runtime-config-loading.mjs: PASS.
- node scripts/test-sadad-runtime-config.mjs: PASS.
- graphify update .: PASS, AST-only; existing extractor PDF/SQL/partial TS warnings reported, not suppressed.
- git diff --check and main-agent combined scope/metadata/SSR review: PASS.

Acceptance: first real two-consumer browser boundary implemented, no empty future adapters, no database calls for page/click events, once-per-document async loader with bounded pre-load queue. Explicit runtime config gates default denied; no staff dashboard instrumentation. Actual product IDs remain only in transient route dedup state, never payload.

Limitations: full app semantic events, CTA/campaign continuity, domain-confirmed outcomes and server Outbox are AN02/AN03. No claim of completed original analytics plan, complete app browser journey, live GA4 ingestion or performance load test. Runtime gate does not obtain visitor consent; collection policy must be integrated before production activation. Opt-out tested at dispatch time; vendor automatic measurement must be disabled per operator guide. Referrer/campaign intentionally absent until AN02. No push/deploy.
Next: AN02, not started (per-task commit boundary).

## Analytics AN02 behavior and attribution

Task ID: F12-FE01-AN02
Completed at: 2026-11-06 Asia/Tehran
Agent/Reviewer: Codex /root, single agent
Batch ID: ANALYTICS-02; depends AN01 accepted. Branch codex/analytics-ga4.

Changed files: config/analytics{,-browser}.ts and browser tests; new config/analytics-context.ts, analytics-operations.ts, analytics-context.test.mjs, analytics-journey.test.mjs; config/ANALYTICS.md; frontend analytics components, app api/commerce API helpers, web api/landing/header; contract/status/checklist/log. Existing user product-page change in original X:/Git/mushroom checkout untouched. No Prisma/OpenAPI/migration/actual financial or clinical data change.

Verification:
- Failing-first new context test: expected missing-module failure, then implementation.
- node --experimental-strip-types --test config/analytics-context.test.mjs config/analytics.test.mjs:10 PASS. TTL, sanitization/invalid stored fields, registered endpoints, response identity/body not consumed, original rejection preserved, telemetry exceptions isolated, accepted/rejected/unavailable/no-observation semantics.
- node --test config/analytics-browser.test.mjs config/analytics-journey.test.mjs:3 PASS. Actual Chromium compiled SDK with intercepted remote script: denied dispatch, sanitized views, first landing CTA and UTM across two origins, preservation of next/product/hash, ma_* cleanup, arbitrary destination refusal; real unchanged one-request bearer/body/response through analyticsFetch. Corrected old browser assertion to count events (the newly queued asynchronous GA getter commands are not events).
- pnpm --filter @sabz/web exec vitest run src/lib/api.test.ts src/auth/auth-navigation.test.ts src/services/auth.test.ts:10 PASS.
- pnpm --filter @sabz/app exec vitest run src/lib/commerce-catalog-api.spec.ts src/lib/assessment-api.spec.ts src/lib/appointment-api.spec.ts src/stores/cart.spec.ts:15 PASS.
- Both frontend typechecks and production builds PASS.
- graphify update .: PASS (AST only, existing extractor PDF/SQL/partial-chat warnings retained). Generated graph artifacts ignored by repository configuration.
- Main-agent combined scope/security/transport review and git diff --check PASS.

Outcome: no extra application API call or database write; existing request, auth/marriage headers and response/body ownership preserved. Request outcome is not a medical/financial completion. Context is tab-scoped metadata,30-minute bounded handoff, no raw activity archive; only explicit public product/SKU IDs, no patient IDs/body/text/results. Missing GA getter never delays login/navigation; same-property identifiers optional, native cross-domain continuity not guaranteed until live acceptance. No source claims from fabricated identity.

Limitations: browser tests exercise SDK and transport, not a fully authenticated deployed product/GA4. Runtime collection remains denied by default; real consent policy/operator property custom definitions/domain configuration and receipt still external. AN03 owns actual server conversion and Outbox, AN04 full integration/activation/performance acceptance. No push/deploy/new service/production configuration. Next AN03 eligible, not started under per-task boundary.

## Analytics AN03 authoritative conversions

Task ID: F12-FE01-AN03
Completed at: 2026-11-06 Asia/Tehran
Agent/Reviewer: Codex /root, single agent
Batch ID: ANALYTICS-03; depends AN02 accepted. Branch codex/analytics-ga4.

Changed files: new apps/api/src/modules/analytics/{analytics.protocol,analytics.service,analytics.worker,analytics.interceptor,analytics.module,ga4.transport}.ts; billing and commerce settlement/module wiring; Outbox claim partition/locking; app.factory OpenAPI optional header, environment validation and request redaction; analytics protocol/transport tests, wallet-billing integration, identity redaction and payment constructor regression; both frontend API transports and config/analytics-browser.ts, analytics-journey.test.mjs; deploy API entrypoint/dev launcher, compose dev/production and explicit compose.analytics.yaml overlay; generated OpenAPI/client; analytics operator guide/contract and plan evidence/status/checklist.
Migrations: none; existing 112 migrations deployed into a fresh disposable PostgreSQL17 database on 127.0.0.1:55423/wallet_test, synthetic seed only. No primary database or real Google/bank/SMS request.

Verification:
- Protocol + actual loopback HTTP transport + environment validation + payment-provider contract:21 tests PASS. Actual Google target remains fixed in production; only test fetch boundary redirects to loopback. Tests distinguish 204 submission,400 permanent,503/network retry, disabled consent and exact large integer fallback.
- wallet-billing.integration.spec.ts:27 PASS (24 existing +3 analytics cases), real PostgreSQL/app, fake PSP. Valid owned header and paid wallet/gateway create one purchase despite replay; compensated payment/top-up excluded; capture/payment race serialized; transaction rollback creates no delivery; concurrent claims disjoint and operational partition excludes analytics; retries/payload purge/tombstones/expiry; completed refunds after expiry remain financially successful with no analytics row. Actual registration and restricted COMPLETE projection preserve response/private fields; invalid/disabled context ignored.
- outbox.integration.spec.ts + identity-security-boundaries.spec.ts:11 PASS; identity nine cases rerun PASS after explicit analytics-header redaction assertion.
- Browser pure context/core:10 PASS; actual Chromium SDK/transport/handoff:4 PASS including optional header, original bearer/body/response and opt-out. Remote Google resources intercepted.
- Existing frontend targeted API/auth regressions: app12 and web10 PASS.
- API source/build and test TypeScript checks, generated SDK build, both frontend production builds:PASS.
- OpenAPI export/regeneration PASS. Recursive comparison after removing only the additive X-Analytics-Context header found zero unrelated contract differences; generated whole-document diff is expected.
- Three compose YAML parses and both runtime-config/Sadad regression scripts PASS.
- Main-agent settlement/ownership/concurrency/security/retention/scope review and git diff --check PASS. graphify update . PASS (AST only, existing extractor/dependency warnings retained); generated graph artifacts remain ignored.

Acceptance: real event times and property-scoped GA IDs, no account user_id/private content; local idempotency and bounded 24-hour/session-window delivery on the existing API/PostgreSQL infrastructure. Financial enqueue is in the actual settlement/refund transaction, no external HTTP inside it. Existing operations retain authorization and financial evidence. Owner explicitly chose no long-term attribution: expired-context refunds stay only in financial records. Source/operator details in config/ANALYTICS.md.

Limits: software acceptance only, not live GA4 ingestion. HTTP2xx is submission; ambiguous failures can duplicate external custom/refund events despite local dedup. Signup/assessment/immediate appointment capture is post-handler best-effort with a crash gap. Missing/stale browser IDs skip conversions; snapshot consent does not revoke already queued context. Custom rial metric, item cap100, generic paid-service count and eventual bounded physical cleanup are documented. AN04 must verify real property/domain/session behavior, full authenticated journey and applicable consent/revocation policy before activation. No new schema/service/activity archive, push/deploy or production secret. Next AN04 eligible, not started under per-task boundary.

## Analytics AN04 local acceptance and live handoff

Task: F12-FE01-AN04 / ANALYTICS-04, 2026-11-06 Asia/Tehran.
Agent/Reviewer: sole Codex /root. Depends AN03 DONE, baseline d92e156.
Status: IN_PROGRESS; local software review PASS, complete live gate pending. Not DONE,
no final task commit. Same task/claim continues when the missing target setup is supplied.

Changed files: apps/api/test/analytics-browser-test-support.ts and wallet-billing.integration.spec.ts;
config/ANALYTICS-ACCEPTANCE.md, config/ANALYTICS.md and plan status/checklist/log. No production
application logic, schema, migration, new dependency/service or user-owned file changed.

Verification:
- Fresh dedicated PostgreSQL17 container mushroom-analytics-an04-test, bound only to
  127.0.0.1:55424/wallet_test; all112 existing migrations and synthetic seed PASS.
- Explicit ANALYTICS_BROWSER_TEST=1 in existing isolated wallet suite:28 tests PASS,
  including one new three-scenario integration. Actual production Next app at private
  port3311, real listening API and real PostgreSQL ownership/settlement. Real UI wallet
  confirmation → paid order/receipt → reload, no browser purchase fabrication. Granted
  context produces one local purchase and real worker/transport JSON over loopback HTTP,
  then payload purge. Denied consent/blocked Google getter still complete payment with
  no conversion queue. Mobile390/desktop1440 exercised; no page exceptions or failed
  business API responses. Bearer preserved, private query/user/order identity excluded
  from browser analytics; user identity excluded from server payload.
- Harness initially caught misuse of Nest listen return type; corrected to await getUrl,
  then API test TypeScript check and the focused/full browser integration passed.
- node --experimental-strip-types --test config/analytics.test.mjs config/analytics-context.test.mjs:
  10 PASS. node --test config/analytics-browser.test.mjs config/analytics-journey.test.mjs:
  4 PASS (intercepted Google; no real property writes).
- Full wallet suite emitted pg's concurrent-client-query deprecation warning (future
  pg9 behavior); no failed assertion. Dependency upgrade/refactor is outside this task.
- Source review confirms no frontend public secret, operational activation or changed
  original architecture. Production build from AN03 reused unchanged; no unnecessary
  frontend rebuild. Test helper owns/stops its frontend and restores ignored runtime output.
- graphify update . PASS (AST only; existing extractor warnings retained); git diff
  --check PASS. Dedicated test container stopped/removed after verifying its owned ID;
  existing services/databases untouched. No final task commit while live gate is pending.

Operator checklist includes the actual flow, stream/domain checks, custom rial reporting,
key-event choice, strict Google validation versus real ingestion evidence, retention and
stop-collection limits. Primary Google validation/cross-domain/currency docs checked
2026-11-06; sources linked in the checklist. Validator success does not certify credentials
or receipt; the validator does not create report events.

Remaining: owner answered that GA4 exists and will send the public G-... Measurement ID,
but no value has arrived. Need the intended controlled environment, private API secret
available by file path (not a chat value), real SDK identity/property receipt evidence and
collection/revocation policy sign-off. Browser test substitutes synthetic auth bootstrap
and Google getter/outbound destination only: it does not certify actual OTP/login, bank
processing, native Google identity or property reports. No actual account configuration,
production collection, financial transaction, push/deploy or next batch. Continue this
claim for live acceptance; keep AN04 unchecked until the gate is complete.

### AN04 Dev stream and actual Google browser receipt follow-up

2026-11-06, same single /root claim. Owner supplied and Google UI confirmed Mushroom - Dev Web,
https://dev.drshirmardi.com, stream16282576410, G-KXRZ89EFTY; Enhanced Measurement switch OFF,
0 connected site tags observed. Owner completed Google sign-in in the connected browser and
explicitly reported the private API secret file is not prepared. No secret was requested,
created, read from the UI, logged or stored in source/public runtime.

Scope extension inside AN04: existing config/analytics-browser.ts, GA4 server transport and
environment validation; runtime generators/compose public flag wiring; dev/production env
examples; explicit analytics.dev.env.example; browser/transport regressions and new
scripts/test-analytics-runtime.mjs. No second Google loader/tag/GTM container or new service.
PUBLIC_ANALYTICS_DEBUG defaults false, true adds debug_mode at dispatch/transport only;
false omits that field entirely. It does not enable denied collection or disabled server
delivery. The specific Dev ID lives in the public environment example, not application code.
Production example remains empty-ID/denied/debug-false/server-false.

Actual live test: production-built current web app served locally on3310, using the real
Google script and Dev property. Existing local-only anonymous auth stub on3319 prevents
any login/OTP/financial/clinical request to a real API. Harmless campaign an04_acceptance /
local_test and explicit hero CTA exercised. Actual Google UI showed page_view,
cta_impression and cta_click in DebugView; Realtime showed one active user and those event
names. Received data is from local acceptance code, not a deployed dev.drshirmardi.com
certification. Dev public runtime was fetched read-only and had existing web/app/API origins
but no analytics settings yet. No remote deployment/configuration or Production activation.

Important live-only finding and correction: per-config send_page_view=false alone still
allowed one extra automatic initial view with the document title/raw query URL. Real CDP
network inspection reproduced it while dataLayer had just one manual page view. Added safe
global gtag set defaults (send_page_view false, logical location, static title, origin-only
referrer, advertising flags false) BEFORE destination initialization. After rebuilding and
reloading with the actual Google script, observed ONE gtag loader, ONE manual and transmitted
page_view, static Mushroom title, /landing path and no query. The other batched request held
two cta_impression events only; later observation had no extra collection request. This
fix stays in the existing shared loader. No copied raw query/client/session identifiers or
Google secret in saved evidence. DebugView/Realtime observed through authenticated UI;
no external reporting API credential or DOM-injected sender used.

Verification: failing-first browser DebugView test and server loopback debug test failed
before implementation, then passed; additional safe-global-default assertion failed before
the correction and passed after. Final five Chromium SDK/handoff/transport cases PASS;
analytics protocol/actual-loopback transport/environment validation12 PASS. Actual runtime
generator test PASS for disabled defaults, explicit debug and exclusion of synthetic private
secret. Runtime/Sadad scripts, three compose YAML parses, API source/test TypeScript and
both frontend production builds PASS. Frontends rebuilt again only after the live extra-view
finding/fix. Graphify AST refresh PASS with existing extractor warnings. No dependency,
schema/migration, operational data or financial logic changed. Earlier28 isolated wallet
tests remain evidence for that unchanged financial integration; no unnecessary DB rerun.

Remaining: owner privately creates the stream API secret file and supplies its path, then
controlled server validation/actual receipt can proceed. Dev deployment and actual-domain
cross-domain/full-authenticated/policy sign-off remain distinct gates. No final task commit
or DONE while those remain open. Follow config/ANALYTICS-ACCEPTANCE.md; same claim continues.

## Analytics AN04 software publication gate

Task F12-FE01-AN04 / ANALYTICS-04, 2026-11-06 Asia/Tehran. Sole /root implementation and
main-agent review PASS. Owner explicitly authorized separating software readiness from
post-merge operational validation, adding secure Dev installer support, committing/pushing
this branch and opening a PR to dev. This supersedes prior no-commit notes for AN04.
AN04 DONE/software; AN05 records outstanding operational work and remains unchecked.

Changed paths: existing AN04 analytics tests/browser safe-global defaults/runtime-debug/
transport/configuration/deployment/operator documents, plus installation/{manager.py,
test_installation.py,README.md}, apps/api/.env.example, compose.production.example.yaml,
deploy/vps/deploy-dev.sh, scripts/test-vps-dev.sh and synchronized plan contract/evidence.
BUNDLE_FILES includes only public Dev profile/operator docs, never actual secrets.

New setup-analytics --environment dev and panel option accept disabled/browser/server,
validate public Measurement ID and DebugView selection, and collect the stream API secret
through existing hidden-input validation. Atomic private file0600/runtime-owner writing
precedes public activation. Existing secret replacement is explicit; disabled retains it;
symlinks/nonregular paths and other environments are rejected. Configuration changes do
not touch unrelated settings, real external credentials, GA4 settings or Production.

Dev sync now fingerprints public analytics config and the private secret hash inside the
existing composite runtime hash: enable/disable/debug/rotation triggers the normal runtime
recreation. Secret plaintext is absent from arguments/logs. Corrected missing API env example
and generic production example settings exposed by the installer environment audit; all
38 API schema keys now covered. No new schema/migration/service/dependency.

Verification:
- Failing-first installer tests failed on missing functions; implementation then PASS.
- python -m unittest discover -s installation -p test_*.py:61 cases,53 PASS/8 pre-existing
  platform/tool skips on Windows. Five added analytics cases cover private persistence,
  reuse/replacement, disabled preservation, secret validation/symlink/nondev rejection.
- Official python3.13-slim Linux container, read-only source mount:69 cases,63 PASS/6
  unavailable-tool skips; POSIX secret/symlink/hidden-input cases run. Container --rm.
- bash scripts/test-vps-dev.sh PASS, including new analytics setting and secret-rotation
  recreation and plaintext-absence cases, existing no-op/provider/readiness/locking cases.
- installer audit-env (all38 API keys), --help, allowlisted bundle build PASS.
- Five actual Chromium SDK/transport/journey cases and12 API protocol/loopback transport/
  environment tests rerun PASS; actual runtime generator secret-exclusion/default gates PASS.
- Existing AN04 evidence retained:28 actual PostgreSQL wallet cases including production
  app-to-API/DB/worker/loopback chain;10 pure tests; API types and both production builds;
  actual Google script/client and authenticated DebugView/Realtime browser receipt.
- graphify update . and git diff --check PASS. Scope/security/publication review PASS.

No actual secret/VPS setup/merge/deployment performed. Next AN05 after reviewed merge and
Dev deployment: owner hidden secret entry, deployed-domain/native cross-domain/full auth,
actual server Google receipt and applicable policy sign-off. Production remains disabled.

## Analytics AN04 CI repair and runtime-image blocker

2026-11-06, sole /root, PR36, baseline492672d. User requested repair after failed CI.
Same corrective batch has independent CI01 code/dependency repair and CI02 image gate.
CI01 DONE/local main review PASS; CI02 BLOCKED, overall PR is not declared green.

Evidence: CI129/run42135630681 security job127622909237 fails on Joi GHSA-4528-x5fx-h6hg /
CVE-2026-118772, installed18.2.9; verify job127622909317 fails only on existing dashboard
mizaj-chart.tsx render callback reassignment of offset. Installer run42135630829 PASSED,
release-contract PASSED. All four runtime scans in run42135630816 fail separately.
Downloaded actual dashboard/API scan JSON artifacts (13466146283/13466471233): dashboard
reports zlib1g CVE-2026-76844 HIGH, no FixedVersion; API reports that plus vulnerable Joi.

CI01 changed apps/api/package.json and pnpm-lock.yaml only for Joi18.3.1 and its existing
peer-resolution references/integrity; preserved unrelated resolutions despite pnpm update
initially refreshing other entries. Frozen install PASS. Dashboard mizaj-chart.tsx computes
prefix offsets before JSX rather than mutating a captured variable in render. Same units,
order, labels, colors and arc positions retained; no rule disabled or unrelated refactor.

Verification: reproduced original single lint error before edit; final workspace lint
PASS with9 unchanged warnings. Production audit --prod --audit-level high PASS (0 High/
Critical;16 lower severity advisories remain).12 environment/protocol/transport tests,
API test TypeScript, dashboard typecheck/build and5 assessment authoring tests PASS.
Graphify AST refresh/diff review PASS. No full database rerun for unchanged financial
logic and no live/provider/config mutation. Dedicated CI01 task commit is complete;
CI02 remains separate and uncommitted because no approved fix is implemented.

CI02: actual pinned Distroless nodejs24-debian13/nonroot image locally contains zlib1g
1:1.3.dfsg+really1.3.1-1+b1, matching scan. Debian stable package page still lists this
version and scan has no fixed version. Official source checked:
https://packages.debian.org/trixie/zlib1g
https://github.com/advisories/GHSA-4528-x5fx-h6hg (Joi patched18.3.1).
Remote latest manifest HEAD check returned403, so no latest-image remediation is claimed;
background pull was stopped through its own exec session after inspection. No digest
change, handcrafted binary replacement, vulnerability waiver, severity exclusion or
scanner relaxation. Safe next action: wait for verified patched stable upstream image or
obtain owner approval for a concrete maintained-runtime alternative/ADR, then scan and
smoke-test every real artifact. Do not merge PR36 or begin Dev activation under a red gate.

## Analytics runtime scan temporary suspension

Task: F12-FE01-AN04-CI02-D01; 2026-11-06; sole /root; owner explicitly requested
stopping the investigation, temporarily disabling the failing scan, committing on the
same branch and opening a replacement PR to dev. This supersedes earlier instructions
against suspending that check; it does not resolve the zlib vulnerability.

Changed .github/workflows/container-checks.yml: artifact-job flag
RUNTIME_IMAGE_SCAN_ENABLED=false skips Trivy runtime scans and dependent report upload
for api/web/app/dashboard. Build, disposable smoke, release contracts and independent
dependency security checks retain their current behavior. Restore this flag to true
after CI02 verifies a patched runtime. No runtime library, image digest, application
logic, scan severity or release publication workflow changed. CI02 remains deferred.

Verification: actionlint1.7.12 PASS for the changed workflow (shellcheck omitted because
no shell changed). Release pipeline contract suite PASS in an isolated git-archive LF
checkout with the changed workflow overlaid; direct Windows checkout initially fails
bash parsing of pre-existing CRLF deploy/vps/dev-service.sh. No unrelated file normalized.
Diff/scope review PASS; only workflow and task evidence/status/checklist changed.

CI130 also exposed reporting-query-plan setup, Mezaj submission, migration fixture and
OpenAPI parameter-order failures. These are not disabled or repaired by this task.
CI02 experiments stayed outside the repository; even the real upstream1.4 probe still
reported a finding, so no remediation success is claimed. No merge/deploy authorized.
Next action: review replacement PR checks; later resume CI02 and restore scan flag.

## Analytics PR37 verify fixture and contract repair

Task: F12-FE01-AN04-CI03; batch F12-B17; 2026-11-06 Asia/Tehran; sole Codex /root on
codex/analytics-ga4; baseline c54105d. PR37 run42141309219 / verify job127642447433 failed
after lint, TypeScript, installer, image build and dependency security had passed. The
scope was restricted to the four failing API test files and their evidence.

Confirmed causes, reproduced first on a disposable PostgreSQL database:
- reporting-query-plan.integration.spec.ts created COMPLETE/IN_PROGRESS submissions with
  neither access_grant_id nor entry_patient_id. Migration 20261031105000 intentionally
  raises `New attempts require owned initial entry or paid access`; the fixture, not the
  query-plan assertion or trigger, was stale.
- mezaj-results.integration.spec.ts used the retired public generic start endpoint with a
  completed profile-only entry. The service correctly returned 409
  ASSESSMENT_PAYMENT_REQUIRED because a new attempt needs the owned initial-entry path or
  paid access. The fixture now creates its own published fa-IR MEZAJ family and enabled
  free entry policy, then uses profile -> entry/start -> save -> submit -> entry/complete
  and reads the immutable result. A second patient with no result gets 404 from
  patients/me/mezaj.
- migrations.integration.spec.ts inserted a submission without an entry origin after all
  migrations. The smoke fixture now creates the matching patient_entries row and binds
  its submission_id, preserving the migration replay and all later constraints.
- openapi-contract.spec.ts assumed parameters[0] was the path parameter. The global
  optional X-Analytics-Context header now precedes it. The assertion now locates
  name=appointmentId/in=path and still requires required=true plus UUID format; no
  contract source changed.

Changed paths:
- apps/api/test/reporting-query-plan.integration.spec.ts
- apps/api/test/mezaj-results.integration.spec.ts
- apps/api/test/migrations.integration.spec.ts
- apps/api/test/openapi-contract.spec.ts
- plan/STATUS.md, plan/phases/12-PRODUCTION-HARDENING.md, this log

Verification:
- Pre-fix disposable PostgreSQL run of the four files: 3 tests failed and the
  reporting suite stopped during setup; the exact CI messages were reproduced.
- Post-fix targeted run: 4 files passed, 14 tests passed.
- `tsc -p tsconfig.test.json --noEmit`: PASS.
- `pnpm --filter @sabz-zendegi/api test`: 118 files passed / 34 skipped; 582 tests
  passed / 611 skipped.
- `pnpm lint`: PASS with the same 9 pre-existing warnings.
- `graphify update .`: PASS with existing extractor warnings; `git diff --check`: PASS.

No trigger, access predicate, test skip, dependency, migration, schema, runtime scan,
analytics architecture or Production setting changed. CI02 remains deferred and the
runtime image scan remains disabled. Hosted PR37 rerun is the remaining gate.

## PR37 isolated assessment suite repair

Task: F12-FE01-AN04-CI03 (same batch F12-B17); 2026-11-06 Asia/Tehran; sole Codex
/root. The first hosted rerun, run42146937593 / verify job127660577535, passed lint,
TypeScript, the full `pnpm test` step and all later build/smoke steps up to the isolated
assessment database step. That previously skipped step then failed because eleven
pre-existing files still created new attempts without the owned initial-entry or paid
access required by the current database contract; the isolated step also lacked a
synthetic `SMS_CREDENTIAL_ENCRYPTION_KEY` needed by the marriage-phone fixture.

No access rule, trigger or test was disabled. The fixtures were adapted to the current
contract:
- `patient-entry-test-support` now leaves the shared synthetic entry uncompleted so the
  same row can serve as the exact owned initial-entry origin. No trigger bypass is used.
- `PatientAssessmentsService.start` can reuse only an entry already bound to the exact
  source, uncompleted/unsubmitted and not consumed by any submission. A consumed entry
  does not reopen a second free attempt, so the public free-start boundary is retained.
- Reporting, Mezaj migration, discovery, guidance, protocol, purchase, care,
  assigned-consultation, reliability and patient-journey fixtures now use owned entry
  provenance, completed legacy rows for historical/capped data, and the real paid grant
  paths where those already existed.
- Second free attempts in the reliability suite are now asserted as rejected
  (`ASSESSMENT_PAYMENT_REQUIRED`), and completion-key scoping is verified across
  independent patients instead of an impossible second free same-patient attempt.
- The two stale adult-fallback assertions now exercise an under-18 birth date from both
  intake and initial-entry fallback.
- The isolated CI step exports a generated non-secret test-only SMS encryption key
  alongside the existing payment key.

Changed paths:
- `apps/api/src/modules/assessments/patient/patient-assessments.service.ts`
- `.github/workflows/ci.yml`
- `apps/api/test/patient-entry-test-support.ts`
- `apps/api/test/{assessment-care,assessment-discovery,assessment-guidance,assessment-protocol,assessment-purchase,assessment-reliability,assigned-consultation,couple-assessment,couple-link,patient-journey}.integration.spec.ts`

Verification:
- Full isolated 22-file command equivalent to the hosted step: 22 files passed;
  435 tests passed.
- `pnpm --filter @sabz-zendegi/api test`: 118 files passed / 34 skipped; 582 tests
  passed / 611 skipped.
- `tsc -p tsconfig.test.json --noEmit`, `pnpm lint` (same 9 existing warnings) and
  `git diff --check`: PASS.
- The runtime image scan remains disabled and CI02 remains deferred.

Hosted result: PR37 run42156349184 at head84b2115 completed all eight checks with
success: verify127691312043, security, installer, release-contract and the four artifact
jobs. The formerly skipped isolated assessment step and browser/access smoke step are
included in that successful verify job. Task accepted; claim released. No merge,
deployment, Production activation or runtime-scan re-enable was performed.
