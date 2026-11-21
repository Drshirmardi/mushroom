import { StreamableFile } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { PassThrough } from 'node:stream';

export function chatEventStream(reply: FastifyReply, expiresAt: number, start: (send: (data: object) => void, close: () => void) => () => void, heartbeat?: () => void) {
  const stream = new PassThrough();
  let closed = false;
  let cleanup: (() => void) | undefined;
  const close = () => {
    if (closed) return;
    closed = true;
    clearInterval(ping);
    clearTimeout(expiry);
    reply.raw.off('close', close);
    cleanup?.();
    stream.end();
  };
  const write = (data: string) => {
    if (!closed && !stream.write(data)) close();
  };
  const ping = setInterval(() => {
    write(': ping\n\n');
    if (!closed) heartbeat?.();
  }, 10_000);
  const expiry = setTimeout(close, Math.max(0, expiresAt * 1000 - Date.now()));
  reply.raw.once('close', close);
  stream.once('close', close);
  write(': ping\n\n');
  cleanup = start(data => write(`data: ${JSON.stringify(data)}\n\n`), close);
  if (closed) cleanup();
  reply.header('X-Accel-Buffering', 'no').header('Cache-Control', 'private, no-store, no-transform');
  return new StreamableFile(stream, { type: 'text/event-stream; charset=utf-8' });
}
