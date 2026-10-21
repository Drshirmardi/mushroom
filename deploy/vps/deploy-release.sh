#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
  cat <<'EOF'
Usage:
  deploy-release.sh deploy <staging|production-sim|production> <manifest.json> <compose.yaml> <registry-user> <incoming-dir> <consent-policy.json>
  deploy-release.sh rollback <staging|production-sim|production> - <compose.yaml> <registry-user> <incoming-dir> -

The ephemeral registry token is read from stdin. MUSHROOM_ROOT defaults to $HOME/mushroom.
EOF
}

die() {
  printf 'deployment error: %s\n' "$*" >&2
  exit 1
}

[[ $# -eq 7 ]] || { usage >&2; exit 2; }

action=$1
environment=$2
manifest_path=$3
compose_source=$4
registry_user=$5
incoming_dir=$6
consent_policy_source=$7

if [[ $incoming_dir != /* ]]; then
  incoming_dir="$HOME/$incoming_dir"
fi

[[ $action == deploy || $action == rollback ]] || die "action must be deploy or rollback"
[[ $environment == staging || $environment == production-sim || $environment == production ]] || die "unsupported environment"
[[ $(id -u) -ne 0 ]] || die "deployment must run as a non-root user"
[[ $registry_user =~ ^[A-Za-z0-9_.-]+$ || $registry_user =~ ^[A-Za-z0-9_.-]+\[bot\]$ ]] \
  || die "invalid registry user"

for command in docker jq curl; do
  command -v "$command" >/dev/null 2>&1 || die "$command is required"
done
docker compose version >/dev/null 2>&1 || die "Docker Compose v2 is required"

base_root=${MUSHROOM_ROOT:-"$HOME/mushroom"}
environment_root="$base_root/$environment"
runtime_env="$environment_root/runtime.env"
state_root="$environment_root/state"
releases_root="$environment_root/releases"
lock_dir="$environment_root/.deploy.lock"
docker_config=''

cleanup() {
  if [[ -n $docker_config && -d $docker_config ]]; then
    rm -rf -- "$docker_config"
  fi
  rmdir -- "$lock_dir" 2>/dev/null || true
  if [[ $incoming_dir == "$HOME/.mushroom-incoming/"* ]]; then
    rm -rf -- "$incoming_dir"
  fi
}
trap cleanup EXIT

mkdir -p -- "$environment_root" "$state_root" "$releases_root"
mkdir -- "$lock_dir" 2>/dev/null || die "another deployment is active for $environment"
[[ -f $runtime_env ]] || die "$runtime_env is missing"
[[ -f $compose_source ]] || die "versioned compose file is missing"
if [[ $action == deploy ]]; then
  [[ -f $consent_policy_source ]] || die "environment-approved consent policy is missing"
fi

env_value() {
  local key=$1
  local value
  value=$(sed -n "s/^${key}=//p" "$runtime_env" | tail -n 1)
  [[ -n $value ]] || die "$key is missing from runtime.env"
  printf '%s' "$value"
}

expected_project="mushroom-${environment}"
[[ $(env_value MUSHROOM_ENVIRONMENT) == "$environment" ]] || die "runtime environment boundary mismatch"
[[ $(env_value COMPOSE_PROJECT_NAME) == "$expected_project" ]] || die "Compose project boundary mismatch"
[[ $(env_value MUSHROOM_ENV_ROOT) == "$environment_root" ]] || die "environment root boundary mismatch"

if [[ $environment != production ]]; then
  case $(env_value POSTGRES_DB) in
    *"${environment//-/_}"*) ;;
    *) die "database name does not identify $environment" ;;
  esac
fi

for other_environment in dev staging production-sim production; do
  [[ $environment != "$other_environment" ]] || continue
  other_runtime_env="$base_root/$other_environment/runtime.env"
  [[ -f $other_runtime_env ]] || continue
  for key in COMPOSE_PROJECT_NAME MUSHROOM_ENV_ROOT API_PORT WEB_PORT APP_PORT DASHBOARD_PORT \
    PUBLIC_API_URL PUBLIC_WEB_URL PUBLIC_APP_URL PUBLIC_DASHBOARD_URL; do
    current_value=$(env_value "$key")
    other_value=$(sed -n "s/^${key}=//p" "$other_runtime_env" | tail -n 1)
    [[ -z $other_value || $current_value != "$other_value" ]] || die "$key crosses environment boundaries"
  done
  if [[ $environment != production && $other_environment != production ]]; then
    for key in POSTGRES_DB POSTGRES_USER; do
      current_value=$(env_value "$key")
      other_value=$(sed -n "s/^${key}=//p" "$other_runtime_env" | tail -n 1)
      [[ -z $other_value || $current_value != "$other_value" ]] || die "$key crosses database environment boundaries"
    done
  fi
done

required_secrets=(database_url jwt_access_secret refresh_token_pepper \
  otp_pepper sms_credential_encryption_key \
  payment_credential_encryption_key
)
[[ $environment == production ]] || required_secrets+=(postgres_password)
for secret in "${required_secrets[@]}"; do
  [[ -s "$environment_root/secrets/$secret" ]] || die "required secret file is missing: $secret"
done
for secret in sms_credential_decryption_keys payment_credential_decryption_keys; do
  [[ -f "$environment_root/secrets/$secret" ]] || die "keyring file is missing: $secret"
done

validate_manifest() {
  local file=$1
  [[ -f $file ]] || die "release manifest is missing"
  jq -e '
    .schemaVersion == 1 and
    (.sourceSha | test("^[0-9a-f]{40}$")) and
    (.ciRunId | test("^[0-9]+$")) and
    (.releaseRunId | test("^[0-9]+$")) and
    ((.images | keys | sort) == ["api", "app", "dashboard", "web"]) and
    (.images.api | test("^ghcr\\.io/[a-z0-9._-]+/mushroom-api@sha256:[0-9a-f]{64}$")) and
    (.images.web | test("^ghcr\\.io/[a-z0-9._-]+/mushroom-web@sha256:[0-9a-f]{64}$")) and
    (.images.app | test("^ghcr\\.io/[a-z0-9._-]+/mushroom-app@sha256:[0-9a-f]{64}$")) and
    (.images.dashboard | test("^ghcr\\.io/[a-z0-9._-]+/mushroom-dashboard@sha256:[0-9a-f]{64}$"))
  ' "$file" >/dev/null || die "release manifest failed immutable-reference validation"
}

release_env_from_manifest() {
  local manifest=$1
  local destination=$2
  if grep -Eq '^(API|WEB|APP|DASHBOARD)_IMAGE=' "$runtime_env"; then
    die "runtime.env must not override release image references"
  fi
  cat "$runtime_env" >"$destination"
  {
    printf '\nAPI_IMAGE=%s\n' "$(jq -r '.images.api' "$manifest")"
    printf 'WEB_IMAGE=%s\n' "$(jq -r '.images.web' "$manifest")"
    printf 'APP_IMAGE=%s\n' "$(jq -r '.images.app' "$manifest")"
    printf 'DASHBOARD_IMAGE=%s\n' "$(jq -r '.images.dashboard' "$manifest")"
  } >>"$destination"
  chmod 600 "$destination"
}

compose_for() {
  local release_dir=$1
  local network_args=()
  [[ ! -f $environment_root/network.yaml ]] || network_args=(--file "$environment_root/network.yaml")
  docker compose \
    --project-name "$expected_project" \
    --env-file "$release_dir/release.env" \
    --file "$release_dir/compose.yaml" \
    "${network_args[@]}" \
    "${@:2}"
}

registry_pull() {
  local release_dir=$1
  local registry_token
  registry_token=$(cat)
  [[ -n $registry_token ]] || die "ephemeral GHCR token was not supplied"
  docker_config=$(mktemp -d)
  export DOCKER_CONFIG="$docker_config"
  printf '%s' "$registry_token" | docker login ghcr.io --username "$registry_user" --password-stdin >/dev/null
  registry_token=''
  compose_for "$release_dir" config --quiet
  compose_for "$release_dir" pull
  docker logout ghcr.io >/dev/null 2>&1 || true
  unset DOCKER_CONFIG
  rm -rf -- "$docker_config"
  docker_config=''
}

prepare_secret_permissions() {
  local release_dir=$1
  local api_image host_uid permission_script
  api_image=$(sed -n 's/^API_IMAGE=//p' "$release_dir/release.env" | tail -n 1)
  [[ $api_image == ghcr.io/*@sha256:* ]] || die "release API image is not an immutable GHCR reference"
  host_uid=$(id -u)
  permission_script=$(cat <<'NODE'
const { chmodSync, chownSync } = require('node:fs');
const ownerUid = Number.parseInt(process.env.SECRET_OWNER_UID, 10);
if (!Number.isSafeInteger(ownerUid) || ownerUid < 1) throw new Error('SECRET_OWNER_UID is invalid');
for (const name of [
  'database_url',
  'jwt_access_secret',
  'refresh_token_pepper',
  'otp_pepper',
  'sms_credential_encryption_key',
  'sms_credential_decryption_keys',
  'payment_credential_encryption_key',
  'payment_credential_decryption_keys',
  ...(process.env.PREPARE_POSTGRES_SECRET === 'true' ? ['postgres_password'] : []),
]) {
  const path = `/run/secrets/${name}`;
  chownSync(path, ownerUid, 65532);
  chmodSync(path, 0o640);
}
NODE
)

  # Compose file secrets are bind mounts and retain host ownership. Keep the deployment user as owner while granting
  # only the accepted Distroless runtime group read access; never make secret files world-readable.
  docker run --rm \
    --user 0:0 \
    --network none \
    --read-only \
    --security-opt no-new-privileges \
    --cap-drop ALL \
    --cap-add CHOWN \
    --cap-add FOWNER \
    --cap-add DAC_OVERRIDE \
    --env "SECRET_OWNER_UID=$host_uid" \
    --env "PREPARE_POSTGRES_SECRET=$([[ $environment == production ]] && printf false || printf true)" \
    --mount "type=bind,src=$environment_root/secrets,dst=/run/secrets" \
    --entrypoint /nodejs/bin/node \
    "$api_image" \
    -e "$permission_script"
}

probe_url() {
  local url=$1
  local attempt
  for attempt in {1..30}; do
    if curl --fail --silent --show-error --max-time 5 "$url" >/dev/null; then
      return 0
    fi
    sleep 2
  done
  return 1
}

verify_release() {
  local api_binding web_binding app_binding dashboard_binding
  api_binding=$(env_value API_PORT)
  web_binding=$(env_value WEB_PORT)
  app_binding=$(env_value APP_PORT)
  dashboard_binding=$(env_value DASHBOARD_PORT)
  [[ $api_binding == 127.0.0.1:* && $web_binding == 127.0.0.1:* && $app_binding == 127.0.0.1:* && $dashboard_binding == 127.0.0.1:* ]] || {
    printf 'all rehearsal service bindings must use 127.0.0.1\n' >&2
    return 1
  }
  probe_url "http://$api_binding/v1/health/live" \
    && probe_url "http://$api_binding/v1/health/ready" \
    && probe_url "http://$web_binding/" \
    && probe_url "http://$app_binding/" \
    && probe_url "http://$dashboard_binding/"
}

activate_release() {
  local release_dir=$1
  compose_for "$release_dir" up -d --remove-orphans --wait --wait-timeout 180 || return 1
  verify_release
}

write_state() {
  local new_current=$1
  local old_current=${2:-}
  printf '%s\n' "$new_current" >"$state_root/current.tmp"
  mv -f -- "$state_root/current.tmp" "$state_root/current"
  if [[ -n $old_current && $old_current != "$new_current" ]]; then
    printf '%s\n' "$old_current" >"$state_root/previous.tmp"
    mv -f -- "$state_root/previous.tmp" "$state_root/previous"
  fi
}

current_release=''
[[ ! -f $state_root/current ]] || current_release=$(<"$state_root/current")

if [[ $action == rollback ]]; then
  rollback_state="$state_root/previous"
  [[ ! -f $state_root/rollback-target ]] || rollback_state="$state_root/rollback-target"
  [[ -f $rollback_state ]] || die "no previous release is recorded"
  previous_release=$(<"$rollback_state")
  [[ -d $previous_release ]] || die "recorded previous release directory is missing"
  registry_pull "$previous_release"
  prepare_secret_permissions "$previous_release"
  activate_release "$previous_release" || die "previous application release did not become healthy"
  if [[ $rollback_state == "$state_root/rollback-target" ]]; then
    rm -f -- "$state_root/rollback-target" "$state_root/pending-failed"
  else
    write_state "$previous_release" "$current_release"
  fi
  printf 'rollback complete: %s -> %s\n' "$current_release" "$previous_release"
  exit 0
fi

validate_manifest "$manifest_path"
source_sha=$(jq -r '.sourceSha' "$manifest_path")
release_run_id=$(jq -r '.releaseRunId' "$manifest_path")
release_dir="$releases_root/${source_sha}-${release_run_id}"
mkdir -p -- "$release_dir"
install -m 600 "$manifest_path" "$release_dir/release-manifest.json"
install -m 600 "$compose_source" "$release_dir/compose.yaml"
install -m 644 "$consent_policy_source" "$release_dir/consent-policy.json"
release_env_from_manifest "$release_dir/release-manifest.json" "$release_dir/release.env"

registry_pull "$release_dir"
prepare_secret_permissions "$release_dir"
compose_for "$release_dir" run --rm --no-deps \
  --volume "$release_dir/consent-policy.json:/run/mushroom-consent-policy.json:ro" \
  --env "MUSHROOM_ENVIRONMENT=$environment" \
  --env "CONSENT_POLICY_DOCUMENT_FILE=/run/mushroom-consent-policy.json" \
  api prisma/manage-consent-policy.mjs validate

# The database may start before migration, but application services do not switch until migration succeeds.
if [[ $environment != production ]]; then
  compose_for "$release_dir" up -d postgres
fi
compose_for "$release_dir" run --rm --no-deps api node_modules/prisma/build/index.js migrate deploy
if [[ -f $environment_root/bootstrap/first-run.json ]]; then
  # Only this one-time helper receives the first administrator password; normal API startup never does.
  docker run --rm --user 0:0 --network none --read-only --cap-drop ALL \
    --cap-add CHOWN --cap-add FOWNER --cap-add DAC_OVERRIDE \
    --env "SECRET_OWNER_UID=$(id -u)" \
    --mount "type=bind,src=$environment_root/bootstrap/first-run.json,dst=/run/first-run.json" \
    --entrypoint /nodejs/bin/node \
    "$(jq -r '.images.api' "$release_dir/release-manifest.json")" \
    -e 'const fs=require("node:fs");fs.chownSync("/run/first-run.json",Number(process.env.SECRET_OWNER_UID),65532);fs.chmodSync("/run/first-run.json",0o640);'
  compose_for "$release_dir" run --rm --no-deps \
    --volume "$environment_root/bootstrap/first-run.json:/run/mushroom-installation/first-run.json:ro" \
    --env "MUSHROOM_ENVIRONMENT=$environment" api prisma/bootstrap-installation.mjs
  : >"$state_root/bootstrap-complete"
  : >"$environment_root/bootstrap/complete"
  rm -- "$environment_root/bootstrap/first-run.json"
fi
compose_for "$release_dir" run --rm --no-deps \
  --volume "$release_dir/consent-policy.json:/run/mushroom-consent-policy.json:ro" \
  --env "MUSHROOM_ENVIRONMENT=$environment" \
  --env "CONSENT_POLICY_DOCUMENT_FILE=/run/mushroom-consent-policy.json" \
  --env "CONSENT_POLICY_RELEASE_REF=${source_sha}:${release_run_id}" \
  api prisma/manage-consent-policy.mjs publish
compose_for "$release_dir" run --rm --no-deps \
  api prisma/manage-consent-policy.mjs verify

if [[ -n $current_release ]]; then
  printf '%s\n' "$current_release" >"$state_root/rollback-target.tmp"
  mv -f -- "$state_root/rollback-target.tmp" "$state_root/rollback-target"
fi

if ! activate_release "$release_dir"; then
  printf '%s\n' "$release_dir" >"$state_root/pending-failed"
  if [[ $environment == staging && -n $current_release && -d $current_release ]]; then
    printf 'candidate verification failed; restoring previous staging application release\n' >&2
    activate_release "$current_release" \
      || die "candidate and automatic staging application rollback both failed"
    rm -f -- "$state_root/rollback-target" "$state_root/pending-failed"
  fi
  die "candidate application release did not pass verification"
fi

write_state "$release_dir" "$current_release"
rm -f -- "$state_root/rollback-target" "$state_root/pending-failed"
printf 'deployment complete: %s %s\n' "$environment" "$release_dir"
