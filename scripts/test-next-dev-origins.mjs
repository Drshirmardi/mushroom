import assert from 'node:assert/strict';

import { allowedDevOriginsFromEnvironment } from '../config/next-dev-origins.ts';

assert.equal(allowedDevOriginsFromEnvironment(undefined), undefined);
assert.deepEqual(
  allowedDevOriginsFromEnvironment(
    'https://dev.example.test,http://192.168.1.20:3000,dev.example.test,*.tunnel.example.test',
  ),
  ['dev.example.test', '192.168.1.20', '*.tunnel.example.test'],
);
assert.throws(
  () => allowedDevOriginsFromEnvironment('https://'),
  /NEXT_ALLOWED_DEV_ORIGINS contains an invalid origin/,
);

console.log('Next development origin checks passed.');
