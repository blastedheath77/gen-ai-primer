/* =============================================================
   COLOUR THEORY — Knowledge-check quiz widget
   New College Lanarkshire · Computing & Creative Industries

   Usage:
     mountQuiz(document.querySelector('.panel--right'), [
       { q: '...', options: ['A', 'B', 'C'], correct: 1, explain: '...' },
       ...
     ]);
   ============================================================= */

'use strict';

/**
 * Mount a knowledge-check quiz inside a container element.
 * Adds a floating lightbulb button + collapsible panel with minimise/close.
 *
 * @param {HTMLElement} container  Element to mount inside (typically .panel--right)
 * @param {Array<{q:string, options:string[], correct:number, explain:string}>} questions
 * @returns {{open:Function, close:Function, minimize:Function}}
 */
function mountQuiz(container, questions) {
  if (!container || !questions || !questions.length) return null;

  // ── FAB ──────────────────────────────────────────────────
  const fab = document.createElement('button');
  fab.className = 'quiz-fab';
  fab.setAttribute('aria-label', 'Open knowledge check');
  fab.setAttribute('aria-expanded', 'false');
  fab.title = 'Knowledge check';
  fab.innerHTML =
    '<span aria-hidden="true">💡</span>' +
    '<span class="quiz-fab__badge" aria-hidden="true" style="display:none;"></span>';
  container.appendChild(fab);
  const fabBadge = fab.querySelector('.quiz-fab__badge');

  // ── Panel ────────────────────────────────────────────────
  const panel = document.createElement('div');
  panel.className = 'quiz-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Knowledge check');
  panel.setAttribute('aria-modal', 'false');
  panel.innerHTML =
    '<div class="quiz-header">' +
      '<span class="quiz-header__title"><span aria-hidden="true">💡</span> Knowledge check</span>' +
      '<span class="quiz-header__progress">1 / ' + questions.length + '</span>' +
      '<button class="quiz-close" data-act="min" aria-label="Minimise — keep progress" title="Minimise (keeps progress)">&minus;</button>' +
      '<button class="quiz-close" data-act="close" aria-label="Close — reset quiz" title="Close (resets quiz)">&times;</button>' +
    '</div>' +
    '<div class="quiz-body"></div>';
  container.appendChild(panel);

  const progress = panel.querySelector('.quiz-header__progress');
  const minBtn   = panel.querySelector('[data-act="min"]');
  const closeBtn = panel.querySelector('[data-act="close"]');
  const body     = panel.querySelector('.quiz-body');

  // ── State ────────────────────────────────────────────────
  let current = 0;
  let answers = [];   // true | false | null per question
  let selected = null;
  let answered = false;
  let inProgress = false;

  // ── Helpers ──────────────────────────────────────────────
  function setBadge(text) {
    if (text) {
      fabBadge.textContent = text;
      fabBadge.style.display = 'flex';
    } else {
      fabBadge.style.display = 'none';
    }
  }

  // ── Render ───────────────────────────────────────────────
  function renderQuestion() {
    if (current >= questions.length) { renderSummary(); return; }
    const q = questions[current];
    progress.textContent = (current + 1) + ' / ' + questions.length;
    selected = null;
    answered = false;

    let html = '<p class="quiz-question">' + q.q + '</p>';
    html += '<div class="quiz-options" role="radiogroup">';
    q.options.forEach(function (opt, i) {
      html += '<button class="quiz-option" data-index="' + i + '" role="radio" aria-checked="false">' +
                '<span class="quiz-option__marker" aria-hidden="true"></span>' +
                '<span>' + opt + '</span>' +
              '</button>';
    });
    html += '</div>';
    html += '<div class="quiz-feedback"></div>';
    html += '<div class="quiz-actions">' +
              '<span class="quiz-actions__hint">Pick an answer</span>' +
              '<div style="display:flex;gap:8px;">' +
                '<button class="quiz-btn" data-act="skip">Skip</button>' +
                '<button class="quiz-btn quiz-btn--primary" data-act="submit" disabled>Check</button>' +
              '</div>' +
            '</div>';
    body.innerHTML = html;

    body.querySelectorAll('.quiz-option').forEach(function (opt) {
      opt.addEventListener('click', function () {
        if (answered) return;
        body.querySelectorAll('.quiz-option').forEach(function (o) {
          o.classList.remove('quiz-option--selected');
          o.setAttribute('aria-checked', 'false');
        });
        opt.classList.add('quiz-option--selected');
        opt.setAttribute('aria-checked', 'true');
        selected = parseInt(opt.dataset.index, 10);
        body.querySelector('[data-act="submit"]').disabled = false;
        body.querySelector('.quiz-actions__hint').textContent = 'Ready when you are';
      });
    });

    body.querySelector('[data-act="skip"]').addEventListener('click', function () {
      answers.push(null);
      current++;
      renderQuestion();
    });

    body.querySelector('[data-act="submit"]').addEventListener('click', function () {
      const submitBtn = body.querySelector('[data-act="submit"]');
      if (answered) { current++; renderQuestion(); return; }
      if (selected === null) return;

      const isCorrect = selected === q.correct;
      answers.push(isCorrect);
      answered = true;

      body.querySelectorAll('.quiz-option').forEach(function (opt, i) {
        opt.classList.remove('quiz-option--selected');
        opt.disabled = true;
        if (i === q.correct) opt.classList.add('quiz-option--correct');
        if (i === selected && !isCorrect) opt.classList.add('quiz-option--wrong');
      });

      const feedback = body.querySelector('.quiz-feedback');
      feedback.className = 'quiz-feedback ' + (isCorrect ? 'quiz-feedback--correct' : 'quiz-feedback--wrong');
      feedback.innerHTML = (isCorrect ? '<strong>✓ Correct.</strong> ' : '<strong>✗ Not quite.</strong> ') + q.explain;

      submitBtn.textContent = current < questions.length - 1 ? 'Next →' : 'See score';
      submitBtn.disabled = false;
      body.querySelector('[data-act="skip"]').style.display = 'none';
      body.querySelector('.quiz-actions__hint').textContent = '';
    });
  }

  function renderSummary() {
    const correct = answers.filter(function (a) { return a === true; }).length;
    const total = questions.length;
    progress.textContent = 'Done';
    const icon = correct === total ? '🎉' : correct >= total / 2 ? '👏' : '📚';
    const label = correct === total
      ? 'Perfect score — you nailed it.'
      : correct >= total / 2
        ? 'Nicely done. Try the ones you missed and re-take.'
        : 'Spend a bit more time with the widget and concepts, then re-take.';
    body.innerHTML =
      '<div class="quiz-summary">' +
        '<span class="quiz-summary__icon" aria-hidden="true">' + icon + '</span>' +
        '<div class="quiz-summary__score">' + correct + ' / ' + total + '</div>' +
        '<p class="quiz-summary__label">' + label + '</p>' +
      '</div>' +
      '<div class="quiz-actions" style="justify-content:center;">' +
        '<button class="quiz-btn quiz-btn--primary" data-act="restart">Try again</button>' +
      '</div>';
    body.querySelector('[data-act="restart"]').addEventListener('click', function () {
      current = 0; answers = []; renderQuestion();
    });
  }

  // ── Open / minimise / close ──────────────────────────────
  function open() {
    panel.classList.add('quiz-panel--open');
    fab.classList.add('quiz-fab--hidden');
    fab.setAttribute('aria-expanded', 'true');
    setBadge(null);
    if (!inProgress) {
      current = 0;
      answers = [];
      inProgress = true;
      renderQuestion();
    }
    // else: panel re-shows preserved DOM (resume in place)
  }

  function minimize() {
    panel.classList.remove('quiz-panel--open');
    fab.classList.remove('quiz-fab--hidden');
    fab.setAttribute('aria-expanded', 'false');
    if (current >= questions.length) {
      const correct = answers.filter(function (a) { return a === true; }).length;
      setBadge(correct + '/' + questions.length);
    } else {
      setBadge((current + 1) + '/' + questions.length);
    }
    fab.focus();
  }

  function close() {
    panel.classList.remove('quiz-panel--open');
    fab.classList.remove('quiz-fab--hidden');
    fab.setAttribute('aria-expanded', 'false');
    inProgress = false;
    current = 0;
    answers = [];
    body.innerHTML = '';
    setBadge(null);
    fab.focus();
  }

  fab.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  minBtn.addEventListener('click', minimize);

  // Esc minimises (preserves progress) when quiz is open
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && panel.classList.contains('quiz-panel--open')) {
      e.stopPropagation();
      minimize();
    }
  });

  return { open: open, close: close, minimize: minimize };
}

// Expose for non-module usage
if (typeof window !== 'undefined') window.mountQuiz = mountQuiz;
