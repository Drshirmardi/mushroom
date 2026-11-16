import { normalizeSadadCallbackUrl } from '../../../config/sadad-callback-url';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SadadRedirectProfile } from './sadad-payment-provider.adapter';

const blocked = () => new ServiceUnavailableException({ code: 'SADAD_GO_LIVE_BLOCKED', message: 'Sadad live transport is not enabled for this deployment.', details: {} });

@Injectable()
export class SadadRuntimeConfigService {
  constructor(private readonly config: ConfigService) {}

  get live() { return this.config.get<string>('SADAD_TRANSPORT_MODE', 'disabled') === 'live'; }
  get timeoutMs() { return this.config.get<number>('SADAD_REQUEST_TIMEOUT_MS', 5_000); }

  settings() {
    if (!this.live) throw blocked();
    let returnUrl: string;
    try {
      returnUrl = normalizeSadadCallbackUrl(this.config.getOrThrow<string>('SADAD_RETURN_URL'));
    } catch { throw blocked(); }
    return {
      returnUrl,
      redirectProfile: this.config.getOrThrow<SadadRedirectProfile>('SADAD_REDIRECT_PROFILE'),
      resultUrl: this.config.getOrThrow<string>('SADAD_RESULT_URL'),
      timeoutMs: this.timeoutMs,
    };
  }
}
