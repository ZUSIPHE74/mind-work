/* MINDWORK UI — storage, state, routing and the non-exercise views. */
(function () {
  const E = window.MW, R = window.MWR;
  const $ = (s, el) => (el || document).querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const DAY = 864e5;
  const dateKey = d => { d = d ? new Date(d) : new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const fmtDate = t => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  const ago = t => { if (!t) return 'not yet'; const d = Math.floor((Date.now() - t) / DAY); return d <= 0 ? 'today' : d === 1 ? 'yesterday' : d + ' days ago'; };

  // ───────────── Storage: IndexedDB with in-memory fallback
  const DB = window.MWStore.create(typeof indexedDB !== 'undefined' ? indexedDB : null);

  const S = { journal: [], storage: null, profile: null, attempts: [], sessions: {}, settings: { theme: 'system', textSize: 'm', motion: 'system', selfRate: true }, draft: null, ready: false };
  const save = {
    profile: () => DB.put('kv', 'profile', S.profile),
    settings: () => { DB.put('kv', 'settings', S.settings); try { localStorage.setItem('mw-prefs', JSON.stringify({ theme: S.settings.theme, textSize: S.settings.textSize, motion: S.settings.motion })); } catch (e) {} },
    draft: () => S.draft ? DB.put('kv', 'draft', S.draft) : DB.del('kv', 'draft'),
    attempt: a => DB.put('attempts', a.id, a).catch(storageErr),
    session: s => DB.put('sessions', s.id, s).catch(storageErr),
    thought: j => DB.put('journal', j.id, j).catch(storageErr)
  };
  function storageErr(e) {
    const quota = e && (e.name === 'QuotaExceededError' || /quota/i.test(e.message || ''));
    toast(quota ? 'Storage is full, so the last change wasn’t saved. Export a backup from Settings, then free space in your browser.' : 'The last change couldn’t be saved: ' + ((e && e.message) || 'storage error') + '.');
  }
  async function load() {
    await DB.open();
    try {
      S.profile = (await DB.get('kv', 'profile')) || E.emptyProfile();
      Object.assign(S.settings, (await DB.get('kv', 'settings')) || {});
      S.draft = (await DB.get('kv', 'draft')) || null;
      S.attempts = ((await DB.all('attempts')) || []).sort((a, b) => a.t - b.t);
      ((await DB.all('sessions')) || []).forEach(s => { S.sessions[s.id] = s; });
      S.journal = ((await DB.all('journal')) || []).sort((a, b) => b.updated - a.updated);
      // schema 1 → 2: keep a copy of the untouched records, then add version history without altering original fields
      const legacy = S.attempts.filter(a => !a.schema);
      if (legacy.length) {
        if (!(await DB.get('kv', 'pre-migration-v1'))) await DB.put('kv', 'pre-migration-v1', { t: Date.now(), attempts: legacy });
        S.attempts = S.attempts.map(a => a.schema ? a : R.migrateAttempt(a));
        await DB.putMany('attempts', S.attempts.filter(a => legacy.some(l => l.id === a.id)).map(a => [a.id, a]));
      }
      await DB.put('kv', 'schema', R.SCHEMA);
      for (const f of (window.MWUI.onLoad || [])) await f();
      const prevVersion = await DB.get('kv', 'appVersion');
      if (prevVersion !== APP_VERSION) {
        if (S.attempts.length || (S.books || []).length || S.journal.length) {
          try { await DB.put('kv', 'pre-upgrade', { from: prevVersion || 'version 3 or earlier', to: APP_VERSION, t: Date.now(), backup: R.buildBackup(fullState(), 'full') }); }
          catch (e) { toast('MINDWORK couldn’t keep a copy of your data before this update (storage is full). Export a full backup from Settings now.'); }
        }
        await DB.put('kv', 'appVersion', APP_VERSION);
      }
    } catch (e) { toast('Saved data couldn’t be read. You can keep practising; check Settings to export or reset.'); S.profile = S.profile || E.emptyProfile(); }
    // finalise attempts that never reached "Next" (e.g. tab closed after feedback)
    for (const a of S.attempts) if (!a.finalized && a.overall != null) { finalizeAttempt(a); }
    S.ready = true; applyPrefs();
  }
  function finalizeAttempt(a) {
    if (a.finalized) return;
    E.updateProfile(S.profile, a, a.t); a.finalized = true;
    save.attempt(a); save.profile();
  }
  const history = () => S.attempts.map(a => ({ itemId: a.itemId, game: a.game, t: a.t }));

  function applyPrefs() {
    const r = document.documentElement;
    if (S.settings.theme === 'system') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', S.settings.theme);
    r.setAttribute('data-size', S.settings.textSize);
    r.setAttribute('data-motion', S.settings.motion);
  }

  // ───────────── glyphs and visual atoms
  const CATC = { pink: 'var(--pink)', blue: 'var(--blue)', purple: 'var(--purple)', magenta: 'var(--magenta)', navy: 'var(--navy)', ink: 'var(--ink)', violet: 'var(--violet)' };
  const catOf = id => E.CATEGORIES.find(c => c.id === id);
  function glyph(kind, size) {
    size = size || 28; const st = 'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';
    const g = {
      burst: `<circle cx="16" cy="16" r="4" fill="currentColor"/><path ${st} d="M16 3v6M16 23v6M3 16h6M23 16h6M7 7l4 4M21 21l4 4M25 7l-4 4M11 21l-4 4"/>`,
      nodes: `<circle cx="7" cy="9" r="3.4" fill="currentColor"/><circle cx="25" cy="8" r="3.4" fill="currentColor"/><circle cx="16" cy="25" r="3.4" fill="currentColor"/><path ${st} d="M9.5 10.5l5 12M23 10.5l-5 12M10 8.8h12"/>`,
      lens: `<circle ${st} cx="13" cy="13" r="8"/><path ${st} d="M19 19l9 9"/><path ${st} d="M9 15l4-6 4 6z"/>`,
      prism: `<path ${st} d="M16 4l11 22H5z"/><path ${st} d="M2 15h8M22 13l8-4M22 17l8 4"/>`,
      stack: `<rect x="4" y="5" width="24" height="5" rx="2.5" fill="currentColor"/><rect x="4" y="13.5" width="17" height="5" rx="2.5" fill="currentColor" opacity=".7"/><rect x="4" y="22" width="10" height="5" rx="2.5" fill="currentColor" opacity=".45"/>`,
      needle: `<path ${st} d="M5 27L25 7"/><circle cx="25" cy="7" r="3" fill="currentColor"/><path ${st} d="M5 27h8"/>`,
      dial: `<circle ${st} cx="16" cy="16" r="11"/><path ${st} d="M16 16l6-6"/><circle cx="16" cy="16" r="2.6" fill="currentColor"/>`,
      book: `<path ${st} d="M4 7c4-2 8-2 12 1 4-3 8-3 12-1v18c-4-2-8-2-12 1-4-3-8-3-12-1z"/><path ${st} d="M16 8v18"/>`,
      loop: `<path ${st} d="M6 16a10 10 0 1 0 3-7.1"/><path ${st} d="M5 4v6h6"/><path ${st} d="M16 10v6l4 3"/>`,
      grid: `<circle cx="7" cy="7" r="3" fill="currentColor"/><circle cx="16" cy="7" r="3" fill="currentColor" opacity=".35"/><circle cx="25" cy="7" r="3" fill="currentColor"/><circle cx="7" cy="16" r="3" fill="currentColor" opacity=".35"/><circle cx="16" cy="16" r="3" fill="currentColor"/><circle cx="25" cy="16" r="3" fill="currentColor" opacity=".35"/><circle cx="7" cy="25" r="3" fill="currentColor"/><circle cx="16" cy="25" r="3" fill="currentColor" opacity=".35"/><circle cx="25" cy="25" r="3" fill="currentColor"/>`,
      quill: `<path ${st} d="M6 26c3-9 9-17 20-21-2 9-8 16-17 18"/><path ${st} d="M6 26l7-7"/>`,
      waves: `<path ${st} d="M3 12c4-6 9-6 13 0s9 6 13 0"/><path ${st} d="M3 21c4-6 9-6 13 0s9 6 13 0" opacity=".55"/>`
    }[kind] || '';
    return `<svg class="glyph" width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true">${g}</svg>`;
  }
  const SKILL_POS = { idea: [0.18, 0.30], divergent: [0.36, 0.14], flex: [0.58, 0.18], convo: [0.86, 0.34], verbal: [0.80, 0.70], nuance: [0.58, 0.84], organise: [0.34, 0.80], connect: [0.14, 0.62], critical: [0.38, 0.44], meta: [0.64, 0.56] };
  const SKILL_LINKS = [['idea', 'divergent'], ['divergent', 'flex'], ['flex', 'convo'], ['convo', 'verbal'], ['verbal', 'nuance'], ['nuance', 'organise'], ['organise', 'connect'], ['connect', 'idea'], ['critical', 'meta'], ['critical', 'connect'], ['critical', 'nuance'], ['meta', 'flex'], ['meta', 'verbal'], ['critical', 'divergent']];
  const SKILL_COL = { idea: 'var(--pink)', divergent: 'var(--pink)', flex: 'var(--magenta)', convo: 'var(--violet)', verbal: 'var(--ink)', nuance: 'var(--ink)', organise: 'var(--navy)', connect: 'var(--blue)', critical: 'var(--purple)', meta: 'var(--purple)' };
  function constellation(profile, opts) {
    opts = opts || {}; const W = opts.w || 520, H = opts.h || 360;
    const p = id => [SKILL_POS[id][0] * W, SKILL_POS[id][1] * H];
    const sk = profile.skills;
    const lines = SKILL_LINKS.map(([a, b]) => { const [x1, y1] = p(a), [x2, y2] = p(b); const on = sk[a].n && sk[b].n; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="c-line${on ? ' on' : ''}"/>`; }).join('');
    const nodes = E.SKILLS.map(s => {
      const [x, y] = p(s.id), v = sk[s.id]; const r = v.ema == null ? 13 : 12 + v.ema * 6.5;
      const fill = v.ema == null ? 'none' : SKILL_COL[s.id];
      return `<g class="c-node" transform="translate(${x},${y})"><circle r="${r}" fill="${fill}" stroke="${SKILL_COL[s.id]}" stroke-width="2" ${v.ema == null ? 'stroke-dasharray="3 4"' : ''} class="${v.ema == null ? 'hollow' : ''}"/>${v.n ? `<text class="c-lvl" y="4" text-anchor="middle">${v.level}</text>` : ''}<text class="c-label" y="${r + 17}" text-anchor="middle">${esc(s.label)}</text><title>${esc(s.name)}</title></g>`;
    }).join('');
    const label = E.SKILLS.map(s => `${s.name}: ${sk[s.id].n ? 'level ' + sk[s.id].level + ', indicator ' + (sk[s.id].ema != null ? sk[s.id].ema.toFixed(1) : '–') + ' of 4' : 'not practised yet'}`).join('; ');
    return `<svg class="constellation" viewBox="-10 -10 ${W + 20} ${H + 30}" role="img" aria-label="Skill constellation. ${esc(label)}">${lines}${nodes}</svg>`;
  }
  function spark(hist, w, h) {
    w = w || 120; h = h || 30; const pts = hist.filter(x => x.w >= 1).slice(-14);
    if (pts.length < 2) return `<svg width="${w}" height="${h}" aria-hidden="true"><line x1="0" y1="${h / 2}" x2="${w}" y2="${h / 2}" class="spark-empty"/></svg>`;
    const xs = pts.map((_, i) => i / (pts.length - 1) * (w - 4) + 2), ys = pts.map(p => h - 3 - p.s / 4 * (h - 6));
    return `<svg width="${w}" height="${h}" aria-hidden="true"><polyline class="spark" points="${xs.map((x, i) => x.toFixed(1) + ',' + ys[i].toFixed(1)).join(' ')}"/><circle cx="${xs[xs.length - 1]}" cy="${ys[ys.length - 1]}" r="3" class="spark-dot"/></svg>`;
  }
  function bar(v, max) { max = max || 4; return `<span class="bar" aria-hidden="true"><span style="width:${Math.max(0, Math.min(100, v / max * 100))}%"></span></span>`; }
  const DIMNAME = { clarity: 'Clarity', specificity: 'Specificity', development: 'Development', variety: 'Variety', relevance: 'Relevance', connections: 'Connections', reasoning: 'Reasoning', nuance: 'Nuance', organisation: 'Organisation', expression: 'Expression', contribution: 'Contribution' };

  // ───────────── shell
  const APP_VERSION = '5.0.0';
  // Seven destinations (approved information architecture, 21 November 2026). Every existing address still works.
  const DESTS = [
    { id: 'today', label: 'Today', href: '#home', glyph: 'burst', purpose: 'Your starting point: today’s plan, what’s unfinished, quick starts.', envs: [] },
    { id: 'think', label: 'Think', href: '#think', glyph: 'nodes', purpose: 'Train specific abilities and explore ideas in depth.', envs: [['Cognitive Playground', '#games'], ['Observation and Memory', '#observe'], ['Puzzle Arena', '#arena'], ['Boss challenges', '#bosses'], ['Multiple Approaches', '#approaches'], ['Drawing challenges', '#draw'], ['Deep Thinking', '#deep'], ['Thinking Abilities', '#abilities'], ['Exercise Library', '#library']] },
    { id: 'learn', label: 'Learn', href: '#learn', glyph: 'book', purpose: 'Study your own books by recalling, connecting and applying them.', envs: [['Study Lab', '#study'], ['Knowledge in Action', '#kia'], ['Study sequence', '#sequence'], ['Knowledge Connections', '#connections']] },
    { id: 'communicate', label: 'Communicate', href: '#communicate', glyph: 'waves', purpose: 'Practise communicating and interacting with other people.', envs: [['Foundations', '#area-foundations'], ['Public Speaking', '#area-speaking'], ['Interpersonal', '#area-interpersonal'], ['Influence', '#area-influence'], ['Negotiation', '#area-negotiation'], ['Conflict', '#area-conflict'], ['Leadership', '#area-leadership'], ['Conversation Lab', '#convo'], ['Bilingual Lab', '#bilingual'], ['Speak with intention', '#express'], ['Group conversations', '#group'], ['Possible directions', '#flex-possible'], ['Analyse a conversation', '#analyse'], ['Tell a story', '#story']] },
    { id: 'grow', label: 'Grow', href: '#grow', glyph: 'quill', purpose: 'Internal development: what you think, feel, want and believe.', envs: [['Your character', '#character'], ['Self-Expression', '#garea-expression'], ['Self-Discovery', '#garea-discovery'], ['Emotions', '#garea-emotion'], ['Flexibility', '#garea-flexibility'], ['Attention', '#garea-attention'], ['What stands in the way', '#garea-way'], ['Thinking Journal', '#journal']] },
    { id: 'improve', label: 'Improve', href: '#improve', glyph: 'loop', purpose: 'Work on what your attempts show, then prove the change.', envs: [['Your mentor', '#mentor'], ['Improvement Workshop', '#improve']] },
    { id: 'progress', label: 'Progress', href: '#progress-home', glyph: 'prism', purpose: 'See how your abilities develop over time.', envs: [['Abilities Overview', '#overview'], ['Competencies', '#competencies'], ['Records', '#records'], ['My Progress', '#progress'], ['Thinking Patterns', '#patterns'], ['Thinking Replay', '#replay']] }];
  const DEST_OF = { home: 'today', daily: 'think', think: 'think', games: 'think', deep: 'think', library: 'think', learn: 'learn', study: 'learn', book: 'learn', read: 'learn', studyrun: 'learn', deeprun: 'learn', map: 'learn', connections: 'learn',
    abilities: 'think', arena: 'think', puzzle: 'think', explore: 'think', 'explore-run': 'think', observe: 'think', obs: 'think', bosses: 'think', approaches: 'think', fmt: 'think', kia: 'learn', garea: 'grow', gact: 'grow', feelings: 'grow', bilingual: 'communicate', blx: 'communicate', records: 'progress', competencies: 'progress', draw: 'think', express: 'communicate', sequence: 'learn', analyse: 'communicate', story: 'communicate', mentor: 'improve', group: 'communicate', 'flex-possible': 'communicate', 'flex-quick': 'communicate', 'flex-ways': 'communicate', ai: 'think', talk: 'communicate', 'talk-run': 'communicate', character: 'grow', overview: 'progress', communicate: 'communicate', convo: 'communicate', area: 'communicate', roleplay: 'communicate', draft: 'communicate', speak: 'communicate', grow: 'grow', journal: 'grow', improve: 'improve', 'progress-home': 'progress', progress: 'progress', patterns: 'progress', replay: 'progress' };
  const MENU_FIRST = ['grow', 'improve', 'progress'];
  function shell() {
    document.body.innerHTML = `
      <a class="skip" href="#main">Skip to content</a>
      <header class="topbar"><a href="#home" class="wordmark" aria-label="MINDWORK, Today">MIND<span>WORK</span></a>
        <span class="top-utils"><a href="#search" class="top-util" data-nav="search" aria-label="Search">${glyph('lens', 22)}</a><a href="#prefs" class="top-util" data-nav="prefs" aria-label="Settings">${glyph('dial', 22)}</a></span></header>
      <div class="util-bar"><a href="#search" class="util-search" data-nav="search" aria-keyshortcuts="/">${glyph('lens', 18)}<span>Search</span><kbd>/</kbd></a><a href="#prefs" class="util-settings" data-nav="prefs">${glyph('dial', 18)}<span>Settings</span></a></div>
      <nav id="nav" class="rail" aria-label="Destinations">
        <a href="#home" class="wordmark rail-mark" aria-label="MINDWORK, Today">MIND<span>WORK</span></a>
        <p class="sheet-title">All destinations</p>
        <ul class="dests">${DESTS.map(d => `<li class="dest ${MENU_FIRST.includes(d.id) ? 'menu-first' : ''}"><a href="${d.href}" data-nav="${d.id}" class="dest-link">${glyph(d.glyph, 20)}<span>${d.label}</span></a><p class="dest-purpose">${esc(d.purpose)}</p>${d.envs.length ? `<ul class="nav-envs">${d.envs.map(([n, h]) => `<li><a href="${h}">${esc(n)}</a></li>`).join('')}</ul>` : ''}</li>`).join('')}</ul>
        <div class="sheet-search"><a href="#search">${glyph('lens', 18)} Search</a></div>
        <div class="sheet-util"><a href="#prefs">${glyph('dial', 18)} Settings</a></div>
        <p class="rail-note">Everything stays on this device.</p>
      </nav>
      <main id="main" tabindex="-1"></main>
      <nav class="tabbar" aria-label="Main destinations">${DESTS.slice(0, 4).map(d => `<a href="${d.href}" data-tab="${d.id}">${glyph(d.glyph, 22)}<span>${d.label}</span></a>`).join('')}
        <button class="menu-btn" aria-expanded="false" aria-controls="nav" data-action="menu">${glyph('grid', 22)}<span>Menu</span><span class="badge" hidden aria-label="Something in Grow, Improve or Progress needs you"></span></button></nav>
      <div id="toast" role="status" aria-live="polite"></div>
      <dialog id="dlg"></dialog>`;
  }
  function toast(msg) { const t = $('#toast'); if (!t) return; t.textContent = msg; t.classList.add('show'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), 3600); }
  function confirmDlg(title, body, okLabel, danger) {
    return new Promise(res => {
      const d = $('#dlg'); d.innerHTML = `<form method="dialog" class="dlg"><h2>${esc(title)}</h2><p>${esc(body)}</p><div class="row end"><button value="no" class="btn ghost">Cancel</button><button value="yes" class="btn ${danger ? 'danger' : 'primary'}">${esc(okLabel)}</button></div></form>`;
      d.onclose = () => res(d.returnValue === 'yes'); d.showModal();
    });
  }

  // ───────────── router
  const routes = {};
  function route() {
    const h = (location.hash || '#home').slice(1); const [name, arg] = h.split('-').length > 1 && ['games', 'replay', 'journal', 'book', 'read', 'map', 'abilities', 'arena', 'puzzle', 'area', 'roleplay', 'draft', 'speak', 'ai', 'garea', 'gact', 'obs', 'blx', 'fmt', 'draw', 'analyse', 'express'].includes(h.split('-')[0]) ? [h.split('-')[0], h.slice(h.indexOf('-') + 1)] : [h, null];
    const view = routes[name] || routes.home;
    const ps = window.MWP && window.MWP.state; const playDest = ps && ps.sess ? ({ improve: 'improve', book: 'learn', convo: 'communicate', pattern: 'progress', ability: 'think' }[ps.sess.type] || 'think') : 'think';
    const dest = name === 'play' ? playDest : (DEST_OF[name] || (['prefs', 'search'].includes(name) ? name : null));
    document.querySelectorAll('[data-nav]').forEach(a => a.toggleAttribute('aria-current', a.dataset.nav === dest));
    document.querySelectorAll('[data-tab]').forEach(a => a.toggleAttribute('aria-current', a.dataset.tab === dest));
    const mbtn = $('.menu-btn'); if (mbtn) mbtn.toggleAttribute('data-current', MENU_FIRST.includes(dest));
    updateBadge();
    if (name !== 'play') window.MWP && window.MWP.leave();
    const m = $('#main'); m.innerHTML = view(arg) || ''; m.dataset.view = name;
    document.body.classList.remove('nav-open'); const mb = $('.menu-btn'); mb && mb.setAttribute('aria-expanded', 'false');
    if (!route.first) m.focus({ preventScroll: true }); route.first = false; window.scrollTo(0, 0);
    view.after && view.after(arg);
  }
  route.first = true;
  function updateBadge() {
    const b = $('.menu-btn .badge'); if (!b) return;
    const ready = (S.improve && S.improve.targets || []).some(t => t.state === 'ready');
    const open = (S.journal || []).some(j => j.status !== 'resolved');
    b.hidden = !(ready || open);
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('nav-open')) { document.body.classList.remove('nav-open'); const m = $('.menu-btn'); m.setAttribute('aria-expanded', 'false'); m.focus(); } });

  // ───────────── session helpers
  function todayDaily() {
    const key = dateKey(); const id = 'daily-' + key;
    if (!S.sessions[id]) { S.sessions[id] = E.buildDaily(key, S.profile, history()); save.session(S.sessions[id]); }
    return S.sessions[id];
  }
  function startSession(sess) { S.sessions[sess.id] = sess; save.session(sess); location.hash = '#play'; window.MWP.open(sess.id); }
  function startMode(mode, opts) { startSession(E.buildMode(mode, S.profile, history(), opts)); }
  function sessionDone(s) { return s.items.every(i => i.state === 'done' || i.state === 'skipped'); }

  // ───────────── views
  routes.home = () => {
    const d = todayDaily(); const done = d.items.filter(i => i.state === 'done').length; const all = d.items.length;
    const ins = E.insights(S.attempts, S.profile).slice(0, 3);
    const recent = S.attempts.slice(-5).reverse();
    const last14 = [...Array(14)].map((_, i) => { const day = dateKey(Date.now() - (13 - i) * DAY); return { day, n: S.attempts.filter(a => dateKey(a.t) === day).length }; });
    const maxN = Math.max(3, ...last14.map(x => x.n));
    const improved = E.SKILLS.map(s => { const h = S.profile.skills[s.id].history.filter(x => x.w >= 1); if (h.length < 4) return null; const a = h.slice(0, Math.floor(h.length / 2)), b = h.slice(Math.floor(h.length / 2)); return { s, d: b.reduce((x, y) => x + y.s, 0) / b.length - a.reduce((x, y) => x + y.s, 0) / a.length }; }).filter(Boolean).sort((a, b) => b.d - a.d);
    const weak = E.weakest(S.profile, 2, 1.5);
    const draft = S.draft && S.sessions[S.draft.sessionId] && !sessionDone(S.sessions[S.draft.sessionId]) ? S.draft : null;
    const dItem = draft && E.resolveItem(S.sessions[draft.sessionId].items[draft.index].itemId || '') ;
    return `
    <section class="hero">
      <div class="hero-copy">
        <p class="kicker">${new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1 class="display">Think it<br>through.</h1>
        <p class="lede">${esc(d.objective)}</p>
        <div class="daily-strip" aria-label="Today’s session">
          ${d.items.map((it, i) => { const g = E.GAME[it.game], c = catOf(g.cat); return `<span class="ds ${it.state}" style="--c:${CATC[c.color]}" title="${esc(g.name)}">${glyph(c.glyph, 18)}<span>${esc(g.name)}</span></span>`; }).join('')}
        </div>
        <div class="row">
          <button class="btn primary big" data-action="daily">${done === 0 ? 'Start today’s session' : done < all ? 'Continue today’s session' : 'Review today’s session'}</button>
          <span class="meta">${done} of ${all} done · about ${d.minutes} minutes</span>
        </div>
      </div>
      <div class="hero-art">${constellation(S.profile)}<a href="#progress" class="hero-art-link">Your cognitive profile</a></div>
    </section>

    <section class="grid-home">
      <div class="panel quick">
        <h2>Short on time?</h2>
        <div class="quick-actions">
          <button class="qa" data-action="mode" data-mode="quick"><strong>Quick workout</strong><span>Two short exercises, 3–5 minutes</span></button>
          <button class="qa" data-action="mode" data-mode="random"><strong>Random challenge</strong><span>One exercise from anywhere</span></button>
          <button class="qa" data-action="mode" data-mode="weakness"><strong>Weakness training</strong><span>${weak.length ? 'Targets ' + esc(weak.map(w => E.SKILLS.find(s => s.id === w).name.toLowerCase()).join(' and ')) : 'Targets your weakest skills once there’s data'}</span></button>
        </div>
        ${draft && dItem ? `<div class="continue"><h3>Continue practising</h3><p>${esc(E.GAME[dItem.game].name)} — you left this mid-way ${ago(draft.updated)}.</p><button class="btn" data-action="resume">Resume where you left off</button></div>` : ''}
      </div>

      <div class="panel insights">
        <h2>Recent insights</h2>
        <ul class="insight-list">${ins.map(i => `<li class="ins ${i.kind}">${esc(i.text)}${i.n ? `<span class="evidence">based on ${i.n} exercise${i.n === 1 ? '' : 's'}</span>` : ''}</li>`).join('')}</ul>
        <div class="split">
          <div><h3>Improving</h3>${improved.filter(x => x.d > 0.2).slice(0, 2).map(x => `<p class="pill up">${esc(x.s.name)}</p>`).join('') || '<p class="muted">Not enough history to show a change yet.</p>'}</div>
          <div><h3>Needs practice</h3>${weak.map(w => `<p class="pill down">${esc(E.SKILLS.find(s => s.id === w).name)}</p>`).join('') || '<p class="muted">Appears after a few exercises.</p>'}</div>
        </div>
      </div>
    </section>

    ${reflectPanel()}
    ${alsoPanel()}

    <section class="panel history">
      <div class="section-head"><h2>Training history</h2><span class="meta">${S.attempts.length} exercise${S.attempts.length === 1 ? '' : 's'} recorded</span></div>
      <div class="activity" role="img" aria-label="Exercises per day over the last two weeks">${last14.map(x => `<span title="${x.day}: ${x.n}" style="--h:${x.n / maxN}"></span>`).join('')}</div>
      ${recent.length ? `<ul class="recent">${recent.map(a => `<li><span class="dot" style="--c:${CATC[catOf(E.GAME[a.game].cat).color]}"></span><span>${esc(E.GAME[a.game].name)}</span><span class="muted">${esc(E.STATUS_LABEL[a.status] || a.status)}</span><span class="muted">${fmtDate(a.t)}</span></li>`).join('')}</ul>` : '<p class="muted">Nothing yet. Your first session will appear here.</p>'}
    </section>`;
  };

  function alsoPanel() {
    const due = Object.values(S.cards || {}).filter(c => c.state !== 'new' && c.due <= Date.now()).length;
    const tgt = window.MWUI.improveActive ? window.MWUI.improveActive()[0] : null;
    const LBL = window.MWI ? window.MWI.STATE_LABEL : {};
    const card = (d, line) => `<a class="short" href="${d.href}">${glyph(d.glyph, 22)}<strong>${d.label}</strong><span>${line}</span></a>`;
    const D = id => DESTS.find(x => x.id === id);
    return `<section class="also"><div class="section-head"><h2>Across MINDWORK</h2></div><div class="short-grid">
      ${card(D('improve'), tgt ? `Active target: ${esc(tgt.title)} (${esc((LBL[tgt.state] || '').toLowerCase())})` : esc(D('improve').purpose))}
      ${card(D('learn'), due ? `${due} review question${due === 1 ? '' : 's'} due in the Study Lab` : esc(D('learn').purpose))}
      ${card(D('grow'), esc(D('grow').purpose))}
      ${card(D('progress'), esc(D('progress').purpose))}
      ${card(D('think'), 'Cognitive Playground, Puzzle Arena, Deep Thinking, Thinking Abilities')}
      ${card(D('communicate'), 'Seven skill areas with role-play, writing and speaking, plus the Conversation Lab')}</div></section>`;
  }
  function reflectPanel() {
    const replays = S.attempts.filter(a => a.status !== 'skipped' && a.finalized).slice(-40).filter(a => (a.versions || []).length > 1 && !(a.reflections || []).length).slice(-3).reverse();
    const pats = S.attempts.length >= 3 ? R.patterns(S.attempts).filter(p => p.kind === 'difficulty' && (p.level === 'emerging' || p.level === 'established')).slice(0, 1) : [];
    const open = S.journal.filter(j => j.status !== 'resolved').slice(0, 2);
    if (!replays.length && !pats.length && !open.length) return '';
    return `<section class="panel reflect-home"><h2>Reflect</h2><div class="reflect-cols">
      ${replays.length ? `<div><h3>Replay your thinking</h3><p class="muted small">Exercises you revised but haven’t looked back on.</p><ul class="plain">${replays.map(a => `<li><a href="#replay-${a.id}">${esc(E.GAME[a.game].name)}</a> <span class="muted small">${a.versions.length} versions · ${fmtDate(a.t)}</span></li>`).join('')}</ul></div>` : ''}
      ${pats.length ? `<div><h3>A pattern is ${pats[0].level === 'established' ? 'recurring' : 'emerging'}</h3><p>${esc(pats[0].name)} — in ${pats[0].count} of your last ${pats[0].of} relevant exercises.</p><a class="link" href="#patterns">See the evidence</a></div>` : ''}
      ${open.length ? `<div><h3>Thinking Journal</h3><p>You have ${open.length} unfinished thought${open.length === 1 ? '' : 's'}.</p><a class="link" href="#journal">Continue in the Thinking Journal</a></div>` : ''}
    </div></section>`;
  }
  const short = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

  const envCard = (href, name, purpose, meta, gl, col) => `<a class="env-card" href="${href}" style="--c:${col || 'var(--ink)'}">${glyph(gl, 30)}<strong>${esc(name)}</strong><span>${esc(purpose)}</span>${meta ? `<span class="env-meta">${meta}</span>` : ''}</a>`;
  const destHead = id => { const d = DESTS.find(x => x.id === id); return `<header class="page-head dest-head"><h1 class="display sm">${d.label}</h1><p class="lede">${esc(d.purpose)}</p></header>`; };
  function continueStrip(filter) {
    const dr = S.draft && S.sessions[S.draft.sessionId] && !sessionDone(S.sessions[S.draft.sessionId]) ? S.draft : null;
    if (!dr || !filter(S.sessions[dr.sessionId])) return '';
    const it = S.sessions[dr.sessionId].items[dr.index]; const g = it && E.GAME[it.game];
    return g ? `<section class="panel row-panel continue-strip"><div><h2>Continue</h2><p>${esc(g.name)}, left unfinished ${ago(dr.updated)}.</p></div><button class="btn primary" data-action="resume">Resume</button></section>` : '';
  }
  routes.think = () => destHead('think') + continueStrip(s => !['improve', 'book'].includes(s.type)) + `<section class="env-grid">
      ${envCard('#games', 'Cognitive Playground', 'Targeted training of specific abilities: seven categories, 32 games, five levels per skill.', `${S.attempts.filter(a => a.status !== 'skipped').length} exercises completed`, 'nodes', 'var(--pink)')}
      ${envCard('#arena', 'Puzzle Arena', 'Hard problems to solve in nine categories, from lateral thinking to strategy and multi-stage escapes.', `${new Set((S.plog || []).filter(e => e.solved).map(e => e.pid)).size} of ${window.MWPZ ? window.MWPZ.PUZZLES.length : ''} solved`, 'stack', 'var(--purple)')}
      ${envCard('#deep', 'Deep Thinking', 'One question developed through eight stages; Challenge My Thinking; Integrated Challenges.', '', 'lens', 'var(--purple)')}
      ${envCard('#abilities', 'Thinking Abilities', 'Practise any of the 12 thinking abilities, drawing on activities across MINDWORK.', '12 abilities', 'grid', 'var(--purple)')}
      ${envCard('#library', 'Exercise Library', 'Every game, what it trains and how it is judged.', `${E.BANK.length} exercises`, 'needle', 'var(--ink)')}
      ${envCard('#daily', 'Today’s session', 'The day’s mixed session, also on Today.', '', 'stack', 'var(--blue)')}</section>
    <section class="playground"><div class="section-head"><h2>Cognitive Playground categories</h2><a href="#games" class="link">Open the Cognitive Playground</a></div>
      <div class="cat-grid">${E.CATEGORIES.map(c => `<a class="cat-tile" href="#games-${c.id}" style="--c:${CATC[c.color]}">${glyph(c.glyph, 40)}<strong>${esc(c.name)}</strong><span>${esc(c.blurb)}</span></a>`).join('')}</div></section>
    <section class="panel row-panel"><div><h2>Short on time?</h2><p class="muted">Quick workout, random challenge or weakness training.</p></div><div class="row tight"><button class="btn" data-action="mode" data-mode="quick">Quick workout</button><button class="btn" data-action="mode" data-mode="random">Random</button><button class="btn" data-action="mode" data-mode="weakness">Weakness training</button></div></section>`;
  routes.learn = () => { const due = Object.values(S.cards || {}).filter(c => c.state !== 'new' && c.due <= Date.now()).length; const nb = (S.books || []).length;
    return destHead('learn') + `<section class="env-grid">
      ${envCard('#study', 'Study Lab', 'Your books: reader, closed-book recall, spaced reviews, practice tests, concept maps and application.', `${nb} book${nb === 1 ? '' : 's'}${due ? ` · ${due} due for review` : ''}`, 'book', 'var(--blue)')}
      ${envCard('#connections', 'Knowledge Connections', 'Connect concepts across your books, then see what each author says.', nb >= 2 ? `${(S.links || []).length} saved` : 'Needs two books', 'nodes', 'var(--purple)')}</section>`; };
  routes.communicate = () => destHead('communicate') + continueStrip(s => s.type === 'convo') + `<section class="env-grid">
      ${envCard('#convo', 'Conversation Lab', 'Branching conversations and conversation games. The games are the same originals as the Cognitive Playground’s Conversational Thinking category.', `${E.itemsFor('branch').length} branching conversations`, 'waves', 'var(--violet)')}</section>`;
  routes.grow = () => { const open = (S.journal || []).filter(j => j.status !== 'resolved').length;
    return destHead('grow') + `<section class="env-grid">
      ${envCard('#journal', 'Thinking Journal', 'Capture a thought before it’s finished, then develop it over time. Private to this device.', open ? `${open} unfinished thought${open === 1 ? '' : 's'}` : `${(S.journal || []).length} entries`, 'quill', 'var(--pink)')}</section>`; };
  routes['progress-home'] = () => destHead('progress') + `<section class="env-grid">
      ${envCard('#records', 'Records and achievements', 'Level, experience, days practised, and milestones. Nothing is ever locked.', '', 'stack', 'var(--blue)')}
      ${envCard('#overview', 'Abilities Overview', 'Evidence stages for the 12 thinking abilities, from exposure to consistency across contexts.', '', 'grid', 'var(--pink)')}
      ${envCard('#progress', 'My Progress', 'Skill levels, trends, independence and your full exercise history.', '', 'prism', 'var(--ink)')}
      ${envCard('#patterns', 'Thinking Patterns', 'Recurring habits in your thinking, with the evidence behind each.', '', 'grid', 'var(--purple)')}
      ${envCard('#replay', 'Thinking Replay', 'Go back through any finished exercise and how your thinking changed.', '', 'loop', 'var(--blue)')}
      ${envCard('#study', 'Study progress', 'Reading, recall, retention and application per book, in the Study Lab.', '', 'book', 'var(--blue)')}</section>`;

  routes.daily = () => {
    const d = todayDaily(); const past = Object.values(S.sessions).filter(s => s.type === 'daily' && s.id !== d.id).sort((a, b) => b.createdAt - a.createdAt).slice(0, 10);
    return `<header class="page-head"><h1 class="display sm">Daily Practice</h1><p class="lede">${esc(d.objective)}</p></header>
      <section class="panel">
        <ol class="session-plan">${d.items.map((it, i) => { const g = E.GAME[it.game], c = catOf(g.cat); const a = it.attemptId && S.attempts.find(x => x.id === it.attemptId);
          return `<li class="${it.state}" style="--c:${CATC[c.color]}"><span class="sp-glyph">${glyph(c.glyph, 26)}</span><div><strong>${esc(g.name)}</strong><span class="muted">${esc(c.name)} · ${esc(E.SKILLS.find(s => s.id === g.skill).name)} · about ${g.minutes} min</span></div><span class="sp-state">${it.state === 'done' ? esc(E.STATUS_LABEL[a ? a.status : 'completed']) : it.state === 'skipped' ? 'Skipped' : 'To do'}</span></li>`; }).join('')}</ol>
        <div class="row"><button class="btn primary big" data-action="daily">${sessionDone(d) ? 'See today’s summary' : 'Start or continue'}</button></div>
      </section>
      <section class="panel"><h2>How sessions are built</h2><p class="prose">Each day mixes idea development, reasoning, connection or perspective, articulation and conversation. Exercises you have seen in the last ten days are held back; your level for each skill sets their difficulty, and one skill gets extra weight — the one your results show is weakest, or the one you have left longest. At higher levels, an integrated challenge combining several abilities sometimes replaces a single-skill exercise.</p></section>
      ${past.length ? `<section class="panel"><h2>Previous sessions</h2><ul class="recent">${past.map(s => `<li><span>${esc(s.date)}</span><span class="muted">${s.items.filter(i => i.state === 'done').length} of ${s.items.length} completed</span></li>`).join('')}</ul></section>` : ''}`;
  };

  routes.games = arg => {
    const cat = arg && catOf(arg);
    if (cat) {
      const gs = E.GAMES.filter(g => g.cat === cat.id && !g.deep);
      return `<header class="page-head cat-head" style="--c:${CATC[cat.color]}">${glyph(cat.glyph, 56)}<div><a href="#games" class="link">Cognitive Playground</a><h1 class="display sm">${esc(cat.name)}</h1><p class="lede">${esc(cat.blurb)}</p></div></header>
        <section class="game-list">${gs.map(g => gameCard(g, cat)).join('')}</section>`;
    }
    return `<header class="page-head"><a href="#think" class="link">Think</a><h1 class="display sm">Cognitive Playground</h1><p class="lede">Targeted training of specific abilities. Free play: Pick any category and practise without a fixed session; difficulty still follows your level for each skill.</p></header>
      <section class="cat-grid big">${E.CATEGORIES.map(c => `<a class="cat-tile" href="#games-${c.id}" style="--c:${CATC[c.color]}">${glyph(c.glyph, 48)}<strong>${esc(c.name)}</strong><span>${esc(c.blurb)}</span><span class="count">${E.GAMES.filter(g => g.cat === c.id && !g.deep).length} games</span></a>`).join('')}</section>
      <section class="panel row-panel"><div><h2>Random cognitive challenge</h2><p class="muted">One exercise from any category, at your level.</p></div><button class="btn primary" data-action="mode" data-mode="random">Surprise me</button></section>`;
  };
  function gameCard(g, cat) {
    const lv = E.skillLevel(S.profile, g.skill); const n = S.attempts.filter(a => a.game === g.id).length;
    return `<article class="game-card" style="--c:${CATC[cat.color]}"><h2>${esc(g.name)}</h2><p>${esc(g.objective)}</p>
      <p class="muted small">Trains ${esc(E.SKILLS.find(s => s.id === g.skill).name.toLowerCase())} · your level ${lv} · ${n ? 'played ' + n + '×' : 'not played yet'}</p>
      <button class="btn" data-action="play" data-game="${g.id}">Play</button></article>`;
  }

  routes.convo = () => {
    const br = E.itemsFor('branch'); const cg = ['keepgoing', 'beyondq', 'followup', 'norepeat', 'between'].map(id => E.GAME[id]);
    return `<header class="page-head"><h1 class="display sm">Conversation Lab</h1><p class="lede">Realistic exchanges. The goal is flexibility — more than one way into a conversation — not a different personality.</p></header>
      <section><h2 class="h2">Branching conversations</h2><div class="scenario-grid">${br.map(it => `<button class="scenario" data-action="item" data-item="${it.id}"><span class="lvl">Level ${it.lvl}</span><strong>${esc(it.title)}</strong><span>${esc(it.setting)}</span></button>`).join('')}</div></section>
      <section class="game-list">${cg.map(g => gameCard(g, catOf(g.cat))).join('')}</section>`;
  };

  routes.deep = () => {
    const dp = E.itemsFor('deep'), ig = E.itemsFor('integrated');
    return `<header class="page-head"><h1 class="display sm">Deep Thinking</h1><p class="lede">Longer sessions, 15–30 minutes. One question, developed through eight stages until you can say something your first answer couldn’t.</p></header>
      <section class="deep-list">${dp.map(it => `<button class="deep-q" data-action="item" data-item="${it.id}"><span class="lvl">Level ${it.lvl}</span><span class="q">${esc(it.q)}</span></button>`).join('')}</section>
      <section class="panel"><h2>Challenge my thinking</h2><p class="muted">Examine a claim: defend it, challenge it, or qualify it. Use one of ours, or bring your own.</p>
        <label class="field"><span>Your own claim (optional)</span><input id="claim" type="text" maxlength="240" placeholder="e.g. Remote work is better for creative jobs"></label>
        <div class="row"><button class="btn primary" data-action="challenge">Examine this claim</button><button class="btn ghost" data-action="mode" data-mode="challenge">Give me a claim</button></div></section>
      <section><h2 class="h2">Integrated challenges</h2><p class="muted">Situations with conflicting information that require facts, assumptions, explanations, gaps, perspectives and a position — in sequence.</p>
        <div class="scenario-grid">${ig.map(it => `<button class="scenario" data-action="item" data-item="${it.id}"><span class="lvl">Level ${it.lvl}</span><span>${esc(it.s.slice(0, 150))}…</span></button>`).join('')}</div></section>`;
  };

  routes.progress = () => {
    const P = S.profile, A = S.attempts.filter(a => a.status !== 'skipped');
    const cnt = k => A.filter(a => a.status === k).length;
    const dimAvg = {}; A.slice(-30).forEach(a => Object.entries(a.dims || {}).forEach(([k, v]) => { (dimAvg[k] = dimAvg[k] || []).push(v); }));
    const ins = E.insights(S.attempts, P);
    return `<header class="page-head"><h1 class="display sm">My Progress</h1>
      <p class="disclaimer">These numbers are internal practice indicators from 0 to 4, computed by simple rules about the structure of your answers. They are not validated psychological measures and say nothing about intelligence.</p></header>
      <section class="progress-top">
        <div class="panel">${constellation(P, { w: 560, h: 380 })}<p class="muted small">Node size reflects your recent indicator; the number is your current level (1–5) for that skill. Dashed rings haven’t been practised.</p></div>
        <div class="panel stats">
          <div class="stat"><strong>${A.length}</strong><span>exercises</span></div>
          <div class="stat"><strong>${cnt('independent')}</strong><span>independently</span></div>
          <div class="stat"><strong>${cnt('assisted')}</strong><span>with hints</span></div>
          <div class="stat"><strong>${cnt('supported')}</strong><span>with substantial help</span></div>
          <div class="stat"><strong>${cnt('attempted')}</strong><span>attempted</span></div>
          <div class="stat"><strong>${A.filter(a => a.revisions && a.revisions.length).length}</strong><span>revised after feedback</span></div>
        </div>
      </section>
      <section class="panel"><h2>Skills</h2>
        <div class="table-wrap"><table class="skill-table"><thead><tr><th scope="col">Skill</th><th scope="col">Level</th><th scope="col">Indicator</th><th scope="col">Recent trend</th><th scope="col">Practice</th><th scope="col">Last practised</th></tr></thead><tbody>
        ${E.SKILLS.map(s => { const v = P.skills[s.id]; return `<tr><th scope="row"><span class="dot" style="--c:${SKILL_COL[s.id]}"></span>${esc(s.name)}<span class="muted small block">${esc(s.blurb)}</span></th><td>${v.n ? v.level : '–'}</td><td>${v.ema != null ? bar(v.ema) + ' ' + v.ema.toFixed(1) : '<span class="muted">–</span>'}</td><td>${spark(v.history)}</td><td>${Math.round(v.n * 10) / 10}</td><td class="${v.last && Date.now() - v.last > 10 * DAY ? 'stale' : ''}">${ago(v.last)}</td></tr>`; }).join('')}
        </tbody></table></div></section>
      <section class="progress-two">
        <div class="panel"><h2>What the feedback keeps finding</h2><ul class="insight-list">${ins.map(i => `<li class="ins ${i.kind}">${esc(i.text)}${i.n ? `<span class="evidence">based on ${i.n} exercise${i.n === 1 ? '' : 's'}</span>` : ''}</li>`).join('')}</ul></div>
        <div class="panel"><h2>Dimensions, last 30 exercises</h2>${Object.keys(dimAvg).length ? `<dl class="dims">${Object.entries(dimAvg).sort((a, b) => a[1].reduce((x, y) => x + y, 0) / a[1].length - b[1].reduce((x, y) => x + y, 0) / b[1].length).map(([k, v]) => { const m = v.reduce((x, y) => x + y, 0) / v.length; return `<div><dt>${DIMNAME[k] || k}</dt><dd>${bar(m)} <span>${m.toFixed(1)}</span><span class="muted small"> (${v.length})</span></dd></div>`; }).join('')}</dl>` : '<p class="muted">Complete an exercise to see this.</p>'}</div>
      </section>
      <section class="panel"><h2>Exercise history</h2>${A.length ? `<div class="table-wrap"><table class="hist"><thead><tr><th scope="col">Date</th><th scope="col">Exercise</th><th scope="col">Level</th><th scope="col">Outcome</th><th scope="col">Hints</th><th scope="col">Revisions</th><th scope="col">Indicator</th></tr></thead><tbody>${A.slice(-40).reverse().map(a => `<tr><td>${fmtDate(a.t)}</td><td><a class="link" href="#replay-${a.id}">${esc(E.GAME[a.game].name)}</a></td><td>${a.level}</td><td>${esc(E.STATUS_LABEL[a.status])}</td><td>${a.hints}${a.revealed ? ' + reference' : ''}</td><td>${(a.revisions || []).length}</td><td>${a.overall.toFixed(1)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No exercises yet.</p>'}</section>`;
  };

  routes.library = () => `<header class="page-head"><h1 class="display sm">Exercise Library</h1><p class="lede">Every game, what it trains and how it is judged. ${E.BANK.length} authored exercises, plus templates that generate further variations.</p></header>
    ${window.MWUI.libControls ? window.MWUI.libControls() : ''}
    ${E.CATEGORIES.filter(c => E.GAMES.some(g => g.cat === c.id && (!window.MWUI.libOk || window.MWUI.libOk(g)))).map(c => `<section class="lib-cat" style="--c:${CATC[c.color]}"><h2 class="h2">${glyph(c.glyph, 26)} ${esc(c.name)}</h2>
      ${E.GAMES.filter(g => g.cat === c.id && (!window.MWUI.libOk || window.MWUI.libOk(g))).map(g => { const items = E.itemsFor(g.id); const byL = [1, 2, 3, 4, 5].map(l => items.filter(i => i.lvl === l).length);
        return `<details class="lib-game"><summary><strong>${esc(g.name)}</strong><span class="muted">${items.length} exercises · ${esc(E.SKILLS.find(s => s.id === g.skill).name)}</span></summary>
        <dl class="lib-meta"><div><dt>Learning objective</dt><dd>${esc(g.objective)}</dd></div><div><dt>Cognitive operation</dt><dd>${esc(g.operation)}</dd></div><div><dt>Instructions</dt><dd>${esc(g.instructions)}</dd></div>
        <div><dt>Evaluated on</dt><dd>${g.criteria.map(k => DIMNAME[k] || k).join(', ')}</dd></div><div><dt>Feedback strategy</dt><dd>${esc(g.feedback)}</dd></div><div><dt>Hints</dt><dd>Three steps: a nudge, a directing question, then a worked example.</dd></div>
        <div><dt>Follow-up</dt><dd>${esc(E.GAME[g.followup] ? E.GAME[g.followup].name : '—')}</dd></div><div><dt>Difficulty spread</dt><dd>${byL.map((n, i) => `L${i + 1}: ${n}`).join(' · ')}</dd></div></dl>
        <ul class="lib-items">${items.map(i => `<li><span class="lvl">L${i.lvl}</span><span>${esc(itemPreview(i))}</span><button class="btn small" data-action="item" data-item="${i.id}">Play</button></li>`).join('')}</ul></details>`; }).join('')}</section>`).join('')}`;
  function itemPreview(i) { return i.s || i.title || i.q || (i.a ? i.a + ' / ' + i.b : '') || i.concept || (i.facts && i.facts[0]) || (i.points && i.points.join(' · ')) || (i.parts && i.parts[0]) || (i.lines && i.lines[0]) || (i.script && (i.script[0].t || i.script[0])) || i.topic || ''; }

  routes.prefs = () => `<header class="page-head"><h1 class="display sm">Settings</h1></header>
    <section class="panel"><h2>Display</h2>
      <fieldset class="seg"><legend>Theme</legend>${['system', 'light', 'dark'].map(v => `<label><input type="radio" name="theme" value="${v}" ${S.settings.theme === v ? 'checked' : ''}><span>${v[0].toUpperCase() + v.slice(1)}</span></label>`).join('')}</fieldset>
      <fieldset class="seg"><legend>Text size</legend>${[['s', 'Smaller'], ['m', 'Default'], ['l', 'Larger']].map(([v, l]) => `<label><input type="radio" name="textSize" value="${v}" ${S.settings.textSize === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}</fieldset>
      <fieldset class="seg"><legend>Motion</legend>${[['system', 'Follow system'], ['reduce', 'Reduce']].map(([v, l]) => `<label><input type="radio" name="motion" value="${v}" ${S.settings.motion === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}</fieldset></section>
    <section class="panel"><h2>Practice</h2>
      <label class="check"><input type="checkbox" name="selfRate" ${S.settings.selfRate ? 'checked' : ''}><span>Ask me to rate how developed my answer is before showing feedback. This trains metacognition: comparing your own judgement with the feedback.</span></label></section>
    <section class="panel"><h2>Your data</h2>
      <p class="muted">Stored ${DB.persistent ? 'in this browser’s IndexedDB on this device' : 'in memory only — this browser blocked persistent storage, so export a backup before closing'}. Nothing is sent anywhere.</p>
      <p id="storageLine" class="muted small">Checking storage use…</p>
      <h3>Back up or move to another device</h3>
      <p class="small">A <strong>full backup</strong> holds everything: answers and their versions, feedback, reflections, journal, settings, and your Study Lab books with their review schedules, notes and bookmarks. A <strong>progress backup</strong> is smaller: levels, scores, history and review schedules, without your written answers, journal, notes or the books’ text.</p>
      <div class="row"><button class="btn primary" data-action="export" data-kind="full">Export full backup</button><button class="btn" data-action="export" data-kind="progress">Export progress backup</button><label class="btn file-btn">Import a backup<input type="file" accept="application/json,.json" id="importFile"></label></div>
      <div id="preUpgrade"></div>
      <div class="row"><button class="btn ghost" data-action="persist">Ask the browser not to clear my data</button><button class="btn danger push" data-action="reset">Reset all progress</button></div></section>
    <section class="panel" id="install"><h2>Install on your devices</h2>
      <p class="small">MINDWORK installs as an app from the address it’s hosted at, and then runs without a connection. Installation needs a secure address (https, or localhost on the same computer). ${navigator.serviceWorker && navigator.serviceWorker.controller ? '<strong>This copy is cached for offline use.</strong>' : 'This copy isn’t cached for offline use yet — install it from its own hosted address.'}</p>
      <div class="row" id="installRow" hidden><button class="btn primary" data-action="install">Install MINDWORK</button></div>
      <dl class="install-steps">
        <div><dt>Android (Chrome, Edge, Samsung Internet)</dt><dd>Open the app’s address, then the browser menu → <em>Install app</em> or <em>Add to Home screen</em>.</dd></div>
        <div><dt>iPhone and iPad (Safari)</dt><dd>Open the address in Safari, tap Share → <em>Add to Home Screen</em>. Other browsers on iOS can’t install web apps on older iOS versions.</dd></div>
        <div><dt>Windows and macOS (Chrome, Edge)</dt><dd>Click the install icon at the right of the address bar, or menu → <em>Install MINDWORK</em>. On macOS Safari 17+: File → <em>Add to Dock</em>.</dd></div>
        <div><dt>Firefox</dt><dd>Desktop Firefox can’t install web apps; MINDWORK still works offline in a tab once loaded. Firefox on Android can add it to the home screen.</dd></div>
      </dl>
      <p class="small muted">Each device keeps its own data. Move it with a full backup: export here, import on the other device.</p></section>
    <section class="panel"><h2>About the feedback</h2><p class="prose">Feedback is produced on this device by fixed rules. They detect structure — whether ideas are genuinely different from each other, whether reasons are linked with causal language, whether claims are qualified, whether a reply picks up what the other person said — but they don’t understand meaning the way a person does. Treat the feedback as a careful reader’s questions, not a verdict. The engine has a single entry point for evaluation, so an optional AI feedback provider could be added later; it would need an internet connection and would sit alongside, never replace, the local feedback.</p></section>`;
  routes.prefs.after = () => {
    document.querySelectorAll('#main input[type=radio], #main input[type=checkbox]').forEach(el => el.addEventListener('change', () => { S.settings[el.name] = el.type === 'checkbox' ? el.checked : el.value; save.settings(); applyPrefs(); toast('Saved.'); }));
    $('#importFile').addEventListener('change', importFile);
    DB.estimate().then(est => { const el = $('#storageLine'); if (!el) return; if (!est) { el.textContent = 'This browser doesn’t report storage use.'; return; } const mb = x => (x / 1048576).toFixed(1) + ' MB'; const pct = est.quota ? est.usage / est.quota : 0; el.textContent = `Using ${mb(est.usage)} of about ${mb(est.quota)} available to MINDWORK on this device.` + (pct > 0.8 ? ' Storage is running low — export a backup.' : ''); });
    if (deferredInstall) $('#installRow').hidden = false;
    DB.get('kv', 'pre-upgrade').then(p => { const el = $('#preUpgrade'); if (!el || !p) return; el.innerHTML = `<h3>Your data from before the last update</h3><p class="small">A full copy of your data from ${esc(p.from)} was kept on ${esc(new Date(p.t).toLocaleString())}, before updating to version ${esc(p.to)}. It contains ${p.backup.counts.attempts} exercises, ${p.backup.counts.journal} journal entries and ${p.backup.counts.books || 0} books.</p><div class="row"><button class="btn" data-action="pre-download">Download this copy</button><button class="btn" data-action="pre-restore">Restore this copy</button></div>`; });
  };

  function fullState() { return { profile: S.profile, settings: S.settings, attempts: S.attempts, sessions: Object.values(S.sessions), journal: S.journal, study: studyState(), improve: S.improve, puzzles: S.plog || [], comm: S.clog || [], ai: S.ai || [], character: S.character || null, grow: S.glog || [], obs: S.olog || [], bilingual: S.blog || [], vocab: S.vocab || [], extra: S.extra || null, comp: S.comp || [], mentor: S.mentor || null }; }
  function studyState() { return { books: S.books || [], cards: Object.values(S.cards || {}), log: S.slog || [], notes: S.notes || [], maps: S.maps || [], links: S.links || [] }; }
  function download(obj, name) {
    const blob = new Blob([JSON.stringify(obj)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  function exportData(kind) {
    const b = R.buildBackup(fullState(), kind);
    download(b, `mindwork-${b.kind}-backup-${dateKey()}.json`); toast(`${b.kind === 'full' ? 'Full' : 'Progress'} backup exported: ${b.counts.attempts} exercises${b.kind === 'full' ? ', ' + b.counts.journal + ' journal entries' : ''}.`);
  }
  function importDialog(v, plan) {
    return new Promise(res => {
      const d = $('#dlg');
      d.innerHTML = `<form method="dialog" class="dlg"><h2>Import this backup?</h2>
        <dl class="preview"><div><dt>Type</dt><dd>${v.kind === 'progress' ? 'Progress backup (no written answers)' : 'Full backup'}, format ${v.version}</dd></div>
        ${v.exportedAt ? `<div><dt>Made</dt><dd>${esc(new Date(v.exportedAt).toLocaleString())}</dd></div>` : ''}
        <div><dt>Contains</dt><dd>${v.counts.attempts} exercises, ${v.counts.sessions} sessions, ${v.counts.journal} journal entries</dd></div>
        <div><dt>Study Lab</dt><dd>${v.counts.books} books, ${v.counts.cards} review questions, ${v.counts.notes} notes and bookmarks, ${v.counts.maps || 0} concept maps, ${v.counts.links || 0} connections${plan.study.dup ? ` (${plan.study.dup} already here)` : ''}</dd></div><div><dt>Already here</dt><dd>${plan.dupAttempts} exercises and ${plan.dupJournal} journal entries match existing records and will be skipped when merging</dd></div></dl>
        ${v.errors.length ? `<p class="warn">${v.errors.map(esc).join(' ')}</p>` : ''}
        <p class="small">Merging adds only what’s new and keeps everything currently on this device. Replacing deletes what’s here first; a safety copy is kept until the import succeeds.</p>
        <div class="row end"><button value="cancel" class="btn ghost">Cancel</button><button value="replace" class="btn danger">Replace everything</button><button value="merge" class="btn primary">Merge: add ${plan.newAttempts.length} exercises, ${plan.newJournal.length} entries</button></div></form>`;
      d.onclose = () => res(d.returnValue || 'cancel'); d.showModal();
    });
  }
  async function importFile(e) {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    let obj; try { obj = JSON.parse(await f.text()); } catch (err) { toast('Import failed: the file isn’t valid JSON. Nothing was changed.'); return; }
    return importObject(obj);
  }
  async function importObject(obj) {
    const v = R.validateBackup(obj);
    if (!v.ok) { toast('Import failed: ' + v.errors.join(' ') + ' Nothing was changed.'); return; }
    const plan = R.previewMerge({ attempts: S.attempts, journal: S.journal, sessions: Object.values(S.sessions), study: studyState(), improve: S.improve, puzzles: S.plog || [], comm: S.clog || [], ai: S.ai || [], grow: S.glog || [], obs: S.olog || [], bilingual: S.blog || [], vocab: S.vocab || [] }, v.data);
    const choice = await importDialog(v, plan);
    if (choice === 'cancel') return;
    if (choice === 'replace' && !(await confirmDlg('Replace everything on this device?', `All ${S.attempts.length} exercises and ${S.journal.length} journal entries currently here will be deleted and replaced by the backup.`, 'Delete and replace', true))) return;
    const before = R.buildBackup(fullState(), 'full');
    try {
      await DB.put('kv', 'pre-import', before);
      if (choice === 'replace') {
        await DB.clear(); await DB.put('kv', 'pre-import', before);
        S.attempts = v.data.attempts; S.sessions = {}; v.data.sessions.forEach(x => S.sessions[x.id] = x); S.journal = v.data.journal; Object.assign(S.settings, v.data.settings || {});
        S.books = v.data.study.books; S.cards = {}; v.data.study.cards.forEach(c => S.cards[c.qid] = c); S.slog = v.data.study.log; S.notes = v.data.study.notes; S.maps = v.data.study.maps; S.links = v.data.study.links; S.improve = v.data.improve; S.plog = v.data.puzzles; S.clog = v.data.comm; S.ai = v.data.ai; if (v.data.character) S.character = v.data.character; if (v.data.extra) S.extra = v.data.extra; if (v.data.comp) S.comp = v.data.comp; if (v.data.mentor) S.mentor = Object.assign(S.mentor || {}, v.data.mentor); S.glog = v.data.grow; S.olog = v.data.obs; S.blog = v.data.bilingual; S.vocab = v.data.vocab;
      } else {
        S.attempts = S.attempts.concat(plan.newAttempts).sort((a, b) => a.t - b.t); plan.newSessions.forEach(x => S.sessions[x.id] = x); S.journal = S.journal.concat(plan.newJournal);
        S.books = (S.books || []).concat(plan.study.books); plan.study.cards.forEach(c => S.cards[c.qid] = c); S.slog = (S.slog || []).concat(plan.study.log); S.notes = (S.notes || []).concat(plan.study.notes); S.maps = (S.maps || []).concat(plan.study.maps); S.links = (S.links || []).concat(plan.study.links); S.improve = { targets: ((S.improve || {}).targets || []).concat(plan.newTargets) }; S.plog = (S.plog || []).concat(plan.newPuzzles); S.clog = (S.clog || []).concat(plan.newComm); S.ai = (S.ai || []).concat(plan.newAi); S.glog = (S.glog || []).concat(plan.newGrow); S.olog = (S.olog || []).concat(plan.newObs); S.blog = (S.blog || []).concat(plan.newBil); S.vocab = (S.vocab || []).concat(plan.newVocab);
      }
      S.attempts.forEach(a => { a.finalized = a.finalized || a.status === 'skipped' || a.overall != null; });
      S.profile = R.rebuildProfile(S.attempts);
      await DB.putMany('attempts', S.attempts.map(a => [a.id, a])); await DB.putMany('sessions', Object.values(S.sessions).map(x => [x.id, x]));
      await DB.putMany('journal', S.journal.map(j => [j.id, j])); { const st = studyState(); await DB.putMany('books', st.books.map(x => [x.id, x])); await DB.putMany('cards', st.cards.map(x => [x.qid, x])); await DB.putMany('studylog', st.log.map(x => [x.id, x])); await DB.putMany('notes', st.notes.map(x => [x.id, x])); await DB.putMany('maps', st.maps.map(x => [x.id, x])); await DB.putMany('links', st.links.map(x => [x.id, x])); } await DB.put('kv', 'improve', S.improve || { targets: [] }); await DB.put('kv', 'puzzlelog', S.plog || []); await DB.put('kv', 'commlog', S.clog || []); await DB.put('kv', 'aisessions', S.ai || []); await DB.put('kv', 'growlog', S.glog || []); if (S.extra) await DB.put('kv', 'extra', S.extra); await DB.put('kv', 'competency', S.comp || []); if (S.mentor) await DB.put('kv', 'mentor', S.mentor); await DB.put('kv', 'obslog', S.olog || []); await DB.put('kv', 'bilinglog', S.blog || []); await DB.put('kv', 'vocab', S.vocab || []); if (S.character) await DB.put('kv', 'character', S.character); await save.profile(); await save.settings(); await DB.put('kv', 'schema', R.SCHEMA);
      await DB.del('kv', 'pre-import');
      applyPrefs(); toast(choice === 'merge' ? `Merged: added ${plan.newAttempts.length} exercises and ${plan.newJournal.length} journal entries; skipped ${plan.dupAttempts + plan.dupJournal} duplicates.` : `Replaced with the backup: ${S.attempts.length} exercises.`); route();
    } catch (err) {
      // roll back to what was here before
      try { await DB.clear(); const b = before.data; await DB.putMany('attempts', b.attempts.map(a => [a.id, a])); await DB.putMany('sessions', b.sessions.map(x => [x.id, x])); await DB.putMany('journal', b.journal.map(j => [j.id, j])); await DB.put('kv', 'profile', b.profile); await DB.put('kv', 'settings', b.settings); S.attempts = b.attempts; S.sessions = {}; b.sessions.forEach(x => S.sessions[x.id] = x); S.journal = b.journal; S.profile = b.profile; } catch (e2) {}
      toast('Import stopped part-way (' + ((err && err.message) || 'storage error') + '). Your previous data has been restored.'); route();
    }
  }
  async function resetAll() {
    if (!(await confirmDlg('Reset all progress?', 'This permanently deletes every exercise, session, level, reflection, journal entry, book, review schedule and note stored on this device. Export a full backup first if you might want it back.', 'Delete everything', true))) return;
    await DB.clear(); S.profile = E.emptyProfile(); S.attempts = []; S.sessions = {}; S.journal = []; S.draft = null; S.books = []; S.cards = {}; S.slog = []; S.notes = []; S.maps = []; S.links = []; S.studyDraft = null; S.improve = { targets: [] }; S.plog = []; S.clog = []; S.ai = []; S.character = { stance: {}, wording: {}, why: {}, reviewed: null }; S.glog = []; S.olog = []; S.blog = []; S.vocab = []; S.extra = { kia: [], approaches: [], memStart: null }; S.comp = []; S.mentor = { turns: [], teaching: [], share: { goals: true, grow: false, journal: false }, size: 'medium', focus: '', cycle: null }; toast('All progress deleted.'); location.hash = '#home'; route();
  }

  // ───────────── events
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-action]'); if (!t) return;
    const a = t.dataset.action;
    if (a === 'menu') { const open = !document.body.classList.contains('nav-open'); document.body.classList.toggle('nav-open', open); t.setAttribute('aria-expanded', String(open)); if (open) { const f = document.querySelector('#nav .dest-link'); if (f) f.focus(); } }
    else if (a === 'daily') { const d = todayDaily(); location.hash = '#play'; window.MWP.open(d.id); }
    else if (a === 'mode') startMode(t.dataset.mode);
    else if (a === 'play') startMode('single', { game: t.dataset.game });
    else if (a === 'item') startMode('single', { itemId: t.dataset.item });
    else if (a === 'challenge') { const c = ($('#claim').value || '').trim(); if (c && c.split(/\s+/).length < 3) { toast('Write the claim as a full statement — at least a few words.'); return; } startMode('challenge', c ? { claim: c } : {}); }
    else if (a === 'resume') { location.hash = '#play'; window.MWP.open(S.draft.sessionId); }
    else if (a === 'export') exportData(t.dataset.kind);
    else if (a === 'persist') { (navigator.storage && navigator.storage.persist ? navigator.storage.persist() : Promise.resolve(false)).then(ok => toast(ok ? 'The browser will keep MINDWORK’s data unless you clear it yourself.' : 'The browser declined. Installing the app usually makes storage persistent; keep regular backups either way.')); }
    else if (a === 'install' && deferredInstall) { deferredInstall.prompt(); deferredInstall.userChoice.finally(() => { deferredInstall = null; const r = $('#installRow'); if (r) r.hidden = true; }); }
    else if (a === 'update' && waitingSW) { waitingSW.postMessage('skip-waiting'); }
    else if (a === 'reset') resetAll();
    else if (a === 'pre-download' || a === 'pre-restore') DB.get('kv', 'pre-upgrade').then(p => { if (!p) return; if (a === 'pre-download') download(p.backup, `mindwork-before-${p.to}-${dateKey(p.t)}.json`); else importObject(p.backup); });
  });
  window.addEventListener('hashchange', route);

  let deferredInstall = null, waitingSW = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; const r = $('#installRow'); if (r) r.hidden = false; });
  window.MWUI = { S, DB, save, short, fmtDate, ago, DESTS, APP_VERSION, importObject, esc, $, glyph, catOf, CATC, DIMNAME, bar, toast, confirmDlg, route, routes, finalizeAttempt, history, todayDaily, startSession, startMode, sessionDone, dateKey, constellation };

  async function boot() {
    shell(); await load(); route(); const sp = document.getElementById('splash'); if (sp) sp.remove();
    if ('serviceWorker' in navigator && window.isSecureContext && document.documentElement.dataset.pwa === '1') {
      navigator.serviceWorker.register('./sw.js').then(reg => {
        const offer = w => { waitingSW = w; const t = $('#toast'); t.innerHTML = 'A new version of MINDWORK is ready. <button class="btn small" data-action="update">Update now</button>'; t.classList.add('show', 'sticky'); };
        if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
        reg.addEventListener('updatefound', () => { const w = reg.installing; w && w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) offer(w); }); });
      }).catch(() => {});
      let reloaded = false; navigator.serviceWorker.addEventListener('controllerchange', () => { if (waitingSW && !reloaded) { reloaded = true; location.reload(); } });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
