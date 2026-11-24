/* MINDWORK Study Lab — deeper activities (pure logic).
   Relationships are only reported where a sentence in the book names both concepts. Anything the app cannot find
   in the text is described as "not stated in the book", never as wrong, and suggestions between books only say
   which words the definitions share: whether the authors agree is for the reader to judge. */
(function (root) {
  const isNode = typeof module !== 'undefined';
  const E = isNode ? require('./engine.js') : root.MW;
  const Q = isNode ? require('./study.js') : root.MWS;
  const T = E.text;
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const has = (s, term) => new RegExp('\\b' + esc(term) + '(?:s|es)?\\b', 'i').test(s);
  const REL = [
    { kind: 'contrasts with', re: /\b(unlike|whereas|in contrast|differs? from|different from|rather than|as opposed to|not the same as)\b/i },
    { kind: 'is a type of', re: /\b(is an? (?:kind|type|form|example|case) of|are (?:kinds|types|forms|examples) of|one (?:kind|type|form) of)\b/i },
    { kind: 'depends on', re: /\b(depends? on|requires?|relies? on|needs?)\b/i },
    { kind: 'causes or explains', re: /\b(because|leads? to|led to|causes?|caused|results? in|produces?|drives?|explains?|so that|therefore|which is why)\b/i },
    { kind: 'supports', re: /\b(supports?|strengthens?|helps?|improves?|enables?|reinforces?)\b/i },
    { kind: 'weakens', re: /\b(disrupts?|weakens?|undermines?|reduces?|interferes? with|prevents?)\b/i }
  ];
  const LABELS = ['causes or explains', 'leads to', 'is a type of', 'is part of', 'depends on', 'supports', 'weakens', 'contrasts with', 'is an example of', 'is related to'];
  const FAMILY = { 'causes or explains': 'cause', 'leads to': 'cause', 'supports': 'cause', 'weakens': 'cause', 'is a type of': 'kind', 'is part of': 'kind', 'is an example of': 'kind', 'depends on': 'depend', 'contrasts with': 'contrast', 'is related to': 'any', 'mentioned together': 'any', 'defined using': 'any' };

  function concepts(book, scope, max) {
    const defs = Q.findDefinitions(book); const chs = scope && scope.length ? book.chapters.filter(c => scope.includes(c.id) || c.sections.some(s => scope.includes(s.id))) : book.chapters;
    const out = new Map();
    chs.forEach(c => Q.keyTerms(book, c.id, defs).forEach(k => { const key = k.term.toLowerCase(); if (!out.has(key)) out.set(key, { term: k.term, chapterId: c.id, defined: k.why === 'defined', weight: k.weight }); }));
    return [...out.values()].sort((a, b) => (b.defined - a.defined) || (b.weight - a.weight)).slice(0, max || 18);
  }

  /* Every sentence in scope that names two of the concepts, with the relation its wording signals. */
  function relations(book, scope, cs) {
    cs = cs || concepts(book, scope, 30); const out = []; const seen = new Set();
    for (const x of Q.paragraphs(book, scope)) {
      Q.sentencesOf(x.p.text).forEach(s => {
        const inS = cs.filter(c => has(s, c.term));
        for (let i = 0; i < inS.length; i++) for (let j = i + 1; j < inS.length; j++) {
          const a = inS[i].term, b = inS[j].term; if (a.toLowerCase().includes(b.toLowerCase()) || b.toLowerCase().includes(a.toLowerCase())) continue;
          const r = REL.find(r => r.re.test(s)); const kind = r ? r.kind : /\b(is|are|means|refers to)\b/.test(s) && s.toLowerCase().indexOf(a.toLowerCase()) < 4 ? 'defined using' : 'mentioned together';
          const key = [a, b].map(t => t.toLowerCase()).sort().join('|') + '|' + kind; if (seen.has(key)) continue; seen.add(key);
          out.push({ a, b, kind, sentence: s, bookId: book.id, chapterId: x.ch.id, sectionId: x.sec.id, paraId: x.p.id, page: x.p.page == null ? null : x.p.page });
        }
      });
    }
    return out;
  }
  const pairKey = (a, b) => [a, b].map(t => String(t).toLowerCase().trim()).sort().join('|');

  /* Compare a user's concept map with the book. Several maps can be defensible: links the book doesn't state are
     reported as "not stated", not as errors, and a link whose label differs from the book's wording is flagged
     for a second look rather than marked wrong. */
  function compareMap(map, rels) {
    const byPair = new Map(); rels.forEach(r => { const k = pairKey(r.a, r.b); (byPair.get(k) || byPair.set(k, []).get(k)).push(r); });
    const label = id => (map.nodes.find(n => n.id === id) || {}).label || '';
    const checked = map.edges.map(e => {
      const k = pairKey(label(e.from), label(e.to)); const rs = byPair.get(k) || [];
      if (!rs.length) return { edge: e, status: 'not stated', rels: [] };
      const fam = FAMILY[e.label] || 'any'; const strong = rs.filter(r => r.kind !== 'mentioned together');
      const agree = fam === 'any' || rs.some(r => FAMILY[r.kind] === fam || FAMILY[r.kind] === 'any' && r.kind !== 'mentioned together' && false);
      if (strong.length && !strong.some(r => FAMILY[r.kind] === fam) && fam !== 'any') return { edge: e, status: 'labelled differently', rels: rs };
      return { edge: e, status: strong.length ? 'supported' : 'mentioned together', rels: rs, agree };
    });
    const mapped = new Set(map.edges.map(e => pairKey(label(e.from), label(e.to))));
    const onMap = new Set(map.nodes.map(n => n.label.toLowerCase().trim()));
    const missed = [...byPair.entries()].filter(([k, rs]) => !mapped.has(k) && k.split('|').every(t => onMap.has(t)) && rs.some(r => r.kind !== 'mentioned together')).map(([k, rs]) => rs.find(r => r.kind !== 'mentioned together'));
    const isolated = map.nodes.filter(n => !map.edges.some(e => e.from === n.id || e.to === n.id)).map(n => n.label);
    const tally = { supported: 0, 'mentioned together': 0, 'labelled differently': 0, 'not stated': 0 }; checked.forEach(c => tally[c.status]++);
    return { checked, missed, isolated, tally };
  }

  // ───────── activity builders (each returns only material found in the book)
  function relationPairs(book, scope, n) {
    const rels = relations(book, scope).filter(r => r.kind !== 'mentioned together');
    const seen = new Set(); const out = [];
    rels.forEach(r => { const k = pairKey(r.a, r.b); if (!seen.has(k) && out.length < (n || 4)) { seen.add(k); out.push({ a: r.a, b: r.b, evidence: rels.filter(x => pairKey(x.a, x.b) === k) }); } });
    return out;
  }
  function comparePairs(book, scope, n) {
    const defs = Q.findDefinitions(book, scope); const rels = relations(book, scope);
    const out = []; const seen = new Set();
    rels.filter(r => r.kind === 'contrasts with').forEach(r => { const k = pairKey(r.a, r.b); if (!seen.has(k)) { seen.add(k); out.push(pairWithDefs(r.a, r.b, defs, rels)); } });
    // otherwise: two defined concepts from the same chapter
    for (let i = 0; i < defs.length && out.length < (n || 3); i++) for (let j = i + 1; j < defs.length && out.length < (n || 3); j++) {
      if (defs[i].chapterId !== defs[j].chapterId) continue; const k = pairKey(defs[i].term, defs[j].term); if (seen.has(k)) continue; seen.add(k); out.push(pairWithDefs(defs[i].term, defs[j].term, defs, rels));
    }
    return out.slice(0, n || 3);
  }
  function pairWithDefs(a, b, defs, rels) {
    const d = t => defs.find(x => x.term.toLowerCase() === t.toLowerCase()) || null;
    return { a, b, defA: d(a), defB: d(b), evidence: rels.filter(r => pairKey(r.a, r.b) === pairKey(a, b)) };
  }
  function whyItems(book, scope) {
    return (book.questions || []).filter(q => q.type === 'reasoning' && (!scope || !scope.length || scope.includes(q.chapterId) || scope.includes(q.sectionId)))
      .map(q => { const m = /^Complete the author’s reasoning: “(.*) …”$/.exec(q.prompt); return m ? Object.assign({}, q, { claim: m[1] }) : null; }).filter(Boolean);
  }
  /* Two concepts from different chapters that were studied before, for cumulative retrieval. */
  function cumulativePairs(book, studiedChapters, n) {
    const defs = Q.findDefinitions(book).filter(d => studiedChapters.includes(d.chapterId)); const out = [];
    for (let i = 0; i < defs.length; i++) for (let j = i + 1; j < defs.length; j++) if (defs[i].chapterId !== defs[j].chapterId) out.push([defs[i], defs[j]]);
    const R = E.rng(book.id + studiedChapters.join()); return out.sort(() => R() - 0.5).slice(0, n || 3);
  }
  /* Unfamiliar situations for transfer come from MINDWORK's own scenario bank, so they can't be the book's examples. */
  function transferScenarios(def, n, seed) {
    const pool = E.BANK.filter(i => ['possibility', 'whatelse', 'missing', 'integrated', 'reverse', 'perspectives'].includes(i.game) && i.s && i.s.length < 420);
    const R = E.rng(String(seed || def.term)); return pool.slice().sort(() => R() - 0.5).slice(0, n || 1).map(i => ({ text: i.s, from: i.id }));
  }

  /* Possible links between definitions in different books, by shared wording only. */
  function suggestConnections(books, max) {
    const defs = books.flatMap(b => Q.findDefinitions(b).map(d => Object.assign({ bookTitle: b.title }, d)));
    const out = [];
    for (let i = 0; i < defs.length; i++) for (let j = i + 1; j < defs.length; j++) {
      const a = defs[i], b = defs[j]; if (a.bookId === b.bookId) continue;
      const sameName = a.term.toLowerCase() === b.term.toLowerCase();
      const wa = T.contentSet(a.term + ' ' + a.def), wb = T.contentSet(b.term + ' ' + b.def);
      const shared = [...wa].filter(w => wb.has(w) && w.length > 3);
      if (sameName || shared.length >= 2) out.push({ a, b, shared, sameName, score: (sameName ? 5 : 0) + shared.length });
    }
    return out.sort((x, y) => y.score - x.score).slice(0, max || 12);
  }

  /* MINDWORK playground exercises built from a chapter. Each carries its source so the player can cite it. */
  function thinkItems(book, scope) {
    const defs = Q.findDefinitions(book, scope); const why = whyItems(book, scope); const pairs = comparePairs(book, scope, 1);
    const src = d => ({ bookId: book.id, bookTitle: book.title, chapterId: d.chapterId, chapterTitle: (book.chapters.find(c => c.id === d.chapterId) || {}).title, page: d.page, paraId: d.paraId, excerpt: d.sentence || d.excerpt });
    const items = [];
    if (why[0]) items.push({ id: 'bk-ch-' + Q.hash(why[0].id), game: 'challenge', lvl: 3, custom: true, s: why[0].excerpt, angles: [], src: src(why[0]) });
    if (pairs[0] && pairs[0].defA && pairs[0].defB) { const p = pairs[0]; const kw = d => T.words(d.def).filter(w => w.length > 3 && T.contentSet(w).size).slice(0, 8); items.push({ id: 'bk-df-' + Q.hash(p.a + p.b), game: 'diff', lvl: 3, custom: true, a: p.a, b: p.b, ka: kw(p.defA), kb: kw(p.defB), src: src(p.defA) }); }
    if (defs[0]) items.push({ id: 'bk-ex-' + Q.hash(defs[0].term), game: 'expand', lvl: 3, custom: true, s: defs[0].sentence, ops: ['explanation', 'example', 'consequence', 'counterexample', 'qualification'], src: src(defs[0]) });
    const d2 = defs[1] || defs[0];
    if (d2) items.push({ id: 'bk-bq-' + Q.hash(d2.term + 'bq'), game: 'beyondq', lvl: 3, custom: true, q: `I keep hearing about “${d2.term}”. What actually is it — and does it matter?`, topic: T.words(d2.term + ' ' + d2.def).filter(w => w.length > 3).slice(0, 8), src: src(d2) });
    return items;
  }

  const api = { LABELS, REL, concepts, relations, compareMap, relationPairs, comparePairs, whyItems, cumulativePairs, transferScenarios, suggestConnections, thinkItems, pairKey };
  if (isNode) module.exports = api; else root.MWSD = api;
})(this);
