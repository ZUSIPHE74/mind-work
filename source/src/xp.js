/* MINDWORK progression — derived entirely from practice already recorded. Nothing is locked, nothing expires,
   and consistency is described flexibly (days practised out of recent days), never as a streak to lose. */
(function (root) {
  const isNode = typeof module !== 'undefined';
  const DAY = 864e5; const day = t => Math.floor(t / DAY);
  /* one list of practice events from every environment */
  function events(st) {
    const ev = []; const add = (t, xp, dest, kind, label) => { if (t) ev.push({ t, xp, dest, kind, label }); };
    (st.attempts || []).filter(a => a.status !== 'skipped' && a.overall != null).forEach(a => { const v = (a.versions || []).length; add(a.t, 10 + (a.hints ? 0 : 5) + (v > 1 ? 3 : 0), 'think', 'exercise', 'exercise'); });
    (st.puzzles || []).filter(e => e.done).forEach(e => add(e.t, e.solved ? (e.outcome === 'sound' ? 25 : 15) : 5, 'think', 'puzzle', 'puzzle'));
    (st.comm || []).forEach(e => { if (e.kind === 'roleplay' && e.done) add(e.t, 12 + (e.score >= 0.75 ? 8 : 0), 'communicate', 'roleplay', 'role-play'); else if (e.kind === 'draft') add(e.t, 8, 'communicate', 'draft', 'writing'); else if (e.kind === 'speak') add(e.t, 8, 'communicate', 'speak', 'speaking'); else if (e.kind === 'recognise') add(e.t, 2, 'communicate', 'recognise', 'recognition'); else if (e.kind === 'real') add(e.t, 15, 'communicate', 'real', 'real-life try'); });
    (st.slog || []).forEach(l => add(l.t, 2, 'learn', 'study', 'study'));
    (st.ai || []).filter(s => s.feedback).forEach(s => add(s.t, 15, s.kind === 'deep' ? 'think' : 'communicate', 'ai', 'AI session'));
    (st.grow || []).forEach(g => add(g.t, g.real ? 15 : 10, 'grow', g.real ? 'real' : 'grow', g.real ? 'real-life try' : 'Grow activity'));
    (st.journal || []).forEach(j => add(j.created, 5, 'grow', 'journal', 'journal entry'));
    const ex = st.extra || {}; (ex.formats || []).forEach(x => add(x.t, x.right === x.n ? 12 : 6, 'think', 'exercise', 'exercise')); (ex.flex || []).forEach(x => add(x.t, 8, 'communicate', 'flex', 'flexibility practice')); (ex.drawings || []).forEach(x => add(x.t, 10, 'think', 'drawing', 'drawing')); (ex.analyses || []).forEach(x => add(x.t, 8, 'communicate', 'analysis', 'conversation analysis')); (ex.stories || []).forEach(x => add(x.t, 8, 'communicate', 'story', 'story')); (ex.kia || []).forEach(x => add(x.t, 12, 'learn', 'kia', 'knowledge in action')); (ex.approaches || []).forEach(x => add(x.t, 10, 'think', 'approaches', 'multiple approaches')); (ex.sequences || []).forEach(x => add(x.t, 20, 'learn', 'sequence', 'study sequence')); (ex.express || []).forEach(x => add(x.t, 10, 'communicate', 'express', 'intentional expression'));
    (st.comp || []).filter(e => e.kind === 'demonstrated' && e.source && e.source !== 'rules' && e.evidence).forEach(e => add(e.t, 10, 'improve', 'demonstrated', 'ability shown'));
    ((st.improve || {}).targets || []).forEach(t => (t.history || []).forEach(h => { const b = { improving: 30, demonstrated: 50, mastered: 80 }[h.state]; if (b) add(h.t, b, 'improve', 'improve', 'improvement shown'); }));
    return ev.sort((a, b) => a.t - b.t);
  }
  const levelFor = xp => Math.floor(Math.sqrt(xp / 40)) + 1;
  const xpForLevel = n => 40 * (n - 1) * (n - 1);
  function summary(st, now) {
    now = now || Date.now(); const ev = events(st); const xp = ev.reduce((s, e) => s + e.xp, 0); const lv = levelFor(xp);
    const days = new Set(ev.map(e => day(e.t))); const recent = [...Array(14)].filter((_, i) => days.has(day(now) - i)).length;
    let best = 0, run = 0; [...days].sort((a, b) => a - b).forEach((d, i, arr) => { run = i && d === arr[i - 1] + 1 ? run + 1 : 1; best = Math.max(best, run); });
    const perDay = {}; ev.forEach(e => perDay[day(e.t)] = (perDay[day(e.t)] || 0) + 1);
    return { xp, level: lv, into: xp - xpForLevel(lv), need: xpForLevel(lv + 1) - xpForLevel(lv), recent14: recent, daysTotal: days.size, longestRun: best, bestDay: Math.max(0, ...Object.values(perDay)), events: ev.length };
  }
  const ACHIEVEMENTS = [
    ['first', 'First step', 'Complete anything at all', (s, x) => x.events >= 1],
    ['ten', 'Ten done', 'Ten pieces of practice', (s, x) => x.events >= 10],
    ['hundred', 'A hundred', 'A hundred pieces of practice', (s, x) => x.events >= 100],
    ['independent', 'On your own', 'Ten exercises completed without hints', s => (s.attempts || []).filter(a => !a.hints && a.status !== 'skipped').length >= 10],
    ['revise', 'Second thoughts', 'Revise an answer after feedback', s => (s.attempts || []).some(a => (a.versions || []).length > 1)],
    ['sound', 'Sound reasoning', 'Solve five puzzles with the reasoning check right', s => (s.puzzles || []).filter(e => e.outcome === 'sound').length >= 5],
    ['boss', 'Out of the archive', 'Escape the boss puzzle', s => (s.puzzles || []).some(e => e.pid === 'esc-1' && e.solved)],
    ['uncertain', 'Honest about evidence', 'Answer “cannot be determined” correctly', s => (s.puzzles || []).some(e => ['ded-2', 'log-3'].includes(e.pid) && e.solved)],
    ['boundary', 'Held the line', 'Hold a boundary in role-play without coaching', s => (s.comm || []).some(e => e.kind === 'roleplay' && e.rid === 'boundary' && !e.coach && e.score >= 0.8)],
    ['listener', 'Listener', 'Reach the goal in three listening-led role-plays', s => new Set((s.comm || []).filter(e => e.kind === 'roleplay' && e.outcome === 'good' && ['listen-problem', 'read-room', 'coach', 'customer'].includes(e.rid)).map(e => e.rid)).size >= 3],
    ['reallife', 'Out in the world', 'Record three real-life tries', s => (s.comm || []).filter(e => e.kind === 'real').length + (s.grow || []).filter(g => g.real).length >= 3],
    ['study', 'Retrieval habit', 'Fifty study answers checked', s => (s.slog || []).length >= 50],
    ['explore', 'Followed the thread', 'Finish an AI exploration', s => (s.ai || []).some(x => x.kind === 'deep' && x.feedback)],
    ['checkin', 'Checking in', 'Seven emotional check-ins', s => (s.grow || []).filter(g => g.aid === 'em-checkin').length >= 7],
    ['improved', 'Proved it', 'Demonstrate improvement on a target', s => ((s.improve || {}).targets || []).some(t => ['demonstrated', 'mastered'].includes(t.state))],
    ['boss', 'Boss defeated', 'Defeat any boss challenge', s => !!s.bossBeaten],
    ['steady', 'Steady', 'Practise on 10 of 14 days', (s, x) => x.recent14 >= 10]];
  function achievements(st, now) { const x = summary(st, now); return ACHIEVEMENTS.map(([id, name, how, test]) => ({ id, name, how, got: !!test(st, x) })); }
  /* three daily missions from different destinations, stable for the day; done when matching practice exists that day */
  const MISSION_POOL = { quick: [{ kind: 'exercise', label: 'One Cognitive Playground exercise', href: '#games' }], main: [{ kind: 'puzzle', label: 'Solve a puzzle', href: '#arena' }, { kind: 'roleplay', label: 'Finish a role-play', href: '#communicate' }, { kind: 'study', label: 'Answer five study questions', href: '#study', n: 5 }, { kind: 'grow', label: 'Do one Grow activity', href: '#grow' }, { kind: 'draft', label: 'Write and check one message', href: '#communicate' }], skill: [{ kind: 'improve', label: 'Practise your improvement target', href: '#improve' }, { kind: 'checkin', label: 'An emotional check-in', href: '#gact-em-checkin' }, { kind: 'recognise', label: 'Two recognition examples in Communicate', href: '#communicate', n: 2 }] };
  function missions(st, now) {
    now = now || Date.now(); const d = day(now); const ev = events(st).filter(e => day(e.t) === d);
    const hasTarget = ((st.improve || {}).targets || []).some(t => ['active', 'practising', 'ready', 'improving'].includes(t.state));
    const pick = (arr, k) => arr[(d + k) % arr.length];
    const skillPool = hasTarget ? MISSION_POOL.skill : MISSION_POOL.skill.slice(1);
    const list = [Object.assign({ slot: 'Quick' }, MISSION_POOL.quick[0]), Object.assign({ slot: 'Main' }, pick(MISSION_POOL.main, 0)), Object.assign({ slot: 'Skill' }, pick(skillPool, 1))];
    const count = k => k === 'checkin' ? (st.grow || []).filter(g => g.aid === 'em-checkin' && day(g.t) === d).length : k === 'improve' ? (st.attempts || []).filter(a => day(a.t) === d && /^imp-/.test(a.sessionId || '')).length + (st.puzzles || []).filter(e => day(e.t) === d && /^imp-/.test(e.sessionId || '')).length + (st.comm || []).filter(e => day(e.t) === d && /^imp-/.test(e.sessionId || '')).length : ev.filter(e => e.kind === k).length;
    return list.map(m => Object.assign({}, m, { done: count(m.kind) >= (m.n || 1) }));
  }
  /* weekly journey: focus on the destination least practised in the last 14 days */
  function journey(st, now) {
    now = now || Date.now(); const ev = events(st); const wk = Math.floor((day(now) + 3) / 7); const start = (wk * 7 - 3) * DAY;
    const dests = [['think', 'Think', '#think'], ['learn', 'Learn', '#learn'], ['communicate', 'Communicate', '#communicate'], ['grow', 'Grow', '#grow']];
    const recent = d => ev.filter(e => e.dest === d && now - e.t < 14 * DAY).length; const focus = dests.slice().sort((a, b) => recent(a[0]) - recent(b[0]) || dests.indexOf(a) - dests.indexOf(b))[0];
    const thisWeek = ev.filter(e => e.t >= start); const byDest = Object.fromEntries(dests.map(([d]) => [d, thisWeek.filter(e => e.dest === d).length]));
    const last = ev.filter(e => e.t >= start - 7 * DAY && e.t < start); const lastBy = Object.fromEntries(dests.map(([d]) => [d, last.filter(e => e.dest === d).length]));
    return { focus: { id: focus[0], name: focus[1], href: focus[2] }, goal: 3, progress: byDest[focus[0]], byDest, lastWeek: lastBy, lastTotal: last.length };
  }
  const api = { events, summary, levelFor, xpForLevel, ACHIEVEMENTS, achievements, missions, journey };
  if (isNode) module.exports = api; else root.MWXP = api;
})(this);
