/* MINDWORK — adaptive AI conversation, honest feedback, and the character framework (Grow › Your character). */
(function () {
  const U = window.MWUI, A = window.MWAI, CH = window.MWCH, E = window.MW;
  const { S, DB, esc, $, toast, glyph } = U;
  S.aiPrefs = { consent: false, goals: false }; S.ai = []; S.character = { stance: {}, wording: {}, why: {}, reviewed: null };
  let CUR = null, busy = null;
  U.onLoad.push(async () => {
    S.aiPrefs = (await DB.get('kv', 'ai-prefs')) || S.aiPrefs; S.ai = (await DB.get('kv', 'aisessions')) || []; S.character = Object.assign(S.character, (await DB.get('kv', 'character')) || {}); CUR = (await DB.get('kv', 'ai-current')) || null;
    A.detect().then(() => { if (/^#(explore|talk|deep|convo|prefs|communicate)/.test(location.hash)) U.route(); });
  });
  const save = (k, v) => DB.put('kv', k, v).catch(e => toast('Couldn’t save: ' + ((e && e.message) || 'storage error')));
  const saveCur = () => save('ai-current', CUR);
  const ready = () => A.client.provider !== 'none' && S.aiPrefs.consent;
  const goals = () => S.aiPrefs.goals ? CH.goalsFor(S.character) : [];

  // ───────── availability and consent (shared by every AI page)
  function gate(alt) {
    if (A.client.provider === 'none') return `<section class="panel ai-gate"><h2>AI conversation isn’t available here</h2>
      <p>This needs a language model. MINDWORK can use one in two ways: on the hosted page at claude.ai (through your own Claude account, asked for permission first), or in the downloaded app when you start it with your own API key (<code>ANTHROPIC_API_KEY=… python3 serve.py</code>). Neither is available in this copy${navigator.onLine === false ? ', and you’re offline' : ''}.</p>
      <p>Nothing here is simulated: without a model, MINDWORK doesn’t pretend to understand what you write. ${alt || ''}</p></section>`;
    if (!S.aiPrefs.consent) return `<section class="panel ai-gate"><h2>Before you start</h2>${consentText()}<div class="row"><button class="btn primary" data-action="ai-consent">Allow AI for these exercises</button><a class="btn ghost" href="#prefs">Settings</a></div></section>`;
    return '';
  }
  function consentText() {
    return `<p><strong>What is sent:</strong> only the exercise you’re doing and what you write in it${S.aiPrefs.goals ? ', plus the development goals you’ve chosen in “Your character”' : ''}. Never your journal, books, notes, real-life notes, other exercises or history.</p>
      <p><strong>Where:</strong> ${A.client.provider === 'claude' ? 'to Claude, through your claude.ai account. Each request uses your own Claude usage, and claude.ai asks your permission the first time.' : 'to Anthropic, through the server running this copy of MINDWORK, using its key.'} Conversations are kept on this device; nothing is stored on a MINDWORK server.</p>
      <p><strong>Without AI:</strong> every other part of MINDWORK keeps working offline, with rules-based feedback that says what it can and cannot judge.</p>`;
  }
  // Settings section
  const prefsOrig = U.routes.prefs, prefsAfter = U.routes.prefs.after;
  U.routes.prefs = () => prefsOrig() + `<section class="panel" id="aiPrefs"><h2>AI conversation</h2>
    <p>${A.client.provider === 'none' ? 'Not available in this copy (no model is reachable).' : `Available: ${esc(A.client.detail)}.`}</p>
    ${A.client.provider !== 'none' ? consentText() : ''}
    <label class="check"><input type="checkbox" id="aiConsent" ${S.aiPrefs.consent ? 'checked' : ''} ${A.client.provider === 'none' ? 'disabled' : ''}><span>Use AI for open conversations, Deep Thinking exploration and AI feedback</span></label>
    <label class="check"><input type="checkbox" id="aiGoals" ${S.aiPrefs.goals ? 'checked' : ''} ${A.client.provider === 'none' ? 'disabled' : ''}><span>Include my chosen development goals (from “Your character”) so feedback can relate to them</span></label>
    <p class="muted small">${S.ai.length} AI session${S.ai.length === 1 ? '' : 's'} kept on this device.</p></section>`;
  U.routes.prefs.after = prefsAfter;
  document.addEventListener('change', e => {
    if (e.target.id === 'aiConsent') { S.aiPrefs.consent = e.target.checked; save('ai-prefs', S.aiPrefs); toast(S.aiPrefs.consent ? 'AI exercises on.' : 'AI exercises off.'); }
    if (e.target.id === 'aiGoals') { S.aiPrefs.goals = e.target.checked; save('ai-prefs', S.aiPrefs); }
  });

  // ───────── entry points inside existing environments (their own content is untouched)
  const wrap = (name, html) => { const o = U.routes[name], after = o.after; U.routes[name] = (...a) => { const out = o(...a); return typeof out === 'string' ? out.replace(/(<\/header>)/, '$1' + html()) : out; }; U.routes[name].after = after; };
  wrap('deep', () => `<section class="panel row-panel ai-entry"><div><h2>Explore a question with AI</h2><p class="muted">The same eight directions, followed adaptively: it can explain the question another way, follow where your thinking goes, or skip what you’ve already covered. ${A.client.provider === 'none' ? 'Needs AI, which isn’t available in this copy.' : ''}</p></div><a class="btn" href="#explore">Open</a></section>`);
  wrap('convo', () => `<section class="panel row-panel ai-entry"><div><h2>Open conversation with AI</h2><p class="muted">A conversation partner that responds to whatever you actually say, with feedback at the end rather than after every turn. ${A.client.provider === 'none' ? 'Needs AI, which isn’t available in this copy.' : ''}</p></div><a class="btn" href="#talk">Open</a></section>`);

  // ───────── Deep Thinking exploration
  const THEMED = [
    { id: 'th-honesty', q: 'Is it always necessary to tell the truth?', clarify: 'Whether honesty has limits: does it require sharing every thought, and is withholding something different from lying?', quality: 'honesty' },
    { id: 'th-kind', q: 'How do kindness and honesty coexist?', clarify: 'Whether you can be both truthful and kind when the truth is unwelcome, and what that looks like in practice.', quality: 'straight' },
    { id: 'th-please', q: 'When does avoiding the truth become people-pleasing?', clarify: 'Where the line is between tact and saying what people want to hear to avoid discomfort.', quality: 'honesty' },
    { id: 'th-home', q: 'What makes a place feel like home?', clarify: 'Not the building itself, but what makes someone feel they belong somewhere: people, safety, familiarity, being free to be yourself, or something else.' }];
  // existing Deep Thinking questions first (with a clarification where one is written below), then themed ones not already present
  const deepQs = () => { const base = E.itemsFor('deep').map(it => { const q = E.promptText(it); const t = THEMED.find(x => x.q === q); return { id: it.id, q, clarify: t ? t.clarify : '' }; }); return base.concat(THEMED.filter(t => !base.some(b => b.q === t.q))); };
  U.routes.explore = () => {
    const g = gate('The structured eight-stage Deep Thinking sessions work offline: <a class="link" href="#deep">open Deep Thinking</a>.');
    const past = S.ai.filter(s => s.kind === 'deep').slice(-5).reverse();
    return `<header class="page-head"><a href="#deep" class="link">Deep Thinking</a><h1 class="display sm">Explore a question</h1><p class="lede">A conversation that follows your thinking. Eight directions guide it (${A.DIRECTIONS.map(d => d[1].toLowerCase()).join(', ')}), but not as a fixed sequence.</p></header>
      ${g || (CUR && CUR.kind === 'deep' && !CUR.done ? `<section class="panel row-panel continue-strip"><div><h2>Continue</h2><p>${esc(CUR.title)}</p></div><a class="btn primary" href="#explore-run">Continue</a></section>` : '') + `
      <section class="panel"><h2>Choose a question</h2><ul class="rp-list">${deepQs().map(x => `<li><span>${esc(x.q)}</span><button class="btn small" data-action="ai-deep-start" data-id="${x.id}">Explore</button></li>`).join('')}</ul>
      <label class="field labelled"><span>Or your own question</span><input id="ownQ" type="text" maxlength="200"></label><button class="btn" data-action="ai-deep-start" data-id="own">Explore my question</button></section>`}
      ${past.length ? `<section class="panel"><h2>Earlier explorations</h2><ul class="recent">${past.map(s => `<li><span class="dot" style="--c:var(--purple)"></span><a href="#ai-${s.id}">${esc(s.title)}</a><span class="muted">${U.fmtDate(s.t)}</span></li>`).join('')}</ul></section>` : ''}`;
  };
  // ───────── open conversation
  const SCEN = [
    { id: 'dog', title: 'A friend’s new dog', context: 'personal', persona: 'You are Naledi, a friend in her thirties. You and your partner adopted a rescue dog called Biscuit last month. She is sweet but scared of almost everything (the vacuum, men in hats, the kettle). You’re happy but a bit worn out. You enjoy talking about her but also have other things going on.', opener: 'We finally got a dog last month!', openerXh: 'Ekugqibeleni sifumene inja kwinyanga ephelileyo!' },
    { id: 'support', title: 'Someone who needs support, not advice', context: 'personal', persona: 'You are Sipho, a friend. Your father was admitted to hospital yesterday and the doctors are still running tests. You’re anxious and tired. You don’t want solutions or reassurance that everything will be fine; you want someone to listen. If people jump to advice you go quieter.', opener: 'Sorry I’ve been quiet. Dad’s in hospital. They don’t know what it is yet.', openerXh: 'Uxolo ndithe cwaka. UTata usesibhedlele. Abakayazi ukuba yintoni.' },
    { id: 'weakidea', title: 'A colleague’s weak idea', context: 'professional', persona: 'You are Johan, a keen colleague. You want to replace the team’s weekly meeting with a daily 30-minute video call to “improve alignment”. You’re attached to the idea and slightly defensive, but you respect honest reasons. The team is already overloaded.', opener: 'So, what do you think of my daily-call idea? Honestly.', openerXh: 'Ke, ucinga ntoni ngengcamango yam yomnxeba wemihla ngemihla? Ngokunyanisekileyo.' },
    { id: 'boundary', title: 'A friend who keeps crossing a line', context: 'personal', persona: 'You are Lindiwe, a friend who has borrowed money three times and repaid late each time. You’re asking again, warmly, and you tend to guilt-trip a little if refused. You are not a bad person and you can accept a clear, kind no.', opener: 'Hey, could you lend me R1 500 until month-end? I’ll pay you back properly this time, promise.', openerXh: 'Heyi, ungandiboleka i-R1 500 de kuphele inyanga? Ndiza kukubuyisela kakuhle ngeli xesha, ndiyathembisa.' },
    { id: 'newperson', title: 'Meeting someone new', context: 'personal', persona: 'You are Thabo, at a friend’s birthday braai. You know the host from rock climbing. You’re friendly but a little reserved at first and warm up if the conversation is genuine. You have opinions about climbing, cooking and Cape Town traffic.', opener: 'Hi. I don’t think we’ve met. How do you know Ayanda?', openerXh: 'Molo. Andiqondi ukuba sakha sadibana. UAyanda umazi njani?' },
    { id: 'feedback', title: 'Giving honest feedback to a friend', context: 'personal', persona: 'You are Zanele, a friend who has written a toast for her sister’s wedding and wants honest feedback. The toast is too long and full of private jokes most guests won’t get. You’re nervous and a bit hopeful you’ll be told it’s perfect, but you do want the truth.', opener: 'Okay, I’ve read you the whole toast. Be honest. Is it good?', openerXh: 'Kulungile, ndikufundele yonke intetho. Nyaniseka. Ilungile?' }];
  U.routes.talk = () => {
    const g = gate('The Conversation Lab’s branching conversations and the role-plays in Communicate work offline: <a class="link" href="#convo">Conversation Lab</a>.');
    const pat = A.convoPatterns(S.ai);
    return `<header class="page-head"><a href="#convo" class="link">Conversation Lab</a><h1 class="display sm">Open conversation</h1><p class="lede">Talk naturally. The other person responds to what you actually say, and feedback comes when you finish, not after every message.</p></header>
      ${g || (CUR && CUR.kind === 'convo' && !CUR.done ? `<section class="panel row-panel continue-strip"><div><h2>Continue</h2><p>${esc(CUR.title)}</p></div><a class="btn primary" href="#talk-run">Continue</a></section>` : '') + `
      <section class="panel"><h2>Choose a situation</h2><ul class="rp-list">${SCEN.map(x => `<li><div><strong>${esc(x.title)}</strong><span class="muted small">They open with: “${esc(x.opener)}”</span></div><button class="btn small" data-action="ai-talk-start" data-id="${x.id}">Start</button></li>`).join('')}</ul></section>`}
      <section class="panel"><h2>Patterns across your conversations</h2>${pat.enough ? `<p class="muted small">From ${pat.n} conversations (${pat.turns} of your turns). You used ${pat.range} of ${Object.keys(A.CONVO_MOVES).length} kinds of move.</p>${pat.notes.length ? `<ul class="plain-list">${pat.notes.map(n => `<li>${esc(n.text)}</li>`).join('')}</ul>` : '<p>No recurring pattern stands out yet.</p>'}` : `<p class="muted">Patterns appear after three finished conversations with AI feedback (${pat.n} so far). One conversation isn’t evidence of a habit.</p>`}</section>`;
  };

  // ───────── the running session (shared by both kinds)
  function chatHTML() {
    const s = CUR; const deep = s.kind === 'deep';
    return `<div class="rp ai-run"><header class="page-head"><a href="#${deep ? 'explore' : 'talk'}" class="link">${deep ? 'Explore a question' : 'Open conversation'}</a><h1 class="display sm">${esc(s.title)}</h1>
      ${deep ? `<ol class="dirs" aria-label="Directions explored">${A.DIRECTIONS.map(([k, n]) => `<li class="${(s.covered || []).includes(k) ? 'met' : ''}">${esc(n)}</li>`).join('')}</ol>` : `<p class="muted">${s.kind === 'group' ? 'With ' + esc(s.people.map(x => x.name).join(', ')) + '. ' + esc(s.setting) : 'You’re talking with ' + esc(s.persona.split(',')[0].replace('You are ', ''))}. No coaching during the conversation.</p>`}</header>
      <div class="rp-body"><div class="chat" aria-live="polite">${s.turns.map(t => `<div class="bubble ${t.who === 'you' ? 'you' : 'them'}">${t.speaker ? `<span class="who">${esc(t.speaker)}</span> ` : ''}${esc(t.text)}</div>`).join('')}${busy ? `<div class="bubble them thinking">Thinking…</div>` : ''}</div>
      ${s.error ? `<p class="warn">${esc(s.error)} <button class="btn small" data-action="ai-retry">Try again</button></p>` : ''}
      ${s.feedback ? feedbackHTML(s) : `<div class="rp-input"><label class="field"><span>${deep ? 'Your thinking' : 'Your reply'}</span><textarea id="aiText" rows="3" ${busy ? 'disabled' : ''}></textarea></label>
        <div class="row"><button class="btn primary" data-action="ai-send" ${busy ? 'disabled' : ''}>Send</button>${busy ? '<button class="btn ghost" data-action="ai-stop">Stop</button>' : ''}<button class="btn ghost" data-action="ai-finish" ${busy || s.turns.filter(t => t.who === 'you').length < 1 ? 'disabled' : ''}>${deep ? 'Finish and get feedback' : 'End conversation and get feedback'}</button></div>
        ${deep && s.ready ? '<p class="muted small">This looks like a natural place to finish, but you can keep going.</p>' : ''}</div>`}</div>
      <p class="muted small">AI-generated. It can be wrong. ${A.client.provider === 'claude' ? 'Runs on your Claude account.' : 'Runs through this computer’s key.'}</p></div>`;
  }
  U.routes['explore-run'] = () => gate() || (CUR && CUR.kind === 'deep' ? chatHTML() : '<section class="panel"><p>No exploration in progress.</p><a class="btn" href="#explore">Choose a question</a></section>');
  U.routes['talk-run'] = () => gate() || (CUR && (CUR.kind === 'convo' || CUR.kind === 'group') ? chatHTML() : '<section class="panel"><p>No conversation in progress.</p><a class="btn" href="#talk">Choose a situation</a></section>');
  U.routes.ai = id => { const s = S.ai.find(x => x.id === id); if (!s) return '<section class="panel"><p>Not found.</p></section>'; const keep = CUR; CUR = s; const h = chatHTML(); CUR = keep; return h; };

  // ───────── honest feedback display
  function feedbackHTML(s) {
    const f = s.feedback; const sec = (h, body) => body ? `<section class="fb-sec"><h3>${h}</h3>${body}</section>` : '';
    const quote = e => e ? `<span class="evq">“${esc(e)}”</span>` : '';
    const qualName = id => (CH.BY[id] || {}).name || id;
    return `<section class="panel ai-fb"><h2>Feedback</h2><p class="serif">${esc(f.summary)}</p>
      ${sec('What worked', f.strengths.length ? `<ul>${f.strengths.map(x => `<li>${esc(x.point)} ${quote(x.evidence)}</li>`).join('')}</ul>` : '<p class="muted">Nothing is singled out as a strength here. That isn’t a judgement either way.</p>')}
      ${sec('What to develop', f.development.length ? `<ul>${f.development.map(x => `<li>${esc(x.point)} ${quote(x.evidence)}${x.why ? `<span class="why">Why it matters: ${esc(x.why)}</span>` : ''}${x.try ? `<span class="try">Try: ${esc(x.try)}</span>` : ''}</li>`).join('')}</ul>` : '<p>No development point is supported by the evidence in this one. That is a real result, not politeness.</p>')}
      ${sec('What I’m inferring', f.inferred.length ? `<ul>${f.inferred.map(x => `<li>${esc(x.point)} <span class="conf">${x.confidence} confidence</span></li>`).join('')}</ul>` : '')}
      ${sec('What I’m unsure about', f.uncertain.length ? `<ul>${f.uncertain.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '')}
      ${sec('What text alone can’t show', f.cannot_assess.length ? `<ul>${f.cannot_assess.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '')}
      ${f.qualities.length ? sec('Your development goals', `<ul>${f.qualities.map(x => `<li><strong>${esc(qualName(x.id))}</strong> ${x.direction === 'shown' ? 'may have shown here' : x.direction === 'imbalance' ? 'one possibility worth exploring' : 'unclear'}: ${esc(x.note || '')} ${quote(x.evidence)}</li>`).join('')}</ul><p class="muted small">Possibilities from one interaction, not conclusions about you.</p>`) : ''}
      ${(f.competencies || []).length ? sec('Abilities this showed or found difficult', `<ul>${f.competencies.map(c => `<li>${esc((window.MWCP.BY[c.id] || { name: c.id }).name)}: ${c.result === 'demonstrated' ? 'shown' : 'difficult' + (c.difficulty_type && window.MWCP.DIFFICULTIES[c.difficulty_type] ? ' (' + esc(window.MWCP.DIFFICULTIES[c.difficulty_type].toLowerCase()) + ')' : '')} <span class="evq">“${esc(c.evidence)}”</span></li>`).join('')}</ul>`) : ''}
      ${f.next_challenge ? sec('A next challenge', `<p>${esc(f.next_challenge)}</p>`) : ''}
      ${f.question_for_you ? sec('A question for you', `<p class="serif">${esc(f.question_for_you)}</p>`) : ''}
      ${f.removed.length ? `<p class="muted small">${f.removed.length} point${f.removed.length === 1 ? ' was' : 's were'} removed because the quoted evidence wasn’t in your words.</p>` : ''}
      <div class="fb-react"><p class="rp-q">Does this reflect what you intended?</p>${s.reaction ? `<p class="muted">You said: ${esc(s.reaction.text || s.reaction.v)}</p>` : `<div class="row"><button class="btn small" data-action="ai-react" data-v="Yes, mostly">Yes, mostly</button><button class="btn small" data-action="ai-react" data-v="Partly">Partly</button><button class="btn small" data-action="ai-react" data-v="No">No</button></div><label class="field"><span>Anything it got wrong? (Kept with this session.)</span><textarea id="aiReact" rows="2"></textarea></label>`}</div>
      <div class="row">${s.sessionId && AISET && AISET.id === s.sessionId ? (setNext() ? '<button class="btn primary" data-action="ai-set-next">Next conversation in the set</button>' : '<a class="btn primary" href="#improve" data-action="ai-set-end">Back to the Improvement Workshop</a>') : ''}<a class="btn" href="#${s.kind === 'deep' ? 'explore' : 'talk'}">${s.kind === 'deep' ? 'Explore another question' : 'Another conversation'}</a></div></section>`;
  }

  // ───────── actions
  let ctl = null;
  async function deepStep() { const g = goals(); busy = 'turn'; CUR.error = ''; U.route(); ctl = new AbortController();
    try { const o = A.cleanDeepTurn(await A.askJSON(A.deepTurnPromptL({ question: CUR.question, clarify: CUR.clarify, turns: CUR.turns, goals: g, lang: S.lang }), { signal: ctl.signal })); if (!o.message) throw Object.assign(new Error(A.ERR.bad_format), { code: 'bad_format' });
      CUR.turns.push({ who: 'them', text: o.message, move: o.move, direction: o.direction }); CUR.covered = [...new Set((CUR.covered || []).concat(o.covered))]; CUR.ready = o.ready; setTimeout(() => window.MWVM && window.MWVM.after(CUR), 50); }
    catch (e) { CUR.error = e.code === 'AbortError' || (e.name === 'AbortError') ? 'Stopped.' : e.message; }
    busy = null; saveCur(); U.route(); focusInput(); }
  async function convoStep() { busy = 'turn'; CUR.error = ''; U.route(); ctl = new AbortController();
    if (CUR.kind === 'group') { try { const o = await A.askJSON(A.groupTurnPrompt({ scenario: CUR, turns: CUR.turns, lang: S.lang }), { signal: ctl.signal, tier: 'quick' }); const ts = (Array.isArray(o.turns) ? o.turns : []).filter(t => t && t.text && CUR.people.some(p => p.name === t.speaker)).slice(0, 3); if (!ts.length) throw Object.assign(new Error(A.ERR.bad_format), { code: 'bad_format' }); ts.forEach(t => CUR.turns.push({ who: 'them', speaker: t.speaker, text: String(t.text) })); if (o.end) CUR.ended = true; setTimeout(() => window.MWVM && window.MWVM.after(CUR), 50); } catch (e) { CUR.error = e.name === 'AbortError' ? 'Stopped.' : e.message; } }
    else try { const o = await A.askJSON(A.convoTurnPromptL({ scenario: CUR, turns: CUR.turns, lang: S.lang }), { signal: ctl.signal, tier: 'quick' }); const reply = String(o.reply || '').trim(); if (!reply) throw Object.assign(new Error(A.ERR.bad_format), { code: 'bad_format' });
      CUR.turns.push({ who: 'them', text: reply }); if (o.end) CUR.ended = true; setTimeout(() => window.MWVM && window.MWVM.after(CUR), 50); }
    catch (e) { CUR.error = e.name === 'AbortError' ? 'Stopped.' : e.message; }
    busy = null; saveCur(); U.route(); focusInput(); }
  async function finish() { busy = 'feedback'; CUR.error = ''; U.route();
    try { const raw = await A.askJSON(A.feedbackPromptL({ kind: CUR.kind, title: CUR.title, turns: CUR.turns, goals: goals(), context: CUR.kind === 'group' ? CUR.setting + ' People: ' + CUR.people.map(p => p.name + ' (' + p.style + ')').join('; ') : CUR.kind === 'convo' ? CUR.persona : CUR.question, lang: S.lang }), { max: 1800 });
      CUR.feedback = A.guardFeedback(raw, CUR.turns.filter(t => t.who === 'you').map(t => t.text)); CUR.done = true;
      const rec = JSON.parse(JSON.stringify(CUR)); rec.done = true; S.ai = S.ai.filter(x => x.id !== rec.id).concat([rec]); save('aisessions', S.ai); if (window.MWMUI) window.MWMUI.recordFeedback(rec); }
    catch (e) { CUR.error = e.message; }
    busy = null; saveCur(); U.route(); }
  const focusInput = () => setTimeout(() => { const t = $('#aiText'); if (t) t.focus(); });
  document.addEventListener('click', async ev => {
    const t = ev.target.closest('[data-action]'); if (!t) return; const a = t.dataset.action; if (!a.startsWith('ai-')) return;
    if (a === 'ai-consent') { S.aiPrefs.consent = true; save('ai-prefs', S.aiPrefs); U.route(); }
    else if (a === 'ai-deep-start') { let x = deepQs().find(z => z.id === t.dataset.id); if (t.dataset.id === 'own') { const v = ($('#ownQ').value || '').trim(); if (!v) { toast('Write your question first.'); return; } x = { id: 'own', q: v, clarify: '' }; }
      CUR = { id: 'ai' + Date.now().toString(36), kind: 'deep', qid: x.id, title: x.q, question: x.q, clarify: x.clarify, turns: [], covered: [], t: Date.now(), context: 'personal' }; saveCur(); location.hash = '#explore-run'; setTimeout(deepStep, 50); }
    else if (a === 'ai-talk-start') { startTalk(SCEN.find(z => z.id === t.dataset.id)); }
    else if (a === 'ai-send') { const v = ($('#aiText').value || '').trim(); if (!v) { toast('Write something first.'); return; } CUR.turns.push({ who: 'you', spoken: $('#aiText').dataset.spoken === '1', text: v }); saveCur(); CUR.kind === 'deep' ? deepStep() : convoStep(); }
    else if (a === 'ai-retry') { CUR.kind === 'deep' ? deepStep() : (CUR.turns[CUR.turns.length - 1].who === 'you' ? convoStep() : finish()); }
    else if (a === 'ai-stop') { if (ctl) ctl.abort(); }
    else if (a === 'ai-finish') finish();
    else if (a === 'ai-react') { const s = S.ai.find(x => x.id === CUR.id); const note = ($('#aiReact') || {}).value || ''; const r = { v: t.dataset.v, text: t.dataset.v + (note.trim() ? ' — ' + note.trim() : ''), t: Date.now() }; CUR.reaction = r; if (s) s.reaction = r; save('aisessions', S.ai); saveCur(); U.route(); }
  });

  // ───────── Grow › Your character
  const ST_NAMES = Object.fromEntries(CH.STAGES);
  U.routes.character = () => {
    const st = { comm: S.clog || [], ai: S.ai, character: S.character, comp: S.comp || [] }; const ch = S.character;
    const q = x => { const r = CH.stage(x.id, st); const stance = (ch.stance || {})[x.id];
      return `<article class="trait ${stance || ''}" id="tr-${x.id}"><header><h3>${esc(x.name)}</h3><p class="serif">${esc(x.essence)}</p></header>
        ${x.shows ? `<ul class="plain-list">${x.shows.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : `<div class="two-col"><div><h4>At work</h4><ul class="plain-list">${x.professional.map(s => `<li>${esc(s)}</li>`).join('')}</ul></div><div><h4>In personal life</h4><ul class="plain-list">${x.personal.map(s => `<li>${esc(s)}</li>`).join('')}</ul></div></div>`}
        <fieldset class="stance"><legend>Is this part of who you want to be?</legend>${Object.entries(CH.STANCES).map(([k, l]) => `<label class="check inline"><input type="radio" name="st-${x.id}" value="${k}" data-stance="${x.id}" ${stance === k ? 'checked' : ''}><span>${esc(l)}</span></label>`).join('')}</fieldset>
        ${stance === 'adapt' ? `<label class="field labelled"><span>In your own words</span><input type="text" data-wording="${x.id}" value="${esc((ch.wording || {})[x.id] || '')}"></label>` : ''}
        ${stance === 'adopt' || stance === 'adapt' ? `<label class="field labelled"><span>Why it matters to you (stays on this device)</span><textarea rows="2" data-why="${x.id}">${esc(((ch.why || {})[x.id] || {}).text || '')}</textarea></label>` : ''}
        <ol class="ladder six">${CH.STAGES.map(([k]) => `<li class="${r.met[k] ? 'met' : ''}" title="${esc(ST_NAMES[k])}"></li>`).join('')}</ol><p class="muted small">${CH.STAGES.filter(([k]) => r.met[k]).map(([, n]) => n.split(':')[0]).join(' · ') || 'No evidence yet'}${r.practiceCount ? ` · ${r.practiceCount} piece${r.practiceCount === 1 ? '' : 's'} of practice evidence` : ''}${r.tensions ? ` · ${r.tensions} possible imbalance${r.tensions === 1 ? '' : 's'} noted` : ''}</p></article>`; };
    return `<header class="page-head"><a href="#grow" class="link">Grow</a><h1 class="display sm">Your character</h1><p class="lede">The person you’re choosing to become: a stable core expressed differently at work and at home. This is a reference you can adopt, change into your own words, or set aside. It is not a test, and nothing here labels you.</p></header>
      <section class="panel"><h2>The core</h2><div class="trait-grid">${CH.CORE.map(q).join('')}</div></section>
      <section class="panel"><h2>Seven qualities</h2><div class="trait-grid">${CH.QUALITIES.map(q).join('')}</div></section>
      <section class="panel"><h2>When a strength tips over</h2><p class="muted small">Possibilities to explore when evidence appears, never conclusions about you.</p><div class="table-wrap"><table class="ov-table"><thead><tr><th scope="col">Quality</th><th scope="col">Possible imbalance</th><th scope="col">Direction</th></tr></thead><tbody>${CH.BALANCE.map(b => `<tr><th scope="row">${esc(b.quality)}</th><td>${esc(b.imbalance)}</td><td>${esc(b.direction)}</td></tr>`).join('')}</tbody></table></div></section>
      <section class="panel"><h2>One person, different situations</h2><p class="serif">The same values, expressed to fit the moment. That isn’t being two-faced; it’s social intelligence. It becomes a problem only when the values change to win approval.</p><ul class="chips">${CH.SITUATIONS.map(s => `<li>${esc(s)}</li>`).join('')}</ul></section>
      <section class="panel"><h2>Where you practise these</h2><p>Role-plays in <a class="link" href="#communicate">Communicate</a> count as evidence for the qualities they exercise; open conversations with AI can add evidence when the feedback quotes your words. Stages follow recorded practice only: awareness, understanding (your own reasons), guided practice, independent application, transfer to another kind of situation, and consistency over time.</p>
        <div class="row"><button class="btn" data-action="ch-review">These still describe who I want to become</button><span class="muted small">${ch.reviewed ? 'Last reviewed ' + U.fmtDate(ch.reviewed) : 'Not reviewed yet'}</span></div></section>`;
  };
  const saveCh = () => save('character', S.character);
  document.addEventListener('change', e => {
    const d = e.target.dataset || {};
    if (d.stance) { S.character.stance = Object.assign({}, S.character.stance, { [d.stance]: e.target.value }); saveCh(); U.route(); setTimeout(() => { const el = document.getElementById('tr-' + d.stance); if (el) el.scrollIntoView({ block: 'center' }); }); }
    else if (d.wording) { S.character.wording = Object.assign({}, S.character.wording, { [d.wording]: e.target.value.trim() }); saveCh(); }
    else if (d.why) { S.character.why = Object.assign({}, S.character.why, { [d.why]: { text: e.target.value.trim(), t: Date.now() } }); saveCh(); }
  });
  document.addEventListener('click', e => { if (e.target.closest('[data-action="ch-review"]')) { S.character.reviewed = Date.now(); saveCh(); toast('Noted. You can change any of these at any time.'); U.route(); } });
  wrap('grow', () => '');
  const growOrig = U.routes.grow; U.routes.grow = () => growOrig().replace('<section class="env-grid">', `<section class="env-grid"><a class="env-card" href="#character" style="--c:var(--violet)">${glyph('quill', 30)}<strong>Your character</strong><span>The person you’re choosing to become: honesty, listening and seven qualities, in your own words.</span><span class="env-meta">${Object.values(S.character.stance || {}).filter(v => v === 'adopt' || v === 'adapt').length} chosen</span></a>`);
  function startTalk(x, set) { const op = S.lang === 'xh' && x.openerXh ? x.openerXh : x.opener; CUR = { id: 'ai' + Date.now().toString(36), kind: 'convo', sid: x.id, title: x.title, persona: x.persona, opener: op, context: x.context, turns: [{ who: 'them', text: op }], t: Date.now(), sessionId: set ? set.id : null, lang: S.lang }; saveCur(); if (location.hash === '#talk-run') U.route(); else location.hash = '#talk-run'; } // already on the page: redraw directly
  let AISET = null; U.onLoad.push(async () => { AISET = (await DB.get('kv', 'ai-set')) || null; });
  function startSet(s) { AISET = s; save('ai-set', AISET); startTalk(SCEN.find(x => x.id === s.items[0].sid), s); }
  function setNext() { if (!AISET) return null; const done = new Set(S.ai.filter(x => x.sessionId === AISET.id && x.feedback).map(x => x.sid)); return AISET.items.find(i => !done.has(i.sid)) || null; }
  document.addEventListener('click', e => { const t = e.target.closest('[data-action="ai-set-next"],[data-action="ai-set-end"]'); if (!t) return; if (t.dataset.action === 'ai-set-end') { AISET = null; save('ai-set', null); return; } const n = setNext(); if (n) startTalk(SCEN.find(x => x.id === n.sid), AISET); });
  // ───────── group conversations: several AI participants with different styles; she can lead, follow or stay quiet
  const GROUPS = [
    { id: 'g-dinner', title: 'A dinner-table debate', setting: 'Dinner with friends. Someone has just said that money makes people unhappy.', people: [{ name: 'Kagiso', style: 'confident and talkative; likes strong opinions; sometimes talks over people' }, { name: 'Ayesha', style: 'quieter, thoughtful, has relevant experience she shares only if invited' }, { name: 'Pieter', style: 'jokey; changes the subject when things get serious' }], opening: [['Kagiso', 'Honestly, money makes people miserable. Look at lottery winners.'], ['Pieter', 'Speak for yourself, I’d manage.']] },
    { id: 'g-meeting', title: 'A meeting drifting off course', setting: 'A team meeting meant to decide a launch date, with 20 minutes left.', people: [{ name: 'Thandi', style: 'detail-focused; keeps raising side issues' }, { name: 'Lwazi', style: 'junior; has a good point but hesitates' }, { name: 'Mr Naidoo', style: 'senior; impatient; wants a decision' }], opening: [['Thandi', 'Before we pick a date, can we talk about the font on the landing page?'], ['Mr Naidoo', 'We have twenty minutes.']] },
    { id: 'g-bookclub', title: 'A book club that won’t go deep', setting: 'A book club discussing a novel about migration; most people only say whether they liked it.', people: [{ name: 'Zola', style: 'enthusiastic but stays on the surface' }, { name: 'Johan', style: 'contrarian; disliked the book' }, { name: 'Neo', style: 'shy; noticed something interesting about the ending' }], opening: [['Zola', 'I loved it! Such a lovely story.'], ['Johan', 'It was slow. Nothing happened for two hundred pages.']] },
    { id: 'g-lunch', title: 'Lunch with new colleagues', setting: 'Your first week. Lunch with three colleagues who already know each other well.', people: [{ name: 'Sipho', style: 'friendly; tells long stories about weekend hiking' }, { name: 'Fatima', style: 'dry humour; asks surprising questions' }, { name: 'Ben', style: 'mostly talks shop; a bit awkward' }], opening: [['Sipho', '…and then the trail just vanished. We walked another hour in the dark.'], ['Fatima', 'Classic Sipho. Have you hiked much since you moved here?']] }];
  U.routes.group = () => `<header class="page-head"><a href="#convo" class="link">Conversation Lab</a><h1 class="display sm">Group conversations</h1><p class="lede">Several people with different styles. They talk to each other, disagree, joke and drift. You can lead, follow or listen; there isn’t one right way to take part. Needs AI.</p></header>
    ${ready() ? `<section class="panel"><ul class="rp-list">${GROUPS.map(g => `<li><div><strong>${esc(g.title)}</strong><span class="muted small">${esc(g.setting)}</span></div><button class="btn small" data-action="ai-group" data-id="${g.id}">Join</button></li>`).join('')}</ul></section>` : '<section class="panel ai-gate"><p>Group conversations need AI, which isn’t available or allowed in this copy.</p></section>'}`;
  document.addEventListener('click', e => { const t = e.target.closest('[data-action="ai-group"]'); if (!t) return; const g = GROUPS.find(x => x.id === t.dataset.id);
    CUR = { id: 'ai' + Date.now().toString(36), kind: 'group', sid: g.id, title: g.title, setting: g.setting, people: g.people, turns: g.opening.map(([s, x]) => ({ who: 'them', speaker: s, text: x })), t: Date.now(), lang: S.lang }; saveCur(); location.hash = '#talk-run'; });
  window.MWAIUI = { GROUPS, get current() { return CUR; }, scenarios: SCEN, themed: THEMED, startTalk, startSet, get set() { return AISET; } };
  // Keep the Conversation Moving lives in the Conversational Thinking category: offer the open AI conversation there too
  const gamesOrig = U.routes.games, gamesAfter = gamesOrig.after; U.routes.games = (...a) => { const out = gamesOrig(...a); return a[0] === 'convo' && typeof out === 'string' ? out.replace(/(<\/header>)/, '$1<section class="panel row-panel ai-entry"><div><h2>Practise it in an open conversation</h2><p class="muted">Keep the Conversation Moving with a partner who responds to whatever you say (needs AI).</p></div><a class="btn" href="#talk">Open</a></section>') : out; }; U.routes.games.after = gamesAfter;
})();
