# Patient treatment app connection v1

**Status:** `F07-T08` contract baseline
**Scope owner:** `F07-T08`

- The treatment area reads only authenticated self-service plan, scheduled-task, and progress APIs accepted in F07-T04 through F07-T06.
- It presents persisted medication, session definition, exercise, nutrition, scheduled-task, and derived-progress data; a missing, denied, failed, or empty result remains explicit and never falls back to demo data.
- Patient actions use the accepted repeat-safe task-completion and keyed medication-adherence operations. The app does not create schedules, sessions, appointments, reminders, or executions beyond those APIs.
- The approved `TreatmentSessionPlan` remains a clinical definition, not a scheduling or completion entity. `F07-T09` owns policy/audit/warning enforcement, `F07-T10` owns generated-client synchronization and broad remaining mock cleanup, and `F07-T11` owns browser E2E.
