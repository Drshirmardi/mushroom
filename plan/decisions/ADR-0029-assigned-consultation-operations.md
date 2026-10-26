# ADR-0029 — Reuse existing visit operations behind an assigned-physician facade

- Status: ACCEPTED technical backend integration under continuous owner authorization,2026-10-17.
- Task: Phase12/F12-PJ-D02; assigned-consultation-operations-v1. Existing frozen admin booking/clinical/chat contracts remain unchanged.

The current clinician lacks a narrow assigned worklist and start/end channel; granting blanket appointment management would expose unrelated clinic operations. Add strictly assigned current qualified doctor/read-edit capability routes, minimal metadata and existing D01 readiness, retaining the original appointment/Encounter and text-chat models. No new consultation session/engine or default capability grant.

Expose transaction-aware internal start/complete seams from the existing service. Stabilize doctor→appointment locking and re-read before the supplied assigned authorizer, preserving old admin wrappers/response contracts. This keeps assignment, current professional authority, mutation and clinical audit atomic and makes concurrent same-target repeats safe. Use one bounded bulk patient audit for worklist reads. Preserve payment/check-in/queue/text/history/privacy/clinical review and separate release gates; voice/video remain unsupported.
