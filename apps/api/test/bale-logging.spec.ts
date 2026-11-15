import { describe, expect, it } from 'vitest';
import { createFastifyLoggingOptions, redactBaleWebhookUrl } from '../src/common/logging/fastify-logging.config';

describe('Bale secret-safe logging', () => {
  it('redacts the bearer credential in webhook request URLs', () => {
    expect(redactBaleWebhookUrl('/v1/integrations/bale/webhook/a-secret?x=1'))
      .toBe('/v1/integrations/bale/webhook/[REDACTED]?x=1');
    expect(redactBaleWebhookUrl('/v1/auth/refresh')).toBe('/v1/auth/refresh');
  });

  it('does not serialize signed initData, private contact, or the ticket', () => {
    const options = createFastifyLoggingOptions('info');
    expect(options.logger.redact.paths).toEqual(expect.arrayContaining([
      'req.body.initData', 'req.body.ticket', 'req.body.message.contact.phone_number',
    ]));
    const printed = options.logger.serializers.req({ method: 'POST', url: '/v1/integrations/bale/webhook/my-secret' });
    expect(JSON.stringify(printed)).not.toContain('my-secret');
  });
});
