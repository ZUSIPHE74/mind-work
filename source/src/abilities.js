/* MINDWORK Thinking Abilities framework — pure logic.
   Which activities train each of the 12 abilities, and which evidence stage your recorded work shows for each.
   Stages are computed by fixed rules from attempts; they describe what has been shown in these activities only. */
(function (root) {
  const isNode = typeof module !== 'undefined';
  const E = isNode ? require('./engine.js') : root.MW;
  const R = isNode ? require('./reflect.js') : root.MWR;
  const PZ = isNode ? require('./puzzles.js') : root.MWPZ;
  const DAY = 864e5;
  const ABILITIES = [
    { id: 'critical', name: 'Critical Thinking', blurb: 'Questioning information instead of accepting it.', develops: ['Questioning claims', 'Identifying assumptions', 'Fact, opinion and interpretation', 'Examining evidence', 'Evaluating competing explanations', 'Recognising uncertainty'], dims: ['reasoning', 'nuance', 'relevance'] },
    { id: 'analytical', name: 'Analytical Thinking', blurb: 'Breaking something into parts to understand it.', develops: ['Decomposition', 'Identifying components and relationships', 'Comparing information', 'Organising complex information', 'Finding underlying problems'], dims: ['organisation', 'connections', 'reasoning'] },
    { id: 'creative', name: 'Creative Thinking', blurb: 'Generating new and original ideas.', develops: ['Idea generation', 'Divergent thinking', 'Combining unrelated concepts', 'Exploring alternatives', 'Developing ideas beyond the obvious'], dims: ['variety', 'development'] },
    { id: 'logical', name: 'Logical Thinking', blurb: 'Using facts and reasoning to reach sound conclusions.', develops: ['Whether conclusions follow from premises', 'Recognising contradictions', 'Conditional reasoning', 'Working with rules and constraints'], dims: ['reasoning'] },
    { id: 'strategic', name: 'Strategic Thinking', blurb: 'Seeing the bigger picture and planning towards a goal.', develops: ['Long-term thinking', 'Prioritisation', 'Anticipating consequences', 'Trade-offs', 'Adapting a strategy'], dims: ['reasoning'] },
    { id: 'problem', name: 'Problem-Solving Thinking', blurb: 'Finding ways to overcome challenges.', develops: ['Defining problems', 'Root causes', 'Generating and evaluating solutions', 'Learning from unsuccessful attempts'], dims: ['reasoning', 'variety'] },
    { id: 'lateral', name: 'Lateral Thinking', blurb: 'Approaching a problem from an unusual angle.', develops: ['Challenging conventional assumptions', 'Reframing questions', 'Alternative interpretations', 'Non-obvious possibilities'], dims: ['variety', 'reasoning'] },
    { id: 'abstract', name: 'Abstract Thinking', blurb: 'Understanding ideas that cannot be seen or touched.', develops: ['Underlying principles', 'Generalising from examples', 'Analogies', 'Moving between concrete and abstract', 'Applying concepts to new contexts'], dims: ['connections', 'development', 'clarity'] },
    { id: 'reflective', name: 'Reflective Thinking', blurb: 'Examining experience to learn from it.', develops: ['Reviewing decisions and outcomes', 'Identifying what worked and what didn’t', 'Applying lessons to future situations'], dims: ['development'] },
    { id: 'systems', name: 'Systems Thinking', blurb: 'Understanding how parts connect and affect each other.', develops: ['Interdependencies', 'Feedback loops', 'Unintended consequences', 'How a change in one part affects the whole'], dims: ['connections', 'reasoning', 'development'] },
    { id: 'intuitive', name: 'Intuitive Thinking', blurb: 'Quick judgements, and knowing when to trust them.', develops: ['Recognising intuitive reactions', 'Comparing first judgements with later evidence', 'Knowing when more evidence is needed'], dims: [] },
    { id: 'metacognitive', name: 'Metacognitive Thinking', blurb: 'Thinking about how you think and learn.', develops: ['Monitoring your thinking', 'Recognising knowledge gaps', 'Evaluating your own reasoning', 'Knowing when to change approach'], dims: [] }];
  const AB = Object.fromEntries(ABILITIES.map(a => [a.id, a]));

  // Primary ability first. Games with no entry train communication skills rather than one of the 12 abilities.
  const GAME_TAGS = {
    beyond: ['creative', 'analytical'], possibility: ['creative', 'problem'], whatelse: ['lateral', 'critical'], expand: ['creative', 'abstract'],
    dots: ['creative', 'analytical'], hidden: ['systems', 'abstract'], chain: ['systems', 'analytical'], explainconn: ['abstract', 'analytical'],
    challenge: ['critical', 'reflective', 'metacognitive'], weaklink: ['logical', 'critical'], evidence: ['critical', 'analytical'], missing: ['critical', 'metacognitive'],
    rankexp: ['critical', 'problem'], perspectives: ['lateral', 'critical'], meaning: ['lateral', 'abstract'], reverse: ['lateral', 'critical'], both: ['logical', 'abstract'],
    chaos: ['analytical', 'systems'], mainpoint: ['analytical', 'critical'], argue: ['logical', 'critical'], diff: ['abstract', 'analytical'],
    exact: ['metacognitive'], simple: ['abstract'], nuance: ['critical'], norepeat: ['creative'], between: ['lateral', 'metacognitive'],
    integrated: ['problem', 'critical', 'analytical', 'systems'], deep: ['abstract', 'reflective', 'metacognitive'] };
  const STUDY_TAGS = { relation: ['systems', 'abstract'], compare: ['analytical'], why: ['critical'], application: ['abstract', 'problem'], cumulative: ['analytical'], map: ['systems', 'analytical'] };
  const STUDY_NAMES = { relation: 'Explain relationships (Study Lab)', compare: 'Compare and contrast (Study Lab)', why: 'Ask why (Study Lab)', application: 'Application and transfer (Study Lab)', cumulative: 'Cumulative challenge (Study Lab)', map: 'Concept map (Study Lab)' };
  const OTHER = { reflective: ['Thinking Replay reflections', 'Thinking Journal explorations and reflections', 'Revising after feedback'], intuitive: ['Rating your answer before feedback', 'Confidence before checking in the Study Lab'], metacognitive: ['Rating your answer before feedback', 'Confidence before checking in the Study Lab'] };
  const PLANNED = {};

  function activitiesFor(id) {
    const games = Object.entries(GAME_TAGS).filter(([, t]) => t.includes(id)).map(([g, t]) => ({ kind: 'game', id: g, name: E.GAME[g].name, cat: E.GAME[g].cat, primary: t[0] === id }));
    const study = Object.entries(STUDY_TAGS).filter(([, t]) => t.includes(id)).map(([k, t]) => ({ kind: 'study', id: k, name: STUDY_NAMES[k], primary: t[0] === id }));
    const puzzles = PZ.CATS.filter(c => c.abilities.includes(id)).map(c => ({ kind: 'puzzle', id: c.id, name: 'Puzzle Arena: ' + c.name, primary: c.abilities[0] === id, count: PZ.PUZZLES.filter(p => p.cat === c.id).length }));
    return { games: games.sort((a, b) => b.primary - a.primary), study, puzzles: puzzles.sort((a, b) => b.primary - a.primary), other: OTHER[id] || [], planned: PLANNED[id] || null };
  }

  const quality = (a, id) => { const d = AB[id].dims.map(k => (a.dims || {})[k]).filter(v => v != null); return d.length ? d.reduce((s, v) => s + v, 0) / d.length : a.overall; };
  /* One evidence event per ability an activity exercised. success = shown independently and well enough by the rule for that source. */
  function events(st) {
    const out = []; const seen = new Set();
    const atts = (st.attempts || []).filter(a => a.status !== 'skipped' && a.overall != null).slice().sort((x, y) => x.t - y.t);
    const sessType = id => ((st.sessions || {})[id] || {}).type;
    atts.forEach(a => {
      const tags = GAME_TAGS[a.game] || []; const first = !seen.has(a.game); seen.add(a.game);
      const hints = a.hints || 0; const env = sessType(a.sessionId) === 'improve' ? 'improve' : (E.GAME[a.game] && E.GAME[a.game].deep) ? 'deep' : 'playground';
      tags.forEach((ab, i) => { const q = quality(a, ab); out.push({ ability: ab, t: a.t, env, activity: a.game, hints, primary: i === 0, quality: q, success: hints === 0 && q >= 2.8, first, transfer: a.game === 'integrated' || (a.custom && a.custom.src), source: 'attempt', ref: a.id }); });
      if (a.selfRating) { const ok = a.selfRating === E.selfBand(a.overall); ['intuitive', 'metacognitive'].forEach(ab => out.push({ ability: ab, t: a.t, env: 'playground', activity: 'self-rating', hints: 0, primary: true, success: ok, first: false, transfer: false, source: 'calibration', ref: a.id })); }
      const v = R.versionsOf(a); if (v.length > 1) out.push({ ability: 'reflective', t: v[v.length - 1].t, env: 'playground', activity: 'revision', hints: 0, primary: true, success: v[v.length - 1].overall - v[0].overall >= 0.4, first: false, transfer: false, source: 'revision', ref: a.id });
      (a.reflections || []).forEach(r => out.push({ ability: 'reflective', t: r.t, env: 'replay', activity: 'replay-reflection', hints: 0, primary: true, success: Object.keys(r.answers || {}).length >= 2, first: false, transfer: false, source: 'reflection', ref: a.id }));
    });
    const seenS = new Set();
    (st.slog || []).slice().sort((x, y) => x.t - y.t).forEach(l => {
      const tags = STUDY_TAGS[l.type]; const first = !seenS.has(l.type); seenS.add(l.type);
      if (tags) tags.forEach((ab, i) => out.push({ ability: ab, t: l.t, env: 'study', activity: 'study-' + l.type, hints: 0, primary: i === 0, success: l.type === 'map' ? (l.edges ? l.supported / l.edges >= 0.5 : false) : l.final === 'correct', first, transfer: l.mode === 'transfer' || l.type === 'application', source: 'study', ref: l.id }));
      if (l.conf != null && l.final && l.type !== 'free') { const ok = (l.conf >= 2) === (l.final === 'correct'); ['intuitive', 'metacognitive'].forEach(ab => out.push({ ability: ab, t: l.t, env: 'study', activity: 'confidence', hints: 0, primary: true, success: ok, first: false, transfer: false, source: 'calibration', ref: l.id })); }
    });
    const seenP = new Set();
    (st.puzzles || []).filter(e => e.done).slice().sort((x, y) => x.t - y.t).forEach(e => { const c = PZ.CAT[e.cat]; if (!c) return; const first = !seenP.has(e.pid); seenP.add(e.pid); const pz = PZ.PZ[e.pid] || {};
      c.abilities.forEach((ab, i) => out.push({ ability: ab, t: e.t, env: 'puzzles', activity: 'pz-' + e.cat, hints: e.hints || 0, primary: i === 0, success: e.solved && !e.revealed && (e.hints || 0) === 0 && ['sound', 'solved'].includes(e.outcome), first, transfer: !!pz.boss, source: 'puzzle', ref: e.id }));
      if (e.conf != null && e.outcome && e.outcome !== 'revealed') ['intuitive', 'metacognitive'].forEach(ab => out.push({ ability: ab, t: e.t, env: 'puzzles', activity: 'confidence', hints: 0, primary: true, success: (e.conf >= 2) === !!e.firstCorrect, first: false, transfer: false, source: 'calibration', ref: e.id })); });
    (st.obs || []).forEach(o => { const tags = { vm: ['analytical'], sc: ['analytical'], ob: ['analytical', 'critical'] }[o.ex] || []; tags.forEach((ab, i) => out.push({ ability: ab, t: o.t, env: 'observation', activity: 'obs-' + o.ex, hints: 0, primary: i === 0, success: o.right / o.n >= 0.8, first: false, transfer: o.lvl >= 3, source: 'observation', ref: o.id })); });
    (st.ai || []).forEach(s => ((s.feedback && s.feedback.abilities) || []).forEach(a => out.push({ ability: a.id, t: s.t, env: 'ai', activity: 'ai-' + s.kind, hints: 0, primary: true, success: true, first: false, transfer: s.kind === 'deep', source: 'AI feedback quoting your words', ref: s.id })));
    (st.comp || []).filter(e => e.kind === 'demonstrated' && e.evidence && e.source !== 'rules').forEach(e => { const C = (typeof MWCP !== 'undefined' ? MWCP : require('./competency.js')).BY[e.comp]; (C ? C.abilities : []).forEach((ab, i) => out.push({ ability: ab, t: e.t, env: String(e.ctx || '').split(':')[0] || 'mentor', activity: 'comp-' + e.comp, hints: e.hinted ? 1 : 0, primary: i === 0, success: true, first: false, transfer: !!e.unfamiliar, source: e.source, ref: e.comp + e.t })); });
    const ex = st.extra || {}; const M = { components: 'analytical', assumptions: 'critical', creative: 'creative', logic: 'logical', longterm: 'strategic', system: 'systems', reframe: 'lateral' };
    (ex.approaches || []).forEach(x => (x.methods || []).map(m => M[m]).concat(['metacognitive']).forEach(ab => out.push({ ability: ab, t: x.t, env: 'approaches', activity: 'approaches', hints: 0, primary: true, success: false, first: false, transfer: false, source: 'exposure', ref: x.id })));
    const FA = Object.fromEntries((typeof MWF !== 'undefined' ? MWF : require('./ui-formats.js')).FORMATS.map(f => [f.id, f.abilities]));
    (ex.formats || []).forEach(x => (FA[x.f] || []).forEach((ab, i) => out.push({ ability: ab, t: x.t, env: 'playground', activity: 'fmt-' + x.f, hints: 0, primary: i === 0, success: x.right / x.n >= 0.8, first: false, transfer: false, source: 'exercise', ref: x.id })));
    (ex.kia || []).forEach(x => ['abstract', 'problem'].forEach(ab => out.push({ ability: ab, t: x.t, env: 'learn', activity: 'kia', hints: 0, primary: true, success: false, first: false, transfer: true, source: 'exposure', ref: x.id })));
    (st.journal || []).forEach(j => { if ((j.explorations || []).length || (j.reflection || []).length) out.push({ ability: 'reflective', t: j.updated, env: 'journal', activity: 'journal', hints: 0, primary: true, success: (j.explorations || []).length >= 2 || (j.reflection || []).length >= 1, first: false, transfer: false, source: 'journal', ref: j.id }); });
    return out;
  }

  const STAGES = [
    { id: 'exposure', name: 'Exposure', rule: 'At least one activity that exercises it.' },
    { id: 'guided', name: 'Guided practice', rule: 'Completed with hints or guidance at least once.' },
    { id: 'independent', name: 'Independent application', rule: 'Done well without hints at least twice.' },
    { id: 'unfamiliar', name: 'Unfamiliar situations', rule: 'Done well without hints in an activity met for the first time, or in a transfer or integrated challenge.' },
    { id: 'consistent', name: 'Consistent across contexts', rule: 'Done well without hints in at least three different activities, in two or more environments, on two or more days, with recent work still at that standard.' }];
  function stageFor(evs) {
    const succ = evs.filter(e => e.success && e.hints === 0);
    const acts = new Set(succ.map(e => e.activity)), envs = new Set(succ.map(e => e.env)), days = new Set(succ.map(e => Math.floor(e.t / DAY)));
    const recent = evs.slice(-6); const recentRate = recent.length ? recent.filter(e => e.success).length / recent.length : 0;
    const met = {
      exposure: evs.length >= 1, guided: evs.some(e => e.hints > 0), independent: succ.length >= 2,
      unfamiliar: succ.some(e => e.first || e.transfer),
      consistent: acts.size >= 3 && envs.size >= 2 && days.size >= 2 && recentRate >= 0.6 };
    const order = ['exposure', 'independent', 'unfamiliar', 'consistent']; // guided practice is recorded but not required to move on
    let stage = null; for (const s of order) { if (met[s]) stage = s; else break; }
    const next = order.find(s => !met[s]) || null;
    return { met, stage, next, counts: { events: evs.length, successes: succ.length, activities: acts.size, environments: envs.size, days: days.size, recentRate } };
  }
  function overview(st) {
    const ev = events(st);
    return ABILITIES.map(a => { const e = ev.filter(x => x.ability === a.id).sort((x, y) => x.t - y.t); return Object.assign({ ability: a, evidence: e }, stageFor(e)); });
  }
  const api = { ABILITIES, AB, GAME_TAGS, STUDY_TAGS, STAGES, activitiesFor, events, stageFor, overview };
  if (isNode) module.exports = api; else root.MWA = api;
})(this);
