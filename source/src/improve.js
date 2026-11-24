/* MINDWORK Improvement Workshop — pure logic.
   Targets come only from recorded evidence (Thinking Patterns today; other environments add sources as they are built).
   A target only moves forward on evidence from a reassessment in exercises not used for its practice. */
(function (root) {
  const isNode = typeof module !== 'undefined';
  const E = isNode ? require('./engine.js') : root.MW;
  const R = isNode ? require('./reflect.js') : root.MWR;
  const DAY = 864e5;
  const copy = o => JSON.parse(JSON.stringify(o));
  const WHY = {
    first: 'Settling on the first explanation means a conclusion rests on a guess you never compared with anything. Generating real alternatives is what makes a judgement yours.',
    reword: 'Saying the same idea in new words feels like progress but adds nothing. Separating ideas by how they work is what makes alternatives genuine.',
    unlinked: 'Several ideas only become an explanation when you say how they connect. Otherwise the listener has to do the reasoning for you.',
    noreason: 'A claim without its reason cannot be checked, discussed or trusted. Stating the "because" makes your thinking visible to others and to you.',
    unqualified: 'Claims that sound absolute invite easy counterexamples and say more than you actually believe. Conditions make a point both accurate and harder to dismiss.',
    vague: 'Vague wording leaves listeners to fill in your meaning, often differently from what you intended.',
    hints: 'Hints help, but opening them early means the hardest part, getting started on your own, is not being practised.',
    qonly: 'Replying only with questions makes a conversation feel like an interview and leaves the other person to carry it.'
  };
  const ACTIVE = ['active', 'practising', 'ready', 'improving'];
  const STATE_LABEL = { identified: 'Identified', active: 'Active', practising: 'Practising', ready: 'Ready for reassessment', improving: 'Improving', demonstrated: 'Improvement demonstrated', mastered: 'Mastered', postponed: 'Postponed', dismissed: 'Dismissed' };
  const det = key => R.DETECT.find(d => d.id === key);

  /* Games whose feedback can show whether the habit occurred: only these can reassess a target. */
  const appCache = {};
  function applicableGames(key) {
    if (appCache[key]) return appCache[key];
    const d = det(key); if (!d) return [];
    const probe = g => ({ game: g, schema: 2, versions: [{ v: 1, t: 0, responses: {} }], events: [], hints: 0, reflections: [] });
    return appCache[key] = E.GAMES.filter(g => !g.deep && g.id !== 'branch').filter(g => {
      const it = E.itemsFor(g.id)[0]; if (!it) return false;
      try { return !!d.applies(probe(g.id), E.evaluate(it, {})); } catch (e) { return false; }
    }).map(g => g.id);
  }

  function firstFb(a) { const v = R.versionsOf(a)[0]; return v ? R.feedbackFor(a, v).fb : null; }
  function occurredAttempt(key, a) { const d = det(key), fb = firstFb(a); if (!d || !fb) return null; if (!d.applies(a, fb)) return null; return !!d.occurs(a, fb); }

  /* Candidates: emerging or recurring difficulties with evidence; single and occasional observations only on request. */
  function candidates(attempts, targets, now) {
    now = now || Date.now();
    const pats = R.patterns(attempts).filter(p => p.kind === 'difficulty' && det(p.id) && det(p.id).practise);
    return pats.map(p => {
      const t = targets.find(x => x.key === p.id && !['mastered'].includes(x.state));
      if (t && t.state !== 'dismissed') return null;
      if (t && t.state === 'dismissed' && p.count <= (t.dismissedAt || 0)) return null; // no new evidence since dismissal
      return { key: p.id, title: p.name, explain: p.explain, why: WHY[p.id] || '', level: p.level, count: p.count, of: p.of, rate: p.rate, evidence: p.evidence, practise: p.practise, needsConsent: p.level === 'single' || p.level === 'occasional', reopened: !!t };
    }).filter(Boolean).sort((a, b) => a.needsConsent - b.needsConsent || b.count - a.count);
  }
  const slotsUsed = targets => targets.filter(t => ACTIVE.includes(t.state)).length;
  function createTarget(c, targets, now) {
    now = now || Date.now();
    const state = slotsUsed(targets) < 3 ? 'active' : 'identified';
    return { id: 't' + now.toString(36) + Math.random().toString(36).slice(2, 5), key: c.key, title: c.title, explain: c.explain, why: c.why, practise: c.practise, source: c.source || 'Thinking Patterns',
      baseline: { count: c.count, of: c.of, rate: c.rate, level: c.level, evidence: c.evidence, t: now }, state, created: now, history: [{ t: now, state, note: state === 'identified' ? 'Three targets are already active, so this one waits in the later queue.' : 'Started working on this target.' }], practice: [], reassess: [] };
  }
  function transition(t, state, now, note) { const k = copy(t); k.state = state; k.history.push({ t: now || Date.now(), state, note: note || '' }); return k; }

  const doneAttempts = (attempts, id) => attempts.filter(a => a.sessionId === id && a.status !== 'skipped' && a.overall != null);
  /* Recompute a target's state from what has actually happened in its sessions. Returns the same object if nothing changed. */
  function refresh(t, attempts, now, ctx) {
    now = now || Date.now(); if (!['active', 'practising', 'ready', 'improving', 'demonstrated'].includes(t.state)) return t;
    ctx = ctx || {};
    const ext = t.source === 'Puzzle Arena' ? { log: ctx.plog, occ: ctx.pzOccurred } : t.source === 'Communicate' ? { log: ctx.clog, occ: ctx.cmOccurred } : t.source === 'Observation and Memory' ? { log: (ctx.olog || []).map(o => Object.assign({ done: true }, o)), occ: (k, o) => o.ex === 'ob' ? o.overread > 0 : null } : t.source === 'Mentor evidence' ? { log: (ctx.mlog || []), occ: ctx.mOccurred } : t.source === 'Open conversations' ? { log: (ctx.ailog || []).map(s => Object.assign({ done: !!s.feedback }, s)), occ: ctx.aiOccurred } : null; // evidence sources outside the Playground
    const done = ext ? (_, id) => (ext.log || []).filter(e => e.sessionId === id && e.done) : doneAttempts;
    const occurred = ext ? (key, e) => ext.occ(key, e) : occurredAttempt;
    let k = t, changed = false; const set = (s, note) => { k = transition(k, s, now, note); changed = true; };
    const lastR = k.reassess[k.reassess.length - 1];
    const since = lastR ? lastR.created : 0;
    const practisedSince = k.practice.filter(p => p.created >= since).flatMap(p => done(attempts, p.id)).length;
    if (k.state === 'active' && practisedSince > 0) set('practising', 'Practice started.');
    if (k.state === 'practising' && practisedSince >= 2 && (!lastR || lastR.verdict)) set('ready', `${practisedSince} targeted exercises completed since the last check.`);
    if (lastR && !lastR.verdict) {
      const atts = done(attempts, lastR.id);
      if (atts.length >= lastR.size) {
        if (!changed) k = copy(k);
        const r = k.reassess[k.reassess.length - 1];
        const res = atts.map(a => occurred(k.key, a)).filter(x => x !== null);
        r.of = res.length; r.occurred = res.filter(Boolean).length; r.attemptIds = atts.map(a => a.id); r.completed = now;
        if (!r.of) { r.verdict = 'inconclusive'; set(k.state === 'ready' ? 'ready' : k.state, 'The check could not observe this habit in those exercises. Try another reassessment.'); }
        else if (r.occurred === 0) {
          r.verdict = 'pass';
          const passes = k.reassess.filter(x => x.verdict === 'pass');
          const firstPass = passes[0];
          if (passes.length === 1) set('improving', `Not observed in ${r.of} new exercise${r.of > 1 ? 's' : ''}. One more clean check at least a week later will confirm it.`);
          else if (k.state === 'improving' && now - firstPass.completed >= 7 * DAY) set('demonstrated', 'Not observed in two checks at least a week apart.');
          else if (k.state === 'demonstrated' && now - passes[passes.length - 2].completed >= 7 * DAY) set('mastered', 'Still not observed a week or more after improvement was demonstrated.');
          else set(k.state, `Clean again in ${r.of} exercises; the next check counts once a week has passed since the first clean one.`);
        } else { r.verdict = 'fail'; set('practising', `Observed in ${r.occurred} of ${r.of} new exercises. More targeted practice comes next.`); }
        changed = true;
      }
    }
    return changed ? k : t;
  }

  function pick(games, n, profile, history, seed, now) {
    const R0 = E.rng(seed); const out = []; const pool = games.slice();
    while (out.length < n && pool.length) { const g = pool.splice(Math.floor(R0() * pool.length), 1)[0]; const it = E.chooseItem(g, E.skillLevel(profile, E.GAME[g].skill), history.concat(out.map(o => ({ itemId: o.itemId, t: now }))), R0, now); if (it) out.push({ game: g, itemId: it.id, state: 'pending' }); }
    return out;
  }
  /* Practice uses the games that train the habit; reassessment prefers different games, so improvement is tested in a new situation. */
  function practiceSession(t, profile, history, now) {
    now = now || Date.now(); const games = (t.practise || []).filter(g => E.GAME[g]);
    const items = pick(games.length ? games : applicableGames(t.key), 3, profile, history, t.id + 'p' + t.practice.length, now);
    return { id: 'imp-p-' + t.id + '-' + t.practice.length, type: 'improve', improve: { targetId: t.id, phase: 'practice' }, createdAt: now, items, minutes: items.length * 4,
      objective: `Targeted practice for “${t.title}”. ${t.key === 'hints' ? 'Write a first attempt before opening any hint.' : t.explain}` };
  }
  function reassessSession(t, profile, history, now) {
    now = now || Date.now(); const used = new Set(t.practice.flatMap(p => p.games || []));
    const all = applicableGames(t.key).filter(g => !E.GAME[g].integrated); const fresh = all.filter(g => !used.has(g));
    const items = pick(fresh.length >= 2 ? fresh : all, 2, profile, history, t.id + 'r' + t.reassess.length, now);
    return { id: 'imp-r-' + t.id + '-' + t.reassess.length, type: 'improve', improve: { targetId: t.id, phase: 'reassess' }, createdAt: now, items, minutes: items.length * 4,
      objective: 'A check in new exercises. Nothing here tells you which habit is being checked, so work as you normally would.' };
  }
  function recordSession(t, sess, now) { const k = copy(t); const rec = { id: sess.id, created: now || Date.now(), size: sess.items.length, games: sess.items.map(i => i.game) }; if (sess.improve.phase === 'practice') k.practice.push(rec); else k.reassess.push(rec); return k; }

  const api = { WHY, ACTIVE, STATE_LABEL, applicableGames, occurred: occurredAttempt, candidates, slotsUsed, createTarget, transition, refresh, practiceSession, reassessSession, recordSession };
  if (isNode) module.exports = api; else root.MWI = api;
})(this);
