/* MINDWORK character development framework — the intended personality portrait as shared data.
   It is a development reference the user can adopt, adapt in her own words, postpone or decline; never a test or a label.
   Progress is tracked only from recorded practice and stated as stages of demonstrated behaviour, not as traits. */
(function (root) {
  const isNode = typeof module !== 'undefined';
  const CORE = [
    { id: 'honesty', name: 'Radical honesty', essence: 'Truth told with kindness and clarity; never cruelty dressed up as honesty.',
      shows: ['Doesn’t lie, exaggerate, fabricate or manipulate', 'Doesn’t pretend to agree', 'Doesn’t say what people want to hear to avoid discomfort', 'Acknowledges not knowing; admits mistakes', 'Doesn’t overpromise or misrepresent her abilities'] },
    { id: 'listening', name: 'Active listening', essence: 'Listening to understand, not to prepare a reply.',
      shows: ['Gives genuine attention and remembers details', 'Doesn’t interrupt to perform or dominate', 'Clarifies rather than assumes', 'Knows the difference between listening, advising, comforting and problem-solving', 'May ask: “Do you need advice, a decision, a sounding board, or just a witness?”'] }];
  const QUALITIES = [
    { id: 'safehaven', name: 'Safe Haven', essence: 'Emotionally reliable without becoming everyone’s therapist or fixer.',
      professional: ['Colleagues feel comfortable bringing problems to her', 'Doesn’t judge or weaponise vulnerability', 'Helps people think; recognises when to escalate', 'Protects her own emotional capacity'],
      personal: ['Listens without immediately fixing', 'Doesn’t compete with other people’s pain', 'Supports without taking responsibility for everyone', 'Says when she doesn’t have capacity'] },
    { id: 'straight', name: 'Straight Shooter', essence: 'Kind but clear.',
      professional: ['Gives honest feedback and explains why', 'Disagrees respectfully', 'Doesn’t make promises she can’t keep', 'Criticises the work, not the person'],
      personal: ['Tells the truth when it matters', 'Doesn’t encourage harmful decisions to be agreeable', 'States needs directly; plays no games', 'Disagrees without attacking character'] },
    { id: 'unshakable', name: 'Unshakable', essence: 'Steady under pressure without pretending everything is fine.',
      professional: ['Separates urgency from anxiety', 'Names what is known and unknown', 'Focuses on the next useful decision', 'Feels emotions without letting them dictate every response'],
      personal: ['Stays present when someone is struggling', 'Doesn’t make another’s crisis about her anxiety', 'Helps find the next step', 'Can sit with discomfort'] },
    { id: 'highvalue', name: 'High-Value with time and boundaries', essence: 'Self-respect: availability is not the same as value.',
      professional: ['Protects her time and states capacity honestly', 'Says no clearly', 'Doesn’t chase validation', 'Communicates instead of disappearing'],
      personal: ['Doesn’t beg for attention', 'Doesn’t accept repeated disrespect', 'Doesn’t confuse loyalty with tolerating mistreatment', 'Doesn’t use silence as punishment'] },
    { id: 'nondramatic', name: 'Non-Dramatic', essence: 'Peace without avoidance.',
      professional: ['Avoids gossip and unnecessary speculation', 'Doesn’t take sides without enough information', 'Protects confidential information', 'Knows when not to participate'],
      personal: ['Doesn’t referee other people’s disagreements', 'Doesn’t repeat private information for social currency', 'Avoids unnecessary conflict'] },
    { id: 'forgiving', name: 'Forgiving but Not Forgetful', essence: 'Forgiveness with discernment.',
      professional: ['Accepts genuine apologies', 'Doesn’t hold grudges unnecessarily', 'Recognises repeated behaviour', 'Adjusts boundaries when trust has been damaged'],
      personal: ['Can forgive and move forward', 'Can still change how much access or trust she gives', 'Recognises patterns without becoming cynical'] },
    { id: 'goodtime', name: 'Good Time', essence: 'Genuine warmth, not a performance.',
      professional: ['Brings warmth and makes people feel included', 'Remembers details; connects people naturally', 'Enjoys people without dominating'],
      personal: ['Playful without forcing it', 'Doesn’t need to be entertaining all the time', 'Can be quiet, serious and vulnerable when it fits'] }];
  // A strength becomes a weakness when unbalanced. These are possibilities to explore when evidence appears — never conclusions.
  const BALANCE = [
    { id: 'honesty', quality: 'Honesty', imbalance: 'Harshness', direction: 'Truth with kindness and context' },
    { id: 'listening', quality: 'Active listening', imbalance: 'Passive silence or overgiving', direction: 'Listening while keeping your agency and boundaries' },
    { id: 'safehaven', quality: 'Safe Haven', imbalance: 'Becoming everyone’s therapist', direction: 'Support without emotional over-responsibility' },
    { id: 'straight', quality: 'Straight Shooter', imbalance: 'Coldness or unnecessary bluntness', direction: 'Directness with empathy' },
    { id: 'unshakable', quality: 'Unshakable', imbalance: 'Emotional suppression', direction: 'Regulation without denying feelings' },
    { id: 'highvalue', quality: 'High-Value', imbalance: 'Aloofness or isolation', direction: 'Self-respect with openness' },
    { id: 'nondramatic', quality: 'Non-Dramatic', imbalance: 'Avoiding necessary confrontation', direction: 'Peace without avoidance' },
    { id: 'forgiving', quality: 'Forgiving', imbalance: 'Repeatedly tolerating harmful behaviour', direction: 'Forgiveness with discernment' },
    { id: 'goodtime', quality: 'Good Time', imbalance: 'Performing for approval', direction: 'Genuine warmth and enjoyment' },
    { id: 'social', quality: 'Social intelligence', imbalance: 'Manipulation or people-pleasing', direction: 'Adaptability grounded in integrity' }];
  const SITUATIONS = ['Warm with a friend', 'Direct with a colleague', 'Calm in a crisis', 'Firm with someone who disrespects her', 'Playful when relaxed', 'Quiet when tired', 'Supportive when someone needs to be heard', 'Analytical when a hard decision needs making'];
  const ALL = CORE.concat(QUALITIES); const BY = Object.fromEntries(ALL.map(q => [q.id, q]));
  const STANCES = { adopt: 'This is me, or who I want to be', adapt: 'Yes, in my own words', later: 'Not now', no: 'Not for me' };

  // Existing practice that exercises each quality (role-plays and games). Evidence is counted only where it was recorded.
  const LINKS = { roleplay: { boundary: ['highvalue', 'straight'], criticism: ['unshakable', 'forgiving', 'honesty'], disagree: ['straight', 'honesty'], 'listen-problem': ['listening', 'safehaven'], 'read-room': ['listening', 'safehaven'], customer: ['unshakable', 'listening'], mediate: ['nondramatic', 'listening'], coach: ['listening', 'safehaven'], meeting: ['goodtime', 'straight'] },
    contexts: { boundary: 'professional', criticism: 'professional', disagree: 'personal', 'listen-problem': 'professional', 'read-room': 'personal', customer: 'professional', mediate: 'professional', coach: 'professional', meeting: 'professional' } };

  const STAGES = [['awareness', 'Awareness: recognises the behaviour'], ['understanding', 'Understanding: knows why it matters to her'], ['guided', 'Guided practice'], ['independent', 'Independent application'], ['transfer', 'Transfer: in another kind of situation'], ['consistency', 'Consistency over time']];
  const DAY = 864e5;
  /* evidence: [{quality, source, ok, coached, context, t}] from role-plays, open AI conversations (with the model's evidence), reflections */
  function evidenceFrom(st) {
    const out = []; const ch = st.character || {};
    (st.comm || []).filter(e => e.kind === 'roleplay' && e.done).forEach(e => (LINKS.roleplay[e.rid] || []).forEach(q => out.push({ quality: q, source: 'role-play', ok: e.score >= 0.75, coached: !!e.coach, context: LINKS.contexts[e.rid], t: e.t, ref: e.id })));
    (st.ai || []).forEach(s => ((s.feedback && s.feedback.qualities) || []).forEach(o => { if (BY[o.id] && o.evidence) out.push({ quality: o.id, source: 'open conversation', ok: o.direction === 'shown', tension: o.direction === 'imbalance', coached: false, context: s.context || 'personal', t: s.t, ref: s.id }); }));
    const COMP_Q = { listen: ['listening'], cues: ['listening', 'safehaven'], disagree: ['straight', 'honesty'], emotional: ['unshakable', 'nondramatic'], playfulness: ['goodtime'], reciprocity: ['listening', 'goodtime'], signalling: ['safehaven'], calibration: ['goodtime'] };
    (st.comp || []).filter(e => e.evidence && e.source !== 'rules' && (e.kind === 'demonstrated' || e.kind === 'difficulty')).forEach(e => (COMP_Q[e.comp] || []).forEach(q => out.push({ quality: q, source: e.source || 'assessment', ok: e.kind === 'demonstrated', coached: !!e.hinted, context: String(e.ctx || '').split(':')[0], t: e.t, ref: e.comp + e.t })));
    Object.entries(ch.why || {}).forEach(([q, w]) => { if (w && w.text && w.text.trim().split(/\s+/).length >= 6) out.push({ quality: q, source: 'your own reasons', ok: true, kind: 'why', t: w.t }); });
    return out.sort((a, b) => a.t - b.t);
  }
  function stage(qid, st) {
    const ev = evidenceFrom(st).filter(e => e.quality === qid); const ch = st.character || {};
    const practice = ev.filter(e => e.source !== 'your own reasons'); const indep = practice.filter(e => e.ok && !e.coached);
    const met = {
      awareness: !!(ch.stance && ch.stance[qid]) || practice.length > 0,
      understanding: ev.some(e => e.kind === 'why'),
      guided: practice.some(e => e.coached),
      independent: indep.length >= 1,
      transfer: new Set(indep.map(e => e.context)).size >= 2 || new Set(indep.map(e => e.source)).size >= 2,
      consistency: indep.length >= 3 && new Set(indep.map(e => Math.floor(e.t / DAY))).size >= 2 && new Set(indep.map(e => e.source + e.context)).size >= 2 };
    const tensions = ev.filter(e => e.tension).length;
    return { met, evidence: ev, practiceCount: practice.length, independentCount: indep.length, tensions };
  }
  /* the user's own development goals, in her words where she adapted them — the only character data ever sent to an AI, and only with consent */
  function goalsFor(ch) {
    return ALL.filter(q => ch && ch.stance && (ch.stance[q.id] === 'adopt' || ch.stance[q.id] === 'adapt')).map(q => ({ id: q.id, name: q.name, aim: (ch.stance[q.id] === 'adapt' && ch.wording && ch.wording[q.id]) || q.essence }));
  }
  const api = { CORE, QUALITIES, ALL, BY, BALANCE, SITUATIONS, STANCES, LINKS, STAGES, evidenceFrom, stage, goalsFor };
  if (isNode) module.exports = api; else root.MWCH = api;
})(this);
