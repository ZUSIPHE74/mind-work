"""Shared helpers for MINDWORK browser tests: fill and complete any exercise through the real player UI."""
import random
from playwright.sync_api import sync_playwright
TEXT = ["Because people often protect what is familiar, they may resist when the change is imposed on them, for example a new rota at work.",
        "It might depend on whether they chose it; when they feel in control the effect usually weakens, which means context matters.",
        "Sometimes the cost of learning a new way is high, so people delay, especially when they are already tired.",
        "Another possibility is that trust is low, so they doubt the motives of whoever proposes it."]
def fill_stage(pg, k):
    st = pg.locator('.stage.active')
    if st.count() == 0: return
    st = st.first
    for i, ta in enumerate(st.locator('textarea:not([readonly]), input:not([readonly]):not([type=file])').all()):
        if ta.input_value().strip(): continue
        ta.fill(TEXT[(i + k) % len(TEXT)])
    # ideas: add more
    add = st.locator('[data-act="add"]')
    for j in range(3):
        if add.count():
            add.first.click(); new = pg.locator('.stage.active textarea.idea, .stage.active .chain-link input').last
            new.fill(TEXT[(j + 1 + k) % len(TEXT)].replace('people', ['managers','children','teams'][j]))
    for sel in ['[data-act="choose"]', '[data-act="pick"]']:
        if st.locator(sel).count(): st.locator(sel).nth(min(1, st.locator(sel).count()-1)).click()
    st = pg.locator('.stage.active').first
    while st.locator('[data-act="place"]').count():
        n = st.locator('[data-act="place"]').count(); st.locator('[data-act="place"]').nth(random.randrange(min(n, 3))).click(); st = pg.locator('.stage.active').first
    for inp in st.locator('input.bucket-name').all(): inp.fill('Causes')
    while pg.locator('.branch-opt').count():
        pg.locator('.branch-opt').nth(random.randrange(pg.locator('.branch-opt').count())).click()
    if st.locator('[data-act="down"]').count(): st.locator('[data-act="down"]').first.click()

def play_current(pg, revise=False):
    for k in range(12):
        fill_stage(pg, k)
        if pg.locator('[data-act="next-stage"]').count():
            pg.locator('[data-act="next-stage"]').click()
            if pg.locator('[data-act="next-stage"][data-confirmed]').count(): pg.locator('[data-act="next-stage"]').click()
            continue
        if pg.locator('[data-act="submit"]').count():
            fill_stage(pg, k); pg.locator('[data-act="submit"]').click(); break
    if pg.locator('[data-act="rate"]').count(): pg.locator('[data-act="rate"]').nth(2).click()
    pg.wait_for_selector('.feedback', timeout=4000)
    fb = pg.locator('.feedback').inner_text()
    assert 'What you communicated' in fb and 'A question to deepen your thinking' in fb, fb[:300]
    assert 'Great job' not in fb
    if revise:
        pg.locator('[data-act="revise"]').click(); ta = pg.locator('.stage textarea:not([readonly])').last
        ta.fill(ta.input_value() + ' However, this is not always true, for instance when people choose the change themselves, because then they feel ownership.')
        pg.locator('[data-act="submit"]').click(); pg.wait_for_selector('.feedback'); assert 'Revision 1' in pg.locator('.feedback').inner_text()
        pg.locator('[data-act="reveal"]').click(); assert pg.locator('.fb-sec.ref').count() == 1
    pg.locator('[data-act="next-item"]').click()
    return fb

