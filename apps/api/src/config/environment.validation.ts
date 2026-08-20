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
  LOG_LEVEL: Joi.string().valid('fatal', 'error', 'warn', 'info', 'debug', 'trace').default('info'),
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
}).unknown(true);
