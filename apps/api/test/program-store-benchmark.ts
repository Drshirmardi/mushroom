import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { readFile, writeFile } from 'node:fs/promises';
import { vi, expect } from 'vitest';
import { Prisma } from '../src/generated/prisma/client';
import type { PrismaService } from '../src/database/prisma/prisma.service';

const percentile = (values: number[], p: number) =>
  [...values].sort((a, b) => a - b)[Math.ceil(values.length * p) - 1] ?? 0;

export async function measureConcurrentProgramStore(
  app: NestFastifyApplication,
  tokens: readonly string[],
  output: string,
) {
  expect(new Set(tokens).size).toBe(50);
  const routes = ['program-recommendations', 'program-offering-cards', 'custom-program-offering-cards'];
  const samples: { users: number; round: number; route: string; ms: number; status: number; requestId: string; hasRecommendations?: boolean }[] = [];
  for (const users of [2, 10, 25, 50]) {
    for (let round = 1; round <= (users === 50 ? 3 : 1); round++) {
      const burst = await Promise.all(tokens.slice(0, users).flatMap(token => routes.map(async route => {
        const started = performance.now();
        const response = await app.inject({
          method: 'GET',
          url: `/v1/patients/me/${route}`,
          headers: { authorization: `Bearer ${token}` },
        });
        const ms = performance.now() - started;
        const recommendations = route === 'program-recommendations' && response.statusCode === 200
          ? response.json<{ status: string; items: unknown[] }>()
          : undefined;
        return {
          users, round, route, ms, status: response.statusCode,
          requestId: String(response.headers['x-request-id'] ?? ''),
          hasRecommendations: recommendations
            ? recommendations.status === 'READY' && recommendations.items.length > 0
            : undefined,
        };
      })));
      samples.push(...burst);
    }
  }
  await writeFile(output, JSON.stringify(samples, null, 2));
  expect(samples.filter(sample => sample.status !== 200 || sample.ms >= 10_000 || sample.hasRecommendations === false)).toEqual([]);
  for (let round = 1; round <= 3; round++) {
    const recommendations = samples.filter(sample =>
      sample.users === 50 && sample.round === round && sample.route === 'program-recommendations',
    );
    expect(percentile(recommendations.map(sample => sample.ms), 0.95)).toBeLessThanOrEqual(3_000);
  }
}

const sqlGroups = [
  ['publication-rank-and-ownership', /WITH shortlisted/i],
  ['catalog-availability-and-count', /program_publication_current.*|WITH candidates/i],
  ['result-proof', /assessment_submission_access_allowed/i],
  ['audit', /INSERT INTO .*?(audit_events|patient_access_audits)/i],
] as const;

export async function explainProgramStore(db: PrismaService, clinicId: string, output: string) {
  const publicationCandidates = Prisma.sql`
    SELECT pub.id, pub.created_at FROM program_offering_publications pub
    JOIN program_definition_versions d ON d.id=pub.program_definition_id
    JOIN consent_policy_versions t ON t.id=pub.terms_policy_version_id
    WHERE pub.clinic_id=${clinicId}::uuid AND pub.status='ACTIVE' AND d.kind='READY_EDUCATION'
      AND t.status='ACTIVE' AND t.activated_at IS NOT NULL AND t.content_hash=pub.terms_content_hash
  `;
  const queries = {
    candidatesOnly: Prisma.sql`WITH candidates AS MATERIALIZED (${publicationCandidates}) SELECT count(*) FROM candidates`,
    currentPublication: Prisma.sql`WITH candidates AS MATERIALIZED (${publicationCandidates}) SELECT count(*) FROM candidates WHERE program_publication_current(id)`,
    materializedPage: Prisma.sql`WITH candidates AS MATERIALIZED (${publicationCandidates}) SELECT id,count(*) OVER() FROM candidates WHERE program_publication_current(id) ORDER BY created_at DESC,id DESC LIMIT 20`,
    ordinaryPage: Prisma.sql`WITH candidates AS (${publicationCandidates}) SELECT id,count(*) OVER() FROM candidates WHERE program_publication_current(id) ORDER BY created_at DESC,id DESC LIMIT 20`,
    cursorPage: Prisma.sql`
      SELECT candidate.id FROM (
        ${publicationCandidates} ORDER BY pub.created_at DESC,pub.id DESC OFFSET 0
      ) candidate
      WHERE program_publication_current(candidate.id)
      ORDER BY candidate.created_at DESC,candidate.id DESC LIMIT 21`,
    pairRanking: Prisma.sql`SELECT count(*) FROM program_mezaj_presentations m
      WHERE m.clinic_id=${clinicId}::uuid AND m.enabled AND (CASE
        WHEN 'damavi/safravi'=ANY(m.pairs) THEN 0
        WHEN EXISTS(SELECT 1 FROM unnest(m.pairs) p WHERE split_part(p,'/',1)='damavi') THEN 1
        WHEN EXISTS(SELECT 1 FROM unnest(m.pairs) p WHERE split_part(p,'/',2)='safravi') THEN 2
        ELSE NULL END) IS NOT NULL`,
  };
  const plans = [];
  for (let round = 1; round <= 5; round++) {
    for (const [name, sql] of Object.entries(queries)) {
      const plan = await db.$queryRaw(Prisma.sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`);
      plans.push({ name, round, plan });
    }
  }
  const ping = [];
  for (let i = 0; i < 20; i++) {
    const start = performance.now();
    await db.$queryRaw`SELECT 1`;
    ping.push(performance.now() - start);
  }
  await writeFile(output, JSON.stringify({ database: 'local Docker PostgreSQL, loopback TCP', selectOneP50Ms: percentile(ping, .5), plans }, null, 2));
}

export async function measureProgramStore(
  app: NestFastifyApplication,
  db: PrismaService,
  freshToken: () => Promise<string>,
  submission: string,
  output: string,
) {
  let queryCount = 0, sqlBytes = 0, catalogCounts = 0, catalogTermsReads = 0, serviceIdentityReads = 0;
  const entry: number[] = [], callback: number[] = [];
  const queries = new Map<string, { count: number; durationMs: number }>();
  let active = false;
  (db as unknown as { $on: (event: 'query', log: (e: Prisma.QueryEvent) => void) => void })
    .$on('query', event => {
      if (!active) return;
      queryCount++;
      sqlBytes += Buffer.byteLength(event.query);
      if (/WITH candidates|FROM program_offering_publications/i.test(event.query) && /count\s*\(/i.test(event.query)) catalogCounts++;
      if (/SELECT[^;]*?"consent_policy_versions"\."body"/i.test(event.query)) catalogTermsReads++;
      if (/FROM program_(?:services|definition_versions) [sd]\s+JOIN program_(?:definition_versions|services)/i.test(event.query)) serviceIdentityReads++;
      // Store only a label and aggregate timings, never parameters or query results.
      const label = sqlGroups.find(([, pattern]) => pattern.test(event.query))?.[0] ?? 'other';
      const value = queries.get(label) ?? { count: 0, durationMs: 0 };
      value.count++;
      value.durationMs += event.duration;
      queries.set(label, value);
    });
  const transaction = db.$transaction.bind(db);
  const spy = vi.spyOn(db, '$transaction').mockImplementation(((fn: (tx: Prisma.TransactionClient) => Promise<unknown>, options?: { timeout?: number }) => {
    const start = performance.now();
    return transaction(async tx => {
      const entered = performance.now();
      if (active) entry.push(entered - start);
      try { return await fn(tx); }
      finally { if (active) callback.push(performance.now() - entered); }
    }, options);
  }) as typeof db.$transaction);

  const rounds = process.env.STORE_PERF_SMOKE === '1' ? 1 : 5;
  const requestCount = process.env.STORE_PERF_SMOKE === '1' ? 30 : 200;
  const concurrency = Number(process.env.STORE_PERF_CONCURRENCY ?? '1');
  expect([1, 4]).toContain(concurrency);
  const routes = [
    'program-offerings',
    'custom-program-offerings',
    `program-recommendations?submissionId=${submission}`,
    `commerce/recommendations?submissionId=${submission}`,
    ...(process.env.STORE_PERF_CARDS === '1' ? ['program-offering-cards', 'custom-program-offering-cards'] : []),
  ].filter(path => !process.env.STORE_PERF_ROUTE || path.split('?')[0] === process.env.STORE_PERF_ROUTE);
  expect(routes.length).toBeGreaterThan(0);
  const firstRound = Number(process.env.STORE_PERF_START_ROUND ?? '1');
  expect(firstRound).toBeGreaterThanOrEqual(1);
  expect(firstRound).toBeLessThanOrEqual(rounds);
  expect(Number.isInteger(firstRound)).toBe(true);
  const report: { route: string; round: number; requests: number; concurrency: number; [key: string]: unknown }[] =
    firstRound === 1 ? [] : JSON.parse(await readFile(output, 'utf8'));
  if (firstRound > 1) {
    expect(routes).toHaveLength(1);
    expect(report.map(({ route, round, requests, concurrency: workers }) => [route, round, requests, workers]))
      .toEqual(Array.from({ length: firstRound - 1 }, (_, i) => [routes[0]!.split('?')[0], i + 1, requestCount, concurrency]));
  }
  try {
    for (const path of routes) {
      const request = async (token: string) => {
        const start = performance.now();
        const response = await app.inject({ method: 'GET', url: '/v1/patients/me/' + path, headers: { authorization: `Bearer ${token}` } });
        expect(response.statusCode, response.body).toBe(200);
        const ms = performance.now() - start;
        const { items } = response.json<{ items: Record<string, unknown>[] }>();
        const cardFields = path === 'program-offerings'
          ? ['id', 'title', 'summary', 'category', 'amountRial', 'baseAmountRial', 'discountPercent', 'accessMode', 'accessDurationDays']
          : path === 'custom-program-offerings'
            ? ['id', 'title', 'summary', 'category', 'amountRial', 'physician', 'requestSupported'] : null;
        const excessBytes = cardFields ? Buffer.byteLength(JSON.stringify(items)) -
          Buffer.byteLength(JSON.stringify(items.map(item => Object.fromEntries(
            Object.entries(item).filter(([key]) => cardFields.includes(key)),
          )))) : 0;
        return { ms, bytes: Buffer.byteLength(response.body), excessBytes };
      };
      for (let round = firstRound; round <= rounds; round++) {
        const token = await freshToken();
        for (let i = 0; i < 20; i++) await request(token);
        queryCount = sqlBytes = catalogCounts = catalogTermsReads = serviceIdentityReads = entry.length = callback.length = 0;
        queries.clear();
        let responseBytes = 0, excessBytes = 0;
        const samples: number[] = [];
        active = true;
        for (let i = 0; i < requestCount; i += concurrency) {
          const batch = await Promise.all(Array.from({ length: Math.min(concurrency, requestCount - i) }, () => request(token)));
          for (const response of batch) {
            samples.push(response.ms);
            responseBytes += response.bytes;
            excessBytes += response.excessBytes;
          }
        }
        active = false;
        expect(queryCount).toBeGreaterThan(0);
        if (path.endsWith('offering-cards')) {
          expect(catalogCounts).toBe(0);
          expect(catalogTermsReads).toBe(0);
        }
        report.push({ route: path.split('?')[0], round, requests: samples.length, concurrency,
          p50Ms: percentile(samples, .5), p95Ms: percentile(samples, .95), sqlPerRequest: queryCount / samples.length,
          sqlTextBytesPerRequest: sqlBytes / samples.length, responseBytesPerRequest: responseBytes / samples.length,
          excessCardBytesPerRequest: excessBytes / samples.length,
          catalogCounts, catalogTermsReads, serviceIdentityReads,
          entryP95Ms: percentile(entry, .95), callbackP95Ms: percentile(callback, .95),
          sqlGroups: Object.fromEntries(queries),
        });
        await writeFile(output, JSON.stringify(report, null, 2));
      }
    }
  } finally {
    active = false;
    spy.mockRestore();
  }
}
