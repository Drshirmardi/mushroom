import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApiApplication } from '../src/app.factory';
import { auth, createChatFixture, destroyChatFixture, type ChatFixture } from './chat-test-support';

describe('chat abuse moderation and authorization (PostgreSQL integration)', () => {
  let app: NestFastifyApplication;
  let fixture: ChatFixture | undefined;

  beforeAll(async () => { app = await createApiApplication(); await app.init(); }, 30_000);
  afterEach(async () => { if (fixture) await destroyChatFixture(fixture); fixture = undefined; });
  afterAll(async () => { await app.close(); });

  it('keeps retained history readable, blocks only future human sends, and audits operator moderation', async () => {
    fixture = await createChatFixture(app);
    const conversation = await app.inject({ method: 'GET', url: `/v1/chat/appointments/${fixture.appointment.id}/conversation`, headers: auth(fixture.tokens.patient) });
    const id = conversation.json().id as string;
    const doctorMessage = await app.inject({ method: 'POST', url: `/v1/chat/conversations/${id}/messages`, headers: auth(fixture.tokens.doctor), payload: { clientMessageId: 'a9400000-0000-4000-8000-000000000001', body: 'synthetic sensitive message' } });
    const report = await app.inject({ method: 'POST', url: `/v1/chat/messages/${doctorMessage.json().id}/reports`, headers: auth(fixture.tokens.patient), payload: { reasonCategory: 'ABUSE_OR_HARASSMENT', requestImmediateBlock: true } });
    expect(report.statusCode).toBe(201);
    const history = await app.inject({ method: 'GET', url: `/v1/chat/conversations/${id}/messages`, headers: auth(fixture.tokens.patient) });
    expect(history.statusCode).toBe(200); expect(history.json().items).toHaveLength(1);
    const blocked = await app.inject({ method: 'POST', url: `/v1/chat/conversations/${id}/messages`, headers: auth(fixture.tokens.patient), payload: { clientMessageId: 'a9400000-0000-4000-8000-000000000002', body: 'must be rejected' } });
    expect(blocked.statusCode).toBe(403); expect(blocked.json().code).toBe('CHAT_BLOCKED');
    const resolution = await app.inject({ method: 'POST', url: `/v1/chat/reports/${report.json().id}/resolve`, headers: auth(fixture.tokens.admin), payload: { resolution: 'UPHELD_POLICY_VIOLATION', action: 'RESTRICT_MESSAGE', safeNote: 'synthetic review' } });
    expect(resolution.statusCode).toBe(200);
    const ordinary = await app.inject({ method: 'GET', url: `/v1/chat/conversations/${id}/messages`, headers: auth(fixture.tokens.patient) });
    expect(ordinary.json().items[0]).toMatchObject({ id: doctorMessage.json().id, visibility: 'RESTRICTED', tombstone: expect.any(String) });
    expect(ordinary.json().items[0].body).toBeUndefined();
    const audit = await fixture.prisma.chatAuditEvent.findMany({ where: { conversationId: id }, select: { action: true } });
    expect(audit.map(({ action }) => action)).toEqual(expect.arrayContaining(['REPORT_CREATED', 'BLOCK_REQUESTED', 'REPORT_RESOLVED', 'MESSAGE_RESTRICTED']));
  });

  it('does not disclose a consultation to a different appointment patient or STAFF', async () => {
    fixture = await createChatFixture(app);
    const foreign = await createChatFixture(app);
    try {
      const path = `/v1/chat/appointments/${fixture.appointment.id}/conversation`;
      const patient = await app.inject({ method: 'GET', url: path, headers: auth(foreign.tokens.patient) });
      const staff = await app.inject({ method: 'GET', url: path, headers: auth(fixture.tokens.staff) });
      expect(patient.statusCode).toBe(403); expect(patient.json().code).toBe('CHAT_FORBIDDEN');
      expect(staff.statusCode).toBe(403); expect(staff.json().code).toBe('FORBIDDEN');
    } finally { await destroyChatFixture(foreign); }
  });
});
