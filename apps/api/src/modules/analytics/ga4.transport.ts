import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class Ga4Transport {
  constructor(private readonly config: ConfigService) {}
  get measurementId() { return this.config.get<string>('PUBLIC_GA4_MEASUREMENT_ID', ''); }
  get enabled() {
    return this.config.get<string>('ANALYTICS_SERVER_ENABLED') === 'true'
      && this.config.get<string>('PUBLIC_ANALYTICS_CONSENT') === 'granted'
      && /^G-[A-Z0-9]+$/.test(this.measurementId)
      && Boolean(this.config.get<string>('GA4_API_SECRET'));
  }
  async send(payload: { events: Array<{ name: string; params?: Record<string, unknown> }> }): Promise<'submitted' | 'permanent' | 'retry'> {
    const url = new URL('https://www.google-analytics.com/mp/collect');
    url.searchParams.set('measurement_id', this.measurementId);
    url.searchParams.set('api_secret', this.config.getOrThrow<string>('GA4_API_SECRET'));
    try {
      const response = await fetch(url, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(this.config.get<string>('PUBLIC_ANALYTICS_DEBUG') === 'true'
          ? { ...payload, events: payload.events.map(event => ({ ...event, params: { ...event.params, debug_mode: true } })) }
          : payload), signal: AbortSignal.timeout(3000), redirect: 'error',
      });
      // No response body or exception message is logged: URLs contain a secret.
      await response.body?.cancel();
      return response.ok ? 'submitted' : response.status === 429 || response.status >= 500 ? 'retry' : 'permanent';
    } catch { return 'retry'; }
  }
}
