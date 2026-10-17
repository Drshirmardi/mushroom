import 'dotenv/config';

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { Client } from 'pg';

const POLICY_KEY = 'MEDICAL_INTAKE_PROCESSING';
const POLICY_KEYS = new Set([POLICY_KEY, 'COUPLES_ACCOUNT_LINKING', 'ASSESSMENT_PROCESSING', 'ASSESSMENT_PURCHASE_TERMS', 'COUPLES_RESULT_SHARING']);
const supportedCommands = new Set(['publish', 'validate', 'verify']);

function fail(message) {
  throw new Error(`Consent policy: ${message}`);
}

export async function readPolicyDocument(path, environment, expectedPolicyKey = POLICY_KEY) {
  if (!POLICY_KEYS.has(expectedPolicyKey)) fail('unsupported consent policy purpose');
  if (!path) fail('a policy document path is required');
  let value;
  try {
    value = JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    fail(`cannot read a valid JSON document from ${path}: ${error instanceof Error ? error.message : 'unknown error'}`);
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('document root must be an object');
  if (value.schemaVersion !== 1) fail('schemaVersion must be 1');
  if (value.policyKey !== expectedPolicyKey) fail(`policyKey must be ${expectedPolicyKey}`);
  if (!Number.isSafeInteger(value.versionNumber) || value.versionNumber < 1) fail('versionNumber must be a positive integer');
  if (value.locale !== 'fa-IR') fail('locale must be fa-IR');
  if (typeof value.title !== 'string' || value.title.trim().length === 0 || value.title.length > 255) fail('title must be 1..255 characters');
  if (typeof value.body !== 'string' || value.body.trim().length === 0) fail('body must be non-empty');
  if (!Array.isArray(value.allowedEnvironments) || value.allowedEnvironments.some((item) => typeof item !== 'string')) {
    fail('allowedEnvironments must be a string array');
  }
  if (!environment || !value.allowedEnvironments.includes(environment)) {
    fail(`document is not approved for environment ${environment || '<unset>'}`);
  }
  const contentHash = createHash('sha256').update(value.body, 'utf8').digest('hex');
  if (value.contentHash !== contentHash) fail('contentHash does not match the exact UTF-8 body');
  return {
    policyKey: value.policyKey,
    versionNumber: value.versionNumber,
    locale: value.locale,
    title: value.title,
    body: value.body,
    contentHash,
  };
}

async function activeClinic(client, lock = false) {
  const result = await client.query(`
    SELECT id
    FROM clinics
    WHERE status = 'ACTIVE'
    ORDER BY id
    ${lock ? 'FOR UPDATE' : ''}
  `);
  if (result.rows.length !== 1) fail(`expected exactly one active clinic, found ${result.rows.length}`);
  return result.rows[0].id;
}

async function verify(client, policyKey = POLICY_KEY) {
  const clinicId = await activeClinic(client);
  const result = await client.query(`
    SELECT id, version_number
    FROM consent_policy_versions
    WHERE clinic_id = $1::uuid
      AND policy_key = $2
      AND locale = 'fa-IR'
      AND status = 'ACTIVE'
  `, [clinicId, policyKey]);
  if (result.rows.length !== 1) fail(`expected exactly one active ${policyKey}/fa-IR policy, found ${result.rows.length}`);
  process.stdout.write(`consent policy ready: version ${result.rows[0].version_number}\n`);
}

async function publish(client, document, releaseRef) {
  if (!releaseRef || releaseRef.length > 128 || !/^[A-Za-z0-9._:-]+$/u.test(releaseRef)) {
    fail('CONSENT_POLICY_RELEASE_REF must be a safe 1..128 character release identifier');
  }
  await client.query('BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE');
  try {
    const clinicId = await activeClinic(client, true);
    const exact = await client.query(`
      SELECT id, title, body, content_hash, status::text
      FROM consent_policy_versions
      WHERE clinic_id = $1::uuid AND policy_key = $2 AND locale = $3 AND version_number = $4
      FOR UPDATE
    `, [clinicId, document.policyKey, document.locale, document.versionNumber]);
    if (exact.rows.length) {
      const row = exact.rows[0];
      if (row.title !== document.title || row.body !== document.body || row.content_hash !== document.contentHash || row.status !== 'ACTIVE') {
        fail(`version ${document.versionNumber} already exists with different or inactive content`);
      }
      await client.query('COMMIT');
      process.stdout.write(`consent policy unchanged: version ${document.versionNumber}\n`);
      return;
    }

    const current = await client.query(`
      SELECT id, version_number
      FROM consent_policy_versions
      WHERE clinic_id = $1::uuid AND policy_key = $2 AND locale = $3 AND status = 'ACTIVE'
      FOR UPDATE
    `, [clinicId, document.policyKey, document.locale]);
    if (current.rows.length > 1) fail('multiple active policies violate the release contract');
    if (current.rows[0] && Number(current.rows[0].version_number) >= document.versionNumber) {
      fail(`version ${document.versionNumber} must be greater than active version ${current.rows[0].version_number}`);
    }
    if (current.rows[0]) {
      await client.query(`
        UPDATE consent_policy_versions
        SET status = 'RETIRED', retired_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1::uuid
      `, [current.rows[0].id]);
    }
    const inserted = await client.query(`
      INSERT INTO consent_policy_versions (
        id, clinic_id, policy_key, version_number, locale, title, body,
        content_hash, status, activated_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1::uuid, $2, $3, $4, $5, $6,
        $7, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING id
    `, [clinicId, document.policyKey, document.versionNumber, document.locale, document.title, document.body, document.contentHash]);
    await client.query(`
      INSERT INTO audit_events (
        id, action, subject_type, subject_id, request_id, metadata
      ) VALUES (
        gen_random_uuid(), 'CONSENT_POLICY_PUBLISHED', 'CONSENT_POLICY_VERSION', $1::uuid, $2,
        jsonb_build_object('policyKey', $3::text, 'versionNumber', $4::integer, 'locale', $5::text)
      )
    `, [inserted.rows[0].id, releaseRef, document.policyKey, document.versionNumber, document.locale]);
    await client.query('COMMIT');
    process.stdout.write(`consent policy published: version ${document.versionNumber}\n`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function main() {
  const command = process.argv[2];
  if (!supportedCommands.has(command)) fail('usage: manage-consent-policy.mjs <validate|publish|verify>');
  const environment = process.env.MUSHROOM_ENVIRONMENT;
  const policyKey = process.env.CONSENT_POLICY_KEY || POLICY_KEY;
  if (!POLICY_KEYS.has(policyKey)) fail('unsupported consent policy purpose');
  const document = command === 'verify'
    ? null
    : await readPolicyDocument(process.env.CONSENT_POLICY_DOCUMENT_FILE, environment, policyKey);
  if (command === 'validate') {
    process.stdout.write(`consent policy document valid: version ${document.versionNumber}\n`);
    return;
  }
  if (!process.env.DATABASE_URL) fail('DATABASE_URL is required');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    if (command === 'verify') await verify(client, policyKey);
    else await publish(client, document, process.env.CONSENT_POLICY_RELEASE_REF);
  } finally {
    await client.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
