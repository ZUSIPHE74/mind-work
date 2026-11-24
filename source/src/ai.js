/* MINDWORK AI layer.
   Prompts are built ONLY from the fields passed in here (the exercise, this conversation, and — if the user allows it — her
   own development goals). Journal entries, books, notes, history and anything else in storage are never read by this module.
   Providers: the claude.ai `sample` capability (hosted page, the viewer's own account, consent asked by the platform), or the
   self-hosted launcher's /api/ai (key held server-side). With neither, AI features say so; nothing is simulated. */
(function (root) {
  const isNode = typeof module !== 'undefined';
  const DIRECTIONS = [['initial', 'Initial thinking'], ['clarification', 'Clarification'], ['reasons', 'Reasons and considerations'], ['counter', 'Counterarguments'], ['connections', 'Connections'], ['implications', 'Implications'], ['reconsider', 'Reconsideration'], ['distil', 'Distillation']];
  const CONVO_MOVES = { acknowledge: 'acknowledging', detail: 'responding to a detail', question: 'asking a question', deeper: 'asking a deeper question', observe: 'making an observation', opinion: 'sharing an opinion', share: 'sharing something of your own', connect: 'making a connection', empathy: 'expressing empathy', humour: 'humour', topic: 'introducing a topic', redirect: 'changing direction', build: 'building on their idea', disagree: 'disagreeing', perspective: 'exploring another perspective', cue: 'responding to a cue', clarify: 'asking for clarification', advice: 'giving advice' };
  const q = s => JSON.stringify(String(s == null ? '' : s));
  const transcript = (turns, them, you) => turns.map(t => `${t.who === 'you' ? you + (t.spoken ? ' [spoken]' : '') : them}: ${t.text}`).join('\n');
  const goalsBlock = goals => goals && goals.length ? `\nThe person is deliberately developing these qualities (her own wording). Use them only where this conversation gives real evidence; never force them in, never judge her against them in general:\n${goals.map(g => `- ${g.id}: ${g.name} — ${g.aim}`).join('\n')}\n` : '';
  const HONESTY = `How to judge honestly:
- Base every point on what the person actually wrote, and quote her exact words as evidence. If you can't quote evidence, leave the point out.
- No automatic praise. No manufactured weaknesses. If nothing needs improving, say so plainly; "development" may be empty.
- Length is not depth; confidence is not competence; agreement is not understanding. A short answer can be complete, and a long one isn't automatically rambling.
- Pauses, self-corrections and thinking aloud are not weaknesses in themselves. Turns marked [spoken] are speech transcripts: you can judge structure, repetition, detours and abandoned sentences, but not tone, pace, pauses or delivery; don't claim to.
- A different approach from the one you'd expect is not a mistake. Judge whether it suited the situation.
- Separate what you observed from what you infer. Mark inferences with confidence, and list what you cannot tell from the text (tone, intention, feelings, what she'd do in real life).
- Never label her personality or diagnose. Use tentative language ("this may suggest…", "I can't tell from this alone…").
- Be truthful without cruelty and encouraging without flattery. British English.`;

  const XH = `\n\nLANGUAGE: She is using MINDWORK in isiXhosa. Write everything you say (every message and every feedback field) in natural, contemporary isiXhosa as spoken in the Eastern and Western Cape, not a word-for-word translation of English. Understand her fully whether she writes in isiXhosa, English or both, and never treat natural isiXhosa expression or code-switching as an error. Keep any quotations of her words exactly as she wrote them. If you are unsure of an isiXhosa word, choose plainer words rather than guessing.`;
  const withLang = (p, lang) => lang === 'xh' ? p.replace(/(\n\nReply with ONLY a JSON object)/, XH + '$1') : p;
  /* ── Deep Thinking: one adaptive turn. The eight directions are a map, not a sequence. */
  function deepTurnPrompt({ question, clarify, turns, goals }) {
    return `You are the thinking partner in MINDWORK, an app that helps one person think independently. You are exploring a question with her through conversation.

The question: ${q(question)}${clarify ? `\nWhat the question is getting at (use only if she needs clarification): ${q(clarify)}` : ''}

Eight directions you may take, as a map rather than a sequence: ${DIRECTIONS.map(d => d[0]).join(', ')}. Choose the one that would help most NOW, given what she has actually said. Skip directions she has already covered; revisit earlier ones when useful; spend longer where her thinking is developing.

Rules for your next message:
- Respond to what she actually wrote. If she says she doesn't understand, or asks what something means, explain the question differently, with an everyday example, and invite her to answer. Do not move on, do not judge, do not treat it as a failed answer.
- If she disagrees with you or with the question's assumptions, engage with her reason seriously. Concede when she's right; push back with a reason when she isn't.
- If she has already answered what you were about to ask, notice that and move on.
- If an answer is poorly reasoned, ask about the reasoning or offer a counterexample; don't lecture.
- If you can't tell what she means, say so and ask.
- One move at a time, under 90 words. No praise words like "great" or "excellent". No grading during the conversation.
- When the thinking has developed enough (or she wants to stop), help her distil it into a sentence or two in her own words, and set ready_to_close to true.
${goalsBlock(goals)}
Conversation so far (Partner is you, Person is her):
${transcript(turns, 'Partner', 'Person') || '(none yet — open the exploration with the question, in your own words)'}

Reply with ONLY a JSON object, no other text:
{"move": "clarify|follow_up|ask_example|counterargument|connection|implication|challenge|point_out_contradiction|reframe|acknowledge_and_move_on|distil", "direction": "${DIRECTIONS.map(d => d[0]).join('|')}", "covered": ["directions this conversation has genuinely explored so far"], "message": "what you say to her", "ready_to_close": false}`;
  }

  /* ── Open conversation: the AI is a participant, never a coach. */
  function convoTurnPrompt({ scenario, turns }) {
    return `You are playing a person in a realistic conversation, so that someone can practise talking naturally. You are NOT a coach or teacher: never give tips, feedback, praise or analysis, and never step out of the role.

Who you are and the situation: ${q(scenario.persona)}
How the conversation starts: ${q(scenario.opener)}

How to behave:
- Respond to what she actually said, and remember details from earlier in this conversation.
- Talk like a real person: sometimes ask something, often don't; share things of your own; introduce new information now and then; occasionally take it somewhere she wouldn't expect.
- Keep a believable personality with your own moods and opinions. Don't be relentlessly enthusiastic or agreeable. If she is rude, dismissive or pushy, react as this person realistically would.
- Usually one to three sentences. Never more than 60 words.
- If the conversation reaches a natural end, say goodbye in character and set "end" to true.

Conversation so far (Them is you, You is her):
${transcript(turns, 'Them', 'You')}

Reply with ONLY a JSON object: {"reply": "what you say next", "end": false}`;
  }

  /* ── Feedback after a complete interaction (never per turn). */
  function feedbackPrompt({ kind, title, turns, goals, context }) {
    const conv = kind === 'convo';
    return `You are giving feedback in MINDWORK on a ${conv ? 'practice conversation' : 'thinking exploration'}: ${q(title)}.${context ? `\nContext: ${q(context)}` : ''}

${HONESTY}
${conv ? `- In conversation, the same move can fit or not fit depending on the moment (a question can show interest, or make it feel like an interview; directness can be honest, or hurtful in its timing). Judge appropriateness in context, not the number of techniques used.
- Classify each of HER turns with the moves it used, from this list only: ${Object.keys(CONVO_MOVES).join(', ')}.` : `- Judge the thinking: how she reasoned, what she noticed, where she changed her mind and why, what she left unexamined. Clarification questions are part of thinking, not a weakness.`}
${goalsBlock(goals)}
The full ${conv ? 'conversation (Them is the other person, You is her)' : 'exploration (Partner is the app, Person is her)'}:
${conv ? transcript(turns, 'Them', 'You') : transcript(turns, 'Partner', 'Person')}

Reply with ONLY a JSON object:
{"summary": "one or two plain sentences on what happened",
 "strengths": [{"point": "...", "evidence": "her exact words"}],
 "development": [{"point": "...", "evidence": "her exact words", "why": "why it matters here", "try": "one concrete thing to try"}],
 "inferred": [{"point": "...", "confidence": "low|medium"}],
 "uncertain": ["what you are unsure about"],
 "cannot_assess": ["what text alone cannot show"],
 ${conv ? '"moves": [["move ids for her first turn"], ["...second turn"]],\n ' : ''}"qualities": [{"id": "one of the goal ids above, only if this interaction gives evidence", "direction": "shown|imbalance|unclear", "evidence": "her exact words", "note": "tentative, one sentence"}],
 "competencies": [{"id": "competency id", "result": "demonstrated|difficulty", "difficulty_type": "generate|develop|connect|organise|words|nuance|abstract|spontaneous|direction|build|unformed|competing|silence|lost|padding or empty", "evidence": "her exact words"}],
 "next_challenge": "one specific next challenge suited to what she showed",
 "abilities": [{"id": "one of: critical, analytical, creative, logical, strategic, problem, lateral, abstract, reflective, systems, intuitive, metacognitive — only where this interaction clearly shows it", "evidence": "her exact words"}],
 "question_for_you": "one question she could reflect on, or empty"}`;
  }

  /* ── several participants: the AI plays all of them; they don't wait for her or always ask her things */
  function groupTurnPrompt({ scenario, turns, lang }) {
    return withLang(`You are playing ${scenario.people.length} people in a group conversation. The person practising is "Her"; she may lead, follow or stay quiet.
Setting: ${q(scenario.setting)}
People:
${scenario.people.map(p => `- ${p.name}: ${p.style}`).join('\n')}

Conversation so far:
${turns.slice(-20).map(t => `${t.who === 'you' ? 'Her' + (t.spoken ? ' [spoken]' : '') : t.speaker}: ${t.text}`).join('\n')}

Write what happens next: one to three short turns from the people (1–2 sentences each). Make it a real group: people respond to each other as well as to her, add their own ideas and experiences, disagree, joke when it fits, occasionally interrupt or drift to another topic, and don't all ask her questions. Follow up on what she said if it was interesting; if she stays quiet, the conversation carries on without her. Keep each person's style consistent. End only when the conversation would naturally end.

Reply with ONLY a JSON object: {"turns": [{"speaker": "name", "text": "..."}], "end": false}`, lang);
  }

  /* ── Grow: reflect back one activity the user chose to share. Listening, not advising; never diagnosing. */
  function reflectPrompt({ title, steps }) {
    return `Someone has completed a private reflection exercise in MINDWORK called ${q(title)} and asked you to reflect it back.

Their answers:
${steps.map(s => `- ${s.prompt}\n  ${s.answer}`).join('\n')}

How to respond:
- Reflect back, in two or three sentences, what you hear in their own terms. Quote a few of their words where it helps.
- Notice one thing they may not have noticed, tentatively ("I wonder whether…"). If nothing stands out, say so.
- Ask one open question that could take their thinking further.
- No advice unless they asked for it. No diagnosis, no labels, no therapy language. Don't praise for the sake of it.
- If anything suggests they may be in danger or thinking of harming themselves, gently say that talking to someone now matters, and mention the SADAG helpline 0800 567 567.
- Under 130 words. British English.

Reply with ONLY a JSON object: {"reflection": "...", "noticed": "... or empty", "question": "..."}`;
  }

  /* ── parsing and the evidence guard */
  function parseJSON(text) {
    const s = String(text || '').replace(/```(?:json)?/g, ''); const a = s.indexOf('{'), b = s.lastIndexOf('}');
    if (a < 0 || b <= a) throw Object.assign(new Error('The AI reply came back in an unexpected format. Try again.'), { code: 'bad_format', raw: text });
    try { return JSON.parse(s.slice(a, b + 1)); } catch (e) { throw Object.assign(new Error('The AI reply came back in an unexpected format. Try again.'), { code: 'bad_format', raw: text }); }
  }
  const nrm = s => String(s || '').toLowerCase().replace(/[’‘]/g, "'").replace(/[“”"]/g, '').replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
  /* A point counts only if its quoted evidence really appears in what she wrote. Anything else is dropped and counted. */
  function guardFeedback(fb, userTexts) {
    const hay = nrm(userTexts.join(' \n ')); const removed = [];
    const ok = ev => { const e = nrm(ev); if (e.length < 3) return false; if (hay.includes(e)) return true; const w = e.split(' '); if (w.length >= 6) { const half = w.slice(0, Math.ceil(w.length * 0.6)).join(' '); return hay.includes(half); } return false; };
    const keep = (arr, label) => (Array.isArray(arr) ? arr : []).filter(x => { if (x && ok(x.evidence)) return true; removed.push({ label, point: x && x.point }); return false; });
    const out = { summary: String(fb.summary || ''), strengths: keep(fb.strengths, 'strength'), development: keep(fb.development, 'development'),
      inferred: (Array.isArray(fb.inferred) ? fb.inferred : []).filter(x => x && x.point).map(x => ({ point: String(x.point), confidence: x.confidence === 'medium' ? 'medium' : 'low' })),
      uncertain: (Array.isArray(fb.uncertain) ? fb.uncertain : []).map(String).filter(Boolean), cannot_assess: (Array.isArray(fb.cannot_assess) ? fb.cannot_assess : []).map(String).filter(Boolean),
      moves: Array.isArray(fb.moves) ? fb.moves.map(m => (Array.isArray(m) ? m : []).filter(x => CONVO_MOVES[x])) : null,
      qualities: keep(fb.qualities, 'quality').filter(x => ['shown', 'imbalance', 'unclear'].includes(x.direction)),
      competencies: keep(fb.competencies, 'competency').filter(x => x.id && ['demonstrated', 'difficulty'].includes(x.result)),
      next_challenge: String(fb.next_challenge || ''),
      abilities: keep(fb.abilities, 'ability').filter(x => ['critical', 'analytical', 'creative', 'logical', 'strategic', 'problem', 'lateral', 'abstract', 'reflective', 'systems', 'intuitive', 'metacognitive'].includes(x.id)),
      question_for_you: String(fb.question_for_you || ''), removed };
    return out;
  }
  function cleanDeepTurn(o) { const dirs = DIRECTIONS.map(d => d[0]); return { move: String(o.move || 'follow_up'), direction: dirs.includes(o.direction) ? o.direction : null, covered: (Array.isArray(o.covered) ? o.covered : []).filter(d => dirs.includes(d)), message: String(o.message || '').trim(), ready: !!o.ready_to_close }; }

  /* ── conversational patterns across several AI conversations (needs ≥3 before saying anything) */
  function convoPatterns(sessions) {
    const S = sessions.filter(s => s.kind === 'convo' && s.feedback && Array.isArray(s.feedback.moves) && s.feedback.moves.length);
    if (S.length < 3) return { enough: false, n: S.length };
    const turns = S.flatMap(s => s.feedback.moves); const n = turns.length || 1; const share = m => turns.filter(t => t.includes(m)).length / n;
    const qOnly = turns.filter(t => t.length && t.every(m => m === 'question' || m === 'deeper' || m === 'acknowledge')).length / n;
    const used = Object.keys(CONVO_MOVES).filter(m => share(m) > 0);
    const notes = [];
    if (qOnly >= 0.6) notes.push({ id: 'questions', text: `In ${Math.round(qOnly * 100)}% of your turns across ${S.length} conversations you asked questions without adding anything of your own. Questions show interest; relying on them alone can make conversations feel one-sided.` });
    if (share('opinion') + share('share') + share('observe') < 0.15) notes.push({ id: 'contribute', text: 'Your own observations, opinions and experiences appeared rarely across these conversations.' });
    if (share('disagree') === 0 && S.length >= 5) notes.push({ id: 'disagree', text: 'Across these conversations you never disagreed. That may simply reflect the conversations; it may be worth noticing if you held back a view.' });
    return { enough: true, n: S.length, turns: n, used, range: used.length, notes };
  }

  /* ── Improvement Workshop evidence from open conversations: a conversation where most of her turns were questions alone */
  const qOnlyShare = s => { const m = (s.feedback && s.feedback.moves) || []; return m.length ? m.filter(t => t.length && t.every(x => x === 'question' || x === 'deeper' || x === 'acknowledge')).length / m.length : null; };
  function aiOccurred(key, s) { if (key !== 'ai-questions' || s.kind !== 'convo' || !s.feedback) return null; const r = qOnlyShare(s); return r == null ? null : r >= 0.6; }
  function aiCandidates(sessions, targets) {
    const p = convoPatterns(sessions); if (!p.enough || !p.notes.some(n => n.id === 'questions')) return [];
    const t = targets.find(x => x.key === 'ai-questions' && x.state !== 'mastered'); if (t && t.state !== 'dismissed') return [];
    const app = sessions.filter(s => s.kind === 'convo' && s.feedback && (s.feedback.moves || []).length).slice(-12); const occ = app.filter(s => aiOccurred('ai-questions', s));
    if (t && occ.length <= (t.dismissedAt || 0)) return [];
    return [{ key: 'ai-questions', title: 'Relying on questions alone in conversation', explain: p.notes.find(n => n.id === 'questions').text, why: 'Questions show interest, but conversations grow when both people contribute: an observation, an opinion or something of your own gives the other person something to respond to.', level: occ.length >= 4 ? 'established' : 'emerging', count: occ.length, of: app.length, rate: occ.length / app.length, source: 'Open conversations', needsConsent: false, practise: ['dog', 'newperson'],
      evidence: occ.slice(-3).reverse().map(s => ({ t: s.t, aiId: s.id, title: s.title, excerpt: ((s.turns || []).find(x => x.who === 'you') || {}).text || '', line: 'Most of your turns were questions alone' })) }];
  }
  function aiSet(t, phase, now) { const used = new Set(t.practice.flatMap(s => s.games || [])); const all = ['dog', 'newperson', 'support', 'weakidea'];
    const pick = phase === 'reassess' ? all.filter(x => !used.has(x)).concat(all.filter(x => used.has(x))).slice(0, 2) : ['dog', 'newperson'];
    const n = phase === 'reassess' ? t.reassess.length : t.practice.length;
    return { id: `imp-${phase === 'reassess' ? 'r' : 'p'}-${t.id}-${n}`, type: 'aiset', improve: { targetId: t.id, phase }, createdAt: now, items: pick.map(x => ({ game: x, sid: x, state: 'pending' })), objective: phase === 'reassess' ? 'Two new conversations. Talk as you normally would.' : 'Two conversations: try adding something of your own alongside your questions.' }; }

  /* ── client */
  const client = { provider: 'none', detail: '', sample: null };
  async function detect() {
    if (!isNode && root.claude && typeof root.claude.use === 'function') {
      try { const s = await root.claude.use('sample'); if (s) { client.sample = s; client.provider = 'claude'; client.detail = 'Claude, through your claude.ai account'; return client; } } catch (e) { /* absent */ }
    }
    /* ai-status.json is a static file saying 'unavailable'; serve.py answers it live. Offline: no request at all. */ if (typeof navigator !== 'undefined' && navigator.onLine === false) { client.provider = 'none'; client.detail = ''; return client; } try { const r = await fetch('ai-status.json', { cache: 'no-store' }); if (r.ok) { const j = await r.json(); if (j.available) { client.provider = 'server'; client.detail = `${j.provider} (${j.model})`; return client; } } } catch (e) { /* offline or not self-hosted */ }
    client.provider = 'none'; client.detail = ''; return client;
  }
  const ERR = { not_granted: 'You declined Claude for this page. AI features stay off until you reload and allow it.', rate_limited: 'Too many requests just now. Wait a moment and try again.', no_key: 'This server has no AI key.', not_local: 'AI is only available on the computer running MINDWORK.', offline: 'You’re offline. AI needs a connection; everything else still works.', bad_format: 'The AI reply came back in an unexpected format. Try again.' };
  async function ask(prompt, opts) {
    opts = opts || {};
    if (!isNode && typeof navigator !== 'undefined' && navigator.onLine === false) throw Object.assign(new Error(ERR.offline), { code: 'offline' });
    if (client.provider === 'claude') {
      try { const r = await client.sample(prompt, { modelTier: opts.tier || 'default', cache: false, signal: opts.signal }); return r.text; }
      catch (e) { throw Object.assign(new Error(ERR[e.code] || e.message || 'Claude couldn’t answer.'), { code: e.code || 'failed' }); }
    }
    if (client.provider === 'server') {
      const r = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, max_tokens: opts.max || 1200 }), signal: opts.signal }).catch(() => null);
      if (!r) throw Object.assign(new Error(ERR.offline), { code: 'offline' });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw Object.assign(new Error(ERR[j.error] || j.message || 'The AI service failed.'), { code: j.error || 'failed' });
      return j.text;
    }
    throw Object.assign(new Error('AI isn’t available here.'), { code: 'unavailable' });
  }
  async function askJSON(prompt, opts) { const t = await ask(prompt, opts); return parseJSON(t); }

  const _d = deepTurnPrompt, _c = convoTurnPrompt, _f = feedbackPrompt, _r = reflectPrompt;
  const api = { groupTurnPrompt, deepTurnPromptL: (o) => withLang(_d(o), o.lang), convoTurnPromptL: (o) => withLang(_c(o), o.lang), feedbackPromptL: (o) => withLang(_f(o), o.lang), reflectPromptL: (o) => withLang(_r(o), o.lang), XH, aiOccurred, aiCandidates, aiSet, reflectPrompt, DIRECTIONS, CONVO_MOVES, deepTurnPrompt, convoTurnPrompt, feedbackPrompt, parseJSON, guardFeedback, cleanDeepTurn, convoPatterns, client, detect, ask, askJSON, ERR };
  if (isNode) module.exports = api; else root.MWAI = api;
})(this);
