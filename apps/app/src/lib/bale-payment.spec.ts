import { describe, expect, it } from 'vitest';
import { supportsBaleInvoiceVersion } from './bale-payment';

describe('Bale native invoice version gate', () => {
  it('requires API version 1.3 or later and fails closed for unknown versions', () => {
    for (const version of ['1.0', '1.1', '1.2', '', 'malformed']) {
      expect(supportsBaleInvoiceVersion(version)).toBe(false);
    }
    for (const version of ['1.3', '1.4', '2.0']) {
      expect(supportsBaleInvoiceVersion(version)).toBe(true);
    }
  });
});
