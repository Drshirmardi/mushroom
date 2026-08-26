# Mushroom — Stable Project Memory

## Product

Mushroom / Sabz Zendegi is a healthcare product with three delivery surfaces:

- `apps/app`: patient-facing client
- `apps/dashboard`: clinic/admin operations
- `apps/api`: NestJS API backed by PostgreSQL and Prisma
- `packages/api-client`: generated OpenAPI contract consumed by the frontends

## MVP decisions

- One `ADMIN` controls the dashboard now; granular roles and staff access come later.
- A new patient completes medical onboarding and consent first.
- The doctor creates a versioned main assessment. Dashboard policy can make it required or optional before booking.
- Completion of a valid assessment, not its score, controls the booking prerequisite.
- Booking, clinic schedule, encounters, prescriptions, and treatment follow after onboarding/assessment.
- AI, advanced automation, commerce/payment, and chat are deferred until the clinical core works end to end.
- Dashboard widgets without a real data source stay hidden; never show mock or fabricated zero values.

## Delivery order

1. Finish onboarding/consent verification.
2. Build main assessment and configurable booking eligibility.
3. Build clinic, doctor, service, tariff, and availability management.
4. Build booking plus dashboard calendar/queue operations.
5. Build encounter/clinical workspace, then prescription/treatment.

## Non-negotiable engineering boundaries

- Code, executable tests, migrations, and generated contracts are the source of truth.
- Medical onboarding is self-reported and does not become a clinical diagnosis automatically.
- Medical reads/writes, consent, admin correction, and sensitive account changes require authorization and audit.
- Published clinical/assessment versions are immutable; changes create a new revision/version.
- Frontends consume the generated API client; shared contract/schema files have one writer.
- Preserve unrelated local changes and the protected files named in `AGENTS.override.md`.
