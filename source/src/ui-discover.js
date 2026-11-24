/* MINDWORK — Thinking Abilities (Think), Abilities Overview (Progress), Search (top bar), Exercise Library filters. */
(function () {
  const E = window.MW, U = window.MWUI, A = window.MWA, SR = window.MWSearch;
  const { S, esc, $, glyph, catOf, CATC, toast, fmtDate } = U;
  const state = () => ({ attempts: S.attempts, sessions: S.sessions, slog: S.slog || [], journal: S.journal || [], books: S.books || [], maps: S.maps || [], links: S.links || [], puzzles: S.plog || [], obs: S.olog || [], ai: S.ai || [], extra: S.extra || {}, comp: S.comp || [] });
  const STAGE_NAMES = Object.fromEntries(A.STAGES.map(s => [s.id, s.name]));
  const ladder = r => `<ol class="ladder" aria-label="Evidence stages">${['exposure', 'independent', 'unfamiliar', 'consistent'].map(s => `<li class="${r.met[s] ? 'met' : ''}" title="${esc(STAGE_NAMES[s])}"><span class="sr">${esc(STAGE_NAMES[s])}: ${r.met[s] ? 'shown' : 'not yet'}</span></li>`).join('')}</ol>`;

  // ───────── Think › Thinking Abilities
  U.routes.abilities = id => {
    const ov = A.overview(state()); const byId = Object.fromEntries(ov.map(r => [r.ability.id, r]));
    if (!id) return `<header class="page-head"><a href="#think" class="link">Think</a><h1 class="display sm">Thinking Abilities</h1><p class="lede">Twelve ways of thinking, and the activities across MINDWORK that train each one. Choosing an activity opens the original in its home environment.</p></header>
      <section class="ability-grid">${A.ABILITIES.map(a => { const act = A.activitiesFor(a.id); const r = byId[a.id]; const n = act.games.length + act.study.length + act.puzzles.length;
        return `<a class="ability" href="#abilities-${a.id}"><strong>${esc(a.name)}</strong><span>${esc(a.blurb)}</span>${ladder(r)}<span class="ab-meta">${r.stage ? 'Shown: ' + esc(STAGE_NAMES[r.stage].toLowerCase()) : 'No evidence yet'} · ${n ? `${n} activit${n === 1 ? 'y' : 'ies'}` : 'not yet trained directly'}</span></a>`; }).join('')}</section>
      <p class="muted small">The four marks show the evidence stages your recorded work has reached: exposure, independent application, unfamiliar situations, and consistency across contexts. <a class="link" href="#overview">See the details in Progress</a>.</p>`;
    const a = A.AB[id]; if (!a) return '<section class="panel"><p>Unknown ability.</p><a class="btn" href="#abilities">Thinking Abilities</a></section>';
    const act = A.activitiesFor(id); const r = byId[id];
    const gameRow = g => { const c = catOf(E.GAME[g.id].cat); const n = S.attempts.filter(x => x.game === g.id && x.status !== 'skipped').length; return `<li><span class="dot" style="--c:${CATC[c.color]}"></span><span><strong>${esc(g.name)}</strong> <span class="muted small">${esc(E.GAME[g.id].deep ? 'Deep Thinking' : c.name)}${g.primary ? ' · main ability trained' : ''}${n ? ` · played ${n}×` : ' · not tried yet'}</span></span><button class="btn small" data-action="${E.GAME[g.id].deep ? 'mode' : 'play'}" data-game="${g.id}" data-mode="deep">Play</button></li>`; };
    return `<header class="page-head"><a href="#abilities" class="link">Thinking Abilities</a><h1 class="display sm">${esc(a.name)}</h1><p class="lede">${esc(a.blurb)}</p></header>
      <div class="ab-body"><section class="panel"><h2>What it develops</h2><ul class="plain-list">${a.develops.map(d => `<li>${esc(d)}</li>`).join('')}</ul>
        ${act.games.length ? `<div class="row"><button class="btn primary" data-action="ab-practise" data-id="${a.id}">Practise ${esc(a.name.toLowerCase())}</button><span class="muted small">Three exercises chosen at your level, favouring ones you haven’t done recently.</span></div>` : ''}</section>
      <section class="panel"><h2>Your evidence</h2>${ladder(r)}<ul class="stage-list">${A.STAGES.map(s => `<li class="${r.met[s.id] ? 'met' : ''}"><strong>${esc(s.name)}</strong> ${r.met[s.id] ? '<span class="ok">shown</span>' : '<span class="muted">not yet</span>'}<span class="muted small">${esc(s.rule)}</span></li>`).join('')}</ul><p class="muted small">From ${r.counts.events} recorded piece${r.counts.events === 1 ? '' : 's'} of evidence. Stages describe what you have shown in these activities, by fixed rules, not your ability in general.</p></section></div>
      ${act.games.length ? `<section class="panel"><h2>Exercises that train it</h2><ul class="ab-acts">${act.games.map(gameRow).join('')}</ul></section>` : ''}
      ${act.study.length ? `<section class="panel"><h2>In the Study Lab</h2><ul class="ab-acts">${act.study.map(s => `<li><span class="dot" style="--c:var(--blue)"></span><span><strong>${esc(s.name)}</strong> <span class="muted small">on any of your books${s.primary ? ' · main ability trained' : ''}</span></span><a class="btn small" href="#study">Open the Study Lab</a></li>`).join('')}</ul></section>` : ''}
      ${act.puzzles.length ? `<section class="panel"><h2>In the Puzzle Arena</h2><ul class="ab-acts">${act.puzzles.map(s => `<li><span class="dot" style="--c:var(--purple)"></span><span><strong>${esc(s.name.replace('Puzzle Arena: ', ''))}</strong> <span class="muted small">${s.count} puzzles${s.primary ? ' · main ability trained' : ''}</span></span><a class="btn small" href="#arena-${s.id}">Open</a></li>`).join('')}</ul></section>` : ''}
      ${act.other.length ? `<section class="panel"><h2>Also counted</h2><ul class="plain-list">${act.other.map(o => `<li>${esc(o)}</li>`).join('')}</ul></section>` : ''}
      ${!act.games.length && !act.study.length && !act.puzzles.length ? `<section class="panel"><h2>Not yet trained directly</h2><p>No built activity has ${esc(a.name.toLowerCase())} as one of its abilities yet. ${act.planned ? esc(act.planned) + ' will train it directly.' : ''} Integrated Challenges touch on it, but are not counted as evidence for it.</p></section>` : act.planned ? `<p class="muted small">Also coming: ${esc(act.planned)}.</p>` : ''}`;
  };

  // ───────── Progress › Abilities Overview
  U.routes.overview = () => {
    const ov = A.overview(state());
    return `<header class="page-head"><a href="#progress-home" class="link">Progress</a><h1 class="display sm">Abilities Overview</h1>
      <p class="disclaimer">Each ability moves through evidence stages only when your recorded work meets a fixed rule. Completing many exercises of one kind is not enough on its own, and a stage says nothing about ability outside these activities. Guided practice is recorded but not required.</p></header>
      <section class="panel"><div class="table-wrap"><table class="ov-table"><thead><tr><th scope="col">Ability</th><th scope="col">Stages shown</th><th scope="col">Evidence</th><th scope="col">What would show the next stage</th></tr></thead><tbody>
      ${ov.map(r => { const nx = r.next ? A.STAGES.find(s => s.id === r.next) : null; return `<tr><th scope="row"><a href="#abilities-${r.ability.id}">${esc(r.ability.name)}</a></th><td>${ladder(r)}<span class="small">${r.stage ? esc(STAGE_NAMES[r.stage]) : 'None yet'}${r.met.guided ? ' · guided practice recorded' : ''}</span></td><td class="small">${r.counts.events} pieces · ${r.counts.successes} done well without hints · ${r.counts.activities} activit${r.counts.activities === 1 ? 'y' : 'ies'} · ${r.counts.environments} environment${r.counts.environments === 1 ? '' : 's'}</td><td class="small">${nx ? esc(nx.rule) : 'All stages shown. Keep it current: recent work counts.'}</td></tr>`; }).join('')}</tbody></table></div></section>
      ${window.MWC ? `<section class="panel"><h2>Communication skills</h2><p class="muted small">Each area of Communicate has its own seven-stage pathway, from understanding the skill to showing it consistently. Understanding and recognising are tracked separately from doing.</p><div class="table-wrap"><table class="ov-table"><thead><tr><th scope="col">Area</th><th scope="col">Pathway</th><th scope="col">Evidence</th></tr></thead><tbody>${window.MWC.AREAS.map(a => { const p = window.MWC.pathway(a.id, S.clog || []); return `<tr><th scope="row"><a href="#area-${a.id}">${esc(a.name)}</a></th><td><ol class="ladder seven">${window.MWC.STAGES.map(([k]) => `<li class="${p.met[k] ? 'met' : ''}"></li>`).join('')}</ol><span class="small">${p.stage ? esc(Object.fromEntries(window.MWC.STAGES)[p.stage]) : 'Not started'}</span></td><td class="small">${p.counts.recognised} recognised · ${p.counts.roleplays} role-plays · ${p.counts.independent} done well on your own · ${p.counts.real} real-life tries</td></tr>`; }).join('')}</tbody></table></div></section>` : ''}
      <section class="panel"><h2>How the stages work</h2><ol class="plain-num">${A.STAGES.map(s => `<li><strong>${esc(s.name)}.</strong> ${esc(s.rule)}</li>`).join('')}</ol>
        <p class="muted small">“Done well” uses the feedback dimensions that matter for that ability (for example reasoning and nuance for critical thinking) at 2.8 or above out of 4, with no hints. Intuitive and metacognitive evidence comes from calibration: whether your rating before feedback, or your confidence before checking in the Study Lab, matched the result. Reflective evidence comes from Replay reflections, journal explorations and revisions that improved an answer.</p></section>`;
  };

  // ───────── Search
  let lastQ = '';
  U.routes.search = () => `<header class="page-head"><h1 class="display sm">Search</h1><p class="lede">Find any environment, game, exercise, ability, book or chapter. Journal entries are found but never shown by their text.</p></header>
    <label class="field search-big"><span class="sr">Search MINDWORK</span><input id="q" type="search" autocomplete="off" placeholder="Try “weak link”, “negotiation”, “backup” or a book title" value="${esc(lastQ)}"></label>
    <div id="results" role="region" aria-live="polite" aria-label="Search results"></div>`;
  U.routes.search.after = () => { const q = $('#q'); q.focus(); const go = () => { lastQ = q.value; renderResults(q.value); }; q.addEventListener('input', go); q.addEventListener('keydown', e => { if (e.key === 'Enter') { const f = $('#results .res'); if (f) f.click(); } }); if (q.value) go(); };
  function renderResults(q) {
    const box = $('#results'); if (!box) return;
    if (!q.trim()) { box.innerHTML = ''; return; }
    const res = SR.query(SR.buildIndex(state(), U.DESTS), q, 40);
    if (!res.length) { box.innerHTML = `<p class="muted">Nothing matches “${esc(q)}”. ${(S.books || []).length ? 'To search inside your books’ text, use the search in the <a class="link" href="#study">Study Lab</a>.' : ''}</p>`; return; }
    const groups = {}; res.forEach(o => (groups[o.kind] = groups[o.kind] || []).push(o));
    box.innerHTML = Object.entries(groups).map(([k, arr]) => `<section class="res-group"><h2 class="res-kind">${esc(k)}</h2><ul class="res-list">${arr.map(o => o.action ? `<li><button class="res" data-action="${o.action.action}" ${o.action.game ? `data-game="${o.action.game}"` : ''} ${o.action.item ? `data-item="${o.action.item}"` : ''}><strong>${esc(o.title)}</strong><span>${esc(o.body)}</span></button></li>` : `<li><a class="res" href="${o.href}"><strong>${esc(o.title)}</strong><span>${esc(o.body)}</span></a></li>`).join('')}</ul></section>`).join('') + ((S.books || []).length ? '<p class="muted small">Book text itself is searched in the <a class="link" href="#study">Study Lab</a>.</p>' : '');
  }
  document.addEventListener('keydown', e => { if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName) && !document.activeElement.isContentEditable) { e.preventDefault(); location.hash = '#search'; } });

  // ───────── practise one ability
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-action="ab-practise"]'); if (!t) return;
    const act = A.activitiesFor(t.dataset.id).games.filter(g => !E.GAME[g.id].deep); const now = Date.now(); const R0 = E.rng('ab-' + t.dataset.id + now);
    const pool = act.filter(g => g.primary).concat(act.filter(g => !g.primary)); const pickG = pool.slice(0, 5).sort(() => R0() - 0.5).slice(0, 3);
    const hist = U.history(); const items = pickG.map(g => { const it = E.chooseItem(g.id, E.skillLevel(S.profile, E.GAME[g.id].skill), hist, R0, now); return it ? { game: g.id, itemId: it.id, state: 'pending' } : null; }).filter(Boolean);
    U.startSession({ id: 'ab-' + t.dataset.id + '-' + now, type: 'ability', createdAt: now, objective: `Practising ${A.AB[t.dataset.id].name.toLowerCase()}: ${A.AB[t.dataset.id].blurb.toLowerCase()}`, items, minutes: items.length * 4 });
  });

  // ───────── Exercise Library: filter by ability and by "not tried yet"
  U.libFilter = { ability: '', untried: false };
  U.libOk = g => { const f = U.libFilter; if (f.ability && !(A.GAME_TAGS[g.id] || []).includes(f.ability)) return false; if (f.untried && S.attempts.some(a => a.game === g.id && a.status !== 'skipped')) return false; return true; };
  U.libControls = () => `<div class="row lib-filters"><label class="sel">Ability <select id="libAb"><option value="">All abilities</option>${A.ABILITIES.map(a => `<option value="${a.id}" ${U.libFilter.ability === a.id ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select></label><label class="check inline"><input type="checkbox" id="libUntried" ${U.libFilter.untried ? 'checked' : ''}><span>Not tried yet</span></label></div>`;
  document.addEventListener('change', e => { if (e.target.id === 'libAb') { U.libFilter.ability = e.target.value; U.route(); } else if (e.target.id === 'libUntried') { U.libFilter.untried = e.target.checked; U.route(); } });
})();
