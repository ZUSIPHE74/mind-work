"""Browser test for concept maps, deeper study activities, Knowledge Connections, select-all and chapter-to-playground."""
import sys, os, json, subprocess, time, atexit
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); BK = os.path.join(HERE, 'books')
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8773', '--bind', '127.0.0.1'], cwd=os.path.join(HERE, '..', 'dist', 'pwa'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); atexit.register(srv.terminate); time.sleep(1)
U = 'http://localhost:8773/index.html'
def run_activity(pg, kind):
    pg.goto(U + '#book-' + BID); pg.wait_for_selector('.deep-panel'); pg.click(f'[data-action="deep"][data-kind="{kind}"]'); pg.wait_for_selector('.deep-run, main h1')
    n = pg.evaluate('MWDeep.state.items.length'); done = 0
    for step in range(60):
        if pg.locator('[data-action="deep-end"]').count(): pg.click('[data-action="deep-end"]'); break
        if pg.locator('[data-action="deep-reveal"]').count():
            for ta in pg.locator('textarea[data-dk]:not([readonly])').all(): ta.fill('It depends on the first information people meet, because estimates stay close to it.')
            for name in ['rel', 'applies']:
                if pg.locator(f'input[name={name}]').count(): pg.locator(f'input[name={name}]').first.check(force=True)
            pg.click('[data-action="deep-reveal"]'); continue
        if pg.locator('[data-action="deep-self"]').count():
            try: pg.locator('[data-action="deep-self"]').nth(1).click(timeout=4000)
            except Exception as ex: print('STUCK in', kind, 'item', pg.evaluate('MWDeep.state.i'), pg.evaluate('JSON.stringify(MWDeep.state.answers)')[:300], pg.url); raise
            continue
        if pg.locator('[data-action="deep-transfer"]').count(): pg.check('#tPrin'); pg.check('#tLim'); pg.click('[data-action="deep-transfer"]'); done += 1; continue
        if pg.locator('[data-action="deep-cum"]').count(): pg.locator('input[name=cuma]').first.check(force=True); pg.locator('input[name=cumb]').nth(1).check(force=True); pg.click('[data-action="deep-cum"]'); done += 1; continue
        if pg.locator('[data-action="deep-next"]').count(): pg.click('[data-action="deep-next"]'); done += 1; continue
    return n
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 1300, 'height': 900}, accept_downloads=True); pg = ctx.new_page()
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto(U + '#study'); pg.wait_for_selector('#bookFile'); pg.click('[data-action="sample-book"]'); pg.wait_for_selector('.deep-panel')
    BID = pg.evaluate('location.hash.slice(6)')
    # 1. concept map
    pg.check('.sc-ch[value="c2"]'); pg.click('[data-action="deep"][data-kind="map"]'); pg.wait_for_selector('#mapSvg .node')
    mid = pg.evaluate('location.hash.slice(5)'); nodes = pg.locator('#mapSvg .node').count(); print('map starts with book concepts:', nodes, pg.locator('#mapSvg .node text').all_inner_texts())
    ids = pg.evaluate(f'Object.fromEntries(MWUI.S.maps.find(m=>m.id==="{mid}").nodes.map(n=>[n.label,n.id]))')
    pg.select_option('#eFrom', ids['Framing']); pg.select_option('#eLabel', 'contrasts with'); pg.select_option('#eTo', ids['Loss aversion']); pg.click('[data-action="map-link"]')
    pg.select_option('#eFrom', ids['Anchoring']); pg.select_option('#eLabel', 'causes or explains'); pg.select_option('#eTo', ids['Framing']); pg.click('[data-action="map-link"]')
    pg.fill('#newNode', 'Pricing on menus'); pg.click('[data-action="map-add"]')
    # connect by clicking: select node, "connect from here", click other node
    pg.locator(f'[data-node="{ids["Anchoring"]}"]').click(); pg.click('[data-action="map-from"]'); pg.locator(f'[data-node="{ids["Loss aversion"]}"]').click()
    # drag with the pointer and move with the keyboard
    C = lambda t: print('  nodes', t, pg.evaluate(f'MWUI.S.maps.find(m=>m.id==="{mid}").nodes.map(n=>n.label).join(",")'))
    C('before drag')
    box = pg.locator(f'[data-node="{ids["Framing"]}"] rect').bounding_box(); before = pg.evaluate(f'MWUI.S.maps.find(m=>m.id==="{mid}").nodes.find(n=>n.id==="{ids["Framing"]}").x')
    pg.mouse.move(box['x'] + 20, box['y'] + 20); pg.mouse.down(); pg.mouse.move(box['x'] + 120, box['y'] + 60, steps=6); pg.mouse.up()
    after = pg.evaluate(f'MWUI.S.maps.find(m=>m.id==="{mid}").nodes.find(n=>n.id==="{ids["Framing"]}").x'); assert after > before, (before, after)
    C('after drag')
    pg.locator(f'[data-node="{ids["Anchoring"]}"]').focus(); x0 = pg.evaluate(f'MWUI.S.maps.find(m=>m.id==="{mid}").nodes.find(n=>n.id==="{ids["Anchoring"]}").x'); pg.keyboard.press('ArrowRight')
    assert pg.evaluate(f'MWUI.S.maps.find(m=>m.id==="{mid}").nodes.find(n=>n.id==="{ids["Anchoring"]}").x') == x0 + 20
    C('after key')
    pg.click('[data-action="map-compare"]'); pg.wait_for_selector('.map-result'); C('after compare'); res = pg.inner_text('.map-result'); print('map compare:', pg.inner_text('.map-result .tally'))
    assert 'Stated in the book' in res and 'Not stated in the book' in res
    pg.wait_for_timeout(500); pg.reload(); pg.wait_for_selector('#mapSvg .node')
    m = json.loads(pg.evaluate(f'JSON.stringify(MWUI.S.maps.find(m=>m.id==="{mid}"))')); fx = m['nodes'][[n['id'] for n in m['nodes']].index(ids['Framing'])]['x']; assert len(m['edges']) == 3 and len(m['nodes']) == nodes + 1 and fx == after, (len(m['edges']), len(m['nodes']), nodes, fx, after)
    print('map persisted: %d concepts, %d links, positions kept' % (len(m['nodes']), len(m['edges'])))
    # 2. activities
    for k in ['relate', 'compare', 'why', 'transfer', 'cumulative']:
        n = run_activity(pg, k); print(f'{k}: {n} items completed')
    kinds = pg.evaluate('[...new Set(MWUI.S.slog.map(l=>l.mode))]'); print('logged modes:', kinds)
    for k in ['relate', 'compare', 'why', 'transfer', 'cumulative', 'map']: assert k in kinds, k
    assert pg.evaluate('MWUI.S.slog.filter(l=>l.mode==="transfer"&&l.type==="application").length') >= 1, 'transfer counts as application'
    assert pg.evaluate('Object.keys(MWUI.S.cards).length') >= 2, 'cumulative recall updates review schedules'
    # 3. think with this chapter → playground exercises with citations
    pg.goto(U + '#book-' + BID); pg.check('.sc-ch[value="c2"]'); pg.click('[data-action="deep"][data-kind="think"]'); pg.wait_for_selector('.player')
    games = pg.evaluate('MWP.state.sess.items.map(i=>i.game)'); print('think-with session:', games); assert pg.locator('.book-src').count() == 1 and 'From your book' in pg.inner_text('.book-src')
    for st in range(6):
        for ta in pg.locator('.stage.active textarea:not([readonly])').all(): ta.fill('The author claims this, but it depends on context, because people differ in how they respond.')
        if pg.locator('.stage.active .choice').count() and not pg.locator('.stage.active .choice[aria-checked="true"]').count(): pg.locator('.stage.active .choice').first.click(); [t.fill('Partly: it depends on context, because people differ.') for t in pg.locator('.stage.active textarea:not([readonly])').all()]
        for i, inp in enumerate(pg.locator('.stage.active textarea.idea').all()): inp.fill(['It assumes people notice the frame', 'It assumes the options are equivalent'][i % 2])
        if pg.locator('.stage.active [data-act="add"]').count() and pg.locator('.stage.active textarea.idea').count() < 2: pg.click('.stage.active [data-act="add"]'); pg.locator('.stage.active textarea.idea').last.fill('It assumes the choice is made quickly')
        if pg.locator('[data-act="next-stage"]').count(): pg.click('[data-act="next-stage"]'); pg.click('[data-act="next-stage"]') if pg.locator('[data-act="next-stage"][data-confirmed]').count() else None
        elif pg.locator('[data-act="submit"]').count(): pg.locator('.stage.active .choice').first.click() if pg.locator('.stage.active .choice').count() else None; pg.click('[data-act="submit"]'); break
    if pg.locator('[data-act="rate"]').count(): pg.locator('[data-act="rate"]').nth(1).click()
    pg.wait_for_selector('.feedback'); print('book-based playground exercise evaluated; replayable:', pg.evaluate('!!MWP.state.attempt.custom.src'))
    # 4. select all that apply in a practice test
    pg.goto(U + '#book-' + BID); pg.check('.sc-ch[value="c1"]'); pg.check('.sc-ch[value="c2"]'); pg.check('input[name=obj][value=test]'); pg.click('[data-action="start-study"]'); pg.wait_for_selector('.studyrun')
    types = pg.evaluate('MWStudy.session.items.map(id=>(MWStudy.session.inline[id]||{}).type||"bank")'); print('test items:', types)
    if 'multi' in types:
        pg.evaluate(f'MWStudy.session.qi = {types.index("multi")}'); pg.evaluate('MWUI.route()'); pg.wait_for_selector('.mopt'); pg.locator('.mopt').first.check(); pg.locator('[data-action="ss-conf"]').first.click(); pg.wait_for_selector('.q-result'); assert 'The book includes' in pg.inner_text('.q-result'); print('select-all question rendered and checked')
    # 5. Knowledge Connections
    pg.goto(U + '#study'); pg.set_input_files('#bookFile', os.path.join(BK, 'negotiation.txt')); pg.wait_for_selector('.up-ok'); pg.goto(U + '#connections'); pg.wait_for_selector('.cx-body')
    sug = pg.locator('[data-action="cx-sug"]').all_inner_texts(); print('suggested pairs:', sug[:3]); i = [k for k, s in enumerate(sug) if 'Anchoring' in s][0]
    pg.locator('[data-action="cx-sug"]').nth(i).click(); pg.click('[data-action="cx-reveal"]'); assert 'Choose what kind' in pg.inner_text('#toast')
    pg.locator('input[name=cxk]').nth(3).check(force=True); pg.fill('#cxText', 'One book treats anchoring as a bias to guard against; the other uses it as a negotiating tactic.'); pg.click('[data-action="cx-reveal"]'); pg.wait_for_selector('.cx-reveal')
    rv = pg.inner_text('.cx-reveal'); assert rv.count('—') >= 2 and 'Negotiation Basics' in rv and 'How Decisions Go Wrong' in rv; pg.click('[data-action="cx-save"]'); pg.wait_for_timeout(400)
    pg.reload(); pg.wait_for_selector('.cx-list li'); l = json.loads(pg.evaluate('JSON.stringify(MWUI.S.links[0])')); print('connection saved with citations:', l['a']['cite'], '|', l['b']['cite']); assert l['kind'].startswith('Contradictory')
    # 6. backup carries maps and connections
    pg.goto(U + '#prefs'); pg.wait_for_selector('#storageLine')
    with pg.expect_download() as d: pg.click('[data-action="export"][data-kind="full"]')
    data = json.load(open(d.value.path())); print('backup counts', data['counts']); assert data['counts']['maps'] == 1 and data['counts']['links'] == 1
    pg.click('[data-action="reset"]'); pg.click('dialog button[value=yes]'); pg.wait_for_timeout(400); pg.goto(U + '#prefs'); pg.set_input_files('#importFile', d.value.path()); pg.wait_for_selector('dialog[open] .preview'); assert '1 concept maps, 1 connections' in pg.inner_text('dialog')
    pg.click('dialog button[value=merge]'); pg.wait_for_timeout(1000); pg.reload(); pg.wait_for_timeout(800); assert pg.evaluate('MWUI.S.maps.length') == 1 and pg.evaluate('MWUI.S.links.length') == 1; print('maps and connections restored from backup')
    # 7. mobile
    mp = ctx.new_page(); mp.set_viewport_size({'width': 375, 'height': 812})
    for h in ['map-' + mid, 'connections', 'book-' + BID]:
        mp.goto(U + '#' + h); mp.wait_for_timeout(500); w = mp.evaluate('document.documentElement.scrollWidth'); assert w <= 375, (h, w, mp.evaluate("[...document.querySelectorAll('main *')].filter(e=>e.getBoundingClientRect().right>376).slice(-4).map(e=>e.tagName+'.'+e.className+' '+Math.round(e.getBoundingClientRect().width)+' '+(e.textContent||'').slice(0,30))"))
    print('mobile: no page overflow (the map canvas scrolls inside its own frame)'); print('errors', errs[:5]); b.close(); sys.exit(1 if errs else 0)
