import { isIP } from 'node:net';

import * as Joi from 'joi';

const isHttpOrigin = (value: string): boolean => {
  try {
    const url = new URL(value);

    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      url.pathname === '/' &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
};

const isTrustedProxy = (value: string): boolean => {
  const [address, prefix, extra] = value.split('/');
  const version = address ? isIP(address) : 0;

  if (extra !== undefined || version === 0) return false;
  if (prefix === undefined) return true;
  if (!/^\d+$/.test(prefix)) return false;

  const prefixLength = Number(prefix);
  const maximum = version === 4 ? 32 : 128;

  return prefixLength > 0 && prefixLength <= maximum;
};

const trustedProxySchema = Joi.string()
  .custom((value, helpers) => {
    const proxies: string[] = value
      .split(',')
      .map((proxy: string) => proxy.trim())
      .filter((proxy: string) => proxy.length > 0);

    if (proxies.length === 0 || proxies.some((proxy) => !isTrustedProxy(proxy))) {
      return helpers.error('any.invalid');
    }

    return proxies.join(',');
  })
  .messages({
    'any.invalid': 'must contain only explicit IP addresses or non-universal CIDR ranges',
  });

export const environmentValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3003),
  DATABASE_URL: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }).required(),
  APP_ORIGINS: Joi.string()
    .custom((value, helpers) => {
      const origins: string[] = value
        .split(',')
        .map((origin: string) => origin.trim())
        .filter((origin: string) => origin.length > 0);

      if (origins.length === 0 || origins.some((origin) => !isHttpOrigin(origin))) {
        return helpers.error('any.invalid');
      }

      return origins.join(',');
    })
    .default('http://localhost:3000,http://localhost:3001,http://localhost:3002')
    .messages({ 'any.invalid': 'must be a comma-separated list of HTTP(S) origins' }),
  TRUSTED_PROXIES: Joi.when('NODE_ENV', {
    is: 'production',
    then: trustedProxySchema.required(),
    otherwise: trustedProxySchema.allow('').default(''),
  }),
  LOG_LEVEL: Joi.string().valid('fatal', 'error', 'warn', 'info', 'debug', 'trace').default('info'),
  COMMERCE_RESERVATION_TTL_MINUTES: Joi.number().integer().min(1).max(1_440).default(20),
  JWT_ACCESS_SECRET: Joi.string()
    .min(43)
    .max(256)
    .pattern(/^[A-Za-z0-9_-]+$/)
    .invalid('replace-this-placeholder-with-a-unique-32-character-secret')
    .required(),
  JWT_ACCESS_ISSUER: Joi.string().trim().min(1).max(128).default('sabz-zendegi-api'),
  JWT_ACCESS_AUDIENCE: Joi.string().trim().min(1).max(128).default('sabz-zendegi-frontends'),
  REFRESH_TOKEN_PEPPER: Joi.string()
    .min(43)
    .max(256)
    .pattern(/^[A-Za-z0-9_-]+$/)
    .invalid('replace-this-placeholder-with-a-unique-refresh-token-pepper')
    .invalid(Joi.ref('JWT_ACCESS_SECRET'))
    .required(),
}).unknown(true);
