import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

@Injectable()
export class ChatRealtimePublisher {
  readonly changes = new Subject<{ id: string; kind: 'message' | 'visibility' | 'closure' | 'call' }>();

  conversationChanged(id: string, kind: 'message' | 'visibility' | 'closure' | 'call' = 'message') { this.changes.next({ id, kind }); }

  messageVisibilityChanged(conversationId: string, _message: unknown) {
    this.conversationChanged(conversationId, 'visibility');
  }
}
