"""Rollback and data-safety test: previous release (v3) → this release (v4) → back to v3 → v4 again, on one origin and one browser profile.
Usage: python3 test/rollback.py <previous app folder>"""
import sys, os, shutil, subprocess, time, atexit, json
from playwright.sync_api import sync_playwright
OLD = sys.argv[1]; NEW = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'dist', 'pwa'); ROOT = '/tmp/mw-rollback'
import re
NEW_VERSION = re.search(r"APP_VERSION = '([0-9.]+)'", open(os.path.join(NEW, 'index.html')).read()).group(1)
def deploy(src):
    os.makedirs(ROOT, exist_ok=True)
    for f in os.listdir(ROOT): os.remove(os.path.join(ROOT, f))
    for f in os.listdir(src): shutil.copy(os.path.join(src, f), ROOT)
deploy(OLD)
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8783', '--bind', '127.0.0.1'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); atexit.register(srv.terminate); time.sleep(1)
U = 'http://localhost:8783/index.html'; fails = []
def check(c, m): print(('PASS ' if c else 'FAIL ') + m); (fails.append(m) if not c else None)
SNAP = 'JSON.stringify({a: MWUI.S.attempts.map(x=>[x.id, x.overall, (x.versions||[]).length, x.responses]), j: MWUI.S.journal.map(x=>[x.id, x.versions.map(v=>v.text)]), b: (MWUI.S.books||[]).map(x=>[x.id, x.title, x.chapters.length]), c: Object.keys(MWUI.S.cards||{}).sort(), n: (MWUI.S.notes||[]).length, s: Object.keys(MWUI.S.sessions).sort(), p: MWUI.S.profile.skills.divergent})'
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(); errs = []
    def page(want_new):
        for _ in range(4):
            pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e))); pg.goto(U); pg.wait_for_timeout(2200)
            if (pg.evaluate('window.MWUI && MWUI.APP_VERSION') == NEW_VERSION) == want_new: return pg
            pg.close()
        raise SystemExit('could not activate the wanted version')
    # 1. previous release with real data
    pg = page(False); pg.wait_for_selector('.hero')
    pg.evaluate('MWUI.startMode("single",{itemId:"diff-1"})'); pg.wait_for_selector('.player')
    for i in range(3):
        pg.locator('.stage.active textarea').fill('Listening needs attention and effort, whereas hearing is passive sound.')
        if pg.locator('[data-act="next-stage"]').count(): pg.click('[data-act="next-stage"]')
    pg.click('[data-act="submit"]'); pg.click('[data-act="rate"][data-i="2"]'); pg.wait_for_selector('.feedback'); pg.click('[data-act="revise"]')
    pg.locator('.stage textarea').first.fill('Listening usually means attending to meaning, whereas hearing is the passive reception of sound.'); pg.click('[data-act="submit"]'); pg.wait_for_selector('.feedback'); pg.click('[data-act="next-item"]')
    pg.goto(U + '#journal'); pg.fill('#jtext', 'A thought written in version 3.'); pg.click('[data-action="j-new"]'); pg.wait_for_selector('.j-current')
    pg.goto(U + '#study'); pg.click('[data-action="sample-book"]'); pg.wait_for_selector('.toc'); pg.wait_for_timeout(800)
    v3 = json.loads(pg.evaluate(SNAP)); print(f"v3 data: {len(v3['a'])} exercises, {len(v3['j'])} journal, {len(v3['b'])} books"); pg.close()
    # 2. upgrade to v4
    deploy(NEW); pg = page(True)
    up = json.loads(pg.evaluate(SNAP)); check(up == v3, 'upgrade: every record identical after installing v4')
    pre = pg.evaluate('MWUI.DB.get("kv","pre-upgrade").then(x=>x&&{from:x.from,to:x.to,a:x.backup.counts.attempts,j:x.backup.counts.journal,b:x.backup.counts.books})'); print('  pre-update copy:', pre)
    check(pre and pre['to'] == pg.evaluate('MWUI.APP_VERSION') and pre['a'] == len(v3['a']) and pre['j'] == 1 and pre['b'] == 1, 'upgrade: a full copy of the v3 data was kept before updating')
    check(pg.locator('#nav .dest-link').count() == 7, 'upgrade: the seven-destination navigation is active')
    pg.goto(U + '#journal'); pg.fill('#jtext', 'A thought written in version 4.'); pg.click('[data-action="j-new"]'); pg.wait_for_selector('.j-current'); pg.wait_for_timeout(600)
    v4 = json.loads(pg.evaluate(SNAP)); pg.close()
    # 3. roll back to v3
    deploy(OLD); pg = page(False)
    back = json.loads(pg.evaluate(SNAP)); check(back == v4, 'rollback: v3 reads all data, including the entry written in v4')
    pg.evaluate('MWUI.startMode("single",{itemId:"nuance-1"})'); pg.wait_for_selector('.player'); pg.locator('.stage.active textarea').fill('Exercise often improves mood for many people.'); pg.click('[data-act="next-stage"]'); pg.locator('.stage.active textarea').fill('Added a condition.'); pg.click('[data-act="submit"]'); pg.click('[data-act="rate"][data-i="2"]'); pg.wait_for_selector('.feedback'); pg.click('[data-act="next-item"]'); pg.wait_for_timeout(600)
    check(pg.evaluate('MWUI.S.attempts.length') == len(v4['a']) + 1, 'rollback: v3 keeps working and saves new exercises')
    v3b = json.loads(pg.evaluate(SNAP)); pg.close()
    # 4. forward again, then restore the pre-update copy
    deploy(NEW); pg = page(True)
    check(json.loads(pg.evaluate(SNAP)) == v3b, 'upgrade again: every record identical, including work done after rolling back')
    pg.goto(U + '#prefs'); pg.wait_for_selector('#preUpgrade h3'); check('before the last update' in pg.inner_text('#preUpgrade'), 'Settings offers the pre-update copy')
    pg.click('[data-action="pre-restore"]'); pg.wait_for_selector('dialog[open] .preview'); pg.click('dialog button[value=merge]'); pg.wait_for_timeout(1200)
    check(json.loads(pg.evaluate(SNAP))['a'] == v3b['a'], 'restoring the pre-update copy by merging adds no duplicates and loses nothing')
    check(not errs, f'no page errors {errs[:3]}')
    b.close()
print(f'\n{len(fails)} failed'); sys.exit(1 if fails else 0)
