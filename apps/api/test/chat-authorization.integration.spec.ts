import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApiApplication } from '../src/app.factory';
import { sendEngineMessage, auth, createChatFixture, destroyChatFixture, type ChatFixture } from './chat-test-support';

describe('chat authorization boundary (PostgreSQL API integration)', () => {
  let app: NestFastifyApplication;
  let fixture: ChatFixture | undefined;
  beforeAll(async () => { app = await createApiApplication(); await app.init(); }, 30_000);
  afterEach(async () => { if (fixture) await destroyChatFixture(fixture); fixture = undefined; });
  afterAll(async () => { await app.close(); });

  it('denies STAFF, foreign patients and an unlinked assigned doctor, while preserving the clinic-operator identity', async () => {
    fixture = await createChatFixture(app);
    const path = `/v1/chat/appointments/${fixture.appointment.id}/conversation`;
    const staff = await app.inject({ method: 'GET', url: path, headers: auth(fixture.tokens.staff) });
    const outsider = await app.inject({ method: 'GET', url: path, headers: auth(fixture.tokens.outsider) });
    expect(staff.statusCode).toBe(403); expect(staff.json().code).toBe('FORBIDDEN');
    expect(outsider.statusCode).toBe(403); expect(outsider.json().code).toBe('CHAT_FORBIDDEN');
    await fixture.prisma.doctorProfile.update({ where: { id: fixture.offering.doctorId }, data: { userId: null } });
    const unlinked = await app.inject({ method: 'GET', url: path, headers: auth(fixture.tokens.doctor) });
    expect(unlinked.statusCode).toBe(403); expect(unlinked.json().code).toBe('CHAT_FORBIDDEN');
    const admin = await app.inject({ method: 'GET', url: path, headers: auth(fixture.tokens.admin) });
    expect(admin.statusCode).toBe(200);
    const sent = await sendEngineMessage(app, fixture.tokens.admin, admin.json().id, { clientMessageId: 'b1000000-0000-4000-8000-000000000001', body: 'Clinic operator response' });
    expect(sent.statusCode).toBe(200); expect(sent.json().senderKind).toBe('CLINIC_OPERATOR');
  });

  it('fails closed for pending appointments, terminal appointments, blocks and malformed or foreign cursors', async () => {
    fixture = await createChatFixture(app);
    const conversation = await app.inject({ method: 'GET', url: `/v1/chat/appointments/${fixture.appointment.id}/conversation`, headers: auth(fixture.tokens.patient) });
    const id = conversation.json().id;
    await fixture.prisma.appointment.update({ where: { id: fixture.appointment.id }, data: { status: 'PENDING' } });
    const pending = await sendEngineMessage(app, fixture.tokens.patient, id, { clientMessageId: 'b1000000-0000-4000-8000-000000000002', body: 'not allowed' });
    expect(pending.statusCode).toBe(403); expect(pending.json().code).toBe('CHAT_APPOINTMENT_NOT_ELIGIBLE');
    const badCursor = await app.inject({ method: 'GET', url: `/v1/chat/conversations/${id}/messages?cursor=bad`, headers: auth(fixture.tokens.patient) });
    expect(badCursor.statusCode).toBe(400); expect(badCursor.json().code).toBe('CHAT_CURSOR_INVALID');
    await fixture.prisma.appointment.update({ where: { id: fixture.appointment.id }, data: { status: 'CANCELLED', cancelledAt: new Date() } });
    const terminal = await sendEngineMessage(app, fixture.tokens.patient, id, { clientMessageId: 'b1000000-0000-4000-8000-000000000003', body: 'not allowed' });
    expect(terminal.statusCode).toBe(403); expect(terminal.json().code).toBe('CHAT_WINDOW_CLOSED');
  });
});
