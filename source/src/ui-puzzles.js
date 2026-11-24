/* MINDWORK — Puzzle Arena (in Think). */
(function () {
  const U = window.MWUI, Z = window.MWPZ;
  const { S, DB, esc, $, toast, confirmDlg, glyph } = U;
  S.plog = [];
  U.onLoad.push(async () => { S.plog = (await DB.get('kv', 'puzzlelog')) || []; SET = (await DB.get('kv', 'puzzle-set')) || null; });
  const saveLog = () => DB.put('kv', 'puzzlelog', S.plog).catch(e => toast('Couldn’t save: ' + ((e && e.message) || 'storage error')));
  let SET = null; const saveSet = () => DB.put('kv', 'puzzle-set', SET).catch(() => {});
  const CONF = [['3', 'Sure'], ['2', 'Fairly sure'], ['1', 'Unsure'], ['0', 'Guessing']];
  const COL = { ink: 'var(--ink)', blue: 'var(--blue)', pink: 'var(--pink)', purple: 'var(--purple)' };
  const best = pid => { const es = S.plog.filter(e => e.pid === pid); return es.find(e => e.outcome === 'sound') || es.find(e => e.solved) || es[es.length - 1] || null; };
  const status = pid => { const b = best(pid); return !b ? 'New' : b.outcome === 'sound' ? 'Solved with sound reasoning' : b.solved ? 'Solved' : b.outcome === 'revealed' ? 'Solution revealed' : 'Attempted'; };

  // ───────── arena home and categories
  U.routes.arena = cat => {
    if (cat) { const c = Z.CAT[cat]; if (!c) return '<section class="panel"><p>Unknown category.</p></section>';
      return `<header class="page-head"><a href="#arena" class="link">Puzzle Arena</a><h1 class="display sm">${esc(c.name)}</h1><p class="lede">${esc(c.blurb)}</p></header>
        <section class="pz-list">${Z.PUZZLES.filter(p => p.cat === cat).sort((a, b) => a.lvl - b.lvl).map(card).join('')}</section>`; }
    const solved = new Set(S.plog.filter(e => e.solved).map(e => e.pid));
    const recent = S.plog.slice(-6).reverse();
    return `<header class="page-head"><a href="#think" class="link">Think</a><h1 class="display sm">Puzzle Arena</h1><p class="lede">Hard problems to solve rather than skills to drill. Some have one answer, some several, some can’t be answered from the evidence, and one contradicts itself. Saying so is the right answer.</p></header>
      ${SET && setRemaining() ? `<section class="panel row-panel continue-strip"><div><h2>Continue your puzzle set</h2><p>${esc(SET.objective)}</p></div><a class="btn primary" href="#puzzle-${setRemaining()}">Next puzzle</a></section>` : ''}
      <section class="panel row-panel"><div><h2>Pick a puzzle</h2><p class="muted">${solved.size} of ${Z.PUZZLES.length} solved.</p></div><div class="row tight"><button class="btn primary" data-action="pz-next">Next unsolved, easiest first</button><button class="btn" data-action="pz-random">Random puzzle</button></div></section>
      <section class="cat-grid big">${Z.CATS.map(c => { const all = Z.PUZZLES.filter(p => p.cat === c.id); const n = all.filter(p => solved.has(p.id)).length; return `<a class="cat-tile" href="#arena-${c.id}" style="--c:var(--purple)">${glyph(c.id === 'strategic' ? 'stack' : c.id === 'spatial' ? 'prism' : c.id === 'visual' ? 'lens' : 'nodes', 36)}<strong>${esc(c.name)}</strong><span>${esc(c.blurb)}</span><span class="count">${n} of ${all.length} solved</span></a>`; }).join('')}</section>
      ${Z.PUZZLES.filter(p => p.boss).map(p => `<section class="panel row-panel boss"><div><span class="mini">Boss puzzle</span><h2>${esc(p.title)}</h2><p>${esc(p.prompt)}</p></div><a class="btn primary" href="#puzzle-${p.id}">${status(p.id) === 'New' ? 'Enter' : 'Try again'}</a></section>`).join('')}
      ${recent.length ? `<section class="panel"><h2>Recent attempts</h2><ul class="recent">${recent.map(e => `<li><span class="dot" style="--c:var(--purple)"></span><a href="#puzzle-${e.pid}">${esc((Z.PZ[e.pid] || {}).title || e.pid)}</a><span class="muted">${esc(Z.OUTCOMES[e.outcome] || 'In progress')}${e.hints ? ` · ${e.hints} hint${e.hints > 1 ? 's' : ''}` : ''}</span><span class="muted">${U.fmtDate(e.t)}</span></li>`).join('')}</ul></section>` : ''}`;
  };
  function card(p) { return `<a class="pz-card" href="#puzzle-${p.id}"><span class="lvl">Level ${p.lvl}${p.boss ? ' · Boss puzzle' : ''}</span><strong>${esc(p.title)}</strong><span class="muted small">${esc(kindName(p.kind))}</span><span class="pz-status">${esc(status(p.id))}</span></a>`; }
  const kindName = k => ({ answer: 'Type your answer', choice: 'Choose and justify', visual: 'Visual reasoning', grid: 'Logic grid', nim: 'Play against MINDWORK', hanoi: 'Move the discs', jugs: 'Measure with jugs', allocate: 'Allocate a budget', spot: 'Spot the differences', escape: 'Three locks' }[k] || k);

  // ───────── a puzzle in play
  let PS = null; // { pid, entryId, resp, conf, solved, phase: 'work'|'key'|'done', ... mechanic state }
  function startState(p) {
    const s = { pid: p.id, entryId: null, resp: null, phase: 'work', hints: 0, tries: 0, msg: '', challenge: false, started: Date.now() };
    if (p.kind === 'nim') Object.assign(s, { n: p.start, log: [] });
    if (p.kind === 'hanoi') Object.assign(s, { pegs: Z.hanoiStart(p.discs), sel: null, moves: 0 });
    if (p.kind === 'jugs') Object.assign(s, { j: [0, 0], moves: 0 });
    if (p.kind === 'allocate') s.resp = [];
    if (p.kind === 'spot') s.resp = [];
    if (p.kind === 'grid') s.resp = {};
    if (p.kind === 'escape') Object.assign(s, { stage: 0 });
    return s;
  }
  function entry() {
    let e = S.plog.find(x => x.id === PS.entryId);
    if (!e) { const p = Z.PZ[PS.pid]; e = { id: 'pz' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), pid: p.id, cat: p.cat, lvl: p.lvl, t: Date.now(), tries: 0, hints: 0, solved: false, done: false, outcome: null, challenge: PS.challenge, sessionId: SET && SET.items.some(i => i.pid === p.id && i.state !== 'done') ? SET.id : null }; S.plog.push(e); PS.entryId = e.id; }
    return e;
  }
  U.routes.puzzle = id => {
    const p = Z.PZ[id]; if (!p) return '<section class="panel"><p>Unknown puzzle.</p><a class="btn" href="#arena">Puzzle Arena</a></section>';
    if (!PS || PS.pid !== id) PS = startState(p);
    const c = Z.CAT[p.cat]; const inSet = SET && SET.items.some(i => i.pid === id);
    return `<div class="puzzle" data-kind="${p.kind}"><header class="page-head"><a href="#arena-${p.cat}" class="link">${esc(c.name)}</a>${inSet ? ' <span class="mini">Part of your puzzle set</span>' : ''}<h1 class="display sm">${esc(p.title)}</h1><p class="muted">Level ${p.lvl}${p.boss ? ' · Boss puzzle' : ''} · ${esc(kindName(p.kind))}</p></header>
      <div class="pz-body"><div class="pz-main"><p class="q-prompt">${esc(p.prompt)}</p>
        ${p.clues ? `<ul class="evidence-board" aria-label="Evidence">${p.clues.map((cl, i) => `<li><span class="ev-n">${i + 1}</span>${esc(cl)}</li>`).join('')}</ul>` : ''}
        <div id="pzWork">${work(p)}</div><p class="hint-msg" id="pzMsg" role="status">${esc(PS.msg)}</p></div>
      <aside class="pz-side">${hintsBox(p)}</aside></div></div>`;
  };
  function hintsBox(p) {
    if (PS.phase !== 'work') return '';
    return `<div class="side-box hints"><h2>Hints</h2>${PS.challenge ? '<p class="muted small">Challenge mode: no hints for this attempt.</p>' : p.hints.slice(0, PS.hints).map((h, k) => `<p class="hint"><span>${['A nudge', 'A stronger hint', 'Nearly there'][k]}</span>${esc(h)}</p>`).join('') + (PS.hints < 3 ? `<button class="btn small ghost" data-action="pz-hint">${['Show a subtle hint', 'Show a stronger hint', 'Show a final hint'][PS.hints]}</button>` : '')}
      ${!PS.challenge && !PS.hints && !PS.tries ? '<label class="check"><input type="checkbox" id="pzChallenge"><span>Challenge mode: no hints this time</span></label>' : ''}
      <button class="btn small ghost" data-action="pz-reveal">Reveal the solution</button><p class="muted small">Hints are recorded, never penalised. Revealing ends the attempt.</p></div>`;
  }
  const confRow = () => `<div class="conf"><p id="pzc"><strong>Before you check:</strong> how sure are you?</p><div class="row" role="group" aria-labelledby="pzc">${CONF.map(([v, l]) => `<button class="btn" data-action="pz-check" data-v="${v}">${l}</button>`).join('')}</div></div>`;
  function work(p) {
    if (PS.phase === 'key') return keyHTML(p);
    if (PS.phase === 'done') return doneHTML(p);
    switch (p.kind) {
      case 'answer': return `<label class="field"><span>Your answer</span><input id="pzA" type="text" autocomplete="off" value="${esc(PS.resp || '')}"></label>${confRow()}`;
      case 'choice': case 'visual': return (p.kind === 'visual' ? `<div class="pz-figure">${figure(p.show)}</div>` : '') + `<div class="${p.kind === 'visual' ? 'pz-opts-vis' : 'choices pz-opts'}" role="radiogroup" aria-label="Options">${p.options.map((o, i) => `<button role="radio" class="choice ${p.kind === 'visual' ? 'vis-opt' : ''}" aria-checked="${PS.resp === i}" data-action="pz-pick" data-i="${i}">${p.kind === 'visual' ? figure(p.show.type === 'matrix' ? { type: 'tile', cell: o } : { type: 'poly', base: p.show.base, spec: o }) + `<span class="sr">Option ${i + 1}</span><span class="opt-n">${i + 1}</span>` : esc(o)}</button>`).join('')}</div>${confRow()}`;
      case 'grid': return `<div class="table-wrap"><table class="pz-grid"><thead><tr><th scope="col">Person</th>${p.attrs.map(a => `<th scope="col">${esc(a.name)}</th>`).join('')}</tr></thead><tbody>${p.people.map(n => `<tr><th scope="row">${esc(n)}</th>${p.attrs.map((a, k) => `<td><label class="sel"><span class="sr">${esc(n)}: ${esc(a.name)}</span><select data-gp="${esc(n)}" data-gk="${k}"><option value="">?</option>${a.values.map(v => `<option value="${esc(v)}" ${((PS.resp[n] || [])[k]) === v ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label></td>`).join('')}</tr>`).join('')}</tbody></table></div>
        <ol class="pz-clues">${p.clues.map(cl => `<li>${esc(cl)}</li>`).join('')}</ol>${confRow()}`;
      case 'allocate': { const cost = PS.resp.reduce((s, i) => s + p.items[i].cost, 0), val = PS.resp.reduce((s, i) => s + p.items[i].value, 0);
        return `<fieldset class="useful"><legend>Projects (cost in ${esc(p.unit)}, impact in people a month)</legend>${p.items.map((it, i) => `<label class="check opt"><input type="checkbox" class="pz-item" value="${i}" ${PS.resp.includes(i) ? 'checked' : ''}><span><strong>${esc(it.name)}</strong> · cost ${it.cost} · helps ${it.value}</span></label>`).join('')}</fieldset>
          <p class="pz-total ${cost > p.budget ? 'over' : ''}">Spent ${cost} of ${p.budget} · ${val} people helped${cost > p.budget ? ' · over budget' : ''}</p>${confRow()}`; }
      case 'spot': return `<div class="spot"><figure><figcaption>Original</figcaption>${scene(p, false)}</figure><figure><figcaption>Changed: select the differences</figcaption>${scene(p, true)}</figure></div><p class="muted small">${PS.resp.length} selected. Each shape can also be reached with the Tab key and selected with Enter.</p>${confRow()}`;
      case 'nim': return `<div class="nim" aria-live="polite"><p class="nim-n"><strong>${PS.n}</strong> counter${PS.n === 1 ? '' : 's'} left</p><div class="nim-row" aria-hidden="true">${'<span class="ctr"></span>'.repeat(PS.n)}</div>
        ${PS.over ? `<p class="${PS.over === 'won' ? 'ok' : 'warn'}">${PS.over === 'won' ? 'You took the last counter. You win.' : 'MINDWORK took the last counter.'}</p>${PS.over === 'lost' ? '<button class="btn" data-action="pz-nim-restart">Play again</button>' : ''}` : `<div class="row">${[1, 2, 3].filter(k => k <= PS.n).map(k => `<button class="btn" data-action="pz-nim" data-k="${k}">Take ${k}</button>`).join('')}</div>`}
        ${PS.log.length ? `<ol class="nim-log">${PS.log.map(l => `<li>${esc(l)}</li>`).join('')}</ol>` : ''}</div>`;
      case 'hanoi': return `<div class="hanoi">${PS.pegs.map((peg, i) => `<button class="peg ${PS.sel === i ? 'sel' : ''}" data-action="pz-peg" data-i="${i}" aria-label="Peg ${['left', 'middle', 'right'][i]}, ${peg.length} disc${peg.length === 1 ? '' : 's'}${PS.sel === i ? ', selected' : ''}"><span class="rod"></span>${peg.map(d => `<span class="disc" style="--w:${20 + d * 18}%"></span>`).reverse().join('')}</button>`).join('')}</div>
        <p class="muted small">${PS.moves} move${PS.moves === 1 ? '' : 's'}. Select a peg to pick up its top disc, then the peg to put it on.</p><button class="btn small ghost" data-action="pz-hanoi-reset">Start again</button>`;
      case 'jugs': return `<div class="jugs">${PS.j.map((v, i) => `<div class="jug" aria-label="${p.caps[i]}-litre jug holding ${v} litres"><div class="jug-body" style="--cap:${p.caps[i]}"><span class="water" style="height:${v / p.caps[i] * 100}%"></span></div><strong>${v} / ${p.caps[i]} L</strong></div>`).join('')}</div>
        <div class="row">${[['fillA', `Fill the ${p.caps[0]} L`], ['fillB', `Fill the ${p.caps[1]} L`], ['emptyA', `Empty the ${p.caps[0]} L`], ['emptyB', `Empty the ${p.caps[1]} L`], ['AtoB', `Pour ${p.caps[0]} L → ${p.caps[1]} L`], ['BtoA', `Pour ${p.caps[1]} L → ${p.caps[0]} L`]].map(([o, l]) => `<button class="btn small" data-action="pz-jug" data-op="${o}">${l}</button>`).join('')}</div>
        <p class="muted small">${PS.moves} step${PS.moves === 1 ? '' : 's'}.</p><button class="btn small ghost" data-action="pz-jug-reset">Start again</button>`;
      case 'escape': { const st = p.stages[PS.stage];
        return `<ol class="esc-stages">${p.stages.map((s, i) => `<li class="${i < PS.stage ? 'done' : i === PS.stage ? 'cur' : ''}"><strong>${esc(s.title)}</strong>${i < PS.stage ? `<span class="muted small">${esc(s.unlock)}</span>` : ''}</li>`).join('')}</ol>
          <section class="panel esc-now"><h2>${esc(st.title)}</h2><p class="q-prompt">${esc(st.prompt)}</p>${st.kind === 'answer' ? `<label class="field"><span>Your answer</span><input id="pzA" type="text" autocomplete="off"></label><div class="row"><button class="btn primary" data-action="pz-stage">Try it</button></div>` : `<div class="choices">${st.options.map((o, i) => `<button class="choice" data-action="pz-stage" data-i="${i}">${esc(o)}</button>`).join('')}</div>`}
          <details class="esc-hints"><summary>Hints for this lock</summary>${st.hints.map(h => `<p class="hint">${esc(h)}</p>`).join('')}</details></section>`; }
    }
    return '';
  }
  function keyHTML(p) { return `<section class="panel key-check"><p class="ok">${PS.correctMsg || 'Solved.'}</p><h2>${esc(p.key.q)}</h2><div class="choices">${p.key.options.map((o, i) => `<button class="choice" data-action="pz-key" data-i="${i}">${esc(o)}</button>`).join('')}</div><p class="muted small">This checks whether the reasoning matches, not just the answer.</p></section>`; }
  function doneHTML(p) {
    const e = S.plog.find(x => x.id === PS.entryId) || {};
    const next = SET && setRemaining();
    return `<section class="panel pz-done ${e.solved ? 'solved' : ''}"><p class="res ${e.solved ? 'correct' : 'incorrect'}">${esc(Z.OUTCOMES[e.outcome] || '')}</p>
      ${e.keyOk === false ? `<p>The decisive idea was: <strong>${esc(p.key.options[p.key.correct[0]])}</strong></p>` : ''}
      <p><strong>Answer.</strong> ${esc(p.answerText)}</p><p><strong>Why.</strong> ${esc(p.explain)}</p>
      ${e.moves != null ? `<p class="muted small">${e.moves} moves${e.optimal ? ` (minimum ${e.optimal})` : ''}.</p>` : ''}
      <label class="field labelled"><span>In your own words, how did you reason? (Optional; saved with the attempt, not marked)</span><textarea id="pzRefl" rows="3">${esc(e.reflection || '')}</textarea></label>
      <div class="row"><button class="btn" data-action="pz-refl">Save</button>${next ? `<a class="btn primary" href="#puzzle-${next}">Next puzzle in the set</a>` : SET && SET.improve && !setRemaining() ? '<a class="btn primary" href="#improve" data-action="pz-set-end">Back to the Improvement Workshop</a>' : `<button class="btn primary" data-action="pz-next">Next puzzle</button>`}<button class="btn ghost" data-action="pz-retry">Try it again</button><a class="btn ghost" href="#arena-${p.cat}">Back to ${esc(Z.CAT[p.cat].name)}</a></div></section>`;
  }
  // ───────── figures
  function shape(s, x, y, r, col) { col = col || 'var(--ink)'; if (s === 'circle') return `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}"/>`; if (s === 'square') return `<rect x="${x - r}" y="${y - r}" width="${2 * r}" height="${2 * r}" fill="${col}"/>`; return `<path d="M${x} ${y - r}L${x + r} ${y + r}L${x - r} ${y + r}Z" fill="${col}"/>`; }
  function tile(cell, sz) { if (!cell) return `<text x="${sz / 2}" y="${sz / 2 + 8}" text-anchor="middle" font-size="28" fill="var(--ink-2)">?</text>`; const pos = cell.n === 1 ? [[.5, .5]] : cell.n === 2 ? [[.3, .5], [.7, .5]] : [[.5, .28], [.28, .72], [.72, .72]]; return pos.map(([a, b]) => shape(cell.s, a * sz, b * sz, sz * 0.12)).join(''); }
  function poly(cells, cs, col) { return cells.map(([x, y]) => `<rect x="${x * cs + 4}" y="${y * cs + 4}" width="${cs - 2}" height="${cs - 2}" rx="3" fill="${col || 'var(--purple)'}"/>`).join(''); }
  function figure(f) {
    if (f.type === 'matrix') return `<svg viewBox="0 0 300 300" class="fig" role="img" aria-label="Three by three grid of shapes with the bottom-right tile missing">${f.cells.map((row, r) => row.map((c, k) => `<g transform="translate(${k * 100},${r * 100})"><rect x="4" y="4" width="92" height="92" rx="10" fill="var(--surface)" stroke="var(--line)"/>${tile(c, 100)}</g>`).join('')).join('')}</svg>`;
    if (f.type === 'tile') return `<svg viewBox="0 0 100 100" class="fig-sm" aria-hidden="true">${tile(f.cell, 100)}</svg>`;
    if (f.type === 'poly') { const c = f.spec ? Z.polyCells(f.base, f.spec) : Z.polyCells(f.base, {}); return `<svg viewBox="0 0 110 110" class="${f.spec ? 'fig-sm' : 'fig-target'}" ${f.spec ? 'aria-hidden="true"' : 'role="img" aria-label="Target shape"'}>${poly(c, 34, f.spec ? 'var(--blue)' : 'var(--purple)')}</svg>`; }
    return '';
  }
  function scene(p, right) {
    const sh = Z.spotScene(p, right);
    return `<svg viewBox="0 0 240 180" class="scene" ${right ? 'aria-label="Changed picture. Select each difference."' : 'role="img" aria-label="Original picture"'}><rect width="240" height="180" rx="10" fill="var(--surface)" stroke="var(--line)"/>${sh.map((o, i) => { if (o.hide) return right ? `<g class="spot-hit ${PS.resp.includes(i) ? 'picked' : ''}" data-spot="${i}" tabindex="0" role="button" aria-pressed="${PS.resp.includes(i)}" aria-label="Empty area ${i + 1}"><rect x="${o.x - 16}" y="${o.y - 16}" width="32" height="32" fill="transparent" stroke="${PS.resp.includes(i) ? 'var(--pink)' : 'none'}" stroke-width="2.5" rx="6"/></g>` : ''; const col = COL[o.c] || 'var(--ink)';
      const el = o.t === 'circle' ? `<circle cx="${o.x}" cy="${o.y}" r="${o.r}" fill="${col}"/>` : o.t === 'tri' ? `<path d="M${o.x} ${o.y - o.r}L${o.x + o.r} ${o.y + o.r}L${o.x - o.r} ${o.y + o.r}Z" fill="${col}"/>` : `<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" fill="${col}"/>`;
      return right ? `<g class="spot-hit ${PS.resp.includes(i) ? 'picked' : ''}" data-spot="${i}" tabindex="0" role="button" aria-pressed="${PS.resp.includes(i)}" aria-label="Shape ${i + 1}">${el}</g>` : el; }).join('')}</svg>`;
  }

  // ───────── flow
  function render() { const w = $('#pzWork'); if (!w) return; U.route(); }
  function finishSolved(p, extra) {
    const e = entry(); Object.assign(e, extra || {}); e.solved = true; PS.msg = '';
    if (p.key) { PS.phase = 'key'; PS.correctMsg = extra && extra.msg || 'Correct.'; }
    else { e.outcome = Z.classify({ correct: true, keyOk: null, conf: e.conf, revealed: false }); e.done = true; PS.phase = 'done'; setDone(p.id); }
    saveLog(); render();
  }
  function setRemaining() { if (!SET) return null; const it = SET.items.find(i => i.state !== 'done'); return it ? it.pid : null; }
  function setDone(pid) { if (!SET) return; const it = SET.items.find(i => i.pid === pid && i.state !== 'done'); if (it) { it.state = 'done'; saveSet(); } }
  document.addEventListener('click', async ev => {
    const t = ev.target.closest('[data-action]'); const spot = ev.target.closest('[data-spot]');
    if (spot && PS && PS.phase === 'work') { const i = +spot.dataset.spot; PS.resp = PS.resp.includes(i) ? PS.resp.filter(x => x !== i) : PS.resp.concat([i]); render(); setTimeout(() => { const g = document.querySelector(`[data-spot="${i}"]`); if (g) g.focus(); }); return; }
    if (!t) return; const a = t.dataset.action; if (!a.startsWith('pz-')) return;
    if (a === 'pz-next' || a === 'pz-random') { const solved = new Set(S.plog.filter(e => e.solved).map(e => e.pid)); const pool = Z.PUZZLES.filter(p => !solved.has(p.id)); const list = pool.length ? pool : Z.PUZZLES; const p = a === 'pz-random' ? list[Math.floor(Math.random() * list.length)] : list.slice().sort((x, y) => x.lvl - y.lvl)[0]; PS = null; location.hash = '#puzzle-' + p.id; return; }
    if (!PS) return; const p = Z.PZ[PS.pid];
    if (a === 'pz-hint') { PS.hints++; const e = entry(); e.hints = PS.hints; saveLog(); render(); }
    else if (a === 'pz-reveal') { if (!(await confirmDlg('Reveal the solution?', 'This ends the attempt. It is recorded as revealed, not solved, and you can try the puzzle again later.', 'Reveal', false))) return; const e = entry(); e.outcome = 'revealed'; e.done = true; e.revealed = true; PS.phase = 'done'; setDone(p.id); saveLog(); render(); }
    else if (a === 'pz-pick') { PS.resp = +t.dataset.i; render(); }
    else if (a === 'pz-check') {
      if (p.kind === 'answer') PS.resp = ($('#pzA') || {}).value || '';
      const empty = PS.resp == null || PS.resp === '' || (Array.isArray(PS.resp) && !PS.resp.length && p.kind !== 'allocate') || (p.kind === 'grid' && !Object.keys(PS.resp).length);
      if (empty) { PS.msg = p.kind === 'choice' || p.kind === 'visual' ? 'Choose an option first.' : p.kind === 'spot' ? 'Select at least one difference first.' : 'Give an answer first.'; render(); return; }
      const r = Z.check(p, PS.resp); const e = entry(); e.tries++; PS.tries = e.tries; e.conf = +t.dataset.v;
      if (e.tries === 1) { e.firstCorrect = r.correct; e.firstOverreach = !!r.overreach; }
      if (r.correct) finishSolved(p, { conf: +t.dataset.v, msg: 'Correct.' });
      else { PS.msg = r.overreach ? 'Not quite. Check whether the evidence really supports a firm conclusion.' : p.kind === 'answer' ? 'That doesn’t match the accepted answers. Try again, take a hint, or reveal the solution.' + (p.accept.tokens ? ' (Answers are matched to accepted wordings; if yours means the same, reveal the solution and compare.)' : '') : p.kind === 'allocate' && r.cost > p.budget ? 'That plan goes over budget.' : p.kind === 'allocate' ? `Within budget, but ${r.val} isn’t the most people you can help.` : p.kind === 'spot' ? `Not all of those are differences, or some are still missing (${PS.resp.length} selected).` : 'Not yet. Try again, or take a hint.'; saveLog(); render(); }
    }
    else if (a === 'pz-key') { const e = entry(); e.keyOk = p.key.correct.includes(+t.dataset.i); e.outcome = Z.classify({ correct: true, keyOk: e.keyOk, conf: e.conf, revealed: false }); e.done = true; PS.phase = 'done'; setDone(p.id); saveLog(); render(); }
    else if (a === 'pz-refl') { const e = entry(); e.reflection = $('#pzRefl').value.trim(); saveLog(); toast('Saved with this attempt.'); }
    else if (a === 'pz-retry') { PS = startState(p); render(); }
    else if (a === 'pz-key' && false) {}
    else if (a === 'pz-set-end') { SET = null; saveSet(); }
    else if (a === 'pz-nim') { const k = +t.dataset.k; PS.n -= k; PS.log.push(`You took ${k}, leaving ${PS.n}.`); if (PS.n === 0) { PS.over = 'won'; finishSolved(p, { moves: PS.log.length, msg: 'You won.' }); return; } const m = Math.min(PS.n, Z.nimMove(PS.n, p.max)); PS.n -= m; PS.log.push(`MINDWORK took ${m}, leaving ${PS.n}.`); if (PS.n === 0) { PS.over = 'lost'; const e = entry(); e.tries++; } render(); }
    else if (a === 'pz-nim-restart') { const keep = { entryId: PS.entryId, hints: PS.hints, challenge: PS.challenge }; PS = Object.assign(startState(p), keep); render(); }
    else if (a === 'pz-peg') { const i = +t.dataset.i; if (PS.sel == null) { if (!PS.pegs[i].length) { PS.msg = 'That peg is empty.'; } else PS.sel = i; render(); setTimeout(() => { const b = document.querySelector(`[data-action="pz-peg"][data-i="${i}"]`); if (b) b.focus(); }); return; }
      if (PS.sel === i) { PS.sel = null; render(); return; } const r = Z.hanoiMove(PS.pegs, PS.sel, i); PS.sel = null; if (!r.ok) { PS.msg = r.why; render(); return; } PS.pegs = r.st; PS.moves++; PS.msg = ''; entry();
      if (Z.hanoiDone(PS.pegs, p.discs)) { finishSolved(p, { moves: PS.moves, optimal: 2 ** p.discs - 1, msg: `Done in ${PS.moves} moves.` }); return; } render(); setTimeout(() => { const b = document.querySelector(`[data-action="pz-peg"][data-i="${i}"]`); if (b) b.focus(); }); }
    else if (a === 'pz-hanoi-reset') { PS.pegs = Z.hanoiStart(p.discs); PS.moves = 0; PS.sel = null; render(); }
    else if (a === 'pz-jug') { PS.j = Z.jugsDo(PS.j, t.dataset.op, p.caps); PS.moves++; entry(); if (PS.j.includes(p.target)) { finishSolved(p, { moves: PS.moves, optimal: Z.jugsMin(p.caps, p.target), msg: `Exactly ${p.target} litres in ${PS.moves} steps.` }); return; } render(); }
    else if (a === 'pz-jug-reset') { PS.j = [0, 0]; PS.moves = 0; render(); }
    else if (a === 'pz-stage') { const st = p.stages[PS.stage]; const ok = st.kind === 'answer' ? Z.checkAnswer(st.accept, ($('#pzA') || {}).value || '') : st.correct.includes(+t.dataset.i); const e = entry(); e.tries++;
      if (!ok) { PS.msg = 'The lock doesn’t open. Check your working, or open the hints for this lock.'; saveLog(); render(); return; }
      PS.msg = st.unlock; PS.stage++; if (PS.stage >= p.stages.length) { finishSolved(p, { msg: 'All three locks open.' }); return; } saveLog(); render(); }
  });
  document.addEventListener('keydown', ev => { const g = ev.target.closest && ev.target.closest('[data-spot]'); if (g && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); g.dispatchEvent(new MouseEvent('click', { bubbles: true })); } });
  document.addEventListener('change', ev => {
    if (!PS) return;
    if (ev.target.dataset.gp) { const n = ev.target.dataset.gp, k = +ev.target.dataset.gk; PS.resp[n] = PS.resp[n] || []; PS.resp[n][k] = ev.target.value; }
    else if (ev.target.classList.contains('pz-item')) { const i = +ev.target.value; PS.resp = ev.target.checked ? PS.resp.concat([i]) : PS.resp.filter(x => x !== i); render(); }
    else if (ev.target.id === 'pzChallenge') { PS.challenge = ev.target.checked; render(); }
  });
  document.addEventListener('input', ev => { if (ev.target.id === 'pzA' && PS) PS.resp = ev.target.value; });

  window.MWPZUI = { startSet: s => { SET = s; saveSet(); PS = null; location.hash = '#puzzle-' + s.items[0].pid; }, get state() { return PS; }, get set() { return SET; } };
})();
