import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsRuntimeService {
  constructor(private readonly config: ConfigService) {}
  get live() { return this.config.get<string>('SMS_TRANSPORT_MODE', 'disabled') === 'live'; }
  get timeoutMs() { return this.config.get<number>('SMS_REQUEST_TIMEOUT_MS', 5_000); }
  assertLive() {
    if (!this.live) throw new ServiceUnavailableException({ code: 'SMS_TRANSPORT_DISABLED', message: 'SMS transport is disabled for this deployment.', details: {} });
  }
}
