const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const Q = require('../src/study.js');
const X = require('../src/study-extract.js');
const src = fs.readFileSync(__dirname + '/../src/ui-study.js', 'utf8');
const SAMPLE = src.slice(src.indexOf('const SAMPLE = `') + 16, src.lastIndexOf('`;'));
const sampleBook = () => { const r = X.parseText(SAMPLE, 'sample.md'); const s = X.structure(r.blocks, r.meta); return { id: 'b1', title: r.meta.title, chapters: s.chapters }; };
const DAY = 864e5;

test('plain text: chapters, sections and paragraphs keep the author’s structure', () => {
  const b = sampleBook();
  assert.deepEqual(b.chapters.map(c => c.title), ['Chapter 1: Two Kinds of Thinking', 'Chapter 2: Anchors and Frames', 'Chapter 3: Better Decisions']);
  assert.deepEqual(b.chapters[0].sections.map(s => s.title), ['Fast and slow', 'When fast thinking misleads']);
  assert.equal(b.chapters[0].sections[0].paras[0].id, 'c1s1p1');
  const t = X.parseText('CHAPTER ONE\n\nThe Start\n\nSome text here.\n\nCHAPTER TWO\n\nMore text.', 'x.txt'); const s = X.structure(t.blocks, t.meta);
  assert.equal(s.chapters.length, 2); assert.equal(s.chapters[0].title, 'CHAPTER ONE: The Start');
});

test('text without headings is split into labelled parts, with a warning', () => {
  const t = X.parseText(Array.from({ length: 60 }, (_, i) => `Paragraph ${i} says something about topic ${i}.`).join('\n\n'), 'x.txt');
  const s = X.structure(t.blocks, t.meta); assert.ok(s.chapters.length >= 2); assert.ok(s.chapters[0].generated); assert.match(s.warnings[0], /not the author’s/);
});

test('definitions are found from the text and never from outside it', () => {
  const b = sampleBook(); const d = Q.findDefinitions(b); const terms = d.map(x => x.term.toLowerCase());
  ['slow thinking', 'heuristic', 'anchoring', 'framing', 'loss aversion', 'premortem', 'availability heuristic'].forEach(t => assert.ok(terms.includes(t), t));
  d.forEach(x => { const p = b.chapters.flatMap(c => c.sections.flatMap(s => s.paras)).find(p => p.id === x.paraId); assert.ok(p.text.includes(x.sentence), 'definition sentence is in its paragraph'); });
  assert.ok(!terms.includes('it') && !terms.includes('this'));
});

test('every generated question is traceable to a paragraph that contains its excerpt', () => {
  const b = sampleBook(); const qs = Q.generate(b); assert.ok(qs.length >= 25);
  const paras = new Map(b.chapters.flatMap(c => c.sections.flatMap(s => s.paras.map(p => [p.id, p]))));
  qs.forEach(q => { assert.ok(q.bookId && q.chapterId && q.sectionId && q.paraId, q.id); const p = paras.get(q.paraId); assert.ok(p, 'paragraph exists'); q.excerpt.split(/(?<=\.)\s+/).forEach(part => assert.ok(p.text.includes(part.replace(/\s+$/, '')), 'excerpt from paragraph: ' + part)); });
  const lst = qs.find(q => q.type === 'list'); assert.deepEqual(lst.items, ['unfamiliar situations', 'high stakes', 'time pressure']);
  const ord = qs.find(q => q.type === 'order'); assert.equal(ord.items.length, 4); assert.match(ord.items[0], /^write down the decision/);
  assert.ok(qs.filter(q => q.type === 'application').every(q => q.extension), 'applications are labelled as extensions beyond the book');
  assert.ok(!qs.some(q => q.type === 'reasoning' && /produces …/.test(q.prompt)));
  qs.forEach(q => (q.expected || []).forEach(w => assert.ok(/^[a-z’'-]+$/i.test(w) && !['unlike', 'whereas'].includes(w))));
});

test('cloze masks the term; reverse recall hides the term inside the definition', () => {
  const qs = Q.generate(sampleBook());
  qs.filter(q => q.type === 'cloze').forEach(q => assert.ok(!new RegExp('\\b' + q.answer + '\\b', 'i').test(q.prompt), q.prompt));
  const r = qs.find(q => q.type === 'reverse' && q.answer === 'Anchoring'); assert.ok(r && !/anchoring/i.test(r.prompt));
});

test('answer checking: exact terms tolerate small typos and articles, and detect confusions', () => {
  const q = { type: 'cloze', answer: 'loss aversion' };
  assert.equal(Q.check(q, 'Loss aversion').result, 'correct'); assert.equal(Q.check(q, 'the loss aversoin').result, 'correct');
  const c = Q.check(q, 'framing', { terms: ['framing', 'anchoring', 'loss aversion'] }); assert.equal(c.result, 'incorrect'); assert.equal(c.confusedWith, 'framing');
  const def = { type: 'definition', expected: ['tendency', 'weigh', 'loss', 'heavily', 'gain', 'size'] };
  assert.equal(Q.check(def, 'We weigh a loss more heavily than an equal gain').result, 'correct');
  assert.equal(Q.check(def, 'no idea').result, 'incorrect'); assert.equal(Q.check(def, 'x').method, 'terms');
  const lst = { type: 'list', items: ['unfamiliar situations', 'high stakes', 'time pressure'] };
  assert.equal(Q.check(lst, 'time pressure\nunfamiliar situation').result, 'partial');
  assert.equal(Q.check({ type: 'order', items: [1, 2, 3] }, [0, 1, 2]).result, 'correct'); assert.equal(Q.check({ type: 'order' }, [2, 1, 0]).result, 'incorrect');
});

test('spaced repetition: intervals grow with success, wrong answers relearn, confident errors cost more', () => {
  let c = Q.newCard({ id: 'q1', bookId: 'b', chapterId: 'c1' }, 0); let t = 0;
  c = Q.schedule(c, 3, true, t); assert.equal(c.interval, 1); assert.equal(c.state, 'learning');
  t += DAY; c = Q.schedule(c, 3, true, t); assert.equal(c.interval, 4);
  t += 4 * DAY; c = Q.schedule(c, 3, true, t); assert.ok(c.interval >= 10, 'interval ' + c.interval); assert.equal(c.state, 'developing');
  t += c.interval * DAY; c = Q.schedule(c, 3, true, t); assert.ok(c.interval >= 21); assert.equal(Q.stateOf(c, t), 'retained');
  const unsure = Q.schedule(Q.schedule(Q.newCard({ id: 'q2' }, 0), 2, false, 0), 2, false, DAY); const sure = Q.schedule(Q.schedule(Q.newCard({ id: 'q3' }, 0), 3, true, 0), 3, true, DAY);
  assert.ok(unsure.interval < sure.interval, 'unsure answers come back sooner');
  const w1 = Q.schedule(c, 0, false, t), w2 = Q.schedule(c, 0, true, t);
  assert.equal(w1.state, 'needs review'); assert.ok(w1.due - t < DAY); assert.ok(w2.ease < w1.ease); assert.equal(w2.misconceptions, 1);
  assert.equal(Q.gradeFrom('incorrect', true), 0); assert.equal(Q.gradeFrom('correct', false), 2); assert.equal(Q.gradeFrom('correct', true), 3);
  assert.equal(Q.stateOf(Object.assign({}, sure), sure.due + 30 * DAY), 'needs review', 'long-overdue cards need review');
});

test('review queue: due first, misconceptions first, interleaved across chapters, capped', () => {
  const mk = (id, ch, due, mis) => Object.assign(Q.newCard({ id, chapterId: ch, bookId: 'b' }, 0), { state: 'learning', due, misconceptions: mis || 0, concept: id, history: [{ t: 0, grade: 2 }] });
  const cards = [mk('a1', 'c1', 5), mk('a2', 'c1', 6), mk('a3', 'c1', 7), mk('b1', 'c2', 8), mk('b2', 'c2', 9, 1), mk('later', 'c2', 1e15)];
  const q = Q.queue(cards, 100, 4, { newLimit: 0 });
  assert.equal(q.length, 4); assert.ok(!q.some(c => c.qid === 'later'));
  assert.equal(q.filter(c => c.qid === 'b2').length, 1);
  for (let i = 1; i < q.length; i++) if (q[i].chapterId === q[i - 1].chapterId) assert.fail('adjacent questions from the same chapter: ' + q.map(c => c.qid));
});

test('practice tests mix formats and favour short answers', () => {
  const b = sampleBook(); const qs = Q.generate(b); const terms = [...new Set(qs.filter(q => q.type === 'definition').map(q => q.concept))];
  const t = Q.buildTest(qs, terms, 7, 12); const types = t.map(q => q.type);
  assert.ok(types.filter(x => ['definition', 'reasoning', 'distinction', 'list'].includes(x)).length >= 5);
  assert.ok(types.includes('mc') && types.includes('match'));
  const mc = t.find(q => q.type === 'mc'); assert.equal(mc.options[mc.correct], mc.answer); assert.equal(new Set(mc.options).size, mc.options.length);
});

test('gaps need repetition, and mastery needs retention over time plus application', () => {
  const L = [{ type: 'cloze', concept: 'framing', confusedWith: 'anchoring', result: 'incorrect' }];
  assert.equal(Q.gaps(L, []).filter(g => g.id.startsWith('confuse')).length, 0, 'one swap is not a gap');
  L.push({ type: 'reverse', concept: 'anchoring', confusedWith: 'framing', result: 'incorrect' });
  assert.equal(Q.gaps(L, []).filter(g => g.id.startsWith('confuse')).length, 1);
  const log = [{ chapterId: 'c1', type: 'cloze', concept: 'x', result: 'correct' }];
  const card = c => Object.assign(Q.newCard({ id: c, chapterId: 'c1' }, 0), { state: 'learning' });
  assert.equal(Q.chapterReport('c1', log, [card('a')], 0).status, 'studied', 'a completed session is not mastery');
  const ret = id => { let k = card(id); let t = 0; [3, 3, 3, 3].forEach(g => { k = Q.schedule(k, g, true, t); t = k.due; }); return k; };
  const cards = [ret('a'), ret('b'), ret('c')]; const now = cards[0].history[3].t;
  assert.equal(Q.chapterReport('c1', log, cards, now).status, 'retaining');
  assert.equal(Q.chapterReport('c1', log.concat([{ chapterId: 'c1', type: 'application', concept: 'x', result: 'correct' }]), cards, now).status, 'mastered');
});
