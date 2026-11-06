// Quiz Maker BD \u2014 pure logic (no DOM). Works in Node and in the browser.
(function (root) {
  'use strict';

  var counter = 0;

  function makeId() {
    counter += 1;
    return 'qm' + Date.now().toString(36) + counter.toString(36) +
      Math.floor(Math.random() * 1296).toString(36);
  }

  function isNonEmptyString(v) {
    return typeof v === 'string' && v.trim().length > 0;
  }

  function newQuestion() {
    return { id: makeId(), text: '', options: ['', '', '', ''], correct: 0, explanation: '' };
  }

  function newQuiz() {
    return {
      id: makeId(),
      title: '',
      description: '',
      category: 'General',
      timeLimit: 0,
      questions: [newQuestion(), newQuestion()]
    };
  }

  // validateQuestion(q) -> array of error codes (empty = valid).
  function validateQuestion(q) {
    var errors = [];
    if (!q || typeof q !== 'object' || Array.isArray(q)) return ['QUESTION_INVALID'];
    if (!isNonEmptyString(q.text)) errors.push('QUESTION_TEXT_REQUIRED');
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      errors.push('OPTIONS_COUNT');
    } else {
      var seen = {};
      var dup = false;
      for (var i = 0; i < 4; i++) {
        if (!isNonEmptyString(q.options[i])) {
          errors.push('OPTION_EMPTY');
        } else {
          var key = q.options[i].trim().toLowerCase();
          if (seen[key]) dup = true;
          seen[key] = true;
        }
      }
      if (dup) errors.push('OPTIONS_NOT_DISTINCT');
    }
    if (typeof q.correct !== 'number' || q.correct % 1 !== 0 || q.correct < 0 || q.correct > 3) {
      errors.push('CORRECT_INVALID');
    }
    if (q.explanation !== undefined && q.explanation !== null && typeof q.explanation !== 'string') {
      errors.push('EXPLANATION_INVALID');
    }
    return errors;
  }

  // validateQuiz(quiz) -> array of error codes (empty = valid).
  function validateQuiz(quiz) {
    var errors = [];
    if (!quiz || typeof quiz !== 'object' || Array.isArray(quiz)) return ['QUIZ_INVALID'];
    if (!isNonEmptyString(quiz.id)) errors.push('MISSING_ID');
    if (!isNonEmptyString(quiz.title)) errors.push('TITLE_REQUIRED');
    if (!isNonEmptyString(quiz.category)) errors.push('CATEGORY_REQUIRED');
    if (typeof quiz.timeLimit !== 'number' || quiz.timeLimit % 1 !== 0 ||
        (quiz.timeLimit !== 0 && (quiz.timeLimit < 10 || quiz.timeLimit > 300))) {
      errors.push('TIME_LIMIT_INVALID');
    }
    if (!Array.isArray(quiz.questions) || quiz.questions.length < 2) {
      errors.push('TOO_FEW_QUESTIONS');
    } else {
      for (var i = 0; i < quiz.questions.length; i++) {
        var qe = validateQuestion(quiz.questions[i]);
        for (var j = 0; j < qe.length; j++) errors.push('Q' + (i + 1) + ':' + qe[j]);
      }
    }
    return errors;
  }

  // validateImport(data) -> {ok:true} or {ok:false, error:'CODE'}.
  // Accepts a parsed object or a JSON string. Strict: exact app tag, quizzes
  // array, every quiz valid, no duplicate ids anywhere.
  function validateImport(data) {
    var parsed = data;
    if (typeof data === 'string') {
      try {
        parsed = JSON.parse(data);
      } catch (e) {
        return { ok: false, error: 'INVALID_JSON' };
      }
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, error: 'NOT_AN_OBJECT' };
    }
    if (parsed.app !== 'quiz-maker-bd') return { ok: false, error: 'WRONG_APP' };
    if (!Array.isArray(parsed.quizzes)) return { ok: false, error: 'QUIZZES_NOT_ARRAY' };
    if (parsed.quizzes.length === 0) return { ok: false, error: 'EMPTY_IMPORT' };
    var ids = {};
    for (var i = 0; i < parsed.quizzes.length; i++) {
      var quiz = parsed.quizzes[i];
      if (!quiz || typeof quiz !== 'object' || !isNonEmptyString(quiz.id)) {
        return { ok: false, error: 'INVALID_QUIZ' };
      }
      if (ids[quiz.id]) return { ok: false, error: 'DUPLICATE_ID' };
      ids[quiz.id] = true;
      if (validateQuiz(quiz).length > 0) return { ok: false, error: 'INVALID_QUIZ' };
    }
    return { ok: true };
  }

  // scoreAnswers(quiz, answers) -> {correct, total, pct}.
  // answers[i] is the chosen option index, or null/undefined (unanswered /
  // timed out) which counts as wrong.
  function scoreAnswers(quiz, answers) {
    var total = Array.isArray(quiz.questions) ? quiz.questions.length : 0;
    var correct = 0;
    for (var i = 0; i < total; i++) {
      if (Array.isArray(answers) && answers[i] === quiz.questions[i].correct) correct += 1;
    }
    return { correct: correct, total: total, pct: total === 0 ? 0 : Math.round((correct / total) * 100) };
  }

  function cloneQuiz(quiz) {
    var copy = JSON.parse(JSON.stringify(quiz));
    copy.id = makeId();
    if (Array.isArray(copy.questions)) {
      for (var i = 0; i < copy.questions.length; i++) copy.questions[i].id = makeId();
    }
    return copy;
  }

  var api = {
    makeId: makeId,
    newQuiz: newQuiz,
    newQuestion: newQuestion,
    validateQuestion: validateQuestion,
    validateQuiz: validateQuiz,
    validateImport: validateImport,
    scoreAnswers: scoreAnswers,
    cloneQuiz: cloneQuiz
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.QuizMakerLogic = api;
})(typeof window !== 'undefined' ? window : globalThis);
