"""Puzzle Arena through the interface: every mechanic, hints, reveal, reasoning checks, Improve integration, phones, offline, backup."""
import sys, os, json, subprocess, time, atexit
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from helpers import *
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8787', '--bind', '127.0.0.1'], cwd=os.path.join(HERE, '..', 'dist', 'pwa'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); atexit.register(srv.terminate); time.sleep(1)
U = 'http://localhost:8787/index.html'; fails = []
def check(c, m): print(('PASS ' if c else 'FAIL ') + m); (fails.append(m) if not c else None)
def h1(pg): pg.wait_for_timeout(150); return pg.locator('main h1').first.inner_text().strip() if pg.locator('main h1').count() else ''
def done_text(pg): pg.wait_for_selector('.pz-done'); return pg.inner_text('.pz-done')
def key(pg, pid, right=True):
    k = pg.evaluate(f'MWPZ.PZ["{pid}"].key ? MWPZ.PZ["{pid}"].key.correct[0] : null')
    if k is not None: pg.wait_for_selector('[data-action="pz-key"]'); n = pg.locator('[data-action="pz-key"]').count(); pg.locator('[data-action="pz-key"]').nth(k if right else (k + 1) % n).click()
def solve(pg, pid, conf=0, right_key=True):
    """Answer a choice/visual puzzle correctly through the interface (index read from the puzzle data)."""
    pg.goto(U + '#puzzle-' + pid); pg.wait_for_selector('.puzzle'); c = pg.evaluate(f'MWPZ.PZ["{pid}"].correct[0]')
    pg.locator('[data-action="pz-pick"]').nth(c).click(); pg.locator('[data-action="pz-check"]').nth(conf).click(); key(pg, pid, right_key); return done_text(pg)
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 1280, 'height': 900}, accept_downloads=True); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto(U); pg.wait_for_selector('.hero')
    pg.locator('#nav .dest-link', has_text='Think').click(); pg.locator('.env-card', has_text='Puzzle Arena').click(); check(h1(pg) == 'Puzzle Arena', 'desktop: Think → Puzzle Arena in 2 clicks')
    check(pg.locator('.cat-tile').count() == 9 and pg.locator('.boss').count() == 1, 'nine categories and a boss puzzle')
    # typed answer with a hint, then the reasoning check
    pg.goto(U + '#puzzle-lat-1'); pg.click('[data-action="pz-hint"]'); check(pg.locator('.hint').count() == 1, 'a subtle hint first')
    pg.fill('#pzA', 'He is playing Monopoly'); pg.locator('[data-action="pz-check"]').first.click(); key(pg, 'lat-1'); t = done_text(pg)
    check('Correct, with sound reasoning' in t, 'typed answer + correct decisive idea → sound reasoning')
    pg.goto(U + '#puzzle-lat-4'); pg.fill('#pzA', 'R5 and R1'); pg.locator('[data-action="pz-check"]').nth(1).click(); key(pg, 'lat-4', right=False); check('reasoning check didn’t match' in done_text(pg), 'correct answer but wrong decisive idea → flagged as uncertain reasoning')
    # insufficient evidence: a confident wrong first answer, then the right one
    pg.goto(U + '#puzzle-ded-2'); pg.locator('[data-action="pz-pick"]').nth(0).click(); pg.locator('[data-action="pz-check"]').first.click(); pg.wait_for_timeout(150)
    check('evidence really supports' in pg.inner_text('#pzMsg'), 'overreaching answer gets a pointed, non-revealing message')
    pg.locator('[data-action="pz-pick"]').nth(3).click(); pg.locator('[data-action="pz-check"]').first.click(); key(pg, 'ded-2'); done_text(pg)
    check(pg.evaluate('MWUI.S.plog.find(e=>e.pid==="ded-2").firstOverreach') is True, 'first answer recorded as concluding beyond the evidence')
    check('Not quite' not in pg.inner_text('#pzMsg'), 'the earlier "not quite" message is cleared once solved')
    check('Correct, but you said you guessed' in solve(pg, 'pat-3', conf=3), 'visual matrix solved; "guessing" recorded honestly')
    check('sound reasoning' in solve(pg, 'log-5'), 'the self-contradicting puzzle: "it contradicts itself" is accepted')
    # logic grid
    pg.goto(U + '#puzzle-log-2'); sol = pg.evaluate('MWPZ.PZ["log-2"].solution')
    for n, vals in sol.items():
        for k, v in enumerate(vals): pg.select_option(f'select[data-gp="{n}"][data-gk="{k}"]', v)
    pg.locator('[data-action="pz-check"]').first.click(); key(pg, 'log-2'); check('sound reasoning' in done_text(pg), 'logic grid solved through the selects')
    # strategy game against MINDWORK
    pg.goto(U + '#puzzle-str-1')
    for _ in range(8):
        if pg.locator('[data-action="pz-key"]').count() or not pg.locator('[data-action="pz-nim"]').count(): break
        n = int(pg.inner_text('.nim-n strong')); pg.locator(f'[data-action="pz-nim"][data-k="{(n % 4) or 1}"]').click()
    key(pg, 'str-1'); check('sound reasoning' in done_text(pg), 'won the counters game by leaving multiples of 4')
    # tower of Hanoi by tapping pegs
    pg.goto(U + '#puzzle-str-2'); seq = []
    def hs(n, a, c, b):
        if n: hs(n - 1, a, b, c); seq.append((a, c)); hs(n - 1, b, c, a)
    hs(4, 0, 2, 1)
    for a, c in seq: pg.locator(f'[data-action="pz-peg"][data-i="{a}"]').click(); pg.locator(f'[data-action="pz-peg"][data-i="{c}"]').click()
    key(pg, 'str-2'); t = done_text(pg); check('15 moves (minimum 15)' in t, 'tower solved in the minimum 15 moves')
    pg.goto(U + '#puzzle-str-4')
    for op in ['fillA', 'AtoB', 'emptyB', 'AtoB', 'fillA', 'AtoB']: pg.locator(f'[data-action="pz-jug"][data-op="{op}"]').click()
    key(pg, 'str-4'); check('6 moves (minimum 6)' in done_text(pg), 'water jugs solved in the minimum six steps')
    pg.goto(U + '#puzzle-str-3'); pg.locator('.pz-item').nth(0).check(); pg.locator('.pz-item').nth(2).check(); pg.locator('[data-action="pz-check"]').first.click(); pg.wait_for_timeout(150)
    check('isn’t the most people' in pg.inner_text('#pzMsg'), 'a within-budget but weaker plan is explained, not just marked wrong')
    pg.locator('.pz-item').nth(2).uncheck(); pg.locator('.pz-item').nth(4).check(); pg.locator('[data-action="pz-check"]').first.click(); key(pg, 'str-3'); check('sound reasoning' in done_text(pg), 'budget allocation: one of two optimal plans accepted')
    # spot the difference: two by mouse, two by keyboard
    pg.goto(U + '#puzzle-vis-1'); diffs = pg.evaluate('MWPZ.PZ["vis-1"].diffs.map(d=>d.i)')
    for i, d in enumerate(diffs):
        g = pg.locator(f'.spot figure:nth-child(2) [data-spot="{d}"]')
        if i < 2: g.click()
        else: g.focus(); pg.keyboard.press('Enter')
    pg.locator('[data-action="pz-check"]').first.click(); check('Solved' in done_text(pg), 'spot the difference solved with mouse and keyboard')
    # the boss: three linked locks
    pg.goto(U + '#puzzle-esc-1'); pg.fill('#pzA', 'seven'); pg.click('[data-action="pz-stage"]'); check('752' not in pg.inner_text('#pzMsg') and 'drawer' in pg.inner_text('#pzMsg'), 'lock 1 opens and leads to lock 2')
    pg.fill('#pzA', '751'); pg.click('[data-action="pz-stage"]'); check('doesn’t open' in pg.inner_text('#pzMsg'), 'a wrong code is refused'); pg.fill('#pzA', '752'); pg.click('[data-action="pz-stage"]')
    pg.locator('[data-action="pz-stage"]').nth(1).click(); key(pg, 'esc-1'); check('sound reasoning' in done_text(pg), 'boss puzzle: all three locks')
    # reveal and challenge mode
    pg.goto(U + '#puzzle-pat-2'); pg.click('#pzChallenge'); pg.wait_for_timeout(100); check(pg.locator('[data-action="pz-hint"]').count() == 0, 'challenge mode hides hints')
    pg.click('[data-action="pz-reveal"]'); pg.click('dialog button[value=yes]'); check('Solution revealed' in done_text(pg), 'revealing is recorded as revealed, not solved')
    # Improve: a second overreach makes the pattern emerge
    pg.goto(U + '#puzzle-log-3'); pg.locator('[data-action="pz-pick"]').nth(0).click(); pg.locator('[data-action="pz-check"]').first.click(); pg.locator('[data-action="pz-pick"]').nth(2).click(); pg.locator('[data-action="pz-check"]').first.click(); key(pg, 'log-3'); done_text(pg)
    pg.goto(U + '#improve'); pg.wait_for_timeout(300); check('Concluding beyond the evidence' in pg.inner_text('main'), 'Improve shows "Concluding beyond the evidence" from puzzle attempts')
    pg.locator('.cand', has_text='Concluding beyond the evidence').locator('[data-action="imp-add"]').click(); pg.wait_for_selector('.target'); check(pg.locator('.target a[href^="#puzzle-"]').count() >= 1, 'its evidence links to the puzzles themselves')
    pg.click('[data-action="imp-practise"]'); pg.wait_for_selector('.puzzle'); setp = pg.evaluate('MWPZUI.set.items.map(i=>i.pid)'); print('  practice puzzles:', setp)
    for pid in setp:
        pz = pg.evaluate(f'MWPZ.PZ["{pid}"].kind')
        solve(pg, pid) if pz in ('choice', 'visual') else None
    pg.wait_for_selector('.pz-done'); check(pg.locator('a[data-action="pz-set-end"]').count() == 1, 'the end of the set leads back to the Improvement Workshop'); pg.click('a[data-action="pz-set-end"]')
    pg.wait_for_selector('.target'); check('Ready for reassessment' in pg.inner_text('.target'), 'target ready for reassessment after the practice puzzles')
    pg.click('[data-action="imp-reassess"]'); pg.wait_for_selector('.puzzle'); rp = pg.evaluate('MWPZUI.set.items.map(i=>i.pid)'); print('  check puzzles:', rp)
    for pid in rp: solve(pg, pid)
    pg.goto(U + '#improve'); pg.wait_for_selector('.target'); check('Improving' in pg.inner_text('.target'), 'clean check in new puzzles → Improving')
    # abilities and persistence
    pg.goto(U + '#overview'); check('None yet' not in pg.locator('.ov-table tr', has_text='Strategic Thinking').inner_text(), 'strategic thinking now has evidence, from the Puzzle Arena')
    pg.goto(U + '#abilities-strategic'); check('In the Puzzle Arena' in pg.inner_text('main'), 'Thinking Abilities lists the Puzzle Arena for strategic thinking')
    n = pg.evaluate('MWUI.S.plog.length'); pg.wait_for_timeout(500); pg.reload(); pg.wait_for_timeout(800); check(pg.evaluate('MWUI.S.plog.length') == n, f'all {n} puzzle attempts persist after reload')
    pg.goto(U + '#arena'); check('Recent attempts' in pg.inner_text('main'), 'the Arena lists recent attempts')
    # backup
    pg.goto(U + '#prefs'); pg.wait_for_selector('#storageLine')
    with pg.expect_download() as d: pg.click('[data-action="export"][data-kind="full"]')
    data = json.load(open(d.value.path())); check(data['counts'].get('puzzles') == n and len(data['data']['improve']['targets']) == 1, 'full backup contains puzzle attempts and the puzzle target')
    # phones
    for w in (390, 360):
        mc = b.new_context(viewport={'width': w, 'height': 800}, has_touch=True, is_mobile=True); m = mc.new_page(); m.goto(U + '#home'); m.wait_for_selector('.hero')
        m.click('.menu-btn'); m.locator('#nav .dest', has_text='Think').locator('.nav-envs a', has_text='Puzzle Arena').click(); check(h1(m) == 'Puzzle Arena', f'{w}px: Menu → Puzzle Arena in 2 taps')
        m.goto(U + '#puzzle-str-2'); m.locator('[data-action="pz-peg"][data-i="0"]').tap(); m.locator('[data-action="pz-peg"][data-i="2"]').tap(); check('1 move' in m.inner_text('.hanoi + p'), f'{w}px: tapping pegs moves a disc')
        over = []
        for h in ['arena', 'arena-strategic', 'puzzle-str-2', 'puzzle-str-4', 'puzzle-vis-1', 'puzzle-pat-3', 'puzzle-log-2', 'puzzle-esc-1', 'puzzle-ded-3', 'puzzle-str-3', 'puzzle-str-1']:
            m.goto(U + '#' + h); m.wait_for_timeout(200); sw = m.evaluate('document.documentElement.scrollWidth'); (over.append((h, sw)) if sw > w else None)
        check(not over, f'{w}px: no sideways scrolling {over}'); mc.close()
    # offline
    pg.goto(U); pg.wait_for_timeout(1500); pg.reload(); pg.wait_for_timeout(400); ctx.set_offline(True)
    check('sound reasoning' in solve(pg, 'ded-1'), 'offline: a puzzle can be played and checked')
    check(not errs, f'no page errors {errs[:3]}'); b.close()
print(f'\n{len(fails)} failed'); sys.exit(1 if fails else 0)
