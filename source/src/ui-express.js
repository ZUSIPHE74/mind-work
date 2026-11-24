/* MINDWORK — Speak with intention. Develops readiness, organisation, recovery and intentional contribution.
   Not a lesson in speaking less: length, pauses, self-corrections and thinking aloud are never penalised.
   The transcript analysis is rules-based and only flags POSSIBLE patterns; it can't hear tone, pace or pauses. */
(function (root) {
  const SIT = [
    { id: 'unexpected', kind: 'An unexpected question', prompt: 'A colleague, out of nowhere: “If you could change one thing about how we work, what would it be?”' },
    { id: 'disagree', kind: 'Someone disagrees with you', prompt: 'A friend: “Honestly, university is a waste of money now.” You see it differently.' },
    { id: 'observe', kind: 'An observation, and they look at you', prompt: 'At a braai, someone says: “It’s strange how quiet the neighbourhood’s got since the factory closed.” They look at you.' },
    { id: 'explain', kind: 'Explain without preparation', prompt: 'Someone asks you to explain why some people find it so hard to say no.', long: true },
    { id: 'competing', kind: 'Several thoughts at once', prompt: '“So what did you think of the conference?” Five thoughts arrive at once.', dump: true },
    { id: 'recover', kind: 'You’ll be interrupted', prompt: '“Tell me about a decision you’re proud of.” Partway through, someone will interrupt.', interrupt: 25, long: true },
    { id: 'ramble', kind: 'Recover from rambling', prompt: 'You started answering “Should we move the team meeting to Mondays?” like this: “Well, I mean, Mondays are, you know, people are tired, and also the coffee machine, and last time we tried something similar it was a bit, I don’t know, and Thandi said, anyway, Mondays…” Recover: what is your point?', ramble: true },
    { id: 'dontknow', kind: 'You genuinely don’t know', prompt: '“What’s your view on how cryptocurrency should be regulated?” You know very little about it.' },
    { id: 'pause', kind: 'Take time before answering', prompt: '“What’s the most important thing you’ve learnt this year?” Take at least five seconds to think before you answer.', minPause: 5 },
    { id: 'struggle', kind: 'An idea that’s hard to put into words', prompt: 'You have a sense of why some places feel welcoming and others don’t, but you’ve never put it into words. Try.', long: true }];
  const INTENTS = [['answer', 'Answering'], ['question', 'Asking'], ['explain', 'Explaining'], ['disagree', 'Disagreeing'], ['share', 'Sharing something of mine'], ['explore', 'Thinking it through'], ['feeling', 'Responding to a feeling'], ['unsure', 'Not sure yet']];
  const PAD = ['you know', 'i mean', 'kind of', 'sort of', 'basically', 'at the end of the day', 'to be honest', 'or whatever', 'and stuff', 'and everything', 'like i said', 'if that makes sense', 'does that make sense'];
  const STOP = new Set('the a an and or but so to of in on at for with is are was were be been it this that i you we they he she my your our their me them as if not no do does did have has had just really very what how why when where which who will would can could should about from into than then there here also more some any all'.split(' '));
  const content = s => (String(s || '').toLowerCase().match(/[a-z’']+/g) || []).filter(w => w.length > 2 && !STOP.has(w));
  /* rules-based, transcript-only: flags POSSIBLE patterns and never scores */
  function analyse(text, core, prompt) {
    const sents = String(text || '').split(/(?<=[.!?…])\s+|\n+/).map(x => x.trim()).filter(Boolean); const words = (String(text || '').match(/\S+/g) || []).length; const low = String(text || '').toLowerCase();
    const padding = PAD.map(p => [p, (low.match(new RegExp('\\b' + p.replace(/ /g, '\\s+') + '\\b', 'g')) || []).length]).filter(([, n]) => n);
    const repeats = []; for (let i = 0; i < sents.length; i++) for (let j = i + 1; j < sents.length; j++) { const A = new Set(content(sents[i])), B = new Set(content(sents[j])); if (A.size >= 3 && B.size >= 3) { let n = 0; A.forEach(w => B.has(w) && n++); if (n / Math.min(A.size, B.size) >= 0.7) repeats.push([i, j]); } }
    const abandoned = sents.filter(s => /(—|–|\.\.\.|…)$/.test(s) || (s.split(/\s+/).length <= 3 && !/[.!?]$/.test(s))).length;
    const anchor = new Set(content(core).concat(content(prompt))); const detours = core && core.trim() ? sents.map((s, i) => [s, i]).filter(([s]) => content(s).length >= 4 && !content(s).some(w => anchor.has(w))).map(([, i]) => i) : [];
    const addresses = content(text).some(w => new Set(content(prompt)).has(w));
    return { words, sentences: sents.length, sents, padding, repeats, abandoned, detours, addresses };
  }
  const api = { SIT, INTENTS, PAD, analyse };
  if (typeof module !== 'undefined') { module.exports = api; return; }
  root.MWEXP = api;
  const U = window.MWUI, A = window.MWAI; const { S, DB, esc, $, toast } = U;
  const aiOn = () => A && A.client.provider !== 'none' && S.aiPrefs && S.aiPrefs.consent;
  const LOG = () => (S.extra.express = S.extra.express || []);
  const rec = (comp, kind, ev, unfamiliar, source, type) => { S.comp.push({ comp, t: Date.now(), kind, type: type || null, ctx: 'express:' + X.sit.id, evidence: ev || '', hinted: false, unfamiliar: !!unfamiliar, source: source || 'practice' }); DB.put('kv', 'competency', S.comp).catch(() => {}); };
  let X = null, timer = null;
  window.addEventListener('hashchange', () => { if (!/^#express/.test(location.hash) || (X && location.hash.startsWith('#express-') && location.hash !== '#express-' + X.sit.id)) { X = null; clearInterval(timer); clearTimeout(timer); } });
  const fresh = (avoid) => { const done = new Set(LOG().map(x => x.sit)); const pool = SIT.filter(s => s.id !== avoid); const nxt = pool.find(s => !done.has(s.id)) || pool[Math.floor(Math.random() * pool.length)]; return { sit: nxt, stage: 'ready', shown: Date.now(), firstKey: null, pauseStart: null, pause: 0, readiness: null, intent: null, text: '', cont: '', dump: '', core: '', interrupted: false, an: null, unfamiliar: !LOG().some(x => x.sit === nxt.id), spoken: false }; };
  U.routes.express = id => { if (id && SIT.some(s => s.id === id) && (!X || X.sit.id !== id)) { X = fresh(); X.sit = SIT.find(s => s.id === id); X.unfamiliar = !LOG().some(x => x.sit === id); } if (!X) X = fresh();
    const s = X.sit; const V = window.MWVOICE; const canSpeak = V && V.canDictate();
    let body = '';
    if (X.stage === 'ready') body = `<p class="step-q">Before you answer: have you formed a thought yet?</p><div class="row">${[['ready', 'Yes, I know my point'], ['moment', 'Not yet, I need a moment'], ['dontknow', 'I genuinely don’t know']].map(([v, n]) => `<button class="btn ${v === 'ready' ? 'primary' : ''}" data-action="xp-ready" data-v="${v}">${n}</button>`).join('')}</div><p class="muted small">All three are good starts. Taking a moment, or saying you don’t know, is never marked down.</p>`;
    else if (X.stage === 'pause') body = `<p class="timer" id="xpPause">0s</p><p class="muted">Take your time. Notice what you actually think. There’s no limit.</p><button class="btn primary" data-action="xp-ready" data-v="ready">I’m ready</button>`;
    else if (X.stage === 'intent') body = `<p class="step-q">What kind of contribution will this be?</p><div class="chip-pick">${INTENTS.map(([k, n]) => `<button class="choice" data-action="xp-intent" data-v="${k}">${esc(n)}</button>`).join('')}</div>`;
    else if (X.stage === 'respond') body = `${s.dump ? `<label class="field labelled"><span>First, jot down every thought that arrived, one per line. Then choose which to lead with.</span><textarea id="xpDump" rows="3">${esc(X.dump)}</textarea></label>` : ''}
      <label class="field labelled"><span>${X.readiness === 'dontknow' ? 'Respond honestly: what would you actually say?' : s.long ? 'Respond as you would out loud. Take as long as the answer needs.' : 'Respond as you would out loud.'}${canSpeak ? ' You can speak your answer: press Speak below the box.' : ' (Spoken practice needs dictation, which isn’t available here; writing gives more time to organise, so treat this as a step towards speaking.)'}</span><textarea id="xpText" class="ex-resp" rows="${s.long ? 6 : 3}">${esc(X.text)}</textarea></label>
      ${X.interrupted ? `<p class="interrupt">“Sorry, go on. What were you saying?”</p><label class="field labelled"><span>Pick up where you were</span><textarea id="xpCont" class="ex-resp" rows="3">${esc(X.cont)}</textarea></label>` : ''}
      <button class="btn primary" data-action="xp-done">Done</button>`;
    else if (X.stage === 'core') body = `<p class="step-q">In one sentence: what was your point?</p><textarea id="xpCore" rows="2">${esc(X.core)}</textarea><div class="row"><button class="btn primary" data-action="xp-core">See what happened</button><button class="btn ghost" data-action="xp-core" data-none="1">I didn’t have one yet</button></div>`;
    else if (X.stage === 'review') { const a = X.an;
      body = `<div class="ai-reflect"><p class="muted small">A ${X.spoken ? 'transcript of your spoken' : 'written'} response: ${a.words} words, ${a.sentences} sentence${a.sentences === 1 ? '' : 's'}${X.firstKey != null ? `, ${Math.round(X.firstKey / 1000)}s before you started` : ''}${X.pause ? `, after a ${X.pause}s pause you chose` : ''}. None of these is good or bad by itself.</p>
        <ul class="checks">${a.repeats.length ? `<li class="warn">Possible repetition: sentences ${a.repeats.map(([i, j]) => (i + 1) + ' and ' + (j + 1)).join(', ')} make much the same point.</li>` : '<li>No repeated sentences spotted.</li>'}
        ${a.padding.length ? `<li class="warn">Possible padding: ${a.padding.map(([p, n]) => `“${esc(p)}”${n > 1 ? ' ×' + n : ''}`).join(', ')}. Sometimes these are just how people talk.</li>` : ''}
        ${a.abandoned ? `<li class="warn">${a.abandoned} sentence${a.abandoned === 1 ? '' : 's'} may have been left unfinished.</li>` : ''}
        ${a.detours.length ? `<li class="warn">Possible detour: sentence${a.detours.length === 1 ? '' : 's'} ${a.detours.map(i => i + 1).join(', ')} share${a.detours.length === 1 ? 's' : ''} no key words with your point or the question. It may still be relevant; you decide.</li>` : ''}
        ${!a.addresses ? '<li class="warn">Your response shares no key words with what was said. Check that it answers it.</li>' : ''}
        <li class="muted small">Rules-based and transcript-only: these can’t hear tone, pace or pauses, and they can’t tell a useful aside from a detour.</li></ul>
        ${X.core ? `<p><strong>Your point:</strong> ${esc(X.core)}</p>` : '<p>You said you didn’t have a point yet. Noticing that is itself the skill of thought readiness.</p>'}</div>
        <div class="row">${aiOn() ? '<button class="btn" data-action="xp-ai">AI: what happened, and how to approach it</button>' : ''}<button class="btn primary" data-action="xp-next">Try a different situation</button><a class="btn ghost" href="#mentor" data-action="xp-mentor">Work on this with the mentor</a></div><div id="xpAi">${X.ai || ''}</div>`; }
    return `<header class="page-head"><a href="#convo" class="link">Conversation Lab</a><h1 class="display sm">Speak with intention</h1><p class="lede">Respond with a point you’ve actually formed, keep your direction, and find it again when you lose it. This is not about speaking less: explore, explain and tell stories as fully as the moment needs.</p></header>
      <section class="panel"><p class="lvl">${esc(s.kind)}</p><p class="q-prompt">${esc(s.prompt)}</p>${body}</section>`; };
  document.addEventListener('input', e => { if (!X) return; if (e.target.id === 'xpText') { X.text = e.target.value; if (X.firstKey == null) X.firstKey = Date.now() - X.shown; if (e.target.dataset.spoken === '1') X.spoken = true; } if (e.target.id === 'xpCont') X.cont = e.target.value; if (e.target.id === 'xpDump') X.dump = e.target.value; if (e.target.id === 'xpCore') X.core = e.target.value; });
  document.addEventListener('click', async e => { const t = e.target.closest('[data-action]'); if (!t || !t.dataset.action.startsWith('xp-') || !X) return; const a = t.dataset.action;
    if (a === 'xp-ready') { const v = t.dataset.v;
      if (v === 'moment') { X.stage = 'pause'; X.pauseStart = Date.now(); U.route(); clearInterval(timer); timer = setInterval(() => { const el = $('#xpPause'); if (el) el.textContent = Math.round((Date.now() - X.pauseStart) / 1000) + 's'; }, 250); return; }
      if (X.pauseStart) { X.pause = Math.round((Date.now() - X.pauseStart) / 1000); clearInterval(timer); }
      if (X.sit.minPause && !X.pause && v === 'ready') { toast(`This one asks you to think for at least ${X.sit.minPause} seconds first. Choose “I need a moment”.`); return; }
      X.readiness = X.readiness || (v === 'dontknow' ? 'dontknow' : X.pauseStart ? 'moment' : 'ready'); X.stage = 'intent'; U.route(); }
    if (a === 'xp-intent') { X.intent = t.dataset.v; X.stage = 'respond'; X.shown = Date.now(); U.route();
      if (X.sit.interrupt) { clearTimeout(timer); timer = setTimeout(() => { if (X && X.stage === 'respond' && !X.interrupted) { X.text = ($('#xpText') || {}).value || X.text; X.interrupted = true; U.route(); } }, X.sit.interrupt * 1000); } }
    if (a === 'xp-done') { X.text = ($('#xpText') || {}).value || X.text; if (!X.text.trim()) { toast('Respond first. “I don’t know” is a valid response.'); return; } if (X.interrupted && !(($('#xpCont') || {}).value || '').trim()) { toast('Pick up where you were.'); return; } X.cont = ($('#xpCont') || {}).value || ''; clearTimeout(timer); X.stage = X.sit.ramble ? 'core' : 'core'; U.route(); }
    if (a === 'xp-core') { X.core = t.dataset.none ? '' : (($('#xpCore') || {}).value || '').trim(); if (!t.dataset.none && !X.core) { toast('Write your point, or choose “I didn’t have one yet”.'); return; }
      const full = X.text + (X.cont ? '\n' + X.cont : ''); X.an = analyse(full, X.core, X.sit.prompt); X.stage = 'review';
      LOG().push({ t: Date.now(), sit: X.sit.id, readiness: X.readiness, pause: X.pause, intent: X.intent, spoken: X.spoken, words: X.an.words, flags: { repeats: X.an.repeats.length, padding: X.an.padding.length, abandoned: X.an.abandoned, detours: X.an.detours.length }, interrupted: X.interrupted, core: !!X.core }); DB.put('kv', 'extra', S.extra).catch(() => {});
      rec('readiness', 'attempt'); if (X.pause) rec('pausing', 'attempt'); if (X.intent && X.intent !== 'unsure') rec('intent', 'attempt'); if (X.interrupted) rec('recovery', 'attempt'); rec('organise', 'attempt'); if (X.spoken) rec('spontaneous', 'attempt'); U.route(); }
    if (a === 'xp-next') { const prev = X.sit.id; X = fresh(prev); U.route(); }
    if (a === 'xp-mentor') { const f = `Speaking with intention, situation: ${X.sit.kind}. My response: "${(X.text + ' ' + X.cont).slice(0, 400)}". My point, in one sentence: "${X.core || 'I didn’t have one yet'}".`; if (window.MWMUI) { S.mentor.turns = []; S.mentor.focus = 'Speaking with intention: diagnose what happened from her words, separate observation from hypothesis, ask if unsure, demonstrate, then give a new situation.'; S.mentor.turns.push({ who: 'you', text: f }); DB.put('kv', 'mentor', S.mentor).catch(() => {}); } }
    if (a === 'xp-ai') { const el = $('#xpAi'); el.innerHTML = '<p class="muted">Thinking…</p>'; const full = (X.text + (X.cont ? '\n[after being interrupted] ' + X.cont : '')).trim();
      const prompt = `You are helping someone develop intentional expression: forming a thought before speaking, organising it, noticing repetition and drift, recovering a lost point, and choosing what kind of contribution to make. This is NOT about speaking less: long, exploratory or story-like answers can be exactly right, and pauses, self-corrections and thinking aloud are not weaknesses.
Situation: ${X.sit.prompt}
Her readiness: ${X.readiness}${X.pause ? `, after a ${X.pause}-second pause she chose` : ''}. Intended contribution: ${X.intent}.
Her response${X.spoken ? ' (a speech transcript: you cannot judge tone, pace, pauses or delivery; do not claim to)' : ' (written)'}:
${full}
Her one-sentence point: ${X.core || '(she said she didn’t have one yet)'}

Distinguish these possible difficulties, which need different teaching: unformed (no thought yet), organise (a thought, not organised), competing (several thoughts), words (retrieval), silence (filling silence: only a hypothesis), lost (lost the point), padding (adding more from uncertainty), develop (a valid thought that needs developing), or none.
Rules: quote her exact words for every observation. Keep observations and hypotheses separate. If you cannot tell what happened, ask her up to two questions instead of guessing. Demonstrate one better version in her own voice (not a script), and explain the thinking behind it in one or two sentences. Suggest a next practice in a different situation. British English.
Reply with ONLY a JSON object: {"observed": [{"point": "...", "evidence": "her exact words"}], "hypotheses": [{"difficulty": "one id", "why": "..."}], "questions": ["... if unsure"], "demonstration": "...", "thinking": "...", "next_practice": "...", "competencies": [{"id": "readiness|organise|monitor|pausing|recovery|intent|clarity|spontaneous|expand", "result": "demonstrated|difficulty", "difficulty_type": "unformed|organise|competing|words|silence|lost|padding|develop or empty", "evidence": "her exact words"}]}${S.lang === 'xh' ? '\nLANGUAGE: write in natural isiXhosa; quote her words exactly.' : ''}`;
      try { const o = await A.askJSON(prompt, { max: 1600 }); const mine = (full + ' ' + X.core).toLowerCase().replace(/\s+/g, ' '); const ok = ev => { const k = String(ev || '').toLowerCase().replace(/\s+/g, ' ').trim(); return k.length >= 3 && mine.includes(k); };
        const obs = (o.observed || []).filter(x => x && ok(x.evidence)); const comps = (o.competencies || []).filter(x => x && window.MWCP.BY[x.id] && ok(x.evidence) && ['demonstrated', 'difficulty'].includes(x.result)); const removed = (o.observed || []).length - obs.length + (o.competencies || []).length - comps.length;
        comps.forEach(c => rec(c.id, c.result, c.evidence, X.unfamiliar, 'AI assessment', window.MWCP.DIFFICULTIES[c.difficulty_type] ? c.difficulty_type : null));
        const hyp = (o.hypotheses || []).filter(h => h && window.MWM.DIAG[h.difficulty]);
        X.ai = `<div class="ai-reflect">${obs.length ? `<h3>What happened</h3>${obs.map(x => `<p>${esc(x.point)} <span class="evq">“${esc(x.evidence)}”</span></p>`).join('')}` : ''}
          ${hyp.length ? `<h3>Possible reasons <span class="muted small">(hypotheses, not facts)</span></h3>${hyp.map(h => `<p>${esc(window.MWM.DIAG[h.difficulty])}: ${esc(h.why || '')}</p>`).join('')}` : ''}
          ${(o.questions || []).length ? `<h3>Questions to help work out what happened</h3>${o.questions.slice(0, 2).map(q => `<p>${esc(q)}</p>`).join('')}` : ''}
          ${o.demonstration ? `<h3>Another way it could go</h3><p class="serif">${esc(o.demonstration)}</p>${o.thinking ? `<p class="muted">${esc(o.thinking)}</p>` : ''}` : ''}${o.next_practice ? `<p><strong>Next:</strong> ${esc(o.next_practice)}</p>` : ''}
          <p class="muted small">AI-generated. ${removed ? removed + ' point(s) were removed because their evidence wasn’t in your words. ' : ''}${X.spoken ? 'Based on the transcript only: tone and delivery weren’t assessed.' : ''}</p></div>`; U.route(); }
      catch (er) { el.innerHTML = `<p class="warn">${esc(er.message)}</p>`; } }
  });
})(this);
