import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

@Injectable()
export class ChatRealtimePublisher {
  readonly changes = new Subject<string>();

  conversationChanged(id: string) { this.changes.next(id); }

  messageVisibilityChanged(conversationId: string, _message: unknown) {
    this.conversationChanged(conversationId);
  }
}
