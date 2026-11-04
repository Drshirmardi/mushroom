import { describe, expect, it } from 'vitest';
import { homeResultSummary, homeMizajData } from './home-status';

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
  it('uses saved effective scores and real dimension names, independent of rank', () => {
    expect(homeMizajData({ algorithmId: 'DIMENSION_TIEBREAK', primary: 'a', scores: { a: 0, b: 4 }, dimensionTitles: [{ id: 'a', title: 'اول' }, { id: 'b', title: 'دوم' }] })).toEqual({ scores: { a: 0, b: 4 }, dimensions: [{ id: 'a', title: 'اول' }, { id: 'b', title: 'دوم' }] });
  });
  it('does not invent dimensions for legacy or unrelated results', () => {
    expect(homeMizajData({ resultBand: { title: 'قدیمی' }, score: 10 })).toBeNull();
    expect(homeMizajData({ algorithmId: 'DIMENSION_TIEBREAK', scores: { a: 4 } })).toBeNull();
  });
});
