/* MINDWORK reflection engine — history (schema 2), Thinking Replay comparison, Thinking Patterns, backups.
   Pure functions; no DOM. Historical records are never mutated in place by anything here. */
(function (root) {
  const E = typeof module !== 'undefined' ? require('./engine.js') : root.MW;
  const T = E.text;
  const SCHEMA = 2;
  const copy = o => o == null ? o : JSON.parse(JSON.stringify(o));
  const short = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; };

  // ───────── history
  function snapshot(fb) {
    return { communicated: fb.communicated, explored: fb.explored.slice(), good: fb.good.slice(), unexplored: fb.unexplored.slice(), attention: fb.attention.slice(),
      question: fb.question, reveal: fb.reveal.slice(), dims: Object.assign({}, fb.dims), overall: fb.overall };
  }
  function itemFor(a) { return a.custom || E.resolveItem(a.itemId); }

  /* Schema-1 attempts kept: responses (latest), revisions[] = each replaced version with the time it was replaced.
     Version k's submission time is therefore a.t for k=1 and revisions[k-2].t afterwards. Feedback text, hint timing
     and stage timing were not stored, so they are left empty and flagged rather than reconstructed. */
  function migrateAttempt(a) {
    if (!a || a.schema >= SCHEMA) return a;
    const b = copy(a); const rev = b.revisions || [];
    const versions = [];
    rev.forEach((r, i) => versions.push({ v: i + 1, t: i === 0 ? b.t : rev[i - 1].t, responses: r.responses, overall: r.overall, dims: r.dims, feedback: null, selfRating: i === 0 ? b.selfRating || null : null }));
    if (b.status !== 'skipped') versions.push({ v: versions.length + 1, t: rev.length ? rev[rev.length - 1].t : b.t, responses: b.responses, overall: b.overall, dims: b.dims, feedback: null, selfRating: rev.length ? null : b.selfRating || null });
    b.versions = versions; b.events = b.events || []; b.legacy = true; b.schema = SCHEMA;
    b.reflections = b.reflections || [];
    return b;
  }
  function versionsOf(a) { return (a.schema >= SCHEMA ? a : migrateAttempt(a)).versions || []; }
  function feedbackFor(a, ver) {
    if (ver.feedback) return { fb: ver.feedback, recorded: true };
    const it = itemFor(a); if (!it) return { fb: null, recorded: false };
    try { return { fb: snapshot(E.evaluate(it, ver.responses || {})), recorded: false }; } catch (e) { return { fb: null, recorded: false }; }
  }

  // ───────── replay timeline (only events that actually occurred)
  function timeline(a) {
    const m = a.schema >= SCHEMA ? a : migrateAttempt(a);
    const it = itemFor(m); const out = [];
    out.push({ t: (m.events.find(e => e.type === 'start') || {}).t || m.t, type: 'challenge', item: it });
    m.events.filter(e => e.type === 'hint').forEach(e => out.push({ t: e.t, type: 'hint', n: e.n, text: e.text }));
    m.events.filter(e => e.type === 'reveal').forEach(e => out.push({ t: e.t, type: 'reveal' }));
    m.versions.forEach(v => {
      const f = feedbackFor(m, v);
      out.push({ t: v.t, type: v.v === 1 ? 'initial' : 'revision', v: v.v, responses: v.responses, selfRating: v.selfRating, overall: v.overall });
      out.push({ t: v.t + 1, type: 'feedback', v: v.v, fb: f.fb, recorded: f.recorded });
    });
    (m.reflections || []).forEach(r => out.push({ t: r.t, type: 'reflection', answers: r.answers, useful: r.useful || [] }));
    out.sort((x, y) => x.t - y.t || order(x.type) - order(y.type));
    return { attempt: m, item: it, events: out, legacy: !!m.legacy, hintCountOnly: m.legacy && m.hints > 0 ? m.hints : 0 };
  }
  const ORD = { challenge: 0, hint: 1, initial: 2, feedback: 3, reveal: 4, revision: 5, reflection: 6 };
  const order = t => ORD[t] == null ? 9 : ORD[t];

  // ───────── turn a stage's response into comparable units
  function units(stage, val, item) {
    const sents = s => T.sentences(String(s || '')).map(x => x.trim()).filter(Boolean);
    if (val == null) return [];
    switch (stage.kind) {
      case 'text': case 'reply': return sents(val);
      case 'ideas': case 'chain': return (val || []).map(x => String(x || '').trim()).filter(Boolean);
      case 'fields': return Object.entries(val || {}).filter(([, v]) => String(v).trim()).map(([k, v]) => `${stage.fields[k]}: ${String(v).trim()}`);
      case 'choice': return (val.choice != null ? [`Chose: ${stage.options[val.choice]}`] : []).concat(sents(val.text));
      case 'pick': return [`Selected: ${stage.parts[val]}`];
      case 'order': return [`Ranking: ${(val || []).map((k, i) => (i + 1) + '. ' + stage.items[k]).join('  ')}`];
      case 'sort': return Object.entries(val || {}).map(([k, b]) => `${stage.items[k]} → ${(E.EVCATS.find(c => c.id === b) || {}).name || b}`);
      case 'group': return Object.entries((val || {}).assign || {}).map(([k, g]) => `${stage.items[k]} → ${(val.names || [])[g] || 'Group ' + (+g + 1)}`);
      case 'branch': return (val.log || []).filter(l => l.who === 'you').map(l => 'You said: ' + l.t);
    }
    return [];
  }
  const QUAL = ['often', 'sometimes', 'usually', 'tend', 'may', 'might', 'unless', 'depends', 'not always', 'for some', 'most', 'partly', 'probably', 'likely', 'when', 'if', 'only', 'mostly', 'generally', 'can'];
  const CAUSE = ['because', 'since', 'so', 'therefore', 'which means', 'leads to', 'as a result', 'due to', 'this means', 'in turn', 'which is why'];

  /* Compare first and last version, stage by stage. Matching is by shared content words, which is reliable for
     "unchanged", "reworded" and "removed", and only suggestive for "clarified", "qualified" and "added reasoning". */
  function compare(item, first, last) {
    const stages = E.stagesFor(item); const res = [];
    stages.forEach(st => {
      const id = st.kind === 'branch' ? 'path' : st.id;
      const A = units(st, (first || {})[id], item), B = units(st, (last || {})[id], item);
      const usedA = new Set(); const items = [];
      B.forEach(b => {
        let best = -1, bi = -1; A.forEach((a, i) => { const o = T.overlap(a, b); if (o > best) { best = o; bi = i; } });
        const norm = s => s.toLowerCase().replace(/\s+/g, ' ').trim();
        let kind;
        if (bi >= 0 && norm(A[bi]) === norm(b)) kind = 'unchanged';
        else if (best >= 0.35) {
          const qa = T.findMarkers(A[bi], QUAL).length, qb = T.findMarkers(b, QUAL).length;
          const ca = T.findMarkers(A[bi], CAUSE).length, cb = T.findMarkers(b, CAUSE).length;
          const la = T.words(A[bi]).length, lb = T.words(b).length;
          if (qb > qa) kind = 'qualified'; else if (cb > ca) kind = 'reasoning'; else if (best >= 0.75 && lb <= la * 1.3) kind = 'reworded'; else kind = 'clarified';
        } else kind = 'new';
        if (kind !== 'new') usedA.add(bi);
        items.push({ kind, text: b, from: kind !== 'new' && kind !== 'unchanged' ? A[bi] : null });
      });
      const removed = A.filter((a, i) => !usedA.has(i) && !B.some(b => T.overlap(a, b) >= 0.35));
      if (items.length || removed.length) res.push({ stage: st, items, removed });
    });
    const tally = {}; res.forEach(r => { r.items.forEach(x => tally[x.kind] = (tally[x.kind] || 0) + 1); tally.removed = (tally.removed || 0) + r.removed.length; });
    return { stages: res, tally };
  }

  /* What the first feedback pointed at, and whether the final feedback still points at it. */
  function overlooked(firstFb, lastFb, same) {
    if (!firstFb) return [];
    const out = [];
    const still = s => !same && lastFb && (lastFb.unexplored.includes(s) || lastFb.attention.includes(s));
    firstFb.unexplored.forEach(s => out.push({ kind: 'angle', text: s, status: same ? 'open' : still(s) ? 'open' : 'addressed', firm: false }));
    firstFb.attention.forEach(s => out.push({ kind: 'attention', text: s, status: same ? 'open' : still(s) ? 'open' : 'addressed', firm: /same idea in different words|left blank|didn’t list|only a question|still empty/.test(s) }));
    return out;
  }

  // ───────── Thinking Patterns (from first submissions: initial thinking, before feedback)
  const LISTGAMES = ['beyond', 'possibility', 'whatelse', 'reverse', 'between', 'missing', 'both', 'dots', 'integrated', 'deep'];
  const has = (fb, re) => fb.attention.some(x => re.test(x));
  // every reply in this attempt's first version was a question, with no statement of the user's own alongside it
  function questionOnlyReply(a) {
    const v = versionsOf(a)[0]; if (!v) return false;
    const rs = Object.entries(v.responses || {}).filter(([k, t]) => /^(r1|r2|reply)$/.test(k) && typeof t === 'string' && t.trim()); if (!rs.length) return false;
    return rs.every(([, t]) => { const ss = t.split(/(?<=[.!?])\s+/).filter(Boolean); return ss.some(x => /\?\s*$/.test(x)) && !ss.some(x => !/\?\s*$/.test(x) && x.trim().split(/\s+/).length >= 4); });
  }
  const DETECT = [
    { id: 'first', kind: 'difficulty', name: 'Settling on the first explanation', applies: (a, fb) => LISTGAMES.includes(a.game) && fb.dims.variety != null, occurs: (a, fb) => fb.dims.variety < 2.2,
      explain: 'You produced few genuinely different possibilities before moving on.', practise: ['possibility', 'whatelse', 'reverse'] },
    { id: 'reword', kind: 'difficulty', name: 'Repeating an idea in different words', applies: (a, fb) => fb.dims.variety != null, occurs: (a, fb) => has(fb, /same idea in different words|same point|say nearly the same|sounding the same/),
      explain: 'Two entries you offered as different turned out to share the same mechanism.', practise: ['possibility', 'expand', 'meaning'] },
    { id: 'unlinked', kind: 'difficulty', name: 'Many ideas, few connections', applies: (a, fb) => fb.dims.variety != null && (fb.dims.connections != null || fb.dims.reasoning != null), occurs: (a, fb) => fb.dims.variety >= 3 && Math.min(fb.dims.connections == null ? 4 : fb.dims.connections, fb.dims.reasoning == null ? 4 : fb.dims.reasoning) < 2,
      explain: 'You generated several distinct ideas but didn’t state how they relate.', practise: ['dots', 'chain', 'explainconn'] },
    { id: 'noreason', kind: 'difficulty', name: 'Conclusions without the reasoning', applies: (a, fb) => fb.dims.reasoning != null, occurs: (a, fb) => fb.dims.reasoning < 2,
      explain: 'Claims appeared without the “because” that links them to their support.', practise: ['argue', 'weaklink', 'hidden'] },
    { id: 'unqualified', kind: 'difficulty', name: 'Missing qualifications', applies: (a, fb) => fb.dims.nuance != null, occurs: (a, fb) => fb.dims.nuance < 2 || has(fb, /makes the claim absolute|is still absolute/),
      explain: 'The main point came across, but without the conditions that say where it holds.', practise: ['nuance', 'both', 'diff'] },
    { id: 'vague', kind: 'difficulty', name: 'General wording where specifics were needed', applies: (a, fb) => fb.dims.specificity != null, occurs: (a, fb) => fb.dims.specificity < 2 || has(fb, /vague words|still general|is abstract/),
      explain: 'The wording left the listener to fill in what you meant.', practise: ['exact', 'simple', 'diff'] },
    { id: 'hints', kind: 'difficulty', name: 'Needing several hints to get going', applies: () => true, occurs: (a) => hintsBeforeFirst(a) >= 2,
      explain: 'Two or more hints were opened before the first submission.', practise: ['beyond', 'possibility'] },
    { id: 'qonly', kind: 'difficulty', name: 'Relying on questions alone', applies: (a) => E.GAME[a.game] && E.GAME[a.game].cat === 'convo' && a.game !== 'branch', occurs: (a) => questionOnlyReply(a),
      explain: 'Across several conversations, your replies were questions with nothing of your own alongside. One question is a natural reply; relying on them alone over many conversations can make exchanges feel like interviews.', practise: ['keepgoing', 'beyondq', 'followup'] },
    { id: 'independent', kind: 'strength', name: 'Independent idea generation', applies: (a, fb) => fb.dims.variety != null, occurs: (a, fb) => fb.dims.variety >= 3 && hintsBeforeFirst(a) === 0,
      explain: 'Several genuinely different ideas, with no hints opened first.' },
    { id: 'qualifies', kind: 'strength', name: 'Qualifying claims with conditions', applies: (a, fb) => fb.dims.nuance != null, occurs: (a, fb) => fb.dims.nuance >= 3.5,
      explain: 'Claims came with the conditions under which they hold.' },
    { id: 'revises', kind: 'strength', name: 'Revising a position effectively', applies: (a) => versionsOf(a).length > 1, occurs: (a) => { const v = versionsOf(a); return v[v.length - 1].overall - v[0].overall >= 0.5; },
      explain: 'After feedback, your revision addressed what it pointed to.' }
  ];
  function hintsBeforeFirst(a) {
    const m = a.schema >= SCHEMA ? a : migrateAttempt(a);
    if (m.legacy) return m.hints || 0; // only the final count is known for older records
    const first = m.versions[0]; return m.events.filter(e => e.type === 'hint' && (!first || e.t <= first.t)).length;
  }
  function firstFeedback(a) { const v = versionsOf(a)[0]; return v ? feedbackFor(a, v).fb : null; }

  function patterns(attempts, opts) {
    opts = opts || {}; const window = opts.window || 20;
    const done = attempts.filter(a => a.status !== 'skipped' && itemFor(a)).slice().sort((x, y) => x.t - y.t);
    const fbs = new Map(done.map(a => [a.id, firstFeedback(a)]));
    const out = [];
    DETECT.forEach(d => {
      const app = done.filter(a => fbs.get(a.id) && d.applies(a, fbs.get(a.id)));
      const recent = app.slice(-window);
      const occ = recent.filter(a => d.occurs(a, fbs.get(a.id)));
      if (!occ.length) return;
      const rate = occ.length / recent.length;
      let level = 'single';
      if (occ.length >= 4 && rate >= 0.4 && recent.length >= 6) level = 'established';
      else if (occ.length >= 2 && rate >= 0.3) level = 'emerging';
      else if (occ.length >= 2) level = 'occasional';
      let trend = null;
      if (app.length >= 8) {
        const half = Math.floor(app.length / 2), early = app.slice(0, half), late = app.slice(half);
        const r = arr => arr.filter(a => d.occurs(a, fbs.get(a.id))).length / arr.length;
        const re = r(early), rl = r(late); trend = { early: re, recent: rl, dir: rl - re <= -0.15 ? 'less' : rl - re >= 0.15 ? 'more' : 'steady', nEarly: early.length, nRecent: late.length };
      }
      const evidence = occ.slice(-3).reverse().map(a => {
        const fb = fbs.get(a.id); const v1 = versionsOf(a)[0];
        const line = d.kind === 'difficulty' ? (fb.attention.find(x => /same idea|absolute|vague|reason|only a question|genuinely different|links are implied|isn’t clear/.test(x)) || fb.attention[0] || '') : (fb.good[0] || fb.explored[0] || '');
        return { attemptId: a.id, t: a.t, game: a.game, excerpt: short(firstText(v1 && v1.responses), 140), line: short(line, 180) };
      });
      out.push({ id: d.id, kind: d.kind, name: d.name, explain: d.explain, practise: d.practise || [], level, count: occ.length, of: recent.length, rate, trend, evidence });
    });
    // dimension trends across initial attempts (needs enough data on both sides)
    ['variety', 'reasoning', 'nuance', 'organisation', 'specificity'].forEach(k => {
      const vals = done.map(a => ({ a, v: (fbs.get(a.id) || { dims: {} }).dims[k] })).filter(x => x.v != null);
      if (vals.length < 8) return;
      const half = Math.floor(vals.length / 2); const avg = arr => arr.reduce((s, x) => s + x.v, 0) / arr.length;
      const e = avg(vals.slice(0, half)), r = avg(vals.slice(half));
      if (r - e >= 0.6) out.push({ id: 'trend-' + k, kind: 'strength', name: { variety: 'Increasingly varied explanations', reasoning: 'More explicit reasoning', nuance: 'More precise qualification', organisation: 'Stronger organisation', specificity: 'More specific wording' }[k],
        explain: `Your first attempts average ${r.toFixed(1)} on ${k} recently, against ${e.toFixed(1)} earlier.`, level: 'emerging', count: vals.length - half, of: vals.length - half, rate: 1, trend: { early: e, recent: r, dir: 'more', nEarly: half, nRecent: vals.length - half }, evidence: [] });
    });
    const rank = { established: 0, emerging: 1, occasional: 2, single: 3 };
    return out.sort((x, y) => rank[x.level] - rank[y.level] || y.count - x.count);
  }
  function firstText(resp) { const parts = []; const walk = v => { if (v == null) return; if (typeof v === 'string') parts.push(v); else if (Array.isArray(v)) v.forEach(walk); else if (typeof v === 'object') Object.entries(v).forEach(([k, x]) => { if (!['tags', 'log', 'end', 'lastLine', 'assign', 'names', 'choice'].includes(k)) walk(x); }); }; walk(resp); return parts.filter(Boolean).join(' / '); }

  // ───────── journal helpers
  const EXPLORE = [
    { id: 'clarify', q: 'What exactly are you trying to say?' }, { id: 'grounds', q: 'What makes you think this?' },
    { id: 'alternatives', q: 'What else could explain it?' }, { id: 'assumptions', q: 'What are you assuming?' },
    { id: 'challenge', q: 'What would challenge your view?' }, { id: 'implications', q: 'What are the implications?' },
    { id: 'connections', q: 'How does this connect to something else?' }];
  const JTYPES = [['observation', 'Observation'], ['opinion', 'Opinion'], ['question', 'Question'], ['idea', 'Idea'], ['unresolved', 'Unresolved thought']];
  function newThought(type, text, now) { now = now || Date.now(); return { id: 'j' + now.toString(36) + Math.random().toString(36).slice(2, 6), schema: 1, type, created: now, updated: now, status: 'open', versions: [{ t: now, text }], explorations: [], links: [], reflection: [] }; }
  function reviseThought(j, text, now) { const last = j.versions[j.versions.length - 1]; if (last && last.text === text) return j; const k = copy(j); k.versions.push({ t: now || Date.now(), text }); k.updated = now || Date.now(); if (k.status === 'open') k.status = 'developing'; return k; }
  function linkThoughts(list, a, b) { return list.map(j => { if (j.id !== a && j.id !== b) return j; const o = j.id === a ? b : a; if (j.links.includes(o)) return j; const k = copy(j); k.links.push(o); return k; }); }

  // ───────── backups (versioned)
  function stripResponses(a) { const b = copy(a); delete b.responses; delete b.custom; (b.versions || []).forEach(v => { delete v.responses; delete v.feedback; }); (b.revisions || []).forEach(r => delete r.responses); b.events = (b.events || []).filter(e => e.type !== 'hint').map(e => ({ t: e.t, type: e.type })); b.reflections = []; b.stripped = true; return b; }
  function buildBackup(st, kind) {
    const full = kind !== 'progress';
    const sd = Object.assign({ books: [], cards: [], log: [], notes: [], maps: [], links: [] }, st.study || {});
    const study = full ? sd : { books: [], cards: sd.cards, log: sd.log.map(l => Object.assign({}, l, { response: undefined })), notes: [], maps: [], links: [] };
    const imp = copy(st.improve || { targets: [] }); if (!full) imp.targets.forEach(t => { if (t.baseline) t.baseline.evidence = []; });
    const puzzles = (st.puzzles || []).map(e => full ? e : Object.assign({}, e, { reflection: undefined }));
    const comm = (st.comm || []).map(e => full ? e : Object.assign({}, e, { text: undefined, notes: undefined, turns: (e.turns || []).map(t => ({ moves: t.moves })) })); // progress backups keep scores and detected moves, not your words
    const ai = (st.ai || []).map(x => full ? x : { id: x.id, kind: x.kind, title: x.kind === 'deep' && x.qid === 'own' ? 'Your own question' : x.title, t: x.t, covered: x.covered, turnsCount: (x.turns || []).length, moves: x.feedback && x.feedback.moves }); // progress backups: no words
    const character = st.character ? (full ? st.character : { stance: st.character.stance || {}, reviewed: st.character.reviewed || null }) : null;
    const grow = (st.grow || []).map(g => full ? g : { id: g.id, aid: g.aid, area: g.area, t: g.t, real: g.real }); // progress backups: no answers
    const bilingual = (st.bilingual || []).map(b => full ? b : { id: b.id, kind: b.kind, mode: b.mode, t: b.t });
    const vocab = full ? (st.vocab || []) : [];
    const extra = st.extra ? (full ? st.extra : { memStart: st.extra.memStart, kia: (st.extra.kia || []).map(x => ({ id: x.id, t: x.t })), approaches: (st.extra.approaches || []).map(x => ({ id: x.id, t: x.t, methods: x.methods })), formats: st.extra.formats || [], drawings: (st.extra.drawings || []).map(x => ({ id: x.id, task: x.task, t: x.t })), analyses: st.extra.analyses || [], flex: st.extra.flex || [], sequences: (st.extra.sequences || []).map(x => ({ t: x.t })), express: st.extra.express || [] }) : null;
    const comp = (st.comp || []).map(e => full ? e : Object.assign({}, e, { evidence: '' })); const mentor = st.mentor ? (full ? st.mentor : { share: st.mentor.share, size: st.mentor.size }) : null;
    const data = { profile: st.profile, settings: st.settings, sessions: st.sessions, attempts: full ? st.attempts : st.attempts.map(stripResponses), journal: full ? st.journal || [] : [], study, improve: imp, puzzles, comm, ai, character, grow, obs: st.obs || [], bilingual, vocab, extra, comp, mentor };
    return { format: 'mindwork-backup', version: SCHEMA, app: 'mindwork', kind: full ? 'full' : 'progress', exportedAt: new Date().toISOString(),
      counts: { grow: grow.length, obs: (st.obs || []).length, bilingual: bilingual.length, ai: ai.length, comm: comm.length, puzzles: puzzles.length, attempts: data.attempts.length, sessions: data.sessions.length, journal: data.journal.length, books: study.books.length, cards: study.cards.length, notes: study.notes.length, maps: study.maps.length, links: study.links.length }, data: copy(data) };
  }
  function validateBackup(obj) {
    const errors = [];
    if (!obj || typeof obj !== 'object') return { ok: false, errors: ['The file isn’t a MINDWORK backup (it isn’t a JSON object).'] };
    let d, version, kind;
    if (obj.format === 'mindwork-backup') { version = obj.version; kind = obj.kind; d = obj.data || {}; if (version > SCHEMA) errors.push(`This backup was made by a newer version of MINDWORK (format ${version}). Update the app before importing.`); }
    else if (obj.app === 'mindwork' && Array.isArray(obj.attempts)) { version = 1; kind = 'full'; d = { profile: obj.profile, settings: obj.settings, attempts: obj.attempts, sessions: obj.sessions || [], journal: [] }; }
    else return { ok: false, errors: ['The file isn’t a MINDWORK backup.'] };
    if (!Array.isArray(d.attempts)) errors.push('The backup has no exercise history list.');
    const atts = (d.attempts || []).filter(a => a && typeof a.id === 'string' && typeof a.t === 'number' && E.GAME[a.game]);
    const bad = (d.attempts || []).length - atts.length; if (bad) errors.push(`${bad} exercise record${bad > 1 ? 's are' : ' is'} malformed and will be skipped.`);
    const fatal = errors.some(e => /newer version|no exercise history/.test(e));
    const sessions = (d.sessions || []).filter(s => s && typeof s.id === 'string' && Array.isArray(s.items));
    const journal = (d.journal || []).filter(j => j && typeof j.id === 'string' && Array.isArray(j.versions));
    const sd = d.study || {}; const study = { books: (sd.books || []).filter(b => b && b.id && Array.isArray(b.chapters)), cards: (sd.cards || []).filter(c => c && c.qid && Array.isArray(c.history)), log: (sd.log || []).filter(l => l && l.id), notes: (sd.notes || []).filter(n => n && n.id && n.paraId), maps: (sd.maps || []).filter(m => m && m.id && Array.isArray(m.nodes) && Array.isArray(m.edges)), links: (sd.links || []).filter(l => l && l.id && l.a && l.b) };
    return { ok: !fatal, errors, version, kind, exportedAt: obj.exportedAt || null,
      data: { profile: d.profile || null, settings: d.settings || {}, attempts: atts.map(migrateAttempt), sessions, journal, study, improve: { targets: ((d.improve || {}).targets || []).filter(t => t && t.id && t.key && Array.isArray(t.history)) }, puzzles: (d.puzzles || []).filter(e => e && e.id && e.pid), comm: (d.comm || []).filter(e => e && e.id && e.kind && e.area), ai: (d.ai || []).filter(x => x && x.id && x.kind), grow: (d.grow || []).filter(x => x && x.id && x.aid), obs: (d.obs || []).filter(x => x && x.id && x.ex), bilingual: (d.bilingual || []).filter(x => x && x.id), vocab: (d.vocab || []).filter(x => x && (x.en || x.xh)), extra: d.extra && typeof d.extra === 'object' ? d.extra : null, comp: (d.comp || []).filter(e => e && e.comp && e.t), mentor: d.mentor && typeof d.mentor === 'object' ? d.mentor : null, character: d.character && typeof d.character === 'object' ? d.character : null },
      counts: { attempts: atts.length, sessions: sessions.length, journal: journal.length, books: study.books.length, cards: study.cards.length, notes: study.notes.length, maps: study.maps.length, links: study.links.length } };
  }
  function previewMerge(current, incoming) {
    const ids = new Set(current.attempts.map(a => a.id)), jids = new Set((current.journal || []).map(j => j.id)), sids = new Set(current.sessions.map(s => s.id));
    const newA = incoming.attempts.filter(a => !ids.has(a.id)), dupA = incoming.attempts.length - newA.length;
    const newJ = incoming.journal.filter(j => !jids.has(j.id)), dupJ = incoming.journal.length - newJ.length;
    const newS = incoming.sessions.filter(s => !sids.has(s.id));
    const blank = { books: [], cards: [], log: [], notes: [], maps: [], links: [] }; const cs = Object.assign({}, blank, current.study || {}), is = Object.assign({}, blank, incoming.study || {});
    const has = (arr, k) => new Set(arr.map(x => x[k]));
    const hb = has(cs.books, 'id'), hc = has(cs.cards, 'qid'), hl = has(cs.log, 'id'), hn = has(cs.notes, 'id');
    const study = { books: is.books.filter(x => !hb.has(x.id)), cards: is.cards.filter(x => !hc.has(x.qid)), log: is.log.filter(x => !hl.has(x.id)), notes: is.notes.filter(x => !hn.has(x.id)), maps: is.maps.filter(x => !has(cs.maps, 'id').has(x.id)), links: is.links.filter(x => !has(cs.links, 'id').has(x.id)) };
    study.dup = is.books.length - study.books.length + is.cards.length - study.cards.length;
    const tids = new Set(((current.improve || {}).targets || []).map(t => t.id)); const newTargets = ((incoming.improve || {}).targets || []).filter(t => !tids.has(t.id));
    const pids = new Set((current.puzzles || []).map(e => e.id)); const newPuzzles = (incoming.puzzles || []).filter(e => !pids.has(e.id));
    const cids = new Set((current.comm || []).map(e => e.id)); const newComm = (incoming.comm || []).filter(e => !cids.has(e.id));
    const aids = new Set((current.ai || []).map(e => e.id)); const newAi = (incoming.ai || []).filter(e => !aids.has(e.id));
    const nw = (k) => { const ids = new Set((current[k] || []).map(e => e.id)); return (incoming[k] || []).filter(e => !ids.has(e.id)); }; const newGrow = nw('grow'), newObs = nw('obs'), newBil = nw('bilingual'); const vk = new Set((current.vocab || []).map(v => v.en + '|' + v.xh)); const newVocab = (incoming.vocab || []).filter(v => !vk.has(v.en + '|' + v.xh));
    return { newGrow, newObs, newBil, newVocab, newAi, newComm, newPuzzles, newTargets, study, newAttempts: newA, newJournal: newJ, newSessions: newS, dupAttempts: dupA, dupJournal: dupJ, dupSessions: incoming.sessions.length - newS.length };
  }
  /* The skill profile is a pure function of the attempt history, so after a merge it is rebuilt rather than averaged. */
  function rebuildProfile(attempts) {
    const P = E.emptyProfile();
    attempts.filter(a => a.status !== 'skipped' && a.overall != null && E.GAME[a.game]).slice().sort((x, y) => x.t - y.t)
      .forEach(a => E.updateProfile(P, Object.assign({}, a, { levelChange: undefined }), a.t));
    return P;
  }

  const api = { SCHEMA, snapshot, migrateAttempt, versionsOf, feedbackFor, timeline, units, compare, overlooked, patterns, hintsBeforeFirst, firstText, DETECT,
    EXPLORE, JTYPES, newThought, reviseThought, linkThoughts, buildBackup, validateBackup, previewMerge, rebuildProfile, stripResponses };
  if (typeof module !== 'undefined') module.exports = api; else root.MWR = api;
})(this);
