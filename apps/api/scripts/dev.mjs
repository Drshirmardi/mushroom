import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const typescriptCompiler = require.resolve('typescript/bin/tsc');
const buildArguments = ['-p', 'tsconfig.build.json'];

const initialBuild = spawnSync(
  process.execPath,
  [typescriptCompiler, ...buildArguments],
  { stdio: 'inherit' },
);

if (initialBuild.status !== 0) {
  process.exit(initialBuild.status ?? 1);
}

const children = [
  spawn(
    process.execPath,
    [
      typescriptCompiler,
      ...buildArguments,
      '--watch',
      '--preserveWatchOutput',
    ],
    { stdio: 'inherit' },
  ),
  spawn(
    process.execPath,
    [
      '--enable-source-maps',
      '--watch',
      '--watch-preserve-output',
      'dist/main.js',
    ],
    { stdio: 'inherit' },
  ),
];

let shuttingDown = false;

const shutdown = (exitCode) => {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    child.kill();
  }

  process.exit(exitCode);
};

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => shutdown(0));
}

for (const child of children) {
  child.once('error', (error) => {
    console.error(error);
    shutdown(1);
  });
  child.once('exit', (code, signal) => {
    if (!shuttingDown && signal === null && code !== 0) {
      shutdown(code ?? 1);
    }
  });
}
