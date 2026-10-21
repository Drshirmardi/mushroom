import { readFile, readdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { Client } from 'pg';
import { describe, expect, it } from 'vitest';

describe.skipIf(process.env.PRODUCT_MIGRATION_TEST_ISOLATED !== '1')('product image additive migration (disposable PostgreSQL)', () => {
  it('upgrades the old schema with existing products unchanged and enforces image constraints', async () => {
    const url = new URL(process.env.DATABASE_URL ?? '');
    if (process.env.NODE_ENV !== 'test' || !['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname !== '/product_migration_test') throw new Error('Migration tests require the explicitly enabled disposable product_migration_test database.');
    const dbName = `media_upgrade_${randomUUID().replaceAll('-', '')}`;
    const admin = new Client({ connectionString: url.toString() }); await admin.connect();
    let sql: Client | undefined;
    try {
      await admin.query(`CREATE DATABASE "${dbName}"`);
      url.pathname = `/${dbName}`; sql = new Client({ connectionString: url.toString() }); await sql.connect();
      const dir = resolve(process.cwd(), 'prisma/migrations');
      const entries = (await readdir(dir, { withFileTypes: true })).filter(x => x.isDirectory()).map(x => x.name).sort();
      const latest = '20261014120000_store_product_image';
      expect(entries).toContain(latest);
      for (const name of entries.filter(x => x < latest)) await sql.query(await readFile(resolve(dir, name, 'migration.sql'), 'utf8'));
      // A historical schema must be exercised with SQL, not the latest generated Prisma model.
      const clinic = (await sql.query("SELECT id FROM clinics WHERE status='ACTIVE' LIMIT 1")).rows[0].id;
      const category = randomUUID(); const product = randomUUID(); const image = randomUUID();
      await sql.query("INSERT INTO commerce_categories(id,clinic_id,name,slug,updated_at) VALUES($1,$2,'migration category','migration',NOW())", [category, clinic]);
      await sql.query("INSERT INTO commerce_products(id,clinic_id,category_id,title,slug,status,updated_at) VALUES($1,$2,$3,'existing product','existing','ACTIVE',NOW())", [product, clinic, category]);
      const before = (await sql.query('SELECT * FROM commerce_products WHERE id=$1', [product])).rows[0];
      await sql.query(await readFile(resolve(dir, latest, 'migration.sql'), 'utf8'));
      expect((await sql.query('SELECT * FROM commerce_products WHERE id=$1', [product])).rows[0]).toEqual(before);
      expect((await sql.query('SELECT count(*) FROM commerce_product_images')).rows[0].count).toBe('0');
      const insert = "INSERT INTO commerce_product_images(id,product_id,object_key,mime_type,size_bytes,width,height,alt_text,updated_at) VALUES($1,$2,$3,'image/webp',20,20,10,'',NOW())";
      await sql.query(insert, [image, product, 'migration-fixture.webp']);
      await expect(sql.query('UPDATE commerce_product_images SET width = 1601 WHERE id = $1', [image])).rejects.toMatchObject({ code: '23514' });
      await expect(sql.query("UPDATE commerce_product_images SET mime_type = 'image/svg+xml' WHERE id = $1", [image])).rejects.toMatchObject({ code: '23514' });
      await expect(sql.query(insert, [randomUUID(), product, 'duplicate.webp'])).rejects.toMatchObject({ code: '23505', constraint: 'commerce_product_images_product_id_key' });
    } finally {
      await sql?.end(); await admin.query(`DROP DATABASE IF EXISTS "${dbName}"`); await admin.end();
    }
  }, 30_000);
});
