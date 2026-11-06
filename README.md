# Quiz Maker BD

An offline, bilingual (English / বাংলা) web app where you **author your own
multiple-choice quizzes and play them**. No accounts, no server, no network
requests — everything lives in your browser's localStorage.

This is an **authoring tool + player for user-created quizzes**, not a fixed
question bank. It ships with one labelled starter quiz
("Bangladesh GK Starter", 10 hand-checked facts) so you can play immediately,
then build your own.

## Problem

Existing quiz apps in this family (fixed question banks) let you play, but not
create. Teachers, students, and families in Bangladesh who want a quick
custom quiz — for a class revision, a family game night, or a study group —
had no simple offline tool in Bangla and English to write questions, play
them with a timer, and keep their best scores.

## Features

- **Library** — all your quizzes in one place. Search by title, filter by
  category chips. Each card shows title, category, question count, best
  score, and Play / Edit / Duplicate / Delete (two-click confirm) actions.
  Empty states for "no quizzes yet" and "no search matches".
- **Builder** — create or edit a quiz: title (required), optional
  description, category (8 presets + custom "Other"), per-question time
  limit (0 = no limit, otherwise 10–300 seconds). Per-question editor with
  question text, 4 options, a correct-answer radio, optional explanation,
  and up / down / remove controls. Inline validation errors; the whole quiz
  is validated on save (title required, at least 2 questions, every question
  valid) with a toast on success.
- **Player** — one question at a time with a progress bar and "Q 3 of 10"
  counter. Optional per-question countdown: on timeout the answer is marked
  wrong and play auto-advances. Clicking an option locks it in, highlights
  correct/incorrect, and shows the explanation. Results screen with score,
  percentage, grade message, and a per-question review (your answer vs the
  correct answer). Best score per quiz is saved in localStorage.
- **Data** — export all quizzes as one JSON download; import a Quiz Maker BD
  JSON file with strict validation (malformed JSON, wrong app tag, missing
  fields, duplicate options, bad correct index, duplicate ids are all
  rejected with an inline error and your data left intact); typed-DELETE
  erase-all.
- **Bilingual** — EN/বাংলা toggle persisted in localStorage, with Bengali
  digits for numbers in Bangla mode.
- **Starter quiz** — "Bangladesh GK Starter": 10 hand-checked, well-known
  facts (capital Dhaka, national fish hilsa, national flower shapla,
  Independence Day 26 March 1971, Victory Day 16 December 1971, Cox's Bazar,
  the Sundarbans, "Amar Sonar Bangla" by Rabindranath Tagore, currency Taka,
  largest district Rangamati), each with a one-line explanation.

## Stack

Pure static web app — HTML, CSS, vanilla JavaScript. Zero dependencies, zero
network requests, localStorage only.

- `index.html` — page structure (all user-facing strings are rendered from
  the i18n table, so the HTML stays ASCII)
- `style.css` — responsive layout (390px mobile verified, no horizontal
  overflow)
- `js/logic.js` — pure logic, no DOM (works in Node and in the browser)
- `js/i18n.js` — English/Bangla string tables and category names
- `js/starter.js` — the starter quiz data
- `js/app.js` — DOM app (exposes `window.__qm` for tests)

## A note on Bengali text (factory convention)

Every source file in this project is **pure ASCII**. All Bengali strings are
written as `\uXXXX` escapes in JavaScript. This is deliberate: a previous
factory push corrupted Bengali text when non-ASCII bytes travelled through
the push arguments. Verify with:

```sh
grep -rP '[^\x00-\x7F]' --include='*.js' --include='*.html' --include='*.css' .
# expected: no matches
```

## Prerequisites

- A modern browser (for the app), or Node.js 18+ (for the logic tests and
  the headless-Chrome smoke test).
- The smoke test uses the Playwright headless shell at
  `~/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell`
  (override with `HEADLESS_SHELL`).

## Install / run

No build step, no install. Open `index.html` in a browser, or serve the
folder:

```sh
cd quiz-maker-bd
python3 -m http.server 8000
# open http://localhost:8000
```

## Dev commands

```sh
node tests/logic.test.js   # logic unit tests (plain node assert)
node smoke/smoke.mjs       # headless-Chrome smoke test (raw CDP)
```

## Testing

See `TEST_RESULTS.md` for the real numbers.

- `tests/logic.test.js` — 65 assertions: question/quiz validation (every
  error case), scoring (all-correct, partial, empty, timeout-marked-wrong),
  import validation (valid, malformed JSON, wrong shape, missing fields,
  duplicate options, bad correct index, duplicate ids), starter-quiz
  integrity (10 questions, each valid, 4 distinct options, correct index
  0–3, answers are the well-known facts), clone behaviour.
- `smoke/smoke.mjs` — 55 checks in a real headless Chrome: library render,
  search and category filtering, builder invalid-then-valid save, full play
  flow with correct/wrong answers and explanations, results screen,
  best-score persistence across reload, duplicate/delete flow, export/import
  round-trip, 10-second timer timeout advancing, Bangla toggle + Bengali
  digits + persistence, 390px no-overflow on all four tabs, zero console
  errors and zero page exceptions.

## Deployment

Static site — copy the folder to any static host (GitHub Pages, Netlify, or
any file server). No server-side code, no environment variables.

## Limitations

- Data lives in the browser's localStorage: it is per-browser, per-device,
  and is lost if the browser clears site data. Use Export to back up.
- Import **replaces** the whole library with the imported file (after strict
  validation); there is no merge mode.
- Quizzes are single-player, single-device. No sharing, no accounts, no
  sync.
- The starter quiz is in English; user-authored questions are in whatever
  language the author writes them.
- "Erase all" deletes everything, including the starter quiz — it can only
  be recovered by re-importing an export (or reloading the app after
  clearing localStorage, which re-seeds it).

## Status

Complete MVP. All unit and smoke tests pass (see `TEST_RESULTS.md`).
No known issues.
