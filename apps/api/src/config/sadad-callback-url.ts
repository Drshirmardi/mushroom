export const SADAD_CALLBACK_PATH = '/v1/payments/providers/sadad/callback';

export function normalizeSadadCallbackUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== SADAD_CALLBACK_PATH || url.search || url.hash) {
    throw new Error('Invalid Sadad callback URL');
  }
  return url.toString();
}
