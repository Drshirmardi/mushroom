# Patient Entry Contract Addendum

This addendum extends the existing Patient Entry API without changing its routes.

## `POST /v1/patients/me/entry/profile`

Request now requires:

```json
{
  "firstName": "...",
  "lastName": "...",
  "gender": "FEMALE",
  "birthDate": "YYYY-MM-DD"
}
```

`gender` accepts only the existing profile enum `FEMALE` or `MALE`. `birthDate` must be a real calendar date, not a future date, and no more than 130 years old. The write is idempotent for the same patient and remains audited.

## `GET /v1/patients/me/entry`

Retain existing fields and add `gender` and `assessmentRequired`. `required` covers any incomplete basic profile or an incomplete in-cohort required assessment. A profile-only save durably completes registration; later assessment activation does not reopen it. Demographic repairs retain existing submissions and completion markers.

Phase precedence:

1. `PROFILE` while any required basic profile field is missing, regardless of account age or previous assessment progress.
2. `RESULT` when the exact bound submission is complete and valid.
3. `UNAVAILABLE` when the profile is complete but its required assessment source is missing/unavailable.
4. `ASSESSMENT` when the profile is complete and the assessment is required.
5. `COMPLETE` when no profile or assessment step is required, or the entry has been acknowledged.

All other route authorization and ownership boundaries remain unchanged. The profile flow does not write medical intake or consent records.
