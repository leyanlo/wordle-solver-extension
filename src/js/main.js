import { processBoard } from './solver.js';

export function main() {
  const gameRows = document
    .querySelector('game-app')
    .shadowRoot.querySelectorAll(`game-row`);
  let rowOffsets = [...gameRows].map((rowNode) => ({
    top: rowNode.offsetTop,
    left: rowNode.offsetLeft,
    width: rowNode.offsetWidth,
    height: rowNode.offsetHeight,
  }));
  const observer = new MutationObserver(onEval);
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
      rowOffsets = [...gameRows].map((rowNode) => ({
        top: rowNode.offsetTop,
        left: rowNode.offsetLeft,
        width: rowNode.offsetWidth,
        height: rowNode.offsetHeight,
      }));

      for (let i = 0; i < gameRows.length; i++) {
        const clue = document.getElementById(`clue-${i}`);
        if (!clue) {
          break;
        }

        setStyleProperties(clue, i);
      }
    });

    // init wordlists and preprocessed data, and call onEval
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

  function onEvalBoard(boardState, evaluations, rowIdx, hardMode) {
    const clueId = `clue-${rowIdx}`;
    if (
      document.getElementById(clueId) ||
      evaluations[rowIdx - 1]?.every((e) => e === 'correct')
    ) {
      return;
    }

    const { words, sortedEvEntries, minEv, bestWords } = processBoard(
      boardState,
      evaluations,
      rowIdx,
      hardMode,
      allWords,
      allEvs
    );

    const clueGuess = `Best guess: ${bestWords
      .map((w) => `<strong>${w}</strong>`)
      .join(' or ')} (<abbr title="expected value">EV</abbr> = ${minEv.toFixed(
      1
    )})`;
    const clueGuessTitle = new DOMParser().parseFromString(
      clueGuess,
      'text/html'
    ).body.textContent;
    const clueStats =
      words.length === 1
        ? `1 word is possible.`
        : `${words.length} words are possible.`;

    console.log(`${clueGuessTitle}. ${clueStats}`);

    const clue = document.createElement('div');
    clue.id = clueId;
    clue.className = 'clue';
    setStyleProperties(clue, rowIdx);
    clue.innerHTML = `
<p class="clue-guess" title="${clueGuessTitle}">${clueGuess}</p>
<details open>
  <summary>${clueStats}</summary>
  <ul class="clue-list">
    ${sortedEvEntries
      .filter(([w]) => words.includes(w))
      .map(
        ([w, ev]) => `
          <li>
            <strong>${w}</strong>
            (EV = ${ev.toFixed(1)})
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
    const { boardState, evaluations, hardMode } = JSON.parse(
      localStorage['nyt-wordle-state']
    );

    for (let i = 0; i <= boardState.filter(Boolean).length; i++) {
      onEvalBoard(boardState, evaluations, i, hardMode);
    }
  }
}
