import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { setupFiles: ['./test/setup-chat-environment.ts'] },
});
