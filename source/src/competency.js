/* MINDWORK competencies — one shared model for thought development, connection, articulation, conversation,
   flexibility (10 kinds) and the 12 conversational dimensions. States come only from recorded evidence:
   activity counts, answer length and streaks never move a state. */
(function (root) {
  const isNode = typeof module !== 'undefined';
  const G = { thought: 'Thought development', connect: 'Connection and association', express: 'Articulation and expression', lead: 'Conversational leadership', spont: 'Spontaneous thinking', intent: 'Intentional expression', interact: 'Interactive communication', flex: 'Flexibility', convo: 'Conversational flexibility' };
  const C = (id, group, name, looks, abilities) => ({ id, group, name, looks, abilities: abilities || [] });
  const COMPETENCIES = [
    C('expand', 'thought', 'Developing a thought past its first form', 'Takes an initial idea further: why it might be true, causes, consequences, tensions, until it becomes a position.', ['critical', 'reflective']),
    C('assumptions', 'thought', 'Examining assumptions', 'Names what an idea takes for granted and tests whether it holds.', ['critical']),
    C('connect', 'connect', 'Making meaningful connections', 'Links ideas from different areas and says why the link holds, not just that it exists.', ['creative', 'abstract']),
    C('analogy', 'connect', 'Analogies and comparisons', 'Uses a comparison that clarifies, and notices where it stops working.', ['abstract']),
    C('abstract', 'connect', 'Moving between abstract and concrete', 'Grounds abstract ideas in examples and draws principles from examples.', ['abstract']),
    C('clarity', 'express', 'Clear and concise expression', 'Says what she means without padding, while keeping the nuance that matters. Concise is not the same as short.', ['analytical']),
    C('nuance', 'express', 'Expressing nuance', 'Distinguishes close ideas and states conditions instead of absolutes.', ['critical']),
    C('explain', 'express', 'Explaining for an audience', 'Adapts an explanation to who is listening, with examples or stories where they help.', []),
    C('direction', 'lead', 'Establishing and keeping direction', 'Introduces or steers a topic and develops it beyond where it started, without derailing it.', ['strategic']),
    C('involve', 'lead', 'Involving others', 'Brings other people in and keeps momentum without dominating.', []),
    C('spontaneous', 'spont', 'Spontaneous articulation', 'Turns an emerging thought into a coherent response in real time, including to the unexpected.', ['intuitive']),
    C('readiness', 'intent', 'Thought readiness', 'Notices whether she has actually formed a thought before speaking, and takes a moment, or says so, when she hasn’t.', ['metacognitive']),
    C('organise', 'intent', 'Organising thought while speaking', 'Establishes a central idea and keeps direction through a response, long or short.', ['analytical']),
    C('monitor', 'intent', 'Verbal self-monitoring', 'Notices when she is repeating herself, drifting or adding what isn’t needed, and adjusts.', ['metacognitive']),
    C('pausing', 'intent', 'Comfort with pausing', 'Takes time to think instead of automatically filling silence.', []),
    C('recovery', 'intent', 'Thought recovery', 'Finds her original point again after losing the thread or being interrupted.', ['metacognitive']),
    C('intent', 'intent', 'Intentional contribution', 'Knows whether she is answering, asking, explaining, disagreeing, sharing, exploring or responding emotionally, and chooses it.', ['reflective', 'metacognitive']),
    C('listen', 'interact', 'Listening and building on others', 'Responds to what was actually said and builds on it.', []),
    C('disagree', 'interact', 'Disagreeing constructively', 'Holds or revises a position for reasons, not to please or to win.', ['critical']),
    C('cues', 'interact', 'Reading conversational cues', 'Notices emotional and conversational signals and checks rather than assumes.', []),
    C('perspective', 'flex', 'Perspective flexibility', 'Considers other viewpoints and how context changes interpretation.', ['lateral']),
    C('cognitive', 'flex', 'Cognitive flexibility', 'Switches approach when one isn’t working; doesn’t get stuck on the first frame.', ['metacognitive']),
    C('interpretive', 'flex', 'Interpretive flexibility', 'Holds several readings, separates fact from interpretation, tolerates ambiguity.', ['critical']),
    C('creative', 'flex', 'Creative flexibility', 'Generates genuinely different possibilities and reframes problems.', ['creative', 'lateral']),
    C('emotional', 'flex', 'Emotional flexibility', 'Recognises feelings versus interpretations and responds rather than reacts.', []),
    C('social', 'flex', 'Social flexibility', 'Adapts expression to people and context while staying authentic.', []),
    C('expressive', 'flex', 'Expressive flexibility', 'Finds another way to say an idea when the first doesn’t land.', []),
    C('strategic', 'flex', 'Strategic flexibility', 'Weighs alternatives and knows when to persist and when to change direction.', ['strategic']),
    C('reflective', 'flex', 'Reflective flexibility', 'Questions her own conclusions and revises when evidence warrants, without agreeing with everything.', ['reflective', 'metacognitive']),
    ...[['generativity', 'Response generation (conversational generativity)'], ['associative', 'Associative thinking'], ['spontaneity', 'Spontaneity'], ['playfulness', 'Playfulness'], ['expressiveness', 'Emotional expressiveness'], ['disclosure', 'Self-disclosure'], ['reciprocity', 'Conversational reciprocity'], ['calibration', 'Social calibration'], ['curiosity', 'Curiosity'], ['signalling', 'Relational signalling'], ['initiative', 'Conversational initiative'], ['progression', 'Conversational progression']].map(([id, n]) => C(id, 'convo', n, '', []))];
  const BY = Object.fromEntries(COMPETENCIES.map(c => [c.id, c]));
  const DIFFICULTIES = { generate: 'Generating an idea', develop: 'Developing an existing idea', connect: 'Making connections', organise: 'Organising thoughts', words: 'Retrieving words', nuance: 'Expressing nuance', abstract: 'Explaining abstract ideas', spontaneous: 'Responding spontaneously', direction: 'Maintaining conversational direction', build: 'Building on another person’s contribution', unformed: 'Speaking before a thought has formed', competing: 'Several competing thoughts', silence: 'Discomfort with silence (a hypothesis, to be checked with her)', lost: 'Losing the original point', padding: 'Adding more because unsure it landed' };
  const STATES = [['not', 'Not assessed'], ['introduced', 'Introduced'], ['practising', 'Practising'], ['developing', 'Developing'], ['consistent', 'Consistently demonstrated'], ['independent', 'Independently applied'], ['mastered', 'Mastered']];
  const DAY = 864e5, day = t => Math.floor(t / DAY);
  /* evidence: { comp, t, kind: 'taught'|'attempt'|'demonstrated'|'difficulty', ctx, evidence, hinted, unfamiliar, source } */
  function state(comp, ev, now) {
    now = now || Date.now(); const E = ev.filter(e => e.comp === comp); const D = E.filter(e => e.kind === 'demonstrated' && e.evidence);
    const met = { introduced: E.some(e => ['taught', 'attempt', 'demonstrated', 'difficulty'].includes(e.kind)), practising: E.some(e => ['attempt', 'demonstrated', 'difficulty'].includes(e.kind)), developing: D.length >= 1 };
    met.consistent = D.length >= 3 && new Set(D.map(e => day(e.t))).size >= 2 && new Set(D.map(e => e.ctx)).size >= 2;
    const indep = D.filter(e => !e.hinted && e.unfamiliar); met.independent = met.consistent && indep.length >= 2;
    const first = D.length ? D[0].t : 0; met.mastered = met.independent && D.some(e => !e.hinted && e.t - first >= 14 * DAY) && !E.slice(-3).some(e => e.kind === 'difficulty');
    let k = 0; ['introduced', 'practising', 'developing', 'consistent', 'independent', 'mastered'].forEach((s, i) => { if (met[s] && k === i) k = i + 1; });
    const need = { 0: 'Any practice involving it', 1: 'An attempt', 2: 'One demonstration with quoted evidence', 3: 'Three demonstrations on two days in two different contexts', 4: 'Two more without help in unfamiliar situations', 5: 'A demonstration at least two weeks after the first, with no recent difficulty' }[k];
    return { key: STATES[k][0], name: STATES[k][1], index: k, met, demonstrations: D.length, difficulties: E.filter(e => e.kind === 'difficulty').length, next: need || null };
  }
  /* before and after: only comparable evidence, never claimed without two real records */
  function beforeAfter(comp, ev) {
    const D = ev.filter(e => e.comp === comp && (e.kind === 'demonstrated' || e.kind === 'difficulty') && e.evidence);
    if (D.length < 2) return null; const first = D[0], last = D[D.length - 1]; if (last.t - first.t < DAY) return null;
    return { first, last, changed: first.kind === 'difficulty' && last.kind === 'demonstrated' ? 'improved' : first.kind === 'demonstrated' && last.kind === 'difficulty' ? 'regressed' : 'same kind of evidence' };
  }
  /* recurring difficulty: same type, three times, in two or more contexts — a candidate, not a diagnosis */
  function recurring(ev) { const out = {}; ev.filter(e => e.kind === 'difficulty' && e.type).forEach(e => (out[e.type] = out[e.type] || []).push(e)); return Object.entries(out).filter(([, L]) => L.length >= 3 && new Set(L.map(e => e.ctx)).size >= 2).map(([type, L]) => ({ type, name: DIFFICULTIES[type], count: L.length, contexts: [...new Set(L.map(e => e.ctx))], evidence: L.slice(-3) })); }
  const api = { G, COMPETENCIES, BY, DIFFICULTIES, STATES, state, beforeAfter, recurring };
  if (isNode) module.exports = api; else root.MWCP = api;
})(this);
