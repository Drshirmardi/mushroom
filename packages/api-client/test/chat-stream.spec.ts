import { describe, expect, it, vi } from 'vitest';
import { createChatEngine, type LoadedChat } from '../src/chat-engine';

describe('chat event reconciliation', () => {
  it('ignores heartbeat bytes, combines fragmented events and pauses in a hidden tab', async () => {
    vi.useFakeTimers();
    const document = Object.assign(new EventTarget(), { visibilityState: 'visible' });
    vi.stubGlobal('document', document);
    const encoder = new TextEncoder();
    let writer!: ReadableStreamDefaultController<Uint8Array>;
    const paths: string[] = [];
    const mockFetch: typeof fetch = async (input) => {
      const path = new URL(String(input)).pathname;
      paths.push(path);
      if (path.endsWith('/events')) return new Response(new ReadableStream({ start(controller) { writer = controller; } }));
      return Response.json({
        access: { canSend: true },
        messages: { items: [], checkpointCursor: 'checkpoint' },
        visibility: { items: [] },
      });
    };
    const engine = createChatEngine('https://api.invalid', mockFetch);
    const conversation = { conversation: { id: 'example' }, messages: [], checkpointCursor: 'checkpoint' } as unknown as LoadedChat;
    const connection = engine.connect(() => 'token', conversation, vi.fn(), vi.fn());
    const syncs = () => paths.filter(path => path.endsWith('/sync')).length;
    try {
      writer.enqueue(encoder.encode(': ping\n\n'));
      await vi.advanceTimersByTimeAsync(0);
      expect(syncs()).toBe(1);
      for (let i = 0; i < 3; i++) {
        await vi.advanceTimersByTimeAsync(10_000);
        writer.enqueue(encoder.encode(': ping\n\n'));
      }
      await vi.advanceTimersByTimeAsync(0);
      expect(syncs()).toBe(1);
      writer.enqueue(encoder.encode('data: {"changed":'));
      await vi.advanceTimersByTimeAsync(0);
      expect(syncs()).toBe(1);
      writer.enqueue(encoder.encode('true}\n\n'));
      await vi.advanceTimersByTimeAsync(0);
      expect(syncs()).toBe(2);
      document.visibilityState = 'hidden';
      document.dispatchEvent(new Event('visibilitychange'));
      await vi.advanceTimersByTimeAsync(60_000);
      expect(syncs()).toBe(2);
      document.visibilityState = 'visible';
      document.dispatchEvent(new Event('visibilitychange'));
      writer.enqueue(encoder.encode(': ping\n\n'));
      await vi.advanceTimersByTimeAsync(0);
      expect(syncs()).toBe(3);
    } finally {
      connection.disconnect();
      vi.unstubAllGlobals();
      vi.useRealTimers();
    }
  });
});

it('shares call updates with the card and polls only when the dashboard stream is unhealthy', async () => {
  vi.useFakeTimers();
  const document = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  vi.stubGlobal('document', document);
  let writer!: ReadableStreamDefaultController<Uint8Array>;
  const encoder = new TextEncoder();
  let reads = 0;
  let status = 'ACTIVE';
  let allowStream = true;
  const engine = createChatEngine('https://api.invalid', async input => {
    const path = new URL(String(input)).pathname;
    if (path.endsWith('/events')) {
      if (!allowStream) return new Response(null, { status: 503 });
      return new Response(new ReadableStream({ start(controller) { writer = controller; } }));
    }
    if (path.endsWith('/calls/call-id')) {
      reads++;
      return Response.json({ id: 'call-id', status, endedAt: status === 'ENDED' ? '2026-11-22T12:00:00Z' : null });
    }
    return Response.json({ access: { canSend: true }, messages: { items: [], checkpointCursor: 'checkpoint' }, visibility: { items: [] } });
  });
  const conversation = { conversation: { id: 'example' }, messages: [], checkpointCursor: 'checkpoint' } as unknown as LoadedChat;
  const connection = engine.connect('token', conversation, vi.fn(), vi.fn());
  const panel = vi.fn();
  const card = vi.fn();
  const stopPanel = engine.watchCall('token', 'example', 'call-id', panel, 'panel');
  const stopCard = engine.watchCall('token', 'example', 'call-id', card, 'card');
  try {
    writer.enqueue(encoder.encode(': ping\n\n'));
    await vi.advanceTimersByTimeAsync(0);
    const initialReads = reads;
    for (let i = 0; i < 3; i++) {
      await vi.advanceTimersByTimeAsync(10_000);
      writer.enqueue(encoder.encode(': ping\n\n'));
    }
    await vi.advanceTimersByTimeAsync(0);
    expect(reads).toBe(initialReads);
    writer.enqueue(encoder.encode('data: {"kind":"call","callId":"call-id","changed":true}\n\n'));
    await vi.advanceTimersByTimeAsync(0);
    expect(reads).toBe(initialReads + 1);
    allowStream = false;
    writer.close();
    status = 'ENDED';
    await vi.advanceTimersByTimeAsync(20_000);
    expect(reads).toBe(initialReads + 2);
    expect(panel).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'ENDED' }));
    expect(card).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'ENDED' }));
    await vi.advanceTimersByTimeAsync(25_000);
    expect(reads).toBe(initialReads + 2);
  } finally {
    stopCard();
    stopPanel();
    connection.disconnect();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  }
});
