# ADR-0008: PostgreSQL outbox for Phase 08 reminders

## Status

Accepted for Phase 08.

## Decision

Reminder-producing mutations enqueue a uniquely keyed `OutboxEvent` in the same PostgreSQL transaction as their source change. A process-local polling worker claims pending rows, records attempts, and returns failures to a retryable state. It does not call external providers before the source transaction commits.

## Consequences

No Redis/BullMQ is introduced at bootstrap: Phase 08 currently needs a durable reminder path, not a separate queue deployment. `F08-T07` owns reminder event creation and notification delivery handlers; this ADR does not create a reminder itself.
