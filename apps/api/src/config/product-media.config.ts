import * as Joi from 'joi';

// One active profile per process. Inactive credentials never activate a provider.
export const productMediaEnvironment = {
  PRODUCT_MEDIA_STORAGE_MODE: Joi.string().valid('disabled', 'r2', 'arvancloud').default('disabled')
    .when('NODE_ENV', { is: 'production', then: Joi.valid(Joi.override, 'disabled') }),
  ...Object.fromEntries((['R2', 'ARVAN'] as const).flatMap(prefix => {
    const mode = prefix === 'R2' ? 'r2' : 'arvancloud';
    const requiredWhenActive = (schema: Joi.StringSchema) => schema.when('PRODUCT_MEDIA_STORAGE_MODE', {
      is: mode, then: Joi.required(), otherwise: Joi.optional().allow(''),
    });
    return [
      [`${prefix}_ENDPOINT`, requiredWhenActive(Joi.string().uri({ scheme: ['https'] }))],
      [`${prefix}_BUCKET`, requiredWhenActive(Joi.string().pattern(/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/))],
      [`${prefix}_REGION`, prefix === 'R2' ? Joi.string().valid('auto').default('auto') : Joi.string().trim().min(1).default('default')],
      [`${prefix}_ACCESS_KEY_ID`, requiredWhenActive(Joi.string().trim().min(1))],
      [`${prefix}_SECRET_ACCESS_KEY`, requiredWhenActive(Joi.string().trim().min(1))],
      [`${prefix}_REQUEST_TIMEOUT_MS`, Joi.number().integer().min(1000).max(10000).default(5000)],
    ];
  })),
};
