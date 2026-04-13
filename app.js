import { words } from './words.js';

// ─── State ───────────────────────────────────────────────────────────────────
const state = {
  players: [],           // [{ name, score }]
  currentPlayerIdx: 0,
  round: 1,
  turnScore: 0,
  usedIds: new Set(),
  currentWord: null,
  timerInterval: null,
  timeLeft: 60,
  gameRunning: false,
};

// ─── DOM Refs ─────────────────────────────────────────────────────────────────
const screens = {
  setup:    document.getElementById('screen-setup'),
  intro:    document.getElementById('screen-intro'),
  play:     document.getElementById('screen-play'),
  turnEnd:  document.getElementById('screen-turn-end'),
  gameOver: document.getElementById('screen-game-over'),
};

// Setup
const playerCountBtns = document.querySelectorAll('.count-btn');
const playerNamesDiv   = document.getElementById('player-names');
const playerNamesLabel = document.getElementById('player-names-label');
const startBtn         = document.getElementById('btn-start');

// Intro
const introSubtitle   = document.getElementById('intro-subtitle');
const readyBtn        = document.getElementById('btn-ready');

// Play
const playRoundLabel  = document.getElementById('play-round-label');
const playPlayerName  = document.getElementById('play-player-name');
const playScoreBadge  = document.getElementById('play-score-badge');
const wordText        = document.getElementById('word-text');
const diffBadge       = document.getElementById('difficulty-badge');
const timerNumber     = document.getElementById('timer-number');
const timerProgress   = document.getElementById('timer-progress');
const timerWrap       = document.getElementById('timer-wrap');
const btnNext         = document.getElementById('btn-next');
const btnSkip         = document.getElementById('btn-skip');

// Turn End
const turnResultIcon  = document.getElementById('turn-result-icon');
const turnScoreBig    = document.getElementById('turn-score-big');
const turnScoreLabel  = document.getElementById('turn-score-label');
const scoreboardEl    = document.getElementById('scoreboard');
const nextTurnBtn     = document.getElementById('btn-next-turn');

// Game Over
const winnerSection   = document.getElementById('winner-section');
const gameOverTitle   = document.getElementById('game-over-title');
const winnerName      = document.getElementById('winner-name');
const finalScoreEl    = document.getElementById('final-score');
const finalScoreLabel = document.getElementById('final-score-label');
const finalScoreboard = document.getElementById('final-scoreboard');
const playAgainBtn    = document.getElementById('btn-play-again');

// Timer ring math
const TIMER_DURATION = 60;
const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
timerProgress.style.strokeDasharray = CIRCUMFERENCE;

// ─── Screen Navigation ────────────────────────────────────────────────────────
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
  // Scroll to top on screen change
  window.scrollTo(0, 0);
}

// ─── Setup Screen ─────────────────────────────────────────────────────────────
let selectedPlayerCount = 1;

playerCountBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    selectedPlayerCount = parseInt(btn.dataset.count, 10);
    playerCountBtns.forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    renderNameInputs();
  });
});

function renderNameInputs() {
  playerNamesDiv.innerHTML = '';
  if (selectedPlayerCount === 1) {
    playerNamesLabel.classList.add('hidden');
    playerNamesDiv.classList.add('hidden');
  } else {
    playerNamesLabel.classList.remove('hidden');
    playerNamesDiv.classList.remove('hidden');
    for (let i = 0; i < selectedPlayerCount; i++) {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'name-input';
      input.placeholder = `Player ${i + 1} name`;
      input.autocomplete = 'off';
      input.autocorrect = 'off';
      input.maxLength = 20;
      playerNamesDiv.appendChild(input);
    }
  }
}

startBtn.addEventListener('click', () => {
  const nameInputs = playerNamesDiv.querySelectorAll('.name-input');
  const players = [];

  if (selectedPlayerCount === 1) {
    players.push({ name: 'Player', score: 0 });
  } else {
    for (let i = 0; i < nameInputs.length; i++) {
      const name = nameInputs[i].value.trim() || `Player ${i + 1}`;
      players.push({ name, score: 0 });
    }
  }

  state.players = players;
  state.currentPlayerIdx = 0;
  state.round = 1;
  state.usedIds = new Set();
  state.turnScore = 0;

  goToIntro();
});

// ─── Round Intro Screen ───────────────────────────────────────────────────────
function goToIntro() {
  const player = state.players[state.currentPlayerIdx];
  const isSolo = state.players.length === 1;

  if (isSolo) {
    introSubtitle.textContent = "Tap when you're ready to see your word — make sure everyone else is watching!";
    document.getElementById('intro-heading').textContent = "Ready to Sound?";
  } else {
    introSubtitle.textContent = `Pass the phone to ${player.name}. Don't show anyone else the screen!`;
    document.getElementById('intro-heading').textContent = `${player.name}'s turn!`;
  }

  showScreen('intro');
}

readyBtn.addEventListener('click', startTurn);

// ─── Playing Screen ───────────────────────────────────────────────────────────
function startTurn() {
  state.turnScore = 0;
  state.timeLeft = TIMER_DURATION;
  state.gameRunning = true;

  const player = state.players[state.currentPlayerIdx];
  const isSolo = state.players.length === 1;

  playRoundLabel.textContent = `Round ${state.round}`;
  playPlayerName.textContent = isSolo ? 'Solo' : player.name;
  playScoreBadge.textContent = `${player.score} pts`;

  showScreen('play');
  loadNextWord();
  startTimer();
}

function loadNextWord() {
  const word = pickWord();
  if (!word) {
    // Deck exhausted — reset used IDs and try again
    state.usedIds.clear();
    const fallback = pickWord();
    if (!fallback) return; // genuinely empty word bank
    showWord(fallback);
    return;
  }
  showWord(word);
}

function showWord(word) {
  state.currentWord = word;
  wordText.textContent = word.text;

  const tierNames = { 1: 'Easy', 2: 'Medium', 3: 'Hard', 4: 'Expert' };
  diffBadge.textContent = tierNames[word.tier];
  diffBadge.className = `difficulty-badge tier-${word.tier}`;

  // Restart card animation
  wordText.closest('.word-card').style.animation = 'none';
  requestAnimationFrame(() => {
    wordText.closest('.word-card').style.animation = '';
  });

  updateScoreBadge();
}

function pickWord() {
  const round = state.round;

  // Tier weights: round 1 = all easy, grows harder each round
  const weights = {
    1: Math.max(0, 5 - (round - 1)),
    2: 2 + Math.min(2, round - 1),
    3: Math.max(0, round - 1) * 2,
    4: Math.max(0, round - 3) * 2,
  };

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  if (totalWeight === 0) return null;

  let rand = Math.random() * totalWeight;
  let selectedTier = 1;
  for (const [tier, weight] of Object.entries(weights)) {
    rand -= weight;
    if (rand <= 0) { selectedTier = parseInt(tier, 10); break; }
  }

  const available = words.filter(w => w.tier === selectedTier && !state.usedIds.has(w.id));
  if (available.length === 0) {
    // Fall back to any unused word
    const anyAvailable = words.filter(w => !state.usedIds.has(w.id));
    if (anyAvailable.length === 0) return null;
    return anyAvailable[Math.floor(Math.random() * anyAvailable.length)];
  }

  return available[Math.floor(Math.random() * available.length)];
}

function updateScoreBadge() {
  const player = state.players[state.currentPlayerIdx];
  playScoreBadge.textContent = `${player.score + state.turnScore} pts`;
}

// ─── Timer ────────────────────────────────────────────────────────────────────
function startTimer() {
  updateTimerDisplay(TIMER_DURATION);
  clearInterval(state.timerInterval);
  state.timerInterval = setInterval(() => {
    state.timeLeft--;
    updateTimerDisplay(state.timeLeft);
    if (state.timeLeft <= 0) {
      clearInterval(state.timerInterval);
      endTurn();
    }
  }, 1000);
}

function updateTimerDisplay(t) {
  timerNumber.textContent = t;
  const fraction = t / TIMER_DURATION;
  const offset = CIRCUMFERENCE * (1 - fraction);
  timerProgress.style.strokeDashoffset = offset;

  const urgent = t <= 10;
  timerProgress.classList.toggle('urgent', urgent);
  timerNumber.classList.toggle('urgent', urgent);
  timerWrap.classList.toggle('urgent', urgent);
}

function stopTimer() {
  clearInterval(state.timerInterval);
  state.gameRunning = false;
}

// ─── Next / Skip ──────────────────────────────────────────────────────────────
btnNext.addEventListener('click', () => {
  if (!state.gameRunning || !state.currentWord) return;
  state.usedIds.add(state.currentWord.id);
  state.turnScore++;
  updateScoreBadge();
  loadNextWord();
});

btnSkip.addEventListener('click', () => {
  if (!state.gameRunning || !state.currentWord) return;
  // Skip: don't mark as used so it can come back, just move on
  loadNextWord();
});

// ─── End Turn ─────────────────────────────────────────────────────────────────
function endTurn() {
  stopTimer();

  const player = state.players[state.currentPlayerIdx];
  player.score += state.turnScore;

  renderTurnEnd();
  showScreen('turnEnd');
}

function renderTurnEnd() {
  const player = state.players[state.currentPlayerIdx];
  const isSolo = state.players.length === 1;
  const isLastPlayer = state.currentPlayerIdx === state.players.length - 1;

  turnScoreBig.textContent = `+${state.turnScore}`;
  turnResultIcon.textContent = state.turnScore > 0 ? '🎉' : '😅';
  turnScoreLabel.textContent = state.turnScore === 1
    ? '1 word guessed!'
    : `${state.turnScore} words guessed!`;

  // Scoreboard
  if (isSolo) {
    scoreboardEl.classList.add('hidden');
    nextTurnBtn.textContent = 'Play Again Round';
  } else {
    scoreboardEl.classList.remove('hidden');
    renderScoreboard(scoreboardEl, state.currentPlayerIdx);

    // Determine what happens next
    if (isLastPlayer) {
      const nextRound = state.round + 1;
      nextTurnBtn.textContent = `Start Round ${nextRound} →`;
    } else {
      const nextPlayer = state.players[state.currentPlayerIdx + 1];
      nextTurnBtn.textContent = `Pass to ${nextPlayer.name} →`;
    }
  }
}

nextTurnBtn.addEventListener('click', () => {
  const isSolo = state.players.length === 1;
  const isLastPlayer = state.currentPlayerIdx === state.players.length - 1;

  if (isSolo) {
    state.round++;
    goToIntro();
    return;
  }

  if (isLastPlayer) {
    state.round++;
    state.currentPlayerIdx = 0;
  } else {
    state.currentPlayerIdx++;
  }

  goToIntro();
});

// ─── Game Over ────────────────────────────────────────────────────────────────
// (Triggered manually via a "End Game" option — or we can add a max rounds later)
// For now, game runs until players decide to stop using "End Game" button.

function renderScoreboard(container, highlightIdx) {
  container.innerHTML = '';
  const sorted = [...state.players]
    .map((p, i) => ({ ...p, idx: i }))
    .sort((a, b) => b.score - a.score);

  sorted.forEach(player => {
    const row = document.createElement('div');
    row.className = 'scoreboard-row' + (player.idx === highlightIdx ? ' current-player' : '');
    row.innerHTML = `
      <span class="scoreboard-name">
        ${player.name}
        ${player.idx === highlightIdx ? '<span class="current-badge">just played</span>' : ''}
      </span>
      <span class="scoreboard-score">${player.score}</span>
    `;
    container.appendChild(row);
  });
}

// End Game button
document.getElementById('btn-end-game').addEventListener('click', () => {
  stopTimer();
  // Commit any in-progress turn score
  const player = state.players[state.currentPlayerIdx];
  player.score += state.turnScore;
  showGameOver();
});

function showGameOver() {
  const isSolo = state.players.length === 1;

  if (isSolo) {
    winnerSection.classList.add('hidden');
    gameOverTitle.textContent = "Game Over!";
    finalScoreEl.textContent = state.players[0].score;
    finalScoreLabel.textContent = 'total words guessed';
    finalScoreboard.classList.add('hidden');
  } else {
    winnerSection.classList.remove('hidden');
    finalScoreboard.classList.remove('hidden');
    finalScoreLabel.classList.add('hidden');

    const sorted = [...state.players].sort((a, b) => b.score - a.score);
    const winner = sorted[0];
    const isTie = sorted[1] && sorted[1].score === winner.score;

    if (isTie) {
      gameOverTitle.textContent = "It's a tie!";
      winnerName.textContent = sorted.filter(p => p.score === winner.score).map(p => p.name).join(' & ');
      finalScoreEl.textContent = winner.score;
    } else {
      gameOverTitle.textContent = "Winner!";
      winnerName.textContent = winner.name;
      finalScoreEl.textContent = winner.score;
    }

    renderScoreboard(finalScoreboard, -1);
  }

  showScreen('gameOver');
}

playAgainBtn.addEventListener('click', () => {
  // Full reset
  state.players.forEach(p => { p.score = 0; });
  state.currentPlayerIdx = 0;
  state.round = 1;
  state.usedIds = new Set();
  state.turnScore = 0;
  showScreen('setup');
});

// ─── Init ─────────────────────────────────────────────────────────────────────
// Select 1 player by default
document.querySelector('.count-btn[data-count="1"]').classList.add('selected');
renderNameInputs();
showScreen('setup');
