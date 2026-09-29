# Conditional Scope Contract

## F11-T08 — Staff membership/invitation

**Release decision**: excluded. No invite generation, membership mutation, role assignment, capability menu, email/message, API endpoint, schema/migration, or export is authorized. Verification is a scoped absence review plus matrix evidence that STAFF remains denied all dashboard/admin capabilities.

## F11-T10 — Operational store CRM

**Release decision**: owner-approved implementation. A read-only, clinic-scoped customer CRM is authorized exclusively by [customer-crm-api.md](customer-crm-api.md). It is an operational commerce read model, not a marketing or medical profiling surface.

**Still excluded**: CRM export, saved segment, campaign audience, marketing/campaign query or UI, bulk messaging, medical profiling, copied customer/CRM records, retention policy, new schema/migration, new aggregation infrastructure, and inert action controls. No task may imply any excluded capability from the operational CRM route.
