import { Readable } from 'node:stream';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { S3ProductImageStorage } from '../src/modules/commerce/media/product-image-storage';

const configured = () => new S3ProductImageStorage(new ConfigService({ PRODUCT_MEDIA_STORAGE_MODE: 'r2', R2_ENDPOINT: 'https://mock.r2.cloudflarestorage.com', R2_BUCKET: 'dev-sabz', R2_REGION: 'auto', R2_ACCESS_KEY_ID: 'mock-key', R2_SECRET_ACCESS_KEY: 'mock-secret', R2_REQUEST_TIMEOUT_MS: 1000 }));
describe('R2 adapter with mocked SDK (no network)', () => {
  afterEach(() => vi.restoreAllMocks());
  it('uses separate bucket/key arguments, private WebP writes and idempotent delete', async () => {
    const send = vi.spyOn(S3Client.prototype, 'send').mockImplementation(async () => ({})); const storage = configured();
    await storage.put('store/test.webp', Buffer.from('test')); await storage.delete('store/test.webp');
    expect(send.mock.calls[0][0]).toBeInstanceOf(PutObjectCommand); expect(send.mock.calls[0][0].input).toMatchObject({ Bucket: 'dev-sabz', Key: 'store/test.webp', ContentType: 'image/webp' });
    expect(send.mock.calls[0][0].input).not.toHaveProperty('ACL'); expect(send.mock.calls[1][0]).toBeInstanceOf(DeleteObjectCommand); storage.onModuleDestroy();
  });
  it('reads bounded bytes and maps storage errors without exposing SDK details', async () => {
    const send = vi.spyOn(S3Client.prototype, 'send').mockImplementation(async () => ({ Body: Readable.from([Buffer.from('test')]), ContentLength: 4 })); const storage = configured();
    expect(await storage.read('key')).toEqual(Buffer.from('test')); expect(send.mock.calls[0][0]).toBeInstanceOf(GetObjectCommand);
    send.mockImplementationOnce(async () => { throw new Error('mock-secret provider trace'); });
    await expect(storage.read('key')).rejects.toMatchObject({ response: { code: 'COMMERCE_IMAGE_STORAGE_UNAVAILABLE' } }); storage.onModuleDestroy();
  });
  it('rejects an oversized remote body', async () => {
    vi.spyOn(S3Client.prototype, 'send').mockImplementation(async () => ({ Body: Readable.from([Buffer.alloc(5242881)]), ContentLength: 5242881 })); const storage = configured();
    await expect(storage.read('key')).rejects.toMatchObject({ response: { code: 'COMMERCE_IMAGE_STORAGE_UNAVAILABLE' } }); storage.onModuleDestroy();
  });
  it('keeps credentials dormant unless a provider is explicitly selected', () => {
    const storage = new S3ProductImageStorage(new ConfigService({ R2_ACCESS_KEY_ID: 'key', ARVAN_ACCESS_KEY_ID: 'key' }));
    expect(storage.isEnabled()).toBe(false);
    storage.onModuleDestroy();
  });
  it('logs only safe failure metadata and never fails over to another provider', async () => {
    const log = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    const send = vi.spyOn(S3Client.prototype, 'send').mockRejectedValue(Object.assign(new Error('mock-secret signed URL'), { name: 'AccessDenied', $metadata: { httpStatusCode: 403 } }));
    const storage = configured();
    await expect(storage.put('private-key', Buffer.from('test'))).rejects.toMatchObject({ response: { code: 'COMMERCE_IMAGE_STORAGE_UNAVAILABLE' } });
    expect(send).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(expect.objectContaining({ provider: 'r2', operation: 'put', error: 'AccessDenied', status: 403 }));
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/mock-secret|signed URL|private-key/);
    storage.onModuleDestroy();
  });
});

describe('real SDK transport against isolated local HTTP storage', () => {
  it.each(['r2', 'arvancloud'])('%s roundtrips private bytes with only its selected credentials', async mode => {
    const bytes = Buffer.from('RIFF-test-webp');
    const requests: Array<{ method: string; url: string; auth: string; body: Buffer }> = [];
    const server = createServer(async (request, response) => {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      requests.push({ method: request.method!, url: request.url!, auth: request.headers.authorization ?? '', body: Buffer.concat(chunks) });
      if (request.method === 'GET') {
        response.writeHead(200, { 'content-length': bytes.length, 'content-type': 'image/webp' });
        response.end(bytes);
      } else { response.statusCode = request.method === 'DELETE' ? 204 : 200; response.end(); }
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const endpoint = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const storage = new S3ProductImageStorage(new ConfigService({ PRODUCT_MEDIA_STORAGE_MODE: mode,
      R2_ENDPOINT: endpoint, R2_BUCKET: 'r2-bucket', R2_REGION: 'auto', R2_ACCESS_KEY_ID: 'r2-key', R2_SECRET_ACCESS_KEY: 'r2-secret',
      ARVAN_ENDPOINT: endpoint, ARVAN_BUCKET: 'arvan-bucket', ARVAN_REGION: 'default', ARVAN_ACCESS_KEY_ID: 'arvan-key', ARVAN_SECRET_ACCESS_KEY: 'arvan-secret' }));
    try {
      await storage.put('store/test.webp', bytes);
      expect(await storage.read('store/test.webp')).toEqual(bytes);
      await storage.delete('store/test.webp');
      expect(requests.map(request => request.method)).toEqual(['PUT', 'GET', 'DELETE']);
      if (mode === 'arvancloud') expect(requests[0].body).toEqual(bytes);
      const prefix = mode === 'r2' ? 'r2' : 'arvan';
      for (const request of requests) {
        expect(request.url).toContain(`/${prefix}-bucket/store/test.webp`);
        expect(request.auth).toContain(`Credential=${prefix}-key/`);
        expect(request.auth).toContain(mode === 'r2' ? '/auto/s3/aws4_request' : '/default/s3/aws4_request');
        expect(request.auth).not.toContain(mode === 'r2' ? 'arvan-key' : 'r2-key');
      }
    } finally {
      storage.onModuleDestroy();
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  });
});
