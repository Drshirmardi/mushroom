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
