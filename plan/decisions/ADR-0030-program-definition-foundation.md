# ADR-0030 — Version programs and service specifications before commercial activation

- Status: ACCEPTED technical foundation under continuous owner backend implementation authorization,2026-10-17.
- Task: Phase12/F12-PJ-PG01; program-definition-v1. Existing frozen G01, directory, billing and clinical contracts remain unchanged.

The requested ready programs and custom physician programs need stable reviewed identities before payment can refer to a purchased version. Existing TreatmentPlan is a patient-specific clinical record, while G01 content is independently published education; neither represents a program curriculum or a commercial service specification. Add one immutable versioned definition with exact approved source references, authored curriculum/service body, safety boundaries and qualified professional approval. Reuse G01 authority/safety/source checks/audit and actual directory services; do not add another assessment, content publishing engine or patient treatment model.

READY_EDUCATION permits general education only. CUSTOM_PROFESSIONAL_PLAN is a service definition pointing to the real doctor/service, with later delivery through existing TreatmentPlan and professional review. Separate commercial publication, entitlement, delivery and financial status. No fabricated age/refund/clinical criteria, prices, legal content or automatic therapeutic activation. Source approval does not authorize sale or medical suitability; existing G01 source access stays unchanged. Actual program/legal/service data and later commercial policy are explicit release gates.
