import fs from 'fs';

import { getTiles, processBoard } from '../src/js/solver.js';

const allWords = JSON.parse(
  fs.readFileSync('../src/assets/wordlist.json', 'utf8')
);

const allMaxWordsRemaining = JSON.parse(
  fs.readFileSync('../src/assets/max-words-remaining.json', 'utf8')
);

// calculate distributions for the 10 best words
for (const firstGuess of Object.keys(allMaxWordsRemaining).slice(0, 10)) {
  console.log(`First guess: ${firstGuess}`);
  const nGuessesMap = {};
  for (const answer of allWords) {
    const board = [];
    let guess = firstGuess;
    let nGuesses = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      let tiles = getTiles(guess, answer);
      if (tiles.every((t) => t === 'correct')) {
        nGuessesMap[answer] = nGuesses;
        break;
      }
      let row = [];
      for (let i = 0; i < 5; i++) {
        row.push({ letter: guess[i], evaluation: tiles[i] });
      }
      board.push(row);

      const { bestWords } = processBoard(board, allWords, allMaxWordsRemaining);
      guess = bestWords[0];
      nGuesses++;
    }
  }

  const nGuesses = Object.values(nGuessesMap);
  const distribution = {};
  for (const n of nGuesses) {
    distribution[n] = (distribution[n] ?? 0) + 1;
  }
  console.log(`# guesses  # words
${Object.entries(distribution)
  .map((e) => e.map((n) => n.toString().padStart(9, ' ')).join(''))
  .join('\n')}
Average: ${nGuesses.reduce((acc, n) => acc + n) / nGuesses.length}
`);
}
