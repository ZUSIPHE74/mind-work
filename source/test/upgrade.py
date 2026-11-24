"""Upgrade test: data created by the previous release (schema 1, IndexedDB v1, old service worker) must survive
installing this release; replay must work on migrated records; later updates must be offered in-app."""
import sys, os, shutil, subprocess, time, json, atexit
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = '/tmp/mw-upgrade'
OLD = sys.argv[1]; NEW = os.path.join(HERE, '..', 'dist', 'pwa')
def deploy(src):
    for f in os.listdir(ROOT): os.remove(os.path.join(ROOT, f))
    for f in os.listdir(src): shutil.copy(os.path.join(src, f), ROOT)
os.makedirs(ROOT, exist_ok=True); deploy(OLD)
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8766', '--bind', '127.0.0.1'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); atexit.register(srv.terminate); time.sleep(1)
URL = 'http://localhost:8766/index.html'
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(); pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_selector('.hero'); pg.wait_for_timeout(1500)
    assert pg.evaluate('typeof MWR') == 'undefined', 'old release loaded'
    # create old-format data: one exercise submitted, revised, finished
    pg.evaluate('MWUI.startMode("single",{itemId:"nuance-2"})'); pg.wait_for_selector('.player')
    pg.fill('.stage.active textarea', 'People who interrupt are often keen.'); pg.click('[data-act="next-stage"]'); pg.fill('.stage.active textarea', 'I removed the absolute.')
    pg.click('[data-act="submit"]'); pg.click('[data-act="rate"][data-i="2"]'); pg.wait_for_selector('.feedback')
    pg.click('[data-act="revise"]'); pg.locator('.stage textarea').first.fill('People who interrupt are sometimes keen rather than rude, especially in fast conversations.'); pg.click('[data-act="submit"]'); pg.wait_for_selector('.feedback'); pg.click('[data-act="next-item"]'); pg.wait_for_timeout(800)
    old = json.loads(pg.evaluate('JSON.stringify(MWUI.S.attempts)')); assert len(old) == 1 and 'schema' not in old[0] and len(old[0]['revisions']) == 1
    print('old release: 1 schema-1 record with 1 revision')
    # ship the new release to the same address
    deploy(NEW); pg.close()
    pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e))); pg.goto(URL); pg.wait_for_timeout(2500)
    if pg.evaluate('typeof MWR') == 'undefined':   # old SW still in control: standard behaviour until all tabs close
        pg.close(); pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e))); pg.goto(URL); pg.wait_for_timeout(2000)
    assert pg.evaluate('typeof MWR') == 'object', 'new release running'
    a = json.loads(pg.evaluate('JSON.stringify(MWUI.S.attempts[0])'))
    assert a['schema'] == 2 and a['legacy'] and len(a['versions']) == 2
    assert a['versions'][0]['responses']['rewrite'] == 'People who interrupt are often keen.' and a['responses'] == old[0]['responses'] and a['revisions'] == old[0]['revisions']
    assert pg.evaluate('MWUI.DB.get("kv","pre-migration-v1").then(x=>x.attempts.length)') == 1
    pg.goto(URL + '#replay-' + a['id']); pg.wait_for_selector('.timeline'); t = pg.locator('.tl-title').all_inner_texts(); print('migrated replay:', t)
    assert t == ['The challenge', 'Your first response', 'Feedback on version 1', 'Revision 1', 'Feedback on version 2']
    assert pg.locator('.compare .ck-item').count() > 0
    print('migration ok: original fields untouched, versions reconstructed, pre-migration copy kept, replay works')
    # a later update is offered in-app instead of silently swapping code under the user
    pg.goto(URL); pg.wait_for_timeout(1500)
    sw = open(os.path.join(ROOT, 'sw.js')).read().replace("const CACHE = 'mindwork-", "const CACHE = 'mindwork-next-"); open(os.path.join(ROOT, 'sw.js'), 'w').write(sw)
    pg.evaluate('navigator.serviceWorker.getRegistration().then(r=>r.update())'); pg.wait_for_selector('#toast.sticky [data-action="update"]', timeout=10000)
    print('update offered:', pg.inner_text('#toast'))
    pg.click('#toast [data-action="update"]'); pg.wait_for_load_state('load'); pg.wait_for_timeout(1500)
    assert pg.evaluate('caches.keys()').__len__() >= 1 and any('next' in k for k in pg.evaluate('caches.keys()')); assert pg.evaluate('MWUI.S.attempts.length') == 1
    print('update applied after consent; data intact')
    ctx.set_offline(True); pg.reload(); pg.wait_for_selector('.hero'); print('offline after update ok')
    print('errors', errs); b.close(); sys.exit(1 if errs else 0)
