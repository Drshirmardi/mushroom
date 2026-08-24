import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FastifyReply, FastifyRequest } from 'fastify';

export const PRODUCTION_REFRESH_COOKIE = '__Host-sz_refresh';
export const DEVELOPMENT_REFRESH_COOKIE = 'sz_refresh_dev';

@Injectable()
export class RefreshCookieService {
  readonly name: string;
  private readonly secure: boolean;

  constructor(config: ConfigService) {
    this.secure = config.get<string>('NODE_ENV') === 'production';
    this.name = this.secure
      ? PRODUCTION_REFRESH_COOKIE
      : DEVELOPMENT_REFRESH_COOKIE;
  }

  read(request: FastifyRequest): string | undefined {
    return request.cookies[this.name];
  }

  set(
    reply: FastifyReply,
    token: string,
    expiresAt: Date,
    now = new Date(),
  ): void {
    const maxAge = Math.max(
      0,
      Math.floor((expiresAt.getTime() - now.getTime()) / 1_000),
    );

    reply.setCookie(this.name, token, {
      httpOnly: true,
      secure: this.secure,
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
      maxAge,
    });
  }

  clear(reply: FastifyReply): void {
    reply.clearCookie(this.name, {
      httpOnly: true,
      secure: this.secure,
      sameSite: 'lax',
      path: '/',
    });
  }
}
