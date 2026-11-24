/* MINDWORK Study Lab interface. Read → Retrieve → Check → Correct → Apply → Review. */
(function () {
  const E = window.MW, U = window.MWUI, X = window.MWX, Q = window.MWS;
  const { S, DB, esc, $, toast, confirmDlg, short, fmtDate } = U;
  const DAY = 864e5;
  S.books = []; S.cards = {}; S.slog = []; S.notes = [];
  const OBJ = [
    ['understand', 'Understand a new chapter', 'Orientation, reading, closed-book recall, questions, gaps, correction, application and scheduling.'],
    ['memorise', 'Memorise important concepts', 'Concentrates on definitions, terms and lists, then schedules them for review.'],
    ['test', 'Prepare for a test', 'A mixed practice test — mostly short answers — then gaps and correction.'],
    ['longterm', 'Retain it long-term', 'Closed-book recall and questions, with everything scheduled for spaced review.'],
    ['connect', 'Connect concepts', 'Distinctions and relationships across the chapters you choose.'],
    ['apply', 'Apply the knowledge', 'Use the book’s concepts in situations of your own, then check against the book.'],
    ['review', 'Review what I’ve studied', 'Due questions from the chosen chapters, interleaved.']];
  const STAGES = {
    understand: ['orient', 'read', 'free', 'questions', 'gaps', 'correct', 'apply', 'schedule', 'report'],
    memorise: ['orient', 'read', 'free', 'questions', 'gaps', 'correct', 'schedule', 'report'],
    test: ['questions', 'gaps', 'correct', 'schedule', 'report'],
    longterm: ['free', 'questions', 'gaps', 'correct', 'schedule', 'report'],
    connect: ['free', 'questions', 'gaps', 'correct', 'apply', 'schedule', 'report'],
    apply: ['orient', 'apply', 'questions', 'gaps', 'schedule', 'report'] };
  const STAGE_NAME = { orient: 'Orientation', read: 'Reading', free: 'Closed-book recall', questions: 'Targeted recall', gaps: 'Knowledge gaps', correct: 'Targeted correction', apply: 'Application', schedule: 'Review scheduling', report: 'Chapter report' };
  const TYPE_NAME = { definition: 'Definition recall', reverse: 'Reverse recall', cloze: 'Fill the gap', list: 'Structured recall', order: 'Sequence', reasoning: 'Author’s reasoning', distinction: 'Distinction', application: 'Application', mc: 'Multiple choice', multi: 'Select all that apply', match: 'Matching', free: 'Free recall', relation: 'Relationship', compare: 'Compare and contrast', why: 'Ask why', cumulative: 'Cumulative', map: 'Concept map' };
  const STATE_NAME = { new: 'New', learning: 'Learning', developing: 'Developing', retained: 'Retained', 'needs review': 'Needs review' };

  // ───────── data
  const save = {
    book: b => DB.put('books', b.id, b).catch(err),
    card: c => DB.put('cards', c.qid, c).catch(err),
    log: l => DB.put('studylog', l.id, l).catch(err),
    note: n => DB.put('notes', n.id, n).catch(err)
  };
  function err(e) { toast((e && /quota/i.test(e.name + e.message)) ? 'Storage is full, so this wasn’t saved. Remove a book or export a backup and free space.' : 'Couldn’t save: ' + ((e && e.message) || 'storage error')); throw e; }
  U.onLoad = U.onLoad || []; U.onLoad.push(async () => {
    S.books = ((await DB.all('books')) || []).sort((a, b) => (b.last ? b.last.t : b.added) - (a.last ? a.last.t : a.added));
    ((await DB.all('cards')) || []).forEach(c => S.cards[c.qid] = c);
    S.slog = ((await DB.all('studylog')) || []).sort((a, b) => a.t - b.t);
    S.notes = ((await DB.all('notes')) || []);
    S.studyDraft = (await DB.get('kv', 'study-draft')) || null;
  });
  const bookOf = id => S.books.find(b => b.id === id);
  const qIndex = new Map(); const qOf = (book, qid) => { if (!qIndex.has(book.id)) qIndex.set(book.id, new Map((book.questions || []).map(q => [q.id, q]))); return qIndex.get(book.id).get(qid); };
  const paraOf = (book, id) => { for (const c of book.chapters) for (const s of c.sections) { const p = s.paras.find(x => x.id === id); if (p) return { c, s, p }; } return null; };
  const chOf = (book, id) => book.chapters.find(c => c.id === id || c.sections.some(s => s.id === id));
  const where = (book, q) => { const c = book.chapters.find(x => x.id === q.chapterId); const s = c && c.sections.find(x => x.id === q.sectionId); return [c && c.title, s && s.title !== (c && c.title) ? s.title : null, q.page != null ? 'p. ' + q.page : null].filter(Boolean).join(' · '); };
  const cardsOf = bookId => Object.values(S.cards).filter(c => c.bookId === bookId);
  const termsOf = book => [...new Set((book.questions || []).filter(q => q.type === 'definition' || q.type === 'cloze').map(q => q.concept))];
  const COVERS = [['#1C1B21', '#E8226F'], ['#2346E0', '#F6F4F0'], ['#6A2BD8', '#F6F4F0'], ['#ECE6DC', '#1C1B21'], ['#1E2B78', '#E8226F'], ['#A62AB8', '#F6F4F0']];
  const cover = b => { const [bg, fg] = COVERS[parseInt(Q.hash(b.title), 36) % COVERS.length]; return `<div class="cover" style="--bg:${bg};--fg:${fg}" aria-hidden="true"><span class="cv-t">${esc(short(b.title, 60))}</span>${b.author ? `<span class="cv-a">${esc(b.author)}</span>` : ''}${b.sample ? '<span class="cv-s">Sample</span>' : ''}</div>`; };
  function readPct(b) { const ps = b.progress || {}; const tot = b.chapters.reduce((n, c) => n + c.sections.reduce((m, s) => m + s.paras.length, 0), 0); const seen = b.chapters.reduce((n, c) => n + Math.round((ps[c.id] || 0) * c.sections.reduce((m, s) => m + s.paras.length, 0)), 0); return tot ? seen / tot : 0; }

  // ───────── libraries are bundled but started only when needed
  const loaded = {};
  function loadLib(id) { if (loaded[id]) return; const src = document.getElementById(id); if (!src) throw new X.ExtractError('lib', 'A document reader is missing from this copy of the app.'); const s = document.createElement('script'); const raw = src.textContent.trim(); s.textContent = src.dataset.enc === 'base64' ? new TextDecoder().decode(Uint8Array.from(atob(raw), c => c.charCodeAt(0))) : raw; document.head.appendChild(s); loaded[id] = true; }
  function libsFor(ext) {
    if (ext === 'pdf') { loadLib('lib-pdfworker'); window.pdfjsWorker = window.pdfjsWorker || window['pdfjs-dist/build/pdf.worker']; loadLib('lib-pdf'); window.pdfjsLib = window.pdfjsLib || window['pdfjs-dist/build/pdf']; if (window.pdfjsLib && !window.pdfjsLib.GlobalWorkerOptions.workerSrc) window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'about:blank'; }
    if (ext === 'epub' || ext === 'docx') loadLib('lib-jszip');
    if (ext === 'docx') loadLib('lib-mammoth');
  }

  async function addBook(file, buf, opts) {
    opts = opts || {};
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    try { libsFor(ext); } catch (e) { throw e; }
    const r = await X.extract(file, buf, opts.onProgress);
    const book = Object.assign(r, { id: 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), added: Date.now(), sample: !!opts.sample, progress: {}, last: null });
    book.questions = Q.generate(book); book.gen = Q.GEN_VERSION;
    book.defs = Q.findDefinitions(book).length;
    S.books.unshift(book); await save.book(book); return book;
  }

  // ───────── dashboard + library
  let libQuery = '';
  U.routes.study = () => {
    const due = Object.values(S.cards).filter(c => c.state !== 'new' && c.due <= Date.now()).length;
    const fresh = Object.values(S.cards).filter(c => c.state === 'new').length;
    const g = Q.gaps(S.slog, Object.values(S.cards));
    const last = S.books.filter(b => b.last).sort((a, b) => b.last.t - a.last.t)[0];
    const sessions = groupSessions().slice(0, 6);
    const books = S.books.filter(b => !libQuery || (b.title + ' ' + (b.author || '')).toLowerCase().includes(libQuery.toLowerCase()));
    const textHits = libQuery.length >= 3 ? searchText(libQuery).slice(0, 12) : [];
    return `<header class="page-head study-head"><h1 class="display sm">Study Lab</h1><p class="lede">Read. Retrieve. Connect. Apply. Your own non-fiction books, studied by recalling them rather than rereading them.</p></header>
      <section class="study-top">
        <div class="panel upload" id="drop"><h2>Add a book</h2><p class="small">PDF, EPUB, DOCX or TXT. Processed on this device; nothing is uploaded anywhere.</p>
          <label class="btn primary file-btn">Choose files<input type="file" id="bookFile" multiple accept=".pdf,.epub,.docx,.txt,.md,application/pdf,application/epub+zip,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"></label>
          <p class="muted small">Or drop files here. Scanned PDFs need OCR first; DRM-protected books can’t be opened.</p>
          <div id="uploadStatus" role="status" aria-live="polite"></div>
          ${!S.books.some(b => b.sample) ? '<button class="btn ghost small" data-action="sample-book">Try a short sample book (clearly labelled as a sample)</button>' : ''}</div>
        <div class="panel reviews"><h2>Today’s reviews</h2>${due ? `<p class="big-n">${due}</p><p>question${due === 1 ? '' : 's'} due across your books.</p><div class="row"><button class="btn primary" data-action="review" data-size="10">Quick review (up to 10)</button><button class="btn" data-action="review" data-size="40">Full review</button></div>` : `<p>${Object.keys(S.cards).length ? 'Nothing due right now. Reviews appear when a question is about to be forgotten.' : 'Study a chapter and its questions will be scheduled here.'}</p>${fresh ? `<button class="btn small" data-action="review" data-size="10" data-new="1">Learn ${Math.min(10, fresh)} new questions</button>` : ''}`}</div>
      </section>
      ${last || S.studyDraft ? `<section class="panel row-panel continue-study"><div>${S.studyDraft && bookOf(S.studyDraft.bookId) ? `<h2>Continue studying</h2><p>${esc(bookOf(S.studyDraft.bookId).title)} — ${esc(STAGE_NAME[S.studyDraft.stages[S.studyDraft.si]] || 'review')}</p>` : `<h2>Continue reading</h2><p>${esc(last.title)} — ${esc((last.chapters.find(c => c.id === last.last.chapterId) || {}).title || '')}</p>`}</div>
        ${S.studyDraft && bookOf(S.studyDraft.bookId) ? '<a class="btn primary" href="#studyrun">Resume study session</a>' : `<a class="btn primary" href="#read-${last.id}.${last.last.chapterId}">Resume reading</a>`}</section>` : ''}
      <section><div class="section-head"><h2 class="h2">My books</h2><label class="search"><span class="sr">Search your library</span><input id="libSearch" type="search" placeholder="Search titles, authors and text" value="${esc(libQuery)}"></label></div>
        ${books.length ? `<div class="shelf">${books.map(b => { const d = cardsOf(b.id).filter(c => c.state !== 'new' && c.due <= Date.now()).length; const studied = new Set(S.slog.filter(l => l.bookId === b.id).map(l => l.chapterId)).size; return `<a class="book" href="#book-${b.id}">${cover(b)}<span class="bk-t">${esc(b.title)}</span><span class="muted small">${esc(b.author || 'Author unknown')}</span><span class="small">Read ${Math.round(readPct(b) * 100)}% · studied ${studied}/${b.chapters.length} chapters${d ? ` · <strong>${d} due</strong>` : ''}</span></a>`; }).join('')}</div>` : `<p class="muted">${S.books.length ? 'No titles match.' : 'Your library is empty. Add a book above.'}</p>`}
        ${textHits.length ? `<h3>Passages mentioning “${esc(libQuery)}”</h3><ul class="hits">${textHits.map(h => `<li><a href="#read-${h.b.id}.${h.c.id}" data-para="${h.p.id}">${esc(h.b.title)} · ${esc(h.c.title)}${h.p.page != null ? ' · p. ' + h.p.page : ''}</a><span>${esc(short(h.p.text, 200))}</span></li>`).join('')}</ul>` : ''}</section>
      ${S.books.length >= 2 ? `<section class="panel row-panel"><div><h2>Knowledge Connections</h2><p>Connect concepts across your books — similar ideas, competing explanations, outright disagreements. ${(S.links || []).length ? (S.links || []).length + ' saved.' : ''}</p></div><a class="btn" href="#connections">Open Knowledge Connections</a></section>` : ''}
      ${g.length ? `<section class="panel"><h2>Knowledge gaps</h2><p class="muted small">Drawn only from your answers in the Study Lab. A gap appears once it has happened at least twice.</p><ul class="gap-list">${g.map(x => `<li><strong>${esc(x.title)}</strong><span>${esc(x.text)}</span><button class="btn small" data-action="gap-practise" data-gap="${esc(x.id)}">Work on this</button></li>`).join('')}</ul></section>` : ''}
      ${sessions.length ? `<section class="panel"><h2>Recent study</h2><ul class="recent">${sessions.map(s => `<li><span class="dot" style="--c:var(--blue)"></span><span>${esc(s.title)}</span><span class="muted">${s.correct}/${s.total} correct${s.free != null ? ` · recall ${Math.round(s.free * 100)}%` : ''}</span><span class="muted">${fmtDate(s.t)}</span></li>`).join('')}</ul></section>` : ''}`;
  };
  U.routes.study.after = () => {
    const f = $('#bookFile'); if (f) f.addEventListener('change', e => upload([...e.target.files]));
    const d = $('#drop'); if (d) { d.addEventListener('dragover', e => { e.preventDefault(); d.classList.add('over'); }); d.addEventListener('dragleave', () => d.classList.remove('over')); d.addEventListener('drop', e => { e.preventDefault(); d.classList.remove('over'); upload([...e.dataTransfer.files]); }); }
    const s = $('#libSearch'); if (s) { s.addEventListener('change', () => { libQuery = s.value.trim(); U.route(); }); s.addEventListener('keydown', e => { if (e.key === 'Enter') { libQuery = s.value.trim(); U.route(); } }); }
  };
  function searchText(q) { const n = q.toLowerCase(); const out = []; S.books.forEach(b => b.chapters.forEach(c => c.sections.forEach(s => s.paras.forEach(p => { if (out.length < 40 && p.text.toLowerCase().includes(n)) out.push({ b, c, p }); })))); return out; }
  function groupSessions() { const m = new Map(); S.slog.forEach(l => { const k = l.session || l.id; const g = m.get(k) || { t: l.t, total: 0, correct: 0, free: null, title: (bookOf(l.bookId) || {}).title || 'Removed book' }; if (l.type === 'free') g.free = l.score; else if (l.result) { g.total++; if (l.result === 'correct') g.correct++; } g.t = Math.max(g.t, l.t); m.set(k, g); }); return [...m.values()].sort((a, b) => b.t - a.t); }

  async function upload(files) {
    const st = $('#uploadStatus'); if (!files.length) return;
    for (const f of files) {
      st.innerHTML = `<p>Reading <strong>${esc(f.name)}</strong>…</p><progress id="upProg" max="1" value="0"></progress>`;
      try {
        const buf = await f.arrayBuffer();
        const b = await addBook(f, buf, { onProgress: v => { const p = $('#upProg'); if (p) p.value = v; } });
        const nq = b.questions.length;
        st.innerHTML = `<div class="up-ok"><p><strong>${esc(b.title)}</strong> added: ${b.chapters.length} chapters, ${b.chapters.reduce((n, c) => n + c.sections.length, 0)} sections, ${b.words.toLocaleString()} words${b.pages ? ', ' + b.pages + ' pages' : ''}. ${nq} questions could be grounded in the text${b.defs ? ` (${b.defs} defined terms found)` : ''}.</p>${b.warnings.map(w => `<p class="warn small">${esc(w)}</p>`).join('')}${nq < 5 ? '<p class="warn small">Few questions could be generated because the text has few explicit definitions, lists or stated reasons. Closed-book recall and application still work for every chapter.</p>' : ''}<a class="btn small" href="#book-${b.id}">Open the book</a></div>`;
      } catch (e) {
        st.innerHTML = `<p class="warn"><strong>${esc(f.name)}:</strong> ${esc(e instanceof X.ExtractError ? e.message : 'Something went wrong reading this file (' + (e.message || e) + '). Nothing was saved.')}</p>`;
        if (!(e instanceof X.ExtractError)) console.error(e);
      }
    }
    if (location.hash === '#study') { const keep = st.innerHTML; U.route(); const s2 = $('#uploadStatus'); if (s2) s2.innerHTML = keep; }
  }

  // ───────── book workspace
  U.routes.book = id => {
    const b = bookOf(id); if (!b) return `<section class="panel"><p>That book isn’t in your library on this device.</p><a class="btn" href="#study">Study Lab</a></section>`;
    const reps = b.chapters.map(c => ({ c, r: Q.chapterReport(c.id, S.slog.filter(l => l.bookId === b.id), cardsOf(b.id)) }));
    const due = cardsOf(b.id).filter(c => c.state !== 'new' && c.due <= Date.now()).length;
    const studied = reps.filter(x => x.r.status !== 'not started').length;
    const next = cardsOf(b.id).filter(c => c.state !== 'new' && c.due > Date.now()).sort((x, y) => x.due - y.due)[0];
    const notes = S.notes.filter(n => n.bookId === b.id).sort((x, y) => y.t - x.t);
    const cr = r => r.status === 'mastered' ? 'Mastered' : r.status === 'retaining' ? 'Retaining' : r.status === 'studied' ? 'Studied' : 'Not studied';
    return `<div class="workspace"><header class="ws-head">${cover(b)}<div><a class="link" href="#study">Study Lab</a><h1 class="display sm">${esc(b.title)}</h1><p class="muted">${esc(b.author || 'Author unknown')} · ${b.fileType.toUpperCase()}${b.pages ? ' · ' + b.pages + ' pages' : ''} · ${b.words.toLocaleString()} words · added ${fmtDate(b.added)}${b.sample ? ' · <strong>sample book</strong>' : ''}</p>
        <div class="ws-stats"><span><strong>${Math.round(readPct(b) * 100)}%</strong> read</span><span><strong>${studied}/${b.chapters.length}</strong> chapters studied</span><span><strong>${due}</strong> due for review</span><span>${next ? 'Next review ' + fmtDate(next.due) : 'No reviews scheduled'}</span></div>
        <div class="row"><a class="btn" href="#read-${b.id}.${(b.last && b.last.chapterId) || b.chapters[0].id}">${b.last ? 'Resume reading' : 'Start reading'}</a>${due ? `<button class="btn" data-action="review" data-size="20" data-book="${b.id}">Review this book (${due})</button>` : ''}<button class="btn ghost" data-action="remove-book" data-id="${b.id}">Remove book</button></div>
        ${b.warnings.length ? `<details class="warnings"><summary>Notes about how this file was read</summary>${b.warnings.map(w => `<p class="small">${esc(w)}</p>`).join('')}</details>` : ''}</div></header>
      <div class="ws-body"><section class="panel"><h2>Contents</h2><p class="muted small">Tick what you want to study. Reading first isn’t required.</p>
        <ol class="toc">${reps.map(({ c, r }) => `<li><details><summary><label class="check"><input type="checkbox" class="sc-ch" value="${c.id}"><span>${esc(c.title)}</span></label><span class="chip-row"><span class="mini">${cr(r)}</span>${r.accuracy != null ? `<span class="mini">recall ${Math.round(r.accuracy * 100)}%</span>` : ''}${r.total ? `<span class="mini">${r.counts.retained}/${r.total} retained</span>` : ''}${r.applied.length ? `<span class="mini">applied ${r.applied.length}</span>` : ''}${r.due ? `<span class="mini due">${r.due} due</span>` : ''}</span></summary>
          <ul class="toc-s">${c.sections.map(s => `<li><label class="check"><input type="checkbox" class="sc-s" value="${s.id}" data-ch="${c.id}"><span>${esc(s.title)}</span></label><span class="muted small">${s.paras.length} ¶${s.page != null ? ' · p. ' + s.page : ''}</span><a class="link small" href="#read-${b.id}.${c.id}" data-para="${s.paras[0] && s.paras[0].id}">read</a></li>`).join('')}</ul></details></li>`).join('')}</ol></section>
        <section class="panel setup"><h2>Study</h2><fieldset class="obj"><legend>Objective</legend>${OBJ.map(([v, l, d], i) => `<label class="obj-o"><input type="radio" name="obj" value="${v}" ${i === 0 ? 'checked' : ''}><span><strong>${l}</strong><span class="muted small">${d}</span></span></label>`).join('')}</fieldset>
          <p id="scopeMsg" class="hint-msg" role="status"></p><button class="btn primary big" data-action="start-study" data-id="${b.id}">Start studying the selection</button>
          <p class="muted small">Reading progress, recall, retention and application are tracked separately: reading a chapter doesn’t count as knowing it.</p></section>
        ${U.deepPanel ? U.deepPanel(b) : ''}
        <section class="panel"><h2>Notes and bookmarks</h2>${notes.length ? `<ul class="notes">${notes.slice(0, 30).map(n => { const x = paraOf(b, n.paraId); return x ? `<li class="${n.type}"><span class="mini">${n.type === 'note' ? 'Note' : n.type === 'highlight' ? 'Highlight' : 'Bookmark'}</span><a href="#read-${b.id}.${x.c.id}" data-para="${n.paraId}">${esc(x.c.title)}${x.p.page != null ? ' · p. ' + x.p.page : ''}</a>${n.text ? `<p>${esc(n.text)}</p>` : ''}<p class="muted small">${esc(short(x.p.text, 140))}</p></li>` : ''; }).join('')}</ul>` : '<p class="muted small">Tap a paragraph while reading to bookmark, highlight or annotate it.</p>'}</section></div></div>`;
  };
  U.routes.book.after = () => {
    document.querySelectorAll('.sc-ch').forEach(cb => cb.addEventListener('change', () => document.querySelectorAll(`.sc-s[data-ch="${cb.value}"]`).forEach(s => { s.checked = cb.checked; })));
    document.querySelectorAll('.sc-ch, .sc-s').forEach(x => x.addEventListener('click', e => e.stopPropagation()));
  };

  // ───────── reader
  let pendingPara = null, obs = null;
  U.routes.read = arg => {
    const [bid, cid] = String(arg).split('.'); const b = bookOf(bid); if (!b) return '<section class="panel"><p>Book not found.</p></section>';
    const c = b.chapters.find(x => x.id === cid) || b.chapters[0]; const ci = b.chapters.indexOf(c);
    const notes = new Map(); S.notes.filter(n => n.bookId === b.id).forEach(n => { (notes.get(n.paraId) || notes.set(n.paraId, []).get(n.paraId)).push(n); });
    let lastPage = null;
    const paras = c.sections.map(s => `<h2 class="r-sec" id="${s.id}">${esc(s.title)}</h2>` + s.paras.map(p => { const ns = notes.get(p.id) || []; const pg = p.page != null && p.page !== lastPage ? (lastPage = p.page, `<span class="pg" aria-label="page ${p.page}">p. ${p.page}</span>`) : ''; return `<p class="r-p${ns.some(n => n.type === 'highlight') ? ' hl' : ''}${ns.some(n => n.type === 'bookmark') ? ' bm' : ''}" id="${p.id}" tabindex="0" data-para="${p.id}">${pg}${esc(p.text)}</p>${ns.filter(n => n.type === 'note').map(n => `<p class="r-note">${esc(n.text)}<button class="x" data-action="del-note" data-id="${n.id}" aria-label="Delete note">×</button></p>`).join('')}`; }).join('')).join('');
    return `<div class="reader"><div class="r-bar"><a class="link" href="#book-${b.id}">${esc(short(b.title, 40))}</a><details class="r-toc"><summary>Contents</summary><ol>${b.chapters.map(x => `<li><a href="#read-${b.id}.${x.id}" ${x.id === c.id ? 'aria-current="page"' : ''}>${esc(x.title)}</a></li>`).join('')}</ol></details><span class="muted small" id="rProg">${Math.round(((b.progress || {})[c.id] || 0) * 100)}% of chapter</span></div>
      <article class="r-text"><h1 class="r-title">${esc(c.title)}</h1>${paras}</article>
      <div class="r-actions" id="rActions" hidden role="toolbar" aria-label="Paragraph actions"><button class="btn small" data-action="r-bm">Bookmark</button><button class="btn small" data-action="r-hl">Highlight</button><button class="btn small" data-action="r-note">Add note</button><div id="rNoteBox" hidden><label class="field"><span class="sr">Your note on this paragraph</span><textarea id="rNoteText" rows="3" placeholder="Your note"></textarea></label><button class="btn small primary" data-action="r-note-save">Save note</button></div></div>
      <div class="r-foot"><div class="row">${ci > 0 ? `<a class="btn" href="#read-${b.id}.${b.chapters[ci - 1].id}">Previous chapter</a>` : ''}<button class="btn primary" data-action="study-chapter" data-id="${b.id}" data-ch="${c.id}">Close the book and recall this chapter</button>${ci < b.chapters.length - 1 ? `<a class="btn" href="#read-${b.id}.${b.chapters[ci + 1].id}">Next chapter</a>` : ''}</div></div></div>`;
  };
  U.routes.read.after = arg => {
    const [bid, cid] = String(arg).split('.'); const b = bookOf(bid); if (!b) return; const c = b.chapters.find(x => x.id === cid) || b.chapters[0];
    const all = [...document.querySelectorAll('.r-p')]; const total = all.length; let max = Math.round(((b.progress || {})[c.id] || 0) * total);
    if (obs) obs.disconnect();
    let saveT = null;
    obs = new IntersectionObserver(es => { es.forEach(e => { if (e.isIntersecting) { const i = all.indexOf(e.target) + 1; if (i > max) { max = i; b.progress = b.progress || {}; b.progress[c.id] = max / total; b.last = { chapterId: c.id, paraId: e.target.id, t: Date.now() }; const rp = $('#rProg'); if (rp) rp.textContent = Math.round(max / total * 100) + '% of chapter'; clearTimeout(saveT); saveT = setTimeout(() => save.book(b), 600); } } }); }, { threshold: 0.6 });
    all.forEach(p => obs.observe(p));
    const target = pendingPara || (b.last && b.last.chapterId === c.id ? b.last.paraId : null); pendingPara = null;
    if (target) { const el = document.getElementById(target); if (el) { el.scrollIntoView({ block: 'center' }); el.classList.add('flash'); } }
    b.last = Object.assign({}, b.last || {}, { chapterId: c.id, paraId: b.last && b.last.chapterId === c.id ? b.last.paraId : (all[0] && all[0].id), t: Date.now() }); save.book(b);
  };
  let curPara = null;
  document.addEventListener('click', e => { const p = e.target.closest('.reader .r-p'); if (!p) return; const nb = $('#rNoteBox'); if (nb) { nb.hidden = true; $('#rNoteText').value = ''; } curPara = p.id; const bar = $('#rActions'); if (bar) { bar.hidden = false; const r = p.getBoundingClientRect(); bar.style.top = (window.scrollY + r.bottom + 6) + 'px'; } document.querySelectorAll('.r-p.sel').forEach(x => x.classList.remove('sel')); p.classList.add('sel'); });
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('r-p')) e.target.click(); });
  document.addEventListener('click', e => { const a = e.target.closest('a[data-para]'); if (a) pendingPara = a.dataset.para; });

  // ───────── study sessions
  let SS = null;
  const saveDraft = () => { S.studyDraft = SS && SS.si < SS.stages.length ? SS : null; DB.put('kv', 'study-draft', S.studyDraft).catch(() => {}); };
  function scopeQuestions(book, scope) { const ids = new Set(scope); return (book.questions || []).filter(q => ids.has(q.chapterId) || ids.has(q.sectionId)); }
  function pickQuestions(book, scope, objective, seed) {
    const all = scopeQuestions(book, scope).filter(q => q.type !== 'application'); const R0 = E.rng(seed);
    const pref = { memorise: ['definition', 'reverse', 'cloze', 'list'], connect: ['distinction', 'reasoning', 'definition', 'cloze'], longterm: ['definition', 'reasoning', 'cloze', 'list', 'distinction'], understand: ['definition', 'reasoning', 'distinction', 'list', 'cloze', 'reverse', 'order'], apply: ['definition', 'reasoning'] }[objective] || null;
    if (objective === 'test') return Q.buildTest(all, termsOf(book), seed, 12);
    const n = objective === 'apply' ? 4 : 10; const out = []; const byConcept = new Set();
    const ranked = all.slice().sort((a, b) => (pref.indexOf(a.type) < 0 ? 9 : pref.indexOf(a.type)) - (pref.indexOf(b.type) < 0 ? 9 : pref.indexOf(b.type)) || R0() - 0.5);
    // spread across types and concepts: one per concept+type first
    ranked.forEach(q => { const k = q.type + '|' + q.concept; if (out.length < n && !byConcept.has(k)) { byConcept.add(k); out.push(q); } });
    ranked.forEach(q => { if (out.length < n && !out.includes(q)) out.push(q); });
    // interleave chapters
    const groups = {}; out.forEach(q => (groups[q.chapterId] = groups[q.chapterId] || []).push(q)); const lists = Object.values(groups); const mixed = [];
    while (mixed.length < out.length) lists.forEach(l => { if (l.length) mixed.push(l.shift()); });
    return mixed;
  }
  function startWorkflow(book, scope, objective) {
    if (objective === 'review') { return startReview(Object.values(S.cards).filter(c => c.bookId === book.id && (scope.includes(c.chapterId))), 30, book.id); }
    const seed = Date.now();
    const apps = scopeQuestions(book, scope).filter(q => q.type === 'application');
    const picked = pickQuestions(book, scope, objective, seed); const inline = {};
    picked.forEach(q => { if (!qOf(book, q.id)) inline[q.id] = q; }); // test-only variants (multiple choice, matching) live in the session
    SS = { id: 'ss' + seed.toString(36), kind: 'workflow', bookId: book.id, scope, objective, stages: STAGES[objective].slice(), si: 0, items: picked.map(q => q.id), inline, qi: 0, answers: {}, apps: E.rng(seed) && apps.slice(0, objective === 'apply' ? 3 : 1).map(q => q.id), ai: 0, startedAt: seed };
    // tests carry generated variants (multiple choice, matching) that aren't stored in the book
    if (!SS.items.length) SS.stages = SS.stages.filter(s => s !== 'questions');
    if (!SS.apps.length) SS.stages = SS.stages.filter(s => s !== 'apply');
    saveDraft(); location.hash = '#studyrun'; if (location.hash === '#studyrun') U.route();
  }
  function startReview(cards, size, bookId, opts) {
    const q = Q.queue(cards.map(c => Object.assign({}, c, { state: Q.stateOf(c) })), Date.now(), size, opts);
    if (!q.length) { toast('Nothing is due in that selection right now.'); return; }
    SS = { id: 'rv' + Date.now().toString(36), kind: 'review', bookId: bookId || q[0].bookId, stages: ['questions', 'report'], si: 0, items: q.map(c => c.qid), qi: 0, answers: {}, startedAt: Date.now(), scope: [...new Set(q.map(c => c.chapterId))], inline: {} };
    saveDraft(); location.hash = '#studyrun'; U.route();
  }
  const qFor = id => { if (SS.inline && SS.inline[id]) return SS.inline[id]; for (const b of S.books) { const q = qOf(b, id); if (q) return q; } return null; };

  U.routes.studyrun = () => {
    if (!SS) SS = S.studyDraft; if (!SS) { setTimeout(() => location.hash = '#study'); return ''; }
    const b = bookOf(SS.bookId); if (!b) { SS = null; saveDraft(); setTimeout(() => location.hash = '#study'); return ''; }
    const st = SS.stages[SS.si];
    const scopeTitle = SS.kind === 'review' ? 'Review' : [...new Set(SS.scope.map(id => (chOf(b, id) || {}).title))].join(', ');
    return `<div class="studyrun"><div class="p-top"><a class="link" href="#book-${b.id}">${esc(short(b.title, 40))}</a><ol class="sr-steps" aria-label="Study stages">${SS.stages.map((s, i) => `<li class="${i < SS.si ? 'done' : i === SS.si ? 'cur' : ''}">${esc(STAGE_NAME[s])}</li>`).join('')}</ol></div>
      <header class="sr-head"><p class="muted">${esc(scopeTitle)}</p><h1 class="p-title">${esc(STAGE_NAME[st])}</h1></header>
      <div class="sr-body" id="srBody">${stageHTML(b, st)}</div></div>`;
  };
  function stageHTML(b, st) {
    switch (st) {
      case 'orient': {
        const chs = [...new Set(SS.scope.map(id => chOf(b, id)))].filter(Boolean);
        return chs.map(c => { const secs = c.sections.filter(s => SS.scope.includes(c.id) || SS.scope.includes(s.id)); const pages = secs.flatMap(s => s.paras.map(p => p.page)).filter(p => p != null); const nDefs = Q.findDefinitions(b, secs.map(s => s.id)).length;
          return `<section class="panel"><h2>${esc(c.title)}</h2><p>${secs.length} section${secs.length > 1 ? 's' : ''}${pages.length ? `, pages ${Math.min(...pages)}–${Math.max(...pages)}` : ''}, about ${secs.reduce((n, s) => n + s.paras.reduce((m, p) => m + p.text.split(/\s+/).length, 0), 0).toLocaleString()} words.${nDefs ? ` The author defines ${nDefs} term${nDefs > 1 ? 's' : ''} here.` : ''}</p><ol class="orient">${secs.map(s => `<li><strong>${esc(s.title)}</strong><span class="muted">${esc(short(s.paras[0].text, 110))}</span></li>`).join('')}</ol></section>`; }).join('') +
          `<p class="muted small">This shows what the chapter covers without giving away its ideas. Read with one question in mind: what would you need to remember to explain this chapter to someone else?</p>${nextBtn('Continue to reading')}<button class="btn ghost" data-action="ss-skip">I’ve already read it — skip reading</button>`;
      }
      case 'read': {
        const parts = SS.scope.map(id => chOf(b, id)).filter((c, i, a) => c && a.indexOf(c) === i);
        return `<article class="r-text inline">${parts.map(c => `<h2 class="r-title">${esc(c.title)}</h2>` + c.sections.filter(s => SS.scope.includes(c.id) || SS.scope.includes(s.id)).map(s => `<h3 class="r-sec">${esc(s.title)}</h3>` + s.paras.map(p => `<p class="r-p" id="${p.id}" data-para="${p.id}">${p.page != null ? `<span class="pg">p. ${p.page}</span>` : ''}${esc(p.text)}</p>`).join('')).join('')).join('')}</article>
          <div class="sticky-cta">${nextBtn('Close the book and start recalling')}</div>`;
      }
      case 'free': {
        if (SS.freeResult) { const r = SS.freeResult; return `<section class="panel"><h2>What your recall covered</h2><p>You mentioned <strong>${r.matched.length} of ${r.expected}</strong> key terms from the chapter.</p>${r.matched.length ? `<p class="small">Mentioned: ${r.matched.map(esc).join(', ')}</p>` : ''}${r.missed.length ? `<p class="small">Not mentioned: ${r.missed.map(esc).join(', ')}</p>` : ''}<p class="muted small">This counts whether the chapter’s key terms appear in what you wrote. It can’t judge whether your explanation of them is right — the targeted questions next will check that. Ideas you described in your own words without the author’s term are missed by this count.</p></section>${nextBtn('Continue')}`; }
        const fp = Q.freeRecallPrompt(b, SS.scope);
        return `<section class="panel closed"><p class="closed-tag">Book closed</p><h2>${esc(fp.prompt)}</h2><p class="muted small">Write everything you can retrieve: main concepts, the arguments, distinctions the author made, supporting points and examples. Fragments are fine.</p><label class="field"><span class="sr">Your recall</span><textarea id="freeText" rows="9">${esc(SS.freeDraft || '')}</textarea></label><div class="row"><button class="btn primary" data-action="ss-free">Check against the chapter</button></div></section>`;
      }
      case 'questions': return questionHTML(b);
      case 'gaps': return gapsHTML(b);
      case 'correct': return correctHTML(b);
      case 'apply': return applyHTML(b);
      case 'schedule': return scheduleHTML(b);
      case 'report': return reportHTML(b);
    }
    return '';
  }
  const nextBtn = l => `<button class="btn primary" data-action="ss-next">${esc(l)}</button>`;

  function questionHTML(b) {
    if (SS.qi >= SS.items.length) return `<section class="panel"><p>${SS.items.length} question${SS.items.length === 1 ? '' : 's'} done.</p>${nextBtn('Continue')}</section>`;
    const q = qFor(SS.items[SS.qi]); if (!q) { SS.qi++; return questionHTML(b); }
    const qb = bookOf(q.bookId) || b; const a = SS.answers[q.id] || {};
    const prog = `<p class="muted small">Question ${SS.qi + 1} of ${SS.items.length} · ${esc(TYPE_NAME[q.type] || q.type)}${SS.kind === 'review' ? ' · ' + esc(qb.title) : ''}</p>`;
    let input = '';
    const locked = !!a.check;
    if (q.type === 'cloze') input = `<p class="q-cloze">${esc(q.prompt).replace(/_____/g, '<span class="blank">_____</span>')}</p><label class="field"><span>Missing term</span><input id="qa" type="text" autocomplete="off" value="${esc(a.response || '')}" ${locked ? 'readonly' : ''}></label>`;
    else if (q.type === 'reverse') input = `<p class="q-prompt">${esc(q.prompt)}</p><label class="field"><span>The concept</span><input id="qa" type="text" autocomplete="off" value="${esc(a.response || '')}" ${locked ? 'readonly' : ''}></label>`;
    else if (q.type === 'mc') input = `<p class="q-cloze">${esc(q.prompt).replace(/_____/g, '<span class="blank">_____</span>')}</p><div class="choices" role="radiogroup" aria-label="Options">${q.options.map((o, i) => `<button role="radio" class="choice" aria-checked="${a.response === i}" data-action="ss-mc" data-i="${i}" ${locked ? 'disabled' : ''}>${esc(o)}</button>`).join('')}</div>`;
    else if (q.type === 'multi') { const resp = a.response || []; input = `<p class="q-prompt">${esc(q.prompt)}</p><div class="multi" role="group" aria-label="Options">${q.options.map((o, i) => `<label class="check opt"><input type="checkbox" class="mopt" value="${i}" ${resp.includes(i) ? 'checked' : ''} ${locked ? 'disabled' : ''}><span>${esc(o)}</span></label>`).join('')}</div>`; }
    else if (q.type === 'match') { const resp = a.response || {}; input = `<p class="q-prompt">${esc(q.prompt)}</p><div class="match">${q.order.map(i => `<div class="m-row"><p class="m-def">${esc(short(q.pairs[i].def, 220))}</p><label class="sel"><span class="sr">Concept for this description</span><select data-m="${i}" ${locked ? 'disabled' : ''}><option value="">Choose…</option>${q.pairs.map((p, k) => `<option value="${k}" ${resp[i] === k ? 'selected' : ''}>${esc(p.term)}</option>`).join('')}</select></label></div>`).join('')}</div>`; }
    else if (q.type === 'order') { const ord = a.response || q.shuffled || E.rng(q.id)() && q.items.map((_, i) => i).sort((x, y) => (parseInt(Q.hash(q.id + x), 36) % 97) - (parseInt(Q.hash(q.id + y), 36) % 97)); SS.answers[q.id] = Object.assign(a, { response: a.response || ord }); input = `<p class="q-prompt">${esc(q.prompt)}</p><ol class="order">${a.response.map((k, pos) => `<li><span class="o-text">${esc(q.items[k])}</span>${locked ? '' : `<span class="o-btns"><button class="btn tiny" data-action="ss-up" data-i="${pos}" ${pos === 0 ? 'disabled' : ''} aria-label="Move up">↑</button><button class="btn tiny" data-action="ss-down" data-i="${pos}" ${pos === a.response.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button></span>`}</li>`).join('')}</ol>`; }
    else input = `<p class="q-prompt">${esc(q.prompt)}</p>${q.type === 'list' ? '<p class="muted small">One item per line.</p>' : ''}<label class="field"><span class="sr">Your answer</span><textarea id="qa" rows="${q.type === 'list' ? 5 : 4}" ${locked ? 'readonly' : ''}>${esc(a.response || '')}</textarea></label>`;
    let after = '';
    if (!locked && a.conf == null) after = `<div class="conf"><p id="cq"><strong>Before you check:</strong> how sure are you?</p><div class="row" role="group" aria-labelledby="cq">${[['3', 'Sure'], ['2', 'Fairly sure'], ['1', 'Unsure'], ['0', 'Guessing']].map(([v, l]) => `<button class="btn" data-action="ss-conf" data-v="${v}">${l}</button>`).join('')}</div></div>`;
    if (locked) after = resultHTML(qb, q, a);
    return `<section class="panel q-card ${locked ? 'checked ' + a.check.result : ''}">${prog}${input}${after}</section>`;
  }
  function resultHTML(b, q, a) {
    const c = a.check; const RES = { correct: 'Matches the book', partial: 'Partly matches', incorrect: 'Doesn’t match the book' };
    const method = c.method === 'exact' ? 'Checked exactly.' : c.method === 'items' ? 'Checked item by item against the book’s list.' : 'Checked by matching key terms from the source sentence. This checks wording, not understanding — use your own judgement below.';
    const src = q.type === 'match' ? q.pairs.map(p => `<li><strong>${esc(p.term)}</strong>: ${esc(p.def)}</li>`).join('') : '';
    return `<div class="q-result" aria-live="polite"><p class="res ${c.result}">${RES[c.result]}${a.conf >= 2 && c.result === 'incorrect' ? ' — and you were confident, so this is scheduled for extra review' : ''}${a.conf <= 1 && c.result === 'correct' ? ' — but you weren’t sure, so it comes back sooner' : ''}</p>
      ${q.answer ? `<p>The book’s term: <strong>${esc(q.answer)}</strong>${c.confusedWith ? ` · You answered with a different concept from the book: <strong>${esc(c.confusedWith)}</strong>` : ''}</p>` : ''}
      ${q.type === 'list' ? `<p>The book lists: ${q.items.map(i => `<span class="${c.matched.includes(i) ? 'hit' : 'miss'}">${esc(i)}</span>`).join(', ')}</p>` : ''}
      ${q.type === 'multi' ? `<p>The book includes: ${q.correctSet.map(i => esc(q.options[i])).join(', ')}</p>` : ''}${q.type === 'order' || q.type === 'mc' ? `<p>${q.type === 'order' ? 'The book’s order: ' + q.items.map(esc).join(' → ') : 'Answer: <strong>' + esc(q.options[q.correct]) + '</strong>'}</p>` : ''}
      ${c.method === 'terms' ? `<p class="small">Key terms you used: ${c.matched.map(esc).join(', ') || 'none'}${c.missed.length ? ` · not used: ${c.missed.map(esc).join(', ')}` : ''}</p>` : ''}
      <p class="muted small">${method}</p>
      <details class="source" ${c.result !== 'correct' ? 'open' : ''}><summary>Source: ${esc(where(b, q))}</summary>${src ? `<ul>${src}</ul>` : `<blockquote>${esc(q.excerpt)}</blockquote>`}${q.paraId ? `<a class="link small" href="#read-${b.id}.${q.chapterId}" data-para="${q.paraId}">Open this passage in the book</a>` : ''}</details>
      ${c.method === 'terms' && a.self == null ? `<div class="conf"><p><strong>Compare with the source.</strong> How well did you actually recall it?</p><div class="row">${[['correct', 'I had it'], ['partial', 'Partly'], ['incorrect', 'I missed it or got it wrong']].map(([v, l]) => `<button class="btn" data-action="ss-self" data-v="${v}">${l}</button>`).join('')}</div></div>` : `<div class="row">${nextQBtn()}</div>`}</div>`;
  }
  const nextQBtn = () => `<button class="btn primary" data-action="ss-nextq">${SS.qi + 1 < SS.items.length ? 'Next question' : 'Finish questions'}</button>`;

  function sessionLog() { return S.slog.filter(l => l.session === SS.id); }
  function gapsHTML(b) {
    const L = sessionLog(); const ans = L.filter(l => l.type !== 'free' && l.type !== 'application');
    const right = ans.filter(l => l.final === 'correct'), part = ans.filter(l => l.final === 'partial'), wrong = ans.filter(l => l.final === 'incorrect');
    const confWrong = wrong.filter(l => l.confident), conf = ans.filter(l => l.confusedWith), dist = ans.filter(l => l.type === 'distinction' && l.final !== 'correct');
    const free = L.find(l => l.type === 'free');
    const li = arr => arr.map(l => `<li>${esc(l.concept || TYPE_NAME[l.type])}</li>`).join('');
    return `<div class="gap-grid">
      <section class="panel"><h2>Retrieved correctly</h2>${right.length ? `<ul>${li(right)}</ul>` : '<p class="muted">None yet.</p>'}</section>
      <section class="panel"><h2>Missing or partial</h2>${part.length || (free && free.missed && free.missed.length) ? `<ul>${li(part)}${free && free.missed ? free.missed.slice(0, 8).map(t => `<li>${esc(t)} <span class="muted small">(absent from your free recall)</span></li>`).join('') : ''}</ul>` : '<p class="muted">Nothing flagged.</p>'}</section>
      <section class="panel"><h2>Incorrect</h2>${wrong.length ? `<ul>${li(wrong)}</ul>` : '<p class="muted">None.</p>'}${confWrong.length ? `<p class="warn small">${confWrong.length} of these you were confident about — possible misconceptions. They’ll come back for review sooner.</p>` : ''}</section>
      <section class="panel"><h2>Confused concepts</h2>${conf.length ? `<ul>${conf.map(l => `<li>${esc(l.concept)} ↔ ${esc(l.confusedWith)}</li>`).join('')}</ul>` : '<p class="muted">No swaps detected.</p>'}</section>
      <section class="panel"><h2>Distinctions not recalled</h2>${dist.length ? `<ul>${li(dist)}</ul>` : '<p class="muted">None flagged.</p>'}</section>
      <section class="panel"><h2>Unsupported additions</h2><p class="muted small">Claims you added that the book doesn’t make can’t be detected automatically. Reread your free recall against the passages in the next step.</p>${free ? `<details><summary>Your free recall</summary><p class="rp-refl">${esc(free.response)}</p></details>` : ''}</section></div>${nextBtn('Continue')}`;
  }
  function correctHTML(b) {
    const L = sessionLog().filter(l => l.type !== 'free' && l.type !== 'application' && l.final !== 'correct');
    const paras = [...new Set(L.map(l => l.paraId).filter(Boolean))];
    if (!paras.length) return `<section class="panel"><p>Nothing needs correcting from this session.</p></section>${nextBtn('Continue')}`;
    return `<p class="lede">Only the passages behind what you missed — no need to reread the whole chapter.</p>${paras.map(pid => { const x = paraOf(b, pid); if (!x) return ''; const ls = L.filter(l => l.paraId === pid); return `<section class="panel corr"><p class="muted small">${esc(x.c.title)}${x.s.title !== x.c.title ? ' · ' + esc(x.s.title) : ''}${x.p.page != null ? ' · p. ' + x.p.page : ''} · for: ${ls.map(l => esc(l.concept || TYPE_NAME[l.type])).join(', ')}</p><p class="r-p">${esc(x.p.text)}</p></section>`; }).join('')}
      <div class="row"><button class="btn" data-action="ss-retry">Try the missed questions again</button>${nextBtn('Continue')}</div>`;
  }
  function applyHTML(b) {
    if (SS.ai >= SS.apps.length) return `<section class="panel"><p>Application done.</p></section>${nextBtn('Continue')}`;
    const q = qOf(b, SS.apps[SS.ai]); const a = SS.answers[q.id] || {};
    if (!a.submitted) return `<section class="panel"><p class="muted small">Application ${SS.ai + 1} of ${SS.apps.length} · extension beyond the book: the situation is yours, the concept is the author’s</p><h2 class="q-prompt">${esc(q.prompt)}</h2><ol class="steps-mini"><li>Recall what the book says “${esc(q.concept)}” is.</li><li>Pick a situation from work, life or the news that the book doesn’t discuss.</li><li>Say which features of the situation make the concept fit.</li><li>Say where it stops fitting.</li></ol><label class="field"><span class="sr">Your application</span><textarea id="appText" rows="7">${esc(a.response || '')}</textarea></label><div class="row"><button class="btn primary" data-action="ss-app">Check against the book</button></div></section>`;
    return `<section class="panel"><h2>How the book defines “${esc(q.concept)}”</h2><blockquote>${esc(q.excerpt)}</blockquote><p class="muted small">${esc(where(b, q))}</p>
      <p class="rp-q">Your situation</p><p class="rp-refl">${esc(a.response)}</p>
      <fieldset class="useful"><legend>Tick each defining feature your situation genuinely has — not just the word, the thing itself.</legend>${q.expected.slice(0, 8).map((t, i) => `<label class="check"><input type="checkbox" class="feat" value="${i}"><span>${esc(t)}</span></label>`).join('')}<label class="check"><input type="checkbox" id="limitOk"><span>I named a limit or condition where it wouldn’t apply</span></label></fieldset>
      <p class="muted small">MINDWORK can’t judge whether an application is apt, so you check it against the author’s wording. The listed features are the content words of the author’s definition.</p>
      <div class="row"><button class="btn primary" data-action="ss-appcheck">Record and continue</button></div></section>`;
  }
  function scheduleHTML(b) {
    const qs = SS.kind === 'review' ? [] : scopeQuestions(b, SS.scope).filter(q => q.type !== 'application');
    if (!SS.scheduled) {
      const now = Date.now(); let added = 0;
      qs.forEach(q => { if (!S.cards[q.id]) { S.cards[q.id] = Q.newCard(q, now); added++; save.card(S.cards[q.id]); } });
      SS.scheduled = { added, total: qs.length }; saveDraft();
    }
    const asked = SS.items.map(id => S.cards[(qFor(id) || {}).baseId || id]).filter(Boolean);
    const next = asked.filter(c => c.history.length).sort((x, y) => x.due - y.due);
    return `<section class="panel"><h2>Saved for spaced review</h2><p>${SS.scheduled.total} questions from this material are now in your review schedule${SS.scheduled.added < SS.scheduled.total ? ` (${SS.scheduled.total - SS.scheduled.added} were already there)` : ''}. Questions you answered today are scheduled by how well and how confidently you recalled them; the rest start as new.</p>
      ${next.length ? `<table class="sched"><thead><tr><th scope="col">Concept</th><th scope="col">State</th><th scope="col">Next review</th></tr></thead><tbody>${next.slice(0, 12).map(c => `<tr><td>${esc(c.concept || TYPE_NAME[c.type])}</td><td>${STATE_NAME[Q.stateOf(c)]}</td><td>${c.due - Date.now() < DAY ? 'later today' : 'in ' + Math.round((c.due - Date.now()) / DAY) + ' day' + (Math.round((c.due - Date.now()) / DAY) === 1 ? '' : 's')}</td></tr>`).join('')}</tbody></table>` : ''}
      <p class="muted small">How scheduling works: a correct, confident answer pushes the next review further out each time (1 day, then about 4, then growing with the question’s ease). Unsure answers come back sooner; wrong answers come back the same day; confident wrong answers also lower the question’s ease more, because a misconception needs more repetitions to correct.</p></section>${nextBtn('See the report')}`;
  }
  function reportHTML(b) {
    const chs = [...new Set(SS.scope.map(id => (chOf(b, id) || {}).id))].filter(Boolean);
    const L = sessionLog(); const ans = L.filter(l => l.result && l.type !== 'free' && l.type !== 'application');
    const STATUS = { 'not started': 'Not started', studied: 'Studied — not yet shown to be retained', retaining: 'Retaining — some questions recalled across separate days', mastered: 'Mastered — most questions retained over weeks, and applied' };
    return `<section class="panel"><h2>This session</h2><p>${ans.filter(l => l.final === 'correct').length} of ${ans.length} questions matched the book${L.find(l => l.type === 'free') ? `; your closed-book recall covered ${Math.round(L.find(l => l.type === 'free').score * 100)}% of key terms` : ''}.</p></section>
      ${chs.map(id => { const c = b.chapters.find(x => x.id === id); const r = Q.chapterReport(id, S.slog.filter(l => l.bookId === b.id), cardsOf(b.id)); return `<section class="panel report"><h2>${esc(c.title)}</h2><p class="status-line">${STATUS[r.status]}</p>
        <dl class="rep"><div><dt>Remembered</dt><dd>${r.remembered.length ? r.remembered.slice(0, 10).map(esc).join(', ') : '—'}</dd></div><div><dt>Still weak</dt><dd>${r.weak.length ? r.weak.slice(0, 10).map(esc).join(', ') : '—'}</dd></div><div><dt>Applied</dt><dd>${r.applied.length ? r.applied.map(esc).join(', ') : 'Not yet'}</dd></div>
        <div><dt>Review schedule</dt><dd>${Q.STATE_ORDER.filter(s => r.counts[s]).map(s => `${r.counts[s]} ${STATE_NAME[s].toLowerCase()}`).join(' · ') || '—'}</dd></div><div><dt>Revisit</dt><dd>${r.weak.length ? 'The weak concepts above, through the review queue' : r.total ? 'Nothing urgent — keep up with reviews' : '—'}</dd></div></dl></section>`; }).join('')}
      <p class="muted small">A chapter is only called mastered once most of its questions have survived spaced reviews for three weeks or more and at least one concept has been applied — finishing a session isn’t enough.</p>
      <div class="row"><button class="btn primary" data-action="ss-finish">Finish</button></div>`;
  }

  function logAnswer(q, a, finalRes) {
    const qb = bookOf(q.bookId) || bookOf(SS.bookId);
    const id = SS.id + ':' + q.id + ':' + (a.attempt || 0);
    const entry = { id, session: SS.id, t: Date.now(), bookId: q.bookId || SS.bookId, chapterId: q.chapterId, sectionId: q.sectionId, paraId: q.paraId, qid: q.baseId || q.id, type: q.type, concept: q.concept, response: typeof a.response === 'string' ? a.response : JSON.stringify(a.response), result: a.check.result, auto: a.check.result, self: a.self || null, final: finalRes, score: a.check.score, confident: a.conf >= 2, conf: a.conf, method: a.check.method, confusedWith: a.check.confusedWith || null, mode: SS.kind === 'review' ? 'review' : SS.objective };
    const i = S.slog.findIndex(l => l.id === id); if (i >= 0) S.slog[i] = entry; else S.slog.push(entry); save.log(entry);
    // schedule the card for this question
    const cid = q.baseId || q.id; if (q.type !== 'match' && qb) { const card = S.cards[cid] || Q.newCard(Object.assign({}, q, { id: cid }), Date.now()); S.cards[cid] = Q.schedule(card, Q.gradeFrom(finalRes, a.conf >= 2), a.conf >= 2, Date.now()); save.card(S.cards[cid]); }
  }

  document.addEventListener('click', async e => {
    const t = e.target.closest('[data-action]'); if (!t) return; const a = t.dataset.action;
    if (a === 'sample-book') { const f = new File([SAMPLE], 'Sample — How Decisions Go Wrong.md', { type: 'text/plain' }); const st = $('#uploadStatus'); try { const b = await addBook(f, new TextEncoder().encode(SAMPLE).buffer, { sample: true }); b.author = 'MINDWORK sample text'; await save.book(b); location.hash = '#book-' + b.id; } catch (er) { st.textContent = er.message; } }
    else if (a === 'remove-book') { const b = bookOf(t.dataset.id); if (!(await confirmDlg('Remove this book?', `“${b.title}” and its questions, review schedule, notes, bookmarks and study history will be deleted from this device.`, 'Remove book', true))) return;
      S.books = S.books.filter(x => x.id !== b.id); await DB.del('books', b.id); for (const c of cardsOf(b.id)) { delete S.cards[c.qid]; await DB.del('cards', c.qid); } for (const l of S.slog.filter(l => l.bookId === b.id)) await DB.del('studylog', l.id); S.slog = S.slog.filter(l => l.bookId !== b.id); for (const n of S.notes.filter(n => n.bookId === b.id)) await DB.del('notes', n.id); S.notes = S.notes.filter(n => n.bookId !== b.id); if (S.studyDraft && S.studyDraft.bookId === b.id) { SS = null; S.studyDraft = null; DB.del('kv', 'study-draft'); } toast('Book removed.'); location.hash = '#study'; }
    else if (a === 'start-study') { const b = bookOf(t.dataset.id); const sec = [...document.querySelectorAll('.sc-s:checked')].map(x => x.value); const ch = [...document.querySelectorAll('.sc-ch:checked')].map(x => x.value); const scope = ch.concat(sec.filter(s => !ch.includes(s.replace(/s\d+$/, '')))); if (!scope.length) { $('#scopeMsg').textContent = 'Tick at least one chapter or section first.'; return; } startWorkflow(b, scope, document.querySelector('input[name=obj]:checked').value); }
    else if (a === 'study-chapter') { const b = bookOf(t.dataset.id); SS = null; startWorkflow(b, [t.dataset.ch], 'longterm'); }
    else if (a === 'review') { const cards = Object.values(S.cards).filter(c => !t.dataset.book || c.bookId === t.dataset.book); startReview(cards, +t.dataset.size, t.dataset.book, t.dataset.new ? { newLimit: 10 } : {}); }
    else if (a === 'gap-practise') { const g = Q.gaps(S.slog, Object.values(S.cards)).find(x => x.id === t.dataset.gap); if (!g) return; const cards = Object.values(S.cards).filter(c => g.practise === 'review' ? S.slog.some(l => l.qid === c.qid && l.confident && l.final === 'incorrect') : g.pair ? g.pair.includes(c.concept) || (c.concept || '').includes(g.pair[0]) : c.type === g.practise || (g.practise === 'free' && c.type === 'definition')); if (cards.length) startReview(cards.map(c => Object.assign({}, c, { due: Math.min(c.due, Date.now()), state: c.state === 'new' ? 'learning' : c.state })), 12, cards[0].bookId); else toast('There are no saved questions for this yet. Study a chapter to create some.'); }
    else if (a === 'r-note' && !t.dataset.save) { const box = $('#rNoteBox'); if (box) { box.hidden = false; $('#rNoteText').focus(); } }
    else if (a === 'r-bm' || a === 'r-hl' || a === 'r-note-save') {
      if (!curPara) return; const [bid] = location.hash.slice(6).split('.'); const b = bookOf(bid); if (!b) return; const x = paraOf(b, curPara); const type = { 'r-bm': 'bookmark', 'r-hl': 'highlight', 'r-note-save': 'note' }[a];
      let text = ''; if (type === 'note') { text = ($('#rNoteText').value || '').trim(); if (!text) { toast('Write the note first.'); return; } }
      const ex = S.notes.find(n => n.paraId === curPara && n.bookId === b.id && n.type === type && type !== 'note');
      if (ex) { S.notes = S.notes.filter(n => n !== ex); await DB.del('notes', ex.id); toast(type === 'bookmark' ? 'Bookmark removed.' : 'Highlight removed.'); }
      else { const n = { id: 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), bookId: b.id, chapterId: x.c.id, paraId: curPara, type, text, t: Date.now() }; S.notes.push(n); await save.note(n); toast(type === 'note' ? 'Note saved.' : type === 'bookmark' ? 'Bookmarked.' : 'Highlighted.'); }
      pendingPara = curPara; U.route();
    }
    else if (a === 'del-note') { const n = S.notes.find(x => x.id === t.dataset.id); S.notes = S.notes.filter(x => x !== n); await DB.del('notes', n.id); U.route(); }
    if (!SS || !a.startsWith('ss-')) return;
    const b = bookOf(SS.bookId);
    if (a === 'ss-next' || a === 'ss-skip') { SS.si += a === 'ss-skip' ? 2 : 1; saveDraft(); U.route(); }
    else if (a === 'ss-free') { const txt = $('#freeText').value.trim(); if (txt.split(/\s+/).length < 3) { toast('Write what you remember first — even a few words.'); return; } const fp = Q.freeRecallPrompt(b, SS.scope); const c = Q.coverage(txt, fp.expectedTerms); SS.freeResult = { matched: c.matched, missed: c.missed, expected: fp.expectedTerms.length }; const ch = chOf(b, SS.scope[0]); const entry = { id: SS.id + ':free', session: SS.id, t: Date.now(), bookId: b.id, chapterId: ch.id, type: 'free', concept: null, response: txt, score: fp.expectedTerms.length ? c.ratio : 0, matched: c.matched, missed: c.missed, mode: SS.objective }; S.slog.push(entry); save.log(entry); saveDraft(); U.route(); }
    else if (a === 'ss-conf') {
      const q = qFor(SS.items[SS.qi]); const ans = SS.answers[q.id] = SS.answers[q.id] || {};
      if (['cloze', 'reverse', 'definition', 'reasoning', 'distinction', 'list'].includes(q.type)) ans.response = ($('#qa') || {}).value || '';
      if (q.type === 'multi') ans.response = [...document.querySelectorAll('.mopt:checked')].map(x => +x.value);
      if (q.type === 'match') { ans.response = {}; document.querySelectorAll('[data-m]').forEach(s => { if (s.value !== '') ans.response[+s.dataset.m] = +s.value; }); }
      const empty = ans.response == null || ans.response === '' || (Array.isArray(ans.response) && !ans.response.length && q.type === 'multi') || (typeof ans.response === 'object' && !Array.isArray(ans.response) && !Object.keys(ans.response).length);
      if (empty) { toast(q.type === 'mc' ? 'Choose an option first.' : 'Write an answer first — a guess is fine.'); return; }
      ans.conf = +t.dataset.v; ans.check = Q.check(q, ans.response, { terms: termsOf(bookOf(q.bookId) || b) });
      if (ans.check.method !== 'terms') logAnswer(q, ans, ans.check.result);
      saveDraft(); U.route();
    }
    else if (a === 'ss-self') { const q = qFor(SS.items[SS.qi]); const ans = SS.answers[q.id]; ans.self = t.dataset.v; logAnswer(q, ans, ans.self); saveDraft(); U.route(); }
    else if (a === 'ss-mc') { const q = qFor(SS.items[SS.qi]); (SS.answers[q.id] = SS.answers[q.id] || {}).response = +t.dataset.i; U.route(); }
    else if (a === 'ss-up' || a === 'ss-down') { const q = qFor(SS.items[SS.qi]); const o = SS.answers[q.id].response; const i = +t.dataset.i, j = a === 'ss-up' ? i - 1 : i + 1; [o[i], o[j]] = [o[j], o[i]]; U.route(); }
    else if (a === 'ss-nextq') { SS.qi++; if (SS.qi >= SS.items.length) SS.si++; saveDraft(); U.route(); window.scrollTo(0, 0); }
    else if (a === 'ss-retry') { const missed = sessionLog().filter(l => l.final !== 'correct' && l.type !== 'free' && l.type !== 'application'); const ids = [...new Set(missed.map(l => l.qid))].filter(id => qFor(id)); ids.forEach(id => { const prev = SS.answers[id] || {}; SS.answers[id] = { attempt: (prev.attempt || 0) + 1 }; }); SS.items = ids; SS.qi = 0; SS.si = SS.stages.indexOf('questions'); saveDraft(); U.route(); }
    else if (a === 'ss-app') { const q = qOf(b, SS.apps[SS.ai]); const txt = $('#appText').value.trim(); if (txt.split(/\s+/).length < 8) { toast('Describe the situation and how the concept applies — a few sentences.'); return; } SS.answers[q.id] = { response: txt, submitted: true }; saveDraft(); U.route(); }
    else if (a === 'ss-appcheck') { const q = qOf(b, SS.apps[SS.ai]); const ans = SS.answers[q.id]; const feats = document.querySelectorAll('.feat:checked').length; const tot = Math.min(8, q.expected.length) || 1; const limit = $('#limitOk').checked; const res = feats / tot >= 0.6 && limit ? 'correct' : feats / tot >= 0.3 ? 'partial' : 'incorrect';
      const entry = { id: SS.id + ':' + q.id, session: SS.id, t: Date.now(), bookId: b.id, chapterId: q.chapterId, sectionId: q.sectionId, paraId: q.paraId, qid: q.id, type: 'application', concept: q.concept, response: ans.response, result: res, final: res, self: res, score: feats / tot, limit, method: 'self', mode: SS.objective };
      S.slog.push(entry); save.log(entry); SS.ai++; if (SS.ai >= SS.apps.length) SS.si++; saveDraft(); U.route(); }
    else if (a === 'ss-finish') { const bid = SS.bookId; SS = null; saveDraft(); location.hash = '#book-' + bid; }
  });
  document.addEventListener('input', e => { if (e.target.id === 'freeText' && SS) { SS.freeDraft = e.target.value; clearTimeout(SS._t); SS._t = setTimeout(saveDraft, 600); } });

  // A short original sample text for trying the Study Lab. It is labelled as a sample everywhere it appears.
  const SAMPLE = `# How Decisions Go Wrong

## Chapter 1: Two Kinds of Thinking

### Fast and slow

Fast thinking is the automatic, effortless judgement that produces an answer before we notice any reasoning. Slow thinking refers to deliberate reasoning that we experience as effort and can follow step by step. Most everyday choices rely on fast thinking because it is cheap and usually good enough.

The two systems are not rivals. Unlike slow thinking, fast thinking cannot be switched off; it runs continuously and hands its impressions to slow thinking, which accepts most of them without checking.

### When fast thinking misleads

A heuristic is a mental shortcut that replaces a hard question with an easier one. Heuristics save effort, but they produce predictable errors when the easy question and the hard question have different answers.

People overestimate how often plane crashes happen because vivid examples come to mind easily. We call this the availability heuristic. The ease of remembering an example is mistaken for evidence of how common it is.

There are three conditions in which fast thinking is most likely to mislead: unfamiliar situations, high stakes, and time pressure.

## Chapter 2: Anchors and Frames

### Anchoring

Anchoring is the tendency for an initial number to pull later estimates towards it, even when the number is irrelevant. In one study, people who first spun a wheel that landed on a high number gave higher estimates of an unrelated quantity. Anchoring affects experts as well as novices because the adjustment away from the anchor is usually too small.

### Framing

Framing refers to the way identical information produces different choices depending on how it is presented. A treatment described as having a ninety percent survival rate is preferred to one with a ten percent mortality rate, although the two descriptions are equivalent. Framing works because losses feel larger than equivalent gains.

Loss aversion is the tendency to weigh a loss more heavily than a gain of the same size. Unlike framing, which concerns presentation, loss aversion concerns how outcomes are valued.

## Chapter 3: Better Decisions

### A simple procedure

First, write down the decision before gathering information. Second, list the alternatives you are not choosing. Third, look for evidence that would count against your preferred option. Finally, decide and record why, so that you can learn from the outcome later.

A premortem is an exercise in which a team imagines that a decision has already failed and explains why it failed. The premortem works because it gives people permission to voice doubts that group pressure would otherwise suppress.

### Limits

No procedure removes bias completely. Checklists reduce errors in familiar, repeated decisions, but they help less in novel situations where the relevant factors are not yet known.
`;

  window.MWStudy = { addBook, SAMPLE, get session() { return SS; } };
})();
