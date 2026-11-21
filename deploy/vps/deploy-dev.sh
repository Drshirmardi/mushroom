#!/usr/bin/env bash
set -Eeuo pipefail

die() {
  printf 'dev deployment error: %s\n' "$*" >&2
  exit 1
}

[[ $# -eq 2 ]] || die 'usage: deploy-dev.sh <source-sha> <candidate-id>'
source_sha=$1
candidate_id=$2
[[ $candidate_id =~ ^${source_sha}-[a-f0-9-]{36}$ ]] || die 'invalid candidate identity'
[[ $source_sha =~ ^[0-9a-f]{40}$ ]] || die 'source SHA must be 40 lowercase hexadecimal characters'
[[ $(id -u) -ne 0 ]] || die 'dev deployment must run as a non-root user'

for required_command in docker curl flock sha256sum; do
  command -v "$required_command" >/dev/null 2>&1 || die "$required_command is required"
done
docker compose version >/dev/null 2>&1 || die 'Docker Compose v2 is required'

base_root=${MUSHROOM_ROOT:-"$HOME/mushroom"}
environment_root="$base_root/dev"
workspace="$environment_root/candidates/$candidate_id"
cache_root="$environment_root/cache"
state_root="$environment_root/state"
live_runtime_env="$environment_root/runtime.env"
runtime_env="$state_root/$candidate_id.env"
receipt="$state_root/$candidate_id.phase"
compose_file="$workspace/deploy/vps/compose.dev.yaml"
lock_file="$state_root/deploy.lock"

[[ -d $workspace && ! -L $workspace && $(realpath "$workspace") == "$workspace" ]] || die 'candidate path boundary mismatch'
mkdir -p -- "$cache_root" "$state_root"
exec 9>"$lock_file"
if ! flock -n 9; then
  printf 'another dev sync is active; waiting for it to finish\n'
  flock -w 600 9 || die 'timed out waiting for the active dev sync'
fi
[[ ! -f $state_root/database-maintenance ]] || die 'resume the interrupted database recovery before dev synchronization'
touch "$state_root/recovery-lock-compatible"

[[ -f $live_runtime_env && ! -L $live_runtime_env ]] || die 'runtime.env missing or symlinked'
umask 077
active_workspace=$(sed -n 's/^DEV_WORKSPACE_PATH=//p' "$live_runtime_env" | tail -n 1)
[[ $active_workspace != "$workspace" ]] || die 'candidate already live; start a new sync'
cp -- "$live_runtime_env" "$runtime_env"
sed -i "s|^DEV_WORKSPACE_PATH=.*|DEV_WORKSPACE_PATH=$workspace|" "$runtime_env"
phase() { printf '%s\n' "$1" >"$receipt.next"; mv -- "$receipt.next" "$receipt"; }
publish_runtime() { cp -- "$1" "$live_runtime_env.next"; mv -- "$live_runtime_env.next" "$live_runtime_env"; }
phase preflight
runtime_image="mushroom-dev-runtime:$candidate_id"
sed -i '/^DEV_RUNTIME_IMAGE=/d' "$runtime_env"
printf 'DEV_RUNTIME_IMAGE=%s\n' "$runtime_image" >>"$runtime_env"
[[ -f $compose_file ]] || die 'versioned dev Compose file is missing from the synced workspace'
[[ -f $environment_root/communications.compose.yaml ]] || die 'communications setup missing; open mushroom panel > Communications > Setup for dev'

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

if [[ -f $state_root/migration-in-progress ]]; then
  die 'an interrupted migration requires review; inspect state/migration-in-progress and its phase receipt'
fi

available_kib=$(df -Pk "$environment_root" | awk 'END {print $4}')
[[ $available_kib =~ ^[0-9]+$ && $available_kib -ge 3145728 ]] || die 'at least 3 GiB free disk required for candidate'
managed_turn=$(env_value_or_default CHAT_TURN_MANAGED false)
[[ $managed_turn == true || $managed_turn == false ]] || die 'invalid managed TURN setting'
sed -i '/^COMPOSE_PROFILES=/d' "$runtime_env"
if [[ $managed_turn == true ]]; then printf 'COMPOSE_PROFILES=managed-turn\n' >>"$runtime_env"; fi
image_mode=$(env_value_or_default CHAT_VIDEO_IMAGE_MODE registry)
[[ $image_mode == build || $image_mode == registry ]] || die 'unknown image mode; open Communications > Setup'
if [[ $image_mode == build ]]; then
  [[ $(env_value CHAT_COMMUNICATIONS_SCHEMA) == 2 ]] || die 'update installer and run Communications > Setup'
  video_image="mushroom-dev-mirotalk:$candidate_id"
  sed -i "s|^CHAT_VIDEO_IMAGE=.*|CHAT_VIDEO_IMAGE=$video_image|" "$runtime_env"
else
  video_image=$(env_value CHAT_VIDEO_IMAGE)
  [[ $video_image =~ @sha256:[a-f0-9]{64}$ ]] || die 'registry mode requires an immutable digest'
fi

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
  [[ ! -f $environment_root/network.yaml ]] || network_args=(--file "$environment_root/network.yaml")
  docker compose \
    --project-name mushroom-dev \
    --env-file "$runtime_env" \
    --file "$compose_file" \
    --file "$environment_root/communications.compose.yaml" \
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
    "$workspace/apps/api/scripts/build-program-catalog.mjs"
    "$workspace/raw-data/services.catalog.json"
  )
  while IFS= read -r file; do files+=("$file"); done < <(
    find "$workspace/apps/api/src" \
      -path "$workspace/apps/api/src/generated/prisma" -prune -o \
      -type f -print | sort
  )
  while IFS= read -r file; do files+=("$file"); done < <(
    find "$workspace/raw-data/markdown" -type f -name '*.md' -print | sort
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
  "$workspace/apps/api/prisma.chat.config.ts" \
  "$workspace/apps/api/prisma")
api_hash=$(hash_api_inputs)
api_artifact_hash=''
[[ ! -f $workspace/apps/api/dist/.source.sha256 ]] \
  || api_artifact_hash=$(<"$workspace/apps/api/dist/.source.sha256")
web_hash=$(hash_frontend_inputs web)
app_hash=$(hash_frontend_inputs app)
dashboard_hash=$(hash_frontend_inputs dashboard)
public_config_hash=$(
  for key in PUBLIC_API_URL PUBLIC_WEB_URL PUBLIC_APP_URL PUBLIC_DASHBOARD_URL SADAD_RETURN_URL; do
    printf '%s=%s\n' "$key" "$(env_value_or_default "$key" "")"
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
    'PUBLIC_GA4_MEASUREMENT_ID -' \
    'PUBLIC_ANALYTICS_CONSENT denied' \
    'PUBLIC_ANALYTICS_DEBUG false' \
    'ANALYTICS_SERVER_ENABLED false' \
    'GA4_API_SECRET_FILE /run/optional-secrets/ga4_api_secret' \
    'BALE_AUTH_ENABLED false' \
    'BALE_BOT_USERNAME -' \
    'BALE_BOT_TOKEN_FILE /run/optional-secrets/bale_bot_token' \
    'BALE_WEBHOOK_SECRET_FILE /run/optional-secrets/bale_webhook_secret' \
    'SADAD_TRANSPORT_MODE disabled' \
    'SADAD_REQUEST_TIMEOUT_MS 5000' \
    'SADAD_RETURN_URL -' \
    'SADAD_RESULT_URL -' \
    'SADAD_REDIRECT_PROFILE -'; do
    read -r key fallback <<<"$key_and_default"
    printf '%s=%s\n' "$key" "$(env_value_or_default "$key" "$fallback")"
  done
  for name in r2_access_key_id r2_secret_access_key arvan_access_key_id arvan_secret_access_key ga4_api_secret bale_bot_token bale_webhook_secret; do
    if [[ -f $environment_root/secrets/$name ]]; then
      printf '%s=' "$name"
      sha256sum "$environment_root/secrets/$name" | cut -d' ' -f1
    fi
  done
  } | sha256sum | cut -d' ' -f1
)

# Snapshot actual mounted source and immutable runtime IDs for legacy recovery.
rollback_dir="$state_root/rollback-$candidate_id"
mkdir -p -m 700 "$rollback_dir"
cp -- "$live_runtime_env" "$rollback_dir/desired.env"
if [[ -f $state_root/current-runtime.env ]]; then
  cp -- "$state_root/current-runtime.env" "$rollback_dir/runtime.env"
else
  cp -- "$live_runtime_env" "$rollback_dir/runtime.env"
fi
previous_workspace=$(docker inspect mushroom-dev-dashboard-1 --format '{{range .Mounts}}{{if eq .Destination "/workspace"}}{{.Source}}{{end}}{{end}}' 2>/dev/null || true)
previous_valid=false
if [[ -n $previous_workspace && -d $previous_workspace && $previous_workspace == "$environment_root/"* ]]; then
  printf '%s\n' "$previous_workspace" >"$rollback_dir/workspace"
  sed -i "s|^DEV_WORKSPACE_PATH=.*|DEV_WORKSPACE_PATH=$previous_workspace|" "$rollback_dir/runtime.env"
  previous_valid=true
  printf 'services:\n' >"$rollback_dir/images.compose.yaml"
  for service in api web app dashboard; do
    image=$(docker inspect "mushroom-dev-$service-1" --format '{{.Image}}' 2>/dev/null || true)
    if [[ ! $image =~ ^sha256:[a-f0-9]{64}$ ]]; then previous_valid=false; break; fi
    printf '  %s:\n    image: "%s"\n' "$service" "$image" >>"$rollback_dir/images.compose.yaml"
  done
fi
schema_hash() {
  (cd "$1" && find apps/api/prisma -type f -name migration.sql -print0 | sort -z | xargs -0 -r sha256sum) | sha256sum | cut -d' ' -f1
}
candidate_schema=$(schema_hash "$workspace")
schema_rollback_safe=false
if [[ -f $state_root/migrations.sha256 && -f $state_root/current-workspace \
  && $(<"$state_root/current-workspace") == "$previous_workspace" \
  && $(<"$state_root/migrations.sha256") == "$candidate_schema" ]]; then schema_rollback_safe=true; fi
activation_started=false
migration_started=false
succeeded=false
rollback() {
  local result=$?
  trap - EXIT
  if [[ $succeeded == true ]]; then return; fi
  if [[ $migration_started == true && $schema_rollback_safe != true ]]; then
    printf '%s\n' "$candidate_id" >"$state_root/database-maintenance"
    phase failed-schema-review-required
    printf 'Migration may have changed schema; API stopped. Review migration receipt before recovery.\n' >&2
    compose stop api >/dev/null 2>&1 || true
  elif [[ $activation_started == true && $previous_valid == true ]]; then
    phase rollback-started
    publish_runtime "$rollback_dir/runtime.env"
    previous_compose="$previous_workspace/deploy/vps/compose.dev.yaml"
    previous_overlay="$environment_root/communications.compose.yaml"
    if ! grep -q CHAT_DATABASE_URL "$previous_compose"; then previous_overlay="$environment_root/chat.compose.yaml"; fi
    previous_args=(--file "$previous_compose" --file "$previous_overlay" --file "$rollback_dir/images.compose.yaml")
    [[ ! -f $environment_root/network.yaml ]] || previous_args+=(--file "$environment_root/network.yaml")
    if [[ $previous_overlay == */chat.compose.yaml && -f $environment_root/chat.database.yaml ]]; then previous_args+=(--file "$environment_root/chat.database.yaml"); fi
    if docker compose --project-name mushroom-dev --env-file "$live_runtime_env" "${previous_args[@]}" up -d --no-deps --force-recreate api web app dashboard; then
      restored_healthy=true
      for key in API_PORT WEB_PORT APP_PORT DASHBOARD_PORT; do
        path='/'
        [[ $key != API_PORT ]] || path='/v1/health/ready'
        if ! curl --fail --silent --max-time 10 "http://$(env_value "$key")$path" >/dev/null; then restored_healthy=false; fi
      done
      if [[ $restored_healthy == true ]]; then phase rollback-healthy
      else phase rollback-unhealthy; printf 'Previous workspace restored but readiness failed; inspect logs.\n' >&2; fi
    else phase rollback-failed; fi
  else phase failed-before-activation; fi
  if [[ $migration_started == true && $schema_rollback_safe == true ]]; then
    rm -f -- "$state_root/migration-in-progress"
  fi
  exit "$result"
}
trap rollback EXIT
compose config --quiet
infrastructure=(postgres communications-postgres chat-scanner)
[[ $managed_turn != true ]] || infrastructure+=(coturn)
compose pull "${infrastructure[@]}"
if [[ $image_mode == build ]]; then
  phase building-mirotalk
  docker build --tag "$video_image" "$workspace/deploy/mirotalk"
else docker pull "$video_image"; fi
docker image inspect "$video_image" --format '{{.Id}}' >"$state_root/$candidate_id.mirotalk-image"
compose --profile tools build bootstrap
phase preparing
DEV_INSTALL_DEPENDENCIES=true DEV_RUN_SEED=false DEV_BUILD_API_CLIENT=true \
  DEV_GENERATE_PRISMA=true DEV_RUN_MIGRATIONS=false DEV_COMPILE_API=true \
  DEV_API_SOURCE_HASH=$api_hash DEV_WRITE_RUNTIME_CONFIG=true \
  compose --profile tools run --rm --no-deps bootstrap bash deploy/vps/dev-service.sh bootstrap-prepare
phase prepared
compose up -d --wait postgres communications-postgres
if [[ $schema_rollback_safe != true && $previous_valid == true ]]; then compose stop api; fi
migration_started=true
printf '%s\n' "$candidate_id" >"$state_root/migration-in-progress"
phase migration-started
run_seed=false
[[ -f $state_root/seeded ]] || run_seed=true
DEV_INSTALL_DEPENDENCIES=false DEV_RUN_SEED=$run_seed DEV_BUILD_API_CLIENT=false \
  DEV_GENERATE_PRISMA=false DEV_RUN_MIGRATIONS=true DEV_COMPILE_API=false \
  DEV_WRITE_RUNTIME_CONFIG=false \
  compose --profile tools run --rm --no-deps bootstrap bash deploy/vps/dev-service.sh bootstrap-activate
phase migration-complete
activation_started=true
phase activating
publish_runtime "$runtime_env"
compose up -d --force-recreate

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
probe_frontend dashboard "http://$(env_value DASHBOARD_PORT)/messages"
probe api "http://$(env_value API_PORT)/v1/health/chat"
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

if [[ -f $state_root/current-workspace ]]; then cp -- "$state_root/current-workspace" "$state_root/previous-workspace"; fi
printf '%s\n' "$workspace" >"$state_root/current-workspace"
printf '%s\n' "$source_sha" >"$state_root/source.sha"
printf '%s\n' "$candidate_schema" >"$state_root/migrations.sha256"
cp -- "$runtime_env" "$state_root/current-runtime.env.next"
mv -- "$state_root/current-runtime.env.next" "$state_root/current-runtime.env"
phase healthy
[[ $run_seed != true ]] || touch "$state_root/seeded"
rm -f -- "$state_root/migration-in-progress"
succeeded=true
previous_kept=''
[[ ! -f $state_root/previous-workspace ]] || previous_kept=$(<"$state_root/previous-workspace")
for old_receipt in "$state_root"/*.phase; do
  [[ -f $old_receipt && $(<"$old_receipt") == healthy ]] || continue
  old_id=${old_receipt##*/}
  old_id=${old_id%.phase}
  [[ $old_id =~ ^[a-f0-9]{40}-[a-f0-9-]{36}$ ]] || continue
  old_workspace="$environment_root/candidates/$old_id"
  [[ $old_workspace != "$workspace" && $old_workspace != "$previous_kept" ]] || continue
  [[ -d $old_workspace && ! -L $old_workspace && $(realpath "$old_workspace") == "$old_workspace" ]] || continue
  rm -rf -- "$old_workspace"
done
printf 'dev environment is ready at source %s\n' "$source_sha"
