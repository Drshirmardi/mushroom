import { randomUUID } from 'node:crypto';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApiApplication } from '../src/app.factory';
import { sendChatMessage, auth, createChatFixture, destroyChatFixture, type ChatFixture } from './chat-test-support';

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
    const sent = await sendChatMessage(app, fixture.tokens.admin, admin.json().id, { clientMessageId: 'b1000000-0000-4000-8000-000000000001', body: 'Clinic operator response' });
    expect(sent.statusCode).toBe(200); expect(sent.json().senderKind).toBe('CLINIC_OPERATOR');
  });

  it('lists earlier conversations for the same patient without expanding the assigned doctor scope', async () => {
    const current = await createChatFixture(app);
    fixture = current;
    const otherDoctor = await createChatFixture(app);
    try {
      async function oldConversation(offering: ChatFixture['offering'], minutes: number) {
        const appointment = await current.prisma.appointment.create({ data: {
          clinicId: current.clinic.id, patientId: current.appointment.patientId, doctorId: offering.doctorId,
          doctorServiceId: offering.id, status: 'CONFIRMED', confirmedAt: new Date(),
          startsAt: new Date(current.appointment.startsAt.valueOf() - minutes * 60_000),
          endsAt: new Date(current.appointment.startsAt.valueOf() - (minutes - 30) * 60_000),
          priceAmount: offering.priceAmount, currency: offering.currency, priceCapturedAt: new Date(),
          idempotencyActorUserId: current.users.admin.id, idempotencyKey: randomUUID(), idempotencyRequestHash: 'a'.repeat(64),
        } });
        const opened = await app.inject({ method: 'GET', url: `/v1/chat/appointments/${appointment.id}/conversation`, headers: auth(current.tokens.patient) });
        expect(opened.statusCode).toBe(200);
        const conversationId = opened.json().id;
        expect((await sendChatMessage(app, current.tokens.patient, conversationId, { clientMessageId: randomUUID(), body: 'synthetic previous message' })).statusCode).toBe(200);
        return { appointmentId: appointment.id, conversationId };
      }

      const same = await oldConversation(current.offering, 60);
      const different = await oldConversation(otherDoctor.offering, 120);
      const route = `/v1/chat/appointments/${current.appointment.id}/previous-conversations`;
      const get = (token: string, url = route) => app.inject({ method: 'GET', url, headers: auth(token) });
      const patient = await get(current.tokens.patient);
      expect(patient.statusCode, patient.body).toBe(200);
      expect(patient.headers['cache-control']).toBe('private, no-store');
      expect(patient.json().items).toEqual([expect.objectContaining(same), expect.objectContaining(different)]);
      expect((await get(current.tokens.doctor)).json().items).toEqual([expect.objectContaining(same)]);
      expect((await get(current.tokens.admin)).json().items).toHaveLength(2);
      expect((await get(current.tokens.outsider)).statusCode).toBe(403);
      expect((await get(current.tokens.doctor, route + '?before=' + different.appointmentId)).statusCode).toBe(403);
      expect((await get(current.tokens.doctor, `/v1/chat/conversations/${different.conversationId}/messages`)).statusCode).toBe(403);
      expect((await get(current.tokens.patient, `/v1/chat/conversations/${same.conversationId}/messages`)).json().items)
        .toEqual([expect.objectContaining({ body: 'synthetic previous message' })]);
    } finally { await destroyChatFixture(otherDoctor); }
  }, 15_000);

  it('fails closed for pending appointments, terminal appointments, blocks and malformed or foreign cursors', async () => {
    fixture = await createChatFixture(app);
    const conversation = await app.inject({ method: 'GET', url: `/v1/chat/appointments/${fixture.appointment.id}/conversation`, headers: auth(fixture.tokens.patient) });
    const id = conversation.json().id;
    await fixture.prisma.appointment.update({ where: { id: fixture.appointment.id }, data: { status: 'PENDING' } });
    const pending = await sendChatMessage(app, fixture.tokens.patient, id, { clientMessageId: 'b1000000-0000-4000-8000-000000000002', body: 'not allowed' });
    expect(pending.statusCode).toBe(403); expect(pending.json().code).toBe('CHAT_APPOINTMENT_NOT_ELIGIBLE');
    const badCursor = await app.inject({ method: 'GET', url: `/v1/chat/conversations/${id}/messages?cursor=bad`, headers: auth(fixture.tokens.patient) });
    expect(badCursor.statusCode).toBe(400); expect(badCursor.json().code).toBe('CHAT_CURSOR_INVALID');
    await fixture.prisma.appointment.update({ where: { id: fixture.appointment.id }, data: { status: 'CANCELLED', cancelledAt: new Date() } });
    const terminal = await sendChatMessage(app, fixture.tokens.patient, id, { clientMessageId: 'b1000000-0000-4000-8000-000000000003', body: 'not allowed' });
    expect(terminal.statusCode).toBe(403); expect(terminal.json().code).toBe('CHAT_WINDOW_CLOSED');
  });
});
