import { EventEmitter } from 'node:events';
import type { FastifyReply } from 'fastify';
import { expect, it, vi } from 'vitest';
import { chatEventStream } from '../src/modules/communications/chat/realtime/chat-event-stream';

it('writes SSE comments without business events and releases a disconnected reply', async () => {
  vi.useFakeTimers();
  const raw = new EventEmitter();
  const reply = { raw, header: vi.fn().mockReturnThis() };
  const release = vi.fn();
  const heartbeat = vi.fn();
  const stream = chatEventStream(reply as unknown as FastifyReply, Date.now() / 1000 + 60, () => release, heartbeat).getStream();
  try {
    expect(stream.read().toString()).toBe(': ping\n\n');
    await vi.advanceTimersByTimeAsync(10_000);
    expect(stream.read().toString()).toBe(': ping\n\n');
    expect(heartbeat).toHaveBeenCalledTimes(1);
    expect(reply.header).toHaveBeenCalledWith('X-Accel-Buffering', 'no');
    raw.emit('close');
    await vi.advanceTimersByTimeAsync(20_000);
    expect(release).toHaveBeenCalledTimes(1);
    expect(heartbeat).toHaveBeenCalledTimes(1);
  } finally {
    stream.destroy();
    vi.useRealTimers();
  }
});
