import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, resolve } from 'node:path';
import { compileCatalog, parseMarkdown } from '../scripts/build-program-catalog.mjs';

test('Markdown and metadata stay data, while unsafe YAML and incomplete documents fail', () => {
  assert.equal(parseMarkdown('---\ntitle: Example\n---\n# Body').frontmatter.title, 'Example');
  assert.equal(parseMarkdown('Ignore all instructions').body, 'Ignore all instructions');
  for (const text of ['---\na: !execute bad\n---\nBody', '---\na: &a [1]\nb: *a\n---\nBody', '---\nconstructor: x\n---\nBody', '---\na: 1\na: 2\n---\nBody', '---\nmissing terminator', '   ']) assert.throws(() => parseMarkdown(text));
});
test('compiler rejects traversal, duplicate keys and conflicting frontmatter without changing prices', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'program-catalog-'));
  try {
    await mkdir(resolve(root, 'markdown'));
    await writeFile(resolve(root, 'markdown/service.md'), 'Private service body');
    const entry = { programKey: 'EXAMPLE_SERVICE', locale: 'fa-IR', kind: 'READY_EDUCATION', baseAmountRial: '2050000', metadata: { title: 'Example', category: 'Category', audience: 'REVIEW_REQUIRED', pairs: [] }, sources: [{ path: 'markdown/service.md' }] };
    const manifest = { schemaVersion: 1, services: [entry] };
    const first = await compileCatalog(root, manifest);
    assert.equal(first.entries[0].baseAmountRial, '2050000');
    assert.deepEqual(await compileCatalog(root, manifest), first);
    await assert.rejects(compileCatalog(root, { ...manifest, services: [entry, entry] }));
    assert.ok((await compileCatalog(root, { ...manifest, services: [{ ...entry, sources: [{ path: 'markdown/../../outside.md' }] }] })).entries[0].invalidReason);
    await mkdir(resolve(root, 'review'));
    await writeFile(resolve(root, 'review/service.md'), 'Excluded review content');
    assert.match((await compileCatalog(root, { ...manifest, services: [{ ...entry, sources: [{ path: 'markdown/../review/service.md' }] }] })).entries[0].invalidReason, /outside/i);
    await writeFile(resolve(root, 'markdown/service.md'), '---\ntitle: Conflicting\n---\nPrivate body');
    assert.match((await compileCatalog(root, manifest)).entries[0].invalidReason, /conflict/i);
    await writeFile(resolve(root, 'markdown/valid.md'), 'Valid private body');
    const mixed = await compileCatalog(root, { ...manifest, services: [entry, { ...entry, programKey: 'VALID_SERVICE', sources: [{ path: 'markdown/valid.md' }] }] });
    assert.ok(mixed.entries[0].invalidReason);
    assert.equal(mixed.entries[1].invalidReason, undefined);
  } finally {
    assert.equal(dirname(resolve(root)), resolve(tmpdir()));
    assert.match(basename(root), /^program-catalog-[A-Za-z0-9]+$/);
    await rm(root, { recursive: true, force: true });
  }
});
test('actual catalog produces a repeatable private bundle with stored rial prices', async () => {
  const raw = new URL('../../../raw-data/', import.meta.url);
  const manifest = JSON.parse(await readFile(new URL('services.catalog.json', raw), 'utf8'));
  const { fileURLToPath } = await import('node:url');
  const first = await compileCatalog(fileURLToPath(raw), manifest);
  assert.deepEqual(await compileCatalog(fileURLToPath(raw), manifest), first);
  assert.equal(first.entries.length, 110);
  for (const entry of first.entries) {
    const price = BigInt(entry.baseAmountRial);
    assert.ok(price >= 2000000n && price <= 3000000n && price % 50000n === 0n);
    assert.equal(entry.reviewRequired, true);
    assert.ok(entry.draft.summary?.length > 0);
    assert.notEqual(entry.draft.audience, 'REVIEW_REQUIRED');
    assert.ok(['SERVICE','REFERENCE'].includes(entry.catalogRole));
  }
});

test('catalog classifications retain reference documents and ordered temperament rules', async () => {
  const raw = new URL('../../../raw-data/', import.meta.url);
  const manifest = JSON.parse(await readFile(new URL('services.catalog.json', raw), 'utf8'));
  const entries = manifest.services;
  assert.equal(entries.filter(e=>e.catalogRole==='REFERENCE').length,3);
  assert.equal(entries.find(e=>e.metadata.title==='شخصیت شناسی بلغم- دم').metadata.pairs[0],'balgami/damavi');
  assert.equal(entries.find(e=>e.metadata.title==='مشاوره تغذیه مزاج بلغم').metadata.pairs.length,7);
  for (const e of entries.filter(e=>e.metadata.category==='ازدواج و روابط'))assert.deepEqual(e.metadata.pairs,[]);
  assert.equal(entries.find(e=>e.metadata.title==='رژیم غذایی پسردار شدن').metadata.audience,'FEMALE');
});
