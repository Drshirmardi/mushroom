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
if ! flock -n 9; then
  printf 'another dev sync is active; waiting for it to finish\n'
  flock -w 600 9 || die 'timed out waiting for the active dev sync'
fi

[[ -f $runtime_env ]] || die "$runtime_env is missing"
[[ -f $compose_file ]] || die 'versioned dev Compose file is missing from the synced workspace'
[[ -f $environment_root/chat.compose.yaml ]] || die 'ejabberd chat.compose.yaml is required; follow deploy/ejabberd/README.md before deploying this branch'

env_value() {
  local key=$1
  local value
  value=$(sed -n "s/^${key}=//p" "$runtime_env" | tail -n 1)
  [[ -n $value ]] || die "$key is missing from runtime.env"
  printf '%s' "$value"
}

env_value_or_default() {
  local key=$1
  local fallback=$2
  local value
  value=$(sed -n "s/^${key}=//p" "$runtime_env" | tail -n 1)
  printf '%s' "${value:-$fallback}"
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

for other_environment in staging production-sim production; do
  other_env="$base_root/$other_environment/runtime.env"
  [[ -f $other_env ]] || continue
  for key in COMPOSE_PROJECT_NAME MUSHROOM_ENV_ROOT POSTGRES_DB POSTGRES_USER API_PORT WEB_PORT APP_PORT DASHBOARD_PORT \
    PUBLIC_API_URL PUBLIC_WEB_URL PUBLIC_APP_URL PUBLIC_DASHBOARD_URL; do
    current_value=$(env_value "$key")
    other_value=$(sed -n "s/^${key}=//p" "$other_env" | tail -n 1)
    [[ -z $other_value || $current_value != "$other_value" ]] || die "$key crosses into $other_environment"
  done
done

generate_dev_secret() {
  local secret=$1
  local secret_path="$environment_root/secrets/$secret"
  [[ -e $secret_path ]] && return
  umask 077
  case "$secret" in
    otp_pepper) openssl rand -hex 48 >"$secret_path" ;;
    sms_credential_encryption_key) openssl rand -base64 32 | tr -d '\n' >"$secret_path" ;;
    sms_credential_decryption_keys)
      printf 'v0:' >"$secret_path"
      openssl rand -base64 32 | tr -d '\n' >>"$secret_path"
      ;;
  esac
}

# Dev-only bootstrap: create newly introduced secrets on the VPS without exposing them to Git or workflow logs.
for generated_secret in otp_pepper sms_credential_encryption_key sms_credential_decryption_keys; do
  generate_dev_secret "$generated_secret"
done

for secret in postgres_password database_url jwt_access_secret refresh_token_pepper \
  otp_pepper sms_credential_encryption_key sms_credential_decryption_keys \
  payment_credential_encryption_key payment_credential_decryption_keys; do
  secret_path="$environment_root/secrets/$secret"
  [[ -f $secret_path ]] || die "required dev secret is missing: $secret"
  case "$secret" in
    *_decryption_keys) ;;
    *) [[ -s $secret_path ]] || die "required dev secret is empty: $secret" ;;
  esac
  permissions=$(stat -c '%a' "$secret_path")
  (( (8#$permissions & 0037) == 0 )) || die "$secret must not be readable by others or writable by its group"
done

compose() {
  local network_args=()
  local chat_database_args=()
  [[ ! -f $environment_root/network.yaml ]] || network_args=(--file "$environment_root/network.yaml")
  [[ ! -f $environment_root/chat.database.yaml ]] || chat_database_args=(--file "$environment_root/chat.database.yaml")
  docker compose \
    --project-name mushroom-dev \
    --env-file "$runtime_env" \
    --file "$compose_file" \
    --file "$environment_root/chat.compose.yaml" \
    "${chat_database_args[@]}" \
    "${network_args[@]}" \
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
    files+=(
      "$workspace/deploy/vps/Dockerfile.dev"
      "$workspace/deploy/vps/compose.dev.yaml"
      "$workspace/deploy/vps/deploy-dev.sh"
      "$workspace/deploy/vps/dev-service.sh"
    )
  fi
  for file in "${files[@]}"; do
    [[ -f $file ]] || die "fingerprint input is missing: $file"
  done
  sha256sum "${files[@]}" | sha256sum | cut -d' ' -f1
}

hash_paths() {
  local -a files=()
  local path
  for path in "$@"; do
    if [[ -f $path ]]; then
      files+=("$path")
    elif [[ -d $path ]]; then
      while IFS= read -r file; do files+=("$file"); done < <(find "$path" -type f -print | sort)
    else
      die "fingerprint input is missing: $path"
    fi
  done
  sha256sum "${files[@]}" | sha256sum | cut -d' ' -f1
}

hash_api_inputs() {
  local -a files=(
    "$workspace/apps/api/package.json"
    "$workspace/apps/api/tsconfig.json"
    "$workspace/apps/api/tsconfig.build.json"
  )
  while IFS= read -r file; do files+=("$file"); done < <(
    find "$workspace/apps/api/src" \
      -path "$workspace/apps/api/src/generated/prisma" -prune -o \
      -type f -print | sort
  )
  sha256sum "${files[@]}" | sha256sum | cut -d' ' -f1
}

hash_frontend_inputs() {
  local application=$1
  local -a files=("$workspace/config/next-dev-origins.ts")
  while IFS= read -r file; do files+=("$file"); done < <(
    find "$workspace/apps/$application" \
      \( -path "$workspace/apps/$application/.next" \
        -o -path "$workspace/apps/$application/node_modules" \) -prune \
      -o -path "$workspace/apps/$application/public/runtime-config.js" -prune \
      -o -type f -print | sort
  )
  sha256sum "${files[@]}" | sha256sum | cut -d' ' -f1
}

dependency_hash=$(hash_inputs dependencies)
runtime_hash=$(hash_inputs runtime)
api_client_hash=$(hash_paths \
  "$workspace/packages/api-client/package.json" \
  "$workspace/packages/api-client/tsconfig.json" \
  "$workspace/packages/api-client/openapi.json" \
  "$workspace/packages/api-client/src")
prisma_hash=$(hash_paths \
  "$workspace/apps/api/prisma.config.ts" \
  "$workspace/apps/api/prisma")
api_hash=$(hash_api_inputs)
api_artifact_hash=''
[[ ! -f $workspace/apps/api/dist/.source.sha256 ]] \
  || api_artifact_hash=$(<"$workspace/apps/api/dist/.source.sha256")
web_hash=$(hash_frontend_inputs web)
app_hash=$(hash_frontend_inputs app)
dashboard_hash=$(hash_frontend_inputs dashboard)
public_config_hash=$(
  for key in PUBLIC_API_URL PUBLIC_WEB_URL PUBLIC_APP_URL PUBLIC_DASHBOARD_URL; do
    printf '%s=%s\n' "$key" "$(env_value "$key")"
  done | sha256sum | cut -d' ' -f1
)
api_runtime_hash=$(
  {
  for key_and_default in \
    'LOG_LEVEL debug' \
    'JWT_ACCESS_ISSUER sabz-zendegi-api' \
    'JWT_ACCESS_AUDIENCE sabz-zendegi-frontends' \
    'COMMERCE_RESERVATION_TTL_MINUTES 20' \
    'BILLING_BOOKING_HOLD_MINUTES 10' \
    'PRODUCT_MEDIA_STORAGE_MODE disabled' \
    'R2_ENDPOINT -' \
    'R2_BUCKET -' \
    'R2_REGION auto' \
    'R2_REQUEST_TIMEOUT_MS 5000' \
    'ARVAN_ENDPOINT -' \
    'ARVAN_BUCKET -' \
    'ARVAN_REGION default' \
    'ARVAN_REQUEST_TIMEOUT_MS 5000' \
    'APP_ORIGINS http://localhost:3000,http://localhost:3001,http://localhost:3002' \
    'TRUSTED_PROXIES 127.0.0.1/32' \
    'PAYMENT_CREDENTIAL_ENCRYPTION_KEY_VERSION v1' \
    'SMS_TRANSPORT_MODE disabled' \
    'SMS_REQUEST_TIMEOUT_MS 5000' \
    'SMS_CREDENTIAL_ENCRYPTION_KEY_VERSION v1' \
    'PUBLIC_API_URL http://localhost:3003' \
    'SADAD_TRANSPORT_MODE disabled' \
    'SADAD_REQUEST_TIMEOUT_MS 5000' \
    'SADAD_RETURN_URL -' \
    'SADAD_RESULT_URL -' \
    'SADAD_REDIRECT_PROFILE -'; do
    read -r key fallback <<<"$key_and_default"
    printf '%s=%s\n' "$key" "$(env_value_or_default "$key" "$fallback")"
  done
  for name in r2_access_key_id r2_secret_access_key arvan_access_key_id arvan_secret_access_key; do
    if [[ -f $environment_root/secrets/$name ]]; then
      printf '%s=' "$name"
      sha256sum "$environment_root/secrets/$name" | cut -d' ' -f1
    fi
  done
  } | sha256sum | cut -d' ' -f1
)
previous_dependency_hash=''
previous_runtime_hash=''
previous_api_client_hash=''
previous_prisma_hash=''
previous_api_hash=''
previous_web_hash=''
previous_app_hash=''
previous_dashboard_hash=''
previous_public_config_hash=''
previous_api_runtime_hash=''
[[ ! -f $state_root/dependencies.sha256 ]] || previous_dependency_hash=$(<"$state_root/dependencies.sha256")
[[ ! -f $state_root/runtime.sha256 ]] || previous_runtime_hash=$(<"$state_root/runtime.sha256")
[[ ! -f $state_root/api-client.sha256 ]] || previous_api_client_hash=$(<"$state_root/api-client.sha256")
[[ ! -f $state_root/prisma.sha256 ]] || previous_prisma_hash=$(<"$state_root/prisma.sha256")
[[ ! -f $state_root/api.sha256 ]] || previous_api_hash=$(<"$state_root/api.sha256")
[[ ! -f $state_root/web.sha256 ]] || previous_web_hash=$(<"$state_root/web.sha256")
[[ ! -f $state_root/app.sha256 ]] || previous_app_hash=$(<"$state_root/app.sha256")
[[ ! -f $state_root/dashboard.sha256 ]] || previous_dashboard_hash=$(<"$state_root/dashboard.sha256")
[[ ! -f $state_root/public-config.sha256 ]] || previous_public_config_hash=$(<"$state_root/public-config.sha256")
[[ ! -f $state_root/api-runtime.sha256 ]] || previous_api_runtime_hash=$(<"$state_root/api-runtime.sha256")

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

build_api_client=false
generate_prisma=false
run_migrations=false
compile_api=false
restart_web=false
restart_app=false
restart_dashboard=false
restart_api=false
write_runtime_config=false
if [[ $runtime_changed == true ]]; then
  build_api_client=true
  generate_prisma=true
  run_migrations=true
  compile_api=true
  write_runtime_config=true
fi
if [[ $install_dependencies == true || $api_client_hash != "$previous_api_client_hash" \
  || ! -f $workspace/packages/api-client/dist/index.js ]]; then
  build_api_client=true
fi
if [[ $install_dependencies == true || $prisma_hash != "$previous_prisma_hash" \
  || ! -d $workspace/apps/api/src/generated/prisma ]]; then
  generate_prisma=true
fi
if [[ $prisma_hash != "$previous_prisma_hash" ]]; then
  run_migrations=true
fi
if [[ $install_dependencies == true || $runtime_changed == true \
  || $api_hash != "$previous_api_hash" || $api_client_hash != "$previous_api_client_hash" \
  || $prisma_hash != "$previous_prisma_hash" || $api_hash != "$api_artifact_hash" \
  || ! -f $workspace/apps/api/dist/main.js ]]; then
  compile_api=true
fi
if [[ $web_hash != "$previous_web_hash" || $api_client_hash != "$previous_api_client_hash" ]]; then
  restart_web=true
fi
if [[ $app_hash != "$previous_app_hash" || $api_client_hash != "$previous_api_client_hash" ]]; then
  restart_app=true
fi
if [[ $dashboard_hash != "$previous_dashboard_hash" || $api_client_hash != "$previous_api_client_hash" ]]; then
  restart_dashboard=true
fi
if [[ $public_config_hash != "$previous_public_config_hash" \
  || ! -f $workspace/apps/web/public/runtime-config.js \
  || ! -f $workspace/apps/app/public/runtime-config.js \
  || ! -f $workspace/apps/dashboard/public/runtime-config.js ]]; then
  write_runtime_config=true
fi
if [[ $api_runtime_hash != "$previous_api_runtime_hash" ]]; then
  restart_api=true
fi

if [[ $install_dependencies == true || $run_seed == true || $build_api_client == true \
  || $generate_prisma == true || $run_migrations == true || $compile_api == true \
  || $write_runtime_config == true ]]; then
  DEV_INSTALL_DEPENDENCIES=$install_dependencies \
    DEV_RUN_SEED=$run_seed \
    DEV_BUILD_API_CLIENT=$build_api_client \
    DEV_GENERATE_PRISMA=$generate_prisma \
    DEV_RUN_MIGRATIONS=$run_migrations \
    DEV_COMPILE_API=$compile_api \
    DEV_API_SOURCE_HASH=$api_hash \
    DEV_WRITE_RUNTIME_CONFIG=$write_runtime_config \
    compose --profile tools run --rm --no-deps bootstrap
fi

if [[ $runtime_changed == true || $install_dependencies == true ]]; then
  compose up -d --remove-orphans --force-recreate
else
  services=()
  [[ $compile_api != true && $restart_api != true ]] || services+=(api)
  [[ $restart_web != true ]] || services+=(web)
  [[ $restart_app != true ]] || services+=(app)
  [[ $restart_dashboard != true ]] || services+=(dashboard)
  if (( ${#services[@]} > 0 )); then
    compose up -d --no-deps --force-recreate "${services[@]}"
  fi
  compose up -d --remove-orphans
fi

probe_attempts() {
  local url=$1
  local attempts=$2
  local max_time=$3
  local attempt
  for ((attempt = 1; attempt <= attempts; attempt++)); do
    if curl --fail --silent --show-error --max-time "$max_time" "$url" >/dev/null; then
      return 0
    fi
    sleep "${DEV_PROBE_RETRY_DELAY_SECONDS:-2}"
  done
  return 1
}

print_service_diagnostics() {
  local name=$1
  local container_id
  compose ps "$name" >&2 || true
  container_id=$(compose ps -q "$name" 2>/dev/null || true)
  if [[ -n $container_id ]]; then
    docker inspect "$container_id" \
      --format 'container={{.Name}} restarts={{.RestartCount}} oom={{.State.OOMKilled}} exit={{.State.ExitCode}} health={{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' \
      >&2 || true
  fi
  compose logs --no-color --tail 200 "$name" >&2 || true
}

probe() {
  local name=$1
  local url=$2
  if probe_attempts "$url" 60 5; then
    return 0
  fi
  print_service_diagnostics "$name"
  die "$name did not become ready at $url"
}

probe_frontend() {
  local name=$1
  local url=$2

  if probe_attempts "$url" 6 5; then
    return 0
  fi

  printf '%s frontend did not become ready; recreating its derived cache and watcher once\n' "$name" >&2
  print_service_diagnostics "$name"
  rm -rf -- "$workspace/apps/$name/.next"
  compose up -d --no-deps --force-recreate "$name"

  if probe_attempts "$url" 12 5; then
    return 0
  fi

  print_service_diagnostics "$name"
  die "$name did not become ready after one recovery attempt at $url"
}

probe_hmr() {
  local name=$1
  local origin=$2
  local attempt
  local headers
  headers=$(mktemp "$state_root/hmr-${name}.XXXXXX")

  for attempt in {1..15}; do
    : >"$headers"
    curl --http1.1 --silent --max-time 3 \
      --dump-header "$headers" --output /dev/null \
      --header 'Connection: Upgrade' \
      --header 'Upgrade: websocket' \
      --header "Origin: $origin" \
      --header 'Sec-WebSocket-Version: 13' \
      --header 'Sec-WebSocket-Extensions: permessage-deflate; client_max_window_bits' \
      --header 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' \
      "${origin%/}/_next/hmr?id=deploy-${source_sha}-${attempt}" || true

    if grep -Eq '^HTTP/1\.1 101([[:space:]]|$)' "$headers"; then
      rm -f -- "$headers"
      return 0
    fi
    sleep 2
  done

  cat "$headers" >&2
  rm -f -- "$headers"
  die "$name HMR websocket did not accept its public browser origin"
}

probe api "http://$(env_value API_PORT)/v1/health/ready"
probe_frontend web "http://$(env_value WEB_PORT)/"
probe_frontend app "http://$(env_value APP_PORT)/"
probe_frontend dashboard "http://$(env_value DASHBOARD_PORT)/"
probe_hmr web "$(env_value PUBLIC_WEB_URL)"
probe_hmr app "$(env_value PUBLIC_APP_URL)"
probe_hmr dashboard "$(env_value PUBLIC_DASHBOARD_URL)"

printf '%s\n' "$dependency_hash" >"$state_root/dependencies.sha256"
printf '%s\n' "$runtime_hash" >"$state_root/runtime.sha256"
printf '%s\n' "$api_client_hash" >"$state_root/api-client.sha256"
printf '%s\n' "$prisma_hash" >"$state_root/prisma.sha256"
printf '%s\n' "$api_hash" >"$state_root/api.sha256"
printf '%s\n' "$web_hash" >"$state_root/web.sha256"
printf '%s\n' "$app_hash" >"$state_root/app.sha256"
printf '%s\n' "$dashboard_hash" >"$state_root/dashboard.sha256"
printf '%s\n' "$public_config_hash" >"$state_root/public-config.sha256"
printf '%s\n' "$api_runtime_hash" >"$state_root/api-runtime.sha256"
if [[ $run_seed == true ]]; then
  : >"$state_root/seeded"
fi

printf '%s\n' "$source_sha" >"$state_root/source.sha"
printf 'dev environment is ready at source %s\n' "$source_sha"
