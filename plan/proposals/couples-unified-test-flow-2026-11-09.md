# Two-person test: unified patient flow (2026-11-09)

Status: IMPLEMENTATION_IN_PROGRESS, branch `codex/couples-unified-test-flow`; **not** a database/data migration. Source `plan/README.md`, `plan/contracts/marriage-service-v1.md`, `plan/decisions/ADR-0047-marriage-service-phone-invitations.md`.

## Product decision

Show **تست** in all new patient UI, never a new **آزمون** label; preserve publisher-owned test titles and versioned consent documents exactly as saved. Three primary patient screens:

1. `/assessment/couples`: real published MARRIAGE/PAID test offers, embedded invite form after `?start=<publication UUID>`, pending incoming invites, current sent/accepted requests, and paginated history.
2. `/assessment/marriage/requests/[id]`: self-owned or intended-verified-recipient request details; PENDING → link copy/SMS or recipient consent/accept; ACCEPTED → inline `EducationalCoupleWorkspace` for independent processing/sharing consent, purchase/pending payment, own access and resume.
3. `/assessment/couples/educational/result/[id]`: server-authorized two results and publisher-provided joint interpretation.

Shared `/assessment/resume` and `/profile/wallet/pay` stay independent. Canonical `/assessment/marriage/new/[id]` and `/assessment/marriage` URLs redirect to the main view. `/assessment/couples/educational/[id]` redirects only when a validated `marriageRequestId` is given, retaining direct legacy educational access otherwise. Older `/assessment/couples/legacy`, `/assessment/couples/links/[id]`, `/assessment/couples/[id]` remain for owned historical records.

## Backend contracts: unchanged

- `MarriageRequestService`: phone (encrypted/fingerprinted), explicit `FIRST`/`SECOND` semantic role, profile eligibility, PENDING/ACCEPTED/CANCELLED/REPLACED, atomic accept→educational create, idempotent command, independent SMS. No inferred delivery.
- `CoupleSession` tracks linking; `EducationalCoupleSession` and `EducationalCoupleParticipant` track participation/consent. Their IDs differ from `MarriageServiceRequest.id`.
- Processing consent, joint disclosure and payer terms remain independently accepted and pinned to immutable hashes. Either eligible participant can pay, one captured payment grants two *independent* self-owned accesses. Partner answers never leak through a list or convenience endpoint.
- Paid-only marriage offerings are eligible for **new** creation; do not surface unimplemented free starts. Retained free or historical owned grants may still be accessed by their original guarded URLs.
- Keep source/version/role-sensitive `jointText` intact. No client-side compatibility score or bypass of result authorization.

## Dependencies checked

`apps/app/src/app/(app)/assessment/page.tsx`, `apps/app/src/lib/marriage-context.ts`, `marriage-return.ts`, `marriage-profile-return.ts`, `payment-return.ts`, `apps/app/src/app/welcome/page.tsx`, `profile/wallet/payment-result/page.tsx`, old URLs and legacy Journey actions. Dashboard offering authoring (`marriage-settings.tsx`, `inline-offering-form.tsx`) is intentionally unchanged.

## Before deleting any legacy route or model

Run the aggregate-only SQL in `plan/proposals/couples-unified-readonly-audit.sql` on the real **DEV** PostgreSQL database. Inspect old sessions, paid records, grants and independent educational contexts. Counts alone do not authorize deletion: check ownership and link dependencies and get explicit owner approval. No data mutation, migration or destructive route removal in this PR.

From a repository checkout on the Dev server, with `mushroom-dev-postgres-1` running:

```bash
docker exec -i mushroom-dev-postgres-1 sh -lc 'exec psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < plan/proposals/couples-unified-readonly-audit.sql
```

The command prints aggregate counts only. If container/env names differ, inspect them without printing database credentials; do not guess connections.

## Verification gates

- Unit `couples-flow.spec.ts`, `marriage-profile-return.spec.ts`, `marriage-return.spec.ts`, `marriage-request-guidance.spec.ts` and existing invitation loaders.
- Browser `apps/app/e2e/couples-unified.browser.mjs` (intercepted APIs; no real payment or SMS), plus existing invitation-login, profile-return, entry-continuation, request-polling, payment/result and history flows.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, GitHub CI. Manual real two-account + real PSP/SMS acceptance remains a distinct environment/operator step.
- No direct merge/deploy to `dev` in this branch until review.
