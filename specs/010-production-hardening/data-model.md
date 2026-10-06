# Phase 12 Operational Evidence Model

| Entity | Immutable fields / invariants | Owner |
|---|---|---|
| ReleaseEnvelope | target release, Liara target, approved capacity/recovery/SLO decisions, owner approval | F12-T01 |
| ExternalGate | name, owner, required evidence, state `OPEN/PASSED/BLOCKED`, no secret payload | F12-T01/T02/T13 |
| CapacityRun | workload version, environment, profile, timing distribution, invariant result | F12-T03 |
| RestoreDrill | backup point, restore target, RPO/RTO observation, integrity result | F12-T05 |
| SecretRotationDrill | secret class, key version transition, old-revision readability result, no value | F12-T07 |
| AvailabilityObservation | probe location/type, timestamp, raw outcome, adjusted exclusion reason | F12-T09 |
| PaymentAcceptance | config revision reference, non-secret merchant test-plan ID, callback/Verify result, reconciliation outcome | F12-T02/T13 |
| ReleaseSignOff | owner, date, all gate references, approved exceptions | F12-T13 |
| ReleaseManifest | source commit, CI run, registry, four immutable image digests, creation time; no mutable deployment reference | F12-T02 |
| DeploymentRecord | environment, Compose project, release-manifest digest, previous manifest, migration outcome, health/synthetic outcome, workflow run and approved actor | F12-T02 |

No entity permits credentials, full callback bodies, PAN, encryption keys, or production secret values in Git or logs.

`ReleaseManifest` is promoted unchanged from staging to production-sim. `DeploymentRecord` may point to a previous
manifest for application rollback, but never represents a database rollback. Staging and production-sim records,
secrets, databases and Compose resources are disjoint even when they share one physical rehearsal VPS.
