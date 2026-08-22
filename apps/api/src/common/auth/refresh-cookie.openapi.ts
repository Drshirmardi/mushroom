export const REFRESH_COOKIE_RESPONSE_HEADERS = {
  'Set-Cookie': {
    description:
      'HttpOnly refresh cookie; its value is intentionally unavailable to JavaScript.',
    schema: { type: 'string' },
  },
} as const;
