import { Module } from '@nestjs/common';

import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatRealtimePublisher } from './realtime/chat-realtime.publisher';
import { ChatSocketRegistry } from './realtime/chat-socket-registry';
import { WaitingRoomController } from './waiting-room/waiting-room.controller';
import { EjabberdConfig } from './ejabberd/ejabberd.config';
import { EjabberdApiClient } from './ejabberd/ejabberd-api.client';
import { EjabberdSessionService } from './ejabberd/ejabberd-session.service';
import { EjabberdPolicyController, EjabberdPolicyGuard, EjabberdSessionController } from './ejabberd/ejabberd.controller';

@Module({ controllers: [ChatController, WaitingRoomController, EjabberdSessionController, EjabberdPolicyController], providers: [ChatService, ChatRealtimePublisher, ChatSocketRegistry, EjabberdConfig, EjabberdApiClient, EjabberdSessionService, EjabberdPolicyGuard], exports: [ChatService, ChatSocketRegistry, EjabberdApiClient] })
export class ChatModule {}
