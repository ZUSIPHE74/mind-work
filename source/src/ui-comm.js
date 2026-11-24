/* MINDWORK — Communicate destination: Communication & Interpersonal Skills. */
(function () {
  const U = window.MWUI, C = window.MWC, E = window.MW;
  const { S, DB, esc, $, toast, glyph } = U;
  S.clog = [];
  let SET = null;
  U.onLoad.push(async () => { S.clog = (await DB.get('kv', 'commlog')) || []; SET = (await DB.get('kv', 'comm-set')) || null; });
  const saveLog = () => DB.put('kv', 'commlog', S.clog).catch(e => toast('Couldn’t save: ' + ((e && e.message) || 'storage error')));
  const saveSet = () => DB.put('kv', 'comm-set', SET).catch(() => {});
  const add = e => { e.id = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); e.t = e.t || Date.now(); if (SET && e.kind === 'roleplay' && SET.items.some(i => i.rid === e.rid && i.state !== 'done')) e.sessionId = SET.id; S.clog.push(e); saveLog(); return e; };
  const ladder = p => `<ol class="ladder seven" aria-label="Pathway">${C.STAGES.map(([k, n]) => `<li class="${p.met[k] ? 'met' : ''}" title="${esc(n)}"><span class="sr">${esc(n)}: ${p.met[k] ? 'shown' : 'not yet'}</span></li>`).join('')}</ol>`;
  const STAGE_NAME = Object.fromEntries(C.STAGES);
  const HONEST = 'The other person reacts to what your reply does — acknowledging, asking, proposing, blaming and so on — detected by fixed phrase rules. It doesn’t understand everything you mean, so the detected moves are shown with each reply.';

  // ───────── destination page (replaces the earlier single-card page)
  U.routes.communicate = () => `<header class="page-head dest-head"><h1 class="display sm">Communicate</h1><p class="lede">Practise communicating and interacting with other people: listening, speaking, asserting yourself, persuading, negotiating, resolving conflict and leading groups.</p></header>
    ${SET && setNext() ? `<section class="panel row-panel continue-strip"><div><h2>Continue your role-play set</h2><p>${esc(SET.objective)}</p></div><a class="btn primary" href="#roleplay-${setNext()}">Next conversation</a></section>` : ''}
    <section class="area-grid">${C.AREAS.map(a => { const p = C.pathway(a.id, S.clog); return `<a class="area-card env-card" href="#area-${a.id}"><strong>${esc(a.name)}</strong><span>${esc(a.blurb)}</span>${ladder(p)}<span class="ab-meta">${p.stage ? esc(STAGE_NAME[p.stage]) : 'Not started'}</span></a>`; }).join('')}
      <a class="area-card env-card" href="#bilingual"><strong>Bilingual Expression Lab</strong><span>Thinking and expressing yourself in English and isiXhosa: meaning, nuance and natural expression.</span><span class="ab-meta">${(S.blog || []).length} exercises</span></a>
      <a class="area-card env-card" href="#convo"><strong>Conversation Lab</strong><span>Branching conversations and conversation games. The games are the same originals as the Cognitive Playground’s Conversational Thinking category.</span><span class="ab-meta">${E.itemsFor('branch').length} branching conversations</span></a></section>
    <p class="muted small">Each area has seven pathway stages, from understanding the skill to showing it consistently, and each stage is reached only through recorded practice. ${esc(HONEST)}</p>`;

  // ───────── area page
  let recogIdx = {};
  U.routes.area = id => {
    const a = C.AREA[id]; if (!a) return '<section class="panel"><p>Unknown area.</p></section>';
    if (!S.clog.some(e => e.kind === 'card' && e.area === id)) add({ kind: 'card', area: id });
    const p = C.pathway(id, S.clog); const rps = C.ROLEPLAYS.filter(r => r.area === id), recs = C.RECOGNISE.filter(r => r.area === id), drs = C.DRAFTS.filter(d => d.area === id), sps = C.SPEAK.filter(x => x.area === id), reals = C.REAL.filter(x => x.area === id);
    const rpStatus = r => { const es = S.clog.filter(e => e.kind === 'roleplay' && e.rid === r.id && e.done); if (!es.length) return 'Not tried'; const b = Math.max(...es.map(e => e.score)); return `Best: ${Math.round(b * 100)}% of the skills shown`; };
    const ri = recogIdx[id] || 0; const rec = recs[ri];
    return `<header class="page-head"><a href="#communicate" class="link">Communicate</a><h1 class="display sm">${esc(a.name)}</h1><p class="lede">${esc(a.blurb)}</p></header>
      <section class="panel pathway"><h2>Your pathway</h2>${ladder(p)}<ol class="path-list">${C.STAGES.map(([k, n]) => `<li class="${p.met[k] ? 'met' : ''}">${esc(n)} ${p.met[k] ? '<span class="ok">shown</span>' : ''}</li>`).join('')}</ol><p class="muted small">Knowing about a skill and doing it are tracked separately: understanding and recognising come first, but only practice moves you further.</p></section>
      <div class="area-body">
      <section class="panel"><h2>Understand the skill</h2>${a.card.map(c => `<p class="serif">${esc(c)}</p>`).join('')}<h3 class="h3">Key moves</h3><ul class="plain-list">${a.moves.map(m => `<li>${esc(m)}</li>`).join('')}</ul></section>
      ${recs.length ? `<section class="panel" id="recog"><h2>Recognise it</h2><p class="muted small">${ri + 1} of ${recs.length}</p><p class="q-prompt">${esc(rec.prompt)}</p><div class="choices">${rec.options.map((o, i) => `<button class="choice" data-action="cm-rec" data-area="${id}" data-i="${i}">${esc(o)}</button>`).join('')}</div><div id="recFb"></div></section>` : ''}
      </div>
      ${rps.length ? `<section class="panel"><h2>Role-play</h2><p class="muted small">${esc(HONEST)}</p><ul class="rp-list">${rps.map(r => `<li><div><strong>${esc(r.title)}</strong><span class="muted small">Level ${r.lvl} · with ${esc(r.who)} · ${esc(rpStatus(r))}</span><span>${esc(r.goal)}</span></div><div class="row tight">${{ boundary: 'wa-want', disagree: 'wa-beliefs', criticism: 'wa-discomfort' }[r.id] ? `<a class="link small" href="#gact-${{ boundary: 'wa-want', disagree: 'wa-beliefs', criticism: 'wa-discomfort' }[r.id]}">Work on what’s in the way first</a>` : ''}<a class="btn small primary" href="#roleplay-${r.id}" data-action="cm-coach" data-on="1">With coaching</a><a class="btn small" href="#roleplay-${r.id}" data-action="cm-coach" data-on="0">On your own</a></div></li>`).join('')}</ul></section>` : ''}
      ${drs.length ? `<section class="panel"><h2>Write it</h2><ul class="rp-list">${drs.map(d => { const best = S.clog.filter(e => e.kind === 'draft' && e.did === d.id).reduce((m, e) => Math.max(m, e.score), -1); return `<li><div><strong>${esc(d.title)}</strong><span>${esc(d.brief)}</span>${best >= 0 ? `<span class="muted small">Best: ${Math.round(best * 100)}% of checks met</span>` : ''}</div><a class="btn small" href="#draft-${d.id}">Write</a></li>`; }).join('')}</ul></section>` : ''}
      ${sps.length ? `<section class="panel"><h2>Say it out loud</h2><p class="muted small">A timer and an honest self-review. Nothing is recorded or analysed yet; that comes with the voice system.</p><ul class="rp-list">${sps.map(x => `<li><div><strong>${esc(x.title)}</strong><span>${esc(x.prompt)} (${x.seconds} seconds)</span></div><a class="btn small" href="#speak-${x.id}">Practise</a></li>`).join('')}</ul></section>` : ''}
      ${reals.length ? `<section class="panel"><h2>Try it for real</h2><p class="muted small">Optional. Record afterwards how it went; your notes stay private to this device and never appear on summary screens.</p><ul class="rp-list">${reals.map(x => { const n = S.clog.filter(e => e.kind === 'real' && e.cid === x.id).length; return `<li><div><span>${esc(x.text)}</span>${n ? `<span class="muted small">Done ${n}×</span>` : ''}</div><button class="btn small ghost" data-action="cm-real" data-id="${x.id}">I tried it</button></li>`; }).join('')}</ul><div id="realForm"></div></section>` : ''}`;
  };

  // ───────── role-play
  let RS = null, coachOn = true;
  U.routes.roleplay = id => {
    const rp = C.RP[id]; if (!rp) return '<section class="panel"><p>Unknown role-play.</p></section>';
    /* a finished conversation stays on its result until “Try it again” */ if (!RS || RS.rid !== id) { if (SET && SET.items.some(i => i.rid === id && i.state !== 'done')) coachOn = !!SET.coach; RS = { rid: id, st: C.start(rp), coach: coachOn, done: false, entryId: null }; }
    const st = RS.st; const over = !!st.over; const inSet = SET && SET.items.some(i => i.rid === id);
    return `<div class="rp"><header class="page-head"><a href="#area-${rp.area}" class="link">${esc(C.AREA[rp.area].name)}</a>${inSet ? ' <span class="mini">Part of your role-play set</span>' : ''}<h1 class="display sm">${esc(rp.title)}</h1>
      <p><strong>With:</strong> ${esc(rp.who)}. <strong>Your goal:</strong> ${esc(rp.goal)}</p>${rp.context ? `<p class="muted">${esc(rp.context)}</p>` : ''}</header>
      <div class="rp-body"><div class="chat" aria-live="polite">${st.log.map(l => l.who === 'them' ? l.text.split('\n').map(line => `<div class="bubble them">${esc(line)}</div>`).join('') : `<div class="bubble you">${esc(l.text)}<span class="moves">${l.moves.length ? l.moves.map(m => `<span>${esc(C.MOVE_NAMES[m] || m)}</span>`).join('') : '<span>no move detected</span>'}</span></div>`).join('')}</div>
      ${over ? resultHTML(rp) : `<div class="rp-input">${RS.coach && rp.coach[Math.min(st.turn, rp.coach.length - 1)] ? `<p class="coach"><span>Coach</span>${esc(rp.coach[Math.min(st.turn, rp.coach.length - 1)])}</p>` : ''}
        <label class="field"><span>Your reply</span><textarea id="rpText" rows="3" placeholder="Write what you would actually say."></textarea></label>
        <div class="row"><button class="btn primary" data-action="cm-say">Say it</button><span class="muted small">Turn ${st.turn + 1} of up to 7 · ${RS.coach ? 'coaching on' : 'on your own'}</span>${!st.turn ? `<button class="btn ghost small" data-action="cm-toggle">${RS.coach ? 'Turn coaching off' : 'Turn coaching on'}</button>` : ''}</div></div>`}
      </div><p class="muted small">${esc(HONEST)}</p></div>`;
  };
  function resultHTML(rp) {
    const a = C.assess(rp, RS.st); const next = setNext();
    const head = { good: 'You reached the goal.', ended: 'The conversation ended without reaching your goal.', broke: 'The conversation broke down.', timeout: 'The conversation ran out of time.' }[RS.st.over];
    return `<section class="panel rp-result"><h2>${esc(head)}</h2><p class="muted small">${Math.round(a.score * 100)}% of the skills for this scenario were shown${RS.coach ? ', with coaching' : ''}.</p>
      <ul class="crit">${a.crit.map(c => `<li class="${c.ok ? 'ok' : 'no'}">${c.ok ? '✓' : '○'} ${esc(c.label)}</li>`).join('')}</ul>
      <div class="row">${next ? `<a class="btn primary" href="#roleplay-${next}">Next conversation in the set</a>` : SET && !setNext() && SET.improve ? '<a class="btn primary" href="#improve" data-action="cm-set-end">Back to the Improvement Workshop</a>' : ''}<button class="btn" data-action="cm-retry">Try it again</button><a class="btn ghost" href="#area-${rp.area}">Back to ${esc(C.AREA[rp.area].name)}</a></div></section>`;
  }
  function setNext() { if (!SET) return null; const it = SET.items.find(i => i.state !== 'done'); return it ? it.rid : null; }

  // ───────── drafting
  let lastDraft = {};
  U.routes.draft = id => {
    const d = C.DRAFTS.find(x => x.id === id); if (!d) return '<section class="panel"><p>Unknown task.</p></section>';
    const r = lastDraft[id];
    return `<header class="page-head"><a href="#area-${d.area}" class="link">${esc(C.AREA[d.area].name)}</a><h1 class="display sm">${esc(d.title)}</h1><p class="lede">${esc(d.brief)}</p></header>
      ${d.original ? `<blockquote class="orig">${esc(d.original)}</blockquote>` : ''}
      <div class="draft-body"><label class="field labelled"><span>Your draft</span><textarea id="drText" rows="9">${esc(r ? r.text : '')}</textarea></label>
      <aside class="side-box"><h2>What the check looks for</h2><ul class="crit">${d.checks.map(k => `<li class="${r ? (r.res.checks.find(c => c.id === k).ok ? 'ok' : 'no') : ''}">${r ? (r.res.checks.find(c => c.id === k).ok ? '✓ ' : '○ ') : ''}${esc(C.CH[k].label)}</li>`).join('')}<li class="${r ? (r.res.checks[r.res.checks.length - 1].ok ? 'ok' : 'no') : ''}">${r ? esc(r.res.checks[r.res.checks.length - 1].label) : `Between ${d.words[0]} and ${d.words[1]} words`}</li></ul>
      <p class="muted small">These checks look for wording, not meaning: a draft can meet them all and still need your judgement about tone and audience.</p></aside></div>
      <div class="row"><button class="btn primary" data-action="cm-check-draft" data-id="${d.id}">Check my draft</button>${r ? `<span class="muted">${r.res.checks.filter(c => c.ok).length} of ${r.res.checks.length} checks met.</span>` : ''}</div>`;
  };

  // ───────── speaking aloud
  let SP = null;
  U.routes.speak = id => {
    const x = C.SPEAK.find(s => s.id === id); if (!x) return '<section class="panel"><p>Unknown exercise.</p></section>';
    if (!SP || SP.id !== id) SP = { id, phase: 'ready', left: x.seconds };
    return `<header class="page-head"><a href="#area-${x.area}" class="link">${esc(C.AREA[x.area].name)}</a><h1 class="display sm">${esc(x.title)}</h1><p class="lede">${esc(x.prompt)}</p></header>
      <section class="panel speak"><p class="timer" id="spTimer" aria-live="polite">${SP.left}s</p>
      ${SP.phase === 'ready' ? `<p>When you press start, say it out loud. Nothing is recorded unless you choose to record yourself (kept on this device only).</p><div class="rec-box" data-voice-record="speak"></div><button class="btn primary" data-action="cm-sp-start">Start ${x.seconds}-second timer</button>` : SP.phase === 'running' ? `<button class="btn" data-action="cm-sp-stop">I’ve finished</button><div class="rec-box" data-voice-record="speak"></div>` :
      `<h2>Honest review</h2><fieldset class="useful">${x.review.map((r, i) => `<label class="check opt"><input type="checkbox" class="sp-rev" value="${i}"><span>${esc(r)}</span></label>`).join('')}</fieldset><div class="row"><button class="btn primary" data-action="cm-sp-save">Save review</button><button class="btn ghost" data-action="cm-sp-again">Do it again</button></div>`}</section>`;
  };

  // ───────── actions
  let timer = null;
  document.addEventListener('click', ev => {
    const t = ev.target.closest('[data-action]'); if (!t) return; const a = t.dataset.action; if (!a.startsWith('cm-')) return;
    if (a === 'cm-coach') { coachOn = t.dataset.on === '1'; RS = null; }
    else if (a === 'cm-toggle') { RS.coach = !RS.coach; coachOn = RS.coach; U.route(); }
    else if (a === 'cm-say') {
      const txt = ($('#rpText').value || '').trim(); if (!txt) { toast('Write your reply first.'); return; }
      const rp = C.RP[RS.rid]; RS.st = C.reply(rp, RS.st, txt);
      if (RS.st.over) { const as = C.assess(rp, RS.st); add({ kind: 'roleplay', rid: rp.id, area: rp.area, coach: RS.coach, turns: RS.st.turns.map(x => ({ text: x.text, moves: x.moves })), outcome: RS.st.over, score: as.score, crit: as.crit, done: true }); RS.done = true; if (SET) { const it = SET.items.find(i => i.rid === rp.id && i.state !== 'done'); if (it) { it.state = 'done'; saveSet(); } } }
      U.route(); setTimeout(() => { const ta = $('#rpText'); if (ta) ta.focus(); const ch = document.querySelector('.chat'); if (ch) ch.lastElementChild && ch.lastElementChild.scrollIntoView({ block: 'nearest' }); });
    }
    else if (a === 'cm-retry') { RS = null; U.route(); }
    else if (a === 'cm-set-end') { SET = null; saveSet(); }
    else if (a === 'cm-rec') {
      const id = t.dataset.area; const recs = C.RECOGNISE.filter(r => r.area === id); const rec = recs[recogIdx[id] || 0]; const i = +t.dataset.i; const ok = i === rec.correct;
      add({ kind: 'recognise', rcid: rec.id, area: id, ok });
      document.querySelectorAll('[data-action="cm-rec"]').forEach(b => { b.disabled = true; if (+b.dataset.i === rec.correct) b.classList.add('right'); else if (b === t) b.classList.add('wrong'); });
      $('#recFb').innerHTML = `<p class="res ${ok ? 'correct' : 'incorrect'}">${ok ? 'Yes.' : 'Not quite.'}</p><p class="serif">${esc(rec.why)}</p>${recs.length > 1 ? `<button class="btn small" data-action="cm-rec-next" data-area="${id}">Next example</button>` : ''}`;
    }
    else if (a === 'cm-rec-next') { const id = t.dataset.area; const n = C.RECOGNISE.filter(r => r.area === id).length; recogIdx[id] = ((recogIdx[id] || 0) + 1) % n; U.route(); setTimeout(() => { const r = $('#recog'); if (r) r.scrollIntoView({ block: 'start' }); }); }
    else if (a === 'cm-check-draft') { const d = C.DRAFTS.find(x => x.id === t.dataset.id); const text = $('#drText').value; if (!text.trim()) { toast('Write your draft first.'); return; } const res = C.checkDraft(d, text); lastDraft[d.id] = { text, res }; add({ kind: 'draft', did: d.id, area: d.area, text, score: res.score, checks: res.checks.map(c => ({ label: c.label, ok: c.ok })) }); U.route(); }
    else if (a === 'cm-sp-start') { const x = C.SPEAK.find(s => s.id === SP.id); SP.phase = 'running'; SP.left = x.seconds; SP.started = Date.now(); U.route(); clearInterval(timer); timer = setInterval(() => { SP.left = Math.max(0, x.seconds - Math.round((Date.now() - SP.started) / 1000)); const el = $('#spTimer'); if (el) el.textContent = SP.left + 's'; if (!SP.left) { clearInterval(timer); SP.phase = 'review'; SP.used = x.seconds; U.route(); } }, 250); }
    else if (a === 'cm-sp-stop') { clearInterval(timer); SP.used = Math.round((Date.now() - SP.started) / 1000); SP.phase = 'review'; U.route(); }
    else if (a === 'cm-sp-save') { const x = C.SPEAK.find(s => s.id === SP.id); const ticked = [...document.querySelectorAll('.sp-rev:checked')].map(c => +c.value); add({ kind: 'speak', sid: x.id, area: x.area, seconds: SP.used, review: ticked, selfScore: ticked.length / x.review.length }); toast('Saved.'); SP = null; location.hash = '#area-' + x.area; }
    else if (a === 'cm-sp-again') { SP = null; U.route(); }
    else if (a === 'cm-real') { const x = C.REAL.find(r => r.id === t.dataset.id); $('#realForm').innerHTML = `<div class="real-form"><p class="rp-q">${esc(x.text)}</p>${[['what', 'What happened?'], ['said', 'What did you say or do?'], ['how', 'How did it go?'], ['next', 'What would you do next time?']].map(([k, l]) => `<label class="field labelled"><span>${l}</span><textarea data-real="${k}" rows="2"></textarea></label>`).join('')}<button class="btn primary" data-action="cm-real-save" data-id="${x.id}">Save privately</button></div>`; $('#realForm textarea').focus(); }
    else if (a === 'cm-real-save') { const x = C.REAL.find(r => r.id === t.dataset.id); const ans = {}; document.querySelectorAll('[data-real]').forEach(el => { if (el.value.trim()) ans[el.dataset.real] = el.value.trim(); }); add({ kind: 'real', cid: x.id, area: x.area, notes: ans }); toast('Saved. Only you can see this.'); U.route(); }
  });
  window.MWCUI = { startSet: s => { SET = s; saveSet(); RS = null; coachOn = !!s.coach; location.hash = '#roleplay-' + s.items[0].rid; }, get set() { return SET; }, get state() { return RS; } };
})();
