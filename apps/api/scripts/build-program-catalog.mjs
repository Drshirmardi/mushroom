import { createHash } from 'node:crypto';
import { readFile, realpath, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDocument } from 'yaml';

const fields = ['title', 'summary', 'category', 'audience', 'pairs', 'eligibilityDescription', 'safety'];
const hash = value => createHash('sha256').update(value).digest('hex');
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function assertJson(value, depth = 0) {
  if (depth > 8) throw new Error('Metadata nesting too deep');
  if (Array.isArray(value)) return value.forEach(v => assertJson(v, depth + 1));
  if (object(value)) {
    for (const [key, item] of Object.entries(value)) {
      if (['__proto__', 'prototype', 'constructor', '<<'].includes(key)) throw new Error('Invalid metadata key');
      assertJson(item, depth + 1);
    }
  } else if (value !== null && (!['string', 'number', 'boolean'].includes(typeof value) || (typeof value === 'number' && !Number.isFinite(value)))) throw new Error('JSON metadata required');
}
export function parseMarkdown(raw) {
  if (raw.includes('\0')) throw new Error('Invalid null character in source');
  const text = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  let body = text, frontmatter = {};
  if (text.startsWith('---\n')) {
    const end = text.indexOf('\n---\n', 4);
    if (end === -1 || end > 16384) throw new Error('Missing or oversized frontmatter terminator');
    const doc = parseDocument(text.slice(4, end), { version: '1.2', schema: 'core', customTags: [], resolveKnownTags: false, merge: false, uniqueKeys: true });
    if (doc.errors.length || doc.warnings.length) throw new Error('Invalid frontmatter');
    frontmatter = doc.toJS({ maxAliasCount: 0 });
    if (!object(frontmatter)) throw new Error('Frontmatter must be an object');
    assertJson(frontmatter);
    body = text.slice(end + 5);
  }
  if (!body.trim() || body.length > 100000) throw new Error('Empty or oversized service body');
  return { body: body.trim(), frontmatter };
}
export async function compileCatalog(rawRoot, manifest) {
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.services) || manifest.services.length > 1000) throw new Error('Invalid service manifest');
  const root = await realpath(rawRoot), markdownRoot = await realpath(resolve(root, 'markdown')), seen = new Set();
  const entries = [];
  for (const entry of manifest.services) {
    if (!/^[A-Z][A-Z0-9_]{2,99}$/.test(entry.programKey) || !/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,3}$/.test(entry.locale)) throw new Error('Invalid catalog identity');
    const key = `${entry.programKey}:${entry.locale}`;
    if (seen.has(key)) throw new Error('Duplicate catalog identity');
    seen.add(key);
    try {
    if (entry.kind !== 'READY_EDUCATION' || !/^[0-9]{1,19}$/.test(entry.baseAmountRial) || BigInt(entry.baseAmountRial) > 9000000000000000000n) throw new Error('Invalid catalog type or price');
    if (!Array.isArray(entry.sources) || !entry.sources.length || entry.sources.length > 20 || !object(entry.metadata)) throw new Error('Invalid sources or metadata');
    const sources = [], bodies = [], metadata = {};
    for (const source of entry.sources) {
      if (typeof source.path !== 'string' || !source.path.startsWith('markdown/') || source.path.includes('\\') || !source.path.endsWith('.md')) throw new Error('Invalid Markdown source path');
      const path = await realpath(resolve(root, source.path)), rel = relative(markdownRoot, path);
      if (rel.startsWith(`..${sep}`) || rel === '..' || isAbsolute(rel)) throw new Error('Source outside raw-data');
      const raw = await readFile(path, 'utf8'), parsed = parseMarkdown(raw);
      for (const field of fields) if (Object.hasOwn(parsed.frontmatter, field)) {
        if (Object.hasOwn(metadata, field) && JSON.stringify(metadata[field]) !== JSON.stringify(parsed.frontmatter[field])) throw new Error(`Conflicting source metadata: ${field}`);
        metadata[field] = parsed.frontmatter[field];
      }
      sources.push({ path: source.path, sha256: hash(raw), quality: source.quality ?? 'unreviewed', frontmatter: parsed.frontmatter });
      bodies.push(parsed.body);
    }
    for (const [field, value] of Object.entries(entry.metadata)) {
      if (!fields.includes(field)) throw new Error('Unsupported catalog metadata field');
      if (Object.hasOwn(metadata, field) && JSON.stringify(metadata[field]) !== JSON.stringify(value)) throw new Error(`Manifest/frontmatter conflict: ${field}`);
      metadata[field] = value;
    }
    assertJson(metadata);
    if (typeof metadata.title !== 'string' || !metadata.title.trim() || metadata.title.length > 240 || typeof metadata.category !== 'string' || !metadata.category.trim() || metadata.category.length > 100) throw new Error('Invalid title/category');
    if (!['SHARED', 'FEMALE', 'MALE', 'REVIEW_REQUIRED'].includes(metadata.audience)) throw new Error('Invalid audience');
    if (!Array.isArray(metadata.pairs) || metadata.pairs.length > 16 || metadata.pairs.some(p => !/^(damavi|safravi|balgami|sodavi)\/(damavi|safravi|balgami|sodavi)$/.test(p))) throw new Error('Invalid temperament pairs');
    const draft = { ...metadata, body: bodies.join('\n\n---\n\n') };
    if (draft.body.length > 100000) throw new Error('Combined body exceeds service limit');
    entries.push({ programKey: entry.programKey, locale: entry.locale, kind: entry.kind, baseAmountRial: entry.baseAmountRial, reviewRequired: true, draft, sources });
    } catch (error) {
      entries.push({ programKey: entry.programKey, locale: entry.locale, kind: entry.kind, baseAmountRial: String(entry.baseAmountRial ?? ''), reviewRequired: true,
        draft: { title: typeof entry.metadata?.title === 'string' ? entry.metadata.title : entry.programKey, category: typeof entry.metadata?.category === 'string' ? entry.metadata.category : '', audience: 'REVIEW_REQUIRED', pairs: [] },
        sources: [], invalidReason: error instanceof Error && !('code' in error) ? error.message : 'Source file unavailable' });
    }
  }
  const payload = { schemaVersion: 1, entries };
  return { ...payload, hash: hash(JSON.stringify(payload)) };
}
export async function buildCatalog() {
  const api = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const rawRoot = resolve(api, '../../raw-data');
  const manifest = JSON.parse(await readFile(resolve(rawRoot, 'services.catalog.json'), 'utf8'));
  const bundle = await compileCatalog(rawRoot, manifest);
  const target = resolve(api, 'dist/resources/program-catalog.json');
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, JSON.stringify(bundle), 'utf8');
  return bundle.entries.length;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`Built private program catalog: ${await buildCatalog()} entries`);
}
