"""Study Lab end-to-end test through the real UI, using original test books in every supported format."""
import sys, os, json, subprocess, time, atexit
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); BK = os.path.join(HERE, 'books'); ROOT = os.path.join(HERE, '..', 'dist', 'pwa')
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8768', '--bind', '127.0.0.1'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); atexit.register(srv.terminate); time.sleep(1)
URL = 'http://localhost:8768/index.html'; CH = json.load(open(os.path.join(BK, 'chapters.json')))
SRC_TEXT = ' '.join(p for c in CH for s in c['s'] for p in s['p'])
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 1280, 'height': 900}, accept_downloads=True); pg = ctx.new_page()
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto(URL); pg.wait_for_selector('.hero'); pg.goto(URL + '#study'); pg.wait_for_selector('#bookFile')
    def upload(name):
        pg.goto(URL + '#study'); pg.wait_for_selector('#bookFile'); pg.set_input_files('#bookFile', os.path.join(BK, name))
        pg.wait_for_selector('#uploadStatus .up-ok, #uploadStatus .warn', timeout=30000); return pg.inner_text('#uploadStatus')
    # 1. every format
    for f in ['memory.pdf', 'memory.epub', 'memory.docx', 'memory.txt']:
        msg = upload(f); print(f, '→', msg.split('\n')[0][:150]); assert 'added' in msg, msg
    books = json.loads(pg.evaluate('JSON.stringify(MWUI.S.books.map(b=>({t:b.title,a:b.author,type:b.fileType,ch:b.chapters.map(c=>[c.title,c.sections.map(s=>s.title)]),pages:b.chapters.flatMap(c=>c.sections.flatMap(s=>s.paras.map(p=>p.page))),text:b.chapters.flatMap(c=>c.sections.flatMap(s=>s.paras.map(p=>p.text))).join(" "),q:b.questions.length})))'))
    want = [[c['t'], [s['t'] for s in c['s']]] for c in CH]
    for bk in books:
        chs = bk['ch']; titles = [c[0] for c in chs]
        print(f"  {bk['type']}: '{bk['t']}' by {bk['a']} · chapters {titles} · {bk['q']} questions")
        assert [c[1] for c in chs] == [w[1] for w in want], (bk['type'], chs)
        assert all(t.endswith(w[0].split(': ')[1]) for t, w in zip(titles, want)), (bk['type'], titles)
        missing = [s for s in SRC_TEXT.split('. ') if s.strip() and s.strip().rstrip('.') not in bk['text']]; assert not missing, (bk['type'], missing[:2])
        if bk['type'] == 'pdf': assert sorted(set(bk['pages'])) == [1, 2], bk['pages'][:8]; assert 'Remembering: A Short Guide' not in bk['text'], 'running header removed'
        assert bk['q'] >= 15
    print('extraction exact for PDF, EPUB, DOCX, TXT (text, chapters, sections, PDF pages)')
    # 2. refusals
    m = upload('scanned.pdf'); assert 'OCR' in m and 'added' not in m, m; print('scanned PDF →', m.split(': ', 1)[1][:90])
    m = upload('protected.epub'); assert 'DRM' in m, m; print('DRM EPUB →', m.split(': ', 1)[1][:90])
    assert pg.evaluate('MWUI.S.books.length') == 4
    # 3. library search + full chapter workflow on the PDF
    pg.goto(URL + '#study'); pg.fill('#libSearch', 'interference'); pg.press('#libSearch', 'Enter'); pg.wait_for_selector('.hits li'); print('text search hits:', pg.locator('.hits li').count())
    bid = pg.evaluate('MWUI.S.books.find(b=>b.fileType==="pdf").id'); pg.goto(URL + '#book-' + bid); pg.wait_for_selector('.toc')
    pg.locator('.toc summary').first.click(); pg.check('.sc-ch[value="c1"]'); pg.check('input[name=obj][value=understand]'); pg.click('[data-action="start-study"]'); pg.wait_for_selector('.studyrun')
    stages = []
    for step in range(80):
        st = pg.inner_text('.sr-head h1'); stages.append(st) if not stages or stages[-1] != st else None
        if pg.locator('#freeText').count(): pg.fill('#freeText', 'Encoding converts experience so the brain can store it, attention matters. Consolidation stabilises memory; sleep helps.'); pg.click('[data-action="ss-free"]'); continue
        if pg.locator('[data-action="ss-conf"]').count():
            if pg.locator('#qa').count(): pg.fill('#qa', 'encoding' if step % 3 else 'Attention converts experience into a form the brain can store')
            elif pg.locator('[data-action="ss-mc"]').count(): pg.locator('[data-action="ss-mc"]').first.click()
            elif pg.locator('[data-m]').count(): [s.select_option(index=1) for s in pg.locator('[data-m]').all()]
            pg.locator('[data-action="ss-conf"]').nth(step % 4).click(); continue
        if pg.locator('[data-action="ss-self"]').count(): pg.locator('[data-action="ss-self"]').nth(step % 3).click(); continue
        if pg.locator('[data-action="ss-nextq"]').count(): pg.click('[data-action="ss-nextq"]'); continue
        if pg.locator('#appText').count(): pg.fill('#appText', 'When I learn a new colleague’s name I connect it to a friend with the same name, so the brain stores it alongside something I already know. It fails when I have no related knowledge.'); pg.click('[data-action="ss-app"]'); continue
        if pg.locator('.feat').count(): pg.locator('.feat').first.check(); pg.check('#limitOk'); pg.click('[data-action="ss-appcheck"]'); continue
        if pg.locator('[data-action="ss-finish"]').count(): report = pg.inner_text('#srBody'); pg.click('[data-action="ss-finish"]'); break
        pg.locator('[data-action="ss-next"]').first.click()
    print('workflow stages:', stages)
    assert stages == ['Orientation', 'Reading', 'Closed-book recall', 'Targeted recall', 'Knowledge gaps', 'Targeted correction', 'Application', 'Review scheduling', 'Chapter report'], stages
    assert 'Mastered' not in report.split('A chapter is only called mastered')[0], 'one session never shows mastery'
    nlog, ncards = pg.evaluate('MWUI.S.slog.length'), pg.evaluate('Object.keys(MWUI.S.cards).length'); print('study log entries', nlog, '· scheduled cards', ncards); assert nlog >= 5 and ncards >= 5
    src = pg.evaluate('(()=>{const b=MWUI.S.books.find(b=>b.fileType==="pdf");const l=MWUI.S.slog.find(l=>l.paraId);const p=b.chapters.flatMap(c=>c.sections.flatMap(s=>s.paras)).find(p=>p.id===l.paraId);return !!p})()'); assert src, 'logged answers trace to a paragraph'
    # 4. reader: bookmark, highlight, note; reading progress; persists after reload
    pg.goto(URL + f'#read-{bid}.c2'); pg.wait_for_selector('.r-p'); pg.locator('.reader .r-p').nth(1).click(); pg.click('[data-action="r-bm"]'); pg.wait_for_selector('.r-p.bm')
    pg.locator('.reader .r-p').nth(2).click(); pg.click('[data-action="r-hl"]'); pg.locator('.reader .r-p').nth(0).click(); pg.click('[data-action="r-note"]'); pg.fill('#rNoteText', 'Compare with spacing in chapter 2.'); pg.click('[data-action="r-note-save"]'); pg.wait_for_selector('.r-note')
    pg.mouse.wheel(0, 3000); pg.wait_for_timeout(1200)
    pg.reload(); pg.wait_for_selector('.r-p'); assert pg.locator('.r-p.bm').count() == 1 and pg.locator('.r-p.hl').count() == 1 and 'Compare with spacing' in pg.inner_text('.r-note')
    prog = pg.evaluate(f'MWUI.S.books.find(b=>b.id==="{bid}").progress.c2'); print('reading progress c2', prog); assert prog > 0
    pg.goto(URL + '#book-' + bid); assert pg.locator('.notes li').count() == 3; print('notes/bookmarks/highlights persisted after reload')
    # 5. confidence affects scheduling; reviews come due and are interleaved
    cw = pg.evaluate('MWUI.S.slog.filter(l=>l.final==="incorrect"&&l.confident).length'); print('confident errors logged', cw)
    pg.evaluate('Object.values(MWUI.S.cards).forEach(c=>{ if(c.history.length){ c.due = Date.now()-1000; } })')
    pg.goto(URL + '#study'); pg.wait_for_selector('.reviews'); assert pg.locator('[data-action="review"][data-size="10"]').count(); pg.click('[data-action="review"][data-size="10"]'); pg.wait_for_selector('.studyrun')
    n = pg.evaluate('MWStudy.session.items.length'); print('review queue', n)
    for step in range(40):
        if pg.locator('[data-action="ss-conf"]').count():
            if pg.locator('#qa').count(): pg.fill('#qa', 'consolidation')
            elif pg.locator('[data-action="ss-mc"]').count(): pg.locator('[data-action="ss-mc"]').first.click()
            pg.locator('[data-action="ss-conf"]').first.click(); continue
        if pg.locator('[data-action="ss-self"]').count(): pg.locator('[data-action="ss-self"]').first.click(); continue
        if pg.locator('[data-action="ss-nextq"]').count(): pg.click('[data-action="ss-nextq"]'); continue
        if pg.locator('[data-action="ss-finish"]').count(): pg.click('[data-action="ss-finish"]'); break
        pg.locator('[data-action="ss-next"]').first.click()
    later = pg.evaluate('Object.values(MWUI.S.cards).filter(c=>c.history.length>=2).length'); print('cards reviewed twice', later); assert later >= 1
    # 6. a test-prep session includes multiple choice / matching and short answers
    pg.goto(URL + '#book-' + bid); pg.check('.sc-ch[value="c1"]'); pg.check('.sc-ch[value="c2"]'); pg.check('input[name=obj][value=test]'); pg.click('[data-action="start-study"]'); pg.wait_for_selector('.studyrun')
    types = pg.evaluate('MWStudy.session.items.map(id=>(MWStudy.session.inline[id]||{}).type||"bank")'); print('test items:', types); assert 'mc' in types and 'match' in types, types
    # 7. persistence across restart + backup with books
    pg.wait_for_timeout(600); pg.reload(); pg.wait_for_timeout(800); assert pg.evaluate('MWUI.S.books.length') == 4 and pg.evaluate('Object.keys(MWUI.S.cards).length') == ncards
    pg.goto(URL + '#prefs'); pg.wait_for_selector('#storageLine')
    with pg.expect_download() as d: pg.click('[data-action="export"][data-kind="full"]')
    data = json.load(open(d.value.path())); print('backup study counts', data['counts']); assert data['counts']['books'] == 4 and data['counts']['notes'] == 3
    pg.click('[data-action="reset"]'); pg.click('dialog button[value=yes]'); pg.wait_for_timeout(400); assert pg.evaluate('MWUI.S.books.length') == 0
    pg.goto(URL + '#prefs'); pg.set_input_files('#importFile', d.value.path()); pg.wait_for_selector('dialog[open] .preview'); assert '4 books' in pg.inner_text('dialog'); pg.click('dialog button[value=merge]'); pg.wait_for_timeout(1200)
    pg.reload(); pg.wait_for_timeout(800); assert pg.evaluate('MWUI.S.books.length') == 4 and pg.evaluate('MWUI.S.notes.length') == 3; print('backup/restore of books, schedules and notes ok')
    # 8. offline: upload and study a PDF with the network off
    pg.goto(URL); pg.wait_for_timeout(1500); pg.reload(); pg.wait_for_timeout(600)
    reqs = []; pg.on('request', lambda r: reqs.append(r.url)); ctx.set_offline(True); pg.reload(); pg.wait_for_selector('.hero')
    pg.evaluate('MWUI.S.books.filter(b=>b.fileType==="docx").forEach(b=>{})'); m = upload('memory.docx'); assert 'added' in m; m = upload('memory.pdf'); assert 'added' in m; print('offline uploads ok (PDF, DOCX)')
    ext = [u for u in reqs if not u.startswith('http://localhost:8768') and not u.startswith(('data:', 'blob:', 'about:'))]; print('external requests', ext); assert not ext
    # 9. mobile
    mp = ctx.new_page(); mp.set_viewport_size({'width': 375, 'height': 812}); mp.goto(URL + '#study'); mp.wait_for_selector('.shelf'); bid2 = mp.evaluate('MWUI.S.books[0].id')
    for h in ['study', 'book-' + bid2, f'read-{bid2}.c1']:
        mp.goto(URL + '#' + h); mp.wait_for_timeout(400); w = mp.evaluate('document.documentElement.scrollWidth'); assert w <= 375, (h, w, mp.evaluate("[...document.querySelectorAll('main *')].filter(e=>e.getBoundingClientRect().right>376).slice(0,5).map(e=>e.tagName+'.'+e.className+' '+(e.textContent||'').slice(0,40))"))
    print('mobile study pages: no overflow'); print('errors', errs[:5]); b.close(); sys.exit(1 if errs else 0)
