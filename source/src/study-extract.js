/* MINDWORK book extraction. Runs entirely in the browser; libraries (pdf.js, JSZip, mammoth) are bundled and only
   started when a book is uploaded. Produces a structure that keeps every paragraph's chapter, section and page. */
(function (root) {
  class ExtractError extends Error { constructor(code, msg) { super(msg); this.code = code; } }
  const clean = s => String(s || '').replace(/\u00ad/g, '').replace(/[ \t\u00a0]+/g, ' ').trim();

  /* blocks: [{ kind: 'h1'|'h2'|'h3'|'p', text, page, emph:[] }] → chapters/sections/paragraphs */
  function structure(blocks, meta) {
    const warnings = [];
    const lvl = { h1: 1, h2: 2, h3: 3 };
    const counts = { h1: 0, h2: 0, h3: 0 }; blocks.forEach(b => { if (lvl[b.kind]) counts[b.kind]++; });
    // the chapter level is the highest heading level that occurs at least twice (or once if it's all there is)
    // a single top-level heading at the very start, followed by lower headings, is the book's title, not a chapter
    if (counts.h1 === 1 && blocks[0] && blocks[0].kind === 'h1' && counts.h2 >= 1) { if (meta && !meta.titleFromFile) meta.title = meta.title || blocks[0].text; blocks = blocks.slice(1); counts.h1 = 0; }
    let chapLevel = ['h1', 'h2', 'h3'].find(k => counts[k] >= 2) || ['h1', 'h2', 'h3'].find(k => counts[k] >= 1) || null;
    const chapters = []; let ch = null, sec = null, pi = 0;
    const newCh = (title, page) => { ch = { id: 'c' + (chapters.length + 1), title, page: page == null ? null : page, sections: [] }; chapters.push(ch); sec = null; };
    const newSec = (title, page) => { if (!ch) newCh(meta && meta.title ? meta.title : 'Opening', page); sec = { id: ch.id + 's' + (ch.sections.length + 1), title, page: page == null ? null : page, paras: [] }; ch.sections.push(sec); pi = 0; };
    blocks.forEach(b => {
      if (chapLevel && b.kind === chapLevel) { newCh(b.text, b.page); return; }
      if (lvl[b.kind] && (!chapLevel || lvl[b.kind] > lvl[chapLevel])) { newSec(b.text, b.page); return; }
      if (lvl[b.kind]) { newSec(b.text, b.page); return; }
      if (!sec) newSec(ch ? ch.title : 'Opening', b.page);
      sec.paras.push({ id: sec.id + 'p' + (++pi), text: b.text, page: b.page == null ? null : b.page, emph: b.emph && b.emph.length ? b.emph : undefined });
    });
    // drop empty sections/chapters (e.g. a heading directly followed by another heading)
    chapters.forEach(c => { c.sections = c.sections.filter(s => s.paras.length); });
    let out = chapters.filter(c => c.sections.length);
    if (!chapLevel || out.length <= 1) {
      const paras = out.flatMap(c => c.sections.flatMap(s => s.paras));
      if (paras.length > 30 && !chapLevel) {
        warnings.push('No chapter headings were found, so the text was divided into parts of similar length. Part titles are MINDWORK’s, not the author’s.');
        out = []; const size = Math.max(15, Math.ceil(paras.length / Math.ceil(paras.length / 25)));
        for (let i = 0; i < paras.length; i += size) { const n = out.length + 1; const cid = 'c' + n; out.push({ id: cid, title: 'Part ' + n, generated: true, page: paras[i].page, sections: [{ id: cid + 's1', title: 'Part ' + n, page: paras[i].page, paras: paras.slice(i, i + size).map((p, k) => Object.assign({}, p, { id: cid + 's1p' + (k + 1) })) }] }); }
      }
    }
    // renumber ids after filtering so they stay stable and sequential
    out.forEach((c, ci) => { const cid = 'c' + (ci + 1); c.id = cid; c.sections.forEach((s, si) => { s.id = cid + 's' + (si + 1); s.paras.forEach((p, pk) => { p.id = s.id + 'p' + (pk + 1); }); }); });
    return { chapters: out, warnings };
  }

  // ───────── plain text / markdown
  function parseText(text, name) {
    const lines = String(text).replace(/\r\n?/g, '\n').split('\n');
    const blocks = []; let buf = [];
    const flush = () => { if (buf.length) { const t = clean(buf.join(' ')); if (t) blocks.push({ kind: 'p', text: t, page: null }); buf = []; } };
    lines.forEach((raw, i) => {
      const line = raw.trim(); const prevBlank = i === 0 || !lines[i - 1].trim(), nextBlank = i === lines.length - 1 || !lines[i + 1].trim();
      let m;
      if (!line) { flush(); return; }
      if ((m = /^(#{1,3})\s+(.+)$/.exec(line))) { flush(); blocks.push({ kind: 'h' + m[1].length, text: clean(m[2]), page: null }); return; }
      if (prevBlank && nextBlank && /^(chapter|part|book|section)\s+([0-9ivxlc]+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/i.test(line) && line.length < 90) { flush(); blocks.push({ kind: /^part|^book/i.test(line) ? 'h1' : 'h1', text: clean(line), page: null }); return; }
      if (prevBlank && nextBlank && line.length < 70 && line === line.toUpperCase() && /[A-Z]{3}/.test(line) && !/[.!?,;]$/.test(line)) { flush(); blocks.push({ kind: 'h2', text: clean(line.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())), page: null }); return; }
      buf.push(line);
    });
    flush();
    // a "Chapter 1" line immediately followed by a short title line becomes one heading
    for (let i = 0; i < blocks.length - 1; i++) if (blocks[i].kind === 'h1' && /^(chapter|part)\s+\S+$/i.test(blocks[i].text) && blocks[i + 1].kind === 'p' && blocks[i + 1].text.length < 70 && !/[.!?]$/.test(blocks[i + 1].text)) { blocks[i].text += ': ' + blocks[i + 1].text; blocks.splice(i + 1, 1); }
    const title = (blocks.find(b => b.kind === 'h1' && !/^(chapter|part)\b/i.test(b.text)) || {}).text;
    return { blocks, meta: { title: title || name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '), author: null } };
  }

  // ───────── PDF (pdf.js)
  async function parsePdf(buf, name, onProgress) {
    const lib = root.pdfjsLib; if (!lib) throw new ExtractError('lib', 'The PDF reader didn’t load.');
    let doc;
    try { doc = await lib.getDocument({ data: new Uint8Array(buf), isEvalSupported: false, useSystemFonts: true }).promise; }
    catch (e) { if (e && e.name === 'PasswordException') throw new ExtractError('protected', 'This PDF is password-protected. MINDWORK doesn’t bypass document protection — open it with its password in another app and export an unprotected copy if you’re entitled to.'); throw new ExtractError('corrupt', 'This PDF couldn’t be read. It may be damaged or not really a PDF.'); }
    const meta = await doc.getMetadata().catch(() => ({})); const info = (meta && meta.info) || {};
    const pages = []; let chars = 0;
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n); const tc = await page.getTextContent();
      const items = tc.items.filter(it => it.str && it.str.trim() !== '' || it.hasEOL).map(it => ({ s: it.str, x: it.transform[4], y: it.transform[5], h: Math.abs(it.transform[3]) || Math.hypot(it.transform[2], it.transform[3]) || it.height || 10, f: it.fontName }));
      // group into lines by baseline
      const lines = []; items.forEach(it => { if (!it.s) return; let L = lines.find(l => Math.abs(l.y - it.y) < Math.max(2, it.h * 0.4)); if (!L) { L = { y: it.y, h: it.h, parts: [] }; lines.push(L); } L.parts.push(it); L.h = Math.max(L.h, it.h); });
      lines.sort((a, b) => b.y - a.y); lines.forEach(l => { l.parts.sort((a, b) => a.x - b.x); l.text = clean(l.parts.map(p => p.s).join(' ').replace(/\s+([,.;:!?])/g, '$1')); l.x = l.parts[0].x; });
      const L = lines.filter(l => l.text); chars += L.reduce((s, l) => s + l.text.length, 0); pages.push({ n, lines: L });
      if (onProgress) onProgress(n / doc.numPages);
    }
    if (chars / Math.max(1, doc.numPages) < 40) throw new ExtractError('scanned', `This PDF has almost no extractable text (${chars} characters across ${doc.numPages} pages). It is probably scanned images of pages. MINDWORK can’t read it without OCR (text recognition), which isn’t built in. Run it through an OCR tool first, then upload the result.`);
    // remove running headers/footers: identical first/last lines (digits ignored) on many pages, and bare page numbers
    const key = t => t.replace(/\d+/g, '#').toLowerCase(); const freq = new Map();
    pages.forEach(p => { [p.lines[0], p.lines[p.lines.length - 1]].filter(Boolean).forEach(l => freq.set(key(l.text), (freq.get(key(l.text)) || 0) + 1)); });
    const running = new Set([...freq.entries()].filter(([k, n]) => n >= Math.max(3, pages.length * 0.3)).map(([k]) => k));
    if (clean(info.Title)) running.add(key(clean(info.Title))); // a line repeating the document's own title at the page edge is a running header
    pages.forEach(p => { p.lines = p.lines.filter((l, i) => !(/^[-–\s]*\d{1,4}[-–\s]*$/.test(l.text)) && !((i === 0 || i === p.lines.length - 1) && running.has(key(l.text)))); });
    // body size = most common line height weighted by characters
    const hist = new Map(); pages.forEach(p => p.lines.forEach(l => { const h = Math.round(l.h * 2) / 2; hist.set(h, (hist.get(h) || 0) + l.text.length); }));
    const body = [...hist.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const headSizes = [...new Set(pages.flatMap(p => p.lines.filter(l => l.h >= body * 1.2 && l.text.length < 110 && !/[.,;]$/.test(l.text)).map(l => Math.round(l.h * 2) / 2)))].sort((a, b) => b - a);
    const levelOf = h => { const i = headSizes.indexOf(Math.round(h * 2) / 2); return i < 0 ? null : 'h' + Math.min(3, i + 1); };
    const blocks = [];
    pages.forEach(p => {
      let para = null, prev = null;
      p.lines.forEach(l => {
        const hk = l.h >= body * 1.2 && l.text.length < 110 && !/[.,;]$/.test(l.text) ? levelOf(l.h) : null;
        if (hk) { if (para) { blocks.push(para); para = null; } const last = blocks[blocks.length - 1]; if (last && last.kind === hk && last.page === p.n && prev && prev.isHead) last.text += ' ' + l.text; else blocks.push({ kind: hk, text: l.text, page: p.n }); prev = { isHead: true, l }; return; }
        const gap = prev && !prev.isHead ? prev.l.y - l.y : 0;
        const newPara = !para || gap > l.h * 1.65 || (prev && prev.l && /[.!?:"”]$/.test(prev.l.text) && l.x > prev.l.x + l.h * 0.8);
        if (newPara) { if (para) blocks.push(para); para = { kind: 'p', text: l.text, page: p.n }; }
        else para.text = /[A-Za-z]-$/.test(para.text) ? para.text.slice(0, -1) + l.text : para.text + ' ' + l.text;
        prev = { isHead: false, l };
      });
      if (para) blocks.push(para);
    });
    // paragraphs that run across a page break: join when the earlier one doesn't end a sentence
    for (let i = 1; i < blocks.length; i++) { const a = blocks[i - 1], b = blocks[i]; if (a.kind === 'p' && b.kind === 'p' && b.page === a.page + 1 && !/[.!?:"”)]$/.test(a.text) && /^[a-z]/.test(b.text)) { a.text = (/[A-Za-z]-$/.test(a.text) ? a.text.slice(0, -1) : a.text + ' ') + b.text; blocks.splice(i, 1); i--; } }
    // prefer the PDF's own outline (bookmarks) for chapters when it has one
    let outline = null; try { outline = await doc.getOutline(); } catch (e) {}
    if (outline && outline.length >= 2) {
      const pageOf = async d => { try { const dest = typeof d === 'string' ? await doc.getDestination(d) : d; if (!dest) return null; return (await doc.getPageIndex(dest[0])) + 1; } catch (e) { return null; } };
      const top = []; for (const o of outline) { const pg = await pageOf(o.dest); if (pg) { const kids = []; for (const k of (o.items || [])) { const kp = await pageOf(k.dest); if (kp) kids.push({ title: clean(k.title), page: kp }); } top.push({ title: clean(o.title), page: pg, kids }); } }
      if (top.length >= 2) {
        const marks = top.flatMap(t => [{ kind: 'h1', text: t.title, page: t.page }].concat(t.kids.map(k => ({ kind: 'h2', text: k.title, page: k.page }))));
        const body2 = blocks.filter(b => b.kind === 'p' || b.kind === 'h3').map(b => b.kind === 'h3' ? Object.assign({}, b, { kind: 'p' }) : b)
          .filter(b => !marks.some(m => m.page === b.page && norm(m.text) === norm(b.text)));
        const merged = []; let mi = 0; const ms = marks.slice().sort((a, b) => a.page - b.page);
        body2.forEach(b => { while (mi < ms.length && ms[mi].page <= b.page) merged.push(ms[mi++]); merged.push(b); }); while (mi < ms.length) merged.push(ms[mi++]);
        return { blocks: merged.filter(b => !(b.kind !== 'p' && blocks.some(x => x.kind !== 'p' && norm(x.text) === norm(b.text) && false))), meta: { title: clean(info.Title) || name.replace(/\.pdf$/i, ''), author: clean(info.Author) || null, pages: doc.numPages }, outline: true };
      }
    }
    return { blocks, meta: { title: clean(info.Title) || (blocks.find(b => b.kind === 'h1') || {}).text || name.replace(/\.pdf$/i, ''), author: clean(info.Author) || null, pages: doc.numPages } };
  }
  const norm = s => clean(s).toLowerCase();

  // ───────── HTML → blocks (EPUB chapters, DOCX via mammoth)
  function htmlBlocks(html, pageLabel) {
    const dom = new DOMParser().parseFromString(html, /<\?xml|xmlns=/.test(html.slice(0, 300)) ? 'application/xhtml+xml' : 'text/html');
    const body = dom.body || dom.documentElement; const out = [];
    const walk = el => {
      for (const n of el.children) {
        const tag = n.tagName.toLowerCase();
        if (/^h[1-6]$/.test(tag)) { const t = clean(n.textContent); if (t) out.push({ kind: 'h' + Math.min(3, +tag[1]), text: t, page: pageLabel }); }
        else if (['p', 'li', 'blockquote', 'dd', 'dt', 'figcaption'].includes(tag) && !n.querySelector('p, li, h1, h2, h3, h4')) {
          const t = clean(n.textContent); if (t) out.push({ kind: 'p', text: t, page: pageLabel, emph: [...n.querySelectorAll('b, strong, em, i, dfn')].map(e => clean(e.textContent)).filter(e => e && e.split(/\s+/).length <= 5 && e.length > 2) });
        }
        else if (!['script', 'style', 'nav', 'aside', 'figure', 'table', 'svg'].includes(tag)) walk(n);
      }
    };
    walk(body); return out;
  }
  async function parseEpub(buf, name) {
    const Z = root.JSZip; if (!Z) throw new ExtractError('lib', 'The EPUB reader didn’t load.');
    let zip; try { zip = await Z.loadAsync(buf); } catch (e) { throw new ExtractError('corrupt', 'This EPUB couldn’t be opened. It may be damaged.'); }
    const read = p => zip.file(p) ? zip.file(p).async('string') : Promise.resolve(null);
    const enc = await read('META-INF/encryption.xml');
    if (enc && /EncryptedData/.test(enc) && !/fonts?\//i.test(enc.replace(/<EncryptedData[\s\S]*?<\/EncryptedData>/g, m => /\.(ttf|otf|woff2?)"/i.test(m) ? '' : m) || '')) throw new ExtractError('protected', 'This EPUB is protected by DRM. MINDWORK doesn’t bypass protection. Books bought without DRM, or exported by an app you’re entitled to use, will work.');
    const container = await read('META-INF/container.xml'); if (!container) throw new ExtractError('corrupt', 'This EPUB is missing its table of contents file.');
    const opfPath = /full-path="([^"]+)"/.exec(container)[1]; const base = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : '';
    const opf = new DOMParser().parseFromString(await read(opfPath), 'application/xml');
    const q = (sel) => opf.getElementsByTagNameNS('*', sel);
    const title = clean((q('title')[0] || {}).textContent) || name.replace(/\.epub$/i, ''); const author = clean((q('creator')[0] || {}).textContent) || null;
    const manifest = {}; [...q('item')].forEach(i => { manifest[i.getAttribute('id')] = { href: decodeURIComponent(i.getAttribute('href')), type: i.getAttribute('media-type'), props: i.getAttribute('properties') || '' }; });
    const spine = [...q('itemref')].map(r => manifest[r.getAttribute('idref')]).filter(Boolean);
    // TOC titles from EPUB3 nav or EPUB2 NCX
    const tocTitle = {}; const resolve = (from, href) => { const parts = (from + href.split('#')[0]).split('/'); const st = []; parts.forEach(p => { if (p === '..') st.pop(); else if (p !== '.') st.push(p); }); return st.join('/'); };
    const navItem = Object.values(manifest).find(m => /nav/.test(m.props));
    if (navItem) { const nh = await read(base + navItem.href); if (nh) { const nd = new DOMParser().parseFromString(nh, 'application/xhtml+xml'); const navDir = (base + navItem.href).slice(0, (base + navItem.href).lastIndexOf('/') + 1); [...nd.getElementsByTagName('a')].forEach(a => { const h = a.getAttribute('href'); if (h) { const k = resolve(navDir, h); if (!tocTitle[k]) tocTitle[k] = clean(a.textContent); } }); } }
    else { const ncx = Object.values(manifest).find(m => /ncx/.test(m.type)); if (ncx) { const nx = new DOMParser().parseFromString(await read(base + ncx.href), 'application/xml'); [...nx.getElementsByTagNameNS('*', 'navPoint')].forEach(np => { const c = np.getElementsByTagNameNS('*', 'content')[0], l = np.getElementsByTagNameNS('*', 'text')[0]; if (c && l) { const k = resolve(base, c.getAttribute('src')); if (!tocTitle[k]) tocTitle[k] = clean(l.textContent); } }); } }
    const blocks = [];
    for (const it of spine) {
      if (!/html|xml/.test(it.type || '')) continue; const path = resolve(base, it.href); const html = await read(path); if (!html) continue;
      const bl = htmlBlocks(html, null); const text = bl.filter(b => b.kind === 'p').reduce((s, b) => s + b.text.length, 0); if (text < 120) continue;
      const chTitle = tocTitle[path] || (bl.find(b => b.kind === 'h1' || b.kind === 'h2') || {}).text || 'Untitled section';
      blocks.push({ kind: 'h1', text: chTitle, page: null });
      bl.forEach((b, i) => { if (b.kind !== 'p' && norm(b.text) === norm(chTitle) && i < 3) return; blocks.push(b.kind === 'p' ? b : Object.assign({}, b, { kind: b.kind === 'h1' ? 'h2' : b.kind === 'h2' ? 'h2' : 'h3' })); });
    }
    return { blocks, meta: { title, author, pages: null } };
  }
  async function parseDocx(buf, name) {
    const m = root.mammoth; if (!m) throw new ExtractError('lib', 'The Word reader didn’t load.');
    let res; try { res = await m.convertToHtml({ arrayBuffer: buf }); } catch (e) { throw new ExtractError('corrupt', 'This Word file couldn’t be read. Only .docx is supported (not the older .doc format).'); }
    const blocks = htmlBlocks('<html><body>' + res.value + '</body></html>', null);
    let title = name.replace(/\.docx$/i, ''); try { const z = await root.JSZip.loadAsync(buf); const core = await z.file('docProps/core.xml')?.async('string'); const t = core && /<dc:title>([^<]+)</.exec(core); const a = core && /<dc:creator>([^<]+)</.exec(core); if (t) title = clean(t[1]); if (a) return { blocks, meta: { title, author: clean(a[1]), pages: null } }; } catch (e) {}
    return { blocks, meta: { title, author: null, pages: null } };
  }

  async function extract(file, buf, onProgress) {
    const name = file.name || 'book'; const ext = (name.split('.').pop() || '').toLowerCase();
    let r, type;
    if (ext === 'pdf' || file.type === 'application/pdf') { type = 'pdf'; r = await parsePdf(buf, name, onProgress); }
    else if (ext === 'epub') { type = 'epub'; r = await parseEpub(buf, name); }
    else if (ext === 'docx') { type = 'docx'; r = await parseDocx(buf, name); }
    else if (['txt', 'md', 'markdown', 'text'].includes(ext) || /^text\//.test(file.type)) { type = 'txt'; r = parseText(new TextDecoder('utf-8').decode(buf), name); }
    else if (['doc', 'mobi', 'azw', 'azw3', 'kfx'].includes(ext)) throw new ExtractError('format', `.${ext} files aren’t supported. Use PDF, EPUB, DOCX or TXT. Kindle formats are usually DRM-protected; MINDWORK doesn’t bypass that.`);
    else throw new ExtractError('format', 'Unsupported file type. Use PDF, EPUB, DOCX or TXT.');
    const s = structure(r.blocks, r.meta);
    const paraCount = s.chapters.reduce((n, c) => n + c.sections.reduce((m, x) => m + x.paras.length, 0), 0);
    if (!paraCount) throw new ExtractError('empty', 'No readable text was found in this file.');
    const warnings = s.warnings.slice();
    if (type !== 'pdf') warnings.push(type === 'txt' ? 'Plain text has no page numbers; locations are given by chapter and section.' : `${type.toUpperCase()} files have no fixed pages; locations are given by chapter and section.`);
    if (type === 'pdf' && !r.outline) warnings.push('Chapters were detected from heading sizes because the PDF has no bookmarks. Check the contents and rename anything that looks wrong.');
    return { title: r.meta.title, author: r.meta.author, fileType: type, fileName: name, size: buf.byteLength, pages: r.meta.pages || null, chapters: s.chapters, warnings, words: s.chapters.reduce((n, c) => n + c.sections.reduce((m, x) => m + x.paras.reduce((k, p) => k + p.text.split(/\s+/).length, 0), 0), 0) };
  }

  const api = { extract, structure, parseText, htmlBlocks, ExtractError };
  if (typeof module !== 'undefined') module.exports = api; else root.MWX = api;
})(this);
