import { Injectable, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../generated/chat-prisma/client';

@Injectable()
export class ChatDatabaseService implements OnModuleDestroy {
  private readonly database?: PrismaClient;

  constructor(config: ConfigService) {
    const connectionString = config.get<string>('CHAT_DATABASE_URL');
    if (!connectionString) return;
    const chat = new URL(connectionString);
    const main = new URL(config.getOrThrow<string>('DATABASE_URL'));
    const host = (url: URL) => url.hostname === 'localhost' ? '127.0.0.1' : url.hostname;
    if (host(chat) === host(main) && (chat.port || '5432') === (main.port || '5432')) {
      throw new Error('CHAT_DATABASE_URL must use an independent PostgreSQL instance');
    }
    this.database = new PrismaClient({ adapter: new PrismaPg({ connectionString, max: 10 }) });
  }

  get client() {
    if (!this.database) throw new ServiceUnavailableException('Chat database unavailable');
    return this.database;
  }

  get configured() { return !!this.database; }

  async onModuleDestroy() { await this.database?.$disconnect(); }
}
