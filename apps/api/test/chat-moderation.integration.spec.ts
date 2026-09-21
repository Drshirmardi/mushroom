import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApiApplication } from '../src/app.factory';
import { AccessTokenService } from '../src/common/auth/access-token.service';
import { ChatService } from '../src/modules/communications/chat/chat.service';
import { auth, createChatFixture, destroyChatFixture, type ChatFixture } from './chat-test-support';

describe('chat moderation and conversation-scoped blocks (PostgreSQL API integration)', () => {
  let app: NestFastifyApplication;
  let fixture: ChatFixture | undefined;
  beforeAll(async () => { app = await createApiApplication(); await app.init(); }, 30_000);
  afterEach(async () => { if (fixture) await destroyChatFixture(fixture); fixture = undefined; });
  afterAll(async () => { await app.close(); });

  it('returns restricted content only from explicit audited moderation review', async () => {
    fixture = await createChatFixture(app);
    const conversation = await app.inject({ method: 'GET', url: `/v1/chat/appointments/${fixture.appointment.id}/conversation`, headers: auth(fixture.tokens.patient) });
    const id = conversation.json().id;
    const doctorMessage = await app.inject({ method: 'POST', url: `/v1/chat/conversations/${id}/messages`, headers: auth(fixture.tokens.doctor), payload: { clientMessageId: 'c1000000-0000-4000-8000-000000000001', body: 'sensitive original body' } });
    const report = await app.inject({ method: 'POST', url: `/v1/chat/messages/${doctorMessage.json().id}/reports`, headers: auth(fixture.tokens.patient), payload: { reasonCategory: 'ABUSE_OR_HARASSMENT', requestImmediateBlock: false } });
    expect(report.statusCode).toBe(201);
    const resolved = await app.inject({ method: 'POST', url: `/v1/chat/reports/${report.json().id}/resolve`, headers: auth(fixture.tokens.admin), payload: { resolution: 'UPHELD_POLICY_VIOLATION', action: 'RESTRICT_MESSAGE', safeNote: 'reviewed' } });
    expect(resolved.statusCode).toBe(200);
    const patientHistory = await app.inject({ method: 'GET', url: `/v1/chat/conversations/${id}/messages`, headers: auth(fixture.tokens.patient) });
    expect(patientHistory.json().items[0]).toMatchObject({ visibility: 'RESTRICTED', tombstone: expect.any(String) });
    expect(patientHistory.json().items[0].body).toBeUndefined();
    const doctorHistory = await app.inject({ method: 'GET', url: `/v1/chat/conversations/${id}/messages`, headers: auth(fixture.tokens.doctor) });
    const adminHistory = await app.inject({ method: 'GET', url: `/v1/chat/conversations/${id}/messages`, headers: auth(fixture.tokens.admin) });
    for (const response of [doctorHistory, adminHistory]) {
      expect(response.statusCode).toBe(200);
      expect(response.json().items[0]).toMatchObject({ visibility: 'RESTRICTED', tombstone: expect.any(String) });
      expect(response.json().items[0].body).toBeUndefined();
      expect(JSON.stringify(response.json())).not.toContain('sensitive original body');
    }
    const chat = app.get(ChatService);
    const tokens = app.get(AccessTokenService);
    for (const token of [fixture.tokens.patient, fixture.tokens.doctor, fixture.tokens.admin]) {
      const sync = await chat.realtimeSync(await tokens.verify(token), id, 0n);
      expect(sync.items[0]).toMatchObject({ visibility: 'RESTRICTED', tombstone: expect.any(String) });
      expect((sync.items[0] as { body?: string }).body).toBeUndefined();
      expect(JSON.stringify(sync)).not.toContain('sensitive original body');
    }
    expect(await fixture.prisma.chatAuditEvent.count({ where: { conversationId: id, action: 'RESTRICTED_CONTENT_REVIEWED' } })).toBe(0);
    const reviewed = await app.inject({ method: 'GET', url: `/v1/chat/messages/${doctorMessage.json().id}/restricted-content`, headers: auth(fixture.tokens.admin) });
    expect(reviewed.statusCode).toBe(200); expect(reviewed.json().body).toBe('sensitive original body');
    expect(await fixture.prisma.chatAuditEvent.count({ where: { conversationId: id, action: 'RESTRICTED_CONTENT_REVIEWED', targetId: doctorMessage.json().id } })).toBe(1);
    const outbox = await fixture.prisma.outboxEvent.findMany({ where: { aggregateId: id } });
    expect(JSON.stringify(outbox)).not.toContain('sensitive original body');
    const audit = await fixture.prisma.chatAuditEvent.findMany({ where: { conversationId: id } });
    expect(JSON.stringify(audit)).not.toContain('sensitive original body');
  });
});
