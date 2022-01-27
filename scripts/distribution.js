import fs from 'fs';

import { getTiles, processBoard } from '../src/js/solver.js';

const allWords = JSON.parse(
  fs.readFileSync('../src/assets/wordlist.json', 'utf8')
);

const allEvs = JSON.parse(fs.readFileSync('../src/assets/evs.json', 'utf8'));

const nGuessesMap = {};
outer: for (const answer of allWords) {
  const board = [];
  let guess = 'raise';
  let nGuesses = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let tiles = getTiles(guess, answer);
    if (tiles.every((t) => t === 'correct')) {
      nGuessesMap[answer] = nGuesses;
      continue outer;
    }
    let row = [];
    for (let i = 0; i < 5; i++) {
      row.push({ letter: guess[i], evaluation: tiles[i] });
    }
    board.push(row);

    const { bestWords } = processBoard(board, allWords, allEvs);
    guess = bestWords[0];
    nGuesses++;
  }
}

console.log('nGuessesMap:', nGuessesMap);

const nGuesses = Object.values(nGuessesMap);
console.log('Average:', nGuesses.reduce((acc, n) => acc + n) / nGuesses.length);

const distribution = {};
for (const n of nGuesses) {
  distribution[n] = (distribution[n] ?? 0) + 1;
}
console.log(`Distribution:
# guesses  # words
${Object.entries(distribution)
  .map((entry) => entry.map((n) => n.toString().padStart(7, ' ')).join('   '))
  .join('\n')}`);
