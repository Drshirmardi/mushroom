# Phase 07 Adoption Contract Boundary

`plan/phases/07-PRESCRIPTION-TREATMENT.md` is authoritative for Phase 07 scope, task IDs, ordering, and exit rules. This contract records no route, schema, or implementation decision.

## Stable task ownership

| Authoritative task | Preserved boundary |
|---|---|
| `F07-T01` | Prescription draft/issue/amend lifecycle and safety rules. |
| `F07-T02` | Prescription/treatment/task/adherence migration. |
| `F07-T03` | Prescription create/draft/issue/revision interface. |
| `F07-T04` | Treatment medication/session/exercise/nutrition plan interface. |
| `F07-T05` | Task schedule and idempotent medication/task recording. |
| `F07-T06` | Real progress calculation and timeline. |
| `F07-T07` | Prescription builder and dashboard patient workspace connection. |
| `F07-T08` | App treatment connection. |
| `F07-T09` | Permission, audit, and contraindication-warning contract. |
| `F07-T10` | OpenAPI/generated client and in-scope mock/local-state removal. |
| `F07-T11` | Immutability, amendment, ownership, and browser E2E. |
| `F07-T12` | Evidence. |

## Non-negotiable Phase 07 outcomes

- An issued prescription is immutable and corrected only through revision.
- Medication/exercise schedules are the future reminder source.
- Treatment-task and adherence records persist across refresh and devices.
- Progress derives from real events.
- The dashboard issue → app display → patient log → dashboard review path passes.

No task is claimed, activated, or completed by this document.
