import { readFile, readdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { Client } from 'pg';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { PrismaService } from '../src/database/prisma/prisma.service';

describe('product image additive migration (disposable PostgreSQL)', () => {
  it('upgrades the old schema with existing products unchanged and enforces image constraints', async () => {
    const url = new URL(process.env.DATABASE_URL ?? '');
    if (process.env.NODE_ENV !== 'test' || url.hostname !== '127.0.0.1' || url.port !== '55439' || url.pathname !== '/media_04a') throw new Error('Migration test requires the isolated media_04a container.');
    const dbName = `media_upgrade_${randomUUID().replaceAll('-', '')}`;
    const admin = new Client({ connectionString: url.toString() }); await admin.connect();
    let sql: Client | undefined; let prisma: PrismaService | undefined;
    try {
      await admin.query(`CREATE DATABASE "${dbName}"`);
      url.pathname = `/${dbName}`; sql = new Client({ connectionString: url.toString() }); await sql.connect();
      const dir = resolve(process.cwd(), 'prisma/migrations');
      const entries = (await readdir(dir, { withFileTypes: true })).filter(x => x.isDirectory()).map(x => x.name).sort();
      const latest = '20261014120000_store_product_image';
      for (const name of entries.filter(x => x !== latest)) await sql.query(await readFile(resolve(dir, name, 'migration.sql'), 'utf8'));
      prisma = new PrismaService(new ConfigService({ DATABASE_URL: url.toString() }));
      const clinic = await prisma.clinic.findFirstOrThrow({ where: { status: 'ACTIVE' } });
      const category = await prisma.commerceCategory.create({ data: { clinicId: clinic.id, name: 'migration category', slug: 'migration' } });
      const product = await prisma.commerceProduct.create({ data: { clinicId: clinic.id, categoryId: category.id, title: 'existing product', slug: 'existing', status: 'ACTIVE' } });
      await sql.query(await readFile(resolve(dir, latest, 'migration.sql'), 'utf8'));
      expect(await prisma.commerceProduct.findUnique({ where: { id: product.id }, include: { image: true } })).toMatchObject({ ...product, image: null });
      expect(await prisma.commerceProductImage.count()).toBe(0);
      const image = await prisma.commerceProductImage.create({ data: { productId: product.id, objectKey: 'migration-fixture.webp', mimeType: 'image/webp', sizeBytes: 20, width: 20, height: 10, altText: '' } });
      await expect(sql.query('UPDATE commerce_product_images SET width = 1601 WHERE id = $1', [image.id])).rejects.toMatchObject({ code: '23514' });
      await expect(sql.query("UPDATE commerce_product_images SET mime_type = 'image/svg+xml' WHERE id = $1", [image.id])).rejects.toMatchObject({ code: '23514' });
      await expect(prisma.commerceProductImage.create({ data: { productId: product.id, objectKey: 'duplicate.webp', mimeType: 'image/webp', sizeBytes: 20, width: 20, height: 10, altText: '' } })).rejects.toMatchObject({ code: 'P2002' });
    } finally {
      await prisma?.$disconnect(); await sql?.end(); await admin.query(`DROP DATABASE IF EXISTS "${dbName}"`); await admin.end();
    }
  }, 30_000);
});
