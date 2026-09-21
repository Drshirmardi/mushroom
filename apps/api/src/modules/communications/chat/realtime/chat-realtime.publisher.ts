import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';

@Injectable()
export class ChatRealtimePublisher {
  private server?: Server;

  bind(server: Server) { this.server = server; }

  messageCommitted(conversationId: string, message: unknown) {
    this.server?.to(`conversation:${conversationId}`).emit('message:committed', message);
  }

  /** A body-free post-commit state replacement for an already delivered message. */
  messageVisibilityChanged(conversationId: string, message: unknown) {
    this.server?.to(`conversation:${conversationId}`).emit('message:visibility-changed', message);
  }

  receiptUpdated(conversationId: string, receipt: unknown) {
    this.server?.to(`conversation:${conversationId}`).emit('receipt:updated', receipt);
  }
}
