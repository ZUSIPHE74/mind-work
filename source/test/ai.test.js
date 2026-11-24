const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const A = require('../src/ai.js'), CH = require('../src/character.js');

test('prompts are built only from what is passed in; goals only when given', () => {
  const turns = [{ who: 'them', text: 'What makes a place feel like home?' }, { who: 'you', text: "I don't understand what you mean by this question." }];
  const p = A.deepTurnPrompt({ question: 'What makes a place feel like home?', clarify: 'belonging, not the building', turns });
  assert.ok(p.includes("I don't understand what you mean") && p.includes('explain the question differently') && p.includes('Do not move on'));
  assert.ok(!p.includes('deliberately developing'), 'no goals unless the user allowed them');
  const g = A.deepTurnPrompt({ question: 'q', turns: [], goals: [{ id: 'straight', name: 'Straight Shooter', aim: 'Kind but clear' }] }); assert.ok(g.includes('Straight Shooter — Kind but clear'));
  const c = A.convoTurnPrompt({ scenario: { persona: 'You are Naledi', opener: 'We finally got a dog last month!' }, turns: [{ who: 'them', text: 'We finally got a dog last month!' }, { who: 'you', text: "Really! Congratulations. What's his name?" }] });
  assert.ok(c.includes('NOT a coach') && c.includes('never give tips') && c.includes("What's his name?"));
  const f = A.feedbackPrompt({ kind: 'convo', title: 't', turns, goals: [] });
  ['No automatic praise', 'No manufactured weaknesses', 'Length is not depth', 'quote her exact words', 'Never label her personality', 'appropriateness in context'].forEach(r => assert.ok(f.includes(r), r));
});

test('privacy: no AI code path can read journals, books, notes or real-life notes', () => {
  const ai = fs.readFileSync(__dirname + '/../src/ai.js', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  ['S.journal', 'S.books', 'S.notes', 'S.clog', 'S.slog', 'kv'].forEach(k => assert.ok(!ai.includes(k), 'ai.js references ' + k));
  const ui = fs.readFileSync(__dirname + '/../src/ui-ai.js', 'utf8');
  const calls = ui.match(/A\.(deepTurnPrompt|convoTurnPrompt|feedbackPrompt)L?\(\{[^}]*\}/g) || []; assert.ok(calls.length === 3, 'found ' + calls.length); // the L versions add only the interface language
  calls.forEach(cl => assert.ok(!/journal|books|notes|clog|slog|why/.test(cl), cl));
  const g = fs.readFileSync(__dirname + '/../src/ui-grow.js', 'utf8'); const rc = g.match(/A\.reflectPromptL\(\{[^}]*\}/g) || []; assert.equal(rc.length, 1); assert.ok(!/journal|glog|clog|books/.test(rc[0]), 'Grow reflection sends only the one activity');
});

test('replies are parsed even when wrapped; malformed replies fail clearly', () => {
  assert.deepEqual(A.parseJSON('Sure!\n```json\n{"reply":"Hi","end":false}\n```'), { reply: 'Hi', end: false });
  assert.throws(() => A.parseJSON('I would rather just chat.'), e => e.code === 'bad_format');
  const t = A.cleanDeepTurn({ move: 'clarify', direction: 'nonsense', covered: ['initial', 'made-up'], message: ' Let me put it another way. ', ready_to_close: false });
  assert.equal(t.direction, null); assert.deepEqual(t.covered, ['initial']); assert.equal(t.message, 'Let me put it another way.');
});

test('the evidence guard removes any point whose quote is not in the user’s own words', () => {
  const mine = ["Really! Congratulations. What's his name?", 'Aw, poor thing. She is probably still adjusting to everything.'];
  const raw = { summary: 's', strengths: [{ point: 'Acknowledged the news warmly', evidence: 'Really! Congratulations.' }, { point: 'Invented praise', evidence: 'You were wonderfully articulate' }],
    development: [{ point: 'Could share something of your own', evidence: "What's his name?", why: 'w', try: 't' }, { point: 'Manufactured weakness', evidence: 'she said something rude' }],
    moves: [['acknowledge', 'question', 'bogus'], ['empathy']], qualities: [{ id: 'listening', direction: 'shown', evidence: 'still adjusting to everything', note: 'n' }, { id: 'straight', direction: 'imbalance', evidence: 'not in her words at all' }], inferred: [{ point: 'p', confidence: 'high' }] };
  const g = A.guardFeedback(raw, mine);
  assert.deepEqual(g.strengths.map(x => x.point), ['Acknowledged the news warmly']); assert.deepEqual(g.development.map(x => x.point), ['Could share something of your own']);
  assert.equal(g.removed.length, 3); assert.deepEqual(g.moves, [['acknowledge', 'question'], ['empathy']]); assert.equal(g.qualities.length, 1); assert.equal(g.inferred[0].confidence, 'low', 'unknown confidence downgraded');
});

test('conversational patterns need at least three conversations, and only describe what recurs', () => {
  const S = (moves) => ({ kind: 'convo', feedback: { moves } });
  assert.equal(A.convoPatterns([S([['question']]), S([['question']])]).enough, false);
  const qs = A.convoPatterns([S([['acknowledge', 'question'], ['question']]), S([['question'], ['deeper']]), S([['question'], ['acknowledge', 'question']])]);
  assert.ok(qs.enough && qs.notes.some(n => n.id === 'questions'));
  const mixed = A.convoPatterns([S([['question', 'share'], ['opinion']]), S([['empathy'], ['observe', 'question']]), S([['humour'], ['connect']])]);
  assert.ok(!mixed.notes.some(n => n.id === 'questions') && !mixed.notes.some(n => n.id === 'contribute'));
});

test('character stages follow evidence only, and goals use the user’s own wording', () => {
  const D = 864e5; let st = { character: { stance: {}, why: {} }, comm: [], ai: [] };
  assert.equal(CH.stage('highvalue', st).met.awareness, false);
  st.character.stance.highvalue = 'adapt'; st.character.wording = { highvalue: 'Protect my time without guilt' };
  assert.ok(CH.stage('highvalue', st).met.awareness); assert.deepEqual(CH.goalsFor(st.character), [{ id: 'highvalue', name: 'High-Value with time and boundaries', aim: 'Protect my time without guilt' }]);
  st.character.why = { highvalue: { text: 'short', t: 1 } }; assert.equal(CH.stage('highvalue', st).met.understanding, false, 'one word is not understanding');
  st.character.why = { highvalue: { text: 'Because saying yes to everything leaves me resentful and tired', t: 1 } }; assert.ok(CH.stage('highvalue', st).met.understanding);
  st.comm.push({ kind: 'roleplay', rid: 'boundary', done: true, score: 1, coach: true, t: 2 }); let r = CH.stage('highvalue', st); assert.ok(r.met.guided && !r.met.independent, 'coached is guided, not independent');
  st.comm.push({ kind: 'roleplay', rid: 'boundary', done: true, score: 1, coach: false, t: 3 }); r = CH.stage('highvalue', st); assert.ok(r.met.independent && !r.met.transfer);
  st.ai.push({ id: 'a', t: 4 + 2 * D, context: 'personal', feedback: { qualities: [{ id: 'highvalue', direction: 'shown', evidence: 'No, I can’t lend money again' }] } }); r = CH.stage('highvalue', st); assert.ok(r.met.transfer, 'shown in another kind of situation');
  st.ai.push({ id: 'b', t: 5 + 3 * D, context: 'personal', feedback: { qualities: [{ id: 'highvalue', direction: 'imbalance', evidence: 'x' }] } }); r = CH.stage('highvalue', st); assert.equal(r.tensions, 1); assert.equal(r.met.consistency, false, 'a possible imbalance never counts as progress');
  st.ai.push({ id: 'c', t: 6 + 5 * D, context: 'personal', feedback: { qualities: [{ id: 'highvalue', direction: 'shown', evidence: 'y' }] } }); r = CH.stage('highvalue', st); assert.ok(r.met.consistency, 'three independent successes, several days, two kinds of situation');
  assert.ok(CH.ALL.length === 9 && CH.BALANCE.length === 10);
});
