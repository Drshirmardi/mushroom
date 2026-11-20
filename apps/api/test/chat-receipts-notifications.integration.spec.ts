import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApiApplication } from '../src/app.factory';
import { sendChatMessage, auth, createChatFixture, destroyChatFixture, type ChatFixture } from './chat-test-support';

describe('chat receipt and safe outbox integration', () => {
  let app: NestFastifyApplication; let fixture: ChatFixture | undefined;
  beforeAll(async () => { app = await createApiApplication(); await app.init(); }, 30_000);
  afterEach(async () => { if (fixture) await destroyChatFixture(fixture); fixture = undefined; });
  afterAll(async () => { await app.close(); });

  it('persists read receipts and keeps communications out of the main database', async () => {
    fixture = await createChatFixture(app);
    const conversation = await app.inject({ method: 'GET', url: `/v1/chat/appointments/${fixture.appointment.id}/conversation`, headers: auth(fixture.tokens.patient) });
    const sent = await sendChatMessage(app, fixture.tokens.patient, conversation.json().id, { clientMessageId: 'a1000000-0000-4000-8000-000000000004', body: 'must not enter notification payload' });
    expect(sent.statusCode).toBe(200);
    const id = conversation.json().id;
    const receipt = await app.inject({ method: 'POST', url: '/v1/chat/conversations/' + id + '/receipts/' + sent.json().id, headers: auth(fixture.tokens.doctor) });
    expect(receipt.statusCode).toBe(204);
    expect(await fixture.chat.chatReceipt.findFirst({ where: { conversationId: id } })).toMatchObject({ lastReadSequence: 1n });
    expect(await fixture.prisma.outboxEvent.count({ where: { eventType: 'CHAT_MESSAGE_COMMITTED', aggregateId: id } })).toBe(0);
    expect(await fixture.prisma.chatMessage.count({ where: { conversationId: id } })).toBe(0);
  });
});
