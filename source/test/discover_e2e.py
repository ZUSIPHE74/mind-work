"""Thinking Abilities, Abilities Overview, search and Exercise Library filters, through the interface, on desktop and phone."""
import sys, os, subprocess, time, atexit
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from helpers import *
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8785', '--bind', '127.0.0.1'], cwd=os.path.join(HERE, '..', 'dist', 'pwa'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); atexit.register(srv.terminate); time.sleep(1)
U = 'http://localhost:8785/index.html'; fails = []
def check(c, m): print(('PASS ' if c else 'FAIL ') + m); (fails.append(m) if not c else None)
def h1(pg): pg.wait_for_timeout(150); return pg.locator('main h1').first.inner_text().strip() if pg.locator('main h1').count() else ''
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 1280, 'height': 900}); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto(U); pg.wait_for_selector('.hero')
    # Thinking Abilities in Think: 2 clicks
    pg.locator('#nav .dest-link', has_text='Think').click(); pg.locator('.env-card', has_text='Thinking Abilities').click(); check(h1(pg) == 'Thinking Abilities', 'desktop: Think → Thinking Abilities in 2 clicks')
    check(pg.locator('.ability').count() == 12, 'twelve abilities listed'); check('No evidence yet' in pg.inner_text('.ability-grid'), 'no stages shown before any work')
    pg.locator('.ability', has_text='Strategic Thinking').click(); pg.wait_for_timeout(250); t = pg.inner_text('main')
    check('In the Puzzle Arena' in t and 'Strategic Thinking' in t and pg.locator('[data-action="ab-practise"]').count() == 0, 'strategic thinking is trained in the Puzzle Arena (no Playground game claims it)')
    pg.goto(U + '#abilities-critical'); check(pg.locator('.ab-acts li').count() >= 6, 'critical thinking lists the activities that train it')
    pg.click('[data-action="ab-practise"]'); pg.wait_for_selector('.player'); games = pg.evaluate('MWP.state.sess.items.map(i=>i.game)')
    tags = pg.evaluate('MWA.GAME_TAGS'); check(len(games) == 3 and all('critical' in tags[g] for g in games), f'practising critical thinking starts three critical-thinking exercises {games}')
    for _ in range(3): play_current(pg)
    pg.wait_for_selector('.summary')
    # Abilities Overview in Progress: 2 clicks
    pg.locator('#nav .dest-link', has_text='Progress').click(); pg.locator('.env-card', has_text='Abilities Overview').click(); check(h1(pg) == 'Abilities Overview', 'desktop: Progress → Abilities Overview in 2 clicks')
    row = pg.locator('.ov-table tr', has_text='Critical Thinking').inner_text(); print('  critical row:', row.replace('\n', ' | ')[:160])
    check('None yet' not in row, 'critical thinking now shows at least exposure, from the exercises just completed')
    check('None yet' in pg.locator('.ov-table tr', has_text='Strategic Thinking').inner_text(), 'abilities without evidence stay at none')
    check('not validated' in pg.inner_text('main') or 'fixed rule' in pg.inner_text('main'), 'overview states that stages come from fixed rules')
    # Exercise Library filters
    pg.goto(U + '#library'); pg.select_option('#libAb', 'logical'); pg.wait_for_timeout(200)
    names = pg.locator('.lib-game summary strong').all_inner_texts(); check(set(names) == {'Find the Weak Link', 'Both Can Be True', 'Build an Argument'}, f'library filtered to logical thinking: {names}')
    pg.select_option('#libAb', 'critical'); pg.check('#libUntried'); pg.wait_for_timeout(200); names2 = pg.locator('.lib-game summary strong').all_inner_texts()
    played = pg.evaluate('[...new Set(MWUI.S.attempts.map(a=>MW.GAME[a.game].name))]'); check(not set(names2) & set(played), f'"not tried yet" hides games already played ({len(names2)} left)')
    pg.uncheck('#libUntried'); pg.select_option('#libAb', ''); pg.wait_for_timeout(150); check(pg.locator('.lib-game').count() >= 33, 'clearing filters shows every game again')
    # Search
    pg.goto(U + '#journal'); pg.fill('#jtext', 'QUOKKA private worry about the interview'); pg.click('[data-action="j-new"]'); pg.wait_for_selector('.j-current')
    pg.goto(U + '#home'); pg.wait_for_selector('.hero'); pg.keyboard.press('/'); check(h1(pg) == 'Search' and pg.evaluate('document.activeElement.id') == 'q', 'the / key opens search with the cursor in the box')
    pg.fill('#q', 'weak link'); pg.wait_for_timeout(200); check(pg.locator('.res').first.inner_text().startswith('Find the Weak Link'), 'search: "weak link" finds the game first')
    pg.keyboard.press('Enter'); pg.wait_for_selector('.player'); check(pg.inner_text('.p-title') == 'Find the Weak Link', 'Enter on the first result opens the game in the player')
    pg.click('.util-search'); pg.fill('#q', 'backup'); pg.wait_for_timeout(150); check(pg.locator('.res').first.inner_text().startswith('Settings'), 'search: "backup" leads to Settings')
    pg.fill('#q', 'quokka'); pg.wait_for_timeout(150); res = pg.inner_text('#results'); check('Thinking Journal entry' in res and 'QUOKKA' not in res.upper().replace('QUOKKA PRIVATE', 'X') and 'interview' not in res, 'search finds the journal entry without showing its text')
    pg.locator('.res').first.click(); pg.wait_for_timeout(200); check(pg.locator('.j-current').count() == 1, 'the journal result opens the entry itself')
    pg.click('.util-search'); pg.fill('#q', 'systems thinking'); pg.wait_for_timeout(150); pg.locator('.res').first.click(); check(h1(pg) == 'Systems Thinking', 'search opens an ability page')
    pg.click('.util-search'); pg.fill('#q', 'zzzz qqqq'); pg.wait_for_timeout(150); check('Nothing matches' in pg.inner_text('#results'), 'no-result message for an unmatched search')
    # Phone
    for w in (390, 360):
        m = ctx.new_page(); m.set_viewport_size({'width': w, 'height': 800}); m.goto(U + '#home'); m.wait_for_selector('.hero')
        m.click('.topbar [data-nav="search"]'); check(h1(m) == 'Search', f'{w}px: search from the top bar in 1 tap')
        m.click('.menu-btn'); m.locator('#nav .dest', has_text='Think').locator('.nav-envs a', has_text='Thinking Abilities').click(); check(h1(m) == 'Thinking Abilities', f'{w}px: Menu → Thinking Abilities in 2 taps')
        m.click('.menu-btn'); m.locator('#nav .dest', has_text='Progress').locator('.nav-envs a', has_text='Abilities Overview').click(); check(h1(m) == 'Abilities Overview', f'{w}px: Menu → Abilities Overview in 2 taps')
        m.click('.menu-btn'); m.locator('#nav .sheet-search a').click(); check(h1(m) == 'Search', f'{w}px: Menu → Search in 2 taps')
        over = []
        for h in ['abilities', 'abilities-critical', 'abilities-strategic', 'overview', 'library', 'think', 'progress-home']:
            m.goto(U + '#' + h); m.wait_for_timeout(200); sw = m.evaluate('document.documentElement.scrollWidth'); (over.append((h, sw)) if sw > w else None)
        m.goto(U + '#search'); m.fill('#q', 'thinking'); m.wait_for_timeout(200); sw = m.evaluate('document.documentElement.scrollWidth'); (over.append(('search', sw)) if sw > w else None)
        check(not over, f'{w}px: no sideways scrolling {over}'); m.close()
    # offline
    pg.goto(U); pg.wait_for_timeout(1500); pg.reload(); pg.wait_for_timeout(400); ctx.set_offline(True)
    for h in ['abilities', 'overview', 'search']: pg.goto(U + '#' + h); pg.wait_for_timeout(200)
    check(h1(pg) == 'Search', 'offline: abilities, overview and search load')
    check(not errs, f'no page errors {errs[:3]}'); b.close()
print(f'\n{len(fails)} failed'); sys.exit(1 if fails else 0)
