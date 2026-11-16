import { ApiHeader } from '@nestjs/swagger';
import { SESSION_CONTEXT_HEADER } from './refresh-cookie.service';

export const ApiSessionContext = (): MethodDecorator => ApiHeader({
  name: SESSION_CONTEXT_HEADER,
  required: false,
  enum: ['bale'],
  description: 'Selects the partitioned cookie for the Bale mini-app on the configured HTTPS app origin.',
});

export const REFRESH_COOKIE_RESPONSE_HEADERS = {
  'Set-Cookie': {
    description:
      'HttpOnly refresh cookie; its value is intentionally unavailable to JavaScript.',
    schema: { type: 'string' },
  },
} as const;
