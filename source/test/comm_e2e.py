"""Communicate through the interface: areas, recognition, role-play with and without coaching, drafting, speaking, real-life notes,
Improve integration, pathway in Progress, privacy, touch phones, offline, backup."""
import sys, os, json, subprocess, time, atexit
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from helpers import *
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8788', '--bind', '127.0.0.1'], cwd=os.path.join(HERE, '..', 'dist', 'pwa'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); atexit.register(srv.terminate); time.sleep(1)
U = 'http://localhost:8788/index.html'; fails = []
def check(c, m): print(('PASS ' if c else 'FAIL ') + m); (fails.append(m) if not c else None)
def h1(pg): pg.wait_for_timeout(150); return pg.locator('main h1').first.inner_text().strip() if pg.locator('main h1').count() else ''
SK = {'boundary': ["No, I can't take it this week because of the audit.", "I understand, but I really can't this week.", 'I could ask Sipho if he has space?'],
      'criticism': ["You're right that it was late, and I'm sorry it affected the client meeting.", 'What specifically was sloppy?', 'I see. The last two were on time though, because I changed my process.', 'I propose I check the figures against the appendix before sending, from now on.'],
      'customer': ['I can hear how frustrating this is, especially the third time.', 'What exactly was wrong with it?', 'I can have a corrected cake ready by Friday morning, at no charge. Would that work?'],
      'listen-problem': ["So you're saying every time the client changes it, your manager sees you as late?", 'That sounds exhausting.', 'What happens when the client changes the brief?', 'So the plan could be to copy your manager in on every change request?']}
def talk(pg, lines):
    for ln in lines:
        if not pg.locator('#rpText').count(): break
        pg.fill('#rpText', ln); pg.click('[data-action="cm-say"]'); pg.wait_for_timeout(120)
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 1280, 'height': 900}, accept_downloads=True); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto(U); pg.wait_for_selector('.hero')
    pg.locator('#nav .dest-link', has_text='Communicate').click(); check(h1(pg) == 'Communicate' and pg.locator('.area-card').count() == 9, 'Communicate lists seven areas, the Bilingual Expression Lab and the Conversation Lab')
    pg.locator('.area-card', has_text='Interpersonal').click(); check(h1(pg) == 'Interpersonal and Relationship Skills', 'desktop: Communicate → Interpersonal in 2 clicks')
    check(pg.locator('.path-list li.met').count() == 1, 'opening the skill card counts only as "understand"')
    for _ in range(2):
        c = pg.evaluate('MWC.RECOGNISE.filter(r=>r.area==="interpersonal")[0+(window.__ri||0)].correct'); pg.evaluate('window.__ri=(window.__ri||0)+1')
        pg.locator('[data-action="cm-rec"]').nth(c).click(); pg.wait_for_selector('#recFb .res'); pg.click('[data-action="cm-rec-next"]'); pg.wait_for_timeout(150)
    pg.goto(U + '#area-interpersonal'); check(pg.locator('.path-list li.met').count() == 2, 'two correct recognitions → "recognise" stage, still no practice credit')
    # coached role-play
    pg.locator('.rp-list li', has_text='keeps adding work').locator('[data-on="1"]').click(); pg.wait_for_selector('.chat')
    check(pg.locator('.coach').count() == 1, 'coaching tip shown before your first reply')
    talk(pg, SK['boundary']); pg.wait_for_selector('.rp-result'); res = pg.inner_text('.rp-result')
    check('You reached the goal' in res and res.count('✓') == 5, 'boundary role-play: goal reached, all five skills shown')
    check(pg.locator('.bubble.you .moves span', has_text='said no').count() >= 2, 'each of your replies shows the moves detected in it')
    check(pg.locator('.bubble.them', has_text='afternoon').count() == 1, 'the character pushed back before accepting the boundary')
    # independent, unfamiliar role-play
    pg.goto(U + '#area-interpersonal'); pg.locator('.rp-list li', has_text='Partly fair criticism').locator('[data-on="0"]').click(); pg.wait_for_selector('.chat')
    check(pg.locator('.coach').count() == 0, 'no coaching when practising on your own'); talk(pg, SK['criticism']); pg.wait_for_selector('.rp-result')
    pg.goto(U + '#area-interpersonal'); met = pg.locator('.path-list li.met').count(); check(met == 6, f'coached + independent role-plays → pathway reaches "unfamiliar" ({met} of 7)')
    # escalation
    pg.goto(U + '#area-conflict'); pg.locator('.rp-list li', has_text='angry customer').locator('[data-on="0"]').click(); pg.wait_for_selector('.chat')
    talk(pg, ['That is not my fault, it is the system.', 'Calm down!!']); pg.wait_for_selector('.rp-result'); check('broke down' in pg.inner_text('.rp-result'), 'hostility makes the angry customer conversation break down')
    # drafting
    pg.goto(U + '#draft-dr-decline'); pg.fill('#drText', 'Sorry, sorry, I guess I could maybe not do it if that is okay?'); pg.click('[data-action="cm-check-draft"]'); pg.wait_for_timeout(200)
    t = pg.inner_text('.side-box'); check('○ Says no clearly' in t and '○ At most one apology' in t, 'weak draft: the missing elements are named')
    pg.fill('#drText', "Hi Thabo,\n\nThank you for thinking of me. I can't organise the party this year because I'm leading the audit in December. I'm happy to help on the day with setting up instead.\n\nKind regards,\nAma"); pg.click('[data-action="cm-check-draft"]'); pg.wait_for_timeout(200)
    check('8 of 8 checks met' in pg.inner_text('main'), 'strong draft meets every check')
    # speaking
    pg.goto(U + '#speak-sp-kid'); pg.click('[data-action="cm-sp-start"]'); pg.wait_for_timeout(1300); tm = pg.inner_text('#spTimer'); pg.click('[data-action="cm-sp-stop"]')
    check(tm in ('29s', '28s'), f'speaking timer counts down ({tm})')
    for i in range(4): pg.locator('.sp-rev').nth(i).check()
    pg.click('[data-action="cm-sp-save"]'); pg.wait_for_timeout(200); check(pg.evaluate('MWUI.S.clog.filter(e=>e.kind==="speak")[0].selfScore') == 0.8, 'speaking self-review saved (4 of 5)')
    # real-life, privately
    pg.goto(U + '#area-interpersonal'); pg.locator('[data-action="cm-real"]').first.click(); pg.fill('[data-real="what"]', 'KUDU private note about my boss'); pg.click('[data-action="cm-real-save"]'); pg.wait_for_timeout(200)
    for h in ['home', 'communicate', 'area-interpersonal', 'overview', 'improve']:
        pg.goto(U + '#' + h); pg.wait_for_timeout(200); check('KUDU' not in pg.inner_text('body'), f'privacy: real-life note absent from #{h}')
    # Improve from role-play evidence
    for rid, first in [('listen-problem', 'You should tell the client no.'), ('criticism', 'I propose I fix it tomorrow.')]:
        pg.goto(U + '#roleplay-' + rid); pg.click('[data-action="cm-retry"]') if pg.locator('[data-action="cm-retry"]').count() else None; pg.wait_for_selector('#rpText')
        talk(pg, [first] + ['ok'] * 7); pg.wait_for_selector('.rp-result')
    pg.goto(U + '#improve'); pg.wait_for_timeout(300); check('Solving before acknowledging' in pg.inner_text('main'), 'Improve shows "Solving before acknowledging" from role-plays')
    pg.locator('.cand', has_text='Solving before acknowledging').locator('[data-action="imp-add"]').click(); pg.wait_for_selector('.target')
    check(pg.locator('.target a[href^="#roleplay-"]').count() >= 1, 'evidence links to the role-plays')
    pg.click('[data-action="imp-practise"]'); pg.wait_for_selector('#rpText'); check(pg.locator('.coach').count() == 1, 'practice set runs with coaching')
    for _ in range(2):
        rid = pg.evaluate('MWCUI.state.rid'); talk(pg, SK[rid]); pg.wait_for_selector('.rp-result')
        if pg.locator('.rp-result a', has_text='Next conversation').count(): pg.locator('.rp-result a', has_text='Next conversation').click(); pg.wait_for_selector('#rpText')  # the finished page also has a chat, so wait for a live reply box
    pg.click('a[data-action="cm-set-end"]'); pg.wait_for_selector('.target'); check('Ready for reassessment' in pg.inner_text('.target'), 'after practice the target is ready for a check')
    pg.click('[data-action="imp-reassess"]'); pg.wait_for_selector('#rpText'); check(pg.locator('.coach').count() == 0, 'the check runs without coaching')
    for _ in range(2):
        rid = pg.evaluate('MWCUI.state.rid'); talk(pg, SK[rid]); pg.wait_for_selector('.rp-result')
        if pg.locator('.rp-result a', has_text='Next conversation').count(): pg.locator('.rp-result a', has_text='Next conversation').click(); pg.wait_for_selector('#rpText')  # the finished page also has a chat, so wait for a live reply box
    pg.goto(U + '#improve'); pg.wait_for_selector('.target'); check('Improving' in pg.inner_text('.target'), 'acknowledging first in new role-plays → Improving')
    pg.goto(U + '#overview'); row = pg.locator('.ov-table tr', has_text='Interpersonal').inner_text(); check('Apply in unfamiliar' in row, 'Progress shows the communication pathway')
    pg.click('.util-search'); pg.fill('#q', 'boundary'); pg.wait_for_timeout(200); check('A colleague keeps adding work' in pg.inner_text('#results'), 'search finds role-plays')
    n = pg.evaluate('MWUI.S.clog.length'); pg.wait_for_timeout(400); pg.reload(); pg.wait_for_timeout(800); check(pg.evaluate('MWUI.S.clog.length') == n, f'all {n} practice records persist after reload')
    pg.goto(U + '#prefs'); pg.wait_for_selector('#storageLine')
    with pg.expect_download() as d: pg.click('[data-action="export"][data-kind="progress"]')
    data = json.load(open(d.value.path())); check(data['counts'].get('comm') == n and 'KUDU' not in json.dumps(data) and 'audit' not in json.dumps(data['data']['comm']), 'progress backup keeps practice records but not your words or notes')
    for w in (390, 360):
        mc = b.new_context(viewport={'width': w, 'height': 800}, has_touch=True, is_mobile=True); m = mc.new_page(); m.goto(U + '#home'); m.wait_for_selector('.hero')
        m.tap('.menu-btn'); m.locator('#nav .dest', has_text='Communicate').locator('.nav-envs a', has_text='Negotiation').tap(); check(h1(m) == 'Negotiation', f'{w}px: Menu → Negotiation in 2 taps')
        m.goto(U + '#roleplay-rent'); m.wait_for_selector('#rpText'); m.locator('#rpText').tap(); m.keyboard.type('What matters to you about the 1st?'); m.tap('[data-action="cm-say"]'); m.wait_for_timeout(200)
        check('mortgage' in m.inner_text('.chat'), f'{w}px: replying by touch keyboard works')
        over = []
        for h in ['communicate', 'area-interpersonal', 'area-speaking', 'roleplay-mediate', 'draft-dr-summary', 'speak-sp-update', 'overview']:
            m.goto(U + '#' + h); m.wait_for_timeout(200); sw = m.evaluate('document.documentElement.scrollWidth'); (over.append((h, sw)) if sw > w else None)
        check(not over, f'{w}px: no sideways scrolling {over}'); mc.close()
    pg.goto(U); pg.wait_for_timeout(1500); pg.reload(); pg.wait_for_timeout(400); ctx.set_offline(True)
    pg.goto(U + '#roleplay-budget'); pg.wait_for_selector('#rpText'); talk(pg, ['What do you need the R40 000 for?']); check('certification' in pg.inner_text('.chat'), 'offline: role-play works')
    check(not errs, f'no page errors {errs[:3]}'); b.close()
print(f'\n{len(fails)} failed'); sys.exit(1 if fails else 0)
