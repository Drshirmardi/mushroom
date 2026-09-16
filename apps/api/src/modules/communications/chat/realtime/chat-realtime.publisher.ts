import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';

@Injectable()
export class ChatRealtimePublisher {
  private server?: Server;

  bind(server: Server) { this.server = server; }

  messageCommitted(conversationId: string, message: unknown) {
    this.server?.to(`conversation:${conversationId}`).emit('message:committed', message);
  }

  receiptUpdated(conversationId: string, receipt: unknown) {
    this.server?.to(`conversation:${conversationId}`).emit('receipt:updated', receipt);
  }
}
