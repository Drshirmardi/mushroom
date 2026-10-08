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
mkdir -p "$workspace/deploy/vps" "$workspace/apps/api" "$workspace/packages/api-client" \
  "$dev_root/cache" "$dev_root/state" "$dev_root/secrets" "$scratch/mushroom/staging" "$fake_bin"

cp "$repo_root/deploy/vps/Dockerfile.dev" "$workspace/deploy/vps/Dockerfile.dev"
cp "$repo_root/deploy/vps/compose.dev.yaml" "$workspace/deploy/vps/compose.dev.yaml"
cp "$repo_root/deploy/vps/dev-service.sh" "$workspace/deploy/vps/dev-service.sh"
cp "$repo_root/package.json" "$repo_root/pnpm-lock.yaml" "$repo_root/pnpm-workspace.yaml" "$workspace/"
cp "$repo_root/apps/api/package.json" "$workspace/apps/api/package.json"
cp "$repo_root/packages/api-client/package.json" "$workspace/packages/api-client/package.json"

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
API_PORT=127.0.0.1:3203
WEB_PORT=127.0.0.1:3200
APP_PORT=127.0.0.1:3201
DASHBOARD_PORT=127.0.0.1:3202
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

for secret in postgres_password database_url jwt_access_secret refresh_token_pepper \
  payment_credential_encryption_key payment_credential_decryption_keys; do
  printf 'synthetic-%s' "$secret" >"$dev_root/secrets/$secret"
  chmod 600 "$dev_root/secrets/$secret"
done

cat >"$fake_bin/docker" <<'EOF'
#!/usr/bin/env bash
set -Eeuo pipefail
printf '%s|install=%s|seed=%s\n' "$*" "${DEV_INSTALL_DEPENDENCIES:-unset}" "${DEV_RUN_SEED:-unset}" >>"$FAKE_DOCKER_LOG"
if [[ ${1:-} == compose && ${2:-} == version ]]; then exit 0; fi
if [[ ${1:-} == image && ${2:-} == inspect ]]; then
  [[ -f $FAKE_IMAGE_MARKER ]]
  exit
fi
if [[ " $* " == *' build bootstrap '* ]]; then : >"$FAKE_IMAGE_MARKER"; fi
if [[ " $* " == *' run --rm --no-deps bootstrap '* && ${DEV_INSTALL_DEPENDENCIES:-false} == true ]]; then
  mkdir -p "$FAKE_WORKSPACE/node_modules/.pnpm"
fi
EOF
chmod +x "$fake_bin/docker"

cat >"$fake_bin/curl" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
chmod +x "$fake_bin/curl"

run_deploy() {
  PATH="$fake_bin:$PATH" \
    MUSHROOM_ROOT="$scratch/mushroom" \
    FAKE_DOCKER_LOG="$docker_log" \
    FAKE_IMAGE_MARKER="$scratch/image-built" \
    FAKE_WORKSPACE="$workspace" \
    bash "$repo_root/deploy/vps/deploy-dev.sh" "${1:-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa}"
}

run_deploy
grep -q 'build bootstrap' "$docker_log" || fail 'first sync did not build the dev runtime'
grep -q 'run --rm --no-deps bootstrap.*install=true.*seed=true' "$docker_log" \
  || fail 'first sync did not install dependencies and seed once'
grep -q 'up -d --remove-orphans --force-recreate' "$docker_log" \
  || fail 'first sync did not recreate watcher services'
[[ $(<"$dev_root/state/source.sha") == aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa ]] \
  || fail 'accepted source SHA was not recorded'

: >"$docker_log"
run_deploy bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
! grep -q 'build bootstrap' "$docker_log" || fail 'unchanged runtime was rebuilt'
grep -q 'run --rm --no-deps bootstrap.*install=false.*seed=false' "$docker_log" \
  || fail 'unchanged source repeated install or seed'
! grep -q 'up -d --remove-orphans --force-recreate' "$docker_log" \
  || fail 'source-only sync unnecessarily recreated watcher services'

printf '\n' >>"$workspace/apps/api/package.json"
: >"$docker_log"
run_deploy cccccccccccccccccccccccccccccccccccccccc
grep -q 'run --rm --no-deps bootstrap.*install=true.*seed=false' "$docker_log" \
  || fail 'dependency change did not reinstall without reseeding'
grep -q 'up -d --remove-orphans --force-recreate' "$docker_log" \
  || fail 'dependency change did not recreate watcher services'

cp "$scratch/mushroom/staging/runtime.env" "$scratch/staging.original"
sed 's/API_PORT=127.0.0.1:3103/API_PORT=127.0.0.1:3203/' "$scratch/staging.original" \
  >"$scratch/mushroom/staging/runtime.env"
if run_deploy dddddddddddddddddddddddddddddddddddddddd >/dev/null 2>&1; then
  fail 'dev deployment accepted a staging port collision'
fi

for forbidden in 'docker compose down' 'migrate reset' 'migrate down' 'mushroom-production-sim' 'mushroom-staging'; do
  ! grep -q "$forbidden" "$repo_root/deploy/vps/deploy-dev.sh" \
    || fail "dev deployment contains forbidden production operation: $forbidden"
done

printf 'Dev VPS sync contract checks passed.\n'
