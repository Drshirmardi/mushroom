import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('API development runtime', () => {
  it('compiles with TypeScript before starting Nest watch mode', async () => {
    const packageJson = JSON.parse(
      await readFile(resolve(process.cwd(), 'package.json'), 'utf8'),
    ) as { scripts?: Record<string, string> };
    const developmentRunner = await readFile(
      resolve(process.cwd(), 'scripts/dev.mjs'),
      'utf8',
    );

    expect(packageJson.scripts?.dev).toBe('node scripts/dev.mjs');
    expect(packageJson.scripts?.['start:dev']).toBe('node scripts/dev.mjs');
    expect(developmentRunner).toContain("require.resolve('typescript/bin/tsc')");
    expect(developmentRunner).toContain("'--watch'");
    expect(developmentRunner).toContain("'dist/main.js'");
    expect(developmentRunner).not.toContain('tsx');
  });
});
