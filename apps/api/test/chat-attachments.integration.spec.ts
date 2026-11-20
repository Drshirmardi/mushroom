import { randomUUID } from 'node:crypto';
import { createServer } from 'node:net';
import type { AddressInfo } from 'node:net';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApiApplication } from '../src/app.factory';
import { auth, createChatFixture, destroyChatFixture } from './chat-test-support';

describe.runIf(process.env.CHAT_ATTACHMENT_INTEGRATION === '1')('chat attachments against isolated S3 storage', () => {
  let app: NestFastifyApplication;
  const scanner = createServer(socket => {
    let input = Buffer.alloc(0);
    socket.on('data', chunk => {
      input = Buffer.concat([input, chunk]);
      if (input.length < 14 || input.length < 14 + input.readUInt32BE(10)) return;
      const unsafe = input.includes('synthetic-unsafe-marker');
      socket.end(unsafe ? 'stream: synthetic FOUND\0' : 'stream: OK\0');
    });
  });
  beforeAll(async () => {
    await new Promise<void>(resolve => scanner.listen(0, '127.0.0.1', resolve));
    vi.stubEnv('CHAT_CLAMAV_HOST', '127.0.0.1');
    vi.stubEnv('CHAT_CLAMAV_PORT', String((scanner.address() as AddressInfo).port));
    app = await createApiApplication();
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
    await new Promise<void>((resolve, reject) => scanner.close(error => error ? reject(error) : resolve()));
    vi.unstubAllEnvs();
  });

  it('stores clean attachments, preserves the idempotency key and protects download and moderation boundaries', async () => {
    const fixture = await createChatFixture(app);
    try {
      const opened = await app.inject({
        method: 'GET', url: '/v1/chat/appointments/' + fixture.appointment.id + '/conversation', headers: auth(fixture.tokens.patient),
      });
      expect(opened.statusCode, opened.body).toBe(200);
      const conversation = opened.json().id;
      const route = '/v1/chat/conversations/' + conversation + '/attachments/';
      const upload = (id: string, file: string) => app.inject({
        method: 'POST', url: route + id,
        headers: { ...auth(fixture.tokens.patient), 'content-type': 'multipart/form-data; boundary=mushroom-test' },
        payload: '--mushroom-test\r\nContent-Disposition: form-data; name="file"; filename="test.pdf"\r\nContent-Type: application/pdf\r\n\r\n'
          + file + '\r\n--mushroom-test--\r\n',
      });
      const safe = '%PDF-1.7\nSynthetic test PDF';
      const uploadId = randomUUID();
      const sent = await upload(uploadId, safe);
      expect(sent.statusCode, sent.body).toBe(201);
      expect(sent.json().attachment).toEqual({ name: 'test.pdf', mime: 'application/pdf', size: Buffer.byteLength(safe) });
      expect((await upload(uploadId, safe)).json().id).toBe(sent.json().id);
      expect((await upload(randomUUID(), '%PDF-1.7 synthetic-unsafe-marker')).statusCode).toBe(400);
      const url = route + sent.json().id;
      const downloaded = await app.inject({ method: 'GET', url, headers: auth(fixture.tokens.doctor) });
      expect(downloaded.statusCode, downloaded.body).toBe(200);
      expect(downloaded.body).toBe(safe);
      expect((await app.inject({ method: 'GET', url, headers: auth(fixture.tokens.outsider) })).statusCode).toBe(403);
      expect((await app.inject({
        method: 'POST', url: '/v1/chat/messages/' + sent.json().id + '/visibility', headers: auth(fixture.tokens.admin),
        payload: { visibility: 'RESTRICTED', reasonCategory: 'ABUSE_OR_HARASSMENT' },
      })).statusCode).toBe(201);
      expect((await app.inject({ method: 'GET', url, headers: auth(fixture.tokens.doctor) })).statusCode).toBe(403);
    } finally { await destroyChatFixture(fixture); }
  });
});
