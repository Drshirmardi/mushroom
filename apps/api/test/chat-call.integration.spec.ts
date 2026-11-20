import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApiApplication } from '../src/app.factory';
import { validateChatAttachment } from '../src/modules/communications/chat/chat-attachments.service';
import { auth, createChatFixture, destroyChatFixture } from './chat-test-support';

describe('isolated consultation calls', () => {
  let app: NestFastifyApplication;
  const secret = 'synthetic-video-signaling-secret-for-integration-tests';
  beforeAll(async () => {
    vi.stubEnv('CHAT_VIDEO_ENABLED', 'true');
    vi.stubEnv('CHAT_VIDEO_ORIGIN', 'https://video.example.invalid');
    vi.stubEnv('CHAT_VIDEO_SECRET', secret);
    app = await createApiApplication();
    await app.init();
  });
  afterAll(async () => { await app?.close(); vi.unstubAllEnvs(); });

  it('rings the patient, reserves the call, redeems entry once and revokes it after completion', async () => {
    const fixture = await createChatFixture(app);
    try {
      const start = '/v1/chat/appointments/' + fixture.appointment.id + '/calls';
      const incoming = '/v1/chat/calls/incoming';
      const lease = '/v1/chat/internal/video-lease';
      expect((await app.inject({ method: 'POST', url: start, headers: auth(fixture.tokens.patient) })).statusCode).toBe(403);
      expect((await app.inject({ method: 'POST', url: start, headers: auth(fixture.tokens.doctor) })).json().code).toBe('CHAT_PATIENT_OFFLINE');
      expect((await app.inject({ method: 'GET', url: incoming, headers: auth(fixture.tokens.patient) })).json().call).toBeNull();
      const started = await app.inject({ method: 'POST', url: start, headers: auth(fixture.tokens.admin), payload: { mode: 'AUDIO' } });
      expect(started.statusCode, started.body).toBe(201);
      const id = started.json().id;
      const call = '/v1/chat/calls/' + id;
      expect((await app.inject({ method: 'POST', url: start, headers: auth(fixture.tokens.doctor) })).statusCode).toBe(409);
      expect((await app.inject({ method: 'GET', url: call, headers: auth(fixture.tokens.outsider) })).statusCode).toBe(403);
      expect((await app.inject({ method: 'GET', url: incoming, headers: auth(fixture.tokens.patient) })).json().call).toMatchObject({ id, status: 'RINGING', callerKind: 'CLINIC_OPERATOR', mode: 'AUDIO' });
      const conversation = await fixture.chat.chatConversation.findUniqueOrThrow({ where: { appointmentId: fixture.appointment.id } });
      const history = '/v1/chat/conversations/' + conversation.id;
      const messages = await app.inject({ method: 'GET', url: history + '/messages?direction=latest', headers: auth(fixture.tokens.patient) });
      expect(messages.json().items).toEqual([expect.objectContaining({ callId: id })]);
      const card = history + '/calls/' + id;
      expect((await app.inject({ method: 'GET', url: card, headers: auth(fixture.tokens.outsider) })).statusCode).toBe(403);
      const answered = await app.inject({ method: 'POST', url: call + '/action', headers: auth(fixture.tokens.patient), payload: { action: 'answer' } });
      expect(answered.statusCode, answered.body).toBe(201);
      expect(answered.json().status).toBe('ACTIVE');
      const grant = await app.inject({ method: 'POST', url: call + '/grant', headers: auth(fixture.tokens.patient) });
      expect(grant.statusCode, grant.body).toBe(201);
      const url = new URL(grant.json().url);
      expect(url.searchParams.get('mode')).toBe('AUDIO');
      const code = url.hash.slice(1);
      const redeem = () => app.inject({ method: 'POST', url: lease, headers: { 'x-chat-video-secret': secret }, payload: { code } });
      expect((await redeem()).json()).toMatchObject({ callId: id, userId: fixture.users.patient.id });
      expect((await redeem()).statusCode).toBe(403);
      const connected = (userId: string) => app.inject({
        method: 'POST', url: lease, headers: { 'x-chat-video-secret': secret }, payload: { callId: id, userId, action: 'connected' },
      });
      expect((await connected(fixture.users.patient.id)).statusCode).toBe(201);
      const cardState = () => app.inject({ method: 'GET', url: card, headers: auth(fixture.tokens.patient) });
      expect((await cardState()).json().connectedAt).toBeNull();
      expect((await connected(fixture.users.admin.id)).statusCode).toBe(201);
      expect((await cardState()).json()).toMatchObject({ mode: 'AUDIO', status: 'ACTIVE', connectedAt: expect.any(String) });
      await fixture.prisma.appointment.update({ where: { id: fixture.appointment.id }, data: { status: 'COMPLETED', completedAt: new Date() } });
      expect((await app.inject({ method: 'POST', url: lease, headers: { 'x-chat-video-secret': secret }, payload: { callId: id, userId: fixture.users.patient.id } })).statusCode).toBe(403);
      expect((await cardState()).json()).toMatchObject({ status: 'ENDED', endedAt: expect.any(String) });
    } finally { await destroyChatFixture(fixture); }
  });
});

it('rejects a mismatched document signature and sanitizes the file name', () => {
  expect(() => validateChatAttachment('test.pdf', Buffer.from('not a PDF'))).toThrow();
  expect(validateChatAttachment('folder/medical.pdf', Buffer.from('%PDF-1.7'))).toEqual({
    name: 'folder_medical.pdf', mime: 'application/pdf', size: 8,
  });
});

it('validates bounded MP4 boxes before allowing a video attachment', () => {
  const brands = Buffer.from('000000146674797069736f6d0000020069736f6d', 'hex');
  const movie = Buffer.from('000000096d6f6f7600', 'hex');
  const data = Buffer.from('000000096d64617400', 'hex');
  const file = Buffer.concat([brands, movie, data]);
  expect(validateChatAttachment('sample.mp4', file)).toEqual({ name: 'sample.mp4', mime: 'video/mp4', size: file.length });
  expect(() => validateChatAttachment('sample.mp4', file.subarray(0, -1))).toThrow();
  expect(() => validateChatAttachment('sample.mp4', Buffer.concat([brands, data]))).toThrow();
});
