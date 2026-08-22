import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

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

const require = createRequire(import.meta.url);
const { createApiApplication } = require('../dist/app.factory.js');
const app = await createApiApplication();

try {
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
  await app.close();
}
