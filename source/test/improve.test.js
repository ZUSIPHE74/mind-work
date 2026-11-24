const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../src/engine.js'), R = require('../src/reflect.js'), I = require('../src/improve.js');
const DAY = 864e5;
let seq = 0;
function att(game, itemId, responses, t, sessionId, hints) {
  const it = E.ITEM[itemId]; const fb = E.evaluate(it, responses);
  return { id: 'x' + (++seq), itemId, game, level: it.lvl, t, hints: hints || 0, status: 'independent', schema: 2, sessionId: sessionId || 's', reflections: [],
    events: (hints ? Array.from({ length: hints }, (_, i) => ({ t: t - 10 + i, type: 'hint', n: i + 1 })) : []),
    versions: [{ v: 1, t, responses, overall: fb.overall, dims: fb.dims, feedback: R.snapshot(fb) }], overall: fb.overall, dims: fb.dims, responses };
}
const ONE = { ideas: ['They are tired from sleeping badly'], check: 'I would ask whether they slept badly, because that is the simplest explanation to test.' };
const MANY = { ideas: ['They are exhausted after sleeping badly', 'A conflict with their manager in the last meeting', 'They are interviewing for a job elsewhere', 'They decided to listen more and talk less', 'The topic is unfamiliar to them'], check: 'I would check whether they are quiet only when the manager is present, because that separates conflict from tiredness.' };
const base = (n, firstN) => Array.from({ length: n }, (_, i) => att('possibility', 'possibility-' + ((i % 5) + 1), i < firstN ? ONE : MANY, 1e6 + i * 1000));

test('every pattern target can be reassessed in exercises where the habit is observable', () => {
  R.DETECT.filter(d => d.kind === 'difficulty').forEach(d => { const g = I.applicableGames(d.id); assert.ok(g.length >= 2, d.id + ' has ' + g.length); });
  assert.ok(I.applicableGames('first').includes('possibility')); assert.ok(I.applicableGames('qonly').every(g => E.GAME[g].cat === 'convo'));
});

test('candidates come only from evidence; single observations need explicit consent', () => {
  assert.equal(I.candidates(base(4, 0), []).length, 0, 'no evidence, no target');
  const one = I.candidates(base(4, 1), []).find(c => c.key === 'first'); assert.ok(one.needsConsent);
  const rec = I.candidates(base(7, 5), []).find(c => c.key === 'first'); assert.equal(rec.level, 'established'); assert.equal(rec.needsConsent, false); assert.ok(rec.evidence.length && rec.why);
});

test('at most three targets are active; extra ones wait in the later queue', () => {
  const c = I.candidates(base(7, 5), []).find(x => x.key === 'first'); let T = [];
  for (let i = 0; i < 4; i++) { const t = I.createTarget(Object.assign({}, c, { key: 'first' + i }), T, 1); T.push(t); }
  assert.deepEqual(T.map(t => t.state), ['active', 'active', 'active', 'identified']); assert.equal(I.slotsUsed(T), 3);
});

test('a dismissed target is not suggested again without new evidence', () => {
  const A = base(7, 5); const c = I.candidates(A, []).find(x => x.key === 'first');
  const t = Object.assign(I.transition(I.createTarget(c, [], 1), 'dismissed', 2), { dismissedAt: c.count });
  assert.ok(!I.candidates(A, [t]).some(x => x.key === 'first'));
  const more = A.concat([att('possibility', 'possibility-1', ONE, 2e6), att('whatelse', 'whatelse-1', { ideas: ['They forgot'], distinguish: 'Ask them, because asking settles it.' }, 2e6 + 1)]);
  const again = I.candidates(more.slice(-20), [t]).find(x => x.key === 'first'); assert.ok(again && again.reopened);
});

test('lifecycle: practice → ready → failed check → practice → clean check → improving → demonstrated → mastered', () => {
  const A = base(7, 5); const c = I.candidates(A, []).find(x => x.key === 'first');
  let t = I.createTarget(c, [], 10 * DAY); let all = A.slice(); let now = 10 * DAY;
  const P = I.practiceSession(t, E.emptyProfile(), [], now); assert.equal(P.items.length, 3); assert.ok(P.items.every(x => t.practise.includes(x.game)));
  t = I.recordSession(t, P, now); all.push(att('possibility', 'possibility-2', MANY, now + 1, P.id)); t = I.refresh(t, all, now + 2); assert.equal(t.state, 'practising');
  all.push(att('whatelse', 'whatelse-2', { ideas: MANY.ideas.slice(0, 4), distinguish: 'I would ask them directly, because that tells the two readings apart.' }, now + 3, P.id)); t = I.refresh(t, all, now + 4); assert.equal(t.state, 'ready');
  // a failed check sends it back to practice
  let Rs = I.reassessSession(t, E.emptyProfile(), [], now + 5); assert.equal(Rs.items.length, 2);
  assert.ok(Rs.items.every(x => I.applicableGames('first').includes(x.game)));
  const used = new Set(t.practice.flatMap(p => p.games)); assert.ok(Rs.items.some(x => !used.has(x.game)), 'reassessment prefers exercises not used in practice');
  t = I.recordSession(t, Rs, now + 5); all.push(att('possibility', 'possibility-3', ONE, now + 6, Rs.id)); all.push(att('possibility', 'possibility-4', ONE, now + 7, Rs.id));
  t = I.refresh(t, all, now + 8); assert.equal(t.state, 'practising'); assert.equal(t.reassess[0].verdict, 'fail'); assert.equal(t.reassess[0].occurred, 2);
  // practice again, then a clean check
  const P2 = I.practiceSession(t, E.emptyProfile(), [], now + 9); t = I.recordSession(t, P2, now + 9);
  all.push(att('possibility', 'possibility-5', MANY, now + 10, P2.id)); all.push(att('possibility', 'possibility-1', MANY, now + 11, P2.id)); t = I.refresh(t, all, now + 12); assert.equal(t.state, 'ready');
  const clean = sid => [att('possibility', 'possibility-2', MANY, 0, sid), att('possibility', 'possibility-3', MANY, 0, sid)];
  let R2 = I.reassessSession(t, E.emptyProfile(), [], now + 13); t = I.recordSession(t, R2, now + 13); all = all.concat(clean(R2.id)); t = I.refresh(t, all, now + 14);
  assert.equal(t.state, 'improving');
  // a second clean check within a week does not yet count
  let R3 = I.reassessSession(t, E.emptyProfile(), [], now + DAY); t = I.recordSession(t, R3, now + DAY); all = all.concat(clean(R3.id)); t = I.refresh(t, all, now + DAY + 1); assert.equal(t.state, 'improving');
  let R4 = I.reassessSession(t, E.emptyProfile(), [], now + 8 * DAY); t = I.recordSession(t, R4, now + 8 * DAY); all = all.concat(clean(R4.id)); t = I.refresh(t, all, now + 8 * DAY + 1); assert.equal(t.state, 'demonstrated');
  let R5 = I.reassessSession(t, E.emptyProfile(), [], now + 16 * DAY); t = I.recordSession(t, R5, now + 16 * DAY); all = all.concat(clean(R5.id)); t = I.refresh(t, all, now + 16 * DAY + 1); assert.equal(t.state, 'mastered');
  assert.deepEqual(t.history.map(h => h.state), ['active', 'practising', 'ready', 'practising', 'ready', 'improving', 'improving', 'demonstrated', 'mastered']);
});

test('the hint habit is checked from hints opened before the first submission', () => {
  const h = I.occurred('hints', att('possibility', 'possibility-1', MANY, 5000, 's', 2)); assert.equal(h, true);
  assert.equal(I.occurred('hints', att('possibility', 'possibility-1', MANY, 5000, 's', 0)), false);
});

test('backups carry improvement targets; progress backups drop their evidence text', () => {
  const c = I.candidates(base(7, 5), []).find(x => x.key === 'first'); const t = I.createTarget(c, [], 1);
  const st = { profile: E.emptyProfile(), settings: {}, attempts: [], sessions: [], journal: [], improve: { targets: [t] } };
  const full = R.buildBackup(st, 'full'), prog = R.buildBackup(st, 'progress');
  assert.equal(full.data.improve.targets[0].baseline.evidence.length, c.evidence.length); assert.equal(prog.data.improve.targets[0].baseline.evidence.length, 0);
  const v = R.validateBackup(JSON.parse(JSON.stringify(full))); assert.equal(v.data.improve.targets.length, 1);
  assert.equal(R.previewMerge({ attempts: [], journal: [], sessions: [], improve: { targets: [t] } }, v.data).newTargets.length, 0);
  assert.equal(R.validateBackup({ format: 'mindwork-backup', version: 2, data: { attempts: [] } }).data.improve.targets.length, 0, 'older backups without targets still import');
});
