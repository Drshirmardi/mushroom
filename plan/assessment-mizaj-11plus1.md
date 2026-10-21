# Mizaj 11+1 dashboard authoring contract

2026-10-20 · F12-FE01 / CLIENT-INTEGRATION · sole owner Codex /root.
Status: IMPLEMENTED_UNVERIFIED; overall task REWORK/unchecked. Owner's latest rule supersedes the earlier 11+4 proposal. This is a dashboard draft/ADMIN simulation stage, not patient release or a validated clinical instrument.

## Authoring

A separate schemaVersion3 draft uses DIMENSION_TIEBREAK version1. Existing v1/v2 definitions are unchanged and are never silently converted. The new-draft action explicitly copies the actual server Mizaj preset into a separate editable object, preserving its eleven questions,44 answer texts,source hash and existing unreviewed profiles. Source data and previous versions remain intact.

Exactly11 required SINGLE_CHOICE main questions, four options per question, four named dimensions. An option has one membership of1 or an empty informational membership; no arbitrary diagnostic weights. All eleven answers are required even when some are informational. Minimum informative answers remains an explicit unreviewed draft setting, bounded by the number of contributing questions. Root size/source/profile/identifier limits reuse the existing bounded dimension validator.

The followUps bank has at most one question per exact unordered tied-dimension set. Four dimensions give six pair cases, four three-way cases and one four-way case. These are authoring cases, not eleven extra questions for a participant. Each follow-up has a unique ID, authored title,2–5 options and an exact candidate set of2–4 dimensions. Every candidate must have an associated option; an optional null association explicitly cannot distinguish. Clinical question/option text is blank until authored, never generated as a purported validated question. Incomplete authoring fails save; absent cases are allowed in a draft and produce an explicit unavailable simulation state.

## Server decision

1. Validate exact draft/current contentHash through existing authorized ADMIN scoring-preview transaction; syntheticAnswersOnly=true. No patient data/result is persisted; no sensitive answers logged.
2. Require all11 main answers; evaluate their memberships with the unchanged dimension ranking implementation. Below minimum evidence yields INSUFFICIENT_DATA; no follow-up. A resolved result yields SINGLE/PAIR; no follow-up.
3. PRIMARY_TIE uses the exact tied leaders. SECONDARY_TIE preserves the primary and uses the exact tied runners. No invented near-tie threshold and no arbitrary pair selected from a larger tie.
4. Find one bank question whose unordered candidate set matches exactly. Missing question yields FOLLOW_UP_UNAVAILABLE; otherwise FOLLOW_UP_REQUIRED returns just that selected question. No second or fallback question.
5. Only that selected question's answer ID may accompany the11 main answers. Unknown question IDs, off-path follow-ups, invalid options, skipped mains, and more than one supplemental answer are rejected.
6. A decisive answer orders the tied candidates, without altering main counts or claiming additional numerical confidence. A two-way primary tie resolves primary/secondary. A secondary tie resolves secondary only. In a three/four-way primary tie, one primary may resolve while secondary stays tied; no second follow-up.
7. Null association retains the tie. Once a follow-up is answered, followUpUsed=true and followUp=null; residual tie remains explicit. Zero evidence never creates secondary. Total presented/answered main+follow-up is at most12.

## Dashboard

Four authoring views: main questions, exact-case tie-break bank, sixteen existing ordered display profiles, and fixed rules/minimum evidence. Actual options are edited by meaning/associated dimension, independent of position. The bank shows missing/unfinished cases and separately exposes multiway ties.

Simulation walks through11 answers, requires synthetic-data acknowledgement and exact saved draft, then calls the real ADMIN endpoint. It displays server-selected question12 only if requested. Final panel shows selected dimensions, unresolved candidates, main-answer counts on demand, authored profile and whether the one follow-up was used. Changing a main answer clears the previous selection/result. No competing frontend ranking engine. Shared tokens/font/buttons/cards and existing ADMIN shell are reused; no dependency added.

## Preserved boundaries and deferred gates

Schema3 is not publishable or usable by patient scoring. Existing v1/v2 schema versions remain fixed on update; new models require separate drafts. Existing clinic ownership,permissions,audit,hash lock and synthetic-only contract are unchanged. No migration,patient UI,clinical/legal approval,paid/couple release or consent behavior changed.

OpenAPI response DTO adds DIMENSION_TIEBREAK, two follow-up statuses and optional followUp/followUpUsed; schema/client source generated. Runtime export comparison and package build are deferred. No test/typecheck/lint/build/browser/Graphify update executed. Focused test sources cover no tie,exact/reversed pair lookup,secondary tie,unknown answer,multiway tie,missing bank case,skipped question,duplicate cases,at-most-one follow-up and no source mutation; these are not passing evidence.

Owner review comes next, followed by explicit deferred execution checks. Clinical question/mapping/profile review and independent validation are required before claims of reliable diagnosis. Patient release needs a separate authorized implementation using the same authoritative decision contract; no DONE/final commit in this stage.


## Publication/runtime continuation — 2026-10-21

Supersedes the earlier schema3 draft-only technical limitation. ADMIN can publish structurally complete11+1 only after a qualified physician approval of the exact saved questionnaire hash/engine and active ASSESSMENT_PROCESSING policy. All6 pair-case follow-up definitions are required; optional multiway cases never fall back to an arbitrary pair. Updating content invalidates the old approval; obsolete approvals remain withdrawable retained history. No actual approval, publication or clinical content was created by this implementation. Existing physician API supports draft review; a physician frontend does not yet exist and remains a practical release prerequisite/work item. Existing ADMIN permissions are unchanged.

Patient flow now saves partial answers with revision protection, obtains at-most-one exact server-selected follow-up after11main answers, rejects off-path answers and premature completion, and persists an immutable idempotent educational result with primary/secondary or explicit ambiguity. Public questionnaire projections omit memberships, profiles and unused follow-ups. Result UI uses authored reviewed profiles and real dimension names, no scalar grade or fabricated confidence. Missing multiway follow-up, informational answers or a nondistinguishing answer can legitimately leave a result unresolved. Active exact review is checked again at start/resume/save/submit; retained completed results remain readable after withdrawal. Owned retired-version resume is permitted with current approval, new retired starts are not.

Paid/couple release, guidance mapping and assigned-care sharing remain limited to their existing scalar-engine contracts; this change does not claim those11+1 integrations. Free assessment patient-consent behavior is unchanged; active processing-policy review is not a claim that a new patient consent flow exists. Qualification review does not establish measured diagnostic accuracy.

Local migration20261021100000 successfully deployed after loopback-only target and sole-pending-migration inspection. OpenAPI enums/client source regenerated without building. Domain and isolated PostgreSQL regression sources added (not executed). Tests/typecheck/lint/build/browser/Graphify remain owner-deferred. IMPLEMENTED_UNVERIFIED; F12-FE01 REWORK/unchecked pending owner review and authorized final checks.


## Owner correction — ADMIN workflow,2026-10-21

Supersedes the preceding general/free11+1 physician-approval requirement: owner explicitly requires ADMIN to perform all ordinary assessment authoring, preview and publication stages. ADR0036 records the decision. Complete11main/16profile/6pair structural validation remains; physician protocol review/processing-policy reference no longer blocks publication or free patient progression. Result provenance is ADMIN_PUBLISHED, not physician-reviewed; existing published-version/hash/idempotency history remains. Existing commercial/paid/couple contracts are separate and unchanged. Readiness and11+1 settings reflect this policy. Source-only implementation; owner review and all deferred checks remain pending.
