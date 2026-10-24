# Feature Specification: Guided Patient Entry

**Feature Branch**: `codex/patient-entry-flow`  
**Created**: 2026-10-24  
**Status**: Draft  
**Input**: User request: Make registration after OTP clear and mandatory: collect name, surname, gender, and birth date; if an assessment is marked mandatory for registration, administer it and save its answers and result for the patient; then use the result to personalize services and product recommendations.

## User Scenarios & Testing

### User Story 1 - Complete basic profile after OTP (Priority: P1)

A patient with incomplete basic details sees a clear, guided profile step before reaching the app, regardless of account age. The patient supplies first name, last name, gender, and birth date. The flow remains available when no assessment exists or is selected.

**Why this priority**: The app currently admits new patients without identifying information and leaves them unsure what to do next.

**Independent Test**: Sign in with new and existing incomplete accounts while no entry assessment is configured; verify the profile step blocks protected features until all four fields are saved.

**Acceptance Scenarios**:

1. **Given** a newly registered patient has not completed the basic profile, **When** the patient opens the app, **Then** the app explains the current step and requests first name, last name, gender, and birth date.
2. **Given** no registration assessment is configured, **When** the patient saves valid profile details, **Then** the profile is saved and the patient enters the app without being shown an unavailable or empty assessment step.
3. **Given** an existing account has incomplete basic details, **When** its owner signs in, **Then** the missing details must be completed; an already completed assessment and its answers must be retained.
4. **Given** registration was completed without a required assessment, **When** an administrator later enables an assessment, **Then** that completed registration remains complete.

### User Story 2 - Complete a configured required assessment (Priority: P1)

After the profile step, a patient takes the assessment selected by an administrator when the registration assessment policy is enabled. The flow explains that step, saves progress, resumes an unfinished attempt, presents the completed result, and only then enters the app.

**Why this priority**: The assessment must be a deliberate, enforced part of registration only when the clinic has configured one.

**Independent Test**: Configure a published assessment as required, create a new patient, complete the profile and assessment, and verify the patient sees the result before entering the app.

**Acceptance Scenarios**:

1. **Given** a valid required assessment is configured, **When** a newly registered patient saves the basic profile, **Then** the next step is that assessment.
2. **Given** an assessment attempt is unfinished, **When** the patient signs in again, **Then** the same saved attempt is resumed and unrelated protected app requests remain blocked.
3. **Given** the assessment is submitted, **When** its result is ready, **Then** the patient sees that result before the app opens, and the saved answers and result remain linked to that patient.
4. **Given** the configured assessment is unavailable, **When** the patient reaches the assessment step, **Then** the patient sees a clear recovery state and cannot silently bypass the requirement.

### User Story 3 - Personalize services and products from saved assessment data (Priority: P2)

After a qualifying assessment result is saved, the app can use the patient's recorded result, including temperament where the assessment defines it, to choose relevant service and product recommendations.

**Why this priority**: The assessment should support useful follow-up rather than only collecting answers during registration.

**Independent Test**: Complete a recommendation-enabled assessment and verify that the same patient's result is used by the existing recommendation experience, while another patient's result is never exposed.

**Acceptance Scenarios**:

1. **Given** a patient has a valid saved recommendation result, **When** recommendations are requested, **Then** recommendations are based on that patient's result.
2. **Given** a patient has no eligible result, **When** recommendations are requested, **Then** no result-based recommendation is presented as personalized.

### Edge Cases

- Profile save is retried after a timeout; the patient can continue without duplicate entry or lost values.
- A patient refreshes or returns on another device during the assessment; the current attempt and answers remain available.
- The administrator changes the selected assessment after a patient starts; that patient's started attempt remains bound to its original version.
- A completed assessment result is invalidated or unavailable; the patient cannot mark the required assessment complete based on a stale result.
- Existing name, gender, or birth-date data is prefilled where available and remains editable before the assessment starts.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST require incomplete basic profiles for new and existing patient accounts, even when no registration assessment is configured.
- **FR-002**: The basic profile step MUST collect and validate first name, last name, gender, and birth date before allowing the patient to continue.
- **FR-003**: The system MUST clearly show the current step and next action, and MUST block protected patient-app actions until all required entry steps are complete.
- **FR-004**: Repairing missing basic details MUST preserve existing assessment ownership, answers, and completed registration markers. Registration completed without an assessment MUST NOT be reopened by later policy activation.
- **FR-005**: The administrator MUST be able to enable a registration-required assessment by selecting an eligible published assessment; disabling the policy MUST allow patients who have completed their profile to skip the assessment.
- **FR-006**: When a registration assessment is required, the system MUST preserve the sequence profile → assessment → result → app entry.
- **FR-007**: Assessment answers and results MUST remain associated with the authenticated patient and the exact assessment version used.
- **FR-008**: The system MUST resume a patient's in-progress registration assessment and MUST reject attempts to complete registration without a valid completed result when an assessment is required.
- **FR-009**: The system MUST retain completed assessment results for later patient-specific service and product recommendation flows.
- **FR-010**: The system MUST preserve medical-consent requirements and must not create or complete medical intake as a side effect of basic registration.
- **FR-011**: A missing or unavailable configured assessment MUST be communicated as a recoverable required step and MUST NOT let a patient bypass the requirement.
- **FR-012**: The system MUST audit sensitive registration policy changes and patient entry progress using the existing audit controls.

### Key Entities

- **Patient basic profile**: Patient name, gender, and birth date collected during guided registration.
- **Registration assessment policy**: Clinic-level choice of whether a published assessment is required during registration and which version is selected.
- **Assessment submission and result**: Patient-owned answers, version binding, completion state, and result used by downstream experiences.
- **Entry progress**: The patient's saved progress through profile, required assessment, result review, and app entry.

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% of incomplete patient accounts are asked for all four required profile fields before protected app features become available.
- **SC-002**: 100% of new patients with no required assessment can reach the app immediately after saving a valid basic profile.
- **SC-003**: 100% of new patients subject to an available required assessment see its saved result before reaching the app.
- **SC-004**: Patients returning during an unfinished assessment resume the same attempt without losing previously saved answers.
- **SC-005**: Completed registrations remain complete across later assessment policy changes; incomplete old profiles can be repaired without losing assessment progress.
- **SC-006**: Recommendations use only the authenticated patient's eligible saved assessment result.

## Assumptions

- Phone verification and patient account creation already work and remain the first registration step.
- `UserProfile.gender` is the registration gender field; medical `sexAtBirth` remains a separate self-reported intake field and is not inferred from it.
- Birth date continues to be stored in patient entry/profile registration data; collecting it does not implicitly complete medical intake or consent.
- Existing assessment submission, scoring, and temperament result logic remain authoritative; registration binds to those records rather than duplicating scoring data.
- Only assessments already supported by the existing registration policy and recommendation system are eligible; this change does not invent assessment content or clinical guidance.
- The existing assessment enrollment cutoff remains independent; basic profile collection has no account-age exemption.
