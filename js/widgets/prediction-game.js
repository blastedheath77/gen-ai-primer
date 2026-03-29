/**
 * prediction-game.js
 * Widget for Page 1 — The Prediction Game.
 * Shows a sentence prompt with the last word blanked and lets the learner guess.
 * On reveal, displays animated probability bars and feedback.
 */

import { Widget } from '../core/widget-base.js';

const IS_MOBILE = () => window.matchMedia('(max-width: 640px)').matches;

export class PredictionGame extends Widget {
    get defaults() {
        return {
            dataUrl: '../js/data/predictions.json',
        };
    }

    init() {
        this.state = {
            sentences: [],
            current: 0,
            phase: 'guess',   // 'guess' | 'revealed' | 'summary'
            guess: '',
            loaded: false,
            error: null,
            completed: [],
        };
        this.createDOM();
        this.bindEvents();
        this.loadData();
    }

    createDOM() {
        this.container.innerHTML = `
            <div class="pg-widget">
                <div class="pg-loading">Loading prediction data…</div>
            </div>`;
        this.root = this.container.querySelector('.pg-widget');
    }

    bindEvents() {}

    async loadData() {
        try {
            const res = await fetch(this.config.dataUrl);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            this.setState({ sentences: data.sentences, loaded: true });
        } catch (err) {
            this.setState({ error: err.message });
        }
    }

    render() {
        if (this.state.error) {
            this.root.innerHTML = `<p class="pg-error">Could not load data: ${this.state.error}</p>`;
            return;
        }
        if (!this.state.loaded) return;

        const { sentences, current, phase } = this.state;
        if (phase === 'summary') {
            this._renderSummary();
            return;
        }

        const sentence = sentences[current];
        if (!sentence) return;

        if (phase === 'guess') {
            this._renderGuessPhase(sentence, current, sentences.length);
        } else {
            this._renderRevealPhase(sentence, current, sentences.length);
        }
    }

    _renderGuessPhase(sentence, index, total) {
        const mobile = IS_MOBILE();
        const top = sentence.predictions.slice(0, 3);
        // Pick a random alternative that is NOT in top 5
        const topTokens = new Set(sentence.predictions.map(p => p.token));
        const alternatives = ['idea', 'house', 'dream', 'story', 'light', 'rain', 'path', 'time'].filter(w => !topTokens.has(w));
        const rand = alternatives[Math.floor(Math.random() * alternatives.length)] || 'thing';

        this.root.innerHTML = `
            <div class="pg-header">
                <span class="pg-counter">${index + 1} / ${total}</span>
                <span class="pg-instruction">What word comes next?</span>
            </div>
            <div class="pg-prompt">
                <span class="pg-prompt-text">${sentence.prompt.replace('___', '<span class="pg-blank">___</span>')}</span>
            </div>
            ${mobile ? `
                <div class="pg-chips-label">Pick the most likely next word:</div>
                <div class="pg-chips" id="pg-chips">
                    ${[...top.map(p => p.token), rand].sort(() => Math.random() - 0.5).map(tok =>
                        `<button class="btn btn-secondary pg-chip-btn" data-token="${tok}">${tok}</button>`
                    ).join('')}
                </div>
            ` : `
                <div class="pg-input-row">
                    <input type="text" class="pg-input" id="pg-input" placeholder="Type your guess…" autocomplete="off" value="${this.state.guess}">
                    <button class="btn btn-primary pg-reveal-btn" id="pg-reveal">Reveal</button>
                </div>
            `}`;

        if (mobile) {
            this.root.querySelectorAll('.pg-chip-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.setState({ guess: btn.dataset.token, phase: 'revealed' });
                });
            });
        } else {
            const input = this.root.querySelector('#pg-input');
            const btn = this.root.querySelector('#pg-reveal');

            input.addEventListener('input', e => { this.state.guess = e.target.value; });
            input.addEventListener('keydown', e => { if (e.key === 'Enter') this.setState({ phase: 'revealed' }); });
            btn.addEventListener('click', () => this.setState({ phase: 'revealed' }));

            requestAnimationFrame(() => input.focus());
        }
    }

    _renderRevealPhase(sentence, index, total) {
        const guess = this.state.guess.trim().toLowerCase();
        const predictions = sentence.predictions;
        const maxProb = predictions[0].probability;
        const guessMatchesTop5 = predictions.some(p => p.token.toLowerCase() === guess);
        const feedback = guessMatchesTop5
            ? '🎯 You think like an LLM!'
            : 'Nice try! Your creative choice differs from the statistical favourite.';
        const feedbackClass = guessMatchesTop5 ? 'pg-feedback-match' : 'pg-feedback-miss';

        this.root.innerHTML = `
            <div class="pg-header">
                <span class="pg-counter">${index + 1} / ${total}</span>
                <span class="pg-instruction">Here's what the model predicted:</span>
            </div>
            <div class="pg-prompt">
                <span class="pg-prompt-text">${sentence.prompt.replace('___', '<span class="pg-blank">___</span>')}</span>
            </div>
            <div class="pg-results">
                <div class="pg-results-cols">
                    <div class="pg-your-guess">
                        <div class="pg-col-label">Your guess</div>
                        <div class="pg-guess-word ${guessMatchesTop5 ? 'pg-guess-matched' : ''}">${guess || 'No guess yet'}</div>
                    </div>
                    <div class="pg-bar-section">
                        <div class="pg-col-label">Model's top predictions</div>
                        <div class="pg-bars" id="pg-bars" role="list" aria-label="Model predictions">
                            ${predictions.map((p, i) => {
                                const isMatch = p.token.toLowerCase() === guess;
                                return `
                                <div class="pg-bar-row ${isMatch ? 'pg-bar-highlighted' : ''}" role="listitem" aria-label="${p.token}: ${Math.round(p.probability * 100)}% probability">
                                    <span class="pg-bar-label">${p.token}</span>
                                    <div class="pg-bar-track" role="progressbar" aria-valuenow="${Math.round(p.probability * 100)}" aria-valuemin="0" aria-valuemax="100">
                                        <div class="pg-bar-fill" data-target="${(p.probability / maxProb) * 100}" style="width:0%"></div>
                                    </div>
                                    <span class="pg-bar-pct">${Math.round(p.probability * 100)}%</span>
                                </div>`;
                            }).join('')}
                        </div>
                    </div>
                </div>
                <div class="pg-feedback ${feedbackClass}">${feedback}</div>
            </div>
            <div class="pg-next-row">
                ${index + 1 < total
                    ? `<button class="btn btn-primary pg-next-btn" id="pg-next">Next sentence →</button>`
                    : `<button class="btn btn-primary pg-next-btn" id="pg-next">See summary →</button>`
                }
            </div>`;

        // Animate bars
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.root.querySelectorAll('.pg-bar-fill').forEach(bar => {
                    bar.style.transition = 'width 300ms ease';
                    bar.style.width = bar.dataset.target + '%';
                });
            });
        });

        const nextBtn = this.root.querySelector('#pg-next');
        nextBtn.addEventListener('click', () => {
            const completed = [...this.state.completed, {
                prompt: sentence.prompt,
                guess: this.state.guess,
                matched: guessMatchesTop5,
            }];
            const nextIndex = index + 1;
            if (nextIndex >= total) {
                this.setState({ completed, phase: 'summary' });
            } else {
                this.setState({ completed, current: nextIndex, phase: 'guess', guess: '' });
            }
        });
    }

    _renderSummary() {
        const { completed } = this.state;
        const matches = completed.filter(c => c.matched).length;
        const total = completed.length;
        const pct = Math.round((matches / total) * 100);

        this.root.innerHTML = `
            <div class="pg-summary">
                <div class="pg-summary-icon">${pct >= 60 ? '🏆' : pct >= 30 ? '🤔' : '🎨'}</div>
                <h3 class="pg-summary-title">You matched ${matches} of ${total} predictions</h3>
                <p class="pg-summary-desc">
                    ${pct >= 60
                        ? 'Your intuitions align closely with statistical patterns in language — just like an LLM!'
                        : pct >= 30
                        ? 'You matched some predictions. LLMs are probabilistic; there\'s often more than one good answer.'
                        : 'Your choices were creative and original — exactly where humans differ from statistical models.'
                    }
                </p>
                <div class="pg-summary-list">
                    ${completed.map(c => `
                        <div class="pg-summary-item ${c.matched ? 'pg-summary-match' : 'pg-summary-miss'}">
                            <span class="pg-summary-prompt">"${c.prompt.replace('___', `<strong>${c.guess || '?'}</strong>`)}"</span>
                            <span class="pg-summary-badge">${c.matched ? '✓ matched' : '✗ different'}</span>
                        </div>
                    `).join('')}
                </div>
                <button class="btn btn-secondary pg-restart-btn" id="pg-restart">Try again</button>
            </div>`;

        this.root.querySelector('#pg-restart').addEventListener('click', () => {
            this.setState({ current: 0, phase: 'guess', guess: '', completed: [] });
        });
    }
}

// ─── Inline styles injected once ──────────────────────────────────────────────
(function injectStyles() {
    if (document.getElementById('pg-styles')) return;
    const style = document.createElement('style');
    style.id = 'pg-styles';
    style.textContent = `
.pg-widget { font-family: var(--font-body); }
.pg-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:1.25rem; }
.pg-counter { font-size:var(--text-sm); color:var(--color-text-muted); font-weight:500; }
.pg-instruction { font-size:var(--text-sm); color:var(--color-text-muted); }
.pg-prompt { background:var(--color-surface-2); border-radius:var(--radius-md); padding:1.25rem 1.5rem; margin-bottom:1.5rem; font-size:var(--text-xl); line-height:1.6; }
.pg-blank { display:inline-block; min-width:3rem; border-bottom:2px solid var(--color-primary); color:transparent; background:var(--color-primary-light); border-radius:4px; }
.pg-input-row { display:flex; gap:0.75rem; align-items:center; }
.pg-input { flex:1; padding:0.625rem 1rem; border:1px solid var(--color-border); border-radius:var(--radius-sm); font-size:var(--text-base); font-family:var(--font-body); background:var(--color-surface); color:var(--color-text); }
.pg-input:focus { outline:none; border-color:var(--color-primary); box-shadow:0 0 0 3px rgba(13,148,136,0.12); }
.pg-chips { display:flex; flex-wrap:wrap; gap:0.5rem; margin-top:0.5rem; }
.pg-chips-label { font-size:var(--text-sm); color:var(--color-text-muted); margin-bottom:0.5rem; }
.pg-chip-btn { cursor:pointer; }
.pg-results-cols { display:grid; grid-template-columns:140px 1fr; gap:1.5rem; margin-bottom:1rem; }
@media(max-width:640px){ .pg-results-cols { grid-template-columns:1fr; } }
.pg-col-label { font-size:var(--text-xs); text-transform:uppercase; letter-spacing:0.08em; color:var(--color-text-muted); font-weight:600; margin-bottom:0.5rem; }
.pg-your-guess { display:flex; flex-direction:column; }
.pg-guess-word { font-size:var(--text-2xl); font-weight:600; color:var(--color-text); padding:0.5rem 0; }
.pg-guess-matched { color:var(--color-primary); }
.pg-bars { display:flex; flex-direction:column; gap:0.5rem; }
.pg-bar-row { display:grid; grid-template-columns:80px 1fr 40px; align-items:center; gap:0.5rem; }
.pg-bar-row.pg-bar-highlighted .pg-bar-fill { background:var(--color-secondary) !important; }
.pg-bar-row.pg-bar-highlighted .pg-bar-label { font-weight:600; color:var(--color-text); }
.pg-bar-label { font-size:var(--text-sm); color:var(--color-text-muted); text-align:right; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.pg-bar-track { height:26px; background:var(--color-surface-2); border-radius:var(--radius-full); overflow:hidden; }
.pg-bar-fill { height:100%; background:var(--color-primary); border-radius:var(--radius-full); width:0%; }
.pg-bar-pct { font-size:var(--text-xs); color:var(--color-text-muted); text-align:right; }
.pg-feedback { margin-top:1rem; padding:0.75rem 1rem; border-radius:var(--radius-sm); font-size:var(--text-sm); font-weight:500; }
.pg-feedback-match { background:rgba(13,148,136,0.1); color:var(--color-primary-dark); border:1px solid rgba(13,148,136,0.25); }
.pg-feedback-miss { background:var(--color-surface-2); color:var(--color-text-muted); border:1px solid var(--color-border); }
.pg-next-row { display:flex; justify-content:flex-end; margin-top:1.25rem; }
.pg-summary { text-align:center; padding:1rem 0; }
.pg-summary-icon { font-size:3rem; margin-bottom:0.5rem; }
.pg-summary-title { font-size:var(--text-xl); font-weight:600; margin-bottom:0.5rem; }
.pg-summary-desc { color:var(--color-text-muted); margin-bottom:1.5rem; max-width:500px; margin-left:auto; margin-right:auto; }
.pg-summary-list { display:flex; flex-direction:column; gap:0.5rem; text-align:left; max-width:560px; margin:0 auto 1.5rem; }
.pg-summary-item { display:flex; align-items:center; justify-content:space-between; gap:0.75rem; padding:0.5rem 0.75rem; border-radius:var(--radius-sm); font-size:var(--text-sm); }
.pg-summary-match { background:rgba(13,148,136,0.08); }
.pg-summary-miss { background:var(--color-surface-2); }
.pg-summary-badge { flex-shrink:0; font-size:var(--text-xs); font-weight:500; color:var(--color-text-muted); }
.pg-summary-match .pg-summary-badge { color:var(--color-primary); }
.pg-loading, .pg-error { color:var(--color-text-muted); font-size:var(--text-sm); padding:1rem; }
    `;
    document.head.appendChild(style);
}());
