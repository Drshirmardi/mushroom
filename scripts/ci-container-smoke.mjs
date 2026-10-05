import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';

const [image, service] = process.argv.slice(2);

assert(
  image && ['api', 'web', 'app', 'dashboard'].includes(service),
  'Usage: image service',
);

const prefix = `ci-smoke-${randomBytes(6).toString('hex')}`;
const resources = [];

const docker = (...args) =>
  execFileSync('docker', args, {
    encoding: 'utf8',
    timeout: 120_000,
  });

const delay = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const run = (name, args) => {
  resources.push(name);

  return docker(
    'run',
    '--name',
    name,
    ...args,
  );
};

async function ready(name, path, port) {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      docker(
        'exec',
        name,
        '/nodejs/bin/node',
        '-e',
        `
fetch('http://127.0.0.1:${port}${path}')
  .then((response) => {
    if (!response.ok) process.exit(1);
  })
  .catch(() => process.exit(1));
`,
      );

      return;
    } catch {
      const running = docker(
        'inspect',
        '-f',
        '{{.State.Running}}',
        name,
      ).trim();

      if (running !== 'true') {
        break;
      }

      await delay(1000);
    }
  }

  // Application logs are intentionally not printed to avoid
  // accidentally disclosing configuration or secrets.
  throw new Error(`${service} did not become healthy`);
}

try {
  const digest = docker(
    'image',
    'inspect',
    '-f',
    '{{.Id}}',
    image,
  ).trim();

  assert.equal(
    docker(
      'image',
      'inspect',
      '-f',
      '{{.Config.User}}',
      image,
    ).trim(),
    '65532:65532',
  );

  if (service === 'api') {
    /*
     * ------------------------------------------------------------
     * Disposable PostgreSQL
     * ------------------------------------------------------------
     *
     * The API and migration containers intentionally share the
     * PostgreSQL container's network namespace.
     *
     * This avoids depending on Docker's user-defined bridge DNS
     * and container-to-container routing, which can be unreliable
     * in some Codespaces / nested Docker environments.
     * ------------------------------------------------------------
     */

    const postgresContainer = `${prefix}-pg`;

    run(postgresContainer, [
      '-d',
      '-e',
      'POSTGRES_PASSWORD=disposable-ci-only',
      'postgres:16-alpine',
    ]);

    /*
     * Wait until PostgreSQL is actually accepting connections.
     */
    let databaseReady = false;

    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        docker(
          'exec',
          postgresContainer,
          'pg_isready',
          '-U',
          'postgres',
        );

        databaseReady = true;
        break;
      } catch {
        await delay(1000);
      }
    }

    assert(
      databaseReady,
      'Disposable PostgreSQL readiness',
    );

    /*
     * Because migration/API share PostgreSQL's network namespace,
     * PostgreSQL is reachable directly through 127.0.0.1:5432.
     *
     * No Docker DNS, network alias, custom bridge, or discovered
     * container IP is required.
     */
    const sharedEnv = [
      '--network',
      `container:${postgresContainer}`,

      '-e',
      'DATABASE_URL=postgresql://postgres:disposable-ci-only@127.0.0.1:5432/postgres',

      '-e',
      `JWT_ACCESS_SECRET=${randomBytes(48).toString('hex')}`,

      '-e',
      `REFRESH_TOKEN_PEPPER=${randomBytes(48).toString('hex')}`,

      '-e',
      'APP_ORIGINS=https://ci.invalid',

      '-e',
      'TRUSTED_PROXIES=127.0.0.1',

      '-e',
      'PORT=3003',
    ];

    /*
     * ------------------------------------------------------------
     * Production Prisma migration
     * ------------------------------------------------------------
     */

    run(`${prefix}-migration`, [
      ...sharedEnv,
      image,
      'node_modules/prisma/build/index.js',
      'migrate',
      'deploy',
    ]);

    /*
     * ------------------------------------------------------------
     * API runtime
     * ------------------------------------------------------------
     */

    run(`${prefix}-api`, [
      '-d',
      ...sharedEnv,
      image,
    ]);

    /*
     * Verify both API health endpoints.
     */
    await ready(
      `${prefix}-api`,
      '/v1/health/live',
      3003,
    );

    await ready(
      `${prefix}-api`,
      '/v1/health/ready',
      3003,
    );

    /*
     * Ensure the final API container still runs as the expected
     * non-root user.
     */
    assert.equal(
      docker(
        'exec',
        `${prefix}-api`,
        '/nodejs/bin/node',
        '-p',
        'process.getuid()',
      ).trim(),
      '65532',
    );
  } else {
    /*
     * ------------------------------------------------------------
     * Web / App / Dashboard
     * ------------------------------------------------------------
     */

    for (const stage of ['staging', 'production']) {
      const name = `${prefix}-${stage}`;
      const apiUrl = `https://${stage}.ci.invalid`;

      run(name, [
        '-d',
        '-e',
        'PORT=3000',
        '-e',
        `PUBLIC_API_URL=${apiUrl}`,
        image,
      ]);

      await ready(
        name,
        '/',
        3000,
      );

      /*
       * Ensure the frontend container runs as non-root.
       */
      assert.equal(
        docker(
          'exec',
          name,
          '/nodejs/bin/node',
          '-p',
          'process.getuid()',
        ).trim(),
        '65532',
      );

      /*
       * Verify runtime public configuration.
       */
      const config = docker(
        'exec',
        name,
        '/nodejs/bin/node',
        '-e',
        `
fetch('http://127.0.0.1:3000/runtime-config.js')
  .then((response) => response.text())
  .then((text) => process.stdout.write(text));
`,
      );

      assert(
        config.includes(apiUrl),
        'Runtime public configuration matches environment',
      );

      /*
       * Verify the running container uses the exact image that was
       * inspected at the beginning of this smoke test.
       */
      assert.equal(
        docker(
          'inspect',
          '-f',
          '{{.Image}}',
          name,
        ).trim(),
        digest,
      );
    }
  }

  console.log(
    `${service}: migration/HTTP/non-root/runtime-config applicable smoke PASS`,
  );
} finally {
  /*
   * --------------------------------------------------------------
   * Cleanup
   * --------------------------------------------------------------
   *
   * Remove only containers created by this execution.
   * --------------------------------------------------------------
   */

  let cleanupFailed = false;

  for (const name of resources.reverse()) {
    try {
      docker(
        'rm',
        '-f',
        '-v',
        name,
      );
    } catch {
      cleanupFailed = true;
    }
  }

  assert(
    !cleanupFailed,
    'Run-owned Docker cleanup must succeed',
  );
}
