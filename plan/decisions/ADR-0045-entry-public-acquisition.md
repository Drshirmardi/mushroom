# ADR-0045 — Initial entry and public assessment acquisition

Date: 2026-10-31
Status: Accepted by explicit owner implementation request.

One questionnaire/scoring version can serve both initial entry and public paid
retakes. Independent distribution metadata controls public acquisition without
mutating source content. A unique entry-origin submission separates one-time
onboarding from commercial grants; no duplicate scoring engine or fake clinical
review is introduced.

The owner removes the additional initial-entry acceptance step. Entry therefore
records no invented processing/terms acceptance. Existing historical/public
acceptances and independent couple sharing permissions are preserved. New public
FREE acquisition is replaced by entry-only free access, with existing rights
retained rather than deleted or relabeled.

Positive entry fees use a dedicated ENTRY_ASSESSMENT target in shared billing,
with exact server-derived price/source,900-second quote, real wallet/PSP proof,
atomic paid-entry binding and immutable price/payment evidence. Free entry creates
no financial record. A paid entry may explicitly permit deferral; the entry remains
incomplete and is resumed from a Home reminder, with no second charge after payment.

Medical DOB remains the commercial age source when present; saved entry DOB is
used when no medical DOB exists, preserving the18-year financial threshold
without manufacturing a medical intake. Already-started legacy free entry remains
free after policy price changes. Generic administrative billing/patient views do
not gain raw paid-entry answers.

Public retakes produce separate results; latest valid Mizaj updates the profile.
Current/pending ownership, source-level reservation locks, independent couples
and exact financial verification remain mandatory. Existing purchases, scoped
texts, results and physician reviews are not backfilled or erased.

Contract: ../contracts/assessment-admin-offering-v2.md.
