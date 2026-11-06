// Quiz Maker BD \u2014 DOM app. Depends on QuizMakerLogic, QuizMakerStarter,
// QuizMakerI18n (loaded before this file).
(function () {
  'use strict';

  var L = window.QuizMakerLogic;
  var STARTER = window.QuizMakerStarter.STARTER_QUIZ;
  var I18N = window.QuizMakerI18n;

  var LS_QUIZZES = 'qmbd-quizzes-v1';
  var LS_BEST = 'qmbd-best-v1';
  var LS_LANG = 'qmbd-lang-v1';

  var state = {
    lang: 'en',
    quizzes: [],
    best: {}, // quizId -> {correct, total, pct}
    search: '',
    categoryFilter: 'All',
    editingId: null,
    draft: null,
    play: null // {quiz, idx, answers[], locked, timerId, timeLeft, timeoutId}
  };

  function t(key) {
    var s = I18N.STRINGS[state.lang] || I18N.STRINGS.en;
    return s[key] !== undefined ? s[key] : I18N.STRINGS.en[key];
  }

  function bnDigits(n) {
    var s = String(n);
    if (state.lang !== 'bn') return s;
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      out += (c >= 48 && c <= 57) ? String.fromCharCode(0x09E6 + (c - 48)) : s[i];
    }
    return out;
  }

  function fmt(n) { return bnDigits(n); }

  function load() {
    try {
      state.lang = localStorage.getItem(LS_LANG) || 'en';
      if (state.lang !== 'en' && state.lang !== 'bn') state.lang = 'en';
    } catch (e) { state.lang = 'en'; }
    try {
      var raw = localStorage.getItem(LS_QUIZZES);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) state.quizzes = parsed;
      }
      if (!state.quizzes || state.quizzes.length === 0) {
        state.quizzes = [JSON.parse(JSON.stringify(STARTER))];
        saveQuizzes();
      }
    } catch (e) {
      state.quizzes = [JSON.parse(JSON.stringify(STARTER))];
    }
    try {
      state.best = JSON.parse(localStorage.getItem(LS_BEST) || '{}') || {};
    } catch (e) { state.best = {}; }
  }

  function saveQuizzes() {
    try { localStorage.setItem(LS_QUIZZES, JSON.stringify(state.quizzes)); } catch (e) {}
  }
  function saveBest() {
    try { localStorage.setItem(LS_BEST, JSON.stringify(state.best)); } catch (e) {}
  }
  function saveLang() {
    try { localStorage.setItem(LS_LANG, state.lang); } catch (e) {}
  }

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }

  var toastTimer = null;
  function toast(msg) {
    var box = $('toast');
    box.textContent = msg;
    box.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { box.classList.remove('show'); }, 2600);
  }

  // ---------- Views / tabs ----------
  function showView(name) {
    stopTimer();
    ['library', 'builder', 'play', 'data'].forEach(function (v) {
      $('view-' + v).classList.toggle('hidden', v !== name);
    });
    document.querySelectorAll('.tab-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.tab === name);
    });
    if (name === 'library') renderLibrary();
  }

  // ---------- Library ----------
  function visibleQuizzes() {
    var q = state.search.trim().toLowerCase();
    return state.quizzes.filter(function (quiz) {
      if (state.categoryFilter !== 'All' && quiz.category !== state.categoryFilter) return false;
      if (q && quiz.title.toLowerCase().indexOf(q) === -1 &&
          (quiz.description || '').toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
  }

  function renderLibrary() {
    var list = $('quiz-list');
    list.innerHTML = '';
    var cats = ['All'];
    state.quizzes.forEach(function (quiz) {
      if (cats.indexOf(quiz.category) === -1) cats.push(quiz.category);
    });
    var chips = $('category-chips');
    chips.innerHTML = '';
    cats.forEach(function (c) {
      var chip = el('button', 'chip' + (state.categoryFilter === c ? ' active' : ''),
        c === 'All' ? t('allCategories') : (state.lang === 'bn' && I18N.CATEGORY_BN[c] ? I18N.CATEGORY_BN[c] : c));
      chip.dataset.cat = c;
      chip.addEventListener('click', function () { state.categoryFilter = c; renderLibrary(); });
      chips.appendChild(chip);
    });

    var shown = visibleQuizzes();
    $('empty-state').classList.toggle('hidden', shown.length > 0);
    $('empty-state').textContent = state.quizzes.length === 0 ? t('emptyLibrary') : t('emptySearch');
    shown.forEach(function (quiz) {
      var card = el('article', 'quiz-card');
      var h = el('h3', 'quiz-title', quiz.title);
      card.appendChild(h);
      if (quiz.description) card.appendChild(el('p', 'quiz-desc', quiz.description));
      var meta = el('p', 'quiz-meta');
      var catName = state.lang === 'bn' && I18N.CATEGORY_BN[quiz.category] ? I18N.CATEGORY_BN[quiz.category] : quiz.category;
      meta.textContent = catName + ' \u00b7 ' + fmt(quiz.questions.length) + ' ' + t('questionsLabel') +
        ' \u00b7 ' + (quiz.timeLimit > 0 ? fmt(quiz.timeLimit) + ' ' + t('secPerQuestion') : t('noTimeLimit'));
      card.appendChild(meta);
      var best = state.best[quiz.id];
      if (best) {
        card.appendChild(el('p', 'quiz-best', t('bestLabel') + ': ' + fmt(best.correct) + '/' + fmt(best.total) +
          ' (' + fmt(best.pct) + '%)'));
      }
      var row = el('div', 'card-actions');
      var playBtn = el('button', 'btn btn-primary', t('playBtn'));
      playBtn.addEventListener('click', function () { startPlay(quiz.id); });
      var editBtn = el('button', 'btn', t('editBtn'));
      editBtn.addEventListener('click', function () { openBuilder(quiz.id); });
      var dupBtn = el('button', 'btn', t('duplicateBtn'));
      dupBtn.addEventListener('click', function () { duplicateQuiz(quiz.id); });
      var delBtn = el('button', 'btn btn-danger', t('deleteBtn'));
      delBtn.addEventListener('click', function () {
        if (delBtn.dataset.armed === '1') {
          deleteQuiz(quiz.id);
        } else {
          delBtn.dataset.armed = '1';
          delBtn.textContent = t('confirmDeleteBtn');
          setTimeout(function () { delBtn.dataset.armed = ''; delBtn.textContent = t('deleteBtn'); }, 3000);
        }
      });
      row.appendChild(playBtn); row.appendChild(editBtn); row.appendChild(dupBtn); row.appendChild(delBtn);
      card.appendChild(row);
      list.appendChild(card);
    });
  }

  function deleteQuiz(id) {
    state.quizzes = state.quizzes.filter(function (q) { return q.id !== id; });
    delete state.best[id];
    saveQuizzes(); saveBest();
    toast(t('deletedToast'));
    renderLibrary();
  }

  function duplicateQuiz(id) {
    var src = null;
    state.quizzes.forEach(function (q) { if (q.id === id) src = q; });
    if (!src) return;
    var copy = L.cloneQuiz(src);
    copy.title = src.title + t('copySuffix');
    state.quizzes.push(copy);
    saveQuizzes();
    toast(t('duplicatedToast'));
    renderLibrary();
  }

  // ---------- Builder ----------
  function openBuilder(id) {
    state.editingId = id || null;
    var src = null;
    if (id) state.quizzes.forEach(function (q) { if (q.id === id) src = q; });
    state.draft = src ? JSON.parse(JSON.stringify(src)) : L.newQuiz();
    $('builder-heading').textContent = id ? t('builderEdit') : t('builderNew');
    $('quiz-title').value = state.draft.title;
    $('quiz-desc').value = state.draft.description || '';
    var catSel = $('quiz-category');
    catSel.innerHTML = '';
    I18N.CATEGORIES.forEach(function (c) {
      var opt = document.createElement('option');
      opt.value = c;
      opt.textContent = state.lang === 'bn' && I18N.CATEGORY_BN[c] ? I18N.CATEGORY_BN[c] : c;
      catSel.appendChild(opt);
    });
    var known = I18N.CATEGORIES.indexOf(state.draft.category) !== -1;
    catSel.value = known ? state.draft.category : 'Other';
    $('quiz-category-custom').value = known ? '' : state.draft.category;
    $('quiz-category-custom').classList.toggle('hidden', catSel.value !== 'Other');
    $('quiz-time').value = String(state.draft.timeLimit);
    $('builder-errors').innerHTML = '';
    renderQuestionsEditor();
    showView('builder');
  }

  function collectDraft() {
    state.draft.title = $('quiz-title').value.trim();
    state.draft.description = $('quiz-desc').value.trim();
    var cat = $('quiz-category').value;
    state.draft.category = cat === 'Other' ? $('quiz-category-custom').value.trim() : cat;
    var tl = parseInt($('quiz-time').value, 10);
    state.draft.timeLimit = isNaN(tl) ? 0 : tl;
    state.draft.questions = state.draft.questions.map(function (q, i) {
      var qText = $('q-text-' + i);
      return {
        id: q.id,
        text: qText ? qText.value.trim() : q.text,
        options: [0, 1, 2, 3].map(function (o) {
          var inp = $('q-opt-' + i + '-' + o);
          return inp ? inp.value.trim() : q.options[o];
        }),
        correct: (function () {
          var checked = document.querySelector('input[name="q-correct-' + i + '"]:checked');
          return checked ? parseInt(checked.value, 10) : q.correct;
        })(),
        explanation: (function () {
          var inp = $('q-exp-' + i);
          return inp ? inp.value.trim() : (q.explanation || '');
        })()
      };
    });
  }

  function renderQuestionsEditor() {
    var wrap = $('questions-editor');
    wrap.innerHTML = '';
    state.draft.questions.forEach(function (q, i) {
      var box = el('div', 'question-editor');
      var head = el('div', 'qe-head');
      head.appendChild(el('span', 'qe-title', t('questionLabel') + ' ' + fmt(i + 1)));
      var controls = el('div', 'qe-controls');
      var up = el('button', 'btn btn-small', '\u25b2');
      up.title = t('moveUpBtn'); up.disabled = i === 0;
      up.addEventListener('click', function () { collectDraft(); moveQuestion(i, -1); });
      var down = el('button', 'btn btn-small', '\u25bc');
      down.title = t('moveDownBtn'); down.disabled = i === state.draft.questions.length - 1;
      down.addEventListener('click', function () { collectDraft(); moveQuestion(i, 1); });
      var rm = el('button', 'btn btn-small btn-danger', '\u2715');
      rm.title = t('removeQuestionBtn');
      rm.addEventListener('click', function () { collectDraft(); removeQuestion(i); });
      controls.appendChild(up); controls.appendChild(down); controls.appendChild(rm);
      head.appendChild(controls);
      box.appendChild(head);

      var ta = document.createElement('textarea');
      ta.id = 'q-text-' + i;
      ta.value = q.text;
      ta.placeholder = t('questionLabel');
      ta.rows = 2;
      box.appendChild(ta);
      var qErr = el('p', 'field-error', '');
      qErr.id = 'q-err-' + i;
      box.appendChild(qErr);

      q.options.forEach(function (opt, o) {
        var row = el('div', 'option-row');
        var radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'q-correct-' + i;
        radio.value = String(o);
        radio.checked = q.correct === o;
        radio.setAttribute('aria-label', t('correctLabel'));
        var inp = document.createElement('input');
        inp.type = 'text';
        inp.id = 'q-opt-' + i + '-' + o;
        inp.value = opt;
        inp.placeholder = t('optionLabel') + ' ' + fmt(o + 1);
        row.appendChild(radio);
        row.appendChild(inp);
        row.appendChild(el('span', 'correct-tag', t('correctLabel')));
        box.appendChild(row);
      });
      var exp = document.createElement('input');
      exp.type = 'text';
      exp.id = 'q-exp-' + i;
      exp.value = q.explanation || '';
      exp.placeholder = t('explanationLabel') + ' \u2014 ' + t('explanationPlaceholder');
      box.appendChild(exp);
      wrap.appendChild(box);
    });
  }

  function moveQuestion(i, dir) {
    var j = i + dir;
    if (j < 0 || j >= state.draft.questions.length) return;
    var tmp = state.draft.questions[i];
    state.draft.questions[i] = state.draft.questions[j];
    state.draft.questions[j] = tmp;
    renderQuestionsEditor();
  }

  function removeQuestion(i) {
    state.draft.questions.splice(i, 1);
    renderQuestionsEditor();
  }

  function saveQuiz() {
    collectDraft();
    var errors = L.validateQuiz(state.draft);
    var box = $('builder-errors');
    box.innerHTML = '';
    // Clear per-question inline errors first.
    state.draft.questions.forEach(function (_, i) {
      var e = $('q-err-' + i);
      if (e) e.textContent = '';
    });
    if (errors.length > 0) {
      var summary = el('div', 'error-summary');
      summary.appendChild(el('p', '', t('fixErrors')));
      var ul = document.createElement('ul');
      errors.forEach(function (code) {
        var li = document.createElement('li');
        li.textContent = humanError(code);
        ul.appendChild(li);
        var m = /^Q(\d+):/.exec(code);
        if (m) {
          var qErr = $('q-err-' + (parseInt(m[1], 10) - 1));
          if (qErr && !qErr.textContent) qErr.textContent = humanError(code);
        }
      });
      summary.appendChild(ul);
      box.appendChild(summary);
      return false;
    }
    var existing = -1;
    state.quizzes.forEach(function (q, i) { if (q.id === state.draft.id) existing = i; });
    if (existing >= 0) state.quizzes[existing] = state.draft;
    else state.quizzes.push(state.draft);
    saveQuizzes();
    toast(t('savedToast'));
    state.editingId = null;
    state.draft = null;
    showView('library');
    return true;
  }

  function humanError(code) {
    var m = /^Q(\d+):(.+)$/.exec(code);
    var base = m ? m[2] : code;
    var prefix = m ? (t('questionLabel') + ' ' + fmt(parseInt(m[1], 10)) + ': ') : '';
    var map = {
      TITLE_REQUIRED: t('errTitleRequired'),
      TOO_FEW_QUESTIONS: t('errTooFewQuestions'),
      QUESTION_TEXT_REQUIRED: t('errQuestionText'),
      OPTION_EMPTY: t('errOptionEmpty'),
      OPTIONS_NOT_DISTINCT: t('errOptionsDistinct'),
      CORRECT_INVALID: t('errCorrectInvalid'),
      TIME_LIMIT_INVALID: t('errTimeLimit'),
      CATEGORY_REQUIRED: t('errCategoryRequired'),
      MISSING_ID: 'Missing id.',
      OPTIONS_COUNT: 'A question needs exactly 4 options.',
      QUESTION_INVALID: 'Question is invalid.',
      QUIZ_INVALID: 'Quiz is invalid.'
    };
    return prefix + (map[base] || base);
  }

  // ---------- Play ----------
  function startPlay(id) {
    var quiz = null;
    state.quizzes.forEach(function (q) { if (q.id === id) quiz = q; });
    if (!quiz || quiz.questions.length === 0) return;
    state.play = { quiz: quiz, idx: 0, answers: [], locked: false, timerId: null, timeLeft: 0, timeoutId: null };
    $('play-results').classList.add('hidden');
    $('play-quiz').classList.remove('hidden');
    showView('play');
    renderPlayQuestion();
  }

  function stopTimer() {
    if (state.play) {
      if (state.play.timerId) { clearInterval(state.play.timerId); state.play.timerId = null; }
      if (state.play.timeoutId) { clearTimeout(state.play.timeoutId); state.play.timeoutId = null; }
    }
  }

  function renderPlayQuestion() {
    var p = state.play;
    if (!p) return;
    var quiz = p.quiz;
    var q = quiz.questions[p.idx];
    p.locked = false;
    $('play-progress').textContent = t('progressLabel') + ' ' + fmt(p.idx + 1) + ' ' + t('ofLabel') + ' ' + fmt(quiz.questions.length);
    $('play-progress-bar').style.width = ((p.idx) / quiz.questions.length * 100) + '%';
    $('play-question-text').textContent = q.text;
    var opts = $('play-options');
    opts.innerHTML = '';
    q.options.forEach(function (opt, o) {
      var b = el('button', 'option-btn', opt);
      b.dataset.idx = String(o);
      b.addEventListener('click', function () { answerOption(o); });
      opts.appendChild(b);
    });
    var exp = $('play-explanation');
    exp.classList.add('hidden');
    exp.textContent = '';
    var next = $('play-next-btn');
    next.classList.add('hidden');
    next.textContent = p.idx === quiz.questions.length - 1 ? t('seeResultsBtn') : t('nextBtn');
    // Timer
    var timerEl = $('play-timer');
    if (quiz.timeLimit > 0) {
      p.timeLeft = quiz.timeLimit;
      timerEl.classList.remove('hidden');
      timerEl.textContent = t('timeLeftLabel') + ': ' + fmt(p.timeLeft) + 's';
      p.timerId = setInterval(function () {
        p.timeLeft -= 1;
        if (p.timeLeft <= 0) {
          stopTimer();
          onTimeout();
        } else {
          timerEl.textContent = t('timeLeftLabel') + ': ' + fmt(p.timeLeft) + 's';
        }
      }, 1000);
    } else {
      timerEl.classList.add('hidden');
    }
  }

  function onTimeout() {
    var p = state.play;
    if (!p || p.locked) return;
    p.locked = true;
    p.answers[p.idx] = null;
    showFeedback(null, true);
  }

  function answerOption(o) {
    var p = state.play;
    if (!p || p.locked) return;
    p.locked = true;
    stopTimer();
    p.answers[p.idx] = o;
    showFeedback(o, false);
  }

  function showFeedback(chosen, timedOut) {
    var p = state.play;
    var q = p.quiz.questions[p.idx];
    var btns = document.querySelectorAll('#play-options .option-btn');
    btns.forEach(function (b) {
      var idx = parseInt(b.dataset.idx, 10);
      b.disabled = true;
      if (idx === q.correct) b.classList.add('correct');
      if (chosen !== null && idx === chosen && chosen !== q.correct) b.classList.add('wrong');
    });
    var exp = $('play-explanation');
    exp.classList.remove('hidden');
    var lines = [];
    if (timedOut) lines.push(t('timeoutMsg'));
    lines.push(t('yourAnswerLabel') + ': ' + (chosen === null ? t('notAnswered') : q.options[chosen]));
    lines.push(t('correctAnswerLabel') + ': ' + q.options[q.correct]);
    if (q.explanation) lines.push(q.explanation);
    exp.textContent = lines.join(' \u2014 ');
    var next = $('play-next-btn');
    next.classList.remove('hidden');
    if (timedOut) {
      p.timeoutId = setTimeout(function () { nextQuestion(); }, 1500);
    }
  }

  function nextQuestion() {
    var p = state.play;
    if (!p) return;
    stopTimer();
    if (p.idx < p.quiz.questions.length - 1) {
      p.idx += 1;
      renderPlayQuestion();
    } else {
      showResults();
    }
  }

  function showResults() {
    var p = state.play;
    var res = L.scoreAnswers(p.quiz, p.answers);
    var prev = state.best[p.quiz.id];
    if (!prev || res.pct > prev.pct || (res.pct === prev.pct && res.correct > prev.correct)) {
      state.best[p.quiz.id] = res;
      saveBest();
    }
    $('play-quiz').classList.add('hidden');
    var resBox = $('play-results');
    resBox.classList.remove('hidden');
    $('results-score').textContent = t('scoreLabel') + ': ' + fmt(res.correct) + '/' + fmt(res.total) +
      ' (' + fmt(res.pct) + '%)';
    $('results-grade').textContent = res.pct >= 90 ? t('gradeExcellent') :
      res.pct >= 70 ? t('gradeGreat') :
      res.pct >= 50 ? t('gradeGood') : t('gradeKeepGoing');
    var review = $('results-review');
    review.innerHTML = '';
    p.quiz.questions.forEach(function (q, i) {
      var item = el('div', 'review-item');
      var mine = p.answers[i];
      var ok = mine === q.correct;
      item.classList.add(ok ? 'review-correct' : 'review-wrong');
      item.appendChild(el('p', 'review-q', fmt(i + 1) + '. ' + q.text));
      item.appendChild(el('p', 'review-a', t('yourAnswerLabel') + ': ' +
        (mine === null || mine === undefined ? t('notAnswered') : q.options[mine])));
      item.appendChild(el('p', 'review-a', t('correctAnswerLabel') + ': ' + q.options[q.correct]));
      if (q.explanation) item.appendChild(el('p', 'review-exp', q.explanation));
      review.appendChild(item);
    });
    $('play-progress-bar').style.width = '100%';
  }

  // ---------- Data ----------
  function exportJSON() {
    return JSON.stringify({ app: 'quiz-maker-bd', version: 1, exportedAt: new Date().toISOString(), quizzes: state.quizzes }, null, 2);
  }

  function doExport() {
    var blob = new Blob([exportJSON()], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'quiz-maker-bd-export.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function doImportFromText(text) {
    var res = L.validateImport(text);
    var status = $('import-status');
    if (!res.ok) {
      var msg = t('importErrorPrefix') + (t('importErr' + res.error) || res.error);
      status.textContent = msg;
      status.className = 'status error';
      return false;
    }
    var parsed = JSON.parse(text);
    state.quizzes = parsed.quizzes;
    saveQuizzes();
    state.categoryFilter = 'All';
    state.search = '';
    $('search-input').value = '';
    status.textContent = t('importedToast');
    status.className = 'status ok';
    renderLibrary();
    return true;
  }

  function eraseAll() {
    var input = $('erase-input');
    if (input.value !== 'DELETE') {
      $('erase-status').textContent = t('eraseWrong');
      $('erase-status').className = 'status error';
      return false;
    }
    state.quizzes = [];
    state.best = {};
    saveQuizzes(); saveBest();
    input.value = '';
    $('erase-status').textContent = t('eraseDone');
    $('erase-status').className = 'status ok';
    renderLibrary();
    return true;
  }

  // ---------- Language ----------
  function applyLang() {
    document.documentElement.lang = state.lang === 'bn' ? 'bn' : 'en';
    $('app-title').textContent = t('appTitle');
    $('app-subtitle').textContent = t('appSubtitle');
    $('lang-toggle').textContent = state.lang === 'bn' ? 'EN' : '\u09ac\u09be\u0982\u09b2\u09be';
    document.querySelectorAll('.tab-btn').forEach(function (b) {
      var key = b.dataset.tab === 'library' ? 'tabLibrary' : b.dataset.tab === 'builder' ? 'tabBuilder' : 'tabData';
      b.textContent = t(key);
    });
    $('search-input').placeholder = t('searchPlaceholder');
    $('new-quiz-btn').textContent = t('newQuizBtn');
    $('builder-heading').textContent = state.editingId ? t('builderEdit') : t('builderNew');
    $('quiz-title').placeholder = t('titlePlaceholder');
    $('quiz-desc').placeholder = t('descPlaceholder');
    $('quiz-time').placeholder = '0';
    $('add-question-btn').textContent = t('addQuestionBtn');
    $('save-quiz-btn').textContent = t('saveQuizBtn');
    $('cancel-quiz-btn').textContent = t('cancelBtn');
    $('export-btn').textContent = t('exportBtn');
    $('import-btn').textContent = t('importBtn');
    $('erase-btn').textContent = t('eraseBtn');
    $('erase-input').placeholder = t('erasePlaceholder');
    $('footer-note').textContent = t('footer');
    // Static labels (ids in index.html)
    var setText = function (id, key) { var n = $(id); if (n) n.textContent = t(key); };
    setText('lbl-title', 'titleLabel');
    setText('lbl-desc', 'descLabel');
    setText('lbl-category', 'categoryLabel');
    setText('lbl-other-category', 'otherCategoryLabel');
    setText('lbl-time', 'timeLabel');
    setText('hint-time', 'timeHint');
    setText('lbl-questions', 'questionsHeading');
    setText('data-export-title', 'dataExportTitle');
    setText('data-export-desc', 'dataExportDesc');
    setText('data-import-title', 'dataImportTitle');
    setText('data-import-desc', 'dataImportDesc');
    setText('data-erase-title', 'dataEraseTitle');
    setText('data-erase-desc', 'dataEraseDesc');
    setText('results-title', 'resultsTitle');
    setText('review-title', 'reviewTitle');
    setText('retake-btn', 'retakeBtn');
    setText('back-library-btn', 'backToLibraryBtn');
    setText('quit-btn', 'quitBtn');
    renderLibrary();
    if (state.draft) renderQuestionsEditor();
  }

  function setLang(lang) {
    state.lang = lang;
    saveLang();
    applyLang();
  }

  // ---------- Init ----------
  function init() {
    load();
    $('lang-toggle').addEventListener('click', function () {
      setLang(state.lang === 'en' ? 'bn' : 'en');
    });
    document.querySelectorAll('.tab-btn').forEach(function (b) {
      b.addEventListener('click', function () { showView(b.dataset.tab); });
    });
    $('search-input').addEventListener('input', function (e) {
      state.search = e.target.value;
      renderLibrary();
    });
    $('new-quiz-btn').addEventListener('click', function () { openBuilder(null); });
    $('quiz-category').addEventListener('change', function (e) {
      $('quiz-category-custom').classList.toggle('hidden', e.target.value !== 'Other');
    });
    $('add-question-btn').addEventListener('click', function () {
      collectDraft();
      state.draft.questions.push(L.newQuestion());
      renderQuestionsEditor();
    });
    $('save-quiz-btn').addEventListener('click', saveQuiz);
    $('cancel-quiz-btn').addEventListener('click', function () {
      state.draft = null; state.editingId = null; showView('library');
    });
    $('play-next-btn').addEventListener('click', nextQuestion);
    $('retake-btn').addEventListener('click', function () { startPlay(state.play.quiz.id); });
    $('back-library-btn').addEventListener('click', function () { state.play = null; showView('library'); });
    $('quit-btn').addEventListener('click', function () { stopTimer(); state.play = null; showView('library'); });
    $('export-btn').addEventListener('click', doExport);
    $('import-file').addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () { doImportFromText(String(reader.result)); };
      reader.readAsText(file);
      e.target.value = '';
    });
    $('erase-btn').addEventListener('click', eraseAll);
    applyLang();
    showView('library');
  }

  document.addEventListener('DOMContentLoaded', init);

  window.__qm = {
    state: state,
    t: t,
    fmt: fmt,
    setLang: setLang,
    renderLibrary: renderLibrary,
    openBuilder: openBuilder,
    saveQuiz: saveQuiz,
    collectDraft: collectDraft,
    startPlay: startPlay,
    answerOption: answerOption,
    nextQuestion: nextQuestion,
    exportJSON: exportJSON,
    doImportFromText: doImportFromText,
    eraseAll: eraseAll,
    deleteQuiz: deleteQuiz,
    duplicateQuiz: duplicateQuiz,
    showView: showView
  };
})();
