# Data Model: Phase 10 — Chat & Online Consultation

This is a `F10-T02` design boundary only; it authorizes no schema, migration, or generated output in `F10-T01`.

## Entities

| Entity | Required boundary |
|---|---|
| Conversation | Stable UUID, unique appointment binding, clinic/patient/doctor references, optional close timestamp; no standalone/group/public kind. |
| Participant | Historical patient/linked-doctor/clinic-operator sender facts; current authority is dynamically checked, never inferred from a null doctor user link. |
| Message | Stable ID, conversation, server sequence, immutable text, sender identity/role, clientMessageId idempotency data, `VISIBLE`/`RESTRICTED` visibility. Maximum 4,000 Unicode characters; no attachment fields. |
| Receipt | Participant/conversation high-water `lastDeliveredSequence` and `lastReadSequence`, monotonic only. |
| ModerationReport | Message/conversation/reporter/category, non-sensitive explanation, display-safe status and resolution evidence. |
| ConversationBlock | Conversation-only `PATIENT_DOCTOR` or `PATIENT_CLINIC_OPERATOR`, pending/confirmed/lifted state and effective decision facts. |
| RetentionHold | Legal-hold facts that prevent future disposition; Phase 10 creates no disposition job. |
| Presence | Ephemeral lease, not appointment/encounter state; 15-second heartbeat and 45-second expiry. |

## Integrity requirements

- Database uniqueness: appointment-to-conversation; `(conversationId, sequence)`; and sender/conversation/clientMessageId.
- Index history by `(conversationId, sequence)` and moderation/report/block by conversation/message/status.
- All persisted chat records are clinic-scoped. Audit metadata uses IDs/action/categories only, never chat/medical text or PII.
- The retention baseline is 10 years after later appointment terminal timestamp or conversation close; legal hold blocks future destructive disposition.
