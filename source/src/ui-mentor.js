/* MINDWORK — the mentor (Improve) and competencies (Progress). Teaching cycle, plan with reasons, evidence-only states. */
(function () {
  const U = window.MWUI, M = window.MWM, CP = window.MWCP, A = window.MWAI; const { S, DB, esc, $, toast } = U;
  S.comp = []; S.mentor = { turns: [], teaching: [], share: { goals: true, grow: false, journal: false }, size: 'medium', focus: '', cycle: null, lastActive: null };
  U.onLoad.push(async () => { S.comp = (await DB.get('kv', 'competency')) || []; S.mentor = Object.assign(S.mentor, (await DB.get('kv', 'mentor')) || {}); });
  const save = () => { DB.put('kv', 'competency', S.comp).catch(() => {}); DB.put('kv', 'mentor', S.mentor).catch(() => {}); };
  const aiOn = () => A && A.client.provider !== 'none' && S.aiPrefs && S.aiPrefs.consent;
  const allEv = () => S.comp.concat(M.derived({ attempts: S.attempts, clog: S.clog || [], plog: S.plog || [], olog: S.olog || [], extra: S.extra || {}, glog: S.glog || [] }, Object.assign({ PZCAT: window.MWPZ ? Object.fromEntries(window.MWPZ.PUZZLES.map(p => [p.id, p.cat])) : {} }, window.MW))).sort((a, b) => a.t - b.t);
  const lastActive = () => Math.max(0, ...S.attempts.map(a => a.t), ...(S.clog || []).map(e => e.t), ...(S.ai || []).map(e => e.t), ...S.comp.map(e => e.t));
  const st = () => ({ comp: allEv(), improve: S.improve, teaching: S.mentor.teaching, lastActive: lastActive(), bossesTried: Object.values(S.sessions || {}).some(x => x.boss), goals: Object.entries((S.character || {}).stance || {}).filter(([, v]) => v === 'adopt' || v === 'adapt').map(([k]) => (window.MWCH && window.MWCH.BY && window.MWCH.BY[k] || { name: k }).name), grow: S.glog || [], journal: S.journal || [] });
  // evidence from AI conversation feedback (already evidence-guarded)
  function recordFeedback(rec) { const f = rec.feedback || {}; const seen = S.ai.filter(x => x.sid === rec.sid && x.id !== rec.id).length;
    (f.competencies || []).filter(c => CP.BY[c.id]).forEach(c => S.comp.push({ comp: c.id, t: Date.now(), kind: c.result, type: c.difficulty_type || null, ctx: rec.kind + ':' + (rec.sid || 'explore'), evidence: c.evidence, hinted: false, unfamiliar: seen === 0, source: 'AI feedback' })); save(); }
  const planHTML = size => { const P = M.plan(st(), size || S.mentor.size); return P.length ? `<ul class="plan">${P.map(i => `<li><a href="${i.href}">${esc(i.label)}</a><span class="muted small">${esc(i.why)}</span></li>`).join('')}</ul>` : '<p class="muted">Nothing to recommend yet: do any activity and evidence will start to build.</p>'; };
  // Today: recommendation with reasons
  const homeOrig = U.routes.home, homeAfter = homeOrig.after;
  U.routes.home = (...a) => { const out = homeOrig(...a); return typeof out === 'string' ? out.replace('<section class="also">', `<section class="panel mentor-today"><div class="row-panel"><h2>Recommended today</h2><a class="link small" href="#mentor">Mentor</a></div>${planHTML('short')}</section><section class="also">`) : out; };
  U.routes.home.after = homeAfter;

  U.routes.mentor = () => { const m = S.mentor; const busy = m.busy;
    const ctx = M.context(st(), m.share);
    return `<header class="page-head"><a href="#improve" class="link">Improve</a><h1 class="display sm">Your mentor</h1><p class="lede">Teaching, practice and honest feedback that remembers your learning. It explains differently when something doesn’t land, and only records an ability as shown when your own words show it.</p></header>
      <section class="panel"><div class="row-panel"><h2>Today’s plan</h2><span class="seg">${['short', 'medium', 'extended'].map(z => `<button class="btn small ${m.size === z ? 'primary' : 'ghost'}" data-action="mt-size" data-z="${z}">${z[0].toUpperCase() + z.slice(1)}</button>`).join('')}</span></div>${planHTML()}<p class="muted small">Each item says why it’s recommended. Nothing here is a streak or a quota.</p></section>
      <section class="panel"><h2>Learn with the mentor</h2>${aiOn() ? `
        ${m.cycle ? `<p class="muted small">Working on: <strong>${esc(m.cycle.concept || m.focus || '…')}</strong> · cycle: ${M.STAGES.map(x => `<span class="${x === m.cycle.stage ? 'cur' : ''}">${x}</span>`).join(' → ')}</p>` : ''}
        <div class="chat mentor-chat" aria-live="polite">${m.turns.slice(-24).map(t => `<div class="bubble ${t.who === 'you' ? 'you' : 'them'}">${esc(t.text)}${t.meta ? `<span class="muted small mmeta">${esc(t.meta)}</span>` : ''}${t.practice ? `<span class="practice"><strong>Try this:</strong> ${esc(t.practice)}</span>` : ''}</div>`).join('')}${busy ? '<div class="bubble them thinking">Thinking…</div>' : ''}</div>
        ${m.error ? `<p class="warn">${esc(m.error)}</p>` : ''}
        <label class="field labelled"><span>${m.turns.length ? 'Your reply' : 'What would you like to learn or work on? For example: “I repeat the same idea in different words” or “teach me how to build on what someone says”.'}</span><textarea id="mtText" rows="3" ${busy ? 'disabled' : ''}></textarea></label>
        <div class="row"><button class="btn primary" data-action="mt-send" ${busy ? 'disabled' : ''}>Send</button>${m.turns.length ? '<button class="btn ghost" data-action="mt-new">New topic</button>' : ''}</div>
        <p class="muted small">Sends your messages here and the learning summary below to the AI. You can disagree with any assessment; tell it why.</p>` : '<p class="muted">Conversations with the mentor need AI, which isn’t available or allowed here. The plan above, competencies and before-and-after comparisons work without it.</p>'}</section>
      <section class="panel"><h2>What the mentor uses</h2><p class="muted small">Learning evidence from your activities is always included. Personal material is only included if you switch it on.</p>
        ${[['goals', 'Your chosen character goals'], ['grow', 'Which Grow activities you’ve done (titles only)'], ['journal', 'Your Thinking Journal (first lines of recent entries)']].map(([k, n]) => `<label class="check"><input type="checkbox" data-mt-share="${k}" ${m.share[k] ? 'checked' : ''}><span>${n}</span></label>`).join('')}
        <p class="muted small">Never included: emotional check-ins, Grow answers, recordings, real-life notes or books.</p>
        <details><summary>Show exactly what is sent</summary><pre class="ctx">${esc(JSON.stringify(ctx, null, 1))}</pre></details></section>`; };

  U.routes.competencies = () => { const ev = allEv(); const groups = Object.entries(CP.G);
    return `<header class="page-head"><a href="#progress-home" class="link">Progress</a><h1 class="display sm">Competencies</h1><p class="lede">What your recorded work shows, ability by ability. A state moves only with evidence; where there isn’t enough, it says so.</p></header>
      <section class="panel"><p class="muted small">States: ${CP.STATES.map(s => s[1]).join(' → ')}. Evidence comes from AI feedback that quotes your words, the mentor’s assessments, and rules-based results from exercises and role-plays (marked).</p></section>
      ${groups.map(([g, gname]) => `<section class="panel"><h2>${esc(gname)}</h2><ul class="comp-list">${CP.COMPETENCIES.filter(c => c.group === g).map(c => { const s = CP.state(c.id, ev); const ba = CP.beforeAfter(c.id, ev); const last = ev.filter(e => e.comp === c.id && e.evidence).slice(-1)[0];
        return `<li><div><strong>${esc(c.name)}</strong> <span class="state s${s.index}">${esc(s.name)}</span>${c.looks ? `<span class="muted small">${esc(c.looks)}</span>` : ''}${s.next ? `<span class="muted small">Next: ${esc(s.next)}.</span>` : ''}
          ${ba ? `<div class="ba"><span><em>Earlier (${U.fmtDate(ba.first.t)}, ${ba.first.kind === 'difficulty' ? 'difficulty' : 'shown'}):</em> “${esc(ba.first.evidence.slice(0, 140))}”</span><span><em>Recent (${U.fmtDate(ba.last.t)}, ${ba.last.kind === 'difficulty' ? 'difficulty' : 'shown'}):</em> “${esc(ba.last.evidence.slice(0, 140))}”</span></div>` : last ? `<span class="muted small">Latest evidence${last.source === 'rules' ? ' (rules-based)' : ''}: “${esc(last.evidence.slice(0, 120))}”</span>` : s.index ? '' : '<span class="muted small">Not assessed yet.</span>'}</div></li>`; }).join('')}</ul></section>`).join('')}`; };

  async function send(text) { const m = S.mentor; m.turns.push({ who: 'you', text }); m.busy = true; m.error = ''; U.route();
    try { const raw = await A.askJSON(M.prompt({ ctx: M.context(st(), m.share), turns: m.turns, focus: m.focus, lang: S.lang }), { max: 1400 }); const o = M.guard(raw, m.turns.filter(t => t.who === 'you').map(t => t.text));
      if (!o.message) throw Object.assign(new Error(A.ERR.bad_format), { code: 'bad_format' });
      const meta = [o.diagnosis !== 'none' ? 'Noticed: ' + M.DIAG[o.diagnosis] : '', o.strategy ? 'Approach: ' + M.STRATEGIES[o.strategy].toLowerCase() : '', o.removed ? `${o.removed} assessment removed: its evidence wasn’t in your words` : ''].filter(Boolean).join(' · ');
      m.turns.push({ who: 'them', text: o.message, meta, practice: o.practice && o.practice.prompt });
      if (o.strategy && o.concept) m.teaching.push({ t: Date.now(), concept: o.concept, strategy: M.STRATEGIES[o.strategy], diagnosis: o.diagnosis, understood: o.understood });
      if (o.concept || o.stage) m.cycle = { concept: o.concept || (m.cycle && m.cycle.concept), stage: o.stage || (m.cycle && m.cycle.stage) };
      const prev = m.turns.filter(t => t.practice).slice(-2)[0]; if (o.practice && o.practice.competency) S.comp.push({ comp: o.practice.competency, t: Date.now(), kind: 'taught', ctx: 'mentor', evidence: '', source: 'mentor', sessionId: m.sessionId || null });
      if (o.assessment) S.comp.push({ comp: o.assessment.competency, t: Date.now(), kind: o.assessment.result, type: o.assessment.type, ctx: 'mentor', evidence: o.assessment.evidence, hinted: o.strategy === 'guided' || o.strategy === 'worked', unfamiliar: !!(prev && /unfamiliar/.test(prev.meta || '')), source: 'mentor assessment', sessionId: m.sessionId || null });
      save(); }
    catch (e) { m.error = e.message; } m.busy = false; save(); U.route(); }
  document.addEventListener('click', e => { const t = e.target.closest('[data-action]'); if (!t || !t.dataset.action.startsWith('mt-')) return; const a = t.dataset.action;
    if (a === 'mt-size') { S.mentor.size = t.dataset.z; save(); U.route(); }
    if (a === 'mt-send') { const v = ($('#mtText') || {}).value || ''; if (!v.trim()) { toast('Write something first.'); return; } send(v.trim()); }
    if (a === 'mt-new') { S.mentor.turns = []; S.mentor.cycle = null; S.mentor.focus = ''; S.mentor.sessionId = null; save(); U.route(); } });
  document.addEventListener('change', e => { const k = e.target.dataset && e.target.dataset.mtShare; if (k) { S.mentor.share[k] = e.target.checked; save(); U.route(); } });
  // Improvement Workshop: start mentor practice on a recurring difficulty
  function startFocus(sess, focus) { S.mentor.turns = []; S.mentor.cycle = null; S.mentor.focus = focus; S.mentor.sessionId = sess.id; save(); location.hash = '#mentor'; }
  window.MWMUI = { recordFeedback, allEv, startFocus, plan: s => M.plan(st(), s) };
})();
