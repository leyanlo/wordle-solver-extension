const fs = require('fs');

let words = JSON.parse(
  fs.readFileSync('./assets/5-letter-words.json', 'utf-8')
);

function isExclusive(a, b) {
  return a.split('').every((char) => !b.includes(char));
}

// const correct = [null, null, 'e', null, null];
// const absent = 'toas'.split('');
// const correct = [null, null, 'e', null, null];
// const present = 'y'.split('');
// const absent = 'toasild'.split('');
// const correct = [null, null, 'e', null, 'y'];
// const absent = [['t', 'w'], ['o', 'i', 'e'], [], ['a', 'l', 'p'], ['s', 'd']];
// const present = 'y'.split('');
const correct = Array(5).fill(null);
const absent = [];
const present = [];

words = words.filter(
  (word) =>
    word
      .split('')
      .every((char, i) =>
        correct[i] ? correct[i] === char : !absent.includes(char)
      ) && present.every((char) => word.includes(char))
);

let minExclusives = words.length;
let bestWord = null;
outer: for (const a of words) {
  let nExclusives = 0;
  for (const b of words) {
    if (isExclusive(a, b)) {
      nExclusives++;
      if (nExclusives > minExclusives) {
        continue outer;
      }
    }
  }
  minExclusives = nExclusives;
  bestWord = a;
}
console.log(bestWord);

// document
//   .querySelector('game-app')
//   .shadowRoot.querySelector(`game-row[letters='${bestWord}']`)
//   .shadowRoot.querySelectorAll('game-tile')
//   .forEach((tile, i) => {
//     switch (tile.getAttribute('evaluation')) {
//       case 'correct':
//         correct[i] = bestWord[i];
//         break;
//       case 'present':
//         present.push(bestWord[i]);
//         break;
//       case 'absent':
//         absent.push(bestWord[i]);
//     }
//   });
