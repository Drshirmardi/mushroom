import { Controller, Get, Optional, ServiceUnavailableException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma/prisma.service';
import { Public } from '../auth/public.decorator';
import { EjabberdApiClient } from '../../modules/communications/chat/ejabberd/ejabberd-api.client';

@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService, @Optional() private readonly chatEngine?: EjabberdApiClient) {}

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
      await this.chatEngine.ready();
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException();
    }
  }
}
