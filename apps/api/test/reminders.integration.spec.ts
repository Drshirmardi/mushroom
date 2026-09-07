import { randomUUID } from 'node:crypto';

import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { createApiApplication } from '../src/app.factory';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { NotificationsService } from '../src/modules/assessments/notifications/notifications.service';
import { OutboxWorker } from '../src/modules/outbox/outbox.worker';
import { OutboxService } from '../src/modules/outbox/outbox.service';
import { ReminderService } from '../src/modules/outbox/reminder.service';

describe('appointment and treatment reminders (PostgreSQL integration)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let reminders: ReminderService;
  let worker: OutboxWorker;
  let outbox: OutboxService;
  let notifications: NotificationsService;
  const userIds = new Set<string>();
  const eventKeys = new Set<string>();

  beforeAll(async () => {
    app = await createApiApplication();
    await app.init();
    prisma = app.get(PrismaService);
    reminders = app.get(ReminderService);
    worker = app.get(OutboxWorker);
    outbox = app.get(OutboxService);
    notifications = app.get(NotificationsService);
  }, 30_000);

  afterEach(async () => {
    const users = [...userIds];
    if (eventKeys.size) await prisma.outboxEvent.deleteMany({ where: { idempotencyKey: { in: [...eventKeys] } } });
    if (users.length) {
      await prisma.notificationDelivery.deleteMany({ where: { notification: { recipientId: { in: users } } } });
      await prisma.notification.deleteMany({ where: { recipientId: { in: users } } });
      await prisma.notificationPreference.deleteMany({ where: { patient: { userId: { in: users } } } });
      await prisma.patientProfile.deleteMany({ where: { userId: { in: users } } });
      await prisma.user.deleteMany({ where: { id: { in: users } } });
    }
    userIds.clear();
    eventKeys.clear();
    vi.restoreAllMocks();
  });

  afterAll(async () => { await app.close(); });

  const patient = async () => {
    const clinic = await prisma.clinic.findFirstOrThrow({ where: { status: 'ACTIVE' } });
    const user = await prisma.user.create({ data: { phone: `+989${Math.floor(Math.random() * 900_000_000 + 100_000_000)}` } });
    userIds.add(user.id);
    const profile = await prisma.patientProfile.create({ data: { userId: user.id, clinicId: clinic.id } });
    return { clinic, user, profile };
  };

  it('persists one event per schedule source and retries worker delivery without a duplicate notification', async () => {
    const { clinic, user, profile } = await patient();
    const appointmentId = randomUUID();
    const treatmentTaskId = randomUUID();
    const appointmentAt = new Date(Date.now() - 1_000);
    const treatmentAt = new Date(Date.now() + 86_400_000);
    const appointmentKey = `appointment-reminder:${appointmentId}:${appointmentAt.toISOString()}`;
    const treatmentKey = `treatment-reminder:${treatmentTaskId}:${treatmentAt.toISOString()}`;
    eventKeys.add(appointmentKey); eventKeys.add(treatmentKey);

    await prisma.$transaction(async (tx) => {
      await reminders.appointment(tx, { id: appointmentId, clinicId: clinic.id, patientId: profile.id, recipientId: user.id, startsAt: appointmentAt });
      await reminders.appointment(tx, { id: appointmentId, clinicId: clinic.id, patientId: profile.id, recipientId: user.id, startsAt: appointmentAt });
      await reminders.treatment(tx, { id: treatmentTaskId, clinicId: clinic.id, patientId: profile.id, recipientId: user.id, scheduledFor: treatmentAt });
      await reminders.treatment(tx, { id: treatmentTaskId, clinicId: clinic.id, patientId: profile.id, recipientId: user.id, scheduledFor: treatmentAt });
    });

    expect(await prisma.outboxEvent.count({ where: { idempotencyKey: { in: [appointmentKey, treatmentKey] } } })).toBe(2);
    const failure = vi.spyOn(notifications, 'createInApp').mockRejectedValueOnce(new Error('temporary notification failure'));
    await worker.tick();
    const retried = await prisma.outboxEvent.findUniqueOrThrow({ where: { idempotencyKey: appointmentKey } });
    expect(retried).toMatchObject({ status: 'PENDING', attempts: 1, lastError: 'temporary notification failure' });

    failure.mockRestore();
    await prisma.outboxEvent.update({ where: { id: retried.id }, data: { availableAt: new Date(Date.now() - 1_000) } });
    await worker.tick();
    await worker.tick();

    expect(await prisma.outboxEvent.findUniqueOrThrow({ where: { id: retried.id } })).toMatchObject({ status: 'DELIVERED', attempts: 2 });
    expect(await prisma.notification.count({ where: { recipientId: user.id, category: 'REMINDER' } })).toBe(1);
  });

  it('marks a preference-suppressed reminder delivered without creating an in-app notification', async () => {
    const { clinic, user, profile } = await patient();
    const taskId = randomUUID();
    const scheduledFor = new Date(Date.now() - 1_000);
    const key = `treatment-reminder:${taskId}:${scheduledFor.toISOString()}`;
    eventKeys.add(key);
    await prisma.notificationPreference.create({ data: { patientId: profile.id, category: 'TREATMENT', inAppEnabled: false } });
    await prisma.$transaction((tx) => reminders.treatment(tx, { id: taskId, clinicId: clinic.id, patientId: profile.id, recipientId: user.id, scheduledFor }));

    await worker.tick();

    expect(await prisma.outboxEvent.findUniqueOrThrow({ where: { idempotencyKey: key } })).toMatchObject({ status: 'DELIVERED' });
    expect(await prisma.notification.count({ where: { recipientId: user.id, category: 'TREATMENT' } })).toBe(0);
  });

  it('recovers an interrupted stale claim after restart and delivers exactly one notification', async () => {
    const { clinic, user, profile } = await patient();
    const appointmentId = randomUUID();
    const startsAt = new Date(Date.now() - 1_000);
    const key = `appointment-reminder:${appointmentId}:${startsAt.toISOString()}`;
    eventKeys.add(key);
    await prisma.$transaction((tx) => reminders.appointment(tx, { id: appointmentId, clinicId: clinic.id, patientId: profile.id, recipientId: user.id, startsAt }));

    const abandoned = (await outbox.claim()).find((event) => event.idempotencyKey === key);
    expect(abandoned).toMatchObject({ status: 'PROCESSING', attempts: 1 });
    await prisma.outboxEvent.update({ where: { id: abandoned!.id }, data: { lockedAt: new Date(Date.now() - 61_000) } });

    await worker.tick();
    expect(await prisma.outboxEvent.findUniqueOrThrow({ where: { id: abandoned!.id } })).toMatchObject({ status: 'DELIVERED', attempts: 2 });
    expect(await prisma.notification.count({ where: { recipientId: user.id, category: 'REMINDER' } })).toBe(1);

    await worker.tick();
    expect(await prisma.notification.count({ where: { recipientId: user.id, category: 'REMINDER' } })).toBe(1);
  });
});
