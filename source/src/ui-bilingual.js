/* MINDWORK — Bilingual Expression Lab (Communicate) and the isiXhosa interface option (beta, unreviewed). */
(function () {
  const U = window.MWUI, B = window.MWBL, A = window.MWAI; const { S, DB, esc, $, toast } = U;
  S.blog = []; S.vocab = []; S.lang = 'en';
  U.onLoad.push(async () => { S.blog = (await DB.get('kv', 'bilinglog')) || []; S.vocab = (await DB.get('kv', 'vocab')) || []; S.lang = (await DB.get('kv', 'ui-lang')) || 'en'; applyLang(); });
  const save = (k, v) => DB.put('kv', k, v).catch(() => {});
  const aiOn = () => window.MWAI && A.client.provider !== 'none' && S.aiPrefs && S.aiPrefs.consent;
  U.routes.bilingual = () => { const lv = B.practiceLevel(S.blog); const gaps = S.blog.flatMap(e => (e.gaps || []).map(g => ({ g, t: e.t }))).filter(x => !S.vocab.some(v => v.en === x.g || v.xh === x.g));
    return `<header class="page-head"><a href="#communicate" class="link">Communicate</a><h1 class="display sm">Bilingual Expression Lab</h1><p class="lede">Thinking, explaining and keeping meaning and nuance in English and isiXhosa: not a translation tool.</p><p class="muted small">Practice level ${lv.level}: ${esc(lv.name)} (${lv.n} exercises). This counts practice, not proficiency, which MINDWORK can’t measure reliably.</p></header>
      <section class="pz-list">${B.MODES.map(m => `<a class="pz-card" href="#blx-${m.id}"><strong>${esc(m.name)}</strong><span class="muted small">${esc(m.note || 'Write your answer in both languages.')}</span><span class="pz-status">${m.ai && !aiOn() ? 'Needs AI' : S.blog.filter(e => e.mode === m.id).length + ' done'}</span></a>`).join('')}</section>
      <section class="panel"><h2>Expression gaps</h2>${gaps.length ? `<p class="muted small">Words and phrases you couldn’t find. Add one to your vocabulary journal once you have it.</p><ul class="chips">${[...new Set(gaps.map(x => x.g))].map(g => `<li>${esc(g)}</li>`).join('')}</ul>` : '<p class="muted">None recorded yet.</p>'}</section>
      <section class="panel"><h2>Vocabulary and concept journal</h2><div class="voc-add"><input id="vEn" placeholder="English"><input id="vXh" placeholder="isiXhosa"><input id="vNote" placeholder="Notes: usage, nuance, region"><button class="btn small" data-action="bl-vadd">Add</button></div>
        ${S.vocab.length ? `<div class="table-wrap"><table class="ov-table"><thead><tr><th scope="col">English</th><th scope="col">isiXhosa</th><th scope="col">Notes</th></tr></thead><tbody>${S.vocab.slice().reverse().map(v => `<tr><td>${esc(v.en)}</td><td>${esc(v.xh)}</td><td class="small">${esc(v.note || '')}</td></tr>`).join('')}</tbody></table></div>` : ''}</section>`; };
  let BX = null;
  U.routes.blx = id => { const m = B.BY[id]; if (!m) return '<section class="panel"><p>Unknown mode.</p></section>';
    const head = `<header class="page-head"><a href="#bilingual" class="link">Bilingual Expression Lab</a><h1 class="display sm">${esc(m.name)}</h1>${m.note ? `<p class="lede">${esc(m.note)}</p>` : ''}</header>`;
    if (m.ai) return head + (aiOn() ? '<section class="panel"><p>You’ll talk with Ayanda, who moves between isiXhosa and English. Reply in whichever language comes naturally. Feedback comes at the end.</p><button class="btn primary" data-action="bl-roleplay">Start the conversation</button></section>' : '<section class="panel ai-gate"><p>This needs AI, which isn’t available or allowed in this copy. The other modes work without it.</p></section>');
    if (!BX || BX.id !== id) BX = { id, p: Math.min(m.prompts.length - 1, S.blog.filter(e => e.mode === id).length % m.prompts.length), ans: {}, saved: false };
    const prompt = m.prompts[BX.p];
    return head + `<section class="panel"><p class="q-prompt">${esc(prompt)}</p>${m.speaking ? `<div class="rec-box" data-voice-record="bilingual"></div><p class="muted small">Speak out loud. Recording is optional and stays on this device.</p>` : m.fields.map(f => `<label class="field labelled"><span>${B.FIELD[f]}</span><textarea class="bl-text" data-bl="${f}" rows="4" lang="${f === 'xh' ? 'xh' : 'en'}">${esc(BX.ans[f] || '')}</textarea></label>`).join('')}
      <label class="field labelled"><span>Words or phrases you couldn’t find (comma-separated, optional)</span><input type="text" id="blGaps" value="${esc(BX.gaps || '')}"></label>
      <fieldset class="useful"><legend>Your own review</legend>${B.REVIEW.map((r, k) => `<label class="check opt"><input type="checkbox" class="bl-rev" value="${k}" ${(BX.review || []).includes(k) ? 'checked' : ''}><span>${esc(r)}</span></label>`).join('')}</fieldset>
      <div class="row">${BX.saved ? '<span class="ok">Saved.</span>' : '<button class="btn primary" data-action="bl-save">Save</button>'}${BX.saved && !m.speaking && aiOn() ? '<button class="btn ghost" data-action="bl-ai">Ask AI about meaning and nuance</button>' : ''}<button class="btn ghost" data-action="bl-next">Another prompt</button></div>
      <div id="blAi">${BX.ai ? aiHTML(BX.ai) : ''}</div></section>`; };
  function aiHTML(f) { return `<div class="ai-fb"><p><strong>Meaning across the two:</strong> ${esc({ same: 'the same', close: 'close', different: 'different' }[f.meaning] || 'unclear')}. ${esc(f.summary || '')}</p>
    ${f.differences.length ? `<h3>Differences</h3><ul>${f.differences.map(x => `<li>${esc(x.point)} <span class="evq">“${esc(x.evidence)}”</span></li>`).join('')}</ul>` : ''}
    ${f.natural.length ? `<h3>Naturalness</h3><ul>${f.natural.map(x => `<li>${x.language === 'xh' ? 'isiXhosa' : 'English'}: ${esc(x.point)} <span class="evq">“${esc(x.evidence)}”</span></li>`).join('')}</ul>` : ''}
    ${f.try ? `<p><strong>Try:</strong> ${esc(f.try)}</p>` : ''}<p class="muted small">The AI rates its own confidence about isiXhosa usage as <strong>${esc(f.isixhosa_confidence || 'low')}</strong>.${f.uncertain.length ? ' Unsure about: ' + esc(f.uncertain.join('; ')) : ''} A fluent speaker’s judgement outranks this.${f.removed ? ` ${f.removed} point(s) removed because the quoted evidence wasn’t in your words.` : ''}</p></div>`; }
  document.addEventListener('input', e => { if (BX && e.target.dataset.bl) BX.ans[e.target.dataset.bl] = e.target.value; if (BX && e.target.id === 'blGaps') BX.gaps = e.target.value; });
  document.addEventListener('change', e => { if (BX && e.target.classList.contains('bl-rev')) BX.review = [...document.querySelectorAll('.bl-rev:checked')].map(c => +c.value); if (e.target.id === 'uiLang') { S.lang = e.target.value; save('ui-lang', S.lang); U.route(); applyLang(); } });
  document.addEventListener('click', async e => { const t = e.target.closest('[data-action]'); if (!t) return; const a = t.dataset.action; if (!a.startsWith('bl-')) return;
    if (a === 'bl-save') { const m = B.BY[BX.id]; if (!m.speaking && m.fields.some(f => !(BX.ans[f] || '').trim())) { toast('Write both parts first.'); return; }
      S.blog.push({ id: 'b' + Date.now().toString(36), kind: 'ex', mode: BX.id, prompt: m.prompts[BX.p], t: Date.now(), ans: Object.assign({}, BX.ans), review: BX.review || [], gaps: (BX.gaps || '').split(',').map(x => x.trim()).filter(Boolean) }); save('bilinglog', S.blog); BX.saved = true; U.route(); }
    else if (a === 'bl-next') { const m = B.BY[BX.id]; BX = { id: BX.id, p: (BX.p + 1) % m.prompts.length, ans: {}, saved: false }; U.route(); }
    else if (a === 'bl-vadd') { const en = $('#vEn').value.trim(), xh = $('#vXh').value.trim(); if (!en && !xh) { toast('Add at least one word.'); return; } S.vocab.push({ en, xh, note: $('#vNote').value.trim(), t: Date.now() }); save('vocab', S.vocab); U.route(); }
    else if (a === 'bl-ai') { const m = B.BY[BX.id]; t.disabled = true; $('#blAi').innerHTML = '<p class="muted">Thinking…</p>';
      try { const raw = await A.askJSON(B.feedbackPrompt({ mode: BX.id, prompt: m.prompts[BX.p], answers: BX.ans })); const g = A.guardFeedback({ strengths: [], development: (raw.differences || []).map(x => Object.assign({}, x)), qualities: [] }, Object.values(BX.ans));
        const nat = (Array.isArray(raw.natural) ? raw.natural : []).filter(x => x && x.evidence && Object.values(BX.ans).join(' ').toLowerCase().includes(String(x.evidence).toLowerCase().slice(0, 20)));
        BX.ai = { meaning: raw.meaning, summary: String(raw.summary || ''), differences: g.development, natural: nat, try: String(raw.try || ''), isixhosa_confidence: ['low', 'medium', 'high'].includes(raw.isixhosa_confidence) ? raw.isixhosa_confidence : 'low', uncertain: (raw.uncertain || []).map(String), removed: g.removed.length + ((raw.natural || []).length - nat.length) };
        const rec = S.blog.filter(x => x.mode === BX.id).pop(); if (rec) { rec.ai = BX.ai; save('bilinglog', S.blog); } U.route(); }
      catch (er) { $('#blAi').innerHTML = `<p class="warn">${esc(er.message)}</p>`; t.disabled = false; } }
    else if (a === 'bl-roleplay') { if (window.MWAIUI && window.MWAIUI.startTalk) window.MWAIUI.startTalk(B.ROLEPLAY); }
  });
  // ───────── isiXhosa interface: see ui-i18n.js
  function applyLang() { if (window.MWI18N) window.MWI18N.apply(); }
  const prefsOrig = U.routes.prefs, prefsAfter = U.routes.prefs.after;
  U.routes.prefs = () => prefsOrig() + `<section class="panel"><h2>Language</h2><label class="sel">Interface language <select id="uiLang"><option value="en" ${S.lang !== 'xh' ? 'selected' : ''}>English</option><option value="xh" ${S.lang === 'xh' ? 'selected' : ''}>isiXhosa (translated by AI, not yet reviewed)</option></select></label><p class="muted small">The isiXhosa interface was translated by AI (Claude) and hasn’t yet been reviewed by a fluent speaker, so some wording may be unnatural or wrong. AI features (exploration, open conversation, feedback, Grow reflection) run in isiXhosa. Exercises judged by English-language rules stay in English and say so, because those rules can’t judge isiXhosa fairly.</p></section>`;
  U.routes.prefs.after = prefsAfter;
  window.MWBLUI = { applyLang };
})();
