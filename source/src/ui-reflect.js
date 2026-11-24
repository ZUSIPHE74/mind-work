/* MINDWORK — Thinking Replay, Thinking Journal, Thinking Patterns. */
(function () {
  const E = window.MW, R = window.MWR, U = window.MWUI;
  const { S, esc, $, glyph, catOf, CATC, DIMNAME, bar, toast, save, confirmDlg, short, fmtDate } = U;
  const fmtTime = t => new Date(t).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const RATE = ['Rough', 'Partly developed', 'Solid', 'Thorough'];
  const KIND = { unchanged: 'Unchanged', reworded: 'Reworded', clarified: 'Expanded or clarified', qualified: 'Qualified', reasoning: 'Reasoning added', new: 'New', removed: 'Removed' };
  const findA = id => S.attempts.find(a => a.id === id);
  function promptOf(it) { if (!it) return ''; return it.game === 'branch' ? `${it.title}. ${it.setting}` : (it.s || it.q || (it.a ? `${it.a} and ${it.b}` : '') || (it.concept ? `${it.concept}, for ${it.audience.toLowerCase()}` : '') || (it.facts || it.points || []).join(' · ') || it.topic || (it.lines || []).join(' ') || (it.script || []).map(x => x.t || x).join(' ') || E.promptText(it)); }

  // ───────────────── Thinking Replay
  U.routes.replay = arg => arg ? replayDetail(arg) : replayList();
  function replayList() {
    const done = S.attempts.filter(a => a.status !== 'skipped' && a.finalized && R.versionsOf(a).length).slice().reverse();
    const revised = done.filter(a => R.versionsOf(a).length > 1);
    return `<header class="page-head"><h1 class="display sm">Thinking Replay</h1><p class="lede">Go back through a finished exercise: what you first thought, which questions you met, what you changed, and whether the change was an improvement.</p></header>
      ${!done.length ? `<section class="panel"><p>Finish an exercise and it will appear here. Revising an answer after feedback gives the replay the most to show.</p><a class="btn primary" href="#daily">Go to today’s session</a></section>` : ''}
      ${revised.length ? `<section><h2 class="h2">Exercises you revised</h2><div class="replay-grid">${revised.slice(0, 12).map(card).join('')}</div></section>` : ''}
      ${done.length ? `<section><h2 class="h2">All completed exercises</h2><ul class="replay-list">${done.slice(0, 60).map(a => `<li><span class="dot" style="--c:${CATC[catOf(E.GAME[a.game].cat).color]}"></span><a href="#replay-${a.id}">${esc(E.GAME[a.game].name)}</a><span class="muted small">${fmtDate(a.t)}</span><span class="muted small">${R.versionsOf(a).length > 1 ? R.versionsOf(a).length + ' versions' : 'one version'}${(a.reflections || []).length ? ' · reflected' : ''}${a.legacy ? ' · older record' : ''}</span></li>`).join('')}</ul></section>` : ''}`;
  }
  function card(a) {
    const it = R.timeline(a).item; const v = R.versionsOf(a);
    return `<a class="replay-card" href="#replay-${a.id}" style="--c:${CATC[catOf(E.GAME[a.game].cat).color]}"><span class="muted small">${esc(E.GAME[a.game].name)} · ${fmtDate(a.t)}</span><span class="rc-prompt">${esc(short(promptOf(it), 110))}</span><span class="small">${v.length} versions${(a.reflections || []).length ? ' · reflected' : ' · not yet reflected on'}</span></a>`;
  }

  function respHTML(item, responses) {
    const stages = E.stagesFor(item);
    return stages.map(st => { const id = st.kind === 'branch' ? 'path' : st.id; const u = R.units(st, (responses || {})[id], item); if (!u.length) return ''; return `<div class="rp-stage"><p class="rp-q">${esc(st.label)}</p><ul>${u.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`; }).join('') || '<p class="muted">No response recorded.</p>';
  }
  function fbHTML(fb) {
    if (!fb) return '<p class="muted">No feedback could be produced for this record.</p>';
    const list = (t, arr) => arr && arr.length ? `<p class="rp-q">${t}</p><ul>${arr.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
    return `${list('What you explored', fb.explored.concat(fb.good))}${list('What remained unexplored', fb.unexplored)}${list('Where reasoning needed attention', fb.attention)}<p class="rp-q">The question it asked you</p><p class="rp-question">${esc(fb.question)}</p>`;
  }

  function replayDetail(id) {
    const a0 = findA(id);
    if (!a0) return `<header class="page-head"><h1 class="display sm">Thinking Replay</h1></header><section class="panel"><p>That exercise isn’t in your history on this device. It may have been removed by a reset or not included in an imported backup.</p><a class="btn" href="#replay">All replays</a></section>`;
    const tl = R.timeline(a0), a = tl.attempt, it = tl.item, g = E.GAME[a.game], c = catOf(g.cat);
    if (!it) return `<section class="panel"><p>This record refers to an exercise that no longer exists in the bank, so it can’t be replayed.</p></section>`;
    const vers = a.versions, first = vers[0], last = vers[vers.length - 1];
    const f1 = R.feedbackFor(a, first), fN = R.feedbackFor(a, last);
    const cmp = vers.length > 1 ? R.compare(it, first.responses, last.responses) : null;
    const over = R.overlooked(f1.fb, fN.fb, vers.length === 1);
    const stages = E.stagesFor(it);
    const qs = stages.filter(s => s.prompt).map(s => ({ id: 'stage:' + s.id, text: s.prompt }))
      .concat(vers.map(v => R.feedbackFor(a, v).fb).filter(Boolean).map((fb, i) => ({ id: 'fbq:' + i, text: fb.question })))
      .concat(a.events.filter(e => e.type === 'hint').map(e => ({ id: 'hint:' + e.n, text: e.text })))
      .filter((q, i, arr) => arr.findIndex(x => x.text === q.text) === i);
    const lastRef = (a.reflections || [])[a.reflections.length - 1] || { answers: {}, useful: [] };
    const ev = tl.events.map(e => {
      switch (e.type) {
        case 'challenge': return node('challenge', 'The challenge', fmtTime(e.t), `<p class="rp-prompt">${esc(promptOf(it))}</p><p class="rp-q">Questions the exercise put to you</p><ol class="rp-qs">${stages.filter(s => s.prompt).map(s => `<li>${esc(s.prompt)}</li>`).join('')}</ol>`, true);
        case 'hint': return node('hint', `Hint ${e.n} opened`, fmtTime(e.t), `<p class="rp-hint">${esc(e.text)}</p>`, false);
        case 'reveal': return node('hint', 'Reference shown', fmtTime(e.t), '<p class="muted">You opened the reference after feedback. Revisions after this point count as completed with substantial help.</p>', false);
        case 'initial': return node('initial', 'Your first response', fmtTime(e.t), `<p class="muted small">Exactly as first submitted${a.legacy ? ' (reconstructed from the stored record)' : ''}.</p>${respHTML(it, e.responses)}${e.selfRating ? `<p class="rp-meta">You rated it <strong>${RATE[e.selfRating - 1].toLowerCase()}</strong> before seeing feedback.</p>` : ''}`, true);
        case 'feedback': return node('fbk', `Feedback on version ${e.v}`, '', (e.recorded ? '' : '<p class="rp-note">The feedback text wasn’t stored for this older exercise. This is what the current rules say about that version; it may differ from what you saw at the time.</p>') + fbHTML(e.fb), e.v === 1);
        case 'revision': return node('revision', `Revision ${e.v - 1}`, fmtTime(e.t), respHTML(it, e.responses), e.v === vers.length);
        case 'reflection': return node('reflection', 'Your reflection', fmtTime(e.t), Object.entries(e.answers || {}).filter(([, v]) => v).map(([k, v]) => `<p class="rp-q">${esc(REFQ.find(q => q.id === k) ? REFQ.find(q => q.id === k).q : k)}</p><p class="rp-refl">${esc(v)}</p>`).join('') + (e.useful.length ? `<p class="rp-q">Questions you found useful</p><ul>${e.useful.map(u => `<li>${esc((qs.find(q => q.id === u) || { text: u }).text)}</li>`).join('')}</ul>` : ''), false);
      }
      return '';
    }).join('');
    return `<div class="replay" style="--c:${CATC[c.color]}">
      <header class="page-head"><a class="link" href="#replay">Thinking Replay</a><h1 class="display sm">${esc(g.name)}</h1>
        <p class="muted">${esc(c.name)} · level ${a.level} · ${fmtTime(a.t)} · ${esc(E.STATUS_LABEL[a.status] || '')}</p>
        ${tl.legacy ? `<p class="rp-note">This exercise was completed before detailed history was recorded. Your answers are shown as stored; when hints were opened${tl.hintCountOnly ? ` (you used ${tl.hintCountOnly})` : ''} and the exact feedback you saw weren’t kept.</p>` : ''}</header>
      <div class="replay-body"><div class="timeline">${ev}</div>
      <aside class="replay-side">
        ${cmp ? compareHTML(cmp) : `<section class="panel"><h2>One version</h2><p>You submitted this once, so there’s nothing to compare. Revising after feedback is where a replay becomes most useful — try it next time something in the feedback surprises you.</p></section>`}
        ${over.length ? `<section class="panel"><h2>Things you didn’t explore initially</h2><p class="muted small">From the feedback on your first version. Items marked as suggestions come from rules that look for wording, so treat them as prompts for reflection rather than findings.</p><ul class="over">${over.map(o => `<li class="${o.status}"><span class="tag">${o.status === 'addressed' ? 'No longer flagged after revision' : vers.length > 1 ? 'Still flagged' : o.firm ? 'Flagged' : 'Suggestion'}</span>${esc(o.kind === 'angle' ? 'Unexplored angle: ' + o.text : o.text)}</li>`).join('')}</ul></section>` : ''}
      </aside></div>
      <section class="panel reflect-form"><h2>Reflect on this exercise</h2><p class="muted small">All optional. Each save is kept as a separate entry, so earlier reflections are never overwritten.</p>
        ${REFQ.map(q => `<label class="field labelled"><span>${esc(q.q)}</span><textarea rows="2" data-ref="${q.id}">${esc(lastRef.answers[q.id] || '')}</textarea></label>`).join('')}
        <fieldset class="useful"><legend>Which questions made you think differently?</legend>${qs.map(q => `<label class="check"><input type="checkbox" value="${esc(q.id)}" ${lastRef.useful.includes(q.id) ? 'checked' : ''}><span>${esc(q.text)}</span></label>`).join('')}</fieldset>
        <div class="row"><button class="btn primary" data-action="save-reflection" data-id="${a.id}">Save reflection</button><a class="btn ghost" href="#replay">Back to all replays</a></div></section></div>`;
  }
  const REFQ = [{ id: 'now', q: 'What do you understand now that you didn’t understand initially?' }, { id: 'missing', q: 'What was missing from your first response?' }, { id: 'question', q: 'Which question helped you develop your thinking?' },
    { id: 'next', q: 'What would you approach differently next time?' }, { id: 'realised', q: 'What did you realise that you hadn’t considered initially?' }];
  function node(type, title, when, body, open) { return `<details class="tl-node ${type}" ${open ? 'open' : ''}><summary><span class="tl-dot" aria-hidden="true"></span><span class="tl-title">${esc(title)}</span><span class="muted small">${esc(when)}</span></summary><div class="tl-body">${body}</div></details>`; }
  function compareHTML(cmp) {
    const t = cmp.tally;
    return `<section class="panel compare"><h2>First response → final response</h2>
      <p class="tally">${['new', 'qualified', 'reasoning', 'clarified', 'reworded', 'unchanged', 'removed'].filter(k => t[k]).map(k => `<span class="ck ${k}">${t[k]} ${KIND[k].toLowerCase()}</span>`).join(' ')}</p>
      ${cmp.stages.map(s => `<div class="cmp-stage"><p class="rp-q">${esc(s.stage.label)}</p><ul>${s.items.map(x => `<li class="ck-item ${x.kind}"><span class="ck ${x.kind}">${KIND[x.kind]}</span>${esc(x.text)}${x.from && x.kind !== 'reworded' ? `<span class="was">was: ${esc(short(x.from, 120))}</span>` : ''}</li>`).join('')}${s.removed.map(r => `<li class="ck-item removed"><span class="ck removed">Removed</span><s>${esc(r)}</s></li>`).join('')}</ul></div>`).join('')}
      <p class="muted small">How this is worked out: each part of your final answer is matched to the most similar part of your first answer by shared words. “Unchanged”, “reworded”, “new” and “removed” are reliable. “Qualified” and “reasoning added” mean words like <em>usually</em> or <em>because</em> appeared — they don’t prove the reasoning got better. Longer isn’t automatically better; judge for yourself whether each change improved the answer.</p></section>`;
  }

  // ───────────────── Thinking Journal
  U.routes.journal = arg => arg ? journalDetail(arg) : journalList();
  let jFilter = 'open';
  function journalList() {
    const list = S.journal.filter(j => jFilter === 'all' || (jFilter === 'open' ? j.status !== 'resolved' : j.status === 'resolved'));
    return `<header class="page-head"><h1 class="display sm">Thinking Journal</h1><p class="lede">Somewhere to catch a thought before it’s finished, then come back and develop it. Private to this device.</p></header>
      <section class="panel new-thought"><h2>New thought</h2>
        <fieldset class="seg"><legend>What kind of thought is it?</legend>${R.JTYPES.map(([v, l], i) => `<label><input type="radio" name="jtype" value="${v}" ${i === 0 ? 'checked' : ''}><span>${l}</span></label>`).join('')}</fieldset>
        <label class="field"><span class="sr">Your thought</span><textarea id="jtext" rows="3" placeholder="Write it as it is. It doesn’t need to be finished."></textarea></label>
        <div class="row"><button class="btn primary" data-action="j-new">Save thought</button></div></section>
      <div class="row filter" role="group" aria-label="Show">${[['open', 'Unfinished'], ['resolved', 'Resolved'], ['all', 'All']].map(([v, l]) => `<button class="btn small ${jFilter === v ? 'primary' : 'ghost'}" data-action="j-filter" data-v="${v}" aria-pressed="${jFilter === v}">${l}</button>`).join('')}</div>
      <section class="journal-grid">${list.length ? list.map(j => { const cur = j.versions[j.versions.length - 1]; return `<a class="thought" href="#journal-${j.id}"><span class="t-type">${esc((R.JTYPES.find(x => x[0] === j.type) || [0, j.type])[1])}</span><span class="t-text">${esc(short(cur.text, 180))}</span><span class="muted small">${j.versions.length} version${j.versions.length > 1 ? 's' : ''} · ${j.explorations.length} exploration${j.explorations.length === 1 ? '' : 's'} · ${j.links.length} link${j.links.length === 1 ? '' : 's'} · ${fmtDate(j.updated)}</span></a>`; }).join('') : `<p class="muted">${S.journal.length ? 'Nothing in this view.' : 'No thoughts yet. An observation from today, a question you keep returning to, an opinion you’re not sure you can defend — any of these is a good start.'}</p>`}</section>`;
  }
  function journalDetail(id) {
    const j = S.journal.find(x => x.id === id);
    if (!j) return `<section class="panel"><p>That thought isn’t on this device.</p><a class="btn" href="#journal">Thinking Journal</a></section>`;
    const cur = j.versions[j.versions.length - 1];
    const others = S.journal.filter(x => x.id !== j.id && !j.links.includes(x.id));
    const linked = j.links.map(l => l.startsWith('a:') ? { ex: findA(l.slice(2)), id: l } : { th: S.journal.find(x => x.id === l), id: l }).filter(x => x.ex || x.th);
    const pool = S.attempts.filter(a => a.status !== 'skipped' && a.finalized && !j.links.includes('a:' + a.id)); const atts = [...new Set(pool.filter(a => (a.versions || []).length > 1 || (a.reflections || []).length).concat(pool.slice(-30)))].sort((x, y) => y.t - x.t);
    const byPrompt = R.EXPLORE.map(p => ({ p, items: j.explorations.filter(e => e.prompt === p.id) })).filter(x => x.items.length);
    return `<div class="journal-entry">
      <header class="page-head"><a class="link" href="#journal">Thinking Journal</a><p class="t-type big">${esc((R.JTYPES.find(x => x[0] === j.type) || [0, j.type])[1])} · started ${fmtTime(j.created)}</p>
        <p class="j-current">${esc(cur.text)}</p></header>
      <div class="j-body"><div>
        <section class="panel"><h2>Develop it</h2><label class="field"><span class="sr">Current wording</span><textarea id="jedit" rows="4">${esc(cur.text)}</textarea></label>
          <div class="row"><button class="btn primary" data-action="j-revise" data-id="${j.id}">Save as a new version</button><span class="muted small">Earlier versions are kept below.</span></div></section>
        <section class="panel explore"><h2>Explore this thought further</h2><p class="muted small">Pick a question and answer it yourself. MINDWORK won’t answer for you.</p>
          <div class="explore-qs">${R.EXPLORE.map(p => `<button class="chip-q" data-action="j-pick" data-p="${p.id}">${esc(p.q)}</button>`).join('')}</div>
          <div id="exploreBox" hidden><p class="rp-q" id="exploreQ"></p><label class="field"><span class="sr">Your answer</span><textarea id="exploreA" rows="3"></textarea></label><div class="row"><button class="btn" data-action="j-explore" data-id="${j.id}">Save this exploration</button></div></div>
          ${byPrompt.map(x => `<div class="ex-group"><p class="rp-q">${esc(x.p.q)}</p>${x.items.map(e => `<p class="rp-refl">${esc(e.text)}<span class="muted small"> — ${fmtDate(e.t)}</span></p>`).join('')}</div>`).join('')}</section>
        <section class="panel"><h2>Where it’s got to</h2>${(j.reflection || []).map(r => `<p class="rp-refl">${esc(r.text)}<span class="muted small"> — ${fmtDate(r.t)}</span></p>`).join('')}
          <label class="field"><span class="sr">Reflection</span><textarea id="jrefl" rows="2" placeholder="What do you think now? What’s still unresolved?"></textarea></label>
          <div class="row"><button class="btn" data-action="j-reflect" data-id="${j.id}">Add reflection</button>
          <label class="sel">Status <select id="jstatus" data-id="${j.id}">${[['open', 'Unfinished'], ['developing', 'Developing'], ['resolved', 'Resolved']].map(([v, l]) => `<option value="${v}" ${j.status === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div></section>
      </div><aside>
        <section class="panel"><h2>Connected to</h2>${linked.length ? `<ul class="plain">${linked.map(l => l.th ? `<li><a href="#journal-${l.th.id}">${esc(short(l.th.versions[l.th.versions.length - 1].text, 90))}</a></li>` : `<li>Exercise: <a href="#replay-${l.ex.id}">${esc(E.GAME[l.ex.game].name)}</a> <span class="muted small">${fmtDate(l.ex.t)}</span></li>`).join('')}</ul>` : '<p class="muted small">Nothing yet.</p>'}
          ${others.length ? `<label class="sel block-sel">Link another thought <select id="jlink"><option value="">Choose…</option>${others.map(o => `<option value="${o.id}">${esc(short(o.versions[o.versions.length - 1].text, 60))}</option>`).join('')}</select></label>` : ''}
          ${atts.length ? `<label class="sel block-sel">Link an exercise <select id="jlinkA"><option value="">Choose…</option>${atts.map(a => `<option value="a:${a.id}">${esc(E.GAME[a.game].name)} — ${fmtDate(a.t)}</option>`).join('')}</select></label>` : ''}
          ${others.length || atts.length ? `<div class="row"><button class="btn small" data-action="j-link" data-id="${j.id}">Connect</button></div>` : '<p class="muted small">Write another thought or finish an exercise to have something to connect it to.</p>'}</section>
        <section class="panel"><h2>Versions</h2><ol class="versions">${j.versions.slice().reverse().map((v, i) => `<li><span class="muted small">${fmtTime(v.t)}${i === 0 ? ' · current' : ''}${i === j.versions.length - 1 ? ' · original' : ''}</span><p>${esc(v.text)}</p></li>`).join('')}</ol></section>
        <button class="btn danger small" data-action="j-delete" data-id="${j.id}">Delete this thought</button>
      </aside></div></div>`;
  }
  function putThought(j) { const i = S.journal.findIndex(x => x.id === j.id); if (i >= 0) S.journal[i] = j; else S.journal.unshift(j); return save.thought(j); }

  // ───────────────── Thinking Patterns
  U.routes.patterns = () => {
    const done = S.attempts.filter(a => a.status !== 'skipped');
    const pats = done.length ? R.patterns(S.attempts) : [];
    const diff = pats.filter(p => p.kind === 'difficulty'), str = pats.filter(p => p.kind === 'strength');
    const LV = { established: 'Recurring pattern', emerging: 'Emerging pattern', occasional: 'Occasional', single: 'Observed once — not a pattern' };
    const pcard = p => `<article class="pattern ${p.level} ${p.kind}"><header><span class="lv">${LV[p.level]}</span><h3>${esc(p.name)}</h3></header>
      <p>${esc(p.explain)} ${p.of ? `Seen in <strong>${p.count} of your last ${p.of}</strong> exercises where it could show up.` : ''}</p>
      ${p.trend ? `<p class="trend">Earlier: ${Math.round(p.trend.early * 100)}% of ${p.trend.nEarly} · Recently: ${Math.round(p.trend.recent * 100)}% of ${p.trend.nRecent} — ${p.trend.dir === 'steady' ? 'about the same' : p.kind === 'difficulty' ? (p.trend.dir === 'less' ? 'happening less often' : 'happening more often') : (p.trend.dir === 'more' ? 'growing' : 'less frequent')}</p>`.replace(/(\d+\.\d)%/g, '$1') : ''}
      ${p.evidence.length ? `<details><summary>Evidence from your exercises</summary><ul class="evid">${p.evidence.map(e => `<li><span class="muted small">${fmtDate(e.t)} · ${esc(E.GAME[e.game].name)}</span><span class="ex">“${esc(e.excerpt)}”</span>${e.line ? `<span class="fbline">${esc(e.line)}</span>` : ''}<a class="link small" href="#replay-${e.attemptId}">Replay this exercise</a></li>`).join('')}</ul></details>` : ''}
      ${p.kind === 'difficulty' && p.practise.length && p.level !== 'single' ? `<div class="row tight"><button class="btn small" data-action="pattern-practise" data-p="${p.id}">Practise this: ${p.practise.map(g => esc(E.GAME[g].name)).join(', ')}</button>${(S.improve && S.improve.targets || []).some(t => t.key === p.id && window.MWI.ACTIVE.includes(t.state)) ? '<a class="link small" href="#improve">Active target in Improve</a>' : `<button class="btn small ghost" data-action="pattern-target" data-p="${p.id}">Work on this in Improve</button>`}</div>` : ''}</article>`;
    const firstDims = done.map(a => ({ t: a.t, d: (R.versionsOf(a)[0] || {}).dims || {} }));
    const dimRows = ['variety', 'reasoning', 'nuance', 'specificity', 'organisation', 'connections', 'contribution'].map(k => { const v = firstDims.filter(x => x.d[k] != null); if (v.length < 4) return null; const h = Math.floor(v.length / 2); const avg = arr => arr.reduce((s, x) => s + x.d[k], 0) / arr.length; return { k, e: avg(v.slice(0, h)), r: avg(v.slice(h)), n: v.length }; }).filter(Boolean);
    return `<header class="page-head"><h1 class="display sm">Thinking Patterns</h1><p class="disclaimer">These patterns are counted from your first submissions — your thinking before feedback — using the same rules as the exercise feedback. They describe habits in these exercises, not your personality or ability. A pattern is only called recurring when it shows up in at least four of your recent relevant exercises.</p></header>
      ${done.length < 3 ? `<section class="panel"><p>Patterns need a few exercises to compare. You’ve completed ${done.length}. After three or more, anything observed appears here — clearly marked when it’s been seen only once.</p></section>` : ''}
      ${diff.length ? `<section><h2 class="h2">What tends to hold your thinking back</h2><div class="pattern-grid">${diff.map(pcard).join('')}</div></section>` : done.length >= 3 ? '<section class="panel"><p>No recurring difficulties found in your recent exercises.</p></section>' : ''}
      ${str.length ? `<section><h2 class="h2">What’s working</h2><div class="pattern-grid">${str.map(pcard).join('')}</div></section>` : ''}
      ${dimRows.length ? `<section class="panel"><h2>How your first attempts have changed</h2><p class="muted small">Average indicator on first submissions: your earlier half of exercises against your recent half. A change of less than about half a point is within normal variation.</p>
        <div class="table-wrap"><table class="dimtrend"><thead><tr><th scope="col">Dimension</th><th scope="col">Earlier</th><th scope="col">Recently</th><th scope="col">Exercises</th></tr></thead><tbody>${dimRows.map(r => `<tr><th scope="row">${DIMNAME[r.k]}</th><td>${bar(r.e)} ${r.e.toFixed(1)}</td><td>${bar(r.r)} ${r.r.toFixed(1)} ${r.r - r.e >= 0.5 ? '<span class="up">up</span>' : r.e - r.r >= 0.5 ? '<span class="down">down</span>' : ''}</td><td>${r.n}</td></tr>`).join('')}</tbody></table></div></section>` : ''}`;
  };

  // ───────────────── events
  document.addEventListener('click', async e => {
    const t = e.target.closest('[data-action]'); if (!t) return; const a = t.dataset.action;
    if (a === 'save-reflection') {
      const at = findA(t.dataset.id); const answers = {}; document.querySelectorAll('[data-ref]').forEach(x => { if (x.value.trim()) answers[x.dataset.ref] = x.value.trim(); });
      const useful = [...document.querySelectorAll('.useful input:checked')].map(x => x.value);
      if (!Object.keys(answers).length && !useful.length) { toast('Write at least one reflection or tick a question first.'); return; }
      if (!at.schema) Object.assign(at, R.migrateAttempt(at));
      at.reflections = (at.reflections || []).concat([{ t: Date.now(), answers, useful }]); await save.attempt(at); toast('Reflection saved.'); U.route();
    }
    else if (a === 'j-new') {
      const text = ($('#jtext').value || '').trim(); if (text.length < 3) { toast('Write the thought first — even a rough sentence.'); return; }
      const j = R.newThought(document.querySelector('input[name=jtype]:checked').value, text); await putThought(j); location.hash = '#journal-' + j.id;
    }
    else if (a === 'j-filter') { jFilter = t.dataset.v; U.route(); }
    else if (a === 'j-revise') { const j = S.journal.find(x => x.id === t.dataset.id); const text = $('#jedit').value.trim(); if (!text) { toast('A thought can’t be empty.'); return; } const k = R.reviseThought(j, text); if (k === j) { toast('Nothing changed, so no new version was saved.'); return; } await putThought(k); toast('Saved as version ' + k.versions.length + '.'); U.route(); }
    else if (a === 'j-pick') { const p = R.EXPLORE.find(x => x.id === t.dataset.p); $('#exploreBox').hidden = false; $('#exploreQ').textContent = p.q; $('#exploreBox').dataset.p = p.id; document.querySelectorAll('.chip-q').forEach(x => x.setAttribute('aria-pressed', String(x === t))); $('#exploreA').focus(); }
    else if (a === 'j-explore') { const j = S.journal.find(x => x.id === t.dataset.id); const txt = $('#exploreA').value.trim(); if (!txt) { toast('Write your answer to the question first.'); return; } const k = JSON.parse(JSON.stringify(j)); k.explorations.push({ t: Date.now(), prompt: $('#exploreBox').dataset.p, text: txt }); k.updated = Date.now(); if (k.status === 'open') k.status = 'developing'; await putThought(k); U.route(); }
    else if (a === 'j-reflect') { const j = S.journal.find(x => x.id === t.dataset.id); const txt = $('#jrefl').value.trim(); if (!txt) return; const k = JSON.parse(JSON.stringify(j)); k.reflection = (k.reflection || []).concat([{ t: Date.now(), text: txt }]); k.updated = Date.now(); await putThought(k); U.route(); }
    else if (a === 'j-link') {
      const id = t.dataset.id; const other = ($('#jlink') || {}).value, ex = ($('#jlinkA') || {}).value;
      if (!other && !ex) { toast('Choose a thought or an exercise to connect.'); return; }
      if (other) { const changed = R.linkThoughts(S.journal, id, other); for (const j of changed) if (j !== S.journal.find(x => x.id === j.id)) await putThought(j); }
      if (ex) { const j = JSON.parse(JSON.stringify(S.journal.find(x => x.id === id))); if (!j.links.includes(ex)) { j.links.push(ex); await putThought(j); } }
      U.route();
    }
    else if (a === 'j-delete') { if (!(await confirmDlg('Delete this thought?', 'Its versions, explorations and reflections will be removed from this device. Links from other thoughts are removed too.', 'Delete thought', true))) return; const id = t.dataset.id; S.journal = S.journal.filter(x => x.id !== id); await U.DB.del('journal', id); for (const j of S.journal.filter(x => x.links.includes(id))) { const k = JSON.parse(JSON.stringify(j)); k.links = k.links.filter(l => l !== id); await putThought(k); } location.hash = '#journal'; }
    else if (a === 'pattern-target') { const t2 = U.makeTarget(t.dataset.p); if (t2) location.hash = '#improve'; }
    else if (a === 'pattern-practise') {
      const p = R.patterns(S.attempts).find(x => x.id === t.dataset.p); if (!p) return; const hist = U.history(); const now = Date.now(); const R0 = E.rng('pattern-' + now);
      const items = p.practise.map(g => { const it = E.chooseItem(g, E.skillLevel(S.profile, E.GAME[g].skill), hist, R0, now); return it ? { game: g, itemId: it.id, state: 'pending' } : null; }).filter(Boolean);
      U.startSession({ id: 'pattern-' + now, type: 'pattern', createdAt: now, objective: `Focused on one habit: ${p.name.toLowerCase()}. ${p.explain}`, items, minutes: items.reduce((s, x) => s + E.GAME[x.game].minutes, 0) });
    }
  });
  document.addEventListener('change', async e => { if (e.target.id === 'jstatus') { const j = JSON.parse(JSON.stringify(S.journal.find(x => x.id === e.target.dataset.id))); j.status = e.target.value; j.updated = Date.now(); await putThought(j); toast('Status saved.'); } });
})();
