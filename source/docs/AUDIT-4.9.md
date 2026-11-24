# MINDWORK 4.9 — specification audit (non-isiXhosa)

Status key: DONE (built and tested), PARTIAL, STAND-IN (AI behaviour tested only with a scripted stand-in model), NOT BUILT.

| Area | Requirement | Status |
|---|---|---|
| Think | Multimodal formats: Describe What You See, Visual Memory, Categorisation, Odd One Out, Sequence Reconstruction, auditory memory | DONE (≤4.8) |
| Think | Evidence and deduction boards, Ambiguous Messages, Image to Explanation, two conflicting arguments by listening, Reconstruct the Conversation, Communication Under Constraints, Find the Inconsistency in a scene | DONE (4.9), exact keys; writing parts are wording checks, labelled |
| Think | Explanation to diagram / drawing challenges | DONE (4.9); AI feedback reads her description only, never the image |
| Think | What Is Missing? (visual) | DONE (4.9.1), in Observation and Memory |
| Learn | Knowledge in Action, Memory Trial, study sequence across Learn → Think → Communicate | DONE (study sequence 4.9; its step 4 is STAND-IN) |
| Communicate | Networking, interviewing, crisis, intercultural role-plays; storytelling; longer conversation analysis; annotated replay | DONE (4.9) ; storytelling feedback STAND-IN |
| Communicate | Possibility recognition assessed independently | DONE (4.9) via AI classification (STAND-IN); offline self-ticks labelled as self-assessment, not evidence |
| Evidence | Puzzles, Observation, formats, KIA, approaches, analyses, drawings, Grow (exposure only) feed competencies; competencies feed abilities and character; Observation feeds the Workshop; XP covers newer activities | DONE (4.9) |
| Evidence | Grow content assessed | Deliberately NOT: private and non-evaluative |
| Evidence | Study Lab gaps as competency difficulties | NOT BUILT: gaps stay in the Workshop's Study Lab list (knowledge, not competency) |
| Mentor | Teaching, plan with reasons, cycle, privacy controls, Workshop practice/reassessment | DONE (4.8); teaching quality STAND-IN |
| Progression | XP, levels, records, missions, weekly journey, achievements, skill tree, bosses (incl. Memory Trial, Communicator), bosses recommended in the plan | DONE |
| Voice | Dictation, read-aloud, recording, voice conversation mode | DONE in Chromium with fake devices; real devices NOT VERIFIED |
| Browsers | Firefox and Safari (WebKit) | NOT VERIFIED: engines could not be installed in the build environment |
| AI | Real-model behaviour across all AI features | NOT VERIFIED: no model reachable from the build environment |
| Language | Full isiXhosa | DEFERRED by request |

## 5.0 additions
| Area | Requirement | Status |
|---|---|---|
| Expression | Nine competencies: 6 new (readiness, organising while speaking, self-monitoring, pausing, recovery, intentional contribution), 3 mapped to existing (clarity, spontaneous, generativity) | DONE |
| Expression | Ten practice situations, written and spoken, incl. interruption/recovery and chosen pauses | DONE; spoken path relies on dictation (real speech NOT VERIFIED) |
| Expression | Transcript review (repetition, padding, unfinished sentences, detours, relevance) | DONE, rules-based, flags only, no score |
| Expression | Mentor/AI diagnosis of 8 underlying difficulties, observation vs hypothesis, questions when unsure, demonstration | DONE in prompts and guards; STAND-IN tested |
| Expression | Audio-only features (tone, pace, pause lengths in speech) | NOT ASSESSED by design: transcript only, stated in the app |
