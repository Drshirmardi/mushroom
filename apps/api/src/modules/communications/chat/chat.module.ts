import { Module } from '@nestjs/common';

import { ChatCallController } from './chat-call.controller';
import { ChatCallService } from './chat-call.service';
import { ChatAttachmentsService } from './chat-attachments.service';
import { ChatDatabaseService } from './chat-database.service';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatRealtimePublisher } from './realtime/chat-realtime.publisher';
import { ChatSocketRegistry } from './realtime/chat-socket-registry';
import { WaitingRoomController } from './waiting-room/waiting-room.controller';

@Module({ controllers: [ChatCallController, ChatController, WaitingRoomController], providers: [ChatCallService, ChatAttachmentsService, ChatDatabaseService, ChatService, ChatRealtimePublisher, ChatSocketRegistry], exports: [ChatCallService, ChatDatabaseService, ChatService, ChatSocketRegistry] })
export class ChatModule {}
