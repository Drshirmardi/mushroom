import { describe, expect, it } from 'vitest';
import { coupleStartHref, selectedCoupleTest, prioritizeCoupleRequests, canStartCoupleTest, isCoupleSelectionRoute, legacyCouplesDestination } from './couples-flow';

const a = '11111111-1111-4111-8111-111111111111';
const b = '22222222-2222-4222-8222-222222222222';

describe('single couple test journey navigation', () => {
  it('opens a published test in the main couples page and retains replacement intent', () => {
    expect(coupleStartHref(a)).toBe('/assessment/couples?start=' + a);
    expect(coupleStartHref(a, b)).toBe('/assessment/couples?start=' + a + '&replaceRequestId=' + b);
    expect(selectedCoupleTest(new URLSearchParams('start=' + a))).toEqual({ publicationId: a });
    expect(selectedCoupleTest(new URLSearchParams('start=' + a + '&replaceRequestId=' + b))).toEqual({ publicationId: a, replacesId: b });
  });

  it('retains only validated selected tests across login, not arbitrary query strings', () => {
    expect(isCoupleSelectionRoute('/assessment/couples', '?start=' + a)).toBe(true);
    expect(isCoupleSelectionRoute('/assessment/couples', '?start=bad')).toBe(false);
    expect(isCoupleSelectionRoute('/assessment/couples', '?history=1')).toBe(false);
    expect(isCoupleSelectionRoute('/store', '?start=' + a)).toBe(false);
  });

  it('rejects arbitrary query parameters, invalid ids, repeated ids and replacement without a selected test', () => {
    for (const query of [
      'start=wrong', 'replaceRequestId=' + b, 'start=' + a + '&replaceRequestId=bad',
      'start=' + a + '&other=1', 'start=' + a + '&start=' + a,
      'start=' + a + '&replaceRequestId=' + b + '&replaceRequestId=' + b,
    ]) expect(selectedCoupleTest(new URLSearchParams(query))).toBeNull();
  });

  it('never offers a new marriage invitation for a free or non-marriage entry', () => {
    expect(canStartCoupleTest({ servicePurpose: 'MARRIAGE', priceMode: 'PAID' })).toBe(true);
    expect(canStartCoupleTest({ servicePurpose: 'MARRIAGE', priceMode: 'FREE' })).toBe(false);
    expect(canStartCoupleTest({ servicePurpose: 'EDUCATIONAL', priceMode: 'PAID' })).toBe(false);
  });
});


  it('moves retired legacy hub URLs into the canonical couples journey', () => {
    expect(legacyCouplesDestination(null)).toBe('/assessment/couples?history=1');
    expect(legacyCouplesDestination(undefined)).toBe('/assessment/couples?history=1');
    expect(legacyCouplesDestination(a)).toBe('/assessment/couples?start=' + a);
    expect(legacyCouplesDestination('not-a-uuid')).toBe('/assessment/couples?history=1');
    expect(legacyCouplesDestination('//external.example')).toBe('/assessment/couples?history=1');
    expect(legacyCouplesDestination(a + '&evil=1')).toBe('/assessment/couples?history=1');
  });

describe('couple test overview', () => {
  it('prioritizes a received pending invitation over a sent one and retains every other row', () => {
    const rows = [
      { id: 'done', status: 'CANCELLED', isInitiator: true },
      { id: 'sent', status: 'PENDING', isInitiator: true },
      { id: 'accepted', status: 'ACCEPTED', isInitiator: false },
      { id: 'received', status: 'PENDING', isInitiator: false },
    ];
    expect(prioritizeCoupleRequests(rows).map(row => row.id))
      .toEqual(['received', 'sent', 'accepted', 'done']);
    expect(rows.map(row => row.id)).toEqual(['done', 'sent', 'accepted', 'received']);
  });

  it('keeps newer rows in their original order inside the same state', () => {
    expect(prioritizeCoupleRequests([
      { id: 'new', status: 'PENDING', isInitiator: false },
      { id: 'old', status: 'PENDING', isInitiator: false },
    ]).map(row => row.id)).toEqual(['new', 'old']);
  });
});
