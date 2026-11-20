import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createHash } from 'node:crypto';
import { createConnection } from 'node:net';
import type { Readable } from 'node:stream';

export const MAX_CHAT_ATTACHMENT = 20 * 1024 * 1024;
export type ChatAttachment = { key: string; name: string; mime: string; size: number };

const types: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  mp4: 'video/mp4',
};

function isWordDocument(bytes: Buffer) {
  const end = bytes.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (end < 0 || end + 22 > bytes.length || bytes.readUInt32LE(0) !== 0x04034b50) return false;
  let offset = bytes.readUInt32LE(end + 16);
  const names = new Set<string>();
  while (offset + 46 <= end && bytes.readUInt32LE(offset) === 0x02014b50) {
    const length = bytes.readUInt16LE(offset + 28);
    names.add(bytes.toString('utf8', offset + 46, offset + 46 + length));
    offset += 46 + length + bytes.readUInt16LE(offset + 30) + bytes.readUInt16LE(offset + 32);
  }
  return offset === end && names.has('[Content_Types].xml') && names.has('word/document.xml')
    && ![...names].some(name => /vbaproject|activex|embeddings/i.test(name));
}

function isMp4(bytes: Buffer) {
  if (bytes.length < 16 || bytes.toString('ascii', 4, 8) !== 'ftyp') return false;
  const headerSize = bytes.readUInt32BE(0);
  if (headerSize < 16 || headerSize > bytes.length || headerSize % 4 !== 0) return false;
  const brands = new Set(['isom', 'iso2', 'iso5', 'iso6', 'mp41', 'mp42', 'avc1', 'M4V ']);
  let compatible = brands.has(bytes.toString('ascii', 8, 12));
  for (let i = 16; !compatible && i < headerSize; i += 4) compatible = brands.has(bytes.toString('ascii', i, i + 4));
  if (!compatible) return false;
  let movie = false;
  let data = false;
  let offset = headerSize;
  while (offset + 8 <= bytes.length) {
    const size = bytes.readUInt32BE(offset);
    const kind = bytes.toString('ascii', offset + 4, offset + 8);
    const length = size === 0 ? bytes.length - offset : size;
    if (length < 8 || offset + length > bytes.length) return false;
    movie ||= kind === 'moov' && length > 8;
    data ||= kind === 'mdat' && length > 8;
    offset += length;
  }
  return offset === bytes.length && movie && data;
}

export function validateChatAttachment(filename: string, bytes: Buffer) {
  const name = filename.normalize('NFC').replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069/\\]/gu, '_').slice(-180);
  const ext = name.split('.').at(-1)?.toLowerCase() ?? '';
  const mime = types[ext];
  if (bytes.length < 8 || bytes.length > MAX_CHAT_ATTACHMENT || !mime) throw new BadRequestException('Invalid attachment');
  const header = bytes.subarray(0, 8).toString('hex');
  const valid = ext === 'pdf' ? header.startsWith('255044462d')
    : ext === 'png' ? header === '89504e470d0a1a0a'
    : ext === 'mp4' ? isMp4(bytes)
    : ext === 'docx' ? isWordDocument(bytes)
    : header.startsWith('ffd8ff');
  if (!valid) throw new BadRequestException('Invalid attachment');
  return { name, mime, size: bytes.length };
}

@Injectable()
export class ChatAttachmentsService {
  private readonly client?: S3Client;
  private readonly bucket = process.env.CHAT_S3_BUCKET;
  private readonly scanner = process.env.CHAT_CLAMAV_HOST;

  constructor() {
    const { CHAT_S3_ACCESS_KEY, CHAT_S3_SECRET_KEY, CHAT_S3_ENDPOINT } = process.env;
    if (!this.bucket || !CHAT_S3_ACCESS_KEY || !CHAT_S3_SECRET_KEY || !CHAT_S3_ENDPOINT) return;
    this.client = new S3Client({
      endpoint: CHAT_S3_ENDPOINT, region: process.env.CHAT_S3_REGION ?? 'us-east-1', forcePathStyle: true,
      credentials: { accessKeyId: CHAT_S3_ACCESS_KEY, secretAccessKey: CHAT_S3_SECRET_KEY },
    });
  }

  async save(conversationId: string, clientMessageId: string, userId: string, filename: string, bytes: Buffer): Promise<ChatAttachment> {
    if (!this.client || !this.bucket || !this.scanner) throw new ServiceUnavailableException('Attachment storage unavailable');
    const metadata = validateChatAttachment(filename, bytes);
    await this.scan(this.scanner, bytes);
    const digest = createHash('sha256').update(bytes).digest('hex');
    const key = [conversationId, userId, clientMessageId, digest].join('/');
    try {
      await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: bytes, ContentType: metadata.mime }), { abortSignal: AbortSignal.timeout(15_000) });
    } catch {
      throw new ServiceUnavailableException('Attachment storage unavailable');
    }
    return { key, ...metadata };
  }

  async download(key: string) {
    if (!this.client || !this.bucket) throw new ServiceUnavailableException('Attachment storage unavailable');
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }), { abortSignal: AbortSignal.timeout(15_000) });
    if (!result.Body) throw new ServiceUnavailableException('Attachment unavailable');
    return result.Body as Readable;
  }

  private scan(host: string, bytes: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = createConnection({ host, port: Number(process.env.CHAT_CLAMAV_PORT ?? 3310) });
      let response = '';
      const unavailable = () => reject(new ServiceUnavailableException('Attachment scanner unavailable'));
      socket.setTimeout(20_000, () => socket.destroy(new Error('Scanner timed out')));
      socket.once('error', unavailable);
      socket.once('close', unavailable);
      socket.once('connect', () => {
        socket.write('zINSTREAM\0');
        const size = Buffer.alloc(4);
        size.writeUInt32BE(bytes.length);
        socket.write(size);
        socket.write(bytes);
        socket.write(Buffer.alloc(4));
      });
      socket.on('data', (chunk: Buffer) => {
        response += chunk.toString('utf8');
        if (!response.includes('\0') && response.length < 512) return;
        if (response === 'stream: OK\0') resolve();
        else if (response.endsWith(' FOUND\0')) reject(new BadRequestException('Unsafe attachment'));
        else unavailable();
        socket.destroy();
      });
    });
  }
}
