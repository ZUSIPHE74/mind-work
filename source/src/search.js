/* MINDWORK search — pure index and ranking. Results open the original item in its home environment.
   Journal entries are matched on their text but shown only as "Thinking Journal entry" with a date. */
(function (root) {
  const isNode = typeof module !== 'undefined';
  const E = isNode ? require('./engine.js') : root.MW;
  const A = isNode ? require('./abilities.js') : root.MWA;
  const PZ = isNode ? require('./puzzles.js') : root.MWPZ;
  const C = isNode ? require('./comm.js') : root.MWC;
  const G = isNode ? require('./grow.js') : root.MWG; const OB = isNode ? require('./obs.js') : root.MWOB; const BL = isNode ? require('./bilingual.js') : root.MWBL;
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’‘]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const ENVS = [
    ['Cognitive Playground', 'Targeted training of specific abilities in seven categories.', '#games', 'think brain games exercises categories'],
    ['Puzzle Arena', 'Hard puzzles in nine categories: lateral, deduction, patterns, spatial, strategy, logic, escape, observation, real-world.', '#arena', 'think riddles mystery logic grid hanoi brain teaser'],
    ['Explore a question with AI', 'Adaptive Deep Thinking: a conversation that follows your thinking (needs AI).', '#explore', 'think deep ai honesty truth'],
    ['Open conversation with AI', 'Talk naturally with a conversation partner; feedback at the end (needs AI).', '#talk', 'communicate chat practice small talk ai'],
    ['Your character', 'The person you’re choosing to become: honesty, listening and seven qualities.', '#character', 'grow personality values honesty listening boundaries safe haven straight shooter unshakable'],
    ['Deep Thinking', 'One question developed in depth; Challenge My Thinking; Integrated Challenges.', '#deep', 'think claim integrated'],
    ['Exercise Library', 'Every game, what it trains and how it is judged.', '#library', 'think catalogue all games'],
    ['Thinking Abilities', 'Practise any of the 12 thinking abilities.', '#abilities', 'think critical analytical creative logical strategic lateral abstract reflective systems intuitive metacognitive'],
    ['Study Lab', 'Your books: reading, recall, reviews, tests, concept maps, application.', '#study', 'learn books pdf epub upload review flashcards'],
    ['Knowledge Connections', 'Connect concepts across your books.', '#connections', 'learn books authors'],
    ['Conversation Lab', 'Branching conversations and conversation games.', '#convo', 'communicate talk small talk'],
    ['Thinking Journal', 'Capture and develop your thoughts over time.', '#journal', 'grow notes thoughts reflection'],
    ['Improvement Workshop', 'Work on what your attempts show, then prove the change.', '#improve', 'improve targets weaknesses feedback'],
    ['My Progress', 'Skill levels, trends and your exercise history.', '#progress', 'progress history levels'],
    ['Thinking Patterns', 'Recurring habits in your thinking, with evidence.', '#patterns', 'progress habits'],
    ['Thinking Replay', 'Go back through any finished exercise.', '#replay', 'progress revisions history'],
    ['Abilities Overview', 'Evidence stages for the 12 thinking abilities.', '#overview', 'progress stages abilities'],
    ['Observation and Memory', 'The eighth Cognitive Playground category: noticing accurately and remembering.', '#observe', 'think memory observe visual auditory'],
    ['Bilingual Expression Lab', 'Expressing yourself in English and isiXhosa.', '#bilingual', 'isixhosa xhosa language vocabulary communicate'],
    ['Records and achievements', 'Level, experience, days practised and milestones.', '#records', 'progress xp level achievements missions'],
    ['Your emotional patterns', 'Your check-ins over the last 30 days.', '#feelings', 'grow emotions mood check-in'],
    ['Boss challenges', 'Harder no-hint tests across Think, Learn and Communicate.', '#bosses', 'think boss challenge critical thinker communicator memory trial'],
    ['Multiple Approaches', 'One problem, several thinking methods.', '#approaches', 'think flexibility methods'],
    ['Knowledge in Action', 'Use concepts from your books on new problems.', '#kia', 'learn apply books transfer'],
    ['Your mentor', 'Teaching, practice and honest feedback that remembers your learning.', '#mentor', 'improve teacher coach learn plan daily'],
    ['Competencies', 'What your recorded work shows, ability by ability, with before and after.', '#competencies', 'progress evidence before after flexibility'],
    ['Group conversations', 'Several AI participants with different styles.', '#group', 'communicate multi-person leadership'],
    ['Possible directions', 'Notice several directions a moment could take, then choose.', '#flex-possible', 'flexibility perspective conversation'],
    ['Quick responses', 'Reply to unexpected remarks within 20 seconds.', '#flex-quick', 'spontaneous conversation'],
    ['Say it different ways', 'One idea explained for four listeners.', '#flex-ways', 'explain audience expressive'],
    ['Drawing challenges', 'Turn an explanation into a diagram.', '#draw', 'think draw diagram visual explanation'],
    ['Study sequence', 'One concept through Learn, Think and Communicate.', '#sequence', 'learn study recall apply explain'],
    ['Analyse a conversation', 'Cues, misses and turning points, line by line.', '#analyse', 'communicate analysis listening replay'],
    ['Tell a story', 'A short true story with a shape.', '#story', 'communicate storytelling speaking'],
    ['Speak with intention', 'Form a point before speaking, keep direction, recover a lost thread.', '#express', 'communicate speaking rambling filler pause organise recover spontaneous'],
    ['Settings', 'Display, backups, import, storage, installation, reset.', '#prefs', 'backup export import restore install offline storage theme dark text size reset data phone']];
  function preview(it) { return it.s || it.q || it.title || (it.a ? it.a + ' and ' + it.b : '') || (it.concept ? it.concept : '') || (it.facts && it.facts[0]) || (it.points && it.points.join(', ')) || (it.parts && it.parts[0]) || (it.lines && it.lines[0]) || (it.script && (it.script[0].t || it.script[0])) || it.topic || ''; }
  function buildIndex(st, dests) {
    const ix = [];
    const add = (o) => { o.nt = norm(o.title); o.nb = norm((o.body || '') + ' ' + (o.keys || '') + ' ' + (o.hidden || '')); ix.push(o); };
    (dests || []).forEach(d => add({ kind: 'Destination', title: d.label, body: d.purpose, href: d.href, rank: 0 }));
    ENVS.forEach(([t, b, h, k]) => add({ kind: 'Environment', title: t, body: b, href: h, keys: k, rank: 1 }));
    A.ABILITIES.forEach(a => add({ kind: 'Thinking ability', title: a.name, body: a.blurb, keys: a.develops.join(' '), href: '#abilities-' + a.id, rank: 2 }));
    G.AREAS.forEach(a => add({ kind: 'Grow area', title: a.name, body: a.blurb, href: '#garea-' + a.id, rank: 2 }));
    G.ACTIVITIES.forEach(a => add({ kind: 'Grow activity', title: a.title, body: G.AREAS.find(x => x.id === a.area).name, href: '#gact-' + a.id, rank: 4 }));
    OB.EX.forEach(e => add({ kind: 'Observation and Memory', title: e.name, body: e.blurb, keys: 'memory observe notice', href: '#obs-' + e.id, rank: 4 }));
    BL.MODES.forEach(m => add({ kind: 'Bilingual Expression Lab', title: m.name, body: 'English and isiXhosa', keys: 'isixhosa xhosa bilingual language', href: '#blx-' + m.id, rank: 4 }));
    C.AREAS.forEach(a => add({ kind: 'Communication area', title: a.name, body: a.blurb, keys: a.moves.join(' '), href: '#area-' + a.id, rank: 2 }));
    C.ROLEPLAYS.forEach(r => add({ kind: 'Role-play', title: r.title, body: C.AREA[r.area].name + ' · with ' + r.who, keys: [r.goal, r.id.replace(/-/g, ' '), (r.tags || []).join(' ')].join(' '), href: '#roleplay-' + r.id, rank: 4 }));
    C.DRAFTS.forEach(d => add({ kind: 'Writing task', title: d.title, body: C.AREA[d.area].name, keys: d.brief, href: '#draft-' + d.id, rank: 4 }));
    C.SPEAK.forEach(x => add({ kind: 'Speaking practice', title: x.title, body: C.AREA[x.area].name, keys: x.prompt, href: '#speak-' + x.id, rank: 4 }));
    PZ.CATS.forEach(c => add({ kind: 'Puzzle category', title: c.name, body: c.blurb, href: '#arena-' + c.id, rank: 3 }));
    PZ.PUZZLES.forEach(p => add({ kind: 'Puzzle', title: p.title, body: PZ.CAT[p.cat].name + ' · level ' + p.lvl, keys: p.prompt, href: '#puzzle-' + p.id, rank: 4 }));
    E.CATEGORIES.forEach(c => add({ kind: 'Playground category', title: c.name, body: c.blurb, href: '#games-' + c.id, rank: 3 }));
    E.GAMES.filter(g => !g.deep).forEach(g => add({ kind: 'Game', title: g.name, body: g.objective, keys: g.operation, href: '#games-' + g.cat, action: { action: 'play', game: g.id }, rank: 4 }));
    E.BANK.forEach(it => { const g = E.GAME[it.game]; add({ kind: 'Exercise', title: short(preview(it), 90), body: g.name, keys: E.promptText(it), action: { action: 'item', item: it.id }, rank: 6 }); });
    (st.books || []).forEach(b => { add({ kind: 'Book', title: b.title, body: b.author || '', href: '#book-' + b.id, rank: 2 }); b.chapters.forEach(c => add({ kind: 'Chapter', title: c.title, body: b.title, href: '#read-' + b.id + '.' + c.id, rank: 5 })); });
    (st.maps || []).forEach(m => add({ kind: 'Concept map', title: m.title, body: m.nodes.map(n => n.label).join(', '), href: '#map-' + m.id, rank: 5 }));
    (st.links || []).forEach(l => add({ kind: 'Knowledge connection', title: l.a.term + ' and ' + l.b.term, body: l.a.bookTitle + ' · ' + l.b.bookTitle, href: '#connections', rank: 5 }));
    (st.journal || []).forEach(j => add({ kind: 'Thinking Journal entry', title: 'Thinking Journal entry', body: 'Started ' + new Date(j.created).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }), hidden: j.versions.map(v => v.text).join(' ') + ' ' + (j.explorations || []).map(e => e.text).join(' '), href: '#journal-' + j.id, private: true, rank: 5 }));
    return ix;
  }
  function short(s, n) { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; }
  function query(ix, q, limit) {
    const toks = norm(q).split(' ').filter(t => t.length >= 2); if (!toks.length) return [];
    const res = [];
    ix.forEach(o => {
      let score = 0; const tw = o.nt.split(' ');
      for (const t of toks) {
        if (tw.some(w => w === t)) score += 4; else if (tw.some(w => w.startsWith(t))) score += 3; else if (o.nt.includes(t)) score += 2;
        else if ((' ' + o.nb).includes(' ' + t)) score += 1; else return;
      }
      if (o.nt === norm(q)) score += 6;
      res.push({ o, score: score - o.rank * 0.25 });
    });
    return res.sort((a, b) => b.score - a.score).slice(0, limit || 40).map(r => r.o);
  }
  const api = { buildIndex, query, norm };
  if (isNode) module.exports = api; else root.MWSearch = api;
})(this);
