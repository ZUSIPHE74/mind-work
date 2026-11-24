/* MINDWORK — flexibility practice: recognise several possible directions, respond spontaneously, say one idea several ways. */
(function (root) {
  const SOCIAL = { acknowledge: 'Acknowledge the feeling', curious: 'Ask what happened', share: 'Share a related experience', support: 'Offer support', humour: 'Lighten it with humour', ask: 'Ask what they’d like (talk, help or distraction)', disagree: 'Gently offer another view', observe: 'Offer an observation' };
  const IDEA = { why_true: 'Why it might be true', why_false: 'Why it might be false', conditions: 'When it holds and when it doesn’t', alternative: 'Another explanation', contradiction: 'A tension or contradiction', related: 'A related idea', implication: 'What follows if it’s true', evidence: 'What evidence would settle it' };
  const POSSIBLE = [
    { id: 'week', kind: 'social', s: 'I’ve been having a difficult week.', contexts: { 'A close friend, over coffee': { humour: 'can help if they joke too; check the mood first', share: 'brief, then hand it back' }, 'A colleague you barely know, in a corridor': { humour: 'risky: you don’t know what happened', support: 'keep it light and optional' }, 'Your partner, late at night': { curious: 'only if they want to talk now', ask: 'often the kindest first move' } } },
    { id: 'quit', kind: 'social', s: 'I just quit my job. No plan yet.', contexts: { 'An old friend at a party': { curious: 'they likely want to tell the story', humour: 'fine if they sound relieved' }, 'Your manager, about another team member': { disagree: 'not your place yet', observe: 'careful: it isn’t your news' }, 'A sibling who often acts impulsively': { disagree: 'possible, but acknowledge first', ask: 'helps you avoid lecturing' } } },
    { id: 'money', kind: 'idea', s: 'Money makes people unhappy.', contexts: { 'A dinner-table debate': { evidence: 'research is mixed: income and wellbeing rise together up to a point', conditions: 'debt, comparison and what people give up for money matter' }, 'A friend who just got a promotion': { why_false: 'may land as criticism; read the mood', related: 'what they value about the job' } } },
    { id: 'books', kind: 'idea', s: 'Nobody reads books any more.', contexts: { 'A conversation with a librarian': { evidence: 'library and sales figures exist; ask what they see', why_false: 'audiobooks and e-books count too' }, 'A group of teenagers': { curious: 'what they do read', alternative: 'reading has moved formats, not vanished' } } },
    { id: 'city', kind: 'idea', s: 'This city is getting worse every year.', contexts: { 'A neighbour who has lived here 40 years': { curious: 'what they compare it with', why_true: 'acknowledge real changes they’ve seen' }, 'A newcomer who is excited to have moved here': { conditions: 'worse for whom, in what?', share: 'what you’ve noticed yourself' } } }];
  const QUICK = ['I think dogs are overrated.', 'Did you know octopuses have three hearts?', 'My sister just got engaged to someone she met a month ago.', 'I’ve never understood why people like the beach.', 'Honestly, I think meetings should be banned.', 'I tried meditation and it made me more anxious.', 'What would you do with a year off?', 'I think everyone is a bit of a hypocrite.'];
  const IDEAS = [{ id: 'interest', idea: 'Compound interest', jargon: ['principal', 'accrue', 'annual percentage', 'apr', 'capitalisation'] }, { id: 'opportunity', idea: 'Opportunity cost', jargon: ['marginal', 'utility', 'allocation', 'trade-off curve'] }, { id: 'confirmation', idea: 'Confirmation bias', jargon: ['cognitive', 'heuristic', 'schema', 'disconfirming'] }, { id: 'feedback', idea: 'A feedback loop', jargon: ['positive feedback', 'negative feedback', 'equilibrium', 'homeostasis'] }];
  const AUD = [['child', 'A ten-year-old'], ['sceptic', 'A sceptical colleague'], ['expert', 'Someone who knows the field'], ['story', 'As an analogy or short story']];
  const words = s => String(s || '').toLowerCase().match(/[a-z’']+/g) || [];
  const overlap = (a, b) => { const A = new Set(words(a).filter(w => w.length > 3)), B = new Set(words(b).filter(w => w.length > 3)); if (!A.size || !B.size) return 0; let n = 0; A.forEach(w => B.has(w) && n++); return n / Math.min(A.size, B.size); };
  /* rules for "say it differently": the versions must genuinely differ, the child version must be plain, the story must compare */
  function checkWays(idea, v) {
    const out = []; const keys = AUD.map(a => a[0]).filter(k => (v[k] || '').trim());
    for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) if (overlap(v[keys[i]], v[keys[j]]) > 0.6) out.push({ ok: false, text: `Your ${keys[i]} and ${keys[j]} versions share most of their words: they may be the same explanation reworded.` });
    if (v.child) { const sents = String(v.child).split(/[.!?]+/).filter(x => x.trim()); const avg = words(v.child).length / Math.max(1, sents.length); const jar = idea.jargon.filter(j => String(v.child).toLowerCase().includes(j)); out.push({ ok: avg <= 18 && !jar.length, text: jar.length ? `The child version uses jargon: ${jar.join(', ')}.` : avg > 18 ? `The child version averages ${Math.round(avg)} words a sentence; shorter would help.` : 'The child version uses short sentences and no jargon.' }); }
    if (v.story) { const cmp = /\b(like|as if|imagine|similar to|think of|just as|picture)\b/i.test(v.story); out.push({ ok: cmp, text: cmp ? 'The story version makes an explicit comparison.' : 'The story version doesn’t make an explicit comparison yet (“it’s like…”, “imagine…”).' }); }
    out.push({ ok: null, text: 'These checks look at wording only. Whether each version would actually work for its listener needs your judgement, or AI feedback.' });
    return out;
  }
  const api = { SOCIAL, IDEA, POSSIBLE, QUICK, IDEAS, AUD, checkWays, overlap };
  if (typeof module !== 'undefined') { module.exports = api; return; }
  root.MWFX = api;
  const U = window.MWUI, A = window.MWAI; const { S, DB, esc, $, toast } = U;
  const aiOn = () => A && A.client.provider !== 'none' && S.aiPrefs && S.aiPrefs.consent;
  const LOG = () => (S.extra.flex = S.extra.flex || []); const saveX = () => DB.put('kv', 'extra', S.extra).catch(() => {});
  const rec = (comp, kind, ctx, evidence) => { S.comp.push({ comp, t: Date.now(), kind, ctx, evidence: evidence || '', hinted: false, unfamiliar: kind !== 'attempt', source: kind === 'attempt' ? 'practice' : 'AI assessment' }); DB.put('kv', 'competency', S.comp).catch(() => {}); };
  async function aiFeedback(title, context, turns, ctx, el) {
    el.innerHTML = '<p class="muted">Thinking…</p>';
    try { const raw = await A.askJSON(A.feedbackPromptL({ kind: 'deep', title, turns, goals: [], context, lang: S.lang }), { max: 1500 }); const f = A.guardFeedback(raw, turns.filter(t => t.who === 'you').map(t => t.text));
      (f.competencies || []).filter(c => window.MWCP.BY[c.id]).forEach(c => S.comp.push({ comp: c.id, t: Date.now(), kind: c.result, type: c.difficulty_type || null, ctx, evidence: c.evidence, hinted: false, unfamiliar: true, source: 'AI feedback' })); DB.put('kv', 'competency', S.comp).catch(() => {});
      el.innerHTML = `<div class="ai-reflect"><p>${esc(f.summary)}</p>${f.strengths.map(x => `<p>✓ ${esc(x.point)} <span class="evq">“${esc(x.evidence)}”</span></p>`).join('')}${f.development.map(x => `<p>→ ${esc(x.point)} <span class="evq">“${esc(x.evidence)}”</span>${x.try ? ` <strong>Try:</strong> ${esc(x.try)}` : ''}</p>`).join('')}${f.next_challenge ? `<p><strong>Next challenge:</strong> ${esc(f.next_challenge)}</p>` : ''}<p class="muted small">AI-generated. Points without your words as evidence were removed (${f.removed.length}).</p></div>`; }
    catch (e) { el.innerHTML = `<p class="warn">${esc(e.message)}</p>`; } }

  // ───────── possible directions
  let P = null;
  window.addEventListener('hashchange', () => { if (location.hash !== '#flex-possible') P = null; if (location.hash !== '#flex-quick') { Q = null; clearInterval(qt); } if (location.hash !== '#flex-ways') W = null; });
  U.routes['flex-possible'] = () => { if (!P) { const it = POSSIBLE[Math.floor(Math.random() * POSSIBLE.length)]; const cs = Object.keys(it.contexts); P = { it, ctx: cs[Math.floor(Math.random() * cs.length)], stage: 1, own: '', had: [], pick: null, why: '', reply: '' }; }
    const D = P.it.kind === 'social' ? SOCIAL : IDEA; const notes = P.it.contexts[P.ctx];
    return `<header class="page-head"><a href="#convo" class="link">Conversation Lab</a><h1 class="display sm">Possible directions</h1><p class="lede">Every moment holds several directions. Notice them first, then choose what fits. There’s no single right answer, and seriousness or a question can be exactly right.</p></header>
      <section class="panel"><p class="q-prompt">“${esc(P.it.s)}”</p>
      ${P.stage === 1 ? `<label class="field labelled"><span>Before choosing anything: what directions could you take? List as many genuinely different ones as you notice, one per line.</span><textarea id="fxOwn" rows="5">${esc(P.own)}</textarea></label><button class="btn primary" data-action="fx-p1">See the map</button>` :
      `<p><strong>Your directions:</strong></p><pre class="own">${esc(P.own)}</pre><p class="muted small">Directions people often take. Tick the ones your list covered. Similar ideas reworded count once. <strong>Your ticks are self-assessment and aren’t counted as evidence.</strong>${aiOn() ? ' For an independent check, use the AI check below.' : ''}</p>${aiOn() ? `<div class="row"><button class="btn small ghost" data-action="fx-p-class">Have AI check which of your directions are genuinely distinct</button></div><div id="fxClass">${P.cls || ''}</div>` : ''}
        <ul class="dirs">${Object.entries(D).map(([k, n]) => `<li><label class="check"><input type="checkbox" data-fx-had="${k}" ${P.had.includes(k) ? 'checked' : ''}><span>${esc(n)}</span></label></li>`).join('')}</ul>
        <p><strong>Context:</strong> ${esc(P.ctx)}</p><div class="choices">${Object.entries(D).map(([k, n]) => `<button class="choice" aria-pressed="${P.pick === k}" data-fx-pick="${k}">${esc(n)}</button>`).join('')}</div>
        <label class="field labelled"><span>Why does that direction fit here?</span><textarea id="fxWhy" rows="2">${esc(P.why)}</textarea></label>
        <label class="field labelled"><span>What would you actually say?</span><textarea id="fxReply" rows="2">${esc(P.reply)}</textarea></label>
        ${P.stage === 3 ? `<div class="ai-reflect"><p><strong>Notes for this context</strong> (not answers):</p><ul>${Object.entries(notes).map(([k, n]) => `<li>${esc(D[k])}: ${esc(n)}</li>`).join('')}</ul><p class="muted small">You noticed ${P.had.length} of ${Object.keys(D).length} common directions. Noticing more isn’t the goal by itself; choosing well is.</p></div><div class="row">${aiOn() ? '<button class="btn ghost" data-action="fx-p-ai">AI feedback on your choice</button>' : ''}<button class="btn" data-action="fx-p-new">Another one</button></div><div id="fxAi"></div>` : '<button class="btn primary" data-action="fx-p2">Done</button>'}`}</section>`; };

  // ───────── quick responses
  let Q = null, qt = null;
  U.routes['flex-quick'] = () => { if (!Q) Q = { s: QUICK[Math.floor(Math.random() * QUICK.length)], stage: 0, start: 0, first: null, text: '', alt: '' };
    const L = LOG().filter(x => x.kind === 'quick' && x.first != null); const med = a => { const v = a.map(x => x.first).sort((p, q) => p - q); return v.length ? v[Math.floor(v.length / 2)] : null; };
    const trend = L.length >= 6 ? `Median time to start: first five ${(med(L.slice(0, 5)) / 1000).toFixed(1)}s, last five ${(med(L.slice(-5)) / 1000).toFixed(1)}s. This measures how quickly you begin, not how good the reply is.` : '';
    return `<header class="page-head"><a href="#convo" class="link">Conversation Lab</a><h1 class="display sm">Quick responses</h1><p class="lede">Someone says something unexpected. Reply within 20 seconds, as you would out loud. Then find a second direction.</p>${trend ? `<p class="muted small">${trend}</p>` : ''}</header>
      <section class="panel">${Q.stage === 0 ? '<button class="btn primary" data-action="fx-q-start">Start</button>' : `<p class="q-prompt">“${esc(Q.s)}”</p><p class="timer" id="fxT">${Q.stage === 1 ? '20s' : 'Done'}</p>
        <textarea id="fxQ" rows="2" ${Q.stage > 1 ? 'disabled' : ''}>${esc(Q.text)}</textarea>
        ${Q.stage === 1 ? '<button class="btn primary" data-action="fx-q-done">Send</button>' : `<label class="field labelled"><span>Now, with no time pressure: what’s a genuinely different direction you could have taken?</span><textarea id="fxAlt" rows="2">${esc(Q.alt)}</textarea></label><div class="row"><button class="btn" data-action="fx-q-save">Save</button>${aiOn() ? '<button class="btn ghost" data-action="fx-q-ai">AI feedback</button>' : ''}<button class="btn ghost" data-action="fx-q-new">Another</button></div><div id="fxAi"></div>`}`}</section>`; };

  // ───────── say it different ways
  let W = null;
  U.routes['flex-ways'] = () => { if (!W) W = { idea: IDEAS[Math.floor(Math.random() * IDEAS.length)], v: {}, checks: null };
    return `<header class="page-head"><a href="#area-speaking" class="link">Communicate</a><h1 class="display sm">Say it different ways</h1><p class="lede">One idea, four listeners. If the first explanation doesn’t land, flexible communicators find another way in.</p></header>
      <section class="panel"><p class="q-prompt">${esc(W.idea.idea)}</p>${AUD.map(([k, n]) => `<label class="field labelled"><span>${esc(n)}</span><textarea data-fxw="${k}" rows="3">${esc(W.v[k] || '')}</textarea></label>`).join('')}
        <div class="row"><button class="btn primary" data-action="fx-w-check">Check</button>${W.checks && aiOn() ? '<button class="btn ghost" data-action="fx-w-ai">AI feedback</button>' : ''}<button class="btn ghost" data-action="fx-w-new">Another idea</button></div>
        ${W.checks ? `<ul class="checks">${W.checks.map(c => `<li class="${c.ok === true ? 'ok' : c.ok === false ? 'warn' : 'muted small'}">${esc(c.text)}</li>`).join('')}</ul>` : ''}<div id="fxAi"></div></section>`; };

  document.addEventListener('input', e => { if (e.target.id === 'fxQ' && Q && Q.first == null) Q.first = Date.now() - Q.start; const k = e.target.dataset && e.target.dataset.fxw; if (k && W) W.v[k] = e.target.value; });
  document.addEventListener('change', e => { const h = e.target.dataset && e.target.dataset.fxHad; if (h && P) { P.had = e.target.checked ? P.had.concat([h]) : P.had.filter(x => x !== h); } });
  document.addEventListener('click', async e => {
    const pk = e.target.closest('[data-fx-pick]'); if (pk && P) { P.why = ($('#fxWhy') || {}).value || P.why; P.reply = ($('#fxReply') || {}).value || P.reply; P.pick = pk.dataset.fxPick; U.route(); return; }
    const t = e.target.closest('[data-action]'); if (!t || !t.dataset.action.startsWith('fx-')) return; const a = t.dataset.action;
    if (a === 'fx-p1') { P.own = $('#fxOwn').value; if (P.own.split('\n').filter(x => x.trim()).length < 2) { toast('List at least two directions first.'); return; } P.stage = 2; U.route(); }
    if (a === 'fx-p2') { P.why = $('#fxWhy').value; P.reply = $('#fxReply').value; if (!P.pick || !P.why.trim() || !P.reply.trim()) { toast('Choose a direction, say why, and write your reply.'); return; } P.stage = 3; LOG().push({ kind: 'possible', id: P.it.id, ctx: P.ctx, t: Date.now(), noticed: P.had.length, pick: P.pick }); saveX(); ['perspective', 'social', 'interpretive'].forEach(c => rec(c, 'attempt', 'flex:possible')); U.route(); }
    if (a === 'fx-p-new') { P = null; U.route(); }
    if (a === 'fx-p-class') { const lines = P.own.split('\n').map(x => x.trim()).filter(Boolean); const D = P.it.kind === 'social' ? SOCIAL : IDEA; const el = $('#fxClass'); el.innerHTML = '<p class="muted">Checking…</p>';
      const prompt = `Someone was asked to list different directions they could take in response to: "${P.it.s}" (context: ${P.ctx}).
Their list, one per line:
${lines.map((l, i) => (i + 1) + '. ' + l).join('\n')}

For EACH line, judge independently: which kind of direction it is (one of: ${Object.keys(D).join(', ')}, or "other" if it's a valid direction not in that list), whether it is relevant and plausible here, and whether it is really the same direction as an earlier line reworded. Do not reward length or number for its own sake. A short line can be a perfectly good direction.
Reply with ONLY a JSON object: {"items": [{"line": "the exact line", "type": "...", "relevant": true, "duplicate_of": null or the earlier line number, "note": "a few words"}], "summary": "one sentence"}`;
      try { const o = await A.askJSON(prompt, { max: 1200 }); const items = (Array.isArray(o.items) ? o.items : []).filter(x => x && lines.includes(String(x.line || '').trim()));
        const distinct = items.filter(x => x.relevant && !x.duplicate_of); P.cls = `<ul class="checks">${items.map(x => `<li class="${x.relevant && !x.duplicate_of ? 'ok' : 'warn'}">“${esc(x.line)}”: ${esc(D[x.type] || (x.type === 'other' ? 'another valid direction' : x.type))}${x.duplicate_of ? ' (same as line ' + esc(x.duplicate_of) + ')' : ''}${x.relevant ? '' : ' (not relevant here)'}${x.note ? ' · ' + esc(x.note) : ''}</li>`).join('')}</ul><p class="muted small">${esc(o.summary || '')} ${distinct.length} genuinely distinct, relevant direction${distinct.length === 1 ? '' : 's'}. AI judgement; it can be wrong.${(o.items || []).length > items.length ? ` ${(o.items || []).length - items.length} item(s) the AI returned didn’t match anything you wrote and were ignored.` : ''}</p>`;
        if (distinct.length >= 3) rec('perspective', 'demonstrated', 'flex:possible:' + P.it.id, distinct.map(x => x.line).join(' / ').slice(0, 160)); else rec('perspective', 'difficulty', 'flex:possible:' + P.it.id, lines[0]);
        if (distinct.length < 3) { const last = S.comp[S.comp.length - 1]; last.type = 'generate'; DB.put('kv', 'competency', S.comp).catch(() => {}); }
        el.innerHTML = P.cls; }
      catch (er) { el.innerHTML = `<p class="warn">${esc(er.message)}</p>`; } }
    if (a === 'fx-p-ai') aiFeedback('Possible directions: did she notice genuinely different directions, and did her choice and reply fit the context?', `Statement: "${P.it.s}". Context: ${P.ctx}.`, [{ who: 'them', text: P.it.s }, { who: 'you', text: 'Directions I noticed: ' + P.own }, { who: 'you', text: 'I chose: ' + (P.it.kind === 'social' ? SOCIAL : IDEA)[P.pick] + ', because ' + P.why }, { who: 'you', text: P.reply }], 'flex:possible', $('#fxAi'));
    if (a === 'fx-q-start') { Q.stage = 1; Q.start = Date.now(); U.route(); setTimeout(() => { const x = $('#fxQ'); if (x) x.focus(); }); clearInterval(qt); qt = setInterval(() => { const left = 20 - Math.round((Date.now() - Q.start) / 1000); const el = $('#fxT'); if (el) el.textContent = Math.max(0, left) + 's'; if (left <= 0) { clearInterval(qt); Q.text = ($('#fxQ') || {}).value || ''; Q.stage = 2; U.route(); } }, 250); }
    if (a === 'fx-q-done') { clearInterval(qt); Q.text = $('#fxQ').value; Q.stage = 2; U.route(); }
    if (a === 'fx-q-save' || a === 'fx-q-ai') { Q.alt = ($('#fxAlt') || {}).value || ''; if (!Q.saved) { LOG().push({ kind: 'quick', t: Date.now(), first: Q.first, answered: !!Q.text.trim(), alt: !!Q.alt.trim() }); saveX(); rec('spontaneous', 'attempt', 'flex:quick'); Q.saved = true; }
      if (a === 'fx-q-ai') aiFeedback('Quick response: how did she handle an unexpected remark with no preparation, and was her second direction genuinely different?', 'Someone said: "' + Q.s + '"', [{ who: 'them', text: Q.s }, { who: 'you', text: Q.text || '(no reply in time)' }, { who: 'you', text: 'Another direction: ' + Q.alt }], 'flex:quick', $('#fxAi')); else toast('Saved.'); }
    if (a === 'fx-q-new') { Q = null; U.route(); }
    if (a === 'fx-w-check') { if (Object.values(W.v).filter(x => x.trim()).length < 2) { toast('Write at least two versions.'); return; } W.checks = checkWays(W.idea, W.v); LOG().push({ kind: 'ways', id: W.idea.id, t: Date.now(), versions: Object.keys(W.v).length }); saveX(); ['expressive', 'explain'].forEach(c => rec(c, 'attempt', 'flex:ways')); U.route(); }
    if (a === 'fx-w-ai') aiFeedback('Say it different ways: is each version genuinely different and suited to its listener?', 'Idea: ' + W.idea.idea, AUD.filter(([k]) => W.v[k]).flatMap(([k, n]) => [{ who: 'them', text: 'For ' + n + ':' }, { who: 'you', text: W.v[k] }]), 'flex:ways', $('#fxAi'));
    if (a === 'fx-w-new') { W = null; U.route(); }
  });
})(this);
