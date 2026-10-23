import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { BrowserOriginService } from '../src/common/auth/browser-origin.service';
import {
  DEVELOPMENT_REFRESH_COOKIE,
  PRODUCTION_REFRESH_COOKIE,
  RefreshCookieService,
} from '../src/common/auth/refresh-cookie.service';
import { environmentValidationSchema } from '../src/config/environment.validation';
import { chatTestEnvironment } from './chat-environment-fixture';

describe('refresh cookie and browser origin policy', () => {
  const expiresAt = new Date('2026-08-23T12:00:00.000Z');
  const now = new Date('2026-08-22T12:00:00.000Z');

  it.each([
    ['development', DEVELOPMENT_REFRESH_COOKIE, false],
    ['production', PRODUCTION_REFRESH_COOKIE, true],
  ])('sets the %s cookie policy', (environment, name, secure) => {
    const service = new RefreshCookieService(new ConfigService({
      NODE_ENV: environment,
    }));
    const setCookie = vi.fn();

    service.set({ setCookie } as unknown as FastifyReply, 'opaque-token', expiresAt, now);

    expect(service.name).toBe(name);
    expect(setCookie).toHaveBeenCalledWith(name, 'opaque-token', {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
      maxAge: 86_400,
    });
  });

  it('clears a refresh cookie with the same security scope', () => {
    const service = new RefreshCookieService(new ConfigService({
      NODE_ENV: 'production',
    }));
    const clearCookie = vi.fn();

    service.clear({ clearCookie } as unknown as FastifyReply);

    expect(clearCookie).toHaveBeenCalledWith(PRODUCTION_REFRESH_COOKIE, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    });
  });

  it('accepts absent/non-browser and allowlisted origins but rejects others', () => {
    const service = new BrowserOriginService(new ConfigService({
      APP_ORIGINS: 'https://app.example.test,https://admin.example.test',
    }));

    expect(() => service.assertAllowed(undefined)).not.toThrow();
    expect(() => service.assertAllowed('https://app.example.test')).not.toThrow();
    expect(() => service.assertAllowed('https://evil.example')).toThrow(
      ForbiddenException,
    );
  });

  it('requires independent access and refresh secrets', () => {
    const sharedSecret = 'shared-secret-value-that-is-long-enough-for-both-config-fields';
    const result = environmentValidationSchema.validate({
      ...chatTestEnvironment,
      DATABASE_URL: 'postgresql://user:password@localhost:5432/database',
      JWT_ACCESS_SECRET: sharedSecret,
      REFRESH_TOKEN_PEPPER: sharedSecret,
    });

    expect(result.error).toBeDefined();
  });

  it('requires explicit trusted proxy addresses in production', () => {
    const base = {
      ...chatTestEnvironment,
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://user:password@localhost:5432/database',
      JWT_ACCESS_SECRET: 'access-secret-that-is-long-enough-for-production-0123456789',
      REFRESH_TOKEN_PEPPER: 'refresh-pepper-that-is-independent-and-long-enough-9876543210',
      OTP_PEPPER: 'otp-pepper-that-is-independent-and-long-enough-9876543210',
    };

    expect(environmentValidationSchema.validate(base).error).toBeDefined();
    expect(environmentValidationSchema.validate({
      ...chatTestEnvironment,
      ...base,
      TRUSTED_PROXIES: '10.0.0.0/8,192.0.2.10',
    }).error).toBeUndefined();
    expect(environmentValidationSchema.validate({
      ...chatTestEnvironment,
      ...base,
      TRUSTED_PROXIES: '0.0.0.0/0',
    }).error).toBeDefined();
  });
});
