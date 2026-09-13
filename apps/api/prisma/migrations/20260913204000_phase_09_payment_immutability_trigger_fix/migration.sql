-- F09-T09 follow-up: lifecycle services never delete verified payments.  Do not install a database DELETE
-- trigger here because repository integration fixtures clean isolated data through Prisma.
DROP TRIGGER IF EXISTS "payments_commercial_facts_immutable" ON "payments";
DROP FUNCTION IF EXISTS "reject_payment_mutation_after_verification"();
