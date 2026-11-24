"""Mentor, competencies, group conversations and flexibility practice. AI parts use a STAND-IN model scripted to behave like a
teacher; this verifies MINDWORK's handling (what is sent, recorded, shown, refused), not a real model's teaching quality."""
import sys, os, json, re, subprocess, time, atexit
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from helpers import *
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8807', '--bind', '127.0.0.1'], cwd=os.path.join(HERE, '..', 'dist', 'pwa'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); atexit.register(srv.terminate); time.sleep(1)
U = 'http://localhost:8807/index.html'; fails = []; P = []
def check(c, m): print(('PASS ' if c else 'FAIL ') + m); (fails.append(m) if not c else None)
def J(o): return {'text': json.dumps(o)}
def stub(route):
    p = json.loads(route.request.post_data)['prompt']; P.append(p)
    if "MINDWORK's mentor" in p:
        last = re.findall(r'^Her: (.*)$', p, re.M)[-1]
        if 'what you are asking' in last: return route.fulfill(json=J({'message': 'Fair. Simply: when someone says something, add one thing of your own that picks up a detail of theirs.', 'diagnosis': 'instruction', 'strategy': 'simpler', 'concept': 'building on others', 'stage': 'explain', 'practice': None, 'assessment': None, 'understood': None}))
        if 'still' in last: return route.fulfill(json=J({'message': 'Think of it like passing a ball: you catch what they threw before throwing your own.', 'diagnosis': 'concept', 'strategy': 'analogy', 'concept': 'building on others', 'stage': 'teach', 'practice': {'prompt': 'A friend says: “We finally got a dog.” Reply by picking up her detail.', 'competency': 'listen', 'unfamiliar': False}, 'assessment': None, 'understood': None}))
        if 'meant something else' in last: return route.fulfill(json=J({'message': 'That reading is valid too; it just practises a different thing.', 'diagnosis': 'valid_alternative', 'strategy': 'contrast', 'concept': 'building on others', 'stage': 'teach', 'practice': None, 'assessment': {'competency': 'listen', 'result': 'demonstrated', 'evidence': 'words she never wrote', 'why': 'x'}, 'understood': True}))
        return route.fulfill(json=J({'message': 'Yes, you picked up her detail and added your own.', 'diagnosis': 'none', 'strategy': 'check', 'concept': 'building on others', 'stage': 'verify', 'practice': None, 'assessment': {'competency': 'listen', 'result': 'demonstrated', 'evidence': 'What did you name him', 'why': 'picks up her detail'}, 'understood': True}))
    if 'playing 3 people' in p:
        n = p.count('\nHer:'); return route.fulfill(json=J({'turns': [{'speaker': 'Kagiso', 'text': 'Exactly, money ruins people.'}, {'speaker': 'Pieter', 'text': 'Anyway, did anyone watch the rugby?'}] if n <= 1 else [{'speaker': 'Ayesha', 'text': 'That’s a fair point actually.'}], 'end': False}))
    mine = re.findall(r'^(?:You|Person): (.*)$', p, re.M)
    return route.fulfill(json=J({'summary': 's', 'strengths': [], 'development': [{'point': 'Developed the idea only one step', 'evidence': (mine[0] if mine else 'x')[:20], 'why': 'w', 'try': 't'}], 'inferred': [], 'uncertain': [], 'cannot_assess': [], 'moves': [], 'qualities': [], 'abilities': [],
        'competencies': [{'id': 'expand', 'result': 'difficulty', 'difficulty_type': 'develop', 'evidence': (mine[0] if mine else 'x')[:20]}, {'id': 'direction', 'result': 'demonstrated', 'evidence': 'invented words'}], 'next_challenge': 'Take one idea three steps further next time.', 'question_for_you': ''}))
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 1280, 'height': 900}); ctx.route('**/ai-status.json', lambda r: r.fulfill(json={'available': True, 'provider': 'Stand-in', 'model': 'stub'})); ctx.route('**/api/ai', stub)
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); pg.goto(U); pg.wait_for_selector('.hero')
    check(pg.locator('.mentor-today .plan li').count() == 1 and pg.locator('.mentor-today .plan li .muted').count() == 1, 'Today: a recommendation with its reason')
    pg.goto(U + '#mentor'); check('need AI' in pg.inner_text('main') or 'needs AI' in pg.inner_text('main'), 'without consent, mentor chat explains it needs AI; plan still works')
    pg.goto(U + '#prefs'); pg.wait_for_timeout(1200); pg.check('#aiConsent'); pg.goto(U + '#mentor'); pg.wait_for_selector('#mtText')
    def say(t): pg.fill('#mtText', t); pg.click('[data-action="mt-send"]'); pg.wait_for_function('!MWUI.S.mentor.busy'); pg.wait_for_timeout(150)
    say('I don’t understand what you are asking me to practise.'); check('Noticed: doesn’t understand the instruction' in pg.inner_text('.mentor-chat') and 'simpler language' in pg.inner_text('.mentor-chat'), 'instruction not understood: diagnosed and re-explained simply')
    say('I still don’t get it.'); check('Re-explain in simpler language' in P[-1], 'the next request tells the model which strategy was already tried'); check('analogy' in pg.inner_text('.mentor-chat').lower() and 'Try this:' in pg.inner_text('.mentor-chat'), 'a different strategy (analogy) and a practice task')
    check('building on others' in pg.inner_text('main') and 'teach' in pg.inner_text('.cur'), 'the learning cycle shows where she is')
    n0 = pg.evaluate('MWUI.S.comp.filter(e=>e.kind==="demonstrated").length')
    say('Oh, I meant something else by building on.'); check('assessment removed' in pg.inner_text('.mentor-chat') and pg.evaluate('MWUI.S.comp.filter(e=>e.kind==="demonstrated").length') == n0, 'an assessment without her words is removed; nothing recorded as understood')
    say('Oh nice! What did you name him? Ours hid under the bed for a week.'); check(pg.evaluate('MWUI.S.comp.filter(e=>e.kind==="demonstrated" && e.comp==="listen").length') == n0 + 1, 'a real demonstration in her words is recorded')
    pg.click('summary'); check('PRIVATE' not in pg.inner_text('.ctx') and '"states"' in pg.inner_text('.ctx'), 'she can see exactly what is sent; private material is off by default')
    pg.goto(U + '#group'); pg.locator('[data-action="ai-group"][data-id="g-dinner"]').click(); pg.wait_for_selector('#aiText'); t = pg.inner_text('.chat'); check('Kagiso' in t and 'Pieter' in t, 'group conversation: named participants')
    pg.fill('#aiText', 'Lottery winners are a special case though.'); pg.click('[data-action="ai-send"]'); pg.wait_for_timeout(600); t = pg.inner_text('.chat'); check('rugby' in t and 'money ruins people' in t, 'participants talk to each other and change topic')
    check('if she stays quiet' in [x for x in P if 'playing 3 people' in x][-1], 'the group carries on without her if she stays quiet')
    pg.click('[data-action="ai-finish"]'); pg.wait_for_selector('.ai-fb'); f = pg.inner_text('.ai-fb'); check('A next challenge' in f and 'difficult (developing an existing idea)' in f, 'feedback names the specific difficulty and a next challenge')
    check(not pg.evaluate('MWUI.S.comp.some(e=>e.comp==="direction")'), 'a competency claim without her words is not recorded')
    pg.goto(U + '#flex-possible'); pg.wait_for_selector('#fxOwn'); pg.fill('#fxOwn', 'ask what happened\nsay I had a hard week too\nmake a joke'); pg.click('[data-action="fx-p1"]'); pg.wait_for_selector('[data-fx-had]')
    pg.locator('[data-fx-had]').first.check(); pg.locator('[data-fx-pick]').first.click(); pg.fill('#fxWhy', 'It fits the relationship here.'); pg.fill('#fxReply', 'That sounds rough. Want to talk about it?'); pg.click('[data-action="fx-p2"]'); pg.wait_for_timeout(200)
    check('not answers' in pg.inner_text('main') and 'choosing well' in pg.inner_text('main'), 'possible directions: a map with context notes, not one right answer')
    pg.goto(U + '#flex-quick'); pg.click('[data-action="fx-q-start"]'); pg.wait_for_selector('#fxQ'); pg.fill('#fxQ', 'Really? Which part?'); pg.click('[data-action="fx-q-done"]'); pg.fill('#fxAlt', 'Share a surprising fact back.'); pg.click('[data-action="fx-q-save"]'); pg.wait_for_timeout(200)
    check(pg.evaluate('MWUI.S.extra.flex.some(x=>x.kind==="quick" && x.first!=null)'), 'quick response: time to start is measured (not quality)')
    pg.goto(U + '#flex-ways'); pg.fill('[data-fxw="child"]', 'Money grows on money, like a snowball.'); pg.fill('[data-fxw="sceptic"]', 'Money grows on money, like a snowball.'); pg.click('[data-action="fx-w-check"]'); pg.wait_for_timeout(200); check('reworded' in pg.inner_text('.checks'), 'say it differently: a reworded version is flagged')
    pg.evaluate("""(()=>{const S=MWUI.S, D=864e5, n=Date.now(); S.comp.push({comp:'connect',t:n-10*D,kind:'difficulty',type:'connect',ctx:'deep:explore',evidence:'cats and economics, no idea how',source:'AI feedback'},{comp:'connect',t:n-D,kind:'demonstrated',ctx:'group:g-dinner',evidence:'like a queue at a bank, both ration attention',source:'AI feedback'},
      {comp:'expand',t:n-3*D,kind:'difficulty',type:'develop',ctx:'convo:dog',evidence:'x one',source:'AI feedback'},{comp:'expand',t:n-2*D,kind:'difficulty',type:'develop',ctx:'deep:explore',evidence:'x two',source:'AI feedback'})})()""")
    pg.goto(U + '#competencies'); t = pg.inner_text('main'); check('Earlier' in t and 'like a queue at a bank' in t, 'before and after with real quoted evidence')
    check('Not assessed yet' in t, 'competencies without evidence say so')
    pg.goto(U + '#improve'); pg.wait_for_timeout(300); check('Difficulty: developing an existing idea' in pg.inner_text('main'), 'a difficulty recurring across activities becomes a Workshop candidate')
    pg.goto(U + '#overview'); check(pg.evaluate("MWA.events({comp: MWUI.S.comp}).some(e=>e.source==='AI feedback' && e.ability==='creative')"), 'demonstrated competencies count as Thinking Abilities evidence')
    pg.evaluate("MWUI.S.comp.forEach(e=>e.t-=40*864e5); MWUI.S.attempts.forEach(a=>a.t-=40*864e5); MWUI.S.ai.forEach(a=>a.t-=40*864e5)"); pg.goto(U + '#mentor'); pg.wait_for_timeout(200); check('been away' in pg.inner_text('.plan'), 'returning after time away: a gentle restart or retention check, with the reason')
    mc = b.new_context(viewport={'width': 360, 'height': 780}, has_touch=True, is_mobile=True); m = mc.new_page(); m.goto(U); m.wait_for_selector('.hero'); over = []
    for h in ['mentor', 'competencies', 'group', 'flex-possible', 'flex-quick', 'flex-ways', 'convo']:
        m.goto(U + '#' + h); m.wait_for_timeout(250); sw = m.evaluate('document.documentElement.scrollWidth'); (over.append((h, sw)) if sw > 360 else None)
    check(not over, f'360px: no sideways scrolling {over}'); mc.close()
    check(not errs, f'no page errors {errs[:3]}'); b.close()
print(f'\n{len(fails)} failed'); sys.exit(1 if fails else 0)
