/* MINDWORK mentor — teaching, not only testing. Pure logic: prompt, guard, context, plan, evidence. */
(function (root) {
  const isNode = typeof module !== 'undefined';
  const CP = isNode ? require('./competency.js') : root.MWCP;
  const DAY = 864e5;
  const DIAG = { unformed: 'speaking before a thought has formed', organise: 'has a thought but it isn’t organised yet', competing: 'several thoughts competing', words: 'struggling to find the words', silence: 'possibly filling silence (needs checking with you)', lost: 'lost the original point', padding: 'adding more because unsure it landed', develop: 'a valid thought that needs developing', concept: 'doesn’t understand the concept', instruction: 'doesn’t understand the instruction', application: 'understands but can’t apply it', articulation: 'knows it but struggles to say it', confused: 'genuinely confused', valid_alternative: 'a different interpretation that is still valid', none: 'no difficulty' };
  const STRATEGIES = { simpler: 'Re-explain in simpler language', parts: 'Break it into smaller parts', everyday: 'An everyday example', analogy: 'An analogy or comparison', worked: 'A worked example', contrast: 'Contrasting examples', guided: 'Guide her through an example', explain_back: 'Ask her to explain her understanding', practice: 'A new independent attempt', check: 'Check whether understanding improved' };
  const STAGES = ['attempt', 'assess', 'explain', 'teach', 'practise', 'reattempt', 'verify', 'transfer'];
  const q = s => JSON.stringify(String(s == null ? '' : s));
  /* what the mentor may know: learning evidence always; personal material only if she switches it on */
  function context(st, share, now) {
    now = now || Date.now(); const ev = st.comp || [];
    const states = CP.COMPETENCIES.map(c => ({ c, s: CP.state(c.id, ev, now) })).filter(x => x.s.index > 0).map(x => `${x.c.name}: ${x.s.name}${x.s.next ? ` (next: ${x.s.next})` : ''}`);
    const diffs = ev.filter(e => e.kind === 'difficulty').slice(-6).map(e => `${CP.DIFFICULTIES[e.type] || e.type} in ${e.ctx}: "${String(e.evidence || '').slice(0, 90)}"`);
    const taught = (st.teaching || []).slice(-8).map(x => `${x.concept}: ${x.strategy}${x.understood === true ? ' (then shown)' : x.understood === false ? ' (not yet shown)' : ''}`);
    const targets = ((st.improve || {}).targets || []).filter(t => ['active', 'practising', 'ready', 'improving'].includes(t.state)).map(t => `${t.title} (${t.state})`);
    const out = { states, difficulties: diffs, taught, targets, lastActive: st.lastActive ? Math.round((now - st.lastActive) / DAY) + ' days ago' : 'unknown' };
    if (share.goals && st.goals && st.goals.length) out.goals = st.goals;
    if (share.grow) out.grow = (st.grow || []).slice(-3).map(g => g.aid);
    if (share.journal) out.journal = (st.journal || []).slice(-3).map(j => String(j.text || '').slice(0, 120));
    return out;
  }
  function prompt({ ctx, turns, focus, lang }) {
    return `You are MINDWORK's mentor: an attentive, patient teacher and practice partner for one person's thinking and communication. You are not a cheerleader or an examiner.

What you know about her learning (from recorded evidence; nothing else):
${JSON.stringify(ctx, null, 1)}
${focus ? `Current focus: ${q(focus)}` : ''}

Conversation so far:
${turns.slice(-16).map(t => `${t.who === 'you' ? 'Her' : 'Mentor'}: ${t.text}`).join('\n')}

How to teach:
- For speaking and expression practice, the possible difficulties are different and need different teaching: unformed (no thought yet), organise (thought not organised), competing (several thoughts), words (retrieval), silence (filling silence; only a hypothesis), lost (lost the point), padding (adding more from uncertainty), develop (valid but undeveloped). Say what you observed (quote her), then separately what you think may explain it, marked as a hypothesis. If you can't tell which it is, ask her a question instead of guessing. Demonstrate a better approach and explain the thinking behind it, then give another attempt, later in a different situation.
- Never treat pauses, long answers, self-corrections or thinking aloud as weaknesses in themselves, and never teach scripted phrases or 'speak less'. If her text is a transcript of speech, you can't judge tone, pace or delivery: say so if relevant.
- First decide what is happening in her last message: concept (doesn't understand the idea), instruction (doesn't understand what is asked), application (understands but can't apply), articulation (knows but can't say it), confused, valid_alternative (a different reading that is still valid: say so and don't correct it), or none.
- Choose ONE strategy that fits that diagnosis: simpler, parts, everyday, analogy, worked, contrast, guided, explain_back, practice, check. Do not repeat a strategy already listed under "taught" for the same concept unless it was followed by "(then shown)". Never just reword the same explanation.
- Never treat a submitted answer as understanding. Understanding is shown when she explains or applies it in her own words.
- Follow the cycle where it helps: attempt, assess, explain, teach, practise, reattempt, verify, transfer. Reduce help as she improves; don't give away answers to practice tasks.
- Feedback: at most three points, each tied to her exact words; say what she did, what is missing, why it matters, and show one improved version. No generic advice ("think more critically"). No automatic praise. If you can't tell, say so and ask.
- She may disagree with you: take it seriously, explain your reasoning, correct yourself if she's right.
- Don't treat questions as weaker than statements, short answers as poor, or length as depth. Don't turn every message into an assessment.
- Keep "message" under 130 words unless a worked example needs more.

Reply with ONLY a JSON object:
{"message": "...", "diagnosis": "unformed|organise|competing|words|silence|lost|padding|develop|concept|instruction|application|articulation|confused|valid_alternative|none", "strategy": "one strategy id or none", "concept": "short name of what is being taught, or empty", "stage": "one cycle stage", "practice": null or {"prompt": "a task for her", "competency": "competency id", "unfamiliar": true|false}, "assessment": null or {"competency": "competency id", "result": "demonstrated|difficulty|unclear", "difficulty_type": "generate|develop|connect|organise|words|nuance|abstract|spontaneous|direction|build|unformed|competing|silence|lost|padding or empty", "evidence": "her exact words", "why": "..."}, "understood": true|false|null}

Competency ids: ${CP.COMPETENCIES.map(c => c.id).join(', ')}.${lang === 'xh' ? '\n\nLANGUAGE: She is using MINDWORK in isiXhosa. Write "message" in natural isiXhosa; quote her words exactly.' : ''}`;
  }
  /* nothing is recorded as shown unless her own words show it */
  function guard(o, yourTexts) {
    const all = yourTexts.join('\n').toLowerCase().replace(/\s+/g, ' ');
    const inText = s => { const k = String(s || '').toLowerCase().replace(/\s+/g, ' ').trim().replace(/^["“]|["”]$/g, ''); return k.length >= 3 && all.includes(k); };
    const out = { message: String(o.message || '').trim(), diagnosis: DIAG[o.diagnosis] ? o.diagnosis : 'none', strategy: STRATEGIES[o.strategy] ? o.strategy : null, concept: String(o.concept || '').slice(0, 80), stage: STAGES.includes(o.stage) ? o.stage : null, practice: null, assessment: null, understood: null, removed: 0 };
    if (o.practice && o.practice.prompt) out.practice = { prompt: String(o.practice.prompt), competency: CP.BY[o.practice.competency] ? o.practice.competency : null, unfamiliar: !!o.practice.unfamiliar };
    const a = o.assessment; if (a && CP.BY[a.competency] && ['demonstrated', 'difficulty'].includes(a.result)) { if (inText(a.evidence)) out.assessment = { competency: a.competency, result: a.result, type: CP.DIFFICULTIES[a.difficulty_type] ? a.difficulty_type : null, evidence: String(a.evidence), why: String(a.why || '') }; else out.removed++; }
    out.understood = o.understood === true && out.assessment && out.assessment.result === 'demonstrated' ? true : o.understood === false ? false : null;
    return out;
  }
  /* evidence from activities that already exist (rules-based where marked) */
  const GAME_COMP = { idea: ['expand', 'creative'], connect: ['connect', 'associative'], critical: ['assumptions', 'interpretive'], perspective: ['perspective'], organise: ['clarity'], precision: ['nuance', 'explain'], convo: ['listen', 'reciprocity'], meta: ['reflective'] };
  const RP_COMP = { foundations: ['listen', 'cues'], speaking: ['explain', 'clarity'], interpersonal: ['disagree', 'social'], influence: ['explain', 'perspective'], negotiation: ['strategic', 'perspective'], conflict: ['emotional', 'listen'], leadership: ['involve', 'direction'] };
  function derived(st, E) {
    const out = [];
    (st.attempts || []).filter(a => a.status !== 'skipped' && a.overall != null).forEach(a => { const g = E && E.GAME[a.game]; const comps = g ? GAME_COMP[g.cat] || [] : []; const v = (a.versions || [])[0] || a; const txt = JSON.stringify(v.response || a.response || '').replace(/["\\{}\[\]]/g, ' ').trim().slice(0, 90);
      comps.forEach(c => out.push({ comp: c, t: a.t, kind: !a.hints && (v.overall || a.overall) >= 3 ? 'demonstrated' : 'attempt', ctx: 'playground:' + a.game, evidence: txt, hinted: !!a.hints, unfamiliar: false, source: 'rules' })); });
    (st.clog || []).filter(e => e.kind === 'roleplay' && e.done).forEach(e => (RP_COMP[e.area] || []).forEach(c => out.push({ comp: c, t: e.t, kind: e.outcome === 'good' && !e.coach ? 'demonstrated' : 'attempt', ctx: 'roleplay:' + e.rid, evidence: ((e.turns || []).find(x => x.text) || {}).text || '', hinted: !!e.coach, unfamiliar: false, source: 'rules' })));
    const PZ = { lateral: 'cognitive', deduction: 'interpretive', pattern: 'connect', spatial: 'abstract', strategy: 'strategic', logic: 'assumptions', visual: 'interpretive', realworld: 'strategic', escape: 'cognitive' };
    (st.plog || []).filter(e => e.done).forEach(e => { const c = PZ[(e.cat || (E && E.PZCAT && E.PZCAT[e.pid])) || '']; if (c) out.push({ comp: c, t: e.t, kind: e.outcome === 'sound' && !e.hints ? 'demonstrated' : 'attempt', ctx: 'puzzle:' + e.pid, evidence: e.outcome === 'sound' ? 'Solved “' + e.pid + '” with sound reasoning' : '', hinted: !!e.hints, unfamiliar: !(st.plog || []).some(x => x.pid === e.pid && x.t < e.t), source: 'rules' }); });
    (st.olog || []).filter(o => o.ex === 'ob').forEach(o => out.push({ comp: 'interpretive', t: o.t, kind: o.right === o.n ? 'demonstrated' : o.overread ? 'difficulty' : 'attempt', type: o.overread ? 'nuance' : null, ctx: 'observation:ob', evidence: o.right === o.n ? 'Separated what was seen from interpretation in every statement' : o.overread ? 'Marked ' + o.overread + ' interpretation(s) as seen' : '', hinted: false, unfamiliar: o.lvl >= 3, source: 'rules' }));
    const FC = { odd: ['connect'], sort: ['clarity'], seq: ['clarity'], board: ['assumptions', 'interpretive'], ambig: ['interpretive', 'cues'], img: ['explain'], listen2: ['listen', 'interpretive'], recon: ['listen'], constrain: ['expressive'], scene: ['interpretive'] };
    const ex = st.extra || {};
    (ex.formats || []).forEach(x => (FC[x.f] || []).forEach(c => out.push({ comp: c, t: x.t, kind: x.right === x.n ? 'demonstrated' : 'attempt', ctx: 'format:' + x.f, evidence: x.right === x.n ? 'All correct in ' + x.f + ' #' + (x.i + 1) : '', hinted: false, unfamiliar: !(ex.formats || []).some(y => y.f === x.f && y.t < x.t), source: 'rules' })));
    (ex.kia || []).forEach(x => out.push({ comp: 'abstract', t: x.t, kind: 'attempt', ctx: 'learn:kia', evidence: '', source: 'practice' }));
    (ex.approaches || []).forEach(x => ['cognitive', 'strategic'].forEach(c => out.push({ comp: c, t: x.t, kind: 'attempt', ctx: 'think:approaches', evidence: '', source: 'practice' })));
    (st.glog || []).forEach(g => { const c = { emotion: 'emotional', attention: 'social', flexibility: 'cognitive', way: 'social' }[g.area]; if (c) out.push({ comp: c, t: g.t, kind: 'attempt', ctx: 'grow', evidence: '', source: 'practice (content private)' }); });
    return out;
  }
  /* the daily plan, each item with its reason; short / medium / extended */
  const ACT = { readiness: ['Speak with intention', '#express'], organise: ['Speak with intention', '#express'], monitor: ['Speak with intention', '#express'], pausing: ['Speak with intention', '#express'], recovery: ['Speak with intention', '#express'], intent: ['Speak with intention', '#express'], expand: ['Deep Thinking', '#deep'], assumptions: ['Critical Thinking exercises', '#games-critical'], connect: ['Connecting Ideas', '#games-connect'], analogy: ['Odd One Out', '#fmt-odd'], abstract: ['Knowledge in Action', '#kia'], clarity: ['Thought Organisation', '#games-organise'], nuance: ['Precision exercises', '#games-precision'], explain: ['Say it different ways', '#flex-ways'], direction: ['Group conversation', '#group'], involve: ['Group conversation', '#group'], spontaneous: ['Quick responses', '#flex-quick'], listen: ['Communication Foundations', '#area-foundations'], disagree: ['Disagreeing respectfully', '#roleplay-disagree'], cues: ['Reading the room', '#roleplay-read-room'], perspective: ['Possible directions', '#flex-possible'], cognitive: ['Multiple Approaches', '#approaches'], interpretive: ['Possible directions', '#flex-possible'], creative: ['Idea Development', '#games-idea'], emotional: ['Emotional Awareness', '#garea-emotion'], social: ['Possible directions', '#flex-possible'], expressive: ['Say it different ways', '#flex-ways'], strategic: ['Multiple Approaches', '#approaches'], reflective: ['Thinking Journal', '#journal'] };
  const act = c => ACT[c] || (CP.BY[c] && CP.BY[c].group === 'convo' ? ['Open or group conversation', '#group'] : ['Mentor session', '#mentor']);
  function plan(st, size, now) {
    now = now || Date.now(); const ev = st.comp || []; const items = []; const add = (label, href, why, comp) => { if (!items.some(i => i.href === href)) items.push({ label, href, why, comp }); };
    const away = st.lastActive ? (now - st.lastActive) / DAY : 0;
    if (away >= 7) { const old = CP.COMPETENCIES.filter(c => CP.state(c.id, ev, now).index >= 3); add(old.length ? 'A short check of something you’d shown before' : 'A gentle restart', old.length ? act(old[0].id)[1] : '#play', `You’ve been away ${Math.round(away)} days. ${old.length ? 'Checking whether ' + old[0].name.toLowerCase() + ' has held is part of measuring real retention.' : 'Starting small makes it easier to get going again.'}`, old[0] && old[0].id); }
    ((st.improve || {}).targets || []).filter(t => t.state === 'ready').forEach(t => add('Reassessment: ' + t.title, '#improve', 'You finished the targeted practice; a check in new exercises shows whether it transferred.'));
    CP.recurring(ev).forEach(r => { const c = Object.keys(ACT).find(k => k.startsWith(r.type)) || 'expand'; add('Practise: ' + r.name.toLowerCase(), '#mentor', `${r.name} appeared ${r.count} times in ${r.contexts.length} different activities. The mentor can teach it and give you practice.`); });
    CP.COMPETENCIES.forEach(c => { const s = CP.state(c.id, ev, now); const D = ev.filter(e => e.comp === c.id && e.kind === 'demonstrated'); const last = D.length ? D[D.length - 1].t : 0;
      if (s.index >= 3 && last && now - last > 14 * DAY) add('Retention check: ' + c.name.toLowerCase(), act(c.id)[1], `Last shown ${Math.round((now - last) / DAY)} days ago. Showing it again after a gap is what turns practice into a lasting skill.`, c.id);
      else if (s.index === 3) add(act(c.id)[0], act(c.id)[1], `${c.name}: shown once. Next: ${s.next.toLowerCase()}.`, c.id); });
    const ready = CP.COMPETENCIES.filter(c => CP.state(c.id, ev, now).index >= 4); if (ready.length && !(st.bossesTried)) add('A boss challenge', '#bosses', `${ready[0].name} is consistently demonstrated. A boss challenge tests it without hints, alongside other skills.`);
    if (items.length < 4) add('Possible directions', '#flex-possible', 'Spotting several ways a moment could go, then choosing one, is the core of flexible thinking.');
    if (items.length < 4) add('Explore a question', '#explore', 'Developing one idea through a real back-and-forth.');
    return items.slice(0, size === 'short' ? 1 : size === 'extended' ? 5 : 3);
  }
  const api = { DIAG, STRATEGIES, STAGES, context, prompt, guard, derived, plan, ACT, GAME_COMP };
  if (isNode) module.exports = api; else root.MWM = api;
})(this);
