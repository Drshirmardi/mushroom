import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApiApplication } from '../src/app.factory';
import { sendEngineMessage, auth, createChatFixture, destroyChatFixture, type ChatFixture } from './chat-test-support';

describe('chat ordering and idempotency (PostgreSQL integration)', () => {
  let app: NestFastifyApplication;
  let fixture: ChatFixture | undefined;

  beforeAll(async () => { app = await createApiApplication(); await app.init(); }, 30_000);
  afterEach(async () => { if (fixture) await destroyChatFixture(fixture); fixture = undefined; });
  afterAll(async () => { await app.close(); });

  it('commits concurrent authorized sends into one unique ascending conversation sequence', async () => {
    fixture = await createChatFixture(app);
    const conversation = await app.inject({ method: 'GET', url: `/v1/chat/appointments/${fixture.appointment.id}/conversation`, headers: auth(fixture.tokens.patient) });
    const id = conversation.json().id as string;
    const sends = await Promise.all([
      [fixture.tokens.patient, 'a9000000-0000-4000-8000-000000000001', 'patient synthetic'],
      [fixture.tokens.doctor, 'a9000000-0000-4000-8000-000000000002', 'doctor synthetic'],
      [fixture.tokens.admin, 'a9000000-0000-4000-8000-000000000003', 'operator synthetic'],
    ].map(([token, clientMessageId, body]) => sendEngineMessage(app, token, id, { clientMessageId, body })));
    expect(sends.map((response) => response.statusCode)).toEqual([200, 200, 200]);
    const sequences = sends.map((response) => response.json().sequence).sort();
    expect(sequences).toEqual(['1', '2', '3']);
    const history = await app.inject({ method: 'GET', url: `/v1/chat/conversations/${id}/messages?limit=100`, headers: auth(fixture.tokens.patient) });
    expect(history.json().items.map((message: { sequence: string }) => message.sequence)).toEqual(['1', '2', '3']);

    const replay = await sendEngineMessage(app, fixture.tokens.patient, id, { clientMessageId: 'a9000000-0000-4000-8000-000000000001', body: 'patient synthetic' });
    expect(replay.statusCode).toBe(200);
    expect(replay.json().sequence).toBe(sends[0].json().sequence);
    expect(await fixture.prisma.chatMessage.count({ where: { conversationId: id } })).toBe(3);
  });
});
