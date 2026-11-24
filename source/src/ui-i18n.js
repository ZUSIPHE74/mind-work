/* MINDWORK interface translation (isiXhosa). Translated by AI, not yet reviewed by a fluent speaker; the app says so.
   Text is translated at display time from window.MWXH. Never translated: anything the user writes, anything an AI writes,
   and exercises judged by English-language rules (they show a notice instead, because those rules can't judge isiXhosa). */
(function () {
  const U = window.MWUI, D = window.MWXH || {}; const { S } = U;
  const DAYS = { Monday: 'uMvulo', Tuesday: 'uLwesibini', Wednesday: 'uLwesithathu', Thursday: 'uLwesine', Friday: 'uLwesihlanu', Saturday: 'uMgqibelo', Sunday: 'iCawe' };
  const MONTHS = { January: 'kaJanyuwari', February: 'kaFebruwari', March: 'kaMatshi', April: 'ka-Epreli', May: 'kaMeyi', June: 'kaJuni', July: 'kaJulayi', August: 'ka-Agasti', September: 'kaSeptemba', October: 'ka-Okthobha', November: 'kaNovemba', December: 'kaDisemba' };
  const SKIP = 'textarea, input, select option:not([value]), script, style, .player, .rp:not(.ai-run) .chat, .rp:not(.ai-run) .rp-input, .bubble.you, .ai-run .bubble, .evq, .ex, .j-current, .j-text, .ai-reflect, [data-en-only], .xh-keep';
  const ENGLISH_ONLY = '.player, .rp:not(.ai-run), .puzzle[data-kind="answer"], .puzzle[data-kind="escape"]';
  const NOTE = 'This exercise is checked by English-language rules, so it stays in English. In isiXhosa, use the AI features (Explore a question, Open conversation) or the Bilingual Expression Lab, where your isiXhosa is understood.';
  function lookup(t) {
    const k = t.replace(/\s+/g, ' ').trim(); if (!k) return null;
    if (D[k]) return D[k];
    if (/[.!]$/.test(k) && D[k.slice(0, -1)]) return D[k.slice(0, -1)] + k.slice(-1); // stored without the final full stop
    const m = /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), (January|February|March|April|May|June|July|August|September|October|November|December) (\d+)$/.exec(k);
    if (m) return `${DAYS[m[1]]}, ${m[3]} ${MONTHS[m[2]]}`;
    if (/…$/.test(k)) { const stem = k.slice(0, -1); const full = Object.keys(D).find(x => x.startsWith(stem)); if (full) { const tr = D[full]; const cut = Math.min(tr.length, Math.round(stem.length * tr.length / full.length)); return tr.slice(0, cut).replace(/\s+\S*$/, '') + '…'; } } // a preview cut short
        const nums = k.match(/\d+(?:[.,]\d+)?/g); if (!nums) return null;
    const tk = k.replace(/\d+(?:[.,]\d+)?/g, '{n}'); const v = D[tk]; if (!v) return null;
    let i = 0; return v.replace(/\{n\}/g, () => nums[i++] != null ? nums[i - 1] : '');
  }
  const ATTRS = ['placeholder', 'aria-label', 'title'];
  function translateNode(n, on) {
    if (n.nodeType === 3) {
      const host = n.parentElement; if (!host || host.closest(SKIP)) return;
      if (on) { const src = n.__en != null ? n.__en : n.textContent; const tr = lookup(src); if (tr) { if (n.__en == null) n.__en = src; const lead = src.match(/^\s*/)[0], tail = src.match(/\s*$/)[0]; const want = lead + tr + tail; if (n.textContent !== want) n.textContent = want; } }
      else if (n.__en != null) { if (n.textContent !== n.__en) n.textContent = n.__en; n.__en = null; }
      return;
    }
    if (n.nodeType !== 1 || n.matches(SKIP)) return;
    ATTRS.forEach(a => { if (!n.hasAttribute(a)) return; const key = '__en_' + a; if (on) { const src = n[key] || n.getAttribute(a); const tr = lookup(src); if (tr) { n[key] = src; if (n.getAttribute(a) !== tr) n.setAttribute(a, tr); } } else if (n[key]) { n.setAttribute(a, n[key]); n[key] = null; } });
    n.childNodes.forEach(c => translateNode(c, on));
  }
  function notes(on) {
    document.querySelectorAll('.xh-note').forEach(x => { if (!on) x.remove(); });
    if (!on) return; document.querySelectorAll(ENGLISH_ONLY).forEach(el => { if (!el.querySelector(':scope > .xh-note')) el.insertAdjacentHTML('afterbegin', `<p class="xh-note xh-keep" lang="xh" role="note">${U.esc(D[NOTE] || NOTE)}</p>`); });
  }
  function banner(on) {
    let b = document.getElementById('xhBanner');
    if (on && !b) document.body.insertAdjacentHTML('afterbegin', '<p id="xhBanner" class="xh-banner xh-keep" role="note" lang="xh">IsiXhosa: iguqulelwe yi-AI (uClaude), ayikaphononongwa sisithethi esiyiso-isiXhosa. <span lang="en">Translated by AI, not yet reviewed by a fluent speaker.</span></p>');
    else if (!on && b) b.remove();
  }
  let busy = false;
  function apply() { if (busy) return; busy = true; const on = S.lang === 'xh'; document.documentElement.lang = on ? 'xh' : 'en'; banner(on); notes(on); translateNode(document.body, on); busy = false; }
  new MutationObserver(muts => { if (busy || S.lang !== 'xh') return; busy = true; muts.forEach(m => { m.addedNodes.forEach(n => translateNode(n, true)); if (m.type === 'characterData') translateNode(m.target, true); }); notes(true); busy = false; }).observe(document.body, { childList: true, subtree: true, characterData: true });
  U.onLoad.push(async () => { setTimeout(apply, 0); });
  window.MWI18N = { apply, lookup, coverage: () => Object.keys(D).length };
})();
