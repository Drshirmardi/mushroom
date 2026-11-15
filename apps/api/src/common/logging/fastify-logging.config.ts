import { randomUUID } from 'node:crypto';
import type { IncomingHttpHeaders, IncomingMessage } from 'node:http';

export const REQUEST_ID_HEADER = 'x-request-id';

const acceptedRequestId = /^[A-Za-z0-9._-]{1,128}$/;

const getHeaderValue = (headers: IncomingHttpHeaders): string | undefined => {
  const value = headers[REQUEST_ID_HEADER];

  return Array.isArray(value) ? value[0] : value;
};

export const createRequestId = (headers: IncomingHttpHeaders): string => {
  const suppliedRequestId = getHeaderValue(headers);

  return suppliedRequestId && acceptedRequestId.test(suppliedRequestId)
    ? suppliedRequestId
    : randomUUID();
};

/** The webhook path contains a bearer secret because Bale's documented setWebhook has only a URL. */
export const redactBaleWebhookUrl = (url: string): string =>
  url.replace(/(\/v1\/integrations\/bale\/webhook\/)[^/?#]+/gu, '$1[REDACTED]');

export const createFastifyLoggingOptions = (
  logLevel: string,
) => ({
  logger: {
    level: logLevel,
    serializers: {
      req: (request: { method?: string; url?: string; hostname?: string; remoteAddress?: string; remotePort?: number }) => ({
        method: request.method,
        url: redactBaleWebhookUrl(request.url ?? ''),
        hostname: request.hostname,
        remoteAddress: request.remoteAddress,
        remotePort: request.remotePort,
      }),
    },
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers["x-analytics-context"]',
        'req.headers["x-chat-policy-key"]',
        'req.headers.cookie',
        'req.headers["set-cookie"]',
        'res.headers["set-cookie"]',
        'req.body.password',
        'req.body.currentPassword',
        'req.body.newPassword',
        'req.body.token',
        'req.body.actorJid',
        'req.body.body',
        'req.body.invitationToken',
        'req.body.recipientPhone',
        'req.body.recipientPatientId',
        'req.body.provenance',
        'req.body.safety',
        'req.body.withdrawalReason',
        'req.body.refreshToken',
        'req.body.accessToken',
        'req.body.initData',
        'req.body.ticket',
        'req.body.message.contact.phone_number',
      ],
      censor: '[REDACTED]',
    },
  },
  requestIdHeader: false as const,
  genReqId: (request: IncomingMessage) => createRequestId(request.headers),
});
