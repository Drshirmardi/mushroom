import { Module } from '@nestjs/common';

import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatRealtimeGateway } from './realtime/chat-realtime.gateway';
import { ChatRealtimePublisher } from './realtime/chat-realtime.publisher';

@Module({ controllers: [ChatController], providers: [ChatService, ChatRealtimeGateway, ChatRealtimePublisher], exports: [ChatService] })
export class ChatModule {}
