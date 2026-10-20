import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHoldTimer, HOLD_DURATION_MS } from './hold-delete-button';

afterEach(() => vi.useRealTimers());

describe('deliberate hold deletion', () => {
  it('never completes a short press and starts a new full interval after cancellation', () => {
    vi.useFakeTimers(); const complete = vi.fn(); const timer = createHoldTimer(complete);
    timer.start(); vi.advanceTimersByTime(HOLD_DURATION_MS - 1); timer.cancel();
    vi.advanceTimersByTime(HOLD_DURATION_MS); expect(complete).not.toHaveBeenCalled();
    timer.start(); vi.advanceTimersByTime(HOLD_DURATION_MS - 1); expect(complete).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1); expect(complete).toHaveBeenCalledTimes(1);
  });
  it('completes once per continuous press and ignores repeats until release', () => {
    vi.useFakeTimers(); const complete = vi.fn(); const timer = createHoldTimer(complete);
    expect(timer.start()).toBe(true); expect(timer.start()).toBe(false);
    vi.advanceTimersByTime(HOLD_DURATION_MS); expect(complete).toHaveBeenCalledTimes(1);
    expect(timer.start()).toBe(false); vi.advanceTimersByTime(HOLD_DURATION_MS * 3); expect(complete).toHaveBeenCalledTimes(1);
    timer.cancel(); timer.start(); vi.advanceTimersByTime(HOLD_DURATION_MS); expect(complete).toHaveBeenCalledTimes(2);
  });
  it('cancels a pending action without invoking deletion', () => {
    vi.useFakeTimers(); const complete = vi.fn(); const timer = createHoldTimer(complete);
    timer.start(); timer.cancel(); timer.cancel(); vi.runAllTimers();
    expect(complete).not.toHaveBeenCalled();
  });
});
