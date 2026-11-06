# Quiz Maker BD — Test Results

Run on 2026-11-06 (Asia/Dhaka), Node v24.22.1, headless_shell from
`chromium_headless_shell-1187`.

## Unit tests — 65/65 PASS

Command: `node tests/logic.test.js`

- Validation: every error case covered (missing title/text/option, duplicate
  options incl. case-insensitive and trimmed, wrong option count, correct
  index -1 / 4 / 1.5 / missing, non-string explanation, time limits 5 / 9 /
  301 / -1 invalid and 0 / 10 / 300 valid, too few questions, missing id,
  per-question error prefix `Q2:QUESTION_TEXT_REQUIRED`).
- Scoring: all-correct 2/2 = 100%, partial 1/2 = 50%, all-wrong 0%, empty
  answers 0%, `null` (timeout) answers count as wrong, 7/10 = 70%
  (hand-verified: 7 correct out of 10 → 70%), 1/3 rounds to 33%.
- Import validation: valid object and JSON string pass; malformed JSON,
  non-object, wrong app tag, missing quizzes list, empty list, duplicate ids,
  missing title, too few questions, duplicate options, bad correct index,
  missing id, and null input all rejected with the expected error code.
- Starter quiz: exactly 10 questions, validates clean, every question has 4
  distinct options and correct index 0–3, answers verified against the
  well-known facts (Dhaka, Hilsa, Shapla, 26 March 1971, 16 December 1971,
  Cox's Bazar, largest mangrove forest, Rabindranath Tagore, Taka,
  Rangamati), all-correct run scores 10/10 = 100%.
- Clone: new quiz id and new question ids, same content, deep copy (editing
  the clone does not touch the source).

## Smoke tests — 55/55 PASS

Command: `node smoke/smoke.mjs` (raw CDP against headless_shell, file:// page)

- Library renders the starter quiz (1 card, "Bangladesh GK Starter", 10
  questions); app title and footer disclaimer present.
- Search: no-match shows 0 cards + empty state; "Bangladesh" finds the
  starter quiz. Category chips filter correctly.
- Builder: invalid save shows the error summary and per-question inline
  errors and stays in the builder; adding a question gives 3 editors; a
  valid save returns to the library with 2 quizzes including "Smoke Quiz".
- Play: progress "Question 1 of 10", Q1 answered correctly (correct
  highlight + explanation mentioning Dhaka), Q2 answered wrongly (wrong +
  correct highlights), results screen shows "Score: 9/10 (90%)" with a
  10-item review and exactly 1 wrong item.
- Best score 9 saved in localStorage and shown on the card after reload.
- Duplicate adds a third card with "(Copy)" in the title; delete needs a
  second confirming click and then removes the card.
- Export/import round-trip: exported JSON passes strict validation, contains
  both quizzes; a bad import is rejected with data intact; re-import of the
  own export succeeds.
- Timer: a 10-second quiz shows the countdown; after ~13s the timeout
  auto-advances to question 2 and the timed-out answer is recorded as null.
- Bangla toggle: heading renders Bengali, library meta uses Bengali digits,
  language persists in localStorage and after reload; toggles back to
  English.
- 390px mobile: no horizontal overflow on Library, Builder, Play, and Data.
- Zero console errors, zero page exceptions.

## ASCII check

`grep -rP '[^\x00-\x7F]' --include='*.js' --include='*.html' --include='*.css' .`
→ no matches (all Bengali strings are `\uXXXX` escapes in `js/i18n.js`).

## Repairs

None required — both suites passed on the first run. No repair cycles used.
