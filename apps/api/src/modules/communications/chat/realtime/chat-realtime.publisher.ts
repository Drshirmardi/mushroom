import { Injectable } from '@nestjs/common';

@Injectable()
export class ChatRealtimePublisher {
  private engineVisibility?: (conversationId: string, message: unknown) => void;

  bindEngineVisibility(handler?: (conversationId: string, message: unknown) => void) { this.engineVisibility = handler; }

  /** A body-free post-commit state replacement for an already delivered message. */
  messageVisibilityChanged(conversationId: string, message: unknown) {
    this.engineVisibility?.(conversationId, message);
  }
}
