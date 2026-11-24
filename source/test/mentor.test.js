const test = require('node:test'); const assert = require('node:assert/strict');
const CP = require('../src/competency.js'), M = require('../src/mentor.js'), A = require('../src/ai.js'), FX = require('../src/ui-flex.js'), I = require('../src/improve.js');
const DAY = 864e5; const d = (comp, t, extra) => Object.assign({ comp, t, kind: 'demonstrated', ctx: 'a', evidence: 'words', hinted: false, unfamiliar: false }, extra || {});

test('competency states move only with evidence, never with activity counts', () => {
  const many = Array.from({ length: 100 }, (_, i) => ({ comp: 'expand', t: i, kind: 'attempt', ctx: 'x' })); assert.equal(CP.state('expand', many).key, 'practising');
  assert.equal(CP.state('expand', [d('expand', 1)]).key, 'developing');
  assert.equal(CP.state('expand', [d('expand', 1), d('expand', 2), d('expand', 3)]).key, 'developing', 'same day, same context is not consistency');
  const cons = [d('expand', 0), d('expand', DAY, { ctx: 'b' }), d('expand', 2 * DAY)]; assert.equal(CP.state('expand', cons).key, 'consistent');
  const ind = cons.concat([d('expand', 3 * DAY, { unfamiliar: true }), d('expand', 4 * DAY, { unfamiliar: true, hinted: true })]); assert.equal(CP.state('expand', ind).key, 'consistent', 'help disqualifies independence');
  const ind2 = ind.concat([d('expand', 5 * DAY, { unfamiliar: true })]); assert.equal(CP.state('expand', ind2).key, 'independent');
  assert.equal(CP.state('expand', ind2.concat([d('expand', 20 * DAY)])).key, 'mastered');
  assert.equal(CP.state('expand', ind2.concat([d('expand', 20 * DAY), { comp: 'expand', t: 21 * DAY, kind: 'difficulty', ctx: 'c', evidence: 'x' }])).key, 'independent', 'a recent difficulty blocks mastery');
  assert.ok(CP.state('expand', []).next);
});
test('before and after needs two real records on different days; recurring difficulty needs two contexts', () => {
  assert.equal(CP.beforeAfter('connect', [d('connect', 1)]), null);
  const ba = CP.beforeAfter('connect', [Object.assign(d('connect', 0), { kind: 'difficulty' }), d('connect', 3 * DAY)]); assert.equal(ba.changed, 'improved');
  const diff = (t, ctx) => ({ comp: 'expand', t, kind: 'difficulty', type: 'develop', ctx, evidence: 'x' });
  assert.equal(CP.recurring([diff(1, 'a'), diff(2, 'a'), diff(3, 'a')]).length, 0); assert.equal(CP.recurring([diff(1, 'a'), diff(2, 'b'), diff(3, 'a')])[0].type, 'develop');
});
test('mentor: teaching rules, no repeated strategy, private material only with permission', () => {
  const st = { comp: [], teaching: [{ concept: 'building on others', strategy: 'Re-explain in simpler language', understood: false }], journal: [{ text: 'PRIVATE DIARY' }], grow: [{ aid: 'em-checkin' }] };
  const c0 = M.context(st, { goals: false, grow: false, journal: false }); assert.ok(!JSON.stringify(c0).includes('PRIVATE') && !c0.grow);
  assert.ok(JSON.stringify(M.context(st, { journal: true })).includes('PRIVATE'));
  const p = M.prompt({ ctx: M.context(st, {}), turns: [{ who: 'you', text: 'I don’t get it' }] });
  assert.ok(p.includes('Do not repeat a strategy') && p.includes('building on others') && p.includes('Never treat a submitted answer as understanding') && p.includes('valid_alternative'));
});
test('mentor guard: understanding needs a demonstration in her words', () => {
  const yours = ['I think it means adding to what they said, like picking up their detail'];
  let g = M.guard({ message: 'Good.', diagnosis: 'none', strategy: 'check', assessment: { competency: 'listen', result: 'demonstrated', evidence: 'picking up their detail' }, understood: true }, yours); assert.equal(g.understood, true); assert.equal(g.assessment.competency, 'listen');
  g = M.guard({ message: 'Good.', assessment: { competency: 'listen', result: 'demonstrated', evidence: 'words she never wrote' }, understood: true }, yours); assert.equal(g.assessment, null); assert.equal(g.removed, 1); assert.equal(g.understood, null, 'no evidence, no understanding');
  g = M.guard({ message: 'x', diagnosis: 'made_up', strategy: 'nonsense' }, yours); assert.equal(g.diagnosis, 'none'); assert.equal(g.strategy, null);
});
test('daily plan: reasons, size, and a gentle return after time away', () => {
  const now = 100 * DAY; const ev = [d('expand', 0), d('expand', DAY, { ctx: 'b' }), d('expand', 2 * DAY)];
  const P = M.plan({ comp: ev, lastActive: now - 10 * DAY }, 'medium', now); assert.ok(P.length <= 3 && P.every(i => i.why)); assert.ok(/away 10 days/.test(P[0].why));
  assert.equal(M.plan({ comp: [] }, 'short', now).length, 1);
});
test('AI instructions: competencies with evidence, next challenge, real group behaviour', () => {
  const f = A.feedbackPrompt({ kind: 'convo', title: 't', turns: [{ who: 'you', text: 'hello there friend' }], goals: [] }); assert.ok(f.includes('"competencies"') && f.includes('next_challenge'));
  const g = A.guardFeedback({ summary: 's', strengths: [], development: [], competencies: [{ id: 'listen', result: 'demonstrated', evidence: 'hello there' }, { id: 'expand', result: 'difficulty', evidence: 'never said' }] }, ['hello there friend']); assert.deepEqual(g.competencies.map(c => c.id), ['listen']);
  const gp = A.groupTurnPrompt({ scenario: { setting: 's', people: [{ name: 'A', style: 'x' }, { name: 'B', style: 'y' }] }, turns: [] }); assert.ok(/disagree/.test(gp) && /don't all ask her questions/.test(gp) && /if she stays quiet/.test(gp));
});
test('say it different ways: reworded versions and jargon are flagged; the checks admit their limits', () => {
  const idea = FX.IDEAS[0]; const r = FX.checkWays(idea, { child: 'Interest grows on interest, like a snowball rolling downhill.', sceptic: 'Interest grows on interest, like a snowball rolling downhill.', story: 'Imagine a snowball.' });
  assert.ok(r.some(c => c.ok === false && /reworded/.test(c.text))); assert.ok(r.some(c => c.ok === null));
  assert.ok(FX.checkWays(idea, { child: 'The principal accrues interest annually.' }).some(c => c.ok === false && /jargon/.test(c.text)));
});
test('Improvement Workshop runs on mentor evidence: practice, then an unfamiliar check', () => {
  const occurred = (key, e) => { const type = key.replace(/^m-/, ''); if (e.kind === 'difficulty' && e.type === type) return true; if (e.kind === 'demonstrated' && ['expand'].includes(e.comp)) return false; return null; };
  let t = I.createTarget({ key: 'm-develop', title: 'Difficulty: developing an existing idea', explain: 'x', why: 'y', level: 'emerging', count: 3, of: 3, rate: 1, source: 'Mentor evidence', evidence: [] }, [], 10);
  const P = { id: 'imp-p-' + t.id + '-0', type: 'mentorset', improve: { targetId: t.id, phase: 'practice' }, items: [] }; t = I.recordSession(t, P, 10);
  const ctx = L => ({ mlog: L.map(e => Object.assign({ done: true }, e)), mOccurred: occurred });
  let L = [Object.assign(d('expand', 20), { sessionId: P.id }), Object.assign(d('expand', 21), { sessionId: P.id })];
  t = I.refresh(I.refresh(t, [], 30, ctx(L)), [], 31, ctx(L)); assert.equal(t.state, 'ready');
  const R = { id: 'imp-r-' + t.id + '-0', type: 'mentorset', improve: { targetId: t.id, phase: 'reassess' }, items: [] }; t = I.recordSession(t, R, 40);
  L = L.concat([Object.assign(d('expand', 50, { unfamiliar: true }), { sessionId: R.id }), Object.assign(d('expand', 51, { unfamiliar: true }), { sessionId: R.id })]);
  t = I.refresh(t, [], 60, ctx(L)); assert.equal(t.state, 'improving');
});

test('new formats are scored exactly against their keys', () => {
  const F = require('../src/ui-formats.js');
  const b = F.BOARD[0]; const br = Object.fromEntries(b.ev.map(([t, c], k) => [k, c])); br.verdict = b.verdict; assert.deepEqual(F.score('board', 0, br), { right: b.ev.length + 1, n: b.ev.length + 1 });
  const am = F.AMBIG[0]; assert.equal(F.score('ambig', 0, { read: Object.fromEntries(am.readings.map(([, ok], k) => [k, !!ok])), reply: String(am.replies.findIndex(r => r[1])) }).right, am.readings.length + 1);
  assert.equal(F.score('img', 0, { choice: String(F.IMG[0].opts.findIndex(o => o[1])) }).right, 1);
  assert.equal(F.score('listen2', 0, Object.fromEntries(F.LISTEN[0].qs.map((q, k) => [k, String(q[2])]))).right, 4);
  assert.equal(F.score('recon', 0, F.RECON[0].lines).right, 6);
  const c = F.score('constrain', 0, { text: 'A secret word you type to prove a computer box is yours.' }); assert.equal(c.right, 1); assert.deepEqual(c.used, ['computer']);
  assert.equal(F.score('scene', 0, { pick: String(F.SCENE[0].statements.findIndex(s => s[1])) }).right, 1);
  F.FORMATS.forEach(f => assert.ok(f.abilities.length && f.n > 0, f.id));
});
test('storytelling hints and analysis keys are sound', () => {
  const C2 = require('../src/ui-comm2.js');
  const h = C2.storyHints('Last summer I missed my train, but that’s when I met Sipho. Since then I leave early.'); assert.ok(h.every(([, ok]) => ok));
  assert.ok(C2.storyHints('Cats are nice.').every(([, ok]) => !ok));
  C2.DIALOGUES.forEach(d => d.qs.forEach(([, a]) => assert.ok(a >= 0 && a < d.lines.length && d.notes[a], d.id + a)));
});
test('evidence flows from every environment; Grow only as content-free practice; character takes assessed evidence only', () => {
  const E = require('../src/engine.js');
  const ev = M.derived({ plog: [{ pid: 'ded-1', cat: 'deduction', done: true, outcome: 'sound', t: 5 }], olog: [{ ex: 'ob', lvl: 3, t: 6, right: 5, n: 6, overread: 1 }], extra: { formats: [{ f: 'board', i: 0, t: 7, right: 6, n: 6 }] }, glog: [{ area: 'emotion', aid: 'em-checkin', t: 8, answers: { 3: 'SECRET' } }] }, E);
  assert.ok(ev.some(e => e.comp === 'interpretive' && e.kind === 'demonstrated' && e.ctx === 'puzzle:ded-1'));
  assert.ok(ev.some(e => e.ctx === 'observation:ob' && e.kind === 'difficulty'));
  assert.ok(ev.some(e => e.ctx === 'format:board' && e.kind === 'demonstrated'));
  const g = ev.find(e => e.ctx === 'grow'); assert.equal(g.kind, 'attempt'); assert.ok(!JSON.stringify(ev).includes('SECRET'));
  const CH = require('../src/character.js');
  const out = CH.evidenceFrom({ comp: [{ comp: 'listen', t: 1, kind: 'demonstrated', evidence: 'What did you name him', source: 'mentor assessment', ctx: 'mentor' }, { comp: 'listen', t: 2, kind: 'demonstrated', evidence: 'x', source: 'rules', ctx: 'roleplay:x' }] });
  assert.equal(out.filter(o => o.quality === 'listening').length, 1, 'rules-based results are not character evidence');
  const X = require('../src/xp.js'); assert.ok(X.events({ extra: { formats: [{ t: 1, right: 1, n: 1 }], drawings: [{ t: 2 }] } }).length === 2);
});

test('intentional expression: new competencies, distinct difficulty types, transcript analysis that flags but never scores', () => {
  ['readiness', 'organise', 'monitor', 'pausing', 'recovery', 'intent'].forEach(id => assert.equal(CP.BY[id].group, 'intent'));
  ['unformed', 'competing', 'silence', 'lost', 'padding'].forEach(k => assert.ok(CP.DIFFICULTIES[k] && M.DIAG[k], k));
  assert.equal(CP.COMPETENCIES.filter(c => /concise/i.test(c.name)).length, 1, 'concise expression reuses the existing clarity competency');
  const X = require('../src/ui-express.js');
  const r = X.analyse('Well, I mean, Mondays are hard. People are tired on Mondays, you know. Mondays are hard because people are tired. And the coffee machine on the third floor has been broken since Thursday —', 'Mondays are a bad day for meetings', 'Should we move the team meeting to Mondays?');
  assert.ok(r.repeats.length >= 1 && r.padding.some(([p]) => p === 'i mean') && r.abandoned >= 1 && r.detours.length >= 1);
  assert.ok(!('score' in r), 'no score: flags only');
  const long = X.analyse('A long answer can be exactly right. '.repeat(1) + 'When people say no they risk disappointing someone they care about. Saying no also means admitting a limit. Some people learnt early that being useful earns love. That makes a refusal feel like a threat to the relationship rather than a scheduling decision.', 'Saying no feels like risking the relationship', 'why some people find it hard to say no');
  assert.equal(long.repeats.length, 0); assert.equal(long.abandoned, 0, 'a long coherent answer raises no flags');
  const p = M.prompt({ ctx: {}, turns: [{ who: 'you', text: 'um' }] }); assert.ok(p.includes('ask her a question instead of guessing') && p.includes("never teach scripted phrases or 'speak less'") && p.includes('marked as a hypothesis'));
  assert.ok(A.feedbackPrompt({ kind: 'convo', title: 't', turns: [{ who: 'you', text: 'hi', spoken: true }], goals: [] }).includes('You [spoken]: hi'));
});
