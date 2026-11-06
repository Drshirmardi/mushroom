#!/usr/bin/env bash
set -Eeuo pipefail
repo_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
ca_bundle=${1:-/etc/ssl/certs/ca-certificates.crt}
[[ -s $ca_bundle ]] || { echo 'A trusted CA bundle is required for this build test.' >&2; exit 1; }
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
assert any(item['source']=='dev_apt_ca' for item in build['secrets'])
assert build.get('entitlements')==['fs.read=/etc/ssl/certs/ca-certificates.crt']
assert model['secrets']['dev_apt_ca']['file']=='/etc/ssl/certs/ca-certificates.crt'
assert all(item['source']!='dev_apt_ca' for service in model['services'].values() for item in service.get('secrets',[]))
PY
# Fixture-only context: this build must not need application files or private credentials.
docker build --file "$repo_root/deploy/vps/Dockerfile.dev" \
  --secret "id=dev_apt_ca,src=$ca_bundle" --tag "$image" "$scratch"
docker run --rm "$image" sh -ec '
  test -s /etc/ssl/certs/ca-certificates.crt
  test ! -e /run/secrets/dev-apt-ca
  openssl version
  corepack --version
  node --version
  test -z "$(ls -A /var/lib/apt/lists)"
'
if docker build --no-cache --file "$repo_root/deploy/vps/Dockerfile.dev" "$scratch" >"$scratch/missing-ca.log" 2>&1; then
  echo 'Build unexpectedly succeeded without its trusted CA input.' >&2
  exit 1
fi
grep -Eq 'secret.*dev_apt_ca|dev_apt_ca.*secret' "$scratch/missing-ca.log"
echo 'Dev runtime HTTPS package install and build-only CA checks passed.'
