"""Exercise the shipped Caddy route with synthetic callbacks; requires Docker."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import subprocess
import tempfile
import threading
import time
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, Request, build_opener
import uuid


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def main():
    received = []
    result = 'https://dev-app.example.test/store/order-success?orderId=synthetic'

    class Backend(BaseHTTPRequestHandler):
        def do_POST(self):
            received.append((self.command, self.path, self.headers.get('Content-Type'),
                             self.rfile.read(int(self.headers['Content-Length']))))
            self.send_response(303)
            self.send_header('Location', result)
            self.end_headers()

        def log_message(self, *args):
            pass

    backend = ThreadingHTTPServer(('0.0.0.0', 0), Backend)
    threading.Thread(target=backend.serve_forever, daemon=True).start()
    name = 'mushroom-sadad-test-' + uuid.uuid4().hex[:10]
    docker = lambda *args: subprocess.check_output(['docker', *args], text=True, stderr=subprocess.STDOUT).strip()
    try:
        with tempfile.TemporaryDirectory(prefix='sadad-proxy-') as directory:
            snippet = (Path(__file__).resolve().parents[1] / 'deploy/vps/sadad-callback.caddy.example').read_text(encoding='utf-8')
            snippet = snippet.replace('127.0.0.1:3303', f'host.docker.internal:{backend.server_port}')
            config = Path(directory) / 'Caddyfile'
            config.write_text('{\n admin off\n auto_https off\n}\n:8080 {\n' + snippet + '\nhandle {\nrespond "existing website" 200\n}\n}\n', encoding='utf-8')
            docker('run', '--rm', '-d', '--name', name, '--add-host', 'host.docker.internal:host-gateway',
                   '-p', '127.0.0.1::8080', '--mount', f'type=bind,source={config},target=/etc/caddy/Caddyfile,readonly', 'caddy:2-alpine')
            address = 'http://' + docker('port', name, '8080/tcp')
            opener = build_opener(NoRedirect())
            for attempt in range(50):
                try:
                    with opener.open(address, timeout=2) as response:
                        assert response.read() == b'existing website'
                    break
                except URLError:
                    if attempt == 49:
                        raise
                    time.sleep(.1)
            body = b'OrderId=42&Token=synthetic%2Btoken%3D&ResCode=0'
            path = '/v1/payments/providers/sadad/callback?transport=preserved'
            for _ in range(2):
                request = Request(address + path, data=body, headers={'Content-Type': 'application/x-www-form-urlencoded'})
                try:
                    opener.open(request, timeout=5)
                    raise AssertionError('Expected backend 303')
                except HTTPError as response:
                    assert response.code == 303
                    assert response.headers['Location'] == result
                    assert response.headers['Cache-Control'] == 'no-store'
            assert received == [('POST', path, 'application/x-www-form-urlencoded', body)] * 2
            for unrelated in ['/store', '/v1/payments/providers/sadad/callback/extra']:
                with opener.open(address + unrelated, timeout=5) as response:
                    assert response.read() == b'existing website'
            print('Caddy callback transport PASS: exact route, POST/form/query, repeated delivery, 303/Location, no-store and unrelated routes.')
    finally:
        subprocess.run(['docker', 'rm', '-f', name], capture_output=True)
        backend.shutdown()
        backend.server_close()


if __name__ == '__main__':
    main()
