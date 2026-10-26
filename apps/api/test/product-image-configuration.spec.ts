import { describe, expect, it } from 'vitest';
import { environmentValidationSchema } from '../src/config/environment.validation';
import { chatTestEnvironment } from './chat-environment-fixture';
import { ConfigService } from '@nestjs/config';
import { S3ProductImageStorage } from '../src/modules/commerce/media/product-image-storage';
import { existsSync, mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const base = { ...chatTestEnvironment, NODE_ENV: 'test', DATABASE_URL: 'postgresql://test:test@localhost/test', JWT_ACCESS_SECRET: 'a'.repeat(43), REFRESH_TOKEN_PEPPER: 'b'.repeat(43), OTP_PEPPER: 'c'.repeat(43) };
describe('product media configuration', () => {
  it('defaults to disabled and never creates a live client without an explicit mode', async () => {
    const config = environmentValidationSchema.validate(base); expect(config.error).toBeUndefined(); expect(config.value.PRODUCT_MEDIA_STORAGE_MODE).toBe('disabled');
    const storage = new S3ProductImageStorage(new ConfigService(config.value)); expect(storage.isEnabled()).toBe(false);
    await expect(storage.put('unused', Buffer.alloc(0))).rejects.toMatchObject({ response: { code: 'COMMERCE_IMAGE_STORAGE_UNAVAILABLE' } });
  });
  it('rejects incomplete configuration and production activation', () => {
    expect(environmentValidationSchema.validate({ ...base, PRODUCT_MEDIA_STORAGE_MODE: 'r2' }).error).toBeDefined();
    const configured = { ...base, PRODUCT_MEDIA_STORAGE_MODE: 'r2', R2_ENDPOINT: 'https://example.r2.cloudflarestorage.com', R2_BUCKET: 'dev-sabz', R2_REGION: 'auto', R2_ACCESS_KEY_ID: 'mock-key', R2_SECRET_ACCESS_KEY: 'mock-secret' };
    expect(environmentValidationSchema.validate(configured).error).toBeUndefined();
    expect(environmentValidationSchema.validate({ ...configured, R2_REGION: 'apac' }).error).toBeDefined();
    expect(environmentValidationSchema.validate({ ...configured, NODE_ENV: 'production', TRUSTED_PROXIES: '127.0.0.1' }).error).toBeDefined();
  });
  it('requires the selected Arvan profile and never borrows R2 credentials', () => {
    const r2 = { R2_ENDPOINT: 'https://mock.r2.cloudflarestorage.com', R2_BUCKET: 'r2-bucket', R2_ACCESS_KEY_ID: 'r2-key', R2_SECRET_ACCESS_KEY: 'r2-secret' };
    expect(environmentValidationSchema.validate({ ...base, ...r2, PRODUCT_MEDIA_STORAGE_MODE: 'arvancloud' }).error).toBeDefined();
    const arvan = { ...base, ...r2, PRODUCT_MEDIA_STORAGE_MODE: 'arvancloud', ARVAN_ENDPOINT: 'https://s3.ir-thr-at1.arvanstorage.ir', ARVAN_BUCKET: 'arvan-bucket', ARVAN_ACCESS_KEY_ID: 'arvan-key', ARVAN_SECRET_ACCESS_KEY: 'arvan-secret' };
    const result = environmentValidationSchema.validate(arvan);
    expect(result.error).toBeUndefined();
    expect(result.value.ARVAN_REGION).toBe('default');
    expect(result.value.ARVAN_REQUEST_TIMEOUT_MS).toBe(5000);
    expect(environmentValidationSchema.validate({ ...arvan, ARVAN_ENDPOINT: 'http://example.com' }).error).toBeDefined();
    expect(environmentValidationSchema.validate({ ...arvan, ARVAN_REQUEST_TIMEOUT_MS: 0 }).error).toBeDefined();
    expect(environmentValidationSchema.validate({ ...arvan, NODE_ENV: 'production' }).error).toBeDefined();
    expect(environmentValidationSchema.validate({ ...arvan, PRODUCT_MEDIA_STORAGE_MODE: 'arvan' }).error).toBeDefined();
  });
  it('injects file-backed credentials into the child process without printing their values', () => {
    const dir = mkdtempSync(resolve(tmpdir(), 'media-secret-test-'));
    try {
      const key = resolve(dir, 'key'); const secret = resolve(dir, 'secret'); const child = resolve(dir, 'child.mjs');
      writeFileSync(key, 'mock-key\n'); writeFileSync(secret, 'mock-secret\n');
      writeFileSync(child, "console.log(JSON.stringify({ key: process.env.R2_ACCESS_KEY_ID === 'mock-key', secret: process.env.R2_SECRET_ACCESS_KEY === 'mock-secret', arvanKey: process.env.ARVAN_ACCESS_KEY_ID === 'mock-key', arvanSecret: process.env.ARVAN_SECRET_ACCESS_KEY === 'mock-secret' }));");
      const result = spawnSync(process.execPath, [resolve(process.cwd(), '../../deploy/docker/api-entrypoint.mjs'), child], { encoding: 'utf8', env: { ...process.env, R2_ACCESS_KEY_ID_FILE: key, R2_SECRET_ACCESS_KEY_FILE: secret, ARVAN_ACCESS_KEY_ID_FILE: key, ARVAN_SECRET_ACCESS_KEY_FILE: secret } });
      expect(result.status).toBe(0); expect(JSON.parse(result.stdout)).toEqual({ key: true, secret: true, arvanKey: true, arvanSecret: true }); expect(result.stdout).not.toContain('mock-secret');
    } finally {
      for (const name of ['key', 'secret', 'child.mjs']) {
        const path = resolve(dir, name);
        if (existsSync(path)) unlinkSync(path);
      }
      rmdirSync(dir);
    }
  });
});
