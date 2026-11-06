// Quiz Maker BD - logic unit tests. Plain node assert, no deps.
// Run: node tests/logic.test.js
const assert = require('assert');
const L = require('../js/logic');
const { STARTER_QUIZ } = require('../js/starter');

let n = 0;
function check(name, fn) {
  n += 1;
  fn();
  console.log('ok - ' + name);
}
function goodQuestion(over) {
  return Object.assign({
    id: 'q1', text: 'What is 2 + 2?',
    options: ['3', '4', '5', '6'], correct: 1, explanation: '2 + 2 = 4.'
  }, over || {});
}
function goodQuiz(over) {
  return Object.assign({
    id: 'quiz1', title: 'Math Warm-up', description: '',
    category: 'Math', timeLimit: 0,
    questions: [goodQuestion({ id: 'a' }), goodQuestion({ id: 'b', text: 'What is 3 + 3?', correct: 2 })]
  }, over || {});
}

// --- validateQuestion ---
check('valid question passes', () => assert.deepStrictEqual(L.validateQuestion(goodQuestion()), []));
check('missing text', () => assert.ok(L.validateQuestion(goodQuestion({ text: '  ' })).includes('QUESTION_TEXT_REQUIRED')));
check('missing question object', () => assert.ok(L.validateQuestion(null).includes('QUESTION_INVALID')));
check('empty option', () => assert.ok(L.validateQuestion(goodQuestion({ options: ['3', '', '5', '6'] })).includes('OPTION_EMPTY')));
check('all options empty still flags OPTION_EMPTY', () => assert.ok(L.validateQuestion(goodQuestion({ options: ['', '', '', ''] })).includes('OPTION_EMPTY')));
check('duplicate options (case-insensitive)', () => assert.ok(L.validateQuestion(goodQuestion({ options: ['Four', '4', 'four', '6'] })).includes('OPTIONS_NOT_DISTINCT')));
check('duplicate options after trim', () => assert.ok(L.validateQuestion(goodQuestion({ options: ['3', ' 3 ', '5', '6'] })).includes('OPTIONS_NOT_DISTINCT')));
check('wrong option count', () => assert.ok(L.validateQuestion(goodQuestion({ options: ['3', '4'] })).includes('OPTIONS_COUNT')));
check('correct index -1 invalid', () => assert.ok(L.validateQuestion(goodQuestion({ correct: -1 })).includes('CORRECT_INVALID')));
check('correct index 4 invalid', () => assert.ok(L.validateQuestion(goodQuestion({ correct: 4 })).includes('CORRECT_INVALID')));
check('correct index non-integer invalid', () => assert.ok(L.validateQuestion(goodQuestion({ correct: 1.5 })).includes('CORRECT_INVALID')));
check('correct index missing invalid', () => assert.ok(L.validateQuestion(goodQuestion({ correct: undefined })).includes('CORRECT_INVALID')));
check('correct index 0 valid', () => assert.deepStrictEqual(L.validateQuestion(goodQuestion({ correct: 0 })), []));
check('correct index 3 valid', () => assert.deepStrictEqual(L.validateQuestion(goodQuestion({ correct: 3 })), []));
check('non-string explanation invalid', () => assert.ok(L.validateQuestion(goodQuestion({ explanation: 42 })).includes('EXPLANATION_INVALID')));
check('missing explanation is fine', () => {
  const q = goodQuestion(); delete q.explanation;
  assert.deepStrictEqual(L.validateQuestion(q), []);
});

// --- validateQuiz ---
check('valid quiz passes', () => assert.deepStrictEqual(L.validateQuiz(goodQuiz()), []));
check('missing title', () => assert.ok(L.validateQuiz(goodQuiz({ title: '' })).includes('TITLE_REQUIRED')));
check('whitespace-only title', () => assert.ok(L.validateQuiz(goodQuiz({ title: '   ' })).includes('TITLE_REQUIRED')));
check('missing category', () => assert.ok(L.validateQuiz(goodQuiz({ category: '' })).includes('CATEGORY_REQUIRED')));
check('one question too few', () => assert.ok(L.validateQuiz(goodQuiz({ questions: [goodQuestion()] })).includes('TOO_FEW_QUESTIONS')));
check('zero questions too few', () => assert.ok(L.validateQuiz(goodQuiz({ questions: [] })).includes('TOO_FEW_QUESTIONS')));
check('time limit 5 invalid', () => assert.ok(L.validateQuiz(goodQuiz({ timeLimit: 5 })).includes('TIME_LIMIT_INVALID')));
check('time limit 9 invalid', () => assert.ok(L.validateQuiz(goodQuiz({ timeLimit: 9 })).includes('TIME_LIMIT_INVALID')));
check('time limit 10 valid', () => assert.deepStrictEqual(L.validateQuiz(goodQuiz({ timeLimit: 10 })), []));
check('time limit 300 valid', () => assert.deepStrictEqual(L.validateQuiz(goodQuiz({ timeLimit: 300 })), []));
check('time limit 301 invalid', () => assert.ok(L.validateQuiz(goodQuiz({ timeLimit: 301 })).includes('TIME_LIMIT_INVALID')));
check('time limit 0 valid (no limit)', () => assert.deepStrictEqual(L.validateQuiz(goodQuiz({ timeLimit: 0 })), []));
check('time limit negative invalid', () => assert.ok(L.validateQuiz(goodQuiz({ timeLimit: -1 })).includes('TIME_LIMIT_INVALID')));
check('missing id', () => assert.ok(L.validateQuiz(goodQuiz({ id: '' })).includes('MISSING_ID')));
check('question error is prefixed with question number', () => {
  const errs = L.validateQuiz(goodQuiz({ questions: [goodQuestion(), goodQuestion({ text: '' })] }));
  assert.ok(errs.includes('Q2:QUESTION_TEXT_REQUIRED'), JSON.stringify(errs));
});
check('null quiz invalid', () => assert.ok(L.validateQuiz(null).includes('QUIZ_INVALID')));

// --- scoreAnswers ---
check('all correct scores 100%', () => assert.deepStrictEqual(L.scoreAnswers(goodQuiz(), [1, 2]), { correct: 2, total: 2, pct: 100 }));
check('partial scores 50%', () => assert.deepStrictEqual(L.scoreAnswers(goodQuiz(), [1, 0]), { correct: 1, total: 2, pct: 50 }));
check('all wrong scores 0%', () => assert.deepStrictEqual(L.scoreAnswers(goodQuiz(), [0, 0]), { correct: 0, total: 2, pct: 0 }));
check('empty answers score 0%', () => assert.deepStrictEqual(L.scoreAnswers(goodQuiz(), []), { correct: 0, total: 2, pct: 0 }));
check('null answers (timeout) count as wrong', () => assert.deepStrictEqual(L.scoreAnswers(goodQuiz(), [1, null]), { correct: 1, total: 2, pct: 50 }));
check('undefined answers count as wrong', () => assert.deepStrictEqual(L.scoreAnswers(goodQuiz(), [undefined, undefined]), { correct: 0, total: 2, pct: 0 }));
check('7 of 10 scores 70%', () => {
  const quiz = goodQuiz();
  quiz.questions = Array.from({ length: 10 }, (_, i) => goodQuestion({ id: 'q' + i, correct: 1 }));
  const answers = [1, 1, 1, 1, 1, 1, 1, 0, 0, 0];
  assert.deepStrictEqual(L.scoreAnswers(quiz, answers), { correct: 7, total: 10, pct: 70 });
});
check('rounding: 1 of 3 scores 33%', () => {
  const quiz = goodQuiz();
  quiz.questions = [goodQuestion({ id: 'a' }), goodQuestion({ id: 'b' }), goodQuestion({ id: 'c' })];
  assert.deepStrictEqual(L.scoreAnswers(quiz, [1, 0, 0]), { correct: 1, total: 3, pct: 33 });
});

// --- newQuiz / newQuestion / makeId ---
check('newQuiz has 2 blank questions', () => {
  const q = L.newQuiz();
  assert.strictEqual(q.questions.length, 2);
  assert.strictEqual(q.timeLimit, 0);
  assert.strictEqual(q.title, '');
});
check('newQuestion has 4 empty options and correct 0', () => {
  const q = L.newQuestion();
  assert.deepStrictEqual(q.options, ['', '', '', '']);
  assert.strictEqual(q.correct, 0);
});
check('makeId returns unique ids', () => {
  const ids = new Set([L.makeId(), L.makeId(), L.makeId(), L.makeId(), L.makeId()]);
  assert.strictEqual(ids.size, 5);
});

// --- cloneQuiz ---
check('clone gets a new id and new question ids', () => {
  const src = goodQuiz();
  const copy = L.cloneQuiz(src);
  assert.notStrictEqual(copy.id, src.id);
  assert.notStrictEqual(copy.questions[0].id, src.questions[0].id);
  assert.notStrictEqual(copy.questions[1].id, src.questions[1].id);
});
check('clone keeps the same content', () => {
  const src = goodQuiz();
  const copy = L.cloneQuiz(src);
  assert.strictEqual(copy.title, src.title);
  assert.strictEqual(copy.questions[0].text, src.questions[0].text);
  assert.deepStrictEqual(copy.questions[0].options, src.questions[0].options);
  assert.strictEqual(copy.questions[0].correct, src.questions[0].correct);
});
check('clone is a deep copy (editing copy does not touch source)', () => {
  const src = goodQuiz();
  const copy = L.cloneQuiz(src);
  copy.questions[0].options[0] = 'CHANGED';
  assert.strictEqual(src.questions[0].options[0], '3');
});

// --- validateImport ---
function exportShape(quizzes) {
  return { app: 'quiz-maker-bd', version: 1, exportedAt: '2026-11-06T00:00:00.000Z', quizzes };
}
check('valid import passes (object)', () => assert.deepStrictEqual(L.validateImport(exportShape([goodQuiz()])), { ok: true }));
check('valid import passes (JSON string)', () => assert.deepStrictEqual(L.validateImport(JSON.stringify(exportShape([goodQuiz()]))), { ok: true }));
check('malformed JSON string rejected', () => assert.deepStrictEqual(L.validateImport('{not json'), { ok: false, error: 'INVALID_JSON' }));
check('non-object rejected', () => assert.deepStrictEqual(L.validateImport([goodQuiz()]), { ok: false, error: 'NOT_AN_OBJECT' }));
check('wrong app tag rejected', () => assert.deepStrictEqual(L.validateImport({ app: 'other-app', quizzes: [goodQuiz()] }), { ok: false, error: 'WRONG_APP' }));
check('missing quizzes list rejected', () => assert.deepStrictEqual(L.validateImport({ app: 'quiz-maker-bd' }), { ok: false, error: 'QUIZZES_NOT_ARRAY' }));
check('empty quizzes list rejected', () => assert.deepStrictEqual(L.validateImport(exportShape([])), { ok: false, error: 'EMPTY_IMPORT' }));
check('duplicate ids rejected', () => {
  const a = goodQuiz(); const b = goodQuiz();
  assert.deepStrictEqual(L.validateImport(exportShape([a, b])), { ok: false, error: 'DUPLICATE_ID' });
});
check('quiz with missing title rejected', () => assert.deepStrictEqual(L.validateImport(exportShape([goodQuiz({ title: '' })])), { ok: false, error: 'INVALID_QUIZ' }));
check('quiz with one question rejected', () => assert.deepStrictEqual(L.validateImport(exportShape([goodQuiz({ questions: [goodQuestion()] })])), { ok: false, error: 'INVALID_QUIZ' }));
check('quiz with duplicate options rejected', () => {
  const q = goodQuiz();
  q.questions[0].options = ['same', 'same', 'x', 'y'];
  assert.deepStrictEqual(L.validateImport(exportShape([q])), { ok: false, error: 'INVALID_QUIZ' });
});
check('quiz with bad correct index rejected', () => {
  const q = goodQuiz();
  q.questions[0].correct = 9;
  assert.deepStrictEqual(L.validateImport(exportShape([q])), { ok: false, error: 'INVALID_QUIZ' });
});
check('quiz with missing id rejected', () => assert.deepStrictEqual(L.validateImport(exportShape([goodQuiz({ id: '' })])), { ok: false, error: 'INVALID_QUIZ' }));
check('null import rejected', () => assert.deepStrictEqual(L.validateImport(null), { ok: false, error: 'NOT_AN_OBJECT' }));

// --- starter quiz integrity ---
check('starter quiz has exactly 10 questions', () => assert.strictEqual(STARTER_QUIZ.questions.length, 10));
check('starter quiz validates clean', () => assert.deepStrictEqual(L.validateQuiz(STARTER_QUIZ), []));
check('every starter question validates with 4 distinct options and correct 0-3', () => {
  STARTER_QUIZ.questions.forEach((q, i) => {
    assert.deepStrictEqual(L.validateQuestion(q), [], 'starter Q' + (i + 1));
    assert.strictEqual(q.options.length, 4);
    assert.strictEqual(new Set(q.options.map((o) => o.trim().toLowerCase())).size, 4);
    assert.ok(q.correct >= 0 && q.correct <= 3);
  });
});
check('starter answers are the well-known facts', () => {
  const byText = {};
  STARTER_QUIZ.questions.forEach((q) => { byText[q.text] = q.options[q.correct]; });
  assert.strictEqual(byText['What is the capital of Bangladesh?'], 'Dhaka');
  assert.strictEqual(byText['What is the national fish of Bangladesh?'], 'Hilsa (Ilish)');
  assert.strictEqual(byText['What is the national flower of Bangladesh?'], 'Water lily (Shapla)');
  assert.strictEqual(byText['On which date is Independence Day of Bangladesh observed?'], '26 March 1971');
  assert.strictEqual(byText['On which date is Victory Day of Bangladesh observed?'], '16 December 1971');
  assert.strictEqual(byText['Which is the longest natural sea beach in the world?'], "Cox's Bazar");
  assert.strictEqual(byText['The Sundarbans is best known as what?'], 'The largest mangrove forest in the world');
  assert.strictEqual(byText['Who wrote the national anthem of Bangladesh, "Amar Sonar Bangla"?'], 'Rabindranath Tagore');
  assert.strictEqual(byText['What is the currency of Bangladesh?'], 'Taka');
  assert.strictEqual(byText['Which is the largest district of Bangladesh by area?'], 'Rangamati');
});
check('starter quiz scores 10/10 when all answers are correct', () => {
  const answers = STARTER_QUIZ.questions.map((q) => q.correct);
  assert.deepStrictEqual(L.scoreAnswers(STARTER_QUIZ, answers), { correct: 10, total: 10, pct: 100 });
});

console.log('LOGIC PASS: ' + n + '/' + n);
