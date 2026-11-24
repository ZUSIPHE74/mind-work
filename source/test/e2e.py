"""End-to-end test: plays every exercise in the bank through the real UI, checks feedback,
revision, persistence after reload, daily session recording, progress page, export/import and offline loading."""
import sys, json, random
from playwright.sync_api import sync_playwright
import subprocess, os, time, atexit
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'dist', 'pwa')
_srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8765', '--bind', '127.0.0.1'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
atexit.register(_srv.terminate); time.sleep(1)
URL = 'http://localhost:8765/index.html'
TEXT = ["Because people often protect what is familiar, they may resist when the change is imposed on them, for example a new rota at work.",
        "It might depend on whether they chose it; when they feel in control the effect usually weakens, which means context matters.",
        "Sometimes the cost of learning a new way is high, so people delay, especially when they are already tired.",
        "Another possibility is that trust is low, so they doubt the motives of whoever proposes it."]
def fill_stage(pg, k):
    st = pg.locator('.stage.active')
    if st.count() == 0: return
    st = st.first
    for i, ta in enumerate(st.locator('textarea:not([readonly]), input:not([readonly]):not([type=file])').all()):
        if ta.input_value().strip(): continue
        ta.fill(TEXT[(i + k) % len(TEXT)])
    # ideas: add more
    add = st.locator('[data-act="add"]')
    for j in range(3):
        if add.count():
            add.first.click(); new = pg.locator('.stage.active textarea.idea, .stage.active .chain-link input').last
            new.fill(TEXT[(j + 1 + k) % len(TEXT)].replace('people', ['managers','children','teams'][j]))
    for sel in ['[data-act="choose"]', '[data-act="pick"]']:
        if st.locator(sel).count(): st.locator(sel).nth(min(1, st.locator(sel).count()-1)).click()
    st = pg.locator('.stage.active').first
    while st.locator('[data-act="place"]').count():
        n = st.locator('[data-act="place"]').count(); st.locator('[data-act="place"]').nth(random.randrange(min(n, 3))).click(); st = pg.locator('.stage.active').first
    for inp in st.locator('input.bucket-name').all(): inp.fill('Causes')
    while pg.locator('.branch-opt').count():
        pg.locator('.branch-opt').nth(random.randrange(pg.locator('.branch-opt').count())).click()
    if st.locator('[data-act="down"]').count(): st.locator('[data-act="down"]').first.click()

def play_current(pg, revise=False):
    for k in range(12):
        fill_stage(pg, k)
        if pg.locator('[data-act="next-stage"]').count():
            pg.locator('[data-act="next-stage"]').click()
            if pg.locator('[data-act="next-stage"][data-confirmed]').count(): pg.locator('[data-act="next-stage"]').click()
            continue
        if pg.locator('[data-act="submit"]').count():
            fill_stage(pg, k); pg.locator('[data-act="submit"]').click(); break
    if pg.locator('[data-act="rate"]').count(): pg.locator('[data-act="rate"]').nth(2).click()
    pg.wait_for_selector('.feedback', timeout=4000)
    fb = pg.locator('.feedback').inner_text()
    assert 'What you communicated' in fb and 'A question to deepen your thinking' in fb, fb[:300]
    assert 'Great job' not in fb
    if revise:
        pg.locator('[data-act="revise"]').click(); ta = pg.locator('.stage textarea:not([readonly])').last
        ta.fill(ta.input_value() + ' However, this is not always true, for instance when people choose the change themselves, because then they feel ownership.')
        pg.locator('[data-act="submit"]').click(); pg.wait_for_selector('.feedback'); assert 'Revision 1' in pg.locator('.feedback').inner_text()
        pg.locator('[data-act="reveal"]').click(); assert pg.locator('.fb-sec.ref').count() == 1
    pg.locator('[data-act="next-item"]').click()
    return fb

with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 1280, 'height': 900}); pg = ctx.new_page()
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto(URL); pg.wait_for_selector('.hero')
    # 1. Daily session start to finish
    pg.click('[data-action="daily"]'); pg.wait_for_selector('.player')
    pg.locator('[data-act="hint"]').click(); assert pg.locator('.hint').count() == 1
    n = pg.evaluate('MWP.state.sess.items.length'); print('daily items', n)
    for i in range(n): play_current(pg, revise=(i == 0))
    pg.wait_for_selector('.summary'); assert 'Session complete' in pg.inner_text('.summary'); print('daily summary ok')
    # 2. Persistence after reload
    pg.wait_for_timeout(600); pg.reload(); pg.wait_for_selector('.hero'); txt = pg.inner_text('.hero')
    assert f'{n} of {n} done' in txt, txt; print('persisted after reload')
    atts = pg.evaluate('MWUI.S.attempts.length'); assert atts == n, atts
    # 3. Every exercise in the bank
    ids = pg.evaluate('MW.BANK.map(i=>i.id)'); failed = []
    for iid in ids:
        try:
            pg.evaluate(f'MWUI.startMode("single", {{itemId: "{iid}"}})'); pg.wait_for_selector('.player', timeout=3000); play_current(pg); pg.wait_for_selector('.summary', timeout=3000)
        except Exception as e: failed.append((iid, str(e)[:160]))
    print('bank items played', len(ids) - len(failed), 'of', len(ids)); [print('FAIL', f) for f in failed[:10]]
    # 4. Templates, custom claim, modes
    for mode in ['quick', 'random', 'weakness', 'deep']:
        pg.evaluate(f'MWUI.startMode("{mode}")'); pg.wait_for_selector('.player'); k = pg.evaluate('MWP.state.sess.items.length')
        for _ in range(k): play_current(pg)
        pg.wait_for_selector('.summary'); print('mode ok', mode, k)
    pg.goto(URL + '#deep'); pg.fill('#claim', 'Cities should ban cars from their centres'); pg.click('[data-action="challenge"]'); pg.wait_for_selector('.player'); play_current(pg); print('custom claim ok')
    # 5. Navigation
    for h in ['home', 'daily', 'games', 'games-connect', 'convo', 'deep', 'progress', 'library', 'prefs']:
        pg.goto(URL + '#' + h); pg.wait_for_timeout(150); assert pg.locator('main h1').count() >= 1, h
    pg.goto(URL + '#progress'); prog = pg.inner_text('main'); assert 'not validated psychological measures' in prog
    levels = pg.evaluate('Object.fromEntries(Object.entries(MWUI.S.profile.skills).map(([k,v])=>[k,[v.level, v.ema, Math.round(v.n)]]))'); print('levels', levels)
    print('insights', pg.evaluate('MW.insights(MWUI.S.attempts, MWUI.S.profile).map(i=>i.text.slice(0,70))'))
    # 6. Draft resume: start, type, reload, continue
    pg.evaluate('MWUI.startMode("single",{itemId:"beyond-2"})'); pg.wait_for_selector('.player'); pg.fill('.stage.active textarea', 'Draft text that should survive a reload'); pg.wait_for_timeout(800)
    pg.goto(URL + '#home'); pg.reload(); pg.wait_for_selector('[data-action="resume"]'); pg.click('[data-action="resume"]'); pg.wait_for_selector('.player')
    assert 'Draft text that should survive' in pg.locator('.stage textarea').first.input_value(); print('draft resume ok')
    # 7. Backups: full export, reset, import preview + merge, duplicate detection, invalid file, v1 file
    pg.goto(URL + '#prefs'); pg.wait_for_selector('#storageLine'); pg.wait_for_timeout(300); print('storage line:', pg.inner_text('#storageLine'))
    with pg.expect_download() as d: pg.click('[data-action="export"][data-kind="full"]')
    path = d.value.path(); data = json.load(open(path)); n_att = len(data['data']['attempts']); print('full backup', data['format'], data['version'], n_att, 'attempts', data['counts'])
    with pg.expect_download() as d2: pg.click('[data-action="export"][data-kind="progress"]')
    prog = json.load(open(d2.value.path())); assert all('responses' not in a for a in prog['data']['attempts']); print('progress backup bytes', len(json.dumps(prog)), 'vs full', len(json.dumps(data)))
    pg.click('[data-action="reset"]'); pg.click('dialog button[value=yes]'); pg.wait_for_timeout(300); assert pg.evaluate('MWUI.S.attempts.length') == 0
    pg.goto(URL + '#prefs'); pg.set_input_files('#importFile', path); pg.wait_for_selector('dialog[open] .preview'); prev = pg.inner_text('dialog'); assert f'{n_att} exercises' in prev, prev
    pg.click('dialog button[value=merge]'); pg.wait_for_timeout(800); assert pg.evaluate('MWUI.S.attempts.length') == n_att
    pg.goto(URL + '#prefs'); pg.set_input_files('#importFile', path); pg.wait_for_selector('dialog[open] .preview'); assert f'{n_att} exercises and' in pg.inner_text('dialog'); pg.click('dialog button[value=merge]'); pg.wait_for_timeout(500)
    assert pg.evaluate('MWUI.S.attempts.length') == n_att, 'duplicates skipped'; print('merge + duplicate detection ok')
    open('/tmp/bad.json', 'w').write('{not json'); pg.goto(URL + '#prefs'); pg.set_input_files('#importFile', '/tmp/bad.json'); pg.wait_for_timeout(300); assert 'Nothing was changed' in pg.inner_text('#toast'); assert pg.evaluate('MWUI.S.attempts.length') == n_att
    v1 = {'app': 'mindwork', 'version': 1, 'profile': data['data']['profile'], 'settings': {}, 'attempts': [{'id': 'v1rec', 'itemId': 'diff-1', 'game': 'diff', 'level': 1, 't': 1700000000000, 'responses': {'distinction': 'Hearing is passive, whereas listening takes attention.'}, 'hints': 1, 'overall': 2.5, 'dims': {'nuance': 2.5}, 'status': 'assisted', 'revisions': [], 'finalized': True}], 'sessions': []}
    open('/tmp/v1.json', 'w').write(json.dumps(v1)); pg.goto(URL + '#prefs'); pg.set_input_files('#importFile', '/tmp/v1.json'); pg.wait_for_selector('dialog[open] .preview'); pg.click('dialog button[value=merge]'); pg.wait_for_timeout(500)
    assert pg.evaluate('MWUI.S.attempts.find(a=>a.id==="v1rec").versions.length') == 1; pg.reload(); pg.wait_for_timeout(600); assert pg.evaluate('MWUI.S.attempts.length') == n_att + 1; print('import ok (invalid refused, v1 accepted, survives reload)')
    # 7b. Thinking Replay on a revised exercise (the first daily item was revised)
    rid = pg.evaluate('MWUI.S.attempts.find(a=>a.versions && a.versions.length>1 && !a.legacy).id')
    orig = pg.evaluate(f'JSON.stringify(MWUI.S.attempts.find(a=>a.id==="{rid}").versions[0].responses)')
    pg.goto(URL + '#replay-' + rid); pg.wait_for_selector('.timeline')
    titles = pg.locator('.tl-title').all_inner_texts(); print('replay timeline:', titles)
    assert titles[0] == 'The challenge' and 'Your first response' in titles and any(t.startswith('Revision') for t in titles)
    assert titles.index('Your first response') < [i for i, t in enumerate(titles) if t.startswith('Revision')][0]
    assert pg.locator('.compare').count() == 1 and pg.locator('.ck-item').count() > 0
    pg.fill('[data-ref="now"]', 'That resistance depends on whether people chose the change.'); pg.locator('.useful input').first.check(); pg.click('[data-action="save-reflection"]'); pg.wait_for_timeout(300)
    pg.fill('[data-ref="next"]', 'Generate more distinct mechanisms first.'); pg.click('[data-action="save-reflection"]'); pg.wait_for_timeout(300)
    pg.reload(); pg.wait_for_selector('.timeline'); assert pg.locator('.tl-node.reflection').count() == 2
    assert pg.evaluate(f'JSON.stringify(MWUI.S.attempts.find(a=>a.id==="{rid}").versions[0].responses)') == orig, 'original answer unchanged'; print('replay ok: order, comparison, reflections kept separately, original intact')
    # legacy record: honest about missing history
    pg.goto(URL + '#replay-v1rec'); pg.wait_for_selector('.timeline'); assert 'before detailed history was recorded' in pg.inner_text('main') and 'wasn’t stored' in pg.inner_text('main'); assert pg.locator('.tl-node.hint').count() == 0; print('legacy replay honest')
    # 7c. Thinking Journal
    pg.goto(URL + '#journal'); pg.fill('#jtext', 'Meetings seem to expand to fill whatever time they are given.'); pg.click('[data-action="j-new"]'); pg.wait_for_selector('.j-current')
    jid = pg.evaluate('location.hash.slice(9)'); pg.fill('#jedit', 'Meetings expand to fill their time slot, unless someone owns the agenda.'); pg.click('[data-action="j-revise"]'); pg.wait_for_timeout(300)
    pg.click('[data-action="j-pick"][data-p="alternatives"]'); pg.fill('#exploreA', 'Maybe short slots just feel rushed and people book longer ones.'); pg.click('[data-action="j-explore"]'); pg.wait_for_timeout(300)
    pg.goto(URL + '#journal'); pg.click('input[name=jtype][value=question]', force=True); pg.fill('#jtext', 'Who should own a meeting agenda?'); pg.click('[data-action="j-new"]'); pg.wait_for_selector('.j-current')
    pg.select_option('#jlink', jid); pg.click('[data-action="j-link"]'); pg.wait_for_timeout(300); pg.select_option('#jlinkA', 'a:' + rid); pg.click('[data-action="j-link"]'); pg.wait_for_timeout(300)
    pg.reload(); pg.wait_for_timeout(600)
    j = pg.evaluate(f'JSON.stringify(MWUI.S.journal.find(x=>x.id==="{jid}"))'); j = json.loads(j)
    assert len(j['versions']) == 2 and j['versions'][0]['text'].startswith('Meetings seem') and len(j['explorations']) == 1 and len(j['links']) == 1 and j['status'] == 'developing'
    pg.goto(URL + '#journal'); assert pg.locator('.thought').count() == 2; print('journal ok: versions, exploration, two-way links, persisted, unfinished list')
    # 7d. Thinking Patterns
    pg.goto(URL + '#patterns'); pg.wait_for_selector('main h1'); ptxt = pg.inner_text('main'); levels = pg.locator('.pattern .lv').all_inner_texts(); print('pattern levels shown:', sorted(set(levels)))
    assert 'not your personality' in ptxt
    if pg.locator('.pattern details').count(): pg.locator('.pattern details summary').first.click(); assert pg.locator('.evid a').count() > 0
    if pg.locator('[data-action="pattern-practise"]').count(): pg.locator('[data-action="pattern-practise"]').first.click(); pg.wait_for_selector('.player'); assert 'one habit' in pg.inner_text('.objective'); print('pattern practice session starts')
    pg.goto(URL + '#home'); pg.wait_for_selector('.hero'); print('home reflect panel:', pg.locator('.reflect-home').count())
    # 8. Offline: service worker cached, then network off
    pg.goto(URL); pg.wait_for_timeout(1500); pg.evaluate('navigator.serviceWorker.ready'); pg.reload(); pg.wait_for_timeout(500)
    reqs = []; pg.on('request', lambda r: reqs.append(r.url))
    ctx.set_offline(True); pg.reload(); pg.wait_for_selector('.hero', timeout=5000)
    pg.click('[data-action="mode"][data-mode="quick"]'); pg.wait_for_selector('.player'); play_current(pg); print('offline load + exercise ok')
    ext = [u for u in reqs if not u.startswith('http://localhost:8765') and not u.startswith('data:') and not u.startswith('blob:')]; print('external requests', ext)
    # 9. Mobile layout
    m = b.new_page(viewport={'width': 390, 'height': 844}); m.goto(URL); m.wait_for_selector('.hero'); m.click('.menu-btn'); assert m.locator('#nav').is_visible(); m.click('#nav a[href="#library"]'); m.wait_for_selector('.lib-game')
    sw = m.evaluate('document.documentElement.scrollWidth'); print('mobile scrollWidth', sw)
    for h in ['replay', 'journal', 'patterns', 'prefs']:
        m.goto(URL + '#' + h); m.wait_for_timeout(300); w = m.evaluate('document.documentElement.scrollWidth'); assert w <= 390, (h, w)
    print('mobile new pages no overflow')
    print('page errors', errs[:5])
    b.close()
    sys.exit(1 if failed or errs else 0)
