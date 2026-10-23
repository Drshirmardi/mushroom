import { mkdir, mkdtemp, rmdir, unlink, writeFile } from 'node:fs/promises';
import { generateKeyPairSync } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const outputPath = resolve(
  process.cwd(),
  process.argv[2] ?? '../../packages/api-client/openapi.json',
);

process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??=
  'postgresql://openapi:openapi@localhost:5432/openapi?schema=public';
process.env.APP_ORIGINS ??=
  'http://localhost:3000,http://localhost:3001,http://localhost:3002';
process.env.LOG_LEVEL ??= 'fatal';
process.env.JWT_ACCESS_SECRET ??=
  'openapi-export-placeholder-access-secret-not-for-runtime';
process.env.REFRESH_TOKEN_PEPPER ??=
  'openapi-export-placeholder-refresh-pepper-not-for-runtime';
process.env.OTP_PEPPER ??=
  'openapi-export-placeholder-otp-pepper-not-for-runtime-1234567890';

const require = createRequire(import.meta.url);
let app;
let temporaryKeyDirectory;
let temporaryKeyPath;

try {
  process.env.EJABBERD_DOMAIN ||= 'chat.example.invalid';
  process.env.EJABBERD_WEBSOCKET_URL ||= 'wss://chat.example.invalid/xmpp-websocket';
  process.env.EJABBERD_API_URL ||= 'http://127.0.0.1:5280/api/v2';
  process.env.EJABBERD_POLICY_SECRET ||= 'openapi-export-placeholder-policy-secret-not-for-runtime';
  if (!process.env.EJABBERD_JWT_PRIVATE_KEY_FILE) {
    temporaryKeyDirectory = await mkdtemp(resolve(tmpdir(), 'mushroom-openapi-'));
    temporaryKeyPath = resolve(temporaryKeyDirectory, 'private.pem');
    const pair = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
    await writeFile(temporaryKeyPath, pair.privateKey, { mode: 0o600 });
    process.env.EJABBERD_JWT_PRIVATE_KEY_FILE = temporaryKeyPath;
  }
  const { createApiApplication } = require('../dist/app.factory.js');
  app = await createApiApplication();
  await app.init();
  const response = await app.inject({ method: 'GET', url: '/docs-json' });

  if (response.statusCode !== 200) {
    throw new Error(`OpenAPI export failed with HTTP ${response.statusCode}.`);
  }

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(
    outputPath,
    `${JSON.stringify(response.json(), null, 2)}\n`,
    'utf8',
  );
} finally {
  try { await app?.close(); }
  finally {
    if (temporaryKeyPath) await unlink(temporaryKeyPath);
    if (temporaryKeyDirectory) await rmdir(temporaryKeyDirectory);
  }
}
