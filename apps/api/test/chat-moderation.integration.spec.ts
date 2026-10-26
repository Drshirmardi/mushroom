import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApiApplication } from '../src/app.factory';
import { AccessTokenService } from '../src/common/auth/access-token.service';
import { ChatService } from '../src/modules/communications/chat/chat.service';
import { sendEngineMessage, auth, createChatFixture, destroyChatFixture, type ChatFixture } from './chat-test-support';

describe('chat moderation and conversation-scoped blocks (PostgreSQL API integration)', () => {
  let app: NestFastifyApplication;
  let fixture: ChatFixture | undefined;
  beforeAll(async () => { app = await createApiApplication(); await app.init(); }, 30_000);
  afterEach(async () => { if (fixture) await destroyChatFixture(fixture); fixture = undefined; });
  afterAll(async () => { await app.close(); });

  it('persists safe restrictions from direct and report-resolution paths, with content available only to audited review', async () => {
    fixture = await createChatFixture(app);
    const conversation = await app.inject({ method: 'GET', url: `/v1/chat/appointments/${fixture.appointment.id}/conversation`, headers: auth(fixture.tokens.patient) });
    const id = conversation.json().id;
    const directlyRestricted = await sendEngineMessage(app, fixture.tokens.doctor, id, { clientMessageId: 'c1000000-0000-4000-8000-000000000001', body: 'directly restricted body' });
    const directRestriction = await app.inject({ method: 'POST', url: `/v1/chat/messages/${directlyRestricted.json().messageId}/visibility`, headers: auth(fixture.tokens.admin), payload: { visibility: 'RESTRICTED', reasonCategory: 'ABUSE_OR_HARASSMENT', safeNote: 'reviewed' } });
    expect(directRestriction.statusCode).toBe(201);
    expect(directRestriction.json()).toMatchObject({ visibility: 'RESTRICTED', tombstone: expect.any(String) });
    expect(directRestriction.json().body).toBeUndefined();

    const resolvedMessage = await sendEngineMessage(app, fixture.tokens.doctor, id, { clientMessageId: 'c1000000-0000-4000-8000-000000000002', body: 'resolution restricted body' });
    const report = await app.inject({ method: 'POST', url: `/v1/chat/messages/${resolvedMessage.json().messageId}/reports`, headers: auth(fixture.tokens.patient), payload: { reasonCategory: 'ABUSE_OR_HARASSMENT', requestImmediateBlock: false } });
    expect(report.statusCode).toBe(201);
    const resolved = await app.inject({ method: 'POST', url: `/v1/chat/reports/${report.json().id}/resolve`, headers: auth(fixture.tokens.admin), payload: { resolution: 'UPHELD_POLICY_VIOLATION', action: 'RESTRICT_MESSAGE', safeNote: 'reviewed' } });
    expect(resolved.statusCode).toBe(200);
    const patientHistory = await app.inject({ method: 'GET', url: `/v1/chat/conversations/${id}/messages`, headers: auth(fixture.tokens.patient) });
    expect(patientHistory.json().items).toHaveLength(2);
    for (const item of patientHistory.json().items) {
      expect(item).toMatchObject({ visibility: 'RESTRICTED', tombstone: expect.any(String) });
      expect(item.body).toBeUndefined();
    }
    const doctorHistory = await app.inject({ method: 'GET', url: `/v1/chat/conversations/${id}/messages`, headers: auth(fixture.tokens.doctor) });
    const adminHistory = await app.inject({ method: 'GET', url: `/v1/chat/conversations/${id}/messages`, headers: auth(fixture.tokens.admin) });
    for (const response of [doctorHistory, adminHistory]) {
      expect(response.statusCode).toBe(200);
      expect(response.json().items).toHaveLength(2);
      for (const item of response.json().items) {
        expect(item).toMatchObject({ visibility: 'RESTRICTED', tombstone: expect.any(String) });
        expect(item.body).toBeUndefined();
      }
      expect(JSON.stringify(response.json())).not.toContain('directly restricted body');
      expect(JSON.stringify(response.json())).not.toContain('resolution restricted body');
    }
    const chat = app.get(ChatService);
    const tokens = app.get(AccessTokenService);
    for (const token of [fixture.tokens.patient, fixture.tokens.doctor, fixture.tokens.admin]) {
      const sync = await chat.realtimeSync(await tokens.verify(token), id, 0n);
      expect(sync.items).toHaveLength(2);
      for (const item of sync.items) {
        expect(item).toMatchObject({ visibility: 'RESTRICTED', tombstone: expect.any(String) });
        expect((item as { body?: string }).body).toBeUndefined();
      }
      expect(JSON.stringify(sync)).not.toContain('directly restricted body');
      expect(JSON.stringify(sync)).not.toContain('resolution restricted body');
    }
    expect(await fixture.prisma.chatAuditEvent.count({ where: { conversationId: id, action: 'RESTRICTED_CONTENT_REVIEWED' } })).toBe(0);
    for (const [messageId, body] of [[directlyRestricted.json().messageId, 'directly restricted body'], [resolvedMessage.json().messageId, 'resolution restricted body']]) {
      const reviewed = await app.inject({ method: 'GET', url: `/v1/chat/messages/${messageId}/restricted-content`, headers: auth(fixture.tokens.admin) });
      expect(reviewed.statusCode).toBe(200); expect(reviewed.json().body).toBe(body);
      expect(await fixture.prisma.chatAuditEvent.count({ where: { conversationId: id, action: 'RESTRICTED_CONTENT_REVIEWED', targetId: messageId } })).toBe(1);
    }
    const outbox = await fixture.prisma.outboxEvent.findMany({ where: { aggregateId: id } });
    expect(JSON.stringify(outbox)).not.toContain('directly restricted body');
    expect(JSON.stringify(outbox)).not.toContain('resolution restricted body');
    const audit = await fixture.prisma.chatAuditEvent.findMany({ where: { conversationId: id } });
    expect(JSON.stringify(audit)).not.toContain('sensitive original body');
  });

  it('persists and audits a restricted-to-visible restore without putting body into the transition boundary', async () => {
    fixture = await createChatFixture(app);
    const conversation = await app.inject({ method: 'GET', url: `/v1/chat/appointments/${fixture.appointment.id}/conversation`, headers: auth(fixture.tokens.patient) });
    const message = await sendEngineMessage(app, fixture.tokens.doctor, conversation.json().id, { clientMessageId: 'c1000000-0000-4000-8000-000000000003', body: 'restorable body' });
    const restricted = await app.inject({ method: 'POST', url: `/v1/chat/messages/${message.json().messageId}/visibility`, headers: auth(fixture.tokens.admin), payload: { visibility: 'RESTRICTED', reasonCategory: 'SPAM_OR_SCAM', safeNote: 'reviewed' } });
    expect(restricted.statusCode).toBe(201);
    const restored = await app.inject({ method: 'POST', url: `/v1/chat/messages/${message.json().messageId}/visibility`, headers: auth(fixture.tokens.admin), payload: { visibility: 'VISIBLE', safeNote: 'restored' } });
    expect(restored.statusCode).toBe(201);
    expect(restored.json()).toMatchObject({ id: message.json().messageId, sequence: '1', visibility: 'VISIBLE', body: 'restorable body' });
    const persisted = await fixture.prisma.chatMessage.findUniqueOrThrow({ where: { id: message.json().messageId } });
    expect(persisted).toMatchObject({ visibility: 'VISIBLE', restrictedReasonCategory: null, restrictedAt: null });
    expect(await fixture.prisma.chatMessageModerationAction.count({ where: { messageId: message.json().messageId, action: 'RESTORE_MESSAGE' } })).toBe(1);
    expect(await fixture.prisma.chatAuditEvent.count({ where: { conversationId: conversation.json().id, targetId: message.json().messageId, action: 'MESSAGE_RESTORED' } })).toBe(1);
  });

  it('recovers durable visibility changes after a missed publish without leaking restricted text', async () => {
    fixture = await createChatFixture(app);
    const conversation = await app.inject({ method: 'GET', url: `/v1/chat/appointments/${fixture.appointment.id}/conversation`, headers: auth(fixture.tokens.patient) });
    const conversationId = conversation.json().id as string;
    const message = await sendEngineMessage(app, fixture.tokens.doctor, conversationId, { clientMessageId: 'c1000000-0000-4000-8000-000000000004', body: 'missed publish private text' });
    expect(message.statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: `/v1/chat/messages/${message.json().messageId}/visibility`, headers: auth(fixture.tokens.admin), payload: { visibility: 'RESTRICTED', reasonCategory: 'SPAM_OR_SCAM', safeNote: 'reviewed' } })).statusCode).toBe(201);

    const restricted = await app.inject({ method: 'GET', url: `/v1/chat/conversations/${conversationId}/visibility-reconciliation`, headers: auth(fixture.tokens.patient) });
    expect(restricted.statusCode).toBe(200);
    expect(restricted.json()).toMatchObject({ items: [expect.objectContaining({ message: expect.objectContaining({ id: message.json().messageId, visibility: 'RESTRICTED', tombstone: expect.any(String) }) })], checkpointCursor: expect.any(String) });
    expect(JSON.stringify(restricted.json())).not.toContain('missed publish private text');
    const checkpoint = restricted.json().checkpointCursor as string;

    expect((await app.inject({ method: 'POST', url: `/v1/chat/messages/${message.json().messageId}/visibility`, headers: auth(fixture.tokens.admin), payload: { visibility: 'VISIBLE', safeNote: 'restored' } })).statusCode).toBe(201);
    const restored = await app.inject({ method: 'GET', url: `/v1/chat/conversations/${conversationId}/visibility-reconciliation?cursor=${encodeURIComponent(checkpoint)}`, headers: auth(fixture.tokens.patient) });
    expect(restored.statusCode).toBe(200);
    expect(restored.json()).toMatchObject({ items: [expect.objectContaining({ message: expect.objectContaining({ id: message.json().messageId, visibility: 'VISIBLE', body: 'missed publish private text' }) })], checkpointCursor: expect.any(String) });

    const outsider = await app.inject({ method: 'GET', url: `/v1/chat/conversations/${conversationId}/visibility-reconciliation`, headers: auth(fixture.tokens.outsider) });
    expect(outsider.statusCode).toBe(403);
    expect(JSON.stringify(outsider.json())).not.toContain('missed publish private text');
  });

  it('serves an authorized restored message beyond the first cursor page without leaking it to an outsider', async () => {
    fixture = await createChatFixture(app);
    const conversation = await app.inject({ method: 'GET', url: `/v1/chat/appointments/${fixture.appointment.id}/conversation`, headers: auth(fixture.tokens.patient) });
    const conversationId = conversation.json().id;
    await fixture.prisma.chatMessage.createMany({ data: Array.from({ length: 100 }, (_, index) => ({
      clinicId: fixture!.clinic.id, conversationId, sequence: BigInt(index + 1), senderUserId: fixture!.users.admin.id,
      senderKind: 'CLINIC_OPERATOR', clientMessageId: `pagination-seed-${index + 1}`, requestPayloadHash: 'a'.repeat(64), body: `pagination seed ${index + 1}`,
    })) });
    const target = await sendEngineMessage(app, fixture.tokens.doctor, conversationId, { clientMessageId: 'c1000000-0000-4000-8000-000000000101', body: 'restored beyond first page' });
    expect(target.statusCode).toBe(200); expect(target.json().sequence).toBe('101');
    expect((await app.inject({ method: 'POST', url: `/v1/chat/messages/${target.json().messageId}/visibility`, headers: auth(fixture.tokens.admin), payload: { visibility: 'RESTRICTED', reasonCategory: 'SPAM_OR_SCAM', safeNote: 'reviewed' } })).statusCode).toBe(201);
    expect((await app.inject({ method: 'POST', url: `/v1/chat/messages/${target.json().messageId}/visibility`, headers: auth(fixture.tokens.admin), payload: { visibility: 'VISIBLE', safeNote: 'restored' } })).statusCode).toBe(201);
    const first = await app.inject({ method: 'GET', url: `/v1/chat/conversations/${conversationId}/messages?limit=100`, headers: auth(fixture.tokens.patient) });
    expect(first.statusCode).toBe(200); expect(first.json().items).toHaveLength(100); expect(first.json().items.find((item: { id: string }) => item.id === target.json().messageId)).toBeUndefined();
    const second = await app.inject({ method: 'GET', url: `/v1/chat/conversations/${conversationId}/messages?limit=100&cursor=${encodeURIComponent(first.json().nextCursor)}`, headers: auth(fixture.tokens.patient) });
    expect(second.statusCode).toBe(200); expect(second.json().items).toEqual([expect.objectContaining({ id: target.json().messageId, sequence: '101', visibility: 'VISIBLE', body: 'restored beyond first page' })]);
    const outsider = await app.inject({ method: 'GET', url: `/v1/chat/conversations/${conversationId}/messages?limit=100&cursor=${encodeURIComponent(first.json().nextCursor)}`, headers: auth(fixture.tokens.outsider) });
    expect(outsider.statusCode).toBe(403); expect(JSON.stringify(outsider.json())).not.toContain('restored beyond first page');
  });
});
