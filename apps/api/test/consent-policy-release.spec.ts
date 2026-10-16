import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, resolve, sep } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const script = resolve(process.cwd(), 'prisma/manage-consent-policy.mjs');
const rehearsalDocument = resolve(process.cwd(), '../../deploy/vps/reference-data/rehearsal-consent-policy.json');
const scratchDirectories: string[] = [];

function validate(environment: string, document = rehearsalDocument, policyKey = 'MEDICAL_INTAKE_PROCESSING') {
  return spawnSync(process.execPath, [script, 'validate'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      MUSHROOM_ENVIRONMENT: environment,
      CONSENT_POLICY_DOCUMENT_FILE: document,
      CONSENT_POLICY_KEY: policyKey,
    },
  });
}

afterEach(() => {
  for (const directory of scratchDirectories.splice(0)) {
    const absolute = resolve(directory);
    if (!absolute.startsWith(resolve(tmpdir()) + sep) || !basename(absolute).startsWith('mushroom-consent-policy-')) throw new Error('Unexpected consent test scratch directory.');
    rmSync(absolute, { recursive: true, force: true });
  }
});

describe('release-managed consent policy document', () => {
  it('accepts the exact reviewed document in rehearsal environments', () => {
    for (const environment of ['staging', 'production-sim']) {
      const result = validate(environment);
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toContain('version 1');
    }
  });

  it('cannot be reused as a production policy', () => {
    const result = validate('production');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('not approved for environment production');
  });

  it('rejects any body change whose reviewed hash was not updated', () => {
    const directory = mkdtempSync(resolve(tmpdir(), 'mushroom-consent-policy-'));
    scratchDirectories.push(directory);
    const document = JSON.parse(readFileSync(rehearsalDocument, 'utf8')) as { body: string };
    document.body += ' تغییر تأییدنشده';
    const path = resolve(directory, 'policy.json');
    writeFileSync(path, JSON.stringify(document), 'utf8');

    const result = validate('staging', path);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('contentHash does not match');
  });
  it('requires an explicit matching purpose for a test-only couple-link document and preserves hash/environment gates', () => {
    const directory = mkdtempSync(resolve(tmpdir(), 'mushroom-consent-policy-')); scratchDirectories.push(directory);
    const body = 'Synthetic test-only account-link policy, not approved legal text.';
    const document = { schemaVersion: 1, policyKey: 'COUPLES_ACCOUNT_LINKING', versionNumber: 1, locale: 'fa-IR', title: 'Synthetic link', body, contentHash: createHash('sha256').update(body).digest('hex'), allowedEnvironments: ['staging'] };
    const path = resolve(directory, 'couple-link.json'); writeFileSync(path, JSON.stringify(document), 'utf8');
    expect(validate('staging', path).status).toBe(1);
    const optedIn = validate('staging', path, 'COUPLES_ACCOUNT_LINKING'); expect(optedIn.status, optedIn.stderr).toBe(0);
    expect(validate('production', path, 'COUPLES_ACCOUNT_LINKING').status).toBe(1);
    writeFileSync(path, JSON.stringify({ ...document, body: body + ' unapproved change' }), 'utf8');
    expect(validate('staging', path, 'COUPLES_ACCOUNT_LINKING').stderr).toContain('contentHash does not match');
  });
});
