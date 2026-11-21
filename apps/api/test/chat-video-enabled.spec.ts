import { afterEach, describe, expect, it, vi } from 'vitest';
import { chatVideoEnabled } from '../src/modules/communications/chat/chat-video-enabled';

afterEach(() => vi.unstubAllEnvs());

describe('video acceptance trial', () => {
  const now = Date.parse('2026-11-20T12:00:00Z');
  it('expires on a running process and rejects invalid or excessive deadlines', () => {
    vi.stubEnv('CHAT_VIDEO_ENABLED', 'false');
    vi.stubEnv('CHAT_VIDEO_TEST_UNTIL', '2026-11-20T12:30:00Z');
    expect(chatVideoEnabled(now)).toBe(true);
    expect(chatVideoEnabled(now + 30 * 60 * 1000)).toBe(false);
    expect(chatVideoEnabled(now - 1)).toBe(false);
    vi.stubEnv('CHAT_VIDEO_TEST_UNTIL', 'bad');
    expect(chatVideoEnabled(now)).toBe(false);
    vi.stubEnv('CHAT_VIDEO_TEST_UNTIL', '');
    expect(chatVideoEnabled(now)).toBe(false);
  });
  it('retains permanent activation independently of trial expiry', () => {
    vi.stubEnv('CHAT_VIDEO_ENABLED', 'true');
    vi.stubEnv('CHAT_VIDEO_TEST_UNTIL', '');
    expect(chatVideoEnabled(now)).toBe(true);
  });
});
