import { Injectable, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPrivateKey, createSign, KeyObject } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const engineUnavailable = () => new ServiceUnavailableException({ code: 'CHAT_ENGINE_UNAVAILABLE', message: 'The messaging engine is unavailable.', details: {} });

@Injectable()
export class EjabberdConfig implements OnModuleInit {
  private key?: KeyObject;
  constructor(private readonly config: ConfigService) {}
  get domain() { return this.config.getOrThrow<string>('EJABBERD_DOMAIN'); }
  get conference() { return `conference.${this.domain}`; }
  get websocketUrl() { return this.config.getOrThrow<string>('EJABBERD_WEBSOCKET_URL'); }
  get apiUrl() { return this.config.getOrThrow<string>('EJABBERD_API_URL'); }
  get policySecret() { return this.config.getOrThrow<string>('EJABBERD_POLICY_SECRET'); }
  get timeoutMs() { return this.config.get<number>('EJABBERD_REQUEST_TIMEOUT_MS', 3000); }

  onModuleInit() {
    // Configuration errors fail startup; they must not silently select legacy chat.
    for (const name of ['EJABBERD_DOMAIN', 'EJABBERD_WEBSOCKET_URL', 'EJABBERD_API_URL', 'EJABBERD_POLICY_SECRET']) this.config.getOrThrow(name);
    const path = this.config.getOrThrow<string>('EJABBERD_JWT_PRIVATE_KEY_FILE');
    this.key = createPrivateKey(readFileSync(path));
    if (this.key.asymmetricKeyType !== 'rsa' || (this.key.asymmetricKeyDetails?.modulusLength ?? 0) < 2048) {
      throw new Error('ejabberd signing key must be an RSA key of at least 2048 bits.');
    }
  }

  assertReady() { if (!this.key) throw engineUnavailable(); }

  sign(jid: string, expiresAt: number) {
    this.assertReady();
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ jid, iat: Math.floor(Date.now() / 1000), exp: expiresAt })).toString('base64url');
    const input = `${header}.${payload}`;
    const signature = createSign('RSA-SHA256').update(input).end().sign(this.key!).toString('base64url');
    return `${input}.${signature}`;
  }
}
