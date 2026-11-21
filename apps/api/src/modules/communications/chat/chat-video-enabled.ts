/** Evaluate trial expiry on every request, including long-running API processes. */
export function chatVideoEnabled(now = Date.now()): boolean {
  if (process.env.CHAT_VIDEO_ENABLED === 'true') return true;
  const deadline = Date.parse(process.env.CHAT_VIDEO_TEST_UNTIL ?? '');
  return Number.isFinite(deadline) && deadline > now && deadline - now <= 30 * 60 * 1000;
}
