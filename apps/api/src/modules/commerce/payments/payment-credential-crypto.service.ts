import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { Injectable, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type Encrypted = { ciphertext: Buffer; nonce: Buffer; tag: Buffer; keyVersion: string };
const unavailable = () => new ServiceUnavailableException({ code: 'PAYMENT_PROVIDER_CREDENTIAL_KEY_UNAVAILABLE', message: 'Payment credential encryption is not configured.', details: {} });
const invalid = () => new UnprocessableEntityException({ code: 'PAYMENT_PROVIDER_CONFIGURATION_INVALID', message: 'Stored payment credential cannot be authenticated.', details: {} });

@Injectable()
export class PaymentCredentialCryptoService {
  constructor(private readonly config: ConfigService) {}
  encrypt(value: Record<string, string>): Encrypted {
    const { key, keyVersion } = this.currentKey();
    const nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, nonce);
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
    return { ciphertext, nonce, tag: cipher.getAuthTag(), keyVersion };
  }

  decrypt(input: { encryptedPayload: Buffer | null; encryptionNonce: Buffer | null; authenticationTag: Buffer | null; encryptionKeyVersion: string | null }): Record<string, string> {
    if (!input.encryptedPayload || !input.encryptionNonce || !input.authenticationTag || !input.encryptionKeyVersion) throw invalid();
    const key = this.keyForVersion(input.encryptionKeyVersion);
    try {
      const decipher = createDecipheriv('aes-256-gcm', key, input.encryptionNonce);
      decipher.setAuthTag(input.authenticationTag);
      const decoded: unknown = JSON.parse(Buffer.concat([decipher.update(input.encryptedPayload), decipher.final()]).toString('utf8'));
      if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded) || Object.values(decoded).some((value) => typeof value !== 'string')) throw invalid();
      return decoded as Record<string, string>;
    } catch {
      throw invalid();
    }
  }

  private currentKey() {
    const encoded = this.config.get<string>('PAYMENT_CREDENTIAL_ENCRYPTION_KEY');
    const keyVersion = this.config.get<string>('PAYMENT_CREDENTIAL_ENCRYPTION_KEY_VERSION', 'v1');
    if (!encoded) throw unavailable();
    const key = this.decodeKey(encoded);
    if (!key) throw unavailable();
    return { key, keyVersion };
  }

  private keyForVersion(version: string): Buffer {
    const current = this.currentKey();
    if (version === current.keyVersion) return current.key;
    const historic = this.historicalKeys().get(version);
    if (!historic) throw unavailable();
    return historic;
  }

  private historicalKeys(): Map<string, Buffer> {
    const raw = this.config.get<string>('PAYMENT_CREDENTIAL_DECRYPTION_KEYS', '');
    const keys = new Map<string, Buffer>();
    if (!raw) return keys;
    for (const entry of raw.split(',')) {
      const separator = entry.indexOf(':');
      if (separator <= 0 || entry.indexOf(':', separator + 1) !== -1) throw unavailable();
      const version = entry.slice(0, separator);
      const key = this.decodeKey(entry.slice(separator + 1));
      if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u.test(version) || !key || keys.has(version)) throw unavailable();
      keys.set(version, key);
    }
    return keys;
  }

  private decodeKey(encoded: string): Buffer | undefined {
    const key = Buffer.from(encoded, 'base64');
    return key.length === 32 && key.toString('base64') === encoded ? key : undefined;
  }
}
