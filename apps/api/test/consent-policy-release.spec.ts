import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const script = resolve(process.cwd(), 'prisma/manage-consent-policy.mjs');
const rehearsalDocument = resolve(process.cwd(), '../../deploy/vps/reference-data/rehearsal-consent-policy.json');
const scratchDirectories: string[] = [];

function validate(environment: string, document = rehearsalDocument) {
  return spawnSync(process.execPath, [script, 'validate'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      MUSHROOM_ENVIRONMENT: environment,
      CONSENT_POLICY_DOCUMENT_FILE: document,
    },
  });
}

afterEach(() => {
  for (const directory of scratchDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
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
});
