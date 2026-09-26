import { afterEach, describe, expect, it } from 'vitest';
import { NestFastifyApplication } from '@nestjs/platform-fastify';

import { createApiApplication } from '../src/app.factory';
import { auth, createChatFixture, destroyChatFixture, type ChatFixture } from './chat-test-support';

describe('chat waiting-room eligibility', () => {
  let app: NestFastifyApplication | undefined;
  let fixture: ChatFixture | undefined;

  it('evaluates the UTC lifecycle on every request without changing appointment or encounter state', async () => {
    app = await createApiApplication();
    await app.init();
    fixture = await createChatFixture(app);
    const url = `/v1/chat/waiting-room/appointments/${fixture.appointment.id}`;

    const eligible = await app.inject({ method: 'GET', url, headers: auth(fixture.tokens.patient) });
    expect(eligible.statusCode).toBe(200);
    expect(eligible.json()).toMatchObject({ appointmentId: fixture.appointment.id, heartbeatSeconds: 15, leaseSeconds: 45 });
    expect(await fixture.prisma.encounter.count({ where: { appointmentId: fixture.appointment.id } })).toBe(0);

    await fixture.prisma.appointment.update({ where: { id: fixture.appointment.id }, data: { status: 'PENDING' } });
    expect((await app.inject({ method: 'GET', url, headers: auth(fixture.tokens.patient) })).statusCode).toBe(403);

    const now = Date.now();
    await fixture.prisma.appointment.update({ where: { id: fixture.appointment.id }, data: {
      status: 'CONFIRMED', startsAt: new Date(now - 2 * 60 * 60_000), endsAt: new Date(now - 61 * 60_000),
    } });
    expect((await app.inject({ method: 'GET', url, headers: auth(fixture.tokens.patient) })).statusCode).toBe(403);

    await fixture.prisma.appointment.update({ where: { id: fixture.appointment.id }, data: {
      status: 'CHECKED_IN', startsAt: new Date(now - 4 * 60 * 60_000), endsAt: new Date(now - 3 * 60 * 60_000),
    } });
    expect((await app.inject({ method: 'GET', url, headers: auth(fixture.tokens.patient) })).statusCode).toBe(200);

    await fixture.prisma.appointment.update({ where: { id: fixture.appointment.id }, data: {
      startsAt: new Date(now - 5 * 60 * 60_000), endsAt: new Date(now - 4 * 60 * 60_000 - 1),
    } });
    expect((await app.inject({ method: 'GET', url, headers: auth(fixture.tokens.patient) })).statusCode).toBe(403);

    await fixture.prisma.appointment.update({ where: { id: fixture.appointment.id }, data: { status: 'CANCELLED' } });
    expect((await app.inject({ method: 'GET', url, headers: auth(fixture.tokens.patient) })).statusCode).toBe(403);
    expect(await fixture.prisma.encounter.count({ where: { appointmentId: fixture.appointment.id } })).toBe(0);
  });

  afterEach(async () => {
    if (fixture) await destroyChatFixture(fixture);
    fixture = undefined;
    await app?.close();
    app = undefined;
  });
});
