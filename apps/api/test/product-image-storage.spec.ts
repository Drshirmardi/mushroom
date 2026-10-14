import { Readable } from 'node:stream';
import { ConfigService } from '@nestjs/config';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { R2ProductImageStorage } from '../src/modules/commerce/media/product-image-storage';

const configured = () => new R2ProductImageStorage(new ConfigService({ PRODUCT_MEDIA_STORAGE_MODE: 'r2', R2_ENDPOINT: 'https://mock.r2.cloudflarestorage.com', R2_BUCKET: 'dev-sabz', R2_REGION: 'auto', R2_ACCESS_KEY_ID: 'mock-key', R2_SECRET_ACCESS_KEY: 'mock-secret', R2_REQUEST_TIMEOUT_MS: 1000 }));
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
});
