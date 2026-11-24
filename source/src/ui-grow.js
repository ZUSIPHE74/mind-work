/* MINDWORK — Grow destination: six internal-development areas, private by design. */
(function () {
  const U = window.MWUI, G = window.MWG, A = window.MWAI, CH = window.MWCH;
  const { S, DB, esc, $, toast, glyph } = U;
  S.glog = [];
  U.onLoad.push(async () => { S.glog = (await DB.get('kv', 'growlog')) || []; });
  const saveLog = () => DB.put('kv', 'growlog', S.glog).catch(e => toast('Couldn’t save: ' + ((e && e.message) || 'storage error')));
  const AREA = Object.fromEntries(G.AREAS.map(a => [a.id, a]));
  const PRIV = 'Everything you write in Grow stays on this device and never appears on Today or other summary screens.';

  // ───────── destination page: character, six areas, journal
  U.routes.grow = () => { const open = (S.journal || []).filter(j => j.status !== 'resolved').length; const chosen = Object.values((S.character || {}).stance || {}).filter(v => v === 'adopt' || v === 'adapt').length;
    return `<header class="page-head dest-head"><h1 class="display sm">Grow</h1><p class="lede">Internal development: what you think, feel, want, need and believe, and how you respond and behave.</p><p class="muted small">${esc(PRIV)} Grow is for practice and reflection; it doesn’t diagnose or treat anything.</p></header>
    <section class="env-grid"><a class="env-card" href="#character" style="--c:var(--violet)">${glyph('quill', 30)}<strong>Your character</strong><span>The person you’re choosing to become: honesty, listening and seven qualities, in your own words.</span><span class="env-meta">${chosen} chosen</span></a>
      ${G.AREAS.map(a => { const p = G.areaProgress(a.id, S.glog); return `<a class="env-card" href="#garea-${a.id}" style="--c:var(--pink)">${glyph(a.id === 'emotion' ? 'waves' : a.id === 'way' ? 'loop' : 'quill', 30)}<strong>${esc(a.name)}</strong><span>${esc(a.blurb)}</span><span class="env-meta">${p.activities} of ${p.total} activities tried${p.days > 1 ? ` · on ${p.days} days` : ''}</span></a>`; }).join('')}
      <a class="env-card" href="#journal" style="--c:var(--pink)">${glyph('quill', 30)}<strong>Thinking Journal</strong><span>Capture a thought before it’s finished, then develop it over time. Private to this device.</span><span class="env-meta">${open ? `${open} unfinished thought${open === 1 ? '' : 's'}` : `${(S.journal || []).length} entries`}</span></a></section>`; };

  U.routes.garea = id => { const a = AREA[id]; if (!a) return '<section class="panel"><p>Unknown area.</p></section>';
    const acts = G.ACTIVITIES.filter(x => x.area === id); const p = G.areaProgress(id, S.glog); const pend = S.glog.filter(e => (G.BY[e.aid] || {}).area === id && G.BY[e.aid].realLife && !e.real && !S.glog.some(r => r.real && r.of === e.id));
    return `<header class="page-head"><a href="#grow" class="link">Grow</a><h1 class="display sm">${esc(a.name)}</h1><p class="lede">${esc(a.blurb)}</p></header>
      ${id === 'emotion' ? `<section class="panel row-panel"><div><h2>Your emotional patterns</h2><p class="muted">What your check-ins show over the last 30 days. Private.</p></div><a class="btn" href="#feelings">Open</a></section><p class="muted small crisis">${esc(G.CRISIS)}</p>` : ''}
      ${pend.length ? `<section class="panel continue-strip"><h2>Real-life follow-ups</h2><ul class="rp-list">${pend.map(e => `<li><span>${esc(G.BY[e.aid].realLife)}</span><a class="btn small" href="#gact-${e.aid}" data-action="g-real" data-of="${e.id}">Record how it went</a></li>`).join('')}</ul></section>` : ''}
      <section class="panel"><p class="muted small">${p.done} completed · ${p.activities} of ${p.total} activities tried${p.real ? ` · ${p.real} real-life tries recorded` : ''}. Progress here is practice, not a score.</p>
      <ul class="rp-list">${acts.map(x => { const n = S.glog.filter(e => e.aid === x.id).length; return `<li><div><strong>${esc(x.title)}</strong><span class="muted small">${esc(G.MODES[x.mode])}${n ? ` · done ${n}×` : ''}${x.practise ? ' · links to practice in Communicate' : ''}</span></div><a class="btn small" href="#gact-${x.id}">${n ? 'Do again' : 'Start'}</a></li>`; }).join('')}</ul></section>`; };

  // ───────── an activity
  let W = null, realOf = null, tm = {};
  // leaving an activity and coming back starts it fresh; re-renders while you work keep your answers
  window.addEventListener('hashchange', () => { if (W && location.hash !== '#gact-' + W.a.id) { W = null; Object.values(tm).forEach(clearInterval); tm = {}; } });
  const val = (i) => (W.answers || {})[i];
  function stepHTML(s, i) {
    const v = val(i); const lab = `<p class="step-q"><span class="n">${i + 1}</span>${esc(s.prompt)}</p>`;
    switch (s.kind) {
      case 'text': return `<div class="gstep">${lab}<textarea data-g="${i}" rows="${s.rows || 3}">${esc(v || '')}</textarea></div>`;
      case 'choice': return `<div class="gstep">${lab}<div class="choices">${s.options.map(o => `<button class="choice" aria-pressed="${v === o}" data-gchoice="${i}" data-v="${esc(o)}">${esc(o)}</button>`).join('')}</div>${v === 'My own topic' || v === 'My own' ? `<input type="text" data-gown="${i}" value="${esc(val(i + '-own') || '')}" placeholder="Write your own">` : ''}</div>`;
      case 'multi': case 'emotions': return `<div class="gstep">${lab}<div class="chip-pick ${s.kind}">${s.options.map(o => `<label class="chip"><input type="checkbox" data-gmulti="${i}" value="${esc(o)}" ${(v || []).includes(o) ? 'checked' : ''}><span>${esc(o)}</span></label>`).join('')}</div>${s.max ? `<p class="muted small">Up to ${s.max}.</p>` : ''}</div>`;
      case 'scale': return `<div class="gstep">${lab}<div class="scale" role="radiogroup">${s.labels.map((l, k) => `<button class="choice" role="radio" aria-checked="${+v === k}" data-gscale="${i}" data-v="${k}">${esc(l)}</button>`).join('')}</div></div>`;
      case 'list': { const arr = v || []; return `<div class="gstep">${lab}${Array.from({ length: Math.max(s.min || 3, arr.length) }, (_, k) => `<input type="text" data-glist="${i}" data-k="${k}" value="${esc(arr[k] || '')}">`).join('')}</div>`; }
      case 'pairs': return `<div class="gstep">${lab}<ul class="pairs">${s.pairs.map((p, k) => `<li>${p.map((o, j) => `<label class="chip"><input type="radio" name="gp${i}-${k}" data-gpair="${i}" data-k="${k}" value="${j}" ${(v || {})[k] === j ? 'checked' : ''}><span>${esc(o)}</span></label>`).join('<span class="muted small">or</span>')}</li>`).join('')}</ul></div>`;
      case 'sort': return `<div class="gstep">${lab}<ul class="sortl">${s.items.map((it, k) => `<li><span class="serif">${esc(it.t)}</span><span class="row tight">${s.cats.map(([c, n]) => `<label class="chip"><input type="radio" name="gs${i}-${k}" data-gsort="${i}" data-k="${k}" value="${c}" ${(v || {})[k] === c ? 'checked' : ''}><span>${n}</span></label>`).join('')}</span></li>`).join('')}</ul>${W.saved ? (() => { const r = G.sortScore(s, v); return `<p class="res ${r.right === r.n ? 'correct' : 'incorrect'}">${r.right} of ${r.n} sorted as a camera-versus-meaning test would.</p>`; })() : ''}</div>`;
      case 'timer': { const topic = s.topics ? (W.topic || (W.topic = s.topics[Math.floor(Math.random() * s.topics.length)])) : null;
        return `<div class="gstep">${lab}${topic ? `<p class="topic">Topic: <strong>${esc(topic)}</strong></p>` : ''}<p class="timer" id="gTimer-${i}">${W.timers && W.timers[i] != null ? W.timers[i] : s.seconds}s</p><div class="row"><button class="btn" data-gtimer="${i}" data-s="${s.seconds}">Start ${s.seconds}-second timer</button>${window.MWVOICE && window.MWVOICE.canRecord() && W.a.mode === 'speaking' ? '<span data-voice-record="grow"></span>' : ''}</div>${s.write ? `<textarea data-g="${i}" rows="4">${esc(v || '')}</textarea>` : ''}</div>`; }
      case 'check': return `<div class="gstep">${lab}${s.options.map((o, k) => `<label class="check opt"><input type="checkbox" data-gmulti="${i}" value="${esc(o)}" ${(v || []).includes(o) ? 'checked' : ''}><span>${esc(o)}</span></label>`).join('')}</div>`;
    }
    return '';
  }
  U.routes.gact = id => { const a = G.BY[id]; if (!a) return '<section class="panel"><p>Unknown activity.</p></section>';
    if (!W || W.a.id !== id) W = { a, answers: {}, saved: false, timers: {} };
    return `<header class="page-head"><a href="#garea-${a.area}" class="link">${esc(AREA[a.area].name)}</a><h1 class="display sm">${esc(realOf ? 'How it went: ' + a.title : a.title)}</h1><p class="muted">${esc(G.MODES[a.mode])} · ${esc(PRIV)}</p></header>
      ${realOf ? `<section class="panel"><p class="serif">${esc(a.realLife)}</p>${['What happened?', 'What did you say or do?', 'How did it feel, and how strong was the discomfort?', 'What would you do next time?'].map((q, k) => `<label class="field labelled"><span>${q}</span><textarea data-greal="${k}" rows="2"></textarea></label>`).join('')}<button class="btn primary" data-action="g-real-save">Save privately</button></section>` :
      `<section class="panel gact">${a.steps.map(stepHTML).join('')}
        <div class="row">${W.saved ? '<span class="ok">Saved privately.</span>' : `<button class="btn primary" data-action="g-save">Save</button>`}${W.saved && a.practise ? `<a class="btn" href="#roleplay-${a.practise}" data-action="cm-coach" data-on="1">Practise saying it</a>` : ''}${W.saved && window.MWAI && window.MWAI.client.provider !== 'none' && S.aiPrefs && S.aiPrefs.consent ? '<button class="btn ghost" data-action="g-ai">Reflect this back with AI</button>' : ''}<a class="btn ghost" href="#garea-${a.area}">Back</a></div>
        ${W.saved && a.realLife ? `<p class="muted small">Real-life step: ${esc(a.realLife)} It will wait for you on the ${esc(AREA[a.area].name)} page.</p>` : ''}
        ${W.saved && window.MWAI && window.MWAI.client.provider !== 'none' && S.aiPrefs && S.aiPrefs.consent ? '<p class="muted small">“Reflect with AI” sends only this activity’s answers, once, when you press it.</p>' : ''}
        <div id="gAi">${W.ai ? `<div class="ai-reflect"><p class="serif">${esc(W.ai.reflection)}</p>${W.ai.noticed ? `<p><strong>Something to notice:</strong> ${esc(W.ai.noticed)}</p>` : ''}${W.ai.question ? `<p><strong>A question:</strong> ${esc(W.ai.question)}</p>` : ''}<p class="muted small">AI-generated reflection. It can be wrong; you know your situation better.</p></div>` : ''}</div></section>`}`; };

  // ───────── emotional patterns (private)
  U.routes.feelings = () => { const p = G.emotionPatterns(S.glog);
    return `<header class="page-head"><a href="#garea-emotion" class="link">Emotional Awareness and Regulation</a><h1 class="display sm">Your emotional patterns</h1><p class="lede">What your check-ins show over the last 30 days. These are your own records, not a measurement of you.</p></header>
      ${!p.n ? '<section class="panel"><p>No check-ins yet.</p><a class="btn primary" href="#gact-em-checkin">Check in now</a></section>' : `<section class="panel"><p>${p.n} check-in${p.n === 1 ? '' : 's'} on ${p.days} day${p.days === 1 ? '' : 's'}${p.avg != null ? `. Average strength: ${['barely', 'mild', 'noticeable', 'strong', 'overwhelming'][Math.round(p.avg)]}.` : '.'}</p>
        <h2>Most frequent</h2><ul class="bars">${p.top.map(([e, n]) => `<li><span>${esc(e)}</span><span class="bar" style="--w:${Math.round(n / p.top[0][1] * 100)}%"></span><span class="muted small">${n}</span></li>`).join('')}</ul>
        ${p.strongest.length ? `<h2>When it was strongest</h2><ul class="plain-list">${p.strongest.map(s => `<li>${U.fmtDate(s.t)}: ${esc(s.feelings.join(', '))}${s.note ? ` — ${esc(s.note)}` : ''}</li>`).join('')}</ul>` : ''}
        <a class="btn" href="#gact-em-checkin">Check in again</a></section>`}<p class="muted small crisis">${esc(G.CRISIS)}</p>`; };

  // ───────── input handling
  document.addEventListener('input', e => { if (!W) return; const d = e.target.dataset;
    if (d.g != null) W.answers[d.g] = e.target.value;
    else if (d.gown != null) W.answers[d.gown + '-own'] = e.target.value;
    else if (d.glist != null) { const arr = (W.answers[d.glist] || []).slice(); arr[+d.k] = e.target.value; W.answers[d.glist] = arr; } });
  document.addEventListener('change', e => { if (!W) return; const d = e.target.dataset;
    if (d.gmulti != null) { const s = W.a.steps[+d.gmulti]; let arr = (W.answers[d.gmulti] || []).filter(x => x !== e.target.value); if (e.target.checked) { if (s.max && arr.length >= s.max) { e.target.checked = false; toast(`Up to ${s.max}.`); return; } arr = arr.concat([e.target.value]); } W.answers[d.gmulti] = arr; }
    else if (d.gpair != null) { W.answers[d.gpair] = Object.assign({}, W.answers[d.gpair], { [d.k]: +e.target.value }); }
    else if (d.gsort != null) { W.answers[d.gsort] = Object.assign({}, W.answers[d.gsort], { [d.k]: e.target.value }); } });
  document.addEventListener('click', async e => {
    const t = e.target.closest('[data-gchoice],[data-gscale],[data-gtimer],[data-action]'); if (!t) return;
    if (t.dataset.gchoice != null) { W.answers[t.dataset.gchoice] = t.dataset.v; U.route(); return; }
    if (t.dataset.gscale != null) { W.answers[t.dataset.gscale] = +t.dataset.v; U.route(); return; }
    if (t.dataset.gtimer != null) { const i = t.dataset.gtimer, s = +t.dataset.s, st = Date.now(); clearInterval(tm[i]); t.disabled = true; tm[i] = setInterval(() => { if (!W) { clearInterval(tm[i]); return; } const left = Math.max(0, s - Math.round((Date.now() - st) / 1000)); W.timers[i] = left; const el = document.getElementById('gTimer-' + i); if (el) el.textContent = left + 's'; if (!left) { clearInterval(tm[i]); if (el) el.textContent = 'Time.'; } }, 250); return; }
    const a = t.dataset.action; if (!a || !a.startsWith('g-')) return;
    if (a === 'g-save') { if (!G.complete(W.a, W.answers)) { toast('Answer each step first. A rough answer is fine.'); return; }
      const ans = JSON.parse(JSON.stringify(W.answers)); if (W.topic) ans.topic = W.topic;
      S.glog.push({ id: 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), aid: W.a.id, area: W.a.area, t: Date.now(), answers: ans }); saveLog(); W.saved = true; U.route(); }
    else if (a === 'g-real') { realOf = t.dataset.of; W = null; }
    else if (a === 'g-real-save') { const ans = {}; document.querySelectorAll('[data-greal]').forEach(el => { if (el.value.trim()) ans[el.dataset.greal] = el.value.trim(); }); if (!Object.keys(ans).length) { toast('Write something first.'); return; } const aid = location.hash.replace('#gact-', ''); S.glog.push({ id: 'g' + Date.now().toString(36), aid, area: G.BY[aid].area, t: Date.now(), real: true, of: realOf, answers: ans }); saveLog(); realOf = null; toast('Saved privately.'); location.hash = '#garea-' + G.BY[aid].area; }
    else if (a === 'g-ai') { const steps = W.a.steps.map((s, i) => ({ prompt: s.prompt, answer: Array.isArray(W.answers[i]) ? W.answers[i].join(', ') : typeof W.answers[i] === 'object' && W.answers[i] ? JSON.stringify(W.answers[i]) : s.kind === 'scale' && W.answers[i] != null ? s.labels[W.answers[i]] : String(W.answers[i] == null ? '' : W.answers[i]) })).filter(x => x.answer.trim());
      t.disabled = true; $('#gAi').innerHTML = '<p class="muted">Thinking…</p>';
      try { const o = await A.askJSON(A.reflectPromptL({ title: W.a.title, steps, lang: S.lang })); W.ai = { reflection: String(o.reflection || ''), noticed: String(o.noticed || ''), question: String(o.question || '') }; U.route(); }
      catch (er) { $('#gAi').innerHTML = `<p class="warn">${esc(er.message)}</p>`; t.disabled = false; } }
  });
  window.MWGUI = { get current() { return W; } };
})();
