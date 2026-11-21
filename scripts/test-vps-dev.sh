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
source_sha=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
candidate_id="$source_sha-11111111-1111-4111-8111-111111111111"
workspace="$dev_root/candidates/$candidate_id"
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
cp "$repo_root/deploy/mirotalk/compose.yaml" "$dev_root/communications.compose.yaml"
mkdir -p "$workspace/deploy/mirotalk"
cp "$repo_root/deploy/mirotalk/Dockerfile" "$workspace/deploy/mirotalk/"
cp "$repo_root/config/next-dev-origins.ts" "$workspace/config/next-dev-origins.ts"
mkdir -p "$workspace/apps/api/scripts" "$workspace/raw-data/markdown"
cp "$repo_root/apps/api/scripts/build-program-catalog.mjs" "$workspace/apps/api/scripts/"
printf '{}\n' >"$workspace/raw-data/services.catalog.json"
printf 'Synthetic source\n' >"$workspace/raw-data/markdown/service.md"
cp "$repo_root/package.json" "$repo_root/pnpm-lock.yaml" "$repo_root/pnpm-workspace.yaml" "$workspace/"
cp "$repo_root/apps/api/prisma.chat.config.ts" "$workspace/apps/api/"
cp "$repo_root/apps/api/package.json" "$repo_root/apps/api/tsconfig.json" \
  "$repo_root/apps/api/tsconfig.build.json" "$repo_root/apps/api/prisma.config.ts" "$repo_root/apps/api/prisma.chat.config.ts" "$workspace/apps/api/"
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
DEV_WORKSPACE_PATH=$dev_root/workspace
DEV_CACHE_PATH=$dev_root/cache
DEV_UID=$uid
DEV_GID=$gid
CHAT_VIDEO_IMAGE_MODE=build
CHAT_COMMUNICATIONS_SCHEMA=2
CHAT_VIDEO_IMAGE=mushroom-dev-mirotalk:pending
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
if [[ ${1:-} == image && ${2:-} == inspect ]]; then printf 'sha256:%064d\n' 1; exit 0; fi
if [[ ${1:-} == inspect ]]; then
  if [[ $* == *'{{.Image}}'* ]]; then printf 'sha256:%064d\n' 2
  else printf '%s\n' "${FAKE_ACTIVE_WORKSPACE:-}"; fi
  exit 0
fi
if [[ $* == *bootstrap-prepare* && ${FAKE_BOOTSTRAP_FAIL:-false} == true ]]; then exit 1; fi
if [[ $* == *bootstrap-activate* && ${FAKE_MIGRATION_FAIL:-false} == true ]]; then exit 1; fi
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
    mkdir -p "$FAKE_WORKSPACE/apps/api/src/generated/prisma" "$FAKE_WORKSPACE/apps/api/src/generated/chat-prisma"
  fi
  if [[ ${DEV_COMPILE_API:-false} == true ]]; then
    mkdir -p "$FAKE_WORKSPACE/apps/api/dist"
    : >"$FAKE_WORKSPACE/apps/api/dist/main.js"
    mkdir -p "$FAKE_WORKSPACE/apps/api/dist/resources"
    printf '{}\n' >"$FAKE_WORKSPACE/apps/api/dist/resources/program-catalog.json"
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
  PATH="$fake_bin:$PATH" MUSHROOM_ROOT="$scratch/mushroom" FAKE_DOCKER_LOG="$docker_log" \
    FAKE_IMAGE_MARKER="$scratch/image-built" FAKE_WORKSPACE="$workspace" \
    FAKE_CURL_STATE="$scratch/curl-state" DEV_PROBE_RETRY_DELAY_SECONDS=0 \
    bash "$repo_root/deploy/vps/deploy-dev.sh" "$source_sha" "$candidate_id"
}

before=$(sha256sum "$dev_root/runtime.env")
FAKE_BOOTSTRAP_FAIL=true run_deploy && fail 'failed bootstrap accepted'
[[ $(sha256sum "$dev_root/runtime.env") == "$before" ]] || fail 'failed bootstrap changed runtime'
! grep -q 'up -d --force-recreate' "$docker_log" || fail 'failed bootstrap activated candidate'
[[ ! -f $dev_root/state/source.sha ]] || fail 'failed bootstrap recorded success'
: >"$docker_log"
run_deploy
[[ $(<"$dev_root/state/source.sha") == "$source_sha" ]] || fail 'success source missing'
grep -q "^DEV_WORKSPACE_PATH=$workspace$" "$dev_root/runtime.env" || fail 'candidate not promoted'
grep -q 'bootstrap-prepare.*install=true.*client=true.*prisma=true.*migrate=false.*compile=true' "$docker_log" || fail 'prepare did not rebuild'
grep -q 'bootstrap-activate.*install=false.*migrate=true.*compile=false' "$docker_log" || fail 'migration not separated'
grep -q 'build --tag mushroom-dev-mirotalk:' "$docker_log" || fail 'candidate MiroTalk image not built'
[[ $(<"$dev_root/state/$candidate_id.phase") == healthy ]] || fail 'healthy receipt missing'
! grep -q -- '--remove-orphans' "$docker_log" || fail 'legacy engine removed'

previous_workspace="$workspace"
candidate_id="$source_sha-22222222-2222-4222-8222-222222222222"
workspace="$dev_root/candidates/$candidate_id"
cp -a "$previous_workspace" "$workspace"
before=$(sha256sum "$dev_root/runtime.env")
: >"$docker_log"
export FAKE_ACTIVE_WORKSPACE="$previous_workspace"
export FAKE_CURL_FAIL_MATCH=3301 FAKE_CURL_FAIL_COUNT=99
run_deploy && fail 'unhealthy candidate accepted'
unset FAKE_CURL_FAIL_MATCH FAKE_CURL_FAIL_COUNT
[[ $(sha256sum "$dev_root/runtime.env") == "$before" ]] || fail 'rollback did not restore runtime'
grep -q -- "--file $previous_workspace/deploy/vps/compose.dev.yaml" "$docker_log" || fail 'rollback source incorrect'
[[ $(<"$dev_root/state/current-workspace") == "$previous_workspace" ]] || fail 'failure changed success pointer'
[[ -d $previous_workspace ]] || fail 'previous source deleted'

mkdir -p "$workspace/apps/api/prisma/migrations/new"
printf 'ALTER TABLE fixture ADD COLUMN changed integer;\n' >"$workspace/apps/api/prisma/migrations/new/migration.sql"
: >"$docker_log"
FAKE_MIGRATION_FAIL=true run_deploy && fail 'migration failure accepted'
[[ -f $dev_root/state/database-maintenance ]] || fail 'migration recovery marker missing'
[[ $(<"$dev_root/state/$candidate_id.phase") == failed-schema-review-required ]] || fail 'migration failure receipt missing'
grep -q 'stop api' "$docker_log" || fail 'unsafe previous API running'
[[ $(sha256sum "$dev_root/runtime.env") == "$before" ]] || fail 'migration failure changed runtime'
rm -f "$dev_root/state/database-maintenance" "$dev_root/communications.compose.yaml"
: >"$docker_log"
run_deploy && fail 'missing setup accepted'
! grep -q 'build bootstrap' "$docker_log" || fail 'missing setup reached build'
[[ $(sha256sum "$dev_root/runtime.env") == "$before" ]] || fail 'preflight failure changed runtime'
printf 'PASS candidate isolation, bootstrap, promotion, rollback and migration recovery\n'
