"""AI features through the interface, using a STAND-IN model (scripted responder) behind /api/ai.
This verifies MINDWORK's side — what is sent, privacy, consent, clarification flow, feedback honesty display, errors,
offline, mobile, backup. It cannot verify the quality of a real model's judgement."""
import sys, os, json, re, subprocess, time, atexit
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from helpers import *
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8790', '--bind', '127.0.0.1'], cwd=os.path.join(HERE, '..', 'dist', 'pwa'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); atexit.register(srv.terminate); time.sleep(1)
U = 'http://localhost:8790/index.html'; fails = []; PROMPTS = []
def check(c, m): print(('PASS ' if c else 'FAIL ') + m); (fails.append(m) if not c else None)
def h1(pg): pg.wait_for_timeout(150); return pg.locator('main h1').first.inner_text().strip() if pg.locator('main h1').count() else ''
def lines(p, who): return re.findall(r'^' + who + r': (.*)$', p, re.M)
def stub(route):
    p = json.loads(route.request.post_data)['prompt']; PROMPTS.append(p); time.sleep(0.25)
    if 'thinking partner' in p:
        mine = lines(p, 'Person')
        if not mine: o = {'move': 'follow_up', 'direction': 'initial', 'covered': [], 'message': 'Let’s start simply: what makes a place feel like home to you?', 'ready_to_close': False}
        elif re.search(r"don.?t understand", mine[-1], re.I): o = {'move': 'clarify', 'direction': 'clarification', 'covered': ['initial'], 'message': 'When I ask what makes a place feel like home, I’m not asking about the building. I mean what makes someone feel they belong somewhere: the people, feeling safe, familiarity, being free to be yourself?', 'ready_to_close': False}
        elif re.search(r'disagree', mine[-1], re.I): o = {'move': 'challenge', 'direction': 'counter', 'covered': ['initial', 'clarification', 'counter'], 'message': 'That’s a fair objection. If belonging is about people rather than places, what does a place add?', 'ready_to_close': False}
        else: o = {'move': 'distil', 'direction': 'distil', 'covered': ['initial', 'clarification', 'reasons', 'counter', 'distil'], 'message': 'Can you put your view in one sentence?', 'ready_to_close': len(mine) >= 3}
        return route.fulfill(json={'text': 'Here you go:\n```json\n' + json.dumps(o) + '\n```'})
    if 'playing a person' in p:
        mine = lines(p, 'You')
        if mine and 'MALFORMED' in mine[-1]: return route.fulfill(json={'text': 'I would rather not answer in that format.'})
        reply = 'Biscuit! She’s a rescue — very sweet but scared of literally everything.' if 'Naledi' in p else 'Mm. Thanks. It’s a lot right now.'
        return route.fulfill(json={'text': json.dumps({'reply': reply, 'end': False})})
    if 'giving feedback' in p:
        mine = lines(p, 'You') or lines(p, 'Person')
        fb = {'summary': 'A warm, natural exchange.' if 'Naledi' in p else 'An exploration that changed direction.', 'strengths': [{'point': 'Acknowledged the news before asking', 'evidence': mine[0][:30]}, {'point': 'FABRICATED praise', 'evidence': 'words she never wrote at all'}],
              'development': [], 'inferred': [{'point': 'You seemed comfortable with the topic', 'confidence': 'low'}], 'uncertain': ['Whether your tone came across as warm in person'], 'cannot_assess': ['How you would respond face to face'],
              'moves': [['acknowledge', 'question'] if '?' in t else ['observe'] for t in mine], 'qualities': ([{'id': 'listening', 'direction': 'shown', 'evidence': mine[-1][:20], 'note': 'You picked up a detail.'}] if 'deliberately developing' in p else []), 'question_for_you': 'Did you want to keep the conversation going?'}
        return route.fulfill(json={'text': json.dumps(fb)})
    return route.fulfill(status=500, json={'error': 'failed'})
with sync_playwright() as p:
    b = p.chromium.launch()
    # ── no model: honest gate, nothing simulated
    c0 = b.new_context(); g0 = c0.new_page(); g0.goto(U + '#talk'); g0.wait_for_timeout(1200)
    check('isn’t available here' in g0.inner_text('main') and 'Nothing here is simulated' in g0.inner_text('main'), 'without a model: an honest explanation, no simulated conversation')
    g0.goto(U + '#deep'); g0.wait_for_timeout(300); check('Needs AI' in g0.inner_text('.ai-entry'), 'Deep Thinking shows the AI option as needing AI'); c0.close()
    # ── with the stand-in model
    ctx = b.new_context(viewport={'width': 1280, 'height': 900}, accept_downloads=True); ctx.route('**/ai-status.json', lambda r: r.fulfill(json={'available': True, 'provider': 'Stand-in test model', 'model': 'stub'})); ctx.route('**/api/ai', stub)
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(U); pg.wait_for_selector('.hero')
    pg.goto(U + '#journal'); pg.fill('#jtext', 'OKAPI secret journal thought'); pg.click('[data-action="j-new"]'); pg.wait_for_selector('.j-current')
    pg.goto(U + '#explore'); pg.wait_for_timeout(1500); check('Before you start' in pg.inner_text('main') and 'Never your journal' in pg.inner_text('main'), 'consent is asked first, saying exactly what is and isn’t sent')
    pg.click('[data-action="ai-consent"]'); pg.wait_for_timeout(200)
    pg.locator('.rp-list li', has_text='What makes a place feel like home?').locator('[data-action="ai-deep-start"]').click(); pg.wait_for_selector('.bubble.them:not(.thinking)')
    pg.evaluate("window.__sawThinking=false; new MutationObserver(()=>{ if(document.querySelector('.bubble.thinking')) window.__sawThinking=true; }).observe(document.body,{subtree:true,childList:true})")
    pg.fill('#aiText', "I don't understand what you mean by this question."); pg.click('[data-action="ai-send"]'); pg.wait_for_function("document.querySelectorAll('.bubble.them:not(.thinking)').length >= 2"); pg.wait_for_timeout(150)
    check(pg.evaluate('window.__sawThinking') is True, 'a “Thinking…” state was shown while waiting'); last = pg.locator('.bubble.them').last.inner_text()
    check('not asking about the building' in last, 'genuine confusion → the question is explained another way')
    check("I don't understand" in PROMPTS[-1] and 'Do not move on' in PROMPTS[-1], 'the confusion and the “don’t move on” rule reach the model')
    check(pg.locator('.dirs li.met').count() == 1, 'only the directions the model reports as covered are marked (here, one)')
    pg.fill('#aiText', 'I disagree with the premise. Home is people, not a place.'); pg.click('[data-action="ai-send"]'); pg.wait_for_timeout(700); check('fair objection' in pg.locator('.bubble.them').last.inner_text(), 'disagreement is engaged with, not ignored')
    check('Home is people' in PROMPTS[-1] and "I don't understand" in PROMPTS[-1], 'the conversation context is kept across turns')
    pg.fill('#aiText', 'Home is wherever I can be myself without performing.'); pg.click('[data-action="ai-send"]'); pg.wait_for_timeout(700); check('natural place to finish' in pg.inner_text('main'), 'the AI may suggest finishing, without forcing it')
    pg.click('[data-action="ai-finish"]'); pg.wait_for_selector('.ai-fb'); fb = pg.inner_text('.ai-fb')
    check('1 point was removed because the quoted evidence wasn’t in your words' in fb and 'FABRICATED' not in fb, 'feedback with invented evidence is removed and the removal is shown')
    check('What I’m inferring' in fb and 'low confidence' in fb and 'What text alone can’t show' in fb and 'What I’m unsure about' in fb, 'observed, inferred, uncertain and unassessable are shown separately')
    check('No development point is supported by the evidence' in fb, 'no manufactured weakness when the evidence doesn’t support one')
    pg.locator('[data-action="ai-react"]', has_text='Partly').click(); pg.wait_for_timeout(200); check('You said: Partly' in pg.inner_text('.ai-fb'), 'you can say whether the feedback reflects what you intended')
    # ── open conversation, short natural reply
    pg.goto(U + '#talk'); pg.locator('.rp-list li', has_text='new dog').locator('[data-action="ai-talk-start"]').click(); pg.wait_for_selector('#aiText')
    pg.fill('#aiText', "Really! Congratulations. What's his name?"); pg.click('[data-action="ai-send"]'); pg.wait_for_timeout(700)
    check('scared of literally everything' in pg.inner_text('.chat') and pg.locator('.coach').count() == 0 and pg.locator('.ai-fb').count() == 0, 'the partner replies in character; no coaching or feedback mid-conversation')
    pg.fill('#aiText', 'MALFORMED please'); pg.click('[data-action="ai-send"]'); pg.wait_for_selector('.warn'); check('unexpected format' in pg.inner_text('.warn'), 'a malformed AI reply is reported plainly, with a retry')
    pg.click('[data-action="ai-stop"]') if pg.locator('[data-action="ai-stop"]').count() else None
    ctx.set_offline(True); pg.fill('#aiText', 'Aw, poor thing.'); pg.click('[data-action="ai-send"]'); pg.wait_for_timeout(400); check('offline' in pg.inner_text('.warn').lower(), 'offline: the AI says so; nothing is faked'); ctx.set_offline(False)
    pg.click('[data-action="ai-retry"]'); pg.wait_for_timeout(800)
    pg.click('[data-action="ai-finish"]'); pg.wait_for_selector('.ai-fb'); check('Acknowledged the news before asking' in pg.inner_text('.ai-fb'), 'feedback at the end, quoting what you actually wrote')
    # ── goals and character
    pg.goto(U + '#character'); check(h1(pg) == 'Your character' and pg.locator('.trait').count() == 9, 'Grow › Your character: the core and seven qualities')
    pg.locator('#tr-listening input[value="adapt"]').check(); pg.wait_for_timeout(200); pg.fill('#tr-listening [data-wording]', 'Listen to understand, not to reply'); pg.locator('#tr-listening [data-wording]').blur(); pg.wait_for_timeout(200)
    pg.goto(U + '#prefs'); pg.wait_for_selector('#aiGoals'); pg.check('#aiGoals'); pg.wait_for_timeout(200)
    for i in range(3):
        pg.goto(U + '#talk'); pg.locator('.rp-list li', has_text='needs support').locator('[data-action="ai-talk-start"]').click(); pg.wait_for_selector('#aiText')
        pg.fill('#aiText', 'How long has he been in?'); pg.click('[data-action="ai-send"]'); pg.wait_for_timeout(700); pg.click('[data-action="ai-finish"]'); pg.wait_for_selector('.ai-fb')
    check('Listen to understand, not to reply' in PROMPTS[-1], 'with permission, your goals reach the feedback in your own words')
    check('may have shown here' in pg.inner_text('.ai-fb') and 'not conclusions about you' in pg.inner_text('.ai-fb'), 'quality observations are tentative')
    pg.goto(U + '#talk'); pat = pg.inner_text('main'); check('asked questions without adding anything of your own' in pat, 'after several question-only conversations, the pattern is described')
    pg.goto(U + '#character'); check('Independent' in pg.locator('#tr-listening').inner_text(), 'quality evidence from conversations appears in Your character')
    # ── privacy across everything sent
    check(not any('OKAPI' in x for x in PROMPTS), f'privacy: the journal entry never appears in any of {len(PROMPTS)} requests')
    pg.goto(U + '#prefs'); pg.wait_for_selector('#storageLine')
    with pg.expect_download() as d: pg.click('[data-action="export"][data-kind="progress"]')
    pd = json.load(open(d.value.path())); check(pd['counts'].get('ai', 0) >= 5 and 'Congratulations' not in json.dumps(pd) and 'Listen to understand' not in json.dumps(pd), 'progress backup keeps AI sessions without your words or wording')
    with pg.expect_download() as d: pg.click('[data-action="export"][data-kind="full"]')
    fd = json.load(open(d.value.path())); check('Congratulations' in json.dumps(fd['data']['ai']), 'full backup keeps your AI conversations')
    # ── offline rules-based clarification in the eight-stage Deep Thinking
    pg.goto(U); pg.evaluate('MWUI.startMode("deep")'); pg.wait_for_selector('.player'); pg.locator('.stage.active textarea').fill("I don't understand the question"); pg.click('[data-act="next-stage"]'); pg.wait_for_timeout(200)
    check(pg.locator('.clarify').count() == 1 and pg.evaluate('MWP.state.stageIdx') == 0, 'offline Deep Thinking: confusion gets an explanation, and the stage doesn’t advance or score')
    # ── phones
    for w in (390, 360):
        mc = b.new_context(viewport={'width': w, 'height': 800}, has_touch=True, is_mobile=True); mc.route('**/ai-status.json', lambda r: r.fulfill(json={'available': True, 'provider': 'Stand-in', 'model': 'stub'})); mc.route('**/api/ai', stub)
        m = mc.new_page(); m.goto(U + '#prefs'); m.wait_for_timeout(1500); m.check('#aiConsent'); m.goto(U + '#talk'); m.wait_for_timeout(300)
        m.locator('.rp-list li', has_text='new dog').locator('[data-action="ai-talk-start"]').tap(); m.wait_for_selector('#aiText'); m.locator('#aiText').tap(); m.keyboard.type('Oh lovely! What kind of dog?'); m.tap('[data-action="ai-send"]'); m.wait_for_timeout(800)
        check('Biscuit' in m.inner_text('.chat'), f'{w}px: open conversation by touch')
        over = []
        for h in ['talk', 'talk-run', 'explore', 'character', 'prefs', 'grow']:
            m.goto(U + '#' + h); m.wait_for_timeout(250); sw = m.evaluate('document.documentElement.scrollWidth'); (over.append((h, sw)) if sw > w else None)
        check(not over, f'{w}px: no sideways scrolling {over}'); mc.close()
    check(not errs, f'no page errors {errs[:3]}'); b.close()
print(f'\n{len(fails)} failed'); sys.exit(1 if fails else 0)
