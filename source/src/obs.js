/* MINDWORK Observation and Memory — the eighth Cognitive Playground category. Procedurally generated, checked exactly.
   Noticing accurately and holding information, keeping what you saw or heard separate from what you inferred. */
(function (root) {
  const isNode = typeof module !== 'undefined';
  const SHAPES = ['circle', 'square', 'triangle', 'star'], COLOURS = ['blue', 'pink', 'purple', 'ink'], CNAME = { blue: 'blue', pink: 'pink', purple: 'purple', ink: 'black' };
  const POS = []; for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) POS.push([c, r]);
  const PLACE = ([c, r]) => `${['top', 'middle', 'bottom'][r]} ${['far left', 'left', 'right', 'far right'][c]}`;
  const WORDS = ['river', 'candle', 'ladder', 'orange', 'pillow', 'window', 'garden', 'bottle', 'pencil', 'blanket', 'mirror', 'basket', 'kettle', 'violin', 'harbour', 'cactus', 'compass', 'feather', 'lantern', 'marble'];
  const NAMES = ['Ayanda', 'Pieter', 'Lerato', 'Sipho', 'Fatima', 'Johan', 'Naledi', 'Thabo', 'Zanele', 'Kagiso'], ROLES = ['nurse', 'pilot', 'baker', 'teacher', 'plumber', 'architect', 'farmer', 'journalist', 'chef', 'engineer'];
  const EX = [
    { id: 'vm', name: 'Visual Memory', blurb: 'See a scene briefly, then answer questions about it.', abilities: ['analytical'] },
    { id: 'sc', name: 'Spot the Change', blurb: 'Remember a scene, then find what changed.', abilities: ['analytical'] },
    { id: 'am', name: 'Auditory Memory', blurb: 'Listen to a sequence, then write it back in order.', abilities: [], needsAudio: true },
    { id: 'as', name: 'Names and Roles', blurb: 'Remember who does what, then match them.', abilities: [] },
    { id: 'ob', name: 'Seen, Not Seen, or Interpretation', blurb: 'Separate what was in the picture from what wasn’t, and from what you’d be inferring.', abilities: ['analytical', 'critical'] },
    { id: 'wm', name: 'What Is Missing?', blurb: 'Study a scene, then spot which shape has gone.', abilities: ['analytical'] },
    { id: 'dr', name: 'Delayed Recall', blurb: 'Remember a list, do something else, then recall it.', abilities: [] }];
  const EXB = Object.fromEntries(EX.map(e => [e.id, e]));
  function rng(seed) { let h = 1779033703 ^ String(seed).length; for (const ch of String(seed)) { h = Math.imul(h ^ ch.charCodeAt(0), 3432918353); h = h << 13 | h >>> 19; } return () => { h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; }; }
  const shuffle = (a, R) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  /* level 1–5 controls items, exposure and similarity */
  const P = lvl => ({ items: 3 + lvl, seconds: Math.max(4, 11 - lvl * 1.5), seq: 3 + lvl, pairs: 2 + lvl, words: 4 + lvl });
  function scene(R, n) { const pos = shuffle(POS, R).slice(0, n); return pos.map(p => ({ s: SHAPES[Math.floor(R() * 4)], c: COLOURS[Math.floor(R() * 4)], p })); }
  function build(ex, lvl, seed) {
    const R = rng(seed + ex + lvl), p = P(lvl);
    if (ex === 'vm') { const sc = scene(R, p.items); const qs = [];
      const col = COLOURS[Math.floor(R() * 4)]; const n = sc.filter(o => o.c === col).length; qs.push({ q: `How many ${CNAME[col]} shapes were there?`, options: [...new Set([n, n + 1, Math.max(0, n - 1), n + 2])].slice(0, 4).sort((a, b) => a - b).map(String), a: String(n) });
      const o = sc[Math.floor(R() * sc.length)]; qs.push({ q: `What colour was the ${o.s} at the ${PLACE(o.p)}?`, options: COLOURS.map(c => CNAME[c]), a: CNAME[o.c] });
      const missing = SHAPES.filter(s => !sc.some(x => x.s === s)); if (missing.length) qs.push({ q: 'Which shape was NOT in the picture?', options: SHAPES, a: missing[0], multi: missing });
      else qs.push({ q: 'Where was a ' + sc[0].s + '?', options: shuffle([PLACE(sc[0].p)].concat(shuffle(POS.filter(x => !sc.some(o => o.s === sc[0].s && o.p === x)), R).slice(0, 3).map(PLACE)), R), a: PLACE(sc[0].p), multi: sc.filter(o => o.s === sc[0].s).map(o => PLACE(o.p)) });
      return { ex, lvl, scene: sc, seconds: p.seconds, qs }; }
    if (ex === 'sc') { const sc = scene(R, p.items); const b = sc.map(o => Object.assign({}, o)); const k = Math.floor(R() * b.length); const kind = Math.floor(R() * 3);
      if (kind === 0) b[k].c = COLOURS.filter(c => c !== b[k].c)[Math.floor(R() * 3)]; else if (kind === 1) b[k].s = SHAPES.filter(s => s !== b[k].s)[Math.floor(R() * 3)]; else { const free = POS.filter(x => !b.some(o => o.p === x)); b[k].p = free[Math.floor(R() * free.length)]; }
      return { ex, lvl, scene: sc, after: b, changed: k, seconds: p.seconds }; }
    if (ex === 'am') { const digits = lvl <= 2; const pool = digits ? '0123456789'.split('') : WORDS; const seq = Array.from({ length: p.seq }, () => pool[Math.floor(R() * pool.length)]); return { ex, lvl, seq, digits }; }
    if (ex === 'as') { const ns = shuffle(NAMES, R).slice(0, p.pairs), rs = shuffle(ROLES, R).slice(0, p.pairs); return { ex, lvl, pairs: ns.map((n, i) => [n, rs[i]]), seconds: p.seconds + p.pairs }; }
    if (ex === 'ob') { const sc = scene(R, p.items); const st = [];
      const col = sc[0].c, sh = sc[0].s; st.push({ t: `There was a ${CNAME[col]} ${sh}.`, c: 'seen' });
      const absentS = SHAPES.find(s => !sc.some(o => o.s === s)); const absentC = COLOURS.find(c => !sc.some(o => o.c === c));
      if (absentS) st.push({ t: `There was a ${absentS}.`, c: 'not' }); if (absentC) st.push({ t: `Something was ${CNAME[absentC]}.`, c: 'not' });
      st.push({ t: `There were ${sc.length} shapes.`, c: 'seen' }); st.push({ t: 'Someone arranged the shapes on purpose.', c: 'int' }); st.push({ t: 'The picture is meant to look calm.', c: 'int' });
      if (st.filter(x => x.c === 'not').length === 0) st.push({ t: `There were ${sc.length + 2} shapes.`, c: 'not' });
      return { ex, lvl, scene: sc, seconds: p.seconds + 2, statements: shuffle(st, R) }; }
    if (ex === 'wm') { const sc = scene(R, p.items + 1); const k = Math.floor(R() * sc.length); const after = sc.filter((_, i) => i !== k); const desc = o => `${CNAME[o.c]} ${o.s}, ${PLACE(o.p)}`;
      const others = shuffle(after, R).slice(0, 3).map(desc); const options = shuffle([desc(sc[k])].concat(others), R); return { ex, lvl, scene: sc, after, missing: k, options, answer: desc(sc[k]), seconds: p.seconds }; }
    if (ex === 'dr') { const words = shuffle(WORDS, R).slice(0, p.words); return { ex, lvl, words, seconds: p.seconds + p.words, distract: build('vm', Math.max(1, lvl - 1), seed + 'd') }; }
  }
  const nrm = s => String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').trim();
  function score(task, resp) {
    if (task.ex === 'vm') { const right = task.qs.filter((q, i) => (q.multi || [q.a]).includes(resp[i])).length; return { right, n: task.qs.length }; }
    if (task.ex === 'sc') return { right: resp === task.changed ? 1 : 0, n: 1 };
    if (task.ex === 'am') { const got = nrm(resp).split(/[\s,]+/).filter(Boolean); const right = task.seq.filter((x, i) => got[i] === String(x)).length; return { right, n: task.seq.length }; }
    if (task.ex === 'as') { const right = task.pairs.filter(([n, r]) => resp[n] === r).length; return { right, n: task.pairs.length }; }
    if (task.ex === 'ob') { const right = task.statements.filter((s, i) => resp[i] === s.c).length; return { right, n: task.statements.length }; }
    if (task.ex === 'wm') return { right: resp === task.answer ? 1 : 0, n: 1 };
    if (task.ex === 'dr') { const got = new Set(nrm(resp).split(/[\s,]+/).filter(Boolean)); const right = task.words.filter(w => got.has(w)).length; return { right, n: task.words.length }; }
  }
  /* adaptive level per exercise: up after two strong results in a row, down after a weak one */
  function level(ex, log) { const L = log.filter(e => e.ex === ex); let lv = 1; L.forEach((e, i) => { const r = e.right / e.n; if (r >= 0.8 && i > 0 && L[i - 1].right / L[i - 1].n >= 0.8 && L[i - 1].lvl === e.lvl) lv = Math.min(5, e.lvl + 1); else if (r < 0.5) lv = Math.max(1, e.lvl - 1); else lv = e.lvl; }); return lv; }
  const api = { EX, EXB, SHAPES, COLOURS, CNAME, POS, PLACE, build, score, level };
  if (isNode) module.exports = api; else root.MWOB = api;
})(this);
