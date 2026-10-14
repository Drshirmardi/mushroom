import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Client } from 'pg';
import { describe, expect, it } from 'vitest';

describe('Product content additive migration (disposable PostgreSQL upgrade)', () => {
  it('replays the previous schema, preserves legacy content/status/timestamps and adds unapproved defaults', async () => {
    const connection = new URL(process.env.DATABASE_URL ?? '');
    if (process.env.NODE_ENV !== 'test' || connection.hostname !== '127.0.0.1' || connection.port !== '55439' || connection.pathname !== '/media_04a') throw new Error('Migration tests require the task disposable PostgreSQL instance.');
    const database = `pd_b1a_upgrade_${randomUUID().replaceAll('-', '')}`;
    const admin = new Client({ connectionString: connection.toString() }); await admin.connect();
    let upgrade: Client | undefined;
    try {
      await admin.query(`CREATE DATABASE "${database}"`);
      connection.pathname = `/${database}`;
      upgrade = new Client({ connectionString: connection.toString() }); await upgrade.connect();
      const root = resolve('prisma/migrations');
      const directories = (await readdir(root, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
      const currentMigration = '20261014150000_product_content_v1';
      expect(directories.at(-1)).toBe(currentMigration);
      for (const directory of directories.filter((name) => name !== currentMigration)) await upgrade.query(await readFile(resolve(root, directory, 'migration.sql'), 'utf8'));
      const clinic = (await upgrade.query("SELECT id FROM clinics WHERE status='ACTIVE' LIMIT 1")).rows[0].id as string;
      const category = randomUUID(); const product = randomUUID(); const draft = randomUUID();
      await upgrade.query('INSERT INTO commerce_categories(id,clinic_id,name,slug,updated_at) VALUES($1,$2,$3,$4,$5)', [category, clinic, 'fixture category', 'legacy-category', '2026-01-01T00:00:00Z']);
      const legacyDescription = `  legacy Persian متن\n\n${'x'.repeat(5100)}  `;
      for (const [id, status] of [[product, 'ACTIVE'], [draft, 'DRAFT']]) await upgrade.query('INSERT INTO commerce_products(id,clinic_id,category_id,title,slug,description,status,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)', [id, clinic, category, 'legacy product', id, legacyDescription, status, '2026-01-01T00:00:00Z']);
      const before = (await upgrade.query('SELECT id,description,status,created_at,updated_at FROM commerce_products ORDER BY id')).rows;
      await upgrade.query(await readFile(resolve(root, currentMigration, 'migration.sql'), 'utf8'));
      const after = (await upgrade.query('SELECT id,description,status,created_at,updated_at FROM commerce_products ORDER BY id')).rows;
      expect(after).toEqual(before);
      const metadata = (await upgrade.query('SELECT legacy_content,content_revision,brand,source_kind,source_reference,approved_content_revision,content_approved_at,content_approved_by_user_id FROM commerce_products')).rows;
      for (const row of metadata) expect(row).toEqual({ legacy_content: true, content_revision: 0, brand: null, source_kind: null, source_reference: null, approved_content_revision: null, content_approved_at: null, content_approved_by_user_id: null });
      const newId = randomUUID();
      await upgrade.query('INSERT INTO commerce_products(id,clinic_id,category_id,title,slug,updated_at) VALUES($1,$2,$3,$4,$5,NOW())', [newId, clinic, category, 'new fixture', newId]);
      expect((await upgrade.query('SELECT legacy_content,content_revision FROM commerce_products WHERE id=$1', [newId])).rows[0]).toEqual({ legacy_content: false, content_revision: 0 });
      await expect(upgrade.query('UPDATE commerce_products SET approved_content_revision=0 WHERE id=$1', [product])).rejects.toMatchObject({ code: '23514' });
      await expect(upgrade.query('UPDATE commerce_products SET content_revision=-1 WHERE id=$1', [newId])).rejects.toMatchObject({ code: '23514' });
      await expect(upgrade.query("UPDATE commerce_products SET source_kind='PACKAGING' WHERE id=$1", [newId])).rejects.toMatchObject({ code: '23514' });
    } finally {
      await upgrade?.end();
      // The name is generated above, never accepted from configuration/user input.
      await admin.query(`DROP DATABASE IF EXISTS "${database}"`);
      await admin.end();
    }
  }, 60_000);
});
