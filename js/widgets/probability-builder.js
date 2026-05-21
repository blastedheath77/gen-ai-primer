/**
 * probability-builder.js
 * Widget for Page 3 — Probability, Not Certainty.
 * Shows a probability bar chart for next-token prediction.
 * The learner clicks tokens to build a growing sentence.
 */

import { Widget } from '../core/widget-base.js';
import { apiMode } from '../core/api-mode.js';

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

            // Live mode (Gemini, via /api/gemini-predict)
            liveMode: localStorage.getItem('ai-primer-pb-live') === 'true',
            settingsOpen: false,
            liveStart: 'She walked into the',
            livePredictions: null,
            liveChosen: [],          // [{token, rank, colour, prob}]
            liveLoading: false,
            liveError: null,
        };
        this.createDOM();
        this.bindEvents();
        this.loadData();
        if (this.state.liveMode) {
            // fire-and-forget — first fetch happens after JSON load too, but
            // we want predictions ready when render() runs
            this._fetchLivePredictions(this.state.liveStart);
        }
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
        if (this.state.error && !this.state.liveMode) {
            this.root.innerHTML = `<p class="pb-error">Could not load data: ${this.state.error}</p>`;
            return;
        }
        if (!this.state.loaded && !this.state.liveMode) return;

        if (this.state.liveMode) {
            this._renderLive();
        } else {
            this._renderStatic();
        }
    }

    _renderStatic() {
        const { prompts, activeTab, chosenTokens, showSummary } = this.state;
        const prompt = prompts[activeTab];
        const step = this._currentStep();
        if (!prompt || !step) return;

        const sentenceHTML = this._buildSentenceHTML(prompt.start, chosenTokens);
        const bars = step.predictions.slice(0, 10);
        const maxProb = bars[0]?.prob || 1;

        this.root.innerHTML = `
            ${this._modeBarHTML()}
            ${this._settingsPanelHTML()}
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
                ${bars.map((pred, i) => this._barRowHTML(pred.token, pred.prob, maxProb, i)).join('')}
            </div>

            <div class="pb-actions">
                <button class="btn btn-secondary pb-autopick" id="pb-autopick">Auto-pick (most likely)</button>
                <button class="btn btn-ghost pb-restart" id="pb-restart">Start over</button>
            </div>

            ${showSummary ? this._buildSummaryHTML(prompt.start, chosenTokens) : ''}
        `;

        this._animateBars();
        this._bindModeBar();
        this._bindSettingsPanel();

        this.root.querySelectorAll('.tab[data-tab]').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.tab, 10);
                if (idx !== this.state.activeTab) {
                    this.setState({ activeTab: idx, stepIndex: 0, chosenTokens: [], showSummary: false });
                }
            });
        });
        this.root.querySelectorAll('.pb-bar-row').forEach(row => {
            row.addEventListener('click', () => {
                this._pickToken(row.dataset.token, parseInt(row.dataset.rank, 10));
            });
        });
        this.root.querySelector('#pb-autopick').addEventListener('click', () => {
            const step = this._currentStep();
            if (step) this._pickToken(step.predictions[0].token, 0);
        });
        this.root.querySelector('#pb-restart').addEventListener('click', () => {
            this.setState({ stepIndex: 0, chosenTokens: [], showSummary: false });
        });
    }

    _renderLive() {
        const { liveStart, liveChosen, livePredictions, liveLoading, liveError, showSummary } = this.state;
        const sentenceHTML = this._buildLiveSentenceHTML(liveStart, liveChosen);

        const bars = livePredictions ? livePredictions.slice(0, 10) : [];
        const maxProb = bars[0]?.prob || 1;

        const barsHTML = liveLoading
            ? `<div class="pb-live-loading">⟳ Asking Gemini…</div>`
            : liveError
                ? `<div class="pb-error">${liveError}</div>`
                : bars.length
                    ? bars.map((pred, i) => this._barRowHTML(this._displayToken(pred.token), pred.prob, maxProb, i, pred.token)).join('')
                    : `<div class="pb-live-loading">Type a starting phrase and click <strong>Start</strong>.</div>`;

        this.root.innerHTML = `
            ${this._modeBarHTML()}
            ${this._settingsPanelHTML()}
            <div class="pb-live-start-row">
                <label class="pb-live-start-label" for="pb-live-start">Starting text:</label>
                <input type="text" class="pb-live-start" id="pb-live-start" value="${this._escape(liveStart)}" autocomplete="off">
                <button class="btn btn-secondary pb-live-go" id="pb-live-go">Start</button>
            </div>

            <div class="pb-context-label">Current context:</div>
            <div class="pb-sentence" id="pb-sentence">${sentenceHTML}</div>

            <div class="pb-chart-label">Next token probabilities — click to choose (estimated by Gemini):</div>
            <div class="pb-bars" id="pb-bars">${barsHTML}</div>

            <div class="pb-actions">
                <button class="btn btn-secondary pb-autopick" id="pb-autopick" ${liveLoading || !bars.length ? 'disabled' : ''}>Auto-pick (most likely)</button>
                <button class="btn btn-ghost pb-restart" id="pb-restart">Start over</button>
            </div>

            ${showSummary ? this._buildLiveSummaryHTML(liveStart, liveChosen) : ''}
        `;

        if (!liveLoading && bars.length) this._animateBars();
        this._bindModeBar();
        this._bindSettingsPanel();

        const startInput = this.root.querySelector('#pb-live-start');
        if (startInput) {
            startInput.addEventListener('input', e => { this.state.liveStart = e.target.value; });
            startInput.addEventListener('keydown', e => {
                if (e.key === 'Enter') { e.preventDefault(); this._restartLive(); }
            });
        }

        const goBtn = this.root.querySelector('#pb-live-go');
        if (goBtn) goBtn.addEventListener('click', () => this._restartLive());

        this.root.querySelectorAll('.pb-bar-row').forEach(row => {
            row.addEventListener('click', () => {
                const token = row.dataset.fullToken ?? row.dataset.token;
                const rank = parseInt(row.dataset.rank, 10);
                const prob = parseFloat(row.dataset.prob);
                this._pickLiveToken(token, rank, prob);
            });
        });

        this.root.querySelector('#pb-autopick').addEventListener('click', () => {
            if (this.state.livePredictions?.length) {
                const top = this.state.livePredictions[0];
                this._pickLiveToken(top.token, 0, top.prob);
            }
        });

        this.root.querySelector('#pb-restart').addEventListener('click', () => this._restartLive());
    }

    _barRowHTML(displayToken, prob, maxProb, rank, fullToken) {
        const widthPct = (prob / maxProb) * 100;
        const colour = RANK_COLOURS[Math.min(rank, RANK_COLOURS.length - 1)];
        const pctText = prob >= 0.005 ? Math.round(prob * 100) + '%' : '<1%';
        const fullAttr = fullToken !== undefined ? ` data-full-token="${this._escape(fullToken)}"` : '';
        return `
            <div class="pb-bar-row" data-rank="${rank}" data-token="${this._escape(displayToken)}"${fullAttr} data-prob="${prob}" role="button" aria-label="${displayToken} — ${pctText} probability (rank ${rank + 1})" title="${Math.round(prob * 100)}% probability">
                <span class="pb-bar-label">${this._escape(displayToken)}</span>
                <div class="pb-bar-track">
                    <div class="pb-bar-fill" style="width:0%; background:${colour}" data-target="${widthPct}"></div>
                </div>
                <span class="pb-bar-pct">${pctText}</span>
            </div>`;
    }

    _modeBarHTML() {
        const live = this.state.liveMode;
        return `
            <div class="pb-mode-bar">
                <span class="pb-mode-pill ${live ? 'pb-mode-pill-live' : ''}">${live ? '● Live · Gemini Flash' : '○ Demo data'}</span>
                <button type="button" class="pb-settings-btn" id="pb-settings-btn" aria-label="Settings">⚙</button>
            </div>`;
    }

    _settingsPanelHTML() {
        if (!this.state.settingsOpen) return '';
        return `
            <div class="pb-settings-panel">
                <div class="pb-settings-title">Live mode (Gemini Flash)</div>
                <p class="pb-settings-note">Switch on to fetch <strong>context-aware next-token estimates</strong> from Gemini via the backend. The API key lives on the server — never in your browser.</p>
                <div class="pb-settings-row">
                    <label class="pb-settings-toggle">
                        <input type="checkbox" id="pb-settings-toggle" ${this.state.liveMode ? 'checked' : ''}>
                        <span>Use live mode</span>
                    </label>
                </div>
            </div>`;
    }

    _bindModeBar() {
        const btn = this.root.querySelector('#pb-settings-btn');
        if (btn) btn.addEventListener('click', () => {
            this.setState({ settingsOpen: !this.state.settingsOpen });
        });
    }

    _bindSettingsPanel() {
        const toggle = this.root.querySelector('#pb-settings-toggle');
        if (toggle) {
            toggle.addEventListener('change', () => {
                const on = toggle.checked;
                localStorage.setItem('ai-primer-pb-live', String(on));
                this.setState({ liveMode: on, settingsOpen: false, showSummary: false });
                if (on) this._fetchLivePredictions(this.state.liveStart);
            });
        }
    }

    _animateBars() {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.root.querySelectorAll('.pb-bar-fill').forEach(el => {
                    el.style.transition = 'width 250ms ease';
                    el.style.width = el.dataset.target + '%';
                });
            });
        });
    }

    async _fetchLivePredictions(context) {
        this.setState({ liveLoading: true, liveError: null });
        try {
            const predictions = await apiMode.geminiPredictNext(context, 10);
            this.setState({ livePredictions: predictions, liveLoading: false });
        } catch (err) {
            this.setState({ liveError: err.message, liveLoading: false, livePredictions: null });
        }
    }

    _pickLiveToken(token, rank, prob) {
        const colour = SENTENCE_RANK_COLOURS[Math.min(rank, SENTENCE_RANK_COLOURS.length - 1)];
        const liveChosen = [...this.state.liveChosen, { token, rank, colour, prob }];
        const reachedEnd = liveChosen.length >= 10;
        this.setState({ liveChosen, showSummary: reachedEnd });
        if (!reachedEnd) {
            const newContext = this._composeLiveContext(this.state.liveStart, liveChosen);
            this._fetchLivePredictions(newContext);
        }
    }

    _restartLive() {
        this.setState({ liveChosen: [], showSummary: false });
        this._fetchLivePredictions(this.state.liveStart);
    }

    _composeLiveContext(start, chosen) {
        // Tokens come with leading whitespace baked in for whole words, or no
        // whitespace for sub-word pieces. Append raw — Gemini will accept.
        return start + chosen.map(c => c.token).join('');
    }

    _displayToken(token) {
        // Strip a single leading space for readability; keep raw for use as ID.
        const t = token.replace(/^[ ▁]/, '');
        return t === '' ? token : t;
    }

    _buildLiveSentenceHTML(start, chosen) {
        const startSpan = `<span class="pb-sent-start">${this._escape(start)}</span>`;
        if (!chosen.length) return startSpan + ' <span class="pb-sent-cursor">▋</span>';
        const tokenSpans = chosen.map(({ token, colour }) =>
            `<span class="pb-sent-token" style="color:${colour}; border-bottom:2px solid ${colour}">${this._escape(token)}</span>`
        ).join('');
        return startSpan + tokenSpans;
    }

    _buildLiveSummaryHTML(start, chosen) {
        const full = start + chosen.map(c => c.token).join('');
        const avg = chosen.length
            ? Math.round(chosen.reduce((s, c) => s + c.rank, 0) / chosen.length) + 1
            : 0;
        let commentary;
        if (avg <= 3) commentary = 'You followed the highest-probability path — a coherent, expected continuation.';
        else if (avg <= 7) commentary = 'A mix of likely and surprising choices — the model would consider this plausible but not the most obvious path.';
        else commentary = 'You chose from the lower-probability tokens — valid but statistically unusual.';
        return `
            <div class="pb-summary">
                <div class="pb-summary-title">Your sentence:</div>
                <p class="pb-summary-text">"${this._escape(full)}"</p>
                <p class="pb-summary-comment">${commentary}</p>
                <p class="pb-summary-avg">Average probability rank: <strong>${avg}</strong> out of 10</p>
            </div>`;
    }

    _escape(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

/* Mode bar + settings */
.pb-mode-bar { display:flex; align-items:center; justify-content:space-between; margin-bottom:0.5rem; }
.pb-mode-pill { font-size:0.6875rem; font-family:var(--font-mono); color:var(--color-text-muted); background:var(--color-surface-2); padding:3px 9px; border-radius:9999px; letter-spacing:0.04em; }
.pb-mode-pill-live { color:#14532d; background:#dcfce7; }
.pb-settings-btn { width:26px; height:26px; border-radius:6px; border:1px solid var(--color-border); background:var(--color-surface); cursor:pointer; font-size:0.875rem; color:var(--color-text-muted); display:flex; align-items:center; justify-content:center; }
.pb-settings-btn:hover { background:var(--color-surface-2); color:var(--color-text); }

.pb-settings-panel { background:#F5F0FF; border:1px solid #d8c5ff; border-radius:10px; padding:12px 14px; margin-bottom:0.75rem; }
.pb-settings-title { font-family:var(--font-display, var(--font-heading)); font-weight:700; font-size:0.875rem; color:#553090; margin-bottom:6px; }
.pb-settings-note { font-size:0.75rem; color:var(--color-text-muted); line-height:1.45; margin:0 0 8px; }
.pb-settings-row { display:flex; align-items:center; gap:8px; margin-bottom:6px; }
.pb-settings-key { flex:1; padding:6px 10px; border:1px solid var(--color-border); border-radius:6px; font-family:var(--font-mono); font-size:0.8125rem; }
.pb-settings-key:focus { outline:none; border-color:#6941C6; box-shadow:0 0 0 3px rgba(105,65,198,0.15); }
.pb-settings-toggle { display:flex; align-items:center; gap:6px; font-size:0.8125rem; color:var(--color-text); cursor:pointer; }
.pb-settings-status { margin-left:auto; font-size:0.6875rem; font-family:var(--font-mono); color:var(--color-text-muted); }
.pb-settings-hint { font-size:0.6875rem; color:var(--color-text-muted); margin:6px 0 0; }
.pb-settings-hint a { color:#6941C6; }

/* Live mode start row */
.pb-live-start-row { display:flex; align-items:center; gap:8px; margin-bottom:0.75rem; }
.pb-live-start-label { font-size:0.75rem; color:var(--color-text-muted); text-transform:uppercase; letter-spacing:0.08em; font-weight:600; }
.pb-live-start { flex:1; padding:6px 10px; border:1px solid var(--color-border); border-radius:6px; font-family:var(--font-body); font-size:0.875rem; }
.pb-live-start:focus { outline:none; border-color:#6941C6; box-shadow:0 0 0 3px rgba(105,65,198,0.15); }
.pb-live-loading { padding:1rem; text-align:center; color:var(--color-text-muted); font-style:italic; }
    `;
    document.head.appendChild(style);
}());
