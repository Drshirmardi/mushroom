import { chatVideoEnabled } from '../../modules/communications/chat/chat-video-enabled';
import { Controller, Get, Optional, ServiceUnavailableException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma/prisma.service';
import { Public } from '../auth/public.decorator';
import { ChatDatabaseService } from '../../modules/communications/chat/chat-database.service';

@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService, @Optional() private readonly chatEngine?: ChatDatabaseService) {}

  @Get('live')
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  async ready(): Promise<{ status: 'ok' }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException();
    }
  }

  @Get('chat')
  async chatReady(): Promise<{ status: 'ok' }> {
    try {
      if (!this.chatEngine) throw new Error('Chat engine unavailable');
      await this.chatEngine.client.$queryRaw`SELECT 1`;
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException();
    }
  }

  @Get('video')
  async videoReady(): Promise<{ status: 'ok' | 'disabled' }> {
    if (!chatVideoEnabled()) return { status: 'disabled' };
    try {
      const origin = process.env.CHAT_VIDEO_HEALTH_URL || process.env.CHAT_VIDEO_ORIGIN;
      const response = await fetch(new URL('/mushroom-call.html', origin), { method: 'HEAD', signal: AbortSignal.timeout(3000) });
      if (!response.ok) throw new Error('Video service unavailable');
      return { status: 'ok' };
    } catch { throw new ServiceUnavailableException(); }
  }
}
