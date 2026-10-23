#!/usr/bin/env python3
"""Server preparation and operations. Python standard library only; Ubuntu 24.04."""
import argparse
import base64
from contextlib import contextmanager
from datetime import datetime, timezone
import getpass
import hashlib
import ipaddress
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import socket
import ssl
import subprocess
import sys
import tempfile
import unicodedata
from urllib.parse import parse_qs, unquote, urlsplit
from urllib.request import urlopen

BUNDLE = Path(__file__).resolve().parent.parent
STATE = Path('/etc/mushroom')
ENVIRONMENTS = ('dev', 'staging', 'production-sim', 'production')
PORTS = {'dev': 3300, 'staging': 3100, 'production-sim': 3200, 'production': 3000}
SUBNETS = {'dev': 33, 'staging': 31, 'production-sim': 32, 'production': 30}
SECRET_NAMES = (
    'database_url', 'jwt_access_secret', 'refresh_token_pepper', 'otp_pepper',
    'sms_credential_encryption_key', 'sms_credential_decryption_keys',
    'payment_credential_encryption_key', 'payment_credential_decryption_keys',
)
RUNTIME_DEFAULTS = {
    'LOG_LEVEL': 'info', 'JWT_ACCESS_ISSUER': 'sabz-zendegi-api',
    'JWT_ACCESS_AUDIENCE': 'sabz-zendegi-frontends',
    'COMMERCE_RESERVATION_TTL_MINUTES': '20', 'BILLING_BOOKING_HOLD_MINUTES': '10',
    'PAYMENT_CREDENTIAL_ENCRYPTION_KEY_VERSION': 'v1',
    'SMS_CREDENTIAL_ENCRYPTION_KEY_VERSION': 'v1', 'SMS_TRANSPORT_MODE': 'disabled',
    'SMS_REQUEST_TIMEOUT_MS': '5000', 'SADAD_TRANSPORT_MODE': 'disabled',
    'SADAD_REQUEST_TIMEOUT_MS': '5000', 'SADAD_REDIRECT_PROFILE': '',
    'PRODUCT_MEDIA_STORAGE_MODE': 'disabled', 'R2_ENDPOINT': '', 'R2_BUCKET': '',
    'R2_REGION': 'auto', 'R2_REQUEST_TIMEOUT_MS': '5000',
}


class InstallationError(Exception):
    pass


def require(condition, message):
    if not condition:
        raise InstallationError(message)


def run(args, *, input=None, capture=False, sensitive=False, env=None):
    # No shell interpolation; subprocess errors never echo arguments or secret-bearing output.
    result = subprocess.run([str(arg) for arg in args], input=input, text=True,
                            stdout=subprocess.PIPE if capture or sensitive else None,
                            stderr=subprocess.PIPE if capture or sensitive else None, env=env)
    require(result.returncode == 0, f'{Path(str(args[0])).name} failed (exit {result.returncode}); step remains pending.')
    return result.stdout or ''


def atomic_write(path, content, mode=0o600):
    path = Path(path)
    require(not path.is_symlink(), f'Refusing symlink: {path}')
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix='.mushroom-', dir=path.parent)
    try:
        os.fchmod(fd, mode) if hasattr(os, 'fchmod') else None
        with os.fdopen(fd, 'w', encoding='utf-8', newline='\n') as output:
            output.write(content)
            output.flush()
            os.fsync(output.fileno())
        os.replace(temporary, path)
        os.chmod(path, mode)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def load_env(path):
    result = {}
    for line in Path(path).read_text(encoding='utf-8-sig').splitlines():
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        require('=' in line, f'Malformed setting in {path}')
        key, value = line.split('=', 1)
        require(re.fullmatch(r'[A-Z][A-Z0-9_]*', key) and key not in result, f'Invalid/duplicate setting in {path}')
        result[key] = value.strip().strip('"\'')
    return result


def hostname(value):
    value = value.strip().lower().rstrip('.')
    require(len(value) <= 253 and '.' in value and all(
        re.fullmatch(r'[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?', label)
        for label in value.split('.')), 'Enter a hostname, without scheme, port or path (ASCII/punycode).')
    return value


def database_url(value, production=False):
    require(not any(c.isspace() or c in '$\x00' for c in value), 'Database URL contains unsupported characters; URL-encode credentials.')
    try:
        parsed = urlsplit(value)
        valid = (parsed.scheme in ('postgres', 'postgresql') and parsed.hostname
                 and parsed.username and parsed.password and parsed.path not in ('', '/')
                 and not parsed.fragment and (parsed.port or 5432) > 0)
    except ValueError:
        valid = False
    require(valid, 'A complete PostgreSQL URL with encoded username/password and database is required.')
    require(not any(c in unquote(parsed.username + parsed.password + parsed.path) for c in '\r\n\x00'),
            'Database URL contains an encoded control character.')
    if production:
        require(parsed.hostname not in ('postgres', 'localhost', '127.0.0.1', '::1'), 'Production uses an external PostgreSQL service.')
        require(parse_qs(parsed.query).get('sslmode', [''])[0] in ('require', 'verify-ca', 'verify-full'),
                'Production database URL must explicitly enable TLS (sslmode=require/verify-ca/verify-full).')
    return value


def validate_policy(path, environment):
    value = json.loads(Path(path).read_text(encoding='utf-8'))
    require(value.get('schemaVersion') == 1 and value.get('policyKey') == 'MEDICAL_INTAKE_PROCESSING'
            and value.get('locale') == 'fa-IR' and type(value.get('versionNumber')) is int
            and value['versionNumber'] > 0 and isinstance(value.get('title'), str)
            and 0 < len(value['title']) <= 255 and isinstance(value.get('body'), str)
            and value['body'].strip() and environment in value.get('allowedEnvironments', []),
            'Consent document is not approved for this environment or has invalid fields.')
    require(hashlib.sha256(value['body'].encode()).hexdigest() == value.get('contentHash'), 'Consent document hash is invalid.')
    return value


def terminal_input(prompt, secret=False):
    while True:
        try:
            answer = (getpass.getpass if secret else input)(prompt)
            # Python's surrogateescape can preserve invalid terminal bytes instead of raising.
            answer.encode('utf-8', errors='strict')
            return answer
        except UnicodeError:
            print('Input could not be read as UTF-8. Set your terminal character encoding to UTF-8 '
                  'and type this answer again; no value was accepted.')


def ask(label, default='', validator=None, secret=False):
    while True:
        suffix = f' [{default}]' if default and not secret else ''
        answer = terminal_input(f'{label}{suffix}: ', secret).strip() or default
        try:
            return validator(answer) if validator else answer
        except (InstallationError, ValueError) as error:
            print(str(error))


def choice(value, options):
    require(value in options, f'Choose one of: {", ".join(options)}')
    return value


def admin_details():
    phone = ask('First administrator phone (+989...)', validator=lambda v: v if re.fullmatch(r'\+989[0-9]{9}', v) else choice(v, []))
    while True:
        password = unicodedata.normalize('NFC', terminal_input('First administrator password (15..128 characters): ', secret=True))
        if 15 <= len(password) <= 128 and password.strip() and not any(unicodedata.category(c) == 'Cc' for c in password):
            if password == unicodedata.normalize('NFC', terminal_input('Repeat password: ', secret=True)):
                break
        print('Passwords must match and meet the password policy.')
    clinic = ask('Clinic name', 'کلینیک سبز زندگی', lambda v: v if 0 < len(v) <= 160 else choice(v, []))
    return {'phone': phone, 'password': password, 'clinicName': clinic, 'timeZone': 'Asia/Tehran'}


def new_configuration():
    selected = ask('Install dev / production / both', 'both', lambda v: choice(v, ['dev', 'production', 'both']))
    environments = ['dev'] if selected == 'dev' else ['staging', 'production']
    if selected == 'both':
        environments.insert(0, 'dev')
    domain = ask('Main domain', validator=hostname)
    address = ask('Public server IPv4 address (DNS must point here)', validator=lambda v: str(ipaddress.IPv4Address(v)))
    ssh_host = ask('SSH host/IP reachable from GitHub', address,
                   lambda v: v if re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9.-]*', v) else choice(v, []))
    port = ask('SSH port already listening on the server', '22',
               lambda v: str(int(v)) if 1 <= int(v) <= 65535 else choice(v, []))
    repository = ask('Private GitHub repository (owner/name)', 'Drshirmardi/mushroom',
                     lambda v: v if re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', v) else choice(v, []))
    approver = ask('GitHub username allowed to promote production', validator=lambda v: v if re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9-]{0,38}', v) else choice(v, []))
    email = ask('Certificate contact email', validator=lambda v: v if re.fullmatch(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,63}', v) else choice(v, []))
    config = {'version': 1, 'domain': domain, 'publicIp': address, 'sshHost': ssh_host,
              'sshPort': port, 'repository': repository, 'approver': approver,
              'email': email, 'environments': {}, 'steps': {}}
    config['productionAutoDeploy'] = (ask('Production updates after successful staging', 'manual',
                                           lambda v: choice(v, ['manual', 'automatic'])) == 'automatic') if 'production' in environments else False
    for environment in environments:
        prefix = '' if environment == 'production' else f'{environment}-'
        web = domain if environment == 'production' else f'{environment}.{domain}'
        domains = {name: ask(f'{environment} {name} hostname', default, hostname)
                   for name, default in [('web', web), ('app', f'{prefix}app.{domain}'),
                                         ('dashboard', f'{prefix}dashboard.{domain}'), ('api', f'{prefix}api.{domain}')]}
        user = 'mushroom-prod' if environment == 'production' else 'mushroom-deploy'
        sms = ask(f'{environment} SMS runtime (provider credentials are configured later in Dashboard)', 'disabled',
                  lambda v: choice(v, ['disabled', 'live']))
        payment = ask(f'{environment} Sadad runtime (live requires registered callback/static outbound IP)', 'disabled',
                      lambda v: choice(v, ['disabled', 'live']))
        runtime = {'SMS_TRANSPORT_MODE': sms, 'SADAD_TRANSPORT_MODE': payment}
        if payment == 'live':
            runtime['SADAD_REDIRECT_PROFILE'] = ask('Merchant-approved Sadad redirect profile', validator=lambda v: choice(v, [
                'PDF_PURCHASE', 'PHP_VPG_PURCHASE', 'DOTNET_PURCHASE_INDEX']))
        backup = ask(f'{environment} enable daily encrypted local backup', 'yes', lambda v: choice(v, ['yes', 'no']))
        retention = ask('Keep local encrypted backups for how many days (7..365)', '14',
                        lambda v: int(v) if 7 <= int(v) <= 365 else choice(v, [])) if backup == 'yes' else 14
        pg_major = ask('PostgreSQL server major version (backup client must match)', '16',
                       lambda v: v if re.fullmatch(r'1[6-9]|[2-9][0-9]', v) else choice(v, [])) if environment == 'production' else '16'
        config['environments'][environment] = {'domains': domains, 'user': user, 'home': f'/home/{user}',
                                               'runtime': runtime, 'backupEnabled': backup == 'yes', 'pgMajor': pg_major,
                                               'backupRetentionDays': retention}
    require(len({d for e in config['environments'].values() for d in e['domains'].values()}) == 4 * len(environments), 'Environment hostnames must all be distinct.')
    return config


def write_environment(config, environment, *, base=None, owner=None, first_run=None, db_url=None, policy=None):
    spec = config['environments'][environment]
    root = Path(base) if base else Path(spec['home']) / 'mushroom' / environment
    require(not root.is_symlink(), 'Environment root must not be a symlink.')
    root.mkdir(parents=True, exist_ok=True, mode=0o700)
    secret_dir = root / 'secrets'
    require(not secret_dir.is_symlink() and not (root / 'bootstrap').is_symlink(), 'Environment directories cannot be symlinks.')
    secret_dir.mkdir(exist_ok=True, mode=0o700)
    (root / 'bootstrap').mkdir(exist_ok=True, mode=0o700)
    required_names = SECRET_NAMES + (() if environment == 'production' else ('postgres_password',))
    established = any(path.exists() for path in (secret_dir / '.initialized', root / 'state/current', root / 'bootstrap/complete'))
    if established:
        require(all((secret_dir / name).is_file() and not (secret_dir / name).is_symlink() for name in required_names),
                'An established environment has lost a secret. Restore the original file; automatic regeneration is refused.')
    defaults = dict(RUNTIME_DEFAULTS)
    template = 'dev-env.example' if environment == 'dev' else ('production-env.example' if environment == 'production' else 'env.example')
    values = load_env(BUNDLE / 'deploy/vps' / template)
    values.update(defaults)
    values.update(spec.get('runtime', {}))
    subnet = ipaddress.IPv4Network(spec.get('subnet', f'172.30.{SUBNETS[environment]}.0/24'))
    gateway = str(subnet.network_address + 1)
    values.update({'MUSHROOM_ENVIRONMENT': 'development' if environment == 'dev' else environment,
                   'COMPOSE_PROJECT_NAME': f'mushroom-{environment}', 'MUSHROOM_ENV_ROOT': str(root),
                   'TRUSTED_PROXIES': f'127.0.0.1/32,{gateway}/32'})
    for service, domain in spec['domains'].items():
        values[f'PUBLIC_{service.upper()}_URL'] = f'https://{domain}'
        values[f'{service.upper()}_PORT'] = f'127.0.0.1:{spec.get("basePort", PORTS[environment]) + {"web": 0, "app": 1, "dashboard": 2, "api": 3}[service]}'
    values['APP_ORIGINS'] = ','.join(values[f'PUBLIC_{name}_URL'] for name in ('WEB', 'APP', 'DASHBOARD'))
    values['SADAD_RETURN_URL'] = values['PUBLIC_API_URL'] + '/v1/payments/providers/sadad/callback'
    values['SADAD_RESULT_URL'] = values['PUBLIC_APP_URL'] + '/store/order-success'
    if environment != 'production':
        values.update({'POSTGRES_DB': 'mushroom_' + environment.replace('-', '_'),
                       'POSTGRES_USER': 'mushroom_' + environment.replace('-', '_'), 'POSTGRES_IMAGE': 'postgres:16-alpine'})
    if environment == 'dev':
        for unsupported in ('DEV_WEB_MEMORY', 'DEV_APP_MEMORY', 'DEV_DASHBOARD_MEMORY'):
            values.pop(unsupported, None)
        values.update({'DEV_WORKSPACE_PATH': str(root / 'workspace'), 'DEV_CACHE_PATH': str(root / 'cache'),
                       'DEV_UID': str(owner[0]) if owner else '1000', 'DEV_GID': str(owner[1]) if owner else '1000'})
        for directory in ('workspace', 'cache', 'state'):
            (root / directory).mkdir(exist_ok=True, mode=0o700)
    if not (root / 'runtime.env').exists():
        atomic_write(root / 'runtime.env', '# Generated public runtime configuration; secrets are separate.\n' +
                     ''.join(f'{key}={value}\n' for key, value in values.items()))
    else:
        values = load_env(root / 'runtime.env')
        require(values.get('MUSHROOM_ENV_ROOT') == str(root) and values.get('COMPOSE_PROJECT_NAME') == f'mushroom-{environment}', 'Existing environment belongs to a different installation.')
    generated = {name: secrets.token_urlsafe(48) for name in ('jwt_access_secret', 'refresh_token_pepper', 'otp_pepper')}
    for kind in ('sms', 'payment'):
        generated[f'{kind}_credential_encryption_key'] = base64.b64encode(secrets.token_bytes(32)).decode()
        generated[f'{kind}_credential_decryption_keys'] = ''
    if environment != 'production':
        password_path = secret_dir / 'postgres_password'
        generated['postgres_password'] = password_path.read_text().strip() if password_path.exists() else secrets.token_hex(32)
        generated['database_url'] = f'postgresql://{values["POSTGRES_USER"]}:{generated["postgres_password"]}@postgres:5432/{values["POSTGRES_DB"]}?schema=public'
    elif not (secret_dir / 'database_url').exists():
        require(db_url is not None, 'Production database URL is required.')
        generated['database_url'] = database_url(db_url, production=True)
    for name, value in generated.items():
        if not (secret_dir / name).exists():
            atomic_write(secret_dir / name, value)
    if not (secret_dir / '.initialized').exists():
        atomic_write(secret_dir / '.initialized', 'version=1\n')
    if first_run and not (root / 'bootstrap/complete').exists() and not (root / 'bootstrap/first-run.json').exists():
        atomic_write(root / 'bootstrap/first-run.json', json.dumps(first_run, ensure_ascii=False))
    if environment == 'production' and policy and not (root / 'consent-policy.json').exists():
        atomic_write(root / 'consent-policy.json', json.dumps(validate_policy(policy, environment), ensure_ascii=False))
    if not (root / 'network.yaml').exists():
        atomic_write(root / 'network.yaml', f'networks:\n  default:\n    ipam:\n      config:\n        - subnet: {subnet}\n          gateway: {gateway}\n')
    if owner:
        # Only installer-owned files; never recurse into application data or an existing workspace.
        for path in [root, secret_dir, root / 'runtime.env', root / 'network.yaml', *secret_dir.iterdir(),
                     *[root / name for name in ('workspace', 'cache', 'state', 'bootstrap', 'bootstrap/first-run.json', 'consent-policy.json') if (root / name).exists()]]:
            require(not path.is_symlink(), f'Refusing symlink: {path}')
            os.chown(path, *owner)
    return root


def install_packages():
    run(['apt-get', 'update'])
    run(['apt-get', 'install', '-y', '--no-install-recommends', 'ca-certificates', 'curl', 'gnupg',
         'jq', 'rsync', 'openssl', 'openssh-server', 'ufw', 'caddy', 'python3'])
    if shutil.which('docker') is None:
        require(not any(shutil.which(name) for name in ('dockerd', 'podman')), 'Existing container runtime needs operator review.')
        Path('/etc/apt/keyrings').mkdir(exist_ok=True, mode=0o755)
        run(['curl', '--fail', '--silent', '--show-error', '--location', '--proto', '=https',
             'https://download.docker.com/linux/ubuntu/gpg', '-o', '/etc/apt/keyrings/docker.asc'])
        os.chmod('/etc/apt/keyrings/docker.asc', 0o644)
        architecture = run(['dpkg', '--print-architecture'], capture=True).strip()
        require(architecture == 'amd64', 'Current GitHub release images require amd64.')
        atomic_write('/etc/apt/sources.list.d/docker.sources', 'Types: deb\nURIs: https://download.docker.com/linux/ubuntu\nSuites: noble\nComponents: stable\n' +
                     f'Architectures: {architecture}\nSigned-By: /etc/apt/keyrings/docker.asc\n', 0o644)
        run(['apt-get', 'update'])
        run(['apt-get', 'install', '-y', 'docker-ce', 'docker-ce-cli', 'containerd.io', 'docker-buildx-plugin', 'docker-compose-plugin'])
    if subprocess.run(['docker', 'compose', 'version'], capture_output=True).returncode != 0:
        installed = False
        for package in ('docker-compose-plugin', 'docker-compose-v2'):
            policy = run(['apt-cache', 'policy', package], capture=True, env={**os.environ, 'LC_ALL': 'C'})
            if re.search(r'Candidate:\s+(?!\(none\))\S+', policy):
                preview = run(['apt-get', '-s', 'install', package], capture=True, env={**os.environ, 'LC_ALL': 'C'})
                require(not re.search(r'^Remv ', preview, re.M), 'Compose installation would remove existing packages; current Docker engine preserved.')
                run(['apt-get', 'install', '-y', '--no-install-recommends', package])
                installed = True
                break
        require(installed, 'No compatible Compose v2 package available from configured apt repositories; existing engine preserved.')
    run(['docker', 'compose', 'version'], capture=True)
    run(['systemctl', 'enable', '--now', 'docker', 'ssh'])


def provision_user(name):
    import pwd
    try:
        account = pwd.getpwnam(name)
        require(account.pw_uid > 0 and account.pw_dir == f'/home/{name}', 'Existing deployment user has an unexpected home/UID.')
    except KeyError:
        run(['useradd', '--create-home', '--shell', '/bin/bash', name])
        account = pwd.getpwnam(name)
    run(['usermod', '-aG', 'docker', name])
    return account.pw_uid, account.pw_gid


def ssh_identity(user, owner):
    directory = STATE / 'github' / user
    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    key = directory / 'id_ed25519'
    if not key.exists() and not key.with_suffix('.pub').exists():
        run(['ssh-keygen', '-q', '-t', 'ed25519', '-N', '', '-C', f'mushroom-actions-{user}', '-f', key])
    require(key.with_suffix('.pub').exists(), 'Incomplete deployment key; restore its public half.')
    public = key.with_suffix('.pub').read_text().strip()
    ssh_dir = Path('/home') / user / '.ssh'
    ssh_dir.mkdir(mode=0o700, exist_ok=True)
    require(not ssh_dir.is_symlink(), 'SSH directory cannot be a symlink.')
    authorized = ssh_dir / 'authorized_keys'
    existing = authorized.read_text() if authorized.exists() else ''
    if public not in existing:
        atomic_write(authorized, existing.rstrip() + '\nrestrict ' + public + '\n')
    os.chmod(ssh_dir, 0o700)
    os.chown(ssh_dir, *owner)
    os.chown(authorized, *owner)


def save(config):
    atomic_write(STATE / 'installation.json', json.dumps(config, ensure_ascii=False, indent=2) + '\n')


def allocate_networks(config):
    identifiers = run(['docker', 'network', 'ls', '--quiet'], capture=True).split()
    existing = json.loads(run(['docker', 'network', 'inspect', *identifiers], capture=True)) if identifiers else []
    used = [(entry['Name'], ipaddress.ip_network(item['Subnet'])) for entry in existing
            for item in ((entry.get('IPAM') or {}).get('Config') or []) if item.get('Subnet') and ':' not in item['Subnet']]
    routes = json.loads(run(['ip', '-json', '-4', 'route', 'show'], capture=True))
    used += [('host-route', ipaddress.ip_network(route['dst'], strict=False)) for route in routes
             if route.get('dst') and route['dst'] != 'default' and not route.get('dev', '').startswith(('docker', 'br-'))]
    for environment, spec in config['environments'].items():
        preferred = spec.get('subnet', f'172.30.{SUBNETS[environment]}.0/24')
        candidates = [preferred] + [f'172.30.{number}.0/24' for number in range(40, 251)]
        for candidate in candidates:
            network = ipaddress.ip_network(candidate)
            if not any(network.overlaps(other) for name, other in used if name != f'mushroom-{environment}_default'):
                require('subnet' not in spec or spec['subnet'] == candidate, 'An installed network now overlaps another route. Existing settings preserved; review networking.')
                spec['subnet'] = candidate
                used.append((f'mushroom-{environment}_default', network))
                break
        else:
            raise InstallationError('No unused installation subnet available; review Docker/host routes.')
    save(config)


def allocate_ports(config):
    listeners = run(['ss', '-H', '-ltn'], capture=True)
    used = {int(port) for port in re.findall(r':([0-9]+)\s', listeners)}
    for environment, spec in config['environments'].items():
        root = Path(spec['home']) / 'mushroom' / environment
        if (root / 'runtime.env').exists():
            values = load_env(root / 'runtime.env')
            base = int(values['WEB_PORT'].rsplit(':', 1)[1])
            require(all(values[f'{name}_PORT'] == f'127.0.0.1:{base + offset}' for name, offset in
                        [('WEB', 0), ('APP', 1), ('DASHBOARD', 2), ('API', 3)]), 'Installed port layout is inconsistent; review runtime.env.')
        else:
            base = spec.get('basePort', PORTS[environment])
            while any(port in used for port in range(base, base + 4)):
                base += 100
                require(base + 3 <= 65535, 'No free application port block found.')
        spec['basePort'] = base
        used.update(range(base, base + 4))
    save(config)


def check_dns(config):
    missing = []
    for spec in config['environments'].values():
        for domain in spec['domains'].values():
            try:
                records = socket.getaddrinfo(domain, 443, type=socket.SOCK_STREAM)
                addresses = {item[4][0] for item in records}
                # This profile uses direct DNS; unrelated AAAA records can break ACME intermittently.
                if addresses != {config['publicIp']}:
                    missing.append(domain)
            except socket.gaierror:
                missing.append(domain)
    require(not missing, 'DNS pending: set DNS-only A records to ' + config['publicIp'] +
            '; remove unrelated AAAA/proxying for: ' + ', '.join(missing) + '. Then rerun install.')


def configure_proxy(config, directory=None):
    directory = Path(directory) if directory is not None else Path('/etc/caddy')
    target = directory / 'Caddyfile'
    site_file = directory / 'mushroom.caddy'
    import_line = f'import {site_file}'
    existing = target.read_text() if target.exists() else ''
    marker = '# Managed by mushroom installation'
    # Preserve foreign sites: require an explicit import rather than replacing their Caddyfile.
    uncommented = re.sub(r'#[^\n]*', '', existing)
    default = re.sub(r'\s+', '', uncommented) == ':80{root*/usr/share/caddyfile_server}'
    imported = import_line in uncommented
    require(not existing.strip() or default or imported,
            'Existing Caddy configuration preserved. Add `import /etc/caddy/mushroom.caddy` at top level, validate it, then rerun install.')
    sites = []
    for environment, spec in config['environments'].items():
        for service, domain in spec['domains'].items():
            offset = {'web': 0, 'app': 1, 'dashboard': 2, 'api': 3}[service]
            chat_import = f'  import /etc/caddy/mushroom-chat/{environment}/*.caddy\n' if service == 'api' else ''
            sites.append(f'{domain} {{\n  tls {config["email"]}\n  encode zstd gzip\n{chat_import}  reverse_proxy 127.0.0.1:{spec.get("basePort", PORTS[environment]) + offset}\n}}\n')
    site_content = '\n'.join(sites)
    new_main = existing if imported else marker + '\n' + import_line + '\n'
    # Validate the proposed complete config before changing either live file.
    with tempfile.TemporaryDirectory(prefix='mushroom-validate-', dir=target.parent) as temporary:
        proposed_sites = Path(temporary) / 'sites.caddy'
        proposed_main = Path(temporary) / 'Caddyfile'
        atomic_write(proposed_sites, site_content, 0o644)
        atomic_write(proposed_main, new_main.replace(import_line, f'import {proposed_sites}'), 0o644)
        run(['caddy', 'validate', '--config', proposed_main, '--adapter', 'caddyfile'], capture=True)
    if not imported:
        atomic_write(target.with_suffix('.before-mushroom'), existing, 0o600)
    atomic_write(site_file, site_content, 0o644)
    if not imported:
        atomic_write(target, new_main, 0o644)
    run(['systemctl', 'enable', '--now', 'caddy'])
    run(['systemctl', 'reload', 'caddy'])


def github_handoff(config):
    directory = STATE / 'github'
    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    host_public_key = Path('/etc/ssh/ssh_host_ed25519_key.pub').read_text().split()
    host = config['sshHost'] if config['sshPort'] == '22' else f'[{config["sshHost"]}]:{config["sshPort"]}'
    known_hosts = f'{host} {host_public_key[0]} {host_public_key[1]}\n'
    atomic_write(directory / 'known_hosts', known_hosts)
    lines = [f'Repository: https://github.com/{config["repository"]}/settings/secrets/actions',
             'Names below are exact. Secret VALUES stay in protected files; do not paste them in chat/logs.', '', 'Repository Secrets:']
    scopes = [('VPS_', 'mushroom-deploy')] if any(e != 'production' for e in config['environments']) else []
    if 'production' in config['environments']:
        scopes.append(('PRODUCTION_VPS_', 'mushroom-prod'))
    for prefix, user in scopes:
        lines.extend([f'{prefix}HOST = {config["sshHost"]}', f'{prefix}USER = {user}',
                      f'{prefix}SSH_PRIVATE_KEY = contents of {directory / user / "id_ed25519"}',
                      f'{prefix}KNOWN_HOSTS = contents of {directory / "known_hosts"}'])
    lines.extend(['', 'Repository Variables:', f'VPS_PORT = {config["sshPort"]}', f'PRODUCTION_VPS_PORT = {config["sshPort"]}',
                  f'VPS_DEV_CD_ENABLED = {str("dev" in config["environments"]).lower()}',
                  f'VPS_CD_ENABLED = {str("staging" in config["environments"]).lower()}',
                  f'PRODUCTION_CD_ENABLED = {str("production" in config["environments"]).lower()}',
                  f'PRODUCTION_AUTO_DEPLOY = {str(config.get("productionAutoDeploy", False)).lower()}',
                  f'RELEASE_APPROVER = {config["approver"]}', 'GHCR_ATTESTATIONS_ENABLED = false', '',
                  'Only enable CD flags after DNS/TLS and doctor pass. No permanent GHCR token is needed.',
                  'First dev deployment: Actions > Sync shared dev VPS > Run workflow > branch dev.',
                  'First staging deployment: push/merge the installer-enabled release to main; CI must pass.',
                  'First production deployment: Actions > Deploy production > Run workflow > accepted release_run_id.',
                  'GitHub Secrets changes do not start a workflow by themselves.',
                  'Keep packages private and grant this repository Actions access to its GHCR packages.',
                  'Transfer the private key securely, then remove its handoff copy after testing Actions SSH access.',
                  'SMS/payment remain disabled until separately configured and enabled in the Dashboard.',
                  'Production media remains disabled by the existing application release policy.',
                  'Provider backup/PITR and off-site encrypted backup/key custody still require operational acceptance.'])
    report = '\n'.join(lines) + '\n'
    atomic_write(directory / 'GITHUB-SETUP.txt', report)
    print(report)


def firewall(config):
    ports = run(['ss', '-H', '-ltnp'], capture=True)
    daemon = run(['sshd', '-T'], capture=True)
    socket_ports = run(['systemctl', 'show', 'ssh.socket', '--property', 'Listen', '--value'], capture=True)
    configured = set(re.findall(r'^port ([0-9]+)$', daemon, re.M))
    configured.update(re.findall(r':([0-9]+)\b', socket_ports))
    for line in ports.splitlines():
        if '"sshd"' in line:
            match = re.search(r':([0-9]+)\s', line)
            if match:
                configured.add(match.group(1))
    require(config['sshPort'] in configured and re.search(rf':{re.escape(config["sshPort"])}\s', ports),
            'Selected SSH port is not a listening SSH service; firewall unchanged. Correct sshPort in installation.json or rerun configure.')
    for port in sorted(configured | {'80', '443'}):
        # Preserve every known sshd/socket port before enabling UFW, including the current management path.
        run(['ufw', 'allow', f'{port}/tcp'], capture=True)
    run(['ufw', '--force', 'enable'], capture=True)


def install(config):
    steps = config['steps']
    if not steps.get('packages'):
        for line in run(['ss', '-H', '-ltnp'], capture=True).splitlines():
            if re.search(r':(?:80|443)\s', line):
                require('"caddy"' in line, 'Ports 80/443 are used by another service. Existing service preserved; review the proxy before installing.')
        needed_gib = 4 if 'dev' in config['environments'] else 2
        memory_kib = int(re.search(r'MemTotal:\s+(\d+)', Path('/proc/meminfo').read_text()).group(1))
        # Nominal VPS RAM can exceed MemTotal due to unit conversion and reserved memory.
        minimum_kib = needed_gib * 1024 * 1024 * 9 // 10
        require(memory_kib >= minimum_kib,
                f'This profile requires a {needed_gib} GiB-class server '
                f'(minimum visible RAM: {minimum_kib / 1024**2:.2f} GiB; detected: {memory_kib / 1024**2:.2f} GiB).')
        require(shutil.disk_usage('/').free >= 10 * 1024**3, 'At least 10 GiB free disk is required.')
        print('Installing host prerequisites...')
        install_packages()
        steps['packages'] = True
        save(config)
    persist_bundle()
    allocate_networks(config)
    allocate_ports(config)
    for environment, spec in config['environments'].items():
        owner = provision_user(spec['user'])
        ssh_identity(spec['user'], owner)
        root = Path(spec['home']) / 'mushroom' / environment
        first_run = None
        if not (root / 'bootstrap/first-run.json').exists() and not (root / 'bootstrap/complete').exists():
            print(f'{environment}: configure the first administrator (no demonstration data).')
            first_run = admin_details()
        db = None
        policy = None
        if environment == 'production':
            if not (root / 'secrets/database_url').exists():
                db = ask('External production PostgreSQL URL (hidden)', secret=True,
                         validator=lambda v: database_url(v, production=True))
            if not (root / 'consent-policy.json').exists():
                policy = ask('Absolute path to approved production consent-policy JSON',
                             validator=lambda v: str(Path(v).resolve()) if validate_policy(v, 'production') else '')
        write_environment(config, environment, owner=owner, first_run=first_run, db_url=db, policy=policy)
        configure_backups(config, environment)
    # The current SSH port must already be listening; never edit sshd or close the current SSH session.
    firewall(config)
    github_handoff(config)
    check_dns(config)
    configure_proxy(config)
    steps['serverReady'] = True
    save(config)
    print('Server preparation complete. Run doctor, add the handoff values in GitHub, then dispatch the first deployment.')


def configure(config, environment=None):
    candidate = json.loads(json.dumps(config))
    candidate['sshHost'] = ask('SSH host/IP reachable from GitHub', config['sshHost'],
                               lambda v: v if re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9.-]*', v) else choice(v, []))
    candidate['sshPort'] = ask('Existing listening SSH port', config['sshPort'],
                               lambda v: str(int(v)) if 1 <= int(v) <= 65535 else choice(v, []))
    if environment:
        require(environment in candidate['environments'], 'Select an installed environment.')
        spec = candidate['environments'][environment]
        root = Path(spec['home']) / 'mushroom' / environment
        require((root / 'runtime.env').exists(), 'Finish initial environment preparation first.')
        values = load_env(root / 'runtime.env')
        for service, domain in spec['domains'].items():
            spec['domains'][service] = ask(f'{environment} {service} hostname', domain, hostname)
        values['LOG_LEVEL'] = ask('Log level', values.get('LOG_LEVEL', 'info'), lambda v: choice(v, ['fatal', 'error', 'warn', 'info', 'debug', 'trace']))
        for key in ('SMS_TRANSPORT_MODE', 'SADAD_TRANSPORT_MODE'):
            values[key] = ask(key + ' (provider credentials/enable remain in Dashboard)', values.get(key, 'disabled'), lambda v: choice(v, ['disabled', 'live']))
        if values['SADAD_TRANSPORT_MODE'] == 'live':
            values['SADAD_REDIRECT_PROFILE'] = ask('Merchant-approved Sadad redirect profile', values.get('SADAD_REDIRECT_PROFILE', ''),
                                                  lambda v: choice(v, ['PDF_PURCHASE', 'PHP_VPG_PURCHASE', 'DOTNET_PURCHASE_INDEX']))
        spec['runtime'] = {name: values[name] for name in ('LOG_LEVEL', 'SMS_TRANSPORT_MODE', 'SADAD_TRANSPORT_MODE', 'SADAD_REDIRECT_PROFILE')}
        media = {}
        if environment == 'dev':
            values['PRODUCT_MEDIA_STORAGE_MODE'] = ask('Development product media', values.get('PRODUCT_MEDIA_STORAGE_MODE', 'disabled'), lambda v: choice(v, ['disabled', 'r2']))
            if values['PRODUCT_MEDIA_STORAGE_MODE'] == 'r2':
                values['R2_ENDPOINT'] = ask('R2 HTTPS endpoint', values.get('R2_ENDPOINT', ''),
                                          lambda v: v if urlsplit(v).scheme == 'https' and urlsplit(v).hostname and not urlsplit(v).username else choice(v, []))
                values['R2_BUCKET'] = ask('R2 bucket', values.get('R2_BUCKET', ''), lambda v: v if re.fullmatch(r'[a-z0-9][a-z0-9-]{1,61}[a-z0-9]', v) else choice(v, []))
                for name in ('r2_access_key_id', 'r2_secret_access_key'):
                    existing = root / 'secrets' / name
                    replace = not existing.exists() or ask(f'Replace existing {name}', 'no', lambda v: choice(v, ['yes', 'no'])) == 'yes'
                    if replace:
                        media[name] = ask(name + ' (hidden)', secret=True, validator=lambda v: v if v and not any(c.isspace() for c in v) else choice(v, []))
        domains = [domain for item in candidate['environments'].values() for domain in item['domains'].values()]
        require(len(domains) == len(set(domains)), 'Environment hostnames must all be distinct.')
        check_dns(candidate)
        for service, domain in spec['domains'].items():
            values[f'PUBLIC_{service.upper()}_URL'] = 'https://' + domain
        values['APP_ORIGINS'] = ','.join(values[f'PUBLIC_{key}_URL'] for key in ('WEB', 'APP', 'DASHBOARD'))
        values['SADAD_RETURN_URL'] = values['PUBLIC_API_URL'] + '/v1/payments/providers/sadad/callback'
        values['SADAD_RESULT_URL'] = values['PUBLIC_APP_URL'] + '/store/order-success'
        owner = (root.stat().st_uid, root.stat().st_gid)
        atomic_write(root / 'runtime.env', ''.join(f'{key}={value}\n' for key, value in values.items()))
        os.chown(root / 'runtime.env', *owner)
        for name, value in media.items():
            atomic_write(root / 'secrets' / name, value)
            os.chown(root / 'secrets' / name, *owner)
    save(candidate)
    if candidate['steps'].get('serverReady'):
        firewall(candidate)
        configure_proxy(candidate)
    github_handoff(candidate)
    print('Configuration saved. Rerun install if preparation is pending, then run the corresponding GitHub workflow to apply runtime changes.')


def compose_command(config, environment):
    spec = config['environments'][environment]
    root = Path(spec['home']) / 'mushroom' / environment
    if environment == 'dev':
        compose = root / 'workspace/deploy/vps/compose.dev.yaml'
        env = root / 'runtime.env'
    else:
        state = root / 'state/current'
        require(state.exists(), f'{environment}: awaiting first successful GitHub deployment.')
        release = Path(state.read_text().strip()).resolve()
        require(release.is_relative_to((root / 'releases').resolve()), 'Release state points outside this environment.')
        compose, env = release / 'compose.yaml', release / 'release.env'
    require(compose.is_file(), f'{environment}: awaiting first GitHub deployment.')
    args = ['runuser', '-u', spec['user'], '--', 'docker', 'compose', '--project-name', f'mushroom-{environment}',
            '--env-file', env, '--file', compose]
    if (root / 'network.yaml').exists():
        args.extend(['--file', root / 'network.yaml'])
    if (root / 'chat.compose.yaml').exists():
        args.extend(['--file', root / 'chat.compose.yaml'])
    return args


def doctor(config, deployed=False):
    run(['docker', 'version'], capture=True)
    run(['docker', 'compose', 'version'], capture=True)
    check_dns(config)
    require(config['steps'].get('serverReady'), 'Server preparation incomplete; rerun install.')
    for environment, spec in config['environments'].items():
        root = Path(spec['home']) / 'mushroom' / environment
        values = load_env(root / 'runtime.env')
        require(all((root / 'secrets' / name).is_file() for name in SECRET_NAMES), f'{environment}: missing secret file.')
        for name in ('jwt_access_secret', 'refresh_token_pepper', 'otp_pepper'):
            require(re.fullmatch(r'[A-Za-z0-9_-]{43,256}', (root / 'secrets' / name).read_text().strip()), f'{environment}: invalid {name}.')
        require(len({(root / 'secrets' / name).read_text().strip() for name in ('jwt_access_secret', 'refresh_token_pepper', 'otp_pepper')}) == 3,
                f'{environment}: authentication secrets must be independent.')
        run(['runuser', '-u', spec['user'], '--', 'docker', 'info'], capture=True)
        for domain in spec['domains'].values():
            try:
                with socket.create_connection((domain, 443), timeout=10) as connection:
                    with ssl.create_default_context().wrap_socket(connection, server_hostname=domain):
                        pass
            except (OSError, ssl.SSLError):
                raise InstallationError(f'{domain}: HTTPS certificate not ready; check DNS/firewall/Caddy and rerun doctor.') from None
        if environment == 'production':
            database_url((root / 'secrets/database_url').read_text().strip(), True)
            validate_policy(root / 'consent-policy.json', 'production')
            with pg_client(config, environment) as (command, connection):
                version = run(command + ['psql', *connection, '-At', '-v', 'ON_ERROR_STOP=1', '-c', 'SHOW server_version_num'],
                              capture=True, sensitive=True)
            require(version.strip().isdigit() and int(version.strip()) >= 160000, 'External PostgreSQL must be version 16 or newer.')
        print(f'{environment}: configuration ready' + ('; awaiting first CD' if not (root / 'state/current').exists() and environment != 'dev' else ''))
        if deployed:
            for name, domain in spec['domains'].items():
                path = '/v1/health/ready' if name == 'api' else '/'
                with urlopen(f'https://{domain}{path}', timeout=15) as response:
                    require(response.status == 200, f'{environment}: {name} HTTPS probe failed.')
            print(f'{environment}: external HTTPS probes passed')


def audit_environment(repository, current=False):
    """Print key names only; actual local .env values never leave this process."""
    repository = Path(repository)
    schema = repository / 'apps/api/src/config/environment.validation.ts'
    keys = set(re.findall(r'^  ([A-Z][A-Z0-9_]*):', schema.read_text(encoding='utf-8'), re.M))
    example = load_env(repository / 'apps/api/.env.example')
    missing = keys - example.keys()
    require(not missing, 'API example lacks schema keys: ' + ', '.join(sorted(missing)))
    for relative in ('deploy/vps/compose.dev.yaml', 'deploy/vps/compose.yaml', 'compose.production.example.yaml'):
        source = (repository / relative).read_text(encoding='utf-8') + '\n' + (repository / 'deploy/ejabberd/compose.yaml').read_text(encoding='utf-8')
        secret_keys = {name.upper() for name in SECRET_NAMES}
        absent = [key for key in keys - {'NODE_ENV', 'PORT'} if not re.search(rf'\b{key}(?:_FILE)?\b', source)
                  and not (relative.endswith('compose.dev.yaml') and key in secret_keys
                           and re.search(rf'\b{key.lower()}\b', source))]
        require(not absent, f'{relative} lacks API settings: ' + ', '.join(sorted(absent)))
    for app in ('web', 'app', 'dashboard'):
        template = load_env(repository / f'apps/{app}/.env.example')
        require(all(key.startswith('PUBLIC_') for key in template), f'{app}: frontend template must contain public settings only.')
    print(f'Environment contract: all {len(keys)} API keys and three frontend examples covered.')
    if current:
        for app in ('api', 'web', 'app', 'dashboard'):
            path = repository / f'apps/{app}/.env'
            if not path.exists():
                print(f'{app}: .env absent (not modified).')
                continue
            values = load_env(path)
            template = load_env(repository / f'apps/{app}/.env.example')
            print(f'{app}: absent keys: ' + (', '.join(sorted(template.keys() - values.keys())) or 'none'))
            if app == 'api':
                invalid = [name for name in ('JWT_ACCESS_SECRET', 'REFRESH_TOKEN_PEPPER', 'OTP_PEPPER')
                           if not re.fullmatch(r'[A-Za-z0-9_-]{43,256}', values.get(name, ''))]
                print('api: missing/invalid required auth keys: ' + (', '.join(invalid) or 'none'))


def persist_bundle():
    destination = Path('/opt/mushroom-installer')
    if BUNDLE != destination:
        for name in ('installation/install.sh', 'installation/manager.py', 'installation/README.md',
                     'deploy/vps/dev-env.example', 'deploy/vps/env.example', 'deploy/vps/production-env.example'):
            atomic_write(destination / name, (BUNDLE / name).read_text(encoding='utf-8'), 0o755 if name.endswith('.sh') else 0o644)
    atomic_write('/usr/local/sbin/mushroom', '#!/usr/bin/env bash\nset -Eeuo pipefail\nexec python3 -X utf8 /opt/mushroom-installer/installation/manager.py "$@"\n', 0o755)


def configure_backups(config, environment):
    spec = config['environments'][environment]
    if not spec.get('backupEnabled'):
        return
    if shutil.which('age') is None:
        run(['apt-get', 'install', '-y', '--no-install-recommends', 'age'])
    key_dir = STATE / 'backup-keys'
    key_dir.mkdir(exist_ok=True, mode=0o700)
    key = key_dir / f'{environment}.key'
    recipient_file = key_dir / f'{environment}.recipient'
    if not key.exists():
        prior_backups = Path('/var/backups/mushroom') / environment
        require(not recipient_file.exists() and not any(prior_backups.glob('*.dump.age')),
                'Backup private key is missing. Restore its original off-site copy; key regeneration is refused.')
        run(['age-keygen', '-o', key], sensitive=True)
        os.chmod(key, 0o600)
    if not recipient_file.exists():
        atomic_write(recipient_file, run(['age-keygen', '-y', key], capture=True).strip() + '\n')
    backup_dir = Path('/var/backups/mushroom') / environment
    backup_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
    unit = f'mushroom-backup-{environment}'
    atomic_write(f'/etc/systemd/system/{unit}.service', '[Unit]\nDescription=Mushroom encrypted database backup\nAfter=docker.service network-online.target\n'
                 f'[Service]\nType=oneshot\nUMask=0077\nExecStart=/usr/local/sbin/mushroom backup --environment {environment}\n', 0o644)
    atomic_write(f'/etc/systemd/system/{unit}.timer', '[Unit]\nDescription=Daily Mushroom database backup\n[Timer]\nOnCalendar=*-*-* 03:00:00 UTC\nRandomizedDelaySec=30m\nPersistent=true\n[Install]\nWantedBy=timers.target\n', 0o644)
    run(['systemctl', 'daemon-reload'])
    run(['systemctl', 'enable', '--now', unit + '.timer'])


@contextmanager
def pg_client(config, environment, target=None):
    spec = config['environments'][environment]
    if environment != 'production' and target is None:
        values = load_env(Path(spec['home']) / 'mushroom' / environment / 'runtime.env')
        yield compose_command(config, environment) + ['exec', '-T', 'postgres'], ['--username', values['POSTGRES_USER'], '--dbname', values['POSTGRES_DB']]
        return
    source = Path(spec['home']) / 'mushroom' / environment / 'secrets/database_url'
    parsed = urlsplit(database_url(target if target is not None else source.read_text().strip(), production=environment == 'production'))
    query = parse_qs(parsed.query)
    require(not set(query) - {'sslmode', 'schema', 'connection_limit', 'pool_timeout', 'connect_timeout', 'pgbouncer'},
            'Backup client URL contains unsupported options; configure provider backup access explicitly.')
    settings = {'PGHOST': parsed.hostname, 'PGPORT': str(parsed.port or 5432), 'PGDATABASE': unquote(parsed.path[1:]),
                'PGUSER': unquote(parsed.username), 'PGPASSWORD': unquote(parsed.password),
                'PGSSLMODE': query.get('sslmode', ['prefer'])[0], 'PGCONNECT_TIMEOUT': '15'}
    fd, temporary = tempfile.mkstemp(prefix='pg-client-', dir=STATE)
    os.close(fd)
    try:
        atomic_write(temporary, ''.join(f'{key}={value}\n' for key, value in settings.items()))
        yield ['docker', 'run', '--rm', '-i', '--network', 'host', '--env-file', temporary,
               f'postgres:{spec.get("pgMajor", "16")}-alpine'], []
    finally:
        Path(temporary).unlink(missing_ok=True)


def binary_pipeline(left, right):
    # Both error streams are private temporary files, so a noisy failing process cannot deadlock the pipe.
    with tempfile.TemporaryFile() as left_errors, tempfile.TemporaryFile() as right_errors:
        producer = subprocess.Popen([str(arg) for arg in left], stdout=subprocess.PIPE, stderr=left_errors)
        try:
            consumer = subprocess.Popen([str(arg) for arg in right], stdin=producer.stdout,
                                        stdout=subprocess.DEVNULL, stderr=right_errors)
            producer.stdout.close()
            consumer_status = consumer.wait()
            producer_status = producer.wait()
            require(producer_status == 0 and consumer_status == 0, 'Backup/restore pipeline failed; no successful result recorded.')
        finally:
            if producer.poll() is None:
                producer.kill()
                producer.wait()


def backup(config, environment):
    key = STATE / 'backup-keys' / f'{environment}.key'
    require(key.is_file(), 'Enable backups during installation first.')
    recipient = run(['age-keygen', '-y', key], capture=True).strip()
    directory = Path('/var/backups/mushroom') / environment
    filename = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + secrets.token_hex(4) + '.dump.age'
    destination = directory / filename
    temporary = directory / (filename + '.partial')
    try:
        with pg_client(config, environment) as (command, connection):
            binary_pipeline(command + ['pg_dump', '--format=custom', '--no-owner', '--no-acl', *connection],
                            ['age', '--recipient', recipient, '--output', temporary])
        os.chmod(temporary, 0o600)
        os.replace(temporary, destination)
        atomic_write(directory / 'last-success', datetime.now(timezone.utc).isoformat() + '\n')
        cutoff = datetime.now(timezone.utc).timestamp() - int(config['environments'][environment].get('backupRetentionDays', 14)) * 86400
        for previous in directory.glob('*.dump.age'):
            if previous != destination and not previous.is_symlink() and previous.is_file() \
                    and re.fullmatch(r'[0-9]{8}T[0-9]{6}Z-[a-f0-9]{8}\.dump\.age', previous.name) and previous.stat().st_mtime < cutoff:
                previous.unlink()
        print(f'Encrypted logical backup: {destination}. Keep an off-site copy and a separate copy of the age key.')
    finally:
        temporary.unlink(missing_ok=True)


def restore(config, environment, archive, target_file):
    require(archive and target_file, 'Restore needs --archive and --target-url-file for an empty *_restore_test database.')
    target = Path(target_file).read_text().strip()
    parsed = urlsplit(database_url(target, production=environment == 'production'))
    require(re.fullmatch(r'[a-z][a-z0-9_]*_restore_test', unquote(parsed.path[1:])), 'Restore target database name must end in _restore_test.')
    original = Path(config['environments'][environment]['home']) / 'mushroom' / environment / 'secrets/database_url'
    current = urlsplit(original.read_text().strip())
    require((parsed.hostname, parsed.port or 5432, unquote(parsed.path)) != (current.hostname, current.port or 5432, unquote(current.path)), 'Restore cannot target the source database.')
    key = STATE / 'backup-keys' / f'{environment}.key'
    require(key.is_file() and Path(archive).is_file(), 'Backup archive or decryption key is missing.')
    with pg_client(config, environment, target) as (command, connection):
        count = run(command + ['psql', *connection, '-At', '-v', 'ON_ERROR_STOP=1', '-c',
                    "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema' AND c.relkind IN ('r','p','S','v','m','f')"], capture=True, sensitive=True)
        require(count.strip() == '0', 'Restore target is not empty; no data was changed.')
        binary_pipeline(['age', '--decrypt', '--identity', key, archive],
                        command + ['pg_restore', *connection, '--single-transaction', '--exit-on-error', '--no-owner', '--no-acl'])
    print('Restore drill completed in the separate empty test database. Production was not changed.')


@contextmanager
def lock():
    import fcntl
    STATE.mkdir(parents=True, exist_ok=True, mode=0o700)
    with (STATE / 'installation.lock').open('a') as handle:
        try:
            fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise InstallationError('Another manager operation is running.') from None
        yield


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['install', 'configure', 'doctor', 'verify', 'github', 'status', 'logs', 'restart', 'backup', 'restore', 'audit-env'])
    parser.add_argument('--environment', choices=ENVIRONMENTS)
    parser.add_argument('--repository', default=str(BUNDLE))
    parser.add_argument('--current', action='store_true', help='Audit existing .env key names without displaying values')
    parser.add_argument('--archive', help='Encrypted .dump.age backup to restore into a separate test database')
    parser.add_argument('--target-url-file', help='Protected file containing the empty restore-test database URL')
    args = parser.parse_args()
    if args.command == 'audit-env':
        audit_environment(args.repository, args.current)
        return
    require(sys.platform == 'linux' and os.geteuid() == 0, 'Run this manager as root on Ubuntu 24.04 (sudo).')
    require(os.uname().machine == 'x86_64', 'Current GitHub release images require an x86_64/amd64 host.')
    require('VERSION_ID="24.04"' in Path('/etc/os-release').read_text() and 'ID=ubuntu' in Path('/etc/os-release').read_text(),
            'Only Ubuntu 24.04 is supported.')
    with lock():
        path = STATE / 'installation.json'
        if path.exists():
            config = json.loads(path.read_text())
            require(config.get('version') == 1, 'Unsupported installation state version.')
        else:
            require(args.command == 'install', 'Run install first.')
            config = new_configuration()
            save(config)
        if args.command == 'install':
            install(config)
        elif args.command == 'configure':
            configure(config, args.environment)
        elif args.command in ('doctor', 'verify'):
            doctor(config, args.command == 'verify')
        elif args.command == 'github':
            github_handoff(config)
        else:
            require(args.environment in config['environments'], 'Select an installed --environment.')
            if args.command == 'backup':
                backup(config, args.environment)
                return
            if args.command == 'restore':
                restore(config, args.environment, args.archive, args.target_url_file)
                return
            command = compose_command(config, args.environment)
            command.extend({'status': ['ps'], 'logs': ['logs', '--tail', '100'], 'restart': ['restart']}[args.command])
            run(command)


def failure_message(error):
    if isinstance(error, InstallationError):
        return str(error)
    if isinstance(error, KeyboardInterrupt):
        return 'Installation interrupted. Rerun install to resume saved steps.'
    if isinstance(error, EOFError):
        return 'Terminal input ended. Reconnect your SSH terminal and rerun install interactively.'
    trace = error.__traceback__
    while trace and trace.tb_next:
        trace = trace.tb_next
    location = f'{Path(trace.tb_frame.f_code.co_filename).name}:{trace.tb_lineno}' if trace else 'unknown location'
    number = f', errno={error.errno}' if isinstance(error, OSError) and error.errno is not None else ''
    # Exception messages and locals may contain passwords, URLs or raw undecodable secret bytes.
    return f'Operation failed ({type(error).__name__}{number}, {location}). Rerun install to resume saved steps; report this error code/location if it repeats.'


def cli():
    try:
        main()
    except (Exception, KeyboardInterrupt) as error:
        print(failure_message(error), file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    cli()
