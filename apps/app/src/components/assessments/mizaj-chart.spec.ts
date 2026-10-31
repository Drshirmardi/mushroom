import { describe, expect, it } from 'vitest';
import { mizajPercentages } from './mizaj-chart';
describe('Mizaj percentages in tenths', () => {
  const dimensions = ['a','b','c','d'].map(id => ({ id }));
  it('rounds to exactly 100 percent while retaining zero dimensions', () => {
    expect(mizajPercentages({a:1,b:1,c:1,d:0}, dimensions)).toEqual([334,333,333,0]);
    expect(mizajPercentages({a:4,b:2,c:2,d:2}, dimensions)).toEqual([400,200,200,200]);
  });
  it('has no fabricated chart when no effective evidence exists', () => {
    expect(mizajPercentages({}, dimensions)).toEqual([]);
    expect(mizajPercentages({a:0,b:0,c:0,d:0}, dimensions)).toEqual([]);
  });
});
