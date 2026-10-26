import { generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll } from 'vitest';
import { chatTestEnvironment } from './chat-environment-fixture';

const directory = mkdtempSync(join(tmpdir(), 'mushroom-chat-test-'));
const keyFile = join(directory, 'private.pem');
const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});
writeFileSync(keyFile, privateKey, { mode: 0o600 });
// Test processes must never inherit a live chat engine from the owner's .env.
Object.assign(process.env, chatTestEnvironment, { EJABBERD_JWT_PRIVATE_KEY_FILE: keyFile });
afterAll(() => rmSync(directory, { recursive: true, force: true }));
