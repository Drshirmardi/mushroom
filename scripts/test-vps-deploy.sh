#!/usr/bin/env bash
set -Eeuo pipefail

for command in bash jq; do
  command -v "$command" >/dev/null 2>&1 || { printf '%s is required\n' "$command" >&2; exit 1; }
done

repository_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
scratch=$(mktemp -d)
trap 'rm -rf -- "$scratch"' EXIT

test_home="$scratch/home"
fake_bin="$scratch/bin"
mkdir -p "$test_home/.mushroom-incoming" "$fake_bin"

cat >"$fake_bin/docker" <<'EOF'
#!/usr/bin/env bash
set -Eeuo pipefail
printf '%s\n' "$*" >>"$FAKE_DOCKER_LOG"
if [[ ${1:-} == compose && ${2:-} == version ]]; then exit 0; fi
if [[ ${1:-} == compose && " $* " == *" --wait "* && -f $FAKE_FAIL_NEXT_WAIT ]]; then
  rm -f -- "$FAKE_FAIL_NEXT_WAIT"
  exit 1
fi
exit 0
EOF

cat >"$fake_bin/curl" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
chmod +x "$fake_bin/docker" "$fake_bin/curl"

environment_file() {
  local environment=$1
  local port_prefix=$2
  local root="$test_home/mushroom/$environment"
  local suffix=${environment//-/_}
  mkdir -p "$root/secrets"
  cat >"$root/runtime.env" <<EOF
MUSHROOM_ENVIRONMENT=$environment
COMPOSE_PROJECT_NAME=mushroom-$environment
MUSHROOM_ENV_ROOT=$root
POSTGRES_IMAGE=postgres:16-alpine
POSTGRES_DB=mushroom_$suffix
POSTGRES_USER=mushroom_$suffix
PUBLIC_API_URL=https://$environment-api.example.test
PUBLIC_WEB_URL=https://$environment.example.test
PUBLIC_APP_URL=https://$environment-app.example.test
PUBLIC_DASHBOARD_URL=https://$environment-dashboard.example.test
APP_ORIGINS=https://$environment.example.test,https://$environment-app.example.test,https://$environment-dashboard.example.test
TRUSTED_PROXIES=127.0.0.1/32
PAYMENT_CREDENTIAL_ENCRYPTION_KEY_VERSION=v1
API_PORT=127.0.0.1:${port_prefix}3
WEB_PORT=127.0.0.1:${port_prefix}0
APP_PORT=127.0.0.1:${port_prefix}1
DASHBOARD_PORT=127.0.0.1:${port_prefix}2
EOF
  for secret in postgres_password database_url jwt_access_secret refresh_token_pepper \
    payment_credential_encryption_key payment_credential_decryption_keys; do
    printf 'synthetic-%s-%s' "$environment" "$secret" >"$root/secrets/$secret"
  done
}

manifest_file() {
  local number=$1
  local destination=$2
  local sha digest
  sha=$(printf '%040d' "$number")
  digest=$(printf '%064d' "$number")
  cat >"$destination" <<EOF
{
  "schemaVersion": 1,
  "sourceSha": "$sha",
  "ciRunId": "$number",
  "releaseRunId": "$number",
  "createdAt": "2026-10-06T00:00:00.000Z",
  "images": {
    "api": "ghcr.io/example/mushroom-api@sha256:$digest",
    "web": "ghcr.io/example/mushroom-web@sha256:$digest",
    "app": "ghcr.io/example/mushroom-app@sha256:$digest",
    "dashboard": "ghcr.io/example/mushroom-dashboard@sha256:$digest"
  }
}
EOF
}

environment_file staging 31
environment_file production-sim 32
manifest_file 1 "$scratch/release-1.json"
manifest_file 2 "$scratch/release-2.json"
manifest_file 3 "$scratch/release-3.json"

export HOME="$test_home"
export MUSHROOM_ROOT="$test_home/mushroom"
export PATH="$fake_bin:$PATH"
export FAKE_DOCKER_LOG="$scratch/docker.log"
export FAKE_FAIL_NEXT_WAIT="$scratch/fail-next-wait"

run_deploy() {
  local action=$1 environment=$2 manifest=$3 run_id=$4
  local incoming="$test_home/.mushroom-incoming/$run_id-$environment"
  mkdir -p "$incoming"
  cp "$repository_root/deploy/vps/compose.yaml" "$incoming/compose.yaml"
  printf 'ephemeral-token' | bash "$repository_root/deploy/vps/deploy-release.sh" \
    "$action" "$environment" "$manifest" "$incoming/compose.yaml" github-actions "$incoming"
}

run_deploy deploy staging "$scratch/release-1.json" 1
first_staging=$(<"$MUSHROOM_ROOT/staging/state/current")
[[ $first_staging == *0000000000000000000000000000000000000001-1 ]] || exit 1

run_deploy deploy staging "$scratch/release-2.json" 2
second_staging=$(<"$MUSHROOM_ROOT/staging/state/current")
[[ $(<"$MUSHROOM_ROOT/staging/state/previous") == "$first_staging" ]] || exit 1

touch "$FAKE_FAIL_NEXT_WAIT"
if run_deploy deploy staging "$scratch/release-3.json" 3; then
  printf 'failed staging candidate unexpectedly passed\n' >&2
  exit 1
fi
[[ $(<"$MUSHROOM_ROOT/staging/state/current") == "$second_staging" ]] || exit 1
[[ ! -e $MUSHROOM_ROOT/staging/state/rollback-target ]] || exit 1
[[ ! -e $MUSHROOM_ROOT/staging/state/pending-failed ]] || exit 1

run_deploy deploy production-sim "$scratch/release-1.json" 4
first_production_sim=$(<"$MUSHROOM_ROOT/production-sim/state/current")
touch "$FAKE_FAIL_NEXT_WAIT"
if run_deploy deploy production-sim "$scratch/release-2.json" 5; then
  printf 'failed production-sim candidate unexpectedly passed\n' >&2
  exit 1
fi
[[ -e $MUSHROOM_ROOT/production-sim/state/rollback-target ]] || exit 1
[[ -e $MUSHROOM_ROOT/production-sim/state/pending-failed ]] || exit 1
run_deploy rollback production-sim - 6
[[ $(<"$MUSHROOM_ROOT/production-sim/state/current") == "$first_production_sim" ]] || exit 1
[[ ! -e $MUSHROOM_ROOT/production-sim/state/rollback-target ]] || exit 1
[[ ! -e $MUSHROOM_ROOT/production-sim/state/pending-failed ]] || exit 1
[[ ! -e $HOME/.docker/config.json ]] || exit 1

first_migration=$(grep -n 'migrate deploy' "$FAKE_DOCKER_LOG" | head -n 1 | cut -d: -f1)
first_secret_prepare=$(grep -n -- '--cap-add CHOWN' "$FAKE_DOCKER_LOG" | head -n 1 | cut -d: -f1)
first_switch=$(grep -n -- '--wait' "$FAKE_DOCKER_LOG" | head -n 1 | cut -d: -f1)
[[ $first_secret_prepare -lt $first_migration ]] || { printf 'secret permissions were not prepared before migration\n' >&2; exit 1; }
[[ $first_migration -lt $first_switch ]] || { printf 'migration did not precede application switching\n' >&2; exit 1; }
grep -q -- '--network none' "$FAKE_DOCKER_LOG" || { printf 'secret permission helper must have no network\n' >&2; exit 1; }
grep -q -- '--cap-drop ALL --cap-add CHOWN --cap-add FOWNER --cap-add DAC_OVERRIDE' "$FAKE_DOCKER_LOG" \
  || { printf 'secret permission helper capabilities are not bounded\n' >&2; exit 1; }

printf 'VPS deploy behavior checks passed.\n'
