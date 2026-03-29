/**
 * spot-fabrication.js
 * Widget for Page 13 — Hallucination: Confident but Wrong
 * Learners identify fabricated sentences in AI-generated passages.
 */

import { Widget } from '../core/widget-base.js';

// ─── Inline styles ────────────────────────────────────────────────────────────
(function injectStyles() {
    if (document.getElementById('sf-styles')) return;
    const s = document.createElement('style');
    s.id = 'sf-styles';
    s.textContent = `
.sf-widget { font-family:var(--font-body); }
.sf-loading, .sf-error { color:var(--color-text-muted); font-size:var(--text-sm); padding:1rem; }
.sf-controls { display:flex; align-items:center; justify-content:space-between; gap:0.75rem; margin-bottom:1rem; flex-wrap:wrap; }
.sf-category-selector { display:flex; gap:0.375rem; flex-wrap:wrap; }
.sf-cat-btn { padding:0.375rem 0.875rem; border-radius:var(--radius-full); border:1px solid var(--color-border); background:var(--color-surface); color:var(--color-text-muted); font-size:var(--text-sm); cursor:pointer; transition:all 150ms; font-family:var(--font-body); }
.sf-cat-btn:hover:not(:disabled) { border-color:var(--color-tertiary); color:var(--color-tertiary); }
.sf-cat-btn--active { background:var(--color-tertiary); color:#fff; border-color:var(--color-tertiary); font-weight:600; }
.sf-cat-btn:disabled { opacity:0.5; cursor:not-allowed; }
.sf-round-counter { font-size:var(--text-sm); color:var(--color-text-muted); font-weight:500; }
.sf-instruction { font-size:var(--text-sm); color:var(--color-text-muted); margin-bottom:1rem; line-height:var(--leading-relaxed); padding:0.75rem 1rem; background:var(--color-surface-2); border-radius:var(--radius-sm); }
.sf-passage { line-height:var(--leading-relaxed); margin-bottom:1.25rem; }
.sf-sentence { display:inline; cursor:pointer; padding:2px 4px; border-radius:3px; transition:background 150ms, box-shadow 150ms; border-bottom:2px solid transparent; }
.sf-sentence:hover { background:rgba(99,102,241,0.08); }
.sf-sentence--selected { background:rgba(99,102,241,0.15); border-bottom-color:var(--color-tertiary); box-shadow:0 0 0 1px rgba(99,102,241,0.2); }
.sf-sentence--fabricated { background:rgba(225,29,72,0.1); border-bottom-color:var(--color-accent-4); }
.sf-sentence--true { background:rgba(22,163,74,0.08); border-bottom-color:var(--color-success); }
.sf-marker { display:block; font-size:var(--text-xs); font-weight:600; margin-top:0.25rem; }
.sf-marker--caught { color:var(--color-success); }
.sf-marker--missed { color:var(--color-accent-4); }
.sf-marker--accurate { color:var(--color-success); }
.sf-explanation { display:block; font-size:var(--text-xs); color:var(--color-text-muted); margin-top:0.125rem; line-height:var(--leading-relaxed); }
.sf-actions { display:flex; gap:0.75rem; margin-bottom:1rem; }
.sf-feedback { margin-bottom:1rem; }
.sf-feedback-row { display:flex; flex-wrap:wrap; gap:0.75rem; }
.sf-feedback-stat { font-size:var(--text-sm); font-weight:500; padding:0.375rem 0.75rem; border-radius:var(--radius-sm); }
.sf-feedback-stat--good { background:rgba(22,163,74,0.1); color:var(--color-success); }
.sf-feedback-stat--bad { background:rgba(225,29,72,0.1); color:var(--color-accent-4); }
.sf-feedback-stat--warn { background:rgba(217,119,6,0.1); color:var(--color-secondary); }
.sf-summary-panel { text-align:center; padding:1.5rem; }
.sf-summary-title { font-size:var(--text-xl); font-weight:600; margin-bottom:1rem; }
.sf-summary-stats { display:flex; justify-content:center; gap:1.5rem; margin-bottom:1rem; flex-wrap:wrap; }
.sf-summary-stat { display:flex; flex-direction:column; align-items:center; }
.sf-summary-num { font-size:var(--text-2xl); font-weight:700; }
.sf-summary-stat--good .sf-summary-num { color:var(--color-success); }
.sf-summary-stat--bad .sf-summary-num { color:var(--color-accent-4); }
.sf-summary-stat--neutral .sf-summary-num { color:var(--color-text-muted); }
.sf-summary-label { font-size:var(--text-xs); color:var(--color-text-muted); text-transform:uppercase; letter-spacing:0.05em; }
.sf-summary-verdict { color:var(--color-text-muted); margin-bottom:1rem; max-width:500px; margin-left:auto; margin-right:auto; line-height:var(--leading-relaxed); }
.sf-summary-mechanic { background:var(--color-surface-2); border-radius:var(--radius-md); padding:1rem; font-size:var(--text-sm); color:var(--color-text-muted); line-height:var(--leading-relaxed); margin-bottom:1.25rem; text-align:left; }
.sf-why-panel { border-top:1px solid var(--color-border); margin-top:1.5rem; padding-top:1rem; }
.sf-why-toggle { display:inline-flex; align-items:center; gap:0.5rem; border:none; background:transparent; color:var(--color-tertiary); font-family:var(--font-body); font-size:var(--text-sm); font-weight:500; cursor:pointer; padding:0.25rem 0; }
.sf-why-toggle:hover { opacity:0.75; }
.sf-why-toggle .toggle-arrow { display:inline-block; transition:transform 0.2s ease; }
.sf-why-toggle[aria-expanded="true"] .toggle-arrow { transform:rotate(90deg); }
.sf-why-content { max-height:0; overflow:hidden; transition:max-height 0.3s ease; }
.sf-why-content--open { max-height:500px; }
.sf-why-content p { margin-top:0.75rem; font-size:var(--text-sm); color:var(--color-text-muted); line-height:var(--leading-relaxed); }
@media(max-width:640px) {
    .sf-summary-stats { gap:1rem; }
    .sf-sentence { font-size:var(--text-sm); }
}
    `;
    document.head.appendChild(s);
}());

export class SpotFabrication extends Widget {
    get defaults() {
        return {
            dataPath: '../js/data/fabrication-passages.json',
        };
    }

    async init() {
        this.state = {
            data: null,
            selectedCategory: 0,
            currentRound: 0,
            selectedSentences: new Set(),
            revealed: false,
            roundResults: [], // { caught, missed, falsePositives } per round
            phase: 'playing', // 'playing' | 'revealed' | 'summary'
        };

        this.container.innerHTML = `<div class="sf-loading">Loading…</div>`;

        try {
            const res = await fetch(this.config.dataPath);
            this.state.data = await res.json();
        } catch (e) {
            this.container.innerHTML = `<div class="sf-error">Could not load passage data.</div>`;
            return;
        }

        this.createDOM();
        this.bindEvents();
        this.render();
    }

    createDOM() {
        this.container.innerHTML = `
<div class="sf-widget">
    <div class="sf-controls">
        <div class="sf-category-selector" id="sf-category-selector"></div>
        <div class="sf-round-counter" id="sf-round-counter"></div>
    </div>

    <div class="sf-instruction" id="sf-instruction">
        Some of these claims were fabricated by an AI. Click the sentences you think are false.
    </div>

    <div class="sf-passage" id="sf-passage"></div>

    <div class="sf-actions" id="sf-actions">
        <button class="btn btn-primary" id="sf-reveal-btn">Reveal</button>
    </div>

    <div class="sf-feedback" id="sf-feedback" style="display:none"></div>

    <div class="sf-summary" id="sf-summary" style="display:none"></div>

    <div class="sf-why-panel">
        <button class="sf-why-toggle" id="sf-why-toggle" aria-expanded="false">
            <span class="toggle-arrow">▶</span> Why does this happen?
        </button>
        <div class="sf-why-content" id="sf-why-content">
            <p>An LLM doesn't store facts the way a database does. It learns statistical patterns — which words tend to follow which other words, in which contexts. When it generates text, it's predicting the most plausible-sounding continuation, not retrieving verified information.</p>
            <p>This means it can produce text that <em>sounds</em> authoritative — with specific dates, names, and details — while being completely wrong. The model has no mechanism to distinguish "things I know to be true" from "things that sound like they should be true".</p>
            <p>Hallucination isn't a bug waiting to be patched. It's an inherent property of the prediction mechanism. The fluency that makes AI text impressive is the same quality that makes fabrications convincing.</p>
        </div>
    </div>
</div>`;

        this._els = {
            categorySelector: this.container.querySelector('#sf-category-selector'),
            roundCounter: this.container.querySelector('#sf-round-counter'),
            instruction: this.container.querySelector('#sf-instruction'),
            passage: this.container.querySelector('#sf-passage'),
            actions: this.container.querySelector('#sf-actions'),
            revealBtn: this.container.querySelector('#sf-reveal-btn'),
            feedback: this.container.querySelector('#sf-feedback'),
            summary: this.container.querySelector('#sf-summary'),
            whyToggle: this.container.querySelector('#sf-why-toggle'),
            whyContent: this.container.querySelector('#sf-why-content'),
        };
    }

    bindEvents() {
        this._els.revealBtn.addEventListener('click', () => this._handleReveal());

        this._els.whyToggle.addEventListener('click', () => {
            const expanded = this._els.whyToggle.getAttribute('aria-expanded') === 'true';
            this._els.whyToggle.setAttribute('aria-expanded', String(!expanded));
            this._els.whyContent.classList.toggle('sf-why-content--open', !expanded);
        });

        // Category selector is re-rendered, so we use delegation on the container
        this.container.addEventListener('click', (e) => {
            const catBtn = e.target.closest('[data-cat-idx]');
            if (catBtn && this.state.phase === 'playing' && this.state.currentRound === 0 && this.state.roundResults.length === 0) {
                this.setState({
                    selectedCategory: parseInt(catBtn.dataset.catIdx, 10),
                    currentRound: 0,
                    selectedSentences: new Set(),
                    revealed: false,
                    roundResults: [],
                    phase: 'playing',
                });
            }

            const nextBtn = e.target.closest('#sf-next-btn');
            if (nextBtn) this._handleNext();

            const restartBtn = e.target.closest('#sf-restart-btn');
            if (restartBtn) {
                this.setState({
                    selectedCategory: this.state.selectedCategory,
                    currentRound: 0,
                    selectedSentences: new Set(),
                    revealed: false,
                    roundResults: [],
                    phase: 'playing',
                });
            }
        });
    }

    _currentCategory() {
        return this.state.data[this.state.selectedCategory];
    }

    _currentRound() {
        return this._currentCategory().rounds[this.state.currentRound];
    }

    _handleSentenceClick(sentenceId) {
        if (this.state.revealed) return;
        const sel = new Set(this.state.selectedSentences);
        if (sel.has(sentenceId)) {
            sel.delete(sentenceId);
        } else {
            sel.add(sentenceId);
        }
        this.setState({ selectedSentences: sel });
    }

    _handleReveal() {
        if (this.state.revealed) return;
        const round = this._currentRound();
        let caught = 0, missed = 0, falsePositives = 0;

        round.sentences.forEach(s => {
            const selected = this.state.selectedSentences.has(s.id);
            if (s.fabricated && selected) caught++;
            if (s.fabricated && !selected) missed++;
            if (!s.fabricated && selected) falsePositives++;
        });

        const results = [...this.state.roundResults, { caught, missed, falsePositives }];
        this.setState({ revealed: true, roundResults: results });
    }

    _handleNext() {
        const cat = this._currentCategory();
        const nextRound = this.state.currentRound + 1;
        if (nextRound >= cat.rounds.length) {
            this.setState({ phase: 'summary' });
        } else {
            this.setState({
                currentRound: nextRound,
                selectedSentences: new Set(),
                revealed: false,
                phase: 'playing',
            });
        }
    }

    render() {
        if (!this.state.data) return;

        this._renderCategorySelector();
        this._renderRoundCounter();

        if (this.state.phase === 'summary') {
            this._renderSummary();
            this._els.passage.style.display = 'none';
            this._els.actions.style.display = 'none';
            this._els.instruction.style.display = 'none';
            this._els.feedback.style.display = 'none';
            this._els.summary.style.display = 'block';
        } else {
            this._els.summary.style.display = 'none';
            this._els.passage.style.display = 'block';
            this._els.instruction.style.display = 'block';
            this._renderPassage();
            this._renderActions();
            this._renderFeedback();
        }
    }

    _renderCategorySelector() {
        const { data, selectedCategory, roundResults, phase } = this.state;
        const disabled = roundResults.length > 0 || phase === 'summary';
        this._els.categorySelector.innerHTML = data.map((cat, i) => `
            <button
                class="sf-cat-btn${i === selectedCategory ? ' sf-cat-btn--active' : ''}"
                data-cat-idx="${i}"
                ${disabled ? 'disabled' : ''}
            >${cat.category}</button>
        `).join('');
    }

    _renderRoundCounter() {
        const cat = this._currentCategory();
        const total = cat.rounds.length;
        const current = this.state.phase === 'summary' ? total : this.state.currentRound + 1;
        this._els.roundCounter.textContent = `Round ${current} of ${total}`;
    }

    _renderPassage() {
        const round = this._currentRound();
        const { selectedSentences, revealed } = this.state;

        this._els.passage.innerHTML = round.sentences.map(s => {
            let cls = 'sf-sentence';
            let marker = '';
            let explanation = '';

            if (!revealed) {
                if (selectedSentences.has(s.id)) cls += ' sf-sentence--selected';
            } else {
                if (s.fabricated) {
                    cls += ' sf-sentence--fabricated';
                    const wasCaught = selectedSentences.has(s.id);
                    marker = wasCaught
                        ? `<span class="sf-marker sf-marker--caught">Well spotted!</span>`
                        : `<span class="sf-marker sf-marker--missed">This one slipped past — notice how confident it sounds</span>`;
                    explanation = `<span class="sf-explanation">${s.explanation}</span>`;
                } else {
                    cls += ' sf-sentence--true';
                    marker = `<span class="sf-marker sf-marker--accurate">✓ This is accurate</span>`;
                    explanation = `<span class="sf-explanation">${s.explanation}</span>`;
                }
            }

            return `<span
                class="${cls}"
                data-sentence-id="${s.id}"
                role="${revealed ? 'text' : 'button'}"
                ${!revealed ? 'tabindex="0" aria-pressed="' + selectedSentences.has(s.id) + '"' : ''}
            >${s.text}${marker}${explanation}</span>`;
        }).join(' ');

        if (!this.state.revealed) {
            this._els.passage.querySelectorAll('.sf-sentence').forEach(el => {
                el.addEventListener('click', () => this._handleSentenceClick(el.dataset.sentenceId));
                el.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this._handleSentenceClick(el.dataset.sentenceId);
                    }
                });
            });
        }
    }

    _renderActions() {
        const { revealed, phase } = this.state;
        const cat = this._currentCategory();
        const isLastRound = this.state.currentRound >= cat.rounds.length - 1;

        if (!revealed) {
            this._els.actions.innerHTML = `<button class="btn btn-primary" id="sf-reveal-btn">Reveal</button>`;
            this._els.actions.querySelector('#sf-reveal-btn').addEventListener('click', () => this._handleReveal());
            this._els.actions.style.display = 'flex';
            this._els.feedback.style.display = 'none';
        } else {
            const nextLabel = isLastRound ? 'See Summary' : 'Next Round';
            this._els.actions.innerHTML = `<button class="btn btn-primary" id="sf-next-btn">${nextLabel} →</button>`;
            this._els.actions.querySelector('#sf-next-btn').addEventListener('click', () => this._handleNext());
            this._els.actions.style.display = 'flex';
        }
    }

    _renderFeedback() {
        if (!this.state.revealed) {
            this._els.feedback.style.display = 'none';
            return;
        }
        const results = this.state.roundResults[this.state.roundResults.length - 1];
        if (!results) return;
        const total = this._currentRound().sentences.filter(s => s.fabricated).length;
        this._els.feedback.innerHTML = `
            <div class="sf-feedback-row">
                <span class="sf-feedback-stat sf-feedback-stat--good">✓ Caught: ${results.caught} / ${total}</span>
                ${results.missed > 0 ? `<span class="sf-feedback-stat sf-feedback-stat--bad">✗ Missed: ${results.missed}</span>` : ''}
                ${results.falsePositives > 0 ? `<span class="sf-feedback-stat sf-feedback-stat--warn">⚠ False positives: ${results.falsePositives}</span>` : ''}
            </div>`;
        this._els.feedback.style.display = 'block';
    }

    _renderSummary() {
        const results = this.state.roundResults;
        const totalCaught = results.reduce((a, r) => a + r.caught, 0);
        const totalMissed = results.reduce((a, r) => a + r.missed, 0);
        const totalFP = results.reduce((a, r) => a + r.falsePositives, 0);
        const totalFabrications = this._currentCategory().rounds
            .flatMap(r => r.sentences)
            .filter(s => s.fabricated).length;

        let verdict = '';
        const ratio = totalFabrications > 0 ? totalCaught / totalFabrications : 0;
        if (ratio >= 0.8) verdict = `Excellent — you caught most of them. But notice how fluent and confident the fabricated text sounded.`;
        else if (ratio >= 0.5) verdict = `Good effort. The ones you missed were probably the most convincing — that's the whole problem.`;
        else verdict = `Fabrications are hard to spot. This is why we can't rely on fluency or confidence as signals of accuracy.`;

        this._els.summary.innerHTML = `
            <div class="sf-summary-panel">
                <h3 class="sf-summary-title">Results for ${this._currentCategory().category}</h3>
                <div class="sf-summary-stats">
                    <div class="sf-summary-stat sf-summary-stat--good">
                        <span class="sf-summary-num">${totalCaught}</span>
                        <span class="sf-summary-label">Fabrications caught</span>
                    </div>
                    <div class="sf-summary-stat sf-summary-stat--bad">
                        <span class="sf-summary-num">${totalMissed}</span>
                        <span class="sf-summary-label">Fabrications missed</span>
                    </div>
                    <div class="sf-summary-stat sf-summary-stat--neutral">
                        <span class="sf-summary-num">${totalFP}</span>
                        <span class="sf-summary-label">False positives</span>
                    </div>
                </div>
                <p class="sf-summary-verdict">${verdict}</p>
                <div class="sf-summary-mechanic">
                    <strong>The mechanical explanation:</strong> The model was never "trying" to deceive you.
                    It predicted the most plausible-sounding continuation of its context window.
                    When it generated a fabricated fact, every token was statistically reasonable given the surrounding text.
                    There is no internal "check" — only pattern completion.
                </div>
                <button class="btn btn-secondary" id="sf-restart-btn">Try another category</button>
            </div>`;

        this._els.summary.querySelector('#sf-restart-btn').addEventListener('click', () => {
            this.setState({
                selectedCategory: (this.state.selectedCategory + 1) % this.state.data.length,
                currentRound: 0,
                selectedSentences: new Set(),
                revealed: false,
                roundResults: [],
                phase: 'playing',
            });
        });
    }
}
