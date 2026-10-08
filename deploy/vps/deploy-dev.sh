#!/usr/bin/env bash
set -Eeuo pipefail

die() {
  printf 'dev deployment error: %s\n' "$*" >&2
  exit 1
}

[[ $# -eq 1 ]] || die 'usage: deploy-dev.sh <40-character-source-sha>'
source_sha=$1
[[ $source_sha =~ ^[0-9a-f]{40}$ ]] || die 'source SHA must be 40 lowercase hexadecimal characters'
[[ $(id -u) -ne 0 ]] || die 'dev deployment must run as a non-root user'

for required_command in docker curl flock sha256sum; do
  command -v "$required_command" >/dev/null 2>&1 || die "$required_command is required"
done
docker compose version >/dev/null 2>&1 || die 'Docker Compose v2 is required'

base_root=${MUSHROOM_ROOT:-"$HOME/mushroom"}
environment_root="$base_root/dev"
workspace="$environment_root/workspace"
cache_root="$environment_root/cache"
state_root="$environment_root/state"
runtime_env="$environment_root/runtime.env"
compose_file="$workspace/deploy/vps/compose.dev.yaml"
lock_file="$state_root/deploy.lock"

mkdir -p -- "$workspace" "$cache_root" "$state_root"
exec 9>"$lock_file"
flock -n 9 || die 'another dev sync is active'

[[ -f $runtime_env ]] || die "$runtime_env is missing"
[[ -f $compose_file ]] || die 'versioned dev Compose file is missing from the synced workspace'

env_value() {
  local key=$1
  local value
  value=$(sed -n "s/^${key}=//p" "$runtime_env" | tail -n 1)
  [[ -n $value ]] || die "$key is missing from runtime.env"
  printf '%s' "$value"
}

[[ $(env_value MUSHROOM_ENVIRONMENT) == development ]] || die 'runtime environment must be development'
[[ $(env_value COMPOSE_PROJECT_NAME) == mushroom-dev ]] || die 'Compose project must be mushroom-dev'
[[ $(env_value MUSHROOM_ENV_ROOT) == "$environment_root" ]] || die 'dev environment root boundary mismatch'
[[ $(env_value DEV_WORKSPACE_PATH) == "$workspace" ]] || die 'dev workspace boundary mismatch'
[[ $(env_value DEV_CACHE_PATH) == "$cache_root" ]] || die 'dev cache boundary mismatch'
[[ $(env_value POSTGRES_DB) == *dev* ]] || die 'dev database name must contain dev'
[[ $(env_value POSTGRES_USER) == *dev* ]] || die 'dev database user must contain dev'

for identity_key in DEV_UID DEV_GID; do
  identity_value=$(env_value "$identity_key")
  [[ $identity_value =~ ^[1-9][0-9]*$ ]] || die "$identity_key must be a non-root numeric identity"
done
[[ $(env_value DEV_UID) == "$(id -u)" ]] || die 'DEV_UID must match the deployment user UID'
[[ $(env_value DEV_GID) == "$(id -g)" ]] || die 'DEV_GID must match the deployment user primary GID'

declare -A seen_bindings=()
for port_key in API_PORT WEB_PORT APP_PORT DASHBOARD_PORT; do
  binding=$(env_value "$port_key")
  [[ $binding =~ ^127\.0\.0\.1:([0-9]{1,5})$ ]] || die "$port_key must bind an explicit loopback port"
  port=${BASH_REMATCH[1]}
  (( port >= 1024 && port <= 65535 )) || die "$port_key must use an unprivileged valid port"
  [[ -z ${seen_bindings[$binding]:-} ]] || die "duplicate dev port binding: $binding"
  seen_bindings[$binding]=1
done

for other_environment in staging production-sim; do
  other_env="$base_root/$other_environment/runtime.env"
  [[ -f $other_env ]] || continue
  for key in COMPOSE_PROJECT_NAME MUSHROOM_ENV_ROOT POSTGRES_DB POSTGRES_USER API_PORT WEB_PORT APP_PORT DASHBOARD_PORT \
    PUBLIC_API_URL PUBLIC_WEB_URL PUBLIC_APP_URL PUBLIC_DASHBOARD_URL; do
    current_value=$(env_value "$key")
    other_value=$(sed -n "s/^${key}=//p" "$other_env" | tail -n 1)
    [[ -z $other_value || $current_value != "$other_value" ]] || die "$key crosses into $other_environment"
  done
done

for secret in postgres_password database_url jwt_access_secret refresh_token_pepper \
  payment_credential_encryption_key payment_credential_decryption_keys; do
  secret_path="$environment_root/secrets/$secret"
  [[ -s $secret_path ]] || die "required dev secret is missing: $secret"
  permissions=$(stat -c '%a' "$secret_path")
  (( (8#$permissions & 0037) == 0 )) || die "$secret must not be readable by others or writable by its group"
done

compose() {
  docker compose \
    --project-name mushroom-dev \
    --env-file "$runtime_env" \
    --file "$compose_file" \
    "$@"
}

hash_inputs() {
  local mode=$1
  local -a files=()
  if [[ $mode == dependencies ]]; then
    files+=("$workspace/package.json" "$workspace/pnpm-lock.yaml" "$workspace/pnpm-workspace.yaml")
    while IFS= read -r file; do files+=("$file"); done < <(
      find "$workspace/apps" "$workspace/packages" -mindepth 2 -maxdepth 2 -name package.json -type f -print | sort
    )
  else
    files+=("$workspace/deploy/vps/Dockerfile.dev" "$workspace/deploy/vps/compose.dev.yaml" "$workspace/deploy/vps/dev-service.sh")
  fi
  for file in "${files[@]}"; do
    [[ -f $file ]] || die "fingerprint input is missing: $file"
  done
  sha256sum "${files[@]}" | sha256sum | cut -d' ' -f1
}

dependency_hash=$(hash_inputs dependencies)
runtime_hash=$(hash_inputs runtime)
previous_dependency_hash=''
previous_runtime_hash=''
[[ ! -f $state_root/dependencies.sha256 ]] || previous_dependency_hash=$(<"$state_root/dependencies.sha256")
[[ ! -f $state_root/runtime.sha256 ]] || previous_runtime_hash=$(<"$state_root/runtime.sha256")

runtime_changed=false
if [[ $runtime_hash != "$previous_runtime_hash" ]] || ! docker image inspect mushroom-dev-runtime:local >/dev/null 2>&1; then
  compose --profile tools build bootstrap
  runtime_changed=true
fi

compose up -d --wait postgres

install_dependencies=false
if [[ $dependency_hash != "$previous_dependency_hash" || ! -d "$workspace/node_modules/.pnpm" ]]; then
  install_dependencies=true
fi

run_seed=false
if [[ ! -f $state_root/seeded ]]; then
  run_seed=true
fi

DEV_INSTALL_DEPENDENCIES=$install_dependencies DEV_RUN_SEED=$run_seed \
  compose --profile tools run --rm --no-deps bootstrap

printf '%s\n' "$dependency_hash" >"$state_root/dependencies.sha256"
printf '%s\n' "$runtime_hash" >"$state_root/runtime.sha256"
if [[ $run_seed == true ]]; then
  : >"$state_root/seeded"
fi

up_arguments=(up -d --remove-orphans)
if [[ $runtime_changed == true || $install_dependencies == true ]]; then
  up_arguments+=(--force-recreate)
fi
compose "${up_arguments[@]}"

probe() {
  local name=$1
  local url=$2
  local attempt
  for attempt in {1..60}; do
    if curl --fail --silent --show-error --max-time 5 "$url" >/dev/null; then
      return 0
    fi
    sleep 2
  done
  compose ps "$name" >&2 || true
  compose logs --no-color --tail 200 "$name" >&2 || true
  die "$name did not become ready at $url"
}

probe api "http://$(env_value API_PORT)/v1/health/ready"
probe web "http://$(env_value WEB_PORT)/"
probe app "http://$(env_value APP_PORT)/"
probe dashboard "http://$(env_value DASHBOARD_PORT)/"

printf '%s\n' "$source_sha" >"$state_root/source.sha"
printf 'dev environment is ready at source %s\n' "$source_sha"
