import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const repositoryRoot = resolve(__dirname, '..', '..', '..');

const sourceTree = (directory: string): string =>
  readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        return entry.name === 'generated' ? [] : [sourceTree(path)];
      }
      return /\.(ts|tsx)$/.test(entry.name)
        ? [readFileSync(path, 'utf8')]
        : [];
    })
    .join('\n');

describe('Phase 11 conditional exclusions', () => {
  const apiSource = sourceTree(resolve(repositoryRoot, 'apps/api/src'));
  const dashboardSource = sourceTree(resolve(repositoryRoot, 'apps/dashboard/src'));
  const schema = readFileSync(
    resolve(repositoryRoot, 'apps/api/prisma/schema.prisma'),
    'utf8',
  );
  const openApi = JSON.parse(
    readFileSync(resolve(repositoryRoot, 'packages/api-client/openapi.json'), 'utf8'),
  ) as { paths: Record<string, unknown> };
  const migrationNames = readdirSync(
    resolve(repositoryRoot, 'apps/api/prisma/migrations'),
    { withFileTypes: true },
  ).map((entry) => entry.name);

  it('keeps staff membership and invitation runtime surfaces out of the release', () => {
    const excludedCapability = /\b(staff[ _-]?(invite|invitation|membership)|(?:invite|invitation|membership)[ _-]?staff)\b/i;

    expect(apiSource).not.toMatch(excludedCapability);
    expect(dashboardSource).not.toMatch(excludedCapability);
    expect(schema).not.toMatch(/\b(StaffInvitation|StaffMembership|ClinicMembership)\b/);
    expect(migrationNames.join('\n')).not.toMatch(/(staff|invite|invitation|membership)/i);
    expect(Object.keys(openApi.paths)).not.toContainEqual(
      expect.stringMatching(/(staff|invite|invitation|membership)/i),
    );
  });

  it('keeps role building and capability menus out of the dashboard release surface', () => {
    expect(dashboardSource).not.toMatch(/\b(role[ _-]?builder|capability[ _-]?menu)\b/i);
  });

  it('keeps report and audit exports absent from the generated API contract', () => {
    const protectedPaths = Object.keys(openApi.paths).filter((path) =>
      path.startsWith('/v1/admin/reporting/') || path === '/v1/admin/audit-events',
    );

    expect(protectedPaths).not.toContainEqual(expect.stringMatching(/export/i));
    expect(protectedPaths).not.toContain('/v1/admin/audit-events/export');
  });
});
