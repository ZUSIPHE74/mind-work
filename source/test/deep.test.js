const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const Q = require('../src/study.js'), X = require('../src/study-extract.js'), D = require('../src/study-deep.js'), E = require('../src/engine.js');
const src = fs.readFileSync(__dirname + '/../src/ui-study.js', 'utf8');
const SAMPLE = src.slice(src.indexOf('const SAMPLE = `') + 16, src.lastIndexOf('`;'));
const mk = (id, text) => { const r = X.parseText(text, id + '.md'); const s = X.structure(r.blocks, r.meta); const b = { id, title: r.meta.title, chapters: s.chapters }; b.questions = Q.generate(b); return b; };
const CH = JSON.parse(fs.readFileSync(__dirname + '/books/chapters.json', 'utf8'));
const MEM = '# Remembering\n\n' + CH.map(c => '## ' + c.t + '\n\n' + c.s.map(s => '### ' + s.t + '\n\n' + s.p.join('\n\n')).join('\n\n')).join('\n\n');
const A = () => mk('bA', SAMPLE), B = () => mk('bB', MEM);
const paraText = (b, id) => b.chapters.flatMap(c => c.sections.flatMap(s => s.paras)).find(p => p.id === id).text;

test('relations come only from sentences that name both concepts, with the wording’s relation', () => {
  const b = A(); const rels = D.relations(b);
  assert.ok(rels.length >= 2);
  rels.forEach(r => { const s = r.sentence.toLowerCase(); assert.ok(s.includes(r.a.toLowerCase().slice(0, 6)) && s.includes(r.b.toLowerCase().slice(0, 6)), r.a + '/' + r.b); assert.ok(paraText(b, r.paraId).includes(r.sentence)); });
  const fl = rels.find(r => D.pairKey(r.a, r.b) === D.pairKey('Framing', 'Loss aversion') && r.kind === 'contrasts with'); assert.ok(fl, 'framing vs loss aversion contrast found');
});

test('concept-map comparison: supported, labelled differently, not stated, and missed links', () => {
  const b = A(); const rels = D.relations(b);
  const map = { nodes: [{ id: 'n1', label: 'Framing' }, { id: 'n2', label: 'Loss aversion' }, { id: 'n3', label: 'Anchoring' }, { id: 'n4', label: 'premortem' }, { id: 'n5', label: 'Slow thinking' }, { id: 'n6', label: 'Fast thinking' }],
    edges: [{ id: 'e1', from: 'n1', to: 'n2', label: 'contrasts with' }, { id: 'e2', from: 'n3', to: 'n4', label: 'causes or explains' }, { id: 'e3', from: 'n1', to: 'n2', label: 'is a type of' }] };
  const r = D.compareMap(map, rels);
  assert.equal(r.checked[0].status, 'supported'); assert.equal(r.checked[1].status, 'not stated'); assert.equal(r.checked[2].status, 'labelled differently');
  assert.ok(r.missed.some(x => D.pairKey(x.a, x.b) === D.pairKey('Slow thinking', 'fast thinking')), 'book link not on the map is reported');
  assert.ok(r.isolated.includes('Slow thinking'));
});

test('activity builders draw only on the book', () => {
  const b = A();
  const pairs = D.comparePairs(b, null, 3); assert.ok(pairs.length >= 1); assert.ok(pairs.some(p => p.defA && p.defB));
  const why = D.whyItems(b); assert.ok(why.length >= 3); why.forEach(w => assert.ok(w.excerpt.startsWith(w.claim)));
  const rp = D.relationPairs(b, null, 4); rp.forEach(p => assert.ok(p.evidence.every(e => e.kind !== 'mentioned together')));
  const cum = D.cumulativePairs(b, ['c1', 'c2'], 3); assert.ok(cum.length >= 1); cum.forEach(([x, y]) => assert.notEqual(x.chapterId, y.chapterId));
  const sc = D.transferScenarios({ term: 'Anchoring' }, 2, 'seed'); assert.equal(sc.length, 2); sc.forEach(s => assert.ok(E.ITEM[s.from] && !SAMPLE.includes(s.text)), 'scenarios come from MINDWORK’s bank, not the book');
});

test('cross-book suggestions rest on shared wording or names, and never on one book alone', () => {
  const C = mk('bC', '# Negotiation\n\n## Chapter 1: Opening offers\n\nAnchoring refers to the way the first number put on the table shapes the rest of a negotiation and every later estimate.\n\nA concession is a move that gives the other side part of what it wants.');
  const s = D.suggestConnections([A(), B(), C], 20);
  assert.ok(s.some(x => x.sameName && x.a.term.toLowerCase() === 'anchoring'), 'same concept in two books is suggested'); s.forEach(x => { assert.notEqual(x.a.bookId, x.b.bookId); assert.ok(x.sameName || x.shared.length >= 2); });
  assert.equal(D.suggestConnections([A()], 20).length, 0);
});

test('“think with this chapter” builds playable, cited playground exercises', () => {
  const b = A(); const items = D.thinkItems(b, ['c2']);
  assert.ok(items.length >= 3);
  items.forEach(it => { assert.ok(it.custom && it.src && it.src.bookId === 'bA' && it.src.paraId); const st = E.stagesFor(it); assert.ok(st.length); const fb = E.evaluate(it, {}); assert.ok(typeof fb.overall === 'number'); });
  const ch = items.find(i => i.game === 'challenge'); assert.ok(paraText(b, ch.src.paraId).includes(ch.s), 'the claim to challenge is the author’s own sentence');
});

test('select-all-that-apply: built from a book list, checked exactly, partial credit penalises wrong picks', () => {
  const b = A(); const terms = [...new Set(b.questions.filter(q => q.type === 'definition').map(q => q.concept))];
  const multi = Q.buildTest(b.questions, terms, 3, 14).find(q => q.type === 'multi');
  assert.ok(multi, 'test includes select-all'); const want = multi.correctSet;
  assert.deepEqual(want.map(i => multi.options[i]).sort(), ['high stakes', 'time pressure', 'unfamiliar situations']);
  assert.equal(Q.check(multi, want).result, 'correct');
  const wrong = multi.options.map((_, i) => i).find(i => !want.includes(i));
  assert.equal(Q.check(multi, want.concat([wrong])).result, 'partial');
  assert.equal(Q.check(multi, [wrong]).result, 'incorrect');
});

test('a concept added to a crowded map never covers an existing concept', () => {
  const src = require('fs').readFileSync(__dirname + '/../src/ui-study-deep.js', 'utf8');
  const W = 1000, H = 620; const nodeW = n => Math.min(320, 40 + n.label.length * 12.2);
  const freeSpot = new Function('W', 'H', 'nodeW', src.slice(src.indexOf('function freeSpot'), src.indexOf('function pickNode')) + '; return freeSpot;')(W, H, nodeW);
  const m = { nodes: [] }; const labels = ['Anchoring', 'Framing', 'Loss aversion', 'Pricing on menus', 'Slow thinking', 'Fast thinking', 'availability heuristic', 'premortem', 'Checklists', 'Bias', 'Effort', 'Time pressure'];
  labels.forEach((l, i) => { const p = freeSpot(m, l); m.nodes.push({ id: 'n' + i, label: l, x: p.x, y: p.y }); });
  for (let i = 0; i < m.nodes.length; i++) for (let j = i + 1; j < m.nodes.length; j++) { const a = m.nodes[i], b = m.nodes[j];
    assert.ok(Math.abs(a.x - b.x) >= (nodeW(a) + nodeW(b)) / 2 || Math.abs(a.y - b.y) >= 56, `${a.label} overlaps ${b.label}`); }
  m.nodes.forEach(n => assert.ok(n.x - nodeW(n) / 2 >= 0 && n.x + nodeW(n) / 2 <= W && n.y >= 28 && n.y <= H - 28, n.label + ' inside the canvas'));
});
