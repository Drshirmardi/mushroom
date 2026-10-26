# Quickstart: Guided Patient Entry

1. Use a disposable PostgreSQL database and apply migrations through Prisma Migrate.
2. Sign in with a new account and an existing incomplete account in the active clinic.
3. With assessment policy disabled, sign in: `/welcome` must show first name, last name, gender, and birth date; protected app routes and APIs remain blocked until save; saving releases the patient to Home.
4. Enable an eligible published registration assessment in the existing dashboard setting. A patient who already finished profile-only registration must remain complete. Create a new patient, save profile, start and partially answer the assessment, then reload and confirm the same attempt resumes.
5. Complete the assessment and verify its result is shown before Home. Confirm saved submission/result ownership and that only a valid supported MEZAJ result can drive the existing product recommendation endpoint.
6. Verify an old incomplete profile requires its missing details. Repair missing gender during a started assessment and confirm the exact submission and saved answers survive. An unavailable required source must remain explicitly blocked after profile completion.
7. Verify medical intake and consent records remain untouched by the basic entry flow.
