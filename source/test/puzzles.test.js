const test = require('node:test');
const assert = require('node:assert/strict');
const Z = require('../src/puzzles.js'), I = require('../src/improve.js'), A = require('../src/abilities.js'), SR = require('../src/search.js');

test('every puzzle is complete: category, level, three hints, answer, explanation, valid reasoning check', () => {
  assert.equal(Z.CATS.length, 9);
  Z.CATS.forEach(c => assert.ok(Z.PUZZLES.filter(p => p.cat === c.id).length >= 1, c.id));
  assert.ok(new Set(Z.PUZZLES.map(p => p.kind)).size >= 10, 'at least ten distinct mechanics');
  Z.PUZZLES.forEach(p => { assert.ok(Z.CAT[p.cat] && p.lvl >= 1 && p.lvl <= 5 && p.hints.length === 3 && p.explain && p.answerText, p.id);
    if (p.key) p.key.correct.forEach(i => assert.ok(p.key.options[i], p.id)); if (p.correct) p.correct.forEach(i => assert.ok(p.options[i] != null, p.id)); });
  assert.ok(Z.PUZZLES.some(p => p.correct && p.correct.length > 1), 'a puzzle with several valid answers');
  assert.ok(Z.PUZZLES.some(p => p.options && p.correct && p.options[p.correct[0]] === Z.NONE), 'a puzzle where the evidence is insufficient');
  assert.ok(Z.PUZZLES.some(p => p.options && p.correct && p.options[p.correct[0]] === Z.CONTRA), 'a puzzle that contradicts itself');
});

test('typed answers: accepted forms pass and wrong ones fail', () => {
  const ok = (id, t) => Z.check(Z.PZ[id], t).correct;
  assert.ok(ok('lat-1', 'He is playing Monopoly') && !ok('lat-1', 'he lied to the owner'));
  assert.ok(ok('lat-3', 'she is a photographer developing a photo') && !ok('lat-3', 'she is a magician'));
  assert.ok(ok('lat-4', 'R5 and R1') && ok('lat-4', 'a five rand coin and a R1, i.e. 5 and 1') && !ok('lat-4', 'two R3 coins'));
  assert.ok(ok('pat-1', '42') && !ok('pat-1', '40')); assert.ok(ok('pat-2', '29'));
  ['50c', '50 cents', 'R0.50', '0,50', 'R0,5', '0.5'].forEach(a => assert.ok(ok('log-1', a), a)); ['R1', '1', 'R10'].forEach(a => assert.ok(!ok('log-1', a), a));
  ['1/11', '0.0909', '9.09%'].forEach(a => assert.ok(ok('log-4', a), a)); assert.ok(!ok('log-4', '1/6'));
  const st = Z.PZ['esc-1'].stages; assert.ok(Z.checkAnswer(st[0].accept, 'SEVEN') && Z.checkAnswer(st[1].accept, '752') && !Z.checkAnswer(st[1].accept, '712') && !Z.checkAnswer(st[1].accept, '751') && !Z.checkAnswer(st[1].accept, '753'));
  assert.ok(!Z.checkAnswer(Z.PZ['pat-1'].accept, '42.1'), 'whole-number answers must match exactly');
});

test('deduction answers hold up under brute force', () => {
  const people = ['Ama', 'Ben', 'Chen'];
  // ded-1: exactly one statement true
  const d1 = people.filter(th => [th !== 'Ama', th === 'Ama', th !== 'Chen'].filter(Boolean).length === 1);
  assert.deepEqual(d1, ['Chen']); assert.deepEqual(Z.PZ['ded-1'].correct.map(i => Z.PZ['ded-1'].options[i]), ['Chen']);
  // ded-2: exactly one liar; two thieves fit, so the answer must be "cannot be determined"
  const d2 = people.filter(th => { const ama = th === 'Ben'; const ben = !ama; const chen = th !== 'Chen'; return [ama, ben, chen].filter(x => !x).length === 1; });
  assert.deepEqual(d2.sort(), ['Ama', 'Ben']); assert.equal(Z.PZ['ded-2'].options[Z.PZ['ded-2'].correct[0]], Z.NONE);
  // escape stage 3: exactly one true label
  const keys = ['A', 'B', 'C'].filter(k => [k === 'A', k !== 'B', k !== 'A'].filter(Boolean).length === 1); assert.deepEqual(keys, ['B']);
  assert.equal(Z.PZ['esc-1'].stages[2].correct[0], 1);
});

test('the logic grid has exactly one solution, and it is the one given', () => {
  const p = Z.PZ['log-2']; const sols = [];
  for (const pets of Z.perms(p.attrs[0].values)) for (const drinks of Z.perms(p.attrs[1].values)) {
    const P = Object.fromEntries(p.people.map((n, i) => [n, pets[i]])), D = Object.fromEntries(p.people.map((n, i) => [n, drinks[i]]));
    const who = pet => p.people.find(n => P[n] === pet);
    if (P.Lindiwe !== 'dog' && D[who('fish')] === 'tea' && D.Pieter === 'coffee' && P.Sipho !== 'cat' && D[who('cat')] === 'juice') sols.push(p.people.map(n => [n, P[n], D[n]]));
  }
  assert.equal(sols.length, 1); sols[0].forEach(([n, pet, d]) => assert.deepEqual(p.solution[n], [pet, d]));
  assert.ok(Z.check(p, p.solution).correct); assert.ok(!Z.check(p, Object.assign({}, p.solution, { Sipho: ['dog', 'tea'] })).correct);
});

test('visual puzzles: the matrix rule and the rotation-versus-mirror answers are exactly right', () => {
  const m = Z.PZ['pat-3']; assert.deepEqual(m.options[m.correct[0]], { s: 'triangle', n: 3 });
  const key = cells => cells.map(c => c.join(',')).sort().join(' ');
  ['spa-1', 'spa-2'].forEach(id => { const p = Z.PZ[id]; const rots = new Set([0, 90, 180, 270].map(r => key(Z.polyCells(p.show.base, { rot: r }))));
    const isRot = p.options.map(o => rots.has(key(Z.polyCells(p.show.base, o))));
    if (id === 'spa-1') assert.deepEqual(isRot.map((x, i) => x ? null : i).filter(x => x !== null), p.correct, 'the only non-rotation is the answer');
    else assert.deepEqual(isRot.map((x, i) => x ? i : null).filter(x => x !== null), p.correct, 'the only rotation is the answer'); });
});

test('strategy mechanics: the game, the tower, the jugs and the budget', () => {
  const play = userMove => { let n = 15; while (n > 0) { n -= userMove(n); if (n === 0) return 'user'; n -= Math.min(n, Z.nimMove(n, 3)); if (n === 0) return 'computer'; } };
  assert.equal(play(n => n % 4 || 1), 'user', 'leaving multiples of 4 wins'); assert.equal(play(() => 1), 'computer', 'careless play loses to MINDWORK');
  let st = Z.hanoiStart(4), moves = 0; const solve = (n, a, c, b) => { if (!n) return; solve(n - 1, a, b, c); const r = Z.hanoiMove(st, a, c); assert.ok(r.ok); st = r.st; moves++; solve(n - 1, b, c, a); };
  solve(4, 0, 2, 1); assert.ok(Z.hanoiDone(st, 4)); assert.equal(moves, 15);
  assert.equal(Z.hanoiMove([[1], [2], []], 1, 0).ok, false, 'a larger disc can’t go on a smaller one');
  assert.equal(Z.jugsMin([5, 3], 4), 6);
  const b = Z.PZ['str-3']; const o = Z.optimum(b); assert.equal(o.value, 140); assert.ok(b.answerText.includes('140'));
  o.sets.forEach(s => assert.ok(Z.check(b, s).correct)); assert.ok(!Z.check(b, [0, 1, 3]).correct, 'within budget but not optimal'); assert.ok(!Z.check(b, [2, 4]).correct, 'over budget');
  const sp = Z.PZ['vis-1']; const all = sp.diffs.map(d => d.i); assert.ok(Z.check(sp, all).correct); assert.ok(!Z.check(sp, all.slice(1)).correct); assert.ok(!Z.check(sp, all.concat([0])).correct);
});

test('outcomes separate sound reasoning from guessing and lucky answers', () => {
  assert.equal(Z.classify({ correct: true, keyOk: true, conf: 3 }), 'sound');
  assert.equal(Z.classify({ correct: true, keyOk: false, conf: 3 }), 'uncertain');
  assert.equal(Z.classify({ correct: true, keyOk: true, conf: 0 }), 'guessed');
  assert.equal(Z.classify({ correct: false, keyOk: true }), 'promising');
  assert.equal(Z.classify({ correct: false, keyOk: false }), 'misread');
  assert.equal(Z.classify({ correct: true, keyOk: true, conf: 3, revealed: true }), 'revealed');
});

test('puzzle evidence becomes an improvement target with practice and reassessment in unused puzzles', () => {
  const log = [{ id: 'e1', pid: 'ded-2', done: true, firstOverreach: true, t: 1 }, { id: 'e2', pid: 'log-3', done: true, firstOverreach: true, t: 2 }, { id: 'e3', pid: 'ded-1', done: true, firstOverreach: false, t: 3 }];
  const c = Z.puzzleCandidates(log, []).find(x => x.key === 'pz-overreach'); assert.ok(c && c.level === 'emerging' && c.source === 'Puzzle Arena');
  let t = I.createTarget(c, [], 10); assert.equal(t.source, 'Puzzle Arena');
  const P = Z.pzSet(t, log, 'practice', 10); assert.equal(P.items.length, 3); assert.ok(P.items.every(i => Z.PZ[i.pid].tests.includes('evidence')));
  t = I.recordSession(t, P, 10); const ctx = l => ({ plog: l, pzOccurred: Z.pzOccurred });
  let L = log.concat(P.items.slice(0, 2).map((i, k) => ({ id: 'p' + k, pid: i.pid, done: true, sessionId: P.id, firstOverreach: false, t: 20 + k })));
  t = I.refresh(I.refresh(t, [], 30, ctx(L)), [], 31, ctx(L)); assert.equal(t.state, 'ready');
  const Rs = Z.pzSet(t, L, 'reassess', 40); t = I.recordSession(t, Rs, 40);
  const used = new Set(P.items.map(i => i.pid)); assert.ok(Rs.items.some(i => !used.has(i.pid)), 'reassessment prefers puzzles not used in practice');
  L = L.concat(Rs.items.map((i, k) => ({ id: 'r' + k, pid: i.pid, done: true, sessionId: Rs.id, firstOverreach: false, t: 50 + k })));
  t = I.refresh(t, [], 60, ctx(L)); assert.equal(t.state, 'improving'); assert.equal(t.reassess[0].verdict, 'pass');
});

test('puzzles count as ability evidence, and search finds them', () => {
  const ev = A.events({ puzzles: [{ id: 'x', pid: 'str-2', cat: 'strategic', done: true, solved: true, outcome: 'sound', hints: 0, t: 5 }, { id: 'y', pid: 'str-1', cat: 'strategic', done: true, solved: true, outcome: 'guessed', hints: 0, t: 6 }] });
  const s = ev.filter(e => e.ability === 'strategic'); assert.equal(s.length, 2); assert.deepEqual(s.map(e => e.success), [true, false], 'a guessed answer is not counted as shown');
  const ix = SR.buildIndex({}, []); assert.equal(SR.query(ix, 'tower')[0].title, 'Tower of four'); assert.equal(SR.query(ix, 'puzzle arena')[0].title, 'Puzzle Arena');
});
