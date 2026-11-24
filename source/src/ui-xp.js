/* MINDWORK — progression on Today and in Progress › Records and achievements. Never locks anything. */
(function () {
  const U = window.MWUI, X = window.MWXP; const { S, esc } = U;
  const st = () => ({ attempts: S.attempts, puzzles: S.plog || [], comm: S.clog || [], slog: S.slog || [], ai: S.ai || [], grow: S.glog || [], journal: S.journal || [], improve: S.improve, extra: S.extra || {}, comp: S.comp || [], bossBeaten: window.MWEX ? window.MWEX.BOSSES.some(b => { const r = window.MWEX.bossResult(b); return r && r.beat; }) : false });
  const panel = () => { const s = X.summary(st()); const m = X.missions(st()); const j = X.journey(st());
    return `<section class="panel xp-today"><div class="xp-line"><strong>Level ${s.level}</strong><span class="xpbar" role="progressbar" aria-valuemin="0" aria-valuemax="${s.need}" aria-valuenow="${s.into}"><span style="--w:${Math.round(s.into / Math.max(1, s.need) * 100)}%"></span></span><span class="muted small">${s.xp} XP · practised on ${s.recent14} of the last 14 days</span><a class="link small" href="#records">Records</a></div>
      <div class="missions"><h2>Today’s missions</h2><ul>${m.map(x => `<li class="${x.done ? 'done' : ''}"><span class="mslot">${x.slot}</span><a href="${x.href}">${esc(x.label)}</a><span>${x.done ? '✓ done' : ''}</span></li>`).join('')}</ul></div>
      <p class="muted small">This week’s journey: <strong>${esc(j.focus.name)}</strong>, the destination you’ve used least lately — ${Math.min(j.progress, j.goal)} of ${j.goal} sessions. <a class="link" href="${j.focus.href}">Go</a></p></section>`; };
  const homeOrig = U.routes.home, homeAfter = U.routes.home.after;
  U.routes.home = (...a) => { const out = homeOrig(...a); return typeof out === 'string' ? out.replace('<section class="also">', panel() + '<section class="also">') : out; };
  U.routes.home.after = homeAfter;
  U.routes.records = () => { const s = X.summary(st()); const ach = X.achievements(st()); const j = X.journey(st());
    return `<header class="page-head"><a href="#progress-home" class="link">Progress</a><h1 class="display sm">Records and achievements</h1><p class="lede">Calculated from what you’ve actually done. Nothing is locked, nothing expires, and a missed day costs nothing.</p></header>
      <section class="panel"><div class="rec-grid">${[['Level', s.level], ['Experience', s.xp + ' XP'], ['Days practised, last 14', s.recent14], ['Days practised, all time', s.daysTotal], ['Longest run of days', s.longestRun], ['Most in one day', s.bestDay]].map(([k, v]) => `<div class="rec"><span class="muted small">${k}</span><strong>${v}</strong></div>`).join('')}</div>
        <p class="muted small">Experience comes from practice: more for independent work than for heavily hinted work, more for sound puzzle reasoning than for guesses, and extra when improvement is demonstrated.</p></section>
      <section class="panel"><h2>Last week</h2><p>${j.lastTotal ? Object.entries(j.lastWeek).map(([d, n]) => `${d[0].toUpperCase() + d.slice(1)}: ${n}`).join(' · ') : 'No practice recorded last week.'}</p><p class="muted small">This week’s focus: ${esc(j.focus.name)} (${Math.min(j.progress, j.goal)} of ${j.goal}).</p></section>
      <section class="panel"><h2>Achievements</h2><p class="muted small">${ach.filter(a => a.got).length} of ${ach.length}</p><ul class="ach">${ach.map(a => `<li class="${a.got ? 'got' : ''}"><strong>${esc(a.name)}</strong><span>${esc(a.how)}</span>${a.got ? '<span class="ok">✓</span>' : ''}</li>`).join('')}</ul></section>`; };
})();
