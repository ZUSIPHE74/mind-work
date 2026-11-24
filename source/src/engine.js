/* MINDWORK engine — pure logic, no DOM. Runs in the browser and in Node tests.
   The evaluator is deterministic and heuristic: it reads structure and linguistic signals
   (distinctness, causal links, qualifiers, specificity, uptake), not meaning. The UI says so. */
(function (root) {
  const G = typeof module !== 'undefined' ? require('./games.js') : root.MW_GAMES;
  const B1 = typeof module !== 'undefined' ? require('./bank1.js') : root.MW_BANK1;
  const B2 = typeof module !== 'undefined' ? require('./bank2.js') : root.MW_BANK2;
  const { SKILLS, CATEGORIES, GAMES } = G;
  const BANK = [].concat(B1.BANK1, B2.BANK2);
  const GAME = Object.fromEntries(GAMES.map(g => [g.id, g]));
  const ITEM = Object.fromEntries(BANK.map(i => [i.id, i]));

  // ───────────────────────── text utilities
  const STOP = new Set(('a an the and or but if then so to of in on at by for with from as is are was were be been being am it its this that these those there here i you he she they we me him her them us my your his their our mine yours ' +
    'do does did doing have has had having not no nor can could would should will shall may might must just also very really too quite about into over under out up down off than more most less least some any each every all both either neither one two own same such only other another which who whom whose what when where why how ' +
    'because while though although however yet still even ever again once get got make made go went thing things stuff lot lots kind sort way like dont don\'t it\'s that\'s i\'m i\'ve i\'d they\'re you\'re we\'re isn\'t aren\'t wasn\'t can\'t won\'t didn\'t doesn\'t s t').split(/\s+/));
  const SYN = { afraid: 'fear', scared: 'fear', fright: 'fear', anxious: 'fear', anxiety: 'fear', worri: 'fear', worry: 'fear', nervous: 'fear', tired: 'fatigu', exhaust: 'fatigu', sleepy: 'fatigu', drain: 'fatigu',
    upset: 'upset', annoy: 'upset', angry: 'upset', anger: 'upset', mad: 'upset', irritat: 'upset', sad: 'sad', unhappy: 'sad', depress: 'sad', low: 'sad', boss: 'manag', manager: 'manag', supervisor: 'manag',
    money: 'cost', expens: 'cost', price: 'cost', cheap: 'cost', job: 'work', career: 'work', office: 'work', colleagu: 'cowork', coworker: 'cowork', ill: 'sick', unwell: 'sick', sick: 'sick', illness: 'sick',
    famili: 'famili', parent: 'famili', kid: 'child', children: 'child', child: 'child', busy: 'busy', overwhelm: 'busy', swamp: 'busy', comfort: 'familiar', habit: 'familiar', routin: 'familiar', unsure: 'uncertain', unknown: 'uncertain' };
  function norm(s) { return String(s || '').toLowerCase().replace(/[’‘]/g, "'").replace(/[“”]/g, '"'); }
  function stem(w) {
    if (w.length > 5) w = w.replace(/(ations?|ments?|ness|ingly|ings?|edly|ies|ied|ers?|ed|ly|es|s)$/, m => (m === 'ies' || m === 'ied') ? 'i' : '');
    else if (w.length > 3) w = w.replace(/s$/, '');
    return w;
  }
  function canon(w) { const s = stem(w); for (const k in SYN) if (s.startsWith(k) || w.startsWith(k)) return SYN[k]; return s; }
  function words(s) { return (norm(s).match(/[a-z0-9]+(?:'[a-z]+)?/g) || []); }
  function contentTokens(s) { return words(s).filter(w => !STOP.has(w) && w.length > 1).map(canon); }
  function contentSet(s) { return new Set(contentTokens(s)); }
  function sentences(s) { return String(s || '').split(/(?<=[.!?])\s+|\n+/).map(x => x.trim()).filter(x => x.length > 1); }
  function padded(s) { return ' ' + norm(s).replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ') + ' '; }
  function hasPhrase(p, m) { return p.indexOf(' ' + m.trim() + ' ') !== -1; }
  function findMarkers(s, list) { const p = padded(s); return list.filter(m => hasPhrase(p, m)); }
  function overlap(a, b) {
    const A = a instanceof Set ? a : contentSet(a), Bs = b instanceof Set ? b : contentSet(b);
    if (!A.size || !Bs.size) return 0;
    let n = 0; A.forEach(x => { if (Bs.has(x)) n++; });
    return n / Math.min(A.size, Bs.size);
  }
  function kwHit(text, kws) {
    if (!kws || !kws.length) return false;
    const p = padded(text), toks = words(text);
    return kws.some(k => { const kk = norm(k); return kk.includes(' ') || kk.includes("'") ? p.includes(' ' + kk) : toks.some(t => t.startsWith(kk)); });
  }
  const clamp = (x, a = 0, b = 4) => Math.max(a, Math.min(b, x));
  const round1 = x => Math.round(x * 10) / 10;
  const short = (s, n = 140) => { s = String(s || '').trim().replace(/\s+/g, ' '); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; };

  const M = {
    causal: ['because', 'since', 'so', 'therefore', 'which means', 'this means', 'leads to', 'lead to', 'led to', 'leading to', 'as a result', 'due to', 'causes', 'caused', 'results in', "that's why", 'which makes', 'makes them', 'makes it', 'in turn', 'if', 'then', 'means', 'which is why', 'so that', 'drives', 'affects', 'reduces', 'increases'],
    qual: ['often', 'sometimes', 'usually', 'tend', 'tends', 'may', 'might', 'can', 'could', 'unless', 'depends', 'depending', 'in some', 'not always', 'for some', 'many', 'most', 'partly', 'probably', 'likely', 'perhaps', 'generally', 'in general', 'when', 'only when', 'to some extent', 'rarely', 'occasionally', 'seems', 'appears', 'typically', 'in many cases', 'for most', 'some people', 'not necessarily', 'at least', 'mostly'],
    abs: ['always', 'never', 'everyone', 'everybody', 'nobody', 'no one', 'completely', 'totally', 'entirely', 'definitely', 'certainly', 'impossible', 'all of them', 'all people', 'everything', 'nothing', 'obviously', 'clearly', 'without exception', 'guaranteed', 'proves', 'destroys', 'useless'],
    vague: ['thing', 'things', 'stuff', 'good', 'bad', 'nice', 'very', 'really', 'a lot', 'lots', 'kind of', 'sort of', 'somehow', 'basically', 'whatever', 'issues', 'issue', 'weird', 'etc', 'great', 'okay', 'some stuff', 'at some point', 'in a lot of ways', 'more involved', 'difficult person', 'certain people', 'do something'],
    example: ['for example', 'for instance', 'such as', 'like when', 'e g', 'eg', 'imagine', 'say you', 'suppose', 'once', 'last week', 'yesterday', 'last year', 'a friend', 'my', 'when i', 'think of'],
    contrast: ['whereas', 'while', 'but', 'however', 'unlike', 'rather than', 'on the other hand', 'instead', 'not the same', 'difference', 'different', 'differs', 'in contrast', 'although', 'though', 'not necessarily', 'without', 'yet', 'versus', 'vs'],
    discourse: ['first', 'second', 'third', 'also', 'however', 'because', 'so', 'as a result', 'finally', 'therefore', 'this means', 'in turn', 'for example', 'then', 'overall', 'in short', 'which', 'meanwhile', 'on top of', 'that is why', 'together'],
    ack: ['sounds', "that's", 'that sounds', 'must be', 'i can imagine', 'makes sense', 'oh', 'ah', 'wow', 'i bet', 'fair', 'true', 'ha', 'haha', 'oof', 'ugh', 'same', 'i get', 'totally', 'nice', 'congrats', 'congratulations', 'right', 'yeah', 'yes', 'aw', 'oh no', 'that is'],
    self: ['i', "i'm", "i've", 'my', 'me', "i'd", "i'll", 'myself'],
    connectM: ['reminds me', 'similar', 'same thing', 'like when', "that's like", 'kind of like', 'the same', 'just like', 'related', 'also happened', 'i had', 'mine', 'me too'],
    angleM: ['wonder', 'i think', 'depends', 'or maybe', 'what if', 'funny', 'interesting', 'curious', 'apparently', 'i read', 'i noticed', 'makes me think', 'the thing about', 'part of', 'whether', 'i suspect'],
    tentative: ['might', 'maybe', 'perhaps', 'could', 'possibly', 'wonder', 'not sure', 'seems', 'i guess', 'or', 'whether', 'may', 'if', 'sounds like', 'i imagine', 'probably'],
    verdict: ['is right', 'is wrong', 'fault', 'to blame', 'should have', 'unreasonable', 'is selfish', 'overreact', 'overreacting', 'in the wrong', 'is being stupid', 'ridiculous'],
    forced: ['amazing', 'awesome', 'incredible', 'so cool', 'fantastic', 'love that', 'wonderful', 'omg'],
    meansM: ['is about', 'means', 'refers to', 'involves', 'is when', 'is the', 'happens when', 'is a', 'relates to', 'describes'],
    analogy: ['like', 'imagine', 'similar to', 'think of', 'as if', 'just as', 'picture', 'kind of like', 'same way']
  };

  function analyse(text, ref) {
    const ws = words(text), sents = sentences(text), cset = contentSet(text);
    const refSet = ref ? (ref instanceof Set ? ref : contentSet(ref)) : new Set();
    let novel = 0; cset.forEach(x => { if (!refSet.has(x)) novel++; });
    const vague = findMarkers(text, M.vague);
    return {
      text: String(text || ''), n: ws.length, sents: sents.length || (ws.length ? 1 : 0), cset,
      causal: findMarkers(text, M.causal), qual: findMarkers(text, M.qual), abs: findMarkers(text, M.abs), vague,
      example: findMarkers(text, M.example).length > 0 || /\d/.test(text), contrast: findMarkers(text, M.contrast),
      discourse: findMarkers(text, M.discourse), novel, restate: ref ? overlap(cset, refSet) : 0,
      digits: /\d/.test(text), longWords: ws.filter(w => w.length >= 11).length
    };
  }

  const DIM = {
    clarity(a) { if (a.n < 4) return a.n ? 1 : 0; const avg = a.n / Math.max(1, a.sents); let s = avg <= 26 ? 4 : avg <= 34 ? 3 : avg <= 45 ? 2 : 1; if (a.vague.length / a.n > 0.08) s -= 1; return clamp(s, 1); },
    specificity(a) { if (a.n < 3) return 0; let s = 2; if (a.example) s++; if (!a.vague.length && a.n >= 8) s++; s -= Math.floor(a.vague.length / 2); return clamp(s); },
    reasoning(a) { if (a.n < 5) return a.n ? 1 : 0; const c = a.causal.length; return c >= 2 ? 4 : c === 1 ? 3 : (a.n > 12 ? 1.5 : 1); },
    nuance(a) { if (a.n < 4) return 0; let s = a.qual.length >= 2 ? 4 : a.qual.length === 1 ? 3 : 1.5; const unq = a.abs.length && !a.qual.length ? a.abs.length : 0; s -= Math.min(2, unq); if (a.contrast.length && s < 4) s += 0.5; return clamp(s); },
    development(a) { if (a.n < 4) return 0; let s = a.novel >= 9 ? 4 : a.novel >= 6 ? 3 : a.novel >= 3 ? 2 : 1; if (a.restate >= 0.75 && a.novel < 4) s = Math.min(s, 1); return s; },
    organisation(a) { if (a.n < 6) return 1; const d = a.discourse.length; if (a.sents >= 2 && d >= 2) return 4; if (d >= 1 && a.sents >= 2) return 3.5; if (d >= 1 || a.sents >= 2) return 2.5; return 1.5; },
    expression(a) { if (a.n < 3) return 0; let s = 3; if (!a.vague.length) s += 0.5; if (a.n / Math.max(1, a.sents) > 34) s -= 1; if (a.longWords / a.n > 0.12) s -= 1; if (a.n > 160) s -= 0.5; return clamp(s); }
  };

  function analyseIdeas(ideas, item, promptText) {
    const raw = (ideas || []).map(x => String(x || '').trim()).filter(Boolean);
    const sets = raw.map(contentSet);
    const promptSet = contentSet(promptText || '');
    const thin = [], restated = [];
    raw.forEach((t, i) => { if (sets[i].size < 1 || words(t).length < 2) thin.push(i); else if (promptText && overlap(sets[i], promptSet) >= 0.8 && sets[i].size <= promptSet.size + 1) restated.push(i); });
    // union-find for rephrasings
    const par = raw.map((_, i) => i); const f = i => par[i] === i ? i : (par[i] = f(par[i]));
    const dupPairs = [];
    for (let i = 0; i < raw.length; i++) for (let j = i + 1; j < raw.length; j++) {
      if (thin.includes(i) || thin.includes(j)) continue;
      const o = overlap(sets[i], sets[j]);
      if (o >= 0.6 && Math.min(sets[i].size, sets[j].size) >= 2) { dupPairs.push([i, j]); par[f(j)] = f(i); }
    }
    const angles = (item && item.angles) || [];
    const ideaAngles = raw.map(t => angles.map((a, k) => kwHit(t, a.k) ? k : -1).filter(k => k >= 0));
    const covered = new Set(); ideaAngles.forEach(a => a.forEach(k => covered.add(k)));
    const clusters = {}; raw.forEach((_, i) => { if (thin.includes(i) || restated.includes(i)) return; const r = f(i); (clusters[r] = clusters[r] || []).push(i); });
    const clusterList = Object.values(clusters);
    const own = clusterList.filter(c => c.every(i => !ideaAngles[i].length)).length;
    return { raw, n: raw.length, distinct: clusterList.length, clusters: clusterList, dupPairs, thin, restated, covered: [...covered], uncovered: angles.map((a, k) => k).filter(k => !covered.has(k)), ideaAngles, own, angles };
  }
  function varietyScore(ia, target) {
    if (!ia.n) return 0;
    let s = clamp((ia.distinct / Math.max(1, target)) * 3, 0, 3);
    const spread = ia.covered.length + ia.own;
    if (spread >= Math.min(3, target)) s += 1;
    return clamp(s);
  }

  // ───────────────────────── conversation analysis
  function analyseConvo(text, partner, topic, prior, loop) {
    const sents = sentences(text), ws = words(text);
    const q = sents.filter(s => /\?\s*$/.test(s)), stmts = sents.filter(s => !/\?\s*$/.test(s) && words(s).length >= 3);
    const pSet = contentSet(partner), tSet = contentSet(text);
    let novel = 0; tSet.forEach(x => { if (!pSet.has(x)) novel++; });
    const uptake = overlap(tSet, pSet) > 0 || kwHit(text, topic || []);
    const first = sents[0] || '';
    const strategies = [];
    if (findMarkers(first, M.ack).length) strategies.push('acknowledging');
    if (stmts.length && novel >= 3) strategies.push('adding a thought');
    if (findMarkers(text, M.connectM).length) strategies.push('making a connection');
    if (findMarkers(text, M.angleM).length && stmts.length) strategies.push('introducing an angle');
    if (q.length && uptake) strategies.push('expressing curiosity');
    if (findMarkers(text, M.self).length && stmts.length) strategies.push('sharing something of your own');
    const flags = [];
    const questionOnly = q.length > 0 && stmts.length === 0;
    // A question on its own is a natural, valid reply. Relying on questions ALONE is raised only when it recurs across
    // many conversations, which Thinking Patterns tracks from the replies themselves.
    if (ws.length > 0 && ws.length < 4 && !q.length) flags.push('A very short reply can close a conversation unless it invites something; whether that matters depends on whether you wanted to continue.');
    if (ws.length > 80) flags.push('That’s a lot for a casual exchange. One or two sentences usually leave more room for the other person.');
    const forced = (text.match(/!/g) || []).length >= 3 || findMarkers(text, M.forced).length >= 2;
    if (forced) flags.push('The enthusiasm reads as amplified. Plain warmth usually lands better than superlatives.');
    if (!uptake && ws.length >= 4 && !q.length) flags.push('I can’t find words from what they said in your reply. If it connects in a way word-matching can’t see (through “he”, “she”, “that”, or a related idea), ignore this.');
    let repeat = 0;
    if (prior && prior.length) repeat = Math.max(...prior.map(p => overlap(tSet, contentSet(p))));
    const loopHits = loop ? loop.filter(k => kwHit(text, [k])).length : 0;
    const repeated = (repeat >= 0.5 && novel < 4) || (loopHits >= 2 && novel < 4);
    if (repeated) flags.push('This returns to the same point as your earlier lines.');
    let contribution = 0;
    if (ws.length) {
      if (stmts.length && novel >= 3) contribution = uptake ? 4 : 3;
      else if (stmts.length) contribution = 2.5;
      else contribution = uptake ? 2 : 1;
      if (questionOnly && uptake && novel >= 3) contribution = 2;
      if (ws.length > 80) contribution -= 0.5;
      if (forced) contribution -= 0.5;
      if (repeated) contribution = Math.min(contribution, 1.5);
    }
    return { n: ws.length, strategies, flags, questionOnly, uptake, novel, repeated, contribution: clamp(contribution) };
  }

  // ───────────────────────── stage builders
  const OPS_Q = {
    explanation: 'Explain what the statement means or why it’s true.', example: 'Give a concrete example of it happening.', cause: 'What causes this?', consequence: 'What follows from it?',
    comparison: 'Compare it with something similar or different.', counterexample: 'Describe a case where it isn’t true.', implication: 'What does it imply that isn’t obvious?', qualification: 'Under what conditions does it hold — or not?'
  };
  const OPS_M = {
    example: M.example, cause: M.causal.concat(['due', 'comes from', 'driven']), consequence: ['so', 'result', 'leads', 'would', 'then', 'means', 'causes', 'ends up', 'makes'],
    comparison: ['like', 'than', 'similar', 'whereas', 'unlike', 'compared', 'same as', 'just as', 'different'], counterexample: ['but', 'except', 'however', 'not', "isn't", "doesn't", 'when', 'case', 'fails'],
    implication: ['means', 'suggests', 'implies', 'so', 'therefore', 'which means', 'should', 'follows'], qualification: ['unless', 'only', 'sometimes', 'depends', 'when', 'if', 'most', 'usually', 'as long as', 'not always'],
    explanation: ['because', 'since', 'means', 'is about', 'happens', 'so', 'which']
  };

  function stagesFor(item) {
    const g = GAME[item.game];
    switch (item.game) {
      case 'beyond': return [
        { id: 'interp', kind: 'text', label: 'Your first interpretation', prompt: 'What do you take this statement to mean? Write your first reading in a sentence or two.' },
        { id: 'reasons', kind: 'ideas', min: item.lvl >= 3 ? 4 : 3, label: 'Possible reasons', prompt: 'Why might this happen? Give reasons that work through different mechanisms, not different wordings.' },
        { id: 'range', kind: 'text', label: 'Testing your reasons', prompt: 'Pick one of your reasons. In what circumstances would it apply strongly — and where would it not apply?' },
        { id: 'exception', kind: 'text', label: 'An exception', prompt: 'Describe a case where the statement is false, or the opposite happens.' },
        { id: 'synth', kind: 'text', label: 'A fuller understanding', prompt: 'Now write a more complete version of the statement — one your first interpretation couldn’t have said.' }];
      case 'possibility': return [
        { id: 'ideas', kind: 'ideas', min: item.lvl >= 3 ? 5 : 4, label: 'Possible explanations', prompt: 'List explanations that could each account for this. Don’t rank them yet.' },
        { id: 'check', kind: 'text', label: 'What you’d check first', prompt: 'Which would you check first, and what would you look for to tell them apart?' }];
      case 'whatelse': return [
        { id: 'ideas', kind: 'ideas', min: item.lvl >= 3 ? 4 : 3, label: 'Other explanations', prompt: 'Give other explanations that fit the same facts as well as the obvious one.' },
        { id: 'distinguish', kind: 'text', label: 'Telling them apart', prompt: 'What evidence would separate the obvious reading from your strongest alternative?' }];
      case 'expand': return (item.ops || ['explanation', 'example', 'consequence']).map(op => ({ id: 'op_' + op, kind: 'text', op, label: op[0].toUpperCase() + op.slice(1), prompt: OPS_Q[op], rows: 2 }));
      case 'dots': return [
        { id: 'links', kind: 'ideas', min: 2, label: 'Possible connections', prompt: 'What could link these facts? List different possible connections.' },
        { id: 'explain', kind: 'text', label: 'Your strongest connection', prompt: 'Develop your strongest connection into an explanation that uses all the facts.' }];
      case 'hidden': return [
        { id: 'ab', kind: 'text', label: `How ${item.a.toLowerCase()} affects ${item.b.toLowerCase()}`, prompt: `Explain the mechanism: how might ${item.a.toLowerCase()} influence ${item.b.toLowerCase()}?` },
        { id: 'ba', kind: 'text', label: `How ${item.b.toLowerCase()} affects ${item.a.toLowerCase()}`, prompt: `Now the other direction: how might ${item.b.toLowerCase()} influence ${item.a.toLowerCase()}?` },
        { id: 'limit', kind: 'text', label: 'Where it breaks down', prompt: 'When might the relationship weaken, reverse or not hold at all?' }];
      case 'chain': return [
        { id: 'chain', kind: 'chain', min: item.links, label: 'The chain', prompt: 'Add one link at a time. Each should follow from the one before.' },
        { id: 'break', kind: 'text', label: 'Interrupting the chain', prompt: 'Where could this chain be interrupted, and what would interrupt it?' }];
      case 'explainconn': return [
        { id: 'unite', kind: 'text', label: 'What links them', prompt: 'Explain what these have in common. Aim for a mechanism, not just a topic.' },
        { id: 'odd', kind: 'text', label: 'The weakest fit', prompt: 'Which one fits your explanation least well, and why?' }];
      case 'challenge': {
        const s = [
          { id: 'stance', kind: 'choice', options: ['Agree', 'Partly agree', 'Disagree', 'Not sure'], label: 'Where you stand', prompt: 'Do you agree?', withText: 'Explain your position.' },
          { id: 'assume', kind: 'ideas', min: 2, label: 'Your assumptions', prompt: 'What must be true for your position to hold? List the assumptions underneath it.' }];
        if (item.custom) s.push({ id: 'oppose', kind: 'text', label: 'The strongest opposition', prompt: 'Write the strongest argument a thoughtful person would make against your position.' });
        s.push({ id: 'respond', kind: 'text', label: 'Your response', prompt: item.custom ? 'Respond to that argument. Concede what’s right in it.' : 'Respond to this argument. Engage its actual point.', reveal: item.custom ? null : item.opposing },
          { id: 'evidence', kind: 'text', label: 'What would change your mind', prompt: 'What specific evidence or experience would make you change or weaken your position?' },
          { id: 'final', kind: 'text', label: 'Your position now', prompt: 'Restate your position. Qualify it if your examination warrants — or explain why it stands as it was.' });
        return s;
      }
      case 'weaklink': return [
        { id: 'pick', kind: 'pick', parts: item.parts, label: 'The weak link', prompt: 'Select the sentence where the reasoning fails.' },
        { id: 'why', kind: 'text', label: 'Why it matters', prompt: 'What’s wrong with that step, and what would the argument need to fix it?' }];
      case 'evidence': return [
        { id: 'sort', kind: 'sort', items: item.items.map(x => x.t), buckets: EVCATS, label: 'Sort the statements', prompt: 'Place each statement in a category.' },
        { id: 'defend', kind: 'text', label: 'Defend a borderline call', prompt: (() => { const b = item.items.find(x => x.alt) || item.items[1]; return `Explain where you placed “${b.t}” — and what makes it a borderline case.`; })() }];
      case 'missing': return [
        { id: 'needs', kind: 'ideas', min: 3, label: 'What you’d need to know', prompt: 'List what you would need to know before reaching a conclusion. Phrase them as questions if that helps.' },
        { id: 'now', kind: 'text', label: 'What you can say now', prompt: 'Given only what you know, what can you honestly conclude right now?' }];
      case 'rankexp': return [
        { id: 'rank', kind: 'order', items: item.options, label: 'Your ranking', prompt: 'Order from most to least plausible.' },
        { id: 'defend', kind: 'text', label: 'Defend your ranking', prompt: 'Why is your first choice more plausible than your second? What would change the order?' }];
      case 'perspectives': return [
        { id: 'views', kind: 'fields', fields: item.people, label: 'Each perspective', prompt: 'How might each person see this? Write from where they stand.' },
        { id: 'collide', kind: 'text', label: 'Where they collide', prompt: 'Where do these readings conflict — and is there anything they all share?' }];
      case 'meaning': return [
        { id: 'readings', kind: 'fields', fields: item.contexts, label: 'Meaning in each context', prompt: 'What does the event most plausibly mean in each context?' },
        { id: 'lesson', kind: 'text', label: 'What changes the meaning', prompt: 'What is it about context that changed the meaning?' }];
      case 'reverse': return [
        { id: 'ideas', kind: 'ideas', min: item.lvl >= 3 ? 3 : 2, label: 'When the opposite is true', prompt: 'Describe realistic circumstances where the opposite interpretation is reasonable.' },
        { id: 'lesson', kind: 'text', label: 'What this reveals', prompt: 'What does this tell you about when the original interpretation holds?' }];
      case 'both': return [
        { id: 'ideas', kind: 'ideas', min: 2, label: 'Conditions', prompt: 'Under what conditions — when, for whom, in what sense — could both be true?' },
        { id: 'hold', kind: 'text', label: 'One sentence holding both', prompt: 'Write a single sentence that keeps both statements true.' }];
      case 'chaos': return [
        { id: 'group', kind: 'group', items: item.statements.map(x => x.t), groups: item.groups, label: 'Group the statements', prompt: 'Place each statement into a group, then name each group by the role it plays.' },
        { id: 'central', kind: 'pick', parts: item.statements.map(x => x.t), label: 'The central point', prompt: 'Which statement best captures the central point?' },
        { id: 'relate', kind: 'text', label: 'How it fits together', prompt: 'Explain how your groups relate to each other and to the central point.' }];
      case 'mainpoint': return [
        { id: 'pick', kind: 'pick', parts: item.parts, label: 'The central argument', prompt: 'Select the sentence that carries the central argument.' },
        { id: 'restate', kind: 'text', label: 'In your own words', prompt: 'State the main point in one sentence of your own — without copying.', rows: 2 }];
      case 'argue': return [
        { id: 'claim', kind: 'text', label: 'Central claim', prompt: 'State the claim in one sentence, as precisely as you can.', rows: 2 },
        { id: 'reasons', kind: 'ideas', min: 2, label: 'Supporting reasons', prompt: 'Give distinct reasons for the claim.' },
        { id: 'example', kind: 'text', label: 'Evidence or example', prompt: 'Give a concrete example or piece of evidence for one of your reasons.', rows: 2 },
        { id: 'objection', kind: 'text', label: 'An objection', prompt: 'State the strongest objection to your claim.', rows: 2 },
        { id: 'response', kind: 'text', label: 'Your response', prompt: 'Respond to the objection. You can concede part of it.' }];
      case 'diff': return [
        { id: 'distinction', kind: 'text', label: 'The distinction', prompt: `In your own words, what’s the difference between ${item.a.toLowerCase()} and ${item.b.toLowerCase()}?` },
        { id: 'exA', kind: 'text', label: `${item.a} without ${item.b.toLowerCase()}`, prompt: `Describe a situation with ${item.a.toLowerCase()} but not ${item.b.toLowerCase()}.`, rows: 2 },
        { id: 'exB', kind: 'text', label: `${item.b} without ${item.a.toLowerCase()}`, prompt: `And one with ${item.b.toLowerCase()} but not ${item.a.toLowerCase()}.`, rows: 2 }];
      case 'exact': return [
        { id: 'rewrite', kind: 'text', label: 'Your precise version', prompt: 'Rewrite it so the listener knows exactly what you mean. Invent plausible specifics.', rows: 3 },
        { id: 'decide', kind: 'text', label: 'What you had to decide', prompt: 'What did you have to work out about your own meaning to do this?', rows: 2 }];
      case 'simple': return [{ id: 'explain', kind: 'text', label: 'Your explanation', prompt: `Explain ${item.concept.toLowerCase()} to: ${item.audience.toLowerCase()}.`, rows: 6 }];
      case 'nuance': return [
        { id: 'rewrite', kind: 'text', label: 'The accurate version', prompt: 'Rewrite it so it says exactly as much as is true.', rows: 3 },
        { id: 'why', kind: 'text', label: 'What you changed', prompt: 'Which part claimed too much, and what condition did you add?', rows: 2 }];
      case 'words': return [{ id: 'choice', kind: 'choice', options: item.options, label: 'Your choice', prompt: 'Which expression best communicates the intended meaning?', withText: 'Why that one — and what would the others get wrong?' }];
      case 'keepgoing': return [
        { id: 'r1', kind: 'reply', label: 'Your reply', prompt: 'Reply as you naturally would.' },
        { id: 'r2', kind: 'reply', label: 'Your next reply', prompt: 'They respond. Reply again — and this time try a different move from your first reply.', reveal: item.next }];
      case 'norepeat': return [{ id: 'reply', kind: 'reply', label: 'Your next line', prompt: 'Write your next line. Stay on the topic, but move it somewhere new.' }];
      case 'beyondq': return [{ id: 'reply', kind: 'reply', label: 'Your answer', prompt: 'Answer, and add one detail or thought they could pick up.' }];
      case 'between': return [
        { id: 'ideas', kind: 'ideas', min: item.lvl >= 3 ? 3 : 2, label: 'Possible meanings', prompt: 'What might they be communicating? List different readings.' },
        { id: 'reply', kind: 'reply', label: 'Your response', prompt: 'Write how you’d respond without assuming which reading is true.' }];
      case 'followup': return [{ id: 'reply', kind: 'reply', label: 'Your follow-up', prompt: 'Reply in a way that shows you heard the specific thing they said.' }];
      case 'branch': return [
        { id: 'path', kind: 'branch', label: 'The conversation', prompt: 'Choose your responses.' },
        { id: 'final', kind: 'reply', label: 'In your own words', prompt: item.final }];
      case 'integrated': return [
        { id: 'facts', kind: 'ideas', min: 3, label: 'The facts', prompt: 'List only what is actually established in the situation.' },
        { id: 'assume', kind: 'ideas', min: 2, label: 'Assumptions in play', prompt: 'What are people assuming without having shown it?' },
        { id: 'explain', kind: 'ideas', min: 3, label: 'Possible explanations', prompt: 'Generate explanations that could account for the facts.' },
        { id: 'missing', kind: 'ideas', min: 2, label: 'Missing information', prompt: 'What would you need to know to choose between them?' },
        { id: 'persp', kind: 'text', label: 'Other perspectives', prompt: 'How might two of the people involved see this differently?' },
        { id: 'position', kind: 'text', label: 'Your reasoned position', prompt: 'State your position clearly and concisely, including how confident you are and what would change it.', rows: 5 }];
      case 'deep': return [
        { id: 'first', kind: 'text', label: 'First answer', prompt: 'Answer quickly. What’s your first honest response?' },
        { id: 'terms', kind: 'text', label: 'Clarify the terms', prompt: 'Which word in the question carries the most weight? What do you mean by it — and what could someone else mean?' },
        { id: 'reasons', kind: 'ideas', min: 3, label: 'Reasons and considerations', prompt: 'List distinct considerations that bear on the question.' },
        { id: 'counter', kind: 'text', label: 'Against yourself', prompt: 'What is the best case against your first answer?' },
        { id: 'connect', kind: 'text', label: 'A distant connection', prompt: 'Connect the question to a field or situation that seems unrelated. What does the comparison reveal?' },
        { id: 'implic', kind: 'text', label: 'Implications', prompt: 'If your current view is right, what else follows? Name something surprising.' },
        { id: 'revised', kind: 'text', label: 'Revised view', prompt: 'Write your view now, with the qualifications it needs.', rows: 5 },
        { id: 'distil', kind: 'text', label: 'Distil it', prompt: 'One sentence. What do you now think that you didn’t when you started?', rows: 2 }];
    }
    return [{ id: 'text', kind: 'text', label: g ? g.name : 'Response', prompt: 'Respond.' }];
  }
  const EVCATS = [{ id: 'fact', name: 'Observable fact' }, { id: 'interp', name: 'Interpretation' }, { id: 'assume', name: 'Assumption' }, { id: 'concl', name: 'Conclusion' }, { id: 'claim', name: 'Unsupported claim' }];

  function promptText(item) {
    return [item.s, item.obvious, item.a, item.b, item.q, item.concept, (item.facts || []).join(' '), (item.points || []).join(' '), (item.lines || []).join(' '), (item.script || []).map(x => x.t || x).join(' ')].filter(Boolean).join(' ');
  }

  // ───────────────────────── evaluation
  function newFb() { return { dims: {}, explored: [], unexplored: [], attention: [], good: [], communicated: '', question: '', reveal: [], extra: {} }; }
  function setDim(fb, k, v) { if (v == null || isNaN(v)) return; fb.dims[k] = fb.dims[k] == null ? round1(v) : round1((fb.dims[k] + v) / 2); }
  function absCheck(fb, a, where) { const unq = a.abs.filter(x => !['clearly', 'obviously'].includes(x) || true); if (a.abs.length && !a.qual.length) fb.attention.push(`${where ? where + ': ' : ''}“${a.abs[0]}” makes the claim absolute. Is that what you intend?`); }
  function vagueCheck(fb, a, where) { if (a.vague.length >= 2) fb.attention.push(`${where ? where + ': ' : ''}vague words (${a.vague.slice(0, 3).map(v => '“' + v + '”').join(', ')}) leave the reader to fill in your meaning.`); }
  function ideasFeedback(fb, ia, label, target) {
    if (!ia.n) { fb.attention.push(`You didn’t list any ${label}.`); return; }
    fb.explored.push(`${ia.distinct} distinct ${label}${ia.n !== ia.distinct ? ` (from ${ia.n} entries)` : ''}.`);
    if (ia.covered.length) fb.explored.push('Angles you reached: ' + ia.covered.map(k => ia.angles[k].l.toLowerCase()).join('; ') + '.');
    if (ia.own) fb.good.push(`${ia.own} of your ${label} went somewhere outside the common angles — that’s your own territory.`);
    ia.dupPairs.slice(0, 2).forEach(([i, j]) => fb.attention.push(`“${short(ia.raw[i], 60)}” and “${short(ia.raw[j], 60)}” look like the same idea in different words. What mechanism separates them?`));
    if (ia.thin.length) fb.attention.push(`${ia.thin.length} entr${ia.thin.length > 1 ? 'ies are' : 'y is'} too brief to count as an idea — add the “how” or “why”.`);
    if (ia.restated.length) fb.attention.push('At least one entry mostly restates the prompt rather than adding to it.');
    if (ia.distinct < target) fb.attention.push(`Aim for at least ${target} genuinely different ${label}; you have ${ia.distinct}.`);
    ia.uncovered.slice(0, 2).forEach(k => fb.unexplored.push(ia.angles[k].l));
  }
  function centralFrom(text) { const s = sentences(text); return s.length ? short(s[0], 180).replace(/[.!]+$/, '') : ''; }
  function describeClaim(a) {
    const bits = [];
    if (a.causal.length) bits.push('gives a reason');
    if (a.qual.length) bits.push('is qualified');
    else if (a.abs.length) bits.push('is stated as an absolute');
    if (a.example) bits.push('includes something concrete');
    return bits.length ? 'It ' + bits.join(', ').replace(/, ([^,]*)$/, ' and $1') + '.' : 'It’s stated without a reason or qualification yet.';
  }

  function evaluate(item, responses) {
    const g = GAME[item.game], r = responses || {}, fb = newFb(), P = promptText(item), Pset = contentSet(P);
    const T = id => String(r[id] || '').trim();
    const A = id => analyse(T(id), Pset);
    const ideas = (id, it, target, label) => { const ia = analyseIdeas(r[id] || [], it || item, P); ideasFeedback(fb, ia, label, target); setDim(fb, 'variety', varietyScore(ia, target)); return ia; };

    switch (item.game) {
      case 'beyond': {
        const a1 = A('interp'), a5 = analyse(T('synth'), contentSet(T('interp') + ' ' + P));
        fb.communicated = `Your first reading: “${centralFrom(T('interp'))}”. Your fuller version: “${centralFrom(T('synth'))}”. ` + describeClaim(a5);
        ideas('reasons', item, item.lvl >= 3 ? 4 : 3, 'reasons');
        const ex = A('exception'), rg = A('range');
        setDim(fb, 'development', DIM.development(a5)); setDim(fb, 'nuance', DIM.nuance(a5)); setDim(fb, 'reasoning', (DIM.reasoning(rg) + DIM.reasoning(a5)) / 2);
        if (ex.n >= 6) fb.explored.push('You found an exception, which is what turns a slogan into a claim with edges.'); else fb.attention.push('The exception stage is thin. A real counter-case is what shows where the statement stops working.');
        if (a5.novel < 4) fb.attention.push('Your fuller version adds little that wasn’t already in your first reading. Try folding in your exception or your strongest reason.');
        else fb.good.push('Your final version says things your first reading didn’t — the idea moved.');
        absCheck(fb, a5, 'Final version');
        break;
      }
      case 'possibility': case 'whatelse': {
        const target = item.lvl >= 3 ? (item.game === 'possibility' ? 5 : 4) : (item.game === 'possibility' ? 4 : 3);
        const ia = ideas('ideas', item, target, 'explanations');
        const c = A(item.game === 'possibility' ? 'check' : 'distinguish');
        if (item.game === 'whatelse') { const ob = contentSet(item.obvious); const same = ia.raw.filter(x => overlap(contentSet(x), ob) >= 0.7).length; if (same) fb.attention.push(`${same} of your alternatives restate the obvious reading.`); }
        fb.communicated = ia.n ? `You proposed ${ia.distinct} distinct possibilit${ia.distinct === 1 ? 'y' : 'ies'}, starting with “${short(ia.raw[0], 80)}”.` : 'You haven’t proposed any possibilities yet.';
        setDim(fb, 'relevance', ia.n ? clamp(4 - ia.thin.length - ia.restated.length) : 0);
        setDim(fb, 'reasoning', DIM.reasoning(c));
        if (c.n >= 6 && (findMarkers(c.text, ['check', 'look', 'ask', 'see whether', 'see if', 'find out', 'test', 'compare', 'would show', 'would tell']).length)) fb.good.push('You named a concrete check, which turns guessing into investigating.');
        else fb.attention.push('Your last answer doesn’t say what you would actually observe or ask to tell explanations apart.');
        break;
      }
      case 'expand': {
        const ops = item.ops || []; const base = contentSet(item.s); let restated = 0, opHits = 0, devs = [];
        ops.forEach(op => {
          const t = T('op_' + op), a = analyse(t, base);
          if (!t) { fb.attention.push(`${op}: left blank.`); return; }
          if (a.restate >= 0.7 && a.novel < 3) { restated++; fb.attention.push(`${op}: this mostly repeats the original statement in different words.`); }
          else devs.push(op);
          if (kwHit(t, OPS_M[op] || []) || findMarkers(t, OPS_M[op] || []).length) opHits++;
          else fb.attention.push(`${op}: it isn’t clear this does the ${op} operation — check it answers “${OPS_Q[op]}”`);
        });
        const ans = ops.map(op => T('op_' + op)).filter(Boolean);
        const ia = analyseIdeas(ans, { angles: [] }, '');
        if (ia.dupPairs.length) fb.attention.push('Two of your expansions make the same point. Each operation should take you somewhere different.');
        fb.communicated = `You expanded “${item.s}” in ${ans.length} of ${ops.length} directions.`;
        if (devs.length) fb.explored.push('Genuine additions: ' + devs.join(', ') + '.');
        const all = analyse(ans.join(' '), base);
        setDim(fb, 'development', ans.length ? clamp(DIM.development(all) * (1 - restated / ops.length)) : 0);
        setDim(fb, 'specificity', DIM.specificity(all));
        setDim(fb, 'variety', ops.length ? clamp(4 * (ia.distinct / ops.length) * (opHits / ops.length) + 0.5) : 0);
        ops.filter(op => !T('op_' + op)).forEach(op => fb.unexplored.push(op));
        break;
      }
      case 'dots': {
        const ia = ideas('links', item, 2, 'connections'); const a = A('explain');
        const used = item.facts.filter(f => overlap(contentSet(f), a.cset) > 0.15).length;
        fb.communicated = `Your strongest connection: “${centralFrom(T('explain'))}”`;
        fb.explored.push(`Your explanation draws on ${used} of the ${item.facts.length} facts.`);
        if (used < item.facts.length) fb.attention.push('An explanation that leaves a fact out isn’t yet connecting the dots — say how the missing one fits, or why it doesn’t.');
        setDim(fb, 'connections', clamp((used / item.facts.length) * 3 + (a.causal.length ? 1 : 0)));
        setDim(fb, 'reasoning', DIM.reasoning(a));
        if (!a.causal.length) fb.attention.push('The links are implied rather than stated. Use “because”, “which means”, “so” to show the mechanism.');
        break;
      }
      case 'hidden': {
        const ab = A('ab'), ba = A('ba'), lim = A('limit');
        fb.communicated = `${item.a} → ${item.b}: “${centralFrom(T('ab'))}”`;
        const ia = analyseIdeas([T('ab'), T('ba'), T('limit')], item, '');
        if (ia.covered.length) fb.explored.push('You touched: ' + ia.covered.map(k => item.angles[k].l.toLowerCase()).join('; ') + '.');
        ia.uncovered.slice(0, 2).forEach(k => fb.unexplored.push(item.angles[k].l));
        if (overlap(ab.cset, ba.cset) >= 0.7) fb.attention.push('Your two directions say nearly the same thing. The reverse direction usually works through a different mechanism.');
        setDim(fb, 'connections', clamp((DIM.reasoning(ab) + DIM.reasoning(ba)) / 2 + (ia.covered.length >= 2 ? 0.5 : 0)));
        setDim(fb, 'reasoning', (DIM.reasoning(ab) + DIM.reasoning(ba)) / 2);
        setDim(fb, 'nuance', clamp(DIM.nuance(lim) + (lim.n >= 8 ? 0.5 : 0)));
        if (lim.n < 6) fb.attention.push('You didn’t really find a limit. Every real relationship has conditions where it fails.');
        break;
      }
      case 'chain': {
        const links = (r.chain || []).map(x => String(x || '').trim()).filter(Boolean);
        const all = [item.s].concat(links); let joined = 0, circles = 0;
        for (let i = 1; i < all.length; i++) {
          const a = analyse(all[i]);
          if (overlap(contentSet(all[i]), contentSet(all[i - 1])) > 0 || a.causal.length || /^(so|then|which|this|that|they|it|as a result)/i.test(all[i])) joined++;
          if (i > 1 && overlap(contentSet(all[i]), contentSet(all[0])) >= 0.7) circles++;
        }
        fb.communicated = links.length ? `Your chain runs from “${short(item.s, 60)}” to “${short(links[links.length - 1], 80)}”.` : 'You haven’t built a chain yet.';
        fb.explored.push(`${links.length} link${links.length === 1 ? '' : 's'}, ${joined} of which visibly connect to the previous step.`);
        if (links.length < item.links) fb.attention.push(`Aim for ${item.links} links — the interesting consequences are usually further along.`);
        if (circles) fb.attention.push('The chain loops back to where it started. That can be a real feedback loop — if so, name it as one.');
        if (joined < links.length) fb.attention.push('Some links jump rather than follow. Ask of each: does this happen because of the step before?');
        const endA = analyse(links.slice(-1)[0] || '', contentSet(item.s));
        setDim(fb, 'connections', links.length ? clamp(4 * joined / links.length) : 0);
        setDim(fb, 'development', links.length ? clamp(Math.min(links.length / item.links, 1) * 3 + (endA.novel >= 3 ? 1 : 0)) : 0);
        setDim(fb, 'reasoning', DIM.reasoning(A('break')));
        if (A('break').n < 6) fb.attention.push('Where the chain can be interrupted is where you could act on it — worth a sentence.');
        break;
      }
      case 'explainconn': {
        const u = A('unite'), o = A('odd'); const ia = analyseIdeas([T('unite'), T('odd')], item, '');
        const mentions = item.points.filter(p => overlap(contentSet(p), u.cset) > 0.2).length;
        fb.communicated = `What links them, in your words: “${centralFrom(T('unite'))}”`;
        if (ia.covered.length) fb.explored.push('Your explanation reaches: ' + ia.covered.map(k => item.angles[k].l.toLowerCase()).join('; ') + '.');
        ia.uncovered.slice(0, 1).forEach(k => fb.unexplored.push(item.angles[k].l));
        if (u.n < 8) fb.attention.push('The unifying idea is very short. Say how it works in each case, not just what it is.');
        if (findMarkers(u.text, ['all about', 'all related', 'everything', 'life']).length) fb.attention.push('Your unifying idea may be too broad — would it also include things that don’t belong here?');
        setDim(fb, 'connections', clamp(DIM.reasoning(u) * 0.6 + ia.covered.length + mentions * 0.3));
        setDim(fb, 'clarity', DIM.clarity(u)); setDim(fb, 'reasoning', DIM.reasoning(o));
        break;
      }
      case 'challenge': {
        const st = r.stance || {}, pos = analyse(st.text || ''), resp = A('respond'), ev = A('evidence'), fin = analyse(T('final'), contentSet(st.text || ''));
        fb.communicated = `You ${String(st.choice || 'took a position').toLowerCase()}${st.text ? `: “${centralFrom(st.text)}”` : '.'}`;
        const ia = analyseIdeas(r.assume || [], item, P);
        fb.explored.push(`You surfaced ${ia.distinct} assumption${ia.distinct === 1 ? '' : 's'} beneath your view.`);
        ia.uncovered.slice(0, 1).forEach(k => fb.unexplored.push('An assumption you might hold: ' + item.angles[k].l.toLowerCase()));
        if (!item.custom) {
          const eng = item.oppK.filter(k => kwHit(resp.text, [k])).length;
          if (eng >= 2) fb.good.push('Your response engages the opposing argument’s actual point rather than restating your own.');
          else fb.attention.push('Your response doesn’t clearly address the opposing argument’s central point. Quote its key idea back to yourself and answer that.');
          setDim(fb, 'relevance', clamp(1 + eng));
        } else { const op = A('oppose'); setDim(fb, 'relevance', clamp(DIM.reasoning(op) + (op.n > 20 ? 1 : 0))); if (op.n < 15) fb.attention.push('Your opposing argument is thin. A strong opponent would give a reason, not just disagree.'); }
        const specific = ev.example || ev.digits || findMarkers(ev.text, ['if', 'study', 'studies', 'data', 'evidence', 'showed', 'found', 'saw', 'research', 'measure']).length >= 2;
        if (!specific || ev.n < 8) fb.attention.push('The evidence that would change your mind isn’t specific enough to test. Name something you could actually observe.');
        else fb.good.push('You named evidence specific enough that you’d recognise it if you saw it.');
        setDim(fb, 'reasoning', (DIM.reasoning(pos) + DIM.reasoning(resp)) / 2);
        setDim(fb, 'nuance', DIM.nuance(fin));
        if (fin.novel < 2 && fin.qual.length === 0) fb.explored.push('Your final position is unchanged. That’s legitimate — if it’s because your reasons held up, say which ones.');
        else if (fin.qual.length) fb.explored.push('Your final position is qualified — it now says where it holds.');
        break;
      }
      case 'weaklink': {
        const pick = r.pick, ok = item.weak.includes(pick), w = A('why');
        const keyHits = item.k.filter(k => kwHit(w.text, [k])).length;
        fb.communicated = pick == null ? 'You didn’t select a sentence.' : `You identified: “${short(item.parts[pick], 120)}”.`;
        if (ok) fb.good.push('That’s where the argument overreaches.');
        else if (pick != null) fb.attention.push('That sentence is not where the argument fails — it may be questionable, but the conclusion doesn’t depend on it as heavily. Look at where the argument moves from what happened to what must be true.');
        if (keyHits >= 1 && w.n >= 8) fb.good.push('Your explanation names the specific problem with the inference.');
        else fb.attention.push('Your explanation doesn’t yet name what kind of gap this is (a missing alternative cause, an unrepresentative sample, a jump from some to all…).');
        setDim(fb, 'reasoning', clamp((ok ? 2 : 0.5) + Math.min(2, keyHits) * 0.75 + (w.causal.length ? 0.5 : 0)));
        setDim(fb, 'specificity', DIM.specificity(w));
        fb.reveal.push(item.why);
        break;
      }
      case 'evidence': {
        const map = r.sort || {}; let right = 0, total = item.items.length, wrong = [];
        item.items.forEach((x, i) => { const c = map[i]; if (c === x.c || (x.alt || []).includes(c)) right++; else wrong.push(i); });
        const d = A('defend');
        fb.communicated = `You sorted ${Object.keys(map).length} of ${total} statements; ${right} match a careful reading.`;
        wrong.slice(0, 3).forEach(i => { const x = item.items[i]; fb.attention.push(`“${short(x.t, 70)}” — you chose ${catName(map[i]) || 'nothing'}; it reads best as ${catName(x.c)}${x.why ? '. ' + x.why : '.'}`); });
        if (!wrong.length) fb.good.push('Every placement holds up.');
        setDim(fb, 'reasoning', clamp(4 * right / total * 0.7 + DIM.reasoning(d) * 0.3));
        setDim(fb, 'nuance', clamp(DIM.nuance(d) + (d.contrast.length ? 0.5 : 0)));
        if (d.n < 10) fb.attention.push('Your defence of the borderline case is brief. What makes it borderline — which feature points each way?');
        fb.extra.sortWrong = wrong;
        break;
      }
      case 'missing': {
        const ia = ideas('needs', item, 3, 'information gaps'); const n = A('now');
        const tent = findMarkers(n.text, M.tentative).length;
        fb.communicated = `What you’d say now: “${centralFrom(T('now'))}”`;
        if (tent || findMarkers(n.text, ['not enough', 'can\'t tell', 'cannot', 'don\'t know', 'unclear', 'too early']).length) fb.good.push('Your current conclusion stays inside the evidence.');
        else fb.attention.push('Your current conclusion sounds more confident than the information allows. What, exactly, do you know?');
        setDim(fb, 'relevance', ia.n ? clamp(2 + ia.covered.length * 0.75) : 0);
        setDim(fb, 'nuance', clamp(DIM.nuance(n) + (tent ? 0.5 : 0)));
        break;
      }
      case 'rankexp': {
        const order = r.rank || item.options.map((_, i) => i); const d = A('defend');
        const top = item.options[order[0]], second = item.options[order[1]];
        const comp = findMarkers(d.text, ['more', 'less', 'than', 'whereas', 'rather', 'likelier', 'more likely', 'less likely', 'because', 'fits', 'would explain', 'wouldn\'t explain', 'predicts']).length;
        const refTop = overlap(contentSet(top), d.cset) > 0.2, refSec = overlap(contentSet(second), d.cset) > 0.2;
        fb.communicated = `Your most plausible: “${top}”. ` + (d.n ? `Your defence: “${centralFrom(d.text)}”` : '');
        if (refTop && refSec) fb.good.push('You compared your top two directly — that’s what a ranking needs.');
        else fb.attention.push('Your defence doesn’t compare your first choice with your second. A ranking is a comparison: say why one beats the other.');
        if (findMarkers(d.text, ['would change', 'if i learned', 'if we knew', 'unless', 'depends']).length) fb.good.push('You said what would change the order.');
        else fb.unexplored.push('What would change your ranking');
        setDim(fb, 'reasoning', clamp(DIM.reasoning(d) * 0.5 + Math.min(2, comp * 0.5) + (refTop && refSec ? 0.5 : 0)));
        setDim(fb, 'nuance', DIM.nuance(d));
        break;
      }
      case 'perspectives': case 'meaning': {
        const fields = item.people || item.contexts; const vals = fields.map((_, i) => String((r[item.people ? 'views' : 'readings'] || {})[i] || '').trim());
        const ia = analyseIdeas(vals, { angles: [] }, '');
        const verdicts = vals.filter(v => findMarkers(v, M.verdict).length).length;
        fb.communicated = `You wrote ${vals.filter(Boolean).length} of ${fields.length} ${item.people ? 'perspectives' : 'readings'}.`;
        fb.explored.push(`${ia.distinct} genuinely distinct ${item.people ? 'viewpoints' : 'meanings'}.`);
        ia.dupPairs.slice(0, 1).forEach(([i, j]) => fb.attention.push(`${fields[i]} and ${fields[j]} come out sounding the same. What does each one know or want that the other doesn’t?`));
        if (verdicts) fb.attention.push('Some entries judge who is right. The task is to describe how each sees it, not to adjudicate.');
        if (item.people) { const voiced = vals.filter(v => findMarkers(v, ['feel', 'feels', 'see', 'sees', 'might', 'worried', 'wants', 'thinks', 'from', 'to them', 'they']).length).length; if (voiced >= vals.length - 1) fb.good.push('You wrote from inside each person’s position rather than about them.'); }
        vals.forEach((v, i) => { if (!v) fb.unexplored.push(fields[i]); });
        const l = A(item.people ? 'collide' : 'lesson');
        setDim(fb, 'variety', clamp(4 * ia.distinct / fields.length));
        setDim(fb, item.people ? 'nuance' : 'reasoning', clamp((item.people ? DIM.nuance(l) : DIM.reasoning(l)) - verdicts * 0.5));
        setDim(fb, 'relevance', clamp(4 * vals.filter(v => words(v).length >= 5).length / fields.length));
        break;
      }
      case 'reverse': case 'both': {
        const target = item.game === 'reverse' ? (item.lvl >= 3 ? 3 : 2) : 2;
        const ia = ideas('ideas', item, target, item.game === 'reverse' ? 'circumstances' : 'conditions');
        const l = A(item.game === 'reverse' ? 'lesson' : 'hold');
        fb.communicated = item.game === 'both' ? `Your reconciling sentence: “${centralFrom(l.text)}”` : `What the reversal taught you: “${centralFrom(l.text)}”`;
        if (item.game === 'both') {
          const both = overlap(contentSet(item.a), l.cset) > 0.2 && overlap(contentSet(item.b), l.cset) > 0.2;
          const cond = findMarkers(l.text, ['when', 'if', 'for', 'while', 'whereas', 'depends', 'in some', 'but', 'as long as', 'short term', 'long term']).length;
          if (!both) fb.attention.push('Your sentence doesn’t clearly keep both statements. It may be resolving the tension by quietly dropping one.');
          if (!cond) fb.attention.push('Name the condition that separates them: when, for whom, or in what sense.');
          else fb.good.push('You located the tension in a condition rather than splitting the difference.');
          setDim(fb, 'nuance', clamp((both ? 2 : 1) + Math.min(2, cond)));
          setDim(fb, 'clarity', DIM.clarity(l));
        } else setDim(fb, 'nuance', DIM.nuance(l));
        setDim(fb, 'reasoning', DIM.reasoning(l));
        break;
      }
      case 'chaos': {
        const asg = r.group || { assign: {}, names: [] }; const st = item.statements; let agree = 0, pairs = 0;
        for (let i = 0; i < st.length; i++) for (let j = i + 1; j < st.length; j++) {
          if (i === item.central || j === item.central) continue;
          pairs++; const same = asg.assign[i] != null && asg.assign[i] === asg.assign[j]; if (same === (st[i].g === st[j].g)) agree++;
        }
        const placed = Object.keys(asg.assign || {}).length; const named = (asg.names || []).filter(Boolean).length;
        const centralOk = r.central === item.central; const rel = A('relate');
        fb.communicated = centralOk ? 'You identified the central point correctly.' : r.central != null ? `You chose “${short(st[r.central].t, 80)}” as the centre.` : 'You didn’t choose a central point.';
        fb.explored.push(`Your grouping agrees with the reference structure on ${Math.round(100 * agree / Math.max(1, pairs))}% of statement pairs.`);
        if (!centralOk) fb.attention.push('The statement that best captures the centre is the one the others explain or support. Check which one could stand as the conclusion.');
        if (named < (asg.names || []).length || !named) fb.attention.push('Name every group. A name forces you to say what the members have in common.');
        if (placed < st.length) fb.attention.push(`${st.length - placed} statement${st.length - placed > 1 ? 's were' : ' was'} left unplaced.`);
        fb.reveal.push('One reference structure: ' + item.groupHints.join(' / ') + '.');
        setDim(fb, 'organisation', clamp(4 * agree / Math.max(1, pairs) * 0.6 + (centralOk ? 1 : 0) + (named ? 0.6 : 0)));
        setDim(fb, 'connections', clamp(DIM.reasoning(rel) * 0.7 + DIM.organisation(rel) * 0.3));
        setDim(fb, 'clarity', DIM.clarity(rel));
        break;
      }
      case 'mainpoint': {
        const ok = r.pick === item.main; const rs = A('restate'); const copy = overlap(rs.cset, contentSet(item.parts[item.main]));
        fb.communicated = `Your restatement: “${centralFrom(rs.text)}”`;
        if (ok) fb.good.push('You picked the sentence that carries the argument rather than the evidence.');
        else if (r.pick != null) fb.attention.push('That sentence supports the argument, but isn’t the argument. Ask what the evidence is evidence for.');
        const keyHits = item.k.filter(k => kwHit(rs.text, [k])).length;
        if (copy >= 0.85 && rs.n > 4) fb.attention.push('Your restatement copies the original closely. Saying it differently is the test of whether you’ve grasped it.');
        if (keyHits < 2) fb.attention.push('Your restatement may have drifted from the passage’s subject.');
        setDim(fb, 'organisation', ok ? 4 : 1.5);
        setDim(fb, 'clarity', DIM.clarity(rs));
        setDim(fb, 'expression', clamp(DIM.expression(rs) - (copy >= 0.85 ? 1.5 : 0) - (keyHits < 2 ? 1 : 0)));
        break;
      }
      case 'argue': {
        const c = A('claim'), ex = A('example'), ob = A('objection'), rs = A('response');
        const ia = ideas('reasons', { angles: [] }, 2, 'reasons');
        fb.communicated = `Your claim: “${centralFrom(c.text)}”`;
        const engaged = overlap(rs.cset, ob.cset) > 0.15;
        if (!engaged) fb.attention.push('Your response doesn’t seem to address the objection you raised. Pick up its key term and answer it.');
        else fb.good.push('Your response speaks to the objection you raised.');
        if (findMarkers(rs.text, ['true', 'fair', 'admittedly', 'granted', 'although', 'but', 'however', 'even if', 'concede']).length) fb.good.push('You conceded part of the objection — usually a stronger move than denying it.');
        if (!ex.example && ex.n < 10) fb.attention.push('Your example is abstract. A concrete case — a place, a person, a number — does work an abstraction can’t.');
        setDim(fb, 'organisation', clamp([c, ex, ob, rs].filter(a => a.n >= 5).length + (ia.distinct >= 2 ? 0.5 : 0) - 0.5));
        setDim(fb, 'reasoning', clamp((DIM.reasoning(rs) + (engaged ? 4 : 1)) / 2));
        setDim(fb, 'specificity', DIM.specificity(ex));
        break;
      }
      case 'diff': {
        const d = A('distinction'), ea = A('exA'), eb = A('exB');
        const hasA = kwHit(d.text, [item.a.toLowerCase().split(' ').pop().slice(0, 6)]) || kwHit(d.text, item.ka), hasB = kwHit(d.text, [item.b.toLowerCase().split(' ').pop().slice(0, 6)]) || kwHit(d.text, item.kb);
        const kh = item.ka.filter(k => kwHit(d.text, [k])).length + item.kb.filter(k => kwHit(d.text, [k])).length;
        fb.communicated = `Your distinction: “${centralFrom(d.text)}”`;
        if (!d.contrast.length) fb.attention.push('The contrast isn’t explicit. Try “A is about…, whereas B is about…”.');
        if (!(hasA && hasB)) fb.attention.push('Your distinction describes one concept more than the other. A distinction needs both sides.');
        if (ea.n < 5 || eb.n < 5) fb.attention.push('One of your examples is too brief to show the concepts coming apart.');
        if (overlap(ea.cset, eb.cset) >= 0.7) fb.attention.push('Your two examples are nearly the same situation — make them show different things.');
        if (kh >= 2) fb.good.push('Your distinction touches the features that usually separate these concepts.');
        setDim(fb, 'nuance', clamp((d.contrast.length ? 1.5 : 0.5) + Math.min(2, kh * 0.5) + (hasA && hasB ? 0.5 : 0)));
        setDim(fb, 'clarity', DIM.clarity(d));
        setDim(fb, 'specificity', (DIM.specificity(ea) + DIM.specificity(eb)) / 2);
        break;
      }
      case 'exact': {
        const before = analyse(item.s), rw = A('rewrite'), dc = A('decide');
        const vagueOrig = before.vague.length, vagueLeft = rw.vague.filter(v => before.vague.includes(v)).length;
        const keepOk = !item.keep.length || item.keep.some(k => kwHit(rw.text, [k]));
        fb.communicated = `Your precise version: “${short(rw.text, 180)}”`;
        fb.explored.push(`Removed ${Math.max(0, vagueOrig - vagueLeft)} of ${vagueOrig} vague term${vagueOrig === 1 ? '' : 's'}; added ${rw.novel} new specific word${rw.novel === 1 ? '' : 's'}.`);
        if (vagueLeft) fb.attention.push(`“${rw.vague.find(v => before.vague.includes(v))}” is still doing vague work.`);
        if (!rw.digits && !rw.example && rw.novel < 5) fb.attention.push('It’s still general. Who, what exactly, how much, when?');
        if (!keepOk) fb.attention.push('Your version may have changed the subject of the original. Precision should sharpen the meaning, not replace it.');
        if (rw.n > 60) fb.attention.push('Precision isn’t length — a precise sentence can be short.');
        setDim(fb, 'specificity', clamp(DIM.specificity(rw) + (rw.digits ? 0.5 : 0) - vagueLeft * 0.5));
        setDim(fb, 'expression', clamp(DIM.expression(rw) - (keepOk ? 0 : 1)));
        setDim(fb, 'clarity', DIM.clarity(rw));
        if (dc.n >= 6) fb.good.push('You reflected on what you had to decide — that’s the actual skill: finding out what you meant.');
        break;
      }
      case 'simple': {
        const a = A('explain'); const jarg = item.jargon.filter(j => kwHit(a.text, [j]));
        const anchors = findMarkers(a.text, M.analogy).length + (a.example ? 1 : 0); const keep = item.keep.filter(k => kwHit(a.text, [k])).length;
        const avg = a.n / Math.max(1, a.sents);
        fb.communicated = `Your explanation opens: “${centralFrom(a.text)}”`;
        if (jarg.length) fb.attention.push(`You used “${jarg[0]}”${jarg.length > 1 ? ' and other jargon' : ''} — would your listener know it? Explain it or replace it.`);
        if (avg > 22) fb.attention.push(`Your sentences average ${Math.round(avg)} words. For a newcomer, shorter sentences carry one idea each.`);
        if (anchors) fb.good.push('You used a concrete anchor — an example or comparison — which is what makes an explanation land.');
        else fb.attention.push('There’s no concrete anchor. A comparison or small example would carry the idea further than a definition.');
        if (keep < 2) fb.attention.push('Check accuracy: the explanation may have simplified away the core of the concept.');
        if (a.n > 180) fb.attention.push('Simple usually means short. What can you cut without losing accuracy?');
        setDim(fb, 'clarity', clamp(DIM.clarity(a) - (avg > 22 ? 1 : 0)));
        setDim(fb, 'expression', clamp(DIM.expression(a) - jarg.length * 0.75));
        setDim(fb, 'specificity', clamp(1 + Math.min(2, anchors) + (keep >= 2 ? 1 : 0)));
        break;
      }
      case 'nuance': {
        const before = analyse(item.s), rw = A('rewrite');
        const absLeft = rw.abs.length, qual = rw.qual.length;
        const keepOk = item.keep.some(k => kwHit(rw.text, [k]));
        const conds = findMarkers(rw.text, ['when', 'if', 'unless', 'for', 'depending', 'as long as', 'especially', 'in cases', 'only when']).length;
        const pureHedge = findMarkers(rw.text, ['maybe', 'perhaps', 'might', 'possibly', 'could']).length && !conds;
        fb.communicated = `Your accurate version: “${short(rw.text, 180)}”`;
        if (absLeft) fb.attention.push(`“${rw.abs[0]}” is still absolute.`);
        if (pureHedge) fb.attention.push('You softened the claim with hedges but didn’t say when it holds. “Maybe” is less informative than a condition.');
        if (conds) fb.good.push('You added a condition that says where the claim holds — that’s nuance, not just caution.');
        if (!keepOk) fb.attention.push('Your version drifted from the original subject. Keep what was right about it.');
        setDim(fb, 'nuance', clamp((qual ? 1.5 : 0.5) + Math.min(2, conds) - absLeft * 0.75 + (pureHedge ? 0 : 0.5)));
        setDim(fb, 'expression', clamp(DIM.expression(rw) - (keepOk ? 0 : 1)));
        setDim(fb, 'reasoning', DIM.reasoning(analyse(T('why'))));
        break;
      }
      case 'words': {
        const ch = r.choice || {}; const ok = item.best.includes(ch.choice), partial = (item.ok || []).includes(ch.choice); const w = analyse(ch.text || '');
        const kh = item.k.filter(k => kwHit(w.text, [k])).length; const comparesOthers = findMarkers(w.text, ['others', 'other', 'whereas', 'but', 'than', 'sounds', 'implies', 'suggests', 'would']).length;
        fb.communicated = ch.choice != null ? `You chose “${item.options[ch.choice]}”.` : 'You didn’t choose an option.';
        if (ok) fb.good.push('That expression fits the intended meaning best.'); else if (partial) fb.explored.push('That’s a defensible choice, though another option is more exact.'); else if (ch.choice != null) fb.attention.push('Another option communicates the intention more accurately. Read each as the listener would hear it.');
        if (!comparesOthers) fb.attention.push('Your explanation doesn’t say what the other options would get wrong — that contrast is where word choice is learned.');
        setDim(fb, 'nuance', clamp((ok ? 2.5 : partial ? 1.8 : 0.5) + Math.min(1.5, kh * 0.5)));
        setDim(fb, 'expression', clamp(DIM.reasoning(w) * 0.5 + (comparesOthers ? 2 : 0.5)));
        fb.reveal.push(item.why);
        break;
      }
      case 'keepgoing': case 'norepeat': case 'beyondq': case 'followup': case 'between': {
        const partner = item.game === 'keepgoing' ? item.lines.join(' ') : item.game === 'beyondq' ? item.q : item.game === 'followup' ? item.script.join(' ') : item.game === 'between' ? item.s : item.script.filter(x => x.who === 'them').map(x => x.t).join(' ');
        const prior = item.game === 'norepeat' ? item.script.filter(x => x.who === 'you').map(x => x.t) : [];
        const topic = item.topic || item.details || [];
        let cs = [];
        if (item.game === 'between') { const ia = ideas('ideas', item, item.lvl >= 3 ? 3 : 2, 'readings'); }
        const replyIds = item.game === 'keepgoing' ? ['r1', 'r2'] : ['reply'];
        replyIds.forEach((id, k) => { cs.push(analyseConvo(T(id), k === 1 ? item.next : partner, topic, prior.concat(k === 1 ? [T('r1')] : []), item.loop)); });
        const c = cs[0];
        fb.communicated = T(replyIds[0]) ? `You replied: “${short(T(replyIds[0]), 160)}”` : 'You didn’t reply yet.';
        const strat = [...new Set(cs.flatMap(x => x.strategies))];
        if (strat.length) fb.explored.push('Moves you used: ' + strat.join(', ') + '.');
        cs.forEach((x, k) => x.flags.forEach(f => fb.attention.push((cs.length > 1 ? (k ? 'Second reply: ' : 'First reply: ') : '') + f)));
        if (item.game === 'keepgoing' && cs[1] && cs[0].strategies.join() === cs[1].strategies.join() && cs[1].n) fb.attention.push('Both replies took the same approach. That’s fine in itself; if you want to build range, try a different way in next time.');
        if (cs.some(x => x.questionOnly)) fb.explored.push('You replied with a question' + (cs.every(x => x.questionOnly) ? ' both times' : '') + '. That’s a natural way to show interest. The directions below are options, not things you missed.');
        fb.explored.push('These checks see structure (questions, acknowledgement, words shared with what they said), not tone, warmth, meaning or whether the reply suited the moment. You can judge that better than these rules can.');
        if (item.game === 'beyondq' && c.n < 4) fb.attention.push('You answered but left nothing to pick up.');
        if (item.game === 'followup') { const dh = item.details.filter(d => kwHit(T('reply'), [d])).length; if (dh) fb.good.push('You picked up a specific detail, which shows you listened.'); else fb.attention.push('Your reply responds to the general topic rather than a specific detail they mentioned.'); setDim(fb, 'specificity', clamp(1 + dh * 1.5)); }
        if (item.game === 'between') { const tent = findMarkers(T('reply'), M.tentative).length; if (tent || /\?/.test(T('reply'))) fb.good.push('Your response leaves room for them to tell you what they meant.'); else fb.attention.push('Your response commits to one reading. Can you respond in a way that lets them correct you?'); setDim(fb, 'nuance', clamp(1.5 + tent + (/\?/.test(T('reply')) ? 1 : 0))); }
        if (item.game === 'norepeat' && !c.repeated && c.novel >= 3) fb.good.push('This moves the topic somewhere new without abandoning it.');
        setDim(fb, 'contribution', cs.reduce((s, x) => s + x.contribution, 0) / cs.length);
        setDim(fb, 'relevance', cs.every(x => x.uptake) ? 4 : cs.some(x => x.uptake) ? 2.5 : 1);
        setDim(fb, 'expression', clamp(4 - cs.reduce((s, x) => s + x.flags.length, 0) * 0.5));
        if (item.game === 'norepeat') setDim(fb, 'development', c.repeated ? 1 : clamp(1 + c.novel / 2));
        if (!strat.includes('adding a thought') && !strat.includes('introducing an angle')) fb.unexplored.push('Adding an observation of your own');
        if (!strat.includes('making a connection')) fb.unexplored.push('Connecting it to something related');
        break;
      }
      case 'branch': {
        const path = (r.path && r.path.tags) || []; const end = r.path && r.path.end;
        const contrib = path.filter(t => ['add', 'connect', 'angle'].includes(t)).length, qs = path.filter(t => t === 'q').length, closed = path.filter(t => t === 'closed').length;
        const variety = new Set(path).size;
        const last = r.path && r.path.lastLine;
        const c = analyseConvo(T('final'), last || '', [], [], null);
        fb.communicated = `The conversation ended ${end === 'good' ? 'with them leaning in' : end === 'ok' ? 'politely but without much momentum' : 'with them stepping away'}.`;
        fb.explored.push(`Your moves: ${path.map(t => TAGS[t] || t).join(' → ')}.`);
        if (closed) fb.attention.push('Closed replies (short answers with nothing attached) are where the conversation lost energy.');
        if (qs > contrib) fb.attention.push('You leaned on questions more than contributions. Questions alone can make it feel like an interview.');
        if (contrib >= 2) fb.good.push('You offered your own thoughts, which gave the other person something to respond to.');
        c.flags.forEach(f => fb.attention.push('Your own reply: ' + f));
        if (c.strategies.length) fb.explored.push('In your own reply you used: ' + c.strategies.join(', ') + '.');
        setDim(fb, 'contribution', clamp((contrib / Math.max(1, path.length)) * 2.5 + c.contribution * 0.4));
        setDim(fb, 'variety', clamp(variety * 1.2));
        setDim(fb, 'relevance', end === 'good' ? 4 : end === 'ok' ? 2.5 : 1.5);
        fb.extra.end = end;
        break;
      }
      case 'integrated': {
        const f = analyseIdeas(r.facts || [], { angles: [] }, ''), as = analyseIdeas(r.assume || [], { angles: [] }, ''), ex = analyseIdeas(r.explain || [], { angles: [] }, ''), mi = analyseIdeas(r.missing || [], { angles: [] }, '');
        const pos = A('position'), per = A('persp');
        const interpInFacts = f.raw.filter(t => findMarkers(t, ['because', 'clearly', 'obviously', 'must', 'probably', 'caused', 'due to', 'should']).length).length;
        fb.communicated = `Your position: “${centralFrom(pos.text)}”`;
        fb.explored.push(`${f.distinct} facts, ${as.distinct} assumptions, ${ex.distinct} explanations, ${mi.distinct} information gaps.`);
        if (interpInFacts) fb.attention.push(`${interpInFacts} of your “facts” contain interpretation (causal or certainty words). Keep the facts stage to what’s established.`);
        if (ex.distinct < 3) fb.attention.push('Generate at least three distinct explanations before choosing.');
        const usesEarlier = [ex, mi].some(ia => ia.raw.some(t => overlap(contentSet(t), pos.cset) > 0.25));
        if (usesEarlier) fb.good.push('Your final position builds on the explanations and gaps you identified.'); else fb.attention.push('Your final position doesn’t visibly draw on your earlier stages. The point of the sequence is that each stage feeds the last.');
        const conf = findMarkers(pos.text, ['confident', 'confidence', 'likely', 'unlikely', 'probably', 'not sure', 'uncertain', 'would change', 'if', 'until']).length;
        if (!conf) fb.attention.push('Say how confident you are and what would change your view.');
        setDim(fb, 'variety', varietyScore(ex, 3));
        setDim(fb, 'reasoning', clamp(DIM.reasoning(pos) * 0.6 + (usesEarlier ? 1.5 : 0.3) - interpInFacts * 0.3));
        setDim(fb, 'nuance', clamp(DIM.nuance(pos) * 0.6 + Math.min(1.5, conf * 0.5) + (per.n >= 15 ? 0.5 : 0)));
        setDim(fb, 'organisation', DIM.organisation(pos));
        break;
      }
      case 'deep': {
        const first = A('first'), fin = analyse(T('revised') + ' ' + T('distil'), contentSet(T('first') + ' ' + P)); const terms = A('terms'), conn = A('connect'), imp = A('implic'), ctr = A('counter');
        const ia = ideas('reasons', { angles: [] }, 3, 'considerations');
        fb.communicated = `You began with “${centralFrom(first.text)}” and ended with “${centralFrom(T('distil') || T('revised'))}”.`;
        if (fin.novel >= 6) fb.good.push('Your final view contains ideas your first answer didn’t — the session moved your thinking.');
        else fb.attention.push('Your final view is close to your first answer. That can be fine, but check whether the stages changed anything you’d now say.');
        if (terms.n < 12) fb.attention.push('The definitions stage is brief. Most deep disagreements turn on what a key word means.');
        if (conn.n < 12) fb.unexplored.push('A developed connection to an unrelated field');
        if (ctr.n < 12) fb.unexplored.push('The strongest case against your first answer');
        setDim(fb, 'development', DIM.development(fin));
        setDim(fb, 'nuance', DIM.nuance(fin));
        setDim(fb, 'connections', clamp(DIM.reasoning(conn) + (conn.n >= 20 ? 0.5 : 0)));
        setDim(fb, 'organisation', DIM.organisation(analyse(T('revised'))));
        setDim(fb, 'reasoning', (DIM.reasoning(imp) + DIM.reasoning(ctr)) / 2);
        break;
      }
    }
    // global relevance check: does the response share any vocabulary with the prompt or the expected angles?
    const allText = collectText(responses);
    if (Pset.size >= 3 && words(allText).length > 12 && !(GAME[item.game] && GAME[item.game].cat === 'convo')) { // conversational replies refer back with pronouns, not repeated words
      const angleK = (item.angles || []).flatMap(a => a.k).concat(item.topic && Array.isArray(item.topic) ? item.topic : []).concat(item.k || []).concat(item.oppK || []);
      let shared = 0; contentSet(allText).forEach(x => { if (Pset.has(x)) shared++; });
      if (!shared && !kwHit(allText, angleK)) { fb.attention.unshift('Your response doesn’t share any key terms with the challenge. Check it addresses this situation rather than a general version of it.'); fb.dims.relevance = Math.min(fb.dims.relevance == null ? 1.5 : fb.dims.relevance, 1.5); }
    }
    const vals = Object.values(fb.dims);
    fb.overall = vals.length ? round1(vals.reduce((s, x) => s + x, 0) / vals.length) : 0;
    fb.question = pickQuestion(item, fb);
    if (!fb.good.length && fb.overall >= 3) fb.good.push('Your response is clear and does what the stage asked.');
    return fb;
  }
  function collectText(r) { const out = []; const walk = v => { if (v == null) return; if (typeof v === 'string') out.push(v); else if (Array.isArray(v)) v.forEach(walk); else if (typeof v === 'object') Object.entries(v).forEach(([k, x]) => { if (k !== 'tags' && k !== 'log' && k !== 'lastLine' && k !== 'end') walk(x); }); }; walk(r); return out.join(' '); }
  const TAGS = { add: 'added a thought', connect: 'made a connection', angle: 'opened an angle', q: 'asked a question', ack: 'acknowledged', closed: 'closed reply', over: 'went long about yourself', self: 'redirected to yourself' };
  function catName(id) { const c = EVCATS.find(x => x.id === id); return c ? c.name.toLowerCase() : null; }
  function pickQuestion(item, fb) {
    if (item.deepen && item.deepen.length) return item.deepen[(fb.attention.length + (item.lvl || 1)) % item.deepen.length];
    if (fb.unexplored.length && item.angles) return `What would you say if the explanation were about ${fb.unexplored[0].toLowerCase()}?`;
    const Q = {
      possibility: 'Which of your explanations would be hardest to tell apart from each other — and what does that tell you?',
      whatelse: 'If the obvious explanation turned out to be wrong, which of your alternatives would you bet on, and why?',
      expand: 'Which of your expansions surprised you most — and can you develop that one further?',
      dots: 'Is there a connection between the facts that would make one of them less surprising?',
      chain: 'At which link is the chain most uncertain, and what would make it more likely?',
      explainconn: 'Can you name one more case that fits your unifying idea — and one that seems to but doesn’t?',
      challenge: 'Which of your assumptions would you be least comfortable defending in public?',
      weaklink: 'What is the strongest version of this argument — the one that avoids the gap you found?',
      evidence: 'Which statement would change category if one word were removed?',
      missing: 'Of the gaps you listed, which single answer would most change your conclusion?',
      rankexp: 'What observation would most quickly move your second choice into first place?',
      perspectives: 'Which perspective did you find hardest to write charitably — and why?',
      meaning: 'Is there a context where the event would mean nothing at all?',
      reverse: 'Does the reversal tell you something about the people who hold the original view?',
      both: 'Is there a third statement that both of these are partial versions of?',
      chaos: 'If you had to cut one group entirely, which would weaken the explanation least?',
      mainpoint: 'What would someone who disagreed with the passage attack first?',
      argue: 'Which of your reasons would survive if your example turned out to be wrong?',
      diff: 'Is there a situation where the two concepts become impossible to tell apart?',
      exact: 'Was there something you meant that you only discovered while making it precise?',
      simple: 'Where does your comparison break down — and does that matter for the listener?',
      nuance: 'What evidence would tell you how often the original claim is true?',
      words: 'In what situation would one of the options you rejected be the right choice?',
      keepgoing: 'What did they say that you could only have responded to if you were listening?',
      norepeat: 'What’s one thing about this topic that you find genuinely interesting, not just true?',
      beyondq: 'What detail could you have offered that is about something outside yourself?',
      between: 'What would you need to hear from them to know which reading was right?',
      followup: 'What did they say that seemed to matter most to them?',
      branch: 'At which turn did the conversation’s direction change most, and why?',
      integrated: 'Which single fact, if it turned out false, would most change your position?',
      deep: 'What question are you left with that you didn’t have when you started?'
    };
    return Q[item.game] || 'What would you add if you had to explain this to someone who disagreed?';
  }

  // ───────────────────────── attempts, status, skills
  const HINT_FACTOR = [1, 0.9, 0.8, 0.65];
  function status(hints, revealed, overall, skipped) {
    if (skipped) return 'skipped';
    if (overall < 1.2) return 'attempted';
    if (revealed || hints >= 3) return 'supported';
    if (hints > 0) return 'assisted';
    return 'independent';
  }
  const STATUS_LABEL = { independent: 'Completed independently', assisted: 'Completed with hints', supported: 'Completed with substantial help', attempted: 'Attempted', skipped: 'Skipped', completed: 'Completed' };
  function selfBand(overall) { return overall < 1.5 ? 1 : overall < 2.5 ? 2 : overall < 3.3 ? 3 : 4; }
  function metaScore(selfRating, overall) { if (!selfRating) return null; return clamp(4 - Math.abs(selfRating - selfBand(overall)) * 1.5); }

  function adjustedScore(attempt) {
    const f = attempt.revealed ? 0.5 : HINT_FACTOR[Math.min(3, attempt.hints || 0)];
    return round1(clamp(attempt.overall * f));
  }

  function emptyProfile() {
    const skills = {}; SKILLS.forEach(s => { skills[s.id] = { level: 1, ema: null, n: 0, history: [], last: null, streakUp: 0, streakDown: 0 }; });
    return { skills, version: 1 };
  }
  function updateProfile(profile, attempt, now) {
    const g = GAME[attempt.game]; if (!g) return profile;
    now = now || Date.now();
    const base = adjustedScore(attempt);
    const apply = (sid, w, score) => {
      const s = profile.skills[sid]; if (!s) return;
      s.n += w; s.last = now;
      s.ema = s.ema == null ? score : round1(s.ema * (1 - 0.3 * w) + score * 0.3 * w);
      s.history.push({ t: now, s: score, l: s.level, w });
      if (s.history.length > 200) s.history.shift();
      if (w >= 1) {
        if (score >= 2.9 && attempt.level >= s.level) { s.streakUp++; s.streakDown = 0; }
        else if (score < 1.5) { s.streakDown++; s.streakUp = 0; }
        else { s.streakUp = Math.max(0, s.streakUp - 1); s.streakDown = 0; }
        if (s.streakUp >= 3 && s.level < 5) { s.level++; s.streakUp = 0; attempt.levelChange = { skill: sid, to: s.level }; }
        if (s.streakDown >= 2 && s.level > 1) { s.level--; s.streakDown = 0; attempt.levelChange = { skill: sid, to: s.level }; }
      }
    };
    apply(g.skill, 1, base);
    (g.secondary || []).forEach(sid => { if (sid !== 'meta') apply(sid, 0.5, base); });
    const ms = metaScore(attempt.selfRating, attempt.overall);
    const revGain = attempt.revisions && attempt.revisions.length ? attempt.overall - attempt.revisions[0].overall : null;
    if (ms != null) apply('meta', g.skill === 'meta' ? 0.5 : 0.5, revGain != null && revGain > 0.4 ? clamp(ms + 0.5) : ms);
    return profile;
  }

  // ───────────────────────── templates (parameterised variation)
  const TPL = {
    possibility: {
      who: ['A neighbour', 'A teammate', 'Your younger cousin', 'A regular at your local café', 'A friend from your running club', 'A student in your evening class'],
      pairs: [
        ['usually replies to messages within minutes', 'has started taking days to reply'], ['is the first to volunteer for things', 'has stopped volunteering entirely'],
        ['talks enthusiastically about their job', 'now changes the subject whenever work comes up'], ['comes to every weekly gathering', 'has missed the last three'],
        ['always shares food photos online', 'hasn’t posted anything in a month'], ['tends to argue every point', 'has started agreeing with everyone'],
        ['keeps a tidy desk', 'has let it pile up with papers'], ['walks everywhere', 'has started driving even short distances']],
      angles: [{ l: 'Health or energy', k: ['tired', 'sick', 'ill', 'health', 'energy', 'injur', 'pain', 'sleep'] }, { l: 'Life circumstances changed', k: ['move', 'family', 'child', 'money', 'job', 'schedule', 'time', 'busy'] },
        { l: 'Something between people', k: ['conflict', 'upset', 'fall out', 'relationship', 'friend', 'someone', 'avoid'] }, { l: 'A shift in motivation or mood', k: ['motiv', 'bore', 'sad', 'interest', 'care', 'mood', 'low'] },
        { l: 'A deliberate choice', k: ['decid', 'chose', 'deliberat', 'boundar', 'goal', 'cut back', 'intention'] }, { l: 'The observer is misreading it', k: ['assum', 'didn’t notice', "didn't notice", 'misread', 'just me', 'perception', 'normal'] }]
    },
    expand: {
      s: ['Habits are hard to break.', 'Cities change the people who live in them.', 'Advice is easier to give than to take.', 'First impressions are hard to change.', 'Tools shape what we notice.', 'Waiting is harder when you don’t know how long it will take.', 'People remember stories better than facts.', 'Prices tell you something about value.', 'Teaching something helps you learn it.', 'Noise makes it harder to think.', 'Most disagreements are about definitions.', 'Comfort makes people less curious.']
    }
  };
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let s = typeof seed === 'number' ? seed : hash(String(seed)); return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const pick = (arr, R) => arr[Math.floor(R() * arr.length)];
  function shuffle(arr, R) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  function fromTemplate(game, level, R, avoid) {
    if (game === 'possibility') {
      const T = TPL.possibility;
      for (let tries = 0; tries < 30; tries++) {
        const wi = Math.floor(R() * T.who.length), pi = Math.floor(R() * T.pairs.length);
        const id = `tpl-possibility-${wi}-${pi}`; if (avoid && avoid.has(id)) continue;
        return { id, game, tpl: true, lvl: Math.min(level, 2), s: `${T.who[wi]} who ${T.pairs[pi][0]} ${T.pairs[pi][1]}.`, angles: T.angles };
      }
    }
    if (game === 'expand') {
      const S = TPL.expand.s; const OPS = B1.OPS_ALL;
      for (let tries = 0; tries < 30; tries++) {
        const si = Math.floor(R() * S.length); const n = Math.min(8, 2 + level);
        let ops = shuffle(OPS, R).slice(0, n); if (level >= 3 && !ops.includes('counterexample')) ops[0] = 'counterexample'; if (level >= 4 && !ops.includes('qualification')) ops[1] = 'qualification';
        ops = OPS.filter(o => ops.includes(o));
        const id = `tpl-expand-${si}-${ops.map(o => OPS.indexOf(o)).join('')}`; if (avoid && avoid.has(id)) continue;
        return { id, game, tpl: true, lvl: level, s: S[si], ops };
      }
    }
    return null;
  }
  function resolveItem(id) {
    if (ITEM[id]) return ITEM[id];
    const m = /^tpl-possibility-(\d+)-(\d+)$/.exec(id);
    if (m) { const T = TPL.possibility; return { id, game: 'possibility', tpl: true, lvl: 1, s: `${T.who[+m[1]]} who ${T.pairs[+m[2]][0]} ${T.pairs[+m[2]][1]}.`, angles: T.angles }; }
    const e = /^tpl-expand-(\d+)-(\d+)$/.exec(id);
    if (e) { const ops = e[2].split('').map(d => B1.OPS_ALL[+d]).filter(Boolean); return { id, game: 'expand', tpl: true, lvl: Math.max(1, ops.length - 2), s: TPL.expand.s[+e[1]], ops }; }
    return null;
  }

  // ───────────────────────── selection
  function itemsFor(game) { return BANK.filter(i => i.game === game); }
  function recentSet(history, days, now) {
    const cut = (now || Date.now()) - days * 864e5; const s = new Set();
    (history || []).forEach(h => { if (h.t >= cut) s.add(h.itemId); });
    return s;
  }
  function chooseItem(game, level, history, R, now) {
    R = R || Math.random; const pool = itemsFor(game); const recent = recentSet(history, 10, now);
    const seenEver = new Set((history || []).map(h => h.itemId));
    const fits = pool.filter(i => Math.abs(i.lvl - level) <= 1 && !recent.has(i.id));
    const useTpl = TPL[game] && (fits.length === 0 || R() < 0.3);
    if (useTpl) { const t = fromTemplate(game, level, R, recent); if (t) return t; }
    if (fits.length) {
      const scored = fits.map(i => ({ i, w: (i.lvl === level ? 3 : i.lvl === level - 1 ? 1.5 : 1.2) * (seenEver.has(i.id) ? 0.5 : 1) * (0.6 + R()) }));
      scored.sort((a, b) => b.w - a.w); return scored[0].i;
    }
    // pool exhausted at this level: least-recently-seen item nearest the level
    const lastSeen = id => Math.max(0, ...(history || []).filter(h => h.itemId === id).map(h => h.t));
    const any = pool.slice().sort((a, b) => (Math.abs(a.lvl - level) - Math.abs(b.lvl - level)) || (lastSeen(a.id) - lastSeen(b.id)));
    return any[0] || null;
  }

  const SLOTS = [
    { name: 'Idea development', games: ['beyond', 'possibility', 'whatelse', 'expand'] },
    { name: 'Reasoning', games: ['challenge', 'weaklink', 'evidence', 'missing', 'rankexp', 'argue', 'mainpoint'] },
    { name: 'Connection or perspective', games: ['dots', 'hidden', 'chain', 'explainconn', 'perspectives', 'meaning', 'reverse', 'both', 'chaos'] },
    { name: 'Articulation', games: ['diff', 'exact', 'simple', 'nuance', 'words'] },
    { name: 'Conversation', games: ['keepgoing', 'norepeat', 'beyondq', 'between', 'followup', 'branch'] }
  ];
  const QUICK = ['diff', 'words', 'keepgoing', 'beyondq', 'exact', 'nuance', 'followup', 'weaklink', 'evidence'];

  function skillLevel(profile, sid) { return (profile && profile.skills[sid] && profile.skills[sid].level) || 1; }
  function weakest(profile, k, minN) {
    const arr = SKILLS.map(s => ({ id: s.id, ema: profile.skills[s.id].ema, n: profile.skills[s.id].n })).filter(s => s.n >= (minN || 0) && s.ema != null);
    arr.sort((a, b) => a.ema - b.ema); return arr.slice(0, k).map(s => s.id);
  }
  function stalest(profile, now) {
    now = now || Date.now();
    const arr = SKILLS.map(s => ({ id: s.id, age: profile.skills[s.id].last ? now - profile.skills[s.id].last : Infinity }));
    arr.sort((a, b) => b.age - a.age); return arr[0];
  }
  function gamesForSkill(sid) { return GAMES.filter(g => !g.deep && !g.integrated && (g.skill === sid || (g.secondary || []).includes(sid))).sort((a, b) => (b.skill === sid) - (a.skill === sid)); }

  function buildDaily(dateKey, profile, history, now) {
    const R = rng('daily-' + dateKey); now = now || Date.now();
    const lastGames = new Set((history || []).slice(-6).map(h => h.game));
    const weak = weakest(profile, 2, 1.5), stale = stalest(profile, now);
    const focus = weak[0] || stale.id;
    const plan = SLOTS.map(slot => {
      let games = slot.games.filter(g => !lastGames.has(g)); if (!games.length) games = slot.games;
      const fav = games.filter(g => GAME[g].skill === focus || (GAME[g].secondary || []).includes(focus));
      const g = (fav.length && R() < 0.6) ? pick(fav, R) : pick(games, R);
      return g;
    });
    // vary length/composition: sometimes drop the fifth-slot duplicate category or add an extra
    const avgLevel = Math.round(SKILLS.reduce((s, x) => s + skillLevel(profile, x.id), 0) / SKILLS.length);
    if (avgLevel >= 3 && R() < 0.5) plan.splice(2, 1, 'integrated');
    else if (R() < 0.35 && weak[1]) { const extra = gamesForSkill(weak[1]).filter(g => !plan.includes(g.id)); if (extra.length) plan.push(pick(extra, R).id); }
    else if (R() < 0.25) plan.splice(Math.floor(R() * plan.length), 1);
    const ordered = [plan[0]].concat(shuffle(plan.slice(1), R));
    const used = new Set();
    const items = ordered.map(g => {
      const lvl = skillLevel(profile, GAME[g].skill);
      let it = chooseItem(g, lvl, (history || []).concat([...used].map(id => ({ itemId: id, t: now }))), R, now);
      if (it) used.add(it.id);
      return it ? { game: g, itemId: it.id, state: 'pending' } : null;
    }).filter(Boolean);
    const fs = SKILLS.find(s => s.id === focus);
    const why = weak[0] ? 'it’s currently your least-developed skill' : (stale.age === Infinity ? 'you haven’t practised it yet' : `you last practised it ${Math.round(stale.age / 864e5)} days ago`);
    return { id: 'daily-' + dateKey, type: 'daily', date: dateKey, createdAt: now, focus, objective: `Today’s focus is ${fs.name.toLowerCase()} — ${fs.blurb.charAt(0).toLowerCase() + fs.blurb.slice(1)} It gets extra weight because ${why}.`, items, minutes: items.reduce((s, x) => s + GAME[x.game].minutes, 0) };
  }
  function buildMode(mode, profile, history, opts, now) {
    const R = rng(mode + '-' + (now || Date.now())); now = now || Date.now(); opts = opts || {};
    const mk = (g, lvl) => { const it = chooseItem(g, lvl != null ? lvl : skillLevel(profile, GAME[g].skill), history, R, now); return it ? { game: g, itemId: it.id, state: 'pending' } : null; };
    let items = [], objective = '';
    if (mode === 'quick') { const gs = shuffle(QUICK, R).slice(0, 2); items = gs.map(g => mk(g)); objective = 'Two short exercises. Short doesn’t mean shallow — give each one your full attention.'; }
    else if (mode === 'deep') { items = [mk('deep', skillLevel(profile, 'idea'))]; objective = 'One question, developed slowly. Take your time; the stages are designed to move your thinking somewhere new.'; }
    else if (mode === 'random') { const g = pick(GAMES.filter(x => !x.deep && !x.integrated), R); items = [mk(g.id)]; objective = 'A single challenge from anywhere in the playground.'; }
    else if (mode === 'weakness') {
      const weak = weakest(profile, 2, 1.5);
      if (!weak.length) { objective = 'There isn’t enough recorded practice to identify weaker skills yet, so this session covers foundations across categories. After a few sessions, it will target what your results show.'; items = ['possibility', 'evidence', 'diff', 'keepgoing'].map(g => mk(g)); }
      else { objective = 'Focused on ' + weak.map(w => SKILLS.find(s => s.id === w).name.toLowerCase()).join(' and ') + ', based on your recorded results.'; weak.forEach(w => { const gs = shuffle(gamesForSkill(w), R).slice(0, 2); gs.forEach(g => items.push(mk(g.id))); }); }
    }
    else if (mode === 'convo') { items = [mk(opts.game || 'branch')]; objective = 'Practise contributing to a conversation naturally.'; }
    else if (mode === 'challenge') { items = [opts.claim ? { game: 'challenge', itemId: 'custom', custom: { id: 'custom-' + hash(opts.claim), game: 'challenge', lvl: 3, s: opts.claim, custom: true, angles: [] }, state: 'pending' } : mk('challenge')]; objective = 'Examine a claim: defend, challenge or qualify it.'; }
    else if (mode === 'nohints') { const gs = opts.game ? [opts.game, opts.game] : shuffle(GAMES.filter(x => !x.deep && !x.integrated && x.id !== 'branch'), R).slice(0, 3).map(g => g.id); items = gs.map(g => mk(g, Math.min(5, skillLevel(profile, GAME[g].skill) + 1))); objective = 'Challenge mode: one level up, and no hints. Struggling is part of it.'; }
    else if (mode === 'transfer') { const played = new Set(opts.played || []); const skills = new Set(GAMES.filter(g => played.has(g.id)).map(g => g.skill)); const far = opts.far;
      let pool = GAMES.filter(g => !g.deep && !played.has(g.id) && g.id !== 'branch' && (far ? !skills.has(g.skill) : skills.has(g.skill))); if (!pool.length) pool = GAMES.filter(g => !g.deep && g.id !== 'branch' && !played.has(g.id));
      items = shuffle(pool, R).slice(0, 2).map(g => mk(g.id)); objective = far ? 'Far transfer: exercises unlike anything you have practised. Use whatever thinking fits; nobody will tell you which.' : 'Near transfer: a skill you have practised, in exercises you have not met before. Nothing tells you which method to use.'; }
    else if (mode === 'boss') { const B = { critical: [['weaklink', 'evidence', 'missing', 'rankexp', 'challenge', 'factop'], 4], perspective: [['perspectives', 'meaning', 'both', 'reverse', 'whatelse', 'reframe'], 4], realworld: [['integrated', 'chain', 'possibility', 'whatelse', 'connect'], 3] }[opts.boss] || [[], 0];
      // only items at level 3 or above count: a game without one is replaced by the next in its family
      for (const g of B[0]) { if (items.length >= B[1] || !GAME[g]) continue; const it = mk(g, Math.max(3, skillLevel(profile, GAME[g].skill))); const lv = it && ITEM[it.itemId] ? ITEM[it.itemId].lvl : 3; if (it && lv >= 3) items.push(it); } objective = 'Boss challenge: level 3 or above, no hints, judged on your first answers.'; }
    else if (mode === 'single') { items = [opts.itemId ? { game: resolveItem(opts.itemId).game, itemId: opts.itemId, state: 'pending' } : mk(opts.game)]; objective = ''; }
    items = items.filter(Boolean);
    return { id: (mode === 'boss' ? 'boss-' + opts.boss : mode) + '-' + now, type: mode, boss: opts.boss || null, noHints: mode === 'nohints' || mode === 'boss', createdAt: now, objective, items, minutes: items.reduce((s, x) => s + GAME[x.game].minutes, 0) };
  }

  // ───────────────────────── insights (only from recorded performance)
  function insights(attempts, profile, now) {
    now = now || Date.now(); const out = []; const recent = attempts.filter(a => a.status !== 'skipped').slice(-40);
    if (recent.length < 3) return [{ kind: 'info', text: 'Insights appear after a few completed exercises. They’re drawn only from what you’ve actually done here.' }];
    const avg = (arr, k) => { const v = arr.map(a => a.dims && a.dims[k]).filter(x => x != null); return v.length >= 3 ? v.reduce((s, x) => s + x, 0) / v.length : null; };
    const variety = avg(recent, 'variety'), clarity = avg(recent, 'clarity'), conn = avg(recent, 'connections'), nuance = avg(recent, 'nuance'), contrib = avg(recent, 'contribution'), spec = avg(recent, 'specificity'), reas = avg(recent, 'reasoning');
    const ev = k => recent.filter(a => a.dims && a.dims[k] != null).length;
    if (variety != null && variety < 2.3 && (clarity == null || clarity >= 2.8)) out.push({ kind: 'pattern', text: 'You tend to state the first idea clearly, but often settle on it rather than generating genuinely different alternatives.', n: ev('variety') });
    if (variety != null && variety >= 3 && conn != null && conn < 2.5) out.push({ kind: 'pattern', text: 'You generate several distinct ideas, but sometimes struggle to explain how they connect to each other.', n: ev('connections') });
    const dupRate = recent.filter(a => a.flags && a.flags.dup).length / recent.length;
    if (dupRate >= 0.25) out.push({ kind: 'pattern', text: 'In a quarter or more of recent exercises, two of your “different” ideas were the same idea reworded. Try asking what mechanism separates them before writing the second.', n: recent.length });
    if (nuance != null && nuance < 2.3) out.push({ kind: 'pattern', text: 'Your statements often come out more absolute than you probably intend — few conditions or qualifications.', n: ev('nuance') });
    if (nuance != null && nuance >= 3.2) out.push({ kind: 'strength', text: 'You consistently qualify claims with conditions rather than vague hedges.', n: ev('nuance') });
    const qOnly = recent.filter(a => a.flags && a.flags.questionOnly).length; const convoN = recent.filter(a => GAME[a.game] && GAME[a.game].cat === 'convo').length;
    if (convoN >= 3 && qOnly / convoN >= 0.4) out.push({ kind: 'pattern', text: 'In conversation exercises, many of your replies are questions only. Adding an observation of your own alongside a question would make exchanges feel less like an interview.', n: convoN });
    if (contrib != null && contrib >= 3.2) out.push({ kind: 'strength', text: 'Your conversational replies usually contribute something of your own and pick up what the other person said.', n: ev('contribution') });
    if (spec != null && spec < 2.3) out.push({ kind: 'pattern', text: 'Your answers lean on general wording. Concrete examples and specifics would make your meaning easier to grasp.', n: ev('specificity') });
    if (reas != null && reas < 2.2) out.push({ kind: 'pattern', text: 'Your ideas often appear without the “because” — the link between claim and reason is left implicit.', n: ev('reasoning') });
    const revised = recent.filter(a => a.revisions && a.revisions.length);
    if (revised.length >= 2) { const g = revised.reduce((s, a) => s + (a.overall - a.revisions[0].overall), 0) / revised.length; if (g > 0.4) out.push({ kind: 'strength', text: `When you revise after feedback, your responses improve by about ${round1(g)} points on average — you use feedback well.`, n: revised.length }); }
    const rated = recent.filter(a => a.selfRating);
    if (rated.length >= 4) { const bias = rated.reduce((s, a) => s + (a.selfRating - selfBand(a.overall)), 0) / rated.length; if (bias > 0.8) out.push({ kind: 'pattern', text: 'You tend to rate your answers as more developed than the feedback finds them. It’s worth rereading before submitting.', n: rated.length }); else if (bias < -0.8) out.push({ kind: 'pattern', text: 'You tend to rate your answers as less developed than the feedback finds them — you may be underestimating your thinking.', n: rated.length }); else out.push({ kind: 'strength', text: 'Your self-ratings closely match the feedback — a sign of good awareness of your own thinking.', n: rated.length }); }
    const hinted = recent.filter(a => a.hints > 0).length; if (hinted / recent.length > 0.5) out.push({ kind: 'pattern', text: 'You used hints in more than half of recent exercises. Try writing a first attempt before opening one — hints work best after you’ve struggled a bit.', n: recent.length });
    SKILLS.forEach(s => { const sk = profile.skills[s.id]; if (sk.n >= 2 && sk.last && now - sk.last > 10 * 864e5) out.push({ kind: 'stale', text: `You haven’t practised ${s.name.toLowerCase()} for ${Math.round((now - sk.last) / 864e5)} days.`, n: sk.n }); });
    // trend per skill
    SKILLS.forEach(s => { const h = profile.skills[s.id].history.filter(x => x.w >= 1); if (h.length >= 6) { const a = h.slice(-6, -3), b = h.slice(-3); const d = b.reduce((x, y) => x + y.s, 0) / 3 - a.reduce((x, y) => x + y.s, 0) / 3; if (d >= 0.7) out.push({ kind: 'strength', text: `Your recent ${s.name.toLowerCase()} results are clearly higher than the three before.`, n: 6 }); else if (d <= -0.7) out.push({ kind: 'pattern', text: `Your recent ${s.name.toLowerCase()} results have dipped compared with earlier ones — possibly harder exercises at a new level.`, n: 6 }); } });
    return out.length ? out : [{ kind: 'info', text: 'No strong patterns yet — your results are fairly even across dimensions.' }];
  }
  function attemptFlags(item, responses, fb) {
    const flags = {};
    if (fb.attention.some(x => x.includes('same idea in different words') || x.includes('same point') || x.includes('same thing'))) flags.dup = true;
    if (fb.attention.some(x => x.includes('only a question'))) flags.questionOnly = true;
    return flags;
  }

  const api = { SKILLS, CATEGORIES, GAMES, GAME, BANK, ITEM, EVCATS, STATUS_LABEL, TAGS,
    text: { words, contentSet, overlap, analyse, analyseIdeas, analyseConvo, kwHit, sentences, findMarkers, M, DIM },
    stagesFor, evaluate, status, adjustedScore, metaScore, selfBand, emptyProfile, updateProfile, chooseItem, fromTemplate, resolveItem,
    buildDaily, buildMode, insights, attemptFlags, weakest, stalest, skillLevel, rng, hash, promptText, itemsFor, round1 };
  if (typeof module !== 'undefined') module.exports = api; else root.MW = api;
})(this);
