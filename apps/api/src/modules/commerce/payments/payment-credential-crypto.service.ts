import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { Injectable, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type Encrypted = { ciphertext: Buffer; nonce: Buffer; tag: Buffer; keyVersion: string };
const unavailable = () => new ServiceUnavailableException({ code: 'PAYMENT_PROVIDER_CREDENTIAL_KEY_UNAVAILABLE', message: 'Payment credential encryption is not configured.', details: {} });
const invalid = () => new UnprocessableEntityException({ code: 'PAYMENT_PROVIDER_CONFIGURATION_INVALID', message: 'Stored payment credential cannot be authenticated.', details: {} });

@Injectable()
export class PaymentCredentialCryptoService {
  constructor(private readonly config: ConfigService) {}
  encrypt(value: Record<string, string>): Encrypted { const { key, keyVersion } = this.key(); const nonce = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', key, nonce); const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]); return { ciphertext, nonce, tag: cipher.getAuthTag(), keyVersion }; }
  decrypt(input: { encryptedPayload: Buffer | null; encryptionNonce: Buffer | null; authenticationTag: Buffer | null; encryptionKeyVersion: string | null }): Record<string, string> { const { key } = this.key(); if (!input.encryptedPayload || !input.encryptionNonce || !input.authenticationTag || !input.encryptionKeyVersion) throw invalid(); try { const decipher = createDecipheriv('aes-256-gcm', key, input.encryptionNonce); decipher.setAuthTag(input.authenticationTag); const decoded: unknown = JSON.parse(Buffer.concat([decipher.update(input.encryptedPayload), decipher.final()]).toString('utf8')); if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded) || Object.values(decoded).some((value) => typeof value !== 'string')) throw invalid(); return decoded as Record<string, string>; } catch { throw invalid(); } }
  private key() { const encoded = this.config.get<string>('PAYMENT_CREDENTIAL_ENCRYPTION_KEY'); const keyVersion = this.config.get<string>('PAYMENT_CREDENTIAL_ENCRYPTION_KEY_VERSION', 'v1'); if (!encoded) throw unavailable(); const key = Buffer.from(encoded, 'base64'); if (key.length !== 32) throw unavailable(); return { key, keyVersion }; }
}
