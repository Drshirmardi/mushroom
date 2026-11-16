#!/usr/bin/env bash
set -Eeuo pipefail
repo_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
scratch=$(mktemp -d)
image="mushroom-dev-runtime-check:$$"
trap 'docker image rm "$image" >/dev/null 2>&1 || true; rm -rf -- "$scratch"' EXIT
python3 - "$repo_root" "$scratch" <<'PY'
from pathlib import Path
import re, sys
root, scratch = map(Path, sys.argv[1:])
required = set(re.findall(r'\$\{([A-Z][A-Z0-9_]*):\?', (root/'deploy/vps/compose.dev.yaml').read_text()))
values = {name: 'fixture' for name in required}
values.update(COMPOSE_PROJECT_NAME='mushroom-dev-build-check', DEV_UID='1000', DEV_GID='1000',
              DEV_WORKSPACE_PATH=str(root), DEV_CACHE_PATH=str(scratch/'cache'), MUSHROOM_ENV_ROOT=str(scratch/'dev'),
              TRUSTED_PROXIES='127.0.0.1/32', APP_ORIGINS='https://dev.example.test')
values.update({f'PUBLIC_{name}_URL':f'https://dev-{name.lower()}.example.test' for name in ['API','WEB','APP','DASHBOARD']})
values.update({f'{name}_PORT':f'127.0.0.1:{3300+i}' for i,name in enumerate(['WEB','APP','DASHBOARD','API'])})
(scratch/'compose.env').write_text(''.join(f'{key}={value}\n' for key,value in values.items()))
PY
docker compose --env-file "$scratch/compose.env" --file "$repo_root/deploy/vps/compose.dev.yaml" \
  --profile tools config --format json >"$scratch/compose.json"
python3 - "$scratch/compose.json" <<'PY'
import json, sys
model=json.load(open(sys.argv[1]))
build=model['services']['bootstrap']['build']
assert build['args']['DEBIAN_MIRROR']=='https://mirror.famaserver.com/debian'
assert build['args']['DEBIAN_SECURITY_MIRROR']=='https://security.debian.org/debian-security'
assert not build.get('secrets'), 'Dev runtime build must not use host build secrets'
assert not build.get('entitlements'), 'Dev runtime build must not request host filesystem entitlements'
assert 'dev_apt_ca' not in model.get('secrets', {})
PY
# Fixture-only context: this build must not need application files or private credentials.
docker build --file "$repo_root/deploy/vps/Dockerfile.dev" --tag "$image" "$scratch"
docker run --rm "$image" sh -ec '
  test -s /etc/ssl/certs/ca-certificates.crt
  test ! -e /tmp/dev-apt-ca.crt
  test ! -e /run/secrets/dev-apt-ca
  openssl version
  corepack --version
  node --version
  test -z "$(ls -A /var/lib/apt/lists)"
'
echo 'Dev runtime HTTPS package install and build-only CA checks passed.'
