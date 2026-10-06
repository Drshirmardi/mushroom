import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateReleaseManifest } from './release-manifest.mjs';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const services = ['api', 'web', 'app', 'dashboard'];
const supportedModes = new Set(['build', 'verify', 'push', 'print']);
const [mode = 'build', ...unexpectedArguments] = process.argv.slice(2);
let trivyCacheVolume;

process.once('exit', () => {
  if (trivyCacheVolume) {
    spawnSync('docker', ['volume', 'rm', '--force', trivyCacheVolume], {
      cwd: repositoryRoot,
      stdio: 'ignore',
    });
  }
});

if (!supportedModes.has(mode) || unexpectedArguments.length > 0) {
  console.error('Usage: node scripts/release-images.mjs [build|verify|push|print]');
  process.exit(2);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    env: options.env ?? process.env,
    encoding: options.capture ? 'utf8' : undefined,
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    if (options.capture && result.stderr) process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }

  return options.capture ? result.stdout.trim() : '';
}

function git(...args) {
  return run('git', args, { capture: true });
}

function repositoryOwner() {
  const fromCodespaces = process.env.GITHUB_REPOSITORY?.split('/')[0];
  if (fromCodespaces) return fromCodespaces;

  const remote = git('config', '--get', 'remote.origin.url');
  const match = remote.match(/github\.com(?::|\/)([^/]+)\//iu);
  if (!match?.[1]) {
    throw new Error('Set IMAGE_REGISTRY because the GitHub owner could not be derived from origin.');
  }
  return match[1];
}

const imageRegistry = (
  process.env.IMAGE_REGISTRY?.trim() || `ghcr.io/${repositoryOwner()}`
).replace(/\/+$/u, '').toLowerCase();
const cleanCommitTag = process.env.IMAGE_TAG?.trim() || git('rev-parse', '--short=12', 'HEAD');
const dirty = git('status', '--porcelain').length > 0;
const imageTag = dirty && mode !== 'push' && !process.env.IMAGE_TAG
  ? `${cleanCommitTag}-dirty`
  : cleanCommitTag;

if (!/^[a-z0-9.-]+(?::[0-9]+)?(?:\/[a-z0-9._-]+)*$/u.test(imageRegistry)) {
  throw new Error(`Invalid lowercase OCI registry namespace: ${imageRegistry}`);
}
if (!/^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$/u.test(imageTag)) {
  throw new Error(`Invalid OCI image tag: ${imageTag}`);
}
if (mode === 'push' && dirty) {
  throw new Error('Refusing to push release images from a dirty worktree. Commit or stash changes first.');
}

const images = Object.fromEntries(
  services.map((service) => [service, `${imageRegistry}/mushroom-${service}:${imageTag}`]),
);
const bakeEnvironment = {
  ...process.env,
  IMAGE_REGISTRY: imageRegistry,
  IMAGE_TAG: imageTag,
  SOURCE_REPOSITORY: process.env.SOURCE_REPOSITORY?.trim() || 'local',
  SOURCE_REVISION: git('rev-parse', 'HEAD'),
};

console.log(`Release image mode: ${mode}`);
console.log(`Source commit: ${git('rev-parse', 'HEAD')}${dirty ? ' (dirty)' : ''}`);
for (const service of services) console.log(`${service}: ${images[service]}`);

if (mode === 'print') {
  run('docker', ['buildx', 'bake', '--file', 'docker-bake.hcl', '--print', 'release'], {
    env: bakeEnvironment,
  });
  process.exit(0);
}

run('docker', ['buildx', 'bake', '--file', 'docker-bake.hcl', '--pull', '--load', 'release'], {
  env: bakeEnvironment,
});

if (mode === 'verify' || mode === 'push') {
  for (const service of services) {
    run(process.execPath, ['scripts/ci-container-smoke.mjs', images[service], service]);
  }

  trivyCacheVolume = `mushroom-trivy-cache-${process.pid}`;
  run('docker', ['volume', 'create', trivyCacheVolume]);
  for (const service of services) {
    run('docker', [
      'run', '--rm',
      '-v', '/var/run/docker.sock:/var/run/docker.sock',
      '-v', `${trivyCacheVolume}:/root/.cache/trivy`,
      'aquasec/trivy:0.75.0', 'image',
      '--scanners', 'vuln',
      '--severity', 'CRITICAL,HIGH',
      '--exit-code', '1',
      images[service],
    ]);
  }
  run('docker', ['volume', 'rm', '--force', trivyCacheVolume]);
  trivyCacheVolume = undefined;
}

if (mode === 'push') {
  for (const service of services) run('docker', ['push', images[service]]);
  console.log('Published immutable references:');
  const immutableImages = {};
  for (const service of services) {
    const repository = images[service].slice(0, images[service].lastIndexOf(':'));
    const repoDigests = JSON.parse(run('docker', [
      'image', 'inspect', '--format', '{{json .RepoDigests}}', images[service],
    ], { capture: true }));
    const immutableReference = repoDigests.find((reference) => reference.startsWith(`${repository}@sha256:`));
    if (!immutableReference) throw new Error(`Registry digest was not recorded for ${service}.`);
    immutableImages[service] = immutableReference;
    console.log(immutableReference);
  }

  const manifestPath = process.env.RELEASE_MANIFEST_PATH?.trim();
  if (manifestPath) {
    const sourceSha = git('rev-parse', 'HEAD');
    const ciRunId = process.env.SOURCE_CI_RUN_ID?.trim();
    const releaseRunId = process.env.GITHUB_RUN_ID?.trim();
    if (!/^\d+$/u.test(ciRunId ?? '') || !/^\d+$/u.test(releaseRunId ?? '')) {
      throw new Error('SOURCE_CI_RUN_ID and GITHUB_RUN_ID are required to write a release manifest.');
    }
    const manifest = validateReleaseManifest({
      schemaVersion: 1,
      sourceSha,
      ciRunId,
      releaseRunId,
      createdAt: new Date().toISOString(),
      images: immutableImages,
    });
    const absoluteManifestPath = resolve(repositoryRoot, manifestPath);
    mkdirSync(dirname(absoluteManifestPath), { recursive: true });
    writeFileSync(absoluteManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
    console.log(`Release manifest: ${absoluteManifestPath}`);
  }
}
