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

const paymentCredentialKeySchema = Joi.string()
  .allow('')
  .custom((value, helpers) => {
    if (!value) return value;
    const decoded = Buffer.from(value, 'base64');
    return decoded.length === 32 && decoded.toString('base64') === value ? value : helpers.error('any.invalid');
  })
  .messages({ 'any.invalid': 'must be a canonical base64-encoded 32-byte AES-256 key' });

const paymentCredentialHistoricalKeyringSchema = Joi.string()
  .allow('')
  .custom((value, helpers) => {
    if (!value) return value;
    const versions = new Set<string>();
    const entries = value.split(',');
    const valid = entries.length > 0 && entries.every((entry: string) => {
      const separator = entry.indexOf(':');
      const version = separator > 0 ? entry.slice(0, separator) : '';
      const encoded = separator > 0 ? entry.slice(separator + 1) : '';
      const decoded = Buffer.from(encoded, 'base64');
      if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u.test(version) || versions.has(version) || decoded.length !== 32 || decoded.toString('base64') !== encoded) return false;
      versions.add(version);
      return true;
    });
    return valid ? value : helpers.error('any.invalid');
  })
  .messages({ 'any.invalid': 'must be a comma-separated version:canonical-base64-32-byte-key keyring with unique versions' });

const sadadReturnUrlSchema = Joi.string()
  .allow('')
  .custom((value, helpers) => {
    if (!value) return value;
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && url.pathname === '/v1/payments/providers/sadad/callback' && !url.search && !url.hash ? url.toString() : helpers.error('any.invalid');
    } catch { return helpers.error('any.invalid'); }
  })
  .messages({ 'any.invalid': 'must be an HTTPS URL ending exactly in /v1/payments/providers/sadad/callback with no query or fragment' });

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
  // Sadad remains disabled here: merchant credentials are encrypted config revisions, never environment values.
  PAYMENT_CREDENTIAL_ENCRYPTION_KEY: paymentCredentialKeySchema.optional(),
  PAYMENT_CREDENTIAL_ENCRYPTION_KEY_VERSION: Joi.string().trim().min(1).max(64).default('v1'),
  PAYMENT_CREDENTIAL_DECRYPTION_KEYS: paymentCredentialHistoricalKeyringSchema.optional(),
  SADAD_TRANSPORT_MODE: Joi.string().valid('disabled').default('disabled'),
  SADAD_REQUEST_TIMEOUT_MS: Joi.number().integer().min(1_000).max(30_000).default(5_000),
  SADAD_RETURN_URL: sadadReturnUrlSchema.optional(),
  SADAD_REDIRECT_PROFILE: Joi.string().valid('', 'PDF_PURCHASE', 'PHP_VPG_PURCHASE', 'DOTNET_PURCHASE_INDEX').default(''),
}).unknown(true);
