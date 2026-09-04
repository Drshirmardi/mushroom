# Phase 07 Adoption Contract Boundary

`plan/phases/07-PRESCRIPTION-TREATMENT.md` is authoritative for Phase 07 scope, task IDs, ordering, and exit rules. This contract records no route, schema, or implementation decision.

## Stable task ownership

| Authoritative task | Preserved boundary |
|---|---|
| `F07-T01` | Approved editable-draft, immutable-issue, append-only-amend lifecycle; explicit `PRESCRIPTION_ISSUE` plus resource scope; default `DOCTOR` issuer; and legal boundary. |
| `F07-T02` | Prescription/treatment/task/adherence migration. |
| `F07-T03` | Prescription create/draft/issue/revision interface. |
| `F07-T04` | Treatment medication/session/exercise/nutrition plan interface, including the owner-approved minimal persisted `TreatmentSessionPlan`: ordered clinical definition only; unique plan/position; no independent status, scheduling, execution, appointment, encounter, task, recurrence, reminder, attendance, media, modality, revision, or per-session join model. Runtime OpenAPI declarations belong here; checked-in generated-client synchronization remains with `F07-T10`. |
| `F07-T05` | One-off `MEDICATION`/`EXERCISE` task scheduling with `scheduledFor` as the future reminder source; authorized clinic-resource operations; patient-owned repeat-safe completion; and keyed medication-adherence recording. It reuses the F07-T02 foundation and does not add a session relationship, recurrence, reminder dispatch, progress event, frontend connection, or generated-client synchronization. |
| `F07-T06` | Real progress calculation from persisted non-cancelled task state and append-only `TASK_COMPLETED`/`MEDICATION_ADHERENCE_RECORDED` timeline events. No session lifecycle, scheduling, UI connection, or client synchronization. |
| `F07-T07` | Selected-patient prescription builder and dashboard patient-workspace connection using accepted prescription, treatment-plan, and real-progress APIs; no fabricated selection/data; generated-client sync remains `F07-T10`. See [`prescription-dashboard-connection-v1.md`](../../../plan/contracts/prescription-dashboard-connection-v1.md). |
| `F07-T08` | Authenticated patient treatment connection to accepted plan, activity, and progress APIs; no fabricated treatment data. |
| `F07-T09` | Explicit issuance permission, tenant/resource authorization, audit, and revision-integrity contract. The owner-approved clarification defers automated contraindication warning/rule behavior until a separately approved clinical feature has a trusted source. |
| `F07-T10` | Exported accepted F07 OpenAPI, regenerated `@sabz-zendegi/api-client`, and converted the completed F07 dashboard/app adapters to generated-client request/response types. No route, persistence, authorization, contraindication, or product behavior is added. |
| `F07-T11` | Immutability, amendment, ownership, and browser E2E. |
| `F07-T12` | Evidence. |

## Non-negotiable Phase 07 outcomes

- An issued prescription is immutable and corrected only through revision.
- Issuance requires explicit capability plus tenant/resource scope; role or dashboard access alone is insufficient.
- Automated contraindication warning/rule evaluation is not active in Phase 07; no clinical rules, acknowledgements, or `NON_OVERRIDABLE` runtime behavior may be invented or activated.
- Medication/exercise schedules are the future reminder source.
- Treatment-task and adherence records persist across refresh and devices.
- Progress derives from real events.
- The dashboard issue → app display → patient log → dashboard review path passes.

This adoption records the completed `F07-T01` policy baseline only. No later Phase 07 task is claimed, activated, or completed by this document.
