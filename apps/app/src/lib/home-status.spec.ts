import { describe, expect, it, vi } from 'vitest';
import { homeResultSummary, homeMizajData, subscribeHomeRefresh } from './home-status';

it('shares one 60-second window between visibility and restored-page refreshes', () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  const page = new EventTarget();
  const document = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  vi.stubGlobal('document', document);
  vi.stubGlobal('window', page);
  const refresh = vi.fn();
  const unsubscribe = subscribeHomeRefresh(refresh);
  const restored = () => page.dispatchEvent(Object.assign(new Event('pageshow'), { persisted: true }));
  try {
    vi.setSystemTime(Date.now() + 59_999);
    restored();
    expect(refresh).not.toHaveBeenCalled();
    vi.setSystemTime(Date.now() + 1);
    document.dispatchEvent(new Event('visibilitychange'));
    restored();
    expect(refresh).toHaveBeenCalledTimes(1);
    vi.setSystemTime(Date.now() + 60_000);
    restored();
    expect(refresh).toHaveBeenCalledTimes(2);
  } finally {
    unsubscribe();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  }
});

describe('Home result summary', () => {
  it('does not present an authored profile as resolved when the server reports a tie', () => {
    expect(homeResultSummary({ algorithmId: 'DIMENSION_TIEBREAK', status: 'PRIMARY_TIE', profile: { title: 'Must not appear' } }).title).toBe('نتیجه به بررسی بیشتر نیاز دارد');
  });
  it('uses the real resolved profile without deriving medical scores', () => {
    expect(homeResultSummary({ algorithmId: 'DIMENSION_TIEBREAK', status: 'PAIR', profile: { title: 'Authored title' }, scores: { a: 100 } }).title).toBe('Authored title');
  });
  it('preserves an explicit review requirement instead of showing the band as settled', () => {
    expect(homeResultSummary({ resultBand: { title: 'Band', requiresReview: true } }).title).toBe('نتیجه نیاز به بررسی درمانگر دارد');
  });
  it('uses a neutral fallback for old results with no structured display text', () => {
    expect(homeResultSummary(null).title).toBe('نتیجهٔ ارزیابی شما ثبت شده');
  });
});

describe('Home temperament chart source', () => {
  const dimensionTitles = [{ id: 'a', title: 'الف' }, { id: 'b', title: 'ب' }, { id: 'c', title: 'ج' }];
  const tiedResult = { algorithmId: 'DIMENSION_TIEBREAK', scores: { a: 6, b: 4, c: 4 }, dimensionTitles };

  it('uses the saved secondary selected by a tie-break without changing scores', () => {
    expect(homeMizajData({ ...tiedResult, primary: 'a', secondary: 'c' })).toEqual({
      scores: tiedResult.scores, dimensions: dimensionTitles, ranks: [dimensionTitles[0], dimensionTitles[2]],
    });
  });
  it('uses the saved primary even when display scores tie', () => {
    expect(homeMizajData({ ...tiedResult, scores: { a: 6, b: 6, c: 4 }, primary: 'b', secondary: 'a' })?.ranks)
      .toEqual([dimensionTitles[1], dimensionTitles[0]]);
  });
  it('leaves unresolved and absent ranks empty', () => {
    expect(homeMizajData({ ...tiedResult, primary: 'a', secondary: null })?.ranks).toEqual([dimensionTitles[0], null]);
    expect(homeMizajData({ ...tiedResult, primary: null, secondary: null })?.ranks).toEqual([null, null]);
    expect(homeMizajData(tiedResult)?.ranks).toEqual([null, null]);
  });
  it('does not invent dimensions for legacy or unrelated results', () => {
    expect(homeMizajData({ resultBand: { title: 'قدیمی' }, score: 10 })).toBeNull();
    expect(homeMizajData({ algorithmId: 'DIMENSION_TIEBREAK', scores: { a: 4 } })).toBeNull();
  });
});
