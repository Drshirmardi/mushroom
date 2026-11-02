import { createHmac, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { Injectable, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type Encrypted = { ciphertext: Buffer; nonce: Buffer; tag: Buffer; keyVersion: string };

@Injectable()
export class SmsCredentialCryptoService {
  constructor(private readonly config: ConfigService) {}

  phoneFingerprints(phone: string): string[] {
    const current = this.current();
    const versions = [current.version, ...this.config.get<string>('SMS_CREDENTIAL_DECRYPTION_KEYS', '').split(',').filter(Boolean).map(item => item.slice(0, item.indexOf(':')))];
    return [...new Set(versions)].map(version => createHmac('sha256', this.key(version)).update(`marriage-invitation:${phone}`).digest('hex'));
  }

  encrypt(value: Record<string, string>): Encrypted {
    const { key, version } = this.current();
    const nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, nonce);
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
    return { ciphertext, nonce, tag: cipher.getAuthTag(), keyVersion: version };
  }

  decrypt(input: { encryptedPayload: Uint8Array | null; encryptionNonce: Uint8Array | null; authenticationTag: Uint8Array | null; encryptionKeyVersion: string | null }): Record<string, string> {
    if (!input.encryptedPayload || !input.encryptionNonce || !input.authenticationTag || !input.encryptionKeyVersion) throw this.invalid();
    const key = this.key(input.encryptionKeyVersion);
    try {
      const decipher = createDecipheriv('aes-256-gcm', key, input.encryptionNonce);
      decipher.setAuthTag(Buffer.from(input.authenticationTag));
      const value: unknown = JSON.parse(Buffer.concat([decipher.update(input.encryptedPayload), decipher.final()]).toString('utf8'));
      if (!value || typeof value !== 'object' || Array.isArray(value) || Object.values(value).some((entry) => typeof entry !== 'string')) throw this.invalid();
      return value as Record<string, string>;
    } catch { throw this.invalid(); }
  }

  private current() {
    const encoded = this.config.get<string>('SMS_CREDENTIAL_ENCRYPTION_KEY', '');
    const version = this.config.get<string>('SMS_CREDENTIAL_ENCRYPTION_KEY_VERSION', 'v1');
    const key = this.decode(encoded);
    if (!key) throw this.unavailable();
    return { key, version };
  }
  private key(version: string) {
    const current = this.current();
    if (version === current.version) return current.key;
    for (const item of this.config.get<string>('SMS_CREDENTIAL_DECRYPTION_KEYS', '').split(',').filter(Boolean)) {
      const separator = item.indexOf(':');
      if (item.slice(0, separator) === version) { const key = this.decode(item.slice(separator + 1)); if (key) return key; }
    }
    throw this.unavailable();
  }
  private decode(value: string) { const key = Buffer.from(value, 'base64'); return key.length === 32 && key.toString('base64') === value ? key : undefined; }
  private unavailable() { return new ServiceUnavailableException({ code: 'SMS_CREDENTIAL_KEY_UNAVAILABLE', message: 'SMS credential encryption is not configured.', details: {} }); }
  private invalid() { return new UnprocessableEntityException({ code: 'SMS_PROVIDER_CONFIGURATION_INVALID', message: 'Stored SMS credential cannot be authenticated.', details: {} }); }
}
