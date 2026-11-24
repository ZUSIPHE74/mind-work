// Builds two self-contained outputs from src/:
//   dist/pwa/      index.html + manifest + service worker + icons (installable, offline)
//   dist/artifact/ index.html only (for hosting where a service worker can't run)
const fs = require('fs'), path = require('path');
const R = p => fs.readFileSync(path.join(__dirname, p));
const b64 = p => R(p).toString('base64');
const fonts = `
@font-face{font-family:"Bricolage Grotesque";font-style:normal;font-weight:200 800;font-display:swap;src:url(data:font/woff2;base64,${b64('fontsource-variable-bricolage-grotesque-5.3.0/files/bricolage-grotesque-latin-wght-normal.woff2')}) format("woff2");}
@font-face{font-family:"Newsreader";font-style:normal;font-weight:400;font-display:swap;src:url(data:font/woff2;base64,${b64('fontsource-newsreader-5.3.0/files/newsreader-latin-400-normal.woff2')}) format("woff2");}
@font-face{font-family:"Newsreader";font-style:normal;font-weight:500 600;font-display:swap;src:url(data:font/woff2;base64,${b64('fontsource-newsreader-5.3.0/files/newsreader-latin-500-normal.woff2')}) format("woff2");}
@font-face{font-family:"Newsreader";font-style:italic;font-weight:400;font-display:swap;src:url(data:font/woff2;base64,${b64('fontsource-newsreader-5.3.0/files/newsreader-latin-400-italic.woff2')}) format("woff2");}`;
// isiXhosa strings: merged from i18n/*.json (translated by AI, not yet reviewed by a fluent speaker)
{ const dict = {}; fs.readdirSync('i18n').filter(f => f.endsWith('.json')).sort().forEach(f => Object.assign(dict, JSON.parse(fs.readFileSync('i18n/' + f, 'utf8')))); fs.writeFileSync('src/xh.js', '/* generated from i18n/*.json by build.js */\nwindow.MWXH = ' + JSON.stringify(dict) + ';\n'); }
const js = ['xh.js', 'games.js', 'bank1.js', 'bank2.js', 'engine.js', 'reflect.js', 'improve.js', 'puzzles.js', 'comm.js', 'character.js', 'ai.js', 'grow.js', 'xp.js', 'obs.js', 'bilingual.js', 'competency.js', 'mentor.js', 'abilities.js', 'search.js', 'study.js', 'study-extract.js', 'study-deep.js', 'storage.js', 'ui-core.js', 'ui-player.js', 'ui-reflect.js', 'ui-study.js', 'ui-study-deep.js', 'ui-improve.js', 'ui-discover.js', 'ui-puzzles.js', 'ui-comm.js', 'ui-ai.js', 'ui-grow.js', 'ui-xp.js', 'ui-voice.js', 'ui-obs.js', 'ui-bilingual.js', 'ui-extra.js', 'ui-formats.js', 'ui-mentor.js', 'ui-flex.js', 'ui-mentor-wire.js', 'ui-draw.js', 'ui-comm2.js', 'ui-seq.js', 'ui-express.js', 'ui-i18n.js'].map(f => `/* ${f} */\n` + R('src/' + f).toString()).join('\n;\n').replace(/<\/script/gi, '<\\/script');
const css = R('src/styles.css').toString();
// document readers: shipped inside the page as inert text, started only when a book of that type is uploaded
const lib = (id, p) => `<script type="text/x-mwlib" id="${id}" data-enc="base64">${R(p).toString('base64')}</script>`;
const libs = [lib('lib-pdfworker', 'node_modules/pdfjs-dist/build/pdf.worker.min.js'), lib('lib-pdf', 'node_modules/pdfjs-dist/build/pdf.min.js'), lib('lib-jszip', 'node_modules/jszip/dist/jszip.min.js'), lib('lib-mammoth', 'node_modules/mammoth/mammoth.browser.min.js')].join('\n');
const tpl = R('src/template.html').toString();
const out = (pwa) => tpl.replace('{{PWA}}', pwa ? '1' : '0')
  .replace('{{HEAD}}', pwa ? '<link rel="manifest" href="manifest.webmanifest">\n<link rel="icon" href="icon.svg" type="image/svg+xml">\n<link rel="apple-touch-icon" href="icon-192.png">' : '')
  .replace('{{FONTS}}', () => fonts).replace('{{CSS}}', () => css).replace('{{JS}}', () => js);
const placeLibs = html => { const i = html.indexOf('</head>'); return html.slice(0, i) + libs + '\n' + html.slice(i); };
fs.mkdirSync('dist/pwa', { recursive: true }); fs.mkdirSync('dist/artifact', { recursive: true });
const pwaHtml = placeLibs(out(true));
fs.writeFileSync('dist/pwa/index.html', pwaHtml);
fs.writeFileSync('dist/artifact/index.html', placeLibs(out(false)));
const ver = require('crypto').createHash('sha1').update(pwaHtml).digest('hex').slice(0, 10);
fs.writeFileSync('dist/pwa/sw.js', R('src/sw.js').toString().replace('{{VERSION}}', ver));
['manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'ai-status.json'].forEach(f => fs.copyFileSync('src/' + f, 'dist/pwa/' + f));
console.log('built', (pwaHtml.length / 1024).toFixed(0) + ' KB', 'cache', ver);
