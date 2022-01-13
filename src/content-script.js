const board = [
  ...document.querySelector('game-app').shadowRoot.querySelectorAll(`game-row`),
].map((node) =>
  [...node.shadowRoot.querySelectorAll('game-tile')].map((node) => ({
    letter: node.getAttribute('letter'),
    evaluation: node.getAttribute('evaluation'),
  }))
);

const CORRECT = 0;
const PRESENT = 1;
const ABSENT = 2;

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

    let minEv = 1;
    let bestWord = null;
    for (const a of words) {
      const counts = {};
      for (const b of words) {
        const evals = [];
        for (let i = 0; i < b.length; i++) {
          evals.push(
            b[i] === a[i] ? CORRECT : a.includes(b[i]) ? PRESENT : ABSENT
          );
          const key = evals.join('');
          counts[key] = (counts[key] ?? 0) + 1;
        }
      }

      let ev = 0;
      for (let i = 0; i < 3 ** 5; i++) {
        const key = i.toString(3).padStart(5, '0');
        let product = 1;
        for (let j = 0; j < 5; j++) {
          product *= (counts[key.slice(0, j + 1)] ?? 0) / words.length;
        }
        ev += product;
      }

      if (ev <= minEv) {
        minEv = ev;
        bestWord = a;
      }
    }
    console.log(bestWord);
  });
