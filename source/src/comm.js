/* MINDWORK Communicate — shared conversation engine and content (pure logic).
   The other person reacts to what your reply does, detected by fixed phrase rules (acknowledging, asking, proposing,
   blaming…). It does not understand full meaning; the interface says so, and shows the moves it detected. */
(function (root) {
  const isNode = typeof module !== 'undefined';
  const E = isNode ? require('./engine.js') : root.MW;
  const norm = s => ' ' + String(s || '').toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9'?!. ]+/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
  const MOVES = {
    ack: ['i understand', 'i see', 'i can see', 'i can tell', 'that makes sense', 'fair point', 'fair enough', "you're right", 'you are right', 'i hear you', 'i get that', 'i appreciate', 'thanks for telling', 'thank you for telling', 'good point', 'i know that', 'that is fair', "that's fair", 'thanks for raising', 'thank you for raising'],
    empathy: ['don’t worry', "don't worry", 'completely normal', 'perfectly normal', 'take your time', 'must be', 'sounds frustrating', 'sounds stressful', 'sounds hard', 'sounds difficult', 'sounds like a lot', 'sounds tough', 'sounds awful', 'means to you', 'means a lot', 'exciting', 'excited', 'i can imagine', 'understandably', 'frustrat', 'stressful', 'worrying', 'disappoint', 'upsetting', 'exhausting', 'that is hard', "that's hard", 'that is a lot', "that's a lot", 'overwhelm', 'pressure'],
    paraphrase: ['so you', 'it sounds like', 'if i understand', "you're saying", 'you are saying', 'you mean', "what i'm hearing", 'what i am hearing', 'so what you', 'in other words', 'so the problem', 'so the issue', 'so your', 'so the'],
    interest: ['tell me about', 'tell me more', 'what matters', "what's important", 'what is important', 'why is that', 'why do you', 'what would help', 'what are you worried', "what's behind", 'what do you need', 'what would make', 'worry you', 'would worry', 'what worries', 'concerns you', 'what would concern', 'concern', 'priorit', "what's driving", 'what are you hoping', 'worried about', 'what would work for you', 'what do you want'],
    proposal: ['i’ll call', "i'll call", 'i’ll update', "i'll update", 'i’ll send', "i'll send", 'i’ll get back', "i'll get back", 'i will call', 'i will update', 'what if', 'how about', 'i propose', 'i suggest', 'could we', 'shall we', "let's", 'would you be willing', 'would it work', 'one option', 'an option', 'we could', 'i could', 'i can offer', 'i offer', 'in exchange', 'trial', 'pilot', 'how would it be', 'would that work', 'would that help', 'i can have', 'i can get', 'want to ', 'would you like', 'do you want', 'fancy', 'feel like'],
    concession: ['i can do', "i'm willing", 'i am willing', 'happy to', 'that works', 'we can do', 'agreed', 'i agree', 'okay, i will', "okay i'll", 'ok i will', 'sure, i', 'sounds good', 'good plan', 'great plan'],
    refuse: [' no.', ' no,', "can't", 'cannot', "won't", 'will not', 'not able', 'unable', 'rather not', 'not going to', 'say no', 'not this time', 'decline', "i'll pass", 'not possible'],
    boundary: ['i need you to', "please don't", 'please stop', "i'm not okay", "i'm not comfortable", "it's not okay", 'my limit', 'going forward', 'from now on', "won't be able to take", 'not able to take'],
    apology: ['sorry', 'apologis', 'apologiz', 'my mistake', 'i was wrong', 'my fault', "i shouldn't have", 'i should not have'],
    blame: ['you always', 'you never', 'ridiculous', 'stupid', 'your fault', 'shut up', 'whatever.', 'whatever,', 'whatever!', 'pathetic', 'useless', 'how dare', 'calm down', 'you people', 'idiot', 'not my problem', 'grow up'],
    passive: ['sorry to bother', "if it's okay", "it's fine", 'never mind', 'no worries if not', 'whatever you think', "i don't mind", 'i guess', 'only if', "it doesn't matter", 'if not too much trouble', 'if it is not too much', 'probably nothing', 'possibly'],
    reason: ['because', 'since ', 'so that', 'the reason', 'due to', 'for example', 'for instance', 'data', 'last quarter', 'last month', 'results', 'evidence', 'research'],
    istatement: ['i feel', "i'm concerned", 'i am concerned', 'i need', "i'd like", 'i would like', "i'm worried", 'i am worried', 'i noticed', "i've noticed", 'i think', 'my view', 'i see it differently', 'i disagree'],
    summary: ['to summarise', 'to summarize', "so we've agreed", 'so we have agreed', 'so we agree', "let's recap", 'to recap', 'next steps', 'so the plan', "so we'll", 'so we will', 'action', 'agreed then'],
    advice: ['you should', 'you need to', 'why don\'t you', 'why not just', 'have you tried', 'you could just', 'the answer is', 'what you do is', 'just cut', 'just tell', 'just ask', 'my advice'],
    clarify: ['do you mean', 'what do you mean', 'could you clarify', 'can you clarify', 'can you explain', 'could you explain', 'when you say', 'which part', 'what specifically', 'what exactly', 'can you give me an example'],
    cue: ['you seem', 'you sound', 'are you okay', 'you okay', 'everything okay', 'is everything', 'not like you', 'quiet', 'is something', 'something wrong', 'something up', 'you alright', 'are you alright'],
    invite: ['what do you think', 'anyone', "we haven't heard", 'we have not heard', "i'd like to hear", 'what is your view', "what's your view", "let's hear", 'your thoughts', 'what about you'],
    redirect: ["let's come back", 'come back to', 'back to', 'park', 'stay on', 'focus on', 'for the sake of time', 'the objective', 'after this', 'at the end', 'separate meeting', 'another time']
  };
  const MOVE_NAMES = { ack: 'acknowledged', empathy: 'named the feeling', paraphrase: 'reflected back', openq: 'open question', closedq: 'closed question', interest: 'asked what matters to them', proposal: 'proposed something', concession: 'agreed or conceded', refuse: 'said no', boundary: 'stated a boundary', apology: 'apologised', blame: 'blame or hostility', passive: 'hedged or minimised yourself', reason: 'gave a reason or evidence', istatement: 'spoke from your own view', summary: 'summarised or set next steps', advice: 'gave advice', clarify: 'asked for clarification', cue: 'noticed their manner', invite: 'invited someone in', redirect: 'redirected the discussion' };
  const OPEN = /(^|[.!?]\s)(what|how|why|which|tell me|could you tell|can you walk|help me understand|describe|where would)\b[^?]*\?/;
  function detect(text) {
    const t = norm(text); const m = new Set();
    for (const [k, list] of Object.entries(MOVES)) if (list.some(p => t.includes(p.startsWith(' ') ? p : p))) m.add(k);
    if (t.includes('?')) { if (OPEN.test(t.trim())) m.add('openq'); else m.add('closedq'); }
    if (/(not|isn't|wasn't) (my|our) fault|not on me|not my problem/.test(t)) { m.delete('apology'); m.add('reason'); } // deflecting blame is not apologising
    if (/^ no\b/.test(t)) m.add('refuse'); // a bare "no" counts only at the start, so "no charge" or "no need" don't
    if (m.has('paraphrase') && m.has('advice') && !/(you should|why don't you|why not just|have you tried|my advice|just )/.test(t)) m.delete('advice'); // "it sounds like you need to…" reflects, it doesn't advise
    if (m.has('interest') && !t.includes('?')) m.delete('interest');
    if (/^ (what if|how about|could we|shall we|would you be willing|would that)\b/.test(t)) { m.delete('openq'); m.delete('closedq'); m.add('proposal'); } // a suggestion phrased as a question is a proposal // asking what matters is a question, not a statement of your own concern
    if ((t.match(/sorry/g) || []).length >= 2) m.add('passive');
    if (/!{2,}/.test(text) || (/[A-Z]{5,}/.test(text) && text.replace(/[^A-Z]/g, '').length > text.length * 0.4)) m.add('blame');
    return m;
  }
  const kwHit = (text, kws) => { const t = norm(text); return kws.some(k => t.includes(k)); };

  const AREAS = [
    { id: 'foundations', name: 'Communication Foundations', blurb: 'Listening, questioning, clarifying, explaining, summarising, feedback and reading conversational cues.',
      card: ['Listening well is mostly visible in what you say next: reflecting back what you heard, asking an open question, and summarising before you advise.', 'Open questions (what, how, why) invite the other person to explain; closed questions (did, is, are) confirm details. Both are useful at different moments.', 'Conversational cues — short answers, a changed tone, a change of subject — suggest something; they don’t prove it. A gentle check (“you sound a bit flat — all okay?”) lets the other person tell you.'],
      moves: ['Reflect back the main point before responding', 'Ask open questions to understand, closed ones to confirm', 'Summarise before you advise', 'Treat cues as signals to check, not facts'] },
    { id: 'speaking', name: 'Public Speaking and Presentation', blurb: 'Structuring a talk, strong openings and closes, and delivering out loud.',
      card: ['Listeners remember structure: one main point, a few supporting ones, and a clear close that tells them what to think or do.', 'An opening earns attention with something concrete: a fact, a question, a short story. “Hi, I’ll be talking about…” spends that moment.', 'Delivery improves by speaking aloud, not by rereading notes. Practise on a timer and review honestly.'],
      moves: ['Lead with one main point', 'Open with something concrete', 'Signpost: first, next, finally', 'End with what you want the audience to do'] },
    { id: 'interpersonal', name: 'Interpersonal and Relationship Skills', blurb: 'Empathy, trust, assertiveness, boundaries, apologising, and giving and receiving criticism.',
      card: ['Assertive communication is clear about what you want and respectful of the other person. Passive replies hide what you want; aggressive ones attack the person.', 'A boundary is most effective when it is short, specific and repeated calmly if pushed — with a reason if you choose, and an alternative if you have one.', 'A meaningful apology names the specific behaviour, acknowledges its effect, and says what you’ll do differently — without “but”.', 'With criticism: acknowledge what’s fair, ask what’s vague, and correct what’s wrong, calmly and in that order.'],
      moves: ['Say what you want plainly', 'Hold a boundary when pushed', 'Acknowledge before you defend', 'Apologise for the specific thing, without “but”'] },
    { id: 'influence', name: 'Influence and Persuasion', blurb: 'Building a case, understanding your audience, honest framing, and recognising manipulation.',
      card: ['Persuasion starts with the other person’s concerns, not your conclusion. Ask what worries them, then shape the proposal around it.', 'Support claims with reasons and evidence that matter to this audience: a finance manager hears costs; a team lead hears workload.', 'Ethical influence leaves the other person free to say no. False urgency, fear and flattery are manipulation, even when the goal is good.'],
      moves: ['Find out what concerns them first', 'Use evidence that fits the audience', 'Make a limited, testable request', 'Never rely on pressure or fear'] },
    { id: 'negotiation', name: 'Negotiation', blurb: 'Positions and interests, options for mutual gain, proposals and agreements.',
      card: ['A position is what someone says they want (“the 1st of the month”); an interest is why they want it (“I don’t want the flat empty”). Agreements are usually found at the level of interests.', 'Ask about their interests before you propose. Then share yours, and look for options that serve both.', 'Giving in immediately and digging in on a demand are both easy; neither usually produces the best agreement.'],
      moves: ['Ask why it matters to them', 'Share your own interest', 'Propose options that serve both interests', 'Stay respectful when you disagree'] },
    { id: 'conflict', name: 'Conflict Resolution', blurb: 'De-escalation, mediation, compromise and communicating under pressure.',
      card: ['People can’t problem-solve while they feel unheard. Acknowledge the feeling first, then get specifics, then propose a fix.', 'Arguing with the facts too early (“that’s not true”) escalates, even when you’re right.', 'As a mediator, reflect each side fairly, look for what they both want, and only then help them agree a next step.'],
      moves: ['Acknowledge the feeling first', 'Get the specifics', 'Avoid arguing early', 'Agree a concrete next step'] },
    { id: 'leadership', name: 'Group Communication and Leadership', blurb: 'Facilitation, meetings, coaching, delegating and summarising decisions.',
      card: ['A meeting needs an objective said out loud. It lets you park side issues respectfully and keep time.', 'Quiet participants often hold important information. Inviting them in by name changes what a group decides.', 'Coaching means asking questions that help someone find their own answer. Telling them is faster but builds less.', 'Clear delegation names the person, the task, the expected result and the deadline.'],
      moves: ['State the objective', 'Park side issues respectfully', 'Invite quieter voices', 'Summarise decisions and actions'] }];
  const AREA = Object.fromEntries(AREAS.map(a => [a.id, a]));

  // ───────── role-plays
  const R = (o) => o;
  const ROLEPLAYS = [
    R({ id: 'listen-problem', area: 'foundations', lvl: 2, title: 'A colleague explains a problem', who: 'Thandi, a colleague', goal: 'Understand her problem fully before you offer any advice.', tags: ['emotion'],
      open: 'Honestly, I don’t know what to do. The client keeps changing the brief, and every time I adjust, my manager says I’m behind.',
      rules: [
        { any: ['blame'], say: 'Wow. Okay. That’s not really helpful.', d: { tension: 2 } },
        { any: ['paraphrase'], notF: ['heard'], set: ['heard'], say: 'Yes, exactly. It’s like I’m being judged on a deadline that keeps moving.', d: { trust: 1, tension: -1 } },
        { any: ['empathy', 'ack'], notF: ['felt'], set: ['felt'], say: 'It is. I’ve started dreading opening my email.', d: { trust: 1 } },
        { any: ['openq', 'clarify', 'interest'], notF: ['detail'], set: ['detail'], say: 'The worst part is the client contacts me directly, so my manager never sees the changes.', d: { trust: 1 } },
        { any: ['advice', 'proposal'], notF: ['heard', 'detail'], say: 'Yeah, I’ve thought of that… I’m not sure you see what’s actually going on.', d: { trust: -1, tension: 1 } },
        { any: ['summary', 'proposal', 'advice'], needF: ['detail'], set: ['agreed'], say: 'Yes, that’s it. If my manager saw the change requests, she’d see why I’m behind. I’ll copy her in from now on. Thanks for actually listening.' }],
      fallback: ['Mm.', 'I just feel stuck.', 'Does that make sense?'], doneF: 'agreed', breakLine: 'Never mind. I’ll figure it out.', timeoutLine: 'Anyway, I should get back to it.',
      coach: ['Reflect back what she said before anything else.', 'Name how it might feel for her.', 'Ask an open question to understand more.', 'Now summarise, or suggest a next step together.'],
      criteria: [
        { label: 'Reflected back what she said before advising', test: s => before(s, 'paraphrase', ['advice', 'proposal']) },
        { label: 'Acknowledged how it feels', test: s => has(s, 'empathy') || has(s, 'ack') },
        { label: 'Asked an open question', test: s => has(s, 'openq') || has(s, 'clarify') },
        { label: 'Didn’t jump to advice in your first reply', test: s => !firstHas(s, 'advice') },
        { label: 'Ended with a summary or a shared next step', test: s => s.flags.agreed }] }),
    R({ id: 'read-room', area: 'foundations', lvl: 3, title: 'Reading the room', who: 'Sam, a friend', goal: 'Sam usually talks for ages about his trips. Notice the signals, and respond to them without pushing.',
      open: 'Yeah. It was fine.', context: 'You asked about his weekend away.',
      rules: [
        { any: ['blame'], say: '…Okay.', d: { tension: 2 } },
        { any: ['cue'], notF: ['opened'], set: ['opened'], say: 'Ha. Is it that obvious? Thabo and I sort of broke up on the trip.', d: { trust: 1 } },
        { any: ['openq', 'clarify'], needF: ['opened'], notF: ['shared'], say: 'I… don’t really want to go into the details right now.', d: { tension: 1 }, set: ['pushed'] },
        { any: ['empathy', 'ack'], needF: ['opened'], notF: ['shared'], set: ['shared'], say: 'Yeah. It’s still a bit raw. Thanks for not making a big thing of it.', d: { trust: 1 } },
        { any: ['proposal', 'concession', 'istatement'], needF: ['shared'], set: ['agreed'], say: 'Actually, yes. That sounds good. Thanks for noticing.' },
        { any: ['openq', 'closedq'], notF: ['opened'], say: 'It was fine. Nice beaches.' }],
      fallback: ['Mm.', 'Yeah.', 'Anyway.'], doneF: 'agreed', breakLine: 'I’m going to head off.', timeoutLine: 'Anyway, I should go.',
      coach: ['His answer is unusually short. Say what you notice, gently.', 'Acknowledge what he tells you; you don’t need the details.', 'Offer something: company, a walk, time.'],
      criteria: [
        { label: 'Noticed and named the change in his manner', test: s => has(s, 'cue') },
        { label: 'Acknowledged without pushing for details', test: s => s.flags.shared && !s.flags.pushed },
        { label: 'Offered something rather than only asking', test: s => s.flags.agreed }] }),
    R({ id: 'boundary', area: 'interpersonal', lvl: 2, title: 'A colleague keeps adding work', who: 'Lerato, a colleague', goal: 'Decline the extra task clearly, hold that if pushed, and keep the relationship.',
      open: 'Hey, could you take the supplier report as well? You’re so good at those, and I’m swamped.',
      rules: [
        { any: ['blame'], say: 'Wow. I was only asking.', d: { tension: 2 } },
        { any: ['passive'], notF: ['declined'], say: 'Great, thanks! I’ll send it over now.', set: ['steamrolled'] },
        { any: ['refuse', 'boundary'], notF: ['declined'], set: ['declined'], say: 'Oh. Really? It’d only take you an afternoon.' },
        { any: ['refuse', 'boundary', 'istatement'], needF: ['declined'], notF: ['held'], set: ['held'], say: 'Okay… fair enough. Do you know who else might?', d: { trust: 1 } },
        { any: ['proposal', 'concession'], needF: ['held'], set: ['agreed'], say: 'That would help, actually. Thanks for being straight with me.' },
        { any: ['concession'], notF: ['declined'], set: ['gaveIn', 'end'], say: 'Amazing, thank you! I’ll send it now.' }],
      fallback: ['So… can you?', 'I really am swamped.'], doneF: 'agreed', endF: 'end', breakLine: 'Fine. I’ll ask someone else.', timeoutLine: 'I’ll leave it with you, then.',
      coach: ['Say no plainly. A reason is optional.', 'She pushes. Repeat the no calmly; no need to argue.', 'Offer an alternative if you have one.'],
      criteria: [
        { label: 'Said no clearly', test: s => s.flags.declined },
        { label: 'Held the boundary when pushed', test: s => s.flags.held },
        { label: 'Didn’t over-apologise or hedge', test: s => !has(s, 'passive') },
        { label: 'No blame', test: s => !has(s, 'blame') },
        { label: 'Offered an alternative or next step', test: s => s.flags.agreed }] }),
    R({ id: 'network', area: 'foundations', lvl: 2, title: 'Networking at a conference', who: 'Kabelo, a product manager you’ve just met', goal: 'Find out what he works on, show you understood, share something relevant of your own, and agree a concrete follow-up.',
      open: 'Hi, is this the queue for coffee? I’m Kabelo. I work on payments at a fintech.',
      rules: [
        { any: ['blame'], say: 'Right… okay.', d: { tension: 2 } },
        { any: ['advice'], notF: ['asked'], say: 'Maybe. You don’t really know our setup, though.', d: { tension: 1 } },
        { any: ['interest', 'clarify', 'openq'], notF: ['asked'], set: ['asked'], say: 'We’re trying to get small shops to accept card payments without the big fees. Harder than it sounds.' },
        { any: ['paraphrase', 'ack', 'empathy'], needF: ['asked'], notF: ['engaged'], set: ['engaged'], say: 'Exactly. Most of them have been burnt by hidden charges. What do you do?', d: { trust: 1 } },
        { any: ['reason', 'istatement'], needF: ['engaged'], notF: ['shared'], set: ['shared'], say: 'Oh, interesting. That overlaps with something we’re trying.' },
        { any: ['proposal'], needF: ['shared'], set: ['agreed'], say: 'Yes, let’s. Send me that and I’ll introduce you to our research lead.' }],
      fallback: ['Anyway, busy conference.', 'Have you been to many of these?'], doneF: 'agreed', breakLine: 'Well, good to meet you.', timeoutLine: 'I should find my session. Nice chatting.',
      coach: ['Ask about his work before anything else.', 'Show you understood before you move on.', 'Share something relevant, then suggest a concrete next step.'],
      criteria: [{ label: 'Asked about his work', test: s => s.flags.asked }, { label: 'Showed you understood', test: s => s.flags.engaged }, { label: 'Shared something relevant', test: s => s.flags.shared }, { label: 'Agreed a concrete follow-up', test: s => s.flags.agreed }, { label: 'No early unsolicited advice', test: s => !has(s, 'advice') || s.flags.asked }] }),
    R({ id: 'interview', area: 'leadership', lvl: 3, title: 'Interviewing a candidate', who: 'Ayanda, a candidate', goal: 'Put her at ease, ask open questions, probe a vague claim for specifics, and summarise before closing.',
      open: 'Hi, thanks for having me. I’m a bit nervous, to be honest.',
      rules: [
        { any: ['blame'], say: 'Oh… okay.', d: { tension: 2 } },
        { any: ['empathy', 'ack'], notF: ['settled'], set: ['settled'], say: 'Thanks, that helps. Where would you like me to start?', d: { trust: 1 } },
        { any: ['interest', 'openq'], notF: ['answered'], set: ['answered'], say: 'In my last job I basically ran the whole customer process.' },
        { any: ['clarify'], needF: ['answered'], notF: ['probed'], set: ['probed'], say: 'Fair question. Specifically, I handled about thirty escalated complaints a week and rewrote the refund policy.' },
        { any: ['summary', 'paraphrase'], needF: ['probed'], set: ['done'], say: 'Yes, that’s a fair summary. Thank you.' },
        { any: ['advice'], say: 'Right. I’ll keep that in mind.' }],
      fallback: ['What else would you like to know?', 'Sorry, could you repeat the question?'], doneF: 'done', breakLine: 'I think I’d better go.', timeoutLine: 'Is that everything?',
      coach: ['Put her at ease first.', 'Ask an open question about her experience.', '“Basically ran the whole process” is vague. Ask for specifics.', 'Summarise what you heard before closing.'],
      criteria: [{ label: 'Put her at ease', test: s => s.flags.settled }, { label: 'Asked an open question', test: s => s.flags.answered }, { label: 'Probed the vague claim for specifics', test: s => s.flags.probed }, { label: 'Summarised before closing', test: s => s.flags.done }, { label: 'No judgement or blame', test: s => !has(s, 'blame') }] }),
    R({ id: 'outage', area: 'conflict', lvl: 3, title: 'Communicating in a crisis', who: 'Mrs Khumalo, a client', goal: 'Acknowledge the impact, say what you know and don’t know, avoid vague promises, and commit to a specific next update.',
      open: 'Our online shop has been down for two hours. What on earth is going on?',
      rules: [
        { any: ['blame'], say: 'Don’t you dare put this on us.', d: { tension: 2 } },
        { any: ['passive'], say: 'That’s not an answer.', d: { tension: 1 } },
        { any: ['ack', 'empathy', 'apology'], notF: ['heard'], set: ['heard'], say: 'Thank you. So what’s actually happening?', d: { tension: -1 } },
        { any: ['reason', 'clarify'], needF: ['heard'], notF: ['informed'], set: ['informed'], say: 'And when will it be fixed?' },
        { any: ['proposal'], needF: ['informed'], set: ['agreed'], say: 'Alright. Then I’ll expect to hear from you. Please don’t leave me guessing.' }],
      fallback: ['I’m losing sales every minute.', 'Hello? What’s going on?'], doneF: 'agreed', breakLine: 'I’m calling your manager.', timeoutLine: 'I need answers, not silence.',
      coach: ['Acknowledge what this is costing her first.', 'Say what you know, and what you don’t yet know, with a reason.', 'Commit to a specific time for the next update rather than promising a fix.'],
      criteria: [{ label: 'Acknowledged the impact', test: s => s.flags.heard }, { label: 'Explained what’s known', test: s => s.flags.informed }, { label: 'Committed to a specific update', test: s => s.flags.agreed }, { label: 'No blame', test: s => !has(s, 'blame') }, { label: 'No vague hedging', test: s => !has(s, 'passive') }] }),
    R({ id: 'intercultural', area: 'interpersonal', lvl: 3, title: 'Different norms at work', who: 'Mei, a colleague who recently moved from Taipei', goal: 'Understand her view before advising, acknowledge it, explain your own norms with a reason, and agree a next step together.',
      open: 'In my last office, nobody disagreed with the manager in a meeting. Here everyone does. I’m not sure what’s expected of me.',
      rules: [
        { any: ['blame'], say: 'Oh. I see.', d: { tension: 2 } },
        { any: ['advice'], notF: ['asked'], say: 'Maybe… but it’s not that simple for me.', d: { tension: 1 } },
        { any: ['interest', 'openq', 'clarify'], notF: ['asked'], set: ['asked'], say: 'Mostly I worry it would seem rude. At home we’d raise it privately afterwards.' },
        { any: ['empathy', 'ack', 'paraphrase'], needF: ['asked'], notF: ['understood'], set: ['understood'], say: 'Yes, exactly. So what do people actually do here when they disagree?', d: { trust: 1 } },
        { any: ['reason', 'istatement'], needF: ['understood'], notF: ['shared'], set: ['shared'], say: 'That helps. I didn’t realise it was expected.' },
        { any: ['proposal'], needF: ['shared'], set: ['agreed'], say: 'Okay. I’ll try it next week, and maybe check with you afterwards?' }],
      fallback: ['I just don’t want to get it wrong.', 'Hmm.'], doneF: 'agreed', breakLine: 'Never mind, I’ll work it out.', timeoutLine: 'Anyway, thanks.',
      coach: ['Ask about her experience before suggesting anything.', 'Show you understand her concern.', 'Explain the norm here and why it exists, without saying either way is better.', 'Suggest a small next step together.'],
      criteria: [{ label: 'Asked before advising', test: s => s.flags.asked }, { label: 'Acknowledged her perspective', test: s => s.flags.understood }, { label: 'Explained your norms with a reason', test: s => s.flags.shared }, { label: 'Agreed a next step', test: s => s.flags.agreed }, { label: 'No blame', test: s => !has(s, 'blame') }] }),
    R({ id: 'criticism', area: 'interpersonal', lvl: 3, title: 'Partly fair criticism', who: 'Mr Dlamini, your manager', goal: 'Acknowledge what’s fair, ask about what’s vague, correct what’s wrong, and agree a fix.', tags: ['emotion'],
      open: 'Your report was late and, frankly, sloppy. This keeps happening.',
      rules: [
        { any: ['blame'], say: 'Don’t turn this around on me.', d: { tension: 2 } },
        { any: ['ack', 'apology'], notF: ['owned'], set: ['owned'], say: 'Well, I appreciate that. The lateness did cause problems for the client meeting.', d: { tension: -1 } },
        { any: ['clarify', 'openq'], notF: ['clarified'], set: ['clarified'], say: 'The figures in section two didn’t match the appendix. That’s what I mean by sloppy.' },
        { any: ['refuse', 'reason', 'istatement'], needF: ['clarified', 'owned'], notF: ['corrected'], set: ['corrected'], say: '“This keeps happening”… you’re right, the last two were on time. I overstated that.', d: { trust: 1 } },
        { any: ['proposal', 'summary'], needF: ['owned', 'clarified'], set: ['agreed'], say: 'Good. Let’s do that. And thanks for not getting defensive.' },
        { any: ['reason'], notF: ['owned'], say: 'That sounds like an excuse.', d: { tension: 1 }, set: ['defended'] },
        { any: ['passive'], notF: ['owned'], say: 'I don’t need you to be sorry. I need it fixed.' }],
      fallback: ['Well?', 'So what are you going to do about it?'], doneF: 'agreed', breakLine: 'We’ll continue this when you’re ready to take it seriously.', timeoutLine: 'Let’s pick this up tomorrow.',
      coach: ['Start with what’s fair: the lateness.', 'Ask what “sloppy” means specifically.', 'Correct “keeps happening” calmly if it isn’t accurate.', 'Propose a concrete fix.'],
      criteria: [
        { label: 'Acknowledged what was fair', test: s => s.flags.owned },
        { label: 'Asked what was meant by “sloppy”', test: s => s.flags.clarified },
        { label: 'Corrected the overstatement calmly', test: s => s.flags.corrected },
        { label: 'Didn’t defend before acknowledging', test: s => !s.flags.defended },
        { label: 'Agreed a fix', test: s => s.flags.agreed }] }),
    R({ id: 'disagree', area: 'interpersonal', lvl: 3, title: 'Disagreeing with a friend’s plan', who: 'Neo, a friend', goal: 'Say honestly that you disagree and why, without dismissing him.',
      open: 'I’m quitting my job next week to go full-time on my bakery. I’ve decided.',
      rules: [
        { any: ['blame'], say: 'Wow, thanks for the support.', d: { tension: 2 } },
        { any: ['ack', 'empathy'], notF: ['heard'], set: ['heard'], say: 'Thanks. It’s been my dream for years.', d: { trust: 1 } },
        { any: ['istatement', 'reason', 'refuse'], needF: ['heard'], notF: ['disagreed'], set: ['disagreed'], say: 'Hmm. You think I’m rushing it?' },
        { any: ['istatement', 'reason', 'refuse'], notF: ['heard'], say: 'You sound like my mother.', d: { tension: 1 } },
        { any: ['openq', 'interest', 'clarify'], needF: ['disagreed'], notF: ['explored'], set: ['explored'], say: 'I guess I haven’t worked out how long my savings would last.', d: { trust: 1 } },
        { any: ['proposal'], needF: ['explored'], set: ['agreed'], say: 'Okay. Maybe I test it at weekend markets first, then hand in notice. That’s actually smart.' },
        { any: ['concession'], notF: ['disagreed'], set: ['end'], say: 'Thanks! I knew you’d back me.' }],
      fallback: ['So you’re with me?', 'What do you think, honestly?'], doneF: 'agreed', endF: 'end', breakLine: 'Forget I said anything.', timeoutLine: 'Anyway, I’ve made up my mind.',
      coach: ['Acknowledge what this means to him first.', 'Say your concern as your view (“I’m worried that…”).', 'Ask about his plan.', 'Suggest a way forward together.'],
      criteria: [
        { label: 'Acknowledged his hope first', test: s => s.flags.heard },
        { label: 'Stated your view honestly', test: s => s.flags.disagreed },
        { label: 'Spoke from your view, not a verdict on him', test: s => has(s, 'istatement') && !has(s, 'blame') },
        { label: 'Asked about his plan', test: s => s.flags.explored },
        { label: 'Suggested a way forward', test: s => s.flags.agreed }] }),
    R({ id: 'pitch', area: 'influence', lvl: 3, title: 'Proposing a four-day pilot', who: 'Ms Naidoo, your manager', goal: 'Get agreement to a limited trial of a four-day week for your team.', tags: ['persuasion'],
      open: 'You wanted to talk about schedules?',
      rules: [
        { any: ['blame'], say: 'I’m not sure this conversation is going anywhere.', d: { tension: 2 } },
        { any: ['interest'], notF: ['asked'], set: ['asked'], say: 'My worry is client coverage. If Fridays go dark, we lose accounts.', d: { trust: 1 } },
        { any: ['proposal'], needF: ['asked'], kw: ['cover', 'rota', 'client', 'friday', 'on call', 'rotation', 'stagger'], set: ['agreed'], say: 'A three-month pilot with a Friday rota so clients are always covered… I can take that upstairs.' },
        { any: ['proposal'], needF: ['asked'], say: 'But who looks after clients on Fridays?' },
        { any: ['proposal'], notF: ['asked'], set: ['objected'], say: 'Four days? Clients expect us five days a week. I can’t see it.', d: { tension: 1 } },
        { any: ['reason'], notF: ['evidenced'], set: ['evidenced'], say: 'Those numbers are interesting. Go on.' },
        { any: ['ack'], needF: ['objected'], notF: ['asked'], say: 'Glad you see the issue.' }],
      fallback: ['Go on.', 'What exactly are you proposing?'], doneF: 'agreed', breakLine: 'Let’s leave it there.', timeoutLine: 'Send me something in writing.',
      coach: ['Before proposing, ask what would concern her.', 'Support your case with a reason or evidence.', 'Shape the proposal around her concern, and keep it limited.'],
      criteria: [
        { label: 'Asked what concerned her before proposing', test: s => before(s, 'interest', ['proposal']) },
        { label: 'Supported the case with a reason or evidence', test: s => has(s, 'reason') },
        { label: 'Shaped the proposal around her concern', test: s => s.flags.agreed },
        { label: 'No pressure or hostility', test: s => !has(s, 'blame') }] }),
    R({ id: 'rent', area: 'negotiation', lvl: 3, title: 'Negotiating a move-in date', who: 'Mr Botha, a landlord', goal: 'Start paying rent from the 15th instead of the 1st.', tags: ['negotiation'],
      open: 'The flat’s yours from the 1st. Rent’s due from then — full month.',
      rules: [
        { any: ['blame'], say: 'Then maybe this isn’t the flat for you.', d: { tension: 2 } },
        { any: ['interest', 'openq'], notF: ['learned'], set: ['learned'], say: 'Look, I just don’t want it standing empty. Empty flats get broken into, and I’ve a mortgage to pay.', d: { trust: 1 } },
        { any: ['proposal'], needF: ['learned'], kw: ['paint', 'clean', 'check', 'secur', 'look after', 'keys', 'keep an eye', 'repair', 'garden', 'occupied', 'visit', 'stay', 'deposit', 'empty'], set: ['agreed'], say: 'Hm. If you take the keys on the 1st, keep an eye on it and do the painting, I can live with rent from the 15th. Deal.' },
        { any: ['proposal'], needF: ['learned'], say: 'That still leaves me with an empty flat for two weeks.' },
        { any: ['proposal', 'refuse'], notF: ['learned'], set: ['positional'], say: 'The 1st. That’s the deal.', d: { tension: 1 } },
        { any: ['concession'], notF: ['learned'], set: ['end'], say: 'Good. Full month from the 1st, then.' }],
      fallback: ['So, the 1st?', 'What are you suggesting?'], doneF: 'agreed', endF: 'end', breakLine: 'I’ve other people interested. Let me know.', timeoutLine: 'Think about it and let me know.',
      coach: ['Ask why the 1st matters to him.', 'Look for something you can offer that serves his interest.', 'Propose a specific trade.'],
      criteria: [
        { label: 'Asked about his underlying interest', test: s => s.flags.learned },
        { label: 'Didn’t open with a demand', test: s => before(s, 'interest', ['proposal']) || before(s, 'openq', ['proposal']) },
        { label: 'Your proposal answered his interest', test: s => s.flags.agreed },
        { label: 'Stayed respectful', test: s => !has(s, 'blame') }] }),
    R({ id: 'budget', area: 'negotiation', lvl: 4, title: 'Splitting a shared budget', who: 'Kagiso, another team lead', goal: 'Agree a split of the R60 000 training budget that works for both teams.', tags: ['negotiation'],
      open: 'Training budget’s R60 000. I need at least R40 000 for my team.',
      rules: [
        { any: ['blame'], say: 'Then we’ll let the director decide.', d: { tension: 2 } },
        { any: ['interest', 'openq'], notF: ['learned'], set: ['learned'], say: 'My people are new. Without their certification this quarter, they can’t work on the big contract.', d: { trust: 1 } },
        { any: ['istatement', 'reason'], needF: ['learned'], notF: ['shared'], set: ['shared'], say: 'So your team needs the leadership course. When does it run?' },
        { any: ['proposal'], needF: ['learned', 'shared'], kw: ['quarter', 'phase', 'timing', 'next', 'later', 'online', 'split', 'both', 'first', 'then'], set: ['agreed'], say: 'If we phase it — my certification this quarter, your course next quarter — we both get what we need. Agreed.' },
        { any: ['proposal'], notF: ['learned'], say: 'R40 000, or I escalate.', d: { tension: 1 } },
        { any: ['proposal'], needF: ['learned'], notF: ['shared'], say: 'Maybe. What does your team actually need it for?' },
        { any: ['concession'], notF: ['shared'], set: ['end'], say: 'Great, R40 000 for me then.' }],
      fallback: ['So?', 'What do you need it for?'], doneF: 'agreed', endF: 'end', breakLine: 'I’ll take it to the director.', timeoutLine: 'Let’s both think about it.',
      coach: ['Ask what the R40 000 is for.', 'Explain what your team needs and why.', 'Look for an option that serves both, such as timing.'],
      criteria: [
        { label: 'Asked about their interest', test: s => s.flags.learned },
        { label: 'Explained your own interest', test: s => s.flags.shared },
        { label: 'Found an option that serves both', test: s => s.flags.agreed },
        { label: 'Didn’t simply give in', test: s => !s.flags.end }] }),
    R({ id: 'customer', area: 'conflict', lvl: 2, title: 'An angry customer', who: 'Mrs Pillay, a customer', goal: 'De-escalate, find out what went wrong, and agree a concrete next step.', tags: ['emotion'],
      open: 'This is the THIRD time my order’s arrived wrong. I want a manager, now.',
      rules: [
        { any: ['blame'], say: 'Don’t you dare talk to me like that!', d: { tension: 2 } },
        { any: ['empathy', 'ack', 'paraphrase'], notF: ['calmed'], set: ['calmed'], say: 'Yes, it is frustrating. I’ve got guests on Saturday.', d: { tension: -2, trust: 1 } },
        { any: ['openq', 'clarify', 'closedq'], needF: ['calmed'], notF: ['detail'], set: ['detail'], say: 'The cake was supposed to say “Happy 60th”, not “Happy 16th”.' },
        { any: ['proposal', 'concession'], needF: ['calmed', 'detail'], set: ['agreed'], say: 'Okay. If it’s ready Friday morning, that works. Thank you.', d: { tension: -1 } },
        { any: ['proposal'], notF: ['calmed'], say: 'Don’t fob me off with offers. Listen to me first.', d: { tension: 1 } },
        { any: ['reason', 'refuse'], notF: ['calmed'], say: 'I don’t care whose system it is!', d: { tension: 1 } },
        { any: ['passive'], say: 'Sorry isn’t going to fix my order.', d: { tension: 1 } }],
      fallback: ['Well?', 'I’m waiting.'], doneF: 'agreed', breakLine: 'That’s it. I’m cancelling the order.', timeoutLine: 'I’ll be phoning head office.', start: { tension: 3 },
      coach: ['Acknowledge her frustration first.', 'Find out exactly what was wrong.', 'Offer a specific fix and time.'],
      criteria: [
        { label: 'Acknowledged her frustration first', test: s => firstHas(s, 'empathy') || firstHas(s, 'ack') || firstHas(s, 'paraphrase') },
        { label: 'No blame or arguing', test: s => !has(s, 'blame') },
        { label: 'Found out the specifics', test: s => s.flags.detail },
        { label: 'Agreed a concrete fix', test: s => s.flags.agreed },
        { label: 'Didn’t over-apologise', test: s => !has(s, 'passive') }] }),
    R({ id: 'mediate', area: 'conflict', lvl: 4, title: 'Mediating two teammates', who: 'Zola and Pieter, teammates', goal: 'Help them understand each other and agree a way forward, without taking sides.',
      open: 'Zola: Pieter keeps changing the design without telling anyone.\nPieter: Because our meetings never decide anything!',
      rules: [
        { any: ['blame', 'advice'], notF: ['heardP'], say: 'Pieter: So you’re on her side.', d: { tension: 1 } },
        { any: ['paraphrase', 'ack', 'empathy'], notF: ['heardZ'], set: ['heardZ'], say: 'Zola: Thank you. I just need to know when things change.' },
        { any: ['paraphrase', 'ack', 'empathy'], needF: ['heardZ'], notF: ['heardP'], set: ['heardP'], say: 'Pieter: And I need decisions to actually get made.' },
        { any: ['interest', 'openq'], needF: ['heardP'], notF: ['common'], set: ['common'], say: 'Zola: Well… we both want the design finished.\nPieter: Yes. On time.' },
        { any: ['proposal', 'summary'], needF: ['common'], set: ['agreed'], say: 'Pieter: A decision log and a heads-up before any change. Fine.\nZola: Works for me.' },
        { any: ['proposal'], notF: ['common'], say: 'Zola: That doesn’t solve him going behind our backs.', d: { tension: 1 } }],
      fallback: ['Pieter: So?', 'Zola: Well?'], doneF: 'agreed', breakLine: 'Zola: I’m done with this.', timeoutLine: 'Pieter: We’re going round in circles.',
      coach: ['Reflect Zola’s concern.', 'Now reflect Pieter’s.', 'Ask what they both want.', 'Help them agree a concrete step.'],
      criteria: [
        { label: 'Reflected both sides', test: s => s.flags.heardZ && s.flags.heardP },
        { label: 'Stayed neutral (no blame or advice before both were heard)', test: s => !before(s, 'blame', ['paraphrase', 'ack']) && !before(s, 'advice', ['paraphrase', 'ack']) },
        { label: 'Found common ground', test: s => s.flags.common },
        { label: 'Agreed a concrete next step', test: s => s.flags.agreed }] }),
    R({ id: 'meeting', area: 'leadership', lvl: 3, title: 'A meeting with a dominant voice', who: 'Your project team: Bongani and Aisha', goal: 'Keep the meeting on its objective (deciding the launch date) and hear from everyone.',
      open: 'Bongani: Before we start, I’ve got five things about the office move I need to raise.',
      rules: [
        { any: ['blame'], say: 'Bongani: Fine, I’ll keep quiet then.', d: { tension: 2 } },
        { kw: ['today we', 'the goal', 'objective', 'we need to decide', 'purpose', 'decide the launch', 'launch date'], notF: ['framed'], set: ['framed'], say: 'Aisha: Good. I was hoping we’d settle the date.' },
        { any: ['redirect'], notF: ['parked'], set: ['parked'], say: 'Bongani: Okay, as long as the move gets discussed.' },
        { any: ['invite'], needF: ['framed'], notF: ['invited'], set: ['invited'], say: 'Aisha: I think the 14th is risky; testing isn’t finished.\nBongani: Hm. Fair.' },
        { any: ['summary', 'proposal'], needF: ['invited'], set: ['agreed'], say: 'Bongani: The 21st, with testing signed off by the 17th. Works for me.\nAisha: Agreed.' },
        { any: ['openq'], notF: ['framed'], say: 'Bongani: Well, point one is the parking…' }],
      fallback: ['Bongani: And another thing…', '(Silence.)'], doneF: 'agreed', breakLine: 'Bongani: I’ll raise it with the director instead.', timeoutLine: 'Aisha: We’re out of time.',
      coach: ['State the objective of the meeting.', 'Park the office move respectfully.', 'Invite Aisha, who hasn’t spoken.', 'Summarise the decision.'],
      criteria: [
        { label: 'Stated the meeting’s objective', test: s => s.flags.framed },
        { label: 'Parked the side issue respectfully', test: s => s.flags.parked && !has(s, 'blame') },
        { label: 'Invited a quieter voice', test: s => s.flags.invited },
        { label: 'Summarised the decision', test: s => s.flags.agreed }] }),
    R({ id: 'coach', area: 'leadership', lvl: 3, title: 'Coaching, not telling', who: 'Lwazi, a junior colleague', goal: 'Help him find his own solution rather than giving him the answer.',
      open: 'My presentation’s tomorrow and I’m panicking. Can you just tell me what to cut?',
      rules: [
        { any: ['advice'], notF: ['own'], set: ['told'], say: 'Okay… I’ll cut that, I guess.', d: { trust: -1 } },
        { any: ['empathy', 'ack'], notF: ['eased'], set: ['eased'], say: 'Yeah. I’ve got 30 slides for 15 minutes.', d: { trust: 1 } },
        { any: ['openq', 'interest'], notF: ['goal'], set: ['goal'], say: 'The main thing is… they need to approve the budget.', d: { trust: 1 } },
        { any: ['openq', 'interest', 'clarify'], needF: ['goal'], notF: ['own'], set: ['own'], say: 'So anything that isn’t about the budget could go. That’s… most of the middle section.' },
        { any: ['summary', 'proposal', 'ack', 'concession', 'paraphrase'], needF: ['own'], set: ['agreed'], say: 'Okay. I’ll cut it down to the budget story and practise tonight. Thanks, that helped.' }],
      fallback: ['I don’t know.', 'What would you do?'], doneF: 'agreed', breakLine: 'Never mind, I’ll just wing it.', timeoutLine: 'I’d better get on with it.',
      coach: ['Acknowledge the pressure.', 'Ask what the audience most needs.', 'Ask a question that lets him decide what to cut.', 'Summarise his decision.'],
      criteria: [
        { label: 'Acknowledged the pressure', test: s => s.flags.eased },
        { label: 'Asked rather than told', test: s => !s.flags.told },
        { label: 'Helped him find the core goal', test: s => s.flags.goal },
        { label: 'He reached his own decision', test: s => s.flags.own }] })];
  const RP = Object.fromEntries(ROLEPLAYS.map(r => [r.id, r]));

  // helpers over a finished state
  const turnsWith = (s, m) => s.turns.map((t, i) => t.moves.includes(m) ? i : -1).filter(i => i >= 0);
  const has = (s, m) => s.turns.some(t => t.moves.includes(m));
  const firstHas = (s, m) => !!(s.turns[0] && s.turns[0].moves.includes(m));
  function before(s, a, bs) { const ia = turnsWith(s, a)[0]; const ib = Math.min(...bs.map(b => { const x = turnsWith(s, b)[0]; return x == null ? Infinity : x; })); return ia != null && ia <= ib; }

  function start(rp) { return { rid: rp.id, turn: 0, tension: (rp.start && rp.start.tension) || 1, trust: 2, flags: {}, log: [{ who: 'them', text: rp.open }], turns: [], over: null, fb: 0 }; }
  function reply(rp, st, text) {
    if (st.over) return st;
    const s = JSON.parse(JSON.stringify(st)); const moves = [...detect(text)];
    s.turn++; s.turns.push({ text, moves, flagsBefore: Object.keys(s.flags) });
    s.log.push({ who: 'you', text, moves });
    const ok = r => (!r.any || r.any.some(m => moves.includes(m))) && (!r.kw || kwHit(text, r.kw)) && (!r.needF || r.needF.every(f => s.flags[f])) && (!r.notF || r.notF.every(f => !s.flags[f]));
    const rule = rp.rules.find(ok);
    if (rule) { (rule.set || []).forEach(f => s.flags[f] = true); s.tension = Math.max(0, s.tension + ((rule.d || {}).tension || 0)); s.trust = Math.max(0, s.trust + ((rule.d || {}).trust || 0)); s.log.push({ who: 'them', text: rule.say }); }
    else { s.log.push({ who: 'them', text: rp.fallback[s.fb % rp.fallback.length] }); s.fb++; }
    if (s.flags[rp.doneF]) s.over = 'good';
    else if (rp.endF && s.flags[rp.endF]) s.over = 'ended';
    else if (s.tension >= 5) { s.over = 'broke'; s.log.push({ who: 'them', text: rp.breakLine }); }
    else if (s.turn >= 7) { s.over = 'timeout'; s.log.push({ who: 'them', text: rp.timeoutLine }); }
    return s;
  }
  function assess(rp, s) { const crit = rp.criteria.map(c => ({ label: c.label, ok: !!c.test(s) })); return { crit, score: crit.filter(c => c.ok).length / crit.length, outcome: s.over }; }

  // ───────── recognition
  const ASSERT_OPTS = ['Fine, whatever. I always end up doing it.', 'I can’t this Saturday; I’ve got plans. I could swap with you for Sunday if that helps.', 'Oh… um, I guess if no one else can, I could maybe try.', 'You always dump your shifts on me. Do it yourself.'];
  const RECOGNISE = [
    { id: 'rf-1', area: 'foundations', prompt: 'Thandi says: “I keep redoing the same slides because the client changes their mind.” Which reply is the best paraphrase?', options: ['You should push back on the client.', 'So the client’s changes mean you’re redoing work you’d already finished?', 'That happens to everyone.', 'Which slides?'], correct: 1, why: 'It reflects her actual point back to her, so she can confirm or correct it. The others advise, dismiss, or jump to detail.' },
    { id: 'rf-2', area: 'foundations', prompt: 'Which of these is an open question?', options: ['Did the meeting go well?', 'Was it the budget?', 'What made the meeting difficult?', 'Are you okay?'], correct: 2, why: '“What made…” invites an explanation; the others can be answered yes or no.' },
    { id: 'rf-3', area: 'foundations', prompt: 'You ask a friend about their new job. They say “It’s… a job,” look away, and change the subject. What is the most reasonable reading?', options: ['They love it but are being modest', 'Something about it may not be going well; worth a gentle check', 'They are angry with you', 'They definitely want to quit'], correct: 1, why: 'The cues suggest something, but don’t prove what. A gentle check lets them tell you; the other readings claim more than the signals support.' },
    { id: 'rp-1', area: 'speaking', prompt: 'Which opening for a talk to new staff is strongest?', options: ['Hi, I’m Sipho and I’ll be talking about safety.', 'Last year, three people here were hurt by something that takes two seconds to prevent. Today I’ll show you what.', 'So, um, let’s get started, I guess.', 'Safety is very important.'], correct: 1, why: 'It opens with a concrete fact that matters to the audience and promises something useful.' },
    { id: 'rp-2', area: 'speaking', prompt: 'Which structure suits a two-minute update to busy colleagues?', options: ['Every detail in date order', 'Main point, two supporting facts, what you need from them', 'Jokes first, then the facts', 'Their questions first, then the update'], correct: 1, why: 'Busy listeners need the point first and a clear ask at the end.' },
    { id: 'ri-1', area: 'interpersonal', prompt: 'A colleague asks you to cover their shift again. Which reply is assertive?', options: ASSERT_OPTS, correct: 1, why: 'It’s clear about what you will and won’t do, gives a reason, and offers an alternative, without attacking or giving in.' },
    { id: 'ri-2', area: 'interpersonal', prompt: 'Same request. Which reply is passive?', options: ASSERT_OPTS, correct: 2, why: 'It hides what you want behind hedges and leaves the other person to decide for you.' },
    { id: 'ri-3', area: 'interpersonal', prompt: 'Same request. Which reply is aggressive?', options: ASSERT_OPTS, correct: 3, why: 'It attacks the person (“you always”) rather than stating what you want. Option 1 is passive-aggressive: resentful but not clear.' },
    { id: 'ri-4', area: 'interpersonal', prompt: 'Which is the most meaningful apology?', options: ['Sorry if you were offended.', 'I’m sorry I missed your presentation. I know it mattered to you; next time I’ll put it in my calendar straight away.', 'Sorry, but I was really busy.', 'Mistakes were made.'], correct: 1, why: 'It names the specific behaviour, acknowledges the effect, and commits to a change — with no “but”.' },
    { id: 'rn-1', area: 'influence', prompt: '“Sign today. If you wait, I can’t promise you won’t regret it for the rest of your life.” What is this?', options: ['Ethical persuasion', 'Manipulation: false urgency and fear', 'Negotiation', 'Neutral information'], correct: 1, why: 'It pressures with fear and a manufactured deadline instead of giving reasons, leaving the other person less free to decide.' },
    { id: 'rn-2', area: 'influence', prompt: 'Your audience is a cost-focused finance manager. Which argument fits best?', options: ['It’ll make the team happier.', 'It will cut overtime costs by about R12 000 a month, based on last quarter.', 'Everyone’s doing it.', 'It’s the right thing to do.'], correct: 1, why: 'It speaks to what this audience cares about, with specific evidence.' },
    { id: 'rg-1', area: 'negotiation', prompt: '“I need the report by Friday because the board meets on Monday morning.” Which part is the position and which the interest?', options: ['“By Friday” is the position; “the board meets Monday” is the interest', 'Both are positions', 'Both are interests', 'Neither'], correct: 0, why: 'The position is the demand; the interest is the reason behind it. Knowing the interest opens options, such as a Sunday-evening delivery.' },
    { id: 'rc-1', area: 'conflict', prompt: 'An upset team member says: “Nobody ever listens to my ideas.” Which reply de-escalates?', options: ['That’s not true, we used your idea last month.', 'It sounds like you’ve felt overlooked. Which idea are you thinking of?', 'Calm down, it’s just a meeting.', 'Maybe your ideas need more work.'], correct: 1, why: 'It acknowledges the feeling and asks for specifics. Arguing with “nobody ever” is accurate but escalates.' },
    { id: 'rl-1', area: 'leadership', prompt: 'Which meeting opening sets a clear objective?', options: ['Let’s just see where we get to.', 'Today we need to decide the launch date. We have 30 minutes, and I want to hear from everyone.', 'Has everyone read the agenda?', 'Who wants to start?'], correct: 1, why: 'It names the decision, the time and how the discussion will run.' },
    { id: 'rl-2', area: 'leadership', prompt: 'Which delegation is clear?', options: ['Can someone look at the supplier thing?', 'Zanele, please compare the three supplier quotes and send me a recommendation by Thursday noon. Ask me if the budget limits are unclear.', 'Sort out the suppliers when you can.', 'We should probably think about suppliers.'], correct: 1, why: 'It names the person, the task, the expected result, the deadline and where to get help.' }];

  // ───────── written drafting (transparent checklists; a draft can meet every check and still need your judgement)
  const CH = {
    greeting: { label: 'Opens with a greeting', test: t => /\b(hi|hello|dear|good (morning|afternoon|evening)|hey)\b/.test(t) },
    close: { label: 'Closes politely', test: t => /\b(thanks|thank you|regards|best|kind regards|cheers|speak soon|warm wishes)\b/.test(t) },
    question: { label: 'Asks a question', test: t => t.includes('?') },
    specificQ: { label: 'Asks something specific (which, what exactly, an example)', test: t => /\b(which|what exactly|what specifically|for example|an example|do you mean|such as)\b/.test(t) },
    reason: { label: 'Gives a reason', test: t => /\b(because|as i|since|due to|the reason)\b/.test(t) },
    decline: { label: 'Says no clearly', test: t => /(can't|cannot|won't be able|not able|unable|have to say no|need to say no|decline|not going to be able)/.test(t) },
    alternative: { label: 'Offers an alternative or next step', test: t => /\b(instead|alternatively|happy to|what i can do|i could|i can help|could we|i'd be glad|i would be glad|next year|another time)\b/.test(t) },
    sorryMax1: { label: 'At most one apology', test: t => (t.match(/sorry/g) || []).length <= 1 },
    noHedge: { label: 'No hedging or minimising yourself', test: t => !MOVES.passive.some(p => t.includes(p)) },
    noAggr: { label: 'No blame or hostility', test: t => !MOVES.blame.some(p => t.includes(p)) && !/!{2,}/.test(t) },
    proposal: { label: 'Makes a concrete proposal', test: t => MOVES.proposal.some(p => t.includes(p)) },
    timeframe: { label: 'Gives a specific timeframe or date', test: t => /\b(\d+|monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|week|month|january|february|march|april|may|june|july|august|september|october|november|december)\b/.test(t) },
    positive: { label: 'Names something that works, specifically', test: t => /\b(clear|well|strong|good|useful|helpful|liked|works)\b/.test(t) },
    issue: { label: 'Names the specific issue', test: t => /\b(long|length|pages|section|shorter|cut|too much|detail)\b/.test(t) },
    iview: { label: 'Speaks from your own view (I-statement)', test: t => MOVES.istatement.some(p => t.includes(p)) || /\bi('m| am| was| would| will)\b/.test(t) },
    hook: { label: 'Opens with something concrete (a question, a number or a short scene)', test: (t, raw) => { const first = String(raw).split(/(?<=[.!?])\s|\n/)[0] || ''; return /\?|\d|imagine|last (week|year|month)|picture/i.test(first); } },
    points: { label: 'Two to four main points, signposted', test: t => (t.match(/\b(first|second|third|next|finally|another|also)\b/g) || []).length >= 2 },
    ask: { label: 'Ends with what you want the audience to do', test: (t, raw) => { const last = String(raw).trim().split(/\n|(?<=[.!?])\s/).slice(-2).join(' ').toLowerCase(); return /(so |please|let's|i'm asking|i am asking|we should|try|start|join|sign|agree)/.test(last); } },
    decision: { label: 'States the decision', test: t => /\b(decided|agreed|decision|we will launch|launch date)\b/.test(t) },
    actions: { label: 'Lists at least two actions with owners', test: (t, raw) => (String(raw).match(/\b[A-Z][a-z]+ (will|to)\b/g) || []).length + (String(raw).match(/^\s*[-•*]\s/gm) || []).length >= 2 },
    deadline: { label: 'Gives a deadline', test: t => /\bby\b.{0,25}\b(\d|monday|tuesday|wednesday|thursday|friday|today|tomorrow|end of|noon)/.test(t) },
    output: { label: 'Says what the result should look like', test: t => /\b(send|summary|one page|one-page|table|draft|list|recommendation|figures|spreadsheet)\b/.test(t) },
    support: { label: 'Offers support or a check-in', test: t => /\b(ask me|check in|any questions|questions|let me know|happy to help|shout)\b/.test(t) },
    specificApology: { label: 'Apologises for the specific behaviour', test: t => /sorry|apologis|apologiz/.test(t) && /\b(voice|interrupt|tone|raised|shout|snapped|cut you off|spoke over)\b/.test(t) },
    noBut: { label: 'No “but” straight after the apology', test: t => !/(sorry|apologi[sz]e)[^.]{0,40}\bbut\b/.test(t) },
    keepsRequest: { label: 'Keeps the original request', test: t => /\b(reply|respond|answer|get back)\b/.test(t) },
    clearRequest: { label: 'Makes a clear request', test: t => /\b(could we|can we|i'd like|i would like|i need|please|i'm asking|would you)\b/.test(t) },
    interest: { label: 'Speaks to the other side’s interest', test: t => /\b(empty|secur|paint|repair|look after|keep an eye|keys|cover|rota|client|budget|cost)\b/.test(t) },
    concern: { label: 'Addresses the likely concern', test: t => /\b(cover|client|productiv|measure|review|rota|on call|results)\b/.test(t) },
    noPressure: { label: 'No pressure tactics', test: t => !/\b(must|or else|everyone else|last chance|regret)\b/.test(t) } };
  const DRAFTS = [
    { id: 'dr-clarify', area: 'foundations', title: 'Ask for clarification', brief: 'A client emails: “Please make the report more impactful.” Reply asking what they mean, without sounding defensive.', checks: ['greeting', 'question', 'specificQ', 'noAggr', 'close'], words: [25, 130] },
    { id: 'dr-feedback', area: 'foundations', title: 'Give constructive feedback', brief: 'A colleague’s report is clear but twice as long as it needs to be. Write them feedback.', checks: ['greeting', 'positive', 'issue', 'proposal', 'noAggr'], words: [30, 160] },
    { id: 'dr-talk', area: 'speaking', title: 'Structure a two-minute talk', brief: 'Write the outline of a two-minute talk persuading your team to use a shared calendar.', checks: ['hook', 'points', 'reason', 'ask'], words: [80, 320] },
    { id: 'dr-decline', area: 'interpersonal', title: 'Decline a request', brief: 'You’ve been asked to organise the end-of-year party again. Decline by email.', checks: ['greeting', 'decline', 'reason', 'sorryMax1', 'noHedge', 'alternative', 'close'], words: [30, 150] },
    { id: 'dr-rewrite-aggr', area: 'interpersonal', title: 'Rewrite an aggressive message', brief: 'Rewrite this so it keeps the request but drops the hostility:', original: 'This is the third time you’ve ignored my emails. Do your job and reply today!!', checks: ['noAggr', 'keepsRequest', 'iview', 'timeframe'], words: [15, 100] },
    { id: 'dr-rewrite-pass', area: 'interpersonal', title: 'Rewrite a passive message', brief: 'Rewrite this so the request is clear, without the hedging:', original: 'Sorry to bother you, I know you’re busy, it’s probably nothing, but if it’s not too much trouble maybe we could possibly look at my workload at some point? No worries if not!', checks: ['clearRequest', 'sorryMax1', 'noHedge', 'timeframe'], words: [10, 60] },
    { id: 'dr-proposal', area: 'influence', title: 'Propose a trial', brief: 'Email your manager proposing a one-month trial of remote Fridays.', checks: ['greeting', 'proposal', 'timeframe', 'reason', 'concern', 'noPressure', 'close'], words: [50, 200] },
    { id: 'dr-offer', area: 'negotiation', title: 'Make an offer that serves both', brief: 'Message a landlord proposing a later move-in date in exchange for something that helps them.', checks: ['greeting', 'proposal', 'interest', 'timeframe', 'close'], words: [30, 150] },
    { id: 'dr-after', area: 'conflict', title: 'After a heated meeting', brief: 'You raised your voice at a colleague in a meeting. Message them.', checks: ['specificApology', 'noBut', 'iview', 'proposal'], words: [25, 140] },
    { id: 'dr-delegate', area: 'leadership', title: 'Delegate clearly', brief: 'Ask a colleague to prepare a budget summary for Thursday’s meeting.', checks: ['clearRequest', 'output', 'deadline', 'support'], words: [25, 130] },
    { id: 'dr-summary', area: 'leadership', title: 'Summarise a meeting', brief: 'The meeting agreed to launch on 21 March, with testing signed off by 17 March. Write the summary with actions and owners.', checks: ['decision', 'timeframe', 'actions', 'deadline'], words: [15, 180] }];
  function checkDraft(d, raw) { const t = String(raw || '').toLowerCase().replace(/[’‘]/g, "'"); const n = (String(raw).match(/\S+/g) || []).length;
    const res = d.checks.map(k => ({ id: k, label: CH[k].label, ok: !!CH[k].test(t, raw) }));
    res.push({ id: 'length', label: `Between ${d.words[0]} and ${d.words[1]} words (you wrote ${n})`, ok: n >= d.words[0] && n <= d.words[1] });
    return { checks: res, score: res.filter(c => c.ok).length / res.length, words: n }; }

  // ───────── speaking aloud (timer + self-review; nothing is recorded or analysed until the voice system exists)
  const SPEAK = [
    { id: 'sp-kid', area: 'speaking', title: 'Explain it to a ten-year-old', prompt: 'Explain what you do, or what you study, to a ten-year-old.', seconds: 30, review: ['I made one main point', 'I used an everyday example', 'I avoided jargon', 'I ended clearly rather than trailing off', 'I kept going when I stumbled'] },
    { id: 'sp-update', area: 'speaking', title: 'A one-minute update', prompt: 'Give a one-minute update on something you’re working on: where it stands, one problem, and what you need.', seconds: 60, review: ['I led with where it stands', 'I named one problem clearly', 'I said what I need', 'I didn’t pad with filler', 'I finished within the time'] }];

  const REAL = [
    { id: 'rl-paraphrase', area: 'foundations', text: 'In one conversation today, reflect back what someone said before you respond.' },
    { id: 'rl-open', area: 'foundations', text: 'Ask one open question you’d normally skip, and listen to the whole answer.' },
    { id: 'rl-update', area: 'speaking', text: 'Give a short update in a meeting, leading with the main point.' },
    { id: 'rl-no', area: 'interpersonal', text: 'Decline one small request plainly, without over-apologising.' },
    { id: 'rl-apology', area: 'interpersonal', text: 'If you owe someone an apology, make it specific and without “but”.' },
    { id: 'rl-concern', area: 'influence', text: 'Before making a suggestion, ask what would concern the other person about it.' },
    { id: 'rl-interest', area: 'negotiation', text: 'In a small disagreement about what to do, ask why the other person prefers their option.' },
    { id: 'rl-ack', area: 'conflict', text: 'When someone is frustrated with you, acknowledge the feeling before explaining yourself.' },
    { id: 'rl-invite', area: 'leadership', text: 'In a group, invite someone who hasn’t spoken by name.' }];

  // ───────── the seven-stage pathway per area, from recorded practice only
  const STAGES = [['understand', 'Understand the skill'], ['recognise', 'Recognise it in examples'], ['guided', 'Practise with guidance'], ['scenarios', 'Practise in realistic scenarios'], ['independent', 'Apply independently'], ['unfamiliar', 'Apply in unfamiliar or harder situations'], ['consistent', 'Show it consistently']];
  const DAY = 864e5;
  function pathway(area, log) {
    const L = log.filter(e => e.area === area); const recog = L.filter(e => e.kind === 'recognise'); const needR = Math.min(2, RECOGNISE.filter(r => r.area === area).length);
    const rps = L.filter(e => e.kind === 'roleplay' && e.done); const drafts = L.filter(e => e.kind === 'draft'); const speaks = L.filter(e => e.kind === 'speak');
    const indep = [].concat(rps.filter(e => !e.coach && e.score >= 0.75).map(e => Object.assign({ m: 'roleplay', key: e.rid }, e)), drafts.filter(e => e.score >= 0.99).map(e => Object.assign({ m: 'draft', key: e.did }, e)), speaks.filter(e => e.selfScore >= 0.8).map(e => Object.assign({ m: 'speak', key: e.sid }, e)));
    const seenBefore = (e) => L.some(x => x.t < e.t && ((x.rid && x.rid === e.rid) || (x.did && x.did === e.did) || (x.sid && x.sid === e.sid)));
    const met = {
      understand: L.some(e => e.kind === 'card'),
      recognise: recog.filter(e => e.ok).length >= needR && needR > 0,
      guided: rps.some(e => e.coach) || drafts.length > 0,
      scenarios: rps.length > 0 || speaks.length > 0,
      independent: indep.length >= 1,
      unfamiliar: indep.some(e => !seenBefore(e) && (RP[e.rid] ? RP[e.rid].lvl >= 3 : true)),
      consistent: indep.length >= 3 && new Set(indep.map(e => e.m)).size >= 2 && new Set(indep.map(e => Math.floor(e.t / DAY))).size >= 2 };
    let stage = null; for (const [k] of STAGES) { if (met[k]) stage = k; else break; }
    return { met, stage, counts: { recognised: recog.filter(e => e.ok).length, roleplays: rps.length, independent: indep.length, real: L.filter(e => e.kind === 'real').length } };
  }

  // ───────── evidence for the Improvement Workshop
  const CM_DETECT = [
    { id: 'cm-noack', name: 'Solving before acknowledging', applies: e => e.kind === 'roleplay' && e.done && (RP[e.rid] || {}).tags && RP[e.rid].tags.includes('emotion'), occurs: e => { const f = (e.turns || [])[0]; return !!f && !['ack', 'empathy', 'paraphrase', 'cue'].some(m => f.moves.includes(m)) && ['advice', 'proposal', 'reason', 'refuse'].some(m => f.moves.includes(m)); },
      explain: 'When the other person was upset or under pressure, your first reply went to solutions, reasons or advice before acknowledging how they felt.', why: 'People rarely hear a solution while they feel unheard. Acknowledging first is what lets the rest of what you say land.', practise: ['listen-problem', 'customer', 'criticism'] },
    { id: 'cm-nointerest', name: 'Proposing before asking what matters to them', applies: e => e.kind === 'roleplay' && e.done && (RP[e.rid] || {}).tags && RP[e.rid].tags.some(t => t === 'negotiation' || t === 'persuasion'), occurs: e => { const T = e.turns || []; const p = T.findIndex(t => t.moves.includes('proposal')); const i = T.findIndex(t => t.moves.includes('interest') || t.moves.includes('openq')); return p >= 0 && (i < 0 || p < i); },
      explain: 'In negotiation and persuasion, you made a proposal before finding out what the other person cared about.', why: 'Proposals shaped around the other person’s interests are the ones that get accepted. Without asking, you’re guessing.', practise: ['rent', 'budget', 'pitch'] }];
  function commCandidates(log, targets) {
    const out = [];
    CM_DETECT.forEach(d => { const app = log.filter(e => d.applies(e)).slice(-12); const occ = app.filter(e => d.occurs(e)); if (!occ.length) return;
      const rate = occ.length / app.length; const level = occ.length >= 4 && rate >= 0.4 && app.length >= 6 ? 'established' : occ.length >= 2 && rate >= 0.3 ? 'emerging' : occ.length >= 2 ? 'occasional' : 'single';
      const t = targets.find(x => x.key === d.id && x.state !== 'mastered'); if (t && t.state !== 'dismissed') return; if (t && occ.length <= (t.dismissedAt || 0)) return;
      out.push({ key: d.id, title: d.name, explain: d.explain, why: d.why, level, count: occ.length, of: app.length, rate, source: 'Communicate', needsConsent: level === 'single' || level === 'occasional', reopened: !!t, practise: d.practise,
        evidence: occ.slice(-3).reverse().map(e => ({ t: e.t, roleplayId: e.rid, title: (RP[e.rid] || {}).title, excerpt: ((e.turns || [])[0] || {}).text || '', line: 'Your first reply: ' + ((e.turns || [])[0] || { moves: [] }).moves.map(m => MOVE_NAMES[m]).join(', ') })) }); });
    return out;
  }
  const cmOccurred = (key, e) => { const d = CM_DETECT.find(x => x.id === key); if (!d || !d.applies(e)) return null; return !!d.occurs(e); };
  function cmSet(t, log, phase, now) {
    const d = CM_DETECT.find(x => x.id === t.key); const pool = ROLEPLAYS.filter(r => d.applies({ kind: 'roleplay', done: true, rid: r.id }));
    const used = new Set(t.practice.flatMap(s => s.games || [])); const tried = new Set(log.filter(e => e.kind === 'roleplay').map(e => e.rid));
    const rank = r => (phase === 'reassess' && used.has(r.id) ? 2 : 0) + (tried.has(r.id) ? 1 : 0);
    const pick = pool.slice().sort((a, b) => rank(a) - rank(b) || a.lvl - b.lvl).slice(0, 2);
    const n = phase === 'reassess' ? t.reassess.length : t.practice.length;
    return { id: `imp-${phase === 'reassess' ? 'r' : 'p'}-${t.id}-${n}`, type: 'commset', improve: { targetId: t.id, phase }, createdAt: now, coach: phase !== 'reassess', items: pick.map(r => ({ game: r.id, rid: r.id, state: 'pending' })),
      objective: phase === 'reassess' ? 'A check in role-play, without coaching. Respond as you normally would.' : `Targeted role-play for “${t.title}”, with coaching on.` };
  }

  const api = { AREAS, AREA, MOVES, MOVE_NAMES, detect, ROLEPLAYS, RP, start, reply, assess, RECOGNISE, DRAFTS, CH, checkDraft, SPEAK, REAL, STAGES, pathway, CM_DETECT, commCandidates, cmOccurred, cmSet };
  if (isNode) module.exports = api; else root.MWC = api;
})(this);
