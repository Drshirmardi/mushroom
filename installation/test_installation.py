import base64
from contextlib import redirect_stderr, redirect_stdout
import hashlib
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tarfile
import tempfile
import time
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build
import manager


class InstallationTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='mushroom-installer-test-')
        self.root = Path(self.temporary.name)
        self.config = {'repository': 'owner/private-repo', 'sshHost': '203.0.113.2', 'sshPort': '2222',
                       'publicIp': '203.0.113.2', 'email': 'ops@example.test', 'steps': {},
                       'environments': {name: {
                           'user': 'mushroom-prod' if name == 'production' else 'mushroom-deploy',
                           'home': str(self.root / name),
                           'domains': {service: f'{name}-{service}.example.test' for service in ['api', 'web', 'app', 'dashboard']},
                       } for name in ['dev', 'staging', 'production']}}

    def tearDown(self):
        self.temporary.cleanup()

    def write(self, environment, **kwargs):
        return manager.write_environment(self.config, environment, base=self.root / environment, **kwargs)

    def test_storage_profiles_collect_only_selected_hidden_credentials(self):
        for mode, prefix, region in [('r2', 'R2', 'auto'), ('arvancloud', 'ARVAN', 'default')]:
            with self.subTest(mode=mode):
                root = self.write('dev')
                original = (root / 'runtime.env').read_bytes()
                answers = [mode, 'https://s3.example.test', 'private-bucket']
                if mode == 'arvancloud':
                    answers.append(region)
                answers += ['5000', 'synthetic-key', 'synthetic-secret']
                with patch('manager.ask', side_effect=answers) as prompts:
                    values, credentials = manager.media_configuration(manager.load_env(root / 'runtime.env'), root)
                self.assertEqual(values['PRODUCT_MEDIA_STORAGE_MODE'], mode)
                self.assertEqual(values[f'{prefix}_REGION'], region)
                self.assertEqual(credentials, {f'{prefix.lower()}_access_key_id': 'synthetic-key',
                                               f'{prefix.lower()}_secret_access_key': 'synthetic-secret'})
                self.assertTrue(all(call.kwargs.get('secret') for call in prompts.call_args_list[-2:]))
                self.assertNotIn('synthetic-secret', json.dumps(values))
                self.assertEqual((root / 'runtime.env').read_bytes(), original)

    def test_storage_switch_requires_transfer_confirmation_before_any_write(self):
        root = self.write('dev')
        values = manager.load_env(root / 'runtime.env')
        values['PRODUCT_MEDIA_STORAGE_MODE'] = 'r2'
        original = (root / 'runtime.env').read_bytes()
        with patch('manager.ask', side_effect=['arvancloud', 'no']), self.assertRaises(manager.InstallationError):
            manager.media_configuration(values, root)
        self.assertEqual((root / 'runtime.env').read_bytes(), original)
        self.assertEqual(values['PRODUCT_MEDIA_STORAGE_MODE'], 'r2')

    def test_disabling_storage_retains_existing_profiles_and_keys(self):
        root = self.write('dev')
        key = root / 'secrets/r2_access_key_id'
        key.write_text('retained-key')
        values = {**manager.load_env(root / 'runtime.env'), 'PRODUCT_MEDIA_STORAGE_MODE': 'r2', 'R2_BUCKET': 'retained-bucket'}
        with patch('manager.ask', return_value='disabled'):
            result, credentials = manager.media_configuration(values, root)
        self.assertEqual(result['R2_BUCKET'], 'retained-bucket')
        self.assertEqual(credentials, {})
        self.assertEqual(key.read_text(), 'retained-key')

    def test_storage_rejects_symlink_secret_and_nondev_configuration(self):
        with self.assertRaises(manager.InstallationError):
            manager.configure_storage(self.config, 'production')
        root = self.write('dev')
        if not hasattr(os, 'symlink') or os.name != 'posix':
            return
        target = self.root / 'unrelated-secret'
        target.write_text('preserve')
        (root / 'secrets/arvan_access_key_id').symlink_to(target)
        with patch('manager.ask', side_effect=['arvancloud', 'https://s3.example.test', 'private-bucket', 'default', '5000']), self.assertRaises(manager.InstallationError):
            manager.media_configuration(manager.load_env(root / 'runtime.env'), root)
        self.assertEqual(target.read_text(), 'preserve')

    def test_bad_terminal_bytes_retry_without_accepting_or_printing_them(self):
        bad_bytes = UnicodeDecodeError('utf-8', b'private\xffvalue', 7, 8, 'invalid start byte')
        for secret, target in [(False, 'builtins.input'), (True, 'manager.getpass.getpass')]:
            with self.subTest(secret=secret), patch(target, side_effect=[bad_bytes, '\udcff', 'live']) as reader, redirect_stdout(io.StringIO()) as output:
                self.assertEqual(manager.ask('Runtime', 'disabled', lambda v: manager.choice(v, ['disabled', 'live']), secret), 'live')
                self.assertEqual(reader.call_count, 3)
                self.assertEqual(output.getvalue().count('no value was accepted'), 2)
                self.assertNotIn('private', output.getvalue())

    def test_password_input_recovery_preserves_spaces_and_normalizes_confirmation(self):
        password = '  رمز مدیر ' + 'e\u0301' + ' طولانی  '
        with patch('manager.ask', side_effect=['+989100000001', 'کلینیک']), patch('manager.getpass.getpass', side_effect=[
            UnicodeDecodeError('utf-8', b'\xff', 0, 1, 'invalid start byte'), password, password.replace('e\u0301', '\u00e9'),
        ]), redirect_stdout(io.StringIO()) as output:
            details = manager.admin_details()
        self.assertEqual(details['password'], password.replace('e\u0301', '\u00e9'))
        self.assertNotIn(password, output.getvalue())

    @unittest.skipUnless(os.name == 'posix', 'Requires Linux pseudo-terminal')
    def test_actual_terminal_recovers_invalid_bytes_for_visible_and_hidden_answers(self):
        import select
        for secret in (False, True):
            with self.subTest(secret=secret):
                master, slave = os.openpty()
                answer = 'پاسخ فارسی طولانی با فاصله'
                command = [sys.executable, '-X', 'utf8', '-c',
                           'import sys, hashlib, fcntl, termios; fcntl.ioctl(0, termios.TIOCSCTTY, 0); '
                           f'sys.path.insert(0, {str(Path(manager.__file__).parent)!r}); '
                           f'import manager; value = manager.terminal_input("value: ", secret={secret}); '
                           'print("HASH=" + hashlib.sha256(value.encode()).hexdigest())']
                child = subprocess.Popen(command, stdin=slave, stdout=slave, stderr=slave, start_new_session=True)
                os.close(slave)
                output = b''
                def receive(marker):
                    nonlocal output
                    deadline = time.monotonic() + 10
                    while marker not in output:
                        remaining = deadline - time.monotonic()
                        if remaining <= 0 or not select.select([master], [], [], remaining)[0]:
                            self.fail('Terminal did not produce expected prompt')
                        output += os.read(master, 65536)
                try:
                    receive(b'value: ')
                    os.write(master, b'\xff\n')
                    receive(b'no value was accepted.')
                    # Wait for the retry prompt before sending a secret so echo is already disabled.
                    receive(b'no value was accepted.\r\nvalue: ')
                    os.write(master, answer.encode('utf-8') + b'\n')
                    receive(b'HASH=' + hashlib.sha256(answer.encode()).hexdigest().encode())
                    self.assertEqual(child.wait(timeout=10), 0)
                    if secret:
                        self.assertNotIn(answer.encode(), output)
                finally:
                    if child.poll() is None:
                        child.kill()
                    child.wait()
                    os.close(master)

    def test_failure_messages_identify_location_without_exception_values(self):
        for error in [ValueError('private-token'), PermissionError(13, 'private-token', '/private/password'),
                      UnicodeDecodeError('utf-8', b'private\xfftoken', 7, 8, 'invalid start byte')]:
            try:
                raise error
            except Exception as raised:
                message = manager.failure_message(raised)
            self.assertIn(type(error).__name__, message)
            self.assertIn('test_installation.py:', message)
            self.assertNotIn('private', message)
        self.assertIn('errno=13', manager.failure_message(PermissionError(13, 'private-token')))
        self.assertIn('interactively', manager.failure_message(EOFError()))
        self.assertIn('interrupted', manager.failure_message(KeyboardInterrupt()))

    def test_terminal_eof_and_interrupt_do_not_loop(self):
        for error in (EOFError(), KeyboardInterrupt()):
            with patch('builtins.input', side_effect=error) as reader:
                with self.assertRaises(type(error)):
                    manager.ask('Runtime')
                self.assertEqual(reader.call_count, 1)

    def test_dev_configuration_recovers_encoding_error_and_accepts_no_backup(self):
        answers = ['dev', UnicodeDecodeError('utf-8', b'\xff', 0, 1, 'invalid start byte'),
                   'example.test', '203.0.113.2', '', '', '', 'owner', 'ops@example.test',
                   '', '', '', '', 'live', 'live', 'PHP_VPG_PURCHASE', 'no']
        with patch('builtins.input', side_effect=answers), redirect_stdout(io.StringIO()):
            config = manager.new_configuration()
        self.assertEqual(list(config['environments']), ['dev'])
        self.assertFalse(config['environments']['dev']['backupEnabled'])
        self.assertEqual(config['environments']['dev']['runtime']['SADAD_REDIRECT_PROFILE'], 'PHP_VPG_PURCHASE')

    def test_memory_preflight_accepts_nominal_vps_ram_and_retains_lower_boundary(self):
        class PackageStepReached(Exception):
            pass
        for environments, nominal in [(['dev'], 4), (['staging', 'production'], 2)]:
            cutoff = nominal * 1024 * 1024 * 9 // 10
            for visible, accepted in [(int(nominal * .95 * 1024**2), True),
                                      (nominal * 1_000_000_000 // 1024, True),
                                      (cutoff, True), (cutoff - 1, False),
                                      (int(nominal * .5 * 1024**2), False)]:
                with self.subTest(environments=environments, visible=visible):
                    config = {'steps': {}, 'environments': dict.fromkeys(environments, {})}
                    with patch('manager.run', return_value=''), patch.object(Path, 'read_text', return_value=f'MemTotal: {visible} kB\n'), \
                            patch('manager.shutil.disk_usage') as disk, \
                            patch('manager.install_packages', side_effect=PackageStepReached) as packages, redirect_stdout(io.StringIO()):
                        disk.return_value.free = 20 * 1024**3
                        with self.assertRaises(PackageStepReached if accepted else manager.InstallationError) as raised:
                            manager.install(config)
                        self.assertEqual(packages.called, accepted)
                        if not accepted:
                            self.assertIn(f'{nominal} GiB-class', str(raised.exception))
                            self.assertIn('detected:', str(raised.exception))
                        self.assertEqual(config['steps'], {})

    def test_memory_allowance_does_not_bypass_free_disk_guard(self):
        with patch('manager.run', return_value=''), patch.object(Path, 'read_text', return_value='MemTotal: 3984588 kB\n'), \
                patch('manager.shutil.disk_usage') as disk, patch('manager.install_packages') as packages:
            disk.return_value.free = 9 * 1024**3
            with self.assertRaisesRegex(manager.InstallationError, '10 GiB free disk'):
                manager.install({'steps': {}, 'environments': {'dev': {}}})
            packages.assert_not_called()

    def test_first_run_generates_all_independent_secrets_and_no_public_credentials(self):
        root = self.write('dev', first_run={'phone': '+989100000001', 'password': 'not-an-example-password'})
        values = manager.load_env(root / 'runtime.env')
        self.assertEqual(values['DEV_WORKSPACE_PATH'], str(root / 'workspace'))
        self.assertEqual(values['APP_ORIGINS'].split(','), [values[f'PUBLIC_{app}_URL'] for app in ['WEB', 'APP', 'DASHBOARD']])
        self.assertEqual(values['TRUSTED_PROXIES'], '127.0.0.1/32,172.30.33.1/32')
        auth = [(root / 'secrets' / name).read_text() for name in ['jwt_access_secret', 'refresh_token_pepper', 'otp_pepper']]
        self.assertEqual(len(set(auth)), 3)
        self.assertTrue(all(len(base64.urlsafe_b64decode(value + '=' * (-len(value) % 4))) >= 32 for value in auth))
        for name in ['sms_credential_encryption_key', 'payment_credential_encryption_key']:
            self.assertEqual(len(base64.b64decode((root / 'secrets' / name).read_text(), validate=True)), 32)
        self.assertEqual((root / 'secrets/payment_credential_decryption_keys').read_text(), '')
        self.assertNotIn('not-an-example-password', (root / 'runtime.env').read_text())
        if os.name != 'nt':
            self.assertEqual((root / 'secrets/otp_pepper').stat().st_mode & 0o777, 0o600)

    def test_retry_preserves_secrets_custom_runtime_and_first_admin_password(self):
        root = self.write('dev', first_run={'password': 'first-password'})
        before = {path.name: path.read_bytes() for path in (root / 'secrets').iterdir()}
        (root / 'runtime.env').write_text((root / 'runtime.env').read_text().replace('LOG_LEVEL=info', 'LOG_LEVEL=warn'))
        self.write('dev', first_run={'password': 'replacement-password'})
        self.assertEqual(before, {path.name: path.read_bytes() for path in (root / 'secrets').iterdir()})
        self.assertEqual(manager.load_env(root / 'runtime.env')['LOG_LEVEL'], 'warn')
        self.assertEqual(json.loads((root / 'bootstrap/first-run.json').read_text())['password'], 'first-password')

    def test_completed_bootstrap_is_not_recreated(self):
        root = self.write('dev')
        (root / 'bootstrap/complete').touch()
        self.write('dev', first_run={'password': 'new-password'})
        self.assertFalse((root / 'bootstrap/first-run.json').exists())

    def test_missing_established_encryption_secret_is_not_regenerated(self):
        root = self.write('dev')
        missing = root / 'secrets/payment_credential_encryption_key'
        missing.unlink()
        with self.assertRaisesRegex(manager.InstallationError, 'automatic regeneration is refused'):
            self.write('dev')
        self.assertFalse(missing.exists())

    def test_cross_environment_values_and_credentials_do_not_overlap(self):
        dev = self.write('dev')
        staging = self.write('staging')
        first, second = manager.load_env(dev / 'runtime.env'), manager.load_env(staging / 'runtime.env')
        for name in ['COMPOSE_PROJECT_NAME', 'MUSHROOM_ENV_ROOT', 'POSTGRES_DB', 'POSTGRES_USER', 'API_PORT', 'PUBLIC_WEB_URL']:
            self.assertNotEqual(first[name], second[name])
        for name in manager.SECRET_NAMES:
            if name.endswith('_decryption_keys'):
                continue
            self.assertNotEqual((dev / 'secrets' / name).read_bytes(), (staging / 'secrets' / name).read_bytes())

    def test_production_requires_external_tls_database_and_creates_no_local_postgres(self):
        with self.assertRaises(manager.InstallationError):
            self.write('production', db_url='postgresql://user:password@postgres:5432/main')
        root = self.write('production', db_url='postgresql://user:encoded%40password@db.example.test/main?sslmode=require')
        self.assertFalse((root / 'secrets/postgres_password').exists())
        self.assertNotIn('POSTGRES_USER', manager.load_env(root / 'runtime.env'))
        self.assertNotIn('POSTGRES_DB', manager.load_env(root / 'runtime.env'))
        self.assertNotIn('db.example.test', (root / 'runtime.env').read_text())
        compose = (manager.BUNDLE / 'compose.production.example.yaml').read_text()
        self.assertNotIn('  postgres:', compose)

    def test_policy_hash_and_environment_are_checked_before_copy(self):
        body = 'Reviewed fixture, not legal content.'
        document = {'schemaVersion': 1, 'policyKey': 'MEDICAL_INTAKE_PROCESSING', 'versionNumber': 1,
                    'locale': 'fa-IR', 'title': 'Fixture', 'body': body,
                    'contentHash': hashlib.sha256(body.encode()).hexdigest(), 'allowedEnvironments': ['production']}
        path = self.root / 'policy.json'
        path.write_text(json.dumps(document))
        self.assertEqual(manager.validate_policy(path, 'production'), document)
        with self.assertRaises(manager.InstallationError):
            manager.validate_policy(path, 'staging')
        document['body'] += 'tampered'
        path.write_text(json.dumps(document))
        with self.assertRaises(manager.InstallationError):
            manager.validate_policy(path, 'production')

    def test_hostnames_and_urls_reject_shell_and_caddy_injection(self):
        for value in ['https://example.test', 'example.test {', 'a.example.test\nfoo', '-bad.example.test', 'example.test;id', 'a..test']:
            with self.subTest(value=value), self.assertRaises(manager.InstallationError):
                manager.hostname(value)
        for value in ['postgresql://u:p@db/x\nPGPASSWORD=bad', 'postgresql://u:$bad@db/x', 'http://u:p@db/x', 'postgresql://u:p%0APGHOST=bad@db/x']:
            with self.subTest(value=value), self.assertRaises(manager.InstallationError):
                manager.database_url(value)

    def test_atomic_write_preserves_old_contents_on_replace_failure(self):
        path = self.root / 'state'
        path.write_text('old')
        with patch.object(manager.os, 'replace', side_effect=OSError('fixture')):
            with self.assertRaises(OSError):
                manager.atomic_write(path, 'new')
        self.assertEqual(path.read_text(), 'old')
        self.assertEqual(list(self.root.glob('.mushroom-*')), [])

    @unittest.skipIf(os.name == 'nt', 'POSIX symlink/permission behavior')
    def test_atomic_write_rejects_symlink(self):
        original = self.root / 'original'
        original.write_text('unchanged')
        link = self.root / 'link'
        link.symlink_to(original)
        with self.assertRaises(manager.InstallationError):
            manager.atomic_write(link, 'replacement')
        self.assertEqual(original.read_text(), 'unchanged')

    def test_subprocess_failures_do_not_expose_credentials(self):
        with patch.object(manager.subprocess, 'run', return_value=subprocess.CompletedProcess([], 3, 'SECRET', 'SECRET')):
            with self.assertRaises(manager.InstallationError) as error:
                manager.run(['docker', 'SECRET'], sensitive=True)
            self.assertNotIn('SECRET', str(error.exception))

    def test_actual_api_and_frontend_environment_contracts_are_covered(self):
        with redirect_stdout(io.StringIO()):
            manager.audit_environment(manager.BUNDLE)

    def test_archive_contains_only_allowlisted_files_and_no_secrets_or_test_outputs(self):
        archive = build.build(self.root / 'installer.tar.gz')
        with tarfile.open(archive) as value:
            names = value.getnames()
            self.assertEqual(set(names), {'mushroom-installer/' + name for name in build.FILES})
            self.assertFalse(any(name.endswith('/.env') or '/secrets/' in name or '/dist/' in name for name in names))
            relocated = self.root / 'relocated'
            value.extractall(relocated, filter='data')
            process = subprocess.run([sys.executable, '-B', str(relocated / 'mushroom-installer/installation/manager.py'), '--help'], capture_output=True)
            self.assertEqual(process.returncode, 0)
        digest = hashlib.sha256(archive.read_bytes()).hexdigest()
        self.assertTrue(archive.with_suffix('.gz.sha256').read_text().startswith(digest))

    def test_unknown_environment_state_cannot_control_compose_outside_release_root(self):
        spec = self.config['environments']['production']
        root = Path(spec['home']) / 'mushroom/production/state'
        root.mkdir(parents=True)
        (root / 'current').write_text('/tmp/foreign-release')
        with self.assertRaises(manager.InstallationError):
            manager.compose_command(self.config, 'production')

    def test_restore_rejects_real_database_without_running_commands(self):
        target = self.root / 'target.env'
        target.write_text('postgresql://u:p@db.example.test/production?sslmode=require')
        with patch.object(manager, 'run') as run:
            with self.assertRaises(manager.InstallationError):
                manager.restore(self.config, 'production', 'fixture.dump.age', target)
            run.assert_not_called()

    def test_dns_waits_instead_of_claiming_success_for_proxy_or_unrelated_ipv6(self):
        with patch.object(manager.socket, 'getaddrinfo', return_value=[(2, 1, 6, '', ('203.0.113.99', 443))]):
            with self.assertRaisesRegex(manager.InstallationError, 'DNS pending'):
                manager.check_dns(self.config)

    def test_firewall_preserves_sshd_and_socket_management_ports_before_enable(self):
        calls = []
        def command(args, **kwargs):
            calls.append(args)
            if args[0] == 'ss':
                return 'LISTEN 0 128 0.0.0.0:2222 0.0.0.0:* users:(("sshd",pid=10,fd=3))\n'
            if args[0] == 'sshd':
                return 'port 22\nport 2222\n'
            if args[0] == 'systemctl':
                return '[::]:2222 (Stream)'
            return ''
        with patch.object(manager, 'run', side_effect=command):
            manager.firewall(self.config)
        enable = calls.index(['ufw', '--force', 'enable'])
        for port in ['22', '2222', '80', '443']:
            self.assertLess(calls.index(['ufw', 'allow', f'{port}/tcp']), enable)

    def test_firewall_rejects_wrong_service_port_without_mutation(self):
        self.config['sshPort'] = '443'
        with patch.object(manager, 'run', side_effect=['LISTEN 0 128 0.0.0.0:443 0.0.0.0:* users:(("caddy"))', 'port 22\n', '']) as run:
            with self.assertRaisesRegex(manager.InstallationError, 'firewall unchanged'):
                manager.firewall(self.config)
        self.assertFalse(any(call.args[0][0] == 'ufw' for call in run.call_args_list))

    def test_missing_compose_is_installed_without_replacing_existing_docker_engine(self):
        calls = []
        def command(args, **kwargs):
            calls.append(args)
            if args[0] == 'apt-cache':
                return '  Candidate: 2.24.6\n'
            if args[:2] == ['apt-get', '-s']:
                return 'Inst docker-compose-plugin (fixture)\n'
            return ''
        with patch.object(manager, 'run', side_effect=command), patch.object(manager.shutil, 'which', return_value='/usr/bin/docker'), \
             patch.object(manager.subprocess, 'run', return_value=subprocess.CompletedProcess([], 1)):
            manager.install_packages()
        self.assertIn(['apt-get', 'install', '-y', '--no-install-recommends', 'docker-compose-plugin'], calls)
        self.assertFalse(any('docker-ce' in args for args in calls))

    def test_compose_installation_refuses_to_remove_existing_engine(self):
        calls = []
        def command(args, **kwargs):
            calls.append(args)
            if args[0] == 'apt-cache':
                return '  Candidate: 2.24.6\n'
            if args[:2] == ['apt-get', '-s']:
                return 'Remv docker.io\nInst docker-compose-plugin\n'
            return ''
        with patch.object(manager, 'run', side_effect=command), patch.object(manager.shutil, 'which', return_value='/usr/bin/docker'), \
             patch.object(manager.subprocess, 'run', return_value=subprocess.CompletedProcess([], 1)):
            with self.assertRaisesRegex(manager.InstallationError, 'preserved'):
                manager.install_packages()
        self.assertNotIn(['apt-get', 'install', '-y', '--no-install-recommends', 'docker-compose-plugin'], calls)

    def test_network_allocator_avoids_existing_routes_and_keeps_prior_choices(self):
        def command(args, **kwargs):
            if args[:3] == ['docker', 'network', 'ls']:
                return 'fixture-network\n'
            if args[:3] == ['docker', 'network', 'inspect']:
                return json.dumps([{'Name': 'another-project', 'IPAM': {'Config': [{'Subnet': '172.30.33.0/24'}]}}])
            return json.dumps([{'dst': '172.30.40.0/24', 'dev': 'eth1'}])
        with patch.object(manager, 'run', side_effect=command), patch.object(manager, 'STATE', self.root):
            manager.allocate_networks(self.config)
            self.assertEqual(self.config['environments']['dev']['subnet'], '172.30.41.0/24')
            manager.allocate_networks(self.config)
            self.assertEqual(self.config['environments']['dev']['subnet'], '172.30.41.0/24')

    def test_network_allocator_handles_docker_default_networks_with_null_ipam(self):
        networks = [{'Name': 'host', 'IPAM': {'Config': None}},
                    {'Name': 'none', 'IPAM': {'Config': []}},
                    {'Name': 'missing-config', 'IPAM': {}},
                    {'Name': 'null-ipam', 'IPAM': None}, {'Name': 'missing-ipam'},
                    {'Name': 'bridge', 'IPAM': {'Config': [{'Subnet': '172.17.0.0/16'}]}},
                    {'Name': 'foreign', 'IPAM': {'Config': [{'Subnet': '172.30.33.0/24'},
                                                         {'Subnet': 'fd00::/64'}]}}]
        def command(args, **kwargs):
            if args[:3] == ['docker', 'network', 'ls']:
                return 'fixture-network\n'
            if args[:3] == ['docker', 'network', 'inspect']:
                return json.dumps(networks)
            self.assertEqual(args, ['ip', '-json', '-4', 'route', 'show'])
            return '[]'
        with patch.object(manager, 'run', side_effect=command) as commands, patch.object(manager, 'STATE', self.root):
            manager.allocate_networks(self.config)
            first = {name: spec['subnet'] for name, spec in self.config['environments'].items()}
            manager.allocate_networks(self.config)
        self.assertEqual(first['dev'], '172.30.40.0/24')
        self.assertEqual(len(set(first.values())), 3)
        self.assertEqual(first, {name: spec['subnet'] for name, spec in self.config['environments'].items()})
        self.assertEqual(json.loads((self.root / 'installation.json').read_text())['environments']['dev']['subnet'], first['dev'])
        self.assertFalse(any(call.args[0][0:3] in [['docker', 'network', 'rm'], ['docker', 'network', 'create']] for call in commands.call_args_list))

    def test_cli_redacts_unexpected_errors_but_preserves_argparse_exit(self):
        with patch.object(manager, 'main', side_effect=TypeError('private-value')), redirect_stderr(io.StringIO()) as output:
            with self.assertRaises(SystemExit) as raised:
                manager.cli()
        self.assertEqual(raised.exception.code, 1)
        self.assertIn('TypeError', output.getvalue())
        self.assertNotIn('private-value', output.getvalue())
        self.assertNotIn('Traceback', output.getvalue())
        with patch.object(manager, 'main', side_effect=SystemExit(2)), redirect_stderr(io.StringIO()) as output:
            with self.assertRaises(SystemExit) as raised:
                manager.cli()
        self.assertEqual(raised.exception.code, 2)
        self.assertEqual(output.getvalue(), '')

    def test_port_allocator_avoids_existing_services_without_stopping_them(self):
        with patch.object(manager, 'run', return_value='LISTEN 0 128 127.0.0.1:3303 0.0.0.0:*\n'), \
             patch.object(manager, 'STATE', self.root):
            manager.allocate_ports(self.config)
        self.assertEqual(self.config['environments']['dev']['basePort'], 3400)
        root = self.write('dev')
        self.assertEqual(manager.load_env(root / 'runtime.env')['API_PORT'], '127.0.0.1:3403')

    def test_failed_backup_never_records_success_or_leaves_plaintext(self):
        import contextlib
        state = self.root / 'state'
        (state / 'backup-keys').mkdir(parents=True)
        (state / 'backup-keys/production.key').write_text('fixture private key')
        # Redirect only the fixed backup destination into this disposable fixture.
        original_path = manager.Path
        def path(value):
            return self.root / 'backups' if str(value) == '/var/backups/mushroom' else original_path(value)
        (self.root / 'backups/production').mkdir(parents=True)
        with patch.object(manager, 'STATE', state), patch.object(manager, 'Path', side_effect=path), \
             patch.object(manager, 'run', return_value='age1fixture'), \
             patch.object(manager, 'pg_client', return_value=contextlib.nullcontext((['fixture-pg'], []))), \
             patch.object(manager, 'binary_pipeline', side_effect=manager.InstallationError('fixture failure')):
            with self.assertRaises(manager.InstallationError):
                manager.backup(self.config, 'production')
        self.assertFalse((self.root / 'backups/production/last-success').exists())
        self.assertEqual(list((self.root / 'backups/production').iterdir()), [])

    def test_binary_pipeline_rejects_a_failed_producer_even_if_consumer_succeeds(self):
        with self.assertRaises(manager.InstallationError):
            manager.binary_pipeline([sys.executable, '-c', 'import sys;sys.stdout.write("partial");sys.exit(2)'],
                                    [sys.executable, '-c', 'import sys;sys.stdin.buffer.read()'])

    def test_proxy_preserves_existing_files_if_validation_fails(self):
        directory = self.root / 'caddy'
        directory.mkdir()
        main = directory / 'Caddyfile'
        default = ':80 {\n root * /usr/share/caddy\n file_server\n}\n'
        main.write_text(default)
        sites = directory / 'mushroom.caddy'
        sites.write_text('previous config')
        with patch.object(manager, 'run', side_effect=manager.InstallationError('fixture validation failure')):
            with self.assertRaises(manager.InstallationError):
                manager.configure_proxy(self.config, directory)
        self.assertEqual(main.read_text(), default)
        self.assertEqual(sites.read_text(), 'previous config')

    def test_proxy_will_not_replace_foreign_sites(self):
        directory = self.root / 'caddy'
        directory.mkdir()
        main = directory / 'Caddyfile'
        main.write_text('foreign.example.test { reverse_proxy localhost:8080 }')
        with patch.object(manager, 'run') as run:
            with self.assertRaisesRegex(manager.InstallationError, 'preserved'):
                manager.configure_proxy(self.config, directory)
            run.assert_not_called()
        self.assertFalse((directory / 'mushroom.caddy').exists())

    @unittest.skipUnless(shutil.which('caddy'), 'Caddy validation is exercised in Ubuntu CI')
    def test_real_caddy_validates_generated_tls_and_websocket_proxy_configuration(self):
        directory = self.root / 'caddy'
        directory.mkdir()
        (directory / 'Caddyfile').write_text(':80 {\n root * /usr/share/caddy\n file_server\n}\n')
        original = manager.run
        def command(args, **kwargs):
            if args[0] == 'caddy':
                return original(args, **kwargs, env={**os.environ, 'XDG_DATA_HOME': str(self.root / 'data'),
                                                      'XDG_CONFIG_HOME': str(self.root / 'config')})
            self.assertEqual(args[0], 'systemctl')
            return ''
        with patch.object(manager, 'run', side_effect=command):
            manager.configure_proxy(self.config, directory)
        source = (directory / 'mushroom.caddy').read_text()
        self.assertIn('reverse_proxy 127.0.0.1:3303', source)
        self.assertIn('tls ops@example.test', source)

    @unittest.skipUnless(shutil.which('age') and shutil.which('age-keygen'), 'age tools are tested in the Ubuntu installer CI job')
    def test_encrypted_backup_roundtrip_with_real_age_and_tamper_detection(self):
        import contextlib
        state = self.root / 'state'
        (state / 'backup-keys').mkdir(parents=True)
        key = state / 'backup-keys/production.key'
        subprocess.run(['age-keygen', '-o', str(key)], check=True, capture_output=True)
        original_path = manager.Path
        def path(value):
            return self.root / 'backups' if str(value) == '/var/backups/mushroom' else original_path(value)
        directory = self.root / 'backups/production'
        directory.mkdir(parents=True)
        previous = directory / '20000101T000000Z-00000000.dump.age'
        previous.write_bytes(b'old synthetic encrypted fixture')
        os.utime(previous, (0, 0))
        foreign = directory / 'operator-owned.dump.age'
        foreign.write_bytes(b'preserve operator fixture')
        fixture = 'Private fixture dump bytes; never store as plaintext.'
        with patch.object(manager, 'STATE', state), patch.object(manager, 'Path', side_effect=path), \
             patch.object(manager, 'pg_client', return_value=contextlib.nullcontext(([sys.executable, '-c', f'print({fixture!r})', '--'], []))), \
             redirect_stdout(io.StringIO()):
            manager.backup(self.config, 'production')
        self.assertFalse(previous.exists())
        self.assertTrue(foreign.exists())
        archive = next(path for path in directory.glob('*.dump.age') if path != foreign)
        self.assertNotIn(fixture.encode(), archive.read_bytes())
        result = subprocess.run(['age', '-d', '-i', str(key), str(archive)], check=True, capture_output=True)
        self.assertEqual(result.stdout, fixture.encode() + b'\n')
        self.assertTrue((directory / 'last-success').exists())
        archive.write_bytes(archive.read_bytes()[:-10])
        corrupted = subprocess.run(['age', '-d', '-i', str(key), str(archive)], capture_output=True)
        self.assertNotEqual(corrupted.returncode, 0)


if __name__ == '__main__':
    unittest.main()
