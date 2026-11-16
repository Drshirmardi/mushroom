export type SmsCapability = 'PATTERN_SEND' | 'TEXT_SEND' | 'CONNECTION_TEST';

export type SmsFieldDescriptor = {
  key: string;
  label: string;
  help: string;
  type: 'text' | 'secret';
  required: boolean;
  secret: boolean;
  defaultValue?: string;
  placeholder?: string;
  order: number;
  maxLength: number;
};

export type SmsProviderDescriptor = {
  code: string;
  displayName: string;
  description: string;
  capabilities: readonly SmsCapability[];
  fields: readonly SmsFieldDescriptor[];
};

export type SmsProviderResult = {
  outcome: 'ACCEPTED' | 'FAILED' | 'UNKNOWN';
  providerReference?: string;
  errorCategory?: 'AUTHENTICATION' | 'REJECTED' | 'NETWORK' | 'TIMEOUT' | 'INVALID_RESPONSE';
};

export abstract class SmsProviderPort {
  abstract readonly descriptor: SmsProviderDescriptor;
  abstract testConnection(credential: Record<string, string>): Promise<SmsProviderResult>;
  abstract sendPattern(input: {
    credential: Record<string, string>;
    config: Record<string, string>;
    recipient: string;
    attributes: Record<string, string>;
  }): Promise<SmsProviderResult>;
  abstract sendText(input: {
    credential: Record<string, string>;
    recipient: string;
    text: string;
    senderLine: string;
  }): Promise<SmsProviderResult>;
}
