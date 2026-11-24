/* MINDWORK voice — a shared capability, not a destination.
   Dictation: claude.ai's dictation on the hosted page; otherwise the browser's speech recognition, which in Chrome sends
   audio to Google — so it stays off until the user turns it on. Read-aloud: claude.ai's voice, or the browser's built-in
   voices (on-device, works offline). Recording: MediaRecorder, kept in memory unless the user downloads it. */
(function () {
  const U = window.MWUI; const { S, DB, esc, $, toast } = U;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const V = { dict: null, tts: null, prefs: { browserDictation: false, lang: 'en-ZA' }, rec: null, chunks: [], clip: null };
  U.onLoad.push(async () => { V.prefs = Object.assign(V.prefs, (await DB.get('kv', 'voice-prefs')) || {});
    if (window.claude && typeof window.claude.use === 'function') { try { V.dict = await window.claude.use('dictation'); } catch (e) {} try { V.tts = await window.claude.use('tts'); } catch (e) {} decorate(); } });
  const savePrefs = () => DB.put('kv', 'voice-prefs', V.prefs).catch(() => {});
  const canDictate = () => !!V.dict || (!!SR && V.prefs.browserDictation);
  const canSpeak = () => !!V.tts || 'speechSynthesis' in window;
  const canRecord = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);

  // ───────── dictation into a textarea
  let active = null;
  async function dictate(btn, ta) {
    if (active) { stop(); return; }
    const base = ta.value ? ta.value.replace(/\s*$/, ' ') : '';
    const setText = t => { ta.value = base + t; ta.dataset.spoken = '1'; ta.dispatchEvent(new Event('input', { bubbles: true })); };
    let finalText = '';
    if (V.dict) {
      try { V.dict.onPartial(({ text }) => setText(finalText + text)); V.dict.onFinal(({ text }) => { finalText += text + ' '; setText(finalText); }); V.dict.onState(({ state }) => { if (state === 'idle') end(); });
        active = { stop: () => V.dict.stop(), btn }; btn.classList.add('on'); btn.textContent = 'Stop'; await V.dict.start(); }
      catch (e) { end(); toast(e && e.code === 'not_granted' ? 'Dictation was declined. Typing still works.' : 'Dictation isn’t available right now.'); }
      return;
    }
    const r = new SR(); r.lang = V.prefs.lang; r.interimResults = true; r.continuous = true;
    r.onresult = ev => { let interim = ''; for (let i = ev.resultIndex; i < ev.results.length; i++) { const x = ev.results[i]; if (x.isFinal) finalText += x[0].transcript + ' '; else interim += x[0].transcript; } setText(finalText + interim); };
    r.onerror = ev => { toast(ev.error === 'not-allowed' ? 'Microphone permission was refused.' : ev.error === 'language-not-supported' ? 'This browser can’t recognise that language. Try English, or type.' : 'Dictation stopped: ' + ev.error); end(); };
    r.onend = () => end();
    active = { stop: () => r.stop(), btn }; btn.classList.add('on'); btn.textContent = 'Stop';
    try { r.start(); } catch (e) { end(); }
  }
  function stop() { if (active) active.stop(); }
  function end() { if (active) { active.btn.classList.remove('on'); active.btn.textContent = 'Speak'; } active = null; }

  // ───────── read aloud
  async function say(text, btn) {
    if (V.tts) { try { btn && (btn.textContent = 'Stop'); await V.tts.speak(text.slice(0, 2000)); } catch (e) { if (e && e.code === 'not_granted') toast('Read-aloud is turned off for this page.'); } finally { btn && (btn.textContent = 'Listen'); } return; }
    if (!('speechSynthesis' in window)) return;
    if (speechSynthesis.speaking) { speechSynthesis.cancel(); btn && (btn.textContent = 'Listen'); return; }
    const u = new SpeechSynthesisUtterance(text); u.lang = V.prefs.lang === 'xh-ZA' && speechSynthesis.getVoices().some(v => /^xh/i.test(v.lang)) ? 'xh-ZA' : 'en-ZA'; u.rate = 0.95;
    u.onend = () => { btn && (btn.textContent = 'Listen'); }; btn && (btn.textContent = 'Stop'); speechSynthesis.speak(u);
  }
  // resolves when speech ends, or after the time it would take, in case the device has speech but no voice that reports ending
  V.speakText = (text) => new Promise(res => { let done = false; const fin = v => { if (!done) { done = true; res(v); } }; setTimeout(() => fin(true), 1500 + text.split(/\s+/).length * 650); if (V.tts) { V.tts.speak(text).then(() => fin(true), () => fin(false)); return; } if (!('speechSynthesis' in window)) return fin(false); const u = new SpeechSynthesisUtterance(text); u.lang = 'en-ZA'; u.rate = 0.9; u.onend = () => fin(true); u.onerror = () => fin(false); speechSynthesis.speak(u); });

  // ───────── recording (memory only)
  async function record(box) {
    if (V.rec) { V.rec.stop(); return; }
    let stream; try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { toast('Microphone permission was refused.'); return; }
    V.chunks = []; V.rec = new MediaRecorder(stream); V.rec.ondataavailable = e => V.chunks.push(e.data);
    V.rec.onstop = () => { stream.getTracks().forEach(t => t.stop()); if (V.clip) URL.revokeObjectURL(V.clip); V.clip = URL.createObjectURL(new Blob(V.chunks, { type: V.rec.mimeType || 'audio/webm' })); V.rec = null; fillRecord(box); };
    V.rec.start(); fillRecord(box);
  }
  function fillRecord(box) {
    if (!box) return; if (!canRecord()) { box.innerHTML = ''; return; }
    box.innerHTML = `<button class="btn ${V.rec ? 'on' : ''}" data-voice-rec>${V.rec ? 'Stop recording' : V.clip ? 'Record again' : 'Record yourself'}</button>${V.clip && !V.rec ? `<audio controls src="${V.clip}"></audio><a class="link small" href="${V.clip}" download="mindwork-recording.webm">Download</a><span class="muted small">Kept only until you leave this page unless you download it.</span>` : ''}`;
  }

  // ───────── decorate pages after each render
  const SEL = '.ex-resp, .rp-input textarea, .ai-run textarea, .gstep textarea, #drText, .stage.active textarea, #jtext, #pzA, .bl-text';
  function decorate() {
    if (canDictate()) document.querySelectorAll(SEL).forEach(ta => { if (ta.nextElementSibling && ta.nextElementSibling.matches('[data-voice-dict]')) return; ta.insertAdjacentHTML('afterend', `<button type="button" class="btn small ghost voice-btn" data-voice-dict aria-label="Dictate into this box">Speak</button>`); });
    if (canSpeak()) { const last = [...document.querySelectorAll('.rp .bubble.them:not(.thinking)')].pop(); if (last && !last.querySelector('[data-voice-say]')) last.insertAdjacentHTML('beforeend', ' <button type="button" class="link small voice-say" data-voice-say aria-label="Read this aloud">Listen</button>');
      document.querySelectorAll('.puzzle .q-prompt').forEach(p => { if (!p.querySelector('[data-voice-say]')) p.insertAdjacentHTML('beforeend', ' <button type="button" class="link small voice-say" data-voice-say aria-label="Read the question aloud">Listen</button>'); }); }
    document.querySelectorAll('[data-voice-record]').forEach(b => { if (!b.dataset.filled) { b.dataset.filled = '1'; fillRecord(b); } });
  }
  new MutationObserver(() => decorate()).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('click', e => {
    const d = e.target.closest('[data-voice-dict]'); if (d) { e.preventDefault(); const ta = d.previousElementSibling; if (ta) dictate(d, ta); return; }
    const s = e.target.closest('[data-voice-say]'); if (s) { e.preventDefault(); const host = s.parentElement; const txt = host.childNodes[0] ? host.textContent.replace(/\s*(Listen|Stop)\s*$/, '') : ''; say(txt, s); return; }
    const r = e.target.closest('[data-voice-rec]'); if (r) { e.preventDefault(); record(r.parentElement); }
  });
  // ───────── settings
  const prefsOrig = U.routes.prefs, prefsAfter = U.routes.prefs.after;
  U.routes.prefs = () => prefsOrig() + `<section class="panel" id="voicePrefs"><h2>Voice</h2>
    <ul class="plain-list"><li>Dictation: ${V.dict ? 'available through claude.ai.' : SR ? 'available through this browser’s speech recognition. In Chrome, that sends your audio to Google to turn it into text, so it is off until you allow it below.' : 'not available in this browser. Typing always works.'}</li>
    <li>Read-aloud: ${V.tts ? 'available through claude.ai.' : 'speechSynthesis' in window ? 'available using voices built into your device (works offline).' : 'not available in this browser.'}</li>
    <li>Recording yourself: ${canRecord() ? 'available. Recordings stay on this device, only until you leave the page unless you download them.' : 'not available in this browser.'}</li>
    <li>isiXhosa: recognition and voices depend on your browser and device; many don’t support isiXhosa yet.</li></ul>
    ${!V.dict && SR ? `<label class="check"><input type="checkbox" id="vBrowser" ${V.prefs.browserDictation ? 'checked' : ''}><span>Allow dictation through this browser’s speech service</span></label>` : ''}
    <label class="sel">Speech language <select id="vLang"><option value="en-ZA" ${V.prefs.lang === 'en-ZA' ? 'selected' : ''}>English (South Africa)</option><option value="en-GB" ${V.prefs.lang === 'en-GB' ? 'selected' : ''}>English (UK)</option><option value="xh-ZA" ${V.prefs.lang === 'xh-ZA' ? 'selected' : ''}>isiXhosa (if your browser supports it)</option></select></label></section>`;
  U.routes.prefs.after = prefsAfter;
  document.addEventListener('change', e => { if (e.target.id === 'vBrowser') { V.prefs.browserDictation = e.target.checked; savePrefs(); decorate(); } if (e.target.id === 'vLang') { V.prefs.lang = e.target.value; savePrefs(); } });
  // one spoken answer: resolves with the final text (empty if nothing was heard)
  V.listen = () => new Promise(res => {
    if (V.dict) { let text = ''; V.dict.onFinal(({ text: t }) => { text += t + ' '; }); V.dict.onState(({ state }) => { if (state === 'idle') res(text.trim()); }); V.dict.start().catch(() => res('')); return; }
    if (!SR || !V.prefs.browserDictation) return res('');
    const r = new SR(); r.lang = V.prefs.lang; r.interimResults = false; r.continuous = false; let text = '';
    r.onresult = ev => { text = [...ev.results].map(x => x[0].transcript).join(' '); }; r.onend = () => res(text.trim()); r.onerror = () => res(text.trim()); try { r.start(); } catch (e) { res(''); }
  });
  V.canRecord = canRecord; V.canSpeak = canSpeak; V.canDictate = canDictate;
  window.MWVOICE = V;
})();
