import { describe, expect, it } from 'vitest';
import { classifyCoupleRequests, coupleRequestStatus } from './couples-overview';

const request = (id: string, status: string, isInitiator: boolean) => ({ id, status, isInitiator });

describe('unified two-person test overview', () => {
  it('prioritizes received pending invitations and separates ongoing tests from closed history', () => {
    const items = [
      request('accepted', 'ACCEPTED', true),
      request('outgoing', 'PENDING', true),
      request('incoming', 'PENDING', false),
      request('cancelled', 'CANCELLED', true),
      request('replaced', 'REPLACED', true),
    ];
    const groups = classifyCoupleRequests(items);
    expect(groups.incoming.map(item => item.id)).toEqual(['incoming']);
    expect(groups.active.map(item => item.id)).toEqual(['accepted', 'outgoing']);
    expect(groups.history.map(item => item.id)).toEqual(['cancelled', 'replaced']);
    expect(groups.incoming.length + groups.active.length + groups.history.length).toBe(items.length);
  });

  it('provides actor-specific labels without claiming the partner has completed any test', () => {
    expect(coupleRequestStatus(request('a', 'PENDING', false))).toBe('منتظر پاسخ شما');
    expect(coupleRequestStatus(request('a', 'PENDING', true))).toBe('منتظر پاسخ نفر دوم');
    expect(coupleRequestStatus(request('a', 'ACCEPTED', false))).toBe('دعوت پذیرفته شد');
    expect(coupleRequestStatus(request('a', 'REPLACED', true))).toBe('دعوت جایگزین شد');
  });
});
