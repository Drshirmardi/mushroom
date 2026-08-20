import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const databaseUrl = process.env.DATABASE_URL;
const databaseName = `sabz_zendegi_smoke_${randomUUID().replaceAll('-', '')}`;
let adminClient: Client;

const createDatabaseUrl = (): string => {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for the migration smoke test.');
  }

  const url = new URL(databaseUrl);
  url.pathname = `/${databaseName}`;

  return url.toString();
};

describe('Prisma migrations (empty PostgreSQL smoke test)', () => {
  beforeAll(async () => {
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is required for the migration smoke test.');
    }

    const adminUrl = new URL(databaseUrl);
    adminUrl.pathname = '/postgres';
    adminClient = new Client({ connectionString: adminUrl.toString() });
    await adminClient.connect();
    await adminClient.query(`CREATE DATABASE "${databaseName}"`);
  });

  afterAll(async () => {
    if (!adminClient) return;

    await adminClient.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
    await adminClient.end();
  });

  it('applies every migration to a newly created database', async () => {
    const prismaCli = resolve(
      process.cwd(),
      'node_modules/prisma/build/index.js',
    );
    const result = spawnSync(
      process.execPath,
      [prismaCli, 'migrate', 'deploy', '--config', 'prisma.config.ts'],
      {
        cwd: process.cwd(),
        env: { ...process.env, DATABASE_URL: createDatabaseUrl() },
        encoding: 'utf8',
      },
    );

    expect(result.status, result.stderr).toBe(0);
  });
});
