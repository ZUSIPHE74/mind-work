const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../src/grow.js'), X = require('../src/xp.js'), O = require('../src/obs.js'), B = require('../src/bilingual.js'), A = require('../src/ai.js'), I = require('../src/improve.js'), AB = require('../src/abilities.js'), SR = require('../src/search.js');
const DAY = 864e5;

test('Grow: six areas, practical activities, completion rules, private emotion patterns', () => {
  assert.equal(G.AREAS.length, 6); G.AREAS.forEach(a => assert.ok(G.ACTIVITIES.filter(x => x.area === a.id).length >= 4, a.id));
  assert.ok(G.ACTIVITIES.filter(a => a.practise).every(a => ['boundary', 'disagree', 'criticism'].includes(a.practise)), 'inner-assertiveness activities link to real Communicate role-plays');
  const ci = G.BY['em-checkin']; assert.equal(G.complete(ci, { 0: ['Anxious'] }), false); assert.equal(G.complete(ci, { 0: ['Anxious'], 1: 2 }), true, 'optional steps may be blank');
  const sort = G.BY['at-obsint'].steps[0]; const all = Object.fromEntries(sort.items.map((it, i) => [i, it.c])); assert.deepEqual(G.sortScore(sort, all), { right: sort.items.length, n: sort.items.length });
  const now = 100 * DAY; const log = [{ aid: 'em-checkin', t: now - DAY, answers: { 0: ['Anxious', 'Tired'], 1: 3, 3: 'deadline' } }, { aid: 'em-checkin', t: now - 2 * DAY, answers: { 0: ['Anxious'], 1: 1 } }, { aid: 'em-checkin', t: now - 40 * DAY, answers: { 0: ['Angry'], 1: 4 } }];
  const p = G.emotionPatterns(log, now); assert.equal(p.n, 2, 'only the last 30 days'); assert.deepEqual(p.top[0], ['Anxious', 2]); assert.equal(p.strongest.length, 1);
  assert.ok(G.CRISIS.includes('0800 567 567'));
});

test('progression: derived from practice, rewards independence, stable missions, flexible consistency', () => {
  const now = 50 * DAY + 1000; const st = { attempts: [{ t: now - 10, hints: 0, overall: 3, status: 'independent', versions: [{}] }, { t: now - 20, hints: 3, overall: 3, status: 'assisted', versions: [{}] }], puzzles: [{ t: now - 30, done: true, solved: true, outcome: 'sound' }, { t: now - 40, done: true, solved: true, outcome: 'guessed' }], grow: [{ t: now - 5 * DAY, aid: 'em-checkin' }] };
  const ev = X.events(st); assert.equal(ev.find(e => e.t === now - 10).xp > ev.find(e => e.t === now - 20).xp, true, 'independent work earns more than hinted');
  assert.ok(ev.find(e => e.t === now - 30).xp > ev.find(e => e.t === now - 40).xp, 'sound reasoning earns more than a guess');
  const s = X.summary(st, now); assert.equal(s.recent14, 2); assert.ok(s.level >= 1 && s.xp === ev.reduce((a, e) => a + e.xp, 0));
  const m1 = X.missions(st, now), m2 = X.missions(st, now + 3600e3); assert.deepEqual(m1.map(m => m.label), m2.map(m => m.label), 'missions are stable through the day');
  assert.ok(m1[0].done, 'an exercise today completes the quick mission'); assert.equal(new Set(m1.map(m => m.slot)).size, 3);
  const j = X.journey(st, now); assert.ok(['learn', 'communicate'].includes(j.focus.id), 'the week’s focus is a destination used least lately');
  assert.ok(X.achievements(st, now).find(a => a.id === 'first').got);
});

test('Observation and Memory: generated tasks score exactly and levels adapt both ways', () => {
  ['vm', 'sc', 'am', 'as', 'ob', 'dr'].forEach(ex => { for (let lv = 1; lv <= 5; lv++) { const t = O.build(ex, lv, 's' + lv); assert.ok(t, ex + lv); } });
  const vm = O.build('vm', 3, 'x'); assert.deepEqual(O.score(vm, Object.fromEntries(vm.qs.map((q, i) => [i, q.a]))), { right: vm.qs.length, n: vm.qs.length });
  vm.qs.forEach(q => assert.ok(q.options.includes(q.a), 'the right answer is always offered'));
  const sc = O.build('sc', 2, 'y'); const diff = sc.scene.map((o, i) => JSON.stringify(o) !== JSON.stringify(sc.after[i])); assert.equal(diff.filter(Boolean).length, 1); assert.ok(diff[sc.changed]);
  const am = O.build('am', 1, 'z'); assert.equal(O.score(am, am.seq.join(' ')).right, am.seq.length); assert.equal(O.score(am, am.seq.slice().reverse().join(' ')).right < am.seq.length || am.seq.join() === am.seq.slice().reverse().join(), true);
  const dr = O.build('dr', 2, 'w'); assert.equal(O.score(dr, dr.words.slice().reverse().join(', ')).right, dr.words.length, 'free recall: order doesn’t matter');
  const ob = O.build('ob', 3, 'v'); assert.ok(ob.statements.some(s => s.c === 'seen') && ob.statements.some(s => s.c === 'not') && ob.statements.some(s => s.c === 'int'));
  const L = [{ ex: 'vm', lvl: 1, right: 3, n: 3 }, { ex: 'vm', lvl: 1, right: 3, n: 3 }]; assert.equal(O.level('vm', L), 2); assert.equal(O.level('vm', L.concat([{ ex: 'vm', lvl: 2, right: 1, n: 3 }])), 1);
  const ev = AB.events({ obs: [{ id: 'o', ex: 'ob', lvl: 3, t: 1, right: 6, n: 6 }] }); assert.deepEqual(ev.map(e => e.ability), ['analytical', 'critical']);
});

test('Bilingual Lab: eight modes, isiXhosa never judged by English norms, practice levels don’t claim proficiency', () => {
  assert.equal(B.MODES.length, 8);
  const p = B.feedbackPrompt({ mode: 'meaning', prompt: '“I’m not angry, just disappointed.”', answers: { xh: 'Andinamsindo, ndiphoxekile nje.', why: 'kept the softness' } });
  assert.ok(p.includes('Never judge isiXhosa by English norms') && p.includes('isixhosa_confidence') && p.includes('Andinamsindo'));
  assert.equal(B.practiceLevel([{ kind: 'ex' }, { kind: 'ex' }, { kind: 'ex' }]).level, 2); assert.ok(/practice/i.test(B.PRACTICE_LEVELS.map(x => x[1]).join(' ')));
});

test('open-conversation evidence becomes an improvement target and is checked in new conversations', () => {
  const conv = (moves, t, extra) => Object.assign({ id: 'c' + t, kind: 'convo', t, title: 'x', turns: [{ who: 'you', text: 'What happened?' }], feedback: { moves } }, extra || {});
  const qs = [conv([['question'], ['question']], 1), conv([['acknowledge', 'question'], ['question']], 2), conv([['question'], ['deeper']], 3)];
  const c = A.aiCandidates(qs, []); assert.equal(c.length, 1); assert.equal(c[0].source, 'Open conversations');
  let t = I.createTarget(c[0], [], 10); const P = A.aiSet(t, 'practice', 10); t = I.recordSession(t, P, 10); const ctx = l => ({ ailog: l, aiOccurred: A.aiOccurred });
  let L = qs.concat([conv([['question', 'share'], ['opinion']], 20, { sessionId: P.id }), conv([['observe'], ['question']], 21, { sessionId: P.id })]);
  t = I.refresh(I.refresh(t, [], 30, ctx(L)), [], 31, ctx(L)); assert.equal(t.state, 'ready');
  const R = A.aiSet(t, 'reassess', 40); assert.ok(R.items.some(i => !['dog', 'newperson'].includes(i.sid)), 'the check uses conversations not used for practice'); t = I.recordSession(t, R, 40);
  L = L.concat([conv([['opinion', 'question'], ['empathy']], 50, { sessionId: R.id }), conv([['share'], ['observe', 'question']], 51, { sessionId: R.id })]);
  t = I.refresh(t, [], 60, ctx(L)); assert.equal(t.state, 'improving');
  assert.equal(A.aiCandidates([conv([['share']], 1), conv([['opinion']], 2), conv([['observe']], 3)], []).length, 0, 'no target without the pattern');
});

test('search reaches the new environments', () => {
  const ix = SR.buildIndex({}, []); assert.equal(SR.query(ix, 'emotional check-in')[0].title, 'Emotional Check-In'); assert.ok(SR.query(ix, 'isixhosa').slice(0, 3).some(o => o.title === 'Bilingual Expression Lab'), 'the Lab is among the top results');
  assert.ok(SR.query(ix, 'visual memory').some(o => o.title === 'Visual Memory')); assert.ok(SR.query(ix, 'achievements').some(o => o.title === 'Records and achievements'));
});

test('new exercise formats are checked exactly and count as ability evidence', () => {
  const F = require('../src/ui-formats.js'); const AB = require('../src/abilities.js');
  assert.deepEqual(F.score('odd', 0, F.ODD[0].odd), { right: 1, n: 1 }); assert.equal(F.score('odd', 0, 'Violin').right, 0);
  const all = Object.fromEntries(F.CATS[0].items.map(([t, c]) => [t, c])); assert.equal(F.score('sort', 0, all).right, F.CATS[0].items.length);
  assert.equal(F.score('seq', 1, F.SEQ[1].steps).right, 5); assert.ok(F.score('seq', 1, F.SEQ[1].steps.slice().reverse()).right < 5);
  F.ODD.forEach(q => assert.ok(q.set.includes(q.odd)));
  const ev = AB.events({ extra: { formats: [{ id: 'x', f: 'seq', t: 1, right: 5, n: 5 }] } }); assert.deepEqual(ev.map(e => [e.ability, e.success]), [['logical', true], ['systems', true]]);
});

test('What Is Missing?: exactly one shape removed, the answer is offered, scoring is exact', () => {
  const O = require('../src/obs.js');
  for (let lv = 1; lv <= 5; lv++) { const t = O.build('wm', lv, 'w' + lv); assert.equal(t.after.length, t.scene.length - 1); assert.ok(t.options.includes(t.answer)); assert.equal(new Set(t.options).size, t.options.length);
    assert.equal(O.score(t, t.answer).right, 1); assert.equal(O.score(t, t.options.find(o => o !== t.answer)).right, 0); }
});
