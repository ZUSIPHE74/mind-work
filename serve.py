#!/usr/bin/env python3
"""Serve MINDWORK locally:  python3 serve.py   (then open http://localhost:8080)
Installing and offline use work at http://localhost on this computer. Other devices on your network can open the
LAN address shown, but browsers only allow installation and offline caching over https — see README for phones.

Optional AI conversation (Deep Thinking exploration, open conversations, AI feedback):
  ANTHROPIC_API_KEY=sk-...  python3 serve.py
The key stays on this computer, in this process; the page never sees it. Only requests from this computer may use it,
unless you set MINDWORK_AI_LAN=1 (anyone on your network could then spend your key). MINDWORK_MODEL picks the model.
Request content is forwarded to Anthropic and never written to disk or logged here."""
import http.server, socketserver, socket, os, sys, json, urllib.request, urllib.error, threading
ARGS = [a for a in sys.argv[1:] if not a.startswith('--')]
PHONE = '--phone' in sys.argv  # publish through a free Cloudflare quick tunnel so a phone can install the app
PORT = int(ARGS[0]) if ARGS else 8080
KEY = os.environ.get('ANTHROPIC_API_KEY', '').strip()
MODEL = os.environ.get('MINDWORK_MODEL', 'claude-sonnet-5-5')
LAN_AI = os.environ.get('MINDWORK_AI_LAN') == '1'
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app'))
class H(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.webmanifest': 'application/manifest+json', '.js': 'text/javascript'}
    def end_headers(self): self.send_header('Cache-Control', 'no-cache'); super().end_headers()
    def log_message(self, fmt, *args):
        if '/api/' not in (args[0] if args else ''): super().log_message(fmt, *args)   # never log AI request lines
    def _json(self, code, obj):
        b = json.dumps(obj).encode(); self.send_response(code); self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)
    def _local(self):
        # a tunnel delivers outside requests through this computer; Cloudflare marks them, and they never get AI
        if self.headers.get('Cf-Connecting-Ip') or self.headers.get('Cf-Ray'): return False
        return LAN_AI or self.client_address[0] in ('127.0.0.1', '::1')
    def do_GET(self):
        if self.path.split('?')[0] in ('/api/ai/status', '/ai-status.json'): return self._json(200, {'available': bool(KEY) and self._local(), 'provider': 'Anthropic API via this computer', 'model': MODEL})
        return super().do_GET()
    def do_POST(self):
        if self.path != '/api/ai': return self._json(404, {'error': 'not_found'})
        if not KEY: return self._json(503, {'error': 'no_key', 'message': 'This server has no ANTHROPIC_API_KEY.'})
        if not self._local(): return self._json(403, {'error': 'not_local', 'message': 'AI is only available on the computer running MINDWORK.'})
        try:
            n = int(self.headers.get('Content-Length', '0'))
            if n > 200_000: return self._json(413, {'error': 'too_large'})
            req = json.loads(self.rfile.read(n) or b'{}'); prompt = str(req.get('prompt', ''))[:120_000]
            body = json.dumps({'model': MODEL, 'max_tokens': min(int(req.get('max_tokens', 1200)), 2000), 'messages': [{'role': 'user', 'content': prompt}]}).encode()
            r = urllib.request.Request('https://api.anthropic.com/v1/messages', data=body, headers={'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json'})
            with urllib.request.urlopen(r, timeout=120) as resp: out = json.loads(resp.read())
            text = ''.join(c.get('text', '') for c in out.get('content', []) if c.get('type') == 'text')
            return self._json(200, {'text': text, 'model': out.get('model', MODEL)})
        except urllib.error.HTTPError as e: return self._json(502, {'error': 'upstream', 'status': e.code, 'message': 'The AI service refused the request (status %d).' % e.code})
        except Exception as e: return self._json(502, {'error': 'unreachable', 'message': 'Couldn’t reach the AI service: ' + type(e).__name__})
def cloudflared():
    import shutil, platform, tarfile, stat
    found = shutil.which('cloudflared')
    if found: return found
    home = os.path.join(os.path.expanduser('~'), '.mindwork'); os.makedirs(home, exist_ok=True)
    sysname, arch = platform.system().lower(), platform.machine().lower()
    arch = 'arm64' if arch in ('arm64', 'aarch64') else 'amd64'
    name = {'windows': f'cloudflared-windows-{arch}.exe', 'darwin': f'cloudflared-darwin-{arch}.tgz'}.get(sysname, f'cloudflared-linux-{arch}')
    target = os.path.join(home, 'cloudflared.exe' if sysname == 'windows' else 'cloudflared')
    if not os.path.exists(target):
        print('  Fetching Cloudflare’s free tunnel program (one time, about 35 MB)…')
        tmp = target + '.download'; urllib.request.urlretrieve('https://github.com/cloudflare/cloudflared/releases/latest/download/' + name, tmp)
        if name.endswith('.tgz'):
            with tarfile.open(tmp) as t: t.extract('cloudflared', home)
            os.remove(tmp)
        else: os.replace(tmp, target)
        os.chmod(target, os.stat(target).st_mode | stat.S_IEXEC)
    return target

def phone_link():
    import subprocess, re
    try: exe = cloudflared()
    except Exception as e: print(f'\n  Couldn’t get the tunnel program ({e}). Install “cloudflared” yourself, or use the Netlify steps in the README.'); return
    proc = subprocess.Popen([exe, 'tunnel', '--no-autoupdate', '--url', f'http://localhost:{PORT}'], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    for line in proc.stdout:
        m = re.search(r'https://[a-z0-9-]+\.trycloudflare\.com', line)
        if m:
            print(f"""
  ── Your phone link ─────────────────────────────────────────
  {m.group(0)}

  1. Open it on your phone (send it to yourself, or type it).
  2. Let it load fully, then install it:
       iPhone (Safari): Share → Add to Home Screen
       Android (Chrome): ⋮ → Install app
  3. Done. Open it from your home screen: it works offline from now on,
     even after you stop this program.

  The address changes each time you run --phone. An app installed from an
  old address keeps working, but a new address is a separate app with its
  own data: move progress with Settings → Export / Import backup.
  AI features are switched off for anyone using this link.
  ─────────────────────────────────────────────────────────────""", flush=True)
            break
    for _ in proc.stdout: pass

def lan_ip():
    try: s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.connect(('10.255.255.255', 1)); ip = s.getsockname()[0]; s.close(); return ip
    except Exception: return None
socketserver.TCPServer.allow_reuse_address = True
with socketserver.ThreadingTCPServer(('0.0.0.0', PORT), H) as httpd:
    print(f'MINDWORK running.\n  This computer:  http://localhost:{PORT}   (installable, works offline after first load)')
    ip = lan_ip()
    if ip: print(f'  Same Wi-Fi:      http://{ip}:{PORT}   (opens on phones, but plain http can’t be installed or cached offline)')
    print(f'  AI conversation: {"on, using " + MODEL + (" (this computer only)" if not LAN_AI else " (network devices too)") if KEY else "off (set ANTHROPIC_API_KEY to enable)"}')
    if PHONE: threading.Thread(target=phone_link, daemon=True).start()
    print('Press Ctrl+C to stop.'); httpd.serve_forever()
