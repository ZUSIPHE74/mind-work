/* MINDWORK exercise player — runs a session item by item. */
(function () {
  const CLARIFY = { first: 'Say whatever you’d answer if a friend asked you this over coffee. It doesn’t need to be careful or complete.', terms: 'Pick the word in the question that matters most and say what you think it means. For “What makes a place feel like home?”, that word might be “home”: a building, a feeling of belonging, or the people?', reasons: 'List separate things that affect the answer. Each should be a different factor, not the same idea reworded.', counter: 'Imagine someone who disagrees with your first answer. What is the strongest point they would make?', connect: 'Think of an unrelated area (sport, cooking, nature, work) where something similar happens. What does that comparison show?', implic: 'If your view is right, what else must be true? Look for a consequence you didn’t expect.', revised: 'Write your view again, adding conditions like “usually”, “for some people” or “except when” where they’re needed.', distil: 'Finish this sentence: “I now think…”' };
  const E = window.MW, U = window.MWUI, R = window.MWR;
  const { S, esc, $, glyph, catOf, CATC, DIMNAME, bar, toast, save } = U;
  let P = null; // current player state
  const clone = o => JSON.parse(JSON.stringify(o == null ? null : o));
  const wc = s => (String(s || '').trim().match(/\S+/g) || []).length;
  const RATE = ['Rough', 'Partly developed', 'Solid', 'Thorough'];

  function itemOf(sess, idx) { const e = sess.items[idx]; return e.custom || E.resolveItem(e.itemId); }
  function open(sessionId) {
    const sess = S.sessions[sessionId]; if (!sess) { location.hash = '#home'; return; }
    let idx = sess.items.findIndex(i => i.state !== 'done' && i.state !== 'skipped');
    P = { sess, idx, phase: idx < 0 ? 'summary' : 'work' };
    if (idx >= 0) setupItem(idx, S.draft && S.draft.sessionId === sessionId && S.draft.index === idx ? S.draft : null);
    if (location.hash === '#play' && $('#main').dataset.view === 'play') render();
  }
  function setupItem(idx, draft) {
    const item = itemOf(P.sess, idx); P.idx = idx; P.item = item; P.game = E.GAME[item.game]; P.stages = E.stagesFor(item);
    P.resp = draft ? draft.resp : {}; P.stageIdx = draft ? draft.stageIdx : 0; P.hints = draft ? draft.hints : 0; P.revealedRef = draft ? !!draft.revealedRef : false;
    P.branch = draft && draft.branch ? draft.branch : (item.game === 'branch' ? newBranch(item) : null);
    P.startedAt = draft ? draft.startedAt : Date.now(); P.attempt = draft && draft.attemptId ? S.attempts.find(a => a.id === draft.attemptId) : null;
    P.phase = draft && draft.phase === 'feedback' && P.attempt ? 'feedback' : 'work'; P.fb = P.attempt ? E.evaluate(item, P.attempt.responses) : null;
    P.events = draft && draft.events ? draft.events : [{ t: P.startedAt, type: 'start' }];
    P.ratingPending = false;
  }
  function newBranch(item) { return { node: 'start', log: [{ who: 'them', t: item.nodes.start.say }], tags: [], end: null }; }
  let saveT = null;
  function saveDraft(now) {
    if (!P || P.phase === 'summary' || P.idx < 0) return;
    S.draft = { sessionId: P.sess.id, index: P.idx, resp: P.resp, stageIdx: P.stageIdx, hints: P.hints, revealedRef: P.revealedRef, branch: P.branch, startedAt: P.startedAt, attemptId: P.attempt ? P.attempt.id : null, phase: P.phase, events: P.events, updated: Date.now() };
    clearTimeout(saveT); if (now) save.draft(); else saveT = setTimeout(save.draft, 500);
  }
  function leave() { if (P) saveDraft(true); }

  // ───────── challenge header content
  function bubbles(lines) { return `<div class="chat">${lines.map(l => `<p class="bubble ${l.who === 'you' ? 'you' : 'them'}"><span class="who">${l.who === 'you' ? 'You' : 'Them'}</span>${esc(l.t)}</p>`).join('')}</div>`; }
  function challengeHTML(it) {
    switch (it.game) {
      case 'whatelse': return `<p class="prompt">${esc(it.s)}</p><p class="obvious"><span>The obvious reading</span>${esc(it.obvious)}</p>`;
      case 'dots': return `<div class="facts">${it.facts.map(f => `<p class="fact">${esc(f)}</p>`).join('')}</div>`;
      case 'hidden': return `<p class="pair"><span>${esc(it.a)}</span><span class="amp" aria-hidden="true">↔</span><span>${esc(it.b)}</span></p>`;
      case 'explainconn': return `<div class="facts">${it.points.map(f => `<p class="fact">${esc(f)}</p>`).join('')}</div>`;
      case 'evidence': return `<p class="prompt">${esc(it.topic)}</p><p class="muted">Categories: ${E.EVCATS.map(c => c.name.toLowerCase()).join(', ')}.</p>`;
      case 'perspectives': case 'meaning': return `<p class="prompt">${esc(it.s)}</p>`;
      case 'both': return `<div class="facts two"><p class="fact big">${esc(it.a)}</p><p class="fact big">${esc(it.b)}</p></div>`;
      case 'chaos': return `<p class="prompt">${esc(it.topic)}</p><p class="muted">${it.statements.length} statements, ${it.groups} groups.</p>`;
      case 'mainpoint': return `<p class="muted">Read the passage below.</p>`;
      case 'weaklink': return `<p class="muted">Read the argument below.</p>`;
      case 'diff': return `<p class="pair"><span>${esc(it.a)}</span><span class="amp" aria-hidden="true">vs</span><span>${esc(it.b)}</span></p>`;
      case 'exact': return `<p class="prompt">“${esc(it.s)}”</p><p class="obvious"><span>Situation</span>${esc(it.ctx)}</p>`;
      case 'simple': return `<p class="prompt">${esc(it.concept)}</p><p class="obvious"><span>Your listener</span>${esc(it.audience)}</p><p class="muted small">Avoid unless explained: ${it.jargon.map(esc).join(', ')}</p>`;
      case 'nuance': return `<p class="prompt">“${esc(it.s)}”</p>`;
      case 'words': return `<p class="prompt sm">${esc(it.s)}</p>`;
      case 'keepgoing': return bubbles(it.lines.map(t => ({ who: 'them', t })));
      case 'norepeat': return bubbles(it.script);
      case 'beyondq': return bubbles([{ who: 'them', t: it.q }]);
      case 'followup': return bubbles(it.script.map(t => ({ who: 'them', t })));
      case 'between': return bubbles([{ who: 'them', t: it.s }]) + `<p class="obvious"><span>Context</span>${esc(it.ctx)}</p>`;
      case 'branch': return `<p class="prompt sm">${esc(it.title)}</p><p class="obvious"><span>Setting</span>${esc(it.setting)}</p>`;
      case 'deep': return `<p class="prompt">${esc(it.q)}</p>`;
      case 'integrated': return `<p class="prompt sm">${esc(it.s)}</p>`;
      case 'challenge': return `<p class="prompt">“${esc(it.s)}”</p>`;
      case 'rankexp': return `<p class="prompt sm">${esc(it.s)}</p>`;
      default: return `<p class="prompt">${esc(it.s || '')}</p>`;
    }
  }

  // ───────── stage widgets
  function stageHTML(st, i, active) {
    const id = st.id, r = P.resp, locked = P.phase !== 'work';
    const num = P.stages.length > 1 ? `<span class="st-num">${i + 1}</span>` : '';
    let body = '';
    const ta = (key, val, rows, label, extra) => `<label class="field"><span class="sr">${esc(label)}</span><textarea data-k="${esc(key)}" rows="${rows || 4}" ${locked ? 'readonly' : ''} ${extra || ''}>${esc(val || '')}</textarea></label>`;
    switch (st.kind) {
      case 'text': body = ta(id, r[id], st.rows || 4, st.label); break;
      case 'reply': body = (st.reveal ? bubbles([{ who: 'them', t: st.reveal }]) : '') + `<div class="reply-box">${ta(id, r[id], 3, st.label, 'placeholder="Type what you would say…"')}<span class="wc" data-wc="${id}">${wc(r[id])} words</span></div>`; break;
      case 'ideas': case 'chain': {
        const arr = r[id] = r[id] || ['']; if (!arr.length) arr.push('');
        const filled = arr.filter(x => String(x).trim()).length;
        if (st.kind === 'chain') body = `<ol class="chain"><li class="chain-start">${esc(P.item.s)}</li>${arr.map((v, k) => `<li class="chain-link"><label class="field"><span class="sr">Link ${k + 1}</span><input data-k="${id}" data-i="${k}" value="${esc(v)}" ${locked ? 'readonly' : ''} placeholder="which leads to…"></label>${!locked && arr.length > 1 ? `<button class="x" data-act="rm" data-k="${id}" data-i="${k}" aria-label="Remove link ${k + 1}">×</button>` : ''}</li>`).join('')}</ol>`;
        else body = `<ul class="ideas">${arr.map((v, k) => `<li><label class="field"><span class="sr">${esc(st.label)} ${k + 1}</span><textarea class="idea" rows="2" data-k="${id}" data-i="${k}" ${locked ? 'readonly' : ''} placeholder="${k === 0 ? 'First possibility…' : 'Another, genuinely different…'}">${esc(v)}</textarea></label>${!locked && arr.length > 1 ? `<button class="x" data-act="rm" data-k="${id}" data-i="${k}" aria-label="Remove ${k + 1}">×</button>` : ''}</li>`).join('')}</ul>`;
        body += `<div class="row">${!locked ? `<button class="btn small ghost" data-act="add" data-k="${id}">${st.kind === 'chain' ? 'Add a link' : 'Add another'}</button>` : ''}<span class="meta" data-count="${id}">${filled} of at least ${st.min}</span></div>`;
        break;
      }
      case 'fields': { const obj = r[id] = r[id] || {}; body = st.fields.map((f, k) => `<label class="field labelled"><span>${esc(f)}</span><textarea rows="2" data-k="${id}" data-f="${k}" ${locked ? 'readonly' : ''}>${esc(obj[k] || '')}</textarea></label>`).join(''); break; }
      case 'choice': { const v = r[id] = r[id] || {}; body = `<div class="choices" role="radiogroup" aria-label="${esc(st.prompt)}">${st.options.map((o, k) => `<button role="radio" aria-checked="${v.choice === k}" class="choice" data-act="choose" data-k="${id}" data-i="${k}" ${locked ? 'disabled' : ''}>${esc(o)}</button>`).join('')}</div>` + (st.withText ? `<p class="st-sub">${esc(st.withText)}</p>` + `<label class="field"><span class="sr">${esc(st.withText)}</span><textarea rows="3" data-k="${id}" data-sub="text" ${locked ? 'readonly' : ''}>${esc(v.text || '')}</textarea></label>` : ''); break; }
      case 'pick': body = `<div class="pick-list" role="radiogroup" aria-label="${esc(st.prompt)}">${st.parts.map((p, k) => `<button role="radio" aria-checked="${r[id] === k}" class="pick" data-act="pick" data-k="${id}" data-i="${k}" ${locked ? 'disabled' : ''}>${esc(p)}</button>`).join('')}</div>`; break;
      case 'order': { const ord = r[id] = r[id] || st.items.map((_, k) => k); body = `<ol class="order" aria-label="Your ranking, most plausible first">${ord.map((k, pos) => `<li draggable="${!locked}" data-drag="order" data-pos="${pos}"><span class="grip" aria-hidden="true">⋮⋮</span><span class="o-text">${esc(st.items[k])}</span>${locked ? '' : `<span class="o-btns"><button class="btn tiny" data-act="up" data-k="${id}" data-i="${pos}" ${pos === 0 ? 'disabled' : ''} aria-label="Move up: ${esc(st.items[k])}">↑</button><button class="btn tiny" data-act="down" data-k="${id}" data-i="${pos}" ${pos === ord.length - 1 ? 'disabled' : ''} aria-label="Move down: ${esc(st.items[k])}">↓</button></span>`}</li>`).join('')}</ol>`; break; }
      case 'sort': case 'group': {
        const isG = st.kind === 'group';
        const state = isG ? (r[id] = r[id] || { assign: {}, names: Array(st.groups).fill('') }) : null;
        const assign = isG ? state.assign : (r[id] = r[id] || {});
        const buckets = isG ? state.names.map((n, k) => ({ id: k, name: n || 'Group ' + (k + 1) })) : st.buckets;
        const unplaced = st.items.map((t, k) => k).filter(k => assign[k] == null);
        const card = (k, placed) => `<li class="card" draggable="${!locked}" data-drag="card" data-k="${id}" data-i="${k}"><span>${esc(st.items[k])}</span>${locked ? '' : placed ? `<button class="btn tiny ghost" data-act="unplace" data-k="${id}" data-i="${k}" aria-label="Move back to unsorted: ${esc(st.items[k])}">Unsort</button>` : `<span class="chips">${buckets.map(b => `<button class="chip" data-act="place" data-k="${id}" data-i="${k}" data-b="${b.id}">${esc(b.name)}</button>`).join('')}</span>`}</li>`;
        body = `<div class="sorter"><div class="tray"><h4>Unsorted <span class="muted">(${unplaced.length})</span></h4><ul class="cards">${unplaced.map(k => card(k, false)).join('') || '<li class="muted small">All placed.</li>'}</ul></div>
          <div class="buckets">${buckets.map(b => `<section class="bucket" data-drop="${b.id}" data-k="${id}">${isG ? `<label class="field"><span class="sr">Name for group ${b.id + 1}</span><input class="bucket-name" data-k="${id}" data-gname="${b.id}" value="${esc(state.names[b.id])}" placeholder="Name group ${b.id + 1}" ${locked ? 'readonly' : ''}></label>` : `<h4>${esc(b.name)}</h4>`}<ul class="cards">${st.items.map((t, k) => k).filter(k => assign[k] == b.id).map(k => card(k, true)).join('')}</ul></section>`).join('')}</div></div>`;
        break;
      }
      case 'branch': {
        const b = P.branch, node = P.item.nodes[b.node];
        body = `<div class="chat live">${b.log.map(l => `<p class="bubble ${l.who}"><span class="who">${l.who === 'you' ? 'You' : 'Them'}</span>${esc(l.t)}</p>`).join('')}</div>`;
        if (!b.end && !locked) body += `<div class="branch-opts" role="group" aria-label="Choose your response">${node.opts.map((o, k) => `<button class="branch-opt" data-act="branch" data-i="${k}">${esc(o.t)}</button>`).join('')}</div>`;
        else if (b.end) body += `<p class="branch-end ${b.end}">${b.end === 'good' ? 'They leaned in.' : b.end === 'ok' ? 'Polite, but the conversation lost momentum.' : 'The conversation fizzled.'}</p>${!locked ? '<button class="btn small ghost" data-act="branch-restart">Replay with different choices</button>' : ''}`;
        break;
      }
    }
    const reveal = st.reveal && st.kind !== 'reply' ? `<blockquote class="reveal"><span>A reasonable opposing argument</span>${esc(st.reveal)}</blockquote>` : '';
    return `<section class="stage ${active ? 'active' : ''}" data-stage="${i}" aria-labelledby="st-${i}">
      <h3 id="st-${i}">${num}${esc(st.label)}</h3>${reveal}${st.prompt ? `<p class="st-prompt">${esc(st.prompt)}</p>` : ''}${body}</section>`;
  }

  function stageFilled(st) {
    const v = P.resp[st.id];
    switch (st.kind) {
      case 'text': case 'reply': return wc(v) >= 2;
      case 'ideas': case 'chain': return (v || []).filter(x => wc(x) >= 1).length >= 1;
      case 'fields': return Object.values(v || {}).some(x => wc(x) >= 1);
      case 'choice': return v && v.choice != null;
      case 'pick': return v != null;
      case 'order': return true;
      case 'sort': return Object.keys(v || {}).length > 0;
      case 'group': return v && Object.keys(v.assign).length > 0;
      case 'branch': return P.branch && !!P.branch.end;
    }
    return true;
  }

  // ───────── render
  function render() {
    const m = $('#main'); if (!m || !P) return;
    if (P.phase === 'summary') { m.innerHTML = summaryHTML(); return; }
    const it = P.item, g = P.game, c = catOf(g.cat), sess = P.sess;
    const hints = it.h || g.hints;
    const visible = P.phase === 'work' ? P.stages.slice(0, P.stageIdx + 1) : P.stages;
    const last = P.stageIdx >= P.stages.length - 1;
    const cur = P.stages[P.stageIdx];
    m.innerHTML = `<div class="player" style="--c:${CATC[c.color]}">
      <div class="p-top">
        <a href="#home" class="link">Leave session</a>
        <ol class="p-steps" aria-label="Session progress">${sess.items.map((x, k) => `<li class="${x.state} ${k === P.idx ? 'cur' : ''}" title="${esc(E.GAME[x.game].name)}"><span class="sr">${esc(E.GAME[x.game].name)}: ${k === P.idx ? 'current' : x.state}</span></li>`).join('')}</ol>
        <span class="meta">${P.idx + 1} of ${sess.items.length}</span>
      </div>
      ${sess.objective && P.idx === 0 && P.phase === 'work' && P.stageIdx === 0 ? `<p class="objective">${esc(sess.objective)}</p>` : ''}
      <section class="p-head">
        <div class="p-meta">${glyph(c.glyph, 30)}<span>${esc(c.name)}</span><span class="lvl">Level ${it.lvl}</span></div>
        <h1 class="p-title">${esc(g.name)}</h1>
        <p class="p-instr">${esc(g.instructions)}</p>
        <div class="challenge">${challengeHTML(it)}</div>
        ${it.src ? `<p class="book-src">From your book: <strong>${esc(it.src.bookTitle)}</strong>${it.src.chapterTitle ? ' · ' + esc(it.src.chapterTitle) : ''}${it.src.page != null ? ' · p. ' + it.src.page : ''} <a class="link small" href="#read-${it.src.bookId}.${it.src.chapterId}" data-para="${it.src.paraId}">source</a></p>` : ''}
      </section>
      <div class="p-body">
        <div class="p-work">
          ${visible.map((st, k) => stageHTML(st, k, k === P.stageIdx && P.phase === 'work')).join('')}
          ${P.phase === 'work' ? `<div class="p-actions">${P.ratingPending ? rateHTML() : `
            ${!last ? `<button class="btn primary" data-act="next-stage">Continue</button>` : cur.kind === 'branch' ? '' : `<button class="btn primary" data-act="submit">${P.attempt ? 'Submit revision' : 'Get feedback'}</button>`}
            <span class="hint-msg" id="stageMsg" role="status"></span>
            ${!P.attempt ? `<button class="btn ghost small push" data-act="skip">Skip this exercise</button>` : ''}`}</div>` : ''}
          ${P.phase === 'feedback' ? feedbackHTML() : ''}
        </div>
        <aside class="p-side" aria-label="Help">
          <div class="side-box"><h2>What this trains</h2><p>${esc(g.objective)}</p><p class="muted small">${esc(E.SKILLS.find(s => s.id === g.skill).name)}${(g.secondary || []).length ? ' · also ' + g.secondary.map(s => E.SKILLS.find(x => x.id === s).name.toLowerCase()).join(', ') : ''}</p></div>
          <div class="side-box hints"><h2>Hints</h2>
            ${hints.slice(0, P.hints).map((h, k) => `<p class="hint"><span>${['A nudge', 'A sharper question', 'A worked example'][k]}</span>${esc(h)}</p>`).join('')}
            ${P.hints < 3 && P.phase === 'work' && !((window.MWP && window.MWP.state.sess) || {}).noHints ? `<button class="btn small ghost" data-act="hint">${P.hints === 0 ? 'Show a hint' : P.hints === 1 ? 'Show a more specific hint' : 'Show a worked example'}</button>` : ''}
            <p class="muted small">${P.hints ? `${P.hints} of 3 used. Recorded separately from independent work.` : 'Try first; hints are graduated and recorded.'}</p></div>
        </aside>
      </div></div>`;
  }
  function rateHTML() {
    return `<div class="rate"><p id="rateQ"><strong>Before the feedback:</strong> how developed do you think this is?</p><div class="row" role="group" aria-labelledby="rateQ">${RATE.map((l, k) => `<button class="btn" data-act="rate" data-i="${k + 1}">${l}</button>`).join('')}<button class="btn ghost small" data-act="rate" data-i="0">Skip rating</button></div></div>`;
  }
  function feedbackHTML() {
    const fb = P.fb, a = P.attempt;
    const sec = (title, arr, cls) => arr && arr.length ? `<section class="fb-sec ${cls || ''}"><h3>${title}</h3>${arr.length === 1 && typeof arr[0] === 'string' && cls === 'one' ? `<p>${esc(arr[0])}</p>` : `<ul>${arr.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`}</section>` : '';
    const ms = a.selfRating ? E.selfBand(a.overall) : null;
    const meta = a.selfRating ? `<p class="meta-note">You rated this <strong>${RATE[a.selfRating - 1].toLowerCase()}</strong>; the feedback reads it as <strong>${RATE[ms - 1].toLowerCase()}</strong>.${a.selfRating === ms ? ' Your judgement matched.' : a.selfRating > ms ? ' Worth rereading before you submit next time.' : ' You may be underrating your own thinking.'}</p>` : '';
    const rev = a.revisions && a.revisions.length ? `<p class="meta-note">Revision ${a.revisions.length}: indicator ${a.revisions[0].overall.toFixed(1)} → ${a.overall.toFixed(1)}.</p>` : '';
    const refs = [];
    if (P.revealedRef) {
      if (P.item.angles && P.item.angles.length) refs.push('Angles people often explore: ' + P.item.angles.map(x => x.l.toLowerCase()).join('; ') + '. Yours may be just as valid.');
      fb.reveal.forEach(x => refs.push(x));
      if (P.item.game === 'evidence') refs.push('A careful reading: ' + P.item.items.map(x => `“${x.t.slice(0, 40)}…” → ${E.EVCATS.find(c => c.id === x.c).name.toLowerCase()}`).join('; '));
      if (P.item.game === 'words') refs.push('Best fit: “' + P.item.options[P.item.best[0]] + '”.');
      if (P.item.game === 'mainpoint') refs.push('Central sentence: “' + P.item.parts[P.item.main] + '”');
      if (P.item.game === 'weaklink') refs.push('Weak link: “' + P.item.parts[P.item.weak[0]] + '”');
      if (P.item.game === 'chaos') refs.push('Central statement: “' + P.item.statements[P.item.central].t + '”');
      if (!refs.length) refs.push('There’s no single answer here. A worked illustration of the move: ' + (P.item.h || P.game.hints)[2]);
    }
    const lastItem = P.sess.items.every((x, k) => k === P.idx || x.state === 'done' || x.state === 'skipped');
    return `<section class="feedback" aria-labelledby="fbh" tabindex="-1" id="fb">
      <header class="fb-head"><h2 id="fbh">Feedback</h2><span class="status ${a.status}">${esc(E.STATUS_LABEL[a.status])}</span></header>
      <div class="fb-dims">${Object.entries(fb.dims).map(([k, v]) => `<div><span>${DIMNAME[k] || k}</span>${bar(v)}<span class="num">${v.toFixed(1)}</span></div>`).join('')}<p class="muted small">Practice indicators (0–4) from rules about your answer’s structure — not a judgement of you.</p></div>
      ${sec('What you communicated', [fb.communicated], 'one')}
      ${sec('What you explored', fb.explored.concat(fb.good))}
      ${sec('What remains unexplored', fb.unexplored)}
      ${sec('Where your reasoning needs attention', fb.attention, 'attn')}
      <section class="fb-sec q"><h3>A question to deepen your thinking</h3><p>${esc(fb.question)}</p></section>
      ${meta}${rev}
      ${a.levelChange ? `<p class="meta-note">Your ${esc(E.SKILLS.find(s => s.id === a.levelChange.skill).name.toLowerCase())} level is now ${a.levelChange.to}.</p>` : ''}
      ${refs.length ? `<section class="fb-sec ref"><h3>Reference</h3><ul>${refs.map(x => `<li>${esc(x)}</li>`).join('')}</ul></section>` : ''}
      <div class="row fb-actions"><button class="btn" data-act="revise">Try again — revise your answer</button>${!P.revealedRef ? `<button class="btn ghost" data-act="reveal">Show reference</button>` : ''}<button class="btn primary push" data-act="next-item">${lastItem ? 'Finish session' : 'Next exercise'}</button></div>
    </section>`;
  }
  function summaryHTML() {
    const sess = P.sess; const atts = sess.items.map(x => x.attemptId && S.attempts.find(a => a.id === x.attemptId)).filter(Boolean);
    const dims = {}; atts.forEach(a => Object.entries(a.dims || {}).forEach(([k, v]) => (dims[k] = dims[k] || []).push(v)));
    const davg = Object.entries(dims).map(([k, v]) => [k, v.reduce((x, y) => x + y, 0) / v.length]).sort((a, b) => a[1] - b[1]);
    const skills = [...new Set(atts.flatMap(a => [E.GAME[a.game].skill].concat(E.GAME[a.game].secondary || [])))];
    const weakest = atts.slice().sort((a, b) => a.overall - b.overall)[0];
    const rec = weakest ? E.GAME[E.GAME[weakest.game].followup] : null;
    const lc = atts.filter(a => a.levelChange);
    return `<div class="summary"><header class="page-head"><h1 class="display sm">Session complete</h1><p class="lede">${atts.length} exercise${atts.length === 1 ? '' : 's'} completed${sess.items.some(i => i.state === 'skipped') ? ', ' + sess.items.filter(i => i.state === 'skipped').length + ' skipped' : ''}.</p></header>
      <section class="panel"><h2>What you did</h2><ul class="recent">${sess.items.map(x => { const a = x.attemptId && S.attempts.find(y => y.id === x.attemptId); return `<li><span class="dot" style="--c:${CATC[catOf(E.GAME[x.game].cat).color]}"></span><span>${esc(E.GAME[x.game].name)}</span><span class="muted">${a ? esc(E.STATUS_LABEL[a.status]) + (a.revisions && a.revisions.length ? ', revised' : '') : 'Skipped'}</span><span class="muted">${a ? `<a class="link" href="#replay-${a.id}">Replay</a>` : ''}</span></li>`; }).join('')}</ul></section>
      <section class="progress-two"><div class="panel"><h2>Skills exercised</h2><p>${skills.map(s => `<span class="pill">${esc(E.SKILLS.find(x => x.id === s).name)}</span>`).join(' ')}</p>${lc.map(a => `<p class="meta-note">Level change: ${esc(E.SKILLS.find(s => s.id === a.levelChange.skill).name)} is now level ${a.levelChange.to}.</p>`).join('')}</div>
      <div class="panel"><h2>Across this session</h2>${davg.length ? `<p>Strongest: <strong>${DIMNAME[davg[davg.length - 1][0]]}</strong>. Needs most attention: <strong>${DIMNAME[davg[0][0]]}</strong>.</p>` : '<p class="muted">No exercises were completed.</p>'}</div></section>
      ${rec ? `<section class="panel row-panel"><div><h2>Practise next</h2><p>${esc(rec.name)} — ${esc(rec.objective)}</p><p class="muted small">Recommended because ${esc(E.GAME[weakest.game].name)} was your lowest-scoring exercise this session, and this game works the next skill along.</p></div><button class="btn primary" data-action="play" data-game="${rec.id}">Practise ${esc(rec.name)}</button></section>` : ''}
      <div class="row">${sess.improve ? '<a class="btn primary" href="#improve">Back to the Improvement Workshop</a>' : ''}<a class="btn" href="#home">Back to Today</a><a class="btn ghost" href="#progress">See my progress</a></div></div>`;
  }

  // ───────── actions
  function msg(t) { const el = $('#stageMsg'); if (el) el.textContent = t; }
  function focusLater(sel) { setTimeout(() => { const el = $(sel); if (el) el.focus(); }, 0); }
  function act(a, t) {
    const k = t.dataset.k, i = t.dataset.i != null ? +t.dataset.i : null;
    if (a === 'add') { P.resp[k] = P.resp[k] || []; P.resp[k].push(''); render(); focusLater(`[data-k="${k}"][data-i="${P.resp[k].length - 1}"]`); }
    else if (a === 'rm') { P.resp[k].splice(i, 1); render(); }
    else if (a === 'choose') { P.resp[k] = P.resp[k] || {}; P.resp[k].choice = i; render(); focusLater(`[data-act="choose"][data-i="${i}"]`); }
    else if (a === 'pick') { P.resp[k] = i; render(); focusLater(`[data-act="pick"][data-k="${k}"][data-i="${i}"]`); }
    else if (a === 'up' || a === 'down') { const o = P.resp[k], j = a === 'up' ? i - 1 : i + 1; [o[i], o[j]] = [o[j], o[i]]; render(); focusLater(`[data-act="${a}"][data-i="${j}"]`); }
    else if (a === 'place') { const st = P.stages.find(s => s.id === k); const tgt = st.kind === 'group' ? P.resp[k].assign : P.resp[k]; tgt[i] = st.kind === 'group' ? +t.dataset.b : t.dataset.b; render(); focusLater('.tray .chip'); }
    else if (a === 'unplace') { const st = P.stages.find(s => s.id === k); delete (st.kind === 'group' ? P.resp[k].assign : P.resp[k])[i]; render(); }
    else if (a === 'branch') {
      const node = P.item.nodes[P.branch.node], o = node.opts[i];
      P.branch.log.push({ who: 'you', t: o.t }); P.branch.tags.push(o.tag); P.branch.node = o.next; const nx = P.item.nodes[o.next];
      P.branch.log.push({ who: 'them', t: nx.say });
      if (nx.end) { P.branch.end = nx.end; P.resp.path = { tags: P.branch.tags.slice(), end: nx.end, lastLine: nx.say, log: P.branch.log.slice() }; P.stageIdx = Math.max(P.stageIdx, 1); render(); focusLater('[data-k="final"]'); }
      else { render(); focusLater('.branch-opt'); }
    }
    else if (a === 'branch-restart') { P.branch = newBranch(P.item); delete P.resp.path; P.stageIdx = 0; render(); focusLater('.branch-opt'); }
    else if (a === 'hint') { P.hints = Math.min(3, P.hints + 1); { const hs = P.item.h || P.game.hints; const ev = { t: Date.now(), type: 'hint', n: P.hints, text: hs[P.hints - 1] }; if (P.attempt) { P.attempt.events.push(ev); save.attempt(P.attempt); } else P.events.push(ev); } render(); focusLater('.hints .hint:last-of-type'); }
    else if (a === 'next-stage' || a === 'submit') {
      const st0 = P.stages[P.stageIdx]; const said = String(P.resp[st0.id] || '').trim();
      if (st0.kind === 'text' && said && said.split(/\s+/).length <= 25 && /\b(don'?t|do not) (understand|get|follow)|what do you mean|not sure what (you|this|it) mean|can you explain|confus|i don'?t know what (you|this) /i.test(said.replace(/[’]/g, "'"))) {
        // Not an answer: the question needs explaining. Nothing is recorded or scored; the stage stays where it is.
        const box = document.querySelector(`.stage[data-stage="${P.stageIdx}"]`); const help = CLARIFY[st0.id] || 'There’s no single right answer. Write what you genuinely think, even roughly; you can change it later.';
        if (box && !box.querySelector('.clarify')) box.insertAdjacentHTML('beforeend', `<div class="clarify" role="status"><strong>Another way to put it.</strong> ${U.esc(help)} <span class="muted small">(Recognised by phrase rules. For a conversation that can rephrase anything, use “Explore a question with AI” in Deep Thinking.)</span></div>`);
        return;
      }
    }
    if (a === 'next-stage') {
      const st = P.stages[P.stageIdx];
      if (!stageFilled(st)) { msg('Write something for this stage first — a rough attempt is fine.'); return; }
      if (st.min && (P.resp[st.id] || []).filter(x => wc(x)).length < st.min && !t.dataset.confirmed) { msg(`You have ${(P.resp[st.id] || []).filter(x => wc(x)).length} of ${st.min}. Press Continue again to move on anyway — or try one more.`); t.dataset.confirmed = '1'; return; }
      P.stageIdx++; render(); focusLater(`.stage[data-stage="${P.stageIdx}"] textarea, .stage[data-stage="${P.stageIdx}"] input, .stage[data-stage="${P.stageIdx}"] button`);
    }
    if (a === 'submit') {
      const empty = P.stages.filter(s => !stageFilled(s));
      if (empty.length) { msg(`“${empty[0].label}” is still empty. Fill it in or write a rough attempt before getting feedback.`); return; }
      if (S.settings.selfRate && !P.attempt) { P.ratingPending = true; render(); focusLater('[data-act="rate"]'); return; }
      evaluateNow(null);
    }
    else if (a === 'rate') { P.ratingPending = false; evaluateNow(i || null); }
    else if (a === 'revise') { P.attempt.events.push({ t: Date.now(), type: 'revise' }); save.attempt(P.attempt); P.phase = 'work'; P.stageIdx = P.stages.length - 1; if (P.item.game === 'branch') P.stageIdx = 1; render(); focusLater('.stage textarea'); }
    else if (a === 'reveal') { P.revealedRef = true; P.attempt.revealedAfter = true; P.attempt.events.push({ t: Date.now(), type: 'reveal' }); save.attempt(P.attempt); render(); focusLater('.fb-sec.ref'); }
    else if (a === 'next-item') nextItem();
    else if (a === 'skip') skipItem();
    saveDraft();
  }
  function evaluateNow(selfRating) {
    const fb = E.evaluate(P.item, P.resp); const now = Date.now();
    if (!P.attempt) {
      const a = { id: 'a' + now.toString(36) + Math.random().toString(36).slice(2, 6), sessionId: P.sess.id, itemId: P.item.id, game: P.item.game, level: P.item.lvl, t: now,
        responses: clone(P.resp), hints: P.hints, revealed: false, selfRating: selfRating || null, overall: fb.overall, dims: fb.dims, revisions: [], timeMs: Math.min(now - P.startedAt, 3600e3), flags: E.attemptFlags(P.item, P.resp, fb), attention: fb.attention.length, finalized: false, custom: P.item.custom ? P.item : undefined,
        schema: 2, events: P.events.concat([{ t: now, type: 'submit', v: 1 }]), reflections: [], versions: [{ v: 1, t: now, responses: clone(P.resp), overall: fb.overall, dims: clone(fb.dims), feedback: R.snapshot(fb), selfRating: selfRating || null, hintsBefore: P.hints }] };
      a.status = E.status(a.hints, false, a.overall); P.attempt = a; S.attempts.push(a);
    } else {
      const a = P.attempt; a.revisions.push({ t: now, responses: a.responses, overall: a.overall, dims: a.dims });
      if (!a.versions) Object.assign(a, R.migrateAttempt(a));
      a.versions.push({ v: a.versions.length + 1, t: now, responses: clone(P.resp), overall: fb.overall, dims: clone(fb.dims), feedback: R.snapshot(fb), selfRating: null, hintsBefore: P.hints });
      a.events.push({ t: now, type: 'submit', v: a.versions.length });
      a.responses = clone(P.resp); a.overall = fb.overall; a.dims = fb.dims; a.hints = P.hints; a.flags = E.attemptFlags(P.item, P.resp, fb); a.attention = fb.attention.length;
      if (a.revealedAfter) a.revealed = true; a.status = E.status(a.hints, a.revealed, a.overall); a.timeMs = Math.min(now - P.startedAt, 3600e3);
    }
    save.attempt(P.attempt); P.fb = fb; P.phase = 'feedback'; render(); saveDraft(true);
    setTimeout(() => { const f = $('#fb'); if (f) { f.focus({ preventScroll: true }); f.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); } }, 30);
  }
  function nextItem() {
    const a = P.attempt; U.finalizeAttempt(a);
    const e = P.sess.items[P.idx]; e.state = 'done'; e.attemptId = a.id; save.session(P.sess);
    S.draft = null; save.draft(); advance();
  }
  function skipItem() {
    const e = P.sess.items[P.idx]; e.state = 'skipped';
    const a = { id: 's' + Date.now().toString(36), sessionId: P.sess.id, itemId: P.item.id, game: P.item.game, level: P.item.lvl, t: Date.now(), responses: {}, hints: P.hints, overall: 0, dims: {}, status: 'skipped', finalized: true, revisions: [], schema: 2, versions: [], events: [], reflections: [] };
    S.attempts.push(a); save.attempt(a); save.session(P.sess); S.draft = null; save.draft(); advance();
  }
  function advance() {
    const idx = P.sess.items.findIndex(i => i.state !== 'done' && i.state !== 'skipped');
    if (idx < 0) { P.phase = 'summary'; P.sess.completedAt = Date.now(); save.session(P.sess); }
    else setupItem(idx, null);
    render(); window.scrollTo(0, 0); $('#main').focus({ preventScroll: true });
  }

  // ───────── input + drag events
  document.addEventListener('click', e => { const t = e.target.closest('[data-act]'); if (!t || !P || !$('.player, .summary')) return; e.preventDefault(); act(t.dataset.act, t); });
  document.addEventListener('input', e => {
    const t = e.target; if (!P || !t.dataset || t.dataset.k == null || !t.closest('.player')) return;
    const k = t.dataset.k;
    if (t.dataset.gname != null) P.resp[k].names[+t.dataset.gname] = t.value;
    else if (t.dataset.i != null) { P.resp[k][+t.dataset.i] = t.value; const st = P.stages.find(s => s.id === k); const c = $(`[data-count="${k}"]`); if (c && st) c.textContent = `${P.resp[k].filter(x => String(x).trim()).length} of at least ${st.min}`; }
    else if (t.dataset.f != null) { P.resp[k] = P.resp[k] || {}; P.resp[k][t.dataset.f] = t.value; }
    else if (t.dataset.sub) { P.resp[k] = P.resp[k] || {}; P.resp[k][t.dataset.sub] = t.value; }
    else { P.resp[k] = t.value; const w = $(`[data-wc="${k}"]`); if (w) w.textContent = wc(t.value) + ' words'; }
    msg(''); saveDraft();
  });
  document.addEventListener('keydown', e => {
    const t = e.target; if (!P || !t.classList || !t.closest('.player')) return;
    if (t.classList.contains('idea') && e.key === 'Enter' && !e.shiftKey && t.value.trim()) { e.preventDefault(); const k = t.dataset.k, i = +t.dataset.i; if (i === P.resp[k].length - 1) act('add', { dataset: { k } }); else focusLater(`[data-k="${k}"][data-i="${i + 1}"]`); }
    if (t.closest('.chain-link') && e.key === 'Enter' && t.value.trim()) { e.preventDefault(); act('add', { dataset: { k: t.dataset.k } }); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { const b = $('[data-act="next-stage"], [data-act="submit"]'); if (b) { e.preventDefault(); b.click(); } }
  });
  let drag = null;
  document.addEventListener('dragstart', e => { const c = e.target.closest && e.target.closest('[data-drag]'); if (!c || !P) return; drag = { type: c.dataset.drag, k: c.dataset.k, i: c.dataset.i != null ? +c.dataset.i : null, pos: c.dataset.pos != null ? +c.dataset.pos : null }; e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', 'x'); } catch (x) {} c.classList.add('dragging'); });
  document.addEventListener('dragend', e => { document.querySelectorAll('.dragging, .over').forEach(x => x.classList.remove('dragging', 'over')); drag = null; });
  document.addEventListener('dragover', e => { if (!drag) return; const z = e.target.closest(drag.type === 'card' ? '[data-drop], .tray' : '[data-drag="order"]'); if (z) { e.preventDefault(); document.querySelectorAll('.over').forEach(x => x !== z && x.classList.remove('over')); z.classList.add('over'); } });
  document.addEventListener('drop', e => {
    if (!drag || !P) return;
    if (drag.type === 'card') {
      const z = e.target.closest('[data-drop], .tray'); if (!z) return; e.preventDefault();
      const st = P.stages.find(s => s.id === drag.k); const tgt = st.kind === 'group' ? P.resp[drag.k].assign : P.resp[drag.k];
      if (z.classList.contains('tray')) delete tgt[drag.i]; else tgt[drag.i] = st.kind === 'group' ? +z.dataset.drop : z.dataset.drop;
    } else {
      const z = e.target.closest('[data-drag="order"]'); if (!z) return; e.preventDefault();
      const st = P.stages[P.stageIdx].kind === 'order' ? P.stages[P.stageIdx] : P.stages.find(s => s.kind === 'order'); const o = P.resp[st.id]; const [m] = o.splice(drag.pos, 1); o.splice(+z.dataset.pos, 0, m);
    }
    drag = null; render(); saveDraft();
  });

  U.routes.play = () => { if (!P) { if (S.draft && S.sessions[S.draft.sessionId]) { open(S.draft.sessionId); } else { setTimeout(() => location.hash = '#home'); return ''; } } setTimeout(render); return '<p class="muted">Loading…</p>'; };
  window.MWP = { open, leave, get state() { return P; } };
})();
