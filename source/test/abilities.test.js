const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../src/engine.js'), R = require('../src/reflect.js'), A = require('../src/abilities.js'), SR = require('../src/search.js');
const DAY = 864e5; let n = 0;
function att(game, itemId, responses, t, hints, extra) {
  const it = E.ITEM[itemId]; const fb = E.evaluate(it, responses);
  return Object.assign({ id: 'a' + (++n), itemId, game, level: it.lvl, t, hints: hints || 0, status: hints ? 'assisted' : 'independent', schema: 2, events: [], reflections: [], sessionId: 's',
    versions: [{ v: 1, t, responses, overall: fb.overall, dims: fb.dims, feedback: R.snapshot(fb) }], overall: fb.overall, dims: fb.dims, responses }, extra || {});
}
const GOOD_WL = { pick: 2, why: 'He also started sleeping earlier at the same time, so another cause could explain it, because one person is not enough evidence.' };
const GOOD_ARG = { claim: 'Everyone should learn to cook a few basic meals, because it saves money and improves health.', reasons: ['It usually costs less than takeaway, so money goes further', 'Home cooking often means less salt, which improves health over time'], example: 'For example, a pot of lentil soup costs about a third of a takeaway and lasts three days.', objection: 'Some people have no time to cook after long working days.', response: 'That is true for some weeks, but batch cooking on a Sunday usually takes two hours and covers several meals, so the time cost is small.' };

test('every game and Study Lab activity maps only to known abilities, and every ability has a definition', () => {
  Object.entries(A.GAME_TAGS).forEach(([g, t]) => { assert.ok(E.GAME[g], g); t.forEach(a => assert.ok(A.AB[a], a)); });
  Object.values(A.STUDY_TAGS).forEach(t => t.forEach(a => assert.ok(A.AB[a])));
  assert.equal(A.ABILITIES.length, 12);
  assert.equal(A.activitiesFor('strategic').games.length, 0, 'no Playground game is claimed to train strategic thinking');
  assert.ok(A.activitiesFor('strategic').puzzles.some(p => p.id === 'strategic' && p.primary), 'strategic thinking is trained by the Puzzle Arena');
  assert.ok(A.activitiesFor('critical').games.filter(g => g.primary).length >= 4);
});

test('stages need evidence: exposure, then independent success twice, then unfamiliar, then consistency', () => {
  assert.equal(A.overview({ attempts: [] }).every(r => r.stage === null), true, 'no work, no stage');
  const t0 = 1e9;
  let st = { attempts: [att('weaklink', 'weaklink-1', { pick: 0, why: 'I disagree.' }, t0)] };
  let r = A.overview(st).find(x => x.ability.id === 'logical'); assert.equal(r.stage, 'exposure');
  st.attempts.push(att('weaklink', 'weaklink-2', GOOD_WL, t0 + 1000, 2)); r = A.overview(st).find(x => x.ability.id === 'logical');
  assert.equal(r.stage, 'exposure', 'success with hints does not count as independent'); assert.ok(r.met.guided);
  st.attempts.push(att('weaklink', 'weaklink-1', GOOD_WL, t0 + 2000)); st.attempts.push(att('argue', 'argue-1', GOOD_ARG, t0 + 3000));
  r = A.overview(st).find(x => x.ability.id === 'logical'); assert.ok(r.met.independent, JSON.stringify(r.counts)); assert.ok(r.met.unfamiliar, 'first attempt at Build an Argument, done well');
  assert.equal(r.met.consistent, false, 'one environment and one day is not consistency');
});

test('consistency requires several activities, environments and days', () => {
  const t0 = 2e9; const atts = [att('weaklink', 'weaklink-1', GOOD_WL, t0), att('argue', 'argue-1', GOOD_ARG, t0 + DAY), att('weaklink', 'weaklink-2', GOOD_WL, t0 + 2 * DAY)];
  const slog = [{ id: 'l1', t: t0 + 3 * DAY, type: 'why', final: 'correct' }];
  let r = A.overview({ attempts: atts }).find(x => x.ability.id === 'critical'); assert.equal(r.met.consistent, false, 'two activities in one environment');
  atts.push(att('mainpoint', 'mainpoint-1', { pick: 4, restate: 'Designing streets for cars can hurt the very shops the cars are meant to serve, because walkers linger.' }, t0 + 4 * DAY));
  r = A.overview({ attempts: atts }).find(x => x.ability.id === 'critical'); assert.equal(r.met.consistent, false, 'three activities but still one environment');
  r = A.overview({ attempts: atts, slog }).find(x => x.ability.id === 'critical');
  assert.ok(r.met.consistent && r.counts.activities >= 3 && r.counts.environments >= 2, JSON.stringify(r.counts));
});

test('calibration and reflection evidence come only from what was recorded', () => {
  const a = att('possibility', 'possibility-1', { ideas: ['tired'], check: 'ask' }, 5e9, 0, { selfRating: 4 });
  const ev = A.events({ attempts: [a] }); const cal = ev.filter(e => e.source === 'calibration');
  assert.equal(cal.length, 2); assert.equal(cal[0].success, false, 'rated thorough, feedback disagreed');
  const sl = [{ id: 'x', t: 1, type: 'cloze', conf: 3, final: 'incorrect' }, { id: 'y', t: 2, type: 'cloze', conf: 1, final: 'incorrect' }];
  const ev2 = A.events({ slog: sl }).filter(e => e.ability === 'intuitive'); assert.deepEqual(ev2.map(e => e.success), [false, true]);
  assert.equal(A.events({ journal: [{ id: 'j', updated: 1, explorations: [], reflection: [] }] }).length, 0);
});

test('search finds environments, games, exercises and abilities, and never exposes journal text', () => {
  const ix = SR.buildIndex({ journal: [{ id: 'j1', created: 1, versions: [{ t: 1, text: 'my secret zebra worry' }], explorations: [] }], books: [{ id: 'b1', title: 'How Decisions Go Wrong', author: 'Sample', chapters: [{ id: 'c1', title: 'Anchors and Frames' }] }] }, [{ label: 'Think', purpose: 'Train abilities', href: '#think' }]);
  assert.equal(SR.query(ix, 'weak link')[0].title, 'Find the Weak Link');
  assert.equal(SR.query(ix, 'study lab')[0].title, 'Study Lab');
  assert.equal(SR.query(ix, 'backup')[0].title, 'Settings');
  assert.ok(SR.query(ix, 'systems')[0].title === 'Systems Thinking');
  assert.ok(SR.query(ix, 'anchors').some(o => o.kind === 'Chapter'));
  const j = SR.query(ix, 'zebra'); assert.equal(j.length, 1); assert.equal(j[0].title, 'Thinking Journal entry'); assert.ok(!JSON.stringify([j[0].title, j[0].body]).includes('zebra'));
  assert.ok(SR.query(ix, 'gambling cat wombat').length === 0);
  assert.ok(SR.query(ix, 'possibility generator')[0].kind === 'Game');
});
