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

const secretPepperSchema = Joi.string()
  .min(43)
  .max(256)
  .pattern(/^[A-Za-z0-9_-]+$/)
  .messages({ 'string.pattern.base': 'must be an URL-safe secret with at least 256 bits of entropy' });

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

const sadadResultUrlSchema = Joi.string()
  .allow('')
  .custom((value, helpers) => {
    if (!value) return value;
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && url.pathname === '/store/order-success' && !url.search && !url.hash ? url.toString() : helpers.error('any.invalid');
    } catch { return helpers.error('any.invalid'); }
  })
  .messages({ 'any.invalid': 'must be an HTTPS URL ending exactly in /store/order-success with no query or fragment' });

export const environmentValidationSchema = Joi.object({
  PRODUCT_MEDIA_STORAGE_MODE: Joi.string().valid('disabled', 'r2').default('disabled').when('NODE_ENV', { is: 'production', then: Joi.valid(Joi.override, 'disabled') }),
  R2_ENDPOINT: Joi.string().uri({ scheme: ['https'] }).when('PRODUCT_MEDIA_STORAGE_MODE', { is: 'r2', then: Joi.required(), otherwise: Joi.optional().allow('') }),
  R2_BUCKET: Joi.string().pattern(/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/).when('PRODUCT_MEDIA_STORAGE_MODE', { is: 'r2', then: Joi.required(), otherwise: Joi.optional().allow('') }),
  R2_REGION: Joi.string().valid('auto').default('auto'),
  R2_ACCESS_KEY_ID: Joi.string().trim().min(1).when('PRODUCT_MEDIA_STORAGE_MODE', { is: 'r2', then: Joi.required(), otherwise: Joi.optional().allow('') }),
  R2_SECRET_ACCESS_KEY: Joi.string().trim().min(1).when('PRODUCT_MEDIA_STORAGE_MODE', { is: 'r2', then: Joi.required(), otherwise: Joi.optional().allow('') }),
  R2_REQUEST_TIMEOUT_MS: Joi.number().integer().min(1000).max(10000).default(5000),
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
  PUBLIC_API_URL: Joi.string().custom((value, helpers) => isHttpOrigin(value) && new URL(value).protocol === 'https:' ? new URL(value).toString() : helpers.error('any.invalid')).when('SADAD_TRANSPORT_MODE', { is: 'live', then: Joi.required(), otherwise: Joi.optional() }).messages({ 'any.invalid': 'must be a public HTTPS origin with no path, query or fragment' }),
  TRUSTED_PROXIES: Joi.when('NODE_ENV', {
    is: 'production',
    then: trustedProxySchema.required(),
    otherwise: trustedProxySchema.allow('').default(''),
  }),
  LOG_LEVEL: Joi.string().valid('fatal', 'error', 'warn', 'info', 'debug', 'trace').default('info'),
  BILLING_BOOKING_HOLD_MINUTES: Joi.number().integer().min(1).max(30).default(10),
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
  OTP_PEPPER: secretPepperSchema.required().invalid(Joi.ref('JWT_ACCESS_SECRET'), Joi.ref('REFRESH_TOKEN_PEPPER')),
  SMS_CREDENTIAL_ENCRYPTION_KEY: paymentCredentialKeySchema.when('SMS_TRANSPORT_MODE', { is: 'live', then: Joi.invalid('').required(), otherwise: Joi.optional() }),
  SMS_CREDENTIAL_ENCRYPTION_KEY_VERSION: Joi.string().trim().min(1).max(64).default('v1'),
  SMS_CREDENTIAL_DECRYPTION_KEYS: paymentCredentialHistoricalKeyringSchema.optional(),
  SMS_TRANSPORT_MODE: Joi.string().valid('disabled', 'live').default('disabled'),
  SMS_REQUEST_TIMEOUT_MS: Joi.number().integer().min(1_000).max(30_000).default(5_000),
  // Merchant credentials remain encrypted config revisions; live mode contains only deployment/network controls.
  PAYMENT_CREDENTIAL_ENCRYPTION_KEY: paymentCredentialKeySchema.when('SADAD_TRANSPORT_MODE', { is: 'live', then: Joi.invalid('').required(), otherwise: Joi.optional() }),
  PAYMENT_CREDENTIAL_ENCRYPTION_KEY_VERSION: Joi.string().trim().min(1).max(64).default('v1'),
  PAYMENT_CREDENTIAL_DECRYPTION_KEYS: paymentCredentialHistoricalKeyringSchema.optional(),
  SADAD_TRANSPORT_MODE: Joi.string().valid('disabled', 'live').default('disabled'),
  SADAD_REQUEST_TIMEOUT_MS: Joi.number().integer().min(1_000).max(30_000).default(5_000),
  SADAD_RETURN_URL: sadadReturnUrlSchema.when('SADAD_TRANSPORT_MODE', { is: 'live', then: Joi.invalid('').required(), otherwise: Joi.optional() }),
  SADAD_RESULT_URL: sadadResultUrlSchema.when('SADAD_TRANSPORT_MODE', { is: 'live', then: Joi.invalid('').required(), otherwise: Joi.optional() }),
  SADAD_REDIRECT_PROFILE: Joi.string().valid('', 'PDF_PURCHASE', 'PHP_VPG_PURCHASE', 'DOTNET_PURCHASE_INDEX').when('SADAD_TRANSPORT_MODE', { is: 'live', then: Joi.invalid('').required(), otherwise: Joi.string().default('') }),
}).unknown(true);
