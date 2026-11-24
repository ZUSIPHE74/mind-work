// Run: node --test test/
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../src/engine.js');
const Store = require('../src/storage.js');

const DAY = 864e5;

test('exercise bank is complete and well-formed', () => {
  const ids = new Set();
  for (const it of E.BANK) {
    assert.ok(!ids.has(it.id), 'duplicate id ' + it.id); ids.add(it.id);
    const g = E.GAME[it.game]; assert.ok(g, 'unknown game ' + it.game);
    assert.ok(it.lvl >= 1 && it.lvl <= 5, it.id + ' level');
    assert.ok(E.stagesFor(it).length >= 1, it.id + ' stages');
  }
  for (const g of E.GAMES) {
    for (const k of ['name', 'skill', 'objective', 'operation', 'instructions', 'feedback', 'followup']) assert.ok(g[k], `${g.id} missing ${k}`);
    assert.equal(g.hints.length, 3, g.id + ' needs three graduated hints');
    assert.ok(E.GAME[g.followup], g.id + ' follow-up must exist');
    assert.ok(E.itemsFor(g.id).length >= 3, g.id + ' needs at least three exercises');
  }
  for (const c of E.CATEGORIES) assert.ok(E.GAMES.filter(g => g.cat === c.id).length >= 3, c.id + ' needs several games');
});

test('every exercise evaluates empty and filled responses without throwing', () => {
  for (const it of E.BANK) {
    const empty = E.evaluate(it, {});
    assert.ok(empty.overall >= 0 && empty.overall <= 4);
    assert.ok(typeof empty.question === 'string' && empty.question.length > 10, it.id + ' question');
  }
});

test('rephrased ideas are merged, distinct ideas are counted', () => {
  const ia = E.text.analyseIdeas(['They are afraid of losing what is familiar', 'They fear losing the familiar', 'Learning a new system takes time and effort'], { angles: [] }, 'People resist change');
  assert.equal(ia.n, 3); assert.equal(ia.distinct, 2); assert.equal(ia.dupPairs.length, 1);
  const ib = E.text.analyseIdeas(['They are tired', 'Their manager criticised them', 'They are interviewing elsewhere'], { angles: [] }, '');
  assert.equal(ib.distinct, 3);
});

test('restating the prompt is not counted as development', () => {
  const it = E.ITEM['expand-1'];
  const fb = E.evaluate(it, { op_explanation: 'Sleep affects mood a lot.', op_example: 'Sleep affects your mood.', op_consequence: 'Mood is affected by sleep.' });
  assert.ok(fb.attention.some(a => a.includes('repeats the original statement')));
  assert.ok(fb.dims.development < 2);
});

test('long answers are not automatically rewarded', () => {
  const it = E.ITEM['exact-1'];
  const padded = E.evaluate(it, { rewrite: ('The presentation was kind of bad and there were some issues with things and stuff that were really not very good. ').repeat(6), decide: 'not sure' });
  const precise = E.evaluate(it, { rewrite: 'The presentation ran 15 minutes over and the budget slide had last year’s figures.', decide: 'I had to decide which problem mattered most to the client.' });
  assert.ok(precise.overall > padded.overall, `${precise.overall} > ${padded.overall}`);
});

test('a question on its own is a valid reply, not a fault; contributing still scores higher on contribution', () => {
  // Changed on request (adaptive feedback brief, section 4): a single question-only reply is natural and must not be flagged.
  const it = E.ITEM['keepgoing-1'];
  const q = E.evaluate(it, { r1: 'Oh no, really? What happened?', r2: 'How are you coping?' });
  const c = E.evaluate(it, { r1: 'That sounds like a lot. Busy stretches at work always seem to arrive all at once.', r2: 'A proper break would help — even a long weekend somewhere without email changes how the next month feels.' });
  assert.ok(!q.attention.some(a => /only a question|hands all the work/.test(a)), 'no fault for asking');
  assert.ok(q.explored.some(a => a.includes('natural way to show interest')));
  assert.ok(c.dims.contribution > q.dims.contribution, 'the contribution dimension still describes what was added');
  const dog = E.itemsFor('keepgoing').find(i => /dog/i.test(JSON.stringify(i)));
  const d = E.evaluate(dog, { r1: 'Really! Congratulations. What\'s his name?', r2: 'Aw, poor thing. She\'s probably still adjusting to everything.' });
  assert.deepEqual(d.attention, [], 'the brief’s own example draws no false criticism');
});

test('qualifications improve nuance; absolutes are flagged', () => {
  const it = E.ITEM['nuance-1'];
  const abs = E.evaluate(it, { rewrite: 'Exercise always makes everyone happier.', why: 'nothing' });
  const qual = E.evaluate(it, { rewrite: 'Regular exercise often improves mood for many people, especially when it is something they enjoy, though it does not help everyone equally.', why: 'The original claimed it for everyone; I added when it holds.' });
  assert.ok(qual.dims.nuance > abs.dims.nuance);
  assert.ok(abs.attention.some(a => a.includes('absolute')));
});

test('weak link: correct identification scores higher than a wrong pick', () => {
  const it = E.ITEM['weaklink-1'];
  const ok = E.evaluate(it, { pick: 2, why: 'He also started sleeping earlier at the same time, so another cause could explain it; one person is not enough.' });
  const bad = E.evaluate(it, { pick: 0, why: 'I just disagree with it.' });
  assert.ok(ok.dims.reasoning > bad.dims.reasoning);
});

test('off-topic responses are flagged for relevance', () => {
  const it = E.ITEM['possibility-1'];
  const fb = E.evaluate(it, { ideas: ['Bananas grow in tropical climates', 'Volcanoes erupt under pressure from magma', 'Football clubs sell expensive shirts'], check: 'I would look at the weather forecast for next Tuesday afternoon.' });
  assert.ok(fb.attention.some(a => a.includes('key terms')));
});

test('status distinguishes independent, assisted, supported, attempted and skipped work', () => {
  assert.equal(E.status(0, false, 3), 'independent');
  assert.equal(E.status(1, false, 3), 'assisted');
  assert.equal(E.status(3, false, 3), 'supported');
  assert.equal(E.status(0, true, 3), 'supported');
  assert.equal(E.status(0, false, 0.5), 'attempted');
  assert.equal(E.status(0, false, 3, true), 'skipped');
});

test('difficulty adapts per skill: consistent strong work raises only that skill', () => {
  const P = E.emptyProfile(); let t = Date.now();
  for (let i = 0; i < 3; i++) E.updateProfile(P, { game: 'weaklink', level: 1, overall: 3.6, hints: 0 }, t += 1000);
  assert.equal(P.skills.critical.level, 2);
  assert.equal(P.skills.verbal.level, 1, 'unrelated skill unchanged');
  for (let i = 0; i < 2; i++) E.updateProfile(P, { game: 'weaklink', level: 2, overall: 0.8, hints: 3 }, t += 1000);
  assert.equal(P.skills.critical.level, 1, 'sustained weak results lower the level');
});

test('hints reduce the credited score', () => {
  assert.ok(E.adjustedScore({ overall: 3.5, hints: 0 }) > E.adjustedScore({ overall: 3.5, hints: 3 }));
  assert.ok(E.adjustedScore({ overall: 3.5, hints: 0, revealed: true }) < E.adjustedScore({ overall: 3.5, hints: 1 }));
});

test('selection avoids recently seen exercises and matches level', () => {
  const R = E.rng(42); const now = Date.now();
  const hist = []; const seen = [];
  for (let i = 0; i < 6; i++) { const it = E.chooseItem('diff', 2, hist, R, now); seen.push(it.id); hist.push({ itemId: it.id, t: now }); }
  const firstFour = seen.slice(0, 4); assert.equal(new Set(firstFour).size, 4, 'no immediate repeats: ' + seen);
  const it = E.chooseItem('weaklink', 4, [], E.rng(1), now); assert.ok(Math.abs(it.lvl - 4) <= 1);
  // after 11 days the exercise becomes eligible again
  const old = [{ itemId: 'diff-1', t: now - 11 * DAY }];
  assert.ok(E.itemsFor('diff').some(x => x.id === 'diff-1'));
  assert.doesNotThrow(() => E.chooseItem('diff', 1, old, E.rng(3), now));
});

test('templates generate distinct, resolvable variations', () => {
  const ids = new Set();
  for (let i = 0; i < 25; i++) { const t = E.fromTemplate('possibility', 1, E.rng(i), ids); ids.add(t.id); const r = E.resolveItem(t.id); assert.equal(r.s, t.s); }
  assert.ok(ids.size >= 20);
  const ex = E.fromTemplate('expand', 4, E.rng(7)); assert.ok(ex.ops.includes('counterexample') && ex.ops.includes('qualification'));
  assert.deepEqual(E.resolveItem(ex.id).ops, ex.ops);
});

test('daily sessions are deterministic per day, varied across days, and cover the five slots', () => {
  const P = E.emptyProfile();
  const a = E.buildDaily('2026-11-20', P, []), b = E.buildDaily('2026-11-20', P, []);
  assert.deepEqual(a.items.map(i => i.itemId), b.items.map(i => i.itemId));
  const sigs = new Set(); for (let d = 1; d <= 10; d++) sigs.add(E.buildDaily('2026-12-' + String(d).padStart(2, '0'), P, []).items.map(i => i.game).join());
  assert.ok(sigs.size >= 8, 'compositions vary across days');
  assert.ok(a.items.length >= 4 && a.items.length <= 6);
  assert.ok(a.objective.length > 20);
});

test('daily session leans toward the weakest skill', () => {
  const P = E.emptyProfile(); const t = Date.now();
  E.SKILLS.forEach(s => { P.skills[s.id].ema = 3.5; P.skills[s.id].n = 4; P.skills[s.id].last = t; });
  P.skills.convo.ema = 0.8;
  const d = E.buildDaily('2026-11-21', P, [], t);
  assert.equal(d.focus, 'convo');
  assert.match(d.objective, /conversational/i);
});

test('insights only come from recorded performance', () => {
  const P = E.emptyProfile();
  assert.equal(E.insights([], P)[0].kind, 'info');
  const atts = Array.from({ length: 6 }, (_, i) => ({ game: 'possibility', t: Date.now(), status: 'independent', dims: { variety: 1.2, clarity: 3.6 }, hints: 0, overall: 2.4 }));
  const ins = E.insights(atts, P);
  assert.ok(ins.some(i => i.text.includes('settle on it')));
});

test('storage persists across connections (IndexedDB) and supports clear', async () => {
  const { indexedDB } = require('fake-indexeddb');
  const s1 = Store.create(indexedDB, 'mw-test'); assert.equal(await s1.open(), true);
  await s1.put('kv', 'profile', { a: 1 }); await s1.put('attempts', 'x1', { id: 'x1', overall: 2 }); await s1.put('attempts', 'x2', { id: 'x2', overall: 3 });
  s1.close();
  const s2 = Store.create(indexedDB, 'mw-test'); await s2.open();
  assert.deepEqual(await s2.get('kv', 'profile'), { a: 1 });
  assert.equal((await s2.all('attempts')).length, 2);
  await s2.del('attempts', 'x1'); assert.equal((await s2.all('attempts')).length, 1);
  await s2.clear(); assert.equal((await s2.all('attempts')).length, 0);
});

test('storage falls back to memory when IndexedDB is unavailable', async () => {
  const s = Store.create(null); assert.equal(await s.open(), false);
  await s.put('kv', 'k', { v: [1, 2] }); const got = await s.get('kv', 'k'); got.v.push(3);
  assert.deepEqual(await s.get('kv', 'k'), { v: [1, 2] }, 'stored values are copies');
});
