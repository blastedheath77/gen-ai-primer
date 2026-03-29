/**
 * probability-builder.js
 * Widget for Page 3 — Probability, Not Certainty.
 * Shows a probability bar chart for next-token prediction.
 * The learner clicks tokens to build a growing sentence.
 */

import { Widget } from '../core/widget-base.js';

// Colours for rank 1→15 (vivid to muted)
const RANK_COLOURS = [
    '#0d9488','#0f9f93','#11ab99','#22c55e','#4ade80',
    '#86efac','#a3e7c5','#c3e9d5','#d1d5db','#c8c8c8',
    '#b8b8b8','#a8a8a8','#989898','#888888','#787878',
];

// Sentence colours by probability rank
const SENTENCE_RANK_COLOURS = [
    '#0d9488','#0ea5a0','#22c55e','#4ade80','#86efac',
    '#a3a3a3','#c4c4c4','#d1d5db','#e5e7eb','#f0f0f0',
    '#e0e0e0','#d4d4d4','#c8c8c8','#bbbbbb','#aaaaaa',
];

export class ProbabilityBuilder extends Widget {
    get defaults() {
        return { dataUrl: '../js/data/probability-trees.json' };
    }

    init() {
        this.state = {
            prompts: [],
            loaded: false,
            error: null,
            activeTab: 0,
            stepIndex: 0,
            chosenTokens: [],    // [{token, rank, colour}]
            showSummary: false,
        };
        this.createDOM();
        this.bindEvents();
        this.loadData();
    }

    createDOM() {
        this.container.innerHTML = `<div class="pb-widget"><div class="pb-loading">Loading…</div></div>`;
        this.root = this.container.querySelector('.pb-widget');
    }

    bindEvents() {}

    async loadData() {
        try {
            const res = await fetch(this.config.dataUrl);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            this.setState({ prompts: data.prompts, loaded: true });
        } catch (err) {
            this.setState({ error: err.message });
        }
    }

    _currentPrompt() {
        return this.state.prompts[this.state.activeTab];
    }

    _currentStep() {
        const prompt = this._currentPrompt();
        if (!prompt) return null;
        const idx = Math.min(this.state.stepIndex, prompt.steps.length - 1);
        return prompt.steps[idx];
    }

    render() {
        if (this.state.error) {
            this.root.innerHTML = `<p class="pb-error">Could not load data: ${this.state.error}</p>`;
            return;
        }
        if (!this.state.loaded) return;

        const { prompts, activeTab, chosenTokens, showSummary } = this.state;
        const prompt = prompts[activeTab];
        const step = this._currentStep();
        if (!prompt || !step) return;

        // Build growing sentence
        const sentenceHTML = this._buildSentenceHTML(prompt.start, chosenTokens);

        // Build bar rows
        const bars = step.predictions.slice(0, 15);
        const maxProb = bars[0]?.prob || 1;

        this.root.innerHTML = `
            <div class="pb-tabs tab-bar">
                ${prompts.map((p, i) => `
                    <button class="tab ${i === activeTab ? 'active' : ''}" data-tab="${i}">
                        ${p.id.charAt(0).toUpperCase() + p.id.slice(1)}
                    </button>`).join('')}
            </div>

            <div class="pb-context-label">Current context:</div>
            <div class="pb-sentence" id="pb-sentence">${sentenceHTML}</div>

            <div class="pb-chart-label">Next token probabilities — click to choose:</div>
            <div class="pb-bars" id="pb-bars">
                ${bars.map((pred, i) => {
                    const widthPct = (pred.prob / maxProb) * 100;
                    const rankColour = RANK_COLOURS[Math.min(i, RANK_COLOURS.length - 1)];
                    const isRank1 = i === 0;
                    return `
                    <div class="pb-bar-row" data-rank="${i}" data-token="${pred.token}" role="button" aria-label="${pred.token} — ${pred.prob >= 0.005 ? Math.round(pred.prob * 100) + '%' : 'less than 1%'} probability (rank ${i + 1})" title="${Math.round(pred.prob * 100)}% probability">
                        <span class="pb-bar-label">${pred.token}</span>
                        <div class="pb-bar-track">
                            <div class="pb-bar-fill" style="width:0%; background:${rankColour}" data-target="${widthPct}"></div>
                        </div>
                        <span class="pb-bar-pct">${pred.prob >= 0.005 ? Math.round(pred.prob * 100) + '%' : '<1%'}</span>
                    </div>`;
                }).join('')}
            </div>

            <div class="pb-actions">
                <button class="btn btn-secondary pb-autopick" id="pb-autopick">Auto-pick (most likely)</button>
                <button class="btn btn-ghost pb-restart" id="pb-restart">Start over</button>
            </div>

            ${showSummary ? this._buildSummaryHTML(prompt.start, chosenTokens) : ''}
        `;

        // Animate bars after paint
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.root.querySelectorAll('.pb-bar-fill').forEach(el => {
                    el.style.transition = 'width 250ms ease';
                    el.style.width = el.dataset.target + '%';
                });
            });
        });

        // Tab click
        this.root.querySelectorAll('.tab[data-tab]').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.tab, 10);
                if (idx !== this.state.activeTab) {
                    this.setState({ activeTab: idx, stepIndex: 0, chosenTokens: [], showSummary: false });
                }
            });
        });

        // Bar click
        this.root.querySelectorAll('.pb-bar-row').forEach(row => {
            row.addEventListener('click', () => {
                const token = row.dataset.token;
                const rank = parseInt(row.dataset.rank, 10);
                this._pickToken(token, rank);
            });
        });

        // Auto-pick
        this.root.querySelector('#pb-autopick').addEventListener('click', () => {
            const step = this._currentStep();
            if (step) this._pickToken(step.predictions[0].token, 0);
        });

        // Start over
        this.root.querySelector('#pb-restart').addEventListener('click', () => {
            this.setState({ stepIndex: 0, chosenTokens: [], showSummary: false });
        });
    }

    _pickToken(token, rank) {
        const prompt = this._currentPrompt();
        if (!prompt) return;

        const colour = SENTENCE_RANK_COLOURS[Math.min(rank, SENTENCE_RANK_COLOURS.length - 1)];
        const chosenTokens = [...this.state.chosenTokens, { token, rank, colour }];
        const nextStep = this.state.stepIndex + 1;
        const maxSteps = prompt.steps.length - 1;
        const showSummary = chosenTokens.length >= 8 || nextStep > maxSteps;

        this.setState({
            chosenTokens,
            stepIndex: Math.min(nextStep, maxSteps),
            showSummary,
        });
    }

    _buildSentenceHTML(start, chosen) {
        const startSpan = `<span class="pb-sent-start">${start}</span>`;
        const chosenSpans = chosen.map(({ token, colour }) =>
            `<span class="pb-sent-token" style="color:${colour}; border-bottom:2px solid ${colour}">${token}</span>`
        ).join(' ');
        return startSpan + (chosen.length ? ' ' + chosenSpans : ' <span class="pb-sent-cursor">▋</span>');
    }

    _buildSummaryHTML(start, chosen) {
        const full = start + ' ' + chosen.map(c => c.token).join(' ');
        const avg = chosen.length
            ? Math.round(chosen.reduce((s, c) => s + c.rank, 0) / chosen.length) + 1
            : 0;

        let commentary;
        if (avg <= 3) {
            commentary = 'You followed the highest-probability path — a coherent, expected continuation.';
        } else if (avg <= 7) {
            commentary = 'A mix of likely and surprising choices — the model would consider this plausible but not the most obvious path.';
        } else {
            commentary = 'You chose from the lower-probability tokens — valid but statistically unusual. This is where creativity and randomness live.';
        }

        return `
            <div class="pb-summary">
                <div class="pb-summary-title">Your sentence:</div>
                <p class="pb-summary-text">"${full}"</p>
                <p class="pb-summary-comment">${commentary}</p>
                <p class="pb-summary-avg">Average probability rank: <strong>${avg}</strong> out of 15</p>
            </div>`;
    }
}

// ── Inline styles ─────────────────────────────────────────────────────────────
(function injectStyles() {
    if (document.getElementById('pb-styles')) return;
    const style = document.createElement('style');
    style.id = 'pb-styles';
    style.textContent = `
.pb-widget { font-family:var(--font-body); }
.pb-loading, .pb-error { color:var(--color-text-muted); font-size:var(--text-sm); padding:1rem; }
.pb-context-label, .pb-chart-label { font-size:var(--text-xs); text-transform:uppercase; letter-spacing:0.08em; font-weight:600; color:var(--color-text-muted); margin-bottom:0.5rem; }
.pb-context-label { margin-top:0; margin-bottom:0.5rem; }
.pb-chart-label { margin-top:1.5rem; }
.pb-sentence { font-size:var(--text-lg); line-height:1.7; padding:0.75rem 1rem; background:var(--color-surface-2); border-radius:var(--radius-sm); margin-bottom:0.25rem; min-height:2.5rem; }
.pb-sent-start { color:var(--color-text-muted); }
.pb-sent-token { font-weight:500; padding:0 2px; }
.pb-sent-cursor { color:var(--color-primary); animation:blink 1s step-end infinite; }
.pb-bars { display:flex; flex-direction:column; gap:0.35rem; }
.pb-bar-row { display:grid; grid-template-columns:90px 1fr 40px; align-items:center; gap:0.5rem; cursor:pointer; border-radius:var(--radius-sm); padding:3px 4px; transition:background 0.12s; }
.pb-bar-row:hover { background:var(--color-surface-2); }
.pb-bar-label { font-size:var(--text-sm); color:var(--color-text); text-align:right; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-family:var(--font-mono); }
.pb-bar-track { height:24px; background:var(--color-surface-2); border-radius:var(--radius-full); overflow:hidden; }
.pb-bar-fill { height:100%; border-radius:var(--radius-full); width:0%; }
.pb-bar-pct { font-size:var(--text-xs); color:var(--color-text-muted); text-align:right; }
.pb-actions { display:flex; gap:0.75rem; margin-top:1.25rem; flex-wrap:wrap; }
.pb-summary { margin-top:1.5rem; padding:1.25rem; background:var(--color-surface-2); border-radius:var(--radius-md); border:1px solid var(--color-border); }
.pb-summary-title { font-size:var(--text-xs); text-transform:uppercase; letter-spacing:0.08em; font-weight:600; color:var(--color-text-muted); margin-bottom:0.5rem; }
.pb-summary-text { font-size:var(--text-lg); font-style:italic; color:var(--color-text); margin-bottom:0.75rem; }
.pb-summary-comment { font-size:var(--text-sm); color:var(--color-text-muted); margin-bottom:0.5rem; }
.pb-summary-avg { font-size:var(--text-sm); color:var(--color-text-muted); }
@media(max-width:640px){
    .pb-bar-row { grid-template-columns:70px 1fr 36px; }
    .pb-bar-label { font-size:var(--text-xs); }
}
    `;
    document.head.appendChild(style);
}());
