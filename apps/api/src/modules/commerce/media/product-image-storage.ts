import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { storageUnavailable } from './product-image.errors';
import { Readable } from 'node:stream';

export abstract class ProductImageStorage {
  abstract isEnabled(): boolean;
  abstract put(key: string, bytes: Buffer): Promise<void>;
  abstract read(key: string): Promise<Buffer>;
  abstract delete(key: string): Promise<void>;
}

@Injectable()
export class R2ProductImageStorage extends ProductImageStorage implements OnModuleDestroy {
  private readonly client?: S3Client;
  private readonly bucket: string;
  private readonly timeout: number;

  constructor(config: ConfigService) {
    super();
    this.bucket = config.get<string>('R2_BUCKET', '');
    this.timeout = config.get<number>('R2_REQUEST_TIMEOUT_MS', 5000);
    if (config.get('PRODUCT_MEDIA_STORAGE_MODE') === 'r2') {
      this.client = new S3Client({
        endpoint: config.getOrThrow<string>('R2_ENDPOINT'), region: config.get<string>('R2_REGION', 'auto'),
        credentials: { accessKeyId: config.getOrThrow<string>('R2_ACCESS_KEY_ID'), secretAccessKey: config.getOrThrow<string>('R2_SECRET_ACCESS_KEY') },
        maxAttempts: 1, requestHandler: { connectionTimeout: 1000, requestTimeout: this.timeout },
      });
    }
  }

  isEnabled() { return Boolean(this.client); }
  async put(key: string, bytes: Buffer) {
    try { if (!this.client) throw storageUnavailable(); await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: bytes, ContentType: 'image/webp' }), { abortSignal: AbortSignal.timeout(this.timeout) }); }
    catch { throw storageUnavailable(); }
  }
  async read(key: string) {
    try {
      if (!this.client) throw storageUnavailable();
      const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }), { abortSignal: AbortSignal.timeout(this.timeout) });
      if (!(result.Body instanceof Readable) || (result.ContentLength ?? 0) > 5242880) { if (result.Body instanceof Readable) result.Body.destroy(); throw storageUnavailable(); }
      const body = result.Body;
      const timer = setTimeout(() => body.destroy(), this.timeout); timer.unref();
      const chunks: Buffer[] = []; let size = 0;
      try { for await (const chunk of body as AsyncIterable<Uint8Array>) {
        size += chunk.length; if (size > 5242880) throw storageUnavailable(); chunks.push(Buffer.from(chunk));
      } } finally { clearTimeout(timer); body.destroy(); }
      if (!size || (result.ContentLength !== undefined && result.ContentLength !== size)) throw storageUnavailable();
      return Buffer.concat(chunks);
    } catch { throw storageUnavailable(); }
  }
  async delete(key: string) {
    try { if (!this.client) throw storageUnavailable(); await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }), { abortSignal: AbortSignal.timeout(this.timeout) }); }
    catch { throw storageUnavailable(); }
  }
  onModuleDestroy() { this.client?.destroy(); }
}
