const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../src/engine.js');
const R = require('../src/reflect.js');

const legacy = () => ({ id: 'old1', itemId: 'beyond-1', game: 'beyond', level: 1, t: 1000, hints: 2, selfRating: 3, status: 'assisted', overall: 3, dims: { variety: 3 },
  responses: { interp: 'Final reading', reasons: ['fear of loss', 'effort to learn', 'distrust of managers'] },
  revisions: [{ t: 2000, responses: { interp: 'First reading', reasons: ['fear of loss'] }, overall: 1.5, dims: { variety: 1 } }] });

test('schema-1 migration reconstructs versions in order and never alters the original fields', () => {
  const a = legacy(); const before = JSON.stringify(a);
  const m = R.migrateAttempt(a);
  assert.equal(JSON.stringify(a), before, 'input not mutated');
  assert.equal(m.schema, 2); assert.ok(m.legacy);
  assert.equal(m.versions.length, 2);
  assert.equal(m.versions[0].responses.interp, 'First reading'); assert.equal(m.versions[0].t, 1000); assert.equal(m.versions[0].selfRating, 3);
  assert.equal(m.versions[1].responses.interp, 'Final reading'); assert.equal(m.versions[1].t, 2000);
  assert.deepEqual(m.events, [], 'hint timing is not invented');
  assert.equal(m.versions[0].feedback, null, 'feedback text is not invented');
  assert.deepEqual(m.revisions, a.revisions); assert.deepEqual(m.responses, a.responses);
  assert.equal(R.migrateAttempt(m), m, 'already-migrated records are left alone');
});

test('timeline shows only recorded events, in order, and flags reconstructed feedback', () => {
  const tl = R.timeline(legacy());
  const types = tl.events.map(e => e.type);
  assert.deepEqual(types, ['challenge', 'initial', 'feedback', 'revision', 'feedback']);
  assert.ok(tl.legacy); assert.equal(tl.hintCountOnly, 2);
  assert.equal(tl.events[2].recorded, false);
  const now = { ...legacy(), schema: 2, legacy: false, events: [{ t: 900, type: 'start' }, { t: 950, type: 'hint', n: 1, text: 'h1' }, { t: 1500, type: 'reveal' }],
    versions: [{ v: 1, t: 1000, responses: { interp: 'a' }, feedback: R.snapshot(E.evaluate(E.ITEM['beyond-1'], { interp: 'a' })) }], reflections: [{ t: 3000, answers: { now: 'x' }, useful: [] }] };
  const t2 = R.timeline(now).events.map(e => e.type);
  assert.deepEqual(t2, ['challenge', 'hint', 'initial', 'feedback', 'reveal', 'reflection']);
  assert.equal(R.timeline(now).events[3].recorded, true);
});

test('comparison classifies new, unchanged, qualified and removed parts', () => {
  const it = E.ITEM['beyond-1'];
  const first = { interp: 'People hate change. It is scary.', reasons: ['They fear losing what is familiar', 'Learning costs effort', 'Bosses are bad'] };
  const last = { interp: 'People hate change. People often resist change when it is imposed on them.', reasons: ['They fear losing what is familiar', 'Learning costs effort', 'They distrust whoever proposes it'] };
  const c = R.compare(it, first, last);
  const kinds = c.stages.flatMap(s => s.items.map(x => x.kind));
  assert.ok(kinds.includes('unchanged')); assert.ok(kinds.includes('new'));
  assert.ok(c.tally.removed >= 1, 'removed parts are reported');
  const q = R.compare(E.ITEM['nuance-1'], { rewrite: 'Exercise makes you happier.' }, { rewrite: 'Exercise usually makes you happier when it is regular.' });
  assert.equal(q.stages[0].items[0].kind, 'qualified');
});

test('overlooked items are marked addressed only when the final feedback no longer flags them', () => {
  const f1 = { unexplored: ['Identity and competence', 'Time horizons'], attention: ['A and B look like the same idea in different words. What mechanism separates them?'] };
  const fN = { unexplored: ['Time horizons'], attention: [] };
  const o = R.overlooked(f1, fN, false);
  assert.equal(o.find(x => x.text === 'Identity and competence').status, 'addressed');
  assert.equal(o.find(x => x.text === 'Time horizons').status, 'open');
  assert.ok(o.find(x => x.kind === 'attention').firm);
  assert.ok(R.overlooked(f1, f1, true).every(x => x.status === 'open'), 'single-version records claim nothing was addressed');
});

function mk(i, ideas, extra) {
  const a = { id: 'p' + i, itemId: 'possibility-' + ((i % 5) + 1), game: 'possibility', level: 1, t: 1e6 + i * 1000, hints: 0, status: 'independent', schema: 2, events: [], reflections: [] };
  const responses = { ideas, check: 'I would look at whether they speak to me privately, because that would tell me whether it is personal.' };
  const fb = E.evaluate(E.ITEM[a.itemId], responses);
  a.versions = [{ v: 1, t: a.t, responses, overall: fb.overall, dims: fb.dims, feedback: R.snapshot(fb) }]; a.overall = fb.overall; a.dims = fb.dims; a.responses = responses;
  return Object.assign(a, extra || {});
}
const ONE = ['They are tired from sleeping badly'];
const MANY = ['They are exhausted after sleeping badly', 'A conflict with their manager in the last meeting', 'They are interviewing for a job elsewhere', 'They decided to listen more and talk less', 'The topic is unfamiliar to them'];

test('one occurrence is reported as a single observation, never as a pattern', () => {
  const atts = [mk(1, ONE), mk(2, MANY), mk(3, MANY), mk(4, MANY)];
  const p = R.patterns(atts).find(x => x.id === 'first');
  assert.ok(p); assert.equal(p.level, 'single'); assert.equal(p.count, 1);
});

test('repeated occurrences become emerging, then established, with evidence from real attempts', () => {
  const em = R.patterns([mk(1, ONE), mk(2, ONE), mk(3, MANY), mk(4, MANY), mk(5, MANY)]).find(x => x.id === 'first');
  assert.equal(em.level, 'emerging');
  const est = R.patterns([1, 2, 3, 4, 5, 6, 7].map(i => mk(i, i < 6 ? ONE : MANY))).find(x => x.id === 'first');
  assert.equal(est.level, 'established'); assert.equal(est.count, 5); assert.equal(est.of, 7);
  assert.ok(est.evidence.length >= 1 && est.evidence.every(e => e.attemptId.startsWith('p')));
  assert.match(est.evidence[0].excerpt, /tired/);
});

test('pattern trend compares earlier and recent attempts', () => {
  const atts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => mk(i, i <= 5 ? ONE : MANY));
  const p = R.patterns(atts).find(x => x.id === 'first');
  assert.equal(p.trend.dir, 'less'); assert.equal(p.trend.early, 1); assert.equal(p.trend.recent, 0);
});

test('hint dependence uses recorded hint timing, and only the final count for older records', () => {
  const a = mk(1, MANY); a.events = [{ t: a.t - 10, type: 'hint', n: 1 }, { t: a.t - 5, type: 'hint', n: 2 }, { t: a.t + 50, type: 'hint', n: 3 }];
  assert.equal(R.hintsBeforeFirst(a), 2);
  assert.equal(R.hintsBeforeFirst(legacy()), 2);
});

test('journal thoughts keep every version and link both ways', () => {
  const j = R.newThought('question', 'Why do meetings expand?', 1);
  const k = R.reviseThought(j, 'Why do meetings expand to fill the time?', 2);
  assert.equal(j.versions.length, 1, 'original object untouched'); assert.equal(k.versions.length, 2); assert.equal(k.versions[0].text, 'Why do meetings expand?');
  assert.equal(R.reviseThought(k, 'Why do meetings expand to fill the time?', 3), k, 'identical text adds no version');
  const other = R.newThought('idea', 'Deadlines shape effort', 4);
  const linked = R.linkThoughts([k, other], k.id, other.id);
  assert.ok(linked[0].links.includes(other.id) && linked[1].links.includes(k.id));
});

test('backups: full and progress formats, validation, v1 compatibility, duplicate detection and profile rebuild', () => {
  const atts = [mk(1, MANY), mk(2, ONE)];
  const st = { profile: E.emptyProfile(), settings: { theme: 'dark' }, attempts: atts, sessions: [{ id: 's1', items: [] }], journal: [R.newThought('idea', 'x y z', 5)] };
  const full = R.buildBackup(st, 'full'), prog = R.buildBackup(st, 'progress');
  assert.equal(full.version, 2); assert.equal(full.counts.journal, 1);
  assert.equal(prog.counts.journal, 0); assert.equal(prog.data.attempts[0].responses, undefined, 'progress backups omit written answers');
  const v = R.validateBackup(JSON.parse(JSON.stringify(full))); assert.ok(v.ok); assert.equal(v.counts.attempts, 2);
  const v1 = R.validateBackup({ app: 'mindwork', version: 1, profile: {}, attempts: [legacy()], sessions: [] });
  assert.ok(v1.ok); assert.equal(v1.version, 1); assert.equal(v1.data.attempts[0].versions.length, 2, 'v1 records are migrated on import');
  assert.equal(R.validateBackup({ hello: 1 }).ok, false);
  assert.equal(R.validateBackup({ format: 'mindwork-backup', version: 99, data: { attempts: [] } }).ok, false, 'newer formats are refused');
  const bad = R.validateBackup({ format: 'mindwork-backup', version: 2, data: { attempts: [{ id: 'x' }, ...atts], sessions: [], journal: [] } });
  assert.ok(bad.ok); assert.equal(bad.counts.attempts, 2); assert.ok(bad.errors[0].includes('malformed'));
  const plan = R.previewMerge({ attempts: [atts[0]], journal: [], sessions: [] }, v.data);
  assert.equal(plan.dupAttempts, 1); assert.equal(plan.newAttempts.length, 1); assert.equal(plan.newJournal.length, 1);
  const P = R.rebuildProfile(atts); assert.ok(P.skills.divergent.n > 0);
});

test('relying on questions alone is a pattern only when it recurs across conversations', () => {
  const E = require('../src/engine.js'); let n = 0;
  const mk = (r1, r2, t) => { const it = E.ITEM['keepgoing-1']; const fb = E.evaluate(it, { r1, r2 }); return { id: 'q' + (++n), itemId: it.id, game: 'keepgoing', level: 1, t, hints: 0, status: 'independent', schema: 2, events: [], reflections: [], versions: [{ v: 1, t, responses: { r1, r2 }, overall: fb.overall, dims: fb.dims, feedback: R.snapshot(fb) }], overall: fb.overall, dims: fb.dims }; };
  const one = [mk('What happened?', 'How are you?', 1)];
  assert.ok(!R.patterns(one).some(p => p.id === 'qonly' && p.level !== 'single'), 'one conversation is not a pattern');
  const many = [1, 2, 3, 4, 5].map(i => mk('What happened?', 'How are you coping?', i * 1000));
  const p = R.patterns(many).find(x => x.id === 'qonly'); assert.ok(p && ['emerging', 'established'].includes(p.level), 'recurring across conversations is noticed');
  const mixed = [1, 2, 3, 4, 5].map(i => mk('That sounds like a lot. Busy stretches always arrive at once. What happened?', 'A break would help, even a long weekend.', i * 1000));
  assert.ok(!R.patterns(mixed).some(x => x.id === 'qonly'), 'questions alongside your own thoughts are not this pattern');
});
