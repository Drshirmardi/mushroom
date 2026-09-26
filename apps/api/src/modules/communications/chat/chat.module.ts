import { Module } from '@nestjs/common';

import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatRealtimeGateway } from './realtime/chat-realtime.gateway';
import { ChatRealtimePublisher } from './realtime/chat-realtime.publisher';
import { ChatSocketRegistry } from './realtime/chat-socket-registry';
import { WaitingRoomController } from './waiting-room/waiting-room.controller';

@Module({ controllers: [ChatController, WaitingRoomController], providers: [ChatService, ChatRealtimeGateway, ChatRealtimePublisher, ChatSocketRegistry], exports: [ChatService, ChatSocketRegistry] })
export class ChatModule {}
