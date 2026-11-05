#!/usr/bin/env bash
set -Eeuo pipefail

command_name=${1:-}

read_secret() {
  local name=$1
  local path="/run/secrets/${name,,}"
  [[ -r $path ]] || { printf '%s is not readable\n' "$path" >&2; exit 1; }
  printf -v "$name" '%s' "$(<"$path")"
  export "$name"
}

write_runtime_configs() {
  node --input-type=module <<'NODE'
import { writeFile } from 'node:fs/promises';

const values = {
  apiUrl: process.env.PUBLIC_API_URL || '',
  webUrl: process.env.PUBLIC_WEB_URL || '',
  appUrl: process.env.PUBLIC_APP_URL || '',
  dashboardUrl: process.env.PUBLIC_DASHBOARD_URL || '',
  sadadReturnUrl: process.env.SADAD_RETURN_URL || '',
  analyticsMeasurementId: process.env.PUBLIC_GA4_MEASUREMENT_ID || '',
  analyticsConsent: process.env.PUBLIC_ANALYTICS_CONSENT || 'denied',
};
for (const [name, value] of Object.entries(values)) {
  if (name.startsWith('analytics')) continue;
  if (!value && name === 'sadadReturnUrl') continue;
  if (!value) throw new Error(`${name} is required for the shared dev runtime`);
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error(`${name} must be an http(s) URL without credentials`);
  }
}
const source = `window.__MUSHROOM_RUNTIME_CONFIG__ = Object.freeze(${JSON.stringify(values)});\n`;
await Promise.all(['web', 'app', 'dashboard'].map((application) =>
  writeFile(`apps/${application}/public/runtime-config.js`, source, { mode: 0o644 }),
));
NODE
}

case "$command_name" in
  bootstrap)
    read_secret DATABASE_URL
    export NODE_ENV=development
    if [[ ${DEV_INSTALL_DEPENDENCIES:-false} == true ]]; then
      pnpm install --frozen-lockfile
    fi
    [[ -d node_modules/.pnpm ]] || { printf 'workspace dependencies are not installed\n' >&2; exit 1; }
    if [[ ${DEV_WRITE_RUNTIME_CONFIG:-false} == true ]]; then
      write_runtime_configs
    fi
    if [[ ${DEV_BUILD_API_CLIENT:-false} == true ]]; then
      pnpm --filter @sabz-zendegi/api-client build
    fi
    if [[ ${DEV_GENERATE_PRISMA:-false} == true ]]; then
      pnpm --filter @sabz-zendegi/api prisma:generate
    fi
    if [[ ${DEV_RUN_MIGRATIONS:-false} == true ]]; then
      pnpm --filter @sabz-zendegi/api prisma:migrate:deploy
    fi
    if [[ ${DEV_COMPILE_API:-false} == true ]]; then
      [[ ${DEV_API_SOURCE_HASH:-} =~ ^[0-9a-f]{64}$ ]] || {
        printf 'DEV_API_SOURCE_HASH must be a SHA-256 fingerprint when compiling the API\n' >&2
        exit 1
      }
      rm -rf -- apps/api/dist
      NODE_OPTIONS=--max-old-space-size=1536 \
        pnpm --filter @sabz-zendegi/api exec tsc -p tsconfig.build.json \
          --noCheck --declaration false --declarationMap false
      printf '%s\n' "$DEV_API_SOURCE_HASH" >apps/api/dist/.source.sha256
    fi
    if [[ -f /run/mushroom-installation/first-run.json ]]; then
      MUSHROOM_ENVIRONMENT=development node apps/api/prisma/bootstrap-installation.mjs
      : >/run/mushroom-installation/complete
      rm -- /run/mushroom-installation/first-run.json
    fi
    if [[ ${DEV_RUN_SEED:-false} == true ]]; then
      pnpm --filter @sabz-zendegi/api prisma:seed
    fi
    ;;
  api)
    if [[ ${ANALYTICS_SERVER_ENABLED:-false} == true ]]; then
      [[ -r ${GA4_API_SECRET_FILE:-} ]] || { printf 'Analytics secret file is not readable\n' >&2; exit 1; }
      GA4_API_SECRET=$(<"$GA4_API_SECRET_FILE")
      export GA4_API_SECRET
    fi
    if [[ ${PRODUCT_MEDIA_STORAGE_MODE:-disabled} == arvancloud ]]; then
      [[ -r $ARVAN_ACCESS_KEY_ID_FILE && -r $ARVAN_SECRET_ACCESS_KEY_FILE ]] || {
        printf 'Development Arvan credentials are not readable\n' >&2
        exit 1
      }
      ARVAN_ACCESS_KEY_ID=$(<"$ARVAN_ACCESS_KEY_ID_FILE")
      ARVAN_SECRET_ACCESS_KEY=$(<"$ARVAN_SECRET_ACCESS_KEY_FILE")
      export ARVAN_ACCESS_KEY_ID ARVAN_SECRET_ACCESS_KEY
    fi
    if [[ ${PRODUCT_MEDIA_STORAGE_MODE:-disabled} == r2 ]]; then
      [[ -r $R2_ACCESS_KEY_ID_FILE && -r $R2_SECRET_ACCESS_KEY_FILE ]] || {
        printf 'Development R2 credentials are not readable\n' >&2
        exit 1
      }
      R2_ACCESS_KEY_ID=$(<"$R2_ACCESS_KEY_ID_FILE")
      R2_SECRET_ACCESS_KEY=$(<"$R2_SECRET_ACCESS_KEY_FILE")
      export R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY
    fi
    for secret in DATABASE_URL JWT_ACCESS_SECRET REFRESH_TOKEN_PEPPER OTP_PEPPER \
      PAYMENT_CREDENTIAL_ENCRYPTION_KEY PAYMENT_CREDENTIAL_DECRYPTION_KEYS \
      SMS_CREDENTIAL_ENCRYPTION_KEY SMS_CREDENTIAL_DECRYPTION_KEYS; do
      read_secret "$secret"
    done
    export NODE_ENV=development HOSTNAME=0.0.0.0 PORT=3003
    exec node --enable-source-maps apps/api/dist/main.js
    ;;
  web)
    exec pnpm --filter @sabz/web exec next dev --hostname 0.0.0.0 --port 3000
    ;;
  app)
    exec pnpm --filter @sabz/app exec next dev --hostname 0.0.0.0 --port 3001
    ;;
  dashboard)
    exec pnpm --filter @sabz/dashboard exec next dev --hostname 0.0.0.0 --port 3002
    ;;
  *)
    printf 'usage: dev-service.sh <bootstrap|api|web|app|dashboard>\n' >&2
    exit 2
    ;;
esac
