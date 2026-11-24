/* MINDWORK — storytelling, longer conversation analysis, and annotated replays of AI conversations. */
(function (root) {
  const DIALOGUES = [
    { id: 'move', title: 'Two friends after a move', lines: [['Thandi', 'So, how’s the new flat?'], ['Lerato', 'Fine. Bigger.'], ['Thandi', 'Nice! Did you get the balcony one in the end?'], ['Lerato', 'Yeah. I don’t really know anyone around there yet, though.'], ['Thandi', 'Balconies are the best. We had one in Durban, I used to grow tomatoes.'], ['Lerato', 'Mm.'], ['Thandi', 'You should try herbs, they’re easy.'], ['Lerato', 'Maybe.'], ['Thandi', 'Are you okay? You seem a bit quiet.'], ['Lerato', 'It’s just lonely. I didn’t expect it to be.'], ['Thandi', 'That makes sense. New place, no one nearby. Want to come for supper on Thursday?'], ['Lerato', 'I’d really like that.']],
      notes: { 3: 'A cue: she mentions not knowing anyone.', 4: 'Missed cue: the reply goes to balconies and Thandi’s own story.', 6: 'Advice keeps the topic on plants.', 8: 'Turning point: Thandi notices the short answers and checks.', 10: 'Acknowledges the feeling, then offers something concrete.' },
      qs: [['Which line holds the first cue that something is wrong?', 3], ['Which line misses that cue?', 4], ['Which line changes the direction of the conversation?', 8]] },
    { id: 'plan', title: 'A team deciding on a launch', lines: [['Kagiso', 'We need a launch date. I’m thinking the 3rd.'], ['Naledi', 'The 3rd is tight. Testing won’t be done.'], ['Kagiso', 'Testing always says that.'], ['Naledi', 'Last time we skipped it, we had two weeks of bug fixes.'], ['Sam', 'What if we launch to a small group on the 3rd and everyone on the 17th?'], ['Kagiso', 'Hm. That could work.'], ['Naledi', 'I can live with that if testing signs off the small launch.'], ['Kagiso', 'Fine. Who tells marketing?'], ['Sam', 'I will, by Friday.'], ['Naledi', 'And I’ll send the test plan tomorrow.'], ['Kagiso', 'Good. So: small launch on the 3rd, full on the 17th.'], ['Sam', 'Agreed.']],
      notes: { 2: 'Dismissal: the concern is waved away instead of answered.', 3: 'Evidence replaces assertion.', 4: 'Reframe: an option serving both concerns.', 6: 'A condition attached to agreement.', 10: 'Summary of the decision closes the loop.' },
      qs: [['Which line dismisses a concern instead of answering it?', 2], ['Which line introduces an option that serves both sides?', 4], ['Which line closes the loop with a summary?', 10]] }];
  const STORY = ['A time you changed your mind about someone', 'A small moment that turned out to matter', 'Something that went wrong and what it taught you', 'The best meal you ever had'];
  /* wording hints only: they cannot judge whether the story works */
  function storyHints(text) { const t = String(text || '').toLowerCase(); return [
    ['A setting (when or where)', /\b(when|last|ago|one day|in \d{4}|at the|on a|that morning|that night|years)\b/.test(t)],
    ['A turn (something changed)', /\b(but|then|suddenly|until|that's when|that’s when|instead|realised|realized)\b/.test(t)],
    ['What it meant to you', /\b(learn|learnt|learned|realis|realiz|meant|since then|now i|taught|changed)\b/.test(t)]]; }
  const api = { DIALOGUES, STORY, storyHints };
  if (typeof module !== 'undefined') { module.exports = api; return; }
  root.MWC2 = api;
  const U = window.MWUI, A = window.MWAI; const { S, DB, esc, $, toast } = U;
  const aiOn = () => A && A.client.provider !== 'none' && S.aiPrefs && S.aiPrefs.consent;
  const rec = (comp, kind, ctx, evidence, source) => { S.comp.push({ comp, t: Date.now(), kind, ctx, evidence: evidence || '', hinted: false, unfamiliar: false, source: source || 'practice' }); DB.put('kv', 'competency', S.comp).catch(() => {}); };

  // ───────── conversation analysis
  let AN = null;
  // leaving and coming back starts these fresh; re-renders while working keep answers
  window.addEventListener('hashchange', () => { if (AN && location.hash !== '#analyse-' + AN.id) AN = null; if (ST && location.hash !== '#story') ST = null; });
  U.routes.analyse = id => { const d = DIALOGUES.find(x => x.id === id);
    if (!d) return `<header class="page-head"><a href="#convo" class="link">Conversation Lab</a><h1 class="display sm">Analyse a conversation</h1><p class="lede">Longer conversations, line by line: where cues appear, where they’re missed, and what changes the direction.</p></header><section class="pz-list">${DIALOGUES.map(x => `<a class="pz-card" href="#analyse-${x.id}"><strong>${esc(x.title)}</strong><span class="muted small">${x.lines.length} lines · ${x.qs.length} questions</span></a>`).join('')}</section>`;
    if (!AN || AN.id !== id) AN = { id, ans: {}, done: false };
    return `<header class="page-head"><a href="#analyse" class="link">Analyse a conversation</a><h1 class="display sm">${esc(d.title)}</h1></header>
      <section class="panel"><ol class="dialogue">${d.lines.map(([who, l], k) => `<li value="${k + 1}"><strong>${esc(who)}:</strong> ${esc(l)}${AN.done && d.notes[k] ? `<span class="note">${esc(d.notes[k])}</span>` : ''}</li>`).join('')}</ol>
        ${d.qs.map(([q], k) => `<label class="sel">${esc(q)} <select data-an="${k}"><option value="">Line…</option>${d.lines.map((_, j) => `<option value="${j}" ${AN.ans[k] === String(j) ? 'selected' : ''}>${j + 1}</option>`).join('')}</select></label>`).join('')}
        ${AN.done ? `<p class="res">${d.qs.filter(([, a], k) => +AN.ans[k] === a).length} of ${d.qs.length} matched. The notes above are one careful reading; if you see it differently, that’s worth thinking through.</p>` : '<button class="btn primary" data-action="an-check">Check</button>'}</section>`; };

  // ───────── storytelling
  let ST = null;
  U.routes.story = () => { if (!ST) ST = { topic: STORY[Math.floor(Math.random() * STORY.length)], text: '', hints: null };
    return `<header class="page-head"><a href="#area-speaking" class="link">Public Speaking</a><h1 class="display sm">Tell a story</h1><p class="lede">A short true story, as you’d tell it to friends. Stories carry ideas further than explanations, when they have a shape.</p></header>
      <section class="panel"><p class="q-prompt">${esc(ST.topic)}</p><div class="rec-box" data-voice-record="story"></div><label class="field labelled"><span>Write it, or write the outline after telling it aloud</span><textarea id="stText" rows="6">${esc(ST.text)}</textarea></label>
        <div class="row"><button class="btn primary" data-action="st-check">Check the shape</button>${ST.hints && aiOn() ? '<button class="btn ghost" data-action="st-ai">AI feedback</button>' : ''}<button class="btn ghost" data-action="st-new">Another topic</button></div>
        ${ST.hints ? `<ul class="checks">${ST.hints.map(([n, ok]) => `<li class="${ok ? 'ok' : 'warn'}">${ok ? '✓' : '·'} ${esc(n)}</li>`).join('')}<li class="muted small">Wording hints only. Whether the story lands needs a listener, your judgement, or AI feedback.</li></ul>` : ''}<div id="stAi"></div></section>`; };

  // ───────── annotated replay of AI conversations
  const aiOrig = U.routes.ai; U.routes.ai = id => { const out = aiOrig(id); const s = (S.ai || []).find(x => x.id === id); if (!s || !s.feedback || typeof out !== 'string') return out;
    const f = s.feedback; const marks = [].concat((f.strengths || []).map(x => ['s', x.evidence, x.point]), (f.development || []).map(x => ['d', x.evidence, x.point]), (f.competencies || []).map(x => [x.result === 'demonstrated' ? 's' : 'd', x.evidence, (window.MWCP.BY[x.id] || { name: x.id }).name + (x.result === 'demonstrated' ? ': shown' : ': difficult')]));
    const yours = s.turns.map((t, i) => [t, i]).filter(([t]) => t.who === 'you');
    const rows = yours.map(([t, i]) => { let h = esc(t.text); const notes = []; marks.forEach(([k, ev, why]) => { const e = esc(ev || ''); if (e && h.includes(e)) { h = h.replace(e, `<mark class="m-${k}">${e}</mark>`); notes.push(`<li class="m-${k}">${esc(why)}</li>`); } }); const prev = s.turns[i - 1];
      return `<li>${prev ? `<span class="muted small">${esc(prev.speaker || 'Them')}: ${esc(prev.text.slice(0, 120))}</span>` : ''}<p>${h}</p>${notes.length ? `<ul class="anno">${notes.join('')}</ul>` : ''}</li>`; });
    return out + `<section class="panel"><h2>Annotated replay</h2><p class="muted small">Your turns, with the evidence the feedback quoted highlighted: <mark class="m-s">what worked or was shown</mark> and <mark class="m-d">what to develop</mark>. Turns without highlights weren’t commented on.</p><ol class="replay">${rows.join('')}</ol></section>`; };

  document.addEventListener('change', e => { if (e.target.dataset && e.target.dataset.an != null && AN) AN.ans[e.target.dataset.an] = e.target.value; });
  document.addEventListener('click', async e => { const t = e.target.closest('[data-action]'); if (!t) return; const a = t.dataset.action;
    if (a === 'an-check') { const d = DIALOGUES.find(x => x.id === AN.id); if (d.qs.some((_, k) => AN.ans[k] == null || AN.ans[k] === '')) { toast('Answer each question first.'); return; } AN.done = true; const right = d.qs.filter(([, x], k) => +AN.ans[k] === x).length; (S.extra.analyses = S.extra.analyses || []).push({ id: d.id, t: Date.now(), right, n: d.qs.length }); DB.put('kv', 'extra', S.extra).catch(() => {}); rec('cues', right === d.qs.length ? 'demonstrated' : 'attempt', 'analyse:' + d.id, right === d.qs.length ? 'Identified every cue and turning point in “' + d.title + '”' : '', 'rules'); U.route(); }
    if (a === 'st-check') { ST.text = $('#stText').value; if (ST.text.trim().split(/\s+/).length < 25) { toast('Write at least a few sentences.'); return; } ST.hints = storyHints(ST.text); (S.extra.stories = S.extra.stories || []).push({ t: Date.now(), topic: ST.topic, words: ST.text.split(/\s+/).length }); DB.put('kv', 'extra', S.extra).catch(() => {}); ['explain', 'disclosure'].forEach(c => rec(c, 'attempt', 'story')); U.route(); }
    if (a === 'st-new') { ST = null; U.route(); }
    if (a === 'st-ai') { const el = $('#stAi'); el.innerHTML = '<p class="muted">Thinking…</p>'; const turns = [{ who: 'them', text: 'Tell a short true story: ' + ST.topic }, { who: 'you', text: ST.text }];
      try { const raw = await A.askJSON(A.feedbackPromptL({ kind: 'deep', title: 'Storytelling: does the story have a shape (setting, tension, turn, meaning), and would a listener stay with it? Don’t reward length.', turns, goals: [], context: ST.topic, lang: S.lang }), { max: 1400 }); const f = A.guardFeedback(raw, [ST.text]);
        (f.competencies || []).filter(c => window.MWCP.BY[c.id]).forEach(c => S.comp.push({ comp: c.id, t: Date.now(), kind: c.result, type: c.difficulty_type || null, ctx: 'story', evidence: c.evidence, hinted: false, unfamiliar: true, source: 'AI feedback' })); DB.put('kv', 'competency', S.comp).catch(() => {});
        el.innerHTML = `<div class="ai-reflect"><p>${esc(f.summary)}</p>${f.strengths.map(x => `<p>✓ ${esc(x.point)} <span class="evq">“${esc(x.evidence)}”</span></p>`).join('')}${f.development.map(x => `<p>→ ${esc(x.point)} <span class="evq">“${esc(x.evidence)}”</span>${x.try ? ` <strong>Try:</strong> ${esc(x.try)}` : ''}</p>`).join('')}<p class="muted small">AI-generated; points without your words as evidence were removed (${f.removed.length}).</p></div>`; }
      catch (er) { el.innerHTML = `<p class="warn">${esc(er.message)}</p>`; } } });
})(this);
