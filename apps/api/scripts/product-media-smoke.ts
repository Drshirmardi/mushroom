import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { deepStrictEqual } from 'node:assert';
import { config as loadEnv } from 'dotenv';
import * as Joi from 'joi';
import sharp from 'sharp';
import { ConfigService } from '@nestjs/config';
import { productMediaEnvironment } from '../src/config/product-media.config';
import { S3ProductImageStorage } from '../src/modules/commerce/media/product-image-storage';

// Opt-in only: this command writes and removes one uniquely named diagnostic object.
async function main() {
  if (!process.argv.includes('--confirm-write')) throw new Error('Run with --confirm-write to test one temporary object.');
  loadEnv({ path: [resolve(__dirname, '../.env'), resolve(__dirname, '../../../.env')], quiet: true });
  const environment = { ...process.env };
  const mode = environment.PRODUCT_MEDIA_STORAGE_MODE;
  const prefix = mode === 'arvancloud' ? 'ARVAN' : 'R2';
  if (mode !== 'r2' && mode !== 'arvancloud') throw new Error('Select PRODUCT_MEDIA_STORAGE_MODE=r2 or arvancloud first.');
  for (const suffix of ['ACCESS_KEY_ID', 'SECRET_ACCESS_KEY']) {
    const name = `${prefix}_${suffix}`;
    if (environment[`${name}_FILE`]) {
      try { environment[name] = readFileSync(environment[`${name}_FILE`]!, 'utf8').replace(/[\r\n]+$/, ''); }
      catch { throw new Error(`${name}_FILE is not readable.`); }
    }
  }
  const result = Joi.object({ NODE_ENV: Joi.string().default('development'), ...productMediaEnvironment })
    .validate(environment, { allowUnknown: true, abortEarly: false });
  if (result.error) throw new Error(`Invalid storage settings: ${result.error.details.map(detail => detail.path.join('.')).join(', ')}`);
  const storage = new S3ProductImageStorage(new ConfigService(result.value));
  const key = `diagnostics/media-smoke/${randomUUID()}.webp`;
  const bytes = await sharp({ create: { width: 1, height: 1, channels: 3, background: '#ffffff' } }).webp().toBuffer();
  console.log(`Provider: ${mode}; temporary object: ${key}`);
  try {
    await storage.put(key, bytes);
    console.log('PUT: OK');
    deepStrictEqual(await storage.read(key), bytes);
    console.log('GET + byte comparison: OK');
  } finally {
    try { await storage.delete(key); console.log('DELETE: OK'); }
    catch { process.exitCode = 1; console.error(`Cleanup failed; check temporary object: ${key}`); }
    storage.onModuleDestroy();
  }
}

main().catch(error => {
  // Only locally constructed setup messages are printed; adapter errors contain no SDK details.
  console.error(error instanceof Error ? error.message : 'Storage test failed.');
  process.exitCode = 1;
});
