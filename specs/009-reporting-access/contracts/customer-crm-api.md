# Operational Store Customer CRM Contract

## Route and authorization

`GET /v1/admin/commerce/customers` is the only approved CRM route for `F11-T10`.

- Backend authorization is `ADMIN` only and additionally requires a persisted `User.status=ACTIVE` and persisted session that is unrevoked and unexpired.
- `clinicId` is required. The service first resolves an active `Clinic` for which the actor has the existing `ClinicalClinicAccess` row, then applies the resolved `clinicId` to every customer, order, payment, refund, order-line, summary, and audit predicate.
- PATIENT, DOCTOR, STAFF, disabled/revoked/expired ADMIN, omitted/invalid/foreign clinic, and unsupported routes disclose neither rows nor derived counts/totals.
- The response has no medical fields, assessment/treatment/diagnosis/note data, contact data, raw audit metadata, request/response payload, or token.

## Query

| Parameter | Rule | Default |
|---|---|---|
| `clinicId` | required UUID of an active clinic authorized by the actor's existing `ClinicalClinicAccess` | none; missing is `BAD_REQUEST` |
| `page` | integer 1 or greater | `1` |
| `pageSize` | integer 1–100 | `25` |
| `search` | optional trimmed display-name substring, 1–120 characters when present | absent |
| `segment` | optional `POTENTIAL`, `ONE_TIME`, `RETURNING`, or `VIP` | absent |
| `sort` | `NET_SPEND`, `SUCCESSFUL_PURCHASE_COUNT`, `LAST_PURCHASE_AT`, or `DISPLAY_NAME` | `NET_SPEND` |
| `direction` | `ASC` or `DESC` | `DESC` |

An unsupported key/value, malformed UUID/number, blank supplied search, invalid enum, or invalid range returns the existing HTTP 400 `BAD_REQUEST` envelope before a CRM data query. A syntactically valid clinic that is inactive or lacks the actor's `ClinicalClinicAccess` is denied as a scope authorization failure without rows, totals, or audit metadata. `PatientProfile.id ASC` is the stable tie-break for every sort.

## Canonical population and calculation

Population is exactly `PatientProfile` rows whose `clinicId` equals the resolved clinic. Display name is only `PatientProfile.user → User.userProfile.firstName/lastName`; missing name components are joined and trimmed, producing `null` when both are absent. Account status is the canonical `User.status` (`ACTIVE` or `DISABLED`).

Only these commerce facts qualify:

- verified payment: `Payment` joined through `Payment.order → CommerceOrder`, in the resolved clinic;
- completed refund: `Refund.status=COMPLETED` joined through `Refund.payment → Payment.order → CommerceOrder`, in the resolved clinic;
- product frequency: `CommerceOrderLine` joined through a verified-payment order in the resolved clinic.

For each population member: `successfulPurchaseCount = count(verified Payment)`; `grossToman = sum(Payment.commerceAmountToman)`; `completedRefundToman = sum(Refund.amountToman where COMPLETED)`; `netSpendToman = grossToman - completedRefundToman`; `lastPurchaseAt = max(Payment.verifiedAt)` or `null`; and `topProduct = highest sum(CommerceOrderLine.quantity)` with title ascending tie-break, or `null` when no qualifying line exists. Amounts are integer `TOMAN` strings; no conversion or rounding is applied beyond integer arithmetic.

Segments are deterministic and non-overlapping: `POTENTIAL` 0 verified payments, `ONE_TIME` 1, `RETURNING` 2–4, `VIP` 5+. A customer belongs to exactly one segment. Summary is calculated over the same filtered population before pagination: total count, VIP count, integer `TOMAN` net-spend sum, and integer-truncated average net spend; the zero denominator average is `0`.

## Response

```text
{
  clinicId, currency: "TOMAN", timeZone: "Asia/Tehran", asOf,
  page, pageSize, totalCustomerCount,
  summary: { totalCustomerCount, vipCustomerCount, netSpendToman, averageNetSpendToman },
  items: [{ patientId, displayName, accountStatus, segment,
             successfulPurchaseCount, grossToman, completedRefundToman,
             netSpendToman, topProduct, lastPurchaseAt }]
}
```

Empty valid results return an empty `items` list and zero-valued summary, not mock data. No export, saved segment, campaign/audience, mutation, or action endpoint is part of this contract.

## Sensitive-access audit

For every disclosed item, the existing `PatientAccessAudit` policy records `READ` with the resolved clinic, the disclosed `PatientProfile`, actor/session/request provenance, CRM resource type/identifier, and timestamp. Metadata is a fixed non-sensitive provenance marker only. Failure to write this audit denies the sensitive response. Audit rows must not contain a token, raw query/body/response, medical content, or foreign-clinic reference.
