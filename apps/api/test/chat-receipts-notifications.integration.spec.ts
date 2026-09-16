import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApiApplication } from '../src/app.factory';
import { auth, createChatFixture, destroyChatFixture, type ChatFixture } from './chat-test-support';

describe('chat receipt and safe outbox integration', () => {
  let app: NestFastifyApplication; let fixture: ChatFixture | undefined;
  beforeAll(async () => { app = await createApiApplication(); await app.init(); }, 30_000);
  afterEach(async () => { if (fixture) await destroyChatFixture(fixture); fixture = undefined; });
  afterAll(async () => { await app.close(); });

  it('persists a body-free durable chat event only after a committed message', async () => {
    fixture = await createChatFixture(app);
    const conversation = await app.inject({ method: 'GET', url: `/v1/chat/appointments/${fixture.appointment.id}/conversation`, headers: auth(fixture.tokens.patient) });
    const sent = await app.inject({ method: 'POST', url: `/v1/chat/conversations/${conversation.json().id}/messages`, headers: auth(fixture.tokens.patient), payload: { clientMessageId: 'a1000000-0000-4000-8000-000000000004', body: 'must not enter notification payload' } });
    expect(sent.statusCode).toBe(201);
    const event = await fixture.prisma.outboxEvent.findFirstOrThrow({ where: { eventType: 'CHAT_MESSAGE_COMMITTED', aggregateId: conversation.json().id }, orderBy: { createdAt: 'desc' } });
    expect(event.payload).toMatchObject({ conversationId: conversation.json().id, messageId: sent.json().id });
    expect(JSON.stringify(event.payload)).not.toContain('must not enter notification payload');
  });
});
