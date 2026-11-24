/* MINDWORK Bilingual Expression Lab — thinking, articulating, preserving meaning and nuance in English and isiXhosa.
   Prompts are given in English (to avoid errors in unreviewed isiXhosa text); you answer in the language each mode asks for.
   Offline feedback is your own structured review. AI feedback, when allowed, judges meaning in both languages and must say
   how confident it is about isiXhosa usage. Practice levels count practice volume; they don't claim to measure proficiency. */
(function (root) {
  const isNode = typeof module !== 'undefined';
  const MODES = [
    { id: 'two', name: 'Express the Same Thought in Two Languages', fields: ['en', 'xh'], prompts: ['Describe your ideal weekend.', 'Explain why you chose your work or studies.', 'Give your view on whether children should have their own phones.'] },
    { id: 'xhfirst', name: 'Think in isiXhosa', fields: ['xh', 'en'], note: 'Answer in isiXhosa first, without translating from English in your head. Then write it in English.', prompts: ['What makes a good neighbour?', 'Describe a family tradition that matters to you.', 'What would you change about where you live?'] },
    { id: 'enfirst', name: 'Think in English', fields: ['en', 'xh'], note: 'Answer in English first, then express the same thinking in isiXhosa — not word for word.', prompts: ['What is something you changed your mind about?', 'What do people misunderstand about your community?', 'What makes advice easy to accept?'] },
    { id: 'meaning', name: 'Meaning Preservation', fields: ['xh', 'why'], note: 'Put this into isiXhosa so that the meaning, and its softness or edge, survive. Then say what was hard.', prompts: ['“I’m not angry, just disappointed.”', '“She’s not unfriendly; she’s careful with strangers.”', '“We can try, but I can’t promise it will work.”'] },
    { id: 'concept', name: 'Explain a Concept in Both Languages', fields: ['en', 'xh'], prompts: ['Explain what a budget is to a twelve-year-old.', 'Explain what “active listening” means.', 'Explain how interest on a loan works.'] },
    { id: 'nuance', name: 'Nuance and Precision', fields: ['en', 'xh'], prompts: ['How do you say “I’m a bit tired” versus “I’m exhausted”, and what’s the difference in feel?', 'How do you disagree respectfully with an elder in each language?', 'Explain a word or saying in isiXhosa that has no clean English equivalent.'] },
    { id: 'speak', name: 'Spontaneous Bilingual Speaking', speaking: true, note: 'Speak for one minute, switching between the languages wherever it feels natural.', prompts: ['A memory from childhood', 'What home means to you', 'A person who shaped you'] },
    { id: 'roleplay', name: 'Bilingual Role-Play', ai: true, note: 'A conversation with someone who moves naturally between isiXhosa and English. Needs AI.', prompts: [] }];
  const BY = Object.fromEntries(MODES.map(m => [m.id, m]));
  const FIELD = { en: 'In English', xh: 'In isiXhosa', why: 'What was hard to keep, and how you handled it' };
  const REVIEW = ['Both versions say the same thing', 'I kept the tone (softness, respect, humour)', 'It sounds natural, not translated word for word', 'I had the words I needed'];
  const ROLEPLAY = { id: 'bilingual', title: 'Catching up with Ayanda', context: 'personal', persona: 'You are Ayanda, a friend from Gqeberha in her late twenties who naturally moves between isiXhosa and English in the same conversation, the way many South Africans do. Use isiXhosa that sounds natural, not textbook. If the other person replies in either language, follow them comfortably. You’re catching up after a few months; you recently started a new job and you’re thinking of moving back home.', opener: 'Hey wena! Kudala singathethi. How have you been?' };
  const PRACTICE_LEVELS = [[0, 'Getting started'], [3, 'Building range'], [8, 'Regular practice'], [15, 'Wide range'], [25, 'Sustained practice']];
  function practiceLevel(log) { const n = log.filter(e => e.kind === 'ex').length; let i = 0; PRACTICE_LEVELS.forEach(([min], k) => { if (n >= min) i = k; }); return { level: i + 1, name: PRACTICE_LEVELS[i][1], n }; }
  const q = s => JSON.stringify(String(s == null ? '' : s));
  function feedbackPrompt({ mode, prompt, answers }) {
    return `You are giving feedback in MINDWORK’s Bilingual Expression Lab, where someone practises expressing herself in English and isiXhosa.
Exercise: ${q(BY[mode].name)}. Prompt: ${q(prompt)}.
${Object.entries(answers).map(([k, v]) => `${FIELD[k]}: ${q(v)}`).join('\n')}

How to judge:
- Judge whether the meaning, tone and nuance are preserved across the languages, and whether each version sounds natural in its own language.
- Never judge isiXhosa by English norms (word order, idioms, directness). Natural isiXhosa expression that differs from the English is not an error.
- Be honest about your confidence in judging isiXhosa usage; if you are unsure whether a phrase is natural or regionally varied, say so instead of correcting it.
- Quote her exact words as evidence for every point. No automatic praise, no invented problems. British English.

Reply with ONLY a JSON object:
{"meaning": "same|close|different", "summary": "one or two sentences",
 "differences": [{"point": "...", "evidence": "her exact words"}],
 "natural": [{"language": "en|xh", "point": "...", "evidence": "her exact words"}],
 "try": "one concrete thing to try, or empty",
 "isixhosa_confidence": "low|medium|high", "uncertain": ["..."]}`;
  }
  const api = { MODES, BY, FIELD, REVIEW, ROLEPLAY, PRACTICE_LEVELS, practiceLevel, feedbackPrompt };
  if (isNode) module.exports = api; else root.MWBL = api;
})(this);
