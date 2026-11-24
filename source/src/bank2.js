/* MINDWORK exercise bank — part 2 (perspective, organisation, precision, conversation, integrated, deep). */
(function (root) {
  const B = [];
  const add = (game, arr) => arr.forEach((it, i) => B.push(Object.assign({ id: game + '-' + (i + 1), game }, it)));

  // ── Switch Perspectives
  add('perspectives', [
    { lvl: 1, s: 'At a family dinner, one sibling announces they’re moving abroad for a job. The parents go quiet. Another sibling says “Congratulations!” loudly.',
      people: ['The sibling moving abroad', 'The parents', 'The sibling who said congratulations'] },
    { lvl: 2, s: 'A manager redistributes work so the most experienced team member gets the hardest project. That team member seems unhappy; a junior colleague feels overlooked.',
      people: ['The manager', 'The experienced team member', 'The junior colleague'] },
    { lvl: 3, s: 'A landlord raises rent by 12% on a long-term tenant who has always paid on time. The tenant’s neighbour, who moved in last year, pays more already.',
      people: ['The landlord', 'The long-term tenant', 'The newer neighbour'] },
    { lvl: 4, s: 'A town votes on whether to allow a large warehouse on farmland at its edge. It would bring 300 jobs and heavy traffic.',
      people: ['A young resident looking for work', 'A farmer whose land borders the site', 'A shop owner on the high street', 'A council planner'] },
    { lvl: 5, s: 'A self-driving car company releases accident data showing its cars crash less often than human drivers, but in different, unfamiliar ways.',
      people: ['A regulator', 'A pedestrian advocacy group', 'An engineer at the company', 'A professional driver'] }
  ]);

  // ── Same Situation, Different Meaning
  add('meaning', [
    { lvl: 1, s: 'Someone doesn’t say anything for a long time after you share an idea.', contexts: ['In a job interview', 'On a first date', 'With a close friend of twenty years'] },
    { lvl: 2, s: 'A colleague replies to a long email with “OK.”', contexts: ['From your manager, after you asked for leave', 'From a peer who is known to be terse', 'From a client after you sent a price increase'] },
    { lvl: 3, s: 'A company gives every employee the same bonus regardless of performance.', contexts: ['After a difficult year with layoffs', 'At a startup about to be sold', 'In a team where one person did most of the work'] },
    { lvl: 4, s: 'A country’s population is shrinking.', contexts: ['A country with high unemployment', 'A country with a large elderly population and pensions to fund', 'A country with severe housing shortages'] },
    { lvl: 5, s: 'A scientist publicly retracts her own well-known paper.', contexts: ['After another lab failed to replicate it', 'Two weeks before applying for a major grant', 'In a field where retractions are almost unheard of'] }
  ]);

  // ── Reverse the Assumption
  add('reverse', [
    { lvl: 1, s: 'Someone who asks a lot of questions in class doesn’t understand the material.',
      angles: [{ l: 'Questions show deeper understanding', k: ['understand more', 'deeper', 'curious', 'interest', 'advanced'] }, { l: 'Questions for others’ benefit', k: ['others', 'class', 'help', 'clarif'] }, { l: 'Testing the teacher', k: ['test', 'challeng', 'disagree', 'check'] }] },
    { lvl: 2, s: 'Being busy means being productive.',
      angles: [{ l: 'Busy as avoidance', k: ['avoid', 'procrastin', 'hide', 'important'] }, { l: 'Busy as poor prioritisation', k: ['priorit', 'say no', 'everything', 'organis'] }, { l: 'Unbusy as productive', k: ['think', 'rest', 'slack', 'reflect', 'idle'] }] },
    { lvl: 3, s: 'A product that sells out quickly is successful.',
      angles: [{ l: 'Underpriced or under-produced', k: ['price', 'underpric', 'stock', 'supply', 'demand'] }, { l: 'Lost sales and frustrated customers', k: ['frustrat', 'lost', 'angry', 'competitor', 'resell'] }, { l: 'Artificial scarcity', k: ['artific', 'hype', 'deliberate', 'limited', 'marketing'] }] },
    { lvl: 4, s: 'Admitting a mistake makes a leader look weak.',
      angles: [{ l: 'It signals confidence', k: ['confiden', 'secure', 'strong'] }, { l: 'It builds trust and candour', k: ['trust', 'honest', 'candid', 'safe', 'others admit'] }, { l: 'Context of the mistake matters', k: ['repeat', 'serious', 'often', 'crisis', 'frequen'] }] },
    { lvl: 5, s: 'More information leads to better decisions.',
      angles: [{ l: 'Overload and paralysis', k: ['overload', 'paralys', 'too much', 'overwhelm'] }, { l: 'False confidence', k: ['confiden', 'certain', 'illusion', 'feel'] }, { l: 'Noise drowns signal', k: ['noise', 'signal', 'irrelevant', 'distract'] }, { l: 'Delay costs', k: ['delay', 'time', 'late', 'opportun', 'wait'] }] }
  ]);

  // ── Both Can Be True
  add('both', [
    { lvl: 1, a: 'You should always be yourself.', b: 'You should adapt to the people around you.',
      angles: [{ l: 'Values vs style', k: ['value', 'style', 'core', 'surface', 'manner', 'tone'] }, { l: 'Different situations', k: ['situation', 'context', 'work', 'friend', 'when'] }] },
    { lvl: 2, s: '', a: 'Practice makes perfect.', b: 'Practising the wrong way makes you worse.',
      angles: [{ l: 'Quality of practice', k: ['feedback', 'right way', 'deliberate', 'correct', 'quality'] }, { l: 'What gets reinforced', k: ['habit', 'reinforc', 'automat', 'ingrain', 'mistake'] }] },
    { lvl: 3, a: 'Technology connects people.', b: 'Technology isolates people.',
      angles: [{ l: 'Distance vs proximity', k: ['far', 'distance', 'near', 'room', 'present', 'abroad'] }, { l: 'Different users', k: ['some people', 'isolated', 'lonely', 'others', 'depend'] }, { l: 'Breadth vs depth', k: ['many', 'shallow', 'deep', 'breadth', 'quality'] }] },
    { lvl: 4, a: 'Competition brings out the best in people.', b: 'Competition brings out the worst in people.',
      angles: [{ l: 'Stakes and structure', k: ['stake', 'rule', 'fair', 'structure', 'zero-sum', 'win'] }, { l: 'Different people respond differently', k: ['some people', 'personality', 'confiden', 'motivat'] }, { l: 'Effort vs behaviour', k: ['effort', 'cheat', 'sabotag', 'ethic', 'perform'] }] },
    { lvl: 5, a: 'People are mostly rational.', b: 'People are deeply irrational.',
      angles: [{ l: 'Rational relative to goals and information', k: ['goal', 'information', 'given what', 'constraint', 'local'] }, { l: 'Different time scales or domains', k: ['domain', 'everyday', 'long term', 'familiar', 'probabil'] }, { l: 'Definition of rational', k: ['defin', 'mean by', 'sense', 'model', 'economist'] }] },
    { lvl: 3, a: 'Children need freedom to learn.', b: 'Children need structure to learn.',
      angles: [{ l: 'Structure enables freedom', k: ['within', 'boundar', 'safe', 'frame', 'enable'] }, { l: 'Different stages or subjects', k: ['age', 'stage', 'subject', 'skill', 'young'] }] }
  ]);

  // ── Organise the Chaos
  add('chaos', [
    { lvl: 2, topic: 'Why people struggle to keep new year’s resolutions', groups: 3, groupHints: ['Causes', 'Consequences', 'What helps'], central: 6,
      statements: [
        { t: 'Goals like “get fit” don’t say what to do on Monday.', g: 0 },
        { t: 'Old routines are triggered by the same cues as before.', g: 0 },
        { t: 'People quietly drop the goal by February.', g: 1 },
        { t: 'Each failed attempt makes the next one feel less credible.', g: 1 },
        { t: 'Tying the new habit to an existing routine makes it easier.', g: 2 },
        { t: 'Small, specific first steps survive bad weeks.', g: 2 },
        { t: 'Resolutions fail less from weak willpower than from vague plans meeting old habits.', g: 0 }
      ] },
    { lvl: 3, topic: 'A town’s high street is emptying', groups: 3, groupHints: ['Pressures', 'Effects on the town', 'Responses'], central: 0,
      statements: [
        { t: 'The high street is caught between online shopping and rising rents.', g: 0 },
        { t: 'Online shops have lower costs per sale.', g: 0 },
        { t: 'Landlords keep rents high hoping for chain tenants.', g: 0 },
        { t: 'Empty units make the street feel unsafe, so fewer people visit.', g: 1 },
        { t: 'Local jobs move to warehouses outside town.', g: 1 },
        { t: 'Some towns let pop-up shops use empty units rent-free.', g: 2 },
        { t: 'Converting units to housing brings people back into the centre.', g: 2 },
        { t: 'Visitor numbers fall, which hurts the remaining shops.', g: 1 }
      ] },
    { lvl: 4, topic: 'Burnout in a team', groups: 3, groupHints: ['Workload and structure', 'Signals', 'Interventions'], central: 7,
      statements: [
        { t: 'Urgent requests arrive through four different channels.', g: 0 },
        { t: 'Nobody is sure which tasks can be dropped.', g: 0 },
        { t: 'Sick days have doubled over six months.', g: 1 },
        { t: 'Meetings have become quieter and more defensive.', g: 1 },
        { t: 'Two senior people resigned within a month.', g: 1 },
        { t: 'A single intake process would make workload visible.', g: 2 },
        { t: 'Explicitly ranking priorities lets people stop work without guilt.', g: 2 },
        { t: 'The team is burning out because its workload is invisible and unranked, not just large.', g: 0 }
      ] }
  ]);

  // ── Find the Main Point
  add('mainpoint', [
    { lvl: 2, parts: ['In 2019, one city removed parking from its main shopping street.', 'Shop owners predicted disaster.', 'Within a year, foot traffic rose by 20%, and most shops reported higher sales.', 'People on foot linger, return more often and notice more shops than people who park and leave.', 'Designing streets for cars can undermine the businesses those cars are meant to serve.'], main: 4,
      k: ['car', 'street', 'shop', 'business', 'walk', 'foot', 'parking'] },
    { lvl: 3, parts: ['Many people assume memory works like a recording.', 'In fact, each time we recall an event, we rebuild it from fragments.', 'Details from later conversations and photos get folded in.', 'This is why confident eyewitnesses are sometimes wrong.', 'Our sense of certainty about a memory tells us little about its accuracy.', 'Courts in several countries now treat eyewitness confidence with caution.'], main: 4,
      k: ['memory', 'confident', 'certain', 'accura', 'recall', 'rebuild', 'wrong'] },
    { lvl: 4, parts: ['Office plants are often sold as air purifiers.', 'The original studies tested plants in small sealed chambers.', 'An office exchanges its air with the outside far faster than plants can clean it.', 'You would need hundreds of plants per room to match normal ventilation.', 'Plants may still improve how people feel at work.', 'The case for office plants rests on wellbeing, not on cleaning the air.'], main: 5,
      k: ['plant', 'air', 'wellbeing', 'feel', 'purif', 'clean', 'ventilat'] }
  ]);

  // ── Build an Argument
  add('argue', [
    { lvl: 1, s: 'Everyone should learn to cook a few basic meals.' },
    { lvl: 2, s: 'Libraries are more important now than they were twenty years ago.' },
    { lvl: 3, s: 'Cities should make public transport free.' },
    { lvl: 4, s: 'Job interviews are a poor way to choose employees.' },
    { lvl: 5, s: 'It is sometimes right to break a promise.' }
  ]);

  // ── What's the Difference?
  add('diff', [
    { lvl: 1, a: 'Listening', b: 'Hearing', ka: ['attention', 'effort', 'focus', 'understand', 'active', 'choose', 'meaning'], kb: ['sound', 'passive', 'automatic', 'ears', 'without trying'] },
    { lvl: 1, a: 'Understanding', b: 'Memorising', ka: ['why', 'explain', 'apply', 'connect', 'reason', 'new situation'], kb: ['repeat', 'recall', 'store', 'word for word', 'facts'] },
    { lvl: 2, a: 'Confidence', b: 'Certainty', ka: ['feel', 'self', 'ability', 'act', 'trust', 'despite'], kb: ['know', 'evidence', 'doubt', 'sure', 'proof', 'outcome'] },
    { lvl: 2, a: 'Criticism', b: 'Disrespect', ka: ['work', 'idea', 'behaviour', 'improve', 'specific'], kb: ['person', 'worth', 'dismiss', 'contempt', 'value'] },
    { lvl: 2, a: 'Fear', b: 'Doubt', ka: ['danger', 'threat', 'emotion', 'body', 'harm'], kb: ['belief', 'uncertain', 'question', 'unsure', 'thought'] },
    { lvl: 3, a: 'Being independent', b: 'Being isolated', ka: ['choose', 'self', 'rely', 'capable', 'decide'], kb: ['cut off', 'alone', 'lack', 'connection', 'without choice'] },
    { lvl: 3, a: 'Persuading', b: 'Manipulating', ka: ['reason', 'open', 'evidence', 'transparent', 'free'], kb: ['hidden', 'exploit', 'deceiv', 'pressure', 'without knowing'] },
    { lvl: 4, a: 'Explaining', b: 'Excusing', ka: ['cause', 'understand', 'why'], kb: ['responsib', 'blame', 'justify', 'acceptable', 'off the hook'] },
    { lvl: 4, a: 'Compromise', b: 'Consensus', ka: ['give up', 'trade', 'middle', 'concession', 'part'], kb: ['agree', 'everyone', 'support', 'shared', 'accept'] },
    { lvl: 5, a: 'Risk', b: 'Uncertainty', ka: ['probabil', 'known', 'calculate', 'odds', 'measur'], kb: ['unknown', 'cannot', 'estimat', 'no data', 'unmeasur'] },
    { lvl: 5, a: 'Tolerance', b: 'Acceptance', ka: ['put up', 'endure', 'allow', 'despite', 'disagree'], kb: ['embrace', 'approve', 'agree', 'welcome', 'endorse'] }
  ]);

  // ── Say Exactly What You Mean
  add('exact', [
    { lvl: 1, s: 'The presentation was kind of bad.', ctx: 'Telling a colleague what went wrong so they can fix it.', keep: ['presentation'] },
    { lvl: 1, s: 'I need you to be more involved.', ctx: 'Talking to a housemate about shared chores.', keep: [] },
    { lvl: 2, s: 'There were some issues with the delivery.', ctx: 'Reporting to a supplier.', keep: ['deliver'] },
    { lvl: 2, s: 'He’s just a difficult person to work with.', ctx: 'Explaining a problem to your manager.', keep: [] },
    { lvl: 3, s: 'Things have been weird between us lately.', ctx: 'Starting a conversation with a friend.', keep: [] },
    { lvl: 3, s: 'The new system is a lot better in a lot of ways.', ctx: 'Writing a one-line summary for a report.', keep: ['system'] },
    { lvl: 4, s: 'We should probably do something about engagement at some point.', ctx: 'Proposing an action at a team meeting.', keep: ['engage'] },
    { lvl: 5, s: 'The policy is basically unfair to certain people.', ctx: 'Writing to a local representative.', keep: ['policy', 'unfair'] }
  ]);

  // ── Explain It Simply
  add('simple', [
    { lvl: 1, concept: 'Inflation', audience: 'A ten-year-old who gets pocket money', jargon: ['purchasing power', 'monetary', 'cpi', 'index', 'aggregate'], keep: ['price', 'money', 'buy', 'cost'] },
    { lvl: 2, concept: 'Compound interest', audience: 'A friend who has never saved money', jargon: ['principal', 'apr', 'exponential', 'accrue', 'yield'], keep: ['interest', 'grow', 'year', 'add'] },
    { lvl: 2, concept: 'How vaccines work', audience: 'An elderly neighbour worried about getting one', jargon: ['antigen', 'antibod', 'lymphocyte', 'immunogenic', 'mrna'], keep: ['body', 'fight', 'learn', 'recogn', 'protect'] },
    { lvl: 3, concept: 'Opportunity cost', audience: 'A teenager deciding whether to take a summer job', jargon: ['marginal', 'utility', 'trade-off curve', 'allocation'], keep: ['give up', 'instead', 'choose', 'cost'] },
    { lvl: 4, concept: 'Why correlation isn’t causation', audience: 'A relative who shares health headlines', jargon: ['confound', 'variable', 'spurious', 'statistical'], keep: ['together', 'cause', 'because', 'other'] },
    { lvl: 5, concept: 'How a search engine decides what to show you', audience: 'Someone who thinks results are in order of “truth”', jargon: ['algorithm', 'index', 'crawl', 'ranking signal', 'seo', 'relevance score'], keep: ['link', 'popular', 'match', 'order', 'rank'] }
  ]);

  // ── The Missing Nuance
  add('nuance', [
    { lvl: 1, s: 'Exercise makes you happier.', keep: ['exercise', 'happ', 'mood'] },
    { lvl: 2, s: 'People who interrupt are rude and don’t listen.', keep: ['interrupt'] },
    { lvl: 2, s: 'Working longer hours means getting more done.', keep: ['hour', 'work'] },
    { lvl: 3, s: 'Introverts don’t like social events.', keep: ['introvert', 'social'] },
    { lvl: 4, s: 'Online reviews are useless because they’re all fake.', keep: ['review'] },
    { lvl: 5, s: 'Raising the minimum wage destroys jobs.', keep: ['minimum wage', 'job'] }
  ]);

  // ── Word Selection
  add('words', [
    { lvl: 1, s: 'You want to tell a friend you weren’t able to come to their party, without sounding like you didn’t care.', options: ['I couldn’t make it.', 'I didn’t come.', 'I wasn’t bothered.', 'I skipped it.'], best: [0], k: ['able', 'want', 'circumstance', 'choice', 'care', 'imply', 'intent'], why: '“Couldn’t make it” signals circumstance rather than choice; “skipped” and “didn’t come” imply a decision.' },
    { lvl: 2, s: 'Giving feedback to a colleague whose report had errors, you want to be clear but not harsh.', options: ['The report is wrong.', 'I found a few figures that don’t match the source data.', 'This needs a lot of work.', 'Some things could maybe be looked at.'], best: [1], k: ['specific', 'figure', 'clear', 'vague', 'harsh', 'actionable', 'which'], why: 'It names exactly what is wrong (actionable) without judging the whole report.' },
    { lvl: 3, s: 'You disagree with a proposal but think part of it has merit.', options: ['I disagree.', 'I see where you’re coming from, but…', 'I agree with the goal, but I don’t think this approach gets us there because…', 'That won’t work.'], best: [2], k: ['goal', 'part', 'specific', 'reason', 'separate', 'because', 'agree'], why: 'It separates the goal from the method, and commits to a reason.' },
    { lvl: 4, s: 'Describing someone who changes their mind easily when given good reasons.', options: ['Indecisive', 'Open-minded', 'Persuadable', 'Responsive to evidence'], best: [3], ok: [1], k: ['evidence', 'reason', 'weak', 'negative', 'connot', 'indecisive', 'positive'], why: '“Responsive to evidence” names the reason for change; “indecisive” and “persuadable” imply weakness; “open-minded” is close but vaguer.' },
    { lvl: 5, s: 'Reporting a finding that seems true but rests on one small study.', options: ['Research proves that…', 'Research suggests that…', 'One small study found that…', 'It’s been shown that…'], best: [2], ok: [1], k: ['one', 'small', 'study', 'prove', 'overstat', 'certain', 'evidence'], why: '“One small study found” states the strength of evidence; “suggests” is acceptable but hides how thin it is; “proves” overstates.' }
  ]);

  // ── Keep the Conversation Moving
  add('keepgoing', [
    { lvl: 1, lines: ['I’ve been so busy with work lately.'], next: 'Yeah, it’s been one thing after another. I keep meaning to take a proper break.', topic: ['busy', 'work', 'break', 'time'] },
    { lvl: 1, lines: ['We finally got a dog last month!'], next: 'She’s a rescue — very sweet but scared of literally everything.', topic: ['dog', 'pet', 'rescue', 'month'] },
    { lvl: 2, lines: ['I’ve started running in the mornings. Mostly I hate it.'], next: 'It’s the first ten minutes. After that it’s… fine? I keep doing it, so something’s working.', topic: ['run', 'morning', 'hate', 'exercise'] },
    { lvl: 2, lines: ['Did you see they’re closing the old cinema?'], next: 'Apparently it’s becoming flats. I went there every Friday as a teenager.', topic: ['cinema', 'close', 'flat', 'old', 'film'] },
    { lvl: 3, lines: ['I just finished a book about the history of salt. Weirdly gripping.'], next: 'There was a whole chapter on how cities grew up around salt roads. Changed how I look at maps.', topic: ['book', 'salt', 'history', 'read'] },
    { lvl: 4, lines: ['Honestly, I’m thinking about leaving my job, but I don’t know what I’d do instead.'], next: 'Everyone says “follow your passion” but I don’t think I have one.', topic: ['job', 'leav', 'quit', 'work', 'instead', 'career'] },
    { lvl: 5, lines: ['My grandmother just moved into a care home. It’s the right decision but it feels strange.'], next: 'She seems fine, actually. I think I’m the one who’s not used to it.', topic: ['grandmother', 'care', 'home', 'strange', 'move', 'decision'] }
  ]);

  // ── Don't Repeat Yourself
  add('norepeat', [
    { lvl: 1, topic: ['train', 'commut', 'transport'], loop: ['late', 'delay', 'always', 'train'],
      script: [{ who: 'them', t: 'How was the trip in?' }, { who: 'you', t: 'Train was late again.' }, { who: 'them', t: 'Ugh, that line.' }, { who: 'you', t: 'Yeah, it’s always late.' }, { who: 'them', t: 'Mm.' }] },
    { lvl: 2, topic: ['weather', 'rain', 'season'], loop: ['rain', 'raining', 'wet', 'non-stop'],
      script: [{ who: 'them', t: 'Some weather this week, huh?' }, { who: 'you', t: 'It hasn’t stopped raining.' }, { who: 'them', t: 'I know, I’m soaked every day.' }, { who: 'you', t: 'Yeah, so much rain.' }, { who: 'them', t: 'Ha, yeah.' }] },
    { lvl: 3, topic: ['film', 'movie', 'watch', 'cinema'], loop: ['good', 'great', 'liked', 'enjoyed'],
      script: [{ who: 'them', t: 'Did you end up seeing that film?' }, { who: 'you', t: 'Yes, it was really good.' }, { who: 'them', t: 'Oh nice. I heard mixed things.' }, { who: 'you', t: 'No, I really liked it, it was good.' }, { who: 'them', t: 'Cool, cool.' }] },
    { lvl: 4, topic: ['work', 'project', 'deadline', 'team'], loop: ['stress', 'busy', 'deadline', 'pressure'],
      script: [{ who: 'them', t: 'How’s the big project going?' }, { who: 'you', t: 'Stressful. Deadline’s Friday.' }, { who: 'them', t: 'Sounds intense.' }, { who: 'you', t: 'Yeah, it’s a lot of pressure with the deadline.' }, { who: 'them', t: 'I bet.' }] }
  ]);

  // ── Respond Beyond the Question
  add('beyondq', [
    { lvl: 1, q: 'How was your weekend?', topic: ['weekend'] },
    { lvl: 1, q: 'Have you been busy?', topic: ['busy'] },
    { lvl: 2, q: 'What do you do for work?', topic: ['work', 'job'] },
    { lvl: 2, q: 'Have you been here before?', topic: ['here', 'before', 'place'] },
    { lvl: 3, q: 'Read anything good lately?', topic: ['read', 'book', 'article'] },
    { lvl: 4, q: 'So how do you know the host?', topic: ['know', 'host', 'met'] }
  ]);

  // ── Read Between the Lines
  add('between', [
    { lvl: 1, s: '“It’s fine, do whatever you want.”', ctx: 'Your partner, after you suggest changing weekend plans.',
      angles: [{ l: 'Not fine — frustration', k: ['annoy', 'upset', 'frustrat', 'not fine', 'angry', 'hurt'] }, { l: 'Genuinely indifferent', k: ['genuin', 'actually fine', 'don’t mind', "don't mind", 'indiffer'] }, { l: 'Wants to be asked', k: ['asked', 'consult', 'included', 'input', 'opinion'] }, { l: 'Tired of deciding', k: ['tired', 'decid', 'energy', 'exhaust'] }] },
    { lvl: 2, s: '“Must be nice to have so much free time.”', ctx: 'A colleague, after you mention a weekend hobby.',
      angles: [{ l: 'Resentment about workload', k: ['resent', 'workload', 'overwork', 'unfair', 'jealous', 'envy'] }, { l: 'Genuine wistfulness', k: ['wish', 'genuin', 'want', 'miss'] }, { l: 'Clumsy joke', k: ['joke', 'tease', 'banter', 'humour', 'humor'] }, { l: 'Their own situation', k: ['children', 'care', 'second job', 'stress', 'own'] }] },
    { lvl: 3, s: '“I’m not angry. I’m just surprised you didn’t tell me.”', ctx: 'A friend who found out secondhand that you’re moving.',
      angles: [{ l: 'Hurt at being left out', k: ['hurt', 'left out', 'excluded', 'not important', 'close'] }, { l: 'Questioning the friendship', k: ['friendship', 'trust', 'how close', 'relationship'] }, { l: 'Genuinely just surprised', k: ['genuin', 'just surprised', 'literal', 'curious'] }, { l: 'Embarrassed to learn it from others', k: ['embarrass', 'others knew', 'secondhand', 'public'] }] },
    { lvl: 4, s: '“We should really get together sometime.”', ctx: 'An old acquaintance at the end of a chance meeting.',
      angles: [{ l: 'Polite closing ritual', k: ['polite', 'ritual', 'closing', 'goodbye', 'convention', 'not mean'] }, { l: 'Sincere but vague', k: ['sincere', 'mean it', 'genuine', 'busy'] }, { l: 'Wants you to make the move', k: ['you to', 'initiat', 'first move', 'suggest'] }] },
    { lvl: 5, s: '“Interesting idea. Let’s take it offline.”', ctx: 'A senior colleague, in a meeting with clients present, after you raise a concern.',
      angles: [{ l: 'Not in front of clients', k: ['client', 'audience', 'front of', 'public'] }, { l: 'Dismissal', k: ['dismiss', 'shut down', 'bury', 'ignore', 'not interest'] }, { l: 'Genuine interest needing time', k: ['genuin', 'time', 'detail', 'later', 'discuss properly'] }, { l: 'Political sensitivity', k: ['politic', 'sensitive', 'someone else', 'boss', 'stakeholder'] }] }
  ]);

  // ── Natural Follow-up
  add('followup', [
    { lvl: 1, script: ['I tried making bread for the first time. It came out like a brick, but the kitchen smelled amazing.'], details: ['brick', 'smell', 'first time', 'bread', 'kitchen'] },
    { lvl: 2, script: ['We moved flats last month. The move was fine — it’s the first week without a routine that threw me.'], details: ['routine', 'first week', 'threw', 'move'] },
    { lvl: 3, script: ['I volunteered to run the quiz at the pub. Turns out writing questions that are hard but not unfair is really difficult.'], details: ['hard but not unfair', 'unfair', 'question', 'difficult', 'writing'] },
    { lvl: 4, script: ['I went back to my old school for a reunion. The building was smaller than I remembered, but people were exactly the same.'], details: ['smaller', 'same', 'remember', 'people', 'building'] },
    { lvl: 5, script: ['I’ve started saying no to more things at work. Weirdly, people seem to respect it more — but I feel guilty every time.'], details: ['guilty', 'respect', 'no', 'weird'] }
  ]);

  // ── Conversation Branching scenarios
  // option tags: ack (acknowledge), add (contribute a thought), connect, angle (new angle), q (question only), closed (closes), over (overshares), self (redirects to self)
  const BR = (lvl, title, setting, nodes, final) => ({ lvl, title, setting, nodes, final });
  add('branch', [
    BR(1, 'Meeting someone new', 'At a friend’s birthday drinks. You end up next to someone you don’t know by the snacks.', {
      start: { say: 'These are dangerously good. Do you know if they’re homemade?', opts: [
        { t: 'No idea — but if they are, I’m impressed. I can’t make anything that holds its shape.', tag: 'add', next: 'a' },
        { t: 'I don’t know.', tag: 'closed', next: 'b' },
        { t: 'Are you a friend of Jess’s from work?', tag: 'q', next: 'c' }] },
      a: { say: 'Ha, same. I once made a cake that was technically soup. How do you know Jess?', opts: [
        { t: 'We were flatmates years ago. She was the only one who ever cleaned the oven.', tag: 'add', next: 'end_good' },
        { t: 'From uni. You?', tag: 'q', next: 'end_ok' },
        { t: 'Cake soup sounds like a new genre. Was it at least edible?', tag: 'angle', next: 'end_good' }] },
      b: { say: 'Oh, okay. …So, are you having a good night?', opts: [
        { t: 'Yeah, it’s nice. Mostly I came for the snacks, honestly.', tag: 'add', next: 'end_ok' },
        { t: 'Yeah.', tag: 'closed', next: 'end_flat' },
        { t: 'It’s good — I don’t know many people here, so this corner is my base camp.', tag: 'add', next: 'end_good' }] },
      c: { say: 'Yeah, we’re on the same team. Are you?', opts: [
        { t: 'No, we were flatmates. Is she the same at work as at home — very organised?', tag: 'connect', next: 'end_good' },
        { t: 'No.', tag: 'closed', next: 'end_flat' },
        { t: 'No. What team is it?', tag: 'q', next: 'end_ok' }] },
      end_good: { say: 'Okay, now I need to hear more about this. I’m Tom, by the way.', end: 'good' },
      end_ok: { say: 'Oh nice. Yeah, it’s a good crowd tonight.', end: 'ok' },
      end_flat: { say: 'Right. Well — I might grab a drink. Nice to meet you.', end: 'flat' }
    }, 'Tom has just introduced himself. Write what you’d say next, in your own words.'),
    BR(2, 'Talking to a colleague', 'In the kitchen at work. A colleague you don’t know well is waiting for the kettle.', {
      start: { say: 'Is it just me or is this week lasting about a month?', opts: [
        { t: 'Not just you. I think it’s because Monday felt like two Mondays.', tag: 'add', next: 'a' },
        { t: 'Yeah, long week.', tag: 'ack', next: 'b' },
        { t: 'What’s been making it long for you?', tag: 'q', next: 'c' }] },
      a: { say: 'Ha, exactly. We had the audit on Monday. You?', opts: [
        { t: 'Nothing that dramatic — just a lot of small fires. Audits sound worse, though. How did it go?', tag: 'connect', next: 'end_good' },
        { t: 'Busy.', tag: 'closed', next: 'end_flat' },
        { t: 'Mine’s been fine. I wonder if audits make the rest of the week feel longer because you’re braced the whole time.', tag: 'angle', next: 'end_good' }] },
      b: { say: 'Mm. At least it’s Thursday.', opts: [
        { t: 'True. Any plans for the weekend?', tag: 'q', next: 'end_ok' },
        { t: 'Thursday’s the best day — the weekend is close but nobody expects anything from you yet.', tag: 'add', next: 'end_good' },
        { t: 'Yep.', tag: 'closed', next: 'end_flat' }] },
      c: { say: 'Honestly? An audit. Endless spreadsheets.', opts: [
        { t: 'Oof. I had to help with one last year — the worst part was finding out how many files were named “final_v2”.', tag: 'connect', next: 'end_good' },
        { t: 'What kind of audit?', tag: 'q', next: 'end_ok' },
        { t: 'That sounds bad.', tag: 'ack', next: 'end_ok' }] },
      end_good: { say: 'Ha! Yes. That’s exactly it. I’m Maya, by the way — finance.', end: 'good' },
      end_ok: { say: 'Yeah. Anyway, kettle’s done — see you around.', end: 'ok' },
      end_flat: { say: 'Right. Well, see you.', end: 'flat' }
    }, 'Maya has introduced herself. Write what you’d say next.'),
    BR(3, 'Disagreeing respectfully', 'A friend is excited about something you have doubts about.', {
      start: { say: 'I’m going to put all my savings into this new crypto coin. My cousin made loads.', opts: [
        { t: 'That’s a big move. What makes you confident about this one in particular?', tag: 'q', next: 'a' },
        { t: 'That’s a terrible idea.', tag: 'closed', next: 'b' },
        { t: 'I can see the appeal — I’d just be nervous about “all”. Would you still be okay if it halved?', tag: 'add', next: 'c' }] },
      a: { say: 'My cousin says it’s going to go up loads. Plus everyone’s talking about it.', opts: [
        { t: 'Everyone talking about it is part of what worries me — usually by then the early gains have gone.', tag: 'add', next: 'end_good' },
        { t: 'Okay, sounds good then.', tag: 'closed', next: 'end_flat' },
        { t: 'Has your cousin ever lost money on one?', tag: 'q', next: 'end_ok' }] },
      b: { say: 'Wow, okay. Thanks for the support.', opts: [
        { t: 'Sorry, that came out harsh. I’m worried because it’s all your savings, not because of the coin.', tag: 'ack', next: 'end_ok' },
        { t: 'I’m just being honest.', tag: 'closed', next: 'end_flat' },
        { t: 'You’re right, that was blunt. Can I tell you what specifically bothers me?', tag: 'ack', next: 'end_good' }] },
      c: { say: 'Halved? I mean… that would be bad. But it won’t.', opts: [
        { t: 'Maybe it won’t. I guess I’d want a plan that works even if I’m wrong.', tag: 'add', next: 'end_good' },
        { t: 'You don’t know that.', tag: 'closed', next: 'end_flat' },
        { t: 'What if you put in an amount you could genuinely afford to lose and see how it goes?', tag: 'angle', next: 'end_good' }] },
      end_good: { say: '…Yeah, okay. Maybe not everything. What would you do?', end: 'good' },
      end_ok: { say: 'I hear you. I’ll think about it.', end: 'ok' },
      end_flat: { say: 'Let’s just talk about something else.', end: 'flat' }
    }, 'Your friend asks what you would do. Write your reply — honest, not preachy.'),
    BR(3, 'When someone shares a personal experience', 'A friend tells you something difficult over coffee.', {
      start: { say: 'I didn’t get the promotion. They gave it to someone who started after me.', opts: [
        { t: 'Ugh. That’s a hard one — especially the timing part.', tag: 'ack', next: 'a' },
        { t: 'Something similar happened to me last year, actually. I was so angry I almost quit.', tag: 'self', next: 'b' },
        { t: 'Did they say why?', tag: 'q', next: 'c' }] },
      a: { say: 'Yeah. It’s not even the money. It’s feeling like I misread how they saw me.', opts: [
        { t: 'That’s a different kind of sting — it’s about not knowing where you stand.', tag: 'add', next: 'end_good' },
        { t: 'You should ask for feedback.', tag: 'closed', next: 'end_ok' },
        { t: 'Did anything make you think they saw you differently before this?', tag: 'q', next: 'end_good' }] },
      b: { say: 'Oh. Right. …What did you do?', opts: [
        { t: 'Honestly, it doesn’t matter — I’m more interested in how you’re feeling about yours.', tag: 'ack', next: 'end_good' },
        { t: 'I went to my manager and demanded an explanation, and then…', tag: 'over', next: 'end_flat' },
        { t: 'I asked what they’d want to see next time. It helped a bit. But yours sounds different.', tag: 'connect', next: 'end_good' }] },
      c: { say: 'Something about “readiness”. Whatever that means.', opts: [
        { t: '“Readiness” is so vague it almost sounds like they hadn’t decided what it means either.', tag: 'add', next: 'end_good' },
        { t: 'Maybe you weren’t ready.', tag: 'closed', next: 'end_flat' },
        { t: 'Are you going to ask them to explain it?', tag: 'q', next: 'end_ok' }] },
      end_good: { say: 'Exactly. Thank you — it helps to say it out loud.', end: 'good' },
      end_ok: { say: 'Yeah, maybe. I don’t know.', end: 'ok' },
      end_flat: { say: 'Hm. Anyway. How’s your week been?', end: 'flat' }
    }, 'Your friend thanks you. Write something to say next that keeps the door open without pushing.'),
    BR(4, 'A group conversation', 'Dinner with four people. The talk has turned to holidays and you haven’t said anything for a while.', {
      start: { say: '(Ana) …and then the ferry got cancelled, so we spent two days on an island with one shop.', opts: [
        { t: 'Two days with one shop sounds either awful or exactly what a holiday should be.', tag: 'angle', next: 'a' },
        { t: '(Laugh and say nothing.)', tag: 'closed', next: 'b' },
        { t: 'That reminds me — I got stuck in an airport for a day once.', tag: 'connect', next: 'c' }] },
      a: { say: '(Ana) Honestly? By day two it was the best part. (Ben) No way, I’d have gone mad.', opts: [
        { t: 'Maybe it depends whether you chose to be stuck. Same island, different holiday.', tag: 'add', next: 'end_good' },
        { t: 'Ben, where would you have gone instead?', tag: 'q', next: 'end_ok' },
        { t: 'Yeah.', tag: 'closed', next: 'end_flat' }] },
      b: { say: '(Ben) Anyway, has anyone been to Lisbon?', opts: [
        { t: 'Briefly — the hills are no joke. Before that, though: Ana, did you actually like the island in the end?', tag: 'connect', next: 'end_good' },
        { t: 'No.', tag: 'closed', next: 'end_flat' },
        { t: 'Not yet, but it’s on my list. What’s it like?', tag: 'q', next: 'end_ok' }] },
      c: { say: '(Ana) Oh no. Which airport? (Ben) The worst airports are the small ones.', opts: [
        { t: 'Frankfurt — actually huge, which was the problem. Too much to do and nothing you want.', tag: 'add', next: 'end_good' },
        { t: 'Frankfurt.', tag: 'closed', next: 'end_ok' },
        { t: 'Do you think small ones are worse? I’d have said the big ones feel lonelier.', tag: 'angle', next: 'end_good' }] },
      end_good: { say: '(Ana) Ha — yes! That’s it exactly. (Ben) Okay, fair point.', end: 'good' },
      end_ok: { say: '(Ben) Mm, could be. (The conversation moves on.)', end: 'ok' },
      end_flat: { say: '(Ana turns back to Ben.)', end: 'flat' }
    }, 'The group is listening. Add one more contribution of your own to keep the thread going.'),
    BR(5, 'Discussing something interesting', 'An acquaintance brings up an idea at a gallery opening.', {
      start: { say: 'I read that people value things more when they’ve built them themselves. The “IKEA effect”.', opts: [
        { t: 'I believe it — though I wonder if it’s the effort or the feeling of control.', tag: 'angle', next: 'a' },
        { t: 'Interesting. Do you think it’s true?', tag: 'q', next: 'b' },
        { t: 'My bookshelf would disagree; I built it and I hate it.', tag: 'add', next: 'c' }] },
      a: { say: 'Hm. How would you even separate those two?', opts: [
        { t: 'Maybe compare building something from instructions with designing it yourself — same effort, different control.', tag: 'add', next: 'end_good' },
        { t: 'I don’t know.', tag: 'closed', next: 'end_flat' },
        { t: 'What do you think?', tag: 'q', next: 'end_ok' }] },
      b: { say: 'I think so. Look at how people talk about their own art versus other people’s.', opts: [
        { t: 'True — though artists can also be their own harshest critics. Maybe it raises attachment, not judgement.', tag: 'add', next: 'end_good' },
        { t: 'Yeah, makes sense.', tag: 'ack', next: 'end_ok' },
        { t: 'Do you make art?', tag: 'q', next: 'end_ok' }] },
      c: { say: 'Ha! But would you sell it?', opts: [
        { t: 'Never. So maybe that proves the point — I hate it and still won’t let it go.', tag: 'add', next: 'end_good' },
        { t: 'Probably not.', tag: 'closed', next: 'end_ok' },
        { t: 'Good question. Maybe the effect is about attachment rather than liking.', tag: 'angle', next: 'end_good' }] },
      end_good: { say: 'Oh, I like that distinction. Attachment versus liking. Go on.', end: 'good' },
      end_ok: { say: 'Yeah. Anyway, have you seen the room upstairs?', end: 'ok' },
      end_flat: { say: 'Right. I’m going to look at the next room.', end: 'flat' }
    }, 'They’ve asked you to go on. Develop the idea in your own words.')
  ]);

  // ── Integrated challenges
  add('integrated', [
    { lvl: 3, s: 'A small charity’s donations fell by a third this year. The director says it’s because of the cost-of-living crisis. A board member points out that the charity also changed its website and stopped sending printed newsletters in January. A volunteer mentions that two long-time donors told her they hadn’t heard from the charity in months.' },
    { lvl: 4, s: 'A school introduces a phone ban. Over the next term, reported bullying falls by 40%, but the school counsellor reports more students coming to her about online harassment happening after school. Parents are split: some praise calmer classrooms, others say their children can’t reach them in emergencies.' },
    { lvl: 5, s: 'A new manager joins a team that has missed three deadlines. Within a month, she replaces the weekly meeting with written updates. The next deadline is met. Two team members say they feel more productive; one says she feels cut off and is considering leaving. The previous manager, now in another department, says the deadlines were missed because of an understaffed partner team.' },
    { lvl: 4, s: 'A town installs speed cameras on a road with frequent accidents. Accidents on that road drop by half. Accidents on two parallel side streets rise. Residents of the side streets start a petition; the council cites the main road’s figures as proof the cameras work.' }
  ]);

  // ── Deep thinking prompts
  add('deep', [
    { lvl: 2, q: 'What makes a place feel like home?' },
    { lvl: 3, q: 'Is it possible to be too reasonable?' },
    { lvl: 3, q: 'Why do some explanations feel satisfying even when they’re wrong?' },
    { lvl: 4, q: 'What do we owe to people we will never meet?' },
    { lvl: 4, q: 'When is it better not to know something?' },
    { lvl: 5, q: 'What is the difference between changing your mind and being persuaded?' }
  ]);

  const api = { BANK2: B };
  if (typeof module !== 'undefined') module.exports = api; else root.MW_BANK2 = api;
})(this);
