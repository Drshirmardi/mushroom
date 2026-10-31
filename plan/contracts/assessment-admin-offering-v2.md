# ADMIN educational assessment offering v2

2026-10-30 — F12-FE01-MZ05, owner-approved implementation plan.

New writes accept title, kind INDIVIDUAL/COUPLES, priceMode FREE/PAID,
amountRial only for PAID, and inline processing/retention/visibility text;
purchase terms only for PAID and disclosure text only for COUPLES.
The server derives algorithm identity from the exact questionnaire (including
DIMENSION_TIEBREAK versions1/2), assigns offering identities, and atomically
publishes questionnaire/offering/documents with retry-safe command identity.
Publication provenance is ADMIN_PUBLISHED, never a fabricated physician review.

Consent policies may belong to exactly one assessment offering version. The
legacy clinic-wide active-policy uniqueness remains for unscoped policies;
scoped policies have independent lifecycle and may only use assessment purposes.
Their offering, clinic and locale must agree. Published scope is immutable.
No existing document is backfilled, retired, deleted or relabeled.

User acceptance stays exact, owned and purpose-bound. Couple disclosure needs
two independent participants; neither ADMIN publication nor payment grants
another patient's access. FREE access never creates a financial receipt or
wallet entry; PAID retains actual verified billing evidence. Existing legacy
contracts and SQL guards must be migrated explicitly, not bypassed.

Joint results display both actual results/charts, including ambiguity; optional
unordered profile-pair text has no required complete matrix and no invented
compatibility score. Existing scalar results and MZ04 sequential paths remain.

Rollout order: scoped schema and validation; atomic ADMIN publication; access
and billing; couples; dashboard/app and contracts; fresh/populated database,
concurrency/privacy/payment/browser acceptance. This document is a contract,
not evidence that all stages are implemented.


## Owner-final entry/public contract — 2026-10-31

This section supersedes the original public FREE/PAID matrix above. New public
attempts require PAID acquisition; the one free attempt is reserved for initial
entry. Existing free receipts/grants, acceptance records and results are retained
and remain governed by their existing read/resume checks.

Distribution is mutable metadata on the exact questionnaire version, separately
from immutable source/scoring. Default public visibility preserves legacy settings;
a published paid offering is required for catalog exposure. Hidden sources reject
new public starts/purchases, including direct URLs; retained owned results and
already reserved payment quotes are preserved.

One active clinic entry selection has an editable introduction, independent
nonnegative IRR price (zero is free), and optional paid-entry deferral, default
false. Existing completed accounts never re-enter enrollment. Started entry pins
its source and price; legacy already-started free entries remain free without any
row rewrite. Deferred entry stays incomplete, produces a Home reminder and can
be resumed explicitly.

Initial entry has explicit unique submission entry_patient_id provenance and no
additional acceptance checkbox or fabricated consent rows. A positive entry
price uses ENTRY_ASSESSMENT on the existing wallet/gateway/Verify service. The
server determines patient/source/price, quotes for900 seconds and records the
paid intent against the exact entry only after real financial evidence. Deferred
constraint guards require the matching wallet debit or verified noncompensated
bank proof. Free entry creates no invoice/journal/PSP attempt. Reserved entry and
public purchases share source-level pending guards to avoid double reservation.

Every deliberate public retake creates a new paid attempt/result; prior results
remain immutable. Public detail exposes publicPurchaseAvailable and
pendingIntentId for correct retake/resume UI. Completed educational couple contexts
can create a new independent context, while pending contexts are reused under
link locks; participant/result privacy remains independent. The newest valid
DIMENSION_TIEBREAK result updates the profile's Mizaj result, preserving older
valid results when a later attempt is ambiguous or insufficient.

Migration-first deployment is required. Local acceptance evidence is recorded in
the phase12 completion entry; no live deployment or commit is implied.
