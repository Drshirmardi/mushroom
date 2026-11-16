import { describe, expect, it, vi } from 'vitest';
import { marriageRequestLoader } from './marriage-request-loader';
import { PatientRequestError, retryAfterMs } from './patient-request';

const pending = { status: 'PENDING', isInitiator: false };
describe('invitation loading', () => {
  it('shares concurrent requests and reviews once across repeated pending responses', async () => {
    const get = vi.fn(async () => pending), review = vi.fn(async () => pending);
    const loader = marriageRequestLoader(get, review);
    await Promise.all([loader.load(), loader.load(), loader.load()]);
    await loader.load(); await loader.load();
    expect(get).toHaveBeenCalledTimes(3);
    expect(review).toHaveBeenCalledTimes(1);
    loader.reviewAgain(); await loader.load();
    expect(review).toHaveBeenCalledTimes(2);
  });
  it.each([{ ...pending, isInitiator: true }, { ...pending, status: 'ACCEPTED' }, { ...pending, status: 'CANCELLED' }, { ...pending, status: 'REPLACED' }])('never reviews an initiator or terminal request %j', async data => {
    const review = vi.fn(async () => data);
    await marriageRequestLoader(async () => data, review).load();
    expect(review).not.toHaveBeenCalled();
  });
  it.each([0, 90000])('honours rate-limit cooldown %i without network retries', async delay => {
    let now = 0;
    const get = vi.fn().mockRejectedValueOnce(new PatientRequestError(429, null, delay)).mockResolvedValue(pending);
    const loader = marriageRequestLoader(get, async () => pending, () => now);
    await expect(loader.load()).rejects.toMatchObject({ status: 429 });
    now = Math.max(60000, delay) - 1;
    await expect(loader.load()).rejects.toMatchObject({ status: 429 });
    expect(get).toHaveBeenCalledTimes(1);
    now++; await loader.load(); expect(get).toHaveBeenCalledTimes(2);
  });
  it('does not repeat a failed review until explicitly retried', async () => {
    let now = 0;
    const review = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(pending);
    const loader = marriageRequestLoader(async () => pending, review, () => now);
    await expect(loader.load()).rejects.toThrow('offline');
    now = 30000; await loader.load(); expect(review).toHaveBeenCalledTimes(1);
    loader.reviewAgain(); await loader.load(); expect(review).toHaveBeenCalledTimes(2);
  });
  it('refreshes immediately after a successful mutation despite an earlier read cooldown', async () => {
    const get = vi.fn().mockRejectedValueOnce(new PatientRequestError(429, null, 90000)).mockResolvedValue({ ...pending, status: 'ACCEPTED' });
    const loader = marriageRequestLoader(get, async () => pending, () => 0);
    await expect(loader.load()).rejects.toMatchObject({ status: 429 });
    loader.mutationSucceeded();
    await expect(loader.load()).resolves.toMatchObject({ status: 'ACCEPTED' });
  });
  it('reads seconds and HTTP-date Retry-After values safely', () => {
    expect(retryAfterMs('90')).toBe(90000);
    expect(retryAfterMs('Thu, 01 Jan 1970 00:02:00 GMT', 0)).toBe(120000);
    expect(retryAfterMs('invalid')).toBe(0);
    expect(retryAfterMs(null)).toBe(0);
  });
});
