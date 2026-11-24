/* MINDWORK Study Lab engine — pure logic, no DOM.
   Every generated question points to the exact paragraph it came from. Questions are only generated where a
   sentence pattern in the book supports them; nothing is added from outside the book. */
(function (root) {
  const E = typeof module !== 'undefined' ? require('./engine.js') : root.MW;
  const T = E.text;
  const GEN_VERSION = 1;
  const DAY = 864e5;
  const norm = s => String(s || '').toLowerCase().replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
  const sentencesOf = text => String(text || '').replace(/\s+/g, ' ').split(/(?<=[.!?])\s+(?=[“"'(A-Z0-9])/).map(s => s.trim()).filter(s => s.length > 1);
  const BADSUBJ = /^(it|this|that|these|those|they|he|she|we|i|you|there|here|which|what|who|such|one|each|all|some|both|another|the (?:first|second|third|next|last|other|same|following|answer|result|reason|problem|point|question|key|idea|goal|aim|truth|difference))$/i;
  const GENERIC = new Set(['thing', 'things', 'way', 'ways', 'people', 'person', 'time', 'times', 'part', 'kind', 'type', 'example', 'case', 'fact', 'idea', 'chapter', 'book', 'author', 'section', 'page']);

  // ───────── walk a book
  function* paragraphs(book, scope) {
    const want = scope && scope.length ? new Set(scope) : null;
    for (const ch of book.chapters) for (const sec of ch.sections) {
      if (want && !want.has(ch.id) && !want.has(sec.id)) continue;
      for (const p of sec.paras) yield { ch, sec, p };
    }
  }
  const loc = (book, x) => ({ bookId: book.id, chapterId: x.ch.id, sectionId: x.sec.id, paraId: x.p.id, page: x.p.page == null ? null : x.p.page });

  // ───────── terms and definitions
  const DEF_PATTERNS = [
    { re: /^(?:the |an? )?([A-Za-z][\w’'\- ]{1,48}?),? (?:is|are) (?:defined as|best (?:understood|described) as|what happens when|the (?:name|term) (?:for|given to)) (.{12,})$/i, termFirst: true },
    { re: /^(?:the |an? )?([A-Za-z][\w’'\- ]{1,48}?),? (?:refers? to|means|describes|denotes) (.{12,})$/i, termFirst: true },
    { re: /^(?:the |an? )?([A-Za-z][\w’'\- ]{1,40}?) (?:is|are) (?:an?|the) ((?:[a-z][\w’'\-]* ){1,6}(?:that|which|who|where|in which|by which|of|for|to) .{8,})$/i, termFirst: true, weak: true },
    { re: /^(.{15,}?),? (?:is|are) (?:called|known as|termed|referred to as) ["“]?([A-Za-z][\w’'\- ]{1,40}?)["”]?[.,;]?$/i, termFirst: false },
    { re: /^(?:we|i|psychologists|researchers|economists|scientists) call (?:this|that|it) ["“]?([A-Za-z][\w’'\- ]{1,40}?)["”]?[.,;]?$/i, termFirst: true, noDef: true }
  ];
  function cleanTerm(t) { return String(t || '').replace(/^["“'(]+|["”'),.:;]+$/g, '').replace(/^(?:the|a|an) /i, '').trim(); }
  function termOk(t) {
    const w = t.split(/\s+/); if (!t || w.length > 5 || t.length < 3) return false;
    if (BADSUBJ.test(t)) return false; if (w.length === 1 && GENERIC.has(t.toLowerCase())) return false;
    if (/^\d/.test(t)) return false; return T.contentSet(t).size > 0;
  }
  function findDefinitions(book, scope) {
    const out = [], seen = new Set();
    for (const x of paragraphs(book, scope)) {
      const sents = sentencesOf(x.p.text);
      sents.forEach((s, si) => {
        for (const pat of DEF_PATTERNS) {
          const m = pat.re.exec(s.replace(/\s+/g, ' ')); if (!m) continue;
          let term = cleanTerm(pat.termFirst ? m[1] : m[2]); let def = pat.noDef ? (sents[si - 1] || '') : (pat.termFirst ? m[2] : m[1]);
          def = def.replace(/[.;:]+$/, '').trim();
          if (pat.weak && !(x.p.emph || []).some(e => norm(e) === norm(term)) && term.split(' ').length > 3) continue;
          if (!termOk(term) || T.contentSet(def).size < 3) continue;
          const key = norm(term); if (seen.has(key)) continue; seen.add(key);
          out.push(Object.assign({ term, def, sentence: s, pattern: pat.termFirst ? 'definition' : 'naming' }, loc(book, x)));
          break;
        }
      });
    }
    return out;
  }
  /* Key terms: defined terms first, then terms the book emphasises (bold/italic), then multi-word phrases repeated
     in this chapter far more than elsewhere. Single common words are excluded. */
  function keyTerms(book, chapterId, defs) {
    defs = defs || findDefinitions(book);
    const ch = book.chapters.find(c => c.id === chapterId); if (!ch) return [];
    const terms = new Map();
    defs.filter(d => d.chapterId === chapterId).forEach(d => terms.set(norm(d.term), { term: d.term, why: 'defined', weight: 10 }));
    for (const x of paragraphs(book, [chapterId])) (x.p.emph || []).forEach(e => { const t = cleanTerm(e); if (termOk(t) && t.split(' ').length <= 4 && !terms.has(norm(t))) terms.set(norm(t), { term: t, why: 'emphasised', weight: 6 }); });
    const count = (scopeIds) => { const c = new Map(); for (const x of paragraphs(book, scopeIds)) { const w = T.words(x.p.text).filter(t => t.length > 2); for (let i = 0; i < w.length - 1; i++) { const a = w[i], b = w[i + 1]; if (T.contentSet(a).size && T.contentSet(b).size && !GENERIC.has(a) && !GENERIC.has(b)) { const k = a + ' ' + b; c.set(k, (c.get(k) || 0) + 1); } } } return c; };
    const here = count([chapterId]), all = count(null);
    [...here.entries()].filter(([k, n]) => n >= 3 && n / (all.get(k) || n) >= 0.6 && !terms.has(k)).sort((a, b) => b[1] - a[1]).slice(0, 6)
      .forEach(([k, n]) => terms.set(k, { term: k, why: 'repeated', weight: Math.min(5, n) }));
    return [...terms.values()].sort((a, b) => b.weight - a.weight).slice(0, 14);
  }

  // ───────── question generation (only from matched patterns)
  const LIST_RE = /\b(two|three|four|five|six|seven|several|key|main|basic|following|distinct)?\s*(types|kinds|stages|steps|phases|parts|components|factors|elements|principles|ways|reasons|forms|categories|sources|features|conditions|questions|rules|habits|strategies)\b[^:.]{0,60}?(?::|\bare\b|\binclude\b|\bincluding\b)\s+(.+)$/i;
  const CAUSE_RE = /^(.{12,}?)\s+(because|leads to|lead to|led to|results in|result in|causes|caused|so that|which means that|which is why|therefore|as a result,?)\s+(.{10,})$/i;
  const CONTRAST_RE = /\b(unlike|whereas|while|in contrast to|differs from|different from|rather than|not the same as|as opposed to|distinguish(?:es|ed)?)\b/i;
  function splitList(s) {
    const t = s.replace(/[.;]+$/, '').replace(/\band\b(?=[^,]*$)/, ',').replace(/\bor\b(?=[^,]*$)/, ',');
    const items = t.split(/,|;/).map(x => x.replace(/^(?:and|or)\s+/i, '').trim()).filter(x => x && x.split(/\s+/).length <= 10);
    return items.length >= 2 && items.length <= 8 ? items : null;
  }
  function mask(text, term) { const re = new RegExp('\\b' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:s|es)?\\b', 'gi'); return text.replace(re, '_____'); }
  const MARKERS = new Set(['unlike', 'whereas', 'while', 'contrast', 'differs', 'different', 'rather', 'opposed', 'distinguish', 'distinguishes', 'concerns', 'concern', 'because', 'therefore', 'result', 'leads', 'usually', 'often']);
  /* expected answer elements: the source's own content words (not stems), so feedback shows real words */
  function elementsOf(text, exclude) {
    const ex = T.contentSet(exclude || ''); const seen = new Set(); const out = [];
    T.words(text).forEach(w => { if (w.length <= 2 || MARKERS.has(w)) return; const c = [...T.contentSet(w)][0]; if (!c || ex.has(c) || seen.has(c)) return; seen.add(c); out.push(w); });
    return out.slice(0, 12);
  }

  function generate(book, opts) {
    opts = opts || {}; const defs = findDefinitions(book); const qs = []; const add = q => { q.id = 'q' + hash(book.id + q.type + q.paraId + (q.concept || '') + q.prompt); if (!qs.some(x => x.id === q.id)) qs.push(q); };
    const termIndex = new Map();
    book.chapters.forEach(ch => keyTerms(book, ch.id, defs).forEach(k => termIndex.set(norm(k.term), Object.assign({ chapterId: ch.id }, k))));
    defs.forEach(d => {
      add(Object.assign({ type: 'definition', concept: d.term, prompt: `What does the book mean by “${d.term}”?`, expected: elementsOf(d.def, d.term), excerpt: d.sentence, criteria: 'Key terms from the author’s definition' }, d));
      const maskedDef = mask(d.def, d.term);
      if (!/_____/.test(maskedDef) || T.contentSet(maskedDef.replace(/_____/g, '')).size >= 3)
        add(Object.assign({ type: 'reverse', concept: d.term, prompt: `Which concept does the book describe like this: “${maskedDef}”?`, answer: d.term, excerpt: d.sentence, criteria: 'The concept’s name' }, d));
      if (opts.application !== false) add(Object.assign({ type: 'application', concept: d.term, prompt: `Describe a situation that isn’t in the book where “${d.term}” applies. Explain how it applies, and one limit or condition where it might not.`, expected: elementsOf(d.def, d.term), excerpt: d.sentence, criteria: 'Self-check against the book’s definition', extension: true }, d));
    });
    for (const x of paragraphs(book)) {
      const sents = sentencesOf(x.p.text); const L = loc(book, x);
      sents.forEach((s, si) => {
        const words = T.words(s).length; if (words < 7 || words > 60) return;
        // cloze on a key term, inside a sentence that isn't the definition itself
        const terms = [...termIndex.values()].filter(k => k.chapterId === x.ch.id && new RegExp('\\b' + k.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(s));
        if (terms.length && !defs.some(d => d.sentence === s)) { const k = terms.sort((a, b) => b.weight - a.weight)[0]; add(Object.assign({ type: 'cloze', concept: k.term, prompt: mask(s, k.term), answer: k.term, excerpt: s, criteria: 'The missing term' }, L)); }
        // lists and frameworks
        const lm = LIST_RE.exec(s); const items = lm && splitList(lm[3]);
        if (items) { const lead = s.slice(0, s.indexOf(lm[3])).replace(/[:\s]+$/, ''); add(Object.assign({ type: 'list', concept: lm[2].toLowerCase(), prompt: `Reconstruct from memory: ${lead} …`, items, expected: items.flatMap(i => elementsOf(i)).slice(0, 14), excerpt: s, criteria: `${items.length} items named in the book` }, L));
          if (opts.order !== false && items.length >= 3 && /stages|steps|phases/i.test(lm[2])) add(Object.assign({ type: 'order', concept: lm[2].toLowerCase(), prompt: `Put these ${lm[2].toLowerCase()} in the order the book gives them.`, items, excerpt: s, criteria: 'Order as given in the book' }, L)); }
        // cause and effect → "complete the author's reasoning"
        const cm = CAUSE_RE.exec(s);
        if (cm && T.contentSet(cm[1]).size >= 2 && T.contentSet(cm[3]).size >= 2) add(Object.assign({ type: 'reasoning', concept: (terms[0] || {}).term || null, prompt: `Complete the author’s reasoning: “${cm[1]} ${cm[2]} …”`, expected: elementsOf(cm[3], cm[1]), excerpt: s, criteria: 'Key terms from the rest of the sentence' }, L));
        // distinctions between two key terms in one sentence
        const two = [...termIndex.values()].filter(k => new RegExp('\\b' + k.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(s));
        if (two.length >= 2 && CONTRAST_RE.test(s)) add(Object.assign({ type: 'distinction', concept: two[0].term + ' / ' + two[1].term, pair: [two[0].term, two[1].term], prompt: `How does the book distinguish “${two[0].term}” from “${two[1].term}”?`, expected: elementsOf(s, two[0].term + ' ' + two[1].term), excerpt: s, criteria: 'Key terms from the sentence that draws the distinction' }, L));
      });
    }
    // sequences: First … Second … Third in one paragraph
    for (const x of paragraphs(book)) {
      const sents = sentencesOf(x.p.text); const marks = sents.map(s => (/^(first|second|third|fourth|fifth|finally|next|then)\b/i.exec(s) || [])[1]);
      const steps = sents.filter((s, i) => marks[i]); if (steps.length >= 3 && /^first/i.test(steps[0])) add(Object.assign({ type: 'order', concept: 'sequence', prompt: 'Put these steps in the order the book gives them.', items: steps.map(s => s.replace(/^(first|second|third|fourth|fifth|finally|next|then),?\s*/i, '').replace(/[.]+$/, '')), excerpt: steps.join(' '), criteria: 'Order as given in the book' }, loc(book, x)));
    }
    return qs.map(q => Object.assign(q, { gen: GEN_VERSION, source: 'book' }));
  }
  function freeRecallPrompt(book, sectionIds, defs) {
    defs = defs || findDefinitions(book, sectionIds); const terms = new Map();
    sectionIds.forEach(id => { const ch = book.chapters.find(c => c.id === id || c.sections.some(s => s.id === id)); if (ch) keyTerms(book, ch.id, defs).forEach(k => terms.set(norm(k.term), k.term)); });
    defs.forEach(d => terms.set(norm(d.term), d.term));
    return { type: 'free', prompt: 'Without looking: what were the main ideas, arguments, distinctions and examples?', expectedTerms: [...terms.values()] };
  }

  // ───────── checking answers
  function lev(a, b) { if (Math.abs(a.length - b.length) > 2) return 3; const d = Array.from({ length: b.length + 1 }, (_, i) => i); for (let i = 1; i <= a.length; i++) { let p = d[0]; d[0] = i; for (let j = 1; j <= b.length; j++) { const t = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] === b[j - 1] ? 0 : 1)); p = t; } } return d[b.length]; }
  function sameTerm(given, target) {
    const g = norm(given).replace(/^(the|a|an) /, '').replace(/[.!?]+$/, ''), t = norm(target).replace(/^(the|a|an) /, '');
    if (!g) return false; if (g === t || g === t + 's' || g + 's' === t) return true;
    const gs = [...T.contentSet(g)].sort().join(' '), ts = [...T.contentSet(t)].sort().join(' ');
    if (gs && gs === ts) return true;
    return t.length >= 6 && lev(g, t) <= (t.length >= 10 ? 2 : 1);
  }
  function coverage(response, expected) {
    const r = T.contentSet(response); const matched = [], missed = [];
    (expected || []).forEach(e => { const es = T.contentSet(e); const hit = [...es].some(w => r.has(w)) || [...r].some(w => w.length >= 6 && [...es].some(x => x.length >= 6 && lev(w, x) <= 1)); (hit ? matched : missed).push(e); });
    return { matched, missed, ratio: expected && expected.length ? matched.length / expected.length : 0 };
  }
  /* Returns { result: 'correct'|'partial'|'incorrect', score 0..1, method, matched, missed, confusedWith }.
     method 'exact' is reliable; method 'terms' only checks wording and is labelled as such in the UI. */
  function check(q, response, ctx) {
    ctx = ctx || {};
    if (q.type === 'cloze' || q.type === 'reverse') {
      const ok = sameTerm(response, q.answer); let confused = null;
      if (!ok && ctx.terms) confused = ctx.terms.find(t => norm(t) !== norm(q.answer) && sameTerm(response, t)) || null;
      return { result: ok ? 'correct' : 'incorrect', score: ok ? 1 : 0, method: 'exact', confusedWith: confused, matched: ok ? [q.answer] : [], missed: ok ? [] : [q.answer] };
    }
    if (q.type === 'mc') { const ok = response === q.correct; return { result: ok ? 'correct' : 'incorrect', score: ok ? 1 : 0, method: 'exact', confusedWith: ok ? null : q.options[response] || null, matched: [], missed: [] }; }
    if (q.type === 'multi') { const pick = new Set(response || []); const want = new Set(q.correctSet); const hits = [...pick].filter(i => want.has(i)).length, wrong = [...pick].filter(i => !want.has(i)).length; const s = Math.max(0, (hits - wrong) / want.size); return { result: hits === want.size && !wrong ? 'correct' : s >= 0.5 ? 'partial' : 'incorrect', score: s, method: 'exact', matched: [], missed: [] }; }
    if (q.type === 'order' || q.type === 'orderTest') {
      const ord = response || []; let pairs = 0, good = 0;
      for (let i = 0; i < ord.length; i++) for (let j = i + 1; j < ord.length; j++) { pairs++; if (ord[i] < ord[j]) good++; }
      const s = pairs ? good / pairs : 0; return { result: s === 1 ? 'correct' : s >= 0.6 ? 'partial' : 'incorrect', score: s, method: 'exact', matched: [], missed: [] };
    }
    if (q.type === 'match') { const m = response || {}; const n = q.pairs.length; const good = q.pairs.filter((p, i) => m[i] === i).length; return { result: good === n ? 'correct' : good >= n / 2 ? 'partial' : 'incorrect', score: good / n, method: 'exact', matched: [], missed: [] }; }
    if (q.type === 'list') {
      const lines = String(response || '').split(/\n|,|;/).map(s => s.trim()).filter(Boolean);
      const hit = q.items.filter(it => lines.some(l => T.overlap(l, it) >= 0.5 || sameTerm(l, it)));
      const s = hit.length / q.items.length; return { result: s >= 0.99 ? 'correct' : s >= 0.5 ? 'partial' : 'incorrect', score: s, method: 'items', matched: hit, missed: q.items.filter(i => !hit.includes(i)) };
    }
    const c = coverage(response, q.expected);
    const s = c.ratio; return { result: s >= 0.6 ? 'correct' : s >= 0.3 ? 'partial' : 'incorrect', score: s, method: 'terms', matched: c.matched, missed: c.missed };
  }

  // ───────── spaced repetition (SM-2 variant with confidence)
  /* grade: 0 = not recalled / wrong, 1 = partly, 2 = recalled with effort or unsure, 3 = recalled confidently.
     A confident wrong answer is a misconception: it is relearned the same day and its ease falls further. */
  function gradeFrom(result, confident) { if (result === 'incorrect') return 0; if (result === 'partial') return 1; return confident ? 3 : 2; }
  function newCard(q, now) { return { qid: q.id, bookId: q.bookId, chapterId: q.chapterId, concept: q.concept, type: q.type, state: 'new', due: now || Date.now(), interval: 0, ease: 2.5, reps: 0, lapses: 0, misconceptions: 0, history: [] }; }
  function schedule(card, grade, confident, now) {
    now = now || Date.now(); const c = JSON.parse(JSON.stringify(card));
    const elapsedDays = c.history.length ? (now - c.history[c.history.length - 1].t) / DAY : 0;
    const misconception = grade === 0 && confident;
    if (grade < 2) {
      c.lapses += c.reps > 0 || c.state !== 'new' ? 1 : 0; c.reps = 0;
      c.ease = Math.max(1.3, c.ease - (misconception ? 0.35 : grade === 0 ? 0.2 : 0.1));
      c.interval = grade === 1 ? 1 : 0; c.due = now + (grade === 1 ? DAY : 10 * 60 * 1000);
      if (misconception) c.misconceptions++;
    } else {
      c.reps++;
      const base = Math.max(c.interval, Math.min(elapsedDays, c.interval * 2 + 1));
      let ivl = c.reps === 1 ? 1 : c.reps === 2 ? (grade === 3 ? 4 : 3) : Math.round(base * c.ease * (grade === 3 ? 1.15 : 0.85));
      if (!confident) ivl = Math.max(1, Math.round(ivl * 0.7));
      c.interval = Math.min(365, Math.max(1, ivl)); c.ease = Math.min(3.0, c.ease + (grade === 3 ? 0.05 : -0.05)); c.due = now + c.interval * DAY;
    }
    c.history.push({ t: now, grade, confident: !!confident });
    c.state = stateOf(c, now);
    return c;
  }
  function stateOf(c, now) {
    now = now || Date.now();
    if (!c.history.length) return 'new';
    const last = c.history[c.history.length - 1];
    if (last.grade < 2 && c.lapses > 0) return 'needs review';
    if (now - c.due > Math.max(2, c.interval) * DAY) return 'needs review';
    if (c.interval >= 21) return 'retained';
    if (c.interval >= 3) return 'developing';
    return 'learning';
  }
  /* Today's queue: due cards first (misconceptions, then most overdue), interleaved across chapters so neighbouring
     questions rarely test the same concept; a few new cards fill any space. */
  function queue(cards, now, size, opts) {
    now = now || Date.now(); size = size || 20; opts = opts || {};
    const due = cards.filter(c => c.state !== 'new' && c.due <= now).sort((a, b) => (b.misconceptions - a.misconceptions) || (a.due - b.due));
    const fresh = cards.filter(c => c.state === 'new').slice(0, opts.newLimit == null ? Math.max(3, Math.floor(size / 4)) : opts.newLimit);
    // choose across chapters in turn (most urgent chapter first), so one backlog can't crowd out interleaving
    const byCh = new Map(); due.forEach(c => { const k = c.chapterId + '|' + c.bookId; (byCh.get(k) || byCh.set(k, []).get(k)).push(c); });
    const chLists = [...byCh.values()]; const chosen = [];
    while (chosen.length < size && chLists.some(l => l.length)) chLists.forEach(l => { if (chosen.length < size && l.length) chosen.push(l.shift()); });
    const pick = chosen.concat(fresh).slice(0, size);
    const groups = new Map(); pick.forEach(c => { const k = c.chapterId + '|' + c.bookId; (groups.get(k) || groups.set(k, []).get(k)).push(c); });
    const out = []; const lists = [...groups.values()];
    while (out.length < pick.length) for (const l of lists) { const i = l.findIndex(c => !out.length || c.concept !== out[out.length - 1].concept); if (i >= 0) out.push(l.splice(i, 1)[0]); else if (l.length) out.push(l.shift()); }
    return out;
  }

  // ───────── practice tests from generated questions
  function rng(seed) { let s = typeof seed === 'number' ? seed : parseInt(hash(String(seed)), 36); return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function shuffle(a, R) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function buildTest(questions, terms, seed, n) {
    const R = rng(seed || 1); n = n || 10; const out = [];
    const pool = shuffle(questions.filter(q => q.type !== 'application'), R);
    const short = pool.filter(q => ['definition', 'reasoning', 'distinction', 'list'].includes(q.type));
    const exact = pool.filter(q => ['cloze', 'reverse'].includes(q.type));
    // about half short-answer, the rest multiple choice, matching and ordering
    short.slice(0, Math.ceil(n / 2)).forEach(q => out.push(q));
    exact.slice(0, Math.floor(n / 4)).forEach(q => {
      const distract = shuffle(terms.filter(t => norm(t) !== norm(q.answer)), R).slice(0, 3);
      if (distract.length < 2) { out.push(q); return; }
      const opts = shuffle([q.answer].concat(distract), R);
      out.push(Object.assign({}, q, { type: 'mc', id: q.id + 'm', baseId: q.id, options: opts, correct: opts.indexOf(q.answer) }));
    });
    const defs = pool.filter(q => q.type === 'definition');
    if (defs.length >= 3) { const ps = defs.slice(0, 4); out.push({ id: 'match' + hash(ps.map(p => p.id).join()), type: 'match', prompt: 'Match each concept to the book’s description of it.', pairs: ps.map(p => ({ term: p.concept, def: p.excerpt, chapterId: p.chapterId, page: p.page, paraId: p.paraId })), order: shuffle(ps.map((_, i) => i), R), bookId: ps[0].bookId, chapterId: ps[0].chapterId, concept: 'matching' }); }
    // select all that apply: the book's list items mixed with items from its other lists or other key terms
    const lists = pool.filter(q => q.type === 'list');
    lists.slice(0, 1).forEach(q => { const others = shuffle(pool.filter(x => x.type === 'list' && x !== q).flatMap(x => x.items).concat(terms).filter(t => !q.items.some(i => norm(i) === norm(t))), R).slice(0, Math.max(2, 5 - q.items.length)); if (others.length < 2) return; const opts = shuffle(q.items.concat(others), R);
      out.push(Object.assign({}, q, { type: 'multi', id: q.id + 's', baseId: q.id, prompt: `Which of these does the book include? Select all that apply. (${q.prompt.replace(/^Reconstruct from memory: /, '').replace(/ …$/, '')})`, options: opts, correctSet: opts.map((o, i) => q.items.includes(o) ? i : -1).filter(i => i >= 0) })); });
    const ord = pool.find(q => q.type === 'order'); if (ord) out.push(Object.assign({}, ord, { shuffled: shuffle(ord.items.map((_, i) => i), R) }));
    exact.slice(Math.floor(n / 4)).forEach(q => { if (out.length < n) out.push(q); });
    return shuffle(out.slice(0, Math.max(n, out.length)), R).slice(0, n);
  }

  // ───────── knowledge gaps and mastery (from study log entries only)
  function gaps(log, cards) {
    const out = [];
    const byType = t => log.filter(l => l.type === t && l.result);
    const rate = arr => arr.length ? arr.filter(l => l.result === 'incorrect').length / arr.length : 0;
    const defs = byType('definition').concat(byType('reverse'));
    if (defs.length >= 3 && rate(defs) >= 0.4) out.push({ id: 'definitions', title: 'Definitions slip away', text: `In ${defs.filter(l => l.result === 'incorrect').length} of ${defs.length} definition questions the answer wasn’t retrieved.`, practise: 'definition', n: defs.length });
    const conf = new Map(); log.filter(l => l.confusedWith).forEach(l => { const k = [l.concept, l.confusedWith].sort().join(' ↔ '); conf.set(k, (conf.get(k) || 0) + 1); });
    [...conf.entries()].filter(([, n]) => n >= 2).forEach(([k, n]) => out.push({ id: 'confuse:' + k, title: 'Closely related concepts get swapped', text: `${k}: confused ${n} times. A comparison exercise will focus on what separates them.`, practise: 'distinction', pair: k.split(' ↔ '), n }));
    const confWrong = log.filter(l => l.result === 'incorrect' && l.confident);
    if (confWrong.length >= 2) out.push({ id: 'confident', title: 'Confident but mistaken', text: `${confWrong.length} answers were given confidently but didn’t match the book: ${[...new Set(confWrong.map(l => l.concept).filter(Boolean))].slice(0, 4).join(', ')}. These are scheduled for extra review.`, practise: 'review', n: confWrong.length });
    const recog = new Map(); log.forEach(l => { if (!l.concept) return; const r = recog.get(l.concept) || { mc: 0, mcOk: 0, sa: 0, saOk: 0 }; if (l.type === 'mc') { r.mc++; if (l.result === 'correct') r.mcOk++; } else if (['definition', 'cloze', 'reverse'].includes(l.type)) { r.sa++; if (l.result === 'correct') r.saOk++; } recog.set(l.concept, r); });
    const rv = [...recog.entries()].filter(([, r]) => r.mc && r.mcOk === r.mc && r.sa && r.saOk < r.sa);
    if (rv.length >= 2) out.push({ id: 'recognise', title: 'Recognised but not recalled', text: `You picked out ${rv.map(x => x[0]).slice(0, 4).join(', ')} from options but couldn’t produce them unaided. Short-answer recall is what builds independent retrieval.`, practise: 'cloze', n: rv.length });
    const free = byType('free'); if (free.length >= 2 && free.reduce((s, l) => s + (l.score || 0), 0) / free.length < 0.35) out.push({ id: 'free', title: 'Hard to retrieve without prompts', text: `Your closed-book recall covered about ${Math.round(100 * free.reduce((s, l) => s + (l.score || 0), 0) / free.length)}% of the chapter’s key terms on average, while prompted questions went better. Free recall is the skill to build.`, practise: 'free', n: free.length });
    const app = byType('application'); const facts = log.filter(l => ['definition', 'cloze', 'reverse'].includes(l.type));
    if (app.length >= 2 && facts.length >= 4 && app.filter(l => l.result !== 'correct').length / app.length >= 0.5 && facts.filter(l => l.result === 'correct').length / facts.length >= 0.6) out.push({ id: 'apply', title: 'Remembered, but harder to apply', text: 'You recall the definitions well, but your own self-checks show applications missing some of their defining features.', practise: 'application', n: app.length });
    return out;
  }
  const STATE_ORDER = ['new', 'learning', 'developing', 'retained', 'needs review'];
  function chapterReport(chapterId, log, cards, now) {
    now = now || Date.now();
    const L = log.filter(l => l.chapterId === chapterId), C = cards.filter(c => c.chapterId === chapterId).map(c => Object.assign({}, c, { state: stateOf(c, now) }));
    const counts = Object.fromEntries(STATE_ORDER.map(s => [s, C.filter(c => c.state === s).length]));
    const answered = L.filter(l => l.type !== 'free' && l.type !== 'application' && l.result);
    const acc = answered.length ? answered.filter(l => l.result === 'correct').length / answered.length : null;
    const free = L.filter(l => l.type === 'free'); const app = L.filter(l => l.type === 'application');
    const spaced = C.filter(c => c.history.filter(h => h.grade >= 2).length >= 2 && c.history.length >= 2 && (c.history[c.history.length - 1].t - c.history[0].t) >= DAY);
    let status = 'not started';
    if (L.length) status = 'studied';
    if (C.length && spaced.length / C.length >= 0.3) status = 'retaining';
    if (C.length >= 3 && counts.retained / C.length >= 0.8 && app.some(l => l.result === 'correct')) status = 'mastered';
    const weak = [...new Set(L.filter(l => l.result === 'incorrect').map(l => l.concept).filter(Boolean))];
    const remembered = [...new Set(L.filter(l => l.result === 'correct' && l.type !== 'application').map(l => l.concept).filter(Boolean))];
    const applied = [...new Set(app.filter(l => l.result === 'correct').map(l => l.concept))];
    return { status, counts, accuracy: acc, freeRecall: free.length ? free[free.length - 1].score : null, remembered, weak, applied, due: C.filter(c => c.due <= now && c.state !== 'new').length, total: C.length };
  }

  const api = { GEN_VERSION, sentencesOf, findDefinitions, keyTerms, generate, freeRecallPrompt, check, sameTerm, coverage, gradeFrom, newCard, schedule, stateOf, queue, buildTest, gaps, chapterReport, paragraphs, hash, norm, STATE_ORDER };
  if (typeof module !== 'undefined') module.exports = api; else root.MWS = api;
})(this);
