/* MINDWORK Study Lab — concept maps, deeper activities, Knowledge Connections, Think with this chapter. */
(function () {
  const E = window.MW, U = window.MWUI, Q = window.MWS, D = window.MWSD;
  const { S, DB, esc, $, toast, confirmDlg, short, fmtDate } = U;
  S.maps = []; S.links = []; let DS = null;
  U.onLoad.push(async () => {
    S.maps = ((await DB.all('maps')) || []).sort((a, b) => b.updated - a.updated);
    S.links = ((await DB.all('links')) || []).sort((a, b) => b.t - a.t);
    DS = (await DB.get('kv', 'deep-draft')) || null;
  });
  const bookOf = id => S.books.find(b => b.id === id);
  const chTitle = (b, id) => ((b.chapters.find(c => c.id === id) || {}).title || '');
  const cite = (b, x) => [b.title, chTitle(b, x.chapterId), x.page != null ? 'p. ' + x.page : null].filter(Boolean).join(' · ');
  const srcLink = (b, x) => x.paraId ? `<a class="link small" href="#read-${b.id}.${x.chapterId}" data-para="${x.paraId}">Open in the book</a>` : '';
  const err = e => toast('Couldn’t save: ' + ((e && e.message) || 'storage error'));
  const saveMap = m => { m.updated = Date.now(); return DB.put('maps', m.id, m).catch(err); };
  const saveDS = () => DB.put('kv', 'deep-draft', DS).catch(() => {});
  const log = e => { e.id = e.id || 'dl' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); e.t = e.t || Date.now(); S.slog.push(e); return DB.put('studylog', e.id, e).catch(err); };
  const scopeFromPage = b => { const sec = [...document.querySelectorAll('.sc-s:checked')].map(x => x.value); const ch = [...document.querySelectorAll('.sc-ch:checked')].map(x => x.value); const s = ch.concat(sec.filter(x => !ch.includes(x.replace(/s\d+$/, '')))); return s.length ? s : b.chapters.map(c => c.id); };
  const studied = b => [...new Set(S.slog.filter(l => l.bookId === b.id && l.chapterId).map(l => l.chapterId))];

  // ───────── panel on the book workspace
  U.deepPanel = b => {
    const maps = S.maps.filter(m => m.bookId === b.id);
    const acts = [['map', 'Build a concept map', 'Arrange the book’s concepts and label how they relate, then compare with what the book states.'],
      ['relate', 'Explain relationships', 'Decide how two concepts relate before seeing how the book connects them.'],
      ['compare', 'Compare and contrast', 'Similarities, differences, when each applies and how they’re confused.'],
      ['why', 'Ask why', 'Recall the reasons the book gives, then reason beyond it — clearly marked.'],
      ['transfer', 'Transfer to a new situation', 'Apply a concept to a situation the book never discusses.'],
      ['cumulative', 'Cumulative challenge', 'Retrieve and connect concepts from different chapters you’ve studied.'],
      ['think', 'Think with this chapter', 'Playground exercises built from the book: challenge a claim, distinguish concepts, explain it in conversation.']];
    return `<section class="panel deep-panel"><h2>Work with the ideas</h2><p class="muted small">Uses the chapters you’ve ticked above, or the whole book if none are ticked.</p>
      <div class="deep-acts">${acts.map(([k, t, d]) => `<button class="deep-act" data-action="deep" data-kind="${k}" data-id="${b.id}"><strong>${t}</strong><span>${d}</span></button>`).join('')}</div>
      ${maps.length ? `<h3>Your concept maps</h3><ul class="plain">${maps.map(m => `<li><a href="#map-${m.id}">${esc(m.title)}</a> <span class="muted small">${m.nodes.length} concepts · ${m.edges.length} links · ${fmtDate(m.updated)}</span></li>`).join('')}</ul>` : ''}</section>`;
  };

  // ───────── concept map editor
  const GROUPS = ['var(--surface)', 'color-mix(in srgb, var(--blue) 22%, var(--surface))', 'color-mix(in srgb, var(--pink) 22%, var(--surface))', 'color-mix(in srgb, var(--purple) 22%, var(--surface))', 'color-mix(in srgb, var(--good) 22%, var(--surface))'];
  const W = 1000, H = 620;
  const nodeW = n => Math.min(320, 40 + n.label.length * 12.2);
  function newMap(b, scope) {
    const cs = D.concepts(b, scope, 9); const t = Date.now();
    const nodes = cs.map((c, i) => { const a = (i / Math.max(1, cs.length)) * Math.PI * 2 - Math.PI / 2; return { id: 'n' + i, label: c.term, x: Math.round(W / 2 + Math.cos(a) * 340), y: Math.round(H / 2 + Math.sin(a) * 220), group: 0, fromBook: true }; });
    const m = { id: 'm' + t.toString(36), bookId: b.id, scope, title: 'Concept map — ' + short([...new Set(scope.map(id => chTitle(b, id.replace(/s\d+$/, '')).replace(/^chapter \d+:\s*/i, '')))].join(', '), 60), nodes, edges: [], created: t, updated: t };
    S.maps.unshift(m); saveMap(m); return m;
  }
  let sel = null, connectFrom = null, result = null;
  U.routes.map = id => {
    const m = S.maps.find(x => x.id === id); if (!m) return '<section class="panel"><p>That map isn’t on this device.</p></section>';
    const b = bookOf(m.bookId); if (!b) return '<section class="panel"><p>The book for this map has been removed.</p></section>';
    const unused = D.concepts(b, m.scope, 24).filter(c => !m.nodes.some(n => n.label.toLowerCase() === c.term.toLowerCase()));
    const opt = (v) => m.nodes.map(n => `<option value="${n.id}" ${v === n.id ? 'selected' : ''}>${esc(n.label)}</option>`).join('');
    const s = m.nodes.find(n => n.id === sel);
    return `<div class="mapper"><header class="page-head"><a class="link" href="#book-${b.id}">${esc(b.title)}</a>
      <label class="field map-title"><span class="sr">Map title</span><input id="mapTitle" value="${esc(m.title)}"></label>
      <p class="muted small">Drag concepts to arrange them (or select one and use the arrow keys). Select a concept, choose “Connect from here”, then select another to link them. Everything can also be done with the controls on the right.</p></header>
      <div class="map-body"><div class="map-canvas"><svg id="mapSvg" viewBox="0 0 ${W} ${H}" role="application" aria-label="Concept map with ${m.nodes.length} concepts and ${m.edges.length} links">${svgInner(m)}</svg>
        ${connectFrom ? `<p class="map-hint">Connecting from “${esc((m.nodes.find(n => n.id === connectFrom) || {}).label)}” — now select the concept to link to. <button class="btn tiny" data-action="map-cancel">Cancel</button></p>` : ''}</div>
      <aside class="map-side">
        ${s ? `<section class="panel"><h2>Selected concept</h2><label class="field"><span>Name</span><input id="nodeLabel" value="${esc(s.label)}"></label>
          <label class="sel">Group <select id="nodeGroup">${GROUPS.map((g, i) => `<option value="${i}" ${s.group === i ? 'selected' : ''}>${i ? 'Group ' + i : 'None'}</option>`).join('')}</select></label>
          <div class="row"><button class="btn small primary" data-action="map-from">Connect from here</button><button class="btn small ghost" data-action="map-delnode">Remove</button></div></section>` : ''}
        <section class="panel"><h2>Add a concept</h2><div class="row tight"><label class="field grow"><span class="sr">New concept</span><input id="newNode" placeholder="Your own concept or example"></label><button class="btn small" data-action="map-add">Add</button></div>
          ${unused.length ? `<p class="muted small">From the book:</p><div class="chips">${unused.slice(0, 12).map(c => `<button class="chip" data-action="map-addbook" data-term="${esc(c.term)}">+ ${esc(c.term)}</button>`).join('')}</div>` : ''}</section>
        <section class="panel"><h2>Link two concepts</h2><label class="sel block-sel">From <select id="eFrom">${opt(connectFrom || sel)}</select></label><label class="sel block-sel">Relationship <select id="eLabel">${D.LABELS.map(l => `<option>${l}</option>`).join('')}</select></label><label class="sel block-sel">To <select id="eTo">${opt()}</select></label><div class="row"><button class="btn small primary" data-action="map-link">Add link</button></div>
          ${m.edges.length ? `<ul class="edges">${m.edges.map(e => `<li><span>${esc(lab(m, e.from))} <em>${esc(e.label)}</em> ${esc(lab(m, e.to))}</span><button class="x" data-action="map-deledge" data-e="${e.id}" aria-label="Remove link">×</button></li>`).join('')}</ul>` : ''}</section>
        <div class="row"><button class="btn" data-action="map-arrange">Tidy layout</button><button class="btn primary" data-action="map-compare">Compare with the book</button><button class="btn ghost small" data-action="map-delete">Delete map</button></div>
      </aside></div>${result ? compareHTML(b, m, result) : ''}</div>`;
  };
  const lab = (m, id) => (m.nodes.find(n => n.id === id) || {}).label || '?';
  function svgInner(m) {
    const N = id => m.nodes.find(n => n.id === id);
    const edges = m.edges.map(e => { const a = N(e.from), c = N(e.to); if (!a || !c) return ''; const mx = (a.x + c.x) / 2, my = (a.y + c.y) / 2; const st = result && (result.checked.find(x => x.edge.id === e.id) || {}).status;
      return `<g class="edge ${st ? 'st-' + st.replace(/ /g, '-') : ''}"><line x1="${a.x}" y1="${a.y}" x2="${c.x}" y2="${c.y}" marker-end="url(#arr)"/><text x="${mx}" y="${my - 6}" text-anchor="middle">${esc(e.label)}</text></g>`; }).join('');
    const nodes = m.nodes.map(n => { const w = nodeW(n); return `<g class="node ${n.id === sel ? 'sel' : ''} ${n.id === connectFrom ? 'from' : ''}" data-node="${n.id}" tabindex="0" role="button" aria-label="${esc(n.label)}${n.fromBook ? ', from the book' : ', your own'}" transform="translate(${n.x},${n.y})"><rect x="${-w / 2}" y="-28" width="${w}" height="56" rx="16" style="fill:${GROUPS[n.group || 0]}"/><text text-anchor="middle" y="7">${esc(n.label)}</text>${n.fromBook ? '' : '<circle r="4" cx="' + (w / 2 - 10) + '" cy="-12" class="own"/>'}</g>`; }).join('');
    return `<defs><marker id="arr" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="arrow"/></marker></defs>${edges}${nodes}`;
  }
  function compareHTML(b, m, r) {
    const ST = { supported: 'Stated in the book', 'mentioned together': 'Mentioned together in the book, relationship not spelled out', 'labelled differently': 'The book connects these, but its wording suggests a different relationship', 'not stated': 'Not stated in the book — may still be a sound inference of yours' };
    return `<section class="panel map-result"><h2>Your map and the book</h2><p class="muted small">There’s more than one defensible map. This only checks which of your links the book states in a sentence naming both concepts. Links it can’t find aren’t wrong; they’re yours to justify.</p>
      <p class="tally">${Object.entries(r.tally).filter(([, n]) => n).map(([k, n]) => `<span class="ck ${k.replace(/ /g, '-')}">${n} ${k}</span>`).join(' ')}</p>
      <ul class="map-checks">${r.checked.map(c => `<li class="${c.status.replace(/ /g, '-')}"><strong>${esc(lab(m, c.edge.from))} — ${esc(c.edge.label)} — ${esc(lab(m, c.edge.to))}</strong><span class="tag">${ST[c.status]}</span>${c.rels.slice(0, 2).map(x => `<blockquote>${esc(x.sentence)}<span class="muted small"> — ${esc(cite(b, x))}${x.kind !== 'mentioned together' ? ' · wording signals: ' + esc(x.kind) : ''}</span> ${srcLink(b, x)}</blockquote>`).join('')}</li>`).join('')}</ul>
      ${r.missed.length ? `<h3>Connections the book makes that your map doesn’t</h3><ul class="map-checks">${r.missed.map(x => `<li><strong>${esc(x.a)} — ${esc(x.kind)} — ${esc(x.b)}</strong><blockquote>${esc(x.sentence)}<span class="muted small"> — ${esc(cite(b, x))}</span> ${srcLink(b, x)}</blockquote></li>`).join('')}</ul>` : ''}
      ${r.isolated.length ? `<p>Not yet connected to anything: ${r.isolated.map(esc).join(', ')}.</p>` : ''}</section>`;
  }
  function svgPoint(svg, e) { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); }
  let drag = null;
  U.routes.map.after = id => {
    const m = S.maps.find(x => x.id === id); const svg = $('#mapSvg'); if (!m || !svg) return;
    const t = $('#mapTitle'); t.addEventListener('change', () => { m.title = t.value.trim() || m.title; saveMap(m); });
    const nl = $('#nodeLabel'); if (nl) nl.addEventListener('change', () => { const n = m.nodes.find(x => x.id === sel); n.label = nl.value.trim() || n.label; n.fromBook = n.fromBook && D.concepts(bookOf(m.bookId), m.scope, 40).some(c => c.term.toLowerCase() === n.label.toLowerCase()); result = null; saveMap(m); U.route(); });
    const ng = $('#nodeGroup'); if (ng) ng.addEventListener('change', () => { m.nodes.find(x => x.id === sel).group = +ng.value; saveMap(m); U.route(); });
    svg.addEventListener('pointerdown', e => { const g = e.target.closest('[data-node]'); if (!g) return; e.preventDefault(); const n = m.nodes.find(x => x.id === g.dataset.node); const p = svgPoint(svg, e); drag = { n, m, svg, dx: p.x - n.x, dy: p.y - n.y, moved: false }; try { svg.setPointerCapture(e.pointerId); } catch (er) {} });
    svg.addEventListener('keydown', e => { const g = e.target.closest('[data-node]'); if (!g) return; const n = m.nodes.find(x => x.id === g.dataset.node); const k = { ArrowLeft: [-20, 0], ArrowRight: [20, 0], ArrowUp: [0, -20], ArrowDown: [0, 20] }[e.key];
      if (k) { e.preventDefault(); n.x = Math.max(60, Math.min(W - 60, n.x + k[0])); n.y = Math.max(30, Math.min(H - 30, n.y + k[1])); svg.innerHTML = svgInner(m); saveMap(m); svg.querySelector(`[data-node="${n.id}"]`).focus(); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickNode(m, n.id); } });
  };
  window.addEventListener('pointermove', e => { if (!drag || !drag.svg.isConnected) return; const p = svgPoint(drag.svg, e); const nx = Math.max(60, Math.min(W - 60, Math.round(p.x - drag.dx))), ny = Math.max(30, Math.min(H - 30, Math.round(p.y - drag.dy))); if (Math.abs(nx - drag.n.x) + Math.abs(ny - drag.n.y) > 2) drag.moved = true; drag.n.x = nx; drag.n.y = ny; drag.svg.innerHTML = svgInner(drag.m); });
  window.addEventListener('pointerup', () => { if (!drag) return; const d = drag; drag = null; if (d.moved) saveMap(d.m); else pickNode(d.m, d.n.id); });
  window.addEventListener('pointercancel', () => { if (drag && drag.moved) saveMap(drag.m); drag = null; });
  /* first position where a new concept doesn't cover an existing one, scanning row by row */
  function freeSpot(m, label) {
    const w = nodeW({ label }); const clear = (x, y) => m.nodes.every(n => Math.abs(n.x - x) > (nodeW(n) + w) / 2 + 16 || Math.abs(n.y - y) > 56 + 16);
    for (let y = 60; y <= H - 40; y += 36) for (let x = 40 + w / 2; x <= W - 40 - w / 2; x += 24) if (clear(x, y)) return { x: Math.round(x), y };
    return { x: W / 2, y: H - 40 };
  }
  function pickNode(m, id) {
    if (connectFrom && connectFrom !== id) { const lbl = ($('#eLabel') || {}).value || 'is related to'; if (!m.edges.some(e => e.from === connectFrom && e.to === id)) m.edges.push({ id: 'e' + Date.now().toString(36), from: connectFrom, to: id, label: lbl }); connectFrom = null; result = null; saveMap(m); sel = id; U.route(); return; }
    sel = id; U.route(); const g = document.querySelector(`[data-node="${id}"]`); if (g) g.focus();
  }

  // ───────── activity runner
  U.routes.deeprun = () => {
    if (!DS) { setTimeout(() => location.hash = '#study'); return ''; }
    const b = bookOf(DS.bookId); if (!b) { DS = null; saveDS(); setTimeout(() => location.hash = '#study'); return ''; }
    const TITLE = { relate: 'Explain relationships', compare: 'Compare and contrast', why: 'Ask why', transfer: 'Transfer to a new situation', cumulative: 'Cumulative challenge' }[DS.kind];
    if (DS.i >= DS.items.length) return `<header class="page-head"><a class="link" href="#book-${b.id}">${esc(b.title)}</a><h1 class="display sm">${TITLE}</h1></header><section class="panel"><p>Done: ${DS.items.length} item${DS.items.length > 1 ? 's' : ''}. Your answers and self-checks are saved to your study history${DS.kind === 'cumulative' ? ', and the concepts’ review schedules were updated' : ''}.</p><div class="row"><button class="btn primary" data-action="deep-end">Back to the book</button></div></section>`;
    const it = DS.items[DS.i], a = DS.answers[DS.i] = DS.answers[DS.i] || {};
    return `<div class="deep-run"><header class="page-head"><a class="link" href="#book-${b.id}">${esc(b.title)}</a><h1 class="display sm">${TITLE}</h1><p class="muted">Item ${DS.i + 1} of ${DS.items.length}</p></header>${ITEM[DS.kind](b, it, a)}</div>`;
  };
  const ta = (k, label, a, rows) => `<label class="field labelled"><span>${esc(label)}</span><textarea data-dk="${k}" rows="${rows || 3}" ${a.revealed ? 'readonly' : ''}>${esc((a.f || {})[k] || '')}</textarea></label>`;
  const selfCheck = (opts) => `<div class="conf"><p><strong>Compare your answer with the book.</strong></p><div class="row">${opts.map(([v, l]) => `<button class="btn" data-action="deep-self" data-v="${v}">${l}</button>`).join('')}</div></div>`;
  const SC = [['correct', 'Matches what the book says'], ['partial', 'Partly'], ['incorrect', 'Doesn’t match'], ['beyond', 'I reasoned beyond the book']];
  const defBlock = (b, d, term) => d ? `<blockquote>${esc(d.sentence)}<span class="muted small"> — ${esc(cite(b, d))}</span> ${srcLink(b, d)}</blockquote>` : `<p class="muted small">The book doesn’t define “${esc(term)}” in a single sentence MINDWORK could find; see the passages below.</p>`;
  const ITEM = {
    relate: (b, it, a) => `<section class="panel"><p class="closed-tag">Book closed</p><p class="pair"><span>${esc(it.a)}</span><span class="amp">and</span><span>${esc(it.b)}</span></p>
        <fieldset class="seg"><legend>How do they relate?</legend>${D.LABELS.concat(['not related']).map(l => `<label><input type="radio" name="rel" value="${l}" ${(a.f || {}).rel === l ? 'checked' : ''} ${a.revealed ? 'disabled' : ''}><span>${l}</span></label>`).join('')}</fieldset>
        ${ta('explain', 'Explain the relationship. Does one depend on the other? Can one exist without the other? What changes in one when the other changes?', a, 4)}
        ${a.revealed ? `<h3>What the book says</h3>${it.evidence.map(x => `<blockquote>${esc(x.sentence)}<span class="muted small"> — ${esc(cite(b, x))} · wording signals: ${esc(x.kind)}</span> ${srcLink(b, x)}</blockquote>`).join('')}
          <p class="small">${(a.f || {}).rel && it.evidence.some(x => x.kind.split(' ')[0] === String(a.f.rel).split(' ')[0]) ? 'Your choice of relationship matches the book’s wording.' : 'The book’s wording signals a different relationship from the one you chose. Check whether you see it differently — and if so, whether the text supports your view.'}</p>${a.self ? next() : selfCheck(SC)}` : `<div class="row"><button class="btn primary" data-action="deep-reveal">Show what the book says</button></div>`}</section>`,
    compare: (b, it, a) => `<section class="panel"><p class="closed-tag">Book closed</p><p class="pair"><span>${esc(it.a)}</span><span class="amp">vs</span><span>${esc(it.b)}</span></p>
        ${ta('same', 'Similarities', a)}${ta('diff', 'Differences', a)}${ta('when', 'When does each apply?', a)}${ta('confuse', 'How might someone confuse them?', a)}${ta('interact', 'How do they interact?', a)}
        ${a.revealed ? `<h3>What the book says</h3><p class="rp-q">${esc(it.a)}</p>${defBlock(b, it.defA, it.a)}<p class="rp-q">${esc(it.b)}</p>${defBlock(b, it.defB, it.b)}${it.evidence.map(x => `<blockquote>${esc(x.sentence)}<span class="muted small"> — ${esc(cite(b, x))}</span></blockquote>`).join('')}
          <p class="muted small">Questions about when each applies, how they’re confused and how they interact may go beyond what the book says. That’s the point; just keep track of which parts are the author’s and which are yours.</p>${a.self ? next() : selfCheck(SC)}` : `<div class="row"><button class="btn primary" data-action="deep-reveal">Show what the book says</button></div>`}</section>`,
    why: (b, it, a) => `<section class="panel"><p class="closed-tag">Book closed</p><p class="q-prompt">“${esc(it.claim)} …”</p>
        ${ta('why', 'Why, according to the book? Recall the reason it gives.', a)}
        ${a.revealed ? `<h3>The book’s reasoning</h3><blockquote>${esc(it.excerpt)}<span class="muted small"> — ${esc(cite(b, it))}</span> ${srcLink(b, it)}</blockquote><p class="small">Key words from the book’s reason you used: ${esc((a.check.matched || []).join(', ') || 'none')}${a.check.missed.length ? ' · not used: ' + esc(a.check.missed.join(', ')) : ''} <span class="muted">(a wording check, not a judgement of understanding)</span></p>
          <div class="beyond"><p class="beyond-tag">Beyond the book — your own reasoning</p>${ta('cond', 'What conditions would change this outcome? What evidence would make the explanation more or less plausible?', Object.assign({}, a, { revealed: false }))}</div>${a.self ? next() : selfCheck(SC.slice(0, 3))}` : `<div class="row"><button class="btn primary" data-action="deep-reveal">Check against the book</button></div>`}</section>`,
    transfer: (b, it, a) => `<section class="panel"><p class="muted small">Extension beyond the book: the concept is the author’s; the situation is from MINDWORK’s scenario bank, so it isn’t one of the book’s examples.</p>
        <p class="pair sm"><span>${esc(it.def.term)}</span></p><div class="scenario-box"><p class="rp-q">The situation</p><p class="q-prompt">${esc(it.scenario.text)}</p></div>
        ${ta('principle', '1. Without looking: what is the principle, as the book describes it?', a)}${ta('features', '2. Which features of this situation are relevant?', a)}
        <fieldset class="seg"><legend>3. Does the concept apply here?</legend>${['Yes', 'Partly', 'No'].map(v => `<label><input type="radio" name="applies" value="${v}" ${(a.f || {}).applies === v ? 'checked' : ''} ${a.revealed ? 'disabled' : ''}><span>${v}</span></label>`).join('')}</fieldset>
        ${ta('how', '4. Explain how it applies — or why it doesn’t', a)}${ta('limits', '5. Limitations: where would applying it mislead you?', a)}
        ${a.revealed ? `<h3>The book’s description</h3>${defBlock(b, it.def, it.def.term)}<fieldset class="useful"><legend>Check honestly</legend><label class="check"><input type="checkbox" id="tPrin"><span>My recalled principle matches the book’s description</span></label><label class="check"><input type="checkbox" id="tFeat"><span>The features I named really are the defining features, not just shared words</span></label><label class="check"><input type="checkbox" id="tLim"><span>I named a genuine limitation</span></label></fieldset>
          <p class="muted small">MINDWORK can’t judge whether an application is apt; naming the concept correctly but applying it loosely is common, which is why the check asks about features, not words.</p><div class="row"><button class="btn primary" data-action="deep-transfer">Record and continue</button></div>` : `<div class="row"><button class="btn primary" data-action="deep-reveal">Check against the book</button></div>`}</section>`,
    cumulative: (b, it, a) => `<section class="panel"><p class="closed-tag">Book closed</p><p class="muted small">From ${esc(chTitle(b, it[0].chapterId))} and ${esc(chTitle(b, it[1].chapterId))}</p><p class="pair"><span>${esc(it[0].term)}</span><span class="amp">+</span><span>${esc(it[1].term)}</span></p>
        ${ta('a', `What does the book mean by “${it[0].term}”?`, a)}${ta('b', `What does the book mean by “${it[1].term}”?`, a)}${ta('link', 'How do they connect? Use both to explain something neither explains alone.', a, 4)}
        ${a.revealed ? `<h3>The book</h3><p class="rp-q">${esc(it[0].term)}</p>${defBlock(b, it[0], it[0].term)}<p class="rp-q">${esc(it[1].term)}</p>${defBlock(b, it[1], it[1].term)}
          <fieldset class="useful"><legend>How well did you recall each?</legend>${['a', 'b'].map((k, i) => `<div class="row tight"><span>${esc(it[i].term)}</span>${[['correct', 'Fully'], ['partial', 'Partly'], ['incorrect', 'Not really']].map(([v, l]) => `<label class="check inline"><input type="radio" name="cum${k}" value="${v}"><span>${l}</span></label>`).join('')}</div>`).join('')}</fieldset>
          <div class="row"><button class="btn primary" data-action="deep-cum">Record and continue</button></div>` : `<div class="row"><button class="btn primary" data-action="deep-reveal">Check against the book</button></div>`}</section>`
  };
  const next = () => `<div class="row"><button class="btn primary" data-action="deep-next">${DS.i + 1 < DS.items.length ? 'Next' : 'Finish'}</button></div>`;
  function collect(a) { a.f = a.f || {}; document.querySelectorAll('[data-dk]').forEach(x => { a.f[x.dataset.dk] = x.value; }); ['rel', 'applies'].forEach(n => { const r = document.querySelector(`input[name=${n}]:checked`); if (r) a.f[n] = r.value; }); }

  function startDeep(b, kind, scope) {
    let items = [];
    if (kind === 'relate') items = D.relationPairs(b, scope, 4);
    if (kind === 'compare') items = D.comparePairs(b, scope, 3);
    if (kind === 'why') items = D.whyItems(b, scope).slice(0, 4);
    if (kind === 'transfer') items = Q.findDefinitions(b, scope).slice(0, 2).map((d, i) => ({ def: d, scenario: D.transferScenarios(d, 1, d.term + Date.now() + i)[0] }));
    if (kind === 'cumulative') { const st = studied(b); items = D.cumulativePairs(b, st.length >= 2 ? st : b.chapters.map(c => c.id), 3); if (st.length < 2 && items.length) toast('Works best once you’ve studied two chapters; using the whole book for now.'); }
    if (!items.length) { toast({ relate: 'The book doesn’t name two of these concepts together with a clear relationship in this selection. Try more chapters.', compare: 'No pair of defined concepts was found in this selection. Try more chapters.', why: 'No explicit reasons (“because …”, “leads to …”) were found in this selection.', transfer: 'No defined concepts were found in this selection to transfer.', cumulative: 'Cumulative challenges need defined concepts in at least two chapters.' }[kind]); return; }
    DS = { kind, bookId: b.id, scope, items, i: 0, answers: {}, id: 'ds' + Date.now().toString(36) }; saveDS(); location.hash = '#deeprun'; if (location.hash === '#deeprun') U.route();
  }
  // Knowledge Connections between books (and chapters)
  let CX = null;
  const sourceFor = (b, term) => { const d = Q.findDefinitions(b).find(x => x.term.toLowerCase() === term.toLowerCase()); if (d) return Object.assign({ excerpt: d.sentence }, d); for (const x of Q.paragraphs(b)) { const s = Q.sentencesOf(x.p.text).find(s => new RegExp('\\b' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(s)); if (s) return { term, excerpt: s, bookId: b.id, chapterId: x.ch.id, paraId: x.p.id, page: x.p.page }; } return null; };
  const KINDS = ['Similar idea, different words', 'Different explanations of the same thing', 'Complementary', 'Contradictory — the authors disagree', 'A shared principle', 'Different applications of a similar framework', 'Not really related'];
  U.routes.connections = () => {
    if (S.books.length < 2) return `<header class="page-head"><a class="link" href="#study">Study Lab</a><h1 class="display sm">Knowledge Connections</h1></header><section class="panel"><p>Connections compare concepts across different books. Add a second book to begin.</p></section>`;
    CX = CX || { a: S.books[0].id, b: S.books[1].id };
    const cA = D.concepts(bookOf(CX.a) || S.books[0], null, 30), cB = D.concepts(bookOf(CX.b) || S.books[1], null, 30);
    const sug = D.suggestConnections(S.books, 8);
    const bopt = v => S.books.map(b => `<option value="${b.id}" ${v === b.id ? 'selected' : ''}>${esc(short(b.title, 50))}</option>`).join('');
    const copt = (cs, v) => cs.map(c => `<option ${v === c.term ? 'selected' : ''}>${esc(c.term)}</option>`).join('');
    return `<header class="page-head"><a class="link" href="#study">Study Lab</a><h1 class="display sm">Knowledge Connections</h1><p class="lede">Connect concepts across your books. Decide what the connection is first; then see what each book actually says.</p></header>
      <div class="cx-body"><section class="panel"><h2>Make a connection</h2>
        <div class="cx-pick"><label class="sel block-sel">Book <select id="cxBA">${bopt(CX.a)}</select></label><label class="sel block-sel">Concept <select id="cxCA">${copt(cA, CX.ta)}</select></label></div>
        <div class="cx-pick"><label class="sel block-sel">Book <select id="cxBB">${bopt(CX.b)}</select></label><label class="sel block-sel">Concept <select id="cxCB">${copt(cB, CX.tb)}</select></label></div>
        <fieldset class="seg"><legend>What kind of connection?</legend>${KINDS.map(k => `<label><input type="radio" name="cxk" value="${esc(k)}" ${CX.kind === k ? 'checked' : ''}><span>${esc(k)}</span></label>`).join('')}</fieldset>
        <label class="field"><span>Explain it before looking</span><textarea id="cxText" rows="4">${esc(CX.text || '')}</textarea></label>
        ${CX.revealed ? revealCX() : '<div class="row"><button class="btn primary" data-action="cx-reveal">Show what each book says</button></div>'}</section>
        <aside>${sug.length ? `<section class="panel"><h2>Pairs worth examining</h2><p class="muted small">Their definitions share some wording. That doesn’t mean the authors agree — finding out is your job.</p><ul class="plain">${sug.map((s, i) => `<li><button class="btn small ghost" data-action="cx-sug" data-i="${i}">${esc(s.a.term)} <span class="muted">(${esc(short(s.a.bookTitle, 24))})</span> + ${esc(s.b.term)} <span class="muted">(${esc(short(s.b.bookTitle, 24))})</span></button></li>`).join('')}</ul></section>` : ''}
        <section class="panel"><h2>Saved connections</h2>${S.links.length ? `<ul class="cx-list">${S.links.map(l => `<li><strong>${esc(l.a.term)} ↔ ${esc(l.b.term)}</strong><span class="mini">${esc(l.kind)}</span><p>${esc(l.text)}</p><p class="muted small">${esc(l.a.cite)}<br>${esc(l.b.cite)}</p><button class="btn tiny ghost" data-action="cx-del" data-id="${l.id}">Delete</button></li>`).join('')}</ul>` : '<p class="muted small">None yet.</p>'}</section></aside></div>`;
  };
  function revealCX() {
    const bA = bookOf(CX.a), bB = bookOf(CX.b); const sA = sourceFor(bA, CX.ta), sB = sourceFor(bB, CX.tb);
    const col = (b, s, t) => `<div><p class="rp-q">${esc(t)} — ${esc(b.title)}</p>${s ? `<blockquote>${esc(s.excerpt)}<span class="muted small"> — ${esc(cite(b, s))}</span> ${srcLink(b, s)}</blockquote>` : '<p class="muted">No sentence naming this concept was found.</p>'}</div>`;
    const shared = sA && sB ? [...window.MW.text.contentSet(sA.excerpt)].filter(w => window.MW.text.contentSet(sB.excerpt).has(w) && w.length > 3) : [];
    return `<div class="cx-reveal">${col(bA, sA, CX.ta)}${col(bB, sB, CX.tb)}</div><p class="small">${shared.length ? 'Shared wording in these passages: ' + esc(shared.join(', ')) + '. ' : ''}Agreement isn’t assumed. If the passages pull in different directions, record that disagreement — it’s as valuable as a match.</p>
      <label class="field"><span>Revise your explanation if what you read changes it</span><textarea id="cxAfter" rows="3">${esc(CX.after || CX.text || '')}</textarea></label><div class="row"><button class="btn primary" data-action="cx-save">Save connection</button></div>`;
  }

  // ───────── events
  document.addEventListener('click', async e => {
    const t = e.target.closest('[data-action]'); if (!t) return; const a = t.dataset.action;
    if (a === 'deep') {
      const b = bookOf(t.dataset.id); const scope = scopeFromPage(b); const k = t.dataset.kind;
      if (k === 'map') { const m = newMap(b, scope); sel = null; connectFrom = null; result = null; location.hash = '#map-' + m.id; return; }
      if (k === 'think') { const items = D.thinkItems(b, scope); if (!items.length) { toast('This selection doesn’t contain enough definitions or stated reasons to build exercises from.'); return; } const now = Date.now();
        U.startSession({ id: 'book-' + now, type: 'book', createdAt: now, objective: `Thinking with “${b.title}”: these exercises use the book’s own claims and concepts. Each shows where it comes from. Challenging the author is allowed — and useful.`, items: items.map(it => ({ game: it.game, itemId: it.id, custom: it, state: 'pending' })), minutes: items.length * 4 }); return; }
      startDeep(b, k, scope);
    }
    // map editing
    const m = location.hash.startsWith('#map-') ? S.maps.find(x => x.id === location.hash.slice(5)) : null;
    if (m) {
      if (a === 'map-add' || a === 'map-addbook') { const label = a === 'map-add' ? ($('#newNode').value || '').trim() : t.dataset.term; if (!label) { toast('Type a concept first.'); return; } if (m.nodes.some(n => n.label.toLowerCase() === label.toLowerCase())) { toast('That concept is already on the map.'); return; } const id = 'n' + Date.now().toString(36); const spot = freeSpot(m, label); m.nodes.push({ id, label, x: spot.x, y: spot.y, group: 0, fromBook: a === 'map-addbook' }); sel = id; result = null; U.route(); saveMap(m); }
      else if (a === 'map-link') { const f = $('#eFrom').value, to = $('#eTo').value; if (!f || !to || f === to) { toast('Choose two different concepts.'); return; } if (m.edges.some(x => x.from === f && x.to === to)) { toast('Those two are already linked.'); return; } m.edges.push({ id: 'e' + Date.now().toString(36), from: f, to, label: $('#eLabel').value }); result = null; U.route(); saveMap(m); }
      else if (a === 'map-deledge') { m.edges = m.edges.filter(x => x.id !== t.dataset.e); result = null; U.route(); saveMap(m); }
      else if (a === 'map-delnode') { m.nodes = m.nodes.filter(n => n.id !== sel); m.edges = m.edges.filter(x => x.from !== sel && x.to !== sel); sel = null; result = null; U.route(); saveMap(m); }
      else if (a === 'map-from') { connectFrom = sel; U.route(); }
      else if (a === 'map-cancel') { connectFrom = null; U.route(); }
      else if (a === 'map-arrange') { const n = m.nodes.length; m.nodes.forEach((x, i) => { const ang = i / n * Math.PI * 2 - Math.PI / 2; x.x = Math.round(W / 2 + Math.cos(ang) * 360); x.y = Math.round(H / 2 + Math.sin(ang) * 230); }); U.route(); saveMap(m); }
      else if (a === 'map-compare') { const b = bookOf(m.bookId); const cs = D.concepts(b, null, 60).concat(m.nodes.map(n => ({ term: n.label }))).filter((c, i, arr) => arr.findIndex(x => x.term.toLowerCase() === c.term.toLowerCase()) === i); result = D.compareMap(m, D.relations(b, null, cs));
        log({ session: m.id, bookId: b.id, chapterId: (m.scope[0] || '').replace(/s\d+$/, ''), type: 'map', concept: null, mapId: m.id, edges: m.edges.length, supported: result.tally.supported, mode: 'map' }); U.route(); setTimeout(() => { const r = $('.map-result'); if (r) r.scrollIntoView({ block: 'start' }); }, 30); }
      else if (a === 'map-delete') { if (!(await confirmDlg('Delete this map?', 'The map and its links will be removed from this device.', 'Delete map', true))) return; S.maps = S.maps.filter(x => x.id !== m.id); await DB.del('maps', m.id); location.hash = '#book-' + m.bookId; }
    }
    if (DS && a.startsWith('deep-')) {
      const b = bookOf(DS.bookId); const it = DS.items[DS.i], ans = DS.answers[DS.i] = DS.answers[DS.i] || {};
      if (a === 'deep-reveal') { collect(ans); const written = Object.entries(ans.f).filter(([k, v]) => !['rel', 'applies', 'cond'].includes(k) && String(v).trim().split(/\s+/).length >= 2); if (!written.length) { toast('Write your answer first — retrieval before checking is the point.'); return; }
        if (DS.kind === 'relate' && !ans.f.rel) { toast('Choose how they relate first.'); return; }
        if (DS.kind === 'why') ans.check = Q.check({ type: 'reasoning', expected: it.expected }, ans.f.why || '');
        ans.revealed = true; saveDS(); U.route(); }
      else if (a === 'deep-self') { collect(ans); ans.self = t.dataset.v; const res = ans.self === 'beyond' ? 'partial' : ans.self;
        const pair = DS.kind === 'why' ? null : [it.a, it.b];
        log({ session: DS.id, bookId: b.id, chapterId: DS.kind === 'why' ? it.chapterId : ((it.evidence && it.evidence[0]) || it.defA || {}).chapterId || DS.scope[0], paraId: DS.kind === 'why' ? it.paraId : ((it.evidence && it.evidence[0]) || {}).paraId, type: DS.kind === 'why' ? 'why' : DS.kind === 'relate' ? 'relation' : 'compare', concept: pair ? pair.join(' / ') : it.concept, response: JSON.stringify(ans.f), result: res, final: res, self: ans.self, method: 'self', mode: DS.kind });
        saveDS(); U.route(); }
      else if (a === 'deep-next') { DS.i++; saveDS(); U.route(); window.scrollTo(0, 0); }
      else if (a === 'deep-transfer') { collect(ans); const p = $('#tPrin').checked, f = $('#tFeat').checked, l = $('#tLim').checked; const res = p && f && l ? 'correct' : (p || f) ? 'partial' : 'incorrect';
        log({ session: DS.id, bookId: b.id, chapterId: it.def.chapterId, paraId: it.def.paraId, qid: null, type: 'application', concept: it.def.term, response: JSON.stringify(ans.f), result: res, final: res, self: res, method: 'self', mode: 'transfer', scenario: it.scenario.from, applies: ans.f.applies, limit: l });
        DS.i++; saveDS(); U.route(); window.scrollTo(0, 0); }
      else if (a === 'deep-cum') { collect(ans); const ra = (document.querySelector('input[name=cuma]:checked') || {}).value, rb = (document.querySelector('input[name=cumb]:checked') || {}).value; if (!ra || !rb) { toast('Rate your recall of both concepts.'); return; }
        for (const [d, r] of [[it[0], ra], [it[1], rb]]) {
          log({ session: DS.id, bookId: b.id, chapterId: d.chapterId, paraId: d.paraId, type: 'cumulative', concept: d.term, response: JSON.stringify(ans.f), result: r, final: r, self: r, method: 'self', mode: 'cumulative' });
          const q = (b.questions || []).find(x => x.type === 'definition' && x.concept === d.term); if (q) { const c = S.cards[q.id] || Q.newCard(q, Date.now()); S.cards[q.id] = Q.schedule(c, Q.gradeFrom(r, false), false, Date.now()); DB.put('cards', q.id, S.cards[q.id]).catch(err); }
        }
        DS.i++; saveDS(); U.route(); window.scrollTo(0, 0); }
      else if (a === 'deep-end') { const bid = DS.bookId; DS = null; saveDS(); location.hash = '#book-' + bid; }
    }
    if (a === 'cx-sug') { const s = D.suggestConnections(S.books, 8)[+t.dataset.i]; CX = { a: s.a.bookId, b: s.b.bookId, ta: s.a.term, tb: s.b.term }; U.route(); }
    else if (a === 'cx-reveal') { readCX(); if (!CX.kind) { toast('Choose what kind of connection you think it is.'); return; } if ((CX.text || '').trim().split(/\s+/).length < 6) { toast('Explain the connection in a sentence or two before looking.'); return; } CX.revealed = true; U.route(); }
    else if (a === 'cx-save') { readCX(); CX.after = $('#cxAfter').value.trim(); const bA = bookOf(CX.a), bB = bookOf(CX.b); const sA = sourceFor(bA, CX.ta) || {}, sB = sourceFor(bB, CX.tb) || {};
      const side = (b, s, term) => ({ bookId: b.id, bookTitle: b.title, term, chapterId: s.chapterId || null, page: s.page == null ? null : s.page, paraId: s.paraId || null, excerpt: s.excerpt || null, cite: s.chapterId ? cite(b, s) : b.title });
      const l = { id: 'k' + Date.now().toString(36), t: Date.now(), a: side(bA, sA, CX.ta), b: side(bB, sB, CX.tb), kind: CX.kind, before: CX.text, text: CX.after || CX.text };
      S.links.unshift(l); DB.put('links', l.id, l).catch(err); CX = { a: CX.a, b: CX.b }; toast('Connection saved.'); U.route(); }
    else if (a === 'cx-del') { if (!(await confirmDlg('Delete this connection?', 'It will be removed from this device.', 'Delete', true))) return; S.links = S.links.filter(x => x.id !== t.dataset.id); await DB.del('links', t.dataset.id); U.route(); }
  });
  function readCX() { const g = id => ($(id) || {}).value; CX.a = g('#cxBA') || CX.a; CX.b = g('#cxBB') || CX.b; CX.ta = g('#cxCA') || CX.ta; CX.tb = g('#cxCB') || CX.tb; const k = document.querySelector('input[name=cxk]:checked'); if (k) CX.kind = k.value; const tx = $('#cxText'); if (tx) CX.text = tx.value; }
  document.addEventListener('change', e => { if (['cxBA', 'cxBB'].includes(e.target.id)) { readCX(); if (e.target.id === 'cxBA') CX.ta = null; else CX.tb = null; CX.revealed = false; U.route(); } else if (['cxCA', 'cxCB'].includes(e.target.id)) { readCX(); CX.revealed = false; U.route(); } });
  document.addEventListener('input', e => { if (e.target.dataset && e.target.dataset.dk && DS) { const a = DS.answers[DS.i] = DS.answers[DS.i] || {}; a.f = a.f || {}; a.f[e.target.dataset.dk] = e.target.value; clearTimeout(DS._t); DS._t = setTimeout(saveDS, 600); } });
  window.MWDeep = { get state() { return DS; }, newMap, startDeep };
})();
