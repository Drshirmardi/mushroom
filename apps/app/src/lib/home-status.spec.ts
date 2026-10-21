import { describe, expect, it } from 'vitest';
import { homeResultSummary } from './home-status';

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
