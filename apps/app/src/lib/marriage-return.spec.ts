import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearMarriageReturn, marriageReturn, rememberMarriageReturn } from './marriage-return';

const id = '11111111-1111-4111-8111-111111111111';
afterEach(() => vi.unstubAllGlobals());

describe('return from onboarding to the selected two-person test', () => {
  it('remembers a validated canonical selection without preserving an unsafe return URL', () => {
    const values = new Map<string, string>();
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); },
    });
    const selected = '/assessment/couples?start=' + id;
    rememberMarriageReturn('one', selected);
    rememberMarriageReturn('two', '/assessment/couples?start=bad');
    expect(marriageReturn('one')).toBe(selected);
    expect(marriageReturn('two')).toBeNull();
    clearMarriageReturn('one', selected);
    expect(marriageReturn('one')).toBeNull();
  });
});
