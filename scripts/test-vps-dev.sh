#!/usr/bin/env bash
set -Eeuo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
scratch=$(mktemp -d)
cleanup() { rm -rf -- "$scratch"; }
trap cleanup EXIT

fail() {
  printf 'dev VPS test failure: %s\n' "$*" >&2
  exit 1
}

dev_root="$scratch/mushroom/dev"
workspace="$dev_root/workspace"
fake_bin="$scratch/bin"
docker_log="$scratch/docker.log"
mkdir -p "$workspace/config" "$workspace/deploy/vps" "$workspace/apps/api/src" "$workspace/apps/api/prisma" \
  "$workspace/apps/web/src" "$workspace/apps/web/public" "$workspace/apps/app/public" \
  "$workspace/apps/app/src" "$workspace/apps/dashboard/public" "$workspace/apps/dashboard/src" \
  "$workspace/packages/api-client/src" \
  "$dev_root/cache" "$dev_root/state" "$dev_root/secrets" "$scratch/mushroom/staging" \
  "$scratch/mushroom/production-sim" "$fake_bin"

cp "$repo_root/deploy/vps/Dockerfile.dev" "$workspace/deploy/vps/Dockerfile.dev"
cp "$repo_root/deploy/vps/compose.dev.yaml" "$workspace/deploy/vps/compose.dev.yaml"
cp "$repo_root/deploy/vps/deploy-dev.sh" "$workspace/deploy/vps/deploy-dev.sh"
cp "$repo_root/deploy/vps/dev-service.sh" "$workspace/deploy/vps/dev-service.sh"
cp "$repo_root/deploy/ejabberd/compose.yaml" "$dev_root/chat.compose.yaml"
cp "$repo_root/deploy/ejabberd/compose.database.yaml" "$dev_root/chat.database.yaml"
cp "$repo_root/config/next-dev-origins.ts" "$workspace/config/next-dev-origins.ts"
cp "$repo_root/package.json" "$repo_root/pnpm-lock.yaml" "$repo_root/pnpm-workspace.yaml" "$workspace/"
cp "$repo_root/apps/api/package.json" "$repo_root/apps/api/tsconfig.json" \
  "$repo_root/apps/api/tsconfig.build.json" "$repo_root/apps/api/prisma.config.ts" "$workspace/apps/api/"
cp "$repo_root/packages/api-client/package.json" "$repo_root/packages/api-client/tsconfig.json" \
  "$repo_root/packages/api-client/openapi.json" "$workspace/packages/api-client/"
printf 'export {};\n' >"$workspace/apps/api/src/main.ts"
printf 'generator client {}\n' >"$workspace/apps/api/prisma/schema.prisma"
printf 'export {};\n' >"$workspace/packages/api-client/src/index.ts"
printf 'export {};\n' >"$workspace/apps/web/src/synthetic.ts"
printf 'export {};\n' >"$workspace/apps/app/src/synthetic.ts"
printf 'export {};\n' >"$workspace/apps/dashboard/src/synthetic.ts"

uid=$(id -u)
gid=$(id -g)
cat >"$dev_root/runtime.env" <<EOF
MUSHROOM_ENVIRONMENT=development
COMPOSE_PROJECT_NAME=mushroom-dev
MUSHROOM_ENV_ROOT=$dev_root
DEV_WORKSPACE_PATH=$workspace
DEV_CACHE_PATH=$dev_root/cache
DEV_UID=$uid
DEV_GID=$gid
POSTGRES_DB=mushroom_dev
POSTGRES_USER=mushroom_dev
PUBLIC_API_URL=https://dev-api.example.test
PUBLIC_WEB_URL=https://dev.example.test
PUBLIC_APP_URL=https://dev-app.example.test
PUBLIC_DASHBOARD_URL=https://dev-dashboard.example.test
APP_ORIGINS=https://dev.example.test,https://dev-app.example.test,https://dev-dashboard.example.test
TRUSTED_PROXIES=127.0.0.1/32
SMS_TRANSPORT_MODE=disabled
API_PORT=127.0.0.1:3303
WEB_PORT=127.0.0.1:3300
APP_PORT=127.0.0.1:3301
DASHBOARD_PORT=127.0.0.1:3302
EOF

cat >"$scratch/mushroom/staging/runtime.env" <<EOF
COMPOSE_PROJECT_NAME=mushroom-staging
MUSHROOM_ENV_ROOT=$scratch/mushroom/staging
POSTGRES_DB=mushroom_staging
POSTGRES_USER=mushroom_staging
PUBLIC_API_URL=https://staging-api.example.test
PUBLIC_WEB_URL=https://staging.example.test
PUBLIC_APP_URL=https://staging-app.example.test
PUBLIC_DASHBOARD_URL=https://staging-dashboard.example.test
API_PORT=127.0.0.1:3103
WEB_PORT=127.0.0.1:3100
APP_PORT=127.0.0.1:3101
DASHBOARD_PORT=127.0.0.1:3102
EOF

cat >"$scratch/mushroom/production-sim/runtime.env" <<EOF
COMPOSE_PROJECT_NAME=mushroom-production-sim
MUSHROOM_ENV_ROOT=$scratch/mushroom/production-sim
POSTGRES_DB=mushroom_production_sim
POSTGRES_USER=mushroom_production_sim
PUBLIC_API_URL=https://production-sim-api.example.test
PUBLIC_WEB_URL=https://production-sim.example.test
PUBLIC_APP_URL=https://production-sim-app.example.test
PUBLIC_DASHBOARD_URL=https://production-sim-dashboard.example.test
API_PORT=127.0.0.1:3203
WEB_PORT=127.0.0.1:3200
APP_PORT=127.0.0.1:3201
DASHBOARD_PORT=127.0.0.1:3202
EOF

for secret in postgres_password database_url jwt_access_secret refresh_token_pepper \
  otp_pepper sms_credential_encryption_key sms_credential_decryption_keys \
  payment_credential_encryption_key payment_credential_decryption_keys; do
  printf 'synthetic-%s' "$secret" >"$dev_root/secrets/$secret"
  chmod 600 "$dev_root/secrets/$secret"
done

cat >"$fake_bin/docker" <<'EOF'
#!/usr/bin/env bash
set -Eeuo pipefail
printf '%s|install=%s|seed=%s|client=%s|prisma=%s|migrate=%s|compile=%s|config=%s\n' \
  "$*" "${DEV_INSTALL_DEPENDENCIES:-unset}" "${DEV_RUN_SEED:-unset}" \
  "${DEV_BUILD_API_CLIENT:-unset}" "${DEV_GENERATE_PRISMA:-unset}" \
  "${DEV_RUN_MIGRATIONS:-unset}" "${DEV_COMPILE_API:-unset}" \
  "${DEV_WRITE_RUNTIME_CONFIG:-unset}" >>"$FAKE_DOCKER_LOG"
if [[ ${1:-} == compose && ${2:-} == version ]]; then exit 0; fi
if [[ ${1:-} == image && ${2:-} == inspect ]]; then
  [[ -f $FAKE_IMAGE_MARKER ]]
  exit
fi
if [[ " $* " == *' build bootstrap '* ]]; then : >"$FAKE_IMAGE_MARKER"; fi
if [[ " $* " == *' run --rm --no-deps bootstrap '* && ${DEV_INSTALL_DEPENDENCIES:-false} == true ]]; then
  mkdir -p "$FAKE_WORKSPACE/node_modules/.pnpm"
fi
if [[ " $* " == *' run --rm --no-deps bootstrap '* ]]; then
  if [[ ${DEV_BUILD_API_CLIENT:-false} == true ]]; then
    mkdir -p "$FAKE_WORKSPACE/packages/api-client/dist"
    : >"$FAKE_WORKSPACE/packages/api-client/dist/index.js"
  fi
  if [[ ${DEV_GENERATE_PRISMA:-false} == true ]]; then
    mkdir -p "$FAKE_WORKSPACE/apps/api/src/generated/prisma"
  fi
  if [[ ${DEV_COMPILE_API:-false} == true ]]; then
    mkdir -p "$FAKE_WORKSPACE/apps/api/dist"
    : >"$FAKE_WORKSPACE/apps/api/dist/main.js"
    printf '%s\n' "$DEV_API_SOURCE_HASH" >"$FAKE_WORKSPACE/apps/api/dist/.source.sha256"
  fi
  if [[ ${DEV_WRITE_RUNTIME_CONFIG:-false} == true ]]; then
    for application in web app dashboard; do
      printf 'synthetic\n' >"$FAKE_WORKSPACE/apps/$application/public/runtime-config.js"
    done
  fi
fi
EOF
chmod +x "$fake_bin/docker"

cat >"$fake_bin/curl" <<'EOF'
#!/usr/bin/env bash
set -Eeuo pipefail
for argument in "$@"; do
  if [[ $argument == *hmr-*.?????? ]]; then
    printf 'HTTP/1.1 101 Switching Protocols\r\n\r\n' >"$argument"
  fi
done
if [[ -n ${FAKE_CURL_FAIL_MATCH:-} && " $* " == *"$FAKE_CURL_FAIL_MATCH"* ]]; then
  count=0
  [[ ! -f $FAKE_CURL_STATE ]] || count=$(<"$FAKE_CURL_STATE")
  count=$((count + 1))
  printf '%s\n' "$count" >"$FAKE_CURL_STATE"
  if (( count <= ${FAKE_CURL_FAIL_COUNT:-0} )); then
    exit 28
  fi
fi
exit 0
EOF
chmod +x "$fake_bin/curl"

run_deploy() {
  PATH="$fake_bin:$PATH" \
    MUSHROOM_ROOT="$scratch/mushroom" \
    FAKE_DOCKER_LOG="$docker_log" \
    FAKE_IMAGE_MARKER="$scratch/image-built" \
    FAKE_WORKSPACE="$workspace" \
    FAKE_CURL_STATE="$scratch/curl-state" \
    DEV_PROBE_RETRY_DELAY_SECONDS=0 \
    bash "$repo_root/deploy/vps/deploy-dev.sh" "${1:-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa}"
}

run_deploy
grep -q 'build bootstrap' "$docker_log" || fail 'first sync did not build the dev runtime'
grep -Fq -- "--file $dev_root/chat.compose.yaml" "$docker_log" \
  || fail 'dev deployment did not include the required ejabberd compose overlay'
grep -Fq -- "--file $dev_root/chat.database.yaml" "$docker_log" \
    || fail 'dev deployment omitted the installer-managed chat database overlay'
grep -q 'run --rm --no-deps bootstrap.*install=true.*seed=true' "$docker_log" \
  || fail 'first sync did not install dependencies and seed once'
grep -q 'run --rm --no-deps bootstrap.*client=true.*prisma=true.*migrate=true.*compile=true.*config=true' "$docker_log" \
  || fail 'first sync did not run every required bootstrap stage'
grep -q 'up -d --remove-orphans --force-recreate' "$docker_log" \
  || fail 'first sync did not recreate watcher services'
[[ $(<"$dev_root/state/source.sha") == aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa ]] \
  || fail 'accepted source SHA was not recorded'

: >"$docker_log"
run_deploy bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
! grep -q 'build bootstrap' "$docker_log" || fail 'unchanged runtime was rebuilt'
! grep -q 'run --rm --no-deps bootstrap' "$docker_log" \
  || fail 'unchanged inputs unnecessarily ran bootstrap'
! grep -q 'up -d --no-deps --force-recreate api' "$docker_log" \
  || fail 'unchanged API inputs unnecessarily recreated the API runtime'
! grep -q 'up -d --remove-orphans --force-recreate' "$docker_log" \
  || fail 'unchanged inputs unnecessarily recreated watcher services'

sed -i 's/^SMS_TRANSPORT_MODE=.*/SMS_TRANSPORT_MODE=live/' "$dev_root/runtime.env"
: >"$docker_log"
run_deploy 7777777777777777777777777777777777777777
! grep -q 'run --rm --no-deps bootstrap' "$docker_log" \
  || fail 'SMS runtime-only change unnecessarily ran bootstrap'
grep -q 'up -d --no-deps --force-recreate api' "$docker_log" \
  || fail 'SMS runtime-only change did not recreate the API runtime'

# Explicit selection, profile changes and key rotation must reach the running API.
cat >>"$dev_root/runtime.env" <<EOF
PRODUCT_MEDIA_STORAGE_MODE=arvancloud
ARVAN_ENDPOINT=https://s3.ir-thr-at1.arvanstorage.ir
ARVAN_BUCKET=synthetic-arvan
ARVAN_REGION=default
ARVAN_REQUEST_TIMEOUT_MS=5000
EOF
printf 'synthetic-arvan-key' >"$dev_root/secrets/arvan_access_key_id"
printf 'synthetic-arvan-secret' >"$dev_root/secrets/arvan_secret_access_key"
: >"$docker_log"
run_deploy 5555555555555555555555555555555555555555
grep -q 'up -d --no-deps --force-recreate api' "$docker_log" \
  || fail 'Arvan provider selection did not recreate the API runtime'
! grep -q 'run --rm --no-deps bootstrap' "$docker_log" \
  || fail 'provider-only change unnecessarily ran bootstrap'

sed -i 's/^ARVAN_BUCKET=.*/ARVAN_BUCKET=synthetic-arvan-other/' "$dev_root/runtime.env"
: >"$docker_log"
run_deploy 6666666666666666666666666666666666666666
grep -q 'up -d --no-deps --force-recreate api' "$docker_log" \
  || fail 'Arvan profile change did not recreate the API runtime'

printf 'synthetic-arvan-rotated-secret' >"$dev_root/secrets/arvan_secret_access_key"
: >"$docker_log"
run_deploy 9999999999999999999999999999999999999999
grep -q 'up -d --no-deps --force-recreate api' "$docker_log" \
  || fail 'Arvan key rotation did not recreate the API runtime'
! grep -q 'synthetic-arvan-rotated-secret' "$docker_log" \
  || fail 'Arvan secret leaked into deployment arguments'

printf '\nPUBLIC_GA4_MEASUREMENT_ID=G-TEST123\nPUBLIC_ANALYTICS_CONSENT=granted\nPUBLIC_ANALYTICS_DEBUG=true\nANALYTICS_SERVER_ENABLED=true\n' >>"$dev_root/runtime.env"
printf 'synthetic-ga-secret' >"$dev_root/secrets/ga4_api_secret"
: >"$docker_log"
run_deploy aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
grep -q 'up -d --no-deps --force-recreate api' "$docker_log" \
  || fail 'Analytics configuration did not recreate the API runtime'
printf 'synthetic-ga-rotated-secret' >"$dev_root/secrets/ga4_api_secret"
: >"$docker_log"
run_deploy bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
grep -q 'up -d --no-deps --force-recreate api' "$docker_log" \
  || fail 'Analytics secret rotation did not recreate the API runtime'
! grep -q 'synthetic-ga-' "$docker_log" || fail 'Analytics secret leaked into deployment arguments'

printf '\n' >>"$workspace/deploy/vps/deploy-dev.sh"
: >"$docker_log"
run_deploy 8888888888888888888888888888888888888888
grep -q 'run --rm --no-deps bootstrap.*install=false.*seed=false.*client=true.*prisma=true.*migrate=true.*compile=true.*config=true' "$docker_log" \
  || fail 'bootstrap contract change did not reconcile generated artifacts and migrations'
grep -q 'up -d --remove-orphans --force-recreate' "$docker_log" \
  || fail 'bootstrap contract change did not recreate the shared dev services'

printf 'stale-artifact\n' >"$workspace/apps/api/dist/.source.sha256"
: >"$docker_log"
run_deploy 9999999999999999999999999999999999999999
grep -q 'run --rm --no-deps bootstrap.*install=false.*seed=false.*client=false.*prisma=false.*migrate=false.*compile=true.*config=false' "$docker_log" \
  || fail 'stale API artifact fingerprint did not force a clean recompile'
grep -q 'up -d --no-deps --force-recreate api' "$docker_log" \
  || fail 'recompiled stale API artifact did not recreate the API runtime'

printf '\n' >>"$workspace/apps/api/package.json"
: >"$docker_log"
run_deploy cccccccccccccccccccccccccccccccccccccccc
grep -q 'run --rm --no-deps bootstrap.*install=true.*seed=false' "$docker_log" \
  || fail 'dependency change did not reinstall without reseeding'
grep -q 'up -d --remove-orphans --force-recreate' "$docker_log" \
  || fail 'dependency change did not recreate watcher services'

printf '\n' >>"$workspace/apps/api/src/main.ts"
: >"$docker_log"
run_deploy dddddddddddddddddddddddddddddddddddddddd
grep -q 'run --rm --no-deps bootstrap.*install=false.*seed=false.*client=false.*prisma=false.*migrate=false.*compile=true.*config=false' "$docker_log" \
  || fail 'API-only change did not run only the API compiler stage'
grep -q 'up -d --no-deps --force-recreate api' "$docker_log" \
  || fail 'API-only change did not recreate the API runtime'

printf '\n' >>"$workspace/apps/web/src/synthetic.ts"
: >"$docker_log"
run_deploy eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee
! grep -q 'run --rm --no-deps bootstrap' "$docker_log" \
  || fail 'frontend-only change unnecessarily ran bootstrap'
grep -q 'up -d --no-deps --force-recreate web' "$docker_log" \
  || fail 'web-only change did not recreate only the web watcher'
! grep -q 'up -d --no-deps --force-recreate.* app' "$docker_log" \
  || fail 'web-only change recreated the app watcher'
! grep -q 'up -d --no-deps --force-recreate.* dashboard' "$docker_log" \
  || fail 'web-only change recreated the dashboard watcher'

printf '\n' >>"$workspace/apps/app/src/synthetic.ts"
: >"$docker_log"
run_deploy 2222222222222222222222222222222222222222
grep -q 'up -d --no-deps --force-recreate app' "$docker_log" \
  || fail 'app-only change did not recreate only the app watcher'
! grep -q 'up -d --no-deps --force-recreate.* web' "$docker_log" \
  || fail 'app-only change recreated the web watcher'

printf '\n' >>"$workspace/apps/dashboard/src/synthetic.ts"
: >"$docker_log"
run_deploy 3333333333333333333333333333333333333333
grep -q 'up -d --no-deps --force-recreate dashboard' "$docker_log" \
  || fail 'dashboard-only change did not recreate only the dashboard watcher'
! grep -q 'up -d --no-deps --force-recreate.* web' "$docker_log" \
  || fail 'dashboard-only change recreated the web watcher'

mkdir -p "$workspace/apps/app/.next"
printf 'stale\n' >"$workspace/apps/app/.next/stale"
: >"$docker_log"
rm -f -- "$scratch/curl-state"
FAKE_CURL_FAIL_MATCH='127.0.0.1:3301/' FAKE_CURL_FAIL_COUNT=6 \
  run_deploy 4444444444444444444444444444444444444444
[[ ! -e $workspace/apps/app/.next ]] \
  || fail 'stalled app recovery did not clear the derived Next cache'
grep -q 'up -d --no-deps --force-recreate app' "$docker_log" \
  || fail 'stalled app recovery did not recreate the app watcher'
! grep -q 'up -d --no-deps --force-recreate web' "$docker_log" \
  || fail 'stalled app recovery recreated the web watcher'

(
  exec 8>"$dev_root/state/deploy.lock"
  flock 8
  : >"$scratch/lock-held"
  sleep 1
) &
lock_holder=$!
while [[ ! -f $scratch/lock-held ]]; do sleep 0.01; done
: >"$docker_log"
run_deploy 1111111111111111111111111111111111111111
wait "$lock_holder"
! grep -q 'run --rm --no-deps bootstrap' "$docker_log" \
  || fail 'serialized unchanged sync unnecessarily ran bootstrap'

# A callback-only runtime change must refresh the public dashboard config too.
printf '\nSADAD_RETURN_URL=https://merchant.example.test/v1/payments/providers/sadad/callback\n' >>"$dev_root/runtime.env"
: >"$docker_log"
run_deploy a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1
grep -q 'run --rm --no-deps bootstrap.*config=true' "$docker_log" \
  || fail 'callback-only change did not regenerate dashboard runtime configuration'
grep -q 'up -d --no-deps --force-recreate api' "$docker_log" \
  || fail 'callback-only change did not recreate API runtime'

cp "$scratch/mushroom/staging/runtime.env" "$scratch/staging.original"
sed 's/API_PORT=127.0.0.1:3103/API_PORT=127.0.0.1:3303/' "$scratch/staging.original" \
  >"$scratch/mushroom/staging/runtime.env"
if run_deploy ffffffffffffffffffffffffffffffffffffffff >/dev/null 2>&1; then
  fail 'dev deployment accepted a staging port collision'
fi

for forbidden in 'docker compose down' 'migrate reset' 'migrate down' 'mushroom-production-sim' 'mushroom-staging'; do
  ! grep -q "$forbidden" "$repo_root/deploy/vps/deploy-dev.sh" \
    || fail "dev deployment contains forbidden production operation: $forbidden"
done

printf 'Dev VPS sync contract checks passed.\n'
