import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { expect, it, vi } from 'vitest';
import { ChatCallService } from '../src/modules/communications/chat/chat-call.service';
import { ChatDatabaseService } from '../src/modules/communications/chat/chat-database.service';
import type { ChatService } from '../src/modules/communications/chat/chat.service';
import { ChatRealtimePublisher } from '../src/modules/communications/chat/realtime/chat-realtime.publisher';
import type { PrismaService } from '../src/database/prisma/prisma.service';

it('expires an abandoned call once across concurrent workers and preserves a renewed call', async () => {
  const database = new ChatDatabaseService(new ConfigService());
  const main = {} as PrismaService;
  const chat = {} as ChatService;
  const workers = [0, 1].map(() => new ChatCallService(database, main, chat, new ChatRealtimePublisher()));
  const published = vi.fn();
  const subscriptions = workers.map(worker => worker.incomingChanges.subscribe(published));
  const old = new Date(Date.now() - 120_000);
  const ids = [randomUUID(), randomUUID()];
  const patientIds = [randomUUID(), randomUUID()];
  try {
    await database.client.chatCall.createMany({ data: ids.map((id, index) => ({
      id, appointmentId: randomUUID(), callerUserId: randomUUID(), callerSessionId: randomUUID(),
      callerName: 'Synthetic', callerKind: 'DOCTOR' as const, patientUserId: patientIds[index]!,
      status: 'ACTIVE' as const, ringsUntil: old, answeredAt: old, connectedAt: old,
      lastLeaseAt: index === 0 ? old : new Date(),
    })) });
    await Promise.all(workers.map(worker => worker.expireCalls()));
    const [stale, live] = await Promise.all(ids.map(id => database.client.chatCall.findUniqueOrThrow({ where: { id } })));
    expect(stale).toMatchObject({ status: 'ENDED', endedAt: expect.any(Date) });
    expect(live).toMatchObject({ status: 'ACTIVE', endedAt: null });
    expect(published).toHaveBeenCalledExactlyOnceWith(patientIds[0]);
  } finally {
    for (const subscription of subscriptions) subscription.unsubscribe();
    await database.client.chatCall.deleteMany({ where: { id: { in: ids } } });
    await database.onModuleDestroy();
  }
});
