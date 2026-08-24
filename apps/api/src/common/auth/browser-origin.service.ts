import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BrowserOriginService {
  private readonly allowedOrigins: Set<string>;

  constructor(config: ConfigService) {
    this.allowedOrigins = new Set(
      config.getOrThrow<string>('APP_ORIGINS').split(','),
    );
  }

  assertAllowed(origin: string | undefined): void {
    if (origin === undefined || this.allowedOrigins.has(origin)) return;

    throw new ForbiddenException({
      code: 'ORIGIN_NOT_ALLOWED',
      message: 'Request origin is not allowed.',
      details: {},
    });
  }
}
