import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { buildCatalog } from './build-program-catalog.mjs';

await buildCatalog();

const require = createRequire(import.meta.url);
const typescriptCompiler = require.resolve('typescript/bin/tsc');
const compilerHeapMb = process.env.DEV_COMPILER_HEAP_MB ?? '2048';
const compilerArguments = [`--max-old-space-size=${compilerHeapMb}`, typescriptCompiler];
const buildArguments = [
  '-p',
  'tsconfig.build.json',
  '--noCheck',
  '--declaration',
  'false',
  '--declarationMap',
  'false',
];

const initialBuild = spawnSync(
  process.execPath,
  [...compilerArguments, ...buildArguments],
  { stdio: 'inherit' },
);

if (initialBuild.status !== 0) {
  process.exit(initialBuild.status ?? 1);
}

const launches = [
  {
    name: 'compiler',
    args: [
      ...compilerArguments,
      ...buildArguments,
      '--watch',
      '--preserveWatchOutput',
    ],
  },
  {
    name: 'server',
    args: [
      '--enable-source-maps',
      '--watch',
      ...(process.platform === 'win32' ? ['--watch-path=dist'] : []),
      '--watch-preserve-output',
      'dist/main.js',
    ],
  },
];

let shuttingDown = false;
const live = new Set();

const launch = ({ name, args }) => {
  const child = spawn(process.execPath, args, { stdio: 'inherit' });
  live.add(child);
  child.once('error', (error) => {
    console.error(`[api-dev] ${name} failed to start`, error);
    live.delete(child);
  });
  child.once('exit', (code, signal) => {
    live.delete(child);
    if (shuttingDown) return;
    console.error(`[api-dev] ${name} exited (code=${code}, signal=${signal}); restarting in 1s`);
    setTimeout(() => {
      if (!shuttingDown) launch({ name, args });
    }, 1000);
  });
};

const shutdown = (exitCode) => {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of live) {
    child.kill();
  }

  process.exit(exitCode);
};

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => shutdown(0));
}

for (const entry of launches) {
  launch(entry);
}
