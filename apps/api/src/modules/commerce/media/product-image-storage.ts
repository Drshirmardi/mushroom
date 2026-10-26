import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
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
export class S3ProductImageStorage extends ProductImageStorage implements OnModuleDestroy {
  private readonly logger = new Logger(S3ProductImageStorage.name);
  private readonly provider: string;
  private readonly client?: S3Client;
  private readonly bucket: string;
  private readonly timeout: number;

  constructor(config: ConfigService) {
    super();
    this.provider = config.get<string>('PRODUCT_MEDIA_STORAGE_MODE', 'disabled');
    const prefix = this.provider === 'arvancloud' ? 'ARVAN' : 'R2';
    this.bucket = config.get<string>(`${prefix}_BUCKET`, '');
    this.timeout = config.get<number>(`${prefix}_REQUEST_TIMEOUT_MS`, 5000);
    if (this.provider === 'r2' || this.provider === 'arvancloud') {
      this.client = new S3Client({
        endpoint: config.getOrThrow<string>(`${prefix}_ENDPOINT`),
        region: config.get<string>(`${prefix}_REGION`, prefix === 'R2' ? 'auto' : 'default'),
        credentials: { accessKeyId: config.getOrThrow<string>(`${prefix}_ACCESS_KEY_ID`), secretAccessKey: config.getOrThrow<string>(`${prefix}_SECRET_ACCESS_KEY`) },
        // Arvan documents path-style addressing; R2 retains its existing addressing.
        forcePathStyle: this.provider === 'arvancloud',
        ...(this.provider === 'arvancloud' ? { requestChecksumCalculation: 'WHEN_REQUIRED' as const } : {}),
        maxAttempts: 1, requestHandler: { connectionTimeout: 1000, requestTimeout: this.timeout },
      });
    }
  }

  isEnabled() { return Boolean(this.client); }
  async put(key: string, bytes: Buffer) {
    try { if (!this.client) throw storageUnavailable(); await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: bytes, ContentType: 'image/webp' }), { abortSignal: AbortSignal.timeout(this.timeout) }); }
    catch (error) { this.unavailable('put', error); }
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
    } catch (error) { return this.unavailable('read', error); }
  }
  async delete(key: string) {
    try { if (!this.client) throw storageUnavailable(); await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }), { abortSignal: AbortSignal.timeout(this.timeout) }); }
    catch (error) { this.unavailable('delete', error); }
  }
  private unavailable(operation: string, error: unknown): never {
    const failure = error as { name?: unknown; code?: unknown; $metadata?: { httpStatusCode?: unknown } } | null;
    const safeLabel = (value: unknown) => typeof value === 'string' && /^[A-Za-z0-9_]{1,64}$/.test(value) ? value : 'unknown';
    const status = failure?.$metadata?.httpStatusCode;
    // Never log raw SDK errors, messages, URLs, keys, credentials or response bodies.
    this.logger.warn({ event: 'product_media_storage_failure', provider: this.provider, operation,
      error: safeLabel(failure?.name), code: safeLabel(failure?.code),
      status: typeof status === 'number' ? status : undefined });
    throw storageUnavailable();
  }
  onModuleDestroy() { this.client?.destroy(); }
}
