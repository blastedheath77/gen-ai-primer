/**
 * pattern-teacher.js
 * Widget for Page 12 — In-Context Learning.
 * Shows zero/one/few-shot learning through interactive example cards.
 */

import { Widget } from '../core/widget-base.js';
import { apiMode } from '../core/api-mode.js';

const SHOT_LABELS = {
    0: '0 (zero-shot)',
    1: '1 (one-shot)',
    2: '2',
    3: '3 (few-shot)',
};

const QUALITY_STARS = {
    0: 1,
    1: 2,
    2: 3,
    3: 3,
};

export class PatternTeacher extends Widget {
    get defaults() {
        return {
            dataUrl: '../js/data/few-shot-outputs.json',
        };
    }

    init() {
        this.state = {
            data: null,
            loaded: false,
            error: null,
            taskIndex: 0,
            examplesShown: 0,
            customMode: false,
            customInput: '',
            customExamples: [],
            testOutput: null,
            generating: false,
        };
        this.createDOM();
        this.bindEvents();
        this.loadData();
    }

    createDOM() {
        this.container.innerHTML = `<div class="pt-widget"><div class="pt-loading">Loading data…</div></div>`;
        this.root = this.container.querySelector('.pt-widget');
    }

    bindEvents() {}

    async loadData() {
        try {
            const res = await fetch(this.config.dataUrl);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            this.setState({ data, loaded: true });
        } catch (err) {
            this.setState({ error: err.message });
        }
    }

    _currentTask() {
        return this.state.data.tasks[this.state.taskIndex];
    }

    _qualityStars(count) {
        const stars = QUALITY_STARS[count] || 1;
        return Array.from({ length: 3 }, (_, i) =>
            `<span class="pt-star${i < stars ? ' pt-star-active' : ''}">★</span>`
        ).join('');
    }

    _getOutput(examplesShown) {
        const task = this._currentTask();
        const response = task.responses[String(examplesShown)];
        return response || task.responses['0'] || '';
    }

    async _runTest() {
        const { examplesShown, customMode, customInput } = this.state;
        this.setState({ generating: true, testOutput: null });

        if (apiMode.isLive() && customMode && customInput.trim()) {
            try {
                const task = this._currentTask();
                const examples = this.state.customExamples.slice(0, examplesShown);
                let prompt = examples.map(ex =>
                    `Input: ${ex.input}\nOutput: ${ex.output}`
                ).join('\n\n');
                if (prompt) prompt += '\n\n';
                prompt += `Input: ${customInput.trim()}\nOutput:`;
                const liveOutput = await apiMode.complete(prompt, { maxTokens: 150 });
                if (liveOutput) {
                    this.setState({ testOutput: liveOutput.trim(), generating: false });
                    return;
                }
            } catch (_) {}
        }

        // Offline: use pre-authored response
        const output = this._getOutput(examplesShown);
        setTimeout(() => {
            this.setState({ testOutput: output, generating: false });
        }, 300);
    }

    render() {
        if (this.state.error) {
            this.root.innerHTML = `<p class="pt-error">Could not load data: ${this.state.error}</p>`;
            return;
        }
        if (!this.state.loaded) return;

        const { taskIndex, examplesShown, customMode, testOutput, generating } = this.state;
        const tasks = this.state.data.tasks;
        const task = this._currentTask();
        const maxExamples = task.examples.length;

        const tabsHTML = tasks.map((t, i) =>
            `<button class="pt-tab${i === taskIndex ? ' pt-tab-active' : ''}" data-idx="${i}">${t.label}</button>`
        ).join('');

        const shotLabel = SHOT_LABELS[examplesShown] || String(examplesShown);
        const stars = this._qualityStars(examplesShown);

        // Example cards
        const cardsHTML = Array.from({ length: examplesShown }, (_, i) => {
            const ex = task.examples[i];
            return `
                <div class="pt-example-card pt-card-visible" style="animation-delay:${i * 60}ms">
                    <div class="pt-card-label">Example ${i + 1}</div>
                    <div class="pt-card-pair">
                        <div class="pt-card-io">
                            <span class="pt-io-badge pt-io-in">Input</span>
                            <span class="pt-io-text">${ex.input}</span>
                        </div>
                        <div class="pt-card-arrow">→</div>
                        <div class="pt-card-io">
                            <span class="pt-io-badge pt-io-out">Output</span>
                            <span class="pt-io-text">${ex.output}</span>
                        </div>
                    </div>
                </div>`;
        }).join('');

        const canAddMore = examplesShown < maxExamples;
        const testInput = customMode
            ? `<textarea class="pt-test-input" id="pt-test-input" rows="2" placeholder="Type your own input…">${this.state.customInput}</textarea>`
            : `<div class="pt-test-input-display">${task.testInput}</div>`;

        this.root.innerHTML = `
            <div class="pt-tabs">${tabsHTML}</div>
            <div class="pt-task-desc">${task.description}</div>
            <div class="pt-shot-bar">
                <span class="pt-shot-label">Examples: <strong>${shotLabel}</strong></span>
                <span class="pt-quality-stars" title="Expected output quality — more examples generally means better results">${stars}</span>
            </div>
            <div class="pt-examples" id="pt-examples">${cardsHTML}</div>
            <div class="pt-example-controls">
                ${canAddMore ? `<button class="btn btn-secondary pt-add-btn" id="pt-add">+ Add example</button>` : ''}
                ${examplesShown > 0 ? `<button class="btn btn-secondary pt-remove-btn" id="pt-remove">− Remove</button>` : ''}
                <button class="pt-toggle-custom${customMode ? ' active' : ''}" id="pt-toggle-custom">
                    ${customMode ? 'Use default test' : 'Write your own'}
                </button>
            </div>
            <div class="pt-test-section">
                <div class="pt-test-label">Test input</div>
                ${testInput}
                <button class="btn btn-primary pt-run-btn" id="pt-run"${generating ? ' disabled' : ''}>
                    ${generating ? 'Running…' : 'Run →'}
                </button>
            </div>
            ${testOutput !== null ? `
                <div class="pt-output-section">
                    <div class="pt-test-label">Model output</div>
                    <div class="pt-output-card">${testOutput}</div>
                    <p class="widget-hint" style="margin-top:0.5rem">Try adding or removing examples above, then run again to see how the output changes.</p>
                </div>` : ''}`;

        // Tab events
        this.root.querySelectorAll('.pt-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setState({ taskIndex: parseInt(btn.dataset.idx), examplesShown: 0, testOutput: null, customInput: '' });
            });
        });

        // Add/remove examples
        const addBtn = this.root.querySelector('#pt-add');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.setState({ examplesShown: Math.min(this.state.examplesShown + 1, maxExamples), testOutput: null });
            });
        }
        const removeBtn = this.root.querySelector('#pt-remove');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                this.setState({ examplesShown: Math.max(0, this.state.examplesShown - 1), testOutput: null });
            });
        }

        // Custom mode toggle
        const toggleBtn = this.root.querySelector('#pt-toggle-custom');
        toggleBtn.addEventListener('click', () => {
            this.setState({ customMode: !this.state.customMode, testOutput: null });
        });

        // Custom input
        const testInputEl = this.root.querySelector('#pt-test-input');
        if (testInputEl) {
            testInputEl.addEventListener('input', e => {
                this.state.customInput = e.target.value;
            });
        }

        // Run button
        const runBtn = this.root.querySelector('#pt-run');
        runBtn.addEventListener('click', () => this._runTest());
    }
}

// ─── Inline styles ────────────────────────────────────────────────────────────
(function injectStyles() {
    if (document.getElementById('pt-styles')) return;
    const style = document.createElement('style');
    style.id = 'pt-styles';
    style.textContent = `
.pt-widget { font-family:var(--font-body); }
.pt-loading, .pt-error { color:var(--color-text-muted); font-size:var(--text-sm); padding:1rem; }
.pt-tabs { display:flex; flex-wrap:wrap; gap:0.375rem; margin-bottom:0.75rem; }
.pt-tab { padding:0.375rem 0.875rem; border-radius:var(--radius-full); border:1px solid var(--color-border); background:var(--color-surface); color:var(--color-text-muted); font-size:var(--text-sm); cursor:pointer; transition:all 150ms; }
.pt-tab:hover { border-color:var(--color-primary); color:var(--color-primary); }
.pt-tab-active { background:var(--color-primary); color:#fff; border-color:var(--color-primary); font-weight:600; }
.pt-task-desc { font-size:var(--text-sm); color:var(--color-text-muted); margin-bottom:0.75rem; font-style:italic; }
.pt-shot-bar { display:flex; align-items:center; justify-content:space-between; margin-bottom:0.75rem; }
.pt-shot-label { font-size:var(--text-sm); color:var(--color-text-muted); }
.pt-shot-label strong { color:var(--color-text); }
.pt-quality-stars { font-size:1.1rem; letter-spacing:1px; }
.pt-star { color:var(--color-border); }
.pt-star-active { color:#d97706; }
.pt-examples { display:flex; flex-direction:column; gap:0.625rem; min-height:0; margin-bottom:0.75rem; }
.pt-example-card { background:var(--color-surface-2); border-radius:var(--radius-md); padding:0.875rem 1rem; border:1px solid var(--color-border); animation:pt-slide-in 300ms ease both; }
@keyframes pt-slide-in { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
.pt-card-label { font-size:var(--text-xs); text-transform:uppercase; letter-spacing:0.08em; color:var(--color-text-muted); font-weight:600; margin-bottom:0.5rem; }
.pt-card-pair { display:flex; align-items:flex-start; gap:0.625rem; flex-wrap:wrap; }
.pt-card-io { display:flex; flex-direction:column; gap:0.25rem; flex:1; min-width:120px; }
.pt-card-arrow { font-size:var(--text-lg); color:var(--color-primary); align-self:center; }
.pt-io-badge { font-size:var(--text-xs); font-weight:600; padding:0.125rem 0.5rem; border-radius:var(--radius-full); display:inline-block; }
.pt-io-in { background:rgba(99,102,241,0.1); color:#6366f1; }
.pt-io-out { background:rgba(13,148,136,0.1); color:var(--color-primary); }
.pt-io-text { font-size:var(--text-sm); color:var(--color-text); line-height:1.5; }
.pt-example-controls { display:flex; align-items:center; gap:0.625rem; flex-wrap:wrap; margin-bottom:1rem; }
.pt-toggle-custom { background:none; border:1px dashed var(--color-border); padding:0.375rem 0.875rem; border-radius:var(--radius-full); font-size:var(--text-sm); color:var(--color-text-muted); cursor:pointer; transition:all 150ms; }
.pt-toggle-custom:hover, .pt-toggle-custom.active { border-color:var(--color-secondary); color:var(--color-secondary); }
.pt-test-section { margin-bottom:1rem; }
.pt-test-label { font-size:var(--text-xs); text-transform:uppercase; letter-spacing:0.08em; color:var(--color-text-muted); font-weight:600; margin-bottom:0.5rem; }
.pt-test-input-display { background:var(--color-surface-2); border-radius:var(--radius-sm); padding:0.625rem 0.875rem; font-size:var(--text-sm); color:var(--color-text); margin-bottom:0.625rem; line-height:1.5; border:1px solid var(--color-border); }
.pt-test-input { width:100%; padding:0.625rem 0.875rem; border:1px solid var(--color-border); border-radius:var(--radius-sm); font-size:var(--text-sm); font-family:var(--font-body); background:var(--color-surface); color:var(--color-text); resize:vertical; margin-bottom:0.625rem; box-sizing:border-box; }
.pt-test-input:focus { outline:none; border-color:var(--color-primary); box-shadow:0 0 0 3px rgba(13,148,136,0.12); }
.pt-output-section { margin-top:0.5rem; }
.pt-output-card { background:rgba(13,148,136,0.05); border:1px solid rgba(13,148,136,0.2); border-radius:var(--radius-md); padding:0.875rem 1rem; font-size:var(--text-sm); color:var(--color-text); line-height:1.7; animation:pt-slide-in 300ms ease; }
    `;
    document.head.appendChild(style);
}());
