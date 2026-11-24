# MINDWORK

## Put MINDWORK on your phone (works offline, no account needed)
On a computer with internet, in the unzipped `mindwork` folder, run:

    python3 serve.py --phone

It fetches Cloudflare's free tunnel program the first time, then prints an https link. Open that link on your phone, let it
load, and install it (iPhone Safari: Share → Add to Home Screen; Android Chrome: ⋮ → Install app). From then on it opens
from your home screen and works offline, even after you stop the program. The link changes each run; a new link is a
separate copy with its own data, so move progress with Settings → Export / Import backup. AI features are switched off for
anyone using the link (they would otherwise use your key).

Version 5.0.0 — Speak with intention (Conversation Lab and Think): readiness, chosen pauses, intended contribution, spoken or
written responses, interruption and recovery, a rules-based transcript review that flags possible repetition, padding, unfinished
sentences and detours without scoring, and optional AI diagnosis separating observations from hypotheses. Six new competencies
(Intentional expression); concise expression and spontaneous articulation reuse existing ones; five new difficulty types.
Correction: 4.8 notes said 35 competencies (corrected; 41 from 5.0); there were 35. There are now 41.
Version 4.9.0 — Remaining non-isiXhosa backlog: seven new Playground formats (Evidence Board, Ambiguous Messages, Image to
Explanation, Two Arguments by listening, Reconstruct the Conversation, Communication Under Constraints, Find the Inconsistency);
drawing challenges; study sequences (Learn → Think → Communicate); intercultural role-play, storytelling, longer conversation
analysis, annotated replays of AI conversations; AI-checked possibility recognition; evidence from every environment reaching
competencies, Thinking Abilities, character, the Improvement Workshop (incl. Observation) and XP. See docs/AUDIT-4.9.md.
Version 4.8.0 — Mentor and competencies. Improve › Your mentor: a daily plan with reasons (short/medium/extended), a teaching
conversation that diagnoses the kind of difficulty and changes strategy, the attempt→transfer cycle, and visible control over
what it knows (journal and Grow off by default). Progress › Competencies: 35 competencies (corrected; 41 from 5.0) (thought development, connection,
articulation, leadership, spontaneity, interaction, 10 kinds of flexibility, 12 conversational dimensions) with evidence-only
states and before/after comparisons from real quoted evidence. Conversation Lab: group conversations (AI plays several people),
Possible directions, Quick responses, Say it different ways. Recurring difficulties across activities become Improvement
Workshop targets. AI parts tested with a stand-in model only.
Version 4.7.0 — Boss challenges (Critical Thinker, Perspective, Real-World, Memory Trial, Communicator); Challenge mode (no hints,
one level up); Transfer challenges; Multiple Approaches; Knowledge in Action; puzzles of the week and collections; a skill tree in
Records; three role-plays (networking, interviewing, crisis communication); AI partner for any role-play; voice conversation mode;
AI feedback can name thinking abilities only with quoted evidence; three new exercise formats (Odd One Out, Categorise,
Reconstruct the Sequence).
Version 4.6.0 — isiXhosa version (Settings → Language). The whole interface is translated (about 1,900 strings, in i18n/*.json,
merged by build.js). The translation was produced by AI (Claude) and has NOT been reviewed by a fluent speaker; the app says so
on every page. AI features (exploration, open conversation, feedback, Grow reflection) run in isiXhosa. Exercises judged by
English-language word rules (Playground exercises, rule-based role-plays, typed-answer puzzles) stay in English with a notice,
because those rules cannot judge isiXhosa fairly. Your own writing and AI-written text are never translated.
Version 4.5.0 — Grow, progression, voice, Observation and Memory, Bilingual Expression Lab, isiXhosa navigation.
- Grow: six areas (Self-Expression; Self-Discovery and Identity; Emotional Awareness and Regulation; Flexibility and
  Imperfection; Attention and Social Perception; What Stands in the Way), 30 practical and reflective activities, a private
  emotional check-in with a 30-day pattern view, real-life follow-ups, and two-way links with Communicate. Nothing in Grow is
  scored or shown on summary screens; AI reflection happens only when you press it on one activity.
- Progression: XP, levels, records, three daily missions, a weekly journey and achievements, all derived from recorded
  practice. Nothing is locked; consistency is shown as days practised out of the last 14, never a streak to lose.
- Voice: dictation (claude.ai's on the hosted page; otherwise the browser's, which in Chrome sends audio to Google, so it
  is off until allowed), read-aloud (claude.ai's voice or on-device voices), and recording yourself (memory only unless
  downloaded). isiXhosa recognition depends on the browser.
- Observation and Memory: the eighth Cognitive Playground category — six generated exercises with adaptive levels.
- Bilingual Expression Lab (Communicate): eight modes, expression gaps, a vocabulary journal, optional AI feedback that must
  not judge isiXhosa by English norms and states its own confidence. Interface language: isiXhosa (beta) translates
  navigation only and is marked as not yet reviewed by a fluent speaker.
- Open-conversation patterns feed the Improvement Workshop; Keep the Conversation Moving links to open AI conversation.
Version 4.4.0 — adaptive AI conversation, honest feedback and character development.
- Explore a question (Deep Thinking) and Open conversation (Conversation Lab) use a real language model when one is
  available: on the hosted claude.ai page through your own Claude account (permission asked first), or here when you start
  `ANTHROPIC_API_KEY=sk-... python3 serve.py` (the key stays in the launcher; only this computer may use it unless
  MINDWORK_AI_LAN=1). Without a model these features say so; nothing is simulated.
- Sent to the model: only the current exercise and what you write in it, plus your chosen character goals if you allow it.
  Never journals, books, notes, real-life notes or history. AI sessions are kept on this device.
- AI feedback separates what was observed (quoted from your words), inferred, uncertain and impossible to tell from text.
  Any point whose quoted evidence is not in your words is removed and the removal is shown.
- Grow › Your character: the intended personality portrait as a reference you adopt, adapt, postpone or decline, with
  evidence-only stages (awareness → consistency) and the balance table.
- Rules-based feedback changes: a question alone is no longer treated as a fault; relying on questions is raised only when
  it recurs; offline Deep Thinking explains a question when you say you don't understand, without scoring it.
Version 4.3.0 — Communicate: seven skill areas (Foundations, Public Speaking, Interpersonal including assertiveness,
Influence and Persuasion, Negotiation, Conflict Resolution, Group and Leadership) alongside the Conversation Lab. Each area has
a skill card, recognition exercises, role-plays (12, with or without coaching), writing tasks with transparent checks (11),
speaking practice with a timer and self-review (2), private real-life challenges, and a seven-stage pathway computed from
recorded practice. Role-play characters react to what each reply does — detected by fixed phrase rules, shown with each reply —
not to its full meaning. Role-play evidence feeds the Improvement Workshop.
Version 4.2.0 — the Puzzle Arena (Think): 27 puzzles in nine categories with ten mechanics — typed answers, choices
with evidence boards, visual matrices, rotation versus mirror, a logic grid, a counters game against MINDWORK, the
Towers of Hanoi, water jugs, budget allocation, spot-the-difference and a three-lock escape. Graduated hints, reveal by
choice, challenge mode, a reasoning check separating sound answers from guesses, and puzzle evidence for Improve.
Version 4.1.0 — Thinking Abilities, Abilities Overview and search added to the seven-destination organisation.
Version 4.0.0 — reorganised into seven destinations (approved information architecture, 21 November 2026):
Today, Think, Learn, Communicate, Grow, Improve, Progress. Every earlier address (#games, #study, #journal …) still
opens the same page. On phones the bottom bar holds Today, Think, Learn, Communicate and Menu; Menu lists all seven
destinations with their environments as direct links.

**Improve** contains the Improvement Workshop: up to three targets drawn from your recorded evidence (Thinking Patterns
today; Study Lab gaps listed with links), targeted practice, reassessment in exercises not used for practice, and a
lifecycle from identified to mastered. Other environments will feed it as they are built.

**Thinking Abilities** (Think): the 12 abilities, the activities that train each one (an activity opens in its home
environment), and practice sessions per ability. Strategic thinking has no built activity yet and says so.
**Abilities Overview** (Progress): each ability's evidence stage — exposure, independent application, unfamiliar
situations, consistent across contexts — by fixed rules from recorded work; guided practice is recorded too.
**Search** (top bar, the / key, and Menu on phones): environments, games, exercises, abilities, books, chapters, maps,
connections and Settings topics. Journal entries are found but shown only as "Thinking Journal entry".

**Data safety.** Before the first launch of a new version, MINDWORK keeps a full copy of your data
(Settings → "Your data from before the last update" → download or restore). The stored data format is unchanged from
version 3, so the previous release (`mindwork-v3-previous.zip`) 4.0–4.4 (`mindwork-v4.0-previous.zip` … `mindwork-v4.4-previous.zip`) can be reinstalled at the same address and reads the
same data, including anything written in version 4.

A personal cognitive training playground. Offline-first, installable, private: no account, no server, no AI service.

## Install it

**On this computer:** run `python3 serve.py` in this folder, open http://localhost:8080, then install it
(Chrome/Edge: install icon in the address bar; macOS Safari 17+: File → Add to Dock). After the first load it works offline.

**On phones and tablets:** browsers only install web apps from a secure (https) address. `serve.py` prints a Wi-Fi
address that phones can open, but over plain http they can't install it or keep it offline. To install on phones:

1. Put the contents of the `app` folder on any free static https host, for example:
   - Netlify Drop (app.netlify.com/drop): drag the `app` folder onto the page.
   - GitHub Pages: push the `app` folder's files to a repository and turn on Pages.
   Your data never goes there. The host only serves the app's files; everything you do stays on each device.
2. Open that https address on the phone.
   - Android (Chrome, Edge, Samsung Internet): menu → Install app / Add to Home screen.
   - iPhone/iPad: open in Safari → Share → Add to Home Screen.
3. Open it once while online. From then on it starts without a connection.

Each device keeps its own data. Move it with a full backup: Settings → Export full backup on one device, Import on the other.

## Study Lab

Open **Study Lab** in the menu and choose *Add a book*, or drop files onto that panel. PDF, EPUB, DOCX and TXT/Markdown
are read on the device; nothing is uploaded. The PDF, Word and EPUB readers are bundled inside the app and only start
when you add a book of that type, so uploading works offline too.

- Chapters come from the PDF's bookmarks when it has them, otherwise from heading sizes; from the EPUB's table of
  contents; from Word heading styles; from `#` headings or "Chapter …" lines in text files. PDF page numbers are kept;
  running headers and page numbers are removed.
- Scanned PDFs (no text layer) are refused with an explanation: OCR isn't built in. Password-protected PDFs and
  DRM-protected EPUBs are refused; MINDWORK doesn't bypass protection. `.doc`, Kindle and MOBI files aren't supported.
- Questions are generated only where a sentence pattern supports them: definitions ("X is defined as / refers to /
  means …", "… is called X"), lists ("three conditions: a, b and c"), stated reasons ("… because …"), sequences
  ("First … Second … Finally …") and contrasts between two of the book's terms. Each question stores the book,
  chapter, section, page and the exact sentence it came from, and links back to that paragraph. Application questions
  are labelled as extensions beyond the book: the situation is yours, the concept is the author's.
- Checking: names and terms are checked exactly (allowing small typos); multiple choice, matching, ordering and lists
  are checked deterministically; longer answers are checked only for the source's key words and you then judge your own
  recall against the source, which is what schedules the question. The app says which method was used each time.
- Scheduling is an SM-2 variant with confidence (see `src/study.js`). Unsure answers return sooner; wrong answers the
  same day; confident wrong answers are treated as misconceptions and lose more ease.
- **Work with the ideas** (on each book's page, for the ticked chapters or the whole book):
  - *Concept map*: starts with the book's key concepts; drag them (or move with arrow keys), add your own, label
    links, group them. *Compare with the book* reports, for each link, whether a sentence naming both concepts states it,
    whether the book's wording suggests a different relationship, or whether it isn't stated (yours to justify, not
    wrong) — and which relationships the book states that your map leaves out, each with a citation.
  - *Explain relationships*, *Compare and contrast*, *Ask why* and *Cumulative challenge*: closed-book first, then the
    book's own sentences with citations, then your self-check. Anything beyond the book is marked as such.
  - *Transfer*: applies a book concept to a situation taken from MINDWORK's own scenario bank, so it can't be one of
    the book's examples. Counts as application for mastery.
  - *Think with this chapter*: builds playground exercises from the book (challenge one of the author's claims,
    distinguish two of its concepts, expand a definition, explain a concept in conversation), each citing its source.
- **Knowledge Connections** (Study Lab, once you have two books): pick a concept from each book, say what kind of
  connection it is and explain it, *then* see both books' sentences with citations. Suggested pairs are based only on
  shared wording; agreement is never assumed, and "contradictory — the authors disagree" is a first-class answer.
- Practice tests also include select-all-that-apply questions built from the book's own lists.
- A chapter is called *mastered* only when most of its questions have survived spaced reviews for three weeks or more
  and at least one of its concepts has been applied. Finishing a session never marks mastery.

## Data and backups

- Everything is in the browser's IndexedDB on each device (only display preferences are mirrored to localStorage).
- Settings shows storage use and can ask the browser to keep data from being cleared automatically.
- Full backup: everything, including every version of every answer, feedback as shown, reflections and journal.
- Progress backup: levels, scores and history without written answers or journal.
- Importing shows a preview first. Merge adds only new records and skips duplicates. Replace asks for confirmation,
  keeps a safety copy, and restores your previous data if the import fails part-way. Older (format 1) backups import too.
- Upgrading from the first release migrates records in place. Original fields are never altered, and an untouched
  copy of the old records is kept in storage (`pre-migration-v1`).
- Updates: a new version is downloaded in the background and only applied when you tap "Update now".

## Native packaging

- **Android APK:** not produced. Capacitor can wrap this app, but building an APK needs the Android SDK, which
  couldn't be downloaded in the environment where this was built. On a machine with Android Studio:
  `npm i @capacitor/core @capacitor/cli @capacitor/android`, `npx cap init MINDWORK com.example.mindwork --web-dir app`,
  `npx cap add android`, `npx cap open android`, then Build → Generate Signed APK.
  The installed PWA gives the same offline experience without this step.
- **iOS:** there is no way to sideload an unsigned app. A native build needs a Mac with Xcode and an Apple Developer
  account (TestFlight or App Store). The Safari Add to Home Screen install is the practical route.

## Structure

`node build.js` inlines sources, CSS and two open-licence fonts (Bricolage Grotesque, Newsreader — SIL OFL) into
`app/index.html`, plus the manifest, service worker and icons.

- `src/games.js`, `src/bank1.js`, `src/bank2.js` — skills, 33 games, 178 exercises
- `src/engine.js` — stages, rule-based evaluation, adaptive levels, selection, sessions
- `src/reflect.js` — answer history (schema 2), migration, replay comparison, thinking patterns, journal model, backups
- `src/storage.js` — IndexedDB (stores: kv, attempts, sessions, journal) with memory fallback
- `src/ui-core.js`, `src/ui-player.js`, `src/ui-reflect.js`, `src/styles.css` — interface
- `src/sw.js` — cache-first service worker with consent-based updates

## Tests

- `python3 test/nav_e2e.py` — 99 navigation checks: seven destinations on desktop and at 390/360 px phones by clicking
  and tapping, step counts, the Menu sheet, every old address, journal privacy, keyboard and labels, the Improvement
  Workshop flow, offline destination pages
- `python3 test/rollback.py <previous app folder>` — previous release → this release → back → forward, on one browser
  profile: data identical at every step, pre-update copy kept and restorable
- `python3 test/express_e2e.py` — 23 checks of Speak with intention (stand-in model for AI parts)
- `python3 test/v49_e2e.py` — 29 checks of the 4.9 features (stand-in model for AI parts)
- `python3 test/mentor_e2e.py` — 24 checks of the mentor, competencies, group conversations and flexibility practice (stand-in model)
- `python3 test/extra_e2e.py` — 25 checks of the 4.7 features (stand-in model for AI parts)
- `python3 test/xh_e2e.py` — 19 checks of the isiXhosa version: translation applied, English-only notices, judging unaffected, AI in isiXhosa, user text untouched, switching back, 360 px
- `python3 test/more_e2e.py` — 50 checks for Grow, progression, voice (fake microphone), Observation and Memory (controlled clock), the Bilingual Lab, isiXhosa navigation and AI links (stand-in model)
- `python3 test/ai_e2e.py` — 32 checks of the AI features with a STAND-IN model (what is sent, privacy, consent, clarification flow, feedback honesty, errors, offline, phones, backup). It cannot test a real model's judgement.
- `python3 test/comm_e2e.py` — 38 checks: recognition, coached and independent role-play, escalation, drafting, speaking, private notes, the Improve flow, the pathway in Progress, touch phones, offline, backup
- `python3 test/arena_e2e.py` — 39 checks playing every puzzle mechanic, hints, reveal, reasoning checks, the Improve flow, touch phones, offline, backup
- `python3 test/discover_e2e.py` — 33 checks for Thinking Abilities, Abilities Overview, search, library filters (desktop, phones, offline)
- `npm install && npm test` — unit tests (exercise engine, reflection, Study Lab, deeper study activities)
- `python3 test/deep_e2e.py` — concept maps (drag, keyboard, compare, persistence), the five activities, think-with,
  select-all, Knowledge Connections, backup/restore of maps and connections, mobile
- `python3 test/study_e2e.py` — uploads PDF, EPUB, DOCX and TXT test books (in `test/books`, original text) and checks
  extraction against the source, refusal of a scanned PDF and a DRM EPUB, a full chapter-study workflow, notes,
  bookmarks and highlights after reload, reviews, practice tests, backup/restore with books, offline upload, mobile
- `python3 test/e2e.py` — plays every exercise through the UI, then tests replay, journal, patterns, backups,
  offline loading, external requests and mobile layout (needs Playwright)
- `python3 test/upgrade.py <path-to-previous-app-folder>` — upgrades real data from the previous release, then tests the update prompt

## Honest limits

- Feedback is rule-based. It detects structure (distinct vs reworded ideas, causal links, qualifiers, specificity,
  uptake in conversation), not meaning. Replay's comparison labels say which judgements are reliable and which are only suggestive.
- Exercises completed before this release have no stored feedback text or hint timing. Replay says so and re-runs the
  current rules on them, labelled as such.
- Study Lab question generation depends on how explicitly a book states definitions, lists and reasons. Books that
  argue in narrative prose yield fewer questions; closed-book recall and application work for every chapter regardless.
- Very long or image-heavy PDFs can take a while to process on phones. Images, tables and footnotes aren't extracted.
- Relationship detection only sees relationships stated in one sentence that names both concepts; relationships an
  author builds over several paragraphs aren't detected, so "not stated" means "not stated in one sentence".
- Not yet built: Knowledge in Action, Transfer
  Challenges, the multimodal challenge engine, Personal Development, gamification, isiXhosa, the Bilingual Expression
  Lab, voice interaction, the Improvement Workshop and the Puzzle Arena.
