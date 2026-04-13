# What The Sound! — Game Plan

## Overview

**What The Sound!** is a browser-based party game inspired by Taboo. Instead of describing a word verbally, the active player must use *only sounds* (no words, humming, singing lyrics, mouthing, or gestures) to get their team to guess the displayed word or phrase.

- 60 seconds per turn
- Words grow progressively harder as the game advances
- Two primary actions: **Next** (correct guess, score a point) and **Skip** (pass, no point)
- Fully client-side SPA — no backend required
- Hosted on GitHub Pages

---

## Game Rules (in-app)

1. One player is the "Sounder" — they see the word, everyone else guesses.
2. The Sounder may only make **sounds** — no words, humming a song's lyrics, mouthing, or pointing.
3. Press **Next** when the team guesses correctly (earns 1 point).
4. Press **Skip** to pass on a word (no point, card goes to bottom of deck).
5. Timer is 60 seconds. When it expires, the turn ends.
6. Play passes clockwise. First team to reach the target score wins (or most points after N rounds).

---

## Architecture

### Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Vanilla JS (ES Modules) | Zero build step, deploy directly to GitHub Pages |
| Styling | CSS custom properties + Flexbox/Grid | No dependencies, fast, responsive |
| Hosting | GitHub Pages (static branch) | Free, simple `gh-pages` branch deploy |
| State | In-memory JS objects | No persistence needed mid-game |
| Word bank | Bundled JS array | No network requests, offline-capable |

### File Structure

```
whatTheSound/
├── index.html          # Single HTML entry point
├── style.css           # All styles
├── app.js              # Main game logic + state machine
├── words.js            # Word bank (exported array, difficulty-tagged)
├── plan.md             # This file
└── .github/
    └── workflows/
        └── deploy.yml  # GitHub Actions — push to main → deploy to gh-pages
```

### State Machine

```
SETUP → ROUND_INTRO → PLAYING → TURN_END → [ROUND_END] → [GAME_OVER]
                         ↑____________↓  (next player's turn)
```

States:
- **SETUP** — team/player names, target score, number of rounds
- **ROUND_INTRO** — "Pass the device to [Player]" screen (hides the word)
- **PLAYING** — word displayed, timer running, Next/Skip active
- **TURN_END** — shows score earned this turn, "Pass to next player" prompt
- **ROUND_END** — leaderboard after all players complete a round
- **GAME_OVER** — final winner screen with full score history

---

## Word Bank Design

Words are tagged with a difficulty tier (1–4). The game starts drawing from tier 1 and unlocks harder tiers as the round count increases.

| Tier | Difficulty | Examples | Unlocked at |
|---|---|---|---|
| 1 | Easy | dog, rain, car, sneeze, baby | Round 1 |
| 2 | Medium | thunderstorm, motorcycle, crowd cheering | Round 2 |
| 3 | Hard | heartbeat, pressure, electricity, jungle | Round 3 |
| 4 | Expert | rollercoaster, jackhammer, earthquake, avalanche | Round 4+ |

Tier weighting per round: earlier rounds draw mostly low tiers; later rounds skew heavier toward high tiers. A simple weighted random draw handles this.

Word count target: ~40 words per tier (160 total) — enough for a long party session before repeating.

---

## UI / UX Screens

### 1. Setup Screen
- Game title + tagline
- "How to Play" expandable section
- Number of players selector (1–8)
- **If 1 player:** "Start Game" goes directly to playing (score tracked, no name entry needed)
- **If 2+ players:** Name entry fields appear, then "Start Game" begins round-robin with score tracking
- One phone passed around — Round Intro screen hides the word between turns

### 2. Round Intro Screen
- Large "Pass to [Player Name]" message
- "I'm Ready" button (reveals the word)
- Prevents previous guesser from seeing the word

### 3. Playing Screen (main game screen)
- **Top bar**: current player name, round number, score
- **Center**: large word display
- **Bottom bar**: 60-second circular progress timer
- **Action buttons**: Skip (left, muted) | Next (right, bold green)
- Subtle difficulty badge on the word card

### 4. Turn End Screen
- Points earned this turn
- Running totals for all players/teams
- "Pass to [Next Player]" button

### 5. Game Over Screen
- Winner announcement
- Full scoreboard
- "Play Again" button

---

## Difficulty Progression — Technical Detail

```js
function pickWord(roundNumber, usedIds) {
  // Weight distribution shifts with round number
  const weights = {
    1: Math.max(0, 5 - roundNumber),
    2: 3,
    3: Math.min(5, roundNumber),
    4: Math.max(0, roundNumber - 2),
  };
  const tier = weightedRandom(weights);
  return randomFrom(wordBank.filter(w => w.tier === tier && !usedIds.has(w.id)));
}
```

Used word IDs are tracked per session so words don't repeat until the deck is exhausted.

---

## GitHub Pages Deployment

### Manual (initial)
1. Push all files to `main` branch
2. Enable GitHub Pages → Source: `main` branch, root `/`

### Automated (GitHub Actions)
```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./
```

Since this is pure static HTML/CSS/JS with no build step, the deploy workflow just copies the repo root to the `gh-pages` branch.

---

## Build Steps

### Phase 1 — Foundation
- [x] `plan.md`
- [ ] `index.html` — shell with all screen divs, script/style links
- [ ] `style.css` — CSS custom properties, layout, responsive design, button styles, timer ring

### Phase 2 — Word Bank
- [ ] `words.js` — 160 words across 4 tiers, exported as ES module array

### Phase 3 — Game Logic
- [ ] `app.js` — state machine, timer, scoring, word picker, screen transitions
  - State transitions
  - 60s countdown with CSS animation
  - Next / Skip handlers
  - Turn end / round end detection
  - Game over detection

### Phase 4 — Polish
- [ ] Animations: word card flip in, timer pulse at 10s, confetti on game over
- [ ] Sound cues (optional — ironic for this game): tick sound near timer end, success chime on Next
- [ ] Responsive design testing (mobile-first, since players pass a phone)
- [ ] Accessibility: large tap targets, high contrast, readable font sizes

### Phase 5 — Deploy
- [ ] Initialize git repo
- [ ] Push to GitHub
- [ ] Configure GitHub Pages
- [ ] Add GitHub Actions workflow
- [ ] Verify live URL

---

## Stretch Goals (post-launch)
- Custom word lists (user can add their own words)
- "Hot seat" mode — single player vs. the clock, no teams
- QR code screen so guests can join and see the score on their phone
- PWA manifest for "Add to Home Screen" on mobile
