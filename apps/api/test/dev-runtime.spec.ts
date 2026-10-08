import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('API development runtime', () => {
  it('compiles with TypeScript before starting Nest watch mode', async () => {
    const packageJson = JSON.parse(
      await readFile(resolve(process.cwd(), 'package.json'), 'utf8'),
    ) as { scripts?: Record<string, string>; type?: string };
    const developmentRunner = await readFile(
      resolve(process.cwd(), 'scripts/dev.mjs'),
      'utf8',
    );

    expect(packageJson.scripts?.dev).toBe('node scripts/dev.mjs');
    expect(packageJson.scripts?.['start:dev']).toBe('node scripts/dev.mjs');
    expect(packageJson.type).toBe('commonjs');
    expect(developmentRunner).toContain("require.resolve('typescript/bin/tsc')");
    expect(developmentRunner).toContain("'--max-old-space-size=640'");
    expect(developmentRunner).toContain("'--noCheck'");
    expect(developmentRunner).toContain("'--declaration'");
    expect(developmentRunner).toContain("'--declarationMap'");
    expect(developmentRunner).toContain("'--watch'");
    expect(developmentRunner).toContain("'dist/main.js'");
    expect(developmentRunner).not.toContain('tsx');
  });

  it('uses Node16 module resolution for the API runtime', async () => {
    const tsconfig = JSON.parse(
      await readFile(resolve(process.cwd(), 'tsconfig.json'), 'utf8'),
    ) as {
      compilerOptions?: Record<string, unknown>;
    };

    expect(tsconfig.compilerOptions?.module).toBe('Node16');
    expect(tsconfig.compilerOptions?.moduleResolution).toBe('Node16');
  });

  it('generates Prisma Client in the API CommonJS module format', async () => {
    const schema = await readFile(resolve(process.cwd(), 'prisma/schema.prisma'), 'utf8');

    expect(schema).toContain('moduleFormat = "cjs"');
  });
});
