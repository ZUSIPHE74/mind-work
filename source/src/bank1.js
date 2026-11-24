/* MINDWORK exercise bank — part 1 (idea development, connecting, critical thinking).
   Angle keywords are stem prefixes used to recognise which kinds of idea a response touches.
   They never define the "right" answer: ideas outside every angle are still credited. */
(function (root) {
  const B = [];
  const add = (game, arr) => arr.forEach((it, i) => B.push(Object.assign({ id: game + '-' + (i + 1), game }, it)));

  // ── Beyond the First Thought
  add('beyond', [
    { lvl: 1, s: 'People often resist change.',
      angles: [{ l: 'Loss of the familiar', k: ['loss', 'lose', 'familiar', 'comfort', 'habit', 'routine', 'known'] },
        { l: 'Cost and effort of adapting', k: ['effort', 'learn', 'energy', 'time', 'cost', 'hard', 'tired'] },
        { l: 'Distrust of who proposes it', k: ['trust', 'motive', 'manag', 'author', 'power', 'control', 'suspic'] },
        { l: 'Uncertainty about outcomes', k: ['uncertain', 'unknown', 'risk', 'fear', 'outcome', 'predict', 'worse'] },
        { l: 'Identity and competence', k: ['identit', 'compet', 'expert', 'skill', 'status', 'self', 'pride'] }],
      deepen: ['Is resisting change ever the more rational response? When?', 'What’s the difference between resisting a change and resisting how it was introduced?'] },
    { lvl: 1, s: 'Most people check their phone the moment they wake up.',
      angles: [{ l: 'Habit and cueing', k: ['habit', 'automat', 'routine', 'reflex', 'cue'] },
        { l: 'Practical need', k: ['alarm', 'time', 'work', 'message', 'email', 'weather', 'news'] },
        { l: 'Social connection', k: ['friend', 'social', 'connect', 'miss', 'family', 'reply'] },
        { l: 'Avoidance of the day', k: ['avoid', 'delay', 'escap', 'dread', 'distract', 'bed'] },
        { l: 'Design that pulls attention', k: ['design', 'notif', 'app', 'algorithm', 'compan', 'engineer'] }],
      deepen: ['Would people do something else first if the phone didn’t exist, or is it filling a gap that was always there?'] },
    { lvl: 2, s: 'Experts are often worse at teaching beginners than people who learned recently.',
      angles: [{ l: 'Forgetting what not-knowing feels like', k: ['forget', 'remember', 'beginner', 'curse', 'assume', 'obvious'] },
        { l: 'Knowledge becomes automatic', k: ['automat', 'intuit', 'unconscious', 'chunk', 'implicit', 'tacit'] },
        { l: 'Different vocabulary', k: ['jargon', 'term', 'language', 'vocab', 'word'] },
        { l: 'Motivation and patience', k: ['patien', 'bore', 'motiv', 'interest', 'frustrat'] },
        { l: 'Recent learners know the obstacles', k: ['mistake', 'obstacle', 'struggl', 'recent', 'path', 'step'] }],
      deepen: ['What would an expert need to do to recover a beginner’s view of the problem?'] },
    { lvl: 3, s: 'Giving people more choices can make them less satisfied.',
      angles: [{ l: 'Effort of comparison', k: ['compar', 'effort', 'overwhelm', 'tire', 'decision', 'fatigue'] },
        { l: 'Regret and counterfactuals', k: ['regret', 'missed', 'alternative', 'wonder', 'other', 'better'] },
        { l: 'Raised expectations', k: ['expect', 'perfect', 'standard', 'ideal', 'high'] },
        { l: 'Responsibility for the outcome', k: ['responsib', 'blame', 'fault', 'own', 'accountab'] },
        { l: 'Expertise changes the effect', k: ['expert', 'know', 'prefer', 'clear', 'already'] }],
      deepen: ['Who benefits from more choice — and what do they have that others don’t?'] },
    { lvl: 4, s: 'Cities that build more roads often end up with the same amount of traffic.',
      angles: [{ l: 'Induced demand', k: ['demand', 'induc', 'more people', 'drive more', 'attract', 'encourag'] },
        { l: 'Changed travel choices', k: ['transit', 'bus', 'train', 'walk', 'cycl', 'switch', 'mode'] },
        { l: 'Where people choose to live', k: ['live', 'suburb', 'house', 'move', 'sprawl', 'distan'] },
        { l: 'Time horizons', k: ['short', 'long', 'year', 'initial', 'eventual', 'time'] },
        { l: 'What “traffic” measures', k: ['measur', 'trip', 'volume', 'speed', 'congest', 'define'] }],
      deepen: ['If traffic stays the same but more trips are made, has the road failed or succeeded?'] },
    { lvl: 5, s: 'Being well-informed doesn’t make people better at predicting events.',
      angles: [{ l: 'Overconfidence from knowledge', k: ['confiden', 'overconfid', 'certain', 'sure'] },
        { l: 'Narrative over base rates', k: ['story', 'narrativ', 'base rate', 'statistic', 'probab'] },
        { l: 'Noise in information', k: ['noise', 'irrelevant', 'distract', 'signal', 'too much'] },
        { l: 'Inherent unpredictability', k: ['random', 'chaos', 'unpredict', 'complex', 'chance', 'luck'] },
        { l: 'Incentives and identity', k: ['incentiv', 'reputat', 'identit', 'bias', 'loyal', 'side'] }],
      deepen: ['What would “being well-informed” have to include for it to improve prediction?'] }
  ]);

  // ── Possibility Generator (also parameterised template in engine)
  add('possibility', [
    { lvl: 1, s: 'Someone who usually participates in meetings has suddenly become quiet.',
      angles: [{ l: 'Health or energy', k: ['tired', 'sick', 'ill', 'sleep', 'health', 'energy', 'exhaust'] },
        { l: 'Something outside work', k: ['home', 'family', 'personal', 'relationship', 'life', 'outside'] },
        { l: 'Conflict or dynamics in the room', k: ['conflict', 'colleague', 'boss', 'manag', 'tension', 'criticis', 'embarrass'] },
        { l: 'Disengagement or job change', k: ['quit', 'leav', 'interview', 'disengag', 'bore', 'motiv', 'care'] },
        { l: 'Deliberate change in style', k: ['listen', 'deliberat', 'feedback', 'chose', 'strateg', 'space'] },
        { l: 'Topic or context shift', k: ['topic', 'agenda', 'expert', 'unfamiliar', 'relevant', 'project'] }] },
    { lvl: 2, s: 'A popular café on a busy street closes after two years, despite always seeming full.',
      angles: [{ l: 'Costs exceeded revenue', k: ['rent', 'cost', 'margin', 'profit', 'expens', 'price', 'money'] },
        { l: 'Appearances mislead', k: ['seem', 'laptop', 'linger', 'small order', 'peak', 'appear', 'busy'] },
        { l: 'Owner circumstances', k: ['owner', 'health', 'burn', 'tired', 'retire', 'family', 'move'] },
        { l: 'External change', k: ['landlord', 'lease', 'redevelop', 'construct', 'regulat', 'competit'] },
        { l: 'A planned exit', k: ['sold', 'sell', 'plan', 'bigger', 'new location', 'franchis', 'success'] }] },
    { lvl: 3, s: 'A school’s exam results rise sharply in one year after a new principal arrives.',
      angles: [{ l: 'The principal’s changes worked', k: ['teach', 'method', 'policy', 'leader', 'change', 'principal'] },
        { l: 'Different students', k: ['cohort', 'intake', 'student', 'class', 'year group', 'enrol'] },
        { l: 'Selection and exclusion', k: ['exclu', 'withdr', 'enter', 'select', 'remov', 'weaker'] },
        { l: 'Changes in the exam', k: ['exam', 'easier', 'grade', 'mark', 'boundar', 'test'] },
        { l: 'Prior work maturing', k: ['previous', 'earlier', 'before', 'lag', 'already', 'prior'] },
        { l: 'Regression to the mean', k: ['bad year', 'average', 'unusual', 'fluke', 'regress', 'normal'] }] },
    { lvl: 4, s: 'A fitness app reports that its most active users lose the least weight.',
      angles: [{ l: 'Reverse causation', k: ['already', 'fit', 'less to lose', 'healthy', 'start'] },
        { l: 'Muscle and measurement', k: ['muscle', 'weigh', 'measur', 'body', 'fat', 'scale'] },
        { l: 'Compensation', k: ['eat', 'hungr', 'compens', 'reward', 'calori', 'appetit'] },
        { l: 'Different goals', k: ['goal', 'strength', 'enjoy', 'endur', 'not trying'] },
        { l: 'Data and logging artefacts', k: ['log', 'record', 'data', 'track', 'report', 'honest'] }] },
    { lvl: 5, s: 'Two hospitals treat the same condition. Hospital A has a higher death rate, but every individual doctor at A has better outcomes than their counterparts at B.',
      angles: [{ l: 'Case mix differs', k: ['sever', 'sicker', 'serious', 'case', 'mix', 'patient'] },
        { l: 'Aggregation paradox', k: ['simpson', 'aggreg', 'proport', 'weight', 'group', 'average'] },
        { l: 'Referral patterns', k: ['refer', 'specialist', 'transfer', 'reput', 'difficult'] },
        { l: 'Recording differences', k: ['record', 'count', 'defin', 'report', 'measur', 'data'] }] }
  ]);

  // ── What Else Could Be True?
  add('whatelse', [
    { lvl: 1, s: 'Your friend hasn’t replied to your message for two days.', obvious: 'They’re annoyed with you.',
      angles: [{ l: 'Busy or overwhelmed', k: ['busy', 'work', 'overwhelm', 'stress', 'deadline'] },
        { l: 'Message missed or forgotten', k: ['miss', 'forgot', 'didn', 'notice', 'seen', 'buried'] },
        { l: 'Phone or practical issue', k: ['phone', 'broken', 'battery', 'travel', 'signal', 'lost'] },
        { l: 'Thinking about a reply', k: ['think', 'reply properly', 'consider', 'time to', 'answer well'] },
        { l: 'Their own difficulty', k: ['sad', 'ill', 'sick', 'family', 'going through', 'low'] }] },
    { lvl: 2, s: 'A colleague leaves a meeting early without explanation.', obvious: 'They thought the meeting was a waste of time.',
      angles: [{ l: 'Prior commitment', k: ['another meeting', 'appointment', 'commit', 'call', 'clash', 'schedul'] },
        { l: 'Personal or health reason', k: ['ill', 'sick', 'child', 'family', 'emergenc', 'unwell'] },
        { l: 'Their part was done', k: ['part', 'done', 'relevant', 'agenda', 'needed'] },
        { l: 'Discomfort in the room', k: ['upset', 'uncomfort', 'conflict', 'tension', 'embarrass'] }] },
    { lvl: 3, s: 'Sales of a product dropped 30% after its packaging was redesigned.', obvious: 'Customers dislike the new packaging.',
      angles: [{ l: 'Customers can’t find it', k: ['recogn', 'find', 'shelf', 'notice', 'familiar', 'look for'] },
        { l: 'Coincident change', k: ['price', 'competit', 'season', 'same time', 'econom', 'supply'] },
        { l: 'Distribution or stock', k: ['stock', 'distribut', 'store', 'supply', 'shelf space'] },
        { l: 'Signals a different product', k: ['signal', 'changed recipe', 'cheap', 'quality', 'different product'] },
        { l: 'Measurement timing', k: ['month', 'period', 'compare', 'baseline', 'measur', 'short'] }] },
    { lvl: 4, s: 'Neighbourhoods with more police patrols report more crime.', obvious: 'Police presence causes crime, or doesn’t prevent it.',
      angles: [{ l: 'Reverse causation', k: ['because crime', 'sent where', 'allocat', 'already high', 'respond'] },
        { l: 'Detection and reporting', k: ['report', 'detect', 'notic', 'record', 'catch', 'observ'] },
        { l: 'Displacement and definition', k: ['displac', 'defin', 'categor', 'minor', 'type'] },
        { l: 'Trust in reporting', k: ['trust', 'confiden', 'willing', 'call', 'tell'] }] },
    { lvl: 5, s: 'A team that adopted a strict “no meetings on Wednesday” rule reports higher satisfaction but ships fewer features.', obvious: 'Deep-work days make people happier but less productive.',
      angles: [{ l: 'Coordination costs moved elsewhere', k: ['coordinat', 'other day', 'crammed', 'blocked', 'wait'] },
        { l: 'Feature count is the wrong measure', k: ['measur', 'quality', 'bigger', 'feature count', 'metric', 'bug'] },
        { l: 'Lag before benefits', k: ['lag', 'later', 'long term', 'invest', 'refactor'] },
        { l: 'Coincident changes', k: ['same time', 'quarter', 'staff', 'hire', 'leav', 'season'] },
        { l: 'Satisfaction measures something else', k: ['survey', 'novelty', 'honeymoon', 'report', 'say'] }] }
  ]);

  // ── Thought Expansion
  const OPS_ALL = ['explanation', 'example', 'cause', 'consequence', 'comparison', 'counterexample', 'implication', 'qualification'];
  add('expand', [
    { lvl: 1, s: 'Sleep affects mood.', ops: ['explanation', 'example', 'consequence'] },
    { lvl: 1, s: 'Small talk is useful.', ops: ['explanation', 'example', 'counterexample'] },
    { lvl: 2, s: 'Deadlines change how people work.', ops: ['cause', 'example', 'consequence', 'counterexample'] },
    { lvl: 3, s: 'Maps shape how people think about places.', ops: ['explanation', 'example', 'comparison', 'implication', 'qualification'] },
    { lvl: 4, s: 'Convenience has a cost.', ops: ['explanation', 'cause', 'example', 'comparison', 'counterexample', 'implication'] },
    { lvl: 5, s: 'Rules work best when people understand why they exist.', ops: OPS_ALL }
  ]);

  // ── Connect the Dots
  add('dots', [
    { lvl: 1, facts: ['Supermarkets put milk at the back of the store.', 'Sweets are placed by the checkout.', 'Shopping trolleys have got bigger over the years.'],
      angles: [{ l: 'Designed to increase spending', k: ['spend', 'buy more', 'impuls', 'profit', 'sell'] }, { l: 'Exposure to more products', k: ['walk past', 'see more', 'expos', 'aisle'] }, { l: 'Moments of weak resistance', k: ['wait', 'bored', 'child', 'tired', 'queue'] }] },
    { lvl: 2, facts: ['Remote workers report feeling less connected to colleagues.', 'Office coffee machines are often where people hear news first.', 'Many companies now schedule “virtual coffee” calls.'],
      angles: [{ l: 'Informal information channels', k: ['informal', 'news', 'gossip', 'hear', 'information'] }, { l: 'Unplanned contact builds connection', k: ['unplan', 'spontan', 'chance', 'casual', 'random'] }, { l: 'Scheduled informality is different', k: ['schedul', 'forced', 'artificial', 'planned', 'awkward'] }] },
    { lvl: 3, facts: ['Ancient Roman concrete in seawater has lasted 2,000 years.', 'Modern concrete often cracks within decades.', 'Modern construction prioritises speed and predictable strength.'],
      angles: [{ l: 'Trade-off between speed and durability', k: ['speed', 'fast', 'durab', 'trade', 'long'] }, { l: 'Different chemistry or materials', k: ['chemi', 'material', 'ash', 'react', 'ingredient', 'mineral'] }, { l: 'Survivorship', k: ['surviv', 'only the', 'failed', 'disappeared', 'see the'] }, { l: 'What we optimise for', k: ['priorit', 'optimis', 'incentiv', 'cost', 'value'] }] },
    { lvl: 4, facts: ['Languages with many speakers tend to have simpler grammar.', 'Adults find complex grammar harder to learn than children do.', 'Trade languages often lose inflections.'],
      angles: [{ l: 'Adult learners simplify', k: ['adult', 'learner', 'second language', 'simplif'] }, { l: 'Contact between groups', k: ['contact', 'trade', 'mix', 'communicat', 'stranger'] }, { l: 'Isolation preserves complexity', k: ['isolat', 'small', 'close', 'preserv', 'children'] }] },
    { lvl: 5, facts: ['Hospitals that publish surgeon death rates sometimes see those rates fall.', 'Some surgeons in those hospitals begin declining high-risk patients.', 'Overall survival in the region does not clearly improve.'],
      angles: [{ l: 'Measures change behaviour (Goodhart)', k: ['measur', 'target', 'goodhart', 'gaming', 'metric'] }, { l: 'Risk shifted not reduced', k: ['shift', 'elsewhere', 'other hospital', 'untreated', 'declin'] }, { l: 'Transparency trade-offs', k: ['transparen', 'accountab', 'publish', 'public', 'trade'] }] }
  ]);

  // ── Find the Hidden Relationship
  add('hidden', [
    { lvl: 1, a: 'Trust', b: 'Consistency', angles: [{ l: 'Predictability', k: ['predict', 'expect', 'reliab', 'depend'] }, { l: 'Forgiveness of lapses', k: ['forgiv', 'excuse', 'benefit of the doubt', 'overlook'] }, { l: 'Consistency without trust (consistently bad)', k: ['consistently bad', 'consistently wrong', 'reliably', 'bad'] }] },
    { lvl: 1, a: 'Boredom', b: 'Creativity', angles: [{ l: 'Space for the mind to wander', k: ['wander', 'daydream', 'space', 'idle'] }, { l: 'Seeking stimulation', k: ['stimul', 'seek', 'restless', 'escape'] }, { l: 'Creative work becoming tedious', k: ['tedious', 'routine', 'repet', 'craft'] }] },
    { lvl: 2, a: 'Expertise', b: 'Humility', angles: [{ l: 'Knowing how much you don’t know', k: ['don’t know', "don't know", 'limit', 'unknown', 'complex'] }, { l: 'Status reduces humility', k: ['status', 'ego', 'arrogan', 'respect', 'authority'] }, { l: 'Humility drives learning', k: ['learn', 'feedback', 'open', 'mistake', 'curious'] }] },
    { lvl: 3, a: 'Convenience', b: 'Skill', angles: [{ l: 'Tools remove the need to practise', k: ['practi', 'tool', 'automat', 'lose', 'atroph'] }, { l: 'Skill makes things convenient', k: ['easy for', 'skill makes', 'expert', 'effortless'] }, { l: 'Convenience frees attention for other skills', k: ['free', 'attention', 'other', 'focus', 'higher'] }] },
    { lvl: 4, a: 'Privacy', b: 'Honesty', angles: [{ l: 'Privacy enables honesty', k: ['safe', 'judg', 'confid', 'open up', 'secret'] }, { l: 'Privacy can shelter deception', k: ['hide', 'conceal', 'decept', 'lie'] }, { l: 'Withholding isn’t lying', k: ['withhold', 'not lying', 'omit', 'boundary', 'not obliged'] }] },
    { lvl: 5, a: 'Efficiency', b: 'Resilience', angles: [{ l: 'Slack is waste and buffer', k: ['slack', 'buffer', 'spare', 'redundan', 'reserve'] }, { l: 'Optimised systems are brittle', k: ['brittle', 'fragil', 'single point', 'shock', 'disrupt'] }, { l: 'Resilience can be efficient over time', k: ['long run', 'over time', 'cheaper', 'recover'] }] }
  ]);

  // ── Build the Chain
  add('chain', [
    { lvl: 1, s: 'Someone avoids asking questions when they do not understand something.', links: 3 },
    { lvl: 2, s: 'A town’s only bookshop closes.', links: 4 },
    { lvl: 3, s: 'A company starts rewarding staff purely on the number of tickets they close.', links: 4 },
    { lvl: 4, s: 'Groceries become 20% cheaper to deliver than to buy in person.', links: 5 },
    { lvl: 5, s: 'Everyone’s messages become automatically translated into perfect fluency in any language.', links: 5 }
  ]);

  // ── Explain the Connection
  add('explainconn', [
    { lvl: 1, points: ['Training wheels on a child’s bike', 'Subtitles while learning a language', 'A recipe followed exactly the first time'],
      angles: [{ l: 'Temporary support while learning', k: ['support', 'scaffold', 'temporar', 'remove', 'learn'] }, { l: 'Reducing load so you can focus', k: ['focus', 'load', 'easier', 'confiden'] }] },
    { lvl: 2, points: ['Queues form even when a shop is half empty', 'People slow down to look at a car accident', 'A restaurant with a crowd looks more appealing'],
      angles: [{ l: 'Following others’ cues', k: ['others', 'social', 'crowd', 'follow', 'herd', 'signal'] }, { l: 'Attention is contagious', k: ['attention', 'curio', 'look'] }] },
    { lvl: 3, points: ['A password policy that makes people write passwords on sticky notes', 'A speed bump that makes drivers swerve onto the pavement', 'An exam that rewards memorising past papers'],
      angles: [{ l: 'Rules produce workarounds', k: ['workaround', 'circumv', 'around', 'unintend', 'backfire'] }, { l: 'Measures replace goals', k: ['goal', 'measur', 'target', 'purpose'] }] },
    { lvl: 4, points: ['Forest fires that clear undergrowth', 'Small market corrections', 'Childhood exposure to common germs'],
      angles: [{ l: 'Small disruptions prevent large ones', k: ['small', 'prevent', 'larger', 'build', 'accumul'] }, { l: 'Systems need stress to stay robust', k: ['stress', 'robust', 'resilien', 'adapt', 'immun', 'strong'] }] }
  ]);

  // ── Challenge Your Own Opinion
  add('challenge', [
    { lvl: 1, s: 'It’s better to be honest even when it hurts someone’s feelings.',
      opposing: 'Honesty is a means, not an end. If the truth can’t change anything and will only cause pain — telling someone at a funeral that the eulogy was clumsy — the kind choice is silence or gentleness. What matters is caring for the person, and blunt honesty sometimes serves the speaker’s self-image more than the listener.',
      oppK: ['means', 'change anything', 'pain', 'kind', 'self-image', 'speaker', 'gentle'], angles: [{ l: 'Assumes honesty helps the listener', k: ['help', 'benefit', 'improve', 'better off'] }, { l: 'Assumes trust depends on it', k: ['trust', 'rely', 'credib'] }] },
    { lvl: 2, s: 'Working from home is better for most people than working in an office.',
      opposing: 'Many of the benefits of offices are invisible to the individual: junior staff learn by overhearing, weak ties form by chance, and problems get noticed early. People rate remote work highly because the costs land on their future careers and on colleagues, not on their day.',
      oppK: ['junior', 'overhear', 'weak ties', 'invisible', 'future', 'career', 'chance', 'learn'], angles: [{ l: 'Assumes preference equals benefit', k: ['prefer', 'happier', 'satisf', 'want'] }, { l: 'Assumes similar jobs and homes', k: ['space', 'home', 'job', 'role', 'children', 'quiet'] }] },
    { lvl: 3, s: 'Schools should stop assigning homework.',
      opposing: 'Removing homework doesn’t remove the practice gap; it moves it. Children with educated or wealthy parents will still get tutoring and practice at home, so a no-homework policy may widen inequality while appearing compassionate.',
      oppK: ['gap', 'tutor', 'wealth', 'parent', 'inequal', 'practice', 'advantage'], angles: [{ l: 'Assumes homework is the cause of stress', k: ['stress', 'burnout', 'tired', 'pressure'] }, { l: 'Assumes school time is enough', k: ['enough', 'class time', 'school time', 'practice'] }] },
    { lvl: 4, s: 'People should be free to say offensive things online.',
      opposing: 'Freedom of speech protects people from the state, not from consequences. Platforms are not public squares; they amplify by design. Letting harassment run freely can silence more voices than moderation does — so maximum permissiveness may produce less total expression, not more.',
      oppK: ['state', 'consequenc', 'platform', 'amplif', 'silenc', 'harass', 'less expression', 'voices'], angles: [{ l: 'Assumes offence and harm are separable', k: ['harm', 'offen', 'hurt', 'damage'] }, { l: 'Assumes who decides is the key risk', k: ['who decides', 'censor', 'power', 'authorit'] }] },
    { lvl: 5, s: 'It is wrong to buy products from companies whose ethics you disagree with.',
      opposing: 'Individual purchasing has almost no effect on large companies, while the cost of ethical consistency falls hardest on people with the least time and money. Treating consumption as a moral act may also substitute a feeling of virtue for collective action that would actually change rules.',
      oppK: ['effect', 'individual', 'cost', 'least', 'money', 'virtue', 'collective', 'rules', 'regulat'], angles: [{ l: 'Assumes purchases send effective signals', k: ['signal', 'effect', 'impact', 'pressure', 'demand'] }, { l: 'Assumes complicity is personal', k: ['complicit', 'responsib', 'participat', 'fund'] }] },
    { lvl: 3, s: 'Most people would be happier if they spent less time on social media.',
      opposing: 'For isolated people — the chronically ill, rural teenagers, people in minorities — social media can be the main place they find others like them. Averages hide that the same tool harms some users and is a lifeline for others, so a general prescription may hurt exactly those it ignores.',
      oppK: ['isolat', 'ill', 'rural', 'minorit', 'lifeline', 'average', 'some users', 'others like'], angles: [{ l: 'Assumes time spent is the problem', k: ['time', 'hours', 'screen', 'use'] }, { l: 'Assumes the replacement is better', k: ['instead', 'replace', 'real life', 'outside'] }] }
  ]);

  // ── Find the Weak Link
  add('weaklink', [
    { lvl: 1, parts: ['Since I started drinking green tea, I’ve had fewer colds.', 'I also started sleeping earlier around the same time.', 'Therefore green tea strengthens the immune system.'], weak: [2],
      k: ['sleep', 'other', 'cause', 'coincid', 'correlat', 'same time', 'one person'], why: 'The conclusion credits green tea, but another change happened at the same time, and one person’s experience can’t separate the two.' },
    { lvl: 2, parts: ['Our competitor launched a mobile app last year.', 'Their revenue grew by 15% this year.', 'If we launch an app, our revenue will grow too.', 'So the app should be our top priority.'], weak: [2],
      k: ['cause', 'other reason', 'different', 'their', 'assum', 'same', 'correlat'], why: 'It assumes the app caused the competitor’s growth and that the same move would work for a different company.' },
    { lvl: 2, parts: ['Every successful founder I’ve read about dropped out of university.', 'Dropping out shows independence and risk tolerance.', 'So students who want to start companies should drop out.'], weak: [0, 2],
      k: ['surviv', 'failed', 'don’t hear', "don't hear", 'read about', 'sample', 'unsuccessful'], why: 'It only looks at successes that became famous; dropouts who failed aren’t written about (survivorship).' },
    { lvl: 3, parts: ['The new reading programme was introduced in 20 schools.', 'Schools that volunteered for it saw scores rise.', 'Schools that didn’t volunteer saw no change.', 'This proves the programme works and should be made compulsory.'], weak: [3],
      k: ['volunteer', 'self-select', 'select', 'motivat', 'different schools', 'already', 'compar'], why: 'Volunteering schools may differ (more motivated staff, more resources), so the comparison can’t isolate the programme’s effect.' },
    { lvl: 4, parts: ['Most people who are rude online are anonymous.', 'If we require real names, anonymity disappears.', 'Without anonymity, rudeness will disappear too.'], weak: [2],
      k: ['real names', 'still rude', 'other cause', 'necessar', 'suffic', 'not the only', 'remain'], why: 'Even if anonymity contributes, removing it doesn’t guarantee rudeness stops — many people are rude under their real names.' },
    { lvl: 5, parts: ['In surveys, people who meditate report lower stress.', 'Meditation involves focusing on breathing and noticing thoughts.', 'This process reduces activity in stress-related brain regions.', 'So anyone who meditates will become less stressed.'], weak: [3, 0],
      k: ['anyone', 'everyone', 'some people', 'self-report', 'reverse', 'already', 'calmer', 'select'], why: 'Survey correlations and an average mechanism don’t license “anyone”; people who choose to meditate may already differ, and some find it increases distress.' }
  ]);

  // ── Evidence or Interpretation?
  add('evidence', [
    { lvl: 1, topic: 'A work meeting', items: [
      { t: 'The meeting started at 10:12, twelve minutes late.', c: 'fact' },
      { t: 'Sam was clearly unprepared.', c: 'interp', why: '“Clearly unprepared” reads behaviour as a cause; what was observed might be that Sam searched for a file.' },
      { t: 'Priya spoke for most of the meeting.', c: 'fact', alt: ['interp'], why: '“Most” is checkable but often estimated — borderline between observation and impression.' },
      { t: 'The manager doesn’t care about our input.', c: 'claim' },
      { t: 'Since no decision was made, we’ll need another meeting.', c: 'concl' } ] },
    { lvl: 2, topic: 'A product launch', items: [
      { t: 'The app was downloaded 4,000 times in its first week.', c: 'fact' },
      { t: 'Users love the new design.', c: 'claim', alt: ['interp'] },
      { t: 'The download numbers show the marketing worked.', c: 'concl', alt: ['interp'], why: 'It reasons from data, but ignores what else could explain downloads.' },
      { t: 'People who download an app intend to use it.', c: 'assume' },
      { t: 'Most reviews mention the onboarding.', c: 'fact' },
      { t: 'The negative reviews come from people who didn’t read the instructions.', c: 'interp', alt: ['claim'] } ] },
    { lvl: 3, topic: 'A neighbourhood dispute', items: [
      { t: 'The neighbour’s dog barked between 2am and 3am on Tuesday.', c: 'fact' },
      { t: 'The neighbour leaves the dog out at night to annoy us.', c: 'interp', alt: ['claim'] },
      { t: 'If the dog barks at night, someone must be awake to hear it.', c: 'assume', alt: ['concl'], why: 'It sounds like logic but takes for granted who noticed and when.' },
      { t: 'Three households signed the noise complaint.', c: 'fact' },
      { t: 'The council will side with us because we have more signatures.', c: 'concl', alt: ['claim'] },
      { t: 'Dogs only bark when something is wrong.', c: 'claim', alt: ['assume'] } ] },
    { lvl: 4, topic: 'A news report on a study', items: [
      { t: 'The study followed 1,200 adults for five years.', c: 'fact' },
      { t: 'Coffee drinkers in the study had lower rates of heart disease.', c: 'fact' },
      { t: 'Coffee protects the heart.', c: 'concl', alt: ['claim'], why: 'It follows the data but jumps from association to cause.' },
      { t: 'The participants reported their coffee intake accurately.', c: 'assume' },
      { t: 'The findings are a breakthrough for public health.', c: 'interp', alt: ['claim'] },
      { t: 'Other researchers will confirm these results.', c: 'claim' } ] }
  ]);

  // ── The Missing Information
  add('missing', [
    { lvl: 1, s: 'A restaurant has a 4.9-star rating online. Should you book it for an important dinner?',
      angles: [{ l: 'How many reviews', k: ['how many', 'number of review', 'count', 'few'] }, { l: 'Who wrote them / authenticity', k: ['fake', 'who wrote', 'genuine', 'friend', 'paid'] }, { l: 'Fit for the occasion', k: ['noise', 'quiet', 'occasion', 'atmosphere', 'menu', 'diet', 'price'] }, { l: 'Recency', k: ['recent', 'old', 'chef', 'changed', 'when'] }] },
    { lvl: 2, s: 'A colleague tells you the project lead “threw you under the bus” in a meeting you weren’t at.',
      angles: [{ l: 'What exactly was said', k: ['exact', 'what was said', 'words', 'actually said'] }, { l: 'Other witnesses', k: ['other people', 'someone else', 'witness', 'others'] }, { l: 'The colleague’s position', k: ['colleague', 'motive', 'why tell', 'relationship'] }, { l: 'Context and history', k: ['context', 'before', 'history', 'why', 'pressure'] }] },
    { lvl: 3, s: 'A city reports that cycling accidents doubled after it built new bike lanes.',
      angles: [{ l: 'Number of cyclists', k: ['how many cyclist', 'more people', 'number of', 'per', 'rate'] }, { l: 'Severity', k: ['severe', 'serious', 'minor', 'injur', 'death'] }, { l: 'Where accidents occur', k: ['where', 'location', 'lane', 'junction', 'road'] }, { l: 'Reporting changes', k: ['report', 'record', 'defin', 'count'] }] },
    { lvl: 4, s: 'An investment fund returned 40% last year. A friend says you should move your savings into it.',
      angles: [{ l: 'Longer track record', k: ['year', 'history', 'track', 'long', 'previous'] }, { l: 'Risk and volatility', k: ['risk', 'volatil', 'lose', 'drop', 'downside'] }, { l: 'Fees and costs', k: ['fee', 'cost', 'charge'] }, { l: 'Comparison to market', k: ['market', 'benchmark', 'compar', 'index', 'everyone'] }, { l: 'Your own needs', k: ['need', 'goal', 'when', 'emergency', 'situation'] }] },
    { lvl: 5, s: 'A study finds that children who eat breakfast perform better in school. A politician proposes free breakfasts to raise attainment.',
      angles: [{ l: 'Causation vs confound', k: ['cause', 'confound', 'income', 'family', 'stable', 'other factor'] }, { l: 'Effect size', k: ['how much', 'size', 'small', 'large', 'magnitude'] }, { l: 'Who would change', k: ['already eat', 'who skip', 'uptake', 'take part'] }, { l: 'Cost and alternatives', k: ['cost', 'alternative', 'instead', 'money', 'budget'] }] }
  ]);

  // ── Rank the Explanations
  add('rankexp', [
    { lvl: 2, s: 'A usually punctual train has been 10 minutes late every day this week.', options: ['Engineering works somewhere on the line', 'A new timetable that hasn’t been published', 'The driver on that shift is often late', 'Bad luck — five unrelated delays'] },
    { lvl: 3, s: 'A teenager who loved football has stopped going to training.', options: ['They’ve lost interest and found something else', 'Something happened with a teammate or coach', 'They’re struggling to keep up physically or are injured', 'Schoolwork or home life has become heavier'] },
    { lvl: 4, s: 'Your houseplant’s leaves have started turning yellow.', options: ['Overwatering', 'Not enough light since the seasons changed', 'Natural ageing of old leaves', 'Pests on the undersides'] },
    { lvl: 5, s: 'A blog post you wrote got 50 times its usual traffic overnight, but no comments.', options: ['A large site linked to it', 'Bot traffic or a crawler', 'It ranked for a trending search', 'Someone shared it to criticise it privately'] }
  ]);

  const api = { BANK1: B, OPS_ALL };
  if (typeof module !== 'undefined') module.exports = api; else root.MW_BANK1 = api;
})(this);
