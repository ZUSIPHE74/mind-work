/* MINDWORK Puzzle Arena — puzzle bank and pure logic.
   Every answer is checked deterministically. Free-text answers are matched against accepted answers, and the
   interface says so; reasoning is checked through choices (the decisive clue), never by reading prose. */
(function (root) {
  const isNode = typeof module !== 'undefined';
  const CATS = [
    { id: 'lateral', name: 'Lateral Thinking', blurb: 'The obvious reading is the trap. Question the assumption.', abilities: ['lateral', 'creative'] },
    { id: 'deduction', name: 'Deduction and Mystery', blurb: 'Statements, timelines and suspects. Conclude only what the evidence supports.', abilities: ['logical', 'critical'] },
    { id: 'pattern', name: 'Pattern Recognition', blurb: 'Find the hidden rule in numbers and shapes.', abilities: ['analytical', 'abstract'] },
    { id: 'spatial', name: 'Spatial and Mechanical', blurb: 'Rotate and mirror shapes in your head.', abilities: ['abstract', 'analytical'] },
    { id: 'strategic', name: 'Strategic Thinking', blurb: 'Plan several moves ahead and allocate limited resources.', abilities: ['strategic', 'problem'] },
    { id: 'logic', name: 'Mathematical and Logical', blurb: 'Logic grids, conditionals, probability and contradictions.', abilities: ['logical', 'analytical'] },
    { id: 'escape', name: 'Multi-stage Escape', blurb: 'Each lock depends on what you found at the last one.', abilities: ['problem', 'lateral', 'logical'] },
    { id: 'visual', name: 'Visual and Observation', blurb: 'Notice what changed and what doesn’t fit.', abilities: ['analytical', 'critical'] },
    { id: 'realworld', name: 'Real-world Problem-Solving', blurb: 'Root causes, constraints and trade-offs with incomplete information.', abilities: ['problem', 'systems', 'critical'] }];
  const CAT = Object.fromEntries(CATS.map(c => [c.id, c]));
  const NONE = 'It cannot be determined from the information given';
  const CONTRA = 'The puzzle contradicts itself; there is no answer';
  const H = (a, b, c) => [a, b, c];

  const PUZZLES = [
    // ── Lateral
    { id: 'lat-1', cat: 'lateral', lvl: 1, title: 'The bankrupt driver', kind: 'answer', prompt: 'A man pushes his car up to a hotel and tells the owner he is bankrupt. What is going on?',
      accept: { tokens: [['monopoly'], ['board', 'game'], ['game']] }, answerText: 'He is playing Monopoly: a car token, a hotel, and he cannot pay the rent.',
      hints: H('Who said the car was real?', 'Where do people buy hotels and go bankrupt in an afternoon?', 'Think of a board game with property, hotels and small metal tokens.'),
      explain: 'The puzzle invites you to picture a real car and a real hotel. Dropping that assumption makes everything fit a game of Monopoly.',
      key: { q: 'Which assumption had to go?', options: ['That the man was telling the truth', 'That the car and hotel were real', 'That the hotel owner was a man'], correct: [1] } },
    { id: 'lat-2', cat: 'lateral', lvl: 2, title: 'The surgeon', kind: 'choice', prompt: 'A boy is rushed to hospital after an accident in which his father, who was driving, died. The surgeon looks at him and says, “I can’t operate on this boy. He’s my son.” How is this possible?',
      options: ['The surgeon is the boy’s mother', 'The surgeon is the boy’s other parent, such as a second father', 'The surgeon is mistaken about who the boy is', NONE], correct: [0, 1],
      answerText: 'The surgeon is another parent: most often the boy’s mother, or a second father.',
      hints: H('Who did you picture when you read “the surgeon”?', 'A boy can have more than one parent who is alive.', 'Nothing says the surgeon is a man.'),
      explain: 'Both the mother and a second father are valid answers: the puzzle only works on readers who assume a surgeon must be a man.',
      key: { q: 'What made the situation look impossible?', options: ['Assuming the surgeon was a man', 'Assuming the boy was badly hurt', 'Assuming the accident happened that day'], correct: [0] } },
    { id: 'lat-3', cat: 'lateral', lvl: 3, title: 'An odd evening', kind: 'answer', prompt: 'A woman shoots her husband. Then she holds him under water for five minutes. Finally, she hangs him. An hour later they go out to dinner together. What happened?',
      accept: { tokens: [['photo'], ['photograph'], ['picture'], ['camera'], ['film']] }, answerText: 'She is a photographer: she shot his photo, developed it in liquid, and hung it up to dry.',
      hints: H('Each verb has more than one meaning.', 'What else can you “shoot” and “develop”?', 'Think of an old-fashioned darkroom.'),
      explain: '“Shoot”, “hold under water” and “hang” all describe developing a photograph by hand.',
      key: { q: 'What unlocks the puzzle?', options: ['Reading the verbs in a different sense', 'Working out the time of dinner', 'Knowing the couple’s jobs from the text'], correct: [0] } },
    { id: 'lat-4', cat: 'lateral', lvl: 4, title: 'Two coins', kind: 'answer', prompt: 'Two South African coins add up to R6. One of them is not a R1 coin. Which two coins are they?',
      accept: { tokens: [['5', '1']] }, answerText: 'A R5 coin and a R1 coin. The R5 is the one that is not a R1.',
      hints: H('Read “one of them is not a R1 coin” very literally.', 'If one coin is not a R1, what could the other one be?', 'Which coins add up to R6 at all?'),
      explain: 'Only R5 + R1 makes R6 with two coins. “One of them is not a R1” is true: the R5 isn’t.',
      key: { q: 'Which reading made it work?', options: ['“One of them” does not mean “neither of them”', 'Older coins count differently', 'The coins could be from different countries'], correct: [0] } },
    // ── Deduction
    { id: 'ded-1', cat: 'deduction', lvl: 2, title: 'The last biscuit', kind: 'choice', prompt: 'One of three flatmates ate the last biscuit. Exactly one of their statements is true. Who ate it?',
      clues: ['Ama: “I didn’t eat it.”', 'Ben: “Ama ate it.”', 'Chen: “I didn’t eat it.”', 'Exactly one statement is true.'],
      options: ['Ama', 'Ben', 'Chen', NONE], correct: [2], tests: ['evidence'],
      answerText: 'Chen. If Ama or Ben had eaten it, two statements would be true.',
      hints: H('Try each person as the eater and count the true statements.', 'If Ama ate it, which statements are true?', 'Only one suspect leaves exactly one true statement.'),
      explain: 'Ama ate it → Ben and Chen are truthful (two true). Ben ate it → Ama and Chen are truthful (two true). Chen ate it → only Ama is truthful. So Chen.',
      key: { q: 'Which piece of information settles it?', options: ['Ama’s statement', 'Ben’s statement', 'The rule that exactly one statement is true'], correct: [2] } },
    { id: 'ded-2', cat: 'deduction', lvl: 3, title: 'One liar', kind: 'choice', prompt: 'Someone took the stapler. Exactly one of these three is lying; the other two tell the truth. Who took it?',
      clues: ['Ama: “Ben took it.”', 'Ben: “Ama is lying.”', 'Chen: “I didn’t take it.”', 'Exactly one person is lying.'],
      options: ['Ama', 'Ben', 'Chen', NONE], correct: [3], overreach: [0, 1, 2], tests: ['evidence'],
      answerText: 'It cannot be determined. Ben as the thief and Ama as the thief both fit the statements.',
      hints: H('Test every suspect, not just until you find one that works.', 'Try Ben as the thief, then try Ama as the thief.', 'If two different thieves both fit, what can you honestly conclude?'),
      explain: 'Ben took it → Ama truthful, Ben lying, Chen truthful: one liar. Ama took it → Ama lying, Ben truthful, Chen truthful: one liar. Two answers fit, so the evidence can’t decide.',
      key: { q: 'Why can’t the evidence decide?', options: ['Two different thieves are consistent with the statements', 'Chen’s statement is unreliable', 'There are too few clues to start'], correct: [0] } },
    { id: 'ded-3', cat: 'deduction', lvl: 4, title: 'The missing laptop', kind: 'choice', prompt: 'A laptop disappeared from a locked office. What can you conclude?',
      clues: ['Card log: Dana in 11:50, out 12:20.', 'Card log: Eli in 12:40, out 13:10.', 'Card log: Fay in 13:30, out 13:45.', 'The cleaner saw the laptop on the desk at 13:15.', 'The laptop was gone at 14:00.', 'Maintenance note: the door was propped open from 13:00 to 13:20.'],
      options: ['Fay took it', 'Eli took it', 'Fay is the only person recorded there in the window, but someone could have entered through the propped door before 13:20', NONE], correct: [2], overreach: [0, 1], tests: ['evidence'],
      answerText: 'Fay is the only recorded person in the room between 13:15 and 14:00, but the propped door means an unrecorded person cannot be ruled out.',
      hints: H('First fix the window: when was the laptop last seen, and when was it gone?', 'Who is recorded inside during that window?', 'Does the card log capture everyone who could have been inside?'),
      explain: 'The window is 13:15–14:00 and only Fay is recorded inside. But the door was propped open until 13:20, so someone could have entered without a card. Fay is the strongest lead, not an established thief.',
      key: { q: 'Which clue stops you concluding that Fay took it?', options: ['The cleaner’s sighting at 13:15', 'The maintenance note about the propped door', 'Eli’s card log'], correct: [1] } },
    // ── Pattern
    { id: 'pat-1', cat: 'pattern', lvl: 1, title: 'Growing gaps', kind: 'answer', prompt: 'What comes next?  2, 6, 12, 20, 30, …', accept: { numbers: [42] }, answerText: '42',
      hints: H('Look at the differences between neighbours.', 'The differences are 4, 6, 8, 10.', 'Each term is n × (n + 1).'),
      explain: 'The gaps grow by 2 each time (4, 6, 8, 10, 12), so 30 + 12 = 42. Equivalently, the n-th term is n(n + 1).',
      key: { q: 'Which rule produces the sequence?', options: ['Add the previous two terms', 'The gaps grow by 2 each time', 'Double and subtract'], correct: [1] } },
    { id: 'pat-2', cat: 'pattern', lvl: 3, title: 'Built from the past', kind: 'answer', prompt: 'What comes next?  3, 4, 7, 11, 18, …', accept: { numbers: [29] }, answerText: '29',
      hints: H('The gaps aren’t steady. Look at more than one previous term.', 'Compare each term with the two before it.', '7 = 3 + 4.'),
      explain: 'Each term is the sum of the two before it: 11 + 18 = 29.',
      key: { q: 'Which rule produces the sequence?', options: ['Add the previous two terms', 'The gaps grow by 1', 'Multiply by 1.5 and round'], correct: [0] } },
    { id: 'pat-3', cat: 'pattern', lvl: 2, title: 'The missing tile', kind: 'visual', prompt: 'Which tile completes the grid?',
      show: { type: 'matrix', cells: [[{ s: 'circle', n: 1 }, { s: 'circle', n: 2 }, { s: 'circle', n: 3 }], [{ s: 'square', n: 1 }, { s: 'square', n: 2 }, { s: 'square', n: 3 }], [{ s: 'triangle', n: 1 }, { s: 'triangle', n: 2 }, null]] },
      options: [{ s: 'triangle', n: 2 }, { s: 'square', n: 3 }, { s: 'triangle', n: 3 }, { s: 'circle', n: 3 }], correct: [2], answerText: 'Three triangles.',
      hints: H('Read the grid one row at a time, then one column at a time.', 'Each row keeps one shape; each column keeps one count.', 'Bottom row: triangles. Right column: three of them.'),
      explain: 'Rows fix the shape and columns fix the count, so the gap needs triangles, three of them.',
      key: { q: 'What decides the answer?', options: ['Rows set the shape and columns set the count', 'Shapes alternate diagonally', 'The total number of shapes is constant'], correct: [0] } },
    { id: 'pat-4', cat: 'pattern', lvl: 4, title: 'The impostor', kind: 'choice', prompt: 'Which number does not belong?  2, 3, 5, 7, 11, 14, 17',
      options: ['2', '11', '14', '17'], correct: [2], answerText: '14: every other number is prime.',
      hints: H('2 is the only even number you might suspect, but look for a rule that includes it.', 'What do 2, 3, 5 and 7 have in common?', 'Which number can be divided by something other than 1 and itself?'),
      explain: 'All the others are prime numbers; 14 = 2 × 7. Picking 2 for being even ignores the stronger rule that fits six of the seven numbers.',
      key: { q: 'Why not 2?', options: ['2 fits the stronger rule: it is prime', '2 is too small to matter', '2 starts the sequence'], correct: [0] } },
    // ── Spatial
    { id: 'spa-1', cat: 'spatial', lvl: 2, title: 'Not a rotation', kind: 'visual', prompt: 'Three of these are the same shape turned around. Which one is a mirror image instead?',
      show: { type: 'poly', base: [[0, 0], [0, 1], [0, 2], [1, 2]] }, options: [{ poly: 0, rot: 90 }, { poly: 0, rot: 180 }, { poly: 0, mirror: true, rot: 90 }, { poly: 0, rot: 270 }], correct: [2],
      answerText: 'The third shape is a mirror image; no rotation produces it.', hints: H('Turn each option back to match the target in your head.', 'Follow where the short foot points relative to the long side.', 'A mirror image can only be matched by flipping, never by turning.'),
      explain: 'Turning the L never changes which side its foot sticks out on; only flipping does. The third option has its foot on the opposite side.',
      key: { q: 'What gives the mirror image away?', options: ['Its size', 'Which side the short foot sticks out on', 'How far it is turned'], correct: [1] } },
    { id: 'spa-2', cat: 'spatial', lvl: 3, title: 'Find the match', kind: 'visual', prompt: 'Which option is the target shape rotated, not flipped?',
      show: { type: 'poly', base: [[0, 0], [1, 0], [1, 1], [2, 1], [1, 2]] }, options: [{ poly: 0, mirror: true }, { poly: 0, mirror: true, rot: 180 }, { poly: 0, rot: 90 }, { poly: 0, mirror: true, rot: 270 }], correct: [2],
      answerText: 'The third option: the target turned a quarter turn.', hints: H('Pick one distinctive square and track it.', 'Track the single square that sticks out on its own.', 'Three options need a flip; one only needs turning.'),
      explain: 'Only the third option can be reached by turning. The others are mirror images, which turning can never produce.',
      key: { q: 'What is the reliable test?', options: ['Count the squares', 'Track one distinctive part and check its side', 'Compare the widths'], correct: [1] } },
    // ── Strategic
    { id: 'str-1', cat: 'strategic', lvl: 2, title: 'Last counter wins', kind: 'nim', prompt: 'There are 15 counters. You and MINDWORK take turns removing 1, 2 or 3. Whoever takes the last counter wins. You go first. Win the game.',
      start: 15, max: 3, answerText: 'Always leave a multiple of 4: take 3 first (leaving 12), then take 4 minus whatever MINDWORK takes.',
      hints: H('Work backwards from the end. What number of counters do you want to leave your opponent?', 'If you leave exactly 4, can your opponent win?', 'Leave 12, 8, 4 and 0 in turn: after their move, take enough to make the pair add up to 4.'),
      explain: 'With 4 counters left, whatever your opponent takes, you can take the rest. So multiples of 4 are losing positions to hand over. From 15, take 3 to leave 12, then always complete their move to 4.',
      key: { q: 'What were you aiming to leave after each of your moves?', options: ['An odd number', 'A multiple of 4', 'More than half'], correct: [1] } },
    { id: 'str-2', cat: 'strategic', lvl: 3, title: 'Tower of four', kind: 'hanoi', prompt: 'Move the tower of four discs from the left peg to the right peg. Move one disc at a time, and never place a disc on a smaller one.',
      discs: 4, answerText: 'The minimum is 15 moves: move the top three to the middle, the largest to the right, then the three onto it.',
      hints: H('To move the largest disc, everything above it must be out of the way, and the target peg must be empty.', 'Moving four discs means moving three discs twice, with one big move between.', 'Smallest disc: move it every other turn, always in the same direction around the pegs.'),
      explain: 'Moving n discs takes moving n − 1 discs aside, the largest across, then n − 1 back on top: 2ⁿ − 1 = 15 moves for four.',
      key: { q: 'What plan did you need?', options: ['Move the smallest disc as rarely as possible', 'Clear everything above the largest disc, move it, then rebuild', 'Fill the middle peg first, whatever the order'], correct: [1] } },
    { id: 'str-3', cat: 'strategic', lvl: 3, title: 'Budget for impact', kind: 'allocate', prompt: 'A community centre has R100 000. Choose projects to fund for the most impact (in people helped per month) without going over budget.',
      budget: 100, unit: 'R1 000', items: [{ name: 'Homework club', cost: 40, value: 60 }, { name: 'Free Wi-Fi', cost: 30, value: 45 }, { name: 'Food garden', cost: 50, value: 70 }, { name: 'Repair café', cost: 20, value: 25 }, { name: 'Night lighting', cost: 60, value: 80 }],
      answerText: 'The maximum is 140 people helped, reached by two plans: Homework club with Night lighting, or Food garden with Free Wi-Fi and the Repair café. Both cost exactly R100 000.',
      hints: H('Compare impact per rand, but check combinations too.', 'The biggest single project isn’t automatically in the best plan.', 'Several plans can reach the same best total; you need one of them.'),
      explain: 'Checking every combination within R100 000, the best total is 140 people, reached by two different plans. Either one is correct. The single biggest project, Night lighting, only reaches 140 when paired with the Homework club.',
      key: { q: 'What matters most here?', options: ['Always fund the biggest project first', 'Compare whole combinations against the budget', 'Fund the cheapest projects first'], correct: [1] } },
    { id: 'str-4', cat: 'strategic', lvl: 4, title: 'Exactly four litres', kind: 'jugs', prompt: 'You have a 5-litre jug, a 3-litre jug and a tap. Measure exactly 4 litres.', caps: [5, 3], target: 4,
      answerText: 'Fill 5, pour into 3 (leaves 2), empty 3, pour the 2 across, fill 5, top up the 3 (leaves 4). Six steps.',
      hints: H('You can only know an amount exactly when a jug is full, empty, or the result of pouring until one is full.', 'Getting 2 litres is easy: 5 minus 3. What can you do with 2?', 'Store the 2 in the small jug, then fill the big one and top the small one up.'),
      explain: '5 − 3 = 2; park the 2 in the 3-litre jug; filling the 5 and topping up the 3 (which needs 1 more) leaves 4.',
      key: { q: 'Which idea made it possible?', options: ['Using the difference between the jugs to create a new amount', 'Estimating half a jug', 'Filling both jugs at once'], correct: [0] } },
    // ── Mathematical and logical
    { id: 'log-1', cat: 'logic', lvl: 2, title: 'Bat and ball', kind: 'answer', prompt: 'A bat and a ball cost R11 together. The bat costs R10 more than the ball. How much does the ball cost?',
      accept: { numbers: [0.5], cents: true }, answerText: '50 cents. The bat costs R10.50, which is R10 more, and together they make R11.',
      hints: H('Check the first answer that comes to mind against both conditions.', 'If the ball were R1, the bat would be R11 and the total R12.', 'Call the ball b: b + (b + 10) = 11.'),
      explain: 'The intuitive answer, R1, fails: the total would be R12. Solving b + b + 10 = 11 gives b = 0.50.',
      key: { q: 'What catches most people?', options: ['Not checking the quick answer against both conditions', 'Not knowing the price of balls', 'Rounding'], correct: [0] } },
    { id: 'log-2', cat: 'logic', lvl: 3, title: 'Pets and drinks', kind: 'grid', prompt: 'Three friends each have one pet and one favourite drink. Work out who has what.',
      people: ['Lindiwe', 'Pieter', 'Sipho'], attrs: [{ name: 'Pet', values: ['cat', 'dog', 'fish'] }, { name: 'Drink', values: ['tea', 'coffee', 'juice'] }],
      clues: ['Lindiwe doesn’t own the dog.', 'The fish owner drinks tea.', 'Pieter drinks coffee.', 'Sipho doesn’t own the cat.', 'The cat owner drinks juice.'],
      solution: { Lindiwe: ['cat', 'juice'], Pieter: ['dog', 'coffee'], Sipho: ['fish', 'tea'] }, answerText: 'Lindiwe: cat, juice. Pieter: dog, coffee. Sipho: fish, tea.',
      hints: H('Start with the clue that fixes something outright.', 'Pieter drinks coffee, so he can’t own the fish (fish owner drinks tea) or the cat (cat owner drinks juice).', 'Pieter has the dog. Sipho can’t have the cat, so he has the fish.'),
      explain: 'Pieter drinks coffee, which rules out the fish (tea) and the cat (juice): Pieter owns the dog. Sipho doesn’t own the cat, so Sipho has the fish and drinks tea, leaving Lindiwe the cat and juice.',
      key: { q: 'Which clue combination unlocks the grid?', options: ['Pieter drinks coffee, with the fish-tea and cat-juice clues', 'Lindiwe doesn’t own the dog, on its own', 'Sipho doesn’t own the cat, on its own'], correct: [0] } },
    { id: 'log-3', cat: 'logic', lvl: 3, title: 'Rain and the match', kind: 'choice', prompt: '“If it rains, the match is cancelled.” The match was cancelled. Did it rain?',
      options: ['Yes', 'No', NONE], correct: [2], overreach: [0, 1], tests: ['evidence'], answerText: 'It cannot be determined. Rain is enough to cancel the match, but other things could have cancelled it.',
      hints: H('Does the rule say rain is the only reason for cancelling?', 'Rain guarantees a cancellation; does a cancellation guarantee rain?', 'This is the difference between a sufficient and a necessary condition.'),
      explain: 'The rule makes rain a sufficient condition for cancelling, not a necessary one. Concluding rain from the cancellation is the fallacy of affirming the consequent.',
      key: { q: 'What is the logical issue?', options: ['Rain is sufficient but not necessary for a cancellation', 'The rule is false', 'Matches are rarely cancelled'], correct: [0] } },
    { id: 'log-4', cat: 'logic', lvl: 4, title: 'Two dice', kind: 'answer', prompt: 'Two fair dice are rolled. You’re told at least one shows a 6. What is the probability that both show 6? (A fraction is fine.)',
      accept: { numbers: [1 / 11] }, answerText: '1/11',
      hints: H('List the equally likely outcomes in which at least one die is a 6.', 'There are 11 of them, not 12: (6,6) is counted once.', 'Only one of those 11 is a double six.'),
      explain: 'Of the 36 outcomes, 11 contain at least one 6 (6 with the first die, 6 with the second, minus the double counted once). One is (6,6): 1/11.',
      key: { q: 'What is the common mistake?', options: ['Answering 1/6, as if the other die were independent of the information', 'Answering 1/36', 'Forgetting dice have six faces'], correct: [0] } },
    { id: 'log-5', cat: 'logic', lvl: 4, title: 'Who is oldest?', kind: 'choice', prompt: 'Ama is older than Ben. Ben is older than Chen. Chen is older than Ama. Who is the oldest?',
      options: ['Ama', 'Ben', 'Chen', CONTRA], correct: [3], overreach: [0, 1, 2], answerText: 'The puzzle contradicts itself: the three statements form a loop no ages can satisfy.',
      hints: H('Try to line the three up by age.', 'Follow the chain: Ama > Ben > Chen > …', 'If Chen is older than Ama, Ama would be older than herself.'),
      explain: '“Older than” can’t loop: the statements together would make Ama older than Ama. A problem can be flawed, and saying so is the correct answer.',
      key: { q: 'Why is there no answer?', options: ['The statements form an impossible loop', 'There are too few people', 'Ages aren’t given'], correct: [0] } },
    // ── Escape
    { id: 'esc-1', cat: 'escape', lvl: 3, title: 'The Locked Archive', boss: true, kind: 'escape', prompt: 'You are locked in an archive. Three locks stand between you and the door. Each one depends on what you found at the last.',
      stages: [
        { title: 'The note', prompt: 'A note on the desk reads: VHYHQ. Under it, someone scribbled: “Every letter has moved three places along.” What does the note say?', kind: 'answer', accept: { tokens: [['seven']] }, unlock: 'The note says SEVEN. The drawer has a three-digit lock.',
          hints: H('Move each letter back by three: V becomes S.', 'V→S, H→E, Y→V…', 'The word is a number.') },
        { title: 'The drawer', prompt: 'The drawer’s lock says: “First digit: the number you found. Second digit: how many letters spell it. Third digit: the difference between those two.” What is the code?', kind: 'answer', accept: { numbers: [752] }, unlock: 'The drawer opens: 752. Inside are three keys with labels.',
          hints: H('The number you found is seven.', 'SEVEN has five letters.', 'Seven minus five is two.') },
        { title: 'Three keys', prompt: 'Exactly one label is true. Label A: “This is the right key.” Label B: “This is not the right key.” Label C: “A is not the right key.” Which key opens the door?', kind: 'choice', options: ['Key A', 'Key B', 'Key C'], correct: [1], unlock: 'Key B turns. You’re out.',
          hints: H('Suppose each key in turn is right, and count the true labels.', 'If A were right, labels A and B would both be true.', 'Only one choice leaves exactly one true label.') }],
      answerText: 'SEVEN, then 752, then Key B.', hints: H('Each stage gives you what the next one needs.', 'Keep a note of what each stage revealed.', 'The final stage is a counting-true-statements puzzle.'),
      explain: 'Decode the shift cipher (SEVEN), build the code from it (7, 5 letters, difference 2: 752), then test each key: only B leaves exactly one true label (C’s).',
      key: { q: 'How did the last lock work?', options: ['Assume each key is right and count the true labels', 'Pick the key whose label sounds most honest', 'Use the code from the drawer'], correct: [0] } },
    // ── Visual
    { id: 'vis-1', cat: 'visual', lvl: 2, title: 'Four changes', kind: 'spot', prompt: 'The right-hand picture has four differences from the left. Select each one in the right-hand picture.',
      scene: [{ t: 'rect', x: 20, y: 120, w: 200, h: 14, c: 'ink' }, { t: 'rect', x: 40, y: 70, w: 50, h: 50, c: 'blue' }, { t: 'circle', x: 150, y: 95, r: 22, c: 'pink' }, { t: 'rect', x: 120, y: 30, w: 70, h: 12, c: 'purple' }, { t: 'circle', x: 60, y: 30, r: 12, c: 'ink' }, { t: 'tri', x: 200, y: 100, r: 18, c: 'blue' }, { t: 'rect', x: 30, y: 145, w: 20, h: 25, c: 'purple' }, { t: 'rect', x: 190, y: 145, w: 20, h: 25, c: 'purple' }],
      diffs: [{ i: 2, c: 'blue' }, { i: 4, hide: true }, { i: 5, r: 26 }, { i: 7, h: 12 }], answerText: 'The circle’s colour, the missing small circle, the larger triangle and the shorter right leg.',
      hints: H('Compare the pictures region by region, not all at once.', 'Check colours first, then sizes, then whether anything is missing.', 'Look at the legs under the table, and at the top left corner.'),
      explain: 'Systematic comparison, region by region and property by property, finds changes that a general glance misses.' },
    { id: 'vis-2', cat: 'visual', lvl: 3, title: 'The inconsistent report', kind: 'choice', prompt: 'An incident report has one sentence that contradicts the others. Which one?',
      options: ['The alarm sounded at 02:10 and the guard reached the loading bay at 02:14.', 'The guard reported the bay door shut and undamaged.', 'Footage shows the door being forced open at 02:08.', 'Forensic notes say the lock had been cut through, then pushed back into place.'], correct: [1],
      answerText: 'The guard’s report that the door was undamaged contradicts the footage and the forensic note about a cut lock. Note that the door could look shut, so “shut” alone isn’t the contradiction.',
      hints: H('Find two sentences that can’t both be true.', 'Which statements describe the door’s condition?', 'A lock cut through and pushed back might look shut, but not undamaged.'),
      explain: 'A forced door with a cut lock can’t be undamaged. The guard may have seen it shut, which is consistent with the lock being pushed back, but “undamaged” isn’t.',
      key: { q: 'Which pair of facts clash?', options: ['Undamaged door versus a cut lock', 'The alarm time versus the guard’s arrival', 'Footage versus the alarm'], correct: [0] } },
    // ── Real world
    { id: 'rw-1', cat: 'realworld', lvl: 3, title: 'The quiet till', kind: 'choice', prompt: 'A café’s afternoon sales fell 30% this month. What is the best-supported cause?',
      clues: ['Footfall on the street (people counter) is unchanged.', 'A new café opened 2 km away.', 'Card machine logs show about 40 declined payments a day since the 3rd; normally about 2.', 'Staff rota and menu prices are unchanged.', 'The drop started in the first week of the month.'],
      options: ['The new competitor', 'Customers declined at the till are walking away', 'Prices are too high', NONE], correct: [1], overreach: [0], tests: ['evidence'],
      answerText: 'Declined card payments. The timing matches, the scale (about 38 extra failed payments a day) plausibly explains the drop, and footfall is unchanged.',
      hints: H('Which clue changed at the same time as the sales?', 'Footfall is unchanged: people still pass and come in.', 'What happens to a sale when the card is declined?'),
      explain: 'The competitor is a possible factor but nothing ties it to the timing, and footfall hasn’t fallen. The card-machine failures start when the drop starts and directly stop sales. Next step: confirm with the payment provider and compare declines with lost sales by day.',
      key: { q: 'What makes the card machine the best-supported cause?', options: ['It changed when the drop began, and directly blocks sales', 'Card machines often fail', 'The competitor is too far away to matter'], correct: [0] } },
    { id: 'rw-2', cat: 'realworld', lvl: 4, title: 'The clinic queue', kind: 'choice', prompt: 'A clinic’s two nurses see 30 patients a day; the average wait is 90 minutes. Goal: no urgent patient waits more than 30 minutes, on a medium budget. Which option meets both constraints?',
      clues: ['A: Hire a third nurse. Cost: high. All waits fall to about 40 minutes.', 'B: Online booking. Cost: low. All waits fall to about 60 minutes. Patients without internet are disadvantaged.', 'C: A triage desk. Cost: medium. Urgent waits about 15 minutes; routine waits rise to about 100.'],
      options: ['A', 'B', 'C', 'None of them'], correct: [2], answerText: 'C, the triage desk. It’s the only option within budget that gets urgent waits under 30 minutes. The trade-off is longer routine waits, which should be said openly.',
      hints: H('Check each option against each constraint separately.', 'Which options break the budget? Which leave urgent patients waiting over 30 minutes?', 'Only one survives both checks, at a cost.'),
      explain: 'A breaks the budget; B leaves urgent waits at about 60 minutes. C meets both constraints but makes routine waits longer: a real trade-off, not a free win.',
      key: { q: 'What is the honest description of the choice?', options: ['C meets the goal at the cost of longer routine waits', 'C is better in every way', 'A is best because waits fall for everyone'], correct: [0] } }];
  const PZ = Object.fromEntries(PUZZLES.map(p => [p.id, p]));

  // ───────── checking
  const norm = s => String(s || '').toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9.,/ ]+/g, ' ').replace(/\s+/g, ' ').trim();
  function numberIn(s, cents) {
    const t = norm(s).replace(/(\d),(\d)/g, '$1.$2'); const m = /(-?\d+(?:\.\d+)?)(?:\s*\/\s*(\d+(?:\.\d+)?))?/.exec(t); if (!m) return null;
    let v = m[2] ? parseFloat(m[1]) / parseFloat(m[2]) : parseFloat(m[1]);
    if (/%/.test(String(s))) v = v / 100;
    if (cents && /^-?\d+(?:\.\d+)?\s*(c|cents?)\b/.test(t.slice(m.index)) && !/r\s*$/.test(t.slice(0, m.index))) v = v / 100;
    return v;
  }
  function checkAnswer(spec, text) {
    if (spec.numbers) { const v = numberIn(text, spec.cents); return v != null && spec.numbers.some(n => Number.isInteger(n) ? Math.abs(n - v) < 1e-9 : Math.abs(n - v) <= Math.max(0.0005, Math.abs(n) * 0.005)); } // whole-number answers (codes, counts) must match exactly
    const NUM = { one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10' };
    const w = norm(text).replace(/\br(\d)/g, 'r $1').split(' ').flatMap(x => NUM[x] ? [x, NUM[x]] : [x]);
    return (spec.tokens || []).some(set => set.every(tok => w.some(x => x === tok || (tok.length > 3 && x.startsWith(tok)))));
  }
  function check(p, resp) {
    switch (p.kind) {
      case 'answer': return { correct: checkAnswer(p.accept, resp), overreach: false };
      case 'choice': case 'visual': return { correct: p.correct.includes(resp), overreach: (p.overreach || []).includes(resp) };
      case 'grid': return { correct: p.people.every(n => p.attrs.every((a, k) => (resp[n] || [])[k] === p.solution[n][k])), overreach: false };
      case 'allocate': { const cost = resp.reduce((s, i) => s + p.items[i].cost, 0), val = resp.reduce((s, i) => s + p.items[i].value, 0); return { correct: cost <= p.budget && val === optimum(p).value, overreach: false, cost, val }; }
      case 'spot': return { correct: p.diffs.every(d => resp.includes(d.i)) && resp.every(i => p.diffs.some(d => d.i === i)), overreach: false };
    }
    return { correct: false, overreach: false };
  }
  function optimum(p) { let best = { value: -1, sets: [] }; const n = p.items.length; for (let m = 0; m < 1 << n; m++) { let c = 0, v = 0; const set = []; for (let i = 0; i < n; i++) if (m >> i & 1) { c += p.items[i].cost; v += p.items[i].value; set.push(i); } if (c > p.budget) continue; if (v > best.value) best = { value: v, sets: [set] }; else if (v === best.value) best.sets.push(set); } return best; }
  // grid uniqueness check (for tests): every assignment satisfying constraints
  function perms(a) { return a.length <= 1 ? [a] : a.flatMap((x, i) => perms(a.slice(0, i).concat(a.slice(i + 1))).map(r => [x].concat(r))); }

  // ───────── mechanics
  const nimMove = (n, max) => { const r = n % (max + 1); return r !== 0 ? r : 1; }; // optimal when possible; otherwise take 1 and wait for a mistake
  const hanoiStart = d => [Array.from({ length: d }, (_, i) => d - i), [], []];
  function hanoiMove(st, from, to) { const s = st.map(x => x.slice()); const disc = s[from][s[from].length - 1]; if (disc == null) return { ok: false, st, why: 'That peg is empty.' }; const top = s[to][s[to].length - 1]; if (top != null && top < disc) return { ok: false, st, why: 'A disc can’t go on a smaller one.' }; s[from].pop(); s[to].push(disc); return { ok: true, st: s }; }
  const hanoiDone = (st, d) => st[2].length === d;
  function jugsDo(st, op, caps) { const s = st.slice(); if (op === 'fillA') s[0] = caps[0]; if (op === 'fillB') s[1] = caps[1]; if (op === 'emptyA') s[0] = 0; if (op === 'emptyB') s[1] = 0; if (op === 'AtoB') { const m = Math.min(s[0], caps[1] - s[1]); s[0] -= m; s[1] += m; } if (op === 'BtoA') { const m = Math.min(s[1], caps[0] - s[0]); s[1] -= m; s[0] += m; } return s; }
  function jugsMin(caps, target) { const seen = new Set(['0,0']); let q = [[[0, 0], 0]]; while (q.length) { const [[a, b], d] = q.shift(); if (a === target || b === target) return d; for (const op of ['fillA', 'fillB', 'emptyA', 'emptyB', 'AtoB', 'BtoA']) { const n = jugsDo([a, b], op, caps); const k = n.join(); if (!seen.has(k)) { seen.add(k); q.push([n, d + 1]); } } } return null; }
  function spotScene(p, right) { const s = p.scene.map(x => Object.assign({}, x)); if (right) p.diffs.forEach(d => { const o = s[d.i]; Object.keys(d).forEach(k => { if (k !== 'i') o[k] = d[k]; }); }); return s; }
  function polyCells(base, spec) {
    let c = base.map(([x, y]) => [x, y]); if (spec.mirror) c = c.map(([x, y]) => [-x, y]);
    for (let r = 0; r < ((spec.rot || 0) / 90) % 4; r++) c = c.map(([x, y]) => [-y, x]);
    const mx = Math.min(...c.map(p => p[0])), my = Math.min(...c.map(p => p[1])); return c.map(([x, y]) => [x - mx, y - my]);
  }

  // ───────── outcomes: correctness alone isn’t enough
  const OUTCOMES = { sound: 'Correct, with sound reasoning', uncertain: 'Correct, but the reasoning check didn’t match', guessed: 'Correct, but you said you guessed', promising: 'Not solved, but your reasoning was on track', misread: 'Not solved: the key idea was missed', revealed: 'Solution revealed', solved: 'Solved' };
  function classify({ correct, keyOk, conf, revealed }) {
    if (revealed) return 'revealed';
    if (correct) { if (conf === 0) return 'guessed'; if (keyOk === false) return 'uncertain'; return keyOk == null ? 'solved' : 'sound'; }
    return keyOk ? 'promising' : 'misread';
  }

  // ───────── evidence for the Improvement Workshop
  const PZ_DETECT = [
    { id: 'pz-overreach', name: 'Concluding beyond the evidence', applies: e => (PZ[e.pid] || {}).tests && PZ[e.pid].tests.includes('evidence'), occurs: e => !!e.firstOverreach,
      explain: 'In puzzles where the evidence was insufficient or only partly conclusive, your first answer claimed more than the evidence supported.',
      why: 'A firm conclusion from incomplete evidence feels decisive but is often wrong. Saying exactly what the evidence does and doesn’t establish is the skill being tested.' },
    { id: 'pz-guess', name: 'Right answers without the reasoning', applies: e => !!(PZ[e.pid] || {}).key && e.solved, occurs: e => ['guessed', 'uncertain'].includes(e.outcome),
      explain: 'You reached correct answers, but either said you guessed or picked a different decisive idea from the one that actually settles the puzzle.',
      why: 'A correct answer you can’t justify won’t transfer to the next problem. Knowing why it’s right is what makes it repeatable.' }];
  function puzzleCandidates(plog, targets) {
    const out = [];
    PZ_DETECT.forEach(d => {
      const app = plog.filter(e => d.applies(e)).slice(-12); const occ = app.filter(e => d.occurs(e)); if (!occ.length) return;
      const rate = occ.length / app.length; const level = occ.length >= 4 && rate >= 0.4 && app.length >= 6 ? 'established' : occ.length >= 2 && rate >= 0.3 ? 'emerging' : occ.length >= 2 ? 'occasional' : 'single';
      const t = targets.find(x => x.key === d.id && x.state !== 'mastered'); if (t && t.state !== 'dismissed') return; if (t && occ.length <= (t.dismissedAt || 0)) return;
      out.push({ key: d.id, title: d.name, explain: d.explain, why: d.why, level, count: occ.length, of: app.length, rate, source: 'Puzzle Arena', needsConsent: level === 'single' || level === 'occasional', reopened: !!t,
        evidence: occ.slice(-3).reverse().map(e => ({ t: e.t, game: null, title: (PZ[e.pid] || {}).title, excerpt: (PZ[e.pid] || {}).title || e.pid, line: OUTCOMES[e.outcome] || (e.firstOverreach ? 'First answer went beyond the evidence' : ''), puzzleId: e.pid })),
        practise: PUZZLES.filter(p => d.applies({ pid: p.id, solved: true })).map(p => p.id) });
    });
    return out;
  }
  const pzOccurred = (key, e) => { const d = PZ_DETECT.find(x => x.id === key); if (!d || !d.applies(e)) return null; return !!d.occurs(e); };
  function pzSet(t, plog, phase, now) {
    const d = PZ_DETECT.find(x => x.id === t.key); const pool = PUZZLES.filter(p => d.applies({ pid: p.id, solved: true }));
    const used = new Set(t.practice.flatMap(s => s.games || [])); const solved = new Set(plog.filter(e => e.solved).map(e => e.pid));
    const rank = p => (phase === 'reassess' && used.has(p.id) ? 2 : 0) + (solved.has(p.id) ? 1 : 0);
    const pick = pool.slice().sort((a, b) => rank(a) - rank(b) || a.lvl - b.lvl).slice(0, phase === 'reassess' ? 2 : 3);
    const n = phase === 'reassess' ? t.reassess.length : t.practice.length;
    return { id: `imp-${phase === 'reassess' ? 'r' : 'p'}-${t.id}-${n}`, type: 'puzzleset', improve: { targetId: t.id, phase }, createdAt: now, items: pick.map(p => ({ game: p.id, pid: p.id, state: 'pending' })),
      objective: phase === 'reassess' ? 'A check in puzzles. Work as you normally would.' : `Targeted puzzles for “${t.title}”.` };
  }

  const api = { CATS, CAT, PUZZLES, PZ, NONE, CONTRA, OUTCOMES, check, checkAnswer, numberIn, optimum, perms, nimMove, hanoiStart, hanoiMove, hanoiDone, jugsDo, jugsMin, spotScene, polyCells, classify, PZ_DETECT, puzzleCandidates, pzOccurred, pzSet };
  if (isNode) module.exports = api; else root.MWPZ = api;
})(this);
