import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FastifyReply, FastifyRequest } from 'fastify';

export const PRODUCTION_REFRESH_COOKIE = '__Host-sz_refresh';
export const DEVELOPMENT_REFRESH_COOKIE = 'sz_refresh_dev';
export const BALE_REFRESH_COOKIE = '__Host-sz_refresh_bale';
export const SESSION_CONTEXT_HEADER = 'x-session-context';
export type SessionContext = 'web' | 'bale';

@Injectable()
export class RefreshCookieService {
  readonly name: string;
  private readonly secure: boolean;
  private readonly baleOrigin: string | undefined;

  constructor(config: ConfigService) {
    this.secure = config.get<string>('NODE_ENV') === 'production';
    this.name = this.secure
      ? PRODUCTION_REFRESH_COOKIE
      : DEVELOPMENT_REFRESH_COOKIE;
    const publicAppUrl = config.get<string>('PUBLIC_APP_URL');
    if (config.get('BALE_AUTH_ENABLED') === 'true' && publicAppUrl) {
      const url = URL.parse(publicAppUrl);
      if (url?.protocol === 'https:') this.baleOrigin = url.origin;
    }
  }

  contextFor(request: FastifyRequest): SessionContext {
    if (request.headers[SESSION_CONTEXT_HEADER] !== 'bale') return 'web';
    if (this.baleOrigin && request.headers.origin === this.baleOrigin) return 'bale';
    throw new ForbiddenException({
      code: 'ORIGIN_NOT_ALLOWED',
      message: 'Request origin is not allowed.',
      details: {},
    });
  }

  read(request: FastifyRequest, context: SessionContext = 'web'): string | undefined {
    return request.cookies[context === 'bale' ? BALE_REFRESH_COOKIE : this.name];
  }

  set(
    reply: FastifyReply,
    token: string,
    expiresAt: Date,
    now = new Date(),
    context: SessionContext = 'web',
  ): void {
    const maxAge = Math.max(
      0,
      Math.floor((expiresAt.getTime() - now.getTime()) / 1_000),
    );

    const { name, options } = this.scope(context);
    reply.setCookie(name, token, {
      ...options,
      expires: expiresAt,
      maxAge,
    });
  }

  clear(reply: FastifyReply, context: SessionContext = 'web'): void {
    const { name, options } = this.scope(context);
    reply.clearCookie(name, options);
  }

  private scope(context: SessionContext) {
    const options = { httpOnly: true, path: '/' };
    if (context === 'bale') {
      return {
        name: BALE_REFRESH_COOKIE,
        options: { ...options, secure: true, sameSite: 'none' as const, partitioned: true },
      };
    }
    return {
      name: this.name,
      options: { ...options, secure: this.secure, sameSite: 'lax' as const },
    };
  }
}
