import { randomBytes } from 'node:crypto';
// The existing harness creates/migrates/seeds/drops a randomly named local database.
process.env.PATIENT_JOURNEY_TEST_ISOLATED = '1';
process.env.PAYMENT_CREDENTIAL_ENCRYPTION_KEY = randomBytes(32).toString('base64');
process.env.PAYMENT_CREDENTIAL_ENCRYPTION_KEY_VERSION = 'disposable-mezaj-test';
process.argv = [process.execPath, process.argv[1], ...(process.argv.slice(2).length ? process.argv.slice(2) : ['test/program-purchase.integration.spec.ts', 'test/patient-entry.integration.spec.ts', 'test/program-mezaj-entry-guard.spec.ts'])];
await import('./patient-entry-verify.mjs');
