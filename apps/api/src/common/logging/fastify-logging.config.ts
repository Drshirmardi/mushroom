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

export const createFastifyLoggingOptions = (
  logLevel: string,
) => ({
  logger: {
    level: logLevel,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers["set-cookie"]',
        'res.headers["set-cookie"]',
        'req.body.password',
        'req.body.currentPassword',
        'req.body.newPassword',
        'req.body.token',
        'req.body.invitationToken',
        'req.body.recipientPhone',
        'req.body.recipientPatientId',
        'req.body.provenance',
        'req.body.safety',
        'req.body.refreshToken',
        'req.body.accessToken',
      ],
      censor: '[REDACTED]',
    },
  },
  requestIdHeader: false as const,
  genReqId: (request: IncomingMessage) => createRequestId(request.headers),
});
