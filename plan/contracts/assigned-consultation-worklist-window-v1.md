# Assigned worklist operational-window addendum v1 — FROZEN

Phase12/F12-PJ-D02/ADR-0029, additive to assigned-consultation-operations-v1. Main review reproduced an ongoing visit with startsAt now−4h15m and endsAt now−3h45m: completion remained allowed within the existing endsAt+4h operational window, but the default now−4h start-date filter hid it from the worklist.

Default worklist therefore includes its ordinary start-date range plus owned CHECKED_IN/QUEUED/IN_PROGRESS appointments whose endsAt is within the preceding4hours, retaining the existing upper start bound/status/doctor/clinic/patient/page constraints. It does not extend consultation eligibility or reopen terminal appointments. Explicit from/to filters remain strict start-date ranges. This is derived query behavior, no new state/table/index or changed old admin/chat/clinical contract. Keep the failing real PostgreSQL regression as acceptance evidence.
