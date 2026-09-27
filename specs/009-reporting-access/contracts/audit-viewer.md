# Audit Viewer Contract

- Route family: `/v1/admin/audit-events`; ADMIN-only, active session, explicit authorized scope before filter/count/page evaluation.
- Approved filters: local-date range (maximum 366 days), action, subject type, actor identifier, and cursor/limit. Clinic/tenant scope is server-derived or explicitly validated; there is no global/unscoped query.
- Approved row: opaque event ID, action, redacted actor/subject reference where disclosure is allowed, occurrence time, request correlation reference, and an allow-listed metadata summary. Never return session tokens, credentials, raw IP address, medical text/files, raw clinical metadata, payment provider payloads, or arbitrary JSON.
- Pagination: cursor, limit 1–100, stable `createdAt,id` order. Empty results disclose no existence outside permitted scope.
- No export, raw JSON download, full-text raw metadata search, or bulk retrieval.
- Reading sensitive audit/medical evidence produces an existing-policy-compatible audit event without storing prohibited PII/secrets in operational logs.
