"""isiXhosa version: interface translation, English-only regions with notices, judging unaffected, AI in isiXhosa (stand-in model),
user text untouched, switching back. The translation was produced by AI and is not reviewed by a fluent speaker; this test
checks that it is applied correctly, not that the isiXhosa is good."""
import sys, os, json, re, subprocess, time, atexit
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from helpers import *
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8803', '--bind', '127.0.0.1'], cwd=os.path.join(HERE, '..', 'dist', 'pwa'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); atexit.register(srv.terminate); time.sleep(1)
U = 'http://localhost:8803/index.html'; fails = []; PROMPTS = []
def check(c, m): print(('PASS ' if c else 'FAIL ') + m); (fails.append(m) if not c else None)
def stub(route):
    p = json.loads(route.request.post_data)['prompt']; PROMPTS.append(p)
    if 'playing a person' in p: return route.fulfill(json={'text': json.dumps({'reply': 'Igama lakhe nguBiscuit!', 'end': False})})
    if 'thinking partner' in p: return route.fulfill(json={'text': json.dumps({'move': 'follow_up', 'direction': 'initial', 'covered': [], 'message': 'Yintoni eyenza indawo ibe likhaya kuwe?', 'ready_to_close': False})})
    return route.fulfill(json={'text': json.dumps({'summary': 'Isishwankathelo.', 'strengths': [], 'development': [], 'inferred': [], 'uncertain': [], 'cannot_assess': [], 'moves': [], 'qualities': [], 'question_for_you': ''})})
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 1280, 'height': 900}); ctx.route('**/ai-status.json', lambda r: r.fulfill(json={'available': True, 'provider': 'Stand-in', 'model': 'stub'})); ctx.route('**/api/ai', stub)
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(U); pg.wait_for_selector('.hero')
    pg.goto(U + '#prefs'); pg.wait_for_selector('#uiLang'); check('translated by AI' in pg.inner_text('main'), 'Settings says the isiXhosa was translated by AI and not reviewed')
    pg.select_option('#uiLang', 'xh'); pg.wait_for_timeout(500); pg.goto(U + '#home'); pg.wait_for_timeout(500)
    check(pg.locator('#xhBanner').count() == 1 and 'ayikaphononongwa' in pg.inner_text('#xhBanner'), 'banner states the translation is unreviewed, in isiXhosa and English')
    labels = pg.locator('#nav .dest-link span').all_inner_texts(); check(labels == ['Namhlanje', 'Cinga', 'Funda', 'Nxibelelana', 'Khula', 'Phucula', 'Inkqubela'], f'navigation in isiXhosa {labels}')
    pg.goto(U + '#grow'); pg.wait_for_timeout(400); t = pg.inner_text('main'); check('Isimilo sakho' in t and 'Idayari yeeNgcinga' in t, 'Grow in isiXhosa')
    pg.goto(U + '#gact-em-checkin'); pg.wait_for_timeout(400); check('Uziva njani ngoku?' in pg.inner_text('main'), 'activities in isiXhosa')
    pg.goto(U + '#arena'); pg.wait_for_timeout(400); check('Ibala leePhazili' in pg.inner_text('main'), 'Puzzle Arena in isiXhosa')
    pg.goto(U + '#puzzle-log-2'); pg.wait_for_timeout(300); check('UPieter usela ikofu.' in pg.inner_text('main'), 'a choice-judged puzzle in isiXhosa')
    sol = pg.evaluate('MWPZ.PZ["log-2"].solution')
    for n, vals in sol.items():
        for k, v in enumerate(vals): pg.select_option(f'select[data-gp="{n}"][data-gk="{k}"]', v)
    pg.locator('[data-action="pz-check"]').first.click(); pg.wait_for_selector('[data-action="pz-key"]'); check(True, 'the logic grid is still judged correctly while displayed in isiXhosa')
    pg.goto(U + '#puzzle-lat-1'); pg.wait_for_timeout(300); check(pg.locator('.xh-note').count() == 1, 'a typed-English puzzle shows the English-only notice')
    pg.evaluate('MWUI.startMode("single",{itemId:"diff-1"})'); pg.wait_for_selector('.player'); pg.wait_for_timeout(300); check(pg.locator('.xh-note').count() >= 1, 'rule-judged exercises show the English-only notice')
    pg.goto(U + '#roleplay-boundary'); pg.wait_for_timeout(300); check(pg.locator('.xh-note').count() == 1 and 'could you take the supplier report' in pg.inner_text('.chat'), 'rule-judged role-plays stay English, with the notice')
    pg.goto(U + '#journal'); pg.fill('#jtext', 'Think about home and Grow'); pg.click('[data-action="j-new"]'); pg.wait_for_selector('.j-current'); pg.wait_for_timeout(300)
    check('Think about home and Grow' in pg.inner_text('.j-current'), 'your own writing is never translated, even when it contains interface words')
    pg.goto(U + '#prefs'); pg.wait_for_timeout(1500); pg.check('#aiConsent'); pg.goto(U + '#talk'); pg.wait_for_timeout(400)
    pg.locator('[data-action="ai-talk-start"][data-id="dog"]').click(); pg.wait_for_selector('#aiText'); check('Ekugqibeleni sifumene inja' in pg.inner_text('.chat'), 'open conversation opens in isiXhosa')
    pg.fill('#aiText', 'Halala! Ngubani igama lakhe?'); pg.click('[data-action="ai-send"]'); pg.wait_for_timeout(600)
    check('LANGUAGE: She is using MINDWORK in isiXhosa' in PROMPTS[-1], 'the AI is told to work in natural isiXhosa'); check('Igama lakhe nguBiscuit!' in pg.inner_text('.chat'), 'the AI reply is shown as written')
    pg.click('[data-action="ai-finish"]'); pg.wait_for_selector('.ai-fb'); check('LANGUAGE' in PROMPTS[-1], 'feedback is requested in isiXhosa too')
    pg.goto(U + '#prefs'); pg.select_option('#uiLang', 'en'); pg.wait_for_timeout(500); pg.goto(U + '#grow'); pg.wait_for_timeout(400)
    check('Your character' in pg.inner_text('main') and pg.locator('#xhBanner').count() == 0 and pg.locator('#nav .dest-link', has_text='Think').count() == 1, 'switching back restores English everywhere')
    mc = b.new_context(viewport={'width': 360, 'height': 780}, has_touch=True, is_mobile=True); m = mc.new_page(); m.goto(U); m.wait_for_selector('.hero'); m.evaluate("MWUI.DB.put('kv','ui-lang','xh')"); m.reload(); m.wait_for_timeout(800)
    over = []
    for h in ['home', 'think', 'grow', 'communicate', 'gact-sd-values', 'area-interpersonal', 'records', 'arena', 'prefs']:
        m.goto(U + '#' + h); m.wait_for_timeout(250); sw = m.evaluate('document.documentElement.scrollWidth'); (over.append((h, sw)) if sw > 360 else None)
    check(not over, f'360px in isiXhosa (longer words): no sideways scrolling {over}'); mc.close()
    check(not errs, f'no page errors {errs[:3]}'); b.close()
print(f'\n{len(fails)} failed'); sys.exit(1 if fails else 0)
