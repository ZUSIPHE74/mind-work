/* MINDWORK — remaining Think/Learn/Communicate features built on existing engines. */
(function () {
  const U = window.MWUI, E = window.MW; const { S, DB, esc, $, toast, glyph } = U;
  S.extra = { kia: [], approaches: [], memStart: null };
  U.onLoad.push(async () => { S.extra = Object.assign(S.extra, (await DB.get('kv', 'extra')) || {}); });
  const save = () => DB.put('kv', 'extra', S.extra).catch(() => {});
  const aiOn = () => window.MWAI && window.MWAI.client.provider !== 'none' && S.aiPrefs && S.aiPrefs.consent;
  const wrap = (name, fn) => { const o = U.routes[name], after = o.after; U.routes[name] = (...a) => { const out = o(...a); return typeof out === 'string' ? fn(out, ...a) : out; }; U.routes[name].after = after; };
  const card = (href, name, text, meta, gl, action) => `<a class="env-card" href="${href}" ${action ? `data-action="${action}"` : ''} style="--c:var(--purple)">${glyph(gl, 30)}<strong>${esc(name)}</strong><span>${esc(text)}</span>${meta ? `<span class="env-meta">${meta}</span>` : ''}</a>`;
  const played = () => [...new Set(S.attempts.filter(a => a.status !== 'skipped').map(a => a.game))];

  // ───────── Think and Learn entry points
  wrap('think', out => out.replace('<section class="env-grid">', `<section class="env-grid">
    ${card('#bosses', 'Boss challenges', 'Harder, no-hint tests across Think, Learn and Communicate.', '', 'burst')}
    ${card('#express', 'Speak with intention', 'Thinking while speaking: readiness, organisation and recovery.', '', 'waves')}${card('#draw', 'Drawing challenges', 'Turn an explanation into a diagram.', '', 'quill')}${card('#approaches', 'Multiple Approaches', 'One problem, worked through several thinking methods: pick the one that helps most.', '', 'prism')}
    ${card('#play', 'Challenge mode', 'One level up, no hints.', '', 'stack', 'ex-nohints')}
    ${card('#play', 'Transfer challenge', 'A skill you’ve practised, in exercises you haven’t met.', played().length ? '' : 'Practise a few exercises first', 'loop', 'ex-transfer')}`));
  wrap('learn', out => out.replace('<section class="env-grid">', `<section class="env-grid">${card('#sequence', 'Study sequence', 'One concept from your books: recall it, use it, explain it, discuss it.', '', 'loop')}${card('#kia', 'Knowledge in Action', 'Use concepts from your books on problems the books never discuss.', (S.books || []).length ? '' : 'Needs a book with definitions', 'book')}`));

  // ───────── bosses
  const BOSSES = [
    { id: 'critical', dest: 'Think', name: 'The Critical Thinker', text: 'Four critical-thinking exercises at level 3 or above, no hints.' },
    { id: 'perspective', dest: 'Think', name: 'The Perspective Challenge', text: 'Four perspective exercises at level 3 or above, no hints.' },
    { id: 'realworld', dest: 'Think', name: 'The Real-World Challenge', text: 'An integrated challenge, a causal chain and possibility generation, no hints.' },
    { id: 'memory', dest: 'Learn', name: 'The Memory Trial', text: 'A full review of everything due across your books. Defeated at 80% or more of at least ten answers.' },
    { id: 'comm', dest: 'Communicate', name: 'The Communicator', text: 'Three role-plays from different areas, without coaching. Defeated when every one shows at least 75% of its skills.' }];
  function bossResult(b) {
    if (b.id === 'memory') { if (!S.extra.memStart) return null; const L = (S.slog || []).filter(l => l.t >= S.extra.memStart && l.final); if (!L.length) return null; const r = L.filter(l => l.final === 'correct').length / L.length; return { done: L.length >= 10, beat: L.length >= 10 && r >= 0.8, text: `${L.length} answers, ${Math.round(r * 100)}% correct` }; }
    if (b.id === 'comm') { const ids = [...new Set((S.clog || []).filter(e => /^boss-comm/.test(e.sessionId || '')).map(e => e.sessionId))]; const last = ids.pop(); if (!last) return null; const L = S.clog.filter(e => e.sessionId === last && e.done); return { done: L.length >= 3, beat: L.length >= 3 && L.every(e => e.score >= 0.75), text: L.map(e => Math.round(e.score * 100) + '%').join(' · ') }; }
    const sess = Object.values(S.sessions).filter(s => s.boss === b.id).sort((x, y) => y.createdAt - x.createdAt)[0]; if (!sess) return null;
    const A = S.attempts.filter(a => a.sessionId === sess.id && a.status !== 'skipped'); const first = A.map(a => ((a.versions || [])[0] || a).overall || 0);
    return { done: A.length >= sess.items.length, beat: A.length >= sess.items.length && first.every(x => x >= 2.8), text: first.map(x => x.toFixed(1)).join(' · ') + ' (first answers, out of 4)' };
  }
  U.routes.bosses = () => `<header class="page-head"><a href="#think" class="link">Think</a><h1 class="display sm">Boss challenges</h1><p class="lede">Harder tests that combine what you’ve practised. They’re judged on first answers, without hints or coaching. Nothing is locked; try whenever you like.</p></header>
    <section class="pz-list">${BOSSES.map(b => { const r = bossResult(b); const can = b.id !== 'memory' || Object.keys(S.cards || {}).length;
      return `<div class="pz-card boss-card"><span class="lvl">${b.dest}</span><strong>${esc(b.name)}</strong><span class="muted small">${esc(b.text)}</span><span class="pz-status">${r ? (r.beat ? '✓ Defeated · ' : r.done ? 'Not yet · ' : 'In progress · ') + esc(r.text) : 'Not attempted'}</span>
        ${b.id === 'memory' ? (can ? `<button class="btn small" data-action="review" data-size="40" data-boss="memory">Start</button>` : '<span class="muted small">Study a chapter first.</span>') : `<button class="btn small" data-action="ex-boss" data-id="${b.id}">Start</button>`}</div>`; }).join('')}</section>`;

  // ───────── Multiple Approaches
  const METHODS = [['components', 'Analyse its components', 'analytical', 'Break it into parts. What are they, and how do they interact?'], ['assumptions', 'Challenge its assumptions', 'critical', 'What is being taken for granted? Which assumption, if wrong, changes everything?'], ['creative', 'Develop creative solutions', 'creative', 'Generate options nobody has tried. Combine unrelated ideas.'], ['logic', 'Examine the logical implications', 'logical', 'If the obvious solution is adopted, what must follow? Is anything contradictory?'], ['longterm', 'Consider long-term consequences', 'strategic', 'Where does each option lead in five years? What trade-offs appear?'], ['system', 'Identify the wider system', 'systems', 'Who and what else is connected? Where are the feedback loops?'], ['reframe', 'Reframe it from another perspective', 'lateral', 'How would a completely different person describe the problem?']];
  const PROBLEMS = ['A town’s main hospital has waiting times of over six hours in its emergency department.', 'Many young adults in a city can’t afford to move out of their parents’ homes.', 'A school finds that most students stop reading for pleasure by the age of fourteen.', 'A small business loses half its customers within a year of a large chain opening nearby.'];
  let AP = null;
  U.routes.approaches = () => { if (!AP) AP = { p: Math.floor(Math.random() * PROBLEMS.length), ans: {}, saved: false };
    return `<header class="page-head"><a href="#think" class="link">Think</a><h1 class="display sm">Multiple Approaches</h1><p class="lede">One problem, several ways of thinking about it. Use at least three methods, then say which helped most. Cognitive flexibility is choosing the method that fits.</p></header>
      <section class="panel"><p class="q-prompt">${esc(PROBLEMS[AP.p])}</p>${METHODS.map(([k, n, , help]) => `<label class="field labelled"><span>${esc(n)} <span class="muted small">${esc(help)}</span></span><textarea data-ap="${k}" rows="2">${esc(AP.ans[k] || '')}</textarea></label>`).join('')}
        <label class="field labelled"><span>Which method helped most here, and why?</span><textarea data-ap="best" rows="2">${esc(AP.ans.best || '')}</textarea></label>
        <div class="row">${AP.saved ? '<span class="ok">Saved.</span>' : '<button class="btn primary" data-action="ex-ap-save">Save</button>'}${AP.saved && aiOn() ? '<button class="btn ghost" data-action="ex-ap-ai">Get AI feedback on how you used each method</button>' : ''}<button class="btn ghost" data-action="ex-ap-new">Another problem</button></div><div id="apAi">${AP.ai || ''}</div></section>`; };

  // ───────── Knowledge in Action
  let KA = null;
  function kiaPool() { const Q = window.MWS; const out = []; (S.books || []).forEach(b => { try { Q.findDefinitions(b).forEach(d => out.push(Object.assign({ book: b.title, bookId: b.id }, d))); } catch (e) { } }); return out.filter(d => d.term && d.def); }
  U.routes.kia = () => { const pool = kiaPool();
    if (pool.length < 2) return `<header class="page-head"><a href="#learn" class="link">Learn</a><h1 class="display sm">Knowledge in Action</h1></header><section class="panel"><p>This needs books in the Study Lab with at least two concepts that the books define. Add a non-fiction book, or try the sample book.</p><a class="btn" href="#study">Open the Study Lab</a></section>`;
    if (!KA) { const R = E.rng('kia' + Date.now()); const pick = pool.slice().sort(() => R() - 0.5).slice(0, 4); const sc = window.MWSD.transferScenarios(pick[0], 1, Date.now())[0]; KA = { opts: pick, scen: sc, ans: {}, saved: false }; }
    const ch = KA.ans.concept != null ? KA.opts[KA.ans.concept] : null;
    return `<header class="page-head"><a href="#learn" class="link">Learn</a><h1 class="display sm">Knowledge in Action</h1><p class="lede">A situation your books never discuss. Choose a concept from what you’ve studied and use it. There isn’t one right concept; your reasoning is what counts.</p></header>
      <section class="panel"><p class="q-prompt">${esc(KA.scen ? KA.scen.text : '')}</p>
        <label class="field labelled"><span>1. What is the real problem here?</span><textarea data-ka="problem" rows="2">${esc(KA.ans.problem || '')}</textarea></label>
        <div class="gstep"><p class="step-q">2. Which concept from your books helps most?</p><div class="choices">${KA.opts.map((d, i) => `<button class="choice" aria-pressed="${KA.ans.concept === i}" data-kac="${i}">${esc(d.term)} <span class="muted small">· ${esc(d.book)}</span></button>`).join('')}</div></div>
        <label class="field labelled"><span>3. How does it apply? Use its defining features, not just its name.</span><textarea data-ka="apply" rows="3">${esc(KA.ans.apply || '')}</textarea></label>
        <label class="field labelled"><span>4. Where does it stop applying, or what doesn’t it explain?</span><textarea data-ka="limit" rows="2">${esc(KA.ans.limit || '')}</textarea></label>
        <label class="field labelled"><span>5. Your conclusion</span><textarea data-ka="conclusion" rows="2">${esc(KA.ans.conclusion || '')}</textarea></label>
        <div class="row">${KA.saved ? '<span class="ok">Saved.</span>' : '<button class="btn primary" data-action="ex-ka-save">Compare with the book</button>'}<button class="btn ghost" data-action="ex-ka-new">Another situation</button></div>
        ${KA.saved && ch ? `<div class="ai-reflect"><p><strong>What ${esc(ch.book)} says:</strong> ${esc(ch.sentence || ch.def)}</p><fieldset class="useful"><legend>Check honestly</legend>${['I used the concept’s defining features, not just its name', 'I named a genuine limitation', 'My conclusion follows from what I wrote'].map(x => `<label class="check opt"><input type="checkbox"><span>${x}</span></label>`).join('')}</fieldset></div>` : ''}</section>`; };

  // ───────── Puzzle Arena: collections and this week’s puzzles
  wrap('arena', (out, cat) => { if (cat || !window.MWPZ) return out; const Z = window.MWPZ; const sound = new Set((S.plog || []).filter(e => e.outcome === 'sound').map(e => e.pid));
    const wk = Math.floor((Date.now() / 864e5 + 3) / 7); const R = E.rng('week' + wk); const unsolved = Z.PUZZLES.filter(p => !sound.has(p.id)); const week = (unsolved.length >= 3 ? unsolved : Z.PUZZLES).slice().sort(() => R() - 0.5).slice(0, 3);
    return out.replace('<section class="cat-grid big">', `<section class="panel"><h2>This week’s puzzles</h2><p class="muted small">${week.filter(p => sound.has(p.id)).length} of 3 solved with sound reasoning.</p><ul class="rp-list">${week.map(p => `<li><span>${esc(p.title)} <span class="muted small">· ${esc(Z.CAT[p.cat].name)}</span></span><a class="btn small" href="#puzzle-${p.id}">${sound.has(p.id) ? '✓ Again' : 'Solve'}</a></li>`).join('')}</ul>
      <p class="muted small">Collections complete: ${Z.CATS.filter(c => Z.PUZZLES.filter(p => p.cat === c.id).every(p => sound.has(p.id))).map(c => esc(c.name)).join(', ') || 'none yet'}. A collection completes when every puzzle in a category is solved with sound reasoning.</p></section><section class="cat-grid big">`); });

  // ───────── Skill tree in Records (no locks: branches show evidence stages)
  wrap('records', out => { const A = window.MWA, C = window.MWC, CH = window.MWCH; if (!A) return out;
    const ov = A.overview({ attempts: S.attempts, sessions: S.sessions, slog: S.slog || [], journal: S.journal || [], puzzles: S.plog || [], obs: S.olog || [], ai: S.ai || [] });
    const dots = (n, max) => `<span class="tdots">${'●'.repeat(n)}${'○'.repeat(max - n)}</span>`;
    const st4 = r => ['exposure', 'independent', 'unfamiliar', 'consistent'].filter(k => r.met[k]).length;
    const branch = (title, rows) => `<div class="branch"><h3>${title}</h3><ul>${rows.join('')}</ul></div>`;
    const think = ov.map(r => `<li>${esc(r.ability.name)} ${dots(st4(r), 4)}</li>`);
    const comm = C ? C.AREAS.map(a => { const p = C.pathway(a.id, S.clog || []); return `<li>${esc(a.name)} ${dots(C.STAGES.filter(([k]) => p.met[k]).length, 7)}</li>`; }) : [];
    const chosen = CH ? CH.ALL.filter(q => ['adopt', 'adapt'].includes(((S.character || {}).stance || {})[q.id])) : [];
    const char = chosen.map(q => { const r = CH.stage(q.id, { comm: S.clog || [], ai: S.ai || [], character: S.character, comp: S.comp || [] }); return `<li>${esc(q.name)} ${dots(CH.STAGES.filter(([k]) => r.met[k]).length, 6)}</li>`; });
    return out.replace('<section class="panel"><h2>Achievements</h2>', `<section class="panel"><h2>Skill tree</h2><p class="muted small">Each branch fills only with recorded evidence. Nothing is locked.</p><div class="tree">${branch('Thinking', think)}${branch('Communication', comm)}${branch('Character', char.length ? char : ['<li class="muted">Choose qualities in Grow › Your character</li>'])}</div></section><section class="panel"><h2>Achievements</h2>`); });

  // ───────── role-plays with an AI partner
  wrap('roleplay', (out, id) => { const C = window.MWC; const rp = C && C.RP[id]; if (!rp || !aiOn()) return out;
    return out.replace(/(<\/header>)/, `$1<p class="ai-entry-inline"><button class="btn small ghost" data-action="ex-rp-ai" data-id="${id}">Practise this with an AI partner instead</button> <span class="muted small">Responds to anything you say; feedback at the end.</span></p>`); });

  // ───────── voice conversation mode for AI chats
  let VM = false;
  ['talk-run', 'explore-run'].forEach(n => wrap(n, out => { const V = window.MWVOICE; if (!V || !V.canDictate() || !V.canSpeak()) return out; return out.replace(/(<\/header>)/, `$1<label class="check vm"><input type="checkbox" id="vmToggle" ${VM ? 'checked' : ''}><span>Voice conversation: replies are read aloud and your spoken answer is sent</span></label>`); }));
  window.MWVM = { async after(cur) { if (!VM) return; const V = window.MWVOICE; const last = [...cur.turns].reverse().find(t => t.who === 'them'); if (last) await V.speakText(last.text); const said = await V.listen(); const ta = $('#aiText'); if (VM && said && ta) { ta.value = said; document.querySelector('[data-action="ai-send"]').click(); } } };

  // ───────── actions
  document.addEventListener('change', e => { if (e.target.id === 'vmToggle') { VM = e.target.checked; if (VM && window.MWAIUI.current) window.MWVM.after(window.MWAIUI.current); } });
  document.addEventListener('input', e => { const d = e.target.dataset; if (d.ap && AP) AP.ans[d.ap] = e.target.value; if (d.ka && KA) KA.ans[d.ka] = e.target.value; });
  document.addEventListener('click', async e => {
    const kc = e.target.closest('[data-kac]'); if (kc) { KA.ans.concept = +kc.dataset.kac; U.route(); return; }
    const t = e.target.closest('[data-action]'); if (!t) return; const a = t.dataset.action;
    if (a === 'review' && t.dataset.boss === 'memory') { S.extra.memStart = Date.now(); save(); return; }
    if (!a.startsWith('ex-')) return; e.preventDefault();
    if (a === 'ex-nohints') U.startMode('nohints');
    else if (a === 'ex-transfer') { const p = played(); if (!p.length) { toast('Practise a few exercises first.'); return; } U.startMode('transfer', { played: p, far: p.length >= 6 && Math.random() < 0.5 }); }
    else if (a === 'ex-boss') { if (t.dataset.id === 'comm') { const now = Date.now(); window.MWCUI.startSet({ id: 'boss-comm-' + now, type: 'commset', coach: false, createdAt: now, objective: 'The Communicator: three role-plays without coaching.', items: ['listen-problem', 'boundary', 'rent'].map(r => ({ game: r, rid: r, state: 'pending' })) }); } else U.startMode('boss', { boss: t.dataset.id }); }
    else if (a === 'ex-ap-new') { AP = null; U.route(); }
    else if (a === 'ex-ap-save') { const used = METHODS.filter(([k]) => (AP.ans[k] || '').trim().split(/\s+/).length >= 4); if (used.length < 3 || !(AP.ans.best || '').trim()) { toast('Use at least three methods and say which helped most.'); return; } S.extra.approaches.push({ id: 'ap' + Date.now(), t: Date.now(), problem: PROBLEMS[AP.p], methods: used.map(m => m[0]), ans: AP.ans }); save(); AP.saved = true; U.route(); }
    else if (a === 'ex-ap-ai') { const A = window.MWAI; t.disabled = true; $('#apAi').innerHTML = '<p class="muted">Thinking…</p>';
      const turns = [{ who: 'them', text: 'Problem: ' + PROBLEMS[AP.p] }].concat(METHODS.filter(([k]) => AP.ans[k]).flatMap(([k, n]) => [{ who: 'them', text: n + '?' }, { who: 'you', text: AP.ans[k] }]), [{ who: 'them', text: 'Which method helped most?' }, { who: 'you', text: AP.ans.best || '' }]);
      try { const raw = await A.askJSON(A.feedbackPromptL({ kind: 'deep', title: 'Multiple Approaches: did each answer genuinely use the method it was labelled with?', turns, goals: [], lang: S.lang })); const f = A.guardFeedback(raw, turns.filter(x => x.who === 'you').map(x => x.text));
        AP.ai = `<div class="ai-reflect"><p>${esc(f.summary)}</p>${f.strengths.map(x => `<p>✓ ${esc(x.point)} <span class="evq">“${esc(x.evidence)}”</span></p>`).join('')}${f.development.map(x => `<p>→ ${esc(x.point)} <span class="evq">“${esc(x.evidence)}”</span>${x.try ? ` Try: ${esc(x.try)}` : ''}</p>`).join('')}<p class="muted small">AI-generated; points without quoted evidence from your words were removed (${f.removed.length}).</p></div>`; S.extra.approaches[S.extra.approaches.length - 1].ai = f; save(); U.route(); }
      catch (er) { $('#apAi').innerHTML = `<p class="warn">${esc(er.message)}</p>`; t.disabled = false; } }
    else if (a === 'ex-ka-new') { KA = null; U.route(); }
    else if (a === 'ex-ka-save') { if (KA.ans.concept == null || ['problem', 'apply', 'limit', 'conclusion'].some(k => !(KA.ans[k] || '').trim())) { toast('Answer each step first. A rough answer is fine.'); return; } const d = KA.opts[KA.ans.concept]; S.extra.kia.push({ id: 'ka' + Date.now(), t: Date.now(), scenario: KA.scen && KA.scen.text, term: d.term, book: d.book, ans: KA.ans }); save(); KA.saved = true; U.route(); }
    else if (a === 'ex-rp-ai') { const rp = window.MWC.RP[t.dataset.id]; window.MWAIUI.startTalk({ id: 'rp-' + rp.id, title: rp.title, context: 'professional', opener: rp.open,
      persona: `You are ${rp.who}. ${rp.context || ''} You open the conversation with: "${rp.open}". The person practising is trying to: ${rp.goal} Do not make it easy: react as this person realistically would, including pushing back, until she communicates well. Never mention that this is practice.` }); }
  });
  window.MWEX = { BOSSES, METHODS, PROBLEMS, bossResult };
})();
