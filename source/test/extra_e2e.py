"""Bosses, challenge/transfer modes, Multiple Approaches, Knowledge in Action, weekly puzzles, skill tree, AI role-play, voice mode toggle.
AI parts use a STAND-IN model."""
import sys, os, json, re, subprocess, time, atexit
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from helpers import *
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8806', '--bind', '127.0.0.1'], cwd=os.path.join(HERE, '..', 'dist', 'pwa'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); atexit.register(srv.terminate); time.sleep(1)
U = 'http://localhost:8806/index.html'; fails = []; PROMPTS = []
def check(c, m): print(('PASS ' if c else 'FAIL ') + m); (fails.append(m) if not c else None)
def h1(pg): pg.wait_for_timeout(150); return pg.locator('main h1').first.inner_text().strip() if pg.locator('main h1').count() else ''
def stub(route):
    p = json.loads(route.request.post_data)['prompt']; PROMPTS.append(p); mine = re.findall(r'^(?:You|Person): (.*)$', p, re.M)
    if 'playing a person' in p: return route.fulfill(json={'text': json.dumps({'reply': 'Fine. But it still has to get done.', 'end': False})})
    return route.fulfill(json={'text': json.dumps({'summary': 's', 'strengths': [{'point': 'Named a real assumption', 'evidence': mine[0][:25] if mine else 'x'}], 'development': [], 'inferred': [], 'uncertain': [], 'cannot_assess': [], 'moves': [], 'qualities': [], 'abilities': [{'id': 'critical', 'evidence': mine[0][:25] if mine else 'x'}, {'id': 'systems', 'evidence': 'not her words'}], 'question_for_you': ''})})
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 1280, 'height': 900}); ctx.route('**/ai-status.json', lambda r: r.fulfill(json={'available': True, 'provider': 'Stand-in', 'model': 'stub'})); ctx.route('**/api/ai', stub)
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); pg.goto(U); pg.wait_for_selector('.hero')
    pg.goto(U + '#think'); t = pg.inner_text('main'); check(all(x in t for x in ['Boss challenges', 'Multiple Approaches', 'Challenge mode', 'Transfer challenge']), 'Think offers bosses, Multiple Approaches, Challenge mode and Transfer')
    pg.locator('.env-card', has_text='Challenge mode').click(); pg.wait_for_selector('.player'); check(pg.locator('[data-act="hint"]').count() == 0 and pg.evaluate('MWP.state.sess.noHints'), 'Challenge mode: no hints')
    play_current(pg); pg.goto(U + '#think'); first = pg.evaluate('MWUI.S.attempts.map(a=>a.game)')
    pg.locator('.env-card', has_text='Transfer challenge').click(); pg.wait_for_selector('.player'); tg = pg.evaluate('MWP.state.sess.items.map(i=>i.game)'); check(tg and not set(tg) & set(first), f'transfer uses exercises not met before {tg}')
    pg.goto(U + '#bosses'); check(pg.locator('.boss-card').count() == 5, 'five bosses across Think, Learn and Communicate')
    pg.locator('.boss-card', has_text='Critical Thinker').locator('[data-action="ex-boss"]').click(); pg.wait_for_selector('.player')
    lv = pg.evaluate('MWP.state.sess.items.map(i=>MW.ITEM[i.itemId] ? MW.ITEM[i.itemId].lvl : 3)'); check(min(lv) >= 3 and pg.locator('[data-act="hint"]').count() == 0, f'boss: level 3+, no hints {lv}')
    for _ in range(4): play_current(pg)
    pg.goto(U + '#bosses'); st = pg.locator('.boss-card', has_text='Critical Thinker').inner_text(); check('Defeated' in st or 'Not yet' in st, 'boss result recorded from first answers: ' + st.split('\n')[-2][:60])
    check('Study a chapter first' in pg.locator('.boss-card', has_text='Memory Trial').inner_text(), 'Memory Trial explains it needs studied chapters')
    pg.locator('.boss-card', has_text='Communicator').locator('[data-action="ex-boss"]').click(); pg.wait_for_selector('#rpText'); check(pg.locator('.coach').count() == 0, 'Communicator: role-plays without coaching')
    pg.goto(U + '#prefs'); pg.wait_for_timeout(1200); pg.check('#aiConsent')
    pg.goto(U + '#approaches'); [pg.fill(f'[data-ap="{k}"]', v) for k, v in [('components', 'Staff, beds and triage all interact here'), ('assumptions', 'We assume more staff is the only fix'), ('system', 'GP access feeds the emergency queue'), ('best', 'Systems, because the queue starts elsewhere')]]
    pg.click('[data-action="ex-ap-save"]'); pg.wait_for_timeout(200); check('Saved' in pg.inner_text('main'), 'Multiple Approaches saved with three methods')
    pg.click('[data-action="ex-ap-ai"]'); pg.wait_for_selector('#apAi .ai-reflect'); check('Named a real assumption' in pg.inner_text('#apAi'), 'AI feedback on how each method was used')
    pg.goto(U + '#talk'); pg.locator('[data-action="ai-talk-start"][data-id="weakidea"]').click(); pg.wait_for_selector('#aiText'); pg.fill('#aiText', 'I think a daily call would overload the team.'); pg.click('[data-action="ai-send"]'); pg.wait_for_timeout(500); pg.click('[data-action="ai-finish"]'); pg.wait_for_selector('.ai-fb')
    pg.goto(U + '#abilities-critical'); check('AI feedback' in pg.inner_text('main') or pg.evaluate("MWA.events({ai: MWUI.S.ai}).some(e=>e.ability==='critical')"), 'abilities shown by AI feedback (with quoted evidence) count as evidence')
    check(not pg.evaluate("MWA.events({ai: MWUI.S.ai}).some(e=>e.ability==='systems')"), 'an ability claim without your words is discarded')
    pg.goto(U + '#roleplay-boundary'); pg.wait_for_selector('[data-action="ex-rp-ai"]'); pg.click('[data-action="ex-rp-ai"]'); pg.wait_for_selector('#aiText'); check('could you take the supplier report' in pg.inner_text('.chat'), 'role-play with an AI partner starts from the same situation')
    pg.goto(U + '#prefs'); pg.check('#vBrowser'); pg.goto(U + '#talk-run'); pg.wait_for_timeout(300); check(pg.locator('#vmToggle').count() == 1, 'voice conversation toggle offered when dictation and speech are available')
    pg.goto(U + '#kia'); check('needs books' in pg.inner_text('main').lower() or 'This needs books' in pg.inner_text('main'), 'Knowledge in Action explains it needs books')
    pg.goto(U + '#study'); pg.click('[data-action="sample-book"]'); pg.wait_for_selector('.toc'); pg.goto(U + '#kia'); pg.wait_for_selector('[data-kac]')
    check(pg.locator('[data-kac]').count() >= 2 and len(pg.inner_text('.q-prompt')) > 30, 'Knowledge in Action: a new situation and concepts from your books')
    for k in ['problem', 'apply', 'limit', 'conclusion']: pg.fill(f'[data-ka="{k}"]', 'A reasoned answer about the situation here.')
    pg.locator('[data-kac]').first.click(); pg.click('[data-action="ex-ka-save"]'); pg.wait_for_timeout(200); check('What ' in pg.inner_text('.ai-reflect') and 'says' in pg.inner_text('.ai-reflect'), 'then compare with what the book says, and check honestly')
    pg.goto(U + '#arena'); check('This week’s puzzles' in pg.inner_text('main') and 'Collections complete' in pg.inner_text('main'), 'weekly puzzles and collections')
    pg.goto(U + '#records'); check('Skill tree' in pg.inner_text('main') and pg.locator('.branch').count() == 3, 'skill tree with thinking, communication and character branches')
    pg.click('.util-search'); pg.fill('#q', 'boss'); pg.wait_for_timeout(200); check('Boss challenges' in pg.inner_text('#results'), 'search finds bosses')
    pg.goto(U + '#games-organise'); check(pg.locator('a[href="#fmt-seq"]').count() == 1 and pg.locator('a[href="#fmt-sort"]').count() == 1, 'new formats appear inside their Playground category')
    pg.goto(U + '#fmt-seq'); steps = pg.evaluate('MWF.SEQ[0].steps')
    for k, s in enumerate(steps): pg.select_option(f'select[data-fq="{k}"]', s)
    pg.click('[data-action="fmt-check"]'); pg.wait_for_timeout(200); check('5 of 5 correct' in pg.inner_text('main'), 'Reconstruct the Sequence is checked exactly')
    pg.goto(U + '#fmt-odd'); pg.locator('[data-fv]', has_text=pg.evaluate('MWF.ODD[0].odd')).click(); pg.click('[data-action="fmt-check"]'); pg.wait_for_timeout(200); check('1 of 1 correct' in pg.inner_text('main'), 'Odd One Out is checked, with the rule explained')
    mc = b.new_context(viewport={'width': 360, 'height': 780}, has_touch=True, is_mobile=True); m = mc.new_page(); m.goto(U); m.wait_for_selector('.hero'); over = []
    for h in ['think', 'bosses', 'approaches', 'kia', 'arena', 'records', 'fmt-sort', 'fmt-seq', 'roleplay-interview']:
        m.goto(U + '#' + h); m.wait_for_timeout(250); sw = m.evaluate('document.documentElement.scrollWidth'); (over.append((h, sw)) if sw > 360 else None)
    check(not over, f'360px: no sideways scrolling {over}'); mc.close()
    check(not errs, f'no page errors {errs[:3]}'); b.close()
print(f'\n{len(fails)} failed'); sys.exit(1 if fails else 0)
