"""4.9: new formats, drawing, analysis, storytelling, intercultural role-play, annotated replay, AI-checked possibility recognition,
study sequence, Observation in the Workshop, evidence reaching competencies and character, privacy. AI parts: STAND-IN model."""
import sys, os, json, re, subprocess, time, atexit
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from helpers import *
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8809', '--bind', '127.0.0.1'], cwd=os.path.join(HERE, '..', 'dist', 'pwa'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); atexit.register(srv.terminate); time.sleep(1)
U = 'http://localhost:8809/index.html'; fails = []; P = []
def check(c, m): print(('PASS ' if c else 'FAIL ') + m); (fails.append(m) if not c else None)
def J(o): return {'text': json.dumps(o)}
def stub(route):
    p = json.loads(route.request.post_data)['prompt']; P.append(p)
    if 'list different directions' in p:
        ls = re.findall(r'^\d+\. (.*)$', p, re.M); return route.fulfill(json=J({'items': [{'line': ls[0], 'type': 'curious', 'relevant': True, 'duplicate_of': None}, {'line': ls[1], 'type': 'share', 'relevant': True, 'duplicate_of': None}, {'line': ls[2], 'type': 'support', 'relevant': True, 'duplicate_of': None}, {'line': 'a line she never wrote', 'type': 'humour', 'relevant': True}], 'summary': 'Three distinct directions.'}))
    if 'playing a person' in p: return route.fulfill(json=J({'reply': 'Hmm, okay. Give me an example?', 'end': False}))
    mine = re.findall(r'^(?:You|Person): (.*)$', p, re.M); q = (mine[0] if mine else 'x')[:24]
    return route.fulfill(json=J({'summary': 's', 'strengths': [{'point': 'Picked up her detail', 'evidence': q}], 'development': [], 'inferred': [], 'uncertain': [], 'cannot_assess': [], 'moves': [], 'qualities': [], 'abilities': [], 'competencies': [{'id': 'listen', 'result': 'demonstrated', 'evidence': q}], 'next_challenge': 'n', 'question_for_you': ''}))
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 1280, 'height': 900}, accept_downloads=True); ctx.route('**/ai-status.json', lambda r: r.fulfill(json={'available': True, 'provider': 'Stand-in', 'model': 'stub'})); ctx.route('**/api/ai', stub)
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); pg.goto(U); pg.wait_for_selector('.hero')
    pg.goto(U + '#games-critical'); check(all(pg.locator(f'a[href="#fmt-{f}"]').count() == 1 for f in ['board', 'listen2', 'scene']), 'new formats appear in their Playground category')
    def fmt(fid, fill):
        pg.goto(U + '#fmt-' + fid); pg.wait_for_timeout(200); fill(); pg.click('[data-action="fmt-check"]'); pg.wait_for_timeout(200); return pg.inner_text('main')
    bd = pg.evaluate('MWF.BOARD[0]')
    t = fmt('board', lambda: ([pg.check(f'input[data-fr="{k}"][value="{c}"]') for k, (_, c) in enumerate(bd['ev'])], pg.check('input[data-fr="verdict"][value="cant"]'))); check('6 of 6 correct' in t and 'can’t separate' in t, 'Evidence Board: checked exactly, with the reasoning shown')
    am = pg.evaluate('MWF.AMBIG[0]'); t = fmt('ambig', lambda: ([pg.check(f'input[data-fck="{k}"]') for k, (_, ok) in enumerate(am['readings']) if ok], pg.check(f'input[data-fr="reply"][value="{[i for i, r in enumerate(am["replies"]) if r[1]][0]}"]'))); check('5 of 5 correct' in t, 'Ambiguous Messages: plausible readings and a checking reply')
    im = pg.evaluate('MWF.IMG[0]'); t = fmt('img', lambda: (pg.check(f'input[data-fr="choice"][value="{[i for i, o in enumerate(im["opts"]) if o[1]][0]}"]'), pg.fill('#fImg', 'Both rise in summer because of hot weather, not because one causes the other.'))); check('1 of 1' in t and 'Wording check (not understanding)' in t, 'Image to Explanation: the choice is exact; the writing check says what it is')
    ls = pg.evaluate('MWF.LISTEN[0]'); pg.goto(U + '#fmt-listen2'); pg.wait_for_timeout(200); check(pg.locator('[data-action="fmt-play"]').count() == 1 or 'can’t play speech' in pg.inner_text('main'), 'Two Arguments: listening when speech is available, honest text fallback otherwise')
    [pg.check(f'input[data-fr="{k}"][value="{q[2]}"]') for k, q in enumerate(ls['qs'])]; pg.click('[data-action="fmt-check"]'); pg.wait_for_timeout(200); check('4 of 4' in pg.inner_text('main'), 'Two Arguments: where they really disagree')
    rc = pg.evaluate('MWF.RECON[0].lines'); t = fmt('recon', lambda: [pg.select_option(f'select[data-fq="{k}"]', l) for k, l in enumerate(rc)]); check('6 of 6' in t, 'Reconstruct the Conversation')
    t = fmt('constrain', lambda: pg.fill('#fCon', 'A secret word that proves the computer is yours.')); check('used: computer' in t and 'limits only' in t, 'Communication Under Constraints: banned word caught; checks admit their limits')
    sc = pg.evaluate('MWF.SCENE[0]'); t = fmt('scene', lambda: pg.check(f'input[data-fr="pick"][value="{[i for i, s in enumerate(sc["statements"]) if s[1]][0]}"]')); check('1 of 1' in t, 'Find the Inconsistency: report versus picture')
    pg.goto(U + '#draw-thermo'); pg.wait_for_selector('#drawPad'); bx = pg.locator('#drawPad').bounding_box()
    pg.mouse.move(bx['x'] + 50, bx['y'] + 50); pg.mouse.down(); pg.mouse.move(bx['x'] + 200, bx['y'] + 120, steps=8); pg.mouse.up()
    pg.fill('#drEl', 'room temperature → thermostat\nthermostat compares with target → heater\nheater → back to room'); pg.click('[data-action="dr-done"]'); pg.wait_for_timeout(200)
    check('One possible version' in pg.inner_text('main') and 'reads only the list' in pg.inner_text('main'), 'drawing: reference shown; AI limits stated')
    pg.click('[data-action="dr-save"]'); pg.wait_for_timeout(200); check(pg.evaluate('MWUI.S.extra.drawings[0].img.startsWith("data:image/png")'), 'drawing saved on the device')
    pg.goto(U + '#analyse-move'); pg.wait_for_selector('select[data-an="2"]'); pg.wait_for_timeout(200); d = pg.evaluate('MWC2.DIALOGUES[0]')
    for k, q in enumerate(d['qs']): pg.locator(f'select[data-an="{k}"]').evaluate("(s, v) => { s.value = v; s.dispatchEvent(new Event('change', { bubbles: true })); }", str(q[1]))  # select by value via the real change event
    pg.click('[data-action="an-check"]'); pg.wait_for_timeout(200)
    check('3 of 3 matched' in pg.inner_text('main') and 'Missed cue' in pg.inner_text('main'), 'conversation analysis: answers checked, then an annotated replay')
    pg.goto(U + '#story'); pg.fill('#stText', 'Last winter I nearly missed my sister’s wedding because my train broke down, but that’s when a stranger offered me a lift, and since then I trust people more easily.'); pg.click('[data-action="st-check"]'); pg.wait_for_timeout(200); check('Wording hints only' in pg.inner_text('main'), 'storytelling: shape hints, honestly labelled')
    pg.goto(U + '#area-interpersonal'); check(pg.locator('a[href="#roleplay-intercultural"], [href*="intercultural"]').count() >= 1 or 'Different norms at work' in pg.inner_text('main'), 'intercultural role-play available')
    pg.goto(U + '#prefs'); pg.wait_for_timeout(1200); pg.check('#aiConsent')
    pg.goto(U + '#talk'); pg.locator('[data-action="ai-talk-start"][data-id="dog"]').click(); pg.wait_for_selector('#aiText'); pg.fill('#aiText', 'Congratulations! What is her name?'); pg.click('[data-action="ai-send"]'); pg.wait_for_timeout(500); pg.click('[data-action="ai-finish"]'); pg.wait_for_selector('.ai-fb')
    sid = pg.evaluate('MWUI.S.ai[MWUI.S.ai.length-1].id'); pg.goto(U + '#ai-' + sid); pg.wait_for_timeout(200); check(pg.locator('.replay mark.m-s').count() >= 1 and 'Picked up her detail' in pg.inner_text('.replay'), 'annotated replay highlights quoted evidence in her turns')
    pg.goto(U + '#flex-possible'); pg.wait_for_selector('#fxOwn'); pg.fill('#fxOwn', 'ask what happened\nshare my own hard week\noffer to help'); pg.click('[data-action="fx-p1"]'); pg.wait_for_selector('[data-action="fx-p-class"]')
    check('self-assessment' in pg.inner_text('main'), 'self-ticks are labelled as self-assessment, not evidence')
    pg.click('[data-action="fx-p-class"]'); pg.wait_for_selector('#fxClass .checks'); t = pg.inner_text('#fxClass'); check('3 genuinely distinct' in t and 'didn’t match anything you wrote' in t, 'AI classification: lines it invented are ignored')
    check(pg.evaluate("MWUI.S.comp.some(e=>e.comp==='perspective' && e.kind==='demonstrated' && e.source==='AI assessment')"), 'three distinct directions recorded as an AI-assessed demonstration')
    pg.goto(U + '#study'); pg.click('[data-action="sample-book"]'); pg.wait_for_selector('.toc'); pg.goto(U + '#sequence'); pg.wait_for_selector('#sqRecall')
    pg.fill('#sqRecall', 'Roughly, it means the thing the book describes.'); pg.click('[data-action="sq-1"]'); pg.wait_for_timeout(150); pg.locator('[data-action="sq-self"][data-v="partly"]').click(); pg.wait_for_selector('#sqApply')
    pg.fill('#sqApply', 'It explains why the plan stalled.'); pg.fill('#sqLimit', 'It does not explain the timing.'); pg.click('[data-action="sq-2"]'); pg.wait_for_selector('[data-sqv="child"]')
    pg.fill('[data-sqv="child"]', 'It is like when you practise a song.'); pg.fill('[data-sqv="sceptic"]', 'Evidence shows retrieval beats rereading.'); pg.click('[data-action="sq-3"]'); pg.wait_for_selector('[data-action="sq-talk"]'); pg.click('[data-action="sq-talk"]'); pg.wait_for_selector('#aiText')
    check('What actually is it' in pg.inner_text('.chat'), 'study sequence: Learn → Think → Communicate → a conversation about the concept')
    pg.evaluate("""(()=>{const S=MWUI.S, D=864e5, n=Date.now(); for (let i=0;i<4;i++) S.olog.push({id:'ox'+i, ex:'ob', lvl:2, t:n-(i+1)*D, right:4, n:6, overread:1});})()""")
    pg.goto(U + '#improve'); pg.wait_for_timeout(300); check('Treating interpretations as observations' in pg.inner_text('main'), 'Observation evidence becomes a Workshop candidate')
    pg.locator('.cand', has_text='Treating interpretations').locator('[data-action="imp-add"]').click(); pg.wait_for_selector('.target'); pg.click('[data-action="imp-practise"]'); pg.wait_for_selector('[data-action="ob-start"]')
    check(pg.evaluate('location.hash') == '#obs-ob', 'practice opens the observation exercise as part of the target')
    pg.evaluate("""(()=>{const S=MWUI.S; const sid=(S.improve.targets.find(t=>t.key==='ob-overread').practice.slice(-1)[0]||{}).id; S.olog.push({id:'oy1',ex:'ob',lvl:2,t:Date.now(),right:6,n:6,overread:0,sessionId:sid},{id:'oy2',ex:'ob',lvl:2,t:Date.now()+1,right:6,n:6,overread:0,sessionId:sid});})()""")
    pg.goto(U + '#improve'); pg.wait_for_timeout(300); check('Ready for reassessment' in pg.inner_text('.target'), 'two clean practice runs → ready for a check')
    pg.goto(U + '#competencies'); t = pg.inner_text('main'); check('rules-based' in t, 'rules-based evidence (puzzles, formats, observation) is marked as such on Competencies')
    pg.goto(U + '#character'); check(pg.evaluate("MWCH.evidenceFrom({comp: MWUI.S.comp}).some(o=>o.quality==='listening')"), 'assessed listening evidence reaches the character framework')
    pg.goto(U + '#records'); xp = pg.evaluate('MWXP.summary({attempts: MWUI.S.attempts, extra: MWUI.S.extra, comp: MWUI.S.comp}).xp'); check(xp > 50, f'XP includes the newer activities ({xp})')
    pg.evaluate("MWUI.S.journal.push({id:'jx', created:Date.now(), text:'PRIVATE DIARY ENTRY', versions:[]})"); pg.goto(U + '#mentor'); pg.click('summary'); check('PRIVATE DIARY' not in pg.inner_text('.ctx'), 'mentor context still excludes the journal by default')
    pg.goto(U + '#prefs'); pg.wait_for_selector('#storageLine')
    with pg.expect_download() as dl: pg.click('[data-action="export"][data-kind="progress"]')
    pd = open(dl.value.path()).read(); check('data:image/png' not in pd and 'What is her name' not in pd, 'progress backup: no drawings, no quoted words')
    mc = b.new_context(viewport={'width': 360, 'height': 780}, has_touch=True, is_mobile=True); m = mc.new_page(); m.goto(U); m.wait_for_selector('.hero'); over = []
    for h in ['draw', 'draw-street', 'analyse-plan', 'story', 'sequence', 'fmt-board', 'fmt-img', 'fmt-scene', 'fmt-listen2', 'roleplay-intercultural']:
        m.goto(U + '#' + h); m.wait_for_timeout(250); sw = m.evaluate('document.documentElement.scrollWidth'); (over.append((h, sw)) if sw > 360 else None)
    check(not over, f'360px: no sideways scrolling {over}'); mc.close()
    check(not errs, f'no page errors {errs[:3]}'); b.close()
print(f'\n{len(fails)} failed'); sys.exit(1 if fails else 0)
