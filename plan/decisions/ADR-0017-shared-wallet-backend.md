# ADR-0017 — Shared wallet and prepaid appointments backend

- Status: ACCEPTED for the owner-requested backend implementation, 2026-10-16.
- Authority: owner explicitly requested all backend work after reviewing the wallet proposal; online/custom and ADMIN credit/debit/set balance, wallet everywhere, and full payment before final booking are explicit requirements.
- Task: F12-WAL-BE01. This is one inseparable backend shared-contract operation: persistence, ledger, payment orchestration, commerce/appointments adapters, permissions, generated contracts and verification must agree before its task commit. It replaces the proposal's backend-only G01/G02/B01–B05 task split for this authorized run. UI work and live activation remain separate.

## Decision

Keep the modular monolith. Billing owns an IRR wallet, immutable balanced journal, versioned administrative adjustments, generic intents and provider-bound attempts. Reuse the existing provider registry, credential encryption/config revisions, Sadad adapter, callback endpoint and numeric sequence. Existing commerce attempts remain supported; new billing attempts are additive, with one shared callback dispatcher and retention coverage for both. This avoids making every historical order relation nullable merely to introduce top-ups. Order wallet settlement projects into the existing Payment model with an explicit WALLET method and journal proof; there is no fabricated gateway attempt/reference.

Domain-specific adapters own order inventory/discount settlement and appointment capacity/final creation. They register with a billing target registry; Billing does not import domain modules. All money-changing writes, target settlement and audit share a PostgreSQL transaction. Amounts are integer IRR internally and decimal strings at the wire; commerce TOMAN snapshots retain their original meaning.

New positive-priced appointment creation requires a paid booking intent, including ADMIN creation. Existing appointments remain legacy records. Existing clinical confirmation is separate from payment. Holds default to 10 minutes, bounded through validated deployment configuration; expiry and late successful bank payments cannot take another patient's slot. Late received funds become traceable wallet compensation, with no appointment created. Zero-priced services require no artificial financial transaction. Paid rescheduling to a different price is rejected with an explicit cancel/rebook action: no unexpected additional debit or rewriting the original paid amount. Same-price rescheduling remains supported. Cancellation before service start refunds wallet payments; bank refunds remain manual, evidenced and audited. No-show/after-start refunds are ADMIN decisions.

ADMIN can CREDIT, DEBIT or SET_BALANCE with a mandatory reason, expected account version and idempotency key. These are real spendable credits without PSP Verify. Ledger/audit record actor, before/after and source; manual credit is neither bank collection nor sales revenue. No direct history-free balance overwrite, cash-out or user transfer exists.

Backend acceptance does not declare the whole feature delivered: app/dashboard integration, browser acceptance and production gates remain open. No real database migration, live PSP transaction, deployment or secret change is authorized by this local implementation.

## Validation

Disposable PostgreSQL clean migration/upgrade, journal constraints and concurrency, administrative adjustment/replay/conflict/authorization, top-up and gateway retries, wallet order and appointment settlement, cancellation/refunds, reports, generated OpenAPI and consumer type compatibility. Record exact evidence in the Phase 12 log. Preserve unrelated frontend edits.
