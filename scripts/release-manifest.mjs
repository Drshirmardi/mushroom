import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const services = ['api', 'web', 'app', 'dashboard'];

export function validateReleaseManifest(manifest) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new Error('Release manifest must be an object.');
  }
  const expectedKeys = ['ciRunId', 'createdAt', 'images', 'releaseRunId', 'schemaVersion', 'sourceSha'];
  if (JSON.stringify(Object.keys(manifest).sort()) !== JSON.stringify(expectedKeys)) {
    throw new Error('Release manifest contains missing or unknown top-level fields.');
  }
  if (manifest.schemaVersion !== 1) throw new Error('Unsupported release manifest schema version.');
  if (typeof manifest.sourceSha !== 'string' || !/^[0-9a-f]{40}$/u.test(manifest.sourceSha)) {
    throw new Error('Invalid source SHA.');
  }
  if (
    typeof manifest.ciRunId !== 'string'
    || typeof manifest.releaseRunId !== 'string'
    || !/^\d+$/u.test(manifest.ciRunId)
    || !/^\d+$/u.test(manifest.releaseRunId)
  ) {
    throw new Error('Workflow run IDs must be decimal strings.');
  }
  if (typeof manifest.createdAt !== 'string' || !Number.isFinite(Date.parse(manifest.createdAt))) {
    throw new Error('Invalid manifest creation time.');
  }
  if (!manifest.images || typeof manifest.images !== 'object' || Array.isArray(manifest.images)) {
    throw new Error('Release manifest images must be an object.');
  }
  if (JSON.stringify(Object.keys(manifest.images).sort()) !== JSON.stringify([...services].sort())) {
    throw new Error('Release manifest must contain exactly four application images.');
  }
  for (const service of services) {
    const pattern = new RegExp(`^ghcr\\.io/[a-z0-9._-]+/mushroom-${service}@sha256:[0-9a-f]{64}$`, 'u');
    if (typeof manifest.images[service] !== 'string' || !pattern.test(manifest.images[service])) {
      throw new Error(`Invalid immutable ${service} image reference.`);
    }
  }
  return manifest;
}

export function readReleaseManifest(path) {
  return validateReleaseManifest(JSON.parse(readFileSync(resolve(path), 'utf8')));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [path, ...extra] = process.argv.slice(2);
  if (!path || extra.length > 0) {
    console.error('Usage: node scripts/release-manifest.mjs <release-manifest.json>');
    process.exit(2);
  }
  readReleaseManifest(path);
  console.log('Release manifest is valid.');
}
