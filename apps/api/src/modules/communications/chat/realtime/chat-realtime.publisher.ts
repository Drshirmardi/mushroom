import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

@Injectable()
export class ChatRealtimePublisher {
  readonly changes = new Subject<{ id: string; kind: 'message' | 'visibility' | 'closure' | 'call'; callId?: string }>();

  conversationChanged(id: string, kind: 'message' | 'visibility' | 'closure' | 'call' = 'message', callId?: string) { this.changes.next({ id, kind, callId }); }

  messageVisibilityChanged(conversationId: string, _message: unknown) {
    this.conversationChanged(conversationId, 'visibility');
  }
}
