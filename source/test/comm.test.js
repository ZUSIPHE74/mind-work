const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../src/comm.js'), I = require('../src/improve.js'), R = require('../src/reflect.js'), SR = require('../src/search.js'), E = require('../src/engine.js');
const run = (id, lines) => { const rp = C.RP[id]; let s = C.start(rp); for (const t of lines) s = C.reply(rp, s, t); return { s, a: C.assess(rp, s) }; };
const SKILLED = {
  intercultural: ['What was it like raising disagreement in your last office?', 'That makes sense. Disagreeing in public must feel uncomfortable.', 'Here people disagree in meetings because the manager wants problems raised early.', 'How about you try one small point next week and we talk after?'],
  network: ['What do you work on, exactly?', 'So you’re helping small shops avoid hidden fees. That makes sense.', 'I work in retail analytics, because we study how shops choose payment providers.', 'How about I send you our report and we compare notes next week?'],
  interview: ['Don’t worry, that’s completely normal. Take your time.', 'What did you enjoy most about your last role?', 'What do you mean by ran the whole process? Can you give me a specific example?', 'So, to summarise: you handled escalations and rewrote the refund policy.'],
  outage: ['I’m really sorry. I understand this is costing you sales.', 'We know a database server failed, because the error logs show it at 10:05. We don’t yet know how long the repair takes.', 'I’ll call you at 1pm with an update, whatever the status.'],
  boundary: ['No, I can\'t take it this week because of the audit.', 'I understand, but I really can\'t this week.', 'I could ask Sipho if he has space?'],
  'listen-problem': ['So you\'re saying every time the client changes it, your manager sees you as late?', 'That sounds exhausting.', 'What happens when the client changes the brief?', 'So the plan could be to copy your manager in on every change request?'],
  customer: ['I can hear how frustrating this is, especially the third time.', 'What exactly was wrong with it?', 'I can have a corrected cake ready by Friday morning, at no charge. Would that work?'],
  rent: ['What matters to you about the 1st?', 'What if I take the keys on the 1st, keep an eye on the place and paint it, and rent starts on the 15th?'],
  pitch: ['What would worry you about a four-day week?', 'Last quarter our output per hour went up when we had flexible Fridays.', 'How about a three-month pilot with a Friday rota so clients are always covered?'],
  budget: ['What do you need the R40 000 for?', 'My team needs the leadership course because two of them start managing next month.', 'What if we phase it: your certification this quarter, our course next quarter?'],
  mediate: ['Zola, it sounds like you need to know when the design changes.', 'And Pieter, so you are frustrated that meetings do not decide things.', 'What do you both want from this project?', 'Let\'s agree a decision log and a heads-up before any change.'],
  meeting: ['Today we need to decide the launch date.', 'Bongani, let\'s park the office move and come back to it at the end.', 'Aisha, what do you think about the date?', 'So we have agreed: the 21st, with testing signed off by the 17th. Next steps by Friday.'],
  coach: ['That sounds like a lot of pressure the night before.', 'What does the audience most need to take away?', 'Which slides help them decide on the budget?', 'So you\'ve decided to cut to the budget story. Sounds good.'],
  criticism: ['You\'re right that it was late, and I\'m sorry it affected the client meeting.', 'What specifically was sloppy?', 'I see. The last two were on time though, because I changed my process.', 'I propose I check the figures against the appendix before sending, from now on.'],
  disagree: ['I can see how much this means to you.', 'I\'m worried it\'s a big jump because your savings might run short.', 'How long would your savings last?', 'What if you test it at weekend markets first?'],
  'read-room': ['You sound a bit flat, is everything okay?', 'That sounds hard. I\'m sorry.', 'Want to go for a walk later? No need to talk about it.'] };
const UNSKILLED = { boundary: ['Sorry, I guess if it\'s okay I could maybe look at it?'], 'listen-problem': ['You should just tell the client no.'], customer: ['That is not my fault, it is the system.', 'Calm down!!'], rent: ['I want to start paying on the 15th.', 'Fine, the 1st then. I can do that.'], pitch: ['I want us to move to a four-day week.'], coach: ['You should cut the middle section.'], 'read-room': ['How were the beaches?', 'What did you do on Saturday?'] };

test('seven areas, each with practice that is not only definitions', () => {
  assert.equal(C.AREAS.length, 7);
  C.AREAS.forEach(a => { const n = C.ROLEPLAYS.filter(r => r.area === a.id).length + C.DRAFTS.filter(d => d.area === a.id).length + C.SPEAK.filter(s => s.area === a.id).length;
    assert.ok(a.card.length >= 3 && n >= 1 && C.RECOGNISE.some(r => r.area === a.id) && C.REAL.some(r => r.area === a.id), a.id); });
  assert.ok(C.ROLEPLAYS.length >= 12); C.RECOGNISE.forEach(r => assert.ok(r.options[r.correct] && r.why, r.id));
});

test('move detection reads typical replies correctly and avoids common false positives', () => {
  const d = t => [...C.detect(t)];
  assert.ok(d('So you\'re saying the client keeps changing things?').includes('paraphrase'));
  assert.ok(d('What matters most to you about the 1st?').includes('interest'));
  assert.ok(!d('I\'m concerned about burnout.').includes('interest'), 'a statement of your own concern is not asking about theirs');
  assert.ok(!d('That sounds good, let\'s do it.').includes('empathy'));
  assert.ok(!d('I can have it ready by Friday at no charge.').includes('refuse'), '"no charge" is not refusing');
  assert.ok(d('No. I can\'t do that.').includes('refuse') && d('I really can\'t this week.').includes('refuse'));
  assert.ok(d('You always do this!!').includes('blame'));
  assert.ok(!d('That is not my fault, it is the system.').includes('apology') && d('That is not my fault.').includes('reason'), '“not my fault” deflects; it is not an apology');
  assert.ok(d('Sorry, sorry, I guess it\'s fine.').includes('passive'));
  assert.ok(!d('It sounds like you need to know when things change.').includes('advice'), 'reflecting a need is not advice');
  assert.ok(d('What made it difficult?').includes('openq') && d('Did it go well?').includes('closedq'));
});

test('every role-play: a skilled path reaches the goal with every skill shown', () => {
  C.ROLEPLAYS.forEach(rp => { assert.ok(SKILLED[rp.id], 'skilled path written for ' + rp.id); const { s, a } = run(rp.id, SKILLED[rp.id]); assert.equal(s.over, 'good', rp.id); assert.equal(a.score, 1, rp.id + ': ' + a.crit.filter(c => !c.ok).map(c => c.label)); });
});

test('unskilled paths fail for the right reasons; characters push back, escalate or give up', () => {
  Object.entries(UNSKILLED).forEach(([id, lines]) => { const { s, a } = run(id, lines); assert.notEqual(s.over, 'good', id); assert.ok(a.score <= 0.25, id + ' ' + a.score); });
  assert.equal(run('customer', UNSKILLED.customer).s.over, 'broke', 'hostility to an angry customer breaks the conversation');
  assert.ok(run('customer', ['That is not my fault, it is the system.']).s.log.slice(-1)[0].text.includes('whose system'), 'the customer reacts to the deflection itself');
  assert.equal(run('rent', UNSKILLED.rent).s.over, 'ended', 'giving in ends the negotiation without your goal');
  const b = run('boundary', ['No, I can\'t.']); assert.ok(b.s.log[b.s.log.length - 1].text.includes('afternoon'), 'she pushes back after the first no');
  const t = run('listen-problem', ['Hmm', 'ok', 'right', 'sure', 'yes', 'fine', 'ok']); assert.equal(t.s.over, 'timeout', 'a conversation ends after seven turns');
});

test('writing checks: a strong draft meets every check, a weak one is told what is missing', () => {
  const d = C.DRAFTS.find(x => x.id === 'dr-decline');
  const good = C.checkDraft(d, 'Hi Thabo,\n\nThank you for thinking of me. I can\'t organise the party this year because I\'m leading the audit in December. I\'m happy to help on the day with setting up instead.\n\nKind regards,\nAma');
  assert.equal(good.score, 1, good.checks.filter(c => !c.ok).map(c => c.label).join());
  const weak = C.checkDraft(d, 'Sorry, sorry, I guess I could maybe not do it if that is okay?');
  ['Opens with a greeting', 'Says no clearly', 'At most one apology', 'No hedging or minimising yourself'].forEach(l => assert.ok(weak.checks.find(c => c.label === l && !c.ok), l));
  const sm = C.checkDraft(C.DRAFTS.find(x => x.id === 'dr-summary'), 'We decided to launch on 21 March.\n- Aisha will sign off testing by 17 March\n- Bongani will brief support by 19 March');
  assert.equal(sm.score, 1, sm.checks.filter(c => !c.ok).map(c => c.label).join());
});

test('pathway: understanding and recognising do not count as doing; consistency needs variety and time', () => {
  const D = 864e5; let log = [{ kind: 'card', area: 'interpersonal', t: 1 }, { kind: 'recognise', area: 'interpersonal', ok: true, t: 2 }, { kind: 'recognise', area: 'interpersonal', ok: true, t: 3 }];
  let p = C.pathway('interpersonal', log); assert.equal(p.stage, 'recognise'); assert.equal(p.met.independent, false);
  log.push({ kind: 'roleplay', rid: 'boundary', area: 'interpersonal', coach: true, score: 1, done: true, t: 4 }); p = C.pathway('interpersonal', log); assert.equal(p.stage, 'scenarios', 'coached success is guided practice, not independence');
  log.push({ kind: 'roleplay', rid: 'criticism', area: 'interpersonal', coach: false, score: 1, done: true, t: 5 }); p = C.pathway('interpersonal', log); assert.equal(p.stage, 'unfamiliar');
  log.push({ kind: 'draft', did: 'dr-decline', area: 'interpersonal', score: 1, t: 5 + 2 * D }); log.push({ kind: 'roleplay', rid: 'disagree', area: 'interpersonal', coach: false, score: 0.8, done: true, t: 6 + 2 * D });
  p = C.pathway('interpersonal', log); assert.equal(p.stage, 'consistent', JSON.stringify(p.met));
});

test('role-play evidence becomes an improvement target, practised with coaching and checked without', () => {
  const T = (rid, first) => ({ id: rid + Math.random(), kind: 'roleplay', rid, area: C.RP[rid].area, done: true, t: 1, turns: [{ text: first, moves: [...C.detect(first)] }] });
  const log = [T('customer', 'We can replace it, because our system made an error.'), T('listen-problem', 'You should tell the client no.'), T('criticism', 'I propose I fix it tomorrow.')];
  const c = C.commCandidates(log, []).find(x => x.key === 'cm-noack'); assert.ok(c && c.level === 'emerging' && c.source === 'Communicate');
  let t = I.createTarget(c, [], 10); const P = C.cmSet(t, log, 'practice', 10); assert.ok(P.coach && P.items.length === 2);
  t = I.recordSession(t, P, 10); const ctx = l => ({ clog: l, cmOccurred: C.cmOccurred });
  let L = log.concat(P.items.map((i, k) => Object.assign(T(i.rid, 'That sounds really frustrating.'), { sessionId: P.id, t: 20 + k })));
  t = I.refresh(I.refresh(t, [], 30, ctx(L)), [], 31, ctx(L)); assert.equal(t.state, 'ready');
  const Rs = C.cmSet(t, L, 'reassess', 40); assert.equal(Rs.coach, false, 'the check is done without coaching'); t = I.recordSession(t, Rs, 40);
  L = L.concat(Rs.items.map((i, k) => Object.assign(T(i.rid, 'I can hear how stressful this is.'), { sessionId: Rs.id, t: 50 + k })));
  t = I.refresh(t, [], 60, ctx(L)); assert.equal(t.state, 'improving');
  const n = C.commCandidates([T('rent', 'What if rent starts on the 15th?'), T('pitch', 'How about a four-day pilot?')], []).find(x => x.key === 'cm-nointerest'); assert.ok(n && n.count === 2);
});

test('backups carry communication practice; progress backups keep scores and moves but not your words; search finds it', () => {
  const log = [{ id: 'x1', kind: 'roleplay', rid: 'boundary', area: 'interpersonal', done: true, score: 1, t: 1, turns: [{ text: 'my private words', moves: ['refuse'] }] }, { id: 'x2', kind: 'real', cid: 'rl-no', area: 'interpersonal', t: 2, notes: { what: 'secret' } }];
  const st = { profile: E.emptyProfile(), settings: {}, attempts: [], sessions: [], journal: [], comm: log };
  const full = R.buildBackup(st, 'full'), prog = R.buildBackup(st, 'progress');
  assert.equal(full.data.comm[0].turns[0].text, 'my private words'); assert.ok(!JSON.stringify(prog.data.comm).includes('private') && !JSON.stringify(prog.data.comm).includes('secret')); assert.deepEqual(prog.data.comm[0].turns[0].moves, ['refuse']);
  const v = R.validateBackup(JSON.parse(JSON.stringify(full))); assert.equal(v.data.comm.length, 2); assert.equal(R.previewMerge({ attempts: [], journal: [], sessions: [], comm: log }, v.data).newComm.length, 0);
  const ix = SR.buildIndex({}, []); assert.equal(SR.query(ix, 'negotiation')[0].title, 'Negotiation'); assert.ok(SR.query(ix, 'angry customer')[0].title === 'An angry customer');
});
