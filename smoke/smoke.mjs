// Quiz Maker BD headless-Chrome smoke test (raw CDP, headless_shell).
// Run: node smoke/smoke.mjs
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const PAGE = 'file://' + path.resolve(DIR, '..', 'index.html');
const CHROME = process.env.HEADLESS_SHELL ||
  (process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell');
const PORT = 9230;

const results = [];
function check(name, cond, extra) {
  results.push([name, !!cond]);
  console.log((cond ? 'ok - ' : 'FAIL - ') + name + (extra !== undefined ? ' :: ' + extra : ''));
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, timeoutMs, label) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try { if (await fn()) return true; } catch (e) { /* retry */ }
    await sleep(200);
  }
  throw new Error('timeout waiting for: ' + label);
}

async function main() {
  const child = spawn(CHROME, [
    '--headless', '--no-sandbox', '--disable-gpu',
    '--remote-debugging-port=' + PORT, '--remote-debugging-address=127.0.0.1',
    'about:blank',
  ], { stdio: 'ignore' });
  try {
    let version = null;
    await waitFor(async () => {
      const res = await fetch('http://127.0.0.1:' + PORT + '/json/version');
      if (!res.ok) return false;
      version = await res.json();
      return true;
    }, 20000, 'debugger port');
    const ws = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    let id = 0;
    const pending = new Map();
    const consoleErrors = [];
    const exceptions = [];
    const onMsg = (m) => {
      const msg = JSON.parse(m.data);
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) rej(new Error(JSON.stringify(msg.error))); else res(msg.result);
      }
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '));
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        exceptions.push(msg.params.exceptionDetails.exception?.description || 'exception');
      }
    };
    ws.onmessage = onMsg;
    const send = (method, params) => new Promise((res, rej) => {
      const mid = ++id;
      pending.set(mid, { res, rej });
      ws.send(JSON.stringify({ id: mid, method, params: params || {} }));
    });
    const target = await (await fetch('http://127.0.0.1:' + PORT + '/json/new?about:blank', { method: 'PUT' })).json();
    const tws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => { tws.onopen = res; tws.onerror = rej; });
    const tpending = new Map();
    let tid = 0;
    tws.onmessage = (m) => {
      const msg = JSON.parse(m.data);
      if (msg.id && tpending.has(msg.id)) {
        const { res, rej } = tpending.get(msg.id);
        tpending.delete(msg.id);
        if (msg.error) rej(new Error(JSON.stringify(msg.error))); else res(msg.result);
      }
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '));
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        exceptions.push(msg.params.exceptionDetails.exception?.description || 'exception');
      }
    };
    const tsend = (method, params) => new Promise((res, rej) => {
      const mid = ++tid;
      tpending.set(mid, { res, rej });
      tws.send(JSON.stringify({ id: mid, method, params: params || {} }));
    });
    const teval = async (expr) => {
      const r = await tsend('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'eval failed');
      return r.result.value;
    };
    await tsend('Runtime.enable');
    await tsend('Page.enable');
    await tsend('Page.navigate', { url: PAGE });
    await waitFor(async () => (await teval('document.querySelectorAll(".quiz-card").length')) === 1, 10000, 'library renders');

    // 1. Library renders the starter quiz.
    check('library renders 1 starter quiz card', (await teval('document.querySelectorAll(".quiz-card").length')) === 1);
    check('starter card title is Bangladesh GK Starter', await teval('document.querySelector(".quiz-card .quiz-title").textContent') === 'Bangladesh GK Starter');
    check('starter card shows 10 questions', await teval('document.querySelector(".quiz-card .quiz-meta").textContent.includes("10")'));
    check('app title is Quiz Maker BD', await teval('document.getElementById("app-title").textContent') === 'Quiz Maker BD');
    check('footer disclaimer present', await teval('document.getElementById("footer-note").textContent.includes("not an official exam source")'));

    // 2. Search filters.
    await teval(`(() => { const s = document.getElementById('search-input'); s.value = 'zzz-no-match'; s.dispatchEvent(new Event('input', {bubbles: true})); })()`);
    await sleep(200);
    check('search with no match shows 0 cards', (await teval('document.querySelectorAll(".quiz-card").length')) === 0);
    check('empty state shown for no match', await teval('!document.getElementById("empty-state").classList.contains("hidden")'));
    await teval(`(() => { const s = document.getElementById('search-input'); s.value = 'Bangladesh'; s.dispatchEvent(new Event('input', {bubbles: true})); })()`);
    await sleep(200);
    check('search "Bangladesh" finds the starter quiz', (await teval('document.querySelectorAll(".quiz-card").length')) === 1);
    await teval(`(() => { const s = document.getElementById('search-input'); s.value = ''; s.dispatchEvent(new Event('input', {bubbles: true})); })()`);
    await sleep(200);

    // 3. Category chip filter.
    await teval(`document.querySelector('.chip[data-cat="Bangladesh"]').click()`);
    await sleep(200);
    check('Bangladesh chip keeps 1 card', (await teval('document.querySelectorAll(".quiz-card").length')) === 1);
    await teval(`document.querySelector('.chip[data-cat="All"]').click()`);
    await sleep(200);
    check('All chip restores 1 card', (await teval('document.querySelectorAll(".quiz-card").length')) === 1);

    // 4. Builder: invalid save shows errors, then valid save lands in library.
    await teval(`document.getElementById('new-quiz-btn').click()`);
    await sleep(300);
    check('builder view visible after New Quiz', await teval('!document.getElementById("view-builder").classList.contains("hidden")'));
    await teval(`document.getElementById('save-quiz-btn').click()`);
    await sleep(300);
    check('invalid save shows error summary', await teval('document.querySelector("#builder-errors .error-summary") !== null'));
    check('invalid save stays in builder', await teval('!document.getElementById("view-builder").classList.contains("hidden")'));
    check('per-question inline error shown', await teval('document.getElementById("q-err-0").textContent.length > 0'));
    await teval(`(() => {
      const set = (id, v) => { const n = document.getElementById(id); n.value = v; };
      set('quiz-title', 'Smoke Quiz');
      set('q-text-0', 'What is 2 + 2?');
      set('q-opt-0-0', '3'); set('q-opt-0-1', '4'); set('q-opt-0-2', '5'); set('q-opt-0-3', '6');
      document.querySelector('input[name="q-correct-0"][value="1"]').checked = true;
      set('q-text-1', 'Capital of France?');
      set('q-opt-1-0', 'Paris'); set('q-opt-1-1', 'London'); set('q-opt-1-2', 'Rome'); set('q-opt-1-3', 'Madrid');
      document.querySelector('input[name="q-correct-1"][value="0"]').checked = true;
    })()`);
    await teval(`document.getElementById('add-question-btn').click()`);
    await sleep(300);
    check('add question gives 3 editors', (await teval('document.querySelectorAll(".question-editor").length')) === 3);
    await teval(`(() => {
      const set = (id, v) => { const n = document.getElementById(id); n.value = v; };
      set('q-text-2', 'What colour is the sky?');
      set('q-opt-2-0', 'Blue'); set('q-opt-2-1', 'Green'); set('q-opt-2-2', 'Red'); set('q-opt-2-3', 'Yellow');
      document.querySelector('input[name="q-correct-2"][value="0"]').checked = true;
    })()`);
    await teval(`document.getElementById('save-quiz-btn').click()`);
    await sleep(400);
    check('valid save returns to library', await teval('!document.getElementById("view-library").classList.contains("hidden")'));
    check('library now has 2 quizzes', (await teval('document.querySelectorAll(".quiz-card").length')) === 2);
    check('saved quiz appears by title', await teval('[...document.querySelectorAll(".quiz-card .quiz-title")].some(e => e.textContent === "Smoke Quiz")'));

    // 5. Play starter: Q1 correct, Q2 wrong, explanation shows, score updates.
    await teval(`document.querySelectorAll('.quiz-card')[0].querySelector('.btn-primary').click()`);
    await sleep(300);
    check('play view visible', await teval('!document.getElementById("view-play").classList.contains("hidden")'));
    check('progress shows Question 1 of 10', await teval('document.getElementById("play-progress").textContent') === 'Question 1 of 10');
    check('Q1 text is the capital question', await teval('document.getElementById("play-question-text").textContent') === 'What is the capital of Bangladesh?');
    await teval(`document.querySelectorAll('#play-options .option-btn')[0].click()`);
    await sleep(200);
    check('correct answer highlighted', await teval('document.querySelectorAll("#play-options .option-btn.correct").length') === 1);
    check('explanation shown after answering', await teval('!document.getElementById("play-explanation").classList.contains("hidden") && document.getElementById("play-explanation").textContent.includes("Dhaka")'));
    await teval(`document.getElementById('play-next-btn').click()`);
    await sleep(200);
    check('advanced to Question 2 of 10', await teval('document.getElementById("play-progress").textContent') === 'Question 2 of 10');
    await teval(`document.querySelectorAll('#play-options .option-btn')[0].click()`);
    await sleep(200);
    check('wrong answer highlighted', await teval('document.querySelectorAll("#play-options .option-btn.wrong").length') === 1);
    check('correct option also highlighted on wrong answer', await teval('document.querySelectorAll("#play-options .option-btn.correct").length') === 1);

    // 6. Finish the quiz: results screen with score + review.
    await teval(`(() => { const p = __qm.state.play; const q = p.quiz; for (let i = p.idx; i < q.questions.length; i++) { __qm.answerOption(q.questions[i].correct); __qm.nextQuestion(); } return 'done'; })()`);
    await sleep(400);
    check('results screen shown', await teval('!document.getElementById("play-results").classList.contains("hidden")'));
    check('score is 9/10 (90%) — 1 correct, 1 wrong, rest correct', await teval('document.getElementById("results-score").textContent') === 'Score: 9/10 (90%)');
    check('review list has 10 items', (await teval('document.querySelectorAll(".review-item").length')) === 10);
    check('review marks exactly 1 wrong', (await teval('document.querySelectorAll(".review-item.review-wrong").length')) === 1);
    check('best score saved in localStorage', await teval('JSON.parse(localStorage.getItem("qmbd-best-v1"))["starter-bangladesh-gk"].correct') === 9);

    // 7. Best score persists after reload.
    await tsend('Page.navigate', { url: PAGE });
    await waitFor(async () => (await teval('document.querySelectorAll(".quiz-card").length')) === 2, 10000, 'library after reload');
    check('best score shown on starter card after reload', await teval('document.querySelector(".quiz-card .quiz-best").textContent.includes("9/10")'));

    // 8. Duplicate + delete flow.
    await teval(`document.querySelectorAll('.quiz-card')[1].querySelectorAll('.card-actions .btn')[2].click()`);
    await sleep(300);
    check('duplicate adds a third card', (await teval('document.querySelectorAll(".quiz-card").length')) === 3);
    check('duplicate card has (Copy) in title', await teval('[...document.querySelectorAll(".quiz-card .quiz-title")].some(e => e.textContent.includes("(Copy)"))'));
    await teval(`(() => { const b = document.querySelectorAll('.quiz-card')[2].querySelectorAll('.card-actions .btn')[3]; b.click(); })()`);
    await sleep(200);
    check('first delete click arms confirm, card still there', (await teval('document.querySelectorAll(".quiz-card").length')) === 3);
    await teval(`(() => { const b = document.querySelectorAll('.quiz-card')[2].querySelectorAll('.card-actions .btn')[3]; b.click(); })()`);
    await sleep(300);
    check('second delete click removes the card', (await teval('document.querySelectorAll(".quiz-card").length')) === 2);

    // 9. Export/import round-trip via logic.
    check('exported JSON passes strict import validation', await teval('QuizMakerLogic.validateImport(__qm.exportJSON()).ok') === true);
    check('exported JSON contains both quizzes', await teval('JSON.parse(__qm.exportJSON()).quizzes.length') === 2);
    check('bad import rejected and data intact', await teval('__qm.doImportFromText(\'{"app":"wrong-app","quizzes":[]}\')') === false &&
      (await teval('document.querySelectorAll(".quiz-card").length')) === 2);
    check('re-import of own export succeeds', await teval('__qm.doImportFromText(__qm.exportJSON())') === true);
    check('import error message shown', await teval('document.getElementById("import-status").textContent.length > 0'));

    // 10. Per-question timer: timeout marks wrong and advances.
    await teval(`(() => {
      const timed = JSON.parse(JSON.stringify(__qm.state.quizzes[0]));
      timed.id = 'timed-1'; timed.title = 'Timed Quiz'; timed.timeLimit = 10;
      const all = JSON.parse(localStorage.getItem('qmbd-quizzes-v1')); all.push(timed);
      localStorage.setItem('qmbd-quizzes-v1', JSON.stringify(all));
    })()`);
    await tsend('Page.navigate', { url: PAGE });
    await waitFor(async () => (await teval('document.querySelectorAll(".quiz-card").length')) === 3, 10000, 'timed quiz present');
    await teval(`__qm.startPlay('timed-1')`);
    await sleep(300);
    check('timer visible with 10s countdown', await teval('!document.getElementById("play-timer").classList.contains("hidden") && document.getElementById("play-timer").textContent.includes("10")'));
    await sleep(13000);
    check('timeout auto-advanced to question 2', await teval('__qm.state.play.idx') === 1);
    check('timed-out answer recorded as null (wrong)', await teval('__qm.state.play.answers[0]') === null);
    await teval(`document.getElementById('quit-btn').click()`);
    await sleep(200);

    // 11. Bangla toggle renders Bengali and persists after reload.
    await teval(`document.getElementById('lang-toggle').click()`);
    await sleep(300);
    check('Bangla heading renders (non-ASCII title)', await teval('/[^\\x00-\\x7F]/.test(document.getElementById("app-title").textContent)'));
    check('Bangla digits used in library meta', await teval('/[\\u09e6-\\u09ef]/.test(document.querySelector(".quiz-card .quiz-meta").textContent)'));
    check('language persisted in localStorage', await teval('localStorage.getItem("qmbd-lang-v1")') === 'bn');
    await tsend('Page.navigate', { url: PAGE });
    await waitFor(async () => (await teval('document.querySelectorAll(".quiz-card").length')) === 3, 10000, 'library after BN reload');
    check('Bangla still active after reload', await teval('localStorage.getItem("qmbd-lang-v1") === "bn" && /[^\\x00-\\x7F]/.test(document.getElementById("app-title").textContent)'));
    await teval(`document.getElementById('lang-toggle').click()`);
    await sleep(300);
    check('toggle back to English', await teval('document.getElementById("app-title").textContent') === 'Quiz Maker BD');

    // 12. Mobile 390px: no horizontal overflow on all 4 tabs.
    await tsend('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await sleep(500);
    check('no overflow at 390px (library)', await teval('document.documentElement.scrollWidth <= 391'));
    await teval(`document.getElementById('new-quiz-btn').click()`);
    await sleep(300);
    check('no overflow at 390px (builder)', await teval('document.documentElement.scrollWidth <= 391'));
    await teval(`document.getElementById('cancel-quiz-btn').click()`);
    await sleep(200);
    await teval(`document.querySelectorAll('.quiz-card')[0].querySelector('.btn-primary').click()`);
    await sleep(300);
    check('no overflow at 390px (play)', await teval('document.documentElement.scrollWidth <= 391'));
    await teval(`document.getElementById('quit-btn').click()`);
    await sleep(200);
    await teval(`document.querySelector('.tab-btn[data-tab="data"]').click()`);
    await sleep(300);
    check('no overflow at 390px (data)', await teval('document.documentElement.scrollWidth <= 391'));

    // 13. No console errors / exceptions.
    check('zero console errors', consoleErrors.length === 0, consoleErrors.join(' | '));
    check('zero page exceptions', exceptions.length === 0, exceptions.join(' | '));

    tws.close(); ws.close();
  } finally {
    child.kill();
  }
  const failed = results.filter((r) => !r[1]).length;
  console.log(failed === 0 ? 'SMOKE PASS: ' + results.length + '/' + results.length : 'SMOKE FAIL: ' + failed + ' failures');
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => { console.error('SMOKE ERROR:', e.message); process.exit(1); });
