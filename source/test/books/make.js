// Builds test books in every supported format from one original text about memory.
const fs = require('fs'); const path = require('path');
const NM = '/opt/npm-tools/node_modules/';
const { PDFDocument, StandardFonts, rgb } = require(NM + 'pdf-lib');
const docx = require(NM + 'docx');
const CH = [
  { t: 'Chapter 1: How Memories Form', s: [
    { t: 'Encoding', p: ['Encoding is the process by which an experience is converted into a form the brain can store. Attention matters most at this stage because information that is never attended to is rarely encoded at all.', 'Elaborative encoding refers to linking new information to things you already know. Unlike rote repetition, elaborative encoding creates several routes back to the same memory.'] },
    { t: 'Consolidation', p: ['Consolidation is the gradual stabilisation of a memory after it has been encoded. Sleep supports consolidation because the brain replays recent experiences during deep sleep.', 'There are three stages of memory: encoding, consolidation and retrieval.'] } ] },
  { t: 'Chapter 2: Why We Forget', s: [
    { t: 'Decay and interference', p: ['Interference is what happens when similar memories compete with one another during retrieval. Retroactive interference occurs when new learning disrupts older memories, whereas proactive interference occurs when older memories disrupt new learning.', 'Forgetting is not always a failure. Forgetting irrelevant details leads to clearer recall of the details that matter.'] },
    { t: 'The testing effect', p: ['The testing effect is the finding that retrieving information strengthens memory more than rereading it. Retrieval practice works because each successful retrieval makes the route to the memory easier to find next time.', 'Spacing refers to distributing practice over time rather than concentrating it in one session. Spaced practice feels harder than massed practice, yet it produces more durable learning.'] } ] }];
const words = s => s.split(' ');
async function pdf(scanned) {
  const doc = await PDFDocument.create(); const body = await doc.embedFont(StandardFonts.TimesRoman), bold = await doc.embedFont(StandardFonts.HelveticaBold);
  doc.setTitle(scanned ? 'Scanned Pages' : 'Remembering: A Short Guide'); doc.setAuthor('Test Author');
  let page, y, n = 0;
  const newPage = () => { page = doc.addPage([420, 595]); n++; y = 540; if (!scanned) { page.drawText('Remembering: A Short Guide', { x: 40, y: 565, size: 8, font: body }); page.drawText(String(n), { x: 205, y: 25, size: 9, font: body }); } else { page.drawRectangle({ x: 40, y: 60, width: 340, height: 470, color: rgb(0.85, 0.85, 0.85) }); } };
  newPage(); if (scanned) { newPage(); fs.writeFileSync('scanned.pdf', await doc.save()); return; }
  const line = (txt, size, font) => { if (y < 60) newPage(); page.drawText(txt, { x: 40, y, size, font }); y -= size * 1.4; };
  const para = (txt) => { let ln = ''; words(txt).forEach(w => { if (body.widthOfTextAtSize(ln + ' ' + w, 11) > 330) { line(ln.trim(), 11, body); ln = ''; } ln += ' ' + w; }); if (ln.trim()) line(ln.trim(), 11, body); y -= 8; };
  CH.forEach((c, i) => { if (i) newPage(); y -= 10; line(c.t, 20, bold); y -= 8; c.s.forEach(s => { line(s.t, 14, bold); s.p.forEach(para); }); });
  fs.writeFileSync('memory.pdf', await doc.save());
}
async function word() {
  const kids = [];
  CH.forEach(c => { kids.push(new docx.Paragraph({ text: c.t, heading: docx.HeadingLevel.HEADING_1 })); c.s.forEach(s => { kids.push(new docx.Paragraph({ text: s.t, heading: docx.HeadingLevel.HEADING_2 })); s.p.forEach(p => { const m = /^([A-Z][a-z]+(?: [a-z]+)?) (is|refers)/.exec(p); kids.push(new docx.Paragraph({ children: m ? [new docx.TextRun({ text: m[1], bold: true }), new docx.TextRun(p.slice(m[1].length))] : [new docx.TextRun(p)] })); }); }); });
  const d = new docx.Document({ title: 'Remembering (Word edition)', creator: 'Test Author', sections: [{ children: kids }] });
  fs.writeFileSync('memory.docx', await docx.Packer.toBuffer(d));
}
fs.writeFileSync('chapters.json', JSON.stringify(CH));
fs.writeFileSync('memory.txt', 'REMEMBERING\n\n' + CH.map(c => c.t.replace(/^Chapter (\d): /, 'Chapter $1\n\n') + '\n\n' + c.s.map(s => '## ' + s.t + '\n\n' + s.p.join('\n\n')).join('\n\n')).join('\n\n'));
(async () => { await pdf(false); await pdf(true); await word(); console.log('ok'); })();
