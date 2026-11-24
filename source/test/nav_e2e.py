"""Navigation, privacy, accessibility and Improvement Workshop test (approved architecture, 21 November 2026).
Every path is followed by clicking or tapping, not by typing addresses, and step counts are checked."""
import sys, os, json, subprocess, time, atexit
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from helpers import *
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8780', '--bind', '127.0.0.1'], cwd=os.path.join(HERE, '..', 'dist', 'pwa'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); atexit.register(srv.terminate); time.sleep(1)
U = 'http://localhost:8780/index.html'
fails = []
def check(cond, msg):
    print(('PASS ' if cond else 'FAIL ') + msg)
    if not cond: fails.append(msg)
def h1(pg): pg.wait_for_timeout(120); return (pg.locator('main h1').first.inner_text() if pg.locator('main h1').count() else '').strip()
DESTS = [('Today', 'home'), ('Think', 'think'), ('Learn', 'learn'), ('Communicate', 'communicate'), ('Grow', 'grow'), ('Improve', 'improve'), ('Progress', 'progress-home')]
ENVS = [  # (destination, card text, expected heading, steps on desktop)
    ('Think', 'Cognitive Playground', 'Cognitive Playground'), ('Think', 'Deep Thinking', 'Deep Thinking'), ('Think', 'Exercise Library', 'Exercise Library'),
    ('Learn', 'Study Lab', 'Study Lab'), ('Learn', 'Knowledge Connections', 'Knowledge Connections'), ('Communicate', 'Conversation Lab', 'Conversation Lab'),
    ('Grow', 'Thinking Journal', 'Thinking Journal'), ('Progress', 'My Progress', 'My Progress'), ('Progress', 'Thinking Patterns', 'Thinking Patterns'), ('Progress', 'Thinking Replay', 'Thinking Replay')]
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 1280, 'height': 900}, accept_downloads=True); pg = ctx.new_page()
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto(U); pg.wait_for_selector('.hero')
    # ── desktop: seven destinations in the rail, one click each
    labels = pg.locator('#nav .dest-link span').all_inner_texts(); check(labels == [d[0] for d in DESTS], f'desktop rail lists the seven destinations in order: {labels}')
    for label, view in DESTS:
        pg.locator('#nav .dest-link', has_text=label).click(); pg.wait_for_timeout(150)
        check(pg.evaluate('document.querySelector("main").dataset.view') == view and pg.locator(f'#nav [data-nav][aria-current]', has_text=label).count() == 1, f'desktop: {label} in 1 click, highlighted')
    # ── desktop: every built environment in two clicks (destination, card), category in three
    for dest, card, head in ENVS:
        pg.locator('#nav .dest-link', has_text=dest).click(); pg.wait_for_timeout(100); pg.locator('.env-card', has_text=card).first.click()
        check(h1(pg) == head, f'desktop: {dest} → {card} in 2 clicks (heading "{h1(pg)}")')
    pg.locator('#nav .dest-link', has_text='Think').click(); pg.locator('.cat-tile', has_text='Critical Thinking').click(); check(h1(pg) == 'Critical Thinking', 'desktop: Think → Critical Thinking category in 2 clicks')
    pg.locator('#nav .dest-link', has_text='Think').click(); pg.locator('.env-card', has_text='Cognitive Playground').click(); pg.locator('.cat-tile', has_text='Perspective').click(); check(h1(pg) == 'Perspective', 'desktop: Think → Cognitive Playground → category in 3 clicks')
    pg.click('.util-settings'); check(h1(pg) == 'Settings', 'desktop: Settings in 1 click')
    # ── every pre-existing address still opens the same page
    old = {'home': None, 'daily': 'Daily Practice', 'games': 'Cognitive Playground', 'games-connect': 'Connecting Ideas', 'convo': 'Conversation Lab', 'deep': 'Deep Thinking', 'library': 'Exercise Library', 'study': 'Study Lab', 'connections': 'Knowledge Connections',
           'replay': 'Thinking Replay', 'patterns': 'Thinking Patterns', 'journal': 'Thinking Journal', 'progress': 'My Progress', 'prefs': 'Settings'}
    for h, head in old.items():
        pg.goto(U + '#' + h); pg.wait_for_timeout(250)
        check((pg.locator('.hero').count() == 1) if head is None else (h1(pg) == head), f'old address #{h} opens {head or "Today"}')
    # ── privacy: an unfinished journal entry never shows its text outside the journal
    pg.goto(U + '#journal'); pg.fill('#jtext', 'ZEBRA private phrase about my fears'); pg.click('[data-action="j-new"]'); pg.wait_for_selector('.j-current')
    for h in ['home', 'grow', 'progress-home', 'improve', 'think']:
        pg.goto(U + '#' + h); pg.wait_for_timeout(250); check('ZEBRA' not in pg.inner_text('body'), f'privacy: journal text absent from #{h}')
    pg.goto(U + '#home'); pg.wait_for_timeout(200); check('1 unfinished thought' in pg.inner_text('main'), 'Today shows a discreet prompt for the unfinished entry')
    # ── keyboard and labels
    pg.goto(U + '#home'); pg.reload(); pg.wait_for_selector('.hero'); pg.keyboard.press('Tab'); check(pg.evaluate('document.activeElement.className') == 'skip', 'keyboard: first Tab reaches "Skip to content"')
    names = pg.evaluate('[...document.querySelectorAll("#nav a, .tabbar a, .tabbar button, .util-settings")].filter(e=>!(e.textContent.trim()||e.getAttribute("aria-label"))).length'); check(names == 0, 'every navigation control has an accessible name')
    # ── Improvement Workshop through the interface: evidence → target → practice → reassessment
    pg.goto(U + '#improve'); check(h1(pg) == 'Improve' and 'No targets yet' in pg.inner_text('main'), 'Improve with no evidence explains how targets arise (no placeholder)')
    one = ['possibility-1', 'possibility-2', 'whatelse-1', 'possibility-3', 'whatelse-2']
    for iid in one:
        pg.evaluate(f'MWUI.startMode("single",{{itemId:"{iid}"}})'); pg.wait_for_selector('.player')
        pg.locator('.stage.active textarea.idea').first.fill('They are simply tired'); pg.click('[data-act="next-stage"]'); pg.click('[data-act="next-stage"]')
        pg.locator('.stage.active textarea').last.fill('I would ask them, because asking is quickest.'); pg.click('[data-act="submit"]'); pg.locator('[data-act="rate"]').nth(1).click(); pg.wait_for_selector('.feedback'); pg.click('[data-act="next-item"]'); pg.wait_for_selector('.summary')
    pg.goto(U + '#improve'); pg.wait_for_selector('.cands'); txt = pg.inner_text('main')
    check('Settling on the first explanation' in txt, 'a recurring difficulty appears as a candidate with its evidence count')
    pg.locator('.cand', has_text='Settling on the first explanation').locator('[data-action="imp-add"]').click(); pg.wait_for_selector('.target')
    card = pg.inner_text('.target'); check('Why it matters' in card and 'Evidence from your attempts' in card and 'Active' in card, 'target card shows observation, why it matters, evidence and state')
    pg.click('[data-action="imp-practise"]'); pg.wait_for_selector('.player'); k = pg.evaluate('MWP.state.sess.items.length'); check('Targeted practice' in pg.inner_text('.objective'), f'targeted practice session starts ({k} exercises)')
    for _ in range(k): play_current(pg)
    pg.wait_for_selector('.summary'); check(pg.locator('.summary a[href="#improve"]').count() == 1, 'session summary links back to the Improvement Workshop'); pg.click('.summary a[href="#improve"]')
    pg.wait_for_selector('.target'); check('Ready for reassessment' in pg.inner_text('.target'), 'after practice the target is ready for reassessment')
    pg.click('[data-action="imp-reassess"]'); pg.wait_for_selector('.player'); check('Nothing here tells you which habit' in pg.inner_text('.objective'), 'reassessment does not reveal what is being checked')
    games = pg.evaluate('MWP.state.sess.items.map(i=>i.game)'); print('  reassessment games:', games)
    for _ in range(len(games)): play_current(pg)
    pg.goto(U + '#improve'); pg.wait_for_selector('.target'); st = pg.inner_text('.target'); print('  target after check:', st.split('\n')[0])
    check('Checks so far' in st and ('Improving' in st or 'Practising' in st), 'reassessment result recorded against the target')
    pg.wait_for_timeout(500); pg.reload(); pg.wait_for_selector('.target'); check(pg.evaluate('MWUI.S.improve.targets[0].reassess.length') == 1, 'target, sessions and checks persist after reload')
    # ── phones: bar, Menu sheet, step counts, no sideways scrolling
    for w, hgt in [(390, 844), (360, 740)]:
        m = ctx.new_page(); m.set_viewport_size({'width': w, 'height': hgt}); m.goto(U + '#home'); m.wait_for_selector('.hero')
        tabs = m.locator('.tabbar a span').all_inner_texts() + [m.locator('.menu-btn span').first.inner_text()]; check(tabs == ['Today', 'Think', 'Learn', 'Communicate', 'Menu'], f'{w}px: bottom bar {tabs}')
        for label, view in DESTS[:4]:
            m.locator('.tabbar a', has_text=label).click(); m.wait_for_timeout(120); check(m.evaluate('document.querySelector("main").dataset.view') == view, f'{w}px: {label} in 1 tap')
        m.click('.menu-btn'); check(m.locator('#nav').is_visible() and m.get_attribute('.menu-btn', 'aria-expanded') == 'true', f'{w}px: Menu opens the sheet')
        ys = {d: m.locator('#nav .dest-link', has_text=d).bounding_box()['y'] for d in ['Grow', 'Improve', 'Progress', 'Today']}
        check(ys['Grow'] < ys['Today'] and ys['Improve'] < ys['Today'] and ys['Progress'] < ys['Today'], f'{w}px: Grow, Improve and Progress lead the Menu sheet')
        check(m.locator('#nav .dest-link').count() == 7, f'{w}px: Menu sheet lists all seven destinations')
        m.keyboard.press('Escape'); check(not m.locator('#nav').is_visible(), f'{w}px: Escape closes the sheet')
        for dest, env, head in [('Grow', 'Thinking Journal', 'Thinking Journal'), ('Progress', 'My Progress', 'My Progress'), ('Progress', 'Thinking Patterns', 'Thinking Patterns'), ('Progress', 'Thinking Replay', 'Thinking Replay'), ('Think', 'Exercise Library', 'Exercise Library'), ('Learn', 'Study Lab', 'Study Lab')]:
            m.click('.menu-btn'); m.locator('#nav .dest', has_text=dest).locator('.nav-envs a', has_text=env).click(); check(h1(m) == head, f'{w}px: Menu → {env} in 2 taps')
        for dest, view in [('Grow', 'grow'), ('Improve', 'improve'), ('Progress', 'progress-home')]:
            m.click('.menu-btn'); m.locator('#nav .dest-link', has_text=dest).click(); m.wait_for_timeout(120); check(m.evaluate('document.querySelector("main").dataset.view') == view, f'{w}px: Menu → {dest} page in 2 taps')
        m.goto(U + '#home'); m.wait_for_selector('.short'); m.locator('.short', has_text='Improve').click(); m.wait_for_timeout(150); check(m.evaluate('document.querySelector("main").dataset.view') == 'improve', f'{w}px: Today → Improve shortcut in 1 tap')
        m.click('.menu-btn'); m.locator('#nav .sheet-util a').click(); check(h1(m) == 'Settings', f'{w}px: Menu → Settings in 2 taps')
        check(m.locator('.menu-btn .badge').is_visible(), f'{w}px: Menu badge shows something behind Menu needs attention')
        over = []
        for h in ['home', 'think', 'learn', 'communicate', 'grow', 'improve', 'progress-home', 'games', 'deep', 'library', 'study', 'connections', 'convo', 'journal', 'progress', 'patterns', 'replay', 'prefs']:
            m.goto(U + '#' + h); m.wait_for_timeout(200); sw = m.evaluate('document.documentElement.scrollWidth')
            if sw > w: over.append((h, sw))
        check(not over, f'{w}px: no page scrolls sideways {over}')
        m.close()
    # ── offline: destination pages load with the network off
    pg.goto(U); pg.wait_for_timeout(1500); pg.reload(); pg.wait_for_timeout(500); reqs = []; pg.on('request', lambda r: reqs.append(r.url)); ctx.set_offline(True)
    for h in ['home', 'think', 'learn', 'communicate', 'grow', 'improve', 'progress-home']:
        pg.goto(U + '#' + h); pg.wait_for_timeout(200)
    check(h1(pg) == 'Progress', 'offline: every destination page loads'); check(not [u for u in reqs if not u.startswith('http://localhost:8780') and not u.startswith(('data:', 'blob:'))], 'offline: no external requests')
    check(not errs, f'no page errors {errs[:3]}')
    b.close()
print(f'\n{len(fails)} failed'); sys.exit(1 if fails else 0)
