const gameRows = document
  .querySelector('game-app')
  .shadowRoot.querySelectorAll(`game-row`);
const rowOffsets = [...gameRows].map((rowNode) => ({
  top: rowNode.offsetTop,
  left: rowNode.offsetLeft,
  width: rowNode.offsetWidth,
  height: rowNode.offsetHeight,
}));
const observer = new MutationObserver(() => onEval());
let allWords = [];
let allEvs = {};

function setStyleProperties(clue, rowIdx) {
  clue.style.setProperty('--clue-top', rowOffsets[rowIdx].top + 'px');
  clue.style.setProperty('--clue-first-top', rowOffsets[0].top + 'px');
  clue.style.setProperty(
    '--clue-left',
    rowOffsets[rowIdx].left + rowOffsets[rowIdx].width + 'px'
  );
  clue.style.setProperty('--clue-height', rowOffsets[rowIdx].height + 'px');
  clue.style.setProperty('--clue-z-index', (5 - rowIdx).toString());
}

function init() {
  // add observer to each row
  for (const rowNode of gameRows) {
    const tileNode = rowNode.shadowRoot.querySelector('game-tile');
    observer.observe(tileNode, {
      attributeFilter: ['evaluation'],
    });
  }

  // update clue positions on resize
  window.addEventListener('resize', () => {
    const rowOffsets = [...gameRows].map((rowNode) => ({
      top: rowNode.offsetTop,
      left: rowNode.offsetLeft,
      width: rowNode.offsetWidth,
      height: rowNode.offsetHeight,
    }));

    for (let i = 0; i < 6; i++) {
      const clue = document.getElementById(`clue-${i}`);
      if (!clue) {
        break;
      }

      setStyleProperties(clue, i);
    }
  });

  // init allWords and variances, and call onEval
  Promise.all([
    fetch(chrome.runtime.getURL('assets/wordlist.json')).then((response) =>
      response.json()
    ),
    fetch(chrome.runtime.getURL('assets/evs.json')).then((response) =>
      response.json()
    ),
  ]).then(([wordlist, evs]) => {
    allWords = wordlist;
    allEvs = evs;
    onEval();
  });
}
init();

function getTiles(a, b) {
  const evals = Array(5).fill('⬛️');
  const counts = [...a].reduce((acc, char) => {
    acc[char] = (acc[char] ?? 0) + 1;
    return acc;
  }, {});
  const wrongIndexes = [];

  for (let i = 0; i < 5; i++) {
    if (b[i] === a[i]) {
      evals[i] = '🟩';
      counts[b[i]]--;
    } else {
      wrongIndexes.push(i);
    }
  }

  for (const i of wrongIndexes) {
    if (counts[b[i]]) {
      evals[i] = '🟨';
      counts[b[i]]--;
    }
  }

  return evals.join('');
}

function onEvalBoard(board, rowIdx) {
  const clueId = `clue-${rowIdx}`;
  if (
    document.getElementById(clueId) ||
    board[board.length - 1]?.every(({ evaluation }) => evaluation === 'correct')
  ) {
    return;
  }

  const correct = Array(5).fill(null);
  const present = [...Array(5)].map(() => []);
  const absent = [...Array(5)].map(() => []);

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
          absent[i].push(letter);
          break;
        default:
          // end of rows
          break outer;
      }
    }
  }

  const words = allWords.filter(
    (word) =>
      word
        .split('')
        .every((char, i) =>
          correct[i]
            ? correct[i] === char
            : !present[i].includes(char) &&
              !absent[i].includes(char) &&
              (!absent.flat().includes(char) || present.flat().includes(char))
        ) && present.flat().every((char) => word.includes(char))
  );

  let evs = {};
  if (words.length === 0) {
    // this shouldn’t happen
    return;
  } else if (words.length === 1) {
    // avoid computation if one word remaining
    evs = {
      [words[0]]: 1,
    };
  } else if (words.length === allWords.length) {
    // avoid computation if it’s the first guess
    evs = allEvs;
  } else {
    for (const a of allWords) {
      const counts = {};
      for (const b of words) {
        const tiles = getTiles(a, b);
        counts[tiles] = (counts[tiles] ?? 0) + 1;
      }
      evs[a] =
        Object.keys(counts)
          .map((key) => counts[key] ** 2)
          .reduce((acc, n) => acc + n) / words.length;
    }
  }
  const sortedEvEntries = Object.entries(evs).sort(([, a], [, b]) => a - b);
  const minEv = sortedEvEntries[0][1];
  const bestWords = sortedEvEntries
    .filter(([, ev]) => ev === minEv)
    .map(([w]) => w);

  const clueGuess = `Best guess: ${bestWords
    .map((w) => `<strong>${w}</strong>`)
    .join(' or ')} (<abbr title="expected value">EV</abbr> = ${minEv.toFixed(
    1
  )})`;
  const clueStats =
    words.length === 1
      ? `1 word is possible.`
      : `${words.length} words are possible.`;

  const clue = document.createElement('p');
  clue.id = clueId;
  clue.className = 'clue';
  setStyleProperties(clue, rowIdx);
  clue.innerHTML = `
${clueGuess}
<br />
<details open>
  <summary>${clueStats}</summary>
  <ul class="clue-evs">
    ${sortedEvEntries
      .map(
        ([w, ev]) => `
          <li>
            <strong>${w}</strong>
            (<abbr title="expected value">EV</abbr> = ${ev.toFixed(1)})
          </li>`
      )
      .join('')}
  </ul>
</details>`;
  document.body.appendChild(clue);

  // close previous clues
  for (let i = 0; i < rowIdx; i++) {
    const clue = document.getElementById(`clue-${i}`);
    clue.querySelector('details').removeAttribute('open');
  }
}

function onEval() {
  const board = [];
  outer: for (let i = 0; i < gameRows.length; i++) {
    onEvalBoard(board, i);
    const rowNode = gameRows[i];
    const row = [];
    for (const tileNode of rowNode.shadowRoot.querySelectorAll('game-tile')) {
      const letter = tileNode.getAttribute('letter');
      const evaluation = tileNode.getAttribute('evaluation');
      if (!evaluation) {
        break outer;
      }
      row.push({ letter, evaluation });
    }
    board.push(row);
  }
}
