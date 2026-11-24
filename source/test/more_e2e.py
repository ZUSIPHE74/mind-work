"""Grow, progression, voice, Observation and Memory, Bilingual Lab, isiXhosa interface, and AI links — through the interface.
AI parts use a STAND-IN model (scripted responder): they verify MINDWORK's side, not a real model's judgement."""
import sys, os, json, re, subprocess, time, atexit
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from helpers import *
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8796', '--bind', '127.0.0.1'], cwd=os.path.join(HERE, '..', 'dist', 'pwa'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); atexit.register(srv.terminate); time.sleep(1)
U = 'http://localhost:8796/index.html'; fails = []; PROMPTS = []
def check(c, m): print(('PASS ' if c else 'FAIL ') + m); (fails.append(m) if not c else None)
def h1(pg): pg.wait_for_timeout(150); return pg.locator('main h1').first.inner_text().strip() if pg.locator('main h1').count() else ''
def lines(p, who): return re.findall(r'^' + who + r': (.*)$', p, re.M)
def stub(route):
    p = json.loads(route.request.post_data)['prompt']; PROMPTS.append(p)
    if 'reflection exercise' in p: return route.fulfill(json={'text': json.dumps({'reflection': 'You wanted to say no but worried about seeming unhelpful.', 'noticed': 'You rated the risk as unlikely.', 'question': 'What would saying it kindly sound like?'})})
    if 'Bilingual Expression Lab' in p: return route.fulfill(json={'text': json.dumps({'meaning': 'close', 'summary': 'Close in meaning.', 'differences': [{'point': 'The English adds a reason', 'evidence': 'because I can rest'}, {'point': 'invented', 'evidence': 'words not written'}], 'natural': [], 'try': 'Add the reason in isiXhosa too.', 'isixhosa_confidence': 'medium', 'uncertain': ['Regional usage']})})
    if 'playing a person' in p: return route.fulfill(json={'text': json.dumps({'reply': 'Ndiphilile! Busy, but good. And you?' if 'Ayanda' in p else 'Biscuit! She’s scared of the kettle.', 'end': False})})
    if 'giving feedback' in p:
        mine = lines(p, 'You'); return route.fulfill(json={'text': json.dumps({'summary': 's', 'strengths': [], 'development': [], 'inferred': [], 'uncertain': [], 'cannot_assess': [], 'moves': [['question'] for _ in mine], 'qualities': [], 'question_for_you': ''})})
    return route.fulfill(status=500, json={'error': 'failed'})
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'])
    ctx = b.new_context(viewport={'width': 1280, 'height': 900}, accept_downloads=True); ctx.grant_permissions(['microphone'])
    ctx.route('**/ai-status.json', lambda r: r.fulfill(json={'available': True, 'provider': 'Stand-in test model', 'model': 'stub'})); ctx.route('**/api/ai', stub)
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(U); pg.wait_for_selector('.hero')
    # ── progression on Today
    check(pg.locator('.xp-today').count() == 1 and pg.locator('.missions li').count() == 3, 'Today shows level, experience and three missions')
    pg.evaluate('MWUI.startMode("single",{itemId:"diff-1"})'); pg.wait_for_selector('.player'); play_current(pg); pg.goto(U + '#home'); pg.wait_for_selector('.missions')
    check('✓ done' in pg.locator('.missions li').first.inner_text(), 'finishing an exercise completes the quick mission')
    pg.click('.xp-today a[href="#records"]'); check(h1(pg) == 'Records and achievements' and 'First step' in pg.inner_text('.ach li.got'), 'Records: achievements earned from real practice, nothing locked')
    # ── Grow
    pg.locator('#nav .dest-link', has_text='Grow').click(); pg.wait_for_selector('main .env-card'); pg.wait_for_timeout(200); check(pg.locator('main .env-card').count() == 8, 'Grow lists Your character, six areas and the Thinking Journal')
    pg.goto(U + '#gact-em-checkin'); pg.locator('.chip', has_text='Anxious').click(); pg.locator('.chip', has_text='Tired').click(); pg.locator('[data-gscale="1"]').nth(3).click(); pg.locator('textarea[data-g="3"]').fill('MEERKAT deadline at work'); pg.click('[data-action="g-save"]'); pg.wait_for_timeout(200)
    check('Saved privately' in pg.inner_text('main'), 'emotional check-in saved'); pg.goto(U + '#feelings'); t = pg.inner_text('main'); check('Anxious' in t and 'MEERKAT' in t, 'your emotional patterns, privately in Grow')
    for h in ['home', 'progress-home', 'records', 'grow']:
        pg.goto(U + '#' + h); pg.wait_for_timeout(200); check('MEERKAT' not in pg.inner_text('body'), f'privacy: check-in text absent from #{h}')
    pg.goto(U + '#gact-wa-want'); [pg.locator(f'textarea[data-g="{i}"]').fill('I wanted to say no to extra work' if i == 1 else 'At work, a colleague asked again') for i in (0, 1, 2, 4)]; pg.locator('[data-gscale="3"]').nth(1).click(); pg.click('[data-action="g-save"]'); pg.wait_for_timeout(200)
    check(pg.locator('a[href="#roleplay-boundary"]', has_text='Practise saying it').count() == 1, 'What stands in the way → “Practise saying it” in Communicate')
    pg.click('[data-action="ai-consent"]') if pg.locator('[data-action="ai-consent"]').count() else None
    pg.goto(U + '#prefs'); pg.wait_for_timeout(1500); pg.check('#aiConsent'); pg.goto(U + '#gact-wa-want'); pg.wait_for_timeout(200)
    check(pg.locator('[data-action="g-ai"]').count() == 0, 'AI reflection appears only after saving')
    [pg.locator(f'textarea[data-g="{i}"]').fill('I wanted to say no to extra work' if i == 1 else 'At work, a colleague asked again') for i in (0, 1, 2, 4)]; pg.locator('[data-gscale="3"]').nth(1).click(); pg.click('[data-action="g-save"]'); pg.wait_for_timeout(200)
    n0 = len(PROMPTS); pg.click('[data-action="g-ai"]'); pg.wait_for_selector('.ai-reflect'); check('What would saying it kindly sound like?' in pg.inner_text('.ai-reflect') and len(PROMPTS) == n0 + 1, 'AI reflection only on request, one request')
    check('I wanted to say no to extra work' in PROMPTS[-1] and 'MEERKAT' not in PROMPTS[-1], 'the reflection request carries only this activity, not other Grow entries')
    pg.goto(U + '#area-interpersonal'); check(pg.locator('a[href="#gact-wa-want"]', has_text='Work on what’s in the way first').count() == 1, 'Communicate → “Work on what’s in the way first” in Grow')
    pg.goto(U + '#gact-at-obsint'); [pg.locator(f'input[data-gsort="0"][data-k="{k}"][value="{c}"]').check() for k, c in enumerate(['obs', 'int', 'obs', 'int', 'obs', 'int', 'obs', 'int'])]; pg.locator('textarea[data-g="1"]').fill('That I’m in trouble; it could just be a planning chat.'); pg.click('[data-action="g-save"]'); pg.wait_for_timeout(200)
    check('8 of 8 sorted' in pg.inner_text('main'), 'observation-or-interpretation sorting is checked')
    pg.goto(U + '#gact-fx-reassure'); [pg.locator(f'textarea[data-g="{i}"]').fill('Which restaurant to book') for i in (0, 1)]; pg.locator('[data-gscale="2"]').nth(2).click(); pg.click('[data-action="g-save"]'); pg.wait_for_timeout(200)
    pg.goto(U + '#garea-flexibility'); check(pg.locator('[data-action="g-real"]').count() == 1, 'the real-life step waits on the area page'); pg.click('[data-action="g-real"]'); pg.wait_for_timeout(200)
    pg.locator('[data-greal="0"]').fill('I booked without asking.'); pg.click('[data-action="g-real-save"]'); pg.wait_for_timeout(300); check(pg.locator('[data-action="g-real"]').count() == 0 and pg.evaluate('MWUI.S.glog.some(e=>e.real)'), 'real-life follow-up recorded')
    pg.goto(U + '#gact-at-external'); pg.click('[data-gtimer="0"]'); pg.wait_for_timeout(1300); check(pg.inner_text('#gTimer-0') in ('119s', '118s'), 'Grow timers count down')
    # ── voice
    pg.goto(U + '#prefs'); pg.wait_for_selector('#voicePrefs'); vt = pg.inner_text('#voicePrefs'); check('sends your audio to Google' in vt and 'isiXhosa' in vt, 'Voice settings say where audio goes and what isiXhosa support depends on')
    pg.goto(U + '#roleplay-boundary'); pg.wait_for_selector('#rpText'); check(pg.locator('[data-voice-dict]').count() == 0, 'browser dictation is off until allowed')
    pg.goto(U + '#prefs'); pg.check('#vBrowser'); pg.goto(U + '#roleplay-boundary'); pg.wait_for_selector('#rpText'); pg.wait_for_timeout(200); check(pg.locator('[data-voice-dict]').count() == 1, 'after allowing it, answer boxes offer dictation')
    check(pg.locator('.bubble.them [data-voice-say]').count() == 1, 'the conversation partner’s line can be read aloud')
    pg.goto(U + '#speak-sp-kid'); pg.wait_for_selector('[data-voice-rec]'); pg.click('[data-voice-rec]'); pg.wait_for_timeout(1200); pg.click('[data-voice-rec]'); pg.wait_for_selector('.rec-box audio'); check(pg.locator('.rec-box audio').count() == 1, 'record yourself and play it back (kept in memory only)')
    # ── Keep the Conversation Moving → open conversation; Improve from conversations
    pg.goto(U + '#games-convo'); check(pg.locator('.ai-entry a[href="#talk"]').count() == 1, 'the Keep the Conversation Moving category offers an open AI conversation')
    for _ in range(3):
        pg.goto(U + '#talk'); pg.locator('.rp-list li', has_text='new dog').locator('[data-action="ai-talk-start"]').click(); pg.wait_for_selector('#aiText'); pg.fill('#aiText', 'What is her name?'); pg.click('[data-action="ai-send"]'); pg.wait_for_timeout(500); pg.click('[data-action="ai-finish"]'); pg.wait_for_selector('.ai-fb')
    pg.goto(U + '#improve'); pg.wait_for_timeout(300); check('Relying on questions alone in conversation' in pg.inner_text('main'), 'open-conversation patterns feed the Improvement Workshop')
    pg.locator('.cand', has_text='Relying on questions alone').locator('[data-action="imp-add"]').click(); pg.wait_for_selector('.target'); pg.click('[data-action="imp-practise"]'); pg.wait_for_selector('#aiText')
    for i in range(2):
        pg.fill('#aiText', 'I love rescue dogs. Mine was scared too at first.'); pg.click('[data-action="ai-send"]'); pg.wait_for_timeout(500); pg.click('[data-action="ai-finish"]'); pg.wait_for_selector('.ai-fb')
        if pg.locator('[data-action="ai-set-next"]').count(): pg.click('[data-action="ai-set-next"]'); pg.wait_for_selector('#aiText')
    pg.click('a[data-action="ai-set-end"]'); pg.wait_for_selector('.target'); check('Ready for reassessment' in pg.inner_text('.target'), 'two practice conversations → ready for a check')
    # ── Bilingual Lab and isiXhosa interface
    pg.goto(U + '#communicate'); pg.locator('.area-card', has_text='Bilingual Expression Lab').click(); check(h1(pg) == 'Bilingual Expression Lab' and pg.locator('.pz-card').count() == 8, 'Bilingual Expression Lab with eight modes')
    pg.goto(U + '#blx-two'); pg.locator('[data-bl="en"]').fill('My ideal weekend is quiet, because I can rest.'); pg.locator('[data-bl="xh"]').fill('Impelaveki yam efanelekileyo izolile.'); pg.fill('#blGaps', 'unwind'); pg.click('[data-action="bl-save"]'); pg.wait_for_timeout(200)
    pg.click('[data-action="bl-ai"]'); pg.wait_for_selector('.ai-fb'); f = pg.inner_text('.ai-fb'); check('The English adds a reason' in f and 'invented' not in f and 'medium' in f and 'fluent speaker' in f, 'bilingual AI feedback: evidence-checked, with its own isiXhosa confidence stated')
    check('Never judge isiXhosa by English norms' in PROMPTS[-1], 'the request forbids judging isiXhosa by English norms')
    pg.goto(U + '#bilingual'); check('unwind' in pg.inner_text('main'), 'expression gaps are collected'); pg.fill('#vEn', 'to unwind'); pg.fill('#vXh', 'ukuphumla'); pg.click('[data-action="bl-vadd"]'); pg.wait_for_timeout(200); check('ukuphumla' in pg.inner_text('main'), 'vocabulary and concept journal')
    pg.goto(U + '#blx-roleplay'); pg.click('[data-action="bl-roleplay"]'); pg.wait_for_selector('#aiText'); check('Kudala singathethi' in pg.inner_text('.chat'), 'bilingual role-play opens with Ayanda')
    pg.goto(U + '#prefs'); pg.select_option('#uiLang', 'xh'); pg.wait_for_timeout(300); pg.goto(U + '#home'); pg.wait_for_timeout(300)
    check(pg.locator('#nav .dest-link', has_text='Cinga').count() == 1 and pg.locator('#xhBanner').count() == 1 and 'not yet reviewed' in pg.inner_text('#xhBanner'), 'isiXhosa navigation, with its unreviewed status always shown')
    pg.goto(U + '#prefs'); pg.select_option('#uiLang', 'en'); pg.wait_for_timeout(300); check(pg.locator('#nav .dest-link', has_text='Think').count() == 1 and pg.locator('#xhBanner').count() == 0, 'switching back to English')
    # ── Observation and Memory with a controlled clock
    pg.goto(U + '#games'); check(pg.locator('.cat-tile', has_text='Observation and Memory').count() == 1, 'the eighth category appears in the Cognitive Playground')
    oc = b.new_context(viewport={'width': 1280, 'height': 900}); op = oc.new_page(); op.clock.install(); op.goto(U); op.clock.run_for(2000); op.wait_for_selector('.hero')
    for ex in ['vm', 'sc', 'as', 'ob', 'dr', 'am', 'wm']:
        op.goto(U + '#obs-' + ex); op.clock.run_for(300); op.click('[data-action="ob-start"]'); op.clock.run_for(20000); op.wait_for_timeout(100)
        if ex == 'dr': op.clock.run_for(15000); op.locator('[data-action="ob-dq"]').first.click()
        task = op.evaluate('(()=>{const m=document.querySelector(".obs-run"); return !!m})()')
        if ex == 'vm': [op.locator(f'[data-oans="{i}"]').first.click() for i in range(3)]
        elif ex == 'sc': op.locator('.spot-hit').first.click()
        elif ex == 'wm': op.locator('[data-owm]').first.click()
        elif ex == 'as': [s.select_option(index=1) for s in op.locator('select[data-oas]').all()]
        elif ex == 'ob': [op.locator(f'input[data-oob="{i}"]').first.check() for i in range(op.locator('.sortl li').count())]
        else: op.wait_for_selector('#obText'); op.fill('#obText', 'river candle')
        op.click('[data-action="ob-check"]'); op.clock.run_for(300); check(op.locator('.obs-run .res').count() == 1, f'Observation and Memory: {ex} runs to a scored result')
    check(op.evaluate('MWUI.S.olog.length') == 7, 'all seven exercises recorded'); oc.close()
    # ── backups
    pg.goto(U + '#prefs'); pg.wait_for_selector('#storageLine')
    with pg.expect_download() as d: pg.click('[data-action="export"][data-kind="progress"]')
    pd = json.dumps(json.load(open(d.value.path()))); check('MEERKAT' not in pd and 'Impelaveki' not in pd and '"grow"' in pd, 'progress backup: Grow and Lab records without your words')
    with pg.expect_download() as d: pg.click('[data-action="export"][data-kind="full"]')
    fd = json.load(open(d.value.path())); check(len(fd['data']['grow']) >= 4 and len(fd['data']['bilingual']) == 1 and fd['data']['vocab'][0]['xh'] == 'ukuphumla', 'full backup keeps Grow, Lab and vocabulary')
    # ── phones
    for w in (390, 360):
        mc = b.new_context(viewport={'width': w, 'height': 800}, has_touch=True, is_mobile=True); m = mc.new_page(); m.goto(U + '#home'); m.wait_for_selector('.hero')
        m.tap('.menu-btn'); m.locator('#nav .dest', has_text='Grow').locator('.nav-envs a', has_text='Emotions').tap(); check(h1(m) == 'Emotional Awareness and Regulation', f'{w}px: Menu → Emotions in 2 taps')
        over = []
        for h in ['home', 'grow', 'garea-emotion', 'gact-em-checkin', 'gact-sd-pref', 'gact-at-obsint', 'feelings', 'records', 'observe', 'obs-vm', 'bilingual', 'blx-meaning', 'prefs']:
            m.goto(U + '#' + h); m.wait_for_timeout(200); sw = m.evaluate('document.documentElement.scrollWidth'); (over.append((h, sw)) if sw > w else None)
        check(not over, f'{w}px: no sideways scrolling {over}'); mc.close()
    check(not errs, f'no page errors {errs[:3]}'); b.close()
print(f'\n{len(fails)} failed'); sys.exit(1 if fails else 0)
