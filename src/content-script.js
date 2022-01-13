const board = [
  ...document.querySelector('game-app').shadowRoot.querySelectorAll(`game-row`),
].map((node) =>
  [...node.shadowRoot.querySelectorAll('game-tile')].map((node) => ({
    letter: node.getAttribute('letter'),
    evaluation: node.getAttribute('evaluation'),
  }))
);

const correct = Array(5).fill(null);
const present = [...Array(5)].map(() => []);
const absent = [];

outer: for (const row of board) {
  for (let i = 0; i < row.length; i++) {
    const { letter, evaluation } = row[i];
    switch (evaluation) {
      case 'correct':
        correct[i] = letter;
        break;
      case 'present':
        present[i].push(letter);
        break;
      case 'absent':
        absent.push(letter);
        break;
      default:
        // end of rows
        break outer;
    }
  }
}

function isExclusive(a, b) {
  return a.split('').every((char) => !b.includes(char));
}

fetch(chrome.runtime.getURL('assets/wordlist.json'))
  .then((response) => response.json())
  .then((words) => {
    words = words.filter(
      (word) =>
        word
          .split('')
          .every((char, i) =>
            correct[i]
              ? correct[i] === char
              : !present[i].includes(char) && !absent.includes(char)
          ) && present.flat().every((char) => word.includes(char))
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
  });
