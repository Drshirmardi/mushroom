import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearOnboardingReturn, clearMarriageReturn, marriageReturn, rememberMarriageReturn, rememberOnboardingReturn } from './marriage-return';

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
  it('keeps the selected test and replacement query through patient onboarding and clears it on return', () => {
    const values = new Map<string, string>();
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); },
    });
    const selected = '/assessment/couples?start=' + id + '&replaceRequestId=' + id;
    rememberOnboardingReturn('first', '/assessment/couples', 'start=' + id + '&replaceRequestId=' + id);
    expect(marriageReturn('first')).toBe(selected);
    clearOnboardingReturn('first', '/assessment/couples', 'start=' + id + '&replaceRequestId=' + id);
    expect(marriageReturn('first')).toBeNull();

    rememberOnboardingReturn('second', '/assessment/couples', 'start=invalid');
    rememberOnboardingReturn('second', '/assessment/couples', 'history=1');
    rememberOnboardingReturn('second', '/store', 'start=' + id);
    expect(marriageReturn('second')).toBeNull();
  });

  it('keeps a valid legacy replacement route after completing entry', () => {
    const values = new Map<string, string>();
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); },
    });
    const selected = '/assessment/couples?start=' + id + '&replaceRequestId=' + id;
    rememberOnboardingReturn('legacy', '/assessment/marriage/new/' + id, '?replaceRequestId=' + id);
    expect(marriageReturn('legacy')).toBe(selected);
    clearOnboardingReturn('legacy', '/assessment/couples', 'start=' + id + '&replaceRequestId=' + id);
    expect(marriageReturn('legacy')).toBeNull();
  });

});
